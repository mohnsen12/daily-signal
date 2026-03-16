#!/usr/bin/env node
/**
 * generate-card.mjs — Generates a shareable daily card HTML from newsletter markdown
 * 
 * Usage: node scripts/generate-card.mjs [date]
 * If no date given, uses today's date.
 */

import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const contentDir = path.join(__dirname, '..', 'content');
const landingDir = path.join(__dirname, '..', 'landing-page');

// Get date
const dateArg = process.argv[2];
const now = dateArg ? new Date(dateArg) : new Date();
const dateStr = now.toISOString().split('T')[0];
const dayNames = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
const monthNames = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
const dayName = dayNames[now.getDay()];
const displayDate = `${dayName} ${now.getDate()}. ${monthNames[now.getMonth()]} ${now.getFullYear()}`;

// Read newsletter
const mdPath = path.join(contentDir, `${dateStr}.md`);
if (!fs.existsSync(mdPath)) {
    console.error(`❌ Newsletter not found: ${mdPath}`);
    process.exit(1);
}

const md = fs.readFileSync(mdPath, 'utf-8');

// Extract stories from markdown
const stories = [];
const lines = md.split('\n');
let currentTag = '';
let currentTitle = '';
let currentSummary = '';
let inStory = false;

for (const line of lines) {
    // Match ### headers (story titles)
    if (line.startsWith('### ')) {
        if (currentTitle && currentTag) {
            stories.push({ tag: currentTag, title: currentTitle, summary: currentSummary.trim() });
        }
        currentTitle = line.replace('### ', '');
        currentSummary = '';
        inStory = true;
    }
    // Match section headers to determine tag
    else if (line.startsWith('## ')) {
        const section = line.replace('## ', '').toLowerCase();
        if (section.includes('breaking')) currentTag = 'breaking';
        else if (section.includes('produkt')) currentTag = 'product';
        else if (section.includes('analyse')) currentTag = 'analysis';
        else if (section.includes('værktøj') || section.includes('tool')) currentTag = 'tool';
        else currentTag = 'breaking';
    }
    // Collect summary text (first paragraph after title)
    else if (inStory && line.trim() && !line.startsWith('[') && !line.startsWith('##') && !line.startsWith('#')) {
        if (!currentSummary) {
            // Take first ~150 chars of the paragraph
            currentSummary = line.trim().substring(0, 180);
            if (currentSummary.length === 180) currentSummary += '…';
        }
    }
}
// Push last story
if (currentTitle && currentTag) {
    stories.push({ tag: currentTag, title: currentTitle, summary: currentSummary.trim() });
}

// Extract intro paragraph
let intro = '';
for (const line of lines) {
    if (line.trim() && !line.startsWith('#') && !line.startsWith('**') && line.length > 40) {
        intro = line.trim().substring(0, 250);
        if (intro.length === 250) intro += '…';
        break;
    }
}

console.log(`📰 Found ${stories.length} stories for ${dateStr}`);

// Generate HTML card
const tagLabels = {
    'breaking': 'Breaking',
    'product': 'Produkt',
    'analysis': 'Analyse',
    'tool': 'Værktøj'
};

const storiesHtml = stories.slice(0, 7).map(s => `
            <div class="story">
                <span class="story-tag tag-${s.tag}">${tagLabels[s.tag] || s.tag}</span>
                <h3>${escapeHtml(s.title)}</h3>
                <p>${escapeHtml(s.summary)}</p>
            </div>`).join('\n');

const html = `<!DOCTYPE html>
<html lang="da">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Daily Signal — ${displayDate}</title>
    <meta property="og:title" content="📡 The Daily Signal — ${displayDate}">
    <meta property="og:description" content="${escapeHtml(stories.slice(0, 3).map(s => s.title).join(' · '))}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="https://mohnsen12.github.io/daily-signal/card.html">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="📡 The Daily Signal — ${displayDate}">
    <meta name="twitter:description" content="${escapeHtml(stories.slice(0, 3).map(s => s.title).join(' · '))}">
    <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', -apple-system, sans-serif; background: #0d1117; color: #e6edf3; min-height: 100vh; }
        .card { max-width: 680px; margin: 2rem auto; background: #161b22; border: 1px solid #30363d; border-radius: 16px; overflow: hidden; }
        .card-header { background: linear-gradient(135deg, #e63946 0%, #c1121f 100%); padding: 2rem; text-align: center; }
        .card-header .logo { font-size: 2.5rem; margin-bottom: 0.5rem; }
        .card-header h1 { font-family: 'Merriweather', serif; font-size: 1.75rem; font-weight: 900; letter-spacing: -0.5px; }
        .card-header .date { font-size: 0.9rem; opacity: 0.9; margin-top: 0.25rem; }
        .card-header .edition { display: inline-block; background: rgba(255,255,255,0.2); padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700; margin-top: 0.75rem; text-transform: uppercase; letter-spacing: 1px; }
        .card-body { padding: 1.5rem; }
        .intro { color: #8b949e; font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid #30363d; }
        .story { padding: 1rem 0; border-bottom: 1px solid #21262d; }
        .story:last-child { border-bottom: none; }
        .story-tag { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 4px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.5rem; }
        .tag-breaking { background: #e63946; color: white; }
        .tag-product { background: #20c997; color: #0d1117; }
        .tag-analysis { background: #fd7e14; color: #0d1117; }
        .tag-tool { background: #6f42c1; color: white; }
        .story h3 { font-size: 1rem; font-weight: 700; line-height: 1.4; margin-bottom: 0.375rem; color: #e6edf3; }
        .story p { font-size: 0.85rem; color: #8b949e; line-height: 1.5; }
        .card-footer { background: #0d1117; padding: 1.5rem; text-align: center; border-top: 1px solid #30363d; }
        .card-footer .cta { display: inline-block; background: #e63946; color: white; padding: 0.75rem 2rem; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 0.95rem; transition: background 0.2s; }
        .card-footer .cta:hover { background: #c1121f; }
        .card-footer .meta { margin-top: 0.75rem; font-size: 0.8rem; color: #484f58; }
        .share-row { display: flex; justify-content: center; gap: 0.5rem; margin-top: 1rem; }
        .share-btn { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.375rem 0.75rem; border: 1px solid #30363d; border-radius: 6px; font-size: 0.8rem; color: #8b949e; text-decoration: none; transition: all 0.2s; }
        .share-btn:hover { border-color: #e63946; color: #e63946; }
        @media (max-width: 600px) { .card { margin: 0; border-radius: 0; } .card-header h1 { font-size: 1.35rem; } }
    </style>
</head>
<body>
    <div class="card">
        <div class="card-header">
            <div class="logo">📡</div>
            <h1>The Daily Signal</h1>
            <div class="date">${displayDate}</div>
        </div>
        <div class="card-body">
            <p class="intro">${escapeHtml(intro)}</p>
${storiesHtml}
        </div>
        <div class="card-footer">
            <a href="https://mohnsen12.github.io/daily-signal/" class="cta">📬 Tilmeld dig gratis</a>
            <div class="share-row">
                <a class="share-btn" href="https://twitter.com/intent/tweet?text=${encodeURIComponent('📡 The Daily Signal — ' + displayDate + '\n\n' + stories.slice(0, 3).map(s => '🔥 ' + s.title).join('\n') + '\n\nLæs alle historier →')}&url=https%3A%2F%2Fmohnsen12.github.io%2Fdaily-signal%2F" target="_blank" rel="noopener">🐦 Del på Twitter</a>
                <a class="share-btn" href="https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fmohnsen12.github.io%2Fdaily-signal%2F" target="_blank" rel="noopener">💼 LinkedIn</a>
                <a class="share-btn" href="https://wa.me/?text=${encodeURIComponent('The Daily Signal — AI & tech nyheder på dansk https://mohnsen12.github.io/daily-signal/')}" target="_blank" rel="noopener">💬 WhatsApp</a>
            </div>
            <p class="meta">Lavet af Teddy 🐕 — verdens første AI-nyhedsredaktør</p>
        </div>
    </div>
</body>
</html>`;

// Write card
const outPath = path.join(landingDir, 'card.html');
fs.writeFileSync(outPath, html);
console.log(`✅ Card generated: ${outPath}`);

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
