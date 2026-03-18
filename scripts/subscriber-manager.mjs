/**
 * The Daily Signal — Subscriber Manager
 * 
 * Manages subscriber data in a local JSON file.
 * Can sync from Formspree API or accept manual additions.
 * 
 * Usage:
 *   node scripts/subscriber-manager.mjs status          — Show stats
 *   node scripts/subscriber-manager.mjs add email@example.com — Add manually
 *   node scripts/subscriber-manager.mjs export          — Export as CSV
 *   node scripts/subscriber-manager.mjs stats           — Growth report
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '..', 'data', 'subscribers.json');

// Ensure data directory exists
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Load or initialize subscriber data
function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    // Handle legacy format (array) vs new format (object)
    if (Array.isArray(raw)) {
      return {
        subscribers: raw.map(s => ({
          email: s.email,
          date: s.subscribedAt || s.date || new Date().toISOString(),
          source: s.source || 'legacy',
          status: 'active',
          referrals: 0
        })),
        meta: {
          created: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          totalSignups: raw.length,
          sources: {}
        }
      };
    }
    return raw;
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

// Save data
function saveData(data) {
  data.meta.lastUpdated = new Date().toISOString();
  data.meta.totalSignups = data.subscribers.length;
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Add subscriber
function addSubscriber(email, source = 'manual') {
  const data = loadData();
  
  // Check for duplicate
  if (data.subscribers.find(s => s.email.toLowerCase() === email.toLowerCase())) {
    console.log(`⚠️  ${email} already exists`);
    return false;
  }
  
  data.subscribers.push({
    email: email.toLowerCase().trim(),
    date: new Date().toISOString(),
    source,
    status: 'active',
    referrals: 0
  });
  
  // Track sources
  data.meta.sources[source] = (data.meta.sources[source] || 0) + 1;
  
  saveData(data);
  console.log(`✅ Added: ${email} (source: ${source})`);
  return true;
}

// Show status
function showStatus() {
  const data = loadData();
  const total = data.subscribers.length;
  
  console.log('\n📡 THE DAILY SIGNAL — SUBSCRIBER STATUS');
  console.log('━'.repeat(50));
  console.log(`📊 Total subscribers: ${total}`);
  console.log(`📅 Created: ${data.meta.created}`);
  console.log(`🔄 Last updated: ${data.meta.lastUpdated}`);
  
  if (total > 0) {
    // By source
    console.log('\n📍 By source:');
    const bySource = {};
    data.subscribers.forEach(s => {
      bySource[s.source] = (bySource[s.source] || 0) + 1;
    });
    Object.entries(bySource)
      .sort((a, b) => b[1] - a[1])
      .forEach(([source, count]) => {
        console.log(`   ${source}: ${count}`);
      });
    
    // Recent signups
    console.log('\n📅 Last 5 signups:');
    data.subscribers.slice(-5).reverse().forEach(s => {
      console.log(`   ${s.date.slice(0, 10)} — ${s.email} (${s.source})`);
    });
    
    // Growth (signups per day)
    console.log('\n📈 Daily signups:');
    const byDate = {};
    data.subscribers.forEach(s => {
      const date = s.date.slice(0, 10);
      byDate[date] = (byDate[date] || 0) + 1;
    });
    Object.entries(byDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([date, count]) => {
        const bar = '█'.repeat(count);
        console.log(`   ${date}: ${bar} (${count})`);
      });
  }
  
  console.log('━'.repeat(50));
}

// Export as CSV
function exportCSV() {
  const data = loadData();
  const csv = ['email,date,source,status'];
  data.subscribers.forEach(s => {
    csv.push(`${s.email},${s.date},${s.source},${s.status}`);
  });
  const outFile = path.join(__dirname, '..', 'data', 'subscribers.csv');
  fs.writeFileSync(outFile, csv.join('\n'));
  console.log(`✅ Exported ${data.subscribers.length} subscribers to ${outFile}`);
}

// Growth report
function showGrowthReport() {
  const data = loadData();
  const total = data.subscribers.length;
  
  console.log('\n📈 THE DAILY SIGNAL — GROWTH REPORT');
  console.log('━'.repeat(50));
  
  if (total === 0) {
    console.log('No subscribers yet. Time to promote!');
    console.log('\n💡 Suggestions:');
    console.log('   1. Post Reddit posts (promo/REDDIT_POSTS.md)');
    console.log('   2. Post Twitter thread (promo/PROMO_KIT.md)');
    console.log('   3. Submit to directories (promo/QUICK_DIRECTORY_GUIDE.md)');
    console.log('   4. Share on Product Hunt');
    console.log('━'.repeat(50));
    return;
  }
  
  // Milestones
  const milestones = [10, 25, 50, 100, 250, 500, 1000];
  const nextMilestone = milestones.find(m => m > total) || '∞';
  const progress = Math.min(100, (total / nextMilestone) * 100);
  
  console.log(`📊 Current: ${total} subscribers`);
  console.log(`🎯 Next milestone: ${nextMilestone} (${progress.toFixed(0)}% there)`);
  console.log(`📊 Progress: ${'█'.repeat(Math.floor(progress / 5))}${'░'.repeat(20 - Math.floor(progress / 5))} ${progress.toFixed(0)}%`);
  
  // Monetization readiness
  console.log('\n💰 Monetization readiness:');
  if (total < 50) {
    console.log('   ❌ Too early for sponsors (< 50)');
    console.log('   💡 Focus on growth first');
  } else if (total < 100) {
    console.log('   ⚠️  Early sponsor outreach possible (50-100)');
    console.log('   💡 Reach out to Tier 1 prospects (Danish AI startups)');
  } else if (total < 500) {
    console.log('   ✅ Ready for sponsor partnerships (100-500)');
    console.log('   💡 Launch Amplifier tier (2.000 kr/issue)');
  } else {
    console.log('   🚀 Full monetization possible (500+)');
    console.log('   💡 Launch premium tier + enterprise packages');
  }
  
  console.log('━'.repeat(50));
}

// CLI
const [,, command, ...args] = process.argv;

switch (command) {
  case 'status':
    showStatus();
    break;
  case 'add':
    if (args[0]) {
      addSubscriber(args[0], args[1] || 'manual');
    } else {
      console.log('Usage: node subscriber-manager.mjs add email@example.com [source]');
    }
    break;
  case 'export':
    exportCSV();
    break;
  case 'stats':
  case 'growth':
    showGrowthReport();
    break;
  default:
    console.log('📡 The Daily Signal — Subscriber Manager');
    console.log('');
    console.log('Commands:');
    console.log('  status   — Show subscriber stats');
    console.log('  add      — Add subscriber manually');
    console.log('  export   — Export as CSV');
    console.log('  stats    — Growth report');
    console.log('');
    console.log('Usage: node scripts/subscriber-manager.mjs [command]');
}
