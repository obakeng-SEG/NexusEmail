"use client";

import { useState, useEffect } from "react";
import {
  Shield, Search, Settings, Activity, AlertTriangle,
  CheckCircle, XCircle, Globe, Plus, RefreshCw, Zap,
  Eye, Moon, Sun, ChevronRight, Server, Mail, Key,
  FileText, BarChart3, Bell, Plug, Clock, Wrench,
  TrendingUp, TrendingDown, Minus, Download, Trash2,
  CheckSquare, Square, MoreHorizontal, Save, MailPlus,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function Dashboard() {
  const [darkMode, setDarkMode] = useState(true);
  const [domainInput, setDomainInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [domains, setDomains] = useState<any[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [fixRecommendations, setFixRecommendations] = useState<any>(null);
  const [integrations, setIntegrations] = useState([]);
  const [notifications, setNotifications] = useState<any>({});
  const [settings, setSettings] = useState<any>(null);
  const [smtpForm, setSmtpForm] = useState({ host: '', port: '587', secure: false, user: '', pass: '', from: '' });
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [activeTab, setActiveTab] = useState("domains");
  const [brands, setBrands] = useState([]);
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyDomain, setVerifyDomain] = useState<any>(null);
  const [verifyToken, setVerifyToken] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [newBrandDomain, setNewBrandDomain] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [brandScanResult, setBrandScanResult] = useState<any>(null);
  const [brandScanning, setBrandScanning] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [domainFilter, setDomainFilter] = useState<string | null>(null);
  const [reportDomainId, setReportDomainId] = useState<number | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [providerCreds, setProviderCreds] = useState<any>({});
  const [savingProvider, setSavingProvider] = useState(false);
  
  // Brand Protection Advanced
  const [monitoredBrands, setMonitoredBrands] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<any>(null);
  const [showTakedownModal, setShowTakedownModal] = useState(false);
  const [showThreatModal, setShowThreatModal] = useState(false);
  const [takedownForm, setTakedownForm] = useState({ domain: '', threat_type: 'impersonation', evidence: '', contact_email: '' });
  const [threatForm, setThreatForm] = useState({ domain: '', threat_type: 'manual', severity: 'medium', notes: '' });
  const [brandThreats, setBrandThreats] = useState<any[]>([]);
  const [brandTakedowns, setBrandTakedowns] = useState<any[]>([]);
  const [brandAlerts, setBrandAlerts] = useState<any[]>([]);
  const [bulkScanning, setBulkScanning] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadDomains();
    loadIntegrations();
    loadSettings();
    loadBrands();
    loadAlerts();
  }, []);

  const loadBrands = async () => {
    try {
      const res = await fetch(`${API_BASE}/brands`);
      const data = await res.json();
      setBrands(data);
      setMonitoredBrands(data);
    } catch (e) {
      console.error('Failed to load brands:', e);
    }
  };

  const loadAlerts = async () => {
    try {
      const res = await fetch(`${API_BASE}/brands/alerts`);
      const data = await res.json();
      setBrandAlerts(data);
    } catch (e) {
      console.error('Failed to load alerts:', e);
    }
  };

  const bulkScanAll = async () => {
    setBulkScanning(true);
    try {
      await fetch(`${API_BASE}/brands/scan/all`, { method: 'POST' });
      loadBrands();
      loadAlerts();
    } catch (e) {
      console.error('Bulk scan failed:', e);
    } finally {
      setBulkScanning(false);
    }
  };

  const loadBrandThreats = async (brandId: number) => {
    try {
      const res = await fetch(`${API_BASE}/brands/${brandId}/threats`);
      const data = await res.json();
      setBrandThreats(data);
    } catch (e) {
      console.error('Failed to load threats:', e);
    }
  };

  const loadBrandTakedowns = async (brandId: number) => {
    try {
      const res = await fetch(`${API_BASE}/brands/${brandId}/takedowns`);
      const data = await res.json();
      setBrandTakedowns(data);
    } catch (e) {
      console.error('Failed to load takedowns:', e);
    }
  };

  const markAsSafe = async (brandId: number, domain: string) => {
    try {
      await fetch(`${API_BASE}/brands/${brandId}/safe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain })
      });
      loadBrands();
      loadBrandThreats(brandId);
    } catch (e) {
      console.error('Failed to mark as safe:', e);
    }
  };

  const submitTakedown = async (brandId: number) => {
    try {
      await fetch(`${API_BASE}/brands/${brandId}/takedown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(takedownForm)
      });
      setShowTakedownModal(false);
      setTakedownForm({ domain: '', threat_type: 'impersonation', evidence: '', contact_email: '' });
      loadBrandTakedowns(brandId);
    } catch (e) {
      console.error('Failed to submit takedown:', e);
    }
  };

  const addThreat = async (brandId: number) => {
    try {
      await fetch(`${API_BASE}/brands/${brandId}/threat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(threatForm)
      });
      setShowThreatModal(false);
      setThreatForm({ domain: '', threat_type: 'manual', severity: 'medium', notes: '' });
      loadBrandThreats(brandId);
    } catch (e) {
      console.error('Failed to add threat:', e);
    }
  };

  const openBrandDetails = async (brand: any) => {
    setSelectedBrand(brand);
    loadBrandThreats(brand.id);
    loadBrandTakedowns(brand.id);
  };

  const loadDomains = async () => {
    try {
      const res = await fetch(`${API_BASE}/domains`);
      const data = await res.json();
      setDomains(data);
      if (data.length > 0) setSelectedDomain(data[0]);
    } catch (e) {
      console.error('Failed to load domains:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadIntegrations = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/integrations`);
      const data = await res.json();
      setIntegrations(data);
    } catch (e) {
      console.error('Failed to load integrations:', e);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/config`);
      const data = await res.json();
      setSettings(data);
      setNotifications(data.notifications || {});
      if (data.smtp_config) {
        setSmtpForm({
          host: data.smtp_config.host || '',
          port: String(data.smtp_config.port || 587),
          secure: data.smtp_config.secure || false,
          user: data.smtp_config.user || '',
          pass: '',
          from: data.smtp_config.from || ''
        });
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  const saveNotifications = async (key: string, value: boolean) => {
    try {
      const current = { ...notifications, [key]: value };
      await fetch(`${API_BASE}/settings/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(current)
      });
      setNotifications(current);
    } catch (e) {
      console.error('Failed to save notifications:', e);
    }
  };

  const saveSmtp = async () => {
    try {
      await fetch(`${API_BASE}/settings/smtp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpForm)
      });
      alert('SMTP settings saved!');
    } catch (e) {
      alert('Failed to save SMTP: ' + e.message);
    }
  };

  const testSmtp = async () => {
    setTestingSmtp(true);
    try {
      const res = await fetch(`${API_BASE}/settings/smtp/test`, { method: 'POST' });
      const data = await res.json();
      alert(data.success ? 'SMTP connection successful!' : 'SMTP failed: ' + data.error);
    } catch (e) {
      alert('SMTP test failed: ' + e.message);
    } finally {
      setTestingSmtp(false);
    }
  };

  const toggleSchedule = async (enabled: boolean) => {
    try {
      await fetch(`${API_BASE}/settings/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      setSettings({ ...settings, scan_schedule: { ...settings.scan_schedule, enabled } });
    } catch (e) {
      console.error('Failed to toggle schedule:', e);
    }
  };

  const toggleAutoRemediation = async (enabled: boolean) => {
    try {
      await fetch(`${API_BASE}/settings/auto-remediation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      setSettings({ ...settings, auto_remediation: enabled });
    } catch (e) {
      console.error('Failed to toggle auto-remediation:', e);
    }
  };

  const addDomain = async () => {
    if (!domainInput.trim()) return;
    setScanning(true);
    
    try {
      // Add domain
      await fetch(`${API_BASE}/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: domainInput.toLowerCase().trim() })
      });
      
      // Trigger scan
      const res = await fetch(`${API_BASE}/domains/bulk-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain_ids: [] })
      });
      
      await loadDomains();
      setDomainInput("");
    } catch (e) {
      console.error('Failed to add domain:', e);
    } finally {
      setScanning(false);
    }
  };

  const scanDomain = async (domainId: number) => {
    try {
      await fetch(`${API_BASE}/domains/${domainId}/scan`, { method: 'POST' });
      await loadDomains();
    } catch (e) {
      console.error('Scan failed:', e);
    }
  };

  const bulkScan = async () => {
    if (selectedIds.length === 0) return;
    setScanning(true);
    
    try {
      await fetch(`${API_BASE}/domains/bulk-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain_ids: selectedIds })
      });
      await loadDomains();
      setSelectedIds([]);
    } catch (e) {
      console.error('Bulk scan failed:', e);
    } finally {
      setScanning(false);
    }
  };

  const deleteDomains = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      await fetch(`${API_BASE}/settings/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain_ids: selectedIds })
      });
      await loadDomains();
      setSelectedIds([]);
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === domains.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(domains.map(d => d.id));
    }
  };

  const getScoreColor = (score) => {
    if (score >= 70) return "text-emerald-400";
    if (score >= 40) return "text-amber-400";
    return "text-rose-400";
  };

  const getScoreRing = (score) => {
    if (score >= 70) return "stroke-emerald-500";
    if (score >= 40) return "stroke-amber-500";
    return "stroke-rose-500";
  };

  const stats = {
    total: domains.length,
    passing: domains.filter(d => (d.last_score || 0) >= 70).length,
    warnings: domains.filter(d => (d.last_score || 0) >= 40 && (d.last_score || 0) < 70).length,
    failed: domains.filter(d => (d.last_score || 0) < 40).length
  };

  const viewDomain = async (domain: any) => {
    try {
      const res = await fetch(`${API_BASE}/domains/${domain.id}`);
      const data = await res.json();
      setSelectedDomain(data);
      setShowDetails(true);
    } catch (e) {
      console.error('Failed to load domain details:', e);
    }
  };

  const fixDomain = async (domainId: number) => {
    try {
      const res = await fetch(`${API_BASE}/domains/${domainId}/analyze-fix`, { method: 'POST' });
      const data = await res.json();
      
      if (data.error) {
        alert(data.error);
        return;
      }

      setFixRecommendations(data);
      setShowDetails(true);
    } catch (e) {
      alert('Failed to analyze domain: ' + e.message);
    }
  };

  const openVerifyModal = async (domain: any) => {
    try {
      const res = await fetch(`${API_BASE}/domains/${domain.id}/verify/generate`);
      const data = await res.json();
      setVerifyDomain(domain);
      setVerifyToken(data.token);
      setShowVerifyModal(true);
    } catch (e) {
      console.error('Failed to generate verification:', e);
    }
  };

  const verifyDomainOwnership = async () => {
    if (!verifyDomain) return;
    setVerifying(true);
    try {
      const res = await fetch(`${API_BASE}/domains/${verifyDomain.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verifyToken })
      });
      const data = await res.json();
      
      if (data.verified) {
        alert('Domain verified successfully! Features unlocked.');
        setShowVerifyModal(false);
        loadDomains();
      } else {
        alert('Verification failed: ' + (data.reason || 'TXT record not found'));
      }
    } catch (e) {
      alert('Verification failed: ' + e.message);
    } finally {
      setVerifying(false);
    }
  };

  const generateReport = async (domainId: number) => {
    setGeneratingReport(true);
    try {
      const response = await fetch(`${API_BASE}/reports/domains/${domainId}/report`);
      const html = await response.text();
      
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${domainId}-${Date.now()}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to generate report: ' + e.message);
    } finally {
      setGeneratingReport(false);
    }
  };

  const exportCSV = async () => {
    try {
      const response = await fetch(`${API_BASE}/reports/export/csv`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'nexusemail-domains.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to export CSV: ' + e.message);
    }
  };

  const exportJSON = async () => {
    try {
      const response = await fetch(`${API_BASE}/reports/export/json`);
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'nexusemail-domains.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to export JSON: ' + e.message);
    }
  };

  const openProviderModal = (provider: any) => {
    setSelectedProvider(provider);
    const creds = settings?.provider_credentials?.[provider.name.toLowerCase()] || {};
    setProviderCreds(creds);
    setShowProviderModal(true);
  };

  const saveProviderCredentials = async () => {
    if (!selectedProvider) return;
    setSavingProvider(true);
    try {
      await fetch(`${API_BASE}/settings/providers/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider.name,
          credentials: providerCreds
        })
      });
      alert(`${selectedProvider.name} connected successfully!`);
      setShowProviderModal(false);
      loadSettings();
    } catch (e) {
      alert('Failed to save credentials: ' + e.message);
    } finally {
      setSavingProvider(false);
    }
  };

  const disconnectProvider = async (providerName: string) => {
    try {
      await fetch(`${API_BASE}/settings/providers/credentials/${providerName}`, {
        method: 'DELETE'
      });
      alert(`${providerName} disconnected`);
      loadSettings();
    } catch (e) {
      alert('Failed to disconnect: ' + e.message);
    }
  };

  const testProviderConnection = async (provider: any) => {
    const creds = settings?.provider_credentials?.[provider.name.toLowerCase()];
    if (!creds) {
      alert('Please configure credentials first');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/settings/providers/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: provider.name, credentials: creds })
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ ${provider.name} connection successful! (${data.latency}ms)`);
      } else {
        alert(`❌ ${provider.name} failed: ${data.error}`);
      }
    } catch (e) {
      alert('Test failed: ' + e.message);
    }
  };

  const getProviderFields = (providerName: string) => {
    const fields: Record<string, string[]> = {
      'Cloudflare': ['api_key', 'email'],
      'AWS Route53': ['access_key_id', 'secret_access_key', 'region'],
      'GoDaddy': ['api_key', 'secret'],
      'DigitalOcean': ['api_token'],
      'Vercel': ['token'],
      'Namecheap': ['api_key', 'username', 'ip'],
      'NameSilo': ['api_key'],
      'Gandi': ['api_key'],
      'DNSimple': ['access_token', 'account_id'],
      'Linode': ['access_token'],
      'Porkbun': ['api_key', 'secret'],
      'ClouDNS': ['auth_id', 'auth_password'],
      'Google Cloud DNS': ['project_id', 'access_token'],
      'Azure DNS': ['subscription_id', 'resource_group', 'access_token'],
      'Aliyun': ['access_key_id', 'access_key_secret', 'region'],
      'DNSPod': ['token'],
      'NS1': ['api_key'],
      'Bunny DNS': ['api_key'],
      'UltraDNS': ['username', 'password'],
      'EdgeDNS': ['access_token', 'cp_code']
    };
    return fields[providerName] || ['api_key'];
  };

  const dnsProviders = [
    { name: 'Cloudflare', icon: Server },
    { name: 'AWS Route53', icon: Server },
    { name: 'GoDaddy', icon: Server },
    { name: 'DigitalOcean', icon: Server },
    { name: 'Vercel', icon: Server },
    { name: 'Namecheap', icon: Server },
    { name: 'NameSilo', icon: Server },
    { name: 'Gandi', icon: Server },
    { name: 'DNSimple', icon: Server },
    { name: 'Linode', icon: Server },
    { name: 'Porkbun', icon: Server },
    { name: 'ClouDNS', icon: Server },
    { name: 'Google Cloud DNS', icon: Server },
    { name: 'Azure DNS', icon: Server },
    { name: 'Aliyun', icon: Server },
    { name: 'DNSPod', icon: Server },
    { name: 'NS1', icon: Server },
    { name: 'Bunny DNS', icon: Server },
    { name: 'UltraDNS', icon: Server },
    { name: 'EdgeDNS', icon: Server },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center animate-pulse">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <p className="text-muted-foreground">Loading NexusEmail...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="min-h-screen bg-background text-foreground">
        {/* Navbar */}
        <nav className="border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold tracking-tight">NexusEmail</h1>
                  <p className="text-xs text-muted-foreground">Open Source Email Security</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <Bell className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDarkMode(!darkMode)} className="text-muted-foreground hover:text-foreground">
                  {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </Button>
                <div className="ml-2 flex items-center gap-2 pl-4 border-l border-border">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-sm font-medium text-white">
                    OB
                  </div>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-6 py-8">
          {/* Hero Search */}
          <div className="mb-10">
            <div className="relative max-w-2xl mx-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 blur-3xl rounded-3xl" />
              <Card className="relative border-border/50 bg-card/50 backdrop-blur-xl">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        placeholder="Add domain and scan (e.g., example.com)"
                        className="h-12 pl-12 bg-background/50 border-border/50"
                        value={domainInput}
                        onChange={(e) => setDomainInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addDomain()}
                      />
                    </div>
                    <Button 
                      className="h-12 px-6 bg-gradient-to-r from-indigo-500 to-purple-500"
                      onClick={addDomain}
                      disabled={scanning}
                    >
                      {scanning ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                      Add & Scan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Domain Details Panel */}
          {showDetails && selectedDomain && (
            <Card className="border-indigo-500/50 mb-6">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">{selectedDomain.name}</CardTitle>
                  <CardDescription>Scan Results & Recommended Fixes</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => fixDomain(selectedDomain.id)}>
                    <Wrench className="w-4 h-4 mr-1" /> Get Fix Records
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowDetails(false)}>Close</Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* DNS Status Cards */}
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div className={`p-4 rounded-lg border ${selectedDomain.latest_scan?.spf_status === 'PASS' ? 'border-emerald-500 bg-emerald-500/10' : 'border-amber-500 bg-amber-500/10'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">SPF</p>
                      <span className="text-xs cursor-help" title="Sender Policy Framework - Specifies which mail servers can send email for your domain">?</span>
                    </div>
                    <p className="font-semibold">{selectedDomain.latest_scan?.spf_status || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground mt-1">Authorizes senders for your domain</p>
                  </div>
                  <div className={`p-4 rounded-lg border ${selectedDomain.latest_scan?.dkim_status === 'PASS' ? 'border-emerald-500 bg-emerald-500/10' : 'border-amber-500 bg-amber-500/10'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">DKIM</p>
                      <span className="text-xs cursor-help" title="DomainKeys Identified Mail - Cryptographic signature to verify email hasn't been tampered">?</span>
                    </div>
                    <p className="font-semibold">{selectedDomain.latest_scan?.dkim_status || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground mt-1">Digital signature verification</p>
                  </div>
                  <div className={`p-4 rounded-lg border ${selectedDomain.latest_scan?.dmarc_status === 'PASS' ? 'border-emerald-500 bg-emerald-500/10' : 'border-amber-500 bg-amber-500/10'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">DMARC</p>
                      <span className="text-xs cursor-help" title="Domain-based Message Authentication - Policy for handling failed auth">?</span>
                    </div>
                    <p className="font-semibold">{selectedDomain.latest_scan?.dmarc_status || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground mt-1">Policy for SPF/DKIM failures</p>
                  </div>
                </div>

                {/* Issues with Tooltips */}
                {selectedDomain.issues?.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <p className="font-medium text-sm">Issues Found:</p>
                    {selectedDomain.issues.map((issue: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/30">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="text-sm">{issue.message || issue.type || issue}</span>
                        {issue.type === 'SPF' && (
                          <span className="text-xs text-muted ml-auto" title="Add a TXT record with 'v=spf1 include:_spf.yourdomain.com ~all'">Fix: Add SPF record</span>
                        )}
                        {issue.type === 'DMARC' && (
                          <span className="text-xs text-muted ml-auto" title="Add a TXT record with 'v=DMARC1; p=quarantine; rua=mailto:reports@yourdomain.com'">Fix: Add DMARC record</span>
                        )}
                        {issue.type === 'MTA-STS' && (
                          <span className="text-xs text-muted ml-auto" title="Add _mta-sts TXT record for SMTP TLS enforcement">Fix: Add MTA-STS record</span>
                        )}
                        {issue.type === 'TLS-RPT' && (
                          <span className="text-xs text-muted ml-auto" title="Add _smtp._tls TXT record for TLS reporting">Fix: Add TLS-RPT record</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Recommendations Section */}
                {fixRecommendations && (
                  <div className="space-y-3 mt-4 p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/30">
                    <p className="font-medium text-sm">Recommended DNS Records:</p>
                    <div className="grid gap-2 text-xs font-mono">
                      {fixRecommendations.recommended_records?.spf && (
                        <div className="p-2 bg-background rounded border">
                          <span className="text-muted">SPF:</span> {fixRecommendations.recommended_records.spf.recommended}
                        </div>
                      )}
                      {fixRecommendations.recommended_records?.dmarc && (
                        <div className="p-2 bg-background rounded border">
                          <span className="text-muted">DMARC:</span> {fixRecommendations.recommended_records.dmarc.recommended}
                        </div>
                      )}
                      {fixRecommendations.recommended_records?.mta_sts && (
                        <div className="p-2 bg-background rounded border">
                          <span className="text-muted">MTA-STS:</span> {fixRecommendations.recommended_records.mta_sts.recommended}
                        </div>
                      )}
                      {fixRecommendations.recommended_records?.tls_rpt && (
                        <div className="p-2 bg-background rounded border">
                          <span className="text-muted">TLS-RPT:</span> {fixRecommendations.recommended_records.tls_rpt.recommended}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted">
                      Provider: {fixRecommendations.email_provider?.provider} | Auto-fix: {fixRecommendations.auto_fix_supported ? 'Supported' : 'Manual only'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { label: "Total Domains", value: stats.total, icon: Globe, color: "indigo", filter: null },
              { label: "Passing", value: stats.passing, icon: CheckCircle, color: "emerald", filter: "passing" },
              { label: "Warnings", value: stats.warnings, icon: AlertTriangle, color: "amber", filter: "warnings" },
              { label: "Failed", value: stats.failed, icon: XCircle, color: "rose", filter: "failed" },
            ].map((stat, i) => (
              <Card key={i} className="border-border/40 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { setActiveTab("domains"); setDomainFilter(stat.filter); }}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-${stat.color}-500/10 flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 text-${stat.color}-500`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
              <TabsTrigger value="domains" className="data-[state=active]:bg-background" data-value="domains">
                <Globe className="w-4 h-4 mr-2" /> Domains
              </TabsTrigger>
              <TabsTrigger value="integrations" className="data-[state=active]:bg-background" data-value="integrations">
                <Plug className="w-4 h-4 mr-2" /> Integrations
              </TabsTrigger>
              <TabsTrigger value="notifications" className="data-[state=active]:bg-background" data-value="notifications">
                <Bell className="w-4 h-4 mr-2" /> Notifications
              </TabsTrigger>
              <TabsTrigger value="reports" className="data-[state=active]:bg-background" data-value="reports">
                <BarChart3 className="w-4 h-4 mr-2" /> Reports
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-background" data-value="settings">
                <Settings className="w-4 h-4 mr-2" /> Settings
              </TabsTrigger>
              <TabsTrigger value="brands" className="data-[state=active]:bg-background" data-value="brands">
                <Shield className="w-4 h-4 mr-2" /> Brand Protection
              </TabsTrigger>
            </TabsList>

            <TabsContent value="domains" className="space-y-4">
              {/* Bulk Actions */}
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-4 p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                  <span className="text-sm">{selectedIds.length} domains selected</span>
                  <Button size="sm" onClick={bulkScan} disabled={scanning}>
                    <Zap className="w-4 h-4 mr-2" /> Scan Selected
                  </Button>
                  <Button size="sm" variant="destructive" onClick={deleteDomains}>
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </Button>
                </div>
              )}

              {domainFilter && (
                <div className="mb-4 flex items-center gap-2 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                  <span className="text-sm text-indigo-400">Filtering by:</span>
                  <Badge variant="outline" className="border-indigo-500 text-indigo-400">
                    {domainFilter}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => setDomainFilter(null)} className="ml-auto">
                    Clear
                  </Button>
                </div>
              )}

              <Card className="border-border/40">
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/40">
                        <th className="p-4 w-12">
                          <Button variant="ghost" size="icon" onClick={toggleSelectAll}>
                            {selectedIds.length === domains.length && domains.length > 0 
                              ? <CheckSquare className="w-4 h-4" /> 
                              : <Square className="w-4 h-4" />}
                          </Button>
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Domain</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Provider</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Score</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Last Scan</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {domains.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            No domains added yet. Add a domain above to get started.
                          </td>
                        </tr>
                      ) : (domainFilter === 'passing' ? domains.filter(d => (d.last_score || 0) >= 80) :
                        domainFilter === 'warnings' ? domains.filter(d => (d.last_score || 0) >= 50 && (d.last_score || 0) < 80) :
                        domainFilter === 'failed' ? domains.filter(d => (d.last_score || 0) < 50) :
                        domains).map((domain) => (
                        <tr key={domain.id} className="border-b border-border/20 hover:bg-muted/30">
                          <td className="p-4">
                            <Button variant="ghost" size="icon" onClick={() => toggleSelect(domain.id)}>
                              {selectedIds.includes(domain.id) 
                                ? <CheckSquare className="w-4 h-4 text-indigo-500" /> 
                                : <Square className="w-4 h-4" />}
                            </Button>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                <Globe className="w-5 h-5" />
                              </div>
                              <div>
                                <span className="font-medium">{domain.name}</span>
                                {domain.verified ? (
                                  <div className="flex items-center gap-1 text-xs text-emerald-500">
                                    <CheckCircle className="w-3 h-3" /> Verified
                                  </div>
                                ) : (
                                  <Button size="sm" variant="ghost" className="text-xs text-amber-500 h-auto p-0" onClick={() => openVerifyModal(domain)}>
                                    <AlertTriangle className="w-3 h-3 mr-1" /> Verify
                                  </Button>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-muted-foreground">{domain.provider || 'Manual'}</td>
                          <td className="p-4">
                            <span className={`text-xl font-bold ${getScoreColor(domain.last_score || 0)}`}>
                              {domain.last_score || '-'}
                            </span>
                          </td>
                          <td className="p-4 text-muted-foreground">
                            {domain.last_scan ? new Date(domain.last_scan).toLocaleDateString() : 'Never'}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => scanDomain(domain.id)} title="Scan">
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => viewDomain(domain)} title="View Details">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => fixDomain(domain.id)} title="Auto-Fix">
                                <Wrench className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="integrations" className="space-y-6">
              <h2 className="text-lg font-semibold">DNS Providers</h2>
              <p className="text-sm text-muted-foreground">Connect your DNS providers to enable auto-remediation (auto-fix SPF/DMARC records)</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {dnsProviders.map((provider: any) => {
                  const isConnected = settings?.provider_credentials?.[provider.name.toLowerCase()];
                  return (
                    <Card key={provider.name} className={`border-border/40 ${isConnected ? 'border-emerald-500/50 bg-emerald-500/5' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                              <provider.icon className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="font-medium">{provider.name}</span>
                              {isConnected && (
                                <p className="text-xs text-emerald-500">Connected</p>
                              )}
                            </div>
                          </div>
                        </div>
                        {isConnected ? (
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1 text-xs"
                              onClick={() => testProviderConnection(provider)}
                            >
                              Test
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-xs text-red-500"
                              onClick={() => disconnectProvider(provider.name)}
                            >
                              ×
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="w-full text-xs"
                            onClick={() => openProviderModal(provider)}
                          >
                            Configure
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

        {showProviderModal && selectedProvider && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowProviderModal(false)}>
            <div className="bg-background border rounded-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Configure {selectedProvider.name}</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowProviderModal(false)}>
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                Enter your {selectedProvider.name} API credentials to enable auto-remediation.
              </p>

              <div className="space-y-3">
                {getProviderFields(selectedProvider.name).map((field: string) => (
                  <div key={field}>
                    <label className="text-sm font-medium capitalize">{field.replace(/_/g, ' ')}</label>
                    <Input 
                      type={field.includes('key') || field.includes('secret') || field.includes('token') ? 'password' : 'text'}
                      value={providerCreds[field] || ''} 
                      onChange={(e) => setProviderCreds({...providerCreds, [field]: e.target.value})}
                      placeholder={`Enter ${field.replace(/_/g, ' ')}`}
                      className="mt-1"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-4">
                <Button onClick={saveProviderCredentials} disabled={savingProvider}>
                  {savingProvider ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="ghost" onClick={() => setShowProviderModal(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        )}

            <TabsContent value="notifications" className="space-y-4">
              <Card className="border-border/40">
                <CardHeader>
                  <CardTitle>SMTP Configuration</CardTitle>
                  <CardDescription>Configure email delivery for notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">SMTP Host</label>
                      <Input value={smtpForm.host} onChange={(e) => setSmtpForm({...smtpForm, host: e.target.value})} placeholder="smtp.example.com" className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Port</label>
                      <Input value={smtpForm.port} onChange={(e) => setSmtpForm({...smtpForm, port: e.target.value})} placeholder="587" className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Username</label>
                      <Input value={smtpForm.user} onChange={(e) => setSmtpForm({...smtpForm, user: e.target.value})} placeholder="user@example.com" className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Password</label>
                      <Input type="password" value={smtpForm.pass} onChange={(e) => setSmtpForm({...smtpForm, pass: e.target.value})} placeholder="••••••••" className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">From Email</label>
                      <Input value={smtpForm.from} onChange={(e) => setSmtpForm({...smtpForm, from: e.target.value})} placeholder="noreply@yourdomain.com" className="mt-1" />
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <input type="checkbox" checked={smtpForm.secure} onChange={(e) => setSmtpForm({...smtpForm, secure: e.target.checked})} className="rounded" />
                        Use TLS/SSL
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveSmtp}>
                      <Save className="w-4 h-4 mr-2" /> Save SMTP
                    </Button>
                    <Button variant="outline" onClick={testSmtp} disabled={testingSmtp}>
                      {testingSmtp ? 'Testing...' : 'Test'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/40">
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { key: 'scan_completed', label: 'Scan completed notifications', desc: 'Get notified when scans complete' },
                    { key: 'critical_alerts', label: 'Critical security alerts', desc: 'Immediate alerts for high severity issues' },
                    { key: 'weekly_report', label: 'Weekly summary report', desc: 'Receive weekly security summary' },
                  ].map((pref) => (
                    <div key={pref.key} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{pref.label}</p>
                        <p className="text-sm text-muted-foreground">{pref.desc}</p>
                      </div>
                      <Button 
                        variant={notifications[pref.key] ? "default" : "outline"} 
                        size="sm" 
                        onClick={() => saveNotifications(pref.key, !notifications[pref.key])}
                      >
                        {notifications[pref.key] ? 'On' : 'Off'}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Generate Reports</h2>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={exportCSV}>
                    <Download className="w-4 h-4 mr-2" /> Export CSV
                  </Button>
                  <Button variant="outline" onClick={exportJSON}>
                    <Download className="w-4 h-4 mr-2" /> Export JSON
                  </Button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Card className="border-border/40">
                  <CardHeader>
                    <CardTitle>Single Domain Report</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">Generate detailed HTML report for a specific domain</p>
                    <div className="space-y-2">
                      <select 
                        className="w-full p-2 rounded border bg-background"
                        value={reportDomainId || ''}
                        onChange={(e) => setReportDomainId(Number(e.target.value))}
                      >
                        <option value="">Select domain...</option>
                        {domains.map((d: any) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <Button 
                        className="w-full" 
                        onClick={() => reportDomainId && generateReport(reportDomainId)}
                        disabled={!reportDomainId || generatingReport}
                      >
                        {generatingReport ? 'Generating...' : 'Generate Report'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/40">
                  <CardHeader>
                    <CardTitle>Bulk Export</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">Export all domain data as CSV or JSON</p>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full" onClick={exportCSV}>
                        <Download className="w-4 h-4 mr-2" /> Download CSV
                      </Button>
                      <Button variant="outline" className="w-full" onClick={exportJSON}>
                        <Download className="w-4 h-4 mr-2" /> Download JSON
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card className="border-border/40">
                <CardHeader>
                  <CardTitle>Scan Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Auto-scan on add</p>
                      <p className="text-sm text-muted-foreground">Automatically scan new domains</p>
                    </div>
                    <Button variant={settings?.scan_schedule?.enabled ? "default" : "outline"} size="sm" onClick={() => toggleSchedule(!settings?.scan_schedule?.enabled)}>
                      {settings?.scan_schedule?.enabled ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Scheduled scans</p>
                      <p className="text-sm text-muted-foreground">Daily at 2:00 AM UTC</p>
                    </div>
                    <Button variant={settings?.scan_schedule?.enabled ? "default" : "outline"} size="sm" onClick={() => toggleSchedule(!settings?.scan_schedule?.enabled)}>
                      {settings?.scan_schedule?.enabled ? 'Daily' : 'Off'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/40">
                <CardHeader>
                  <CardTitle>Auto-Remediation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Auto-fix issues</p>
                      <p className="text-sm text-muted-foreground">Automatically apply recommended fixes</p>
                    </div>
                    <Button variant={settings?.auto_remediation ? "default" : "outline"} size="sm" onClick={() => toggleAutoRemediation(!settings?.auto_remediation)}>
                      {settings?.auto_remediation ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/40">
                <CardHeader>
                  <CardTitle>Email Notifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Scan completed</p>
                      <p className="text-sm text-muted-foreground">Notify when domain scan finishes</p>
                    </div>
                    <Button variant={notifications.notify_scan_completed ? "default" : "outline"} size="sm" onClick={() => saveNotifications('scan_completed', !notifications.notify_scan_completed)}>
                      {notifications.notify_scan_completed ? 'On' : 'Off'}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Critical alerts</p>
                      <p className="text-sm text-muted-foreground">Notify on critical security issues</p>
                    </div>
                    <Button variant={notifications.notify_critical_alerts ? "default" : "outline"} size="sm" onClick={() => saveNotifications('critical_alerts', !notifications.notify_critical_alerts)}>
                      {notifications.notify_critical_alerts ? 'On' : 'Off'}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Weekly report</p>
                      <p className="text-sm text-muted-foreground">Receive weekly security summary</p>
                    </div>
                    <Button variant={notifications.notify_weekly_report ? "default" : "outline"} size="sm" onClick={() => saveNotifications('weekly_report', !notifications.notify_weekly_report)}>
                      {notifications.notify_weekly_report ? 'On' : 'Off'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/40">
                <CardHeader>
                  <CardTitle>SMTP Configuration</CardTitle>
                  <CardDescription>Configure email delivery for notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">SMTP Host</label>
                      <Input value={smtpForm.host} onChange={(e) => setSmtpForm({...smtpForm, host: e.target.value})} placeholder="smtp.example.com" className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Port</label>
                      <Input value={smtpForm.port} onChange={(e) => setSmtpForm({...smtpForm, port: e.target.value})} placeholder="587" className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Username</label>
                      <Input value={smtpForm.user} onChange={(e) => setSmtpForm({...smtpForm, user: e.target.value})} placeholder="user@example.com" className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Password</label>
                      <Input type="password" value={smtpForm.pass} onChange={(e) => setSmtpForm({...smtpForm, pass: e.target.value})} placeholder="••••••••" className="mt-1" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium">From Email</label>
                      <Input value={smtpForm.from} onChange={(e) => setSmtpForm({...smtpForm, from: e.target.value})} placeholder="noreply@yourdomain.com" className="mt-1" />
                    </div>
                    <div className="col-span-2">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <input type="checkbox" checked={smtpForm.secure} onChange={(e) => setSmtpForm({...smtpForm, secure: e.target.checked})} className="rounded" />
                        Use TLS/SSL
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveSmtp}><Save className="w-4 h-4 mr-2" />Save SMTP</Button>
                    <Button variant="outline" onClick={testSmtp} disabled={testingSmtp}>{testingSmtp ? 'Testing...' : 'Test Connection'}</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/40">
                <CardHeader>
                  <CardTitle>DNS Providers</CardTitle>
                  <CardDescription>Connected DNS providers for auto-remediation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {dnsProviders.map((p: any) => {
                      const creds = settings?.provider_credentials?.[p.name.toLowerCase()];
                      return (
                        <div key={p.name} className={`p-3 rounded-lg border ${creds ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-border'}`}>
                          <div className="flex items-center gap-2">
                            <Server className="w-4 h-4" />
                            <span className="text-sm font-medium">{p.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{creds ? 'Connected' : 'Not connected'}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="brands" className="space-y-4">
              <Card className="border-border/40">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Brand Protection</CardTitle>
                    <CardDescription>Monitor your brand against typosquatting and impersonation</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {brandAlerts.length > 0 && (
                      <Button variant="outline" size="sm" onClick={() => setShowAlertsModal(true)}>
                        <Bell className="w-4 h-4 mr-1" /> Alerts
                        <Badge variant="destructive" className="ml-1 text-xs">{brandAlerts.length}</Badge>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={bulkScanAll} disabled={bulkScanning}>
                      {bulkScanning ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                      Scan All
                    </Button>
                    <Button onClick={() => setShowAddBrand(true)}>
                      <Plus className="w-4 h-4 mr-2" /> Add Brand
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {showAddBrand && (
                    <div className="mb-6 p-4 bg-muted/30 rounded-lg border">
                      <p className="font-medium mb-3">Add Brand to Monitor</p>
                      <div className="grid gap-3">
                        <div>
                          <label className="text-sm text-muted-foreground">Domain</label>
                          <Input 
                            placeholder="example.com" 
                            value={newBrandDomain}
                            onChange={(e) => setNewBrandDomain(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Brand Name (optional)</label>
                          <Input 
                            placeholder="My Company" 
                            value={newBrandName}
                            onChange={(e) => setNewBrandName(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => {
                              if (!newBrandDomain.trim()) return;
                              fetch(`${API_BASE}/brands`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                  domain: newBrandDomain.toLowerCase().trim(), 
                                  brand_name: newBrandName || newBrandDomain.split('.')[0] 
                                })
                              }).then(() => {
                                loadBrands();
                                setNewBrandDomain('');
                                setNewBrandName('');
                                setShowAddBrand(false);
                              });
                            }}
                          >
                            <Save className="w-4 h-4 mr-1" /> Save
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => {
                            setShowAddBrand(false);
                            setNewBrandDomain('');
                            setNewBrandName('');
                          }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {brands.length === 0 && !showAddBrand ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No brands being monitored</p>
                      <p className="text-sm">Add a brand to start monitoring for typosquatting and impersonation</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {brands.map((brand: any) => (
                        <div key={brand.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Shield className="w-5 h-5 text-indigo-500" />
                            <div>
                              <p className="font-medium">{brand.domain}</p>
                              <p className="text-sm text-muted-foreground">{brand.brand_name}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={async () => {
                              setBrandScanning(true);
                              setBrandScanResult(null);
                              try {
                                const res = await fetch(`${API_BASE}/brands/check/${brand.id}`, { method: 'POST' });
                                const data = await res.json();
                                setBrandScanResult({ ...data, brand: brand.domain });
                              } catch (e) { 
                                setBrandScanResult({ error: 'Scan failed' });
                              } finally {
                                setBrandScanning(false);
                              }
                            }}>
                              <Search className="w-4 h-4 mr-1" /> Scan
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openBrandDetails(brand)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => {
                              fetch(`${API_BASE}/brands/${brand.id}`, { method: 'DELETE' }).then(() => loadBrands());
                            }}>
                              <Trash2 className="w-4 h-4 text-rose-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Scan Results Display */}
                  {brandScanning && (
                    <div className="mt-4 p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/30 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm font-medium">Scanning brand protection...</span>
                      </div>
                      
                      {/* Progress Hints */}
                      <div className="space-y-2 text-xs">
                        <div className={`flex items-center gap-2 ${brandScanResult?.progress?.[0]?.complete ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                          {brandScanResult?.progress?.[0]?.complete ? '✓' : '○'} Detecting DNS provider
                        </div>
                        <div className={`flex items-center gap-2 ${brandScanResult?.progress?.[1]?.complete ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                          {brandScanResult?.progress?.[1]?.complete ? '✓' : '○'} Checking typosquatting variations
                        </div>
                        <div className={`flex items-center gap-2 ${brandScanResult?.progress?.[2]?.complete ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                          {brandScanResult?.progress?.[2]?.complete ? '✓' : '○'} Checking lookalike domains
                        </div>
                        <div className={`flex items-center gap-2 ${brandScanResult?.progress?.[3]?.complete ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                          {brandScanResult?.progress?.[3]?.complete ? '✓' : '○'} Checking subdomain abuse
                        </div>
                        <div className={`flex items-center gap-2 ${brandScanResult?.progress?.[4]?.complete ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                          {brandScanResult?.progress?.[4]?.complete ? '✓' : '○'} Checking social media variants
                        </div>
                        <div className={`flex items-center gap-2 ${brandScanResult?.progress?.[5]?.complete ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                          {brandScanResult?.progress?.[5]?.complete ? '✓' : '○'} Checking homograph attacks
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-300" style={{ 
                          width: `${(brandScanResult?.progress?.filter((p: any) => p.complete).length || 0) * 16.67}%` 
                        }} />
                      </div>
                    </div>
                  )}

                  {brandScanResult && !brandScanning && (
                    <div className="mt-4 p-4 bg-muted/30 rounded-lg border">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-medium">Brand Protection Results</p>
                        <Button variant="ghost" size="sm" onClick={() => setBrandScanResult(null)}>Clear</Button>
                      </div>
                      {brandScanResult.error ? (
                        <p className="text-sm text-rose-500">{brandScanResult.error}</p>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="p-2 bg-emerald-500/10 rounded">
                              <p className="text-muted-foreground">Score</p>
                              <p className="font-bold text-lg">{brandScanResult.score}/100</p>
                            </div>
                            <div className="p-2 bg-muted rounded">
                              <p className="text-muted-foreground">DNS Provider</p>
                              <p className="font-medium">{brandScanResult.dns_provider?.name || 'Unknown'}</p>
                            </div>
                            
                            {/* Clickable: Typosquatting */}
                            <div className="p-2 bg-muted rounded cursor-pointer hover:bg-muted/80" onClick={() => setExpandedSections(expandedSections.includes('typo') ? expandedSections.filter(e => e !== 'typo') : [...expandedSections, 'typo'])}>
                              <p className="text-muted-foreground flex items-center gap-1">
                                Typosquatting
                                <ChevronRight className={`w-3 h-3 transition-transform ${expandedSections.includes('typo') ? 'rotate-90' : ''}`} />
                              </p>
                              <p className="font-medium">{brandScanResult.typosquatting?.length || 0} found</p>
                              {expandedSections.includes('typo') && brandScanResult.typosquatting?.length > 0 && (
                                <div className="mt-2 text-xs space-y-1">
                                  {brandScanResult.typosquatting.slice(0, 10).map((t: any, i: number) => (
                                    <div key={i} className="p-1 bg-background rounded truncate">{t.domain}</div>
                                  ))}
                                  {brandScanResult.typosquatting.length > 10 && <p className="text-muted">+{brandScanResult.typosquatting.length - 10} more</p>}
                                </div>
                              )}
                            </div>
                            
                            {/* Clickable: Lookalikes */}
                            <div className="p-2 bg-muted rounded cursor-pointer hover:bg-muted/80" onClick={() => setExpandedSections(expandedSections.includes('lookalike') ? expandedSections.filter(e => e !== 'lookalike') : [...expandedSections, 'lookalike'])}>
                              <p className="text-muted-foreground flex items-center gap-1">
                                Lookalikes
                                <ChevronRight className={`w-3 h-3 transition-transform ${expandedSections.includes('lookalike') ? 'rotate-90' : ''}`} />
                              </p>
                              <p className="font-medium">{brandScanResult.lookalikes?.length || 0} found</p>
                              {expandedSections.includes('lookalike') && brandScanResult.lookalikes?.length > 0 && (
                                <div className="mt-2 text-xs space-y-1">
                                  {brandScanResult.lookalikes.slice(0, 10).map((l: any, i: number) => (
                                    <div key={i} className="p-1 bg-background rounded truncate">{l.domain}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            {/* Clickable: Impersonation */}
                            <div className="p-2 bg-muted rounded cursor-pointer hover:bg-muted/80" onClick={() => setExpandedSections(expandedSections.includes('impersonation') ? expandedSections.filter(e => e !== 'impersonation') : [...expandedSections, 'impersonation'])}>
                              <p className="text-muted-foreground flex items-center gap-1">
                                Impersonation
                                <ChevronRight className={`w-3 h-3 transition-transform ${expandedSections.includes('impersonation') ? 'rotate-90' : ''}`} />
                              </p>
                              <p className="font-medium">{brandScanResult.impersonation?.length || 0} found</p>
                              {expandedSections.includes('impersonation') && brandScanResult.impersonation?.length > 0 && (
                                <div className="mt-2 text-xs space-y-1">
                                  {brandScanResult.impersonation.slice(0, 10).map((imp: any, i: number) => (
                                    <div key={i} className="p-1 bg-background rounded truncate">{imp.domain}</div>
                                  ))}
                                  {brandScanResult.impersonation.length > 10 && <p className="text-muted">+{brandScanResult.impersonation.length - 10} more</p>}
                                </div>
                              )}
                            </div>
                            
                            {/* Clickable: NS Records */}
                            <div className="p-2 bg-muted rounded cursor-pointer hover:bg-muted/80" onClick={() => setExpandedSections(expandedSections.includes('ns') ? expandedSections.filter(e => e !== 'ns') : [...expandedSections, 'ns'])}>
                              <p className="text-muted-foreground flex items-center gap-1">
                                NS Records
                                <ChevronRight className={`w-3 h-3 transition-transform ${expandedSections.includes('ns') ? 'rotate-90' : ''}`} />
                              </p>
                              {expandedSections.includes('ns') ? (
                                <div className="mt-1 text-xs space-y-1">
                                  {(brandScanResult.dns_provider?.ns || []).map((ns: string, i: number) => (
                                    <div key={i} className="p-1 bg-background rounded truncate">{ns}</div>
                                  ))}
                                </div>
                              ) : (
                                <p className="font-medium text-xs truncate">{brandScanResult.dns_provider?.ns?.[0] || '-'}</p>
                              )}
                            </div>
                          </div>
                          {brandScanResult.issues?.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Issues:</p>
                              {brandScanResult.issues.map((issue: any, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                                  <span>{issue.type}: {issue.count} issues</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {brandScanResult.recommendations?.length > 0 && (
                            <div className="text-sm text-muted-foreground">
                              <p className="font-medium mb-1">Recommendations:</p>
                              <ul className="list-disc list-inside">
                                {brandScanResult.recommendations.map((rec: string, i: number) => (
                                  <li key={i}>{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <footer className="border-t border-border/40 py-6 mt-10">
          <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
            <p>NexusEmail — Open Source Email Security Platform</p>
          </div>
        </footer>

        {/* Brand Details Modal */}
        {selectedBrand && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedBrand(null)}>
            <div className="bg-background border rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold">{selectedBrand.domain}</h3>
                  <p className="text-sm text-muted-foreground">{selectedBrand.brand_name}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedBrand(null)}>
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-6">
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setShowTakedownModal(true)}>
                    <Zap className="w-4 h-4 mr-1" /> Submit Takedown
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowThreatModal(true)}>
                    <AlertTriangle className="w-4 h-4 mr-1" /> Add Threat
                  </Button>
                </div>

                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Tracked Threats ({brandThreats.length})
                  </h4>
                  {brandThreats.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No threats tracked</p>
                  ) : (
                    <div className="space-y-2">
                      {brandThreats.map((threat: any) => (
                        <div key={threat.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                          <div>
                            <p className="font-medium text-sm">{threat.domain}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant={threat.severity === 'high' ? 'destructive' : threat.severity === 'medium' ? 'default' : 'secondary'} className="text-xs">
                                {threat.threat_type}
                              </Badge>
                              <Badge variant="outline" className="text-xs">{threat.severity}</Badge>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" title="Mark as Safe" onClick={() => markAsSafe(selectedBrand.id, threat.domain)}>
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Submit Takedown" onClick={() => {
                              setTakedownForm({ ...takedownForm, domain: threat.domain });
                              setShowTakedownModal(true);
                            }}>
                              <Zap className="w-4 h-4 text-amber-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-indigo-500" />
                    Takedown Requests ({brandTakedowns.length})
                  </h4>
                  {brandTakedowns.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No takedown requests</p>
                  ) : (
                    <div className="space-y-2">
                      {brandTakedowns.map((takedown: any) => (
                        <div key={takedown.id} className="p-3 border rounded-lg bg-muted/30">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{takedown.domain}</p>
                              <p className="text-xs text-muted-foreground">{takedown.threat_type} • {takedown.provider}</p>
                            </div>
                            <Badge variant={takedown.status === 'completed' ? 'default' : takedown.status === 'in_progress' ? 'secondary' : 'outline'}>
                              {takedown.status}
                            </Badge>
                          </div>
                          {takedown.notes && <p className="text-xs text-muted-foreground mt-2">{takedown.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedBrand.safe_list && selectedBrand.safe_list.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      Safe List ({selectedBrand.safe_list.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedBrand.safe_list.map((domain: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600">
                          {domain}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showTakedownModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowTakedownModal(false)}>
            <div className="bg-background border rounded-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">Submit Takedown Request</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm">Domain</label>
                  <Input value={takedownForm.domain} onChange={(e) => setTakedownForm({ ...takedownForm, domain: e.target.value })} placeholder="bad-domain.com" />
                </div>
                <div>
                  <label className="text-sm">Threat Type</label>
                  <select className="w-full p-2 border rounded" value={takedownForm.threat_type} onChange={(e) => setTakedownForm({ ...takedownForm, threat_type: e.target.value })}>
                    <option value="impersonation">Impersonation</option>
                    <option value="typosquatting">Typosquatting</option>
                    <option value="phishing">Phishing</option>
                    <option value="fake_store">Fake Store</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm">Evidence / Notes</label>
                  <textarea className="w-full p-2 border rounded" rows={3} value={takedownForm.evidence} onChange={(e) => setTakedownForm({ ...takedownForm, evidence: e.target.value })} placeholder="Describe the abuse..." />
                </div>
                <div>
                  <label className="text-sm">Contact Email</label>
                  <Input value={takedownForm.contact_email} onChange={(e) => setTakedownForm({ ...takedownForm, contact_email: e.target.value })} placeholder="legal@yourbrand.com" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => submitTakedown(selectedBrand?.id)}>Submit Request</Button>
                  <Button variant="ghost" onClick={() => setShowTakedownModal(false)}>Cancel</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showThreatModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowThreatModal(false)}>
            <div className="bg-background border rounded-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">Add Manual Threat</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm">Domain</label>
                  <Input value={threatForm.domain} onChange={(e) => setThreatForm({ ...threatForm, domain: e.target.value })} placeholder="fake-brand.com" />
                </div>
                <div>
                  <label className="text-sm">Threat Type</label>
                  <select className="w-full p-2 border rounded" value={threatForm.threat_type} onChange={(e) => setThreatForm({ ...threatForm, threat_type: e.target.value })}>
                    <option value="manual">Manual</option>
                    <option value="impersonation">Impersonation</option>
                    <option value="typosquatting">Typosquatting</option>
                    <option value="phishing">Phishing</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm">Severity</label>
                  <select className="w-full p-2 border rounded" value={threatForm.severity} onChange={(e) => setThreatForm({ ...threatForm, severity: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm">Notes</label>
                  <textarea className="w-full p-2 border rounded" rows={2} value={threatForm.notes} onChange={(e) => setThreatForm({ ...threatForm, notes: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => addThreat(selectedBrand?.id)}>Add Threat</Button>
                  <Button variant="ghost" onClick={() => setShowThreatModal(false)}>Cancel</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showAlertsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAlertsModal(false)}>
            <div className="bg-background border rounded-lg w-full max-w-lg max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Threat Alerts ({brandAlerts.length})</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowAlertsModal(false)}>
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>
              {brandAlerts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No alerts</p>
              ) : (
                <div className="space-y-3">
                  {brandAlerts.map((alert: any) => (
                    <div key={alert.id} className={`p-3 border rounded-lg ${alert.severity === 'high' ? 'bg-rose-500/10 border-rose-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{alert.domain}</p>
                          <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{alert.brand_name} • {new Date(alert.timestamp).toLocaleString()}</p>
                        </div>
                        <Badge variant={alert.severity === 'high' ? 'destructive' : 'default'} className="text-xs">
                          {alert.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {showVerifyModal && verifyDomain && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowVerifyModal(false)}>
            <div className="bg-background border rounded-lg w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Verify Domain Ownership</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowVerifyModal(false)}>
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                To unlock email security features for <span className="font-medium">{verifyDomain.name}</span>, 
                you must prove ownership by adding a DNS record.
              </p>

              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium text-sm mb-2">TXT Record (Recommended)</p>
                  <div className="text-xs space-y-1">
                    <p><span className="text-muted-foreground">Name:</span> <code className="bg-background px-1">_nexusemail-verification</code></p>
                    <p><span className="text-muted-foreground">Value:</span> <code className="bg-background px-1">_nexusemail-verification={verifyToken}</code></p>
                  </div>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium text-sm mb-2">CNAME Alternative</p>
                  <div className="text-xs space-y-1">
                    <p><span className="text-muted-foreground">Name:</span> <code className="bg-background px-1">verify.{verifyDomain.name}</code></p>
                    <p><span className="text-muted-foreground">Points to:</span> <code className="bg-background px-1">{verifyToken}.verification.nexusemail.local</code></p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  After adding the record, click Verify below. DNS changes may take a few minutes to propagate.
                </p>

                <div className="flex gap-2">
                  <Button onClick={verifyDomainOwnership} disabled={verifying}>
                    {verifying ? 'Verifying...' : 'Verify Now'}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowVerifyModal(false)}>Cancel</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}