
import { NextRequest, NextResponse } from "next/server";
import { Mistral } from "@mistralai/mistralai";

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

const MODEL = process.env.MISTRAL_MODEL ?? "mistral-small-latest";

type ItemEstimate = {
  fileName: string;
  item: string;
  brand: string | null;
  condition: string;
  estimatedValueNok: number;
  note: string | null;
};

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const files = formData.getAll("images") as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: "Ingen bilder mottatt" }, { status: 400 });
  }

  const results: ItemEstimate[] = [];

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const response = await mistral.chat.complete({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Se på bildet og identifiser gjenstanden. Svar KUN med gyldig JSON på nøyaktig dette formatet, ingen annen tekst, ingen markdown-kodeblokk:
{"item": "kort navn på gjenstanden", "brand": "merke hvis synlig, ellers null", "condition": "ny/god/brukt/slitt", "estimatedValueNok": et heltall i norske kroner, "note": "kort forklaring på anslaget, eller null"}`,
            },
            {
              type: "image_url",
              imageUrl: `data:${file.type};base64,${base64}`,
            },
          ],
        },
      ],
    });

    const raw = response.choices?.[0]?.message?.content;
    const text =
      typeof raw === "string"
        ? raw
        : Array.isArray(raw)
          ? raw.map((c) => ("text" in c ? c.text : "")).join("")
          : "{}";

    let parsed: Omit<ItemEstimate, "fileName">;
    try {
      const cleaned = text.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        item: "Kunne ikke tolkes",
        brand: null,
        condition: "ukjent",
        estimatedValueNok: 0,
        note: "KI-svaret var ikke gyldig JSON",
      };
    }

    results.push({ fileName: file.name, ...parsed });
  }

  const totalNok = results.reduce((sum, r) => sum + (r.estimatedValueNok || 0), 0);

  return NextResponse.json({ results, totalNok });
}

