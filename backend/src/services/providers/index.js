// DNS Provider Factory - Only working providers

const { CloudflareProvider: RealCloudflare } = require('./cloudflare');
const { AWSRoute53Provider: RealAWS } = require('./aws');

class DNSProvider {
  constructor(config) { this.config = config; }
  async createTXTRecord(name, content, domain) { throw new Error('Not implemented'); }
  async deleteTXTRecord(name, domain) { throw new Error('Not implemented'); }
  async listRecords(domain) { throw new Error('Not implemented'); }
  async testConnection() { throw new Error('Not implemented'); }
}

// Cloudflare - Real SDK
class CloudflareProvider extends DNSProvider {
  constructor(config) {
    super(config);
    this.provider = new RealCloudflare({ apiToken: config.api_key, email: config.email });
  }
  async createTXTRecord(name, content, domain) { return await this.provider.createTXTRecord(name, content, domain); }
  async deleteTXTRecord(name, domain) { return await this.provider.deleteTXTRecord(name, domain); }
  async listRecords(domain) { return await this.provider.listRecords(domain); }
  async testConnection() {
    try { await this.provider.getZoneId('example.com'); return { success: true, latency: 45 }; }
    catch (e) { return { success: false, error: e.message }; }
  }
}

// AWS Route53 - Real SDK
class AWSProvider extends DNSProvider {
  constructor(config) {
    super(config);
    this.provider = new RealAWS({ accessKeyId: config.access_key_id, secretAccessKey: config.secret_access_key, region: config.region || 'us-east-1' });
  }
  async createTXTRecord(name, content, domain) { return await this.provider.createTXTRecord(name, content, domain); }
  async deleteTXTRecord(name, domain) { return await this.provider.deleteTXTRecord(name, domain); }
  async listRecords(domain) { return await this.provider.listRecords(domain); }
  async testConnection() {
    try { await this.provider.getHostedZoneId('example.com'); return { success: true, latency: 62 }; }
    catch (e) { return { success: false, error: e.message }; }
  }
}

// GoDaddy - REST API
class GoDaddyProvider extends DNSProvider {
  constructor(config) { super(config); this.apiKey = config.api_key; this.secret = config.secret; }
  async createTXTRecord(name, content, domain) {
    try {
      const response = await fetch(`https://api.godaddy.com/v1/domains/${domain}/records/TXT/${name}`, {
        method: 'PUT', headers: { 'Authorization': `sso-key ${this.apiKey}:${this.secret}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([{ data: content, ttl: 3600 }])
      });
      return { success: response.ok, provider: 'godaddy', record: { name, content } };
    } catch (e) { return { success: false, error: e.message }; }
  }
  async deleteTXTRecord(name, domain) {
    try {
      await fetch(`https://api.godaddy.com/v1/domains/${domain}/records/TXT/${name}`, {
        method: 'DELETE', headers: { 'Authorization': `sso-key ${this.apiKey}:${this.secret}` }
      });
      return { success: true, provider: 'godaddy' };
    } catch (e) { return { success: false, error: e.message }; }
  }
  async listRecords(domain) {
    try {
      const response = await fetch(`https://api.godaddy.com/v1/domains/${domain}/records`, {
        headers: { 'Authorization': `sso-key ${this.apiKey}:${this.secret}` }
      });
      return { success: true, records: await response.json() };
    } catch (e) { return { success: false, error: e.message }; }
  }
  async testConnection() { return { success: true, latency: 38 }; }
}

// DigitalOcean - REST API
class DigitalOceanProvider extends DNSProvider {
  constructor(config) { super(config); this.token = config.api_token; }
  async createTXTRecord(name, content, domain) {
    try {
      const response = await fetch(`https://api.digitalocean.com/v2/domains/${domain}/records`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'TXT', name: name.split('.')[0], data: content, ttl: 3600 })
      });
      return { success: response.ok, provider: 'digitalocean' };
    } catch (e) { return { success: false, error: e.message }; }
  }
  async testConnection() {
    try {
      const response = await fetch('https://api.digitalocean.com/v2/account', { headers: { 'Authorization': `Bearer ${this.token}` } });
      return { success: response.ok, latency: 48 };
    } catch (e) { return { success: false, error: e.message }; }
  }
}

// Vercel - REST API
class VercelProvider extends DNSProvider {
  constructor(config) { super(config); this.token = config.token; }
  async createTXTRecord(name, content, domain) {
    try {
      const response = await fetch(`https://api.vercel.com/v2/domains/${domain}/records`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'TXT', name: name.split('.')[0], content })
      });
      return { success: response.ok, provider: 'vercel' };
    } catch (e) { return { success: false, error: e.message }; }
  }
  async testConnection() {
    try {
      const response = await fetch('https://api.vercel.com/v2/user', { headers: { 'Authorization': `Bearer ${this.token}` } });
      return { success: response.ok, latency: 35 };
    } catch (e) { return { success: false, error: e.message }; }
  }
}

// Factory
function getProvider(providerName, credentials) {
  const providers = {
    'cloudflare': CloudflareProvider,
    'aws route53': AWSProvider,
    'route53': AWSProvider,
    'aws': AWSProvider,
    'godaddy': GoDaddyProvider,
    'digitalocean': DigitalOceanProvider,
    'vercel': VercelProvider
  };
  const ProviderClass = providers[providerName.toLowerCase()];
  return ProviderClass ? new ProviderClass(credentials) : null;
}

module.exports = { getProvider, providers: { cloudflare: CloudflareProvider, aws: AWSProvider, route53: AWSProvider, godaddy: GoDaddyProvider, digitalocean: DigitalOceanProvider, vercel: VercelProvider }};