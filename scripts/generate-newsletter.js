#!/usr/bin/env node
/**
 * generate-newsletter.js
 * Reads a markdown newsletter and generates a matching HTML version.
 * 
 * Usage: node generate-newsletter.js 2026-03-15
 */

const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');
const CONTENT = path.join(BASE, 'content');

const date = process.argv[2];
if (!date) {
  console.error('Usage: node generate-newsletter.js YYYY-MM-DD');
  process.exit(1);
}

const mdFile = path.join(CONTENT, `${date}.md`);
const htmlFile = path.join(CONTENT, `${date}.html`);

if (!fs.existsSync(mdFile)) {
  console.error(`Not found: ${mdFile}`);
  process.exit(1);
}

const md = fs.readFileSync(mdFile, 'utf8');

// Parse date for display
const d = new Date(date + 'T12:00:00');
const DAYS = ['Søndag','Mandag','Tirsdag','Onsdag','Torsdag','Fredag','Lørdag'];
const MONTHS = ['januar','februar','marts','april','maj','juni','juli','august','september','oktober','november','december'];
const displayDate = `${DAYS[d.getDay()]} ${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

// Simple markdown → HTML converter (handles the newsletter format)
function mdToHtml(md) {
  let html = '';
  const lines = md.split('\n');
  let inIntro = true;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip title and metadata
    if (line.startsWith('# ') && i < 3) continue;
    if (line.startsWith('**') && line.includes('Dato:')) continue;
    if (line === '---' && i < 5) continue;
    if (line === '' && inIntro) continue;
    
    // First non-empty, non-header line is intro
    if (inIntro && line && !line.startsWith('#') && !line.startsWith('---')) {
      html += `  <div class="intro">\n    ${line}\n  </div>\n\n`;
      inIntro = false;
      continue;
    }
    
    // Section headers (##)
    if (line.startsWith('## ')) {
      const title = line.replace('## ', '');
      html += `  <div class="section">\n    <h2>${title}</h2>\n`;
      continue;
    }
    
    // Story titles (###)
    if (line.startsWith('### ')) {
      const title = line.replace('### ', '');
      html += `    <div class="story">\n      <h3>${title}</h3>\n`;
      continue;
    }
    
    // Bold badge at start of story
    if (line.startsWith('**') && line.endsWith('**')) {
      const badge = line.replace(/\*\*/g, '');
      html += `      <span class="badge">${badge}</span>\n`;
      continue;
    }
    
    // Links [Læs mere](...)
    if (line.startsWith('[Læs mere]')) {
      const match = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        html += `      <a href="${match[2]}">${match[1]} →</a>\n    </div>\n`;
      }
      continue;
    }
    
    // Highlight block (Dagens Signal)
    if (line.startsWith('🎙️') || line.startsWith('>')) {
      const text = line.startsWith('>') ? line.substring(2) : line;
      html += `  <div class="highlight">\n    <p>${text}</p>\n  </div>\n\n`;
      // Close any open section
      continue;
    }
    
    // Tool section
    if (line.startsWith('**') && line.includes(':**')) {
      const parts = line.split(':**');
      const name = parts[0].replace(/\*\*/g, '');
      const desc = parts[1] || '';
      html += `    <div class="tool-box">\n      <h3>${name}</h3>\n      <p>${desc.trim()}</p>\n`;
      continue;
    }
    
    // Regular paragraph
    if (line && !line.startsWith('---') && !line.startsWith('*')) {
      // Check if we're in a story div
      html += `      <p>${line}</p>\n`;
    }
    
    // End of section markers
    if (line.startsWith('---') && i > 10) {
      html += `  </div>\n`;
    }
  }
  
  return html;
}

const bodyContent = mdToHtml(md);

const html = `<!DOCTYPE html>
<html lang="da">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>The Daily Signal — ${displayDate}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9fa; color: #1a1a2e; margin: 0; padding: 0; }
  .container { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 32px 24px; text-align: center; }
  .header h1 { margin: 0; font-size: 28px; letter-spacing: -0.5px; }
  .header .date { opacity: 0.7; font-size: 14px; margin-top: 8px; }
  .intro { padding: 24px; font-size: 16px; color: #444; border-bottom: 1px solid #eee; }
  .section { padding: 20px 24px; border-bottom: 1px solid #eee; }
  .section:last-child { border-bottom: none; }
  .section h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; color: #888; margin: 0 0 12px 0; }
  .story { margin-bottom: 20px; }
  .story:last-child { margin-bottom: 0; }
  .story h3 { font-size: 18px; margin: 0 0 8px 0; color: #1a1a2e; }
  .story p { font-size: 15px; line-height: 1.6; color: #444; margin: 0 0 8px 0; }
  .story a { color: #e94560; text-decoration: none; font-weight: 600; font-size: 14px; }
  .highlight { background: #f0f4ff; border-left: 4px solid #4361ee; padding: 16px 20px; margin: 0 24px 20px 24px; border-radius: 0 8px 8px 0; }
  .highlight p { font-size: 15px; line-height: 1.6; color: #333; margin: 0; font-style: italic; }
  .tool-box { background: #fff8e1; border-radius: 8px; padding: 16px 20px; }
  .tool-box h3 { font-size: 17px; margin: 0 0 6px 0; }
  .tool-box p { font-size: 14px; color: #555; margin: 0 0 8px 0; }
  .tool-box a { color: #e94560; text-decoration: none; font-weight: 600; }
  .footer { padding: 24px; text-align: center; font-size: 13px; color: #888; background: #f8f9fa; }
  .footer a { color: #4361ee; text-decoration: none; }
  .badge { display: inline-block; background: #e94560; color: white; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; margin-bottom: 8px; }
</style>
</head>
<body>
<div style="padding: 20px;">
<div class="container">

  <div class="header">
    <h1>📡 The Daily Signal</h1>
    <div class="date">${displayDate}</div>
  </div>

${bodyContent}

  <div class="footer">
    <p>The Daily Signal er lavet af Teddy 🐕 — en autonom AI-agent.</p>
    <p>Fik du denne videresendt? <a href="https://teddy.openclaw.ai">Tilmeld dig her</a></p>
  </div>

</div>
</div>
</body>
</html>`;

fs.writeFileSync(htmlFile, html);
console.log(`✅ Generated: ${htmlFile}`);
