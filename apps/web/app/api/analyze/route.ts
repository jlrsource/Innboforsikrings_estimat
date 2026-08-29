import { NextRequest, NextResponse } from "next/server";
import { Mistral } from "@mistralai/mistralai";

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

const VISION_MODEL = process.env.MISTRAL_VISION_MODEL ?? "mistral-small-latest";
const TEXT_MODEL = process.env.MISTRAL_TEXT_MODEL ?? "mistral-small-latest";

type ItemEstimate = {
  fileName: string;
  item: string;
  brand: string | null;
  condition: string;
  estimatedAgeYears: number | null;
  estimatedValueNok: number;
  estimatedNewPriceNok: number;
  note: string | null;
};

type Recommendation = {
  recommendedSumNok: number;
  reasoning: string;
};

function extractText(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    return raw.map((c) => ("text" in c ? c.text : "")).join("");
  }
  return "{}";
}

function parseJson<T>(text: string, fallback: T): T {
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

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
      model: VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Se på bildet og identifiser gjenstanden. Vurder omtrentlig alder ut fra hvor slitt eller moderne den ser ut. Svar KUN med gyldig JSON på nøyaktig dette formatet, ingen annen tekst, ingen markdown-kodeblokk:
{"item": "kort navn på gjenstanden", "brand": "merke hvis synlig, ellers null", "condition": "ny/god/brukt/slitt", "estimatedAgeYears": omtrentlig alder i år som heltall (gjett hvis usikker), "estimatedValueNok": brukt/gjenkjøpsverdi i dag som heltall i norske kroner, "estimatedNewPriceNok": hva det ville kostet å kjøpe tilsvarende nytt i dag som heltall i norske kroner, "note": kort forklaring på anslaget, eller null}`,
            },
            {
              type: "image_url",
              imageUrl: `data:${file.type};base64,${base64}`,
            },
          ],
        },
      ],
    });

    const text = extractText(response.choices?.[0]?.message?.content);
    const parsed = parseJson<Omit<ItemEstimate, "fileName">>(text, {
      item: "Kunne ikke tolkes",
      brand: null,
      condition: "ukjent",
      estimatedAgeYears: null,
      estimatedValueNok: 0,
      estimatedNewPriceNok: 0,
      note: "KI-svaret var ikke gyldig JSON",
    });

    results.push({ fileName: file.name, ...parsed });
  }

  const totalUsedValueNok = results.reduce((sum, r) => sum + (r.estimatedValueNok || 0), 0);
  const totalReplacementValueNok = results.reduce((sum, r) => sum + (r.estimatedNewPriceNok || 0), 0);

  const recommendationResponse = await mistral.chat.complete({
    model: TEXT_MODEL,
    messages: [
      {
        role: "user",
        content: `Du er en norsk forsikringsrådgiver-assistent. Brukeren har fotografert eiendelene sine, og hver gjenstand er anslått av en KI. Her er listen:

${JSON.stringify(results, null, 2)}

Samlet brukt/gjenkjøpsverdi i dag: ${totalUsedValueNok} kr
Samlet nypris (gjenanskaffelsesverdi): ${totalReplacementValueNok} kr

Gi en anbefaling for hvor høy innboforsikringssum brukeren bør sette. Ta hensyn til at:
- Innboforsikring i Norge skal dekke gjenanskaffelsesverdi (hva det koster å kjøpe alt nytt igjen), ikke brukt verdi.
- Brukeren har sannsynligvis ikke fotografert alt (klær, kjøkkenutstyr, mindre ting), så det bør legges på en sikkerhetsmargin.
- Underforsikring i Norge fører til at forsikringsselskapet kan redusere utbetalingen proporsjonalt ved skade, så det er tryggere å sette summen litt for høyt enn for lavt.
- Rund av til et vanlig forsikringstrinn (f.eks. nærmeste 50 000 kr).

Svar KUN med gyldig JSON, ingen annen tekst, ingen markdown-kodeblokk:
{"recommendedSumNok": et rundt tall i norske kroner, "reasoning": "en kort, konkret forklaring på 3-5 setninger på hvorfor akkurat denne summen"}`,
      },
    ],
  });

  const recText = extractText(recommendationResponse.choices?.[0]?.message?.content);
  const recommendation = parseJson<Recommendation>(recText, {
    recommendedSumNok: Math.round((totalReplacementValueNok * 1.2) / 50000) * 50000,
    reasoning: "Automatisk anbefaling kunne ikke genereres, dette er et enkelt overslag med 20 % margin på gjenanskaffelsesverdien.",
  });

  return NextResponse.json({
    results,
    totalUsedValueNok,
    totalReplacementValueNok,
    recommendation,
  });
}
