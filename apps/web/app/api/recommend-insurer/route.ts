import { NextRequest, NextResponse } from "next/server";
import { mistral, TEXT_MODEL, extractText, parseJson } from "../../lib/mistral";
import { INSURERS } from "../../lib/insurers";

export const maxDuration = 60;

type RequestBody = {
  recommendedSumNok: number;
  items: { item: string; brand: string | null; estimatedNewPriceNok: number }[];
  bank: string;
  otherInsurance: string;
  publicSector: "ja" | "nei" | "";
};

type RawInsurerRecommendation = {
  insurerId: string | null;
  deal: string | null;
  reasoning: string | null;
};

export type InsurerRecommendation = {
  insurerId: string;
  name: string;
  url: string;
  deal: string | null;
  reasoning: string;
};

function shuffle<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as RequestBody;
  const bank = body.bank?.trim() ?? "";
  const otherInsurance = body.otherInsurance?.trim() ?? "";
  const publicSector = body.publicSector ?? "";

  if (!bank && !otherInsurance && !publicSector) {
    return NextResponse.json({ error: "Svar på minst ett av spørsmålene" }, { status: 400 });
  }

  const answers = [
    `- Bank: ${bank || "ikke oppgitt"}`,
    `- Andre forsikringer i dag (og hos hvilket selskap): ${otherInsurance || "ikke oppgitt"}`,
    `- Jobber i kommune, fylke eller helseforetak: ${publicSector || "ikke oppgitt"}`,
  ].join("\n");

  // Rekkefølgen blandes så modellen ikke favoriserer selskapet som står først.
  const insurerList = shuffle(INSURERS).map(({ id, name, description }) => ({ id, name, description }));

  const response = await mistral.chat.complete({
    model: TEXT_MODEL,
    messages: [
      {
        role: "user",
        content: `Du er en norsk forsikringsrådgiver-assistent. Brukeren skal kjøpe innboforsikring med en forsikringssum på ${body.recommendedSumNok} kr. Dette er eiendelene som er registrert:

${JSON.stringify(body.items, null, 2)}

Brukeren har svart på dette:
${answers}

Velg det forsikringsselskapet som trolig gir brukeren best tilbud. Du MÅ velge ett selskap fra denne listen, og bruke "id"-feltet nøyaktig slik det står:

${JSON.stringify(insurerList, null, 2)}

Ta hensyn til at:
- Samlerabatt er ofte den største besparelsen. Har brukeren allerede andre forsikringer hos et selskap i listen, er det som regel det beste valget.
- Kunder i DNB eller en SpareBank 1-bank får ofte fordeler hos bankens forsikring.
- Ansatte i kommune, fylke eller helseforetak har ofte pensjon i KLP og kan få gunstige priser der.
- Baser valget på svarene over, ikke på hvilket selskap som er størst eller står først i listen.

Fyll ut:
- "insurerId": id-en til selskapet du anbefaler.
- "deal": en kort beskrivelse av den relevante fordelen eller rabatten, basert KUN på beskrivelsen i listen og svarene over. Ikke finn på konkrete priser, prosentsatser eller kampanjer. Bruk null hvis det ikke er noen spesiell fordel å trekke frem.
- "reasoning": 2-3 setninger om hvorfor dette selskapet passer, med henvisning til svarene. Avslutt med at det lønner seg å hente tilbud fra flere selskaper for å sammenligne prisen.

"deal" og "reasoning" vises direkte til brukeren, så skriv dem i andre person: henvend deg til brukeren som "du" (f.eks. "Du har allerede bilforsikring i If, så ..."). Ikke bruk ordet "brukeren" i disse feltene.

Svar KUN med gyldig JSON, ingen annen tekst, ingen markdown-kodeblokk:
{"insurerId": "id fra listen", "deal": "kort fordel" eller null, "reasoning": "forklaring på 2-3 setninger"}`,
      },
    ],
  });

  const text = extractText(response.choices?.[0]?.message?.content);
  const raw = parseJson<RawInsurerRecommendation>(text, { insurerId: null, deal: null, reasoning: null });

  // Lenken hentes alltid fra listen vår; ukjent id fra KI-en regnes som feil.
  const chosen = INSURERS.find((i) => i.id === raw.insurerId?.trim().toLowerCase());
  if (!chosen) {
    return NextResponse.json({ error: "Kunne ikke lage en anbefaling" }, { status: 502 });
  }

  const insurer: InsurerRecommendation = {
    insurerId: chosen.id,
    name: chosen.name,
    url: chosen.url,
    deal: raw.deal || null,
    reasoning: raw.reasoning || chosen.description,
  };

  return NextResponse.json({ insurer });
}
