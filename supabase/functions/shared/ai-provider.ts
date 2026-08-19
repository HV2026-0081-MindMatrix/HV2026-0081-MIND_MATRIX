/**
 * MIND MATRIX — AI Provider Router
 *
 * Text: Groq (primary) → Pollinations.ai (free fallback)
 * Image: AICredits (primary) → Pollinations.ai (free fallback)
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionResponse {
  choices: { message: { content: string } }[];
}

export type ProviderName = "groq" | "aicredits" | "pollinations";

export type Capability = "text_generation" | "structured_output" | "image_generation";

// ── Groq Text Generation ──────────────────────────────────────────────

async function groqRequest(
  messages: ChatMessage[],
  options?: { temperature?: number; jsonMode?: boolean }
): Promise<string> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  const model = Deno.env.get("GROQ_MODEL") || "llama-3.1-8b-instant";

  if (!apiKey) throw new Error("Groq API key not configured");

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options?.temperature ?? 0.3,
  };
  if (options?.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as ChatCompletionResponse;
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("No content returned from Groq");
  return text;
}

// ── Pollinations.ai (Free fallback) ───────────────────────────────────

async function pollinationsRequest(
  messages: ChatMessage[],
  options?: { temperature?: number; jsonMode?: boolean }
): Promise<string> {
  const body: Record<string, unknown> = {
    model: "openai",
    messages,
    temperature: options?.temperature ?? 0.3,
  };

  const res = await fetch("https://text.pollinations.ai/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Pollinations API error (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as ChatCompletionResponse;
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("No content returned from Pollinations");
  return text;
}

// ── Main Router ────────────────────────────────────────────────────────

/**
 * Generate text with automatic provider fallback.
 * Routing: Groq → Pollinations (free)
 */
export async function generateText(
  prompt: string,
  options?: {
    systemInstruction?: string;
    temperature?: number;
    jsonMode?: boolean;
  }
): Promise<{ text: string; provider: ProviderName }> {
  const messages: ChatMessage[] = [];
  if (options?.systemInstruction) {
    messages.push({ role: "system", content: options.systemInstruction });
  }
  messages.push({ role: "user", content: prompt });

  const opts = { temperature: options?.temperature, jsonMode: options?.jsonMode };

  // 1. Try Groq (primary)
  try {
    const text = await groqRequest(messages, opts);
    return { text, provider: "groq" };
  } catch (err) {
    console.error(`Groq failed:`, err);
  }

  // 2. Try Pollinations.ai (free fallback)
  try {
    const text = await pollinationsRequest(messages, opts);
    return { text, provider: "pollinations" };
  } catch (err) {
    console.error(`Pollinations failed:`, err);
  }

  // All providers failed
  throw new Error("AI services are temporarily unavailable. Please try again shortly.");
}

/**
 * Generate structured JSON output with automatic provider fallback.
 */
export async function generateStructuredOutput(
  prompt: string,
  options?: {
    systemInstruction?: string;
    temperature?: number;
  }
): Promise<{ text: string; provider: ProviderName }> {
  return generateText(prompt, {
    ...options,
    jsonMode: true,
  });
}

// ── AICredits Image Generation ────────────────────────────────────────

/**
 * Generate an image using AICredits API (OpenAI-compatible /v1/images/generations).
 * Returns raw image bytes or null on failure.
 */
export async function generateAICreditsImage(
  prompt: string,
  options?: { width?: number; height?: number }
): Promise<Uint8Array | null> {
  const apiKey = Deno.env.get("AICREDITS_API_KEY");
  const baseUrl = Deno.env.get("AICREDITS_BASE_URL") || "https://aicredits.in/v1";
  const model = Deno.env.get("AICREDITS_IMAGE_MODEL") || "gpt-image-1";

  if (!apiKey) return null;

  try {
    const size = `${options?.width ?? 1024}x${options?.height ?? 1024}`;
    const res = await fetch(`${baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        size,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`AICredits image error (${res.status}): ${errText}`);
      return null;
    }

    const data = (await res.json()) as { data?: { b64_json?: string; url?: string }[] };
    const item = data.data?.[0];
    if (!item) {
      console.error("AICredits returned no image data");
      return null;
    }

    if (item.b64_json) {
      const binaryStr = atob(item.b64_json);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      return bytes;
    }

    if (item.url) {
      const imgRes = await fetch(item.url);
      if (!imgRes.ok) {
        console.error(`Failed to download image from URL: ${imgRes.status}`);
        return null;
      }
      return new Uint8Array(await imgRes.arrayBuffer());
    }

    return null;
  } catch (err) {
    console.error("AICredits image generation error:", err);
    return null;
  }
}

// ── Pollinations.ai Image Generation (Free fallback) ───────────────────

function pollinationsImageUrl(prompt: string, seed: number): string {
  const p = encodeURIComponent(prompt.slice(0, 1500));
  return `https://image.pollinations.ai/prompt/${p}?width=1024&height=768&nologo=true&model=flux&seed=${seed}&referrer=mindmatrix.app`;
}

/**
 * Generate an image using Pollinations.ai (free, no API key).
 * Returns raw image bytes or null on failure.
 */
export async function generatePollinationsImage(
  prompt: string,
  seed: number
): Promise<Uint8Array | null> {
  try {
    const res = await fetch(pollinationsImageUrl(prompt, seed));
    if (!res.ok) {
      console.error(`Pollinations image error (seed ${seed}): ${res.status}`);
      return null;
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length < 1000) {
      console.error(`Image too small (${bytes.length} bytes) for seed ${seed}`);
      return null;
    }
    return bytes;
  } catch (err) {
    console.error(`Error fetching Pollinations image (seed ${seed}):`, err);
    return null;
  }
}

/**
 * Generate image with AICredits primary → Pollinations fallback.
 */
export async function generateImage(
  prompt: string,
  seed: number,
  options?: { width?: number; height?: number }
): Promise<{ bytes: Uint8Array; provider: ProviderName } | null> {
  const aiBytes = await generateAICreditsImage(prompt, options);
  if (aiBytes) return { bytes: aiBytes, provider: "aicredits" };

  const pollBytes = await generatePollinationsImage(prompt, seed);
  if (pollBytes) return { bytes: pollBytes, provider: "pollinations" };

  return null;
}
