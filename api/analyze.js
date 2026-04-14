export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { imageBase64, mimeType } = req.body;
  if (!imageBase64) return res.status(400).json({ error: "No image" });
  const allowed = ["image/jpeg","image/png","image/gif","image/webp"];
  const mediaType = allowed.includes(mimeType) ? mimeType : "image/jpeg";

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mediaType, data: imageBase64 } },
              { text: "Analyze this receipt image. Return ONLY a raw JSON object, no markdown, no backticks, no explanation.\nSchema: {\"amount\":123.45,\"merchant\":\"Store Name\",\"category\":\"food\",\"description\":\"brief note\"}\ncategory must be one of: food, transport, shopping, health, entertainment, bills, groceries, other\nIf unclear, make your best guess." }
            ]
          }],
          generationConfig: { maxOutputTokens: 256, temperature: 0.1 }
        })
      }
    );

    if (!r.ok) {
      const errText = await r.text();
      return res.status(500).json({ error: "Gemini error: " + errText });
    }

    const data = await r.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const clean = raw.replace(/```json|```/g, "").trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: "No JSON found", raw });
    const parsed = JSON.parse(match[0]);

    res.json({
      amount:      parsed.amount      || 0,
      merchant:    parsed.merchant    || "Unknown",
      category:    parsed.category    || "other",
      description: parsed.description || ""
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
