import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Database, Tables } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Booking = Tables<"bookings">;

function publicClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

const standardItemSchema = z.object({
  name: z.string().min(1).max(120),
  quantity: z.number().int().min(1).max(200),
});

const cakeConfigSchema = z.object({
  base: z.string().min(1).max(80),
  filling: z.string().min(1).max(80),
  soaking: z.enum(["alcolica", "analcolica", "latte"]),
  size: z.string().min(1).max(80),
  servings: z.number().int().min(2).max(200),
  phrase: z.string().max(120).optional(),
  decorations: z.string().max(500).optional(),
  addons: z.array(z.string().min(1).max(80)).max(20).optional(),
});

const createBookingSchema = z.object({
  type: z.enum(["standard", "torta_personalizzata", "panettone"]),
  pickup_at: z.string().min(10),
  customer_name: z.string().trim().min(1).max(120),
  customer_phone: z.string().trim().min(6).max(30),
  customer_email: z.string().trim().email().max(160),
  notes: z.string().max(1000).optional(),
  items: z.array(standardItemSchema).optional(),
  cake_config: cakeConfigSchema.optional(),
  // Honeypot: real users never see or fill this field. Bots that auto-fill every
  // input do, so a non-empty value marks the submission as spam.
  website: z.string().max(200).optional(),
});

const MAX_BOOKINGS_PER_WINDOW = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function getClientIp(): string | null {
  const headers = getRequest()?.headers;
  if (!headers) return null;
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  return headers.get("x-real-ip");
}

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createBookingSchema.parse(data))
  .handler(async ({ data }) => {
    // Honeypot tripped: pretend it worked so the bot doesn't adapt, but never write.
    if (data.website && data.website.trim() !== "") {
      return { id: randomUUID() };
    }

    const supabase = publicClient();

    const { data: status, error: statusError } = await supabase
      .from("ordering_status")
      .select("standard_enabled,torta_personalizzata_enabled,panettone_enabled")
      .eq("id", true)
      .maybeSingle();
    if (statusError) throw new Error(statusError.message);
    const enabledByType: Record<typeof data.type, boolean> = {
      standard: status?.standard_enabled ?? true,
      torta_personalizzata: status?.torta_personalizzata_enabled ?? true,
      panettone: status?.panettone_enabled ?? true,
    };
    if (!enabledByType[data.type]) {
      throw new Error(
        "Al momento non accettiamo nuove prenotazioni per questa categoria. Riprova più tardi.",
      );
    }

    const clientIp = getClientIp();
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const identityFilters = [
      `customer_phone.eq.${data.customer_phone}`,
      `customer_email.eq.${data.customer_email}`,
      ...(clientIp ? [`client_ip.eq.${clientIp}`] : []),
    ];
    const { count: recentCount, error: rateError } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since)
      .or(identityFilters.join(","));
    if (rateError) throw new Error(rateError.message);
    if ((recentCount ?? 0) >= MAX_BOOKINGS_PER_WINDOW) {
      throw new Error(
        "Hai già inviato diverse richieste di recente. Ti contatteremo a breve, oppure riprova più tardi.",
      );
    }

    const id = randomUUID();
    const { error } = await supabase.from("bookings").insert({
      id,
      type: data.type,
      pickup_at: data.pickup_at,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      customer_email: data.customer_email,
      client_ip: clientIp,
      notes: data.notes ?? null,
      items: data.items ?? null,
      cake_config: data.cake_config ?? null,
    });
    if (error) throw new Error(error.message);
    return { id };
  });

export const listBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { data, error } = await context.supabase
      .from("bookings")
      .select("*")
      .order("pickup_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  });

export const getBooking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data: row, error } = await context.supabase
      .from("bookings")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Prenotazione non trovata");
    return row;
  });

export const updateBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["da_preparare", "pronto", "ritirato", "annullato"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await context.supabase
      .from("bookings")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: Boolean(data) };
  });
