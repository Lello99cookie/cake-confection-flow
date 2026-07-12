import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { LogOut, LayoutDashboard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // getSession() trusts the persisted/auto-refreshed local session instead of
    // round-tripping to the auth server on every navigation — that round-trip
    // (getUser()) was bouncing people back to /auth on transient network hiccups
    // even though their session was still valid. Real authorization is still
    // enforced server-side (RLS + requireSupabaseAuth), this is just the UI gate.
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) throw redirect({ to: "/auth" });
    return { user: data.session.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="flex min-h-screen flex-col bg-secondary/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-accent" />
            <span className="font-serif text-xl text-primary">Cuciniello · Backoffice</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard">Prenotazioni</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/catalogo">Catalogo</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/">Sito pubblico</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="mr-1 h-3 w-3" /> Esci
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
