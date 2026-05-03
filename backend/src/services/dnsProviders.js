const dns = require('dns').promises;
const { CloudflareProvider } = require('./providers/cloudflare');
const { AWSProvider } = require('./providers/aws');
const { GoDaddyProvider } = require('./providers/godaddy');

class DNSProviderFactory {
  static create(provider, config) {
    switch (provider.toLowerCase()) {
      case 'cloudflare':
        return new CloudflareProvider(config);
      case 'aws':
      case 'route53':
        return new AWSProvider(config);
      case 'godaddy':
        return new GoDaddyProvider(config);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
}

class DNSService {
  constructor(provider = 'manual') {
    this.provider = provider;
  }

  async checkSPF(domain) {
    try {
      const records = await dns.resolveTxt(`_spf.${domain}`);
      const spfRecord = records.find(r => r.join('').includes('v=spf1'));
      
      if (!spfRecord) {
        return { found: false, record: null, status: 'NOT_FOUND' };
      }

      const record = spfRecord.join('');
      return {
        found: true,
        record,
        status: 'FOUND',
        policy: record.includes('-all') ? 'hardfail' : record.includes('~all') ? 'softfail' : 'none',
        mechanisms: this.countMechanisms(record)
      };
    } catch (error) {
      return { found: false, error: error.message, status: 'ERROR' };
    }
  }

  async checkDKIM(domain, selectors = ['default', 'google', 'selector1', 'mail']) {
    const foundSelectors = [];
    
    for (const selector of selectors) {
      try {
        const records = await dns.resolveTxt(`${selector}._domainkey.${domain}`);
        if (records.length > 0) {
          foundSelectors.push({
            selector,
            record: records[0].join(''),
            keySize: records[0].join('').includes('2048') ? '2048-bit' : '1024-bit'
          });
        }
      } catch (error) {
        // Selector not found, continue
      }
    }

    return {
      found: foundSelectors.length > 0,
      selectors: foundSelectors,
      status: foundSelectors.length > 0 ? 'FOUND' : 'NOT_FOUND'
    };
  }

  async checkDMARC(domain) {
    try {
      const records = await dns.resolveTxt(`_dmarc.${domain}`);
      const dmarcRecord = records.find(r => r.join('').includes('v=DMARC1'));
      
      if (!dmarcRecord) {
        return { found: false, record: null, status: 'NOT_FOUND' };
      }

      const record = dmarcRecord.join('');
      const tags = this.parseDMARCTags(record);

      return {
        found: true,
        record,
        status: 'FOUND',
        policy: tags.p || 'none',
        subdomainPolicy: tags.sp || 'none',
        percentage: tags.pct ? parseInt(tags.pct) : 100,
        ...tags
      };
    } catch (error) {
      return { found: false, error: error.message, status: 'ERROR' };
    }
  }

  async createSPF(domain, record, provider) {
    const providerImpl = DNSProviderFactory.create(provider, {});
    return await providerImpl.createTXTRecord(`_spf.${domain}`, record);
  }

  async createDKIM(domain, selector, record, provider) {
    const providerImpl = DNSProviderFactory.create(provider, {});
    return await providerImpl.createTXTRecord(`${selector}._domainkey.${domain}`, record);
  }

  async createDMARC(domain, record, provider) {
    const providerImpl = DNSProviderFactory.create(provider, {});
    return await providerImpl.createTXTRecord(`_dmarc.${domain}`, record);
  }

  countMechanisms(record) {
    const mechanisms = record.split(' ').filter(m => 
      !['v=spf1', '~all', '-all', '+all', '?all'].includes(m)
    );
    return mechanisms.length;
  }

  parseDMARCTags(record) {
    const tags = {};
    record.split(';').forEach(part => {
      const [key, value] = part.split('=').map(s => s.trim());
      if (key && value) {
        tags[key] = value;
      }
    });
    return tags;
  }

  calculateHealthScore(spf, dkim, dmarc) {
    let score = 0;

    // SPF: 35 points
    if (spf.found) {
      score += 25;
      if (spf.policy === 'hardfail') score += 10;
      else if (spf.policy === 'softfail') score += 5;
    }

    // DKIM: 30 points
    if (dkim.found) {
      score += 20;
      dkim.selectors?.forEach(sel => {
        if (sel.keySize === '2048-bit') score += 10;
      });
    }

    // DMARC: 35 points
    if (dmarc.found) {
      score += 25;
      if (dmarc.policy === 'reject') score += 10;
      else if (dmarc.policy === 'quarantine') score += 5;
    }

    return Math.min(score, 100);
  }
}

module.exports = { DNSService, DNSProviderFactory };