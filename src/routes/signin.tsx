import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { FileSpreadsheet, Mail, Lock, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [
      { title: "Sign in — LedgerLocal" },
      { name: "description", content: "Sign in to your LedgerLocal account. Your bank statements never leave your device." },
      { property: "og:title", content: "Sign in — LedgerLocal" },
      { property: "og:description", content: "Sign in to your LedgerLocal account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignInPage,
});

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.2s2.7-6.2 6-6.2c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.7 2.3 2.5 6.6 2.5 12S6.7 21.7 12 21.7c6.9 0 9.5-4.8 9.5-7.3 0-.5-.1-.9-.1-1.3H12z" />
      <path fill="#34A853" d="M3.9 7.3l3.2 2.4C8 8 9.9 6.8 12 6.8c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 8.3 2.3 5.1 4.4 3.9 7.3z" opacity=".01" />
    </svg>
  );
}

function SignInPage() {
  const [show, setShow] = useState(false);
  return (
    <div className="min-h-screen bg-surface-muted/60 px-4 py-10">
      <div className="mx-auto flex max-w-md flex-col items-center">
        <Link to="/" className="mb-8 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald text-primary-foreground shadow-sm">
          <FileSpreadsheet className="h-6 w-6" />
        </Link>

        <div className="w-full rounded-2xl border border-border bg-background p-8 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-ink">Welcome back</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in to your LedgerLocal account
          </p>

          <button
            type="button"
            className="mt-6 flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-surface-muted/70 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted"
          >
            <GoogleIcon className="h-4 w-4" />
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-ink">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="h-11 w-full rounded-lg border border-border bg-surface-muted/70 pl-10 pr-3 text-sm text-ink placeholder:text-muted-foreground focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/20"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-semibold text-ink">Password</label>
                <a href="#" className="text-sm font-semibold text-emerald hover:underline">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-11 w-full rounded-lg border border-border bg-surface-muted/70 pl-10 pr-10 text-sm text-ink placeholder:text-muted-foreground focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/20"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ink"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="mt-2 h-11 w-full rounded-lg bg-emerald text-sm font-semibold text-primary-foreground transition-colors hover:bg-emerald/90"
            >
              Sign in
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="font-bold text-emerald hover:underline">
              Sign up free
            </Link>
          </p>

          <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
            Your bank statements never leave your device. We only store account credentials.
          </p>
        </div>
      </div>
    </div>
  );
}
