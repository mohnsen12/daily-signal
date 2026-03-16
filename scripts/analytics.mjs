#!/usr/bin/env node
/**
 * Growth Analytics for The Daily Signal
 * Tracks newsletter production, content quality, and growth metrics.
 * Run: node scripts/analytics.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const DATA_FILE = path.join(ROOT, 'analytics.json');

// --- Collect newsletter files ---
function getNewsletterFiles() {
  const files = fs.readdirSync(CONTENT_DIR)
    .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.md$/))
    .sort();
  return files;
}

// --- Parse a newsletter markdown ---
function parseNewsletter(filepath) {
  const content = fs.readFileSync(filepath, 'utf-8');
  const filename = path.basename(filepath, '.md');
  
  // Count stories (## headings that aren't the title)
  const storyMatches = content.match(/^## [^#]/gm) || [];
  const storyCount = storyMatches.length;
  
  // Count words
  const words = content.split(/\s+/).filter(w => w.length > 0).length;
  
  // Count external links
  const linkMatches = content.match(/\[Læs mere\]/g) || [];
  const linkCount = linkMatches.length;
  
  // Count sections
  const sections = content.match(/^## /gm) || [];
  const sectionCount = sections.length;
  
  // Extract section names
  const sectionNames = [];
  const sectionRegex = /^## (.+)$/gm;
  let match;
  while ((match = sectionRegex.exec(content)) !== null) {
    sectionNames.push(match[1].trim());
  }
  
  // Check for key features
  const hasTLDR = content.includes('TL;DR') || content.includes('Hurtigt overblik');
  const hasTool = content.includes('Værktøj') || content.includes('Dagens Værktøj');
  const hasNumbers = content.includes('I tal');
  const hasOpinion = content.includes('Hvorfor') || content.includes('Hvad betyder');
  
  return {
    date: filename,
    storyCount,
    wordCount: words,
    linkCount,
    sectionCount,
    sectionNames,
    features: {
      tldr: hasTLDR,
      tool: hasTool,
      numbers: hasNumbers,
      opinion: hasOpinion,
    },
    readingTimeMin: Math.ceil(words / 200), // ~200 words/min for Danish
  };
}

// --- Calculate growth metrics ---
function calculateMetrics(newsletters) {
  const total = newsletters.length;
  if (total === 0) return null;
  
  const avgStories = newsletters.reduce((s, n) => s + n.storyCount, 0) / total;
  const avgWords = newsletters.reduce((s, n) => s + n.wordCount, 0) / total;
  const avgLinks = newsletters.reduce((s, n) => s + n.linkCount, 0) / total;
  const avgReadTime = newsletters.reduce((s, n) => s + n.readingTimeMin, 0) / total;
  
  // Content quality score (0-100)
  const latest = newsletters[newsletters.length - 1];
  let qualityScore = 0;
  qualityScore += Math.min(latest.storyCount * 10, 30); // Up to 30 pts for stories
  qualityScore += latest.features.tldr ? 15 : 0;
  qualityScore += latest.features.tool ? 15 : 0;
  qualityScore += latest.features.numbers ? 15 : 0;
  qualityScore += latest.features.opinion ? 15 : 0;
  qualityScore += latest.linkCount >= latest.storyCount ? 10 : 5;
  
  // Consistency streak
  let streak = 0;
  const today = new Date();
  for (let i = newsletters.length - 1; i >= 0; i--) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - (newsletters.length - 1 - i));
    if (newsletters[i].date === expected.toISOString().split('T')[0]) {
      streak++;
    } else {
      break;
    }
  }
  
  return {
    totalIssues: total,
    avgStories: Math.round(avgStories * 10) / 10,
    avgWords: Math.round(avgWords),
    avgLinks: Math.round(avgLinks * 10) / 10,
    avgReadTimeMin: Math.round(avgReadTime * 10) / 10,
    qualityScore,
    consistencyStreak: streak,
    latestIssue: latest,
  };
}

// --- Load/save historical data ---
function loadHistory() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return { snapshots: [], firstRun: new Date().toISOString() };
  }
}

function saveHistory(history) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(history, null, 2));
}

// --- Generate report ---
function generateReport(metrics, newsletters) {
  const now = new Date().toISOString().split('T')[0];
  
  let report = `# 📊 Growth Analytics — The Daily Signal\n`;
  report += `**Generated:** ${now}\n\n`;
  
  report += `## Production Stats\n`;
  report += `| Metric | Value |\n|--------|-------|\n`;
  report += `| Total issues | ${metrics.totalIssues} |\n`;
  report += `| Avg stories/issue | ${metrics.avgStories} |\n`;
  report += `| Avg words/issue | ${metrics.avgWords} |\n`;
  report += `| Avg reading time | ${metrics.avgReadTimeMin} min |\n`;
  report += `| Consistency streak | ${metrics.consistencyStreak} days |\n`;
  report += `| Content quality score | ${metrics.qualityScore}/100 |\n\n`;
  
  report += `## Latest Issue: ${metrics.latestIssue.date}\n`;
  report += `- **Stories:** ${metrics.latestIssue.storyCount}\n`;
  report += `- **Words:** ${metrics.latestIssue.wordCount}\n`;
  report += `- **Sections:** ${metrics.latestIssue.sectionNames.join(', ')}\n`;
  report += `- **Features:** `;
  const features = [];
  if (metrics.latestIssue.features.tldr) features.push('✅ TL;DR');
  else features.push('❌ TL;DR');
  if (metrics.latestIssue.features.tool) features.push('✅ Tool');
  else features.push('❌ Tool');
  if (metrics.latestIssue.features.numbers) features.push('✅ Stats');
  else features.push('❌ Stats');
  if (metrics.latestIssue.features.opinion) features.push('✅ Analysis');
  else features.push('❌ Analysis');
  report += features.join(' | ') + '\n\n';
  
  report += `## Content Trend\n`;
  report += `| Date | Stories | Words | Quality |\n|------|---------|-------|--------|\n`;
  newsletters.slice(-7).forEach(n => {
    let q = 0;
    q += Math.min(n.storyCount * 10, 30);
    q += n.features.tldr ? 15 : 0;
    q += n.features.tool ? 15 : 0;
    q += n.features.numbers ? 15 : 0;
    q += n.features.opinion ? 15 : 0;
    q += n.linkCount >= n.storyCount ? 10 : 5;
    report += `| ${n.date} | ${n.storyCount} | ${n.wordCount} | ${q}/100 |\n`;
  });
  
  report += `\n## Growth Recommendations\n`;
  
  // Smart recommendations based on data
  const recs = [];
  if (metrics.qualityScore < 80) {
    if (!metrics.latestIssue.features.tldr) recs.push('📌 Add TL;DR section for better engagement');
    if (!metrics.latestIssue.features.numbers) recs.push('📌 Add "I tal" stats section for shareability');
    if (!metrics.latestIssue.features.opinion) recs.push('📌 Add analysis/opinion section for depth');
  }
  if (metrics.latestIssue.storyCount < 5) recs.push('📌 Aim for 5-7 stories per issue');
  if (metrics.consistencyStreak < metrics.totalIssues) recs.push('⚠️ Missed a day — consistency is key for growth');
  if (recs.length === 0) recs.push('✨ Content quality is solid! Focus on promotion.');
  
  report += recs.join('\n') + '\n';
  
  return report;
}

// --- Main ---
const files = getNewsletterFiles();
const newsletters = files.map(f => parseNewsletter(path.join(CONTENT_DIR, f)));
const metrics = calculateMetrics(newsletters);

if (!metrics) {
  console.log('No newsletters found.');
  process.exit(0);
}

// Save snapshot
const history = loadHistory();
history.snapshots.push({
  date: new Date().toISOString(),
  metrics,
});
history.lastUpdated = new Date().toISOString();
saveHistory(history);

// Generate and save report
const report = generateReport(metrics, newsletters);
const reportPath = path.join(ROOT, 'GROWTH_REPORT.md');
fs.writeFileSync(reportPath, report);

console.log(report);
console.log(`\n✅ Report saved to GROWTH_REPORT.md`);
console.log(`📈 History: ${history.snapshots.length} snapshots tracked`);
