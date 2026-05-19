import { AuthForm } from '@/components/AuthForm'

export function Auth() {
  return (
    <div className="min-h-[85vh] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md animate-fade-in opacity-0" style={{ animationDelay: '0.15s', animationFillMode: 'forwards' }}>
        <div className="text-center mb-10">
          <h2
            className="mb-3"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Welcome
          </h2>
          <p className="text-muted-foreground">
            Sign in to continue your ministry work
          </p>
        </div>
        <div className="bg-card rounded-lg p-8 shadow-soft border border-border">
          <AuthForm />
        </div>
      </div>
    </div>
  )
}