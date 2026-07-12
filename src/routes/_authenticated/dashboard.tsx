import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Clock, Package, Cake, Gift } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { listBookings, updateBookingStatus } from "@/lib/bookings.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard Prenotazioni" }, { name: "robots", content: "noindex" }] }),
  component: DashboardPage,
});

const STATUS_LABEL: Record<string, string> = {
  da_preparare: "Da preparare",
  pronto: "Pronto",
  ritirato: "Ritirato",
  annullato: "Annullato",
};

const TYPE_META: Record<string, { label: string; icon: typeof Cake }> = {
  torta_personalizzata: { label: "Torta Personalizzata", icon: Cake },
  standard: { label: "Dolci Standard", icon: Package },
  panettone: { label: "Panettone", icon: Gift },
};

function DashboardPage() {
  const fetchBookings = useServerFn(listBookings);
  const updateStatus = useServerFn(updateBookingStatus);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => fetchBookings(),
  });

  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const mutation = useMutation({
    mutationFn: (v: { id: string; status: "da_preparare" | "pronto" | "ritirato" | "annullato" }) =>
      updateStatus({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Stato aggiornato");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Errore"),
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((b) => {
      if (type !== "all" && b.type !== type) return false;
      if (status !== "all" && b.status !== status) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!b.customer_name.toLowerCase().includes(s) && !b.customer_phone.includes(s)) return false;
      }
      return true;
    });
  }, [data, type, status, search]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-primary">Prenotazioni</h1>
        <p className="text-sm text-muted-foreground">
          Ordinate per data di ritiro — le scadenze più vicine in alto.
        </p>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-[1fr_180px_180px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cerca per nome o telefono" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i tipi</SelectItem>
            <SelectItem value="torta_personalizzata">Torte personalizzate</SelectItem>
            <SelectItem value="standard">Dolci standard</SelectItem>
            <SelectItem value="panettone">Panettoni</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="da_preparare">Da preparare</SelectItem>
            <SelectItem value="pronto">Pronto</SelectItem>
            <SelectItem value="ritirato">Ritirato</SelectItem>
            <SelectItem value="annullato">Annullato</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="rounded-xl bg-card p-8 text-center text-muted-foreground">Caricamento...</div>}
      {error && <div className="rounded-xl bg-destructive/10 p-4 text-destructive">{error instanceof Error ? error.message : "Errore"}</div>}

      <div className="space-y-3">
        {filtered.map((b) => {
          const pickup = new Date(b.pickup_at);
          const now = Date.now();
          const hoursToPickup = (pickup.getTime() - now) / 36e5;
          const meta = TYPE_META[b.type];
          const Icon = meta.icon;
          const urgent = hoursToPickup < 24 && hoursToPickup > 0 && b.status === "da_preparare";
          const overdue = hoursToPickup < 0 && b.status !== "ritirato" && b.status !== "annullato";

          return (
            <div key={b.id} className={cn(
              "rounded-xl bg-card p-4 ring-1 shadow-sm transition-colors",
              overdue ? "ring-destructive/40 bg-destructive/5" : urgent ? "ring-accent bg-accent/5" : "ring-border",
            )}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Icon className="h-4 w-4 text-accent" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{meta.label}</span>
                    <StatusBadge status={b.status} />
                    {urgent && <Badge variant="outline" className="border-accent text-accent">Urgente</Badge>}
                    {overdue && <Badge variant="destructive">In ritardo</Badge>}
                  </div>
                  <div className="mt-2 font-serif text-lg text-primary">{b.customer_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {b.customer_phone} · <Clock className="mr-1 inline h-3 w-3" />
                    {pickup.toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={b.status}
                    onValueChange={(v) => mutation.mutate({ id: b.id, status: v as never })}
                  >
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABEL).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/prenotazioni/$id" params={{ id: b.id }}>Dettaglio</Link>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        {!isLoading && filtered.length === 0 && (
          <div className="rounded-xl bg-card p-12 text-center text-muted-foreground">
            Nessuna prenotazione con questi filtri.
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    da_preparare: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100",
    pronto: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100",
    ritirato: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    annullato: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-100",
  };
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", map[status])}>{STATUS_LABEL[status]}</span>;
}
