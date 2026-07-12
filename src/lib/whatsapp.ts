// Numero pasticceria: +39 081 850 5149 → formato wa.me (senza + e senza zeri)
export const PASTICCERIA_PHONE = "390818505149";
export const PASTICCERIA_PHONE_DISPLAY = "+39 081 850 5149";
export const INSTAGRAM_URL = "https://www.instagram.com/";
export const FACEBOOK_URL = "https://www.facebook.com/";

export function buildWhatsAppLink(message: string): string {
  return `https://wa.me/${PASTICCERIA_PHONE}?text=${encodeURIComponent(message)}`;
}

/**
 * Apre subito una tab vuota, DENTRO al gestore del click (prima di qualunque await).
 * I browser bloccano i popup aperti dopo un'operazione asincrona perché non li
 * considerano più legati a un gesto dell'utente: aprendo la tab subito e
 * reindirizzandola dopo, il popup non viene mai bloccato.
 */
export function openWhatsAppPlaceholder(): Window | null {
  try {
    return window.open("", "_blank");
  } catch {
    return null;
  }
}

/**
 * Da chiamare dopo l'await (es. dopo il salvataggio della prenotazione).
 * Se la tab placeholder è disponibile la reindirizza; altrimenti prova ad
 * aprirne una nuova (potrebbe comunque essere bloccata) e restituisce false
 * così l'interfaccia può mostrare un link di fallback cliccabile dall'utente.
 */
export function deliverWhatsAppMessage(placeholder: Window | null, message: string): boolean {
  const url = buildWhatsAppLink(message);
  if (placeholder && !placeholder.closed) {
    placeholder.location.href = url;
    return true;
  }
  const fallback = window.open(url, "_blank");
  return !!fallback;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type StandardItem = { name: string; quantity: number };
export type CakeConfig = {
  base: string;
  filling: string;
  soaking: "alcolica" | "analcolica" | "latte";
  size: string;
  servings: number;
  phrase?: string;
  decorations?: string;
  addons?: string[];
};

export function buildStandardMessage(input: {
  name: string;
  phone: string;
  email: string;
  pickup_at: string;
  items: StandardItem[];
  notes?: string;
}): string {
  const lines = [
    "🍰 *Nuova Prenotazione — Dolci Standard*",
    `Cliente: ${input.name} (${input.phone}, ${input.email})`,
    `Ritiro: ${formatDate(input.pickup_at)}`,
    "",
    "Ordine:",
    ...input.items.map((i) => `• ${i.quantity}× ${i.name}`),
  ];
  if (input.notes) lines.push("", `Note: ${input.notes}`);
  return lines.join("\n");
}

export function buildCakeMessage(input: {
  name: string;
  phone: string;
  email: string;
  pickup_at: string;
  cake: CakeConfig;
  notes?: string;
}): string {
  const soakingLabel = { alcolica: "Alcolica", analcolica: "Analcolica", latte: "Latte" }[
    input.cake.soaking
  ];
  const lines = [
    "🎂 *Nuova Prenotazione — Torta Personalizzata*",
    `Cliente: ${input.name} (${input.phone}, ${input.email})`,
    `Ritiro: ${formatDate(input.pickup_at)}`,
    "",
    `Base: ${input.cake.base}`,
    `Farcitura: ${input.cake.filling}`,
    `Bagna: ${soakingLabel}`,
    `Dimensione: ${input.cake.size} (${input.cake.servings} persone)`,
  ];
  if (input.cake.addons?.length) lines.push(`Aggiunte: ${input.cake.addons.join(", ")}`);
  if (input.cake.phrase) lines.push(`Frase sulla torta: "${input.cake.phrase}"`);
  if (input.cake.decorations) lines.push(`Decorazioni: ${input.cake.decorations}`);
  if (input.notes) lines.push("", `Note: ${input.notes}`);
  return lines.join("\n");
}

export function buildPanettoneMessage(input: {
  name: string;
  phone: string;
  email: string;
  pickup_at: string;
  items: StandardItem[];
  notes?: string;
}): string {
  const lines = [
    "🎄 *Nuova Prenotazione — Panettoni*",
    `Cliente: ${input.name} (${input.phone}, ${input.email})`,
    `Ritiro: ${formatDate(input.pickup_at)}`,
    "",
    "Panettoni:",
    ...input.items.map((i) => `• ${i.quantity}× ${i.name}`),
  ];
  if (input.notes) lines.push("", `Note: ${input.notes}`);
  return lines.join("\n");
}
