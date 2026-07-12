import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { getSpecialties } from "@/lib/catalog.functions";

const specialtiesQuery = queryOptions({
  queryKey: ["specialties"],
  queryFn: () => getSpecialties(),
});

export const Route = createFileRoute("/specialita")({
  head: () => ({
    meta: [
      { title: "Specialità — Pasticceria Cuciniello" },
      {
        name: "description",
        content:
          "Sfogliatelle, babà, pastiere, code d'aragosta e altre specialità napoletane. Prenota il tuo dolce online.",
      },
      { property: "og:title", content: "Le nostre specialità napoletane" },
      { property: "og:description", content: "Vetrina dei dolci tipici della Pasticceria Cuciniello." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(specialtiesQuery),
  component: SpecialtiesPage,
});

function SpecialtiesPage() {
  const { data: specialties } = useSuspenseQuery(specialtiesQuery);
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Vetrina"
        title="Le nostre specialità"
        description="Dolci tipici napoletani preparati ogni giorno con ricette tramandate di generazione in generazione."
      />
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {specialties.map((s) => (
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
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-serif text-xl text-primary">{s.name}</h3>
                  {s.price != null && (
                    <span className="whitespace-nowrap font-serif text-lg font-semibold text-accent">
                      € {s.price.toFixed(2).replace(".", ",")}
                    </span>
                  )}
                </div>
                {s.description && (
                  <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
                )}
                <Button asChild size="sm" className="mt-4">
                  <Link to="/prenota" search={{ item: s.slug } as never}>
                    Prenota <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
