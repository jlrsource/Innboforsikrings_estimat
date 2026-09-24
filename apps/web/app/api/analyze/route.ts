import { NextRequest, NextResponse } from "next/server";
import { Mistral } from "@mistralai/mistralai";

export const maxDuration = 60;
const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
const VISION_MODEL = process.env.MISTRAL_VISION_MODEL ?? "pixtral-12b-latest";
const TEXT_MODEL = process.env.MISTRAL_TEXT_MODEL ?? "ministral-8b-latest";


type ItemEstimate = {
  id: string;
  source: "bilde" | "tekst";
  item: string;
  brand: string | null;
  estimatedNewPriceNok: number;
  note: string | null;
};

type Recommendation = {
  recommendedSumNok: number;
  reasoning: string;
  coverageGapNok: number | null;
  coverageMessage: string | null;
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
  const textItemsRaw = formData.get("textItems");
  const textItems: string[] = textItemsRaw ? JSON.parse(textItemsRaw as string) : [];

  const currentSumRaw = formData.get("currentSum");
  const currentSumNok =
    currentSumRaw && !Number.isNaN(Number(currentSumRaw)) ? Number(currentSumRaw) : null;

  if (files.length === 0 && textItems.length === 0) {
    return NextResponse.json({ error: "Ingen bilder eller gjenstander mottatt" }, { status: 400 });
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
              text: `Se på bildet og identifiser gjenstanden. Svar KUN med gyldig JSON på nøyaktig dette formatet, ingen annen tekst, ingen markdown-kodeblokk:
{"item": "kort navn på gjenstanden", "brand": "merke hvis synlig, ellers null", "estimatedNewPriceNok": hva det ville kostet å kjøpe tilsvarende nytt i dag som heltall i norske kroner, "note": kort forklaring på anslaget, eller null}`,
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
    const parsed = parseJson<Omit<ItemEstimate, "id" | "source">>(text, {
      item: "Kunne ikke tolkes",
      brand: null,
      estimatedNewPriceNok: 0,
      note: "KI-svaret var ikke gyldig JSON",
    });

    results.push({ id: file.name, source: "bilde", ...parsed });
  }

  for (const name of textItems) {
    const response = await mistral.chat.complete({
      model: TEXT_MODEL,
      messages: [
        {
          role: "user",
          content: `En bruker har oppgitt at de eier: "${name}". Du har ikke noe bilde, bare navnet. Anslå hva det ville kostet å kjøpe tilsvarende nytt i dag. Svar KUN med gyldig JSON på nøyaktig dette formatet, ingen annen tekst, ingen markdown-kodeblokk:
{"item": "kort navn på gjenstanden", "brand": "merke hvis det fremgår av navnet, ellers null", "estimatedNewPriceNok": nypris i dag som heltall i norske kroner, "note": kort forklaring, eller null}`,
        },
      ],
    });

    const text = extractText(response.choices?.[0]?.message?.content);
    const parsed = parseJson<Omit<ItemEstimate, "id" | "source">>(text, {
      item: name,
      brand: null,
      estimatedNewPriceNok: 0,
      note: "KI-svaret var ikke gyldig JSON",
    });

    results.push({ id: `tekst:${name}`, source: "tekst", ...parsed });
  }

  const totalReplacementValueNok = results.reduce((sum, r) => sum + (r.estimatedNewPriceNok || 0), 0);

  const currentSumBlock =
    currentSumNok !== null
      ? `\n\nBrukeren har oppgitt at de i dag har en innboforsikringssum på ${currentSumNok} kr.
I tillegg til anbefalingen, regn ut differansen mellom anbefalt sum og denne oppgitte summen (anbefalt sum minus oppgitt sum), og fortell brukeren tydelig om de er underforsikret eller overforsikret, og med hvor mye. Fyll ut "coverageGapNok" med denne differansen som et heltall (positivt tall = underforsikret, negativt tall = overforsikret), og "coverageMessage" med en kort, tydelig setning om dette (f.eks. "Du er trolig underforsikret med 120 000 kr" eller "Du ligger 50 000 kr over anbefalt sum, det ser bra ut").`
      : `\n\nBrukeren har ikke oppgitt hva de har i innboforsikring i dag, så sett "coverageGapNok" og "coverageMessage" til null.`;

  const recommendationResponse = await mistral.chat.complete({
    model: TEXT_MODEL,
    messages: [
      {
        role: "user",
        content: `Du er en norsk forsikringsrådgiver-assistent. Brukeren har registrert eiendelene sine (noen via bilde, noen via tekst), og hver gjenstand er anslått av en KI. Her er listen:

${JSON.stringify(results, null, 2)}

Samlet nypris (gjenanskaffelsesverdi) for alt registrert: ${totalReplacementValueNok} kr

Gi en anbefaling for hvor høy innboforsikringssum brukeren bør sette. Ta hensyn til at:
- Innboforsikring i Norge skal dekke gjenanskaffelsesverdi, det brukeren allerede har oppgitt.
- Brukeren har sannsynligvis ikke registrert alt (klær, kjøkkenutstyr, mindre ting), så det bør legges på en sikkerhetsmargin.
- Underforsikring i Norge fører til proporsjonalt redusert utbetaling ved skade, så det er tryggere å sette summen litt for høyt enn for lavt.
- Rund av til et vanlig forsikringstrinn (f.eks. nærmeste 50 000 kr).${currentSumBlock}

Svar KUN med gyldig JSON, ingen annen tekst, ingen markdown-kodeblokk:
{"recommendedSumNok": et rundt tall i norske kroner, "reasoning": "en kort, konkret forklaring på 3-5 setninger", "coverageGapNok": et heltall eller null, "coverageMessage": "en kort setning" eller null}`,
      },
    ],
  });

  const recText = extractText(recommendationResponse.choices?.[0]?.message?.content);
  const fallbackRecommendedSum = Math.round((totalReplacementValueNok * 1.2) / 50000) * 50000;
  const fallbackGap = currentSumNok !== null ? fallbackRecommendedSum - currentSumNok : null;
  const recommendation = parseJson<Recommendation>(recText, {
    recommendedSumNok: fallbackRecommendedSum,
    reasoning: "Automatisk anbefaling kunne ikke genereres, dette er et enkelt overslag med 20 % margin.",
    coverageGapNok: fallbackGap,
    coverageMessage:
      fallbackGap === null
        ? null
        : fallbackGap > 0
          ? `Du er trolig underforsikret med ${fallbackGap.toLocaleString("nb-NO")} kr.`
          : `Du ligger ${Math.abs(fallbackGap).toLocaleString("nb-NO")} kr over anbefalt sum.`,
  });

  return NextResponse.json({ results, totalReplacementValueNok, recommendation });
}


