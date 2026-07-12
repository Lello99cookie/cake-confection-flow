import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export const getSpecialties = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("specialties")
    .select("id,name,slug,description,image_url,price_hint,price")
    .eq("active", true)
    .or("quantity.is.null,quantity.gt.0")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getPanettoni = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("panettoni")
    .select("id,name,slug,description,image_url,price_hint,price")
    .eq("active", true)
    .or("quantity.is.null,quantity.gt.0")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getOrderingStatus = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase
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

export const getCakeOptions = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const [bases, fillings, sizes, addons] = await Promise.all([
    supabase
      .from("cake_bases")
      .select("id,name,description")
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("cake_fillings")
      .select("id,name,description")
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("cake_sizes")
      .select("id,label,servings,price")
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("cake_addons")
      .select("id,name,description,price")
      .eq("active", true)
      .order("sort_order"),
  ]);
  if (bases.error) throw new Error(bases.error.message);
  if (fillings.error) throw new Error(fillings.error.message);
  if (sizes.error) throw new Error(sizes.error.message);
  if (addons.error) throw new Error(addons.error.message);
  return {
    bases: bases.data ?? [],
    fillings: fillings.data ?? [],
    sizes: sizes.data ?? [],
    addons: addons.data ?? [],
  };
});
