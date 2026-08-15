"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../admin.module.css";

type ProductImageFieldProps = {
  defaultImage?: string | null;
  title?: string;
  helpText?: string;
};

export default function ProductImageField({
  defaultImage,
  title = "Image produit",
  helpText = "Ajoutez une image depuis votre ordinateur. L’URL reste disponible dans les options avancées.",
}: ProductImageFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [imageUrl, setImageUrl] = useState(defaultImage || "");
  const [previewUrl, setPreviewUrl] = useState(defaultImage || "");
  const [selectedFileName, setSelectedFileName] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function openFilePicker() {
    inputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const nextPreviewUrl = URL.createObjectURL(file);
    setSelectedFileName(file.name);
    setPreviewUrl((current) => {
      if (current.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }
      return nextPreviewUrl;
    });
  }

  function handleImageUrlChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setImageUrl(value);
    if (!selectedFileName) {
      setPreviewUrl(value);
    }
  }

  function clearImage() {
    if (previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setImageUrl("");
    setPreviewUrl("");
    setSelectedFileName("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className={styles.imageUploaderPremium}>
      <div className={styles.imageUploaderHeader}>
        <div>
          <span>{title}</span>
          <p>{helpText}</p>
        </div>
        {previewUrl ? <strong>Image prête</strong> : <strong>En attente</strong>}
      </div>

      <button className={styles.imageDropzonePremium} type="button" onClick={openFilePicker}>
        {previewUrl ? (
          <span className={styles.imagePreviewFrame}>
            <img src={previewUrl} alt="Aperçu produit" className={styles.imagePreview} />
          </span>
        ) : (
          <span className={styles.imageEmptyState}>
            <span className={styles.imageIcon}>＋</span>
            <strong>Ajouter un fichier</strong>
            <small>JPG, PNG, WEBP ou GIF — 5 Mo maximum</small>
          </span>
        )}
      </button>

      <input
        ref={inputRef}
        className={styles.fileInputHidden}
        name="imageFile"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
      />

      <div className={styles.imageUploaderActions}>
        {previewUrl ? (
          <>
            <button className={styles.buttonSecondary} type="button" onClick={openFilePicker}>
              Remplacer l’image
            </button>
            <button className={styles.buttonGhostDanger} type="button" onClick={clearImage}>
              Supprimer l’image
            </button>
          </>
        ) : null}
      </div>

      {selectedFileName ? <p className={styles.formNote}>Fichier sélectionné : {selectedFileName}</p> : null}

      <details className={styles.advancedImageOptions}>
        <summary>Options avancées : utiliser une URL image</summary>
        <label className={styles.imageUrlField}>
          <span>URL image</span>
          <input
            name="image"
            value={imageUrl}
            onChange={handleImageUrlChange}
            placeholder="/uploads/products/produit.jpg ou https://..."
          />
        </label>
        <p className={styles.formNote}>
          À utiliser uniquement si l’image existe déjà en ligne. Sinon, privilégiez l’ajout de fichier.
        </p>
      </details>
    </div>
  );
}
