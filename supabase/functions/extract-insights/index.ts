import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Fixed guest identity — the app runs without authentication (migration 002).
const GUEST_USER_ID = "00000000-0000-4000-8000-000000000001";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { documentId } = await req.json();
    const { data: doc } = await supabase.from("documents").select("*").eq("id", documentId).maybeSingle();
    if (!doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const [ent, dln, req, rul] = await Promise.all([
      supabase.from("document_entities").select("*").eq("document_id", documentId),
      supabase.from("document_deadlines").select("*").eq("document_id", documentId),
      supabase.from("document_requirements").select("*").eq("document_id", documentId),
      supabase.from("document_rules").select("*").eq("document_id", documentId),
    ]);

    return new Response(JSON.stringify({
      entities: ent.data ?? [],
      deadlines: dln.data ?? [],
      requirements: req.data ?? [],
      rules: rul.data ?? [],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
