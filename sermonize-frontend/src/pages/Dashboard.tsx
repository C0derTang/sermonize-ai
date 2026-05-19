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
    <div className="min-h-[90vh] px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-12 animate-fade-in opacity-0" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
          <div>
            <h1 className="mb-2">My Sermons</h1>
            <p className="text-muted-foreground">Organize and refine your messages</p>
          </div>
          <Button
            onClick={createNewSermon}
            className="px-6 shadow-md hover:shadow-lg hover:-translate-y-px"
          >
            + New Sermon
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sermons.length === 0 ? (
          <div
            className="text-center py-24 bg-card rounded-lg border border-dashed border-border animate-fade-in opacity-0"
            style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
          >
            <div
              className="text-5xl mb-4 opacity-30"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              §
            </div>
            <h3 className="mb-3">No sermons yet</h3>
            <p className="text-muted-foreground mb-6">
              Begin crafting your first message
            </p>
            <Button onClick={createNewSermon} className="px-8">
              Write Your First Sermon
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {sermons.map((sermon, i) => (
              <Card
                key={sermon.id}
                className="group cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-medium border-border/50 hover:border-accent animate-fade-in opacity-0"
                style={{
                  animationDelay: `${0.15 + i * 0.05}s`,
                  animationFillMode: 'forwards'
                }}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg truncate leading-tight">
                    {sermon.title || 'Untitled Sermon'}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {new Date(sermon.updated_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-5 min-h-[4.5rem]">
                    {sermon.content || 'Empty sermon — click to start writing...'}
                  </p>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button
                      variant="outline"
                      className="flex-1 text-xs h-8 border-border/50"
                      onClick={() => navigate(`/sermon/${sermon.id}`)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteSermon(sermon.id)
                      }}
                      className="text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}