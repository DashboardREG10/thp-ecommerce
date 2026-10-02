# 🚀 THP e-Commerce - Supabase Migration Guide

Complete guide to migrate from Cloudflare D1 to **Supabase Free Plan**.

---

## 📋 Prerequisites

1. **Supabase Account** - Sign up at [supabase.com](https://supabase.com) (Free tier: 500MB DB, 2GB bandwidth, 50k MAU)
2. **GitHub/GitLab Account** - For code hosting
3. **Hosting Platform** - Vercel, Netlify, GitHub Pages, or Cloudflare Pages (all have free tiers)

---

## 🗄️ Step 1: Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Choose organization, enter:
   - **Name**: `thp-ecommerce` (or your choice)
   - **Database Password**: Generate strong password (save it!)
   - **Region**: Choose closest to your users (e.g., `Singapore` for Thailand)
4. Wait ~2 minutes for provisioning

---

## 📊 Step 2: Run Database Schema

1. In Supabase Dashboard, go to **SQL Editor** → **New Query**
2. Copy entire contents of `supabase-schema.sql`
3. Click **Run** (Ctrl+Enter)
4. Verify tables created in **Table Editor** → `shipments`

---

## 🔑 Step 3: Get API Credentials

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (server-side only!)

---

## 🌐 Step 4: Deploy Frontend (Choose One)

### Option A: Vercel (Recommended - Easiest)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy from project root
vercel

# 4. Add Environment Variables in Vercel Dashboard:
#    Settings → Environment Variables → Add:
#    VITE_SUPABASE_URL = your-project-url
#    VITE_SUPABASE_ANON_KEY = your-anon-key
```

### Option B: Netlify

```bash
# 1. Install Netlify CLI
npm i -g netlify-cli

# 2. Login
netlify login

# 3. Create netlify.toml in project root:
```

**netlify.toml:**
```toml
[build]
  publish = "."
  command = "echo 'Static site - no build needed'"

[functions]
  directory = "functions"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

```bash
# 4. Deploy
netlify deploy --prod

# 5. Add env vars in Netlify Dashboard:
#    Site settings → Environment variables
```

### Option C: GitHub Pages (Static Only)

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      - uses: actions/deploy-pages@v4
```

**Note**: GitHub Pages = static only. API calls go directly to Supabase from browser (uses anon key). No Edge Functions.

### Option D: Cloudflare Pages (If staying on Cloudflare)

```bash
# 1. Push to GitHub/GitLab
# 2. Connect repo in Cloudflare Pages
# 3. Build settings:
#    - Build command: (empty)
#    - Build output directory: .
# 4. Add env vars in Pages settings
```

---

## ⚙️ Step 5: Configure Environment Variables

### For Local Development

```bash
# Copy example
cp .env.example .env.local

# Edit with your values
# VITE_SUPABASE_URL=https://xxxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

### For Production (Vercel/Netlify/Cloudflare)

Add in platform dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### For Edge Functions (if using API routes)

Add **server-only** variable:
- `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **NEVER expose in frontend**

---

## 🔄 Step 6: Update Application Code

### Option 1: Direct Browser → Supabase (Simplest, No API Layer)

Update `app.js` to use `supabase-client.js` directly:

```javascript
// In app.js, replace loadLargeData() with:
import { fetchShipments, bulkUpsertShipments } from './supabase-client.js';

async function loadLargeData(key) {
    const currentUser = sessionStorage.getItem('currentUser') || 'unknown';
    
    try {
        // Fetch from Supabase directly
        const { data, serverTime } = await fetchShipments({ 
            owner: currentUser === 'reg10' ? null : currentUser 
        });
        
        // Cache to IndexedDB (keep existing logic)
        // ... existing IndexedDB cache code ...
        
        return data;
    } catch (e) {
        console.warn("Supabase Load Error:", e);
        // Fallback to IndexedDB
        // ... existing fallback code ...
    }
}

// For saving data (CSV import):
async function saveLargeData(key, data) {
    const result = await bulkUpsertShipments(data);
    if (!result.success) {
        throw new Error(result.errors.map(e => e.error).join(', '));
    }
    return true;
}
```

### Option 2: Keep API Layer (If using Edge Functions)

1. Replace `functions/api/data.js` with `functions/api/supabase-data.js`
2. Deploy Edge Functions on your platform
3. Keep existing `fetch('/api/data')` calls in `app.js`

---

## 📦 Step 7: Data Migration (One-time)

### Export from Cloudflare D1

```bash
# If using Wrangler locally:
wrangler d1 execute ecommerce-db --command="SELECT * FROM shipments" --remote --json > d1-export.json
```

### Import to Supabase

**Method A: Via Dashboard (Small datasets < 50k rows)**
1. Table Editor → `shipments` → **Import data** → Upload CSV
2. Map columns to match schema

**Method B: Via Script (Large datasets)**

```javascript
// migrate-data.js
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrate() {
    // Read D1 export
    const raw = JSON.parse(fs.readFileSync('d1-export.json', 'utf8'));
    const rows = raw.results.map(r => ({
        track_no: r.track_no,
        date_received: r.date_received,
        sender_name: r.sender_name,
        receiver_name: r.receiver_name,
        destination_office: r.destination_office,
        cod_amount: r.cod_amount,
        current_status: r.current_status,
        receiver_address: r.receiver_address,
        receiver_phone: r.receiver_phone,
        area: r.area,
        owner: r.owner
    }));

    // Batch upsert
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await supabase.from('shipments').upsert(chunk, { onConflict: 'track_no' });
        if (error) console.error('Chunk error:', error);
        console.log(`Migrated ${i + chunk.length}/${rows.length}`);
    }
}

migrate();
```

Run: `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node migrate-data.js`

---

## 🔒 Step 8: Security Checklist

- [ ] **anon key** only used in frontend (public, safe)
- [ ] **service_role key** only in server/edge functions (never in browser)
- [ ] **RLS (Row Level Security)** enabled if multi-tenant:
  ```sql
  ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Owner access" ON shipments FOR ALL USING (owner = auth.jwt() ->> 'user_id');
  ```
- [ ] **CORS** configured in Supabase: Settings → API → CORS origins → add your domain

---

## 💰 Free Tier Limits (Supabase)

| Resource | Free Limit |
|----------|------------|
| Database | 500 MB |
| Bandwidth | 2 GB/month |
| API Requests | Unlimited (reasonable use) |
| Auth Users | 50,000 MAU |
| Edge Functions | 500k invocations/month |
| Realtime | 200 concurrent connections |

**For THP e-Commerce**: Should fit easily unless you have >500k shipments.

---

## 🐛 Troubleshooting

### "Missing Supabase credentials"
- Check `.env.local` exists and has correct values
- Restart dev server after changing env vars

### CORS Errors
- Supabase Dashboard → Settings → API → CORS Origins
- Add: `http://localhost:5173`, `https://your-domain.com`

### "Row Level Security" blocking queries
- Disable RLS for development: `ALTER TABLE shipments DISABLE ROW LEVEL SECURITY;`
- Or add proper policies

### Slow queries
- Check indexes exist (run schema script)
- Use `fetchShipments({ limit: 1000 })` for pagination

---

## 📁 File Summary

| File | Purpose |
|------|---------|
| `supabase-schema.sql` | Database schema + indexes + views |
| `supabase-client.js` | Browser/Node client + query helpers |
| `functions/api/supabase-data.js` | Edge Function API (optional) |
| `.env.example` | Environment variable template |
| `MIGRATION_GUIDE.md` | This file |

---

## 🎯 Quick Start Checklist

- [ ] Create Supabase project
- [ ] Run `supabase-schema.sql` in SQL Editor
- [ ] Copy URL + anon key to `.env.local`
- [ ] Update `app.js` to use `supabase-client.js`
- [ ] Deploy to Vercel/Netlify
- [ ] Add env vars in hosting dashboard
- [ ] Test login + data load
- [ ] (Optional) Migrate historical data from D1

---

## 🆘 Support

- Supabase Docs: https://supabase.com/docs
- Discord: https://discord.supabase.com
- GitHub Issues: Create issue in your repo

---

**Ready to deploy! 🚀**