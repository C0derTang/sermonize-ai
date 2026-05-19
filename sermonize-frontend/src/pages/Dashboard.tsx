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