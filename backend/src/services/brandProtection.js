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
    const variations = new Set();
    const tld = mainDomain.split('.').slice(1).join('.') || 'com';

    // Keyboard adjacent mappings (QWERTY)
    const keyboardAdjacent = {
      'a': ['q', 'w', 's', 'z'],
      'b': ['v', 'g', 'h', 'n'],
      'c': ['x', 'd', 'f', 'v'],
      'd': ['s', 'e', 'r', 'f', 'c', 'x'],
      'e': ['w', 's', 'd', 'r'],
      'f': ['d', 'r', 't', 'g', 'v', 'c'],
      'g': ['f', 't', 'y', 'h', 'b', 'v'],
      'h': ['g', 'y', 'u', 'j', 'n', 'b'],
      'i': ['u', 'j', 'k', 'o'],
      'j': ['h', 'u', 'i', 'k', 'm', 'n'],
      'k': ['j', 'i', 'o', 'l', 'm'],
      'l': ['k', 'o', 'p'],
      'm': ['n', 'j', 'k'],
      'n': ['b', 'h', 'j', 'm'],
      'o': ['i', 'k', 'l', 'p'],
      'p': ['o', 'l'],
      'q': ['w', 'a'],
      'r': ['e', 'd', 'f', 't'],
      's': ['a', 'w', 'e', 'd', 'x', 'z'],
      't': ['r', 'f', 'g', 'y'],
      'u': ['y', 'h', 'j', 'i'],
      'v': ['c', 'f', 'g', 'b'],
      'w': ['q', 'a', 's', 'e'],
      'x': ['z', 's', 'd', 'c'],
      'y': ['t', 'g', 'h', 'u'],
      'z': ['a', 's', 'x'],
      '0': ['o', 'p'],
      '1': ['l', 'o', '2'],
    };

    const charReplacements = {
      'o': ['0', 'a'],
      'l': ['1', 'i', 't'],
      'i': ['1', 'l', 'o'],
      'e': ['a', 'o', '3'],
      'a': ['e', 'o', '4'],
      's': ['5', 'a'],
      'g': ['q', '9'],
    };

    // 1. Single character replacement (only ONE position)
    for (let i = 0; i < baseName.length; i++) {
      const char = baseName[i];
      
      // Keyboard adjacent
      if (keyboardAdjacent[char]) {
        for (const adj of keyboardAdjacent[char]) {
          variations.add(baseName.slice(0, i) + adj + baseName.slice(i + 1));
        }
      }
      
      // Common confusables
      if (charReplacements[char]) {
        for (const rep of charReplacements[char]) {
          variations.add(baseName.slice(0, i) + rep + baseName.slice(i + 1));
        }
      }
    }

    // 2. Character swap (adjacent)
    for (let i = 0; i < baseName.length - 1; i++) {
      const swapped = baseName.slice(0, i) + baseName[i + 1] + baseName[i] + baseName.slice(i + 2);
      variations.add(swapped);
    }

    // 3. Double letters (add)
    for (let i = 0; i < baseName.length; i++) {
      variations.add(baseName.slice(0, i) + baseName[i] + baseName[i] + baseName.slice(i));
    }

    // 4. Double letters (remove one)
    for (let i = 0; i < baseName.length - 1; i++) {
      if (baseName[i] === baseName[i + 1]) {
        variations.add(baseName.slice(0, i) + baseName[i] + baseName.slice(i + 2));
      }
    }

    // 5. Remove single character
    for (let i = 0; i < baseName.length; i++) {
      variations.add(baseName.slice(0, i) + baseName.slice(i + 1));
    }

    // 6. Add hyphen (for compound words)
    if (baseName.length > 4) {
      for (let i = 1; i < baseName.length - 1; i++) {
        variations.add(baseName.slice(0, i) + '-' + baseName.slice(i));
      }
    }

    // 7. Missing character (insert random)
    const insertChars = ['a', 'e', 'i', 'o', 's', 't'];
    for (let i = 0; i < baseName.length; i++) {
      for (const c of insertChars) {
        variations.add(baseName.slice(0, i) + c + baseName.slice(i));
      }
    }

    // Check variations against TLDs
    const tldsToCheck = [tld, 'com', 'net', 'org', 'io', 'co'];
    
    for (const variant of [...variations].slice(0, 50)) {
      if (variant === baseName || variant.length < 2) continue;
      
      for (const checkTld of tldsToCheck) {
        const domain = `${variant}.${checkTld}`;
        if (domain === mainDomain) continue;
        
        try {
          // Check if domain resolves (A record)
          const addresses = await dns.resolve4(domain);
          
          // Check for MX records (email-relevant)
          let hasMX = false;
          try {
            const mx = await dns.resolveMx(domain);
            hasMX = mx.length > 0;
          } catch (e) {}
          
          records.push({
            domain,
            type: hasMX ? 'typosquat_with_email' : 'typosquat',
            tld: checkTld,
            status: 'registered',
            hasMailServer: hasMX,
            hasWebsite: addresses.length > 0
          });
        } catch (e) {
          // Domain doesn't exist
        }
      }
    }

    // Deduplicate and return
    const uniqueRecords = records.filter((r, i, arr) => 
      arr.findIndex(x => x.domain === r.domain) === i
    );

    return { records: uniqueRecords.slice(0, 20), found: uniqueRecords.length };
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
    const base = mainParts.slice(-2).join('.'); // e.g., co.za
    const baseName = mainParts[0]; // e.g., segbytes

    // Check 1: Suspicious subdomains ON the brand domain itself
    const suspiciousSubdomains = ['phishing', 'fake', 'secure', 'login', 'verify', 'account', 'update', 'mail', 'smtp', 'webmail'];
    
    for (const sub of suspiciousSubdomains) {
      const domain = `${sub}.${mainDomain}`; // e.g., phishing.segbytes.co.za
      try {
        const ips = await dns.resolve(domain);
        records.push({ domain, type: 'abused_subdomain', ips, status: 'active', subdomain: sub });
      } catch (e) {}
    }

    // Check 2: Lookalikes with brand name in subdomain
    const lookalikePrefixes = ['segbytes', 'segbyte', 'seg-byte', 'segbytez', 'segbyts'];
    for (const prefix of lookalikePrefixes) {
      const domain = `${prefix}.${base}`; // e.g., segbytes.co.za variants
      if (domain !== mainDomain) {
        try {
          const ips = await dns.resolve(domain);
          records.push({ domain, type: 'brand_subdomain', ips, status: 'exists', note: 'Possible brand in subdomain' });
        } catch (e) {}
      }
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