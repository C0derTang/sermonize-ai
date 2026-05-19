import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function Home() {
  return (
    <div className="min-h-[90vh] flex flex-col items-center justify-center px-6 py-20 relative overflow-hidden">
      {/* Decorative elements */}
      <div
        className="absolute top-20 left-10 w-32 h-32 rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)',
          filter: 'blur(40px)'
        }}
      />
      <div
        className="absolute bottom-20 right-10 w-40 h-40 rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)',
          filter: 'blur(50px)'
        }}
      />

      <div className="text-center max-w-2xl mx-auto relative z-10">
        <p
          className="text-sm uppercase tracking-[0.25em] text-muted-foreground mb-6 animate-fade-in opacity-0"
          style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}
        >
          Craft Your Message
        </p>

        <h1
          className="mb-6 animate-fade-in opacity-0"
          style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
        >
          sermonize<span style={{ color: 'var(--accent)' }}>.</span>
        </h1>

        <p
          className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed max-w-lg mx-auto animate-fade-in opacity-0"
          style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}
        >
          Write your sermon. Find the perfect Bible verses to illuminate your message.
          Let AI guide your study.
        </p>

        <div
          className="animate-fade-in opacity-0"
          style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}
        >
          <Link to="/auth">
            <Button
              size="lg"
              className="px-10 py-6 text-base font-medium shadow-lg hover:shadow-xl hover:-translate-y-1"
            >
              Begin Writing
            </Button>
          </Link>
        </div>
      </div>

      {/* Feature hints */}
      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl w-full">
        {[
          { title: 'Draft', desc: 'Write and refine your sermon draft' },
          { title: 'Search', desc: 'Find relevant Bible verses instantly' },
          { title: 'Share', desc: 'Share your message with the world' }
        ].map((feature, i) => (
          <div
            key={feature.title}
            className="text-center animate-fade-in opacity-0"
            style={{ animationDelay: `${0.5 + i * 0.1}s`, animationFillMode: 'forwards' }}
          >
            <h3
              className="text-lg mb-2"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              {feature.title}
            </h3>
            <p className="text-sm text-muted-foreground">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}