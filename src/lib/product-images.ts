import { supabase } from "@/integrations/supabase/client";

const BUCKET = "product-images";
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export class ProductImageUploadError extends Error {}

/**
 * Carica un'immagine prodotto sul bucket pubblico "product-images" e
 * restituisce l'URL pubblico da salvare in image_url. Richiede una sessione
 * admin autenticata: le policy RLS sul bucket bloccano chiunque altro.
 */
export async function uploadProductImage(file: File, folder: "specialita" | "panettoni"): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new ProductImageUploadError("Formato non supportato. Usa JPG, PNG, WEBP o AVIF.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new ProductImageUploadError("Immagine troppo grande (max 5MB).");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new ProductImageUploadError(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
