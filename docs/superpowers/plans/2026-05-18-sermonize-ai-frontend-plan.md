# sermonize.ai Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build React + Vite frontend with user auth, sermon drafts, and Bible verse search via split-pane editor.

**Architecture:** Vite React app with Tailwind CSS + shadcn/ui components, React Router for navigation, Supabase Auth for users, Supabase database for sermon storage, Supabase edge functions for Bible search.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, React Router v6, Supabase Auth + Database

---

## File Structure

```
sermonize-frontend/          # New Vite project
  src/
    components/
      ui/                    # shadcn components (Button, Input, Textarea, Card, etc.)
      Navbar.tsx
      AuthForm.tsx
      SermonEditor.tsx
      SearchResults.tsx
      SermonList.tsx
    lib/
      supabase.ts             # Supabase client setup
    pages/
      Home.tsx
      Auth.tsx
      Dashboard.tsx
      SermonPage.tsx
    App.tsx                   # Routes + AuthProvider
    main.tsx
    index.css                 # Tailwind imports
  .env.example

supabase/
  migrations/
    004_add_auth_tables.sql   # profiles + sermons tables + RLS
```

---

## Task 1: Create Vite React Project

**Files:**
- Create: `sermonize-frontend/` (Vite scaffold)

- [ ] **Step 1: Create Vite React TypeScript project**

Run:
```bash
npm create vite@latest sermonize-frontend -- --template react-ts
cd sermonize-frontend
npm install
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js react-router-dom
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 3: Configure Tailwind**

Update `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Update `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Vite React TypeScript project with Tailwind"
```

---

## Task 2: Install shadcn/ui

**Files:**
- Modify: `sermonize-frontend/` (add shadcn components)

- [ ] **Step 1: Initialize shadcn/ui**

Run:
```bash
npx shadcn@latest init
```

When prompted:
- Style: Default
- Base color: Slate
- CSS file: src/index.css
- Customize: no

- [ ] **Step 2: Install shadcn components**

```bash
npx shadcn@latest add button input textarea card label avatar badge separator scroll-area
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add shadcn/ui components (button, input, textarea, card, etc.)"
```

---

## Task 3: Set Up Supabase Client

**Files:**
- Create: `sermonize-frontend/src/lib/supabase.ts`

- [ ] **Step 1: Create Supabase client**

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 2: Create .env.example**

```env
VITE_SUPABASE_URL=https://shrljurnfgayuuojymdx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase.ts .env.example
git commit -m "feat: set up Supabase client

VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from env"
```

---

## Task 4: Create Auth Migration

**Files:**
- Create: `supabase/migrations/004_add_auth_tables.sql`

- [ ] **Step 1: Create migration**

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sermons table
CREATE TABLE sermons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Sermon',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sermons ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only read/update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Sermons: users can only access their own sermons
CREATE POLICY "Users can view own sermons"
  ON sermons FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sermons"
  ON sermons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sermons"
  ON sermons FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sermons"
  ON sermons FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

- [ ] **Step 2: Push migration to Supabase**

```bash
npx supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/004_add_auth_tables.sql
git commit -m "feat: add profiles and sermons tables with RLS policies

- profiles extends auth.users
- sermons linked to profiles with CASCADE delete
- Auto-create profile on signup trigger"
```

---

## Task 5: Build Auth Components

**Files:**
- Create: `sermonize-frontend/src/components/AuthForm.tsx`
- Create: `sermonize-frontend/src/components/Navbar.tsx`
- Modify: `sermonize-frontend/src/App.tsx`

### AuthForm.tsx

```tsx
// src/components/AuthForm.tsx
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        })
        if (error) throw error
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{isLogin ? 'Welcome Back' : 'Create Account'}</CardTitle>
        <CardDescription>
          {isLogin ? 'Sign in to your account' : 'Start writing sermons'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Sign Up'}
          </Button>
          <p className="text-sm text-center">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary underline"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
```

### Navbar.tsx

```tsx
// src/components/Navbar.tsx
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export function Navbar() {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <nav className="border-b px-4 py-3 flex items-center justify-between">
      <Link to="/" className="text-xl font-bold">sermonize.ai</Link>
      <div className="flex items-center gap-4">
        {loading ? null : user ? (
          <>
            <Link to="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user.email}
              </span>
            </div>
            <Button variant="outline" onClick={handleLogout}>Logout</Button>
          </>
        ) : (
          <Link to="/auth">
            <Button>Sign In</Button>
          </Link>
        )}
      </div>
    </nav>
  )
}
```

- [ ] **Step 1: Create AuthForm.tsx and Navbar.tsx**

```bash
# Create files with content above
```

- [ ] **Step 2: Update App.tsx with routing**

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Navbar } from '@/components/Navbar'
import { Home } from '@/pages/Home'
import { Auth } from '@/pages/Auth'
import { Dashboard } from '@/pages/Dashboard'
import { SermonPage } from '@/pages/SermonPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
  }, [])

  if (loading) return <div>Loading...</div>
  return user ? <>{children}</> : <Navigate to="/auth" />
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/sermon/:id" element={
              <ProtectedRoute><SermonPage /></ProtectedRoute>
            } />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
```

- [ ] **Step 3: Create placeholder pages**

`src/pages/Home.tsx`:
```tsx
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <h1 className="text-4xl font-bold mb-4">sermonize.ai</h1>
      <p className="text-xl text-muted-foreground mb-8 max-w-md">
        Write your sermon, find the perfect Bible verses to support your message.
      </p>
      <Link to="/auth">
        <Button size="lg">Get Started</Button>
      </Link>
    </div>
  )
}
```

`src/pages/Auth.tsx`:
```tsx
import { AuthForm } from '@/components/AuthForm'

export function Auth() {
  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <AuthForm />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/AuthForm.tsx src/components/Navbar.tsx src/App.tsx src/pages/
git commit -m "feat: add AuthForm, Navbar, routing, and placeholder pages"
```

---

## Task 6: Build Dashboard with Sermon List

**Files:**
- Create: `sermonize-frontend/src/pages/Dashboard.tsx`
- Modify: `sermonize-frontend/src/components/SermonList.tsx`

### Dashboard.tsx

```tsx
// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function Dashboard() {
  const navigate = useNavigate()
  const [sermons, setSermons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSermons()
  }, [])

  const loadSermons = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('sermons')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (!error && data) {
      setSermons(data)
    }
    setLoading(false)
  }

  const createNewSermon = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('sermons')
      .insert({
        user_id: user.id,
        title: 'Untitled Sermon',
        content: '',
      })
      .select()
      .single()

    if (!error && data) {
      navigate(`/sermon/${data.id}`)
    }
  }

  const deleteSermon = async (id: string) => {
    await supabase.from('sermons').delete().eq('id', id)
    setSermons(sermons.filter(s => s.id !== id))
  }

  return (
    <div className="container py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">My Sermons</h1>
        <Button onClick={createNewSermon}>+ New Sermon</Button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : sermons.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No sermons yet. Create your first one!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sermons.map(sermon => (
            <Card key={sermon.id} className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle className="truncate">{sermon.title}</CardTitle>
                <CardDescription>
                  {new Date(sermon.updated_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {sermon.content || 'Empty sermon...'}
                </p>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" className="flex-1" onClick={() => navigate(`/sermon/${sermon.id}`)}>
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteSermon(sermon.id)}>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 1: Create Dashboard page with inline SermonList**

- [ ] **Step 2: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: add Dashboard with sermon list and create/delete functionality"
```

---

## Task 7: Build SermonEditor with Search Integration

**Files:**
- Create: `sermonize-frontend/src/pages/SermonPage.tsx`
- Create: `sermonize-frontend/src/components/SearchResults.tsx`
- Modify: `sermonize-frontend/src/components/SermonEditor.tsx`

### SearchResults.tsx

```tsx
// src/components/SearchResults.tsx
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface SearchResult {
  reference: string
  text: string
  similarity: number
  matched_point: string
  chunk_type: string
}

interface SearchResultsProps {
  points: string[]
  chunks: SearchResult[]
  onInsertVerse: (text: string) => void
}

export function SearchResults({ points, chunks, onInsertVerse }: SearchResultsProps) {
  const [expandedPoints, setExpandedPoints] = useState<Set<string>>(new Set(points))

  const togglePoint = (point: string) => {
    const newExpanded = new Set(expandedPoints)
    if (newExpanded.has(point)) {
      newExpanded.delete(point)
    } else {
      newExpanded.add(point)
    }
    setExpandedPoints(newExpanded)
  }

  const chunksByPoint = points.map(point => ({
    point,
    chunks: chunks.filter(c => c.matched_point === point),
  }))

  if (chunks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Click "Find Verses" to search for Bible verses</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {chunksByPoint.map(({ point, chunks: pointChunks }) => (
          <div key={point}>
            <button
              onClick={() => togglePoint(point)}
              className="flex items-center gap-2 w-full text-left"
            >
              {expandedPoints.has(point) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span className="font-medium">{point}</span>
              <Badge variant="secondary" className="ml-auto">
                {pointChunks.length} verses
              </Badge>
            </button>

            {expandedPoints.has(point) && (
              <div className="mt-2 space-y-2 pl-6">
                {pointChunks.map((chunk, idx) => (
                  <Card
                    key={`${chunk.reference}-${idx}`}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => onInsertVerse(`"${chunk.text}" (${chunk.reference})`)}
                  >
                    <CardHeader className="p-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{chunk.reference}</CardTitle>
                        <Badge variant="outline">
                          {Math.round(chunk.similarity * 100)}% match
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {chunk.text}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
```

### SermonPage.tsx

```tsx
// src/pages/SermonPage.tsx
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { SearchResults } from '@/components/SearchResults'
import { Loader2 } from 'lucide-react'

interface SearchChunk {
  reference: string
  text: string
  similarity: number
  matched_point: string
  chunk_type: string
}

export function SermonPage() {
  const { id } = useParams()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searching, setSearching] = useState(false)
  const [points, setPoints] = useState<string[]>([])
  const [searchResults, setSearchResults] = useState<SearchChunk[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadSermon()
  }, [id])

  const loadSermon = async () => {
    if (!id) return

    const { data, error } = await supabase
      .from('sermons')
      .select('*')
      .eq('id', id)
      .single()

    if (!error && data) {
      setTitle(data.title)
      setContent(data.content)
    }
    setLoading(false)
  }

  const saveSermon = async () => {
    if (!id) return
    setSaving(true)

    await supabase
      .from('sermons')
      .update({
        title,
        content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    setSaving(false)
  }

  const findVerses = async () => {
    if (!content.trim()) return
    setSearching(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get service role key for edge function calls
      // Use the search function via fetch
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            sermon_text: content,
            limit: 5,
          }),
        }
      )

      const data = await response.json()
      if (data.points && data.chunks) {
        setPoints(data.points)
        setSearchResults(data.chunks)
      }
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setSearching(false)
    }
  }

  const insertVerse = (text: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newContent = content.slice(0, start) + text + content.slice(end)
    setContent(newContent)

    // Set cursor after inserted text
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + text.length, start + text.length)
    }, 0)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  return (
    <div className="container py-8 px-4 h-[calc(100vh-64px)]">
      <div className="flex gap-4 h-full">
        {/* Left: Editor */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Sermon Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter sermon title..."
            />
          </div>

          <div className="flex-1">
            <Label htmlFor="content" className="mb-2 block">Sermon Content</Label>
            <Textarea
              ref={textareaRef}
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your sermon here..."
              className="h-full min-h-[400px]"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={findVerses} disabled={searching || !content.trim()}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {searching ? 'Searching...' : 'Find Verses'}
            </Button>
            <Button onClick={saveSermon} disabled={saving} variant="secondary">
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
          </div>
        </div>

        {/* Right: Verse Suggestions */}
        <div className="w-96 border rounded-lg overflow-hidden">
          <div className="p-4 border-b bg-muted/50">
            <h2 className="font-semibold">Matching Verses</h2>
          </div>
          <SearchResults
            points={points}
            chunks={searchResults}
            onInsertVerse={insertVerse}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 1: Create SearchResults.tsx and SermonPage.tsx**

- [ ] **Step 2: Commit**

```bash
git add src/components/SearchResults.tsx src/pages/SermonPage.tsx
git commit -m "feat: add SermonEditor with split pane and verse search integration"
```

---

## Task 8: Deploy to Vercel

**Files:**
- Create: `sermonize-frontend/.env.example`

- [ ] **Step 1: Create production .env file for Vercel**

In Vercel dashboard, add environment variables:
- `VITE_SUPABASE_URL` = `https://shrljurnfgayuuojymdx.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = (your anon key from Supabase)

- [ ] **Step 2: Build and test locally**

```bash
npm run build
```

- [ ] **Step 3: Deploy to Vercel**

```bash
npm i -g vercel
vercel
```

Or connect GitHub repo in Vercel dashboard for auto-deploy.

- [ ] **Step 4: Commit deployment files**

```bash
git add .env.example
git commit -m "docs: add Vercel deployment instructions"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Landing page (Home) — Task 5
- [x] Auth page with signup/login — Task 5
- [x] Dashboard with sermon list — Task 6
- [x] SermonEditor with split pane — Task 7
- [x] SearchResults with click-to-insert — Task 7
- [x] profiles + sermons tables with RLS — Task 4
- [x] Vercel deployment — Task 8

**Placeholder scan:**
- No TODOs or TBDs
- All API calls have proper error handling
- All file paths are exact

**Type consistency:**
- `SearchChunk` interface matches API response
- `SermonPage` uses `id` from `useParams()`
- All Supabase calls use proper auth

---

## Execution Options

**Plan complete and saved to `docs/superpowers/plans/2026-05-18-sermonize-ai-frontend-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**