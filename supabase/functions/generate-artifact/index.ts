import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function callGemini(prompt: string, systemInstruction: string): Promise<string> {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) throw new Error("GEMINI_API_KEY not configured");

  const res = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: { temperature: 0.4 },
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

    const { documentId, type } = await req.json();
    const { data: doc } = await supabase.from("documents").select("*").eq("id", documentId).maybeSingle();
    if (!doc || doc.user_id !== user.id) {
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

    if (!geminiKey) {
      const { data: art } = await supabase.from("generated_artifacts").insert({
        document_id: documentId, user_id: user.id, artifact_type: type,
        title: `${labels[type] ?? type} for ${doc.file_name}`,
        content: "Artifact generation requires the GEMINI_API_KEY to be configured.",
      }).select().single();
      return new Response(JSON.stringify({ artifact: art }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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

    const content = await callGemini(`${prompts[type] ?? prompts.executive_brief}\n\nDocument summary: ${context}`, systemInstr);

    const { data: art } = await supabase.from("generated_artifacts").insert({
      document_id: documentId, user_id: user.id, artifact_type: type,
      title: `${labels[type] ?? type} for ${doc.file_name}`,
      content,
    }).select().single();

    return new Response(JSON.stringify({ artifact: art }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
