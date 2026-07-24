import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User as UserIcon } from "lucide-react";

type Variant = "dark" | "light";

export function AuthActions({ variant = "dark" }: { variant?: Variant }) {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div className="h-8 w-24 animate-pulse rounded-md bg-white/5" aria-hidden />;
  }

  if (!user) {
    const textCls = variant === "dark" ? "text-background/85 hover:text-background" : "text-ink/80 hover:text-ink";
    return (
      <div className="flex items-center gap-4">
        <Link to="/signin" className={`text-sm font-semibold transition-colors ${textCls}`}>
          Log In
        </Link>
        <Link
          to="/signup"
          className="inline-flex items-center rounded-lg bg-emerald px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-emerald/90"
        >
          Sign up for free
        </Link>
      </div>
    );
  }

  const initial = (user.email ?? "?").charAt(0).toUpperCase();
  const label = (user.user_metadata?.display_name as string) || (user.user_metadata?.full_name as string) || user.email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full bg-emerald/15 px-2 py-1 pr-3 text-sm font-semibold text-emerald ring-1 ring-emerald/30 transition hover:bg-emerald/20">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald text-primary-foreground">
          {initial}
        </span>
        <span className="max-w-[140px] truncate">{label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate text-xs text-muted-foreground">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/upload"><UserIcon className="mr-2 h-4 w-4" /> My workspace</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await signOut();
            navigate({ to: "/" });
          }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
