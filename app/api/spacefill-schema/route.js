import supabase from "@/lib/supabase";
import { extractFieldCatalog } from "@/lib/spacefillApiSchema";

// Donne au client le catalogue de champs standard Spacefill, dérivé de la
// vraie spécification de l'API (stockée une fois pour toutes dans Supabase).
export async function GET() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "spacefill_openapi_spec")
    .maybeSingle();

  if (error || !data) {
    return Response.json({ configured: false });
  }

  const { fieldCatalog, catalogByOperation } = extractFieldCatalog(data.value);
  return Response.json({ configured: true, fieldCatalog, catalogByOperation });
}
