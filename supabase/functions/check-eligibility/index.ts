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
      generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
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

    const { documentId, answers } = await req.json();
    const { data: doc } = await supabase.from("documents").select("*").eq("id", documentId).maybeSingle();
    if (!doc || doc.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Document not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: reqs } = await supabase.from("document_requirements").select("*").eq("document_id", documentId);
    const { data: rules } = await supabase.from("document_rules").select("*").eq("document_id", documentId);

    if (!geminiKey) {
      return new Response(JSON.stringify({
        status: "needs_more_info",
        summary: "Eligibility assessment requires the GEMINI_API_KEY to be configured.",
        matched: [], unmatched: [], missingDocuments: [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const prompt = `Based on the document requirements and user answers, determine eligibility.

Requirements: ${JSON.stringify(reqs ?? [])}
Rules: ${JSON.stringify(rules ?? [])}
User answers: ${JSON.stringify(answers)}

Return JSON:
{
  "status": "likely_eligible|needs_more_info|likely_not_eligible",
  "summary": "Based on the uploaded document, ...",
  "matched": [{"criterion": "desc", "user_value": "value", "source_page": null, "met": true}],
  "unmatched": [{"criterion": "desc", "user_value": "value", "source_page": null, "met": false}],
  "missingDocuments": ["document name 1", "document name 2"]
}`;

    const content = await callGemini(prompt);
    const parsed = JSON.parse(content);

    return new Response(JSON.stringify({
      status: parsed.status ?? "needs_more_info",
      summary: parsed.summary ?? "",
      matched: parsed.matched ?? [],
      unmatched: parsed.unmatched ?? [],
      missingDocuments: parsed.missingDocuments ?? [],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
