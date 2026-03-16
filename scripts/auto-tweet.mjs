#!/usr/bin/env node
/**
 * auto-tweet.mjs — Twitter auto-poster for The Daily Signal
 * 
 * Reads today's newsletter, generates tweet variants, posts via xurl.
 * Requires: xurl authenticated (run `xurl auth oauth2` first)
 * 
 * Usage: node auto-tweet.mjs [--dry-run] [--variant=hook|deep|take|tool] [--queue]
 * 
 * Modes:
 *   Default: Posts the best tweet variant now
 *   --dry-run: Shows what would be posted without posting
 *   --variant: Posts specific variant (hook/deep/take/tool)
 *   --queue: Adds to queue instead of posting immediately
 * 
 * Queue file: content/tweet-queue.json
 * Posted log: content/tweets-posted.json
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(__dirname, '..');
const CONTENT = path.join(BASE, 'content');

// Parse args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const USE_QUEUE = args.includes('--queue');
const VARIANT_ARG = args.find(a => a.startsWith('--variant='));
const VARIANT = VARIANT_ARG ? VARIANT_ARG.split('=')[1] : null;

// Get today's date
const today = new Date().toISOString().split('T')[0];
const mdFile = path.join(CONTENT, `${today}.md`);
const QUEUE_FILE = path.join(CONTENT, 'tweet-queue.json');
const POSTED_FILE = path.join(CONTENT, 'tweets-posted.json');

// Ensure newsletter exists
if (!fs.existsSync(mdFile)) {
  console.error(`❌ Newsletter not found: ${mdFile}`);
  process.exit(1);
}

const md = fs.readFileSync(mdFile, 'utf8');

// Parse newsletter
function parseNewsletter(content) {
  const stories = [];
  const lines = content.split('\n');
  let currentSection = '';
  let currentTitle = '';
  let currentSummary = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Section headers
    if (trimmed.startsWith('## ')) {
      currentSection = trimmed.replace('## ', '').replace(/[^\w\s&]/g, '').trim();
      continue;
    }
    
    // Story titles
    if (trimmed.startsWith('### ')) {
      // Save previous story
      if (currentTitle && currentSummary.length) {
        stories.push({
          section: currentSection,
          title: currentTitle,
          summary: currentSummary.join(' ').substring(0, 280)
        });
      }
      currentTitle = trimmed.replace('### ', '');
      currentSummary = [];
      continue;
    }
    
    // Regular content (not links, not badges)
    if (trimmed && !trimmed.startsWith('[') && !trimmed.startsWith('---') && 
        !trimmed.startsWith('**') && !trimmed.startsWith('*') && !trimmed.startsWith('>')) {
      currentSummary.push(trimmed);
    }
  }
  
  // Save last story
  if (currentTitle && currentSummary.length) {
    stories.push({
      section: currentSection,
      title: currentTitle,
      summary: currentSummary.join(' ').substring(0, 280)
    });
  }
  
  // Extract intro
  const introMatch = content.match(/---\n\n([\s\S]*?)\n\n---/);
  const intro = introMatch ? introMatch[1].trim() : '';
  
  // Extract daily insight
  const insightMatch = content.match(/## 🎙️ Dagens Signal\n\n([\s\S]*?)(?=\n\n---)/);
  const insight = insightMatch ? insightMatch[1].trim() : '';
  
  // Extract share quote
  const quoteMatch = content.match(/> (.*?)(?=\n)/);
  const shareQuote = quoteMatch ? quoteMatch[1] : '';
  
  // Extract tool
  const toolMatch = content.match(/## 🐕 Dagens Værktøj\n\n\*\*(.*?)\*\* — ([\s\S]*?)(?=\n→)/);
  const tool = toolMatch ? { name: toolMatch[1], desc: toolMatch[2].trim() } : null;
  
  return { stories, intro, insight, shareQuote, tool };
}

// Generate tweet variants
function generateTweets(data) {
  const tweets = {};
  const url = 'https://mohnsen12.github.io/daily-signal/';
  const topStory = data.stories[0];
  const top3 = data.stories.slice(0, 3);
  
  // Variant 1: Hook (teaser with top story)
  if (topStory) {
    const title = topStory.title.substring(0, 100);
    tweets.hook = `📡 Dagens AI-nyheder er klar!\n\n🔥 ${title}\n\nOg ${data.stories.length - 1} flere historier i dagens udgave.\n\nLæs gratis → ${url}`;
  }
  
  // Variant 2: Deep dive (top 3 stories)
  if (top3.length >= 3) {
    const bullets = top3.map((s, i) => {
      const emoji = ['🔥', '📦', '🔍'][i];
      const short = s.title.substring(0, 70);
      return `${emoji} ${short}`;
    }).join('\n');
    
    tweets.deep = `📡 The Daily Signal — dagens briefing:\n\n${bullets}\n\nLæs alle ${data.stories.length} historier → ${url}`;
  }
  
  // Variant 3: Hot take (daily insight / share quote)
  if (data.shareQuote) {
    tweets.take = `${data.shareQuote}\n\n— The Daily Signal, ${today}\n\nFlere AI-nyheder → ${url}`;
  } else if (data.insight) {
    const short = data.insight.substring(0, 200);
    tweets.take = `💭 ${short}\n\nFlere tanker → ${url}`;
  }
  
  // Variant 4: Tool recommendation
  if (data.tool) {
    tweets.tool = `🛠️ Dagens AI-værktøj: ${data.tool.name}\n\n${data.tool.desc.substring(0, 150)}\n\nPrøv det → ${url}\n\nFlere anbefalinger i dagens Daily Signal 📡`;
  }
  
  // Variant 5: Stats/numbers focused (from stories with numbers)
  const statsStories = data.stories.filter(s => /\d+%|\d+x|\$[\d,]+/.test(s.summary));
  if (statsStories.length > 0) {
    const stat = statsStories[0];
    const number = stat.summary.match(/(\d+%|\d+x|\$[\d,]+)/)?.[0] || '';
    tweets.stats = `📊 ${number}\n\n${stat.title}\n\nFlere AI-tal fra dagens Daily Signal → ${url}`;
  }
  
  return tweets;
}

// Pick the best variant for time of day
function pickVariant(tweets) {
  const hour = new Date().getHours();
  
  // Morning (6-10): Hook (newsletter just dropped)
  // Midday (10-14): Deep dive (people catching up)
  // Afternoon (14-18): Hot take (engagement focused)
  // Evening (18-22): Tool rec (people exploring)
  
  if (VARIANT && tweets[VARIANT]) return { variant: VARIANT, text: tweets[VARIANT] };
  
  if (hour >= 6 && hour < 10 && tweets.hook) return { variant: 'hook', text: tweets.hook };
  if (hour >= 10 && hour < 14 && tweets.deep) return { variant: 'deep', text: tweets.deep };
  if (hour >= 14 && hour < 18 && tweets.take) return { variant: 'take', text: tweets.take };
  if (hour >= 18 && tweets.tool) return { variant: 'tool', text: tweets.tool };
  
  // Fallback
  return { variant: Object.keys(tweets)[0], text: Object.values(tweets)[0] };
}

// Post tweet via xurl
function postTweet(text) {
  try {
    const result = execSync(`xurl tweet "${text.replace(/"/g, '\\"')}"`, {
      encoding: 'utf8',
      timeout: 30000
    });
    return { success: true, result: result.trim() };
  } catch (err) {
    // Check if it's an auth error
    if (err.stderr && err.stderr.includes('auth')) {
      return { success: false, error: 'AUTH_REQUIRED', message: 'xurl not authenticated. Run: xurl auth oauth2' };
    }
    return { success: false, error: 'POST_FAILED', message: err.message };
  }
}

// Queue management
function loadQueue() {
  try {
    return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
  } catch { return []; }
}

function saveQueue(queue) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

function logPosted(tweet, variant) {
  let posted = [];
  try {
    posted = JSON.parse(fs.readFileSync(POSTED_FILE, 'utf8'));
  } catch {}
  posted.push({
    date: today,
    time: new Date().toISOString(),
    variant,
    text: tweet,
    length: tweet.length
  });
  fs.writeFileSync(POSTED_FILE, JSON.stringify(posted, null, 2));
}

// Main
console.log('🐕 The Daily Signal — Auto-Tweet\n');
console.log(`📅 Date: ${today}`);
console.log(`📝 Newsletter: ${mdFile}`);
console.log(`🔧 Mode: ${DRY_RUN ? 'DRY RUN' : USE_QUEUE ? 'QUEUE' : 'POST'}\n`);

const data = parseNewsletter(md);
console.log(`📰 Found ${data.stories.length} stories`);
console.log(`💡 Insight: ${data.insight ? 'Yes' : 'No'}`);
console.log(`💬 Quote: ${data.shareQuote ? 'Yes' : 'No'}`);
console.log(`🛠️ Tool: ${data.tool ? data.tool.name : 'None'}\n`);

const tweets = generateTweets(data);
console.log(`🐦 Generated ${Object.keys(tweets).length} tweet variants:\n`);

for (const [variant, text] of Object.entries(tweets)) {
  const len = text.length;
  const status = len <= 280 ? '✅' : '⚠️';
  console.log(`${status} ${variant.toUpperCase()} (${len} chars):`);
  console.log(`   ${text.split('\n')[0]}...`);
  console.log('');
}

const selected = pickVariant(tweets);
console.log(`\n🎯 Selected: ${selected.variant.toUpperCase()}`);
console.log(`📝 Tweet (${selected.text.length} chars):`);
console.log('─'.repeat(50));
console.log(selected.text);
console.log('─'.repeat(50));

if (DRY_RUN) {
  console.log('\n🏁 Dry run complete — nothing posted.');
  process.exit(0);
}

if (USE_QUEUE) {
  const queue = loadQueue();
  queue.push({
    date: today,
    variant: selected.variant,
    text: selected.text,
    queuedAt: new Date().toISOString(),
    status: 'pending'
  });
  saveQueue(queue);
  console.log(`\n📥 Added to queue (${queue.length} pending tweets)`);
  console.log('   Run without --queue to post next pending tweet.');
  process.exit(0);
}

// Post
console.log('\n📤 Posting via xurl...');
const result = postTweet(selected.text);

if (result.success) {
  console.log(`✅ Posted successfully!`);
  console.log(`   ${result.result}`);
  logPosted(selected.text, selected.variant);
} else {
  console.log(`❌ Failed: ${result.message}`);
  if (result.error === 'AUTH_REQUIRED') {
    console.log('\n⚠️  xurl needs authentication!');
    console.log('   Run: xurl auth oauth2');
    console.log('   Then Teddy can post tweets autonomously.');
    console.log('\n📥 Adding to queue instead...');
    const queue = loadQueue();
    queue.push({
      date: today,
      variant: selected.variant,
      text: selected.text,
      queuedAt: new Date().toISOString(),
      status: 'auth_pending'
    });
    saveQueue(queue);
    console.log(`   Queued (${queue.length} pending). Will post when auth is set up.`);
  }
}
