"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import styles from "../admin.module.css";

type Asset = { id: string; url: string; fileName: string; width: number | null; height: number | null; bytes: number | null };
type Link = { id: string; mediaId: string; alt: string | null; position: number; isPrimary: boolean; media: Asset };

export default function ProductMediaManager({ productId, initialLinks, library }: { productId: string; initialLinks: Link[]; library: Asset[] }) {
  const [links, setLinks] = useState([...initialLinks].sort((a, b) => a.position - b.position));
  const [assets, setAssets] = useState(library);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const attachedIds = useMemo(() => new Set(links.map((link) => link.mediaId)), [links]);

  async function call(body: Record<string, unknown>) {
    setBusy(true); setMessage("");
    const response = await fetch(`/api/admin/products/${productId}/media`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) { setMessage(data.error || "Une erreur est survenue."); return false; }
    return true;
  }

  async function attach(asset: Asset) {
    if (!(await call({ action: "attach", mediaId: asset.id }))) return;
    setLinks((current) => [...current, { id: `temp-${asset.id}`, mediaId: asset.id, alt: null, position: current.length, isPrimary: current.length === 0, media: asset }]);
    window.location.reload();
  }

  async function upload(files: FileList | File[]) {
    const selected = Array.from(files);
    if (!selected.length) return;
    setBusy(true); setMessage("Import en cours…");
    const form = new FormData(); selected.forEach((file) => form.append("files", file));
    const response = await fetch("/api/admin/media", { method: "POST", body: form });
    const data = await response.json();
    if (!response.ok) { setBusy(false); setMessage(data.error || "Import impossible."); return; }
    const uploaded: Asset[] = data.assets;
    setAssets((current) => [...uploaded, ...current]);
    for (const asset of uploaded) await fetch(`/api/admin/products/${productId}/media`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "attach", mediaId: asset.id }) });
    setBusy(false); setMessage(`${uploaded.length} image(s) ajoutée(s).`); window.location.reload();
  }

  async function detach(link: Link) {
    if (!(await call({ action: "detach", linkId: link.id }))) return;
    setLinks((current) => current.filter((item) => item.id !== link.id));
  }

  async function primary(link: Link) {
    if (!(await call({ action: "primary", linkId: link.id }))) return;
    setLinks((current) => current.map((item) => ({ ...item, isPrimary: item.id === link.id })));
  }

  async function saveAlt(link: Link, alt: string) {
    if (!(await call({ action: "alt", linkId: link.id, alt }))) return;
    setLinks((current) => current.map((item) => item.id === link.id ? { ...item, alt } : item));
    setMessage("Texte alternatif enregistré.");
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction; if (target < 0 || target >= links.length) return;
    const next = [...links]; [next[index], next[target]] = [next[target], next[index]];
    setLinks(next);
    await call({ action: "reorder", orderedIds: next.map((item) => item.id) });
  }

  return <div className={styles.mediaManager}>
    <div className={styles.mediaToolbar}>
      <div><h3 className={styles.sectionTitle}>Galerie produit</h3><p className={styles.formNote}>Importez, classez et choisissez l’image principale.</p></div>
      <button type="button" className={styles.button} disabled={busy} onClick={() => inputRef.current?.click()}>Ajouter des images</button>
      <input ref={inputRef} className={styles.hiddenInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple onChange={(event) => event.target.files && upload(event.target.files)} />
    </div>
    <div className={styles.mediaDropZone} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files); }}>
      Glissez-déposez jusqu’à 12 images ici · 10 Mo maximum par fichier
    </div>
    {message ? <p className={styles.mediaMessage}>{message}</p> : null}
    <div className={styles.productMediaGrid}>
      {links.map((link, index) => <article key={link.id} className={styles.productMediaCard}>
        <div className={styles.mediaImageWrap}><Image src={link.media.url} alt={link.alt || link.media.fileName} width={320} height={320} />{link.isPrimary ? <span>Principale</span> : null}</div>
        <strong title={link.media.fileName}>{link.media.fileName}</strong>
        <input aria-label="Texte alternatif" defaultValue={link.alt || ""} placeholder="Texte alternatif SEO" onBlur={(e) => saveAlt(link, e.target.value)} />
        <div className={styles.mediaCardActions}>
          <button type="button" disabled={busy || index === 0} onClick={() => move(index, -1)}>←</button>
          <button type="button" disabled={busy || index === links.length - 1} onClick={() => move(index, 1)}>→</button>
          {!link.isPrimary ? <button type="button" disabled={busy} onClick={() => primary(link)}>Principale</button> : null}
          <button type="button" disabled={busy} onClick={() => detach(link)}>Retirer</button>
        </div>
      </article>)}
      {!links.length ? <p className={styles.emptyState}>Aucune image dans la galerie.</p> : null}
    </div>
    <details className={styles.mediaLibraryPicker}><summary>Réutiliser une image de la médiathèque</summary>
      <div className={styles.mediaPickerGrid}>{assets.filter((asset) => !attachedIds.has(asset.id)).slice(0, 60).map((asset) => <button type="button" key={asset.id} disabled={busy} onClick={() => attach(asset)}><Image src={asset.url} alt={asset.fileName} width={120} height={120} /><span>{asset.fileName}</span></button>)}</div>
    </details>
  </div>;
}
