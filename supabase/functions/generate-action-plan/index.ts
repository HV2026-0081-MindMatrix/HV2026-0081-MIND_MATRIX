import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import { generateStructuredOutput } from "../shared/ai-provider.ts";

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

    const { data: reqs } = await supabase.from("document_requirements").select("*").eq("document_id", documentId);
    const { data: deadlines } = await supabase.from("document_deadlines").select("*").eq("document_id", documentId);

    await supabase.from("action_items").delete().eq("document_id", documentId);

    const prompt = `Convert these document requirements into an actionable task plan. Order by priority.

Requirements: ${JSON.stringify(reqs ?? [])}
Deadlines: ${JSON.stringify(deadlines ?? [])}

Return JSON: {"items": [{"title": "task", "description": "desc", "priority": "critical|high|medium|low", "deadline": "YYYY-MM-DD or null", "source": "source ref"}]}`;

    const { text: content } = await generateStructuredOutput(prompt, {
      systemInstruction: "You are an AI that creates actionable task plans from documents. Return only valid JSON.",
      temperature: 0.3,
    });

    const parsed = JSON.parse(content);
    const items = (parsed.items ?? []).map((item: Record<string, unknown>) => ({
      document_id: documentId, user_id: GUEST_USER_ID,
      title: item.title as string,
      description: item.description as string | null,
      priority: item.priority as string ?? "medium",
      deadline: item.deadline as string | null,
      source: item.source as string | null,
      status: "pending",
    }));

    const { data: inserted } = await supabase.from("action_items").insert(items).select();
    return new Response(JSON.stringify({ items: inserted ?? [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
