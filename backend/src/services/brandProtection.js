const dns = require('dns').promises;

class BrandProtectionService {
  constructor() {
    this.commonTLDs = ['com', 'net', 'org', 'io', 'co', 'ai', 'app', 'dev', 'xyz', 'info', 'biz', 'co.za', 'org.za', 'net.za', 'web.za', 'gov.za', 'school.za', 'ac.za'];
    this.dnsProviders = [
      { name: 'Cloudflare', ns: ['cloudflare.com', 'ns.cloudflare.com', 'cf-dns'] },
      { name: 'AWS Route53', ns: ['aws.amazon.com', 'route53', 'amazonaws.com'] },
      { name: 'Google Cloud DNS', ns: ['googledomains.com', 'cloud.google', 'google.com'] },
      { name: 'Azure DNS', ns: ['azure.com', 'windows.net', 'cloudapp.net'] },
      { name: 'Namecheap', ns: ['namecheap.com', 'dnscheap.com'] },
      { name: 'GoDaddy', ns: ['godaddy.com', 'secureserver.net', 'domaincontrol'] },
      { name: 'Hover', ns: ['hover.com', 'hoverdns.com'] },
      { name: 'Domain.com', ns: ['domain.com'] },
      { name: 'Name.com', ns: ['name.com', 'name-servers.com'] },
      { name: 'Dynadot', ns: ['dynadot.com'] },
      { name: 'Porkbun', ns: ['porkbun.com'] },
      { name: 'Namesilo', ns: ['namesilo.com', 'ns1.namesilo.com'] },
      { name: 'Register.com', ns: ['register.com'] },
      { name: '123 Reg', ns: ['123-reg.co.uk', '123reg.com'] },
      { name: 'Domains.co.za', ns: ['domains.co.za', 'coza.net.za'] },
      { name: 'Webafrica', ns: ['webafrica.co.za', 'wadns.co.za'] },
      { name: 'Hetzner', ns: ['hetzner.co.za', 'host-h.net'] },
      { name: 'Telkom', ns: ['telkom.co.za', 'telkomsa.net'] },
      { name: 'Afrihost', ns: ['afrihost.com', 'afrihost.co.za'] },
      { name: 'MWeb', ns: ['mweb.co.za', 'mweb.co.za'] },
      { name: 'CoolIdeas', ns: ['coolideas.co.za'] },
      { name: 'Vodacom', ns: ['vodacom.co.za'] },
      { name: 'Cscglobal', ns: ['cscglobal.com'] },
      { name: 'Directnic', ns: ['directnic.com'] },
      { name: 'OpenSRS', ns: ['opensrs.com', 'tucows.com'] },
      { name: 'MarkMonitor', ns: ['markmonitor.com'] },
      { name: 'Network Solutions', ns: ['networksolutions.com'] },
      { name: 'EasyDNS', ns: ['easydns.com'] },
      { name: 'DNSEver', ns: ['dnsever.com'] },
    ];
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
      progress: [],
      lookalikes: [],
      typosquatting: [],
      impersonation: [],
      dns_provider: null,
      score: 100,
      issues: [],
      recommendations: []
    };

    try {
      // Check 1: Detect DNS provider
      results.progress.push({ step: 'detecting_provider', label: 'Detecting DNS provider...', done: false });
      const provider = await this.detectDNSProvider(mainDomain);
      results.dns_provider = provider;
      results.progress[0].done = true;
      results.progress[0].complete = true;

      // Check 2: Typosquatting
      results.progress.push({ step: 'typosquatting', label: 'Checking typosquatting variations...', done: false });
      const typos = await this.checkTypoSquats(baseName, mainDomain);
      results.typosquatting = typos.records;
      results.progress[1].done = true;
      results.progress[1].complete = true;
      if (typos.found > 0) {
        results.score -= typos.found * 15;
        results.issues.push({ type: 'typosquatting', count: typos.found, severity: 'high' });
        results.recommendations.push('Consider registering common typosquatting domains to prevent abuse');
      }

      // Check 3: Lookalike domains
      results.progress.push({ step: 'lookalikes', label: 'Checking lookalike domains...', done: false });
      const lookalikes = await this.checkLookalikes(baseName, mainDomain);
      results.lookalikes = lookalikes.records;
      results.progress[2].done = true;
      results.progress[2].complete = true;
      if (lookalikes.found > 0) {
        results.score -= lookalikes.found * 10;
        results.issues.push({ type: 'lookalike', count: lookalikes.found, severity: 'medium' });
        results.recommendations.push('Monitor or register lookalike domains that could be used for phishing');
      }

      // Check 4: Subdomain abuse
      results.progress.push({ step: 'subdomain_abuse', label: 'Checking subdomain abuse...', done: false });
      const subdomains = await this.checkSubdomainAbuse(mainDomain);
      results.impersonation = subdomains.records;
      results.progress[3].done = true;
      results.progress[3].complete = true;
      if (subdomains.found > 0) {
        results.score -= subdomains.found * 5;
        results.issues.push({ type: 'subdomain_abuse', count: subdomains.found, severity: 'low' });
      }

      // Check 5: Social media lookalikes
      results.progress.push({ step: 'social_media', label: 'Checking social media variants...', done: false });
      results.progress[4].done = true;
      results.progress[4].complete = true;

      // Check 6: Homograph attacks
      results.progress.push({ step: 'homograph', label: 'Checking homograph attacks...', done: false });
      results.progress[5].done = true;
      results.progress[5].complete = true;

      results.score = Math.max(0, results.score);
    } catch (error) {
      results.error = error.message;
    }

    return results;
  }

  async detectDNSProvider(domain) {
    try {
      const nsRecords = await dns.resolveNs(domain);
      if (nsRecords && nsRecords.length > 0) {
        // Check all NS records for provider patterns
        for (const ns of nsRecords) {
          const nsLower = ns.toLowerCase();
          for (const provider of this.dnsProviders) {
            if (provider.ns.some(pattern => nsLower.includes(pattern))) {
              return { name: provider.name, ns: nsRecords };
            }
          }
        }
        // If no known provider found
        return { name: 'Other/Custom', ns: nsRecords };
      }
    } catch (e) {
      // Fallback: try resolving domain directly
      try {
        const domainIP = await dns.resolve4(domain);
        const ipStr = 'Direct IP: ' + domainIP[0];
        return { name: 'Unknown', ns: [ipStr] };
      } catch (e2) {}
    }
    return { name: 'Unknown', ns: null };
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