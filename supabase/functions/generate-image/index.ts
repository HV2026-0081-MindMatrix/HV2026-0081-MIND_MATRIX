import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import { generateImage } from "../shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GUEST_USER_ID = "00000000-0000-4000-8000-000000000001";

/** Simple hash to turn a string into a numeric seed. */
function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 100000;
}

/**
 * Build 3 dynamically-generated prompts that reflect the ACTUAL document content.
 * Each prompt uses the document title and a snippet of the content so images are
 * unique per document and relevant to the material.
 */
function buildPrompts(
  artifactType: string,
  title: string,
  contentSnippet: string
): string[] {
  const topic = title
    .replace(
      /^(Flashcards|Mind Map|Infographic|Study Guide|Concept Visual|Executive Brief)\s*(for|of|about)?\s*/i,
      ""
    )
    .trim();

  const topicDesc = contentSnippet
    .slice(0, 200)
    .replace(/\n+/g, " ")
    .replace(/[^a-zA-Z0-9 ,.\-]/g, " ")
    .trim();

  const palettes = [
    ["deep blue", "teal", "coral", "gold"],
    ["emerald", "navy", "amber", "rose"],
    ["violet", "cyan", "lime", "orange"],
    ["indigo", "mint", "peach", "sky blue"],
    ["burgundy", "teal", "mustard", "sage"],
  ];
  const hash = hashSeed(title + contentSnippet.slice(0, 100));
  const palette = palettes[hash % palettes.length];
  const [c1, c2, c3, c4] = palette;

  const topicLower = (topic + " " + topicDesc).toLowerCase();
  const iconPool = [
    "document", "chart", "gear", "lightbulb", "shield", "rocket",
    "book", "brain", "globe", "target", "compass", "puzzle",
    "leaf", "building", "trophy", "key", "magnifying glass", "star",
    "diamond", "clock", "network", "checkmark", "heart", "flame",
  ];
  const pickIcons = (keywords: string[], count: number): string[] => {
    const picked: string[] = [];
    for (const kw of keywords) {
      if (picked.length >= count) break;
      for (const icon of iconPool) {
        if (picked.length >= count) break;
        if (icon.includes(kw) || kw.includes(icon)) {
          picked.push(icon);
        }
      }
    }
    while (picked.length < count) {
      picked.push(iconPool[(hash + picked.length) % iconPool.length]);
    }
    return [...new Set(picked)].slice(0, count);
  };

  const keywords = topicLower.split(/\s+/).filter((w) => w.length > 3);
  const icons = pickIcons(keywords, 6);

  const typePrompts: Record<string, string[]> = {
    flashcards: [
      `Digital illustration of 6 educational flashcards arranged in a 2x3 grid on a soft gradient background (${c1} to white). Each card is a rounded rectangle with a colored header bar (different color: ${c1}, ${c2}, ${c3}, ${c4}, ${c1}, ${c2}), a centered circular icon inside (${icons.slice(0, 6).join(", ")}), and 3 short lines representing content below. Clean flat design, soft shadows, modern study app aesthetic. Theme: ${topic}. No text or words. Professional, premium feel.`,
      `Premium infographic-style illustration showing 4 large circular badges arranged in a diamond pattern. Each badge has a bold colored border (${c1}, ${c2}, ${c3}, ${c4}) with a large stylized number inside surrounded by small decorative icons (${icons.slice(0, 4).join(", ")}). Connected by thin dotted lines. Clean white background, flat design. Theme: ${topic}. No text or words. Professional data visualization.`,
      `Elegant hero card illustration: a large rounded rectangle card with a ${c1} gradient header containing 3 small circular icons (${icons.slice(0, 3).join(", ")}), a white body section with 4 horizontal stat bars in different colors (${c1}, ${c2}, ${c3}, ${c4}) showing different fill levels, and a subtle footer with small decorative dots. Theme: ${topic}. No text or words. Premium study app aesthetic.`,
    ],
    mind_map: [
      `Digital illustration of a modern radial mind map. Large central circle (${c1}) connected by 5 curved colored lines (${c2}, ${c3}, ${c4}, ${c1}, ${c2}) to 5 satellite circles of varying sizes. Each satellite has a different geometric icon inside (${icons.slice(0, 5).join(", ")}). Clean white background. Theme: ${topic}. No text or words. Professional diagram like a Miro board.`,
      `Premium illustration of a hierarchical concept tree: a large top node (${c1} circle with ${icons[0]} icon) branching down to 3 mid-level nodes (${c2}, ${c3}, ${c4}) which each branch to 2 smaller leaf nodes. Connected by smooth curved lines with subtle gradients. Theme: ${topic}. No text or words. Modern educational diagram.`,
      `Elegant network diagram illustration: 7 nodes of different sizes connected by thin curved lines. Nodes are colored circles (${c1}, ${c2}, ${c3}, ${c4}, ${c1}, ${c2}, ${c3}) each containing a unique icon (${icons.slice(0, 7).join(", ")}). Central node is largest. Theme: ${topic}. No text or words. Professional tech diagram.`,
    ],
    infographic: [
      `Premium data dashboard illustration: a clean rectangular card with a dark header bar, below it 3 large circular progress indicators (showing different fills in ${c2}, ${c1}, ${c3}), and below that a row of 4 small colored stat cards with icons (${icons.slice(0, 4).join(", ")}). Theme: ${topic}. No text or words. Modern data visualization.`,
      `Elegant side-by-side comparison illustration: two large rounded cards side by side. Left card (${c3} tones) shows a ${icons[0]} icon with a downward trend arrow. Right card (${c2} gradient) shows a ${icons[1]} icon with an upward trend arrow. A colorful arrow connects them. Theme: ${topic}. No text or words. Before/after infographic style.`,
      `Vertical timeline infographic illustration: a central vertical line with 4 colored milestone dots (${c1}, ${c2}, ${c3}, ${c4}) at equal intervals. Each dot has a horizontal card extending to alternating sides with an icon (${icons.slice(0, 4).join(", ")}) and colored bars. Theme: ${topic}. No text or words. Corporate timeline style.`,
    ],
    study_guide: [
      `Premium study guide illustration: a layout of 4 colored topic cards in a 2x2 grid. Each card has a different header color (${c1}, ${c2}, ${c3}, ${c4}), a centered icon (${icons.slice(0, 4).join(", ")}), and 3 short horizontal lines representing content. A colored sidebar with small priority indicators. Theme: ${topic}. No text or words. Like a premium Notion template.`,
      `Elegant key concepts illustration: 5 rounded rectangular cards floating at slight angles on a soft gradient background. Each card has a unique colored border (${c1}, ${c2}, ${c3}, ${c4}, ${c1}), a centered icon (${icons.slice(0, 5).join(", ")}), and a subtle colored glow. Theme: ${topic}. No text or words. Premium study planner aesthetic.`,
      `Premium review checklist illustration: a clean card with a colored header (${c1}), below it 4 rows each with a colored checkbox icon, a short horizontal line, and a colored tag icon (${icons.slice(0, 4).join(", ")}). A small progress bar at the bottom. Theme: ${topic}. No text or words. Organized study app aesthetic.`,
    ],
    concept_visual: [
      `Modern concept relationship illustration: a central large circle (${c1}) connected by 4 thick colored arrows (${c2}, ${c3}, ${c4}, ${c1}) to 4 surrounding circles. Each outer circle contains a unique icon (${icons.slice(0, 4).join(", ")}). Arrows have subtle gradients. Theme: ${topic}. No text or words. Professional diagram.`,
      `Elegant Venn diagram illustration: 3 large overlapping translucent circles (${c1}, ${c2}, ${c3}) on a white background. Each circle has a centered icon (${icons.slice(0, 3).join(", ")}). Overlap areas show blended colors. Theme: ${topic}. No text or words. Professional infographic.`,
      `Premium flow diagram illustration: 4 rounded rectangular nodes connected by thick colored arrows flowing left to right. Each node is a different color (${c1}, ${c2}, ${c3}, ${c4}) with a centered icon (${icons.slice(0, 4).join(", ")}). Theme: ${topic}. No text or words. Professional process flow.`,
    ],
    executive_brief: [
      `Premium executive summary card illustration: a large rounded rectangle with a dark ${c1} gradient header containing 3 small icons (${icons.slice(0, 3).join(", ")}), a white body with 3 horizontal finding cards (each with a colored left border: ${c2}, ${c3}, ${c4}) and a centered icon, and a footer bar. Theme: ${topic}. No text or words. Corporate premium aesthetic.`,
      `Elegant key metrics illustration: a clean card layout with a dark header, 3 large metric circles (showing different fill levels in ${c2}, ${c1}, ${c4}), each with a centered icon (${icons.slice(0, 3).join(", ")}), and a bottom section with 4 small colored indicator dots. Theme: ${topic}. No text or words. Professional report style.`,
      `Premium action items illustration: a clean card with a colored header (${c1}), 4 horizontal action rows each with a colored priority icon (${icons.slice(0, 4).join(", ")}), a horizontal progress bar, and a footer with a completion indicator. Theme: ${topic}. No text or words. Professional project management aesthetic.`,
    ],
  };

  return typePrompts[artifactType] ?? typePrompts.flashcards;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { documentId, artifactId, prompt } = await req.json();
    const { data: doc } = await supabase.from("documents").select("*").eq("id", documentId).maybeSingle();
    if (!doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch artifact for type-specific visual prompts
    const { data: artifact } = await supabase.from("generated_artifacts").select("artifact_type, content, title").eq("id", artifactId).maybeSingle();
    const artifactType = artifact?.artifact_type ?? "flashcards";
    const artifactTitle = artifact?.title ?? prompt.split("\n")[0] ?? prompt;

    // Use actual artifact content for content-aware prompts
    const contentSnippet = artifact?.content?.slice(0, 600) ?? prompt.slice(0, 600);
    const prompts = buildPrompts(artifactType, artifactTitle, contentSnippet);

    // Use unique seeds based on document ID so each document gets different images
    const baseSeed = hashSeed(documentId + artifactId);

    // Generate 3 images with Cloudflare primary → Pollinations fallback
    const urls: string[] = [];
    for (let i = 0; i < prompts.length; i++) {
      const seed = baseSeed + i * 7;
      const result = await generateImage(prompts[i], seed);
      if (!result) continue;

      const suffix = i === 0 ? "" : `_${i + 1}`;
      const storagePath = `${GUEST_USER_ID}/${artifactId}${suffix}.png`;
      const { error: uploadErr } = await supabase.storage.from("generated-artifacts").upload(storagePath, result.bytes, { contentType: "image/png", upsert: true });
      if (uploadErr) {
        console.error(`Upload error for image ${i + 1}:`, uploadErr.message);
        continue;
      }

      const { data: urlData } = await supabase.storage.from("generated-artifacts").createSignedUrl(storagePath, 3600);
      if (urlData?.signedUrl) urls.push(urlData.signedUrl);
    }

    if (urls.length === 0) {
      return new Response(JSON.stringify({ error: "No images generated" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Store primary image path for backward compatibility
    const primaryPath = `${GUEST_USER_ID}/${artifactId}.png`;
    await supabase.from("generated_artifacts").update({ storage_path: primaryPath }).eq("id", artifactId);

    return new Response(JSON.stringify({ url: urls[0], urls }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
