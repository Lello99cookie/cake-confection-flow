import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Phone, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getBooking, updateBookingStatus } from "@/lib/bookings.functions";

export const Route = createFileRoute("/_authenticated/prenotazioni/$id")({
  head: () => ({ meta: [{ title: "Dettaglio prenotazione" }, { name: "robots", content: "noindex" }] }),
  component: BookingDetailPage,
});

const STATUS_LABEL: Record<string, string> = {
  da_preparare: "Da preparare",
  pronto: "Pronto",
  ritirato: "Ritirato",
  annullato: "Annullato",
};

const TYPE_LABEL: Record<string, string> = {
  torta_personalizzata: "Torta Personalizzata",
  standard: "Dolci Standard",
  panettone: "Panettoni",
};

const SOAKING_LABEL: Record<string, string> = {
  alcolica: "Alcolica",
  analcolica: "Analcolica",
  latte: "Latte",
};

function BookingDetailPage() {
  const { id } = Route.useParams();
  const fetchBooking = useServerFn(getBooking);
  const updateStatus = useServerFn(updateBookingStatus);
  const qc = useQueryClient();

  const { data: b, isLoading, error } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => fetchBooking({ data: { id } }),
  });

  const mutation = useMutation({
    mutationFn: (status: "da_preparare" | "pronto" | "ritirato" | "annullato") =>
      updateStatus({ data: { id, status } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking", id] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Stato aggiornato");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Errore"),
  });

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 px-4 py-16 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Caricamento...
      </div>
    );
  }
  if (error || !b) {
    return (
      <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 px-4 py-16 text-destructive">
        <AlertTriangle className="h-4 w-4" /> {error instanceof Error ? error.message : "Prenotazione non trovata"}
      </div>
    );
  }

  const pickup = new Date(b.pickup_at);
  const items = Array.isArray(b.items) ? (b.items as { name: string; quantity: number }[]) : [];
  const cake = b.cake_config as null | {
    base: string; filling: string; soaking: string; size: string; servings: number;
    phrase?: string; decorations?: string;
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/dashboard"><ArrowLeft className="mr-1 h-3 w-3" /> Torna alla dashboard</Link>
      </Button>

      <div className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">
              {TYPE_LABEL[b.type]}
            </p>
            <h1 className="mt-1 font-serif text-3xl text-primary">{b.customer_name}</h1>
            <a href={`tel:${b.customer_phone}`} className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-accent">
              <Phone className="h-3 w-3" /> {b.customer_phone}
            </a>
          </div>
          <Select value={b.status} onValueChange={(v) => mutation.mutate(v as never)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <dl className="mt-6 grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ritiro</dt>
            <dd className="mt-1 font-medium">
              {pickup.toLocaleString("it-IT", { dateStyle: "full", timeStyle: "short" })}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ricevuta il</dt>
            <dd className="mt-1 font-medium">
              {new Date(b.created_at).toLocaleString("it-IT")}
            </dd>
          </div>
        </dl>

        {cake && (
          <section className="mt-6 border-t border-border pt-6">
            <h2 className="font-serif text-xl text-primary">Configurazione torta</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Base">{cake.base}</Field>
              <Field label="Farcitura">{cake.filling}</Field>
              <Field label="Bagna">{SOAKING_LABEL[cake.soaking] ?? cake.soaking}</Field>
              <Field label="Dimensione">{cake.size} ({cake.servings} persone)</Field>
              {cake.phrase && <Field label="Frase sulla torta" className="sm:col-span-2">"{cake.phrase}"</Field>}
              {cake.decorations && <Field label="Decorazioni" className="sm:col-span-2">{cake.decorations}</Field>}
            </dl>
          </section>
        )}

        {items.length > 0 && (
          <section className="mt-6 border-t border-border pt-6">
            <h2 className="font-serif text-xl text-primary">Prodotti ordinati</h2>
            <ul className="mt-3 divide-y divide-border">
              {items.map((it, i) => (
                <li key={i} className="flex justify-between py-2">
                  <span>{it.name}</span>
                  <span className="font-semibold">×{it.quantity}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {b.notes && (
          <section className="mt-6 border-t border-border pt-6">
            <h2 className="font-serif text-xl text-primary">Note del cliente</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{b.notes}</p>
          </section>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{children}</dd>
    </div>
  );
}
