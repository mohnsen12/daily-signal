#!/usr/bin/env node
/**
 * Weekly Recap Generator for The Daily Signal
 * 
 * Generates a "Ugens Opsamling" (Week in Review) edition
 * by aggregating all newsletters from the past week.
 * 
 * Usage: node scripts/generate-weekly-recap.mjs
 * Output: content/weekly-YYYY-WNN.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.join(__dirname, '..', 'content');
const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'weekly-recap.md');

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getWeekDateRange(weekNum, year) {
  const jan1 = new Date(year, 0, 1);
  const days = (weekNum - 1) * 7 - jan1.getDay() + 1;
  const start = new Date(year, 0, days);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  
  const formatDate = (d) => {
    const months = ['januar', 'februar', 'marts', 'april', 'maj', 'juni',
                    'juli', 'august', 'september', 'oktober', 'november', 'december'];
    return `${d.getDate()}. ${months[d.getMonth()]}`;
  };
  
  return { start: formatDate(start), end: formatDate(end) };
}

function parseNewsletter(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath, '.md');
  
  // Extract title
  const titleMatch = content.match(/^# (.+)/m);
  const title = titleMatch ? titleMatch[1] : fileName;
  
  // Extract stories (lines starting with ###)
  const stories = [];
  const storyRegex = /^### (.+)/gm;
  let match;
  while ((match = storyRegex.exec(content)) !== null) {
    stories.push(match[1].replace(/^\[|\]$/g, ''));
  }
  
  // Extract quote
  const quoteMatch = content.match(/> "([^"]+)"/);
  const quote = quoteMatch ? quoteMatch[1] : null;
  const quoteAuthor = content.match(/— (.+?)(?:\n|$)/)?.[1] || null;
  
  // Extract quality score if present in log
  const qualityMatch = content.match(/Kvalitet[::]?\s*(\d+)\/100/);
  const quality = qualityMatch ? parseInt(qualityMatch[1]) : null;
  
  // Word count
  const words = content.split(/\s+/).length;
  
  // Count TL;DR bullets
  const tldrMatch = content.match(/## 📋 TL;DR\n([\s\S]*?)(?=\n## )/);
  const tldrCount = tldrMatch ? (tldrMatch[1].match(/^- /gm) || []).length : 0;
  
  return {
    date: fileName,
    title,
    stories,
    storyCount: stories.length,
    quote,
    quoteAuthor,
    quality,
    words,
    hasTLDR: tldrCount > 0,
    tldrCount,
  };
}

function extractTopStories(newsletters) {
  // Collect all stories with their source dates
  const allStories = [];
  for (const nl of newsletters) {
    for (const story of nl.stories) {
      allStories.push({ story, date: nl.date });
    }
  }
  
  // Score stories by position (first stories are more important)
  // and by frequency (stories spanning multiple days get bonus)
  const storyScores = {};
  for (const nl of newsletters) {
    nl.stories.forEach((story, index) => {
      const key = story.substring(0, 50); // fuzzy match via prefix
      if (!storyScores[key]) storyScores[key] = { story, score: 0, dates: [] };
      storyScores[key].score += (nl.stories.length - index) * 10;
      storyScores[key].dates.push(nl.date);
    });
  }
  
  // Sort by score and return top 3
  return Object.values(storyScores)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function findBestQuote(newsletters) {
  // Find the most impactful quote
  for (const nl of newsletters) {
    if (nl.quote && nl.quote.length > 30) {
      return { quote: nl.quote, author: nl.quoteAuthor };
    }
  }
  return null;
}

function generateWeeklyRecap() {
  const now = new Date();
  const weekNum = getWeekNumber(now);
  const year = now.getFullYear();
  const weekId = `${year}-W${String(weekNum).padStart(2, '0')}`;
  const dateRange = getWeekDateRange(weekNum, year);
  
  // Find all newsletters from this week
  const files = fs.readdirSync(CONTENT_DIR)
    .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.md$/))
    .sort();
  
  // Filter to current week (approximate — last 7 days)
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const weekFiles = files.filter(f => {
    const dateStr = f.replace('.md', '');
    const fileDate = new Date(dateStr);
    return fileDate >= weekAgo && fileDate <= now;
  });
  
  if (weekFiles.length === 0) {
    console.log('⚠️  No newsletters found for this week');
    return null;
  }
  
  // Parse all newsletters
  const newsletters = weekFiles.map(f => 
    parseNewsletter(path.join(CONTENT_DIR, f))
  );
  
  console.log(`📊 Found ${newsletters.length} newsletters from week ${weekNum}`);
  
  // Extract data
  const topStories = extractTopStories(newsletters);
  const bestQuote = findBestQuote(newsletters);
  const totalStories = newsletters.reduce((sum, nl) => sum + nl.storyCount, 0);
  const avgQuality = Math.round(
    newsletters.filter(nl => nl.quality).reduce((sum, nl) => sum + (nl.quality || 0), 0) /
    newsletters.filter(nl => nl.quality).length
  );
  
  // Generate issue table
  const issueTable = newsletters.map(nl => {
    const q = nl.quality ? `${nl.quality}/100` : '—';
    return `| ${nl.date} | #${nl.date.slice(-2)} | ${nl.storyCount} | ${q} |`;
  }).join('\n');
  
  // Read template
  let template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
  
  // Replace placeholders
  const replacements = {
    '[WEEK_NUMBER]': `Uge ${weekNum}`,
    '[START_DATE]': dateRange.start,
    '[END_DATE]': dateRange.end,
    '[TOTAL]': String(totalStories),
    '[X]': '?', // Unknown metrics
  };
  
  for (const [key, value] of Object.entries(replacements)) {
    template = template.replaceAll(key, value);
  }
  
  // Write output
  const outputPath = path.join(CONTENT_DIR, `weekly-${weekId}.md`);
  fs.writeFileSync(outputPath, template);
  console.log(`✅ Weekly recap template generated: ${outputPath}`);
  console.log(`📝 Next step: Fill in the template with this week's data`);
  console.log(`   Top stories: ${topStories.map(s => s.story.substring(0, 40)).join(' | ')}`);
  console.log(`   Best quote: ${bestQuote ? bestQuote.quote.substring(0, 60) + '...' : 'None found'}`);
  
  return {
    weekId,
    outputPath,
    newsletters: newsletters.length,
    totalStories,
    avgQuality,
    topStories,
    bestQuote,
  };
}

// Run
const result = generateWeeklyRecap();
if (result) {
  console.log('\n📊 Summary:', JSON.stringify(result, null, 2));
}
