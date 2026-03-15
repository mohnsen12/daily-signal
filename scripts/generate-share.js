#!/usr/bin/env node
/**
 * generate-share.js
 * Generates ready-to-share social media content from today's newsletter.
 * Output: content/YYYY-MM-DD-share.json
 * 
 * Usage: node scripts/generate-share.js [date]
 */

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', 'content');
const LANDING_URL = 'https://mohnsen12.github.io/daily-signal/';
const NEWSLETTER_BASE = 'https://github.com/mohnsen12/daily-signal/blob/main/content/';

// Get date
const dateArg = process.argv[2];
const now = dateArg ? new Date(dateArg) : new Date();
const dateStr = now.toISOString().split('T')[0];
const dayNames = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
const dayName = dayNames[now.getDay()];

function parseStories(md) {
  const stories = [];
  
  // Find all ### headings and their content
  const storyRegex = /### (.+?)\n([\s\S]*?)(?=\n### |\n## |$)/g;
  let match;
  
  while ((match = storyRegex.exec(md)) !== null) {
    const title = match[1].replace(/\*\*/g, '').trim();
    
    // Find nearest ## section header before this story
    const beforeThis = md.substring(0, match.index);
    const sectionMatch = beforeThis.match(/## .+?$/m);
    const category = sectionMatch 
      ? sectionMatch[0].replace('## ', '').replace(/🔥|📦|🔍|🛠️|🎙️|🐕/g, '').trim()
      : 'Unknown';
    
    stories.push({ category, title });
  }
  return stories;
}

function getTopHeadlines(stories, count = 3) {
  return stories.slice(0, count);
}

function generateTwitterThread(headlines, dateStr) {
  const tweet1 = `📡 The Daily Signal — ${dayName}

Dagens vigtigste AI & tech nyheder:

${headlines.map((h, i) => `${['🔥', '📦', '🔍'][i] || '📌'} ${h.title}`).join('\n')}

Læs alle historier + analyse →`;
  
  const tweet2 = `${NEWSLETTER_BASE}${dateStr}.md

Tilmeld dig gratis (hver morgen kl. 6): ${LANDING_URL}`;

  const hashtags = '#AI #Tech #Danmark #Nyhedsbrev';
  
  return {
    thread: [tweet1, tweet2, hashtags],
    singleTweet: `📡 Dagens vigtigste AI-nyheder:\n${headlines.slice(0, 2).map(h => `• ${h.title}`).join('\n')}\n\nLæs alle → ${NEWSLETTER_BASE}${dateStr}.md\n\nTilmeld dig: ${LANDING_URL}\n\n${hashtags}`
  };
}

function generateLinkedIn(headlines, dateStr) {
  return `📡 The Daily Signal — ${dayName}

Dagens vigtigste AI & tech nyheder:

${headlines.map((h, i) => `${['🔥', '📦', '🔍'][i] || '📌'} ${h.title}`).join('\n\n')}

→ Læs alle historier: ${NEWSLETTER_BASE}${dateStr}.md
→ Tilmeld dig gratis: ${LANDING_URL}

#AI #Tech #Danmark #Nyhedsbrev #ArtificialIntelligence`;
}

function generateRedditDK(headlines, dateStr) {
  return {
    title: `📡 The Daily Signal — Dagens AI & tech nyheder (${dayName})`,
    body: `Her er dagens vigtigste AI & tech nyheder, samlet og opsummeret:

${headlines.map((h, i) => `${['🔥', '📦', '🔍'][i] || '📌'} **${h.title}**`).join('\n\n')}

→ [Læs alle 5-7 historier](${NEWSLETTER_BASE}${dateStr}.md)

The Daily Signal er et gratis nyhedsbrev der samler dagens vigtigste AI & tech nyheder på dansk. Udgives hver morgen kl. 6.

Tilmeld dig: ${LANDING_URL}`
  };
}

function generateMastodon(headlines, dateStr) {
  return `📡 The Daily Signal — ${dayName}

${headlines.slice(0, 3).map(h => `• ${h.title}`).join('\n')}

Læs alle → ${NEWSLETTER_BASE}${dateStr}.md

#AI #Tech #Denmark #Newsletter`;
}

// Main
const mdPath = path.join(CONTENT_DIR, `${dateStr}.md`);
if (!fs.existsSync(mdPath)) {
  console.error(`❌ No newsletter found for ${dateStr}`);
  process.exit(1);
}

const md = fs.readFileSync(mdPath, 'utf-8');
const stories = parseStories(md);
const headlines = getTopHeadlines(stories, 4);

const shareContent = {
  date: dateStr,
  day: dayName,
  generated: new Date().toISOString(),
  twitter: generateTwitterThread(headlines, dateStr),
  linkedin: generateLinkedIn(headlines, dateStr),
  reddit: generateRedditDK(headlines, dateStr),
  mastodon: generateMastodon(headlines, dateStr),
  headlines: headlines.map(h => h.title)
};

const outPath = path.join(CONTENT_DIR, `${dateStr}-share.json`);
fs.writeFileSync(outPath, JSON.stringify(shareContent, null, 2));
console.log(`✅ Share content generated: ${outPath}`);
console.log(`\n📋 Headlines: ${headlines.map(h => h.title).join(' | ')}`);
