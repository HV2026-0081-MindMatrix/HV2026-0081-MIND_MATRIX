import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import { generateStructuredOutput } from "../shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { documentId, answers } = await req.json();
    const { data: doc } = await supabase.from("documents").select("*").eq("id", documentId).maybeSingle();
    if (!doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: reqs } = await supabase.from("document_requirements").select("*").eq("document_id", documentId);
    const { data: rules } = await supabase.from("document_rules").select("*").eq("document_id", documentId);

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

    const { text: content } = await generateStructuredOutput(prompt, {
      systemInstruction: "You are an AI eligibility assessor. Analyze document requirements and user answers. Return only valid JSON.",
      temperature: 0.2,
    });

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
