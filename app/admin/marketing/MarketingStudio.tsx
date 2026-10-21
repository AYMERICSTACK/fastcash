"use client";

import { ChangeEvent, DragEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import styles from "../admin.module.css";

type Format = "post" | "story";
type InstagramProduct = {
  id: string;
  name: string;
  slug: string;
  reference: string | null;
  brand: string | null;
  price: number;
  stock: number;
  image: string | null;
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg"]);

function mergeCaptionAndProductLink(caption: string, productUrl: string) {
  const cleanCaption = caption.trim();
  const footer = `\n\nVoir le produit : ${productUrl}`;
  if (!cleanCaption) return `Voir le produit : ${productUrl}`.slice(0, 2200);
  if (cleanCaption.includes(productUrl)) return cleanCaption.slice(0, 2200);
  return `${cleanCaption}${footer}`.slice(0, 2200);
}

export default function MarketingStudio({
  instagramConnected,
  instagramUsername,
  generatedVisual,
}: {
  instagramConnected: boolean;
  instagramUsername: string;
  generatedVisual?: {
    file: File;
    format: "post" | "story";
    product: InstagramProduct;
    attestation: string;
  } | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [generatedAttestation, setGeneratedAttestation] = useState<string | null>(null);
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
  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<InstagramProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<InstagramProduct | null>(null);
  const [productSearching, setProductSearching] = useState(false);
  const [productSearchError, setProductSearchError] = useState<string | null>(null);

  const productUrl = selectedProduct && typeof window !== "undefined"
    ? `${process.env.NEXT_PUBLIC_INSTAGRAM_PRODUCT_BASE_URL?.replace(/\/$/, "")}/produits/${selectedProduct.slug}`
    : "";
  const finalCaption = selectedProduct && productUrl
    ? mergeCaptionAndProductLink(caption, productUrl)
    : caption.trim().slice(0, 2200);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const query = productQuery.trim();
    if (!query || (selectedProduct && query === selectedProduct.name)) {
      setProductResults([]);
      setProductSearching(false);
      setProductSearchError(null);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      setProductSearching(true);
      setProductSearchError(null);
      try {
        const response = await fetch(`/api/admin/instagram/products?q=${encodeURIComponent(query)}`, {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as {
          products?: InstagramProduct[];
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error || "Recherche produit impossible.");
        setProductResults(payload.products || []);
      } catch (error) {
        setProductResults([]);
        setProductSearchError(error instanceof Error ? error.message : "Recherche produit impossible.");
      } finally {
        setProductSearching(false);
      }
    }, 250);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [productQuery, selectedProduct]);

  useEffect(() => {
    if (!generatedVisual) return;
    selectFile(generatedVisual.file);
    setGeneratedAttestation(generatedVisual.attestation);
    setFormat(generatedVisual.format);
    chooseProduct(generatedVisual.product);
  }, [generatedVisual]);

  function openFilePicker() {
    inputRef.current?.click();
  }

  function onDropzoneKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFilePicker();
    }
  }

  function selectFile(candidate: File | null) {
    setGeneratedAttestation(null);
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

  function chooseProduct(product: InstagramProduct) {
    setSelectedProduct(product);
    setProductQuery(product.name);
    setProductResults([]);
    setProductSearchError(null);
  }

  function generateProductCaption() {
    if (!selectedProduct) return;

    if (caption.trim() &&
        !window.confirm("Remplacer la légende actuelle par une légende automatique ?")) {
      return;
    }

    const price = selectedProduct.price.toLocaleString("fr-CH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const suggestedCaption = [
      `✨ ${selectedProduct.name}`,
      "",
      `💰 Prix : CHF ${price}`,
      "📍 Disponible chez FAST CASH Genève",
      "",
      "Découvrez ce produit sur notre site.",
      "",
      "#FastCashGeneve #Geneve #HighTech #BonPlan",
    ].join("\n");

    setCaption(suggestedCaption.slice(0, 2200));
  }

  async function publishToInstagram() {
    if (!file || !instagramConnected || publishing) return;

    // FASTCASH_FINAL_GUARD_V1
    if (
      generatedAttestation &&
      (!selectedProduct ||
        !generatedVisual ||
        selectedProduct.id !== generatedVisual.product.id)
    ) {
      window.alert(
        "Le produit sélectionné ne correspond plus au visuel FAST CASH signé. Régénérez le visuel."
      );
      return;
    }
    if (!generatedAttestation) {
      const manualConfirmed = window.confirm(
        "VISUEL CANVA NON CERTIFIÉ\n\nFAST CASH ne peut pas vérifier automatiquement les prix ou textes présents dans cette image.\n\nConfirmez-vous avoir vérifié manuellement son contenu et vouloir continuer ?"
      );

      if (!manualConfirmed) return;
    }

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
      // FASTCASH_CANVA_MANUAL_V1
      if (generatedAttestation) {
        form.set("attestation", generatedAttestation);
        form.set("source", "fastcash");
      } else {
        form.set("source", "canva");
        form.set("manualConfirmation", "confirmed");
      }

      if (selectedProduct) {
        form.set("productId", selectedProduct.id);
      }
      form.set("format", format);
      form.set("caption", format === "story" ? "" : finalCaption);

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
    <div id="fastcash-instagram-publication" className={styles.instagramImportStudio}>
      <section className={`${styles.card} ${styles.instagramImportCard}`}>
        <div className={styles.marketingSectionHead}>
          <span>01</span>
          <div>
            <strong>Préparer le visuel Instagram</strong>
            <small>Utilisez un visuel créé dans FAST CASH ou importez votre création Canva en PNG ou JPG.</small>
          </div>
        </div>

        <div
          className={`${styles.instagramDropzone} ${dragging ? styles.instagramDropzoneActive : ""}`}
          onClick={openFilePicker}
          onKeyDown={onDropzoneKeyDown}
          onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
          aria-label="Choisir un visuel PNG ou JPG à importer"
        >
          <input ref={inputRef} type="file" accept="image/png,image/jpeg" onChange={onFileChange} hidden />
          <div className={styles.instagramDropIcon} aria-hidden="true">↑</div>
          <strong>{file ? "Changer de visuel" : "Cliquez ou déposez votre visuel ici"}</strong>
          <span>PNG ou JPG · 10 Mo maximum</span>
          <button
            className={styles.instagramFileButton}
            type="button"
            onClick={(event) => { event.stopPropagation(); openFilePicker(); }}
          >
            {file ? "Choisir un autre fichier" : "Choisir un fichier"}
          </button>
          {file ? <small className={styles.instagramFileName}>{file.name}</small> : null}
        </div>
        {fileError ? <div className={`${styles.marketingPublishStatus} ${styles.marketingPublishError}`}>{fileError}</div> : null}

        <div className={styles.marketingSectionHead}>
          <span>02</span>
          <div>
            <strong>Associer un produit</strong>
            <small>Optionnel : le BO générera automatiquement le lien vers la fiche produit FAST CASH.</small>
          </div>
        </div>

        <div className={styles.instagramProductPicker}>
          <label className={styles.marketingField}>
            <span>Produit FAST CASH</span>
            <input
              value={productQuery}
              onChange={(event) => {
                setProductQuery(event.target.value);
                if (selectedProduct && event.target.value !== selectedProduct.name) setSelectedProduct(null);
              }}
              placeholder="Rechercher par nom, référence, marque…"
              autoComplete="off"
            />
          </label>
          {productSearching ? <small className={styles.instagramProductHelp}>Recherche…</small> : null}
          {productSearchError ? <small className={styles.instagramProductError}>{productSearchError}</small> : null}
          {productResults.length ? (
            <div className={styles.instagramProductResults}>
              {productResults.map((product) => (
                <button key={product.id} type="button" onClick={() => chooseProduct(product)}>
                  <span>
                    <strong>{product.name}</strong>
                    <small>{[product.brand, product.reference].filter(Boolean).join(" · ") || product.slug}</small>
                  </span>
                  <em>{product.stock} en stock</em>
                </button>
              ))}
            </div>
          ) : null}
          {selectedProduct && productUrl ? (
            <div className={styles.instagramSelectedProduct}>
              <div>
                <span>Produit associé</span>
                <strong>{selectedProduct.name}</strong>
                <small>{productUrl}</small>
              </div>
              <button type="button" onClick={() => { setSelectedProduct(null); setProductQuery(""); }}>
                Retirer
              </button>
            </div>
          ) : null}
        </div>

        <div className={styles.marketingSectionHead}>
          <span>03</span>
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

        {format === "post" && selectedProduct ? (
          <div>
            <button
              type="button"
              className={styles.instagramFileButton}
              onClick={generateProductCaption}
              disabled={publishing}
            >
              Générer une légende
            </button>
          </div>
        ) : null}

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

        {format === "post" && selectedProduct && productUrl ? (
          <div className={styles.instagramGeneratedLink}>
            <span>Lien produit ajouté automatiquement à la publication</span>
            <strong>{productUrl}</strong>
            <small>Instagram affiche cette URL dans la légende. Dans un post classique, elle peut ne pas être cliquable.</small>
          </div>
        ) : null}
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

        {/* FASTCASH_FINAL_GUARD_V1 */}
        {file && !generatedAttestation && (
          <p
            role="status"
            style={{
              padding: "12px",
              border: "1px solid #d97706",
              borderRadius: "8px",
              marginBottom: "12px",
            }}
          >
            <strong>Visuel Canva — prix non certifié.</strong>{" "}
            Vérifiez manuellement le prix, les textes et le produit avant publication.
            Une confirmation supplémentaire sera demandée.
          </p>
        )}
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
