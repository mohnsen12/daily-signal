#!/usr/bin/env node
/**
 * render-email.js
 * Renders newsletter markdown into email-client-compatible HTML
 * Usage: node scripts/render-email.js content/2026-03-15.md content/2026-03-15-email.html
 */

const fs = require('fs');
const path = require('path');

function parseMarkdown(md) {
  const lines = md.split('\n');
  const result = {
    title: '',
    date: '',
    intro: '',
    breaking: [],
    produkter: [],
    analyse: [],
    vaerktojer: [],
    dagensSignal: '',
    dagensVaerktoj: null
  };

  let currentSection = null;
  let currentStory = null;
  let buffer = [];

  const flushStory = () => {
    if (currentStory) {
      currentStory.body = buffer.join(' ').trim();
      buffer = [];
      if (currentSection) result[currentSection].push(currentStory);
      currentStory = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) continue;

    // Title
    if (line.startsWith('# ')) {
      result.title = line.replace('# ', '').replace(/📡|🔥/g, '').trim();
      continue;
    }

    // Date
    if (line.startsWith('**Dato:')) {
      result.date = line.replace(/\*\*/g, '').replace('Dato:', '').trim();
      continue;
    }

    // Sections
    if (line.startsWith('## ')) {
      flushStory();
      const sectionName = line.replace('## ', '').replace(/🔥|📦|🔍|🛠️|🎙️|🐕/g, '').trim();
      if (sectionName.includes('Breaking')) currentSection = 'breaking';
      else if (sectionName.includes('Produkter')) currentSection = 'produkter';
      else if (sectionName.includes('Analyse')) currentSection = 'analyse';
      else if (sectionName.includes('Værktøjer')) currentSection = 'vaerktojer';
      else if (sectionName.includes('Signal')) currentSection = 'dagensSignal';
      else if (sectionName.includes('Værktøj')) currentSection = 'dagensVaerktoj';
      else currentSection = null;
      continue;
    }

    // Stories (### headings)
    if (line.startsWith('### ') && currentSection !== 'dagensSignal' && currentSection !== 'dagensVaerktoj') {
      flushStory();
      currentStory = { title: line.replace('### ', '').replace(/\*\*/g, '').trim(), link: '', body: '' };
      continue;
    }

    // Links
    const linkMatch = line.match(/\[Læs mere\]\((.+?)\)/);
    if (linkMatch && currentStory) {
      currentStory.link = linkMatch[1];
      continue;
    }

    // Dagens Signal (paragraph after ## 🎙️ Dagens Signal)
    if (currentSection === 'dagensSignal' && !line.startsWith('#')) {
      result.dagensSignal += (result.dagensSignal ? ' ' : '') + line;
      continue;
    }

    // Dagens Værktøj
    if (currentSection === 'dagensVaerktoj' && !line.startsWith('#')) {
      const toolLinkMatch = line.match(/\[([^\]]+)\]\((.+?)\)/);
      if (toolLinkMatch) {
        result.dagensVaerktoj = result.dagensVaerktoj || {};
        result.dagensVaerktoj.link = toolLinkMatch[2];
        result.dagensVaerktoj.linkText = toolLinkMatch[1];
      } else if (line.startsWith('**')) {
        result.dagensVaerktoj = result.dagensVaerktoj || {};
        result.dagensVaerktoj.title = line.replace(/\*\*/g, '').trim();
      } else {
        result.dagensVaerktoj = result.dagensVaerktoj || {};
        result.dagensVaerktoj.desc = (result.dagensVaerktoj.desc || '') + line;
      }
      continue;
    }

    // Regular paragraph in story
    if (currentStory && !line.startsWith('#') && !line.startsWith('[')) {
      buffer.push(line.replace(/\*\*/g, ''));
    }
  }
  flushStory();

  return result;
}

function renderStories(stories) {
  return stories.map(s => `
            <div class="story">
              <h3 style="font-size: 17px; font-weight: 700; margin: 0 0 8px 0; color: #1a1a2e; line-height: 1.4;">${s.title}</h3>
              <p style="font-size: 15px; line-height: 1.65; color: #444; margin: 0 0 10px 0;">${s.body}</p>
              ${s.link ? `<a href="${s.link}" class="read-more" style="display: inline-block; font-size: 13px; font-weight: 600; color: #e94560; text-decoration: none;">Læs mere →</a>` : ''}
            </div>`).join('\n');
}

function renderSection(label, emoji, stories) {
  if (!stories || stories.length === 0) return '';
  return `
          <tr>
            <td class="section" style="padding: 24px 32px; border-bottom: 1px solid #eee;">
              <p class="section-label" style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #888; margin: 0 0 16px 0; font-weight: 600;">${emoji} ${label}</p>
              ${renderStories(stories)}
            </td>
          </tr>`;
}

function render(data) {
  const template = fs.readFileSync(
    path.join(__dirname, '..', 'templates', 'newsletter-email.html'),
    'utf-8'
  );

  // Preheader = first story title for inbox preview
  const preheader = data.breaking[0]?.title || data.produkter[0]?.title || 'Dagens vigtigste AI & tech nyheder';
  const intro = data.intro || 'Her er dagens vigtigste AI & tech nyheder, samlet og opsummeret til dig.';

  let html = template
    .replace(/{{TITLE}}/g, `The Daily Signal — ${data.date}`)
    .replace(/{{DATE}}/g, data.date)
    .replace(/{{PREHEADER}}/g, preheader)
    .replace(/{{INTRO}}/g, intro)
    .replace(/{{BREAKING_SECTION}}/g, renderSection('Breaking', '🔥', data.breaking))
    .replace(/{{PRODUKTER_SECTION}}/g, renderSection('Produkter & Lanceringer', '📦', data.produkter))
    .replace(/{{ANALYSE_SECTION}}/g, renderSection('Analyse & Indsigt', '🔍', data.analyse))
    .replace(/{{VAERKTOJER_SECTION}}/g, renderSection('Værktøjer du bør kende', '🛠️', data.vaerktojer))
    .replace(/{{DAGENS_SIGNAL}}/g, data.dagensSignal || '')
    .replace(/{{UNSUBSCRIBE_URL}}/g, 'https://teddy.openclaw.ai/unsubscribe');

  // Handle dagens værktøj
  if (data.dagensVaerktoj) {
    const toolHtml = `
          <tr>
            <td class="section" style="padding: 24px 32px; border-bottom: 1px solid #eee;">
              <p class="section-label" style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #888; margin: 0 0 16px 0; font-weight: 600;">🐕 Dagens Værktøj</p>
              <div class="tool-box" style="background-color: #fff8e1; border-radius: 6px; padding: 18px 20px;">
                <h3 style="font-size: 16px; margin: 0 0 6px 0; color: #1a1a2e;">${data.dagensVaerktoj.title || ''}</h3>
                <p style="font-size: 14px; color: #555; margin: 0 0 10px 0; line-height: 1.5;">${data.dagensVaerktoj.desc || ''}</p>
                ${data.dagensVaerktoj.link ? `<a href="${data.dagensVaerktoj.link}" class="try-btn" style="display: inline-block; background-color: #e94560; color: #ffffff !important; padding: 8px 18px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600;">${data.dagensVaerktoj.linkText || 'Prøv det her'} →</a>` : ''}
              </div>
            </td>
          </tr>`;
    // Insert before dagens signal
    html = html.replace(
      /<!-- Dagens Signal/,
      toolHtml + '\n          <!-- Dagens Signal'
    );
  }

  return html;
}

// CLI
const [,, mdPath, outPath] = process.argv;
if (!mdPath) {
  console.error('Usage: node render-email.js <input.md> [output.html]');
  process.exit(1);
}

const md = fs.readFileSync(mdPath, 'utf-8');
const data = parseMarkdown(md);
const html = render(data);

const out = outPath || mdPath.replace('.md', '-email.html');
fs.writeFileSync(out, html);
console.log(`✅ Rendered: ${out}`);
