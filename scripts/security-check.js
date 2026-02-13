#!/usr/bin/env node

/**
 * Security Check Script
 * Performs basic security checks on the codebase
 */

const fs = require('fs').promises;
const path = require('path');

const SECURITY_CHECKS = {
  'Hardcoded Secrets': {
    patterns: [
      /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i,
      /password\s*[:=]\s*['"][^'"]+['"]/i,
      /secret\s*[:=]\s*['"][^'"]+['"]/i,
      /token\s*[:=]\s*['"][^'"]+['"]/i,
    ],
    severity: 'HIGH'
  },
  'Console.log statements': {
    patterns: [/console\.log\(/],
    severity: 'LOW'
  },
  'eval() usage': {
    patterns: [/\beval\s*\(/],
    severity: 'HIGH'
  },
  'innerHTML usage': {
    patterns: [/\.innerHTML\s*=/],
    severity: 'MEDIUM'
  }
};

async function scanFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const issues = [];
  const lines = content.split('\n');

  for (const [checkName, check] of Object.entries(SECURITY_CHECKS)) {
    for (const pattern of check.patterns) {
      // Use global flag to find all occurrences
      const globalPattern = new RegExp(pattern.source, pattern.flags + (pattern.flags.includes('g') ? '' : 'g'));
      let match;
      while ((match = globalPattern.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        issues.push({
          file: filePath,
          check: checkName,
          severity: check.severity,
          line: lineNumber
        });
      }
    }
  }

  return issues;
}

async function scanDirectory(dir, baseDir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const issues = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    // Skip vendor, node_modules, etc.
    if (entry.name === 'vendor' || entry.name === 'node_modules' || 
        entry.name === '.git' || entry.name.startsWith('.')) {
      continue;
    }

    if (entry.isDirectory()) {
      const subIssues = await scanDirectory(fullPath, baseDir);
      issues.push(...subIssues);
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.html')) {
      const fileIssues = await scanFile(fullPath);
      issues.push(...fileIssues);
    }
  }

  return issues;
}

async function runSecurityCheck() {
  console.log('🔒 Starting Security Check...\n');

  const docsDir = path.join(process.cwd(), 'docs');
  const issues = await scanDirectory(docsDir, docsDir);

  console.log('='.repeat(60));
  console.log('🔒 SECURITY CHECK RESULTS');
  console.log('='.repeat(60) + '\n');

  if (issues.length === 0) {
    console.log('✅ No security issues found!\n');
    return;
  }

  // Group by severity
  const high = issues.filter(i => i.severity === 'HIGH');
  const medium = issues.filter(i => i.severity === 'MEDIUM');
  const low = issues.filter(i => i.severity === 'LOW');

  if (high.length > 0) {
    console.log('🔴 HIGH Severity Issues:');
    high.forEach(issue => {
      console.log(`  - ${issue.check} in ${path.relative(process.cwd(), issue.file)}:${issue.line}`);
    });
    console.log('');
  }

  if (medium.length > 0) {
    console.log('🟡 MEDIUM Severity Issues:');
    medium.forEach(issue => {
      console.log(`  - ${issue.check} in ${path.relative(process.cwd(), issue.file)}:${issue.line}`);
    });
    console.log('');
  }

  if (low.length > 0) {
    console.log('🟢 LOW Severity Issues:');
    low.forEach(issue => {
      console.log(`  - ${issue.check} in ${path.relative(process.cwd(), issue.file)}:${issue.line}`);
    });
    console.log('');
  }

  console.log('='.repeat(60));
  console.log(`Total: ${issues.length} issues (HIGH: ${high.length}, MEDIUM: ${medium.length}, LOW: ${low.length})`);
  console.log('='.repeat(60) + '\n');

  process.exit(high.length > 0 ? 1 : 0);
}

runSecurityCheck().catch(err => {
  console.error('Error running security check:', err);
  process.exit(1);
});
