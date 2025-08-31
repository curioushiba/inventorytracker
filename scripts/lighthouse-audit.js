const { default: lighthouse } = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

async function runLighthouseAudit() {
  // Launch Chrome
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox']
  });

  const options = {
    logLevel: 'info',
    output: 'html',
    onlyCategories: ['performance', 'pwa', 'best-practices', 'accessibility', 'seo'],
    port: chrome.port
  };

  try {
    // Run Lighthouse audit on localhost:3000
    console.log('Running Lighthouse audit on http://localhost:3000...');
    const runnerResult = await lighthouse('http://localhost:3000', options);

    // Extract scores
    const { categories } = runnerResult.lhr;
    
    console.log('\n=== Lighthouse PWA Audit Results ===\n');
    console.log(`PWA Score: ${Math.round(categories.pwa.score * 100)}/100`);
    console.log(`Performance Score: ${Math.round(categories.performance.score * 100)}/100`);
    console.log(`Accessibility Score: ${Math.round(categories.accessibility.score * 100)}/100`);
    console.log(`Best Practices Score: ${Math.round(categories['best-practices'].score * 100)}/100`);
    console.log(`SEO Score: ${Math.round(categories.seo.score * 100)}/100`);

    // PWA specific audits
    console.log('\n=== PWA Requirements ===\n');
    const pwaAudits = runnerResult.lhr.audits;
    
    const criticalPwaAudits = [
      'installable-manifest',
      'service-worker',
      'offline-start-url',
      'is-on-https',
      'viewport',
      'apple-touch-icon',
      'maskable-icon',
      'content-width',
      'themed-omnibox',
      'splash-screen'
    ];

    criticalPwaAudits.forEach(auditId => {
      if (pwaAudits[auditId]) {
        const audit = pwaAudits[auditId];
        const status = audit.score === 1 ? '✅' : audit.score === 0 ? '❌' : '⚠️';
        console.log(`${status} ${audit.title}`);
        if (audit.score !== 1 && audit.description) {
          console.log(`   ↳ ${audit.description}`);
        }
      }
    });

    // Performance metrics
    console.log('\n=== Performance Metrics ===\n');
    const metrics = runnerResult.lhr.audits.metrics.details.items[0];
    console.log(`First Contentful Paint: ${Math.round(metrics.firstContentfulPaint)}ms`);
    console.log(`Largest Contentful Paint: ${Math.round(metrics.largestContentfulPaint)}ms`);
    console.log(`Time to Interactive: ${Math.round(metrics.interactive)}ms`);
    console.log(`Speed Index: ${Math.round(metrics.speedIndex)}ms`);
    console.log(`Total Blocking Time: ${Math.round(metrics.totalBlockingTime)}ms`);
    console.log(`Cumulative Layout Shift: ${metrics.cumulativeLayoutShift}`);

    // Save HTML report
    const reportPath = path.join(__dirname, '..', 'lighthouse-report.html');
    fs.writeFileSync(reportPath, runnerResult.report);
    console.log(`\n✅ Full report saved to: ${reportPath}`);

    // Save JSON results for tracking
    const jsonPath = path.join(__dirname, '..', 'lighthouse-results.json');
    const jsonResults = {
      timestamp: new Date().toISOString(),
      scores: {
        pwa: Math.round(categories.pwa.score * 100),
        performance: Math.round(categories.performance.score * 100),
        accessibility: Math.round(categories.accessibility.score * 100),
        bestPractices: Math.round(categories['best-practices'].score * 100),
        seo: Math.round(categories.seo.score * 100)
      },
      metrics: {
        fcp: Math.round(metrics.firstContentfulPaint),
        lcp: Math.round(metrics.largestContentfulPaint),
        tti: Math.round(metrics.interactive),
        si: Math.round(metrics.speedIndex),
        tbt: Math.round(metrics.totalBlockingTime),
        cls: metrics.cumulativeLayoutShift
      }
    };
    fs.writeFileSync(jsonPath, JSON.stringify(jsonResults, null, 2));

    return jsonResults;
  } finally {
    await chrome.kill();
  }
}

// Check if lighthouse is installed
try {
  require.resolve('lighthouse');
  require.resolve('chrome-launcher');
  runLighthouseAudit().then(results => {
    console.log('\n🎉 Lighthouse audit complete!');
    
    // Check if PWA score meets target
    if (results.scores.pwa >= 90) {
      console.log(`✅ PWA score target met: ${results.scores.pwa}/100 (target: >90)`);
    } else if (results.scores.pwa >= 70) {
      console.log(`⚠️ PWA score is good but below target: ${results.scores.pwa}/100 (target: >90)`);
    } else {
      console.log(`❌ PWA score needs improvement: ${results.scores.pwa}/100 (target: >90)`);
    }
  }).catch(console.error);
} catch (error) {
  console.log('Installing Lighthouse dependencies...');
  const { execSync } = require('child_process');
  execSync('npm install lighthouse chrome-launcher', { stdio: 'inherit' });
  console.log('Dependencies installed. Please run this script again.');
}