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

    const { documentId, question, conversationId } = await req.json();
    if (!documentId || !question) {
      return new Response(JSON.stringify({ error: "documentId and question required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: doc } = await supabase.from("documents").select("*").eq("id", documentId).maybeSingle();
    if (!doc || doc.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Document not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let convId = conversationId;
    if (!convId) {
      const { data: conv } = await supabase.from("chat_conversations").insert({
        user_id: user.id, workspace_id: doc.workspace_id, document_id: documentId, title: question.slice(0, 50),
      }).select().single();
      convId = conv.id;
    }

    await supabase.from("chat_messages").insert({ conversation_id: convId, role: "user", content: question });

    // Retrieve relevant chunks via keyword scoring
    const { data: chunks } = await supabase
      .from("document_chunks")
      .select("content, page_number")
      .eq("document_id", documentId);

    let context = "";
    if (chunks && chunks.length > 0) {
      const questionWords = question.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const scored = chunks.map((c) => {
        const contentLower = c.content.toLowerCase();
        const score = questionWords.reduce((acc, w) => acc + (contentLower.includes(w) ? 1 : 0), 0);
        return { ...c, score };
      }).sort((a, b) => b.score - a.score).slice(0, 5);
      context = scored.map((c) => `[Page ${c.page_number ?? "?"}]: ${c.content}`).join("\n\n");
    }

    if (!geminiKey) {
      const fallbackAnswer = "I couldn't find sufficient evidence for that in this document. AI Q&A requires the GEMINI_API_KEY to be configured.";
      const { data: msg } = await supabase.from("chat_messages").insert({
        conversation_id: convId, role: "assistant", content: fallbackAnswer, citations: [],
      }).select().single();
      return new Response(JSON.stringify({ answer: fallbackAnswer, citations: [], messageId: msg.id, conversationId: convId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const prompt = `Answer the question based ONLY on the document context below. If you cannot find sufficient evidence, say "I couldn't find sufficient evidence for that in this document." Include source page numbers when referencing specific information.

Document context:
${context.slice(0, 8000)}

Question: ${question}

Return JSON: {"answer": "your answer", "citations": [{"page": number_or_null, "text": "relevant quote"}]}`;

    const content = await callGemini(prompt);
    const parsed = JSON.parse(content);
    const answer = parsed.answer ?? "I couldn't find sufficient evidence for that in this document.";
    const citations = parsed.citations ?? [];

    const { data: msg } = await supabase.from("chat_messages").insert({
      conversation_id: convId, role: "assistant", content: answer, citations,
    }).select().single();

    return new Response(JSON.stringify({ answer, citations, messageId: msg.id, conversationId: convId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
