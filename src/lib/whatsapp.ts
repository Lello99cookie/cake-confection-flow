// Numero pasticceria: +39 081 850 5149 → formato wa.me (senza + e senza zeri)
export const PASTICCERIA_PHONE = "390818505149";
export const PASTICCERIA_PHONE_DISPLAY = "+39 081 850 5149";
export const INSTAGRAM_URL = "https://www.instagram.com/";
export const FACEBOOK_URL = "https://www.facebook.com/";

export function buildWhatsAppLink(message: string): string {
  return `https://wa.me/${PASTICCERIA_PHONE}?text=${encodeURIComponent(message)}`;
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
};

export function buildStandardMessage(input: {
  name: string;
  phone: string;
  pickup_at: string;
  items: StandardItem[];
  notes?: string;
}): string {
  const lines = [
    "🍰 *Nuova Prenotazione — Dolci Standard*",
    `Cliente: ${input.name} (${input.phone})`,
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
  pickup_at: string;
  cake: CakeConfig;
  notes?: string;
}): string {
  const soakingLabel = { alcolica: "Alcolica", analcolica: "Analcolica", latte: "Latte" }[
    input.cake.soaking
  ];
  const lines = [
    "🎂 *Nuova Prenotazione — Torta Personalizzata*",
    `Cliente: ${input.name} (${input.phone})`,
    `Ritiro: ${formatDate(input.pickup_at)}`,
    "",
    `Base: ${input.cake.base}`,
    `Farcitura: ${input.cake.filling}`,
    `Bagna: ${soakingLabel}`,
    `Dimensione: ${input.cake.size} (${input.cake.servings} persone)`,
  ];
  if (input.cake.phrase) lines.push(`Frase sulla torta: "${input.cake.phrase}"`);
  if (input.cake.decorations) lines.push(`Decorazioni: ${input.cake.decorations}`);
  if (input.notes) lines.push("", `Note: ${input.notes}`);
  return lines.join("\n");
}

export function buildPanettoneMessage(input: {
  name: string;
  phone: string;
  pickup_at: string;
  items: StandardItem[];
  notes?: string;
}): string {
  const lines = [
    "🎄 *Nuova Prenotazione — Panettoni*",
    `Cliente: ${input.name} (${input.phone})`,
    `Ritiro: ${formatDate(input.pickup_at)}`,
    "",
    "Panettoni:",
    ...input.items.map((i) => `• ${i.quantity}× ${i.name}`),
  ];
  if (input.notes) lines.push("", `Note: ${input.notes}`);
  return lines.join("\n");
}
