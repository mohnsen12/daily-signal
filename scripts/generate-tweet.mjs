#!/usr/bin/env node

/**
 * Generate Twitter-ready tweets from Daily Signal newsletter markdown.
 * 
 * Usage: node scripts/generate-tweet.mjs [path-to-newsletter.md]
 * Default: today's date in content/
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

function getDateStr(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

function extractHeadlines(md) {
  const lines = md.split('\n');
  const headlines = [];
  let inBreaking = false;
  let inAnalysis = false;

  for (const line of lines) {
    // Detect sections
    if (line.includes('🔥 Breaking')) inBreaking = true;
    if (line.includes('📢 Analyse')) { inBreaking = false; inAnalysis = true; }
    if (line.includes('🇪🇺 Regulering')) { inBreaking = false; inAnalysis = false; }
    
    // Extract ### headlines
    if (line.startsWith('### ')) {
      const title = line.replace('### ', '').trim();
      headlines.push({ title, isBreaking: inBreaking, isAnalysis: inAnalysis });
    }
  }
  
  return headlines;
}

function extractDate(md) {
  const match = md.match(/\*\*Dato:\s*(.+?)\*\*/);
  return match ? match[1] : getDateStr();
}

function generateTweet(md) {
  const date = extractDate(md);
  const headlines = extractHeadlines(md);
  
  if (headlines.length === 0) return null;

  // Pick top 3 headlines (prioritize breaking)
  const breaking = headlines.filter(h => h.isBreaking).slice(0, 2);
  const analysis = headlines.filter(h => h.isAnalysis).slice(0, 1);
  const top3 = [...breaking, ...analysis].slice(0, 3);
  
  if (top3.length === 0) {
    top3.push(...headlines.slice(0, 3));
  }

  const emojis = ['🔥', '📦', '🔍'];
  const highlights = top3.map((h, i) => {
    // Shorten title to ~45 chars to fit 280 limit
    let title = h.title;
    if (title.length > 45) {
      title = title.substring(0, 42) + '...';
    }
    return `${emojis[i]} ${title}`;
  }).join('\n');

  return `📡 The Daily Signal — ${date}

${highlights}

Læs alle → https://mohnsen12.github.io/daily-signal/
Tilmeld dig gratis 👇`;
}

// Main
const dateArg = process.argv[2] || getDateStr();
const mdPath = join(projectRoot, 'content', `${dateArg}.md`);

if (!existsSync(mdPath)) {
  console.error(`❌ Ingen newsletter fundet: ${mdPath}`);
  process.exit(1);
}

const md = readFileSync(mdPath, 'utf-8');
const tweet = generateTweet(md);

if (tweet) {
  console.log(tweet);
  console.log(`\n---\n📝 Karakter: ${tweet.length}/280`);
} else {
  console.error('❌ Kunne ikke generere tweet fra newsletter');
  process.exit(1);
}
