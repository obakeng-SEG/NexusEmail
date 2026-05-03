const dns = require('dns').promises;
const https = require('https');

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
    
    this.socialPlatforms = [
      { name: 'Facebook', domains: ['facebook.com', 'fb.com'] },
      { name: 'Twitter/X', domains: ['twitter.com', 'x.com'] },
      { name: 'LinkedIn', domains: ['linkedin.com'] },
      { name: 'Instagram', domains: ['instagram.com'] },
      { name: 'YouTube', domains: ['youtube.com'] },
      { name: 'TikTok', domains: ['tiktok.com'] },
    ];
  }

  async checkBrandProtection(mainDomain, previousResults = null) {
    const baseName = mainDomain.split('.')[0];
    const results = {
      domain: mainDomain,
      timestamp: new Date().toISOString(),
      progress: [],
      lookalikes: [],
      typosquatting: [],
      impersonation: [],
      homographs: [],
      socialMedia: [],
      dns_provider: null,
      registrar: null,
      score: 100,
      issues: [],
      recommendations: [],
      newThreats: [],
      alerts: []
    };

    try {
      results.progress.push({ step: 'detecting_provider', label: 'Detecting DNS provider...', done: false, complete: false });
      const provider = await this.detectDNSProvider(mainDomain);
      results.dns_provider = provider;
      results.progress[0].done = true;
      results.progress[0].complete = true;

      results.progress.push({ step: 'registrar', label: 'Looking up registrar info...', done: false, complete: false });
      const registrar = await this.getRegistrarInfo(mainDomain);
      results.registrar = registrar;
      results.progress[1].done = true;
      results.progress[1].complete = true;

      results.progress.push({ step: 'typosquatting', label: 'Checking typosquatting variations...', done: false, complete: false });
      const typos = await this.checkTypoSquats(baseName, mainDomain);
      results.typosquatting = typos.records;
      results.progress[2].done = true;
      results.progress[2].complete = true;
      if (typos.found > 0) {
        results.score -= typos.found * 15;
        results.issues.push({ type: 'typosquatting', count: typos.found, severity: 'high' });
        results.recommendations.push('Consider registering common typosquatting domains to prevent abuse');
      }

      results.progress.push({ step: 'lookalikes', label: 'Checking lookalike domains...', done: false, complete: false });
      const lookalikes = await this.checkLookalikes(baseName, mainDomain);
      results.lookalikes = lookalikes.records;
      results.progress[3].done = true;
      results.progress[3].complete = true;
      if (lookalikes.found > 0) {
        results.score -= lookalikes.found * 10;
        results.issues.push({ type: 'lookalike', count: lookalikes.found, severity: 'medium' });
        results.recommendations.push('Monitor or register lookalike domains that could be used for phishing');
      }

      results.progress.push({ step: 'subdomain_abuse', label: 'Checking subdomain abuse...', done: false, complete: false });
      const subdomains = await this.checkSubdomainAbuse(mainDomain);
      results.impersonation = subdomains.records;
      results.progress[4].done = true;
      results.progress[4].complete = true;
      if (subdomains.found > 0) {
        results.score -= subdomains.found * 5;
        results.issues.push({ type: 'subdomain_abuse', count: subdomains.found, severity: 'low' });
      }

      results.progress.push({ step: 'social_media', label: 'Checking social media variants...', done: false, complete: false });
      const social = await this.checkSocialMedia(baseName, mainDomain);
      results.socialMedia = social.records;
      results.progress[5].done = true;
      results.progress[5].complete = true;
      if (social.found > 0) {
        results.score -= social.found * 8;
        results.issues.push({ type: 'social_media', count: social.found, severity: 'medium' });
      }

      results.progress.push({ step: 'homograph', label: 'Checking homograph attacks...', done: false, complete: false });
      const homographs = await this.checkHomographs(baseName, mainDomain);
      results.homographs = homographs.records;
      results.progress[6].done = true;
      results.progress[6].complete = true;
      if (homographs.found > 0) {
        results.score -= homographs.found * 12;
        results.issues.push({ type: 'homograph', count: homographs.found, severity: 'high' });
      }

      results.score = Math.max(0, Math.round(results.score));

      if (previousResults) {
        results.newThreats = this.detectNewThreats(previousResults, results);
        results.alerts = this.generateAlerts(results.newThreats);
      }

    } catch (error) {
      results.error = error.message;
    }

    return results;
  }

  detectNewThreats(previous, current) {
    const newThreats = [];
    const allTypes = [
      { key: 'typosquatting', label: 'Typosquatting' },
      { key: 'lookalikes', label: 'Lookalike' },
      { key: 'impersonation', label: 'Impersonation' },
      { key: 'homographs', label: 'Homograph' },
      { key: 'socialMedia', label: 'Social Media' },
    ];

    for (const type of allTypes) {
      const prevDomains = new Set((previous[type.key] || []).map(t => t.domain));
      const currDomains = (current[type.key] || []).filter(t => !prevDomains.has(t.domain));
      for (const threat of currDomains) {
        newThreats.push({ ...threat, threat_type: type.label });
      }
    }
    return newThreats;
  }

  generateAlerts(newThreats) {
    const alerts = [];
    for (const threat of newThreats) {
      alerts.push({
        id: Date.now() + Math.random(),
        type: 'new_threat',
        severity: threat.threat_type === 'Typosquatting' || threat.threat_type === 'Homograph' ? 'high' : 'medium',
        message: `New ${threat.threat_type} detected: ${threat.domain}`,
        timestamp: new Date().toISOString(),
        domain: threat.domain
      });
    }
    return alerts;
  }

  async detectDNSProvider(domain) {
    try {
      const nsRecords = await dns.resolveNs(domain);
      if (nsRecords && nsRecords.length > 0) {
        for (const ns of nsRecords) {
          const nsLower = ns.toLowerCase();
          for (const provider of this.dnsProviders) {
            if (provider.ns.some(pattern => nsLower.includes(pattern))) {
              return { name: provider.name, ns: nsRecords };
            }
          }
        }
        return { name: 'Other/Custom', ns: nsRecords };
      }
    } catch (e) {
      try {
        const domainIP = await dns.resolve4(domain);
        return { name: 'Unknown', ns: ['Direct IP: ' + domainIP[0]] };
      } catch (e2) {}
    }
    return { name: 'Unknown', ns: null };
  }

  async getRegistrarInfo(domain) {
    try {
      const whoisData = await this.whoisLookup(domain);
      return whoisData;
    } catch (e) {
      return { registrar: 'Unknown', abuse_email: null, created_date: null };
    }
  }

  async whoisLookup(domain) {
    return new Promise((resolve) => {
      const options = {
        hostname: 'whois.iana.org',
        path: '/' + domain,
        method: 'GET',
        timeout: 5000
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const result = { registrar: 'Unknown', abuse_email: null, created_date: null };
          
          const lines = data.split('\n');
          for (const line of lines) {
            if (line.toLowerCase().startsWith('registrar:')) {
              result.registrar = line.split(':').slice(1).join(':').trim();
            }
            if (line.toLowerCase().includes('abuse') && line.includes('@')) {
              const match = line.match(/[\w.-]+@[\w.-]+/);
              if (match) result.abuse_email = match[0];
            }
            if (line.toLowerCase().startsWith('created:')) {
              result.created_date = line.split(':').slice(1).join(':').trim();
            }
          }
          resolve(result);
        });
      });

      req.on('error', () => resolve({ registrar: 'Unknown', abuse_email: null, created_date: null }));
      req.on('timeout', () => { req.destroy(); resolve({ registrar: 'Unknown', abuse_email: null, created_date: null }); });
      req.end();
    });
  }

  async checkTypoSquats(baseName, mainDomain) {
    const records = [];
    const variations = new Set();
    const tld = mainDomain.split('.').slice(1).join('.') || 'com';

    const keyboardAdjacent = {
      'a': ['q', 'w', 's', 'z'], 'b': ['v', 'g', 'h', 'n'], 'c': ['x', 'd', 'f', 'v'],
      'd': ['s', 'e', 'r', 'f', 'c', 'x'], 'e': ['w', 's', 'd', 'r'], 'f': ['d', 'r', 't', 'g', 'v', 'c'],
      'g': ['f', 't', 'y', 'h', 'b', 'v'], 'h': ['g', 'y', 'u', 'j', 'n', 'b'], 'i': ['u', 'j', 'k', 'o'],
      'j': ['h', 'u', 'i', 'k', 'm', 'n'], 'k': ['j', 'i', 'o', 'l', 'm'], 'l': ['k', 'o', 'p'],
      'm': ['n', 'j', 'k'], 'n': ['b', 'h', 'j', 'm'], 'o': ['i', 'k', 'l', 'p'], 'p': ['o', 'l'],
      'q': ['w', 'a'], 'r': ['e', 'd', 'f', 't'], 's': ['a', 'w', 'e', 'd', 'x', 'z'],
      't': ['r', 'f', 'g', 'y'], 'u': ['y', 'h', 'j', 'i'], 'v': ['c', 'f', 'g', 'b'],
      'w': ['q', 'a', 's', 'e'], 'x': ['z', 's', 'd', 'c'], 'y': ['t', 'g', 'h', 'u'], 'z': ['a', 's', 'x'],
    };

    const charReplacements = { 'o': ['0', 'a'], 'l': ['1', 'i', 't'], 'i': ['1', 'l', 'o'], 'e': ['a', 'o', '3'], 'a': ['e', 'o', '4'] };

    for (let i = 0; i < baseName.length; i++) {
      const char = baseName[i];
      if (keyboardAdjacent[char]) {
        for (const adj of keyboardAdjacent[char]) {
          variations.add(baseName.slice(0, i) + adj + baseName.slice(i + 1));
        }
      }
      if (charReplacements[char]) {
        for (const rep of charReplacements[char]) {
          variations.add(baseName.slice(0, i) + rep + baseName.slice(i + 1));
        }
      }
    }

    for (let i = 0; i < baseName.length - 1; i++) {
      variations.add(baseName.slice(0, i) + baseName[i + 1] + baseName[i] + baseName.slice(i + 2));
    }

    for (let i = 0; i < baseName.length; i++) {
      variations.add(baseName.slice(0, i) + baseName[i] + baseName[i] + baseName.slice(i));
    }

    for (let i = 0; i < baseName.length - 1; i++) {
      if (baseName[i] === baseName[i + 1]) {
        variations.add(baseName.slice(0, i) + baseName[i] + baseName.slice(i + 2));
      }
    }

    for (let i = 0; i < baseName.length; i++) {
      variations.add(baseName.slice(0, i) + baseName.slice(i + 1));
    }

    if (baseName.length > 4) {
      for (let i = 1; i < baseName.length - 1; i++) {
        variations.add(baseName.slice(0, i) + '-' + baseName.slice(i));
      }
    }

    const tldsToCheck = [tld, 'com', 'net', 'org', 'io', 'co', 'co.za'];
    
    for (const variant of [...variations].slice(0, 80)) {
      if (variant === baseName || variant.length < 2) continue;
      
      for (const checkTld of tldsToCheck) {
        const domain = `${variant}.${checkTld}`;
        if (domain === mainDomain) continue;
        
        try {
          const addresses = await dns.resolve4(domain);
          let hasMX = false;
          try { const mx = await dns.resolveMx(domain); hasMX = mx.length > 0; } catch (e) {}
          
          records.push({ domain, type: hasMX ? 'typosquat_with_email' : 'typosquat', tld: checkTld, status: 'registered', hasMailServer: hasMX, hasWebsite: addresses.length > 0 });
        } catch (e) {}
      }
    }

    const uniqueRecords = records.filter((r, i, arr) => arr.findIndex(x => x.domain === r.domain) === i);
    return { records: uniqueRecords.slice(0, 20), found: uniqueRecords.length };
  }

  async checkLookalikes(baseName, mainDomain) {
    const records = [];
    const base = mainDomain.split('.').slice(1).join('.');
    const prefixes = ['mail', 'web', 'www', 'ftp', 'secure', 'login', 'account', 'admin', 'support', 'smtp', 'webmail'];
    const suffixes = ['mail', 'web', 'email', 'hub', 'center', 'portal', 'app', 'dev'];

    for (const prefix of prefixes) {
      const domain = `${prefix}${baseName}.${base}`;
      try {
        await dns.resolve(domain);
        records.push({ domain, type: 'prefix', status: 'exists' });
      } catch (e) {}
    }

    for (const suffix of suffixes) {
      const domain = `${baseName}${suffix}.${base}`;
      try {
        await dns.resolve(domain);
        records.push({ domain, type: 'suffix', status: 'exists' });
      } catch (e) {}
    }

    return { records: records.slice(0, 15), found: records.length };
  }

  async checkSubdomainAbuse(mainDomain) {
    const records = [];
    const mainParts = mainDomain.split('.');
    const base = mainParts.slice(-2).join('.');
    const baseName = mainParts[0];

    const suspiciousSubdomains = ['phishing', 'fake', 'secure', 'login', 'verify', 'account', 'update', 'mail', 'smtp', 'webmail', 'admin', 'support', 'api'];
    
    for (const sub of suspiciousSubdomains) {
      const domain = `${sub}.${mainDomain}`;
      try {
        const ips = await dns.resolve(domain);
        records.push({ domain, type: 'abused_subdomain', ips, status: 'active', subdomain: sub });
      } catch (e) {}
    }

    const lookalikePrefixes = [baseName, baseName.slice(0, -1), baseName + 's', baseName + 'z', baseName.replace(/e/g, 'i')];
    for (const prefix of lookalikePrefixes) {
      const domain = `${prefix}.${base}`;
      if (domain !== mainDomain) {
        try {
          const ips = await dns.resolve(domain);
          records.push({ domain, type: 'brand_subdomain', ips, status: 'exists' });
        } catch (e) {}
      }
    }

    return { records, found: records.length };
  }

  async checkSocialMedia(baseName, mainDomain) {
    const records = [];
    const tld = mainDomain.split('.').slice(1).join('.');

    for (const platform of this.socialPlatforms) {
      const fakeNames = [`${baseName}-official`, `${baseName}hq`, `the${baseName}`, `${baseName}inc`, `${baseName}support`];
      for (const name of fakeNames) {
        for (const platformDomain of platform.domains) {
          const fullDomain = `${name}.${platformDomain}`;
          try {
            const ip = await dns.resolve4(fullDomain);
            records.push({ domain: fullDomain, platform: platform.name, type: 'fake_profile', status: 'exists' });
          } catch (e) {}
        }
      }
    }

    return { records: records.slice(0, 10), found: records.length };
  }

  async checkHomographs(baseName, mainDomain) {
    const records = [];
    const tld = mainDomain.split('.').slice(1).join('.');
    
    const homoglyphs = {
      'a': ['а', 'ą', 'α'], 'b': ['Ь', 'ƅ'], 'c': ['с', 'ć'], 'd': ['ԁ'], 'e': ['е', 'ę', 'ε'],
      'g': ['ɡ', 'ġ'], 'h': ['һ'], 'i': ['і', 'ı', 'l'], 'j': ['ј'], 'k': ['κ', 'ķ'],
      'l': ['1', 'і', 'ł'], 'm': ['м', 'т'], 'n': ['п', 'ń'], 'o': ['о', '0', 'ο', 'ö'],
      'p': ['р', 'p'], 's': ['ѕ', 's'], 't': ['т', '7'], 'u': ['υ', 'ų'],
      'x': ['х'], 'y': ['у', 'ý'], 'z': ['z', 'ż']
    };

    let homographVariant = '';
    for (const char of baseName.toLowerCase()) {
      homographVariant += homoglyphs[char] ? homoglyphs[char][0] : char;
    }

    if (homographVariant !== baseName.toLowerCase()) {
      for (const checkTld of [tld, 'com', 'net', 'org']) {
        const domain = `${homographVariant}.${checkTld}`;
        if (domain !== mainDomain) {
          try {
            await dns.resolve(domain);
            records.push({ domain, punycode: 'xn--' + Buffer.from(domain.split('.')[0]).toString('base64').replace(/=/g, ''), type: 'homograph', status: 'registered' });
          } catch (e) {}
        }
      }
    }

    return { records: records.slice(0, 5), found: records.length };
  }

  async addBrandMonitoring(brandDomain, brandName) {
    return { domain: brandDomain, brand_name: brandName, added_at: new Date().toISOString(), status: 'monitoring' };
  }

  buildTakedownEmail(domain, brandName, registrar, threatType) {
    const templates = {
      impersonation: `Dear ${registrar || 'Domain Registrar'},\n\nI am writing to report a domain being used to impersonate our brand "${brandName}". The infringing domain is: ${domain}\n\nThis domain is being used for phishing, fraud, or brand impersonation purposes. We request immediate suspension of this domain.\n\nPlease contact us to verify our identity and proceed with the takedown.\n\nSincerely,\nBrand Protection Team`,
      typosquatting: `Dear ${registrar || 'Domain Registrar'},\n\nWe are reporting a typosquatting domain that mimics our brand "${brandName}": ${domain}\n\nThis domain was registered to confuse users and potentially engage in phishing or fraud. We request its suspension.\n\nPlease contact us to verify our identity.\n\nSincerely,\nBrand Protection Team`,
      phishing: `Dear ${registrar || 'Domain Registrar'},\n\nWe report a phishing site impersonating "${brandName}": ${domain}\n\nThis site is being used to steal user credentials or distribute malware. Urgent action is requested.\n\nPlease suspend this domain immediately.\n\nSincerely,\nBrand Protection Team`
    };
    return templates[threatType] || templates.impersonation;
  }
}

module.exports = { BrandProtectionService };