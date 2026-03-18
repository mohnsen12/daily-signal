#!/usr/bin/env node
/**
 * Launch Day Status Dashboard
 * Run: node scripts/launch-status.mjs
 * 
 * Shows key metrics for Product Hunt launch day tracking.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = join(__dirname, '..');
const today = new Date().toISOString().split('T')[0];

// Colors
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m',
  yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m',
  magenta: '\x1b[35m', dim: '\x1b[2m'
};

function divider(char = '─') {
  console.log(C.dim + char.repeat(50) + C.reset);
}

function header(text) {
  console.log(`\n${C.bold}${C.cyan}📊 ${text}${C.reset}`);
  divider();
}

// Count newsletters
const contentDir = join(BASE, 'content');
const files = existsSync(contentDir) ? 
  (await import('fs')).readdirSync(contentDir).filter(f => f.endsWith('.md') && f.match(/^\d{4}-\d{2}-\d{2}/)) : [];
const totalIssues = files.length;

// Read analytics
let analytics = {};
const analyticsPath = join(BASE, 'analytics.json');
if (existsSync(analyticsPath)) {
  analytics = JSON.parse(readFileSync(analyticsPath, 'utf8'));
}

// Read growth report
let growthReport = '';
const growthPath = join(BASE, 'GROWTH_REPORT.md');
if (existsSync(growthPath)) {
  growthReport = readFileSync(growthPath, 'utf8');
}

// Count pending tweets
let pendingTweets = 0;
const queuePath = join(BASE, 'tweet-queue.json');
if (existsSync(queuePath)) {
  const queue = JSON.parse(readFileSync(queuePath, 'utf8'));
  pendingTweets = Array.isArray(queue) ? queue.length : 0;
}

// Print dashboard
console.log(`
${C.bold}${C.magenta}🚀 THE DAILY SIGNAL — LAUNCH DAY DASHBOARD${C.reset}
${C.dim}${today} | ${new Date().toLocaleTimeString('da-DK', {timeZone: 'Europe/Copenhagen'})} CET${C.reset}
`);

header('CONTENT');
console.log(`📰 Total issues published: ${C.bold}${totalIssues}${C.reset}`);
console.log(`📅 Today's newsletter: ${existsSync(join(contentDir, `${today}.md`)) ? C.green + '✅ Ready' : C.yellow + '⏳ Pending'}${C.reset}`);

if (analytics.snapshots && analytics.snapshots.length > 0) {
  const latest = analytics.snapshots[analytics.snapshots.length - 1];
  console.log(`📊 Latest quality score: ${C.bold}${latest.qualityScore || 'N/A'}/100${C.reset}`);
  console.log(`📝 Latest stories: ${latest.stories || 'N/A'}`);
  console.log(`📖 Latest word count: ${latest.words || 'N/A'}`);
}

header('PROMOTION');
console.log(`🐦 Tweets in queue: ${pendingTweets > 0 ? C.yellow + pendingTweets + ' pending' : C.green + '✅ Queue empty'}${C.reset}`);
console.log(`🐦 xurl auth: ${C.yellow}⚠️ Check manually${C.reset}`);
console.log(`📱 Reddit posts: ${C.dim}4 ready in promo/REDDIT_POSTS.md${C.reset}`);
console.log(`💼 LinkedIn post: ${C.dim}Ready in promo/LAUNCH_DAY_TWEETS.md${C.reset}`);
console.log(`🔶 Hacker News: ${C.dim}Ready in promo/HACKER_NEWS_POST.md${C.reset}`);

header('LAUNCH DAY TARGETS');
const targets = [
  { label: 'PH Upvotes', target: 100, note: 'Check producthunt.com' },
  { label: 'New Subscribers', target: 30, note: 'From PH + social' },
  { label: 'Website Visits', target: 500, note: 'Check analytics.js' },
  { label: 'PH Comments', target: 20, note: 'Reply within 1h' },
];
for (const t of targets) {
  console.log(`  ${C.cyan}${t.label}${C.reset}: Target ${C.bold}${t.target}${C.reset} ${C.dim}(${t.note})${C.reset}`);
}

header('CRON JOBS (TODAY)');
const cronSchedule = [
  { time: '06:00', job: 'Newsletter publish', status: 'auto' },
  { time: '06:30', job: 'Auto-tweet', status: 'auto' },
  { time: '07:00', job: 'Claus morning reminder', status: 'reminder' },
  { time: '07:30', job: 'PH launch reminder', status: 'reminder' },
  { time: '08:05', job: 'PH launch tweet', status: 'auto' },
  { time: '11:00', job: 'PH midday push', status: 'reminder' },
  { time: '*', status: 'auto', job: 'Tweet queue (every 30 min)' },
];
for (const c of cronSchedule) {
  const icon = c.status === 'auto' ? '🤖' : '⏰';
  console.log(`  ${icon} ${C.bold}${c.time}${C.reset} — ${c.job}`);
}

divider();
console.log(`${C.dim}Run again anytime: node scripts/launch-status.mjs${C.reset}`);
console.log(`${C.bold}Good luck, Claus! 🐕${C.reset}\n`);
