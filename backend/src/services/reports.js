const fs = require('fs');
const path = require('path');

class ReportService {
  constructor(db) {
    this.db = db;
    this.reportsDir = path.join(__dirname, '../../data/reports');
    
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  // Generate PDF-like HTML report
  async generateReport(domainId, options = {}) {
    const db = this.db;
    
    // Get domain info
    const domain = db.prepare('SELECT * FROM domains WHERE id = ?').get(domainId);
    if (!domain) throw new Error('Domain not found');

    // Get scan history
    const scans = db.prepare(`
      SELECT * FROM scans WHERE domain_id = ? ORDER BY scanned_at DESC 
      LIMIT ${options.limit || 30}
    `).all(domainId);

    // Get all issues
    const allIssues = db.prepare(`
      SELECT issues FROM scans WHERE domain_id = ? ORDER BY scanned_at DESC
    `).all(domainId);

    const issueCounts = { high: 0, medium: 0, low: 0 };
    allIssues.forEach(scan => {
      try {
        const issues = JSON.parse(scan.issues || '[]');
        issues.forEach(issue => {
          if (issue.severity === 'high') issueCounts.high++;
          else if (issue.severity === 'medium') issueCounts.medium++;
          else issueCounts.low++;
        });
      } catch (e) {}
    });

    // Calculate trends
    const scores = scans.map(s => s.score).filter(s => s !== null);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const trend = scores.length >= 2 ? (scores[0] - scores[scores.length - 1]) : 0;

    // Generate HTML
    const reportHtml = this.generateHtmlReport(domain, scans, issueCounts, avgScore, trend, options);
    
    // Save report
    const filename = `report_${domain.name}_${Date.now()}.html`;
    const filepath = path.join(this.reportsDir, filename);
    fs.writeFileSync(filepath, reportHtml);

    // Log to database
    db.prepare(`
      INSERT INTO reports (domain_id, type, filename, generated_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(domainId, 'html', filename);

    return { filepath, filename, domain: domain.name };
  }

  generateHtmlReport(domain, scans, issueCounts, avgScore, trend, options) {
    const trendDirection = trend > 0 ? '📈' : trend < 0 ? '📉' : '➡️';
    const trendClass = trend > 0 ? 'positive' : trend < 0 ? 'negative' : 'neutral';
    
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Security Report - ${domain.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; line-height: 1.6; color: #1f2937; background: #f9fafb; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 40px; border-radius: 16px; margin-bottom: 30px; }
    .header h1 { font-size: 32px; margin-bottom: 10px; }
    .header .domain { font-size: 24px; opacity: 0.9; }
    .header .date { font-size: 14px; opacity: 0.7; margin-top: 10px; }
    
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
    .stat-card { background: white; padding: 24px; border-radius: 12px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .stat-card .value { font-size: 36px; font-weight: bold; color: #1e3a8a; }
    .stat-card .label { font-size: 14px; color: #6b7280; margin-top: 5px; }
    .stat-card.warning .value { color: #f59e0b; }
    .stat-card.danger .value { color: #ef4444; }
    .stat-card.positive .value { color: #10b981; }
    
    .section { background: white; padding: 30px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .section h2 { font-size: 20px; margin-bottom: 20px; color: #1f2937; }
    
    .chart { display: flex; align-items: flex-end; gap: 8px; height: 150px; padding: 20px 0; }
    .chart-bar { flex: 1; background: linear-gradient(to top, #3b82f6, #60a5fa); border-radius: 4px 4px 0 0; min-height: 10px; }
    .chart-label { text-align: center; font-size: 11px; color: #6b7280; margin-top: 8px; }
    
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; color: #374151; }
    
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 500; }
    .badge.pass { background: #d1fae5; color: #065f46; }
    .badge.fail { background: #fee2e2; color: #991b1b; }
    .badge.warning { background: #fef3c7; color: #92400e; }
    
    .score-badge { display: inline-flex; align-items: center; justify-content: center; width: 60px; height: 60px; border-radius: 50%; font-size: 20px; font-weight: bold; }
    .score-badge.high { background: #d1fae5; color: #065f46; }
    .score-badge.medium { background: #fef3c7; color: #92400e; }
    .score-badge.low { background: #fee2e2; color: #991b1b; }
    
    .footer { text-align: center; padding: 30px; color: #9ca3af; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Email Security Report</h1>
      <div class="domain">${domain.name}</div>
      <div class="date">Generated: ${new Date().toLocaleString()}</div>
    </div>
    
    <div class="stats-grid">
      <div class="stat-card ${avgScore >= 70 ? 'positive' : avgScore >= 40 ? 'warning' : 'danger'}">
        <div class="value">${avgScore}</div>
        <div class="label">Average Score</div>
      </div>
      <div class="stat-card">
        <div class="value">${issueCounts.high}</div>
        <div class="label">High Issues</div>
      </div>
      <div class="stat-card">
        <div class="value">${issueCounts.medium}</div>
        <div class="label">Medium Issues</div>
      </div>
      <div class="stat-card">
        <div class="value">${scans.length}</div>
        <div class="label">Total Scans</div>
      </div>
    </div>
    
    <div class="section">
      <h2>Score Trend ${trendDirection}</h2>
      <div class="chart">
        ${scans.slice(0, 14).reverse().map(scan => `
          <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
            <div class="chart-bar" style="height: ${scan.score}%; background: ${scan.score >= 70 ? '#10b981' : scan.score >= 40 ? '#f59e0b' : '#ef4444'};"></div>
            <div class="chart-label">${new Date(scan.scanned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
          </div>
        `).join('')}
      </div>
    </div>
    
    <div class="section">
      <h2>Recent Scan History</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Score</th>
            <th>SPF</th>
            <th>DKIM</th>
            <th>DMARC</th>
          </tr>
        </thead>
        <tbody>
          ${scans.slice(0, 10).map(scan => `
            <tr>
              <td>${new Date(scan.scanned_at).toLocaleString()}</td>
              <td><span class="score-badge ${scan.score >= 70 ? 'high' : scan.score >= 40 ? 'medium' : 'low'}">${scan.score}</span></td>
              <td><span class="badge ${scan.spf_status === 'FOUND' ? 'pass' : 'fail'}">${scan.spf_status}</span></td>
              <td><span class="badge ${scan.dkim_status === 'FOUND' ? 'pass' : 'fail'}">${scan.dkim_status}</span></td>
              <td><span class="badge ${scan.dmarc_status === 'FOUND' ? 'pass' : 'fail'}">${scan.dmarc_status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="section">
      <h2>Configuration</h2>
      <table>
        <tr>
          <td><strong>DNS Provider</strong></td>
          <td>${domain.provider || 'Manual'}</td>
        </tr>
        <tr>
          <td><strong>Auto-Remediation</strong></td>
          <td>${domain.auto_fix ? 'Enabled' : 'Disabled'}</td>
        </tr>
        <tr>
          <td><strong>Scheduled Scans</strong></td>
          <td>Daily</td>
        </tr>
      </table>
    </div>
    
    <div class="footer">
      <p>Generated by NexusEmail - Open Source Email Security Platform</p>
      <p>nexusemail.local</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  // Generate CSV export
  async exportCSV(domainIds) {
    const db = this.db;
    const domains = domainIds.length > 0 
      ? domainIds.map(id => db.prepare('SELECT * FROM domains WHERE id = ?').get(id)).filter(Boolean)
      : db.prepare('SELECT * FROM domains').all();

    const csv = [
      'Domain,Provider,Last Scan,Score,SPF,DKIM,DMARC,Issues'
    ];

    for (const domain of domains) {
      const latestScan = db.prepare('SELECT * FROM scans WHERE domain_id = ? ORDER BY scanned_at DESC LIMIT 1').get(domain.id);
      const issues = latestScan ? JSON.parse(latestScan.issues || '[]') : [];
      
      csv.push([
        domain.name,
        domain.provider || 'manual',
        latestScan ? new Date(latestScan.scanned_at).toISOString() : 'Never',
        latestScan?.score || 0,
        latestScan?.spf_status || 'N/A',
        latestScan?.dkim_status || 'N/A',
        latestScan?.dmarc_status || 'N/A',
        issues.length
      ].join(','));
    }

    const filename = `nexusemail_export_${Date.now()}.csv`;
    const filepath = path.join(this.reportsDir, filename);
    fs.writeFileSync(filepath, csv.join('\n'));

    return { filepath, filename };
  }

  // Get list of reports
  getReports(domainId = null) {
    const db = this.db;
    const query = domainId 
      ? 'SELECT * FROM reports WHERE domain_id = ? ORDER BY generated_at DESC'
      : 'SELECT * FROM reports ORDER BY generated_at DESC';
    
    const params = domainId ? [domainId] : [];
    return db.prepare(query).all(...params);
  }

  // Delete old reports
  cleanup(daysToKeep = 30) {
    const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    const reports = this.getReports();
    
    reports.forEach(report => {
      const reportDate = new Date(report.generated_at).getTime();
      if (reportDate < cutoff) {
        const filepath = path.join(this.reportsDir, report.filename);
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
        this.db.prepare('DELETE FROM reports WHERE id = ?').run(report.id);
      }
    });
  }
}

module.exports = { ReportService };