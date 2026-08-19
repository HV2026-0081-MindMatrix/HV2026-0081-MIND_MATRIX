import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import { generateStructuredOutput } from "../shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Fixed guest identity — the app runs without authentication (migration 002).
const GUEST_USER_ID = "00000000-0000-4000-8000-000000000001";

interface Deadline {
  event: string;
  date: string | null;
  importance: string;
  description: string | null;
  source_page: number | null;
}
interface Requirement {
  description: string;
  mandatory: boolean;
  source_page: number | null;
  source_text: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { documentId } = await req.json();
    if (!documentId) {
      return new Response(JSON.stringify({ error: "documentId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: doc } = await supabase.from("documents").select("*").eq("id", documentId).maybeSingle();
    if (!doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract document text for AI analysis
    let documentText = "";

    if (doc.storage_path) {
      const { data: fileData } = await supabase.storage.from("documents").download(doc.storage_path);
      if (fileData) {
        const text = await fileData.text();
        const textChunks = text.split(/\n{2,}|\f/).filter((c) => c.trim().length > 20);
        if (textChunks.length > 0) {
          documentText = textChunks.join("\n\n");
          await supabase.from("document_chunks").insert(
            textChunks.map((content, i) => ({
              document_id: documentId,
              chunk_index: i,
              content,
              page_number: Math.floor(i / 3) + 1,
            }))
          );
        }
      }
    }

    const analysisPrompt = `Analyze the attached document and extract structured intelligence. Return ONLY valid JSON.
${documentText ? `\nDocument text:\n${documentText.slice(0, 12000)}` : ""}

Return JSON with this exact structure:
{
  "summary": {
    "oneLine": "one-line summary",
    "executive": "detailed executive summary",
    "keyPoints": ["point 1", "point 2"],
    "simple": "simple explanation in plain English"
  },
  "deadlines": [{"event": "event name", "date": "YYYY-MM-DD or null", "importance": "critical|high|medium|low", "description": "desc", "source_page": null}],
  "requirements": [{"description": "requirement", "mandatory": true, "source_page": null, "source_text": "exact text if available"}],
  "topics": ["topic1", "topic2"],
  "risks": ["risk 1", "risk 2"]
}`;

    const { text: content } = await generateStructuredOutput(analysisPrompt, { temperature: 0.3 });
    const parsed = JSON.parse(content);

    const { data: run } = await supabase.from("analysis_runs").insert({
      document_id: documentId,
      summary: parsed.summary?.oneLine ?? "",
      executive_summary: parsed.summary?.executive ?? "",
      key_points: parsed.summary?.keyPoints ?? [],
      simple_explanation: parsed.summary?.simple ?? "",
      topics: parsed.topics ?? ["document"],
      potential_risks: parsed.risks ?? [],
    }).select().single();

    const deadlines = (parsed.deadlines ?? []) as Deadline[];
    const requirements = (parsed.requirements ?? []) as Requirement[];

    if (deadlines.length > 0) await supabase.from("document_deadlines").insert(deadlines.map((d) => ({ ...d, document_id: documentId })));
    if (requirements.length > 0) await supabase.from("document_requirements").insert(requirements.map((r) => ({ ...r, document_id: documentId })));

    return new Response(JSON.stringify({
      run,
      result: {
        summary: parsed.summary,
        deadlines, requirements,
        keyPoints: parsed.summary?.keyPoints ?? [],
        topics: parsed.topics ?? ["document"],
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
