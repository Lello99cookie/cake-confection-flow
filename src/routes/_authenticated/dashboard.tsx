import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Search, Clock, Package, Cake, Gift, Bell, BellRing, BellOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { listBookings, updateBookingStatus, type Booking } from "@/lib/bookings.functions";
import { getOrderingStatusAdmin, updateOrderingStatus } from "@/lib/catalog-admin.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard Prenotazioni" }, { name: "robots", content: "noindex" }],
  }),
  component: DashboardPage,
});

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

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

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

type StatusValue = "da_preparare" | "pronto" | "ritirato" | "annullato";

function DashboardPage() {
  const fetchBookings = useServerFn(listBookings);
  const updateStatus = useServerFn(updateBookingStatus);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => fetchBookings(),
    refetchInterval: REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: true,
  });

  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const mutation = useMutation({
    mutationFn: (v: { id: string; status: StatusValue }) => updateStatus({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Stato aggiornato");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Errore"),
  });

  useNewBookingAlerts(data);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((b) => {
      if (type !== "all" && b.type !== type) return false;
      if (status !== "all" && b.status !== status) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!b.customer_name.toLowerCase().includes(s) && !b.customer_phone.includes(s))
          return false;
      }
      return true;
    });
  }, [data, type, status, search]);

  const todayStart = startOfDay(new Date());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const stats = useMemo(() => {
    if (!data) return { today: 0, overdue: 0, ready: 0 };
    let today = 0;
    let overdue = 0;
    let ready = 0;
    for (const b of data) {
      const pStart = startOfDay(new Date(b.pickup_at));
      const active = b.status !== "ritirato" && b.status !== "annullato";
      if (active && pStart.getTime() < todayStart.getTime()) overdue++;
      if (b.status === "da_preparare" && pStart.getTime() === todayStart.getTime()) today++;
      if (b.status === "pronto") ready++;
    }
    return { today, overdue, ready };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const groups = useMemo(() => {
    const buckets: { key: string; label: string; items: Booking[] }[] = [
      { key: "overdue", label: "In ritardo", items: [] },
      { key: "today", label: "Oggi", items: [] },
      { key: "tomorrow", label: "Domani", items: [] },
      { key: "later", label: "Prossimi giorni", items: [] },
    ];
    for (const b of filtered) {
      const pStart = startOfDay(new Date(b.pickup_at));
      if (pStart.getTime() < todayStart.getTime()) buckets[0].items.push(b);
      else if (pStart.getTime() === todayStart.getTime()) buckets[1].items.push(b);
      else if (pStart.getTime() === tomorrowStart.getTime()) buckets[2].items.push(b);
      else buckets[3].items.push(b);
    }
    return buckets.filter((g) => g.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-primary">Prenotazioni</h1>
          <p className="text-sm text-muted-foreground">
            Raggruppate per giorno di ritiro — le scadenze più vicine in alto.
          </p>
        </div>
        <NotificationToggle />
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatTile label="Da preparare oggi" value={stats.today} tone="default" />
        <StatTile label="In ritardo" value={stats.overdue} tone="destructive" />
        <StatTile label="Pronte da ritirare" value={stats.ready} tone="accent" />
      </div>

      <OrderingStatusCard />

      <div className="mb-6 grid gap-3 md:grid-cols-[1fr_180px_180px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cerca per nome o telefono"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i tipi</SelectItem>
            <SelectItem value="torta_personalizzata">Torte personalizzate</SelectItem>
            <SelectItem value="standard">Dolci standard</SelectItem>
            <SelectItem value="panettone">Panettoni</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="da_preparare">Da preparare</SelectItem>
            <SelectItem value="pronto">Pronto</SelectItem>
            <SelectItem value="ritirato">Ritirato</SelectItem>
            <SelectItem value="annullato">Annullato</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="rounded-xl bg-card p-8 text-center text-muted-foreground">
          Caricamento...
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-destructive/10 p-4 text-destructive">
          {error instanceof Error ? error.message : "Errore"}
        </div>
      )}

      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.key}>
            <h2
              className={cn(
                "mb-2 text-xs font-semibold uppercase tracking-wider",
                group.key === "overdue" ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {group.label} · {group.items.length}
            </h2>
            <div className="space-y-3">
              {group.items.map((b) => (
                <BookingRow
                  key={b.id}
                  booking={b}
                  onStatusChange={(v) => mutation.mutate({ id: b.id, status: v })}
                />
              ))}
            </div>
          </div>
        ))}
        {!isLoading && filtered.length === 0 && (
          <div className="rounded-xl bg-card p-12 text-center text-muted-foreground">
            Nessuna prenotazione con questi filtri.
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "destructive" | "accent";
}) {
  return (
    <div
      className={cn(
        "rounded-xl bg-card p-4 ring-1 ring-border",
        tone === "destructive" && value > 0 && "ring-destructive/40 bg-destructive/5",
        tone === "accent" && value > 0 && "ring-accent/40 bg-accent/5",
      )}
    >
      <div
        className={cn(
          "font-serif text-3xl",
          tone === "destructive" && value > 0 ? "text-destructive" : "text-primary",
        )}
      >
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function BookingRow({
  booking: b,
  onStatusChange,
}: {
  booking: Booking;
  onStatusChange: (status: StatusValue) => void;
}) {
  const pickup = new Date(b.pickup_at);
  const now = Date.now();
  const hoursToPickup = (pickup.getTime() - now) / 36e5;
  const meta = TYPE_META[b.type];
  const Icon = meta.icon;
  const urgent = hoursToPickup < 24 && hoursToPickup > 0 && b.status === "da_preparare";
  const overdue = hoursToPickup < 0 && b.status !== "ritirato" && b.status !== "annullato";

  return (
    <div
      className={cn(
        "rounded-xl bg-card p-4 ring-1 shadow-sm transition-colors",
        overdue
          ? "ring-destructive/40 bg-destructive/5"
          : urgent
            ? "ring-accent bg-accent/5"
            : "ring-border",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Icon className="h-4 w-4 text-accent" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {meta.label}
            </span>
            <StatusBadge status={b.status} />
            {urgent && (
              <Badge variant="outline" className="border-accent text-accent">
                Urgente
              </Badge>
            )}
            {overdue && <Badge variant="destructive">In ritardo</Badge>}
          </div>
          <div className="mt-2 font-serif text-lg text-primary">{b.customer_name}</div>
          <div className="text-sm text-muted-foreground">
            {b.customer_phone} · <Clock className="mr-1 inline h-3 w-3" />
            {pickup.toLocaleString("it-IT", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={b.status} onValueChange={(v) => onStatusChange(v as StatusValue)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild variant="outline" size="sm">
            <Link to="/prenotazioni/$id" params={{ id: b.id }}>
              Dettaglio
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

type NotificationSupport = NotificationPermission | "unsupported";

function getNotificationPermission(): NotificationSupport {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/**
 * Confronta ogni fetch con l'elenco precedente di id e avvisa (toast sempre,
 * notifica browser se il permesso è concesso) per le prenotazioni nuove.
 * Non notifica al primo caricamento, solo per gli arrivi successivi.
 */
function useNewBookingAlerts(data: Booking[] | undefined) {
  const knownIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!data) return;
    const currentIds = new Set(data.map((b) => b.id));
    if (knownIds.current === null) {
      knownIds.current = currentIds;
      return;
    }
    const arrived = data.filter((b) => !knownIds.current!.has(b.id));
    knownIds.current = currentIds;
    if (arrived.length === 0) return;

    if (arrived.length === 1) {
      const b = arrived[0];
      const label = TYPE_META[b.type]?.label ?? b.type;
      toast.info(`Nuovo ordine: ${b.customer_name} — ${label}`);
    } else {
      toast.info(`${arrived.length} nuovi ordini ricevuti`);
    }

    if (getNotificationPermission() === "granted") {
      if (arrived.length === 1) {
        const b = arrived[0];
        new Notification("Nuovo ordine", {
          body: `${b.customer_name} — ${TYPE_META[b.type]?.label ?? b.type}`,
        });
      } else {
        new Notification("Nuovi ordini", { body: `${arrived.length} nuove prenotazioni ricevute` });
      }
    }
  }, [data]);
}

function NotificationToggle() {
  const [permission, setPermission] = useState<NotificationSupport>(() =>
    getNotificationPermission(),
  );

  if (permission === "unsupported") return null;

  if (permission === "granted") {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100">
        <BellRing className="h-3.5 w-3.5" /> Notifiche attive
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs text-muted-foreground">
        <BellOff className="h-3.5 w-3.5" /> Notifiche bloccate dal browser
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        Notification.requestPermission().then((p) => setPermission(p));
      }}
    >
      <Bell className="mr-1.5 h-3.5 w-3.5" /> Attiva notifiche nuovi ordini
    </Button>
  );
}

const ORDERING_TOGGLES: {
  key: "standard_enabled" | "torta_personalizzata_enabled" | "panettone_enabled";
  label: string;
}[] = [
  { key: "standard_enabled", label: "Dolci standard / vetrina" },
  { key: "torta_personalizzata_enabled", label: "Torte personalizzate" },
  { key: "panettone_enabled", label: "Panettoni" },
];

function OrderingStatusCard() {
  const fetchStatus = useServerFn(getOrderingStatusAdmin);
  const runUpdate = useServerFn(updateOrderingStatus);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["ordering-status-admin"],
    queryFn: () => fetchStatus(),
  });

  const [local, setLocal] = useState({
    standard_enabled: true,
    torta_personalizzata_enabled: true,
    panettone_enabled: true,
  });

  useEffect(() => {
    if (data) setLocal(data);
  }, [data]);

  const mutation = useMutation({
    mutationFn: (v: typeof local) => runUpdate({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ordering-status-admin"] });
      toast.success("Impostazioni ordini aggiornate");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Errore salvataggio"),
  });

  function toggle(key: keyof typeof local, checked: boolean) {
    const next = { ...local, [key]: checked };
    setLocal(next);
    mutation.mutate(next);
  }

  return (
    <div className="mb-6 rounded-xl bg-card p-4 ring-1 ring-border">
      <h2 className="mb-1 text-sm font-semibold text-primary">Accettazione ordini</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Disattiva una categoria per sospendere temporaneamente le nuove prenotazioni: sul sito
        comparirà un avviso e l'invio sarà bloccato.
      </p>
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        {ORDERING_TOGGLES.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <Switch
              id={`toggle-${key}`}
              checked={local[key]}
              onCheckedChange={(v) => toggle(key, v)}
              disabled={mutation.isPending}
            />
            <Label htmlFor={`toggle-${key}`} className="cursor-pointer text-sm">
              {label}
            </Label>
          </div>
        ))}
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
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", map[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}
