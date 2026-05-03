"use client";

import { useState, useEffect } from "react";
import {
  Shield, Search, Settings, Activity, AlertTriangle,
  CheckCircle, XCircle, Globe, Plus, RefreshCw, Zap,
  Eye, Moon, Sun, ChevronRight, Server, Mail, Key,
  FileText, BarChart3, Bell, Plug, Clock, Wrench,
  TrendingUp, TrendingDown, Minus, Download, Trash2,
  CheckSquare, Square, MoreHorizontal, Save, MailPlus
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
  const [notifications, setNotifications] = useState({});
  const [activeTab, setActiveTab] = useState("domains");
  const [brands, setBrands] = useState([]);
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [newBrandDomain, setNewBrandDomain] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [brandScanResult, setBrandScanResult] = useState<any>(null);
  const [brandScanning, setBrandScanning] = useState(false);
  const [domainFilter, setDomainFilter] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    loadDomains();
    loadIntegrations();
    loadSettings();
    loadBrands();
  }, []);

  const loadBrands = async () => {
    try {
      const res = await fetch(`${API_BASE}/brands`);
      const data = await res.json();
      setBrands(data);
    } catch (e) {
      console.error('Failed to load brands:', e);
    }
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
      const res = await fetch(`${API_BASE}/settings/notifications`);
      const data = await res.json();
      setNotifications(data);
    } catch (e) {
      console.error('Failed to load settings:', e);
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

  const dnsProviders = [
    { name: 'Cloudflare', icon: Server, connected: false },
    { name: 'AWS Route53', icon: Server, connected: false },
    { name: 'GoDaddy', icon: Server, connected: false },
    { name: 'Namecheap', icon: Server, connected: false },
    { name: 'Azure DNS', icon: Server, connected: false },
    { name: 'Google Cloud', icon: Server, connected: false },
    { name: 'DigitalOcean', icon: Server, connected: false },
    { name: 'Vercel', icon: Server, connected: false },
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
                              <span className="font-medium">{domain.name}</span>
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
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {dnsProviders.map((provider) => (
                  <Card key={provider.name} className="border-border/40">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <provider.icon className="w-5 h-5" />
                        </div>
                        <span className="font-medium">{provider.name}</span>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs">
                        Configure
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <Card className="border-border/40">
                <CardHeader>
                  <CardTitle>SMTP Configuration</CardTitle>
                  <CardDescription>Configure email notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">SMTP Host</label>
                      <Input placeholder="smtp.example.com" className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Port</label>
                      <Input placeholder="587" className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Username</label>
                      <Input placeholder="user@example.com" className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Password</label>
                      <Input type="password" placeholder="••••••••" className="mt-1" />
                    </div>
                  </div>
                  <Button>
                    <Save className="w-4 h-4 mr-2" /> Save SMTP Settings
                  </Button>
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
                      <Button variant="outline" size="sm">Enabled</Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Generate Reports</h2>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" /> Export CSV
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Card className="border-border/40">
                  <CardHeader>
                    <CardTitle>Single Domain Report</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">Generate detailed HTML report for a specific domain</p>
                    <Button className="w-full">Generate Report</Button>
                  </CardContent>
                </Card>

                <Card className="border-border/40">
                  <CardHeader>
                    <CardTitle>Bulk Export</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">Export all domain data as CSV</p>
                    <Button variant="outline" className="w-full">Export All</Button>
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
                    <Button variant="outline" size="sm">Enabled</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Scheduled scans</p>
                      <p className="text-sm text-muted-foreground">Daily at 2:00 AM</p>
                    </div>
                    <Button variant="outline" size="sm">Daily</Button>
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
                      <p className="font-medium">Auto-create SPF</p>
                      <p className="text-sm text-muted-foreground">Automatically fix missing SPF records</p>
                    </div>
                    <Button variant="outline" size="sm">Disabled</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Auto-create DMARC</p>
                      <p className="text-sm text-muted-foreground">Apply recommended DMARC policy</p>
                    </div>
                    <Button variant="outline" size="sm">Disabled</Button>
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
                  <Button onClick={() => setShowAddBrand(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Add Brand
                  </Button>
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
                    <div className="mt-4 p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/30">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm">Scanning for typosquatting and impersonation...</span>
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
                              <p className="text-muted-foreground">Typosquatting</p>
                              <p className="font-medium">{brandScanResult.typosquatting?.length || 0} found</p>
                            </div>
                            <div className="p-2 bg-muted rounded">
                              <p className="text-muted-foreground">Lookalikes</p>
                              <p className="font-medium">{brandScanResult.lookalikes?.length || 0} found</p>
                            </div>
                            <div className="p-2 bg-muted rounded">
                              <p className="text-muted-foreground">Impersonation</p>
                              <p className="font-medium">{brandScanResult.impersonation?.length || 0} found</p>
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
      </div>
    </div>
  );
}