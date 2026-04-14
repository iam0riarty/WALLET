export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { imageBase64, mimeType } = req.body;
  if (!imageBase64) return res.status(400).json({ error: "No image" });
  const allowed = ["image/jpeg","image/png","image/gif","image/webp"];
  const mediaType = allowed.includes(mimeType) ? mimeType : "image/jpeg";
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
            { type: "text", text: "Analyze this receipt. Return ONLY raw JSON, no markdown, no backticks.\nSchema: {\"amount\":123.45,\"merchant\":\"Store Name\",\"category\":\"food\",\"description\":\"brief note\"}\ncategory must be one of: food, transport, shopping, health, entertainment, bills, groceries, other" }
          ]
        }]
      })
    });
    const data = await r.json();
    const text = (data.content||[]).map(i=>i.text||"").join("").trim().replace(/```json|```/g,"").trim();
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : text);
    res.json({ amount: parsed.amount||0, merchant: parsed.merchant||"Unknown", category: parsed.category||"other", description: parsed.description||"" });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
