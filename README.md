# THP e-Commerce - Supabase Edition

ระบบบริหารจัดการข้อมูลการจัดส่ง e-Commerce ที่ย้ายจาก Cloudflare D1 ไป Supabase Free Plan

## ✨ Features

- 📊 **Dashboard** - KPI, Charts, Heatmaps, SLA Tracking
- 📦 **Shipment Tracking** - Real-time package monitoring
- 📈 **Performance Analytics** - SLA, RTS, Volume trends
- 🔮 **Forecasting** - Predictive analytics for planning
- 📤 **Data Import/Export** - CSV/Excel with Supabase sync
- 🔐 **Simple Auth** - Session-based login (username/password)
- 💾 **Offline Support** - IndexedDB cache for offline access

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Browser       │────▶│   Supabase       │────▶│  PostgreSQL     │
│   (Static)      │     │   (API + Auth)   │     │  (Free 500MB)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
  IndexedDB              Edge Functions              Row Level Security
  (Offline Cache)        (API Layer)                 (Optional)
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

### 3. Run Development
```bash
npm run dev
# Opens http://localhost:5173
```

### 4. Build for Production
```bash
npm run build
# Output in ./dist
```

## 📦 Deploy Options

| Platform | Command | Best For |
|----------|---------|----------|
| **Vercel** | `vercel --prod` | Easiest, great DX |
| **Netlify** | `netlify deploy --prod` | Free tier generous |
| **Cloudflare Pages** | Connect Git repo | If staying on CF |
| **GitHub Pages** | Push to main | Free, static only |

## 🗄️ Database Setup

1. Create project at [supabase.com](https://supabase.com)
2. Run `supabase-schema.sql` in SQL Editor
3. Get API keys from Settings → API
4. Add to hosting platform environment variables

## 🔄 Data Migration (from Cloudflare D1)

```bash
# 1. Export from D1
wrangler d1 execute ecommerce-db --command="SELECT * FROM shipments" --remote --json > d1-export.json

# 2. Set Supabase service key
export SUPABASE_URL=https://xxx.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=eyJ...

# 3. Run migration
npm run migrate
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | ✅ | Project URL from Supabase |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | For Edge Functions/migration |

### Login Credentials (Default)

| Username | Password | Role |
|----------|----------|------|
| `34000` | `1234` | Regional Office |
| `reg10` | `1234` | Admin |

## 📁 Project Structure

```
.
├── index.html              # Main HTML
├── app.js                  # Core application logic
├── style.css               # Styling
├── supabase-schema.sql     # Database schema
├── supabase-client.js      # Supabase JS client + helpers
├── app-supabase-patch.js   # Integration patch for app.js
├── functions/
│   └── api/
│       └── supabase-data.js  # Edge Function API (optional)
├── migrate-data.js         # D1 → Supabase migration
├── package.json            # Dependencies
├── vite.config.js          # Vite config
├── vercel.json             # Vercel config
├── netlify.toml            # Netlify config
├── .env.example            # Env template
└── MIGRATION_GUIDE.md      # Detailed guide
```

## 💰 Supabase Free Tier Limits

| Resource | Limit |
|----------|-------|
| Database | 500 MB |
| Bandwidth | 2 GB/month |
| Auth Users | 50,000 MAU |
| Edge Functions | 500k invocations/month |

*More than enough for typical e-Commerce operations*

## 🛠️ Development

### Adding New Features

1. Database changes → Update `supabase-schema.sql`
2. API changes → Update `supabase-client.js` + `functions/api/supabase-data.js`
3. Frontend → Update `app.js` + `index.html`

### Code Style

- ES Modules (`type: "module"`)
- Thai language comments
- Chart.js for visualizations
- Flatpickr for date inputs

## 🔒 Security Notes

- **Never** commit `.env.local` or service role keys
- Anon key is safe for browser (RLS handles authorization)
- Service role key only in server/edge functions
- Enable RLS for multi-tenant data isolation

## 📝 License

MIT License - Internal use for THP team

## 🤝 Support

- Internal: Line ID `k.yuktanan`
- Supabase: [discord.supabase.com](https://discord.supabase.com)
- Issues: GitHub Issues

---

**Built with ❤️ for THP e-Commerce Team**