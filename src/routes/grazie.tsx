import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { PASTICCERIA_PHONE_DISPLAY } from "@/lib/whatsapp";

export const Route = createFileRoute("/grazie")({
  head: () => ({
    meta: [
      { title: "Grazie — Prenotazione ricevuta" },
      { name: "description", content: "La tua prenotazione è stata ricevuta." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ThankYouPage,
});

function ThankYouPage() {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-2xl px-4 py-24 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-accent" />
        <h1 className="mt-6 font-serif text-4xl text-primary">Prenotazione ricevuta!</h1>
        <p className="mt-4 text-muted-foreground">
          Abbiamo registrato la tua richiesta. Se non si è aperta automaticamente
          una finestra WhatsApp, puoi chiamarci direttamente al{" "}
          <a className="font-semibold text-primary" href={`tel:${PASTICCERIA_PHONE_DISPLAY.replace(/\s/g, "")}`}>
            {PASTICCERIA_PHONE_DISPLAY}
          </a>.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Il pagamento avviene al ritiro in pasticceria.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild variant="outline"><Link to="/">Torna alla home</Link></Button>
          <Button asChild><Link to="/specialita">Vedi le specialità</Link></Button>
        </div>
      </section>
    </SiteLayout>
  );
}
