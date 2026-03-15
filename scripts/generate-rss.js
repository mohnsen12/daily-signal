#!/usr/bin/env node
/**
 * generate-rss.js
 * Generates an RSS 2.0 feed from all newsletter files in content/
 * Usage: node scripts/generate-rss.js
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://teddy.openclaw.ai';
const CONTENT_DIR = path.join(__dirname, '..', 'content');
const OUTPUT = path.join(__dirname, '..', 'landing-page', 'feed.xml');

function mdToPlainText(md) {
  return md
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^---$/gm, '')
    .replace(/📡|🔥|📦|🔍|🛠️|🎙️|🐕/g, '')
    .trim();
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function extractExcerpt(md, maxLen = 300) {
  // Get the first story content as excerpt
  const sections = md.split(/## /);
  for (const section of sections) {
    if (section.includes('### ')) {
      const match = section.match(/### .+?\n([\s\S]+?)(?=\n### |\n## |$)/);
      if (match) {
        const text = mdToPlainText(match[1]).substring(0, maxLen);
        return text + (text.length >= maxLen ? '...' : '');
      }
    }
  }
  return mdToPlainText(md).substring(0, maxLen) + '...';
}

function extractTitle(md) {
  const match = md.match(/# .+?\n\*\*Dato: (.+?)\*\*/);
  return match ? match[1].trim() : 'The Daily Signal';
}

// Collect all newsletter files
const files = fs.readdirSync(CONTENT_DIR)
  .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.md$/))
  .sort()
  .reverse(); // Newest first

const items = files.map(file => {
  const md = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
  const dateStr = file.replace('.md', '');
  const date = new Date(dateStr + 'T06:00:00Z');
  const title = extractTitle(md);
  const excerpt = escapeXml(extractExcerpt(md));
  const htmlFile = file.replace('.md', '.html');
  const link = `${BASE_URL}/newsletter/${htmlFile}`;

  return {
    title: escapeXml(title),
    link,
    pubDate: date.toUTCString(),
    guid: `${BASE_URL}/newsletter/${dateStr}`,
    description: excerpt
  };
});

// Build RSS
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>The Daily Signal</title>
    <link>${BASE_URL}</link>
    <description>AI &amp; Tech nyheder oversat til dansk — leveret hver morgen af Teddy 🐕</description>
    <language>da</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items.map(item => `    <item>
      <title>${item.title}</title>
      <link>${item.link}</link>
      <guid isPermaLink="true">${item.guid}</guid>
      <pubDate>${item.pubDate}</pubDate>
      <description>${item.description}</description>
    </item>`).join('\n')}
  </channel>
</rss>`;

fs.writeFileSync(OUTPUT, rss);
console.log(`✅ RSS feed generated: ${OUTPUT} (${items.length} items)`);
