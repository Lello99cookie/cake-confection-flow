import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Minus, Trash2, AlertTriangle } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSpecialties, getOrderingStatus } from "@/lib/catalog.functions";
import { createBooking } from "@/lib/bookings.functions";
import {
  buildStandardMessage,
  buildWhatsAppLink,
  openWhatsAppPlaceholder,
  deliverWhatsAppMessage,
} from "@/lib/whatsapp";

const searchSchema = z.object({ item: z.string().optional() });

const specialtiesQuery = queryOptions({
  queryKey: ["specialties"],
  queryFn: () => getSpecialties(),
});

export const Route = createFileRoute("/prenota")({
  head: () => ({
    meta: [
      { title: "Prenota un dolce — Pasticceria Cuciniello" },
      {
        name: "description",
        content: "Prenota dolci artigianali napoletani e ritira in pasticceria.",
      },
      { property: "og:title", content: "Prenota un dolce" },
    ],
  }),
  validateSearch: searchSchema,
  loader: ({ context }) => context.queryClient.ensureQueryData(specialtiesQuery),
  component: BookingStandardPage,
});

type CartItem = { name: string; quantity: number };

function BookingStandardPage() {
  const { data: specialties } = useSuspenseQuery(specialtiesQuery);
  const { item: preselect } = Route.useSearch();
  const navigate = useNavigate();
  const submit = useServerFn(createBooking);
  const fetchOrderingStatus = useServerFn(getOrderingStatus);
  const { data: orderingStatus } = useQuery({
    queryKey: ["ordering-status"],
    queryFn: () => fetchOrderingStatus(),
  });
  const ordersOpen = orderingStatus?.standard_enabled ?? true;

  const [cart, setCart] = useState<CartItem[]>(() => {
    if (preselect) {
      const s = specialties.find((x) => x.slug === preselect);
      if (s) return [{ name: s.name, quantity: 1 }];
    }
    return [];
  });
  const [addItem, setAddItem] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => ordersOpen && cart.length > 0 && name.trim() && phone.trim() && pickupDate,
    [ordersOpen, cart, name, phone, pickupDate],
  );

  function addToCart(itemName: string) {
    if (!itemName) return;
    setCart((c) => {
      const existing = c.find((x) => x.name === itemName);
      if (existing)
        return c.map((x) => (x.name === itemName ? { ...x, quantity: x.quantity + 1 } : x));
      return [...c, { name: itemName, quantity: 1 }];
    });
  }

  function changeQty(name: string, delta: number) {
    setCart((c) =>
      c
        .map((x) => (x.name === name ? { ...x, quantity: Math.max(0, x.quantity + delta) } : x))
        .filter((x) => x.quantity > 0),
    );
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
          type: "standard",
          pickup_at,
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          notes: notes.trim() || undefined,
          items: cart,
        },
      });
      const msg = buildStandardMessage({
        name: name.trim(),
        phone: phone.trim(),
        pickup_at,
        items: cart,
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
        toast.success("Prenotazione registrata!");
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
        eyebrow="Prenotazione"
        title="Prenota i dolci del vassoio"
        description="Componi il tuo vassoio, indica quando lo vieni a ritirare e riceverai conferma via WhatsApp."
      />
      <section className="mx-auto max-w-3xl px-4 py-10">
        {!ordersOpen && (
          <div className="mb-6 flex items-start gap-3 rounded-xl bg-destructive/10 p-4 text-sm text-destructive ring-1 ring-destructive/30">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Al momento non stiamo accettando nuove prenotazioni per questa categoria. Riprova più
              tardi.
            </span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Selezione dolci */}
          <div className="rounded-2xl bg-card p-6 ring-1 ring-border">
            <h2 className="font-serif text-2xl text-primary">Scegli i tuoi dolci</h2>
            <div className="mt-4 flex gap-2">
              <Select
                value={addItem}
                onValueChange={(v) => {
                  addToCart(v);
                  setAddItem("");
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Aggiungi un dolce dalla vetrina..." />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {cart.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">Il vassoio è vuoto.</p>
            ) : (
              <ul className="mt-6 divide-y divide-border">
                {cart.map((it) => (
                  <li key={it.name} className="flex items-center justify-between gap-3 py-3">
                    <span className="font-medium">{it.name}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => changeQty(it.name, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-semibold">{it.quantity}</span>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => changeQty(it.name, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => changeQty(it.name, -it.quantity)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Data ritiro + contatti */}
          <div className="rounded-2xl bg-card p-6 ring-1 ring-border">
            <h2 className="font-serif text-2xl text-primary">Ritiro e contatti</h2>
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
              <div className="md:col-span-2">
                <Label htmlFor="notes">Note (opzionale)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={1000}
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <p className="text-sm text-muted-foreground">
              Il pagamento avviene al ritiro in pasticceria.
            </p>
            <Button type="submit" size="lg" disabled={!canSubmit || submitting}>
              {submitting ? "Invio..." : "Conferma e invia via WhatsApp"}
            </Button>
          </div>
        </form>
      </section>
    </SiteLayout>
  );
}
