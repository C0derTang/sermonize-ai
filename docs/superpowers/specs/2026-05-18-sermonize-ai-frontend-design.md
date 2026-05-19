# sermonize.ai Frontend Design

> **Status:** Approved

**Goal:** React + Vite frontend for sermonize.ai with user auth, sermon drafts, and Bible verse search integration.

**Tech Stack:** React, Vite, Tailwind CSS, shadcn/ui, Supabase Auth, Vercel deployment

---

## Database Schema

### New Tables

```sql
-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved sermon drafts
CREATE TABLE sermons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS Policies

- `profiles`: Users can only read/update their own profile (uid = id)
- `sermons`: Users can only read/write their own sermons (user_id = uid)

---

## Pages

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `Home` | Landing page with hero + signup CTA |
| `/auth` | `Auth` | Signup / login forms |
| `/dashboard` | `Dashboard` | List all saved sermons, create new button |
| `/sermon/new` | `SermonEditor` | Create new sermon (auto-generates UUID) |
| `/sermon/:id` | `SermonEditor` | View/edit existing sermon |

---

## Components

### `src/components/ui/`
shadcn/ui components installed via CLI:
- Button, Input, Textarea, Card, Label, Form
- Avatar, Badge, Separator, ScrollArea

### `src/components/Navbar.tsx`
- Logo + nav links
- Shows user email when logged in
- Logout button

### `src/components/AuthForm.tsx`
- Toggle between signup/login modes
- Email + password fields (shadcn Form)
- Loading states, error handling

### `src/components/SermonEditor.tsx`
- Left pane: title input, content textarea, Save button, Find Verses button
- Right pane: verse suggestions panel
- Calls `/functions/v1/search` API
- Inserts verses at cursor position on click

### `src/components/SearchResults.tsx`
- Groups results by extracted theological point
- Collapsible sections per point
- Shows: Reference, % match, verse text preview
- Click-to-insert functionality

### `src/components/SermonList.tsx`
- Grid of sermon cards (title + date)
- Click to navigate to `/sermon/:id`
- Delete button per card

---

## File Structure

```
src/
  components/
    ui/                    # shadcn components
    Navbar.tsx
    AuthForm.tsx
    SermonEditor.tsx
    SearchResults.tsx
    SermonList.tsx
  lib/
    supabase.ts             # Supabase client
  pages/
    Home.tsx
    Auth.tsx
    Dashboard.tsx
    SermonPage.tsx
  App.tsx                   # Routes + AuthProvider
  main.tsx
  index.css                 # Tailwind imports

supabase/
  migrations/
    004_add_auth_tables.sql  # profiles + sermons tables + RLS
```

---

## API Integration

### Search Edge Function
```
POST /functions/v1/search
Body: { "sermon_text": "string", "limit": 5 }
Response: {
  "points": ["extracted point 1", ...],
  "chunks": [{ "reference", "text", "similarity", "matched_point", "chunk_type" }]
}
```

### Supabase Client
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

## Environment Variables

```env
VITE_SUPABASE_URL=https://shrljurnfgayuuojymdx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Implementation Order

1. Create Vite React project with Tailwind + shadcn/ui
2. Set up Supabase client + auth context
3. Create migration 004 for auth tables
4. Build Auth page + form
5. Build Dashboard with sermon list
6. Build SermonEditor with split pane + search integration
7. Deploy to Vercel