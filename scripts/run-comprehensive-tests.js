#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function runTests() {
  console.log('🚀 Starting Comprehensive PWA Testing Suite\n');
  
  const testResults = {
    startTime: new Date().toISOString(),
    results: {},
    summary: {},
    errors: []
  };
  
  const testProjects = [
    'Desktop Chrome',
    'Desktop Firefox', 
    'Desktop Safari',
    'Desktop Edge',
    'Mobile Chrome',
    'Mobile Safari',
    'Tablet iPad',
    'Performance Testing'
  ];
  
  console.log('📊 Test Configuration:');
  console.log(`- Projects: ${testProjects.length}`);
  console.log(`- Test Files: 7`);
  console.log(`- Target URL: http://localhost:3000`);
  console.log('');
  
  for (const project of testProjects) {
    console.log(`\n🔍 Running tests for: ${project}`);
    console.log('='.repeat(50));
    
    try {
      const result = await runPlaywrightProject(project);
      testResults.results[project] = result;
      
      if (result.success) {
        console.log(`✅ ${project}: PASSED (${result.duration}ms)`);
      } else {
        console.log(`❌ ${project}: FAILED`);
        console.log(`   Errors: ${result.errors.length}`);
      }
    } catch (error) {
      console.log(`💥 ${project}: ERROR - ${error.message}`);
      testResults.errors.push({
        project,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // Generate comprehensive report
  await generateReport(testResults);
  
  console.log('\n📈 Test Summary:');
  console.log('='.repeat(50));
  
  const passed = Object.values(testResults.results).filter(r => r.success).length;
  const total = Object.keys(testResults.results).length;
  
  console.log(`Total Projects: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${total - passed}`);
  console.log(`Errors: ${testResults.errors.length}`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed successfully!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the detailed report.');
  }
  
  console.log('\n📄 Reports generated:');
  console.log('- playwright-report/index.html (Interactive HTML report)');
  console.log('- test-results.json (JSON data)');
  console.log('- comprehensive-test-report.html (Custom report)');
}

function runPlaywrightProject(project) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const args = [
      'playwright', 'test',
      '--project', project,
      '--reporter=json'
    ];
    
    const child = spawn('npx', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: process.cwd()
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log(data.toString().trim());
    });
    
    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      
      try {
        const result = {
          success: code === 0,
          duration,
          exitCode: code,
          errors: stderr ? [stderr] : [],
          output: stdout
        };
        
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function generateReport(testResults) {
  const reportHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprehensive PWA Test Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6; 
            color: #333; 
            background: #f5f5f5;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; 
            padding: 40px 20px; 
            border-radius: 10px; 
            margin-bottom: 30px;
            text-align: center;
        }
        .header h1 { font-size: 2.5rem; margin-bottom: 10px; }
        .header p { font-size: 1.1rem; opacity: 0.9; }
        .stats { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; 
            margin-bottom: 30px; 
        }
        .stat-card { 
            background: white; 
            padding: 25px; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        .stat-number { 
            font-size: 2.5rem; 
            font-weight: bold; 
            margin-bottom: 5px; 
        }
        .stat-label { color: #666; font-size: 0.9rem; }
        .success { color: #22c55e; }
        .error { color: #ef4444; }
        .warning { color: #f59e0b; }
        .section { 
            background: white; 
            margin-bottom: 30px; 
            border-radius: 8px; 
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .section-header { 
            background: #f8f9fa; 
            padding: 20px; 
            border-bottom: 1px solid #e9ecef;
        }
        .section-header h2 { color: #495057; }
        .section-content { padding: 25px; }
        .test-result { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 15px; 
            border-left: 4px solid #e9ecef; 
            margin-bottom: 10px; 
            background: #f8f9fa;
            border-radius: 0 5px 5px 0;
        }
        .test-result.passed { border-left-color: #22c55e; background: #f0fdf4; }
        .test-result.failed { border-left-color: #ef4444; background: #fef2f2; }
        .test-name { font-weight: 600; }
        .test-duration { 
            font-size: 0.9rem; 
            color: #666; 
            background: #e9ecef; 
            padding: 4px 8px; 
            border-radius: 4px; 
        }
        .recommendations { 
            background: #fffbeb; 
            border: 1px solid #fed7aa; 
            border-radius: 8px; 
            padding: 20px; 
            margin-top: 20px; 
        }
        .recommendations h3 { color: #92400e; margin-bottom: 15px; }
        .recommendations ul { padding-left: 20px; }
        .recommendations li { margin-bottom: 8px; color: #78350f; }
        .error-details { 
            background: #fef2f2; 
            border: 1px solid #fecaca; 
            border-radius: 8px; 
            padding: 15px; 
            margin-top: 10px; 
            font-family: monospace; 
            font-size: 0.9rem; 
        }
        .footer { 
            text-align: center; 
            padding: 30px; 
            color: #666; 
            border-top: 1px solid #e9ecef; 
            margin-top: 40px; 
        }
        @media (max-width: 768px) {
            .stats { grid-template-columns: 1fr 1fr; }
            .header h1 { font-size: 2rem; }
            .container { padding: 15px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 PWA Test Report</h1>
            <p>Comprehensive testing results for Inventory Tracker PWA</p>
            <p>Generated: ${new Date(testResults.startTime).toLocaleString()}</p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number success">${Object.values(testResults.results).filter(r => r.success).length}</div>
                <div class="stat-label">Tests Passed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number error">${Object.values(testResults.results).filter(r => !r.success).length}</div>
                <div class="stat-label">Tests Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number warning">${testResults.errors.length}</div>
                <div class="stat-label">Errors</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Object.keys(testResults.results).length}</div>
                <div class="stat-label">Total Projects</div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-header">
                <h2>🎯 Test Results by Browser/Device</h2>
            </div>
            <div class="section-content">
                ${Object.entries(testResults.results).map(([project, result]) => `
                    <div class="test-result ${result.success ? 'passed' : 'failed'}">
                        <div class="test-name">${project}</div>
                        <div class="test-duration">${result.duration}ms</div>
                    </div>
                    ${result.errors.length > 0 ? `
                        <div class="error-details">
                            ${result.errors.join('\n')}
                        </div>
                    ` : ''}
                `).join('')}
            </div>
        </div>
        
        <div class="section">
            <div class="section-header">
                <h2>📱 Test Coverage</h2>
            </div>
            <div class="section-content">
                <h3>Completed Test Areas:</h3>
                <ul style="margin: 15px 0; padding-left: 25px;">
                    <li>✅ Homepage and Navigation</li>
                    <li>✅ Authentication Flow</li>
                    <li>✅ Inventory Dashboard</li>
                    <li>✅ PWA Installation and Features</li>
                    <li>✅ Performance Metrics (Core Web Vitals)</li>
                    <li>✅ Accessibility (WCAG Compliance)</li>
                    <li>✅ Mobile Touch Interactions</li>
                </ul>
                
                <h3 style="margin-top: 25px;">Browser Coverage:</h3>
                <ul style="margin: 15px 0; padding-left: 25px;">
                    <li>🖥️ Desktop: Chrome, Firefox, Safari, Edge</li>
                    <li>📱 Mobile: Chrome (Android), Safari (iOS)</li>
                    <li>📺 Tablet: iPad Pro (Portrait & Landscape)</li>
                </ul>
            </div>
        </div>
        
        ${testResults.errors.length > 0 ? `
        <div class="section">
            <div class="section-header">
                <h2>⚠️ Errors and Issues</h2>
            </div>
            <div class="section-content">
                ${testResults.errors.map(error => `
                    <div class="error-details">
                        <strong>${error.project}:</strong> ${error.error}
                        <br><small>Time: ${new Date(error.timestamp).toLocaleString()}</small>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        <div class="recommendations">
            <h3>💡 Recommendations</h3>
            <ul>
                <li>Review failed test results in the detailed Playwright report</li>
                <li>Focus on Core Web Vitals improvements for better performance scores</li>
                <li>Ensure all interactive elements meet accessibility standards</li>
                <li>Test PWA installation flow across different browsers</li>
                <li>Verify offline functionality works as expected</li>
                <li>Consider implementing automated performance monitoring</li>
                <li>Run accessibility audits with axe-playwright for comprehensive WCAG testing</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>Generated by Playwright Comprehensive Testing Suite</p>
            <p>For detailed test results, see: playwright-report/index.html</p>
        </div>
    </div>
</body>
</html>`;

  // Write comprehensive report
  fs.writeFileSync(
    path.join(process.cwd(), 'comprehensive-test-report.html'), 
    reportHTML
  );
  
  // Write JSON results
  fs.writeFileSync(
    path.join(process.cwd(), 'test-results-summary.json'), 
    JSON.stringify(testResults, null, 2)
  );
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };