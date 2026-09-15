# Innboestimat

Innboestimat er en webapp som bruker KI til å anslå hva du bør ha i innboforsikring, basert på bilder (eller bare navn) av tingene du eier.

## Bakgrunnen

Jeg studerer Ingeniørvitenskap og IKT ved NTNU, og ville lage et fullstack-prosjekt for å lære meg noe nytt utenom pensum, ikke for å bygge et ferdig produkt. Da jeg lette etter en idé, spurte jeg rett og slett farfar hva slags webapp han kunne tenkt seg å bruke. Svaret hans ble utgangspunktet for prosjektet: noe som kunne se på tingene i huset hans og fortelle ham om innboforsikringen holder mål.

Prosjektet er ikke laget for nøyaktighet eller for faktisk å erstatte en forsikringsrådgiver, det er laget for gøy og for å lære.

## Hva appen gjør

- Last opp bilder av eiendelene dine, ett og ett eller en hel mappe med bilder samtidig.
- Legg til gjenstander du ikke har bilde av, bare skriv inn navnet (f.eks. «iPhone 13»), så anslår KI-en prisen ut fra navnet alene.
- KI-en identifiserer hver gjenstand og anslår hva den ville kostet å kjøpe tilsvarende ny i dag (gjenanskaffelsesverdi, som er det norsk innboforsikring faktisk skal dekke).
- Appen summerer alt og gir en anbefalt forsikringssum, med en kort begrunnelse som tar hensyn til at man garantert ikke har fotografert alt man eier (klær, kjøkkenutstyr, småting), og at underforsikring i Norge gir proporsjonalt redusert utbetaling ved skade.
- Du kan valgfritt oppgi hva du har i forsikring i dag, så forteller KI-en deg om du ligger for høyt eller for lavt, og med hvor mye.

## Hvordan det er bygget

Monorepo satt opp med Turborepo og pnpm, med en Next.js-app (`apps/web`) som per nå er hele produktet. Det er ingen separat backend, KI-kallene går gjennom Next.js sine egne Route Handlers (`apps/web/app/api/analyze/route.ts`).

KI-leverandøren er Mistral (`mistral-small-latest`). Hvert bilde sendes til et vision-kall som identifiserer gjenstanden og anslår nypris, tekst-gjenstander sendes til et rent tekst-kall med samme mål. Til slutt går hele listen inn i ett siste kall som genererer den samlede forsikringsanbefalingen.

**Stack:** Next.js (App Router), TypeScript, CSS-moduler, Turborepo, pnpm, Mistral AI.

## Kjøre lokalt

```bash
pnpm install
```

Opprett `apps/web/.env.local`:

```
MISTRAL_API_KEY=din-egen-nøkkel-her
```

Start dev-serveren:

```bash
pnpm dev
```

Appen kjører da på `http://localhost:3000`.

## Kjente begrensninger

- Estimatene er ikke spesielt treffsikre ennå. Kontoen som brukes har kun tilgang til den minste Mistral-modellen, og det ligger ingen kalibrering mot faktiske markedspriser bak tallene.
- Ingen persistens. Resultatene forsvinner ved sideoppdatering, det er ingen database koblet til.
- Dette er ikke, og skal ikke forveksles med, en offisiell forsikringsvurdering.

## Mulige neste steg

- Persistens, slik at gjenstandslisten består mellom økter
- Kalibrering av prisestimatene mot ekte markedsdata
- Mobilapp (strukturen i monorepoet er allerede klar for `apps/mobile`)
- En ordentlig styling-runde
