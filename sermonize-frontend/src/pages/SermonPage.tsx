import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { SearchResults } from '@/components/SearchResults'
import { Loader2, Save, Search } from 'lucide-react'

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
  const [searchError, setSearchError] = useState('')
  const [hasChanges, setHasChanges] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadSermon()
  }, [id])

  useEffect(() => {
    if (content !== '' || title !== '') {
      setHasChanges(true)
    }
  }, [content, title])

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
    setHasChanges(false)
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
    setHasChanges(false)
  }

  const findVerses = async () => {
    if (!content.trim()) return
    setSearching(true)
    setSearchError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

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

      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Search response:', data)
      if (data.points && data.chunks) {
        setPoints(data.points)
        setSearchResults(data.chunks)
      } else if (data.error) {
        setSearchError(`API error: ${data.error}`)
      }
    } catch (err) {
      console.error('Search error:', err)
      const message = err instanceof Error ? err.message : 'Search failed'
      setSearchError(`${message}. URL: ${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search`)
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

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + text.length, start + text.length)
    }, 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-[90vh] px-6 py-10">
      <div className="max-w-7xl mx-auto flex gap-6 h-full">
        {/* Left: Editor */}
        <div className="flex-1 flex flex-col gap-5 animate-slide-in">
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <Label htmlFor="title" className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                Sermon Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter your sermon title..."
                className="text-xl font-semibold border-0 bg-transparent px-0 focus-visible:ring-0 placeholder:text-muted-foreground/50"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              />
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <Label htmlFor="content" className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
              Sermon Content
            </Label>
            <Textarea
              ref={textareaRef}
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Begin writing your sermon here. Write freely — we'll help you find the perfect verses to support your message..."
              className="flex-1 min-h-[500px] text-base leading-relaxed resize-none bg-card rounded-lg border-border/50 focus:border-accent transition-colors placeholder:text-muted-foreground/40"
            />
          </div>

          {searchError && (
            <p className="text-sm text-destructive mt-2 px-4">{searchError}</p>
          )}

          <div className="flex items-center gap-4 pt-2">
            <Button
              onClick={findVerses}
              disabled={searching || !content.trim()}
              className="gap-2 shadow-md hover:shadow-lg hover:-translate-y-px"
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {searching ? 'Searching...' : 'Find Verses'}
            </Button>
            <Button
              onClick={saveSermon}
              disabled={saving || !hasChanges}
              variant="secondary"
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'Saving...' : hasChanges ? 'Save Draft' : 'Saved'}
            </Button>
          </div>
        </div>

        {/* Right: Verse Suggestions Panel */}
        <div className="w-96 flex-shrink-0 bg-card rounded-lg border border-border overflow-hidden flex flex-col animate-slide-in" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
          <div className="px-5 py-4 border-b border-border bg-secondary/30">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Matching Verses
            </h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <SearchResults
              points={points}
              chunks={searchResults}
              onInsertVerse={insertVerse}
            />
          </div>
        </div>
      </div>
    </div>
  )
}