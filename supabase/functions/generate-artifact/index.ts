import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import { generateText } from "../shared/ai-provider.ts";

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

    const { documentId, type } = await req.json();
    const { data: doc } = await supabase.from("documents").select("*").eq("id", documentId).maybeSingle();
    if (!doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: run } = await supabase
      .from("analysis_runs")
      .select("*")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const labels: Record<string, string> = {
      infographic: "Infographic", mind_map: "Mind Map", study_guide: "Study Guide",
      flashcards: "Flashcards", concept_visual: "Concept Visual", executive_brief: "Executive Brief",
    };

    const prompts: Record<string, string> = {
      infographic: "Create a text-based infographic specification summarizing the key data points, statistics, and visual hierarchy from this document.",
      mind_map: "Create a text-based mind map showing the concept hierarchy and relationships in this document.",
      study_guide: "Create a study guide with key terms, definitions, and review questions from this document.",
      flashcards: 'Create flashcards as JSON: {"cards": [{"question": "q", "answer": "a"}]} from this document.',
      concept_visual: "Describe a concept visual that would help someone understand the main ideas in this document.",
      executive_brief: "Create a concise executive brief summarizing the key decisions and actions needed from this document.",
    };

    const context = run?.executive_summary ?? "No summary available.";
    const systemInstr = "You are an AI that creates educational artifacts from documents. Be thorough, structured, and informative.";

    const { text: content } = await generateText(
      `${prompts[type] ?? prompts.executive_brief}\n\nDocument summary: ${context}`,
      { systemInstruction: systemInstr, temperature: 0.4 }
    );

    const { data: art } = await supabase.from("generated_artifacts").insert({
      document_id: documentId, user_id: GUEST_USER_ID, artifact_type: type,
      title: `${labels[type] ?? type} for ${doc.file_name}`,
      content,
    }).select().single();

    return new Response(JSON.stringify({ artifact: art }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
