const dns = require('dns').promises;

class BrandProtectionService {
  constructor() {
    this.commonTLDs = ['com', 'net', 'org', 'io', 'co', 'ai', 'app', 'dev', 'xyz', 'info', 'biz'];
    this.dangerousTypoPatterns = [
      { pattern: /^-/, description: 'Leading dash removal' },
      { pattern: /-$/, description: 'Trailing dash removal' },
      { pattern: /0/g, description: 'Zero instead of letter O' },
      { pattern: /1/g, description: 'One instead of letter L' },
      { pattern: /rn/g, description: 'rn instead of letter m' },
    ];
  }

  async checkBrandProtection(mainDomain) {
    const baseName = mainDomain.split('.')[0];
    const results = {
      domain: mainDomain,
      timestamp: new Date().toISOString(),
      lookalikes: [],
      typosquatting: [],
      impersonation: [],
      score: 100,
      issues: [],
      recommendations: []
    };

    try {
      // Check for typosquatting variations
      const typos = await this.checkTypoSquats(baseName, mainDomain);
      results.typosquatting = typos.records;
      if (typos.found > 0) {
        results.score -= typos.found * 15;
        results.issues.push({ type: 'typosquatting', count: typos.found, severity: 'high' });
        results.recommendations.push('Consider registering common typosquatting domains to prevent abuse');
      }

      // Check for lookalike domains
      const lookalikes = await this.checkLookalikes(baseName, mainDomain);
      results.lookalikes = lookalikes.records;
      if (lookalikes.found > 0) {
        results.score -= lookalikes.found * 10;
        results.issues.push({ type: 'lookalike', count: lookalikes.found, severity: 'medium' });
        results.recommendations.push('Monitor or register lookalike domains that could be used for phishing');
      }

      // Check for subdomain abuse
      const subdomains = await this.checkSubdomainAbuse(mainDomain);
      results.impersonation = subdomains.records;
      if (subdomains.found > 0) {
        results.score -= subdomains.found * 5;
        results.issues.push({ type: 'subdomain_abuse', count: subdomains.found, severity: 'low' });
      }

      results.score = Math.max(0, results.score);
    } catch (error) {
      results.error = error.message;
    }

    return results;
  }

  async checkTypoSquats(baseName, mainDomain) {
    const records = [];
    const variations = [];

    // Generate common typos
    for (const char of baseName) {
      if (char === 'o') variations.push(baseName.replace('o', '0'));
      if (char === 'l' || char === 'i') variations.push(baseName.replace(/[li]/g, '1'));
      if (char === 'a') variations.push(baseName.replace('a', 'e'));
      if (char === 'e') variations.push(baseName.replace('e', 'a'));
    }

    // Add double letters
    for (let i = 0; i < baseName.length; i++) {
      variations.push(baseName.slice(0, i) + baseName[i] + baseName.slice(i));
    }

    // Remove single char
    for (let i = 0; i < baseName.length; i++) {
      variations.push(baseName.slice(0, i) + baseName.slice(i + 1));
    }

    // Check these variations against common TLDs
    for (const variant of [...new Set(variations)].slice(0, 20)) {
      for (const tld of this.commonTLDs.slice(0, 5)) {
        const domain = `${variant}.${tld}`;
        try {
          await dns.resolve(domain);
          records.push({ domain, type: 'typosquat', tld, status: 'registered' });
        } catch (e) {
          // Domain doesn't exist
        }
      }
    }

    return { records: records.slice(0, 10), found: records.length };
  }

  async checkLookalikes(baseName, mainDomain) {
    const records = [];
    const prefixes = ['mail', 'web', 'www', 'ftp', 'secure', 'login', 'account', 'admin', 'support'];
    const suffixes = ['mail', 'web', 'email', 'hub', 'center', 'portal'];

    // Check prefix variations
    for (const prefix of prefixes) {
      const domain = `${prefix}${baseName}.${mainDomain.split('.').slice(1).join('.')}`;
      try {
        await dns.resolve(domain);
        records.push({ domain, type: 'prefix', status: 'exists' });
      } catch (e) {}
    }

    // Check suffix variations
    for (const suffix of suffixes) {
      const domain = `${baseName}${suffix}.${mainDomain.split('.').slice(1).join('.')}`;
      try {
        await dns.resolve(domain);
        records.push({ domain, type: 'suffix', status: 'exists' });
      } catch (e) {}
    }

    return { records: records.slice(0, 10), found: records.length };
  }

  async checkSubdomainAbuse(mainDomain) {
    const records = [];
    const mainParts = mainDomain.split('.');
    const base = mainParts.slice(-2).join('.');

    const suspiciousSubdomains = ['phishing', 'fake', 'secure', 'login', 'verify', 'account', 'update'];

    for (const sub of suspiciousSubdomains) {
      const domain = `${sub}.${base}`;
      try {
        const ips = await dns.resolve(domain);
        records.push({ domain, type: 'suspicious_subdomain', ips, status: 'active' });
      } catch (e) {}
    }

    return { records, found: records.length };
  }

  // Add brand to monitoring
  async addBrandMonitoring(brandDomain, brandName) {
    return {
      domain: brandDomain,
      brand_name: brandName,
      added_at: new Date().toISOString(),
      status: 'monitoring'
    };
  }
}

module.exports = { BrandProtectionService };