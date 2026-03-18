/**
 * The Daily Signal — Subscriber Webhook Server
 * 
 * Tiny Express server that receives signups from the landing page
 * and stores them locally. Also serves subscriber stats for social proof.
 * 
 * Endpoints:
 *   POST /subscribe    — Add subscriber (email, source)
 *   GET  /stats        — Subscriber count + growth
 *   GET  /subscribers  — List all (admin, requires API_KEY)
 *   GET  /health       — Health check
 * 
 * Usage:
 *   API_KEY=secret node scripts/subscriber-server.mjs
 *   PORT=3456 (default)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'data', 'subscribers.json');
const PORT = parseInt(process.env.PORT || '3456');
const API_KEY = process.env.API_KEY || 'daily-signal-2026';

// Ensure data directory exists
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Load subscriber data
function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {
      console.error('Error parsing subscriber data:', e.message);
    }
  }
  return {
    subscribers: [],
    meta: {
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      totalSignups: 0,
      sources: {}
    }
  };
}

// Save subscriber data
function saveData(data) {
  data.meta.lastUpdated = new Date().toISOString();
  data.meta.totalSignups = data.subscribers.length;
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Parse body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// CORS headers
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
}

// JSON response
function json(res, status, data) {
  cors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Server
const server = http.createServer(async (req, res) => {
  cors(res);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  try {
    // POST /subscribe
    if (req.method === 'POST' && url.pathname === '/subscribe') {
      const body = await parseBody(req);
      const email = (body.email || '').trim().toLowerCase();
      const source = body.source || 'landing-page';
      
      if (!email || !email.includes('@') || !email.includes('.')) {
        return json(res, 400, { error: 'Invalid email' });
      }
      
      const data = loadData();
      
      // Check duplicate
      if (data.subscribers.find(s => s.email === email)) {
        return json(res, 200, { 
          status: 'already_subscribed', 
          message: 'Already on the list!',
          count: data.subscribers.length 
        });
      }
      
      // Add subscriber
      data.subscribers.push({
        email,
        date: new Date().toISOString(),
        source,
        status: 'active',
        referrals: 0
      });
      
      data.meta.sources[source] = (data.meta.sources[source] || 0) + 1;
      saveData(data);
      
      console.log(`✅ New subscriber: ${email} (source: ${source}) — total: ${data.subscribers.length}`);
      
      return json(res, 201, {
        status: 'subscribed',
        message: 'Welcome to The Daily Signal!',
        count: data.subscribers.length
      });
    }
    
    // GET /stats
    if (req.method === 'GET' && url.pathname === '/stats') {
      const data = loadData();
      const today = new Date().toISOString().split('T')[0];
      const todaySignups = data.subscribers.filter(s => s.date.startsWith(today)).length;
      
      return json(res, 200, {
        total: data.subscribers.length,
        today: todaySignups,
        sources: data.meta.sources,
        lastUpdated: data.meta.lastUpdated
      });
    }
    
    // GET /subscribers (admin)
    if (req.method === 'GET' && url.pathname === '/subscribers') {
      const key = req.headers['x-api-key'] || url.searchParams.get('key');
      if (key !== API_KEY) {
        return json(res, 403, { error: 'Forbidden' });
      }
      
      const data = loadData();
      return json(res, 200, data);
    }
    
    // GET /health
    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, 200, { status: 'ok', uptime: process.uptime() });
    }
    
    // 404
    json(res, 404, { error: 'Not found' });
    
  } catch (e) {
    console.error('Error:', e.message);
    json(res, 500, { error: 'Internal server error' });
  }
});

server.listen(PORT, () => {
  console.log(`\n📡 The Daily Signal — Subscriber Server`);
  console.log(`━`.repeat(40));
  console.log(`🌐 Running on http://localhost:${PORT}`);
  console.log(`📮 POST /subscribe  — Add subscriber`);
  console.log(`📊 GET  /stats      — Public stats`);
  console.log(`📋 GET  /subscribers — Admin (API key)`);
  console.log(`💚 GET  /health     — Health check`);
  console.log(`━`.repeat(40));
  console.log(`🔑 API_KEY: ${API_KEY}`);
  console.log('');
});
