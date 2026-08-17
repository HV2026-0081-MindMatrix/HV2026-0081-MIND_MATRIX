import { createClient } from "npm:@supabase/supabase-js@2.58.0";

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
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { documentId, artifactId, prompt } = await req.json();
    const { data: doc } = await supabase.from("documents").select("*").eq("id", documentId).maybeSingle();
    if (!doc || doc.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Document not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!geminiKey) {
      return new Response(JSON.stringify({ error: "Gemini API key not configured. Image generation requires GEMINI_API_KEY." }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Gemini for image generation
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Generate an educational visual artifact: ${prompt}. Make it clear, professional, and informative.` }] }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini error: ${errText}`);
    }

    const geminiData = await geminiRes.json();
    const parts = geminiData.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p: { inlineData?: unknown }) => p.inlineData);

    if (!imagePart) {
      return new Response(JSON.stringify({ error: "No image generated" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const base64 = imagePart.inlineData.data;
    const mimeType = imagePart.inlineData.mimeType ?? "image/png";
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const storagePath = `${user.id}/${artifactId}.png`;

    const { error: uploadErr } = await supabase.storage.from("generated-artifacts").upload(storagePath, bytes, { contentType: mimeType, upsert: true });
    if (uploadErr) throw uploadErr;

    await supabase.from("generated_artifacts").update({ storage_path: storagePath }).eq("id", artifactId);

    const { data: urlData } = await supabase.storage.from("generated-artifacts").createSignedUrl(storagePath, 3600);

    return new Response(JSON.stringify({ url: urlData?.signedUrl ?? "" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
