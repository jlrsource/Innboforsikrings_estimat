"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";

type SelectedImage = {
  file: File;
  previewUrl: string;
};

export default function KomIGang() {
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const newImages = Array.from(fileList).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...newImages]);
    setMessage(null);
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  }

  function handleAnalyze() {
    setMessage("Analyse er ikke koblet til backend ennå, det kommer i neste steg.");
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Link href="/" className={styles.back}>
          ← Tilbake
        </Link>

        <h1 className={styles.title}>Last opp bilder</h1>
        <p className={styles.subhead}>
          Velg bilder av det du eier. Du kan legge til flere etter hvert.
        </p>

        <label className={styles.dropzone}>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className={styles.fileInput}
          />
          <span>Klikk for å velge bilder, eller dra dem hit</span>
        </label>

        {images.length > 0 && (
          <>
            <div className={styles.grid}>
              {images.map((image, index) => (
                <div className={styles.thumb} key={image.previewUrl}>
                  <img src={image.previewUrl} alt={image.file.name} />
                  <button
                    type="button"
                    className={styles.remove}
                    onClick={() => removeImage(index)}
                    aria-label={`Fjern ${image.file.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button type="button" className={styles.analyzeButton} onClick={handleAnalyze}>
              Analyser {images.length} bilde{images.length > 1 ? "r" : ""}
            </button>
          </>
        )}

        {message && <p className={styles.message}>{message}</p>}
      </main>
    </div>
  );
}