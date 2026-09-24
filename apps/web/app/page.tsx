
import Link from "next/link";
import styles from "./page.module.css";
import { SiteHeader } from "./components/SiteHeader";

const STEPS = [
  {
    title: "Fotografer",
    body: "Gå gjennom hjemmet ditt og ta bilder av det du eier, møbler, elektronikk, sykler, alt som teller som innbo.",
  },
  {
    title: "Analyser",
    body: "Last opp bildene enten hver for seg eller i en mappe. KI-en ser bildene og anslår hva hver gjenstand er verdt, basert på hva den gjenkjenner.",
  },
  {
    title: "Se totalen",
    body: "Du sitter igjen med en samlet sum, det konkrete grunnlaget du trenger for å vurdere forsikringen din.",
  },
];

export default function Home() {
  return (
    <div className={styles.page}>
      <SiteHeader />
      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Verdivurdering av innbo</p>
          <h1 className={styles.headline}>
            Vet du hva du eier?
          </h1>
          <p className={styles.subhead}>
            De fleste vet ikke hva innboet sitt faktisk er verdt. Ta bilder av
            det du eier, la KI-en anslå verdien, og få en reell sum å
            vurdere forsikringen din ut fra.
          </p>
          <Link href="/kom-i-gang" className={styles.cta}>
            Kom i gang <span aria-hidden="true">→</span>
          </Link>
        </section>

        <section className={styles.steps}>
          {STEPS.map((step, i) => (
            <div className={styles.step} key={step.title}>
              <span className={styles.stepNumber}>0{i + 1}</span>
              <h2 className={styles.stepTitle}>{step.title}</h2>
              <p className={styles.stepBody}>{step.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

