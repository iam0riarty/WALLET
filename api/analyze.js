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
            { type: "text", text: "Analyze this receipt. Return ONLY raw JSON, no markdown, no backticks, no explanation.\nExample: {\"amount\":45.5,\"merchant\":\"Carrefour\",\"category\":\"groceries\",\"description\":\"Weekly shopping\"}\ncategory must be one of: food, transport, shopping, health, entertainment, bills, groceries, other" }
          ]
        }]
      })
    });
    if (!r.ok) {
      const errText = await r.text();
      return res.status(500).json({ error: "Anthropic error: " + errText });
    }
    const data = await r.json();
    const raw = (data.content||[]).map(i=>i.text||"").join("").trim();
    const clean = raw.replace(/```json|```/g,"").trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: "No JSON found", raw });
    const parsed = JSON.parse(match[0]);
    res.json({
      amount: parsed.amount || 0,
      merchant: parsed.merchant || "Unknown",
      category: parsed.category || "other",
      description: parsed.description || ""
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
