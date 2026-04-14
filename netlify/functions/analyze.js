exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let imageBase64, mimeType;
  try {
    const body = JSON.parse(event.body);
    imageBase64 = body.imageBase64;
    mimeType    = body.mimeType || "image/jpeg";
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  if (!imageBase64) {
    return { statusCode: 400, body: JSON.stringify({ error: "No image provided" }) };
  }

  // Anthropic only accepts these types — convert anything else to jpeg
  const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const mediaType = allowed.includes(mimeType) ? mimeType : "image/jpeg";

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key":         process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type":      "application/json",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-20250514",
        max_tokens: 512,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: imageBase64 },
            },
            {
              type: "text",
              text: `You are a receipt parser. Look at this receipt image carefully.
Return ONLY a raw JSON object — no markdown, no backticks, no explanation.
Even if the image is blurry or rotated, do your best to extract what you can.

Schema: {"amount":123.45,"merchant":"Store Name","category":"food","description":"brief note"}

Rules:
- amount: the final total as a number (no currency symbol)
- merchant: the store/restaurant name
- category: must be one of: food, transport, shopping, health, entertainment, bills, groceries, other
- description: 2-5 words describing what was bought
- If truly unreadable, return {"amount":0,"merchant":"Unknown","category":"other","description":"Could not read"}

JSON only:`,
            },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic error:", err);
      return { statusCode: 500, body: JSON.stringify({ error: "AI analysis failed", detail: err }) };
    }

    const data  = await response.json();
    const text  = (data.content || []).map(i => i.text || "").join("").trim();
    const clean = text.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      // Try to extract JSON from response if extra text snuck in
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else return { statusCode: 422, body: JSON.stringify({ error: "Could not parse AI response", raw: text }) };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount:      parsed.amount      || 0,
        merchant:    parsed.merchant    || "Unknown",
        category:    parsed.category    || "other",
        description: parsed.description || "",
      }),
    };

  } catch (err) {
    console.error("Function error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
