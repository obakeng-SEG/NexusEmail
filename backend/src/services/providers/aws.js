// AWS Route53 DNS Provider
const { Route53Client, ListHostedZonesCommand, ChangeResourceRecordSetsCommand, ListResourceRecordSetsCommand } = require('@aws-sdk/client-route-53');

class AWSRoute53Provider {
  constructor(config) {
    this.client = new Route53Client({
      region: config.region || 'us-east-1',
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });
  }

  async getHostedZoneId(domain) {
    try {
      const command = new ListHostedZonesCommand({});
      const response = await this.client.send(command);
      const zone = response.HostedZones.find(z => z.Name === `${domain}.`);
      return zone?.Id?.replace('/hostedzone/', '') || null;
    } catch (e) {
      console.error('[AWS Route53] Failed to list zones:', e.message);
      return null;
    }
  }

  async createTXTRecord(name, content, domain) {
    try {
      const zoneId = await this.getHostedZoneId(domain);
      if (!zoneId) return { success: false, error: 'Hosted zone not found' };

      const change = {
        Changes: [{
          Action: 'CREATE',
          ResourceRecordSet: {
            Name: name,
            Type: 'TXT',
            TTL: 3600,
            ResourceRecords: [{ Value: `"${content}"` }]
          }
        }]
      };

      const command = new ChangeResourceRecordSetsCommand({
        HostedZoneId: zoneId,
        ChangeBatch: change
      });

      await this.client.send(command);
      return { success: true, provider: 'aws-route53', record: { name, type: 'TXT', content } };
    } catch (e) {
      console.error('[AWS Route53] Create failed:', e.message);
      return { success: false, error: e.message };
    }
  }

  async deleteTXTRecord(name, domain) {
    try {
      const zoneId = await this.getHostedZoneId(domain);
      if (!zoneId) return { success: false, error: 'Hosted zone not found' };

      // First get the existing record
      const listCmd = new ListResourceRecordSetsCommand({ HostedZoneId: zoneId });
      const records = await this.client.send(listCmd);
      const record = records.ResourceRecordSets?.find(r => r.Name === name && r.Type === 'TXT');

      if (record) {
        const change = {
          Changes: [{
            Action: 'DELETE',
            ResourceRecordSet: record
          }]
        };
        const delCmd = new ChangeResourceRecordSetsCommand({
          HostedZoneId: zoneId,
          ChangeBatch: change
        });
        await this.client.send(delCmd);
      }

      return { success: true, provider: 'aws-route53' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async listRecords(domain) {
    try {
      const zoneId = await this.getHostedZoneId(domain);
      if (!zoneId) return { success: false, error: 'Hosted zone not found' };

      const command = new ListResourceRecordSetsCommand({ HostedZoneId: zoneId });
      const response = await this.client.send(command);
      return { success: true, records: response.ResourceRecordSets || [] };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

module.exports = { AWSRoute53Provider };