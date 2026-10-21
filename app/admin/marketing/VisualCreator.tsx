"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "../admin.module.css";

type Product = {
  id: string;
  name: string;
  price: number;
  image: string | null;
  slug: string;
  reference: string | null;
  stock: number;
  brand: string | null;
};

type Theme = "tech" | "luxury" | "watches";
type Format = "post" | "story";

const themeLabels: Record<Theme, string> = {
  tech: "Tech",
  luxury: "Luxe",
  watches: "Montres & bijoux",
};

export default function VisualCreator({ onUseVisual }: { onUseVisual?: (file: File, format: Format, product: Product, attestation: string) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setProducts([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `/api/admin/instagram/products?q=${encodeURIComponent(q)}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error("Recherche impossible");
        const data = await response.json();
        setProducts(data.products ?? []);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Recherche produits :", error);
          setProducts([]);
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  const [selected, setSelected] = useState<Product | null>(null);
  const productId = selected?.id ?? "";

  const [theme, setTheme] = useState<Theme>("watches");
  const [format, setFormat] = useState<Format>("post");
  const [title, setTitle] = useState(selected?.name ?? "");
  const [subtitle, setSubtitle] = useState(selected?.brand ?? "Sélection FAST CASH");
  const [price, setPrice] = useState(selected ? selected.price.toFixed(2) : "");
  const [feature1, setFeature1] = useState("Produit contrôlé et vérifié");
  const [feature2, setFeature2] = useState("Garantie FAST CASH");
  const [feature3, setFeature3] = useState("Disponible à Genève");
  const [badge, setBadge] = useState("NOUVEAUTÉ");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 30);
    return products
      .filter((p) =>
        [p.name, p.brand, p.brand].filter(Boolean).join(" ").toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [products, query]);

  function chooseProduct(id: string) {
    const p = products.find((item) => item.id === id);
    if (!p) return;
    setSelected(p);
    setTitle(p.name);
    setSubtitle(p.brand || p.brand || "Sélection FAST CASH");
    setPrice(p.price.toFixed(2));
    setQuery(p.name);
  }

  const previewUrl = useMemo(() => {
    const params = new URLSearchParams({
      productId,
      theme,
      format,
      title,
      subtitle,
      price,
      feature1,
      feature2,
      feature3,
      badge,
      image: selected?.image || "",
      category: selected?.brand || "",
      brand: selected?.brand || "",
    });
    return `/api/admin/marketing/visual?${params.toString()}`;
  }, [productId, theme, format, title, subtitle, price, feature1, feature2, feature3, badge, selected]);

  async function useVisualForInstagram() {
    if (!selected || !onUseVisual || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/marketing/visual-attested", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selected.id,
          format,
          visualUrl: previewUrl,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        imageBase64?: string;
        attestation?: string;
      };

      if (!response.ok || !payload.imageBase64 || !payload.attestation) {
        throw new Error(payload.error || "Génération attestée impossible.");
      }

      const binary = atob(payload.imageBase64);
      const bytes = new Uint8Array(binary.length);

      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: "image/png" });
      const file = new File(
        [blob],
        `fastcash-${selected.slug}-${format}.png`,
        { type: "image/png" }
      );
      onUseVisual(file, format, selected, payload.attestation);
      document.getElementById("fastcash-instagram-publication")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Transfert impossible.");
    } finally {
      setBusy(false);
    }
  }

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


  return (
    <div className={styles.marketingStudio}>
      <section className={`${styles.card} ${styles.marketingControls}`}>
        <div className={styles.marketingSectionHead}>
          <span>01</span>
          <div><strong>Produit</strong><small>Choisissez un article du catalogue</small></div>
        </div>

        <label className={styles.marketingField}>
          <span>Rechercher un produit</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rolex, iPhone, Louis Vuitton…" />
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
              <div><strong>{p.name}</strong><small>{p.price.toFixed(2)} CHF · {p.brand || "Catalogue"}</small></div>
            </button>
          ))}
        </div>

        <div className={styles.marketingSectionHead}>
          <span>02</span>
          <div><strong>Direction artistique</strong><small>Trois compositions réellement différentes, pensées pour chaque univers FAST CASH</small></div>
        </div>
        <div className={styles.marketingThemeGrid}>
          {(Object.keys(themeLabels) as Theme[]).map((key) => (
            <button type="button" key={key} onClick={() => setTheme(key)} data-active={theme === key}>
              <i className={styles[`themeSwatch_${key}`]} />
              <strong>{themeLabels[key]}</strong>
            </button>
          ))}
        </div>

        <div className={styles.marketingFormatToggle}>
          <button type="button" data-active={format === "post"} onClick={() => setFormat("post")}>Post · 1080 × 1350</button>
          <button type="button" data-active={format === "story"} onClick={() => setFormat("story")}>Story · 1080 × 1920</button>
        </div>

        <div className={styles.marketingSectionHead}>
          <span>03</span>
          <div><strong>Contenu</strong><small>Les changements apparaissent directement dans l’aperçu</small></div>
        </div>

        <label className={styles.marketingField}><span>Titre</span><input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <div className={styles.marketingFields2}>
          <label className={styles.marketingField}><span>Accroche</span><input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} /></label>
          <label className={styles.marketingField}><span>Prix officiel Neon (CHF)</span><input value={selected ? selected.price.toFixed(2) : ""} readOnly aria-readonly="true" /></label>
        </div>
        <label className={styles.marketingField}><span>Badge</span><input value={badge} onChange={(e) => setBadge(e.target.value)} /></label>
        <label className={styles.marketingField}><span>Caractéristique 1</span><input value={feature1} onChange={(e) => setFeature1(e.target.value)} /></label>
        <label className={styles.marketingField}><span>Caractéristique 2</span><input value={feature2} onChange={(e) => setFeature2(e.target.value)} /></label>
        <label className={styles.marketingField}><span>Caractéristique 3</span><input value={feature3} onChange={(e) => setFeature3(e.target.value)} /></label>
      </section>

      <section className={`${styles.card} ${styles.marketingPreviewCard}`}>
        <div className={styles.marketingPreviewTop}>
          <div><span>Aperçu final</span><strong>{themeLabels[theme]} · {format === "post" ? "Post Instagram" : "Story Instagram"}</strong></div>
          {onUseVisual ? (
            <button className={styles.button} type="button" onClick={useVisualForInstagram} disabled={busy || !selected}>
              Utiliser ce visuel pour Instagram
            </button>
          ) : null}
          <button className={styles.button} type="button" onClick={downloadVisual} disabled={busy || !selected}>
            {busy ? "Génération…" : "Télécharger le PNG"}
          </button>
        </div>
        <div className={styles.marketingCanvasWrap} data-format={format}>
          {selected ? (
            <img
              key={previewUrl}
              src={previewUrl}
              alt="Aperçu du visuel FAST CASH"
              className={styles.marketingCanvas}
            />
          ) : (
            <p className={styles.marketingHint}>
              Recherchez et sélectionnez un produit pour afficher son visuel.
            </p>
          )}
        </div>
        <p className={styles.marketingHint}>
          Le PNG est généré en haute définition et prêt pour Instagram. Chaque univers possède sa propre composition graphique.
        </p>
      </section>
    </div>
  );
}
