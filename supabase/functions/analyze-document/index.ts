import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function callGemini(prompt: string, systemInstruction?: string): Promise<string> {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) throw new Error("GEMINI_API_KEY not configured");

  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const res = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error: ${errText}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No content returned from Gemini");
  return text;
}

interface Entity {
  entity_type: string;
  value: string;
  context: string | null;
  page_number: number | null;
}
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
interface Rule {
  rule: string;
  description: string | null;
  source_page: number | null;
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
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { documentId } = await req.json();
    if (!documentId) {
      return new Response(JSON.stringify({ error: "documentId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: doc } = await supabase.from("documents").select("*").eq("id", documentId).maybeSingle();
    if (!doc || doc.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch or extract text chunks
    let { data: chunks } = await supabase
      .from("document_chunks")
      .select("content, page_number")
      .eq("document_id", documentId)
      .order("chunk_index");

    if ((!chunks || chunks.length === 0) && doc.storage_path) {
      const { data: fileData } = await supabase.storage.from("documents").download(doc.storage_path);
      if (fileData) {
        const text = await fileData.text();
        const textChunks = text.split(/\n{2,}|\f/).filter((c) => c.trim().length > 20);
        chunks = textChunks.map((content, i) => ({ content, page_number: Math.floor(i / 3) + 1 }));
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

    const documentText = chunks?.map((c) => c.content).join("\n\n") ?? "No text extracted.";

    if (!geminiKey) {
      const { data: run } = await supabase.from("analysis_runs").insert({
        document_id: documentId,
        summary: "Document uploaded for analysis.",
        executive_summary: `This document contains ${chunks?.length ?? 0} sections. AI analysis requires GEMINI_API_KEY to be configured.`,
        key_points: ["Document uploaded successfully", "Text extraction complete", "Configure GEMINI_API_KEY for full AI analysis"],
        simple_explanation: "This document has been uploaded and is ready for AI analysis. Configure the Gemini API key for full intelligence features.",
        topics: ["document"],
        potential_risks: ["AI analysis not fully configured"],
      }).select().single();

      return new Response(JSON.stringify({
        run,
        result: {
          summary: { oneLine: "Document uploaded.", executive: "Configure GEMINI_API_KEY.", keyPoints: [], simple: "", sectionSummaries: [] },
          entities: [], deadlines: [], requirements: [], rules: [], keyPoints: [], topics: ["document"],
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const prompt = `Analyze the following document and extract structured intelligence. Return ONLY valid JSON.

Document text:
${documentText.slice(0, 12000)}

Return JSON with this exact structure:
{
  "summary": {
    "oneLine": "one-line summary",
    "executive": "detailed executive summary",
    "keyPoints": ["point 1", "point 2"],
    "simple": "simple explanation in plain English",
    "sectionSummaries": [{"heading": "Section name", "summary": "summary"}]
  },
  "entities": [{"entity_type": "person|organization|location|date|amount|percentage|requirement|rule|reference|contact", "value": "value", "context": "context", "page_number": null}],
  "deadlines": [{"event": "event name", "date": "YYYY-MM-DD or null", "importance": "critical|high|medium|low", "description": "desc", "source_page": null}],
  "requirements": [{"description": "requirement", "mandatory": true, "source_page": null, "source_text": "exact text if available"}],
  "rules": [{"rule": "rule", "description": "desc", "source_page": null}],
  "topics": ["topic1", "topic2"],
  "risks": ["risk 1", "risk 2"]
}`;

    const content = await callGemini(prompt);
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

    const entities = (parsed.entities ?? []) as Entity[];
    const deadlines = (parsed.deadlines ?? []) as Deadline[];
    const requirements = (parsed.requirements ?? []) as Requirement[];
    const rules = (parsed.rules ?? []) as Rule[];

    if (entities.length > 0) await supabase.from("document_entities").insert(entities.map((e) => ({ ...e, document_id: documentId })));
    if (deadlines.length > 0) await supabase.from("document_deadlines").insert(deadlines.map((d) => ({ ...d, document_id: documentId })));
    if (requirements.length > 0) await supabase.from("document_requirements").insert(requirements.map((r) => ({ ...r, document_id: documentId })));
    if (rules.length > 0) await supabase.from("document_rules").insert(rules.map((r) => ({ ...r, document_id: documentId })));

    return new Response(JSON.stringify({
      run,
      result: {
        summary: parsed.summary,
        entities, deadlines, requirements, rules,
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
