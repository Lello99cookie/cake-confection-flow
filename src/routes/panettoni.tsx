import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Minus, AlertTriangle } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getPanettoni, getOrderingStatus } from "@/lib/catalog.functions";
import { createBooking } from "@/lib/bookings.functions";
import {
  buildPanettoneMessage,
  buildWhatsAppLink,
  openWhatsAppPlaceholder,
  deliverWhatsAppMessage,
} from "@/lib/whatsapp";

const panettoniQuery = queryOptions({
  queryKey: ["panettoni"],
  queryFn: () => getPanettoni(),
});

export const Route = createFileRoute("/panettoni")({
  head: () => ({
    meta: [
      { title: "Panettoni Artigianali — Pasticceria Cuciniello" },
      {
        name: "description",
        content:
          "Prenota il tuo panettone artigianale a lievito madre. Tradizionale, cioccolato, farciti.",
      },
      { property: "og:title", content: "Panettoni Artigianali" },
      {
        property: "og:image",
        content:
          "https://images.unsplash.com/photo-1481391319762-47dff72954d9?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(panettoniQuery),
  component: PanettoniPage,
});

function PanettoniPage() {
  const { data: panettoni } = useSuspenseQuery(panettoniQuery);
  const navigate = useNavigate();
  const submit = useServerFn(createBooking);
  const fetchOrderingStatus = useServerFn(getOrderingStatus);
  const { data: orderingStatus } = useQuery({
    queryKey: ["ordering-status"],
    queryFn: () => fetchOrderingStatus(),
  });
  const ordersOpen = orderingStatus?.panettone_enabled ?? true;

  const [qty, setQty] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const items = useMemo(
    () =>
      panettoni
        .map((p) => ({ name: p.name, quantity: qty[p.id] ?? 0 }))
        .filter((i) => i.quantity > 0),
    [panettoni, qty],
  );

  const canSubmit =
    ordersOpen && items.length > 0 && name.trim() && phone.trim() && email.trim() && pickupDate;

  function change(id: string, delta: number) {
    setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] ?? 0) + delta) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    const whatsappTab = openWhatsAppPlaceholder();
    try {
      const pickup_at = new Date(`${pickupDate}T${pickupTime}`).toISOString();
      await submit({
        data: {
          type: "panettone",
          pickup_at,
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          customer_email: email.trim(),
          notes: notes.trim() || undefined,
          items,
          website,
        },
      });
      const msg = buildPanettoneMessage({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        pickup_at,
        items,
        notes: notes.trim() || undefined,
      });
      const delivered = deliverWhatsAppMessage(whatsappTab, msg);
      if (!delivered) {
        toast.warning("Prenotazione registrata, ma il browser ha bloccato WhatsApp.", {
          action: {
            label: "Apri WhatsApp",
            onClick: () => window.open(buildWhatsAppLink(msg), "_blank"),
          },
        });
      } else {
        toast.success("Panettoni prenotati!");
      }
      navigate({ to: "/grazie" });
    } catch (err) {
      whatsappTab?.close();
      toast.error(err instanceof Error ? err.message : "Errore invio");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Stagionale · Natale"
        title="Panettoni Artigianali"
        description="Impasto a lievito madre, lievitazione lenta di 48 ore, ingredienti selezionati. Prenota per tempo per averli pronti al ritiro."
      />
      <section className="mx-auto max-w-5xl px-4 py-10">
        {!ordersOpen && (
          <div className="mb-6 flex items-start gap-3 rounded-xl bg-destructive/10 p-4 text-sm text-destructive ring-1 ring-destructive/30">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Al momento non stiamo accettando nuove prenotazioni di panettoni. Riprova più tardi.
            </span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {panettoni.map((p) => (
              <article
                key={p.id}
                className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={p.image_url ?? ""}
                    alt={p.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif text-xl text-primary">{p.name}</h3>
                    {p.price != null && (
                      <span className="whitespace-nowrap font-serif text-lg font-semibold text-accent">
                        € {p.price.toFixed(2).replace(".", ",")}
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
                  )}
                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => change(p.id, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-10 text-center font-semibold">{qty[p.id] ?? 0}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => change(p.id, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <span className="ml-2 text-xs text-muted-foreground">pezzi</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="rounded-2xl bg-card p-6 ring-1 ring-border">
            <h2 className="font-serif text-2xl text-primary">Ritiro e contatti</h2>
            {/* Honeypot: invisibile per gli utenti reali, i bot che compilano tutto lo riempiono. */}
            <div className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden">
              <Label htmlFor="website">Non compilare questo campo</Label>
              <Input
                id="website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="date">Data ritiro</Label>
                <Input
                  id="date"
                  type="date"
                  required
                  value={pickupDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setPickupDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="time">Ora ritiro</Label>
                <Input
                  id="time"
                  type="time"
                  required
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="name">Nome e cognome</Label>
                <Input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={120}
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefono</Label>
                <Input
                  id="phone"
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={30}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={160}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="notes">Note</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={1000}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={!canSubmit || submitting}>
              {submitting ? "Invio..." : "Conferma e invia via WhatsApp"}
            </Button>
          </div>
        </form>
      </section>
    </SiteLayout>
  );
}
