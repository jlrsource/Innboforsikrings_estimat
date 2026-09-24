import Link from "next/link";
import styles from "./SiteHeader.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          <svg className={styles.logo} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z" />
            <path className={styles.logoCheck} d="m8.5 12 2.5 2.5 4.5-5" />
          </svg>
          Innboestimat
        </Link>
      </div>
    </header>
  );
}
