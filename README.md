# sermonize

Write your sermon. Find the perfect Bible verses to illuminate your message.

## Tech Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS v4
- **Backend**: Supabase (Auth + Database + Edge Functions)
- **AI**: OpenAI GPT-3.5-turbo + text-embedding-3-small

## Project Structure

```
sermonize-frontend/     # React app
supabase/               # Backend (Edge Functions, migrations)
```

## Getting Started

### Frontend

```bash
cd sermonize-frontend
cp .env.example .env.local
# Add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

### Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run migrations in `supabase/migrations/`
3. Deploy the `search` edge function: `npx supabase functions deploy search`
4. Add environment secrets:
   - `OPENAI_API_KEY` — your OpenAI API key
   - `SUPABASE_URL` — your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — from Supabase API settings

### Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Features

- **Sermon drafting** — write and save sermon drafts
- **Bible verse search** — AI-powered search finds relevant Scripture based on your content
- **Split-pane editor** — write on the left, see verse suggestions on the right
- **Click to insert** — click any verse suggestion to add it directly to your sermon

## Design

Typography: Cormorant Garamond (display) + Source Sans 3 (body)
Color palette: warm cream background, forest green primary, gold accent