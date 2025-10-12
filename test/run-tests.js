#!/usr/bin/env node

/**
 * Test runner for Note Automation System
 * Runs all unit tests for job components
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const testFiles = [
  'test/jobs/research-job.test.js',
  'test/jobs/writing-job.test.js',
  'test/jobs/fact-check-job.test.js',
  'test/jobs/publishing-job.test.js'
];

console.log('🧪 Running Note Automation System Unit Tests\n');

async function runTests() {
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const testFile of testFiles) {
    console.log(`\n📋 Running ${testFile}...`);
    console.log('─'.repeat(50));

    try {
      const result = await runTestFile(testFile);
      totalTests += result.total;
      passedTests += result.passed;
      failedTests += result.failed;

      if (result.failed === 0) {
        console.log(`✅ ${testFile}: All tests passed (${result.passed}/${result.total})`);
      } else {
        console.log(`❌ ${testFile}: ${result.failed} test(s) failed (${result.passed}/${result.total} passed)`);
      }
    } catch (error) {
      console.error(`💥 ${testFile}: Test execution failed`);
      console.error(error.message);
      failedTests++;
      totalTests++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Success Rate: ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%`);

  if (failedTests === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n💔 Some tests failed. Please check the output above.');
    process.exit(1);
  }
}

function runTestFile(testFile) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['--test', testFile], {
      stdio: 'pipe',
      cwd: process.cwd()
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      // Parse test results from Node.js test runner output
      const output = stdout + stderr;
      console.log(output);

      // Simple parsing - Node.js test runner outputs summary
      const passedMatch = output.match(/(\d+) passed/);
      const failedMatch = output.match(/(\d+) failed/);
      const totalMatch = output.match(/tests (\d+)/);

      const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
      const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
      const total = totalMatch ? parseInt(totalMatch[1]) : passed + failed;

      if (code === 0) {
        resolve({ total, passed, failed });
      } else {
        // Even if exit code is non-zero, we can still extract results
        resolve({ total: total || 1, passed, failed: failed || 1 });
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests };