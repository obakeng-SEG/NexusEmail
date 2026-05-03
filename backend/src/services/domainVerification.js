const dns = require('dns').promises;
const crypto = require('crypto');

class DomainVerificationService {
  constructor() {
    this.verificationPrefix = '_nexusemail-verification';
    this.verificationTimeout = 5000;
  }

  generateVerificationToken() {
    return crypto.randomBytes(16).toString('hex');
  }

  generateVerification(domain) {
    const token = this.generateVerificationToken();
    const txtRecord = `${this.verificationPrefix}=${token}`;
    
    return {
      domain,
      token,
      method: 'TXT',
      record: txtRecord,
      recordValue: token,
      cnameRecord: `verify.${domain}`,
      cnameTarget: `${token}.verification.nexusemail.local`,
      instructions: {
        txt: `Add a TXT record for ${domain}:\n  Name: ${this.verificationPrefix}\n  Value: ${txtRecord}`,
        cname: `Add a CNAME record for verify.${domain}:\n  Name: verify\n  Value: ${token}.verification.nexusemail.local`
      },
      status: 'pending',
      created_at: new Date().toISOString()
    };
  }

  async verifyTXTRecord(domain, token) {
    try {
      const txtRecords = await dns.resolveTxt(domain);
      
      for (const record of txtRecords) {
        const combined = record.join('');
        if (combined === `${this.verificationPrefix}=${token}` || combined.includes(token)) {
          return { verified: true, method: 'TXT' };
        }
      }
      
      return { verified: false, method: 'TXT', reason: 'TXT record not found' };
    } catch (e) {
      return { verified: false, method: 'TXT', reason: e.message };
    }
  }

  async verifyCNAMERecord(subdomain, token) {
    try {
      const cnameRecords = await dns.resolveCname(subdomain);
      
      for (const record of cnameRecords) {
        if (record.includes(token)) {
          return { verified: true, method: 'CNAME' };
        }
      }
      
      return { verified: false, method: 'CNAME', reason: 'CNAME record not found' };
    } catch (e) {
      return { verified: false, method: 'CNAME', reason: e.message };
    }
  }

  async verify(domain, token, method = 'TXT') {
    const result = {
      domain,
      token,
      method,
      verified: false,
      verified_at: null
    };

    let txtResult = null;
    let cnameResult = null;

    if (method === 'TXT' || method === 'AUTO') {
      txtResult = await this.verifyTXTRecord(domain, token);
      if (txtResult.verified) {
        result.verified = true;
        result.method = 'TXT';
        result.verified_at = new Date().toISOString();
        return result;
      }
    }

    if (method === 'CNAME' || method === 'AUTO') {
      const verifySubdomain = `verify.${domain}`;
      cnameResult = await this.verifyCNAMERecord(verifySubdomain, token);
      if (cnameResult.verified) {
        result.verified = true;
        result.method = 'CNAME';
        result.verified_at = new Date().toISOString();
        return result;
      }
    }

    result.reason = (txtResult && txtResult.reason) || (cnameResult && cnameResult.reason) || 'Verification failed';
    return result;
  }

  isDomainVerified(verification) {
    return verification && verification.status === 'verified' && verification.verified_at;
  }

  getVerificationStatus(domainData) {
    return {
      domain: domainData.domain,
      verified: domainData.verified || false,
      verified_at: domainData.verified_at || null,
      verification_method: domainData.verification_method || null,
      features_unlocked: domainData.verified || false
    };
  }
}

module.exports = { DomainVerificationService };