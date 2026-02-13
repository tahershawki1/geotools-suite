#!/usr/bin/env node

/**
 * Accessibility Testing Script
 * Tests all HTML pages for WCAG 2.1 AA compliance using axe-core
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;

const execAsync = promisify(exec);

const PAGES = [
  'http://localhost:8000/',
  'http://localhost:8000/pages/file-converter.html',
  'http://localhost:8000/pages/dltm-converter.html',
  'http://localhost:8000/pages/coordinate-transform.html',
  'http://localhost:8000/pages/area-calculator.html',
];

async function testPage(url) {
  console.log(`\n🔍 Testing: ${url}`);
  try {
    const { stdout, stderr } = await execAsync(
      `npx @axe-core/cli ${url} --exit`
    );
    console.log(`✅ PASSED: No accessibility issues found`);
    return { url, passed: true, issues: [] };
  } catch (error) {
    console.log(`⚠️  FAILED: Accessibility issues detected`);
    console.log(error.stdout || error.message);
    return { url, passed: false, issues: error.stdout || error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting Accessibility Tests...\n');
  console.log('Make sure the local server is running on port 8000');
  console.log('Run: npm start\n');

  const results = [];
  
  for (const page of PAGES) {
    const result = await testPage(page);
    results.push(result);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 ACCESSIBILITY TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`\n✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}\n`);

  if (failed > 0) {
    console.log('Failed pages:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.url}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Error running tests:', err);
  process.exit(1);
});
