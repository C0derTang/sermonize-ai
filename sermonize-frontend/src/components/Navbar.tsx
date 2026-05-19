import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export function Navbar() {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => {
      subscription.unsubscribe()
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <nav
      className={`sticky top-0 z-50 px-6 py-4 flex items-center justify-between transition-all duration-300 ${
        scrolled
          ? 'bg-background/80 backdrop-blur-md shadow-soft border-b border-border'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <Link
        to="/"
        className="text-2xl font-bold tracking-tight"
        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
      >
        sermonize<span style={{ color: 'var(--accent)' }}>.</span>
      </Link>
      <div className="flex items-center gap-5">
        {loading ? null : user ? (
          <>
            <Link to="/dashboard">
              <Button variant="ghost" className="text-sm font-medium">
                Dashboard
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border-2 border-border">
                <AvatarFallback className="text-sm font-semibold bg-secondary">
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="text-sm font-medium border-2 hover:bg-secondary"
            >
              Sign Out
            </Button>
          </>
        ) : (
          <Link to="/auth">
            <Button className="px-6 font-medium shadow-md hover:shadow-lg hover:-translate-y-px">
              Begin
            </Button>
          </Link>
        )}
      </div>
    </nav>
  )
}