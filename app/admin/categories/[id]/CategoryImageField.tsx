"use client";

import { useRef, useState } from "react";
import styles from "../../admin.module.css";

type UploadAsset = { url: string };

export default function CategoryImageField({
  currentImage,
  effectiveImage,
  categoryName,
}: {
  currentImage: string | null;
  effectiveImage: string;
  categoryName: string;
}) {
  const [image, setImage] = useState(currentImage || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const previewImage = image || effectiveImage;
  const hasPendingReplacement = image !== (currentImage || "");

  async function upload(file: File) {
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("files", file);
      const response = await fetch("/api/admin/media", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible d'importer l'image.");
      const asset = data.assets?.[0] as UploadAsset | undefined;
      if (!asset?.url) throw new Error("L'image importée n'a pas d'URL.");
      setImage(asset.url);
      setMessage("Nouvelle image prête. Enregistrez les modifications pour l'appliquer à la catégorie.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible d'importer l'image.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={styles.categoryImageField}>
      <input type="hidden" name="image" value={image} />
      <span className={styles.categoryImageLabel}>Photo de la catégorie — page d’accueil</span>
      <div className={styles.categoryImagePreview}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewImage} alt={`Visuel de la catégorie ${categoryName}`} />
      </div>
      <div>
        <strong className={styles.categoryImageStatus}>
          {hasPendingReplacement
            ? "Nouvelle image sélectionnée"
            : currentImage
              ? "Image personnalisée actuellement affichée"
              : "Visuel par défaut actuellement affiché sur le site"}
        </strong>
        <p className={styles.formNote}>JPG, PNG, WEBP, GIF ou AVIF · 10 Mo maximum.</p>
      </div>
      <div className={styles.categoryImageActions}>
        <button className={styles.buttonSecondary} type="button" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? "Import en cours…" : "Remplacer l’image"}
        </button>
        {hasPendingReplacement ? (
          <button className={styles.buttonSecondary} type="button" disabled={busy} onClick={() => { setImage(currentImage || ""); setMessage(""); }}>
            Annuler le remplacement
          </button>
        ) : null}
        <input
          ref={inputRef}
          className={styles.hiddenInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </div>
      {message ? <p className={styles.mediaMessage}>{message}</p> : null}
    </div>
  );
}
