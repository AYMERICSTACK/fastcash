"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../admin.module.css";

type PreviewFile = {
  key: string;
  file: File;
  url: string;
};

function fileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export default function NewProductGalleryField() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<PreviewFile[]>([]);
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    return () => files.forEach((item) => URL.revokeObjectURL(item.url));
  }, [files]);

  const totalSize = useMemo(() => files.reduce((sum, item) => sum + item.file.size, 0), [files]);

  function syncInput(next: PreviewFile[]) {
    setFiles(next);
    if (!inputRef.current) return;
    const transfer = new DataTransfer();
    next.forEach((item) => transfer.items.add(item.file));
    inputRef.current.files = transfer.files;
  }

  function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
    if (!incoming.length) return;

    const existing = new Set(files.map((item) => item.key));
    const additions = incoming
      .filter((file) => !existing.has(fileKey(file)))
      .map((file) => ({ key: fileKey(file), file, url: URL.createObjectURL(file) }));

    syncInput([...files, ...additions].slice(0, 12));
  }

  function remove(index: number) {
    const item = files[index];
    if (item) URL.revokeObjectURL(item.url);
    syncInput(files.filter((_, currentIndex) => currentIndex !== index));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= files.length) return;
    const next = [...files];
    [next[index], next[target]] = [next[target], next[index]];
    syncInput(next);
  }

  return (
    <div className={styles.newProductGallery}>
      <div className={styles.newProductGalleryHeader}>
        <div>
          <strong>Photos du produit</strong>
          <p>Ajoutez jusqu’à 12 photos. La première sera utilisée comme image principale.</p>
        </div>
        <button type="button" className={styles.buttonSecondary} onClick={() => inputRef.current?.click()}>
          + Ajouter des photos
        </button>
      </div>

      <input
        ref={inputRef}
        className={styles.hiddenInput}
        type="file"
        name="galleryFiles"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        multiple
        onChange={(event) => event.target.files && addFiles(event.target.files)}
      />

      <div
        className={styles.newProductGalleryDropzone}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          addFiles(event.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
        }}
      >
        <strong>{files.length ? `${files.length} photo${files.length > 1 ? "s" : ""} sélectionnée${files.length > 1 ? "s" : ""}` : "Déposez plusieurs photos ici"}</strong>
        <span>JPG, PNG, WEBP, GIF ou AVIF · 10 Mo max par photo</span>
      </div>

      {files.length ? (
        <div className={styles.newProductGalleryGrid}>
          {files.map((item, index) => (
            <article key={item.key} className={styles.newProductGalleryCard}>
              <div className={styles.newProductGalleryImageWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt="" />
                {index === 0 ? <span className={styles.newProductGalleryPrimary}>Principale</span> : null}
              </div>
              <div className={styles.newProductGalleryCardMeta}>
                <strong title={item.file.name}>{item.file.name}</strong>
                <span>{(item.file.size / 1024 / 1024).toFixed(1)} Mo</span>
              </div>
              <div className={styles.newProductGalleryActions}>
                <button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Déplacer à gauche">←</button>
                <button type="button" disabled={index === files.length - 1} onClick={() => move(index, 1)} aria-label="Déplacer à droite">→</button>
                <button type="button" onClick={() => remove(index)}>Retirer</button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {files.length ? (
        <p className={styles.newProductGalleryHint}>
          La photo marquée <strong>Principale</strong> sera affichée dans les listes, le Studio visuels et les aperçus sociaux. Vous pourrez encore réordonner la galerie après création.
        </p>
      ) : null}

      <details className={styles.advancedImageOptions}>
        <summary>Option avancée : utiliser une URL comme image principale</summary>
        <label className={styles.imageUrlField}>
          <span>URL image</span>
          <input
            name="image"
            type="url"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="https://..."
          />
          <small>Utilisée uniquement si aucune photo n’est importée depuis votre ordinateur.</small>
        </label>
      </details>

      {files.length ? <input type="hidden" name="galleryCount" value={files.length} /> : null}
      <span className={styles.newProductGalleryTotal}>{files.length ? `${(totalSize / 1024 / 1024).toFixed(1)} Mo au total` : ""}</span>
    </div>
  );
}
