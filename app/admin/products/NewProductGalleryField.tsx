"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../admin.module.css";

type UploadedAsset = {
  url: string; publicId: string; fileName: string; mimeType: string;
  format: string; width: number; height: number; bytes: number;
};
type GalleryItem = { key: string; file: File; preview: string; status: "uploading" | "done" | "error"; asset?: UploadedAsset; error?: string };

function fileKey(file: File) { return `${file.name}-${file.size}-${file.lastModified}`; }

export default function NewProductGalleryField() {
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const itemsRef = useRef<GalleryItem[]>([]);
  useEffect(() => { itemsRef.current = items; }, [items]);

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return;
    const guard = (event: Event) => {
      const current = itemsRef.current;
      if (current.some((item) => item.status === "uploading")) {
        event.preventDefault(); alert("Les photos sont encore en cours d’import. Attendez quelques secondes puis réessayez.");
      } else if (current.some((item) => item.status === "error")) {
        event.preventDefault(); alert("Au moins une photo n’a pas pu être importée. Retirez-la ou réessayez avant de créer le produit.");
      }
    };
    form.addEventListener("submit", guard);
    return () => form.removeEventListener("submit", guard);
  }, []);

  async function upload(file: File, key: string) {
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("Cette photo dépasse 10 Mo.");
      const signResponse = await fetch("/api/admin/media/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      if (!signResponse.ok) throw new Error("Impossible de préparer l’import.");
      const signed = await signResponse.json();
      const body = new FormData();
      body.append("file", file);
      body.append("api_key", signed.apiKey);
      body.append("timestamp", String(signed.timestamp));
      body.append("signature", signed.signature);
      body.append("folder", signed.folder);
      const cloudResponse = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`, { method: "POST", body });
      if (!cloudResponse.ok) throw new Error("Cloudinary a refusé la photo.");
      const result = await cloudResponse.json();
      const asset: UploadedAsset = { url: result.secure_url, publicId: result.public_id, fileName: file.name || result.original_filename, mimeType: file.type, format: result.format, width: result.width, height: result.height, bytes: result.bytes };
      setItems((current) => current.map((item) => item.key === key ? { ...item, status: "done", asset } : item));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import impossible.";
      setItems((current) => current.map((item) => item.key === key ? { ...item, status: "error", error: message } : item));
    }
  }

  function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list).filter((file) => file.type.startsWith("image/"));
    const existing = new Set(items.map((item) => item.key));
    const additions = incoming.filter((file) => !existing.has(fileKey(file))).slice(0, Math.max(0, 12 - items.length)).map((file) => ({ key: fileKey(file), file, preview: URL.createObjectURL(file), status: "uploading" as const }));
    if (!additions.length) return;
    setItems((current) => [...current, ...additions]);
    additions.forEach((item) => void upload(item.file, item.key));
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(index: number) { const item = items[index]; if (item) URL.revokeObjectURL(item.preview); setItems(items.filter((_, i) => i !== index)); }
  function move(index: number, direction: -1 | 1) { const target = index + direction; if (target < 0 || target >= items.length) return; const next = [...items]; [next[index], next[target]] = [next[target], next[index]]; setItems(next); }
  const uploaded = items.filter((item) => item.status === "done" && item.asset).map((item) => item.asset!);
  const uploading = items.filter((item) => item.status === "uploading").length;

  return <div ref={rootRef} className={styles.newProductGallery}>
    <div className={styles.newProductGalleryHeader}><div><strong>Photos du produit</strong><p>Ajoutez jusqu’à 12 photos. Elles sont envoyées directement vers Cloudinary, sans limite de formulaire Next.js.</p></div><button type="button" className={styles.buttonSecondary} onClick={() => inputRef.current?.click()}>+ Ajouter des photos</button></div>
    <input ref={inputRef} className={styles.hiddenInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple onChange={(e) => e.target.files && addFiles(e.target.files)} />
    <input type="hidden" name="galleryAssets" value={JSON.stringify(uploaded)} />
    <div className={styles.newProductGalleryDropzone} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }} onClick={() => inputRef.current?.click()} role="button" tabIndex={0}><strong>{items.length ? `${items.length} photo${items.length > 1 ? "s" : ""}` : "Déposez plusieurs photos ici"}</strong><span>JPG, PNG, WEBP, GIF ou AVIF · 10 Mo max par photo</span></div>
    {uploading ? <p className={styles.newProductGalleryHint}>⏳ Import de {uploading} photo{uploading > 1 ? "s" : ""} en cours…</p> : null}
    {items.length ? <div className={styles.newProductGalleryGrid}>{items.map((item, index) => <article key={item.key} className={styles.newProductGalleryCard}><div className={styles.newProductGalleryImageWrap}><img src={item.preview} alt="" />{index === 0 ? <span className={styles.newProductGalleryPrimary}>Principale</span> : null}</div><div className={styles.newProductGalleryCardMeta}><strong title={item.file.name}>{item.file.name}</strong><span>{(item.file.size / 1024 / 1024).toFixed(1)} Mo · {item.status === "done" ? "✓ Importée" : item.status === "uploading" ? "Import…" : `Erreur : ${item.error}`}</span></div><div className={styles.newProductGalleryActions}><button type="button" disabled={index === 0} onClick={() => move(index, -1)}>←</button><button type="button" disabled={index === items.length - 1} onClick={() => move(index, 1)}>→</button><button type="button" onClick={() => remove(index)}>Retirer</button></div></article>)}</div> : null}
    <details className={styles.advancedImageOptions}><summary>Option avancée : utiliser une URL comme image principale</summary><label className={styles.imageUrlField}><span>URL image</span><input name="image" type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." /><small>Utilisée uniquement si aucune photo n’est importée.</small></label></details>
  </div>;
}
