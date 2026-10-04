export type Insurer = {
  id: string;
  name: string;
  url: string;
  description: string;
};

// Faste lenker slik at KI-en aldri finner på URL-er selv. Sjekk at lenkene fortsatt virker innimellom.
export const INSURERS: Insurer[] = [
  {
    id: "gjensidige",
    name: "Gjensidige",
    url: "https://www.gjensidige.no/forsikring/innboforsikring",
    description: "Norges største skadeforsikringsselskap. Kundene får kundeutbytte via Gjensidigestiftelsen, og det gis rabatt ved flere forsikringer.",
  },
  {
    id: "if",
    name: "If",
    url: "https://www.if.no/privat/forsikring/bolig/innboforsikring",
    description: "Stor nordisk aktør med flere dekningsnivåer og samlerabatt når man har flere forsikringer der.",
  },
  {
    id: "tryg",
    name: "Tryg",
    url: "https://www.tryg.no/forsikringer/bolig-og-innbo/innboforsikring",
    description: "Stor nordisk aktør med flere dekningsnivåer og samlerabatt ved flere forsikringer.",
  },
  {
    id: "sparebank1",
    name: "SpareBank 1 (Fremtind)",
    url: "https://www.sparebank1.no/nb/bank/privat/forsikring/innboforsikring.html",
    description: "Levert av Fremtind. Gunstig for de som allerede er kunde i en SpareBank 1-bank.",
  },
  {
    id: "dnb",
    name: "DNB (Fremtind)",
    url: "https://www.dnb.no/forsikring/innboforsikring",
    description: "Levert av Fremtind. Gunstig for de som allerede er kunde i DNB.",
  },
  {
    id: "storebrand",
    name: "Storebrand",
    url: "https://www.storebrand.no/privat/forsikring/innboforsikring",
    description: "Ofte konkurransedyktig pris på innbo, særlig for de som samler flere produkter der.",
  },
  {
    id: "frende",
    name: "Frende",
    url: "https://www.frende.no/forsikringer/innboforsikring/",
    description: "Mindre selskap eid av lokale sparebanker, kjent for høy kundetilfredshet.",
  },
  {
    id: "klp",
    name: "KLP",
    url: "https://www.klp.no/forsikring/innboforsikring",
    description: "Ofte gunstige priser for medlemmer med pensjon i KLP, typisk ansatte i kommune og helseforetak.",
  },
];
