# sermonize-frontend

Write your sermon. Find the perfect Bible verses to illuminate your message.

## Setup

```bash
cp .env.example .env.local
# Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

## Tech Stack

React 19, Vite, TypeScript, Tailwind CSS v4, Supabase

## Build

```bash
npm run build
```

## Deploy

Configured for Vercel — push to `main` to deploy.

Set environment variables in Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`