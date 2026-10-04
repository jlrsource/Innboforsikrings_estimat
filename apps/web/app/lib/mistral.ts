import { Mistral } from "@mistralai/mistralai";

export const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
export const VISION_MODEL = process.env.MISTRAL_VISION_MODEL ?? "ministral-14b-latest";
export const TEXT_MODEL = process.env.MISTRAL_TEXT_MODEL ?? "ministral-14b-latest";

export function extractText(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    return raw.map((c) => ("text" in c ? c.text : "")).join("");
  }
  return "{}";
}

export function parseJson<T>(text: string, fallback: T): T {
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}
