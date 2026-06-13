# Jaila Globals — Invoice Suite

Full-stack invoice and inventory management for Nigerian retail businesses.
**Web (React/Vite) + Mobile (React Native/Expo) + Supabase backend.**

---

## Stack

| Layer       | Technology                              |
|-------------|----------------------------------------|
| Web frontend| React + Vite                            |
| Mobile      | React Native + Expo                     |
| Backend     | Supabase (Postgres + Auth + Storage + Edge Functions) |
| Email       | Resend (via Supabase Edge Function)     |
| PDF (web)   | Browser print dialog                    |
| PDF (mobile)| expo-print + expo-sharing               |

---

## 1 — Supabase Setup

### 1a. Create your Supabase project
1. Go to [supabase.com](https://supabase.com) → New project
2. Note your **Project URL** and **anon public key** (Settings → API)

### 1b. Run the schema migration
1. In Supabase dashboard → **SQL Editor**
2. Paste the entire contents of `supabase/migrations/001_initial_schema.sql`
3. Click **Run**

This creates:
- `profiles` table (business settings, auto-created on signup)
- `customers` table
- `invoices` table with the `invoice_status` enum
- `invoice_items` table
- Row Level Security policies (owners see only their own data)
- `logos` storage bucket
- Auto-create profile trigger on user signup
- `invoices_summary` view

---

## 2 — Web App (React + Vite)

```bash
npm create vite@latest jaila-web -- --template react
cd jaila-web
npm install @supabase/supabase-js
```

Copy `src/lib/supabase.js` into `src/lib/supabase.js`.

Create `.env` in the project root:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Import and use functions from `supabase.js`:
```js
import { signIn, getInvoices, saveInvoice } from './lib/supabase'
```

---

## 3 — Mobile App (React Native / Expo)

```bash
npx create-expo-app jaila-mobile --template blank
cd jaila-mobile

npx expo install @supabase/supabase-js @react-native-async-storage/async-storage
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
npx expo install react-native-screens react-native-safe-area-context
npx expo install expo-print expo-sharing expo-image-picker
```

1. Copy `App.js` → replace the generated `App.js`
2. Copy `src/lib/supabase.js` → `src/lib/supabase.js`
3. Create `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
4. Run: `npx expo start`

---

## 4 — Email (Supabase Edge Function)

### 4a. Get a free Resend API key
1. Sign up at [resend.com](https://resend.com)
2. Add and verify your sending domain
3. Create an API key

### 4b. Deploy the Edge Function
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Set secrets
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
supabase secrets set SITE_URL=https://yourdomain.com

# Deploy
supabase functions deploy send-invoice
```

### 4c. Test it
```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-invoice \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"invoiceId":"uuid-here","recipientEmail":"test@example.com"}'
```

---

## 5 — Logo Storage

Logos are stored in Supabase Storage under the `logos` bucket.
- Path: `{user_id}/logo.{ext}`
- Public URL stored in `profiles.logo_url`
- The `uploadLogo()` function in `supabase.js` handles upload + URL update
- On web: pass a `File` object from `<input type="file">`
- On mobile: pass `{ uri, name, type }` from `expo-image-picker`

---

## File Structure

```
jaila-globals/
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql     ← Run this in Supabase SQL Editor
│   └── functions/
│       └── send-invoice/
│           └── index.ts               ← Deploy with Supabase CLI
├── src/
│   └── lib/
│       └── supabase.js                ← Shared between web + mobile
└── App.js                             ← React Native / Expo entry point
```

---

## Key API functions (supabase.js)

| Function                     | What it does                                    |
|------------------------------|-------------------------------------------------|
| `signIn(email, pass)`        | Log in                                          |
| `signUp(email, pass, co)`    | Register + auto-create profile                  |
| `getProfile()`               | Fetch business settings                         |
| `updateProfile(data)`        | Save settings                                   |
| `uploadLogo(file)`           | Upload logo → returns public URL                |
| `saveInvoice(invoice)`       | Save invoice + items + upsert customer          |
| `getInvoices(filters)`       | List invoices with optional filters             |
| `getInvoice(id)`             | Single invoice with items                       |
| `deleteInvoice(id)`          | Delete (cascades items)                         |
| `updateInvoiceStatus(id, s)` | Mark paid / pending / overdue                   |
| `getDashboardStats()`        | Total, paid, pending, revenue counts            |
| `nextInvoiceNumber()`        | Auto-generate next INV-XXXX                     |
| `sendInvoiceEmail(id, to)`   | Trigger Edge Function to email the invoice      |
| `subscribeToInvoices(cb)`    | Real-time updates via Supabase Realtime         |
