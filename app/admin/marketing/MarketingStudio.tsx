"use client";

import { useMemo, useState } from "react";
import styles from "../admin.module.css";

type Product = {
  id: string;
  name: string;
  price: number;
  image: string | null;
  descriptionShort: string | null;
  category: { name: string } | null;
  brand: { name: string } | null;
};

type Theme = "tech" | "luxury" | "watches";
type Format = "post" | "story";

const themeLabels: Record<Theme, string> = {
  tech: "Tech",
  luxury: "Luxe",
  watches: "Montres & bijoux",
};

export default function MarketingStudio({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const selected = products.find((p) => p.id === productId) ?? products[0];

  const [theme, setTheme] = useState<Theme>("watches");
  const [format, setFormat] = useState<Format>("post");
  const [title, setTitle] = useState(selected?.name ?? "");
  const [subtitle, setSubtitle] = useState(selected?.category?.name ?? "Sélection FAST CASH");
  const [price, setPrice] = useState(selected ? selected.price.toFixed(2) : "");
  const [badge, setBadge] = useState("DISPONIBLE");
  const [zoom, setZoom] = useState<-1 | 0 | 1>(0);
  const [busy, setBusy] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 30);
    return products
      .filter((p) =>
        [p.name, p.brand?.name, p.category?.name].filter(Boolean).join(" ").toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [products, query]);

  function chooseProduct(id: string) {
    const p = products.find((item) => item.id === id);
    if (!p) return;
    const universe = `${p.category?.name || ""} ${p.brand?.name || ""}`.toLowerCase();
    const suggestedTheme: Theme =
      /(montre|bijou|joaill|rolex|omega|cartier)/.test(universe)
        ? "watches"
        : /(luxe|maroquin|sac|louis vuitton|gucci|dior|hermès|hermes)/.test(universe)
          ? "luxury"
          : "tech";

    setProductId(p.id);
    setTitle(p.name);
    setSubtitle(p.brand?.name || p.category?.name || "Sélection FAST CASH");
    setPrice(p.price.toFixed(2));
    setTheme(suggestedTheme);
    setBadge("DISPONIBLE");
    setZoom(0);
    setQuery(p.name);
    setPreviewError(false);
  }

  const previewUrl = useMemo(() => {
    const params = new URLSearchParams({
      productId,
      theme,
      format,
      title,
      subtitle,
      price,
      badge,
      zoom: String(zoom),
      category: selected?.category?.name || "",
      brand: selected?.brand?.name || "",
    });
    return `/api/admin/marketing/visual?${params.toString()}`;
  }, [productId, theme, format, title, subtitle, price, badge, zoom, selected]);

  async function downloadVisual() {
    setBusy(true);
    try {
      const response = await fetch(previewUrl);
      if (!response.ok) throw new Error("Génération impossible");
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `fastcash-${theme}-${format}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } finally {
      setBusy(false);
    }
  }

  if (!selected) {
    return <section className={styles.card}>Aucun produit actif disponible.</section>;
  }

  return (
    <div className={styles.marketingStudio}>
      <section className={`${styles.card} ${styles.marketingControls}`}>
        <div className={styles.marketingSectionHead}>
          <span>01</span>
          <div><strong>Produit</strong><small>Choisissez un article du catalogue</small></div>
        </div>

        <label className={styles.marketingField}>
          <span>Rechercher un produit</span>
          <div className={styles.marketingSearchBox}>
            <span aria-hidden="true">⌕</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom, marque ou catégorie…" />
          </div>
        </label>
        <div className={styles.marketingProductResults}>
          {filtered.map((p) => (
            <button
              type="button"
              key={p.id}
              className={p.id === productId ? styles.marketingProductActive : styles.marketingProduct}
              onClick={() => chooseProduct(p.id)}
            >
              {p.image ? <img src={p.image} alt="" /> : <span />}
              <div>
                <strong>{p.name}</strong>
                <small>{p.brand?.name || p.category?.name || "Catalogue"} · {p.price.toLocaleString("fr-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CHF</small>
              </div>
              {p.id === productId ? <em>Sélectionné</em> : null}
            </button>
          ))}
        </div>

        <div className={styles.marketingSectionHead}>
          <span>02</span>
          <div><strong>Direction artistique</strong><small>Trois directions premium, avec une mise en page plus sobre et centrée sur le produit</small></div>
        </div>
        <div className={styles.marketingThemeGrid}>
          {(Object.keys(themeLabels) as Theme[]).map((key) => (
            <button type="button" key={key} onClick={() => setTheme(key)} data-active={theme === key}>
              <i className={styles[`themeSwatch_${key}`]} />
              <span><strong>{themeLabels[key]}</strong>{theme === key ? <small>Actif</small> : null}</span>
            </button>
          ))}
        </div>

        <div className={styles.marketingChoiceRow}>
          <div className={styles.marketingChoiceBlock}>
            <span>Format</span>
            <div className={styles.marketingFormatCards}>
              <button type="button" data-active={format === "post"} onClick={() => setFormat("post")}><strong>Post 4:5</strong><small>1080 × 1350</small></button>
              <button type="button" data-active={format === "story"} onClick={() => setFormat("story")}><strong>Story 9:16</strong><small>1080 × 1920</small></button>
            </div>
          </div>
          <div className={styles.marketingChoiceBlock}>
            <span>Zoom produit</span>
            <div className={styles.marketingZoomControl}>
              <button type="button" data-active={zoom === -1} onClick={() => setZoom(-1)}>−</button>
              <button type="button" data-active={zoom === 0} onClick={() => setZoom(0)}>Auto</button>
              <button type="button" data-active={zoom === 1} onClick={() => setZoom(1)}>+</button>
            </div>
            <small>Ajuste uniquement le cadrage du produit.</small>
          </div>
        </div>

        <div className={styles.marketingSectionHead}>
          <span>03</span>
          <div><strong>Contenu</strong><small>Les changements apparaissent directement dans l’aperçu</small></div>
        </div>

        <label className={styles.marketingField}><span>Titre</span><input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <div className={styles.marketingFields2}>
          <label className={styles.marketingField}><span>Accroche</span><input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} /></label>
          <label className={styles.marketingField}><span>Prix CHF</span><input value={price} onChange={(e) => setPrice(e.target.value)} /></label>
        </div>
        <label className={styles.marketingField}><span>Badge</span><input value={badge} onChange={(e) => setBadge(e.target.value)} /></label>

        <div className={styles.marketingSummary}>
          <span>Configuration</span>
          <strong>{themeLabels[theme]} · {format === "post" ? "Post 4:5" : "Story 9:16"} · Zoom {zoom === 0 ? "Auto" : zoom > 0 ? "+" : "−"}</strong>
        </div>
      </section>

      <section className={`${styles.card} ${styles.marketingPreviewCard}`}>
        <div className={styles.marketingPreviewTop}>
          <div><span>Aperçu final</span><strong>{themeLabels[theme]} · {format === "post" ? "Post Instagram" : "Story Instagram"}</strong></div>
          <button className={styles.button} type="button" onClick={downloadVisual} disabled={busy}>
            {busy ? "Génération…" : "Télécharger le PNG"}
          </button>
        </div>
        <div className={styles.marketingCanvasWrap} data-format={format}>
          {previewError ? (
            <div className={styles.marketingPreviewError}>
              <strong>Aperçu indisponible</strong>
              <span>Le visuel n’a pas pu être généré. Changez de produit ou rechargez la page.</span>
              <button type="button" onClick={() => setPreviewError(false)}>Réessayer</button>
            </div>
          ) : (
            <img
              key={previewUrl}
              src={previewUrl}
              alt="Aperçu du visuel FAST CASH"
              className={styles.marketingCanvas}
              onLoad={() => setPreviewError(false)}
              onError={() => setPreviewError(true)}
            />
          )}
        </div>
        <p className={styles.marketingHint}>
          Le visuel est généré en 1080 px, avec une hiérarchie plus nette : produit, nom, prix et informations essentielles.
        </p>
      </section>
    </div>
  );
}
