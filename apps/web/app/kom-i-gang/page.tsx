"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";

type SelectedImage = {
  file: File;
  previewUrl: string;
};

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
};

type AnalyzeResponse = {
  results: ItemEstimate[];
  totalReplacementValueNok: number;
  recommendation: Recommendation;
};

export default function KomIGang() {
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [textItems, setTextItems] = useState<string[]>([]);
  const [newTextItem, setNewTextItem] = useState("");
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const imageFiles = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    const newImages = imageFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...newImages]);
    setData(null);
    setError(null);
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  }

  function handleAddTextItem(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newTextItem.trim();
    if (!trimmed) return;
    setTextItems((prev) => [...prev, trimmed]);
    setNewTextItem("");
    setData(null);
  }

  function removeTextItem(index: number) {
    setTextItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    setData(null);

    const formData = new FormData();
    images.forEach((img) => formData.append("images", img.file));
    formData.append("textItems", JSON.stringify(textItems));

    try {
      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Analyse feilet");
      const json: AnalyzeResponse = await res.json();
      setData(json);
    } catch (err) {
      setError("Noe gikk galt under analysen. Prøv igjen.");
    } finally {
      setLoading(false);
    }
  }

  const totalCount = images.length + textItems.length;

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Link href="/" className={styles.back}>
          ← Tilbake
        </Link>

        <h1 className={styles.title}>Last opp bilder</h1>
        <p className={styles.subhead}>
          Velg bilder av det du eier, eller en hel mappe med bilder. Du kan også skrive inn gjenstander uten bilde.
        </p>

        <div className={styles.uploadRow}>
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

          <label className={styles.folderZone}>
            <input
              type="file"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              className={styles.fileInput}
              {...({ webkitdirectory: "true", directory: "true" } as Record<string, string>)}
            />
            <span>Eller velg en hel mappe</span>
          </label>
        </div>

        {images.length > 0 && (
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
        )}

        <section className={styles.manualSection}>
          <h2 className={styles.manualHeading}>Legg til gjenstand uten bilde</h2>
          <p className={styles.manualHint}>
            Skriv inn navnet, f.eks. «iPhone 13», så anslår KI-en prisen basert på navnet når du analyserer.
          </p>
          <form className={styles.manualForm} onSubmit={handleAddTextItem}>
            <input
              type="text"
              placeholder="Navn på gjenstand"
              value={newTextItem}
              onChange={(e) => setNewTextItem(e.target.value)}
              className={styles.manualInput}
            />
            <button type="submit" className={styles.manualAddButton}>
              Legg til
            </button>
          </form>

          {textItems.length > 0 && (
            <ul className={styles.textItemList}>
              {textItems.map((name, index) => (
                <li key={`${name}-${index}`} className={styles.textItemChip}>
                  {name}
                  <button
                    type="button"
                    className={styles.manualRemove}
                    onClick={() => removeTextItem(index)}
                    aria-label={`Fjern ${name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {totalCount > 0 && (
          <button
            type="button"
            className={styles.analyzeButton}
            onClick={handleAnalyze}
            disabled={loading}
          >
            {loading
              ? "Analyserer …"
              : `Analyser ${totalCount} gjenstand${totalCount > 1 ? "er" : ""}`}
          </button>
        )}

        {error && <p className={styles.message}>{error}</p>}

        {data && (
          <>
            <div className={styles.results}>
              {data.results.map((r) => (
                <div className={styles.resultRow} key={r.id}>
                  <div>
                    <strong>{r.item}</strong>
                    {r.brand && <span className={styles.resultMeta}> · {r.brand}</span>}
                    <span className={styles.resultMeta}> · fra {r.source}</span>
                  </div>
                  <div className={styles.resultValue}>
                    {r.estimatedNewPriceNok.toLocaleString("nb-NO")} kr
                  </div>
                </div>
              ))}
              <div className={styles.total}>
                <span>Samlet nypris (gjenanskaffelse)</span>
                <span>{data.totalReplacementValueNok.toLocaleString("nb-NO")} kr</span>
              </div>
            </div>

            <div className={styles.recommendation}>
              <p className={styles.recommendationLabel}>Anbefalt forsikringssum</p>
              <p className={styles.recommendationValue}>
                {data.recommendation.recommendedSumNok.toLocaleString("nb-NO")} kr
              </p>
              <p className={styles.recommendationReasoning}>{data.recommendation.reasoning}</p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}