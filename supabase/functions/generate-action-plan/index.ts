import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function callGemini(prompt: string): Promise<string> {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) throw new Error("GEMINI_API_KEY not configured");

  const res = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
    }),
  });

  if (!res.ok) throw new Error(`Gemini API error: ${await res.text()}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No content returned from Gemini");
  return text;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { documentId } = await req.json();
    const { data: doc } = await supabase.from("documents").select("*").eq("id", documentId).maybeSingle();
    if (!doc || doc.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Document not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: reqs } = await supabase.from("document_requirements").select("*").eq("document_id", documentId);
    const { data: deadlines } = await supabase.from("document_deadlines").select("*").eq("document_id", documentId);

    await supabase.from("action_items").delete().eq("document_id", documentId);

    if (!geminiKey) {
      const items = (reqs ?? []).map((r) => ({
        document_id: documentId, user_id: user.id,
        title: r.description,
        description: r.mandatory ? "Mandatory requirement" : "Optional requirement",
        priority: r.mandatory ? "high" : "medium",
        deadline: deadlines?.[0]?.date ?? null,
        source: r.source_page ? `Page ${r.source_page}` : null,
        status: "pending",
      }));
      const { data: inserted } = await supabase.from("action_items").insert(items).select();
      return new Response(JSON.stringify({ items: inserted ?? [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const prompt = `Convert these document requirements into an actionable task plan. Order by priority.

Requirements: ${JSON.stringify(reqs ?? [])}
Deadlines: ${JSON.stringify(deadlines ?? [])}

Return JSON: {"items": [{"title": "task", "description": "desc", "priority": "critical|high|medium|low", "deadline": "YYYY-MM-DD or null", "source": "source ref"}]}`;

    const content = await callGemini(prompt);
    const parsed = JSON.parse(content);
    const items = (parsed.items ?? []).map((item: Record<string, unknown>) => ({
      document_id: documentId, user_id: user.id,
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
