const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3457;
const DATA_FILE = path.join(__dirname, 'data', 'subscribers.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Serve landing page
    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
        const html = fs.readFileSync(path.join(__dirname, 'landing-page', 'index.html'), 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
    }

    // API: Subscribe
    if (req.method === 'POST' && req.url === '/api/subscribe') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { email } = JSON.parse(body);
                if (!email || !email.includes('@')) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid email' }));
                    return;
                }

                const subscribers = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
                if (subscribers.find(s => s.email === email)) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Already subscribed' }));
                    return;
                }

                subscribers.push({
                    email,
                    subscribedAt: new Date().toISOString(),
                    source: 'landing-page'
                });
                fs.writeFileSync(DATA_FILE, JSON.stringify(subscribers, null, 2));

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Subscribed!' }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Server error' }));
            }
        });
        return;
    }

    // API: Get subscribers count
    if (req.method === 'GET' && req.url === '/api/stats') {
        const subscribers = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            subscribers: subscribers.length,
            latest: subscribers.slice(-5)
        }));
        return;
    }

    // API: Get latest newsletter
    if (req.method === 'GET' && req.url === '/api/latest') {
        const contentDir = path.join(__dirname, 'content');
        const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.md')).sort().reverse();
        if (files.length > 0) {
            const content = fs.readFileSync(path.join(contentDir, files[0]), 'utf8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ date: files[0].replace('.md', ''), content }));
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'No newsletters yet' }));
        }
        return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`📡 The Daily Signal server running on http://127.0.0.1:${PORT}`);
});
