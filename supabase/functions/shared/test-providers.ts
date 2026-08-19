/**
 * MIND MATRIX — Provider Health Check
 * Tests OpenRouter and Cloudflare Workers AI connectivity.
 *
 * Usage: cd hackverse && deno run --allow-env --allow-net supabase/functions/shared/test-providers.ts
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const CLOUDFLARE_TEXT_URL = "https://api.cloudflare.com/client/v4/accounts";

async function testOpenRouter() {
  console.log("\n━━━ Testing OpenRouter ━━━");
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  const model = Deno.env.get("OPENROUTER_MODEL") || "meta-llama/llama-3.1-8b-instruct:free";

  if (!apiKey) {
    console.log("❌ OPENROUTER_API_KEY not set");
    return false;
  }
  console.log(`   Model: ${model}`);
  console.log(`   Key: ${apiKey.slice(0, 12)}...${apiKey.slice(-4)}`);

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://mindmatrix.app",
        "X-OpenRouter-Title": "Mind Matrix",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are a helpful assistant. Reply in one sentence." },
          { role: "user", content: "What is 2 + 2? Reply with just the answer." },
        ],
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.log(`❌ OpenRouter FAILED (${res.status}): ${err.slice(0, 200)}`);
      return false;
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    console.log(`✅ OpenRouter OK — Response: "${text?.slice(0, 100)}"`);
    return true;
  } catch (err) {
    console.log(`❌ OpenRouter FAILED: ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

async function testCloudflareText() {
  console.log("\n━━━ Testing Cloudflare Workers AI (Text) ━━━");
  const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = Deno.env.get("CLOUDFLARE_API_TOKEN");
  const model = Deno.env.get("CLOUDFLARE_TEXT_MODEL") || "@cf/meta/llama-3.1-8b-instruct";

  if (!accountId || !apiToken) {
    console.log("❌ CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN not set");
    console.log("   (Optional — Cloudflare is a fallback provider)");
    return false;
  }
  console.log(`   Model: ${model}`);
  console.log(`   Account: ${accountId.slice(0, 8)}...`);

  try {
    const res = await fetch(`${CLOUDFLARE_TEXT_URL}/${accountId}/ai/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are a helpful assistant. Reply in one sentence." },
          { role: "user", content: "What is 2 + 2? Reply with just the answer." },
        ],
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.log(`❌ Cloudflare Text FAILED (${res.status}): ${err.slice(0, 200)}`);
      return false;
    }

    const data = await res.json();
    const text = data.result?.response || data.choices?.[0]?.message?.content;
    console.log(`✅ Cloudflare Text OK — Response: "${text?.slice(0, 100)}"`);
    return true;
  } catch (err) {
    console.log(`❌ Cloudflare Text FAILED: ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

async function testCloudflareImage() {
  console.log("\n━━━ Testing Cloudflare Workers AI (Image) ━━━");
  const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = Deno.env.get("CLOUDFLARE_API_TOKEN");
  const model = Deno.env.get("CLOUDFLARE_IMAGE_MODEL") || "@cf/stabilityai/stable-diffusion-xl-base-1.0";

  if (!accountId || !apiToken) {
    console.log("❌ CLOUDFLARE credentials not set (skipping)");
    return false;
  }
  console.log(`   Model: ${model}`);

  try {
    const res = await fetch(`${CLOUDFLARE_TEXT_URL}/${accountId}/ai/run/${model}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        prompt: "A simple blue circle on white background",
        width: 256,
        height: 256,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.log(`❌ Cloudflare Image FAILED (${res.status}): ${err.slice(0, 200)}`);
      return false;
    }

    const data = await res.json();
    if (data.result?.image) {
      console.log(`✅ Cloudflare Image OK — Received ${data.result.image.length} chars base64`);
      return true;
    } else {
      console.log(`⚠️  Cloudflare Image returned no image: ${JSON.stringify(data).slice(0, 200)}`);
      return false;
    }
  } catch (err) {
    console.log(`❌ Cloudflare Image FAILED: ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

async function testPollinations() {
  console.log("\n━━━ Testing Pollinations.ai (Free Fallback) ━━━");
  try {
    const res = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai",
        messages: [{ role: "user", content: "What is 2 + 2? Reply with just the number." }],
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      console.log(`❌ Pollinations FAILED (${res.status})`);
      return false;
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    console.log(`✅ Pollinations OK — Response: "${text?.slice(0, 100)}"`);
    return true;
  } catch (err) {
    console.log(`❌ Pollinations FAILED: ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

// ── Run all tests ──────────────────────────────────────────────────────

console.log("╔══════════════════════════════════════════╗");
console.log("║   MIND MATRIX — Provider Health Check    ║");
console.log("╚══════════════════════════════════════════╝");

const results: [string, boolean][] = [];
results.push(["OpenRouter", await testOpenRouter()]);
results.push(["Cloudflare Text", await testCloudflareText()]);
results.push(["Cloudflare Image", await testCloudflareImage()]);
results.push(["Pollinations", await testPollinations()]);

console.log("\n━━━ Summary ━━━");
for (const [name, ok] of results) {
  console.log(`  ${ok ? "✅" : "❌"} ${name}`);
}

const passed = results.filter(([, ok]) => ok).length;
console.log(`\n  ${passed}/${results.length} providers working`);
