import { Link } from "@tanstack/react-router";
import { Instagram, Facebook, Phone } from "lucide-react";
import {
  PASTICCERIA_PHONE_DISPLAY,
  INSTAGRAM_URL,
  FACEBOOK_URL,
} from "@/lib/whatsapp";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <h3 className="font-serif text-2xl">Pasticceria Cuciniello</h3>
          <p className="mt-3 text-sm text-primary-foreground/80">
            Dolci artigianali napoletani. Ogni ricetta è tramandata di generazione in generazione.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-accent">Contatti</h4>
          <a
            href={`tel:${PASTICCERIA_PHONE_DISPLAY.replace(/\s/g, "")}`}
            className="mt-3 inline-flex items-center gap-2 text-sm hover:text-accent"
          >
            <Phone className="h-4 w-4" /> {PASTICCERIA_PHONE_DISPLAY}
          </a>
          <div className="mt-4 flex gap-3">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-primary-foreground/30 p-2 hover:bg-accent hover:text-accent-foreground"
              aria-label="Instagram"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-primary-foreground/30 p-2 hover:bg-accent hover:text-accent-foreground"
              aria-label="Facebook"
            >
              <Facebook className="h-4 w-4" />
            </a>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-accent">Naviga</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/specialita" className="hover:text-accent">Specialità</Link></li>
            <li><Link to="/torta-personalizzata" className="hover:text-accent">Configuratore Torte</Link></li>
            <li><Link to="/panettoni" className="hover:text-accent">Panettoni Artigianali</Link></li>
            <li><Link to="/prenota" className="hover:text-accent">Prenota</Link></li>
            <li><Link to="/auth" className="hover:text-accent">Area Riservata</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10 py-4 text-center text-xs text-primary-foreground/60">
        © {new Date().getFullYear()} Pasticceria Cuciniello. Tutti i diritti riservati.
      </div>
    </footer>
  );
}
