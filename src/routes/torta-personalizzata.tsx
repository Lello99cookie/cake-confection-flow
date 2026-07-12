import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Check, AlertTriangle } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { getCakeOptions, getOrderingStatus } from "@/lib/catalog.functions";
import { createBooking } from "@/lib/bookings.functions";
import {
  buildCakeMessage,
  buildWhatsAppLink,
  openWhatsAppPlaceholder,
  deliverWhatsAppMessage,
} from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

const optionsQuery = queryOptions({
  queryKey: ["cake-options"],
  queryFn: () => getCakeOptions(),
});

export const Route = createFileRoute("/torta-personalizzata")({
  head: () => ({
    meta: [
      { title: "Torta personalizzata — Pasticceria Cuciniello" },
      {
        name: "description",
        content: "Configura la tua torta artigianale: base, farcitura, bagna, dimensione e frase.",
      },
      { property: "og:title", content: "Disegna la tua torta" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(optionsQuery),
  component: CakeWizardPage,
});

type WizardState = {
  base?: string;
  filling?: string;
  soaking?: "alcolica" | "analcolica" | "latte";
  sizeLabel?: string;
  servings?: number;
  phrase?: string;
  decorations?: string;
  name?: string;
  phone?: string;
  date?: string;
  time?: string;
  notes?: string;
};

const STEPS = ["Base", "Farcitura", "Bagna", "Dimensione", "Personalizzazione", "Ritiro"];

function CakeWizardPage() {
  const { data: options } = useSuspenseQuery(optionsQuery);
  const navigate = useNavigate();
  const submit = useServerFn(createBooking);
  const fetchOrderingStatus = useServerFn(getOrderingStatus);
  const { data: orderingStatus } = useQuery({
    queryKey: ["ordering-status"],
    queryFn: () => fetchOrderingStatus(),
  });
  const ordersOpen = orderingStatus?.torta_personalizzata_enabled ?? true;

  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>({ time: "10:00" });
  const [submitting, setSubmitting] = useState(false);

  const canNext = useMemo(() => {
    switch (step) {
      case 0:
        return !!state.base;
      case 1:
        return !!state.filling;
      case 2:
        return !!state.soaking;
      case 3:
        return !!state.sizeLabel && !!state.servings;
      case 4:
        return true;
      case 5:
        return ordersOpen && !!state.name?.trim() && !!state.phone?.trim() && !!state.date;
      default:
        return false;
    }
  }, [step, state, ordersOpen]);

  function set<K extends keyof WizardState>(k: K, v: WizardState[K]) {
    setState((s) => ({ ...s, [k]: v }));
  }

  async function handleSubmit() {
    if (!canNext) return;
    setSubmitting(true);
    const whatsappTab = openWhatsAppPlaceholder();
    try {
      const pickup_at = new Date(`${state.date}T${state.time ?? "10:00"}`).toISOString();
      const cake = {
        base: state.base!,
        filling: state.filling!,
        soaking: state.soaking!,
        size: state.sizeLabel!,
        servings: state.servings!,
        phrase: state.phrase?.trim() || undefined,
        decorations: state.decorations?.trim() || undefined,
      };
      await submit({
        data: {
          type: "torta_personalizzata",
          pickup_at,
          customer_name: state.name!.trim(),
          customer_phone: state.phone!.trim(),
          notes: state.notes?.trim() || undefined,
          cake_config: cake,
        },
      });
      const msg = buildCakeMessage({
        name: state.name!.trim(),
        phone: state.phone!.trim(),
        pickup_at,
        cake,
        notes: state.notes?.trim() || undefined,
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
        toast.success("Torta prenotata!");
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
        eyebrow="Configuratore"
        title="Disegna la tua torta"
        description="Sei step per creare la torta perfetta. Il pagamento avviene al ritiro."
      />
      <section className="mx-auto max-w-3xl px-4 py-10">
        {!ordersOpen && (
          <div className="mb-6 flex items-start gap-3 rounded-xl bg-destructive/10 p-4 text-sm text-destructive ring-1 ring-destructive/30">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Al momento non stiamo accettando nuove prenotazioni di torte personalizzate. Puoi
              comunque configurarla, ma l'invio sarà bloccato finché non riapriamo gli ordini.
            </span>
          </div>
        )}
        <div className="mb-8">
          <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>
              Step {step + 1} di {STEPS.length}
            </span>
            <span className="text-primary">{STEPS[step]}</span>
          </div>
          <Progress value={((step + 1) / STEPS.length) * 100} />
        </div>

        <div className="rounded-2xl bg-card p-6 ring-1 ring-border md:p-8">
          {step === 0 && (
            <StepGrid
              title="Scegli la base"
              options={options.bases.map((b) => ({
                value: b.name,
                label: b.name,
                description: b.description ?? undefined,
              }))}
              value={state.base}
              onChange={(v) => set("base", v)}
            />
          )}

          {step === 1 && (
            <StepGrid
              title="Scegli la farcitura"
              options={options.fillings.map((f) => ({
                value: f.name,
                label: f.name,
                description: f.description ?? undefined,
              }))}
              value={state.filling}
              onChange={(v) => set("filling", v)}
            />
          )}

          {step === 2 && (
            <div>
              <h2 className="font-serif text-2xl text-primary">Scegli la bagna</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Selezione esclusiva: puoi scegliere solo un tipo.
              </p>
              <RadioGroup
                className="mt-6 grid gap-3"
                value={state.soaking}
                onValueChange={(v) => set("soaking", v as never)}
              >
                {[
                  { v: "alcolica", l: "Alcolica", d: "Rum, Strega o liquore a scelta." },
                  { v: "analcolica", l: "Analcolica", d: "Sciroppo aromatico senza alcol." },
                  { v: "latte", l: "Latte", d: "Ideale per bambini." },
                ].map((o) => (
                  <Label
                    key={o.v}
                    htmlFor={`s-${o.v}`}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all",
                      state.soaking === o.v
                        ? "border-accent bg-accent/10"
                        : "border-border hover:border-accent/50",
                    )}
                  >
                    <RadioGroupItem value={o.v} id={`s-${o.v}`} className="mt-1" />
                    <div>
                      <div className="font-semibold text-primary">{o.l}</div>
                      <div className="text-sm text-muted-foreground">{o.d}</div>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          )}

          {step === 3 && (
            <StepGrid
              title="Scegli la dimensione"
              options={options.sizes.map((s) => ({
                value: s.label,
                label: s.label,
                description: `${s.servings} persone`,
                extra: { servings: s.servings },
              }))}
              value={state.sizeLabel}
              onChange={(v, extra) => {
                set("sizeLabel", v);
                set("servings", (extra as { servings: number })?.servings);
              }}
            />
          )}

          {step === 4 && (
            <div className="space-y-5">
              <h2 className="font-serif text-2xl text-primary">Personalizzazione</h2>
              <div>
                <Label htmlFor="phrase">Frase sulla torta</Label>
                <Input
                  id="phrase"
                  value={state.phrase ?? ""}
                  onChange={(e) => set("phrase", e.target.value)}
                  maxLength={120}
                  placeholder="Es. Buon compleanno Anna"
                />
              </div>
              <div>
                <Label htmlFor="dec">Note per le decorazioni</Label>
                <Textarea
                  id="dec"
                  value={state.decorations ?? ""}
                  onChange={(e) => set("decorations", e.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder="Colori, tema, fiori, personaggi..."
                />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5">
              <h2 className="font-serif text-2xl text-primary">Dati per il ritiro</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="date">Data ritiro</Label>
                  <Input
                    id="date"
                    type="date"
                    required
                    value={state.date ?? ""}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => set("date", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="time">Ora ritiro</Label>
                  <Input
                    id="time"
                    type="time"
                    required
                    value={state.time ?? "10:00"}
                    onChange={(e) => set("time", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="name">Nome e cognome</Label>
                  <Input
                    id="name"
                    required
                    value={state.name ?? ""}
                    onChange={(e) => set("name", e.target.value)}
                    maxLength={120}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefono</Label>
                  <Input
                    id="phone"
                    required
                    type="tel"
                    value={state.phone ?? ""}
                    onChange={(e) => set("phone", e.target.value)}
                    maxLength={30}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="notes">Note aggiuntive</Label>
                  <Textarea
                    id="notes"
                    value={state.notes ?? ""}
                    onChange={(e) => set("notes", e.target.value)}
                    rows={3}
                    maxLength={1000}
                  />
                </div>
              </div>

              <div className="rounded-xl bg-secondary/50 p-4 text-sm">
                <div className="font-semibold text-primary">Riepilogo</div>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>
                    Base: <span className="text-foreground">{state.base}</span>
                  </li>
                  <li>
                    Farcitura: <span className="text-foreground">{state.filling}</span>
                  </li>
                  <li>
                    Bagna: <span className="text-foreground capitalize">{state.soaking}</span>
                  </li>
                  <li>
                    Dimensione:{" "}
                    <span className="text-foreground">
                      {state.sizeLabel} ({state.servings} persone)
                    </span>
                  </li>
                  {state.phrase && (
                    <li>
                      Frase: <span className="text-foreground">"{state.phrase}"</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Indietro
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
              Avanti <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canNext || submitting} size="lg">
              {submitting ? (
                "Invio..."
              ) : (
                <>
                  <Check className="mr-1 h-4 w-4" /> Conferma e invia
                </>
              )}
            </Button>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

function StepGrid({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: { value: string; label: string; description?: string; extra?: unknown }[];
  value?: string;
  onChange: (v: string, extra?: unknown) => void;
}) {
  return (
    <div>
      <h2 className="font-serif text-2xl text-primary">{title}</h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value, o.extra)}
            className={cn(
              "rounded-xl border p-4 text-left transition-all",
              value === o.value
                ? "border-accent bg-accent/10 ring-2 ring-accent/40"
                : "border-border hover:border-accent/50 hover:bg-secondary/40",
            )}
          >
            <div className="font-semibold text-primary">{o.label}</div>
            {o.description && (
              <div className="mt-1 text-sm text-muted-foreground">{o.description}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
