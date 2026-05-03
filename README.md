# NexusEmail

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License">
  <img src="https://img.shields.io/badge/python-3.8+-blue.svg" alt="Python">
  <img src="https://img.shields.io/badge/nextjs-14-black.svg" alt="Next.js">
</p>

<p align="center">
  <strong>Open-source email security auditing tool</strong><br>
  Scan, monitor, and fix DMARC, SPF, and DKIM records for your domains.
</p>

---

## ✨ Features

- 🔍 **DNS Scanning** — Comprehensive DMARC, SPF, and DKIM analysis
- 🌐 **Multi-Provider Support** — Connect Cloudflare, AWS Route53, GoDaddy
- 🔧 **Auto-Remediation** — One-click fixes for common issues
- 📊 **Health Scoring** — 0-100 score with actionable insights
- ⏰ **Scheduled Scans** — Automatic daily health checks
- 🎨 **Beautiful UI** — Polished shadcn UI with dark mode support

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.8+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/obakeng/NexusEmail.git
cd NexusEmail
```

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your settings (optional for local run)

npm install
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:3000`

## 🔧 Configuration

### Environment Variables

Create a `backend/.env` file:

```env
# Server
PORT=3001
DB_PATH=./data/nexusemail.db

# Optional: DNS Provider API Keys
# Cloudflare
CLOUDFLARE_API_TOKEN=your_token

# AWS Route53
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret

# GoDaddy
GODADDY_API_KEY=your_key
GODADDY_API_SECRET=your_secret
```

## 📖 Usage

### Adding a Domain

1. Open the web interface at `http://localhost:3000`
2. Click "Add Domain" or use the quick scan input
3. Enter your domain name
4. Click "Scan" to run an initial audit

### Running Scans

- **Manual Scan**: Click the scan button on any domain
- **Quick Scan**: Use the search bar for instant results
- **Scheduled**: Scans run automatically at 2 AM daily

### Connecting DNS Providers

1. Go to **Integrations** tab
2. Click "Connect" on your provider
3. Enter your API credentials
4. Enable auto-remediation in **Settings**

### Auto-Fixing Issues

When issues are detected, click the **Auto-Fix** button to:
- Create missing SPF records
- Set up DMARC policy
- Configure DKIM selectors

## 🏗️ Architecture

```
NexusEmail/
├── frontend/          # Next.js 14 + shadcn/ui
│   └── app/          # React components & pages
├── backend/          # Node.js Express API
│   └── src/
│       ├── routes/  # API endpoints
│       ├── services/# DNS scanning & providers
│       └── db/      # SQLite database
└── data/            # Local database storage
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, shadcn/ui, Tailwind CSS
- **Backend**: Node.js, Express, better-sqlite3
- **DNS**: dnspython, Cloudflare SDK, AWS SDK

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

## 👤 Author

**Obakeng Segoatlhe**
- GitHub: [@obakeng](https://github.com/obakeng)
- Email: osegoatlhe@gmail.com
- LinkedIn: [obakeng-segoatlhe](https://linkedin.com/in/obakeng-segoatlhe)

---

<p align="center">Built with ☕ and frustration over manually checking DNS records.</p>