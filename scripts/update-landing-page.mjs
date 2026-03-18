#!/usr/bin/env node
/**
 * update-landing-page.mjs
 * 
 * Automatically updates the landing page with the latest newsletter content.
 * - Updates headlines section from latest newsletter
 * - Updates "Seneste udgave" card
 * - Updates footer link
 * - Updates sitemap.xml with new newsletter
 * - Copies to root index.html
 * 
 * Usage: node scripts/update-landing-page.mjs [YYYY-MM-DD]
 *        If no date provided, uses today's date.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LANDING_PAGE = path.join(ROOT, 'landing-page');
const CONTENT_DIR = path.join(ROOT, 'content');

// Get date
const dateArg = process.argv[2];
const today = new Date().toISOString().split('T')[0];
const targetDate = dateArg || today;

// Day names in Danish
const dayNames = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
const monthNames = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const dayName = dayNames[d.getDay()];
  const day = d.getDate();
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${dayName} ${day}. ${month} ${year}`;
}

// Read newsletter markdown
const mdFile = path.join(CONTENT_DIR, `${targetDate}.md`);
if (!fs.existsSync(mdFile)) {
  console.error(`❌ Newsletter not found: ${mdFile}`);
  process.exit(1);
}

const md = fs.readFileSync(mdFile, 'utf-8');

// Parse headlines from TL;DR section
const tldrMatch = md.match(/## 📋 TL;DR\n\n([\s\S]*?)(?=\n## )/);
let headlines = [];
if (tldrMatch) {
  const lines = tldrMatch[1].split('\n').filter(l => l.startsWith('- **'));
  headlines = lines.slice(0, 5).map(line => {
    // Match: - **Title** — description  OR  - **Title** description
    const match = line.match(/^- \*\*(.+?)\*\*\s*(?:[-–—]\s*)?(.+)$/);
    if (!match) return null;
    const title = match[1].trim();
    const text = match[2].trim();
    return { title, text };
  }).filter(Boolean);
}

// Count stories
const storyCount = (md.match(/^### /gm) || []).length;
const wordCount = md.split(/\s+/).length;

// Extract story titles for description
const storyTitles = [...md.matchAll(/^### .+$/gm)].slice(0, 7).map(m => m[0].replace('### ', '').replace(/^[🔥📦🔍🎯⚡]\s*/, ''));

// Build formatted description
const shortTitles = storyTitles.slice(0, 4).join(', ');

console.log(`📅 Updating landing page for ${targetDate} (${formatDate(targetDate)})`);
console.log(`📰 ${storyCount} stories, ~${wordCount} words`);
console.log(`📋 Headlines: ${headlines.length}`);

// Read current landing page
const indexPath = path.join(LANDING_PAGE, 'index.html');
let html = fs.readFileSync(indexPath, 'utf-8');

// Build headlines HTML
if (headlines.length > 0) {
  const headlinesHtml = headlines.map(h => {
    return `            <li>
                <span class="headline-tag">Signal</span>
                <span class="headline-text">${h.title} — ${h.text}</span>
            </li>`;
  }).join('\n');

  html = html.replace(
    /<ul class="headline-list">[\s\S]*?<\/ul>/,
    `<ul class="headline-list">\n${headlinesHtml}\n        </ul>`
  );
}

// 2. Update "Seneste udgave" section
html = html.replace(
  /<h4>The Daily Signal — .+?<\/h4>/,
  `<h4>The Daily Signal — ${formatDate(targetDate)}</h4>`
);
html = html.replace(
  /<p>\d+ historier: .+?<\/p>/,
  `<p>${storyCount} historier: ${shortTitles}.</p>`
);
html = html.replace(
  /href="https:\/\/mohnsen12\.github\.io\/daily-signal\/newsletters\/\d{4}-\d{2}-\d{2}\.html"/,
  `href="https://mohnsen12.github.io/daily-signal/newsletters/${targetDate}.html"`
);

// 3. Update footer
html = html.replace(
  /https:\/\/github\.com\/mohnsen12\/daily-signal\/blob\/main\/content\/\d{4}-\d{2}-\d{2}\.md">Seneste udgave/,
  `https://github.com/mohnsen12/daily-signal/blob/main/content/${targetDate}.md">Seneste udgave`
);

// Write updated file
fs.writeFileSync(indexPath, html);
console.log(`✅ Landing page updated: ${indexPath}`);

// 4. Copy to root index.html
const rootIndexPath = path.join(ROOT, 'index.html');
fs.copyFileSync(indexPath, rootIndexPath);
console.log(`✅ Copied to root: ${rootIndexPath}`);

// 5. Update sitemap
const sitemapPath = path.join(LANDING_PAGE, 'sitemap.xml');
let sitemap = fs.readFileSync(sitemapPath, 'utf-8');
const newsletterUrl = `https://mohnsen12.github.io/daily-signal/newsletters/${targetDate}.html`;
if (!sitemap.includes(newsletterUrl)) {
  const newEntry = `  <url>
    <loc>${newsletterUrl}</loc>
    <lastmod>${targetDate}</lastmod>
    <priority>0.6</priority>
  </url>\n`;
  sitemap = sitemap.replace(
    /(\s*<\/urlset>)/,
    `\n${newEntry}</urlset>`
  );
  fs.writeFileSync(sitemapPath, sitemap);
  console.log(`✅ Sitemap updated with ${targetDate}`);
} else {
  console.log(`ℹ️  Sitemap already has ${targetDate}`);
}

// 6. Also copy sitemap to root
fs.copyFileSync(sitemapPath, path.join(ROOT, 'sitemap.xml'));

console.log(`\n🚀 Landing page ready for deployment!`);
