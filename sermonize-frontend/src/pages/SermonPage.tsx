import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
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

        <div className="w-96 border rounded-lg overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-muted/50">
            <h2 className="font-semibold">Matching Verses</h2>
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