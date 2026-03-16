#!/usr/bin/env node
/**
 * process-tweet-queue.mjs — Process pending tweets from the queue
 * 
 * Run via cron (e.g., every 30 minutes) to check if xurl is authed
 * and post any pending tweets.
 * 
 * Usage: node process-tweet-queue.mjs [--check-only]
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(__dirname, '..');
const CONTENT = path.join(BASE, 'content');
const QUEUE_FILE = path.join(CONTENT, 'tweet-queue.json');
const POSTED_FILE = path.join(CONTENT, 'tweets-posted.json');

const CHECK_ONLY = process.argv.includes('--check-only');

function loadQueue() {
  try {
    return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
  } catch { return []; }
}

function saveQueue(queue) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

function logPosted(tweet, variant, date) {
  let posted = [];
  try {
    posted = JSON.parse(fs.readFileSync(POSTED_FILE, 'utf8'));
  } catch {}
  posted.push({
    date,
    time: new Date().toISOString(),
    variant,
    text: tweet,
    length: tweet.length
  });
  fs.writeFileSync(POSTED_FILE, JSON.stringify(posted, null, 2));
}

// Check if xurl is authenticated
function isXurlAuthed() {
  try {
    execSync('xurl auth status', { encoding: 'utf8', timeout: 10000, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Post tweet (one per run)
async function postTweet(text) {
  try {
    // Use execFileSync to avoid shell quoting issues
    const { execFileSync } = await import('child_process');
    const result = execFileSync('xurl', ['post', text], {
      encoding: 'utf8',
      timeout: 30000
    });
    return { success: true, result: result.trim() };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Main (async wrapper)
async function main() {
const queue = loadQueue();
const pending = queue.filter(t => t.status === 'pending' || t.status === 'auth_pending');

console.log(`🐦 Tweet Queue Processor`);
console.log(`   Total: ${queue.length} | Pending: ${pending.length}\n`);

if (pending.length === 0) {
  console.log('✅ No pending tweets. Queue is empty.');
  process.exit(0);
}

if (CHECK_ONLY) {
  console.log('Pending tweets:');
  for (const t of pending) {
    console.log(`  📅 ${t.date} | ${t.variant} | ${t.status}`);
    console.log(`     "${t.text.substring(0, 60)}..."`);
  }
  process.exit(0);
}

// Check auth
const authed = isXurlAuthed();
console.log(`🔐 xurl auth: ${authed ? '✅ Yes' : '❌ No'}\n`);

if (!authed) {
  console.log('⏳ xurl not authenticated. Tweets will remain queued.');
  console.log('   Run: xurl auth oauth2\n');
  
  // Update auth_pending status
  for (const t of pending) {
    if (t.status === 'pending') t.status = 'auth_pending';
  }
  saveQueue(queue);
  
  // Show what's waiting
  console.log(`${pending.length} tweets waiting:`);
  for (const t of pending) {
    console.log(`  📅 ${t.date} | "${t.text.substring(0, 50)}..."`);
  }
  process.exit(0);
}

// Post one tweet at a time (rate limit friendly)
console.log('📤 Posting queued tweets...\n');

for (const tweet of pending) {
  console.log(`Posting: ${tweet.date} [${tweet.variant}]...`);
  const result = await postTweet(tweet.text);
  
  if (result.success) {
    tweet.status = 'posted';
    tweet.postedAt = new Date().toISOString();
    logPosted(tweet.text, tweet.variant, tweet.date);
    console.log(`  ✅ Posted!\n`);
    
    // Only post one per run to avoid rate limits
    console.log('   (Posting 1 per run to avoid rate limits)');
    break;
  } else {
    tweet.status = 'failed';
    tweet.error = result.error;
    console.log(`  ❌ Failed: ${result.error}\n`);
    
    // If it's an auth error, stop trying
    if (result.error.includes('auth') || result.error.includes('401')) {
      console.log('  ⚠️  Auth error — stopping.');
      break;
    }
  }
}

saveQueue(queue);

const remaining = queue.filter(t => t.status === 'pending' || t.status === 'auth_pending').length;
console.log(`\n📊 Remaining in queue: ${remaining}`);
}

main();
}

main();
