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

    const { documentId, question, conversationId } = await req.json();
    if (!documentId || !question) {
      return new Response(JSON.stringify({ error: "documentId and question required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: doc } = await supabase.from("documents").select("*").eq("id", documentId).maybeSingle();
    if (!doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let convId = conversationId;
    if (!convId) {
      const { data: conv } = await supabase.from("chat_conversations").insert({
        user_id: GUEST_USER_ID, workspace_id: doc.workspace_id, document_id: documentId, title: question.slice(0, 50),
      }).select().single();
      convId = conv.id;
    }

    await supabase.from("chat_messages").insert({ conversation_id: convId, role: "user", content: question });

    // Retrieve relevant context via keyword scoring from document chunks
    let context = "";

    const { data: chunks } = await supabase
      .from("document_chunks")
      .select("content, page_number")
      .eq("document_id", documentId);

    if (chunks && chunks.length > 0) {
      const questionWords = question.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const scored = chunks.map((c) => {
        const contentLower = c.content.toLowerCase();
        const score = questionWords.reduce((acc, w) => acc + (contentLower.includes(w) ? 1 : 0), 0);
        return { ...c, score };
      }).sort((a, b) => b.score - a.score).slice(0, 5);
      context = scored.map((c) => `[Page ${c.page_number ?? "?"}]: ${c.content}`).join("\n\n");
    }

    // If no chunks exist (e.g., PDF not yet chunked), try to use the analysis summary as context
    if (!context) {
      const { data: run } = await supabase
        .from("analysis_runs")
        .select("executive_summary, key_points")
        .eq("document_id", documentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (run?.executive_summary) {
        context = `Document summary:\n${run.executive_summary}\n\nKey points: ${JSON.stringify(run.key_points ?? [])}`;
      }
    }

    const prompt = `You are a helpful document assistant. Answer the user's question based on the document provided.

RULES:
1. If the question is about the document's topic and the answer IS in the document, answer it clearly and cite the source page when possible.
2. If the question is about the document's topic but the answer is NOT covered in the document, say: "This topic isn't covered in the document you uploaded. Is there something else about this document I can help with?"
3. If the question is completely unrelated to the document's subject (e.g., asking about cooking recipes when the document is about building regulations), say: "That question doesn't seem related to this document. I can only help with questions about the uploaded material. Try asking something about the document's content!"
4. NEVER say "I couldn't find sufficient evidence" — instead use friendly, natural language.
5. NEVER apologize excessively. Keep answers concise and helpful.
6. Always include source page numbers when referencing specific information from the document.
${context ? `\nDocument context:\n${context.slice(0, 8000)}\n` : ""}
Question: ${question}

Return JSON: {"answer": "your answer", "citations": [{"page": number_or_null, "text": "relevant quote"}]}`;

    const { text: content } = await generateText(prompt, {
      systemInstruction: "You are a helpful document assistant. Answer questions based on the provided context. Return only valid JSON with 'answer' and 'citations' fields.",
      temperature: 0.2,
    });

    const parsed = JSON.parse(content);
    const answer = parsed.answer ?? "That question doesn't seem related to this document. I can only help with questions about the uploaded material.";
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
