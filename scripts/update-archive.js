#!/usr/bin/env node
/**
 * update-archive.js
 * Automatically adds a new issue to arkiv.html and rss.xml
 * 
 * Usage: node update-archive.js 2026-03-16 "Title" "Description" "tag1,tag2,tag3"
 */

const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');
const LANDING = path.join(BASE, 'landing-page');
const CONTENT = path.join(BASE, 'content');

const date = process.argv[2];
const title = process.argv[3] || '';
const desc = process.argv[4] || '';
const tags = process.argv[5] || '';

if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
  console.error('Usage: node update-archive.js YYYY-MM-DD "Title" "Description" "tag1,tag2"');
  process.exit(1);
}

// Format date for display
const d = new Date(date + 'T12:00:00');
const DAYS = ['Søndag','Mandag','Tirsdag','Onsdag','Torsdag','Fredag','Lørdag'];
const MONTHS = ['januar','februar','marts','april','maj','juni','juli','august','september','oktober','november','december'];
const displayDate = `${DAYS[d.getDay()]} ${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

// Copy newsletter HTML to archive
const srcHtml = path.join(CONTENT, `${date}.html`);
const dstHtml = path.join(LANDING, 'newsletters', `${date}.html`);
if (fs.existsSync(srcHtml)) {
  fs.copyFileSync(srcHtml, dstHtml);
  console.log(`📄 Copied ${date}.html → newsletters/`);
}

// Count existing issues for issue number
const archiveHtml = fs.readFileSync(path.join(LANDING, 'arkiv.html'), 'utf8');
const issueCount = (archiveHtml.match(/class="issue"/g) || []).length + 1;

// Add to archive page
const tagHtml = tags ? tags.split(',').map(t => `<span class="issue-tag">${t.trim()}</span>`).join('\n                ') : '';
const newIssue = `
        <a href="/newsletters/${date}.html" class="issue">
            <div class="issue-date">${displayDate} — Udgave #${issueCount}</div>
            <div class="issue-title">${title}</div>
            <div class="issue-preview">${desc}</div>
            ${tags ? `<div class="issue-stories">\n                ${tagHtml}\n            </div>` : ''}
        </a>`;

const updatedArchive = archiveHtml.replace(
  /(<a href="\/rss\.xml" class="rss-link">)/,
  `${newIssue}\n\n        $1`
);
fs.writeFileSync(path.join(LANDING, 'arkiv.html'), updatedArchive);
console.log(`📰 Added issue to arkiv.html (issue #${issueCount})`);

// Generate RSS pubDate
const pad = n => String(n).padStart(2, '0');
const DAYS_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const pubDate = `${DAYS_EN[d.getDay()]}, ${pad(d.getDate())} ${MONTHS_EN[d.getMonth()]} ${d.getFullYear()} 06:00:00 +0100`;

// Add to RSS feed
const rssFile = path.join(LANDING, 'rss.xml');
let rss = fs.readFileSync(rssFile, 'utf8');

const newItem = `
    <item>
      <title>${title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</title>
      <link>https://teddy.openclaw.ai/newsletters/${date}.html</link>
      <guid isPermaLink="true">https://teddy.openclaw.ai/newsletters/${date}.html</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${desc.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</description>
    </item>`;

rss = rss.replace(
  /<lastBuildDate>[^<]+<\/lastBuildDate>/,
  `<lastBuildDate>${pubDate}</lastBuildDate>`
);
rss = rss.replace(
  '    </item>\n  </channel>',
  `    </item>\n${newItem}\n  </channel>`
);
fs.writeFileSync(rssFile, rss);
console.log(`📡 Added to rss.xml`);

console.log('\n✅ Archive fully updated!');
