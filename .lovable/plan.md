# Pasticceria Cuciniello — Sito + Gestionale

App TanStack Start "2-in-1": sito pubblico per prenotare (senza pagamenti online) e backoffice riservato per il personale. Persistenza e login via Lovable Cloud. Conferme via link WhatsApp precompilato verso **+39 081 850 5149**.

## 1. Sito pubblico

Design elegante artigianale — palette crema/cioccolato/dettagli caldi, tipografia serif per titoli + sans per il testo, mobile-first (traffico Instagram/Facebook).

Route pubbliche:
- `/` — Home: storia della pasticceria, focus artigianalità, link social (IG/FB), CTA "Prenota un Dolce" e "Disegna la tua Torta".
- `/specialita` — vetrina dolci tipici (sfogliatelle, babà, pastiere, code d'aragosta, ministeriali). Ogni card ha bottone "Prenota" che porta a `/prenota?item=...`.
- `/prenota` — form prenotazione dolci standard / vassoio domenicale (scelta prodotti + quantità, data/ora ritiro, dati cliente, note).
- `/torta-personalizzata` — wizard 6 step (Base → Farcitura → Bagna esclusiva → Dimensioni → Frase e decorazioni → Dati ritiro) con riepilogo finale.
- `/panettoni` — pagina stagionale panettoni artigianali con selezione tipo, quantità, data di ritiro.
- `/auth` — login gestori (pubblica).

Immagini segnaposto Unsplash di alta qualità, facilmente sostituibili.

## 2. Backoffice (area riservata `/_authenticated/`)

- `/_authenticated/dashboard` — elenco prenotazioni ordinate per data di ritiro (scadenze imminenti in evidenza, badge colore per urgenza).
- Filtri: tipo (`torta_personalizzata` | `standard` | `panettone`) e stato (`da_preparare` | `pronto` | `ritirato` | `annullato`); ricerca per nome/telefono.
- `/_authenticated/prenotazioni/$id` — scheda dettaglio completa (tutti i campi del configuratore incluse bagna e frase, dati cliente, note).
- Cambio stato con pulsanti rapidi nella lista e nel dettaglio.

## 3. Configuratore torte (wizard)

Componente step-by-step con stato locale, validazione per step, barra di avanzamento e riepilogo. Bagna è selezione esclusiva (Alcolica / Analcolica / Latte). Al submit: insert su `bookings` + apertura link WhatsApp.

## 4. Backend — Lovable Cloud

Tabella `bookings` (unica, generica) con:
- `id`, `created_at`, `type` (enum), `status` (enum), `pickup_at` (timestamptz)
- `customer_name`, `customer_phone`, `notes`
- `items` (jsonb) — array prodotti standard o panettoni con quantità
- `cake_config` (jsonb) — base, farcitura, bagna, dimensione, porzioni, frase, decorazioni

Tabelle catalogo (modificabili da backoffice in futuro, precaricate ora):
- `specialties` (dolci tipici in vetrina)
- `cake_bases`, `cake_fillings`, `cake_soakings`, `cake_sizes`
- `panettoni` (varianti)

Ruoli: enum `app_role` + tabella `user_roles` + funzione `has_role()` SECURITY DEFINER (pattern standard, mai ruoli sul profile).

RLS:
- `bookings`: INSERT aperto ad `anon` + `authenticated` (chiunque può prenotare); SELECT/UPDATE/DELETE solo per `has_role(auth.uid(), 'admin')`.
- Tabelle catalogo: SELECT pubblico ad `anon`; scrittura solo admin.
- `user_roles`: SELECT solo authenticated; scrittura solo service_role.

Admin iniziale: creato tramite migrazione seed dopo che l'utente conferma email/password nel prossimo turno (richiesta con `add_secret` per la password) — oppure creazione manuale dal pannello Cloud Users. Chiedo credenziali in build.

Seed dati demo: specialità napoletane classiche, basi (Pan di Spagna, Millefoglie, Sacher, Frolla), creme (Pasticcera, Chantilly, Cioccolato, Zabaione, Ricotta), bagne (3), dimensioni (6/8/10/12/16 persone), panettoni (Tradizionale, Cioccolato, Crema, Limoncello, Pere e cioccolato).

## 5. Integrazione WhatsApp

Al submit di ogni form:
1. `createServerFn` insert su `bookings` (fn pubblica, RLS consente insert anon).
2. Client costruisce messaggio leggibile con riepilogo completo dell'ordine.
3. Apertura `https://wa.me/393488501549?text=<encoded>` in nuova scheda (uso `wa.me` con numero in formato internazionale senza `+` e senza `0` iniziale: `39` + `0818505149` → `393488505149`... in realtà il numero fornito è **+39 081 850 5149** quindi il link sarà `https://wa.me/390818505149`).
4. Toast di conferma e redirect a pagina "Grazie".

Esempio messaggio:
```
Nuova Prenotazione — Torta Personalizzata
Cliente: Mario Rossi (+39 333...)
Ritiro: 24/12/2026 ore 10:00
Base: Pan di Spagna | Farcitura: Chantilly | Bagna: Analcolica
Dimensione: 12 persone
Frase: "Buon compleanno Anna"
Note: decorazioni con fiori bianchi
```

## Dettagli tecnici

- Stack: TanStack Start + React 19 + Tailwind v4 + shadcn/ui, Lovable Cloud (Supabase).
- Design tokens crema/cioccolato in `src/styles.css` (oklch), font via `<link>` in `__root.tsx` (Playfair Display + Inter).
- Validazione form con `zod` + `react-hook-form`.
- Server functions in `src/lib/bookings.functions.ts` e `src/lib/catalog.functions.ts` (client-safe path).
- Layout protetto gestito da integrazione (`_authenticated/route.tsx` auto).
- Metadati head per ogni route (title, description, og:*).

## Fuori scopo

- Pagamenti online (esplicitamente esclusi).
- Notifiche WhatsApp automatiche server-side (usiamo link `wa.me` client-side; l'invio è manuale dal telefono del cliente/gestore che apre il link).
- Editor catalogo nel backoffice v1 (dati seed modificabili via SQL; UI di gestione catalogo aggiungibile in iterazione successiva).

## Cosa mi serve al passaggio in build

Email + password per l'account admin iniziale (te li chiederò in modo sicuro).
