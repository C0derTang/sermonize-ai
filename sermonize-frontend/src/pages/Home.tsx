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