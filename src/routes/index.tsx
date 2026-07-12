import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { ArrowRight, Instagram, Facebook, Sparkles, Cake, Gift } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { getSpecialties } from "@/lib/catalog.functions";
import { INSTAGRAM_URL, FACEBOOK_URL } from "@/lib/whatsapp";

const specialtiesQuery = queryOptions({
  queryKey: ["specialties"],
  queryFn: () => getSpecialties(),
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(specialtiesQuery),
  component: HomePage,
});

function HomePage() {
  const { data: specialties } = useSuspenseQuery(specialtiesQuery);
  const featured = specialties.slice(0, 3);

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-25"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=2000&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/70 via-background/85 to-background" />
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-32">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Napoli · Dal cuore della tradizione
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-tight text-primary md:text-7xl">
            L'arte dolciaria napoletana, fatta a mano ogni giorno.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Sfogliatelle, babà, pastiere, torte su misura e panettoni artigianali.
            Prenota il tuo dolce e ritira in pasticceria — nessun pagamento online.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/prenota">
                Prenota un Dolce <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/torta-personalizzata">
                <Cake className="mr-2 h-4 w-4" /> Disegna la tua Torta
              </Link>
            </Button>
          </div>
          <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground">
            <span>Seguici:</span>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-accent"
            >
              <Instagram className="h-4 w-4" /> Instagram
            </a>
            <a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-accent"
            >
              <Facebook className="h-4 w-4" /> Facebook
            </a>
          </div>
        </div>
      </section>

      {/* Storia */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
              La nostra storia
            </p>
            <h2 className="mt-3 font-serif text-3xl text-primary md:text-4xl">
              Tre generazioni di pasticceri, un'unica passione.
            </h2>
            <p className="mt-5 text-muted-foreground">
              La Pasticceria Cuciniello nasce dall'amore per la vera pasticceria
              napoletana. Ogni sfogliatella è stesa a mano, ogni babà lievita
              con lievito madre, ogni torta è pensata su misura per te.
            </p>
            <p className="mt-3 text-muted-foreground">
              Materie prime selezionate, ricette di famiglia, nessun compromesso.
              Il gusto autentico di casa, ogni giorno.
            </p>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?auto=format&fit=crop&w=1200&q=80"
              alt="Pasticceri al lavoro"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Specialità in vetrina */}
      <section className="bg-secondary/40 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
                Vetrina
              </p>
              <h2 className="mt-2 font-serif text-3xl text-primary md:text-4xl">
                Le nostre specialità
              </h2>
            </div>
            <Button asChild variant="ghost">
              <Link to="/specialita">
                Vedi tutte <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {featured.map((s) => (
              <article
                key={s.id}
                className="group overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={s.image_url ?? ""}
                    alt={s.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-serif text-xl text-primary">{s.name}</h3>
                  {s.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {s.description}
                    </p>
                  )}
                  <Button asChild variant="link" className="mt-2 h-auto p-0 text-accent">
                    <Link to="/prenota" search={{ item: s.slug } as never}>
                      Prenota <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA finale */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="grid gap-6 md:grid-cols-2">
          <Link
            to="/torta-personalizzata"
            className="group relative overflow-hidden rounded-3xl bg-primary p-8 text-primary-foreground shadow-lg transition-transform hover:-translate-y-1 md:p-12"
          >
            <Sparkles className="h-8 w-8 text-accent" />
            <h3 className="mt-4 font-serif text-3xl">Disegna la tua torta</h3>
            <p className="mt-3 max-w-md text-primary-foreground/80">
              Componi la torta perfetta scegliendo base, farcitura, bagna, dimensione
              e frase da scrivere.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-accent">
              Inizia il configuratore <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
          <Link
            to="/panettoni"
            className="group relative overflow-hidden rounded-3xl bg-accent p-8 text-accent-foreground shadow-lg transition-transform hover:-translate-y-1 md:p-12"
          >
            <Gift className="h-8 w-8" />
            <h3 className="mt-4 font-serif text-3xl">Panettoni Artigianali</h3>
            <p className="mt-3 max-w-md">
              Lievito madre e ingredienti selezionati. Prenota per le feste.
            </p>
            <span className="mt-6 inline-flex items-center gap-2">
              Scopri i panettoni <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
