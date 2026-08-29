"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";

type SelectedImage = {
  file: File;
  previewUrl: string;
};

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

type AnalyzeResponse = {
  results: ItemEstimate[];
  totalUsedValueNok: number;
  totalReplacementValueNok: number;
  recommendation: Recommendation;
};

export default function KomIGang() {
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const newImages = Array.from(fileList).map((file) => ({
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

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    setData(null);

    const formData = new FormData();
    images.forEach((img) => formData.append("images", img.file));

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

            <button
              type="button"
              className={styles.analyzeButton}
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading
                ? "Analyserer …"
                : `Analyser ${images.length} bilde${images.length > 1 ? "r" : ""}`}
            </button>
          </>
        )}

        {error && <p className={styles.message}>{error}</p>}

        {data && (
          <>
            <div className={styles.results}>
              {data.results.map((r) => (
                <div className={styles.resultRow} key={r.fileName}>
                  <div>
                    <strong>{r.item}</strong>
                    {r.brand && <span className={styles.resultMeta}> · {r.brand}</span>}
                    <span className={styles.resultMeta}> · {r.condition}</span>
                    {r.estimatedAgeYears !== null && (
                      <span className={styles.resultMeta}> · ca. {r.estimatedAgeYears} år</span>
                    )}
                  </div>
                  <div className={styles.resultValue}>
                    {r.estimatedValueNok.toLocaleString("nb-NO")} kr
                  </div>
                </div>
              ))}
              <div className={styles.total}>
                <span>Samlet brukt verdi</span>
                <span>{data.totalUsedValueNok.toLocaleString("nb-NO")} kr</span>
              </div>
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