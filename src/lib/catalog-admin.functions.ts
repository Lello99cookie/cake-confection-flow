import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type AdminSupabaseClient = SupabaseClient<Database>;

const DIACRITICS_RE = new RegExp("[\\u0300-\\u036f]", "g");

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_RE, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "prodotto"}-${suffix}`;
}

async function requireAdmin(context: { supabase: AdminSupabaseClient; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

async function nextSortOrder(
  supabase: AdminSupabaseClient,
  table: "specialties" | "panettoni",
): Promise<number> {
  const { data } = await supabase
    .from(table)
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.sort_order ?? 0) + 10;
}

const updateProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  price: z.number().nonnegative().max(9999).nullable(),
  quantity: z.number().int().nonnegative().max(9999).nullable(),
  image_url: z.string().url().max(2000).nullable(),
});

const createProductSchema = z.object({
  name: z.string().trim().min(1).max(120),
  price: z.number().nonnegative().max(9999).nullable(),
  quantity: z.number().int().nonnegative().max(9999).nullable(),
  image_url: z.string().url().max(2000).nullable(),
});

const deleteProductSchema = z.object({ id: z.string().uuid() });

// Elenco completo (anche non attivi/esauriti) per la schermata di gestione catalogo.
export const listSpecialtiesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { data, error } = await context.supabase
      .from("specialties")
      .select("id,name,slug,description,image_url,price_hint,price,quantity,active")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listPanettoniAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { data, error } = await context.supabase
      .from("panettoni")
      .select("id,name,slug,description,image_url,price_hint,price,quantity,active")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateSpecialty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateProductSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase
      .from("specialties")
      .update({
        name: data.name,
        price: data.price,
        quantity: data.quantity,
        image_url: data.image_url,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updatePanettone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateProductSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase
      .from("panettoni")
      .update({
        name: data.name,
        price: data.price,
        quantity: data.quantity,
        image_url: data.image_url,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createSpecialty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createProductSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const sort_order = await nextSortOrder(context.supabase, "specialties");
    const { data: row, error } = await context.supabase
      .from("specialties")
      .insert({
        name: data.name,
        slug: slugify(data.name),
        price: data.price,
        quantity: data.quantity,
        image_url: data.image_url,
        sort_order,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const createPanettone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createProductSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const sort_order = await nextSortOrder(context.supabase, "panettoni");
    const { data: row, error } = await context.supabase
      .from("panettoni")
      .insert({
        name: data.name,
        slug: slugify(data.name),
        price: data.price,
        quantity: data.quantity,
        image_url: data.image_url,
        sort_order,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteSpecialty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => deleteProductSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("specialties").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePanettone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => deleteProductSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("panettoni").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const orderingStatusSchema = z.object({
  standard_enabled: z.boolean(),
  torta_personalizzata_enabled: z.boolean(),
  panettone_enabled: z.boolean(),
});

export const getOrderingStatusAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { data, error } = await context.supabase
      .from("ordering_status")
      .select("standard_enabled,torta_personalizzata_enabled,panettone_enabled")
      .eq("id", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      standard_enabled: data?.standard_enabled ?? true,
      torta_personalizzata_enabled: data?.torta_personalizzata_enabled ?? true,
      panettone_enabled: data?.panettone_enabled ?? true,
    };
  });

export const updateOrderingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => orderingStatusSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase
      .from("ordering_status")
      .update({
        standard_enabled: data.standard_enabled,
        torta_personalizzata_enabled: data.torta_personalizzata_enabled,
        panettone_enabled: data.panettone_enabled,
      })
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
