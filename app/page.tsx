import Link from 'next/link'
import { CheckCircle2, Brain, Sparkles, Calendar } from 'lucide-react'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="container mx-auto flex items-center justify-between p-6">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold">AI Todo</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Get Started
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary">
          <Sparkles className="h-4 w-4" />
          <span>Powered by Claude AI</span>
        </div>

        <h1 className="mb-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Your tasks, supercharged with{' '}
          <span className="text-primary">AI intelligence</span>
        </h1>

        <p className="mb-10 max-w-2xl text-lg text-muted-foreground">
          AI Todo helps you manage tasks smarter with AI-powered task
          decomposition, research assistance, content drafting, and intelligent
          daily briefings.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/register"
            className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-base font-medium text-primary-foreground shadow-lg hover:bg-primary/90"
          >
            Start for Free
          </Link>
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-full border border-input bg-background px-8 text-base font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Sign In
          </Link>
        </div>

        {/* Features */}
        <div className="mt-20 grid max-w-4xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border bg-card p-6 text-left shadow-sm">
            <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 font-semibold">Task Decomposition</h3>
            <p className="text-sm text-muted-foreground">
              Break down complex tasks into manageable subtasks with AI
              assistance.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-6 text-left shadow-sm">
            <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 font-semibold">Research Assistant</h3>
            <p className="text-sm text-muted-foreground">
              Get AI-powered research and insights for any task you're working
              on.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-6 text-left shadow-sm">
            <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 font-semibold">Daily Briefings</h3>
            <p className="text-sm text-muted-foreground">
              Start each day with AI-generated summaries and prioritized task
              recommendations.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto border-t py-6 text-center text-sm text-muted-foreground">
        <p>Built with Next.js, Supabase, and Claude AI</p>
      </footer>
    </div>
  )
}
