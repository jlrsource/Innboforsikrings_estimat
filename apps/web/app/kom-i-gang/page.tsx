"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { SiteHeader } from "../components/SiteHeader";

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
  coverageGapNok: number | null;
  coverageMessage: string | null;
};

type AnalyzeResponse = {
  results: ItemEstimate[];
  totalReplacementValueNok: number;
  recommendation: Recommendation;
};

const MAX_IMAGE_DIMENSION = 1280;
const JPEG_QUALITY = 0.8;

// Skalerer ned og konverterer til JPEG slik at forespørselen holder seg under Vercels grense på 4,5 MB.
async function compressImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export default function KomIGang() {
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [textItems, setTextItems] = useState<string[]>([]);
  const [newTextItem, setNewTextItem] = useState("");
  const [currentSum, setCurrentSum] = useState("");
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const folderRef = useRef<HTMLDialogElement>(null);

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

  function clearImages() {
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    closeFolder();
  }

  function openFolder() {
    folderRef.current?.showModal();
  }

  function closeFolder() {
    folderRef.current?.close();
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

    try {
      const formData = new FormData();
      const compressed = await Promise.all(images.map((img) => compressImage(img.file)));
      compressed.forEach((file) => formData.append("images", file));
      formData.append("textItems", JSON.stringify(textItems));

      const trimmedSum = currentSum.trim();
      if (trimmedSum !== "" && !Number.isNaN(Number(trimmedSum)) && Number(trimmedSum) >= 0) {
        formData.append("currentSum", trimmedSum);
      }

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
      <SiteHeader />
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
            <svg className={styles.zoneIcon} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
            <span className={styles.zoneTitle}>Velg bilder</span>
            <span className={styles.zoneHint}>Klikk her, eller dra bildene hit</span>
          </label>

          <label className={styles.folderZone}>
            <input
              type="file"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              className={styles.fileInput}
              {...({ webkitdirectory: "true", directory: "true" } as Record<string, string>)}
            />
            <svg className={styles.zoneIcon} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 6h6l2 2h10v11H3z" />
            </svg>
            <span className={styles.zoneTitle}>Velg en mappe</span>
            <span className={styles.zoneHint}>Alle bildene i mappen</span>
          </label>
        </div>

        {images.length > 0 && (
          <button type="button" className={styles.folder} onClick={openFolder}>
            <svg className={styles.folderIcon} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 6h6l2 2h10v11H3z" />
            </svg>
            <span className={styles.folderText}>
              <span className={styles.folderTitle}>Opplastede bilder</span>
              <span className={styles.folderCount}>
                {images.length} bilde{images.length > 1 ? "r" : ""}
              </span>
            </span>
            <span className={styles.folderAction}>Åpne</span>
          </button>
        )}

        <dialog
          ref={folderRef}
          className={styles.dialog}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeFolder();
          }}
        >
          <div className={styles.dialogHeader}>
            <h2 className={styles.dialogTitle}>
              Opplastede bilder <span className={styles.dialogCount}>({images.length})</span>
            </h2>
            <button type="button" className={styles.dialogClose} onClick={closeFolder} aria-label="Lukk">
              ×
            </button>
          </div>

          {images.length === 0 ? (
            <p className={styles.dialogEmpty}>Ingen bilder i mappen.</p>
          ) : (
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

          <div className={styles.dialogFooter}>
            {images.length > 0 && (
              <button type="button" className={styles.dialogClear} onClick={clearImages}>
                Fjern alle
              </button>
            )}
            <button type="button" className={styles.dialogDone} onClick={closeFolder}>
              Ferdig
            </button>
          </div>
        </dialog>

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
          <>
            <div className={styles.compareBlock}>
              <label className={styles.compareLabel} htmlFor="currentSum">
                Hva har du i innboforsikring i dag? (valgfritt)
              </label>
              <div className={styles.compareInputRow}>
                <input
                  id="currentSum"
                  type="number"
                  min={0}
                  placeholder="F.eks. 500000"
                  value={currentSum}
                  onChange={(e) => setCurrentSum(e.target.value)}
                  className={styles.compareInput}
                />
                <span className={styles.compareSuffix}>kr</span>
              </div>
            </div>

            <button
              type="button"
              className={styles.analyzeButton}
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className={styles.spinner} aria-hidden="true" />
                  Analyserer …
                </>
              ) : (
                `Analyser ${totalCount} gjenstand${totalCount > 1 ? "er" : ""}`
              )}
            </button>
          </>
        )}

        {error && (
          <p className={styles.message} role="alert">
            {error}
          </p>
        )}

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

              {data.recommendation.coverageMessage && (
                <p
                  className={
                    data.recommendation.coverageGapNok !== null && data.recommendation.coverageGapNok > 0
                      ? styles.compareWarning
                      : styles.compareOk
                  }
                >
                  {data.recommendation.coverageMessage}
                </p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

