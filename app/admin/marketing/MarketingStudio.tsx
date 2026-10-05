"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import styles from "../admin.module.css";

type Format = "post" | "story";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg"]);

export default function MarketingStudio({
  instagramConnected,
  instagramUsername,
}: {
  instagramConnected: boolean;
  instagramUsername: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [format, setFormat] = useState<Format>("post");
  const [caption, setCaption] = useState("");
  const [dragging, setDragging] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [publishMessage, setPublishMessage] = useState<{
    kind: "success" | "error";
    text: string;
    permalink?: string | null;
  } | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function selectFile(candidate: File | null) {
    setPublishMessage(null);
    setFileError(null);
    if (!candidate) return;
    if (!ACCEPTED_TYPES.has(candidate.type)) {
      setFile(null);
      setFileError("Utilisez un fichier PNG ou JPG exporté depuis Canva.");
      return;
    }
    if (candidate.size > MAX_IMAGE_BYTES) {
      setFile(null);
      setFileError("Le visuel dépasse 10 Mo.");
      return;
    }
    setFile(candidate);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    selectFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function publishToInstagram() {
    if (!file || !instagramConnected || publishing) return;
    const confirmed = window.confirm(
      format === "story"
        ? `Publier ce visuel en Story sur @${instagramUsername} ?`
        : `Publier ce visuel sur @${instagramUsername} ?`,
    );
    if (!confirmed) return;

    setPublishing(true);
    setPublishMessage(null);
    try {
      const form = new FormData();
      form.set("image", file);
      form.set("format", format);
      form.set("caption", caption);

      const response = await fetch("/api/admin/instagram/publish", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        username?: string;
        permalink?: string | null;
      };
      if (!response.ok) throw new Error(payload.error || "Publication Instagram impossible.");

      setPublishMessage({
        kind: "success",
        text:
          format === "story"
            ? `Story publiée sur @${payload.username || instagramUsername}.`
            : `Publication envoyée sur @${payload.username || instagramUsername}.`,
        permalink: payload.permalink || null,
      });
    } catch (error) {
      setPublishMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Publication Instagram impossible.",
      });
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className={styles.instagramImportStudio}>
      <section className={`${styles.card} ${styles.instagramImportCard}`}>
        <div className={styles.marketingSectionHead}>
          <span>01</span>
          <div>
            <strong>Importer le visuel Canva</strong>
            <small>Exportez votre création depuis Canva en PNG ou JPG, puis ajoutez-la ici.</small>
          </div>
        </div>

        <div
          className={`${styles.instagramDropzone} ${dragging ? styles.instagramDropzoneActive : ""}`}
          onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input ref={inputRef} type="file" accept="image/png,image/jpeg" onChange={onFileChange} hidden />
          <div className={styles.instagramDropIcon} aria-hidden="true">↑</div>
          <strong>{file ? "Changer de visuel" : "Déposez votre visuel ici"}</strong>
          <span>PNG ou JPG · 10 Mo maximum</span>
          <button className={styles.buttonSecondary} type="button" onClick={() => inputRef.current?.click()}>
            {file ? "Choisir un autre fichier" : "Choisir un fichier"}
          </button>
          {file ? <small className={styles.instagramFileName}>{file.name}</small> : null}
        </div>
        {fileError ? <div className={`${styles.marketingPublishStatus} ${styles.marketingPublishError}`}>{fileError}</div> : null}

        <div className={styles.marketingSectionHead}>
          <span>02</span>
          <div>
            <strong>Publication Instagram</strong>
            <small>Choisissez le format et préparez la légende avant publication.</small>
          </div>
        </div>

        <div className={styles.marketingChoiceBlock}>
          <span>Format</span>
          <div className={styles.marketingFormatCards}>
            <button type="button" data-active={format === "post"} onClick={() => setFormat("post")}>
              <strong>Publication</strong><small>Fil Instagram</small>
            </button>
            <button type="button" data-active={format === "story"} onClick={() => setFormat("story")}>
              <strong>Story</strong><small>Format vertical conseillé</small>
            </button>
          </div>
        </div>

        <label className={styles.marketingField}>
          <span>Légende Instagram {format === "story" ? "(non utilisée pour une Story)" : ""}</span>
          <textarea
            className={styles.marketingCaption}
            value={caption}
            onChange={(event) => setCaption(event.target.value.slice(0, 2200))}
            rows={8}
            disabled={format === "story"}
            placeholder="Texte de la publication, hashtags…"
          />
          <small className={styles.marketingCaptionCount}>{caption.length}/2200</small>
        </label>
      </section>

      <section className={`${styles.card} ${styles.instagramImportPreview}`}>
        <div className={styles.marketingPreviewTop}>
          <div>
            <span>Aperçu</span>
            <strong>{file ? file.name : "Aucun visuel importé"}</strong>
          </div>
        </div>

        <div className={styles.instagramImportedPreview} data-format={format}>
          {previewUrl ? (
            <img src={previewUrl} alt="Aperçu du visuel à publier sur Instagram" />
          ) : (
            <div>
              <span aria-hidden="true">▧</span>
              <strong>Votre visuel apparaîtra ici</strong>
              <small>Importez un PNG ou JPG exporté depuis Canva.</small>
            </div>
          )}
        </div>

        {!instagramConnected ? (
          <div className={`${styles.marketingPublishStatus} ${styles.marketingPublishWarning}`}>
            Connectez Instagram en haut de la page avant de publier.
          </div>
        ) : null}

        {publishMessage ? (
          <div className={`${styles.marketingPublishStatus} ${publishMessage.kind === "success" ? styles.marketingPublishSuccess : styles.marketingPublishError}`}>
            <span>{publishMessage.text}</span>
            {publishMessage.kind === "success" && publishMessage.permalink ? (
              <a href={publishMessage.permalink} target="_blank" rel="noreferrer">Voir sur Instagram ↗</a>
            ) : null}
          </div>
        ) : null}

        <button
          className={`${styles.button} ${styles.instagramPublishButton}`}
          type="button"
          onClick={publishToInstagram}
          disabled={!file || !instagramConnected || publishing}
        >
          {publishing ? "Publication en cours…" : format === "story" ? "Publier en Story" : "Publier sur Instagram"}
        </button>
        <p className={styles.marketingHint}>
          Le fichier est préparé automatiquement pour Instagram au moment de la publication.
        </p>
      </section>
    </div>
  );
}
