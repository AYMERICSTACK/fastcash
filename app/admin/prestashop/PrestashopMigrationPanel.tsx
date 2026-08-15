"use client";

import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Database,
  Download,
  FileCode2,
  ImageIcon,
  Languages,
  Layers3,
  LoaderCircle,
  PackageSearch,
  PlayCircle,
  Tags,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent, DragEvent, ReactNode } from "react";
import type {
  PrestashopAnalysis,
  PrestashopAnalysisIssue,
  PrestashopCapabilityKey,
  PrestashopIssueSeverity,
  PrestashopCategoryImportReport,
  PrestashopBrandImportReport,
  PrestashopProductImportReport,
  PrestashopImageImportReport,
  PrestashopStockImportReport,
} from "@/lib/prestashop";
import styles from "./prestashop-migration.module.css";
import { useAdminConfirm } from "../AdminProviders";

const MAX_FILE_BYTES = 50 * 1024 * 1024;

const capabilityLabels: Record<PrestashopCapabilityKey, string> = {
  products: "Produits",
  categories: "Catégories",
  brands: "Marques",
  images: "Images",
  stock: "Stocks",
  combinations: "Déclinaisons",
};

const severityLabels: Record<PrestashopIssueSeverity, string> = {
  info: "Information",
  warning: "Attention",
  error: "Critique",
};

interface AnalyzeResponse {
  ok?: boolean;
  error?: string;
  summary?: {
    detectedPrefix: string;
    detectedTables: number;
    populatedTables: number;
    enabledCapabilities: string[];
    warningCount: number;
  };
  analysis?: PrestashopAnalysis;
}

interface DistributionItem {
  label: string;
  value: number;
  tone: "positive" | "neutral" | "warning" | "danger" | "gold";
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 octet";
  const units = ["octets", "Ko", "Mo", "Go"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${new Intl.NumberFormat("fr-CH", {
    maximumFractionDigits: index === 0 ? 0 : 2,
  }).format(value)} ${units[index]}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-CH").format(value);
}

function formatPrice(value: number | null) {
  if (value == null) return "—";
  return new Intl.NumberFormat("fr-CH", {
    style: "currency",
    currency: "CHF",
    maximumFractionDigits: 2,
  }).format(value);
}

function validateFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".sql")) {
    return "Le fichier doit être un export SQL avec l’extension .sql.";
  }

  if (file.size === 0) {
    return "Le fichier sélectionné est vide.";
  }

  if (file.size > MAX_FILE_BYTES) {
    return "Le dump SQL dépasse la limite de 50 Mo.";
  }

  return null;
}

function KpiCard({
  icon,
  label,
  value,
  detail,
  emphasis = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  emphasis?: boolean;
}) {
  return (
    <article className={`${styles.kpiCard} ${emphasis ? styles.kpiCardEmphasis : ""}`}>
      <div className={styles.kpiIcon}>{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}

function DistributionChart({ title, items }: { title: string; items: DistributionItem[] }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <article className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <h3>{title}</h3>
        <strong>{formatNumber(total)}</strong>
      </div>
      <div className={styles.chartBars}>
        {items.map((item) => {
          const percent = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div className={styles.chartRow} key={item.label}>
              <div className={styles.chartLabel}>
                <span>{item.label}</span>
                <strong>{formatNumber(item.value)}</strong>
              </div>
              <div className={styles.chartTrack} aria-label={`${item.label} : ${item.value}`}>
                <span
                  className={`${styles.chartFill} ${styles[`tone${item.tone[0].toUpperCase()}${item.tone.slice(1)}`]}`}
                  style={{ width: `${Math.max(percent, item.value > 0 ? 2 : 0)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function ReportSection({ title, icon, children, open = false }: { title: string; icon: ReactNode; children: ReactNode; open?: boolean }) {
  return (
    <details className={styles.reportSection} open={open}>
      <summary>
        <span className={styles.reportSectionIcon}>{icon}</span>
        <strong>{title}</strong>
        <ChevronDown className={styles.chevron} aria-hidden="true" />
      </summary>
      <div className={styles.reportSectionBody}>{children}</div>
    </details>
  );
}

function MetricList({ items }: { items: Array<{ label: string; value: string | number; note?: string }> }) {
  return (
    <div className={styles.metricList}>
      {items.map((item) => (
        <div key={item.label}>
          <span>{item.label}</span>
          <strong>{typeof item.value === "number" ? formatNumber(item.value) : item.value}</strong>
          {item.note ? <small>{item.note}</small> : null}
        </div>
      ))}
    </div>
  );
}

function IssueCard({ issue }: { issue: PrestashopAnalysisIssue }) {
  return (
    <article className={`${styles.issueCard} ${styles[`issue${issue.severity[0].toUpperCase()}${issue.severity.slice(1)}`]}`}>
      <div className={styles.issueIcon}>
        {issue.severity === "error" ? <XCircle /> : issue.severity === "warning" ? <AlertTriangle /> : <CheckCircle2 />}
      </div>
      <div>
        <div className={styles.issueTitleRow}>
          <span>{severityLabels[issue.severity]}</span>
          <strong>{formatNumber(issue.count)}</strong>
        </div>
        <h4>{issue.title}</h4>
        <p>{issue.message}</p>
        {issue.normalization ? <small>Traitement prévu : {issue.normalization}</small> : null}
      </div>
    </article>
  );
}

export default function PrestashopMigrationPanel() {
  const confirm = useAdminConfirm();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [categoryImportLoading, setCategoryImportLoading] = useState(false);
  const [categoryImportReport, setCategoryImportReport] = useState<PrestashopCategoryImportReport | null>(null);
  const [brandImportLoading, setBrandImportLoading] = useState(false);
  const [brandImportReport, setBrandImportReport] = useState<PrestashopBrandImportReport | null>(null);
  const [productImportLoading, setProductImportLoading] = useState(false);
  const [productImportReport, setProductImportReport] = useState<PrestashopProductImportReport | null>(null);
  const [imageBaseUrl, setImageBaseUrl] = useState("");
  const [imageImportLoading, setImageImportLoading] = useState(false);
  const [imageImportProgress, setImageImportProgress] = useState({ processed: 0, total: 0 });
  const [imageImportReport, setImageImportReport] = useState<PrestashopImageImportReport | null>(null);
  const [imageImportErrors, setImageImportErrors] = useState<PrestashopImageImportReport["items"]>([]);
  const [imageImportTotals, setImageImportTotals] = useState({ created: 0, updated: 0, unchanged: 0, ignored: 0, errors: 0, missingProducts: 0 });
  const [stockImportLoading, setStockImportLoading] = useState(false);
  const [stockImportReport, setStockImportReport] = useState<PrestashopStockImportReport | null>(null);

  const fileSize = useMemo(() => (file ? formatFileSize(file.size) : null), [file]);
  const analysis = result?.analysis;

  function selectFile(nextFile: File | null) {
    if (!nextFile) return;

    const validationError = validateFile(nextFile);
    if (validationError) {
      setFile(null);
      setResult(null);
      setError(validationError);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setFile(nextFile);
    setError(null);
    setResult(null);
    setCategoryImportReport(null);
    setBrandImportReport(null);
    setProductImportReport(null);
    setImageImportReport(null);
    setImageImportErrors([]);
    setImageImportProgress({ processed: 0, total: 0 });
    setImageImportTotals({ created: 0, updated: 0, unchanged: 0, ignored: 0, errors: 0, missingProducts: 0 });
    setStockImportReport(null);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0] ?? null);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    selectFile(event.dataTransfer.files?.[0] ?? null);
  }

  function resetSelection() {
    setFile(null);
    setResult(null);
    setCategoryImportReport(null);
    setBrandImportReport(null);
    setProductImportReport(null);
    setStockImportReport(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function analyzeFile() {
    if (!file || loading) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setCategoryImportReport(null);
    setBrandImportReport(null);
    setProductImportReport(null);
    setStockImportReport(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/prestashop/analyze", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as AnalyzeResponse | null;

      if (!response.ok || !payload?.ok || !payload.analysis) {
        throw new Error(payload?.error || "Le serveur n’a pas pu analyser ce dump SQL.");
      }

      setResult(payload);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Une erreur inattendue est survenue pendant l’analyse.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function importCategories() {
    if (!file || !analysis || categoryImportLoading) return;
    const confirmed = await confirm({
      title: `Importer ${analysis.statistics.categories.commercial} catégorie(s) commerciales ?`,
      description: "L’opération est relançable : les catégories existantes seront synchronisées via leur identifiant Prestashop.",
      confirmLabel: "Importer les catégories",
      tone: "default",
    });
    if (!confirmed) return;

    setCategoryImportLoading(true);
    setCategoryImportReport(null);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (analysis.statistics.languages.suggestedId) formData.append("languageId", String(analysis.statistics.languages.suggestedId));
      const response = await fetch("/api/admin/prestashop/import/categories", { method: "POST", body: formData });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; report?: PrestashopCategoryImportReport } | null;
      if (!response.ok || !payload?.ok || !payload.report) throw new Error(payload?.error || "L’import des catégories a échoué.");
      setCategoryImportReport(payload.report);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Une erreur inattendue est survenue pendant l’import.");
    } finally {
      setCategoryImportLoading(false);
    }
  }

  async function importBrands() {
    if (!file || !analysis || brandImportLoading) return;

    const confirmed = await confirm({
      title: `Importer ${analysis.statistics.brands.total} marque(s) ?`,
      description: "L’opération est relançable : les marques existantes seront synchronisées via leur identifiant Prestashop.",
      confirmLabel: "Importer les marques",
      tone: "default",
    });
    if (!confirmed) return;

    setBrandImportLoading(true);
    setBrandImportReport(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/prestashop/import/brands", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        report?: PrestashopBrandImportReport;
      } | null;

      if (!response.ok || !payload?.ok || !payload.report) {
        throw new Error(payload?.error || "L’import des marques a échoué.");
      }

      setBrandImportReport(payload.report);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Une erreur inattendue est survenue pendant l’import.",
      );
    } finally {
      setBrandImportLoading(false);
    }
  }

  async function importProducts() {
    if (!file || !analysis || productImportLoading) return;

    const confirmed = await confirm({
      title: `Importer ${analysis.statistics.products.importable} produit(s) ?`,
      description: `Les ${analysis.statistics.products.ignoredEmpty} produits vides seront ignorés. Les stocks et les images ne seront pas modifiés à cette étape.`,
      confirmLabel: "Importer les produits",
      tone: "default",
    });
    if (!confirmed) return;

    setProductImportLoading(true);
    setProductImportReport(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (analysis.statistics.languages.suggestedId) {
        formData.append("languageId", String(analysis.statistics.languages.suggestedId));
      }

      const response = await fetch("/api/admin/prestashop/import/products", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        report?: PrestashopProductImportReport;
      } | null;

      if (!response.ok || !payload?.ok || !payload.report) {
        throw new Error(payload?.error || "L’import des produits a échoué.");
      }

      setProductImportReport(payload.report);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Une erreur inattendue est survenue pendant l’import.",
      );
    } finally {
      setProductImportLoading(false);
    }
  }

  async function runImageImport(retryIds?: number[]) {
    if (!file || !analysis || imageImportLoading) return;
    const baseUrl = imageBaseUrl.trim();
    if (!baseUrl) {
      setError("Renseignez l’URL publique de l’ancien site Prestashop.");
      return;
    }
    const retryMode = Boolean(retryIds?.length);
    const targetTotal = retryMode ? retryIds!.length : analysis.statistics.images.total;
    const confirmed = await confirm({
      title: retryMode
        ? `Réessayer ${targetTotal} image(s) en erreur ?`
        : `Importer ${targetTotal} image(s) vers Cloudinary ?`,
      description: retryMode
        ? `Les images en erreur seront retentées depuis ${baseUrl}.`
        : `Source : ${baseUrl}. L’import fonctionne par lots et peut prendre plusieurs minutes. Ne fermez pas cette page.`,
      confirmLabel: retryMode ? "Réessayer les images" : "Importer les images",
      tone: "default",
    });
    if (!confirmed) return;

    setImageImportLoading(true);
    setImageImportReport(null);
    setImageImportErrors([]);
    setImageImportProgress({ processed: 0, total: targetTotal });
    setImageImportTotals({ created: 0, updated: 0, unchanged: 0, ignored: 0, errors: 0, missingProducts: 0 });
    setError(null);

    let offset = 0;
    let totals = { created: 0, updated: 0, unchanged: 0, ignored: 0, errors: 0, missingProducts: 0 };
    const collectedErrors: PrestashopImageImportReport["items"] = [];
    try {
      while (true) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("imageBaseUrl", baseUrl);
        formData.append("offset", String(offset));
        formData.append("limit", "40");
        if (retryMode) formData.append("imageIds", retryIds!.join(","));
        if (analysis.statistics.languages.suggestedId) formData.append("languageId", String(analysis.statistics.languages.suggestedId));
        const response = await fetch("/api/admin/prestashop/import/images", { method: "POST", body: formData });
        const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; report?: PrestashopImageImportReport } | null;
        if (!response.ok || !payload?.ok || !payload.report) throw new Error(payload?.error || "L’import des images a échoué.");
        const report = payload.report;
        totals = {
          created: totals.created + report.created,
          updated: totals.updated + report.updated,
          unchanged: totals.unchanged + report.unchanged,
          ignored: totals.ignored + report.ignored,
          errors: totals.errors + report.errors,
          missingProducts: totals.missingProducts + report.missingProducts,
        };
        collectedErrors.push(...report.items.filter((item) => item.action === "error"));
        setImageImportErrors([...collectedErrors]);
        setImageImportTotals(totals);
        setImageImportReport(report);
        setImageImportProgress({ processed: Math.min(report.total, report.offset + report.processed), total: report.total });
        if (report.completed || report.nextOffset == null) break;
        offset = report.nextOffset;
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Une erreur inattendue est survenue pendant l’import des images.");
    } finally {
      setImageImportLoading(false);
    }
  }

  async function importImages() {
    await runImageImport();
  }

  async function retryImageErrors() {
    const ids: number[] = [...new Set<number>(imageImportErrors.map((item) => item.prestashopImageId))];
    if (ids.length) await runImageImport(ids);
  }

  async function importStocks() {
    if (!file || !analysis || stockImportLoading) return;

    const confirmed = await confirm({
      title: `Synchroniser ${analysis.statistics.stock.rows} ligne(s) de stock ?`,
      description: "Les stocks négatifs seront normalisés à 0. Aucun produit ne sera créé.",
      confirmLabel: "Synchroniser les stocks",
      tone: "default",
    });
    if (!confirmed) return;

    setStockImportLoading(true);
    setStockImportReport(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/prestashop/import/stocks", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        report?: PrestashopStockImportReport;
      } | null;

      if (!response.ok || !payload?.ok || !payload.report) {
        throw new Error(payload?.error || "La synchronisation des stocks a échoué.");
      }
      setStockImportReport(payload.report);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Une erreur inattendue est survenue pendant la synchronisation des stocks.",
      );
    } finally {
      setStockImportLoading(false);
    }
  }

  function exportReport() {
    if (!analysis) return;
    const content = JSON.stringify(analysis, null, 2);
    const blob = new Blob([content], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeName = analysis.file.name.replace(/\.sql$/i, "").replace(/[^a-z0-9-_]+/gi, "-");
    anchor.href = url;
    anchor.download = `rapport-prestashop-${safeName || "dump"}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={`${styles.layout} ${analysis ? styles.layoutWithDashboard : ""}`}>
      <section className={styles.card}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Étape 1</p>
            <h2>Importer le dump SQL</h2>
          </div>
          <FileCode2 aria-hidden="true" />
        </div>

        <div
          className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ""} ${file ? styles.dropzoneSelected : ""}`}
          onDragEnter={handleDragOver}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Sélectionner un export SQL Prestashop"
        >
          <input
            ref={inputRef}
            className={styles.hiddenInput}
            type="file"
            accept=".sql,application/sql,text/sql,text/plain"
            onChange={handleFileChange}
          />
          <UploadCloud className={styles.uploadIcon} aria-hidden="true" />
          {file ? (
            <>
              <strong>{file.name}</strong>
              <span>{fileSize}</span>
              <small>Cliquez ou déposez un autre fichier pour le remplacer.</small>
            </>
          ) : (
            <>
              <strong>Déposez votre export Prestashop ici</strong>
              <span>ou cliquez pour sélectionner un fichier</span>
              <small>Format .sql uniquement · 50 Mo maximum</small>
            </>
          )}
        </div>

        {error ? (
          <div className={styles.errorMessage} role="alert">
            <XCircle aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className={styles.actions}>
          <button className={styles.primaryButton} type="button" onClick={analyzeFile} disabled={!file || loading}>
            {loading ? (
              <><LoaderCircle className={styles.spinner} aria-hidden="true" />Analyse en cours…</>
            ) : (
              <><PackageSearch aria-hidden="true" />Analyser le dump</>
            )}
          </button>
          {file ? (
            <button className={styles.secondaryButton} type="button" onClick={resetSelection} disabled={loading}>
              Réinitialiser
            </button>
          ) : null}
        </div>

        <p className={styles.securityNote}>
          Cette étape lit uniquement le fichier envoyé. Aucun produit, stock, média ou paramètre n’est créé ou modifié dans FAST CASH.
        </p>
      </section>

      {!analysis ? (
        <section className={styles.card}>
          <div className={styles.sectionHeading}>
            <div><p className={styles.eyebrow}>Étape 2</p><h2>Résultat de l’analyse</h2></div>
            <Database aria-hidden="true" />
          </div>
          <div className={styles.emptyState}>
            <Database aria-hidden="true" />
            <h3>Aucun dump analysé</h3>
            <p>Sélectionnez un export SQL Prestashop pour afficher son audit complet avant toute migration.</p>
          </div>
        </section>
      ) : (
        <section className={`${styles.card} ${styles.dashboard}`}>
          <div className={styles.dashboardHeader}>
            <div>
              <p className={styles.eyebrow}>Étape 2 · Rapport d’audit</p>
              <h2>{analysis.file.name}</h2>
              <p>
                Préfixe <strong>{analysis.prefix}</strong> · {analysis.tables.length} tables · analysé le {new Intl.DateTimeFormat("fr-CH", { dateStyle: "long", timeStyle: "short" }).format(new Date(analysis.analyzedAt))}
              </p>
            </div>
            <button className={styles.exportButton} type="button" onClick={exportReport}>
              <Download aria-hidden="true" />Exporter le rapport JSON
            </button>
          </div>

          <div className={styles.importStep}>
            <div>
              <p className={styles.eyebrow}>Étape 3 · Première écriture en base</p>
              <h3>Importer les catégories</h3>
              <p>Les catégories système sont exclues. La hiérarchie est reconstruite et la synchronisation utilise exclusivement <code>prestashopId</code>.</p>
            </div>
            <button className={styles.importButton} type="button" onClick={importCategories} disabled={categoryImportLoading || !analysis.capabilities.categories}>
              {categoryImportLoading ? <><LoaderCircle className={styles.spinner} />Import en cours…</> : <><PlayCircle />Importer les catégories</>}
            </button>
          </div>

          {categoryImportReport ? (
            <div className={styles.importReport}>
              <div><span>Créées</span><strong>{formatNumber(categoryImportReport.created)}</strong></div>
              <div><span>Mises à jour</span><strong>{formatNumber(categoryImportReport.updated)}</strong></div>
              <div><span>Inchangées</span><strong>{formatNumber(categoryImportReport.unchanged)}</strong></div>
              <div><span>Fusionnées</span><strong>{formatNumber(categoryImportReport.merged)}</strong></div>
              <div><span>Ignorées</span><strong>{formatNumber(categoryImportReport.ignored)}</strong></div>
              <div className={categoryImportReport.errors ? styles.importReportError : ""}><span>Erreurs</span><strong>{formatNumber(categoryImportReport.errors)}</strong></div>
              <p>Langue #{categoryImportReport.languageId} · {formatNumber(categoryImportReport.total)} catégorie(s) analysée(s) · import terminé le {new Intl.DateTimeFormat("fr-CH", { dateStyle: "short", timeStyle: "short" }).format(new Date(categoryImportReport.importedAt))}</p>
              {categoryImportReport.items.some((item) => item.action === "error") ? (
                <div className={styles.importErrorDetails}>
                  <strong>Détail des erreurs</strong>
                  {categoryImportReport.items.filter((item) => item.action === "error").map((item) => (
                    <p key={`category-error-${item.prestashopId}`}>
                      <b>Catégorie #{item.prestashopId} · {item.name}</b>
                      <code>{item.message || "Erreur inconnue"}</code>
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className={styles.importStep}>
            <div>
              <p className={styles.eyebrow}>Étape 4 · Préparation des produits</p>
              <h3>Importer les marques</h3>
              <p>Les fabricants Prestashop sont synchronisés par <code>prestashopId</code>. Les slugs restent uniques et les marques existantes sont mises à jour sans doublon.</p>
            </div>
            <button className={styles.importButton} type="button" onClick={importBrands} disabled={brandImportLoading || !analysis.capabilities.brands}>
              {brandImportLoading ? <><LoaderCircle className={styles.spinner} />Import en cours…</> : <><Tags />Importer les marques</>}
            </button>
          </div>

          {brandImportReport ? (
            <div className={styles.importReport}>
              <div><span>Créées</span><strong>{formatNumber(brandImportReport.created)}</strong></div>
              <div><span>Mises à jour</span><strong>{formatNumber(brandImportReport.updated)}</strong></div>
              <div><span>Inchangées</span><strong>{formatNumber(brandImportReport.unchanged)}</strong></div>
              <div><span>Ignorées</span><strong>{formatNumber(brandImportReport.ignored)}</strong></div>
              <div className={brandImportReport.errors ? styles.importReportError : ""}><span>Erreurs</span><strong>{formatNumber(brandImportReport.errors)}</strong></div>
              <p>{formatNumber(brandImportReport.total)} marque(s) analysée(s) · import terminé le {new Intl.DateTimeFormat("fr-CH", { dateStyle: "short", timeStyle: "short" }).format(new Date(brandImportReport.importedAt))}</p>
            </div>
          ) : null}

          <div className={styles.importStep}>
            <div>
              <p className={styles.eyebrow}>Étape 5 · Catalogue</p>
              <h3>Importer les produits</h3>
              <p>Les produits sont synchronisés via <code>prestashopId</code>, rattachés à leur marque et à leurs catégories. Les produits fantômes sont ignorés ; stocks et images restent réservés aux prochaines étapes.</p>
            </div>
            <button className={styles.importButton} type="button" onClick={importProducts} disabled={productImportLoading || !analysis.capabilities.products}>
              {productImportLoading ? <><LoaderCircle className={styles.spinner} />Import en cours…</> : <><Boxes />Importer les produits</>}
            </button>
          </div>

          {productImportReport ? (
            <>
              <div className={styles.importReport}>
                <div><span>Créés</span><strong>{formatNumber(productImportReport.created)}</strong></div>
                <div><span>Mis à jour</span><strong>{formatNumber(productImportReport.updated)}</strong></div>
                <div><span>Inchangés</span><strong>{formatNumber(productImportReport.unchanged)}</strong></div>
                <div><span>Ignorés</span><strong>{formatNumber(productImportReport.ignored)}</strong></div>
                <div><span>Disparus désactivés</span><strong>{formatNumber(productImportReport.staleProductsDisabled ?? 0)}</strong></div>
                <div className={productImportReport.errors ? styles.importReportError : ""}><span>Erreurs</span><strong>{formatNumber(productImportReport.errors)}</strong></div>
                <p>Langue #{productImportReport.languageId} · {formatNumber(productImportReport.secondaryRelations)} relation(s) catégorie · {formatNumber(productImportReport.systemDefaultCategoriesReassigned)} catégorie(s) système remplacée(s) par une catégorie métier · {formatNumber(productImportReport.uncategorizedProducts)} produit(s) à catégoriser · {formatNumber(productImportReport.missingDefaultCategories)} catégorie(s) métier manquante(s) · {formatNumber(productImportReport.missingBrands)} marque(s) manquante(s){productImportReport.staleReconciliationSkipped ? " · réconciliation des produits disparus ignorée par sécurité (dump potentiellement incomplet)" : ""} · import terminé le {new Intl.DateTimeFormat("fr-CH", { dateStyle: "short", timeStyle: "short" }).format(new Date(productImportReport.importedAt))}</p>
              </div>

              {productImportReport.uncategorizedItems?.length ? (
                <div className={styles.imageErrorPanel}>
                  <div className={styles.imageErrorHeader}>
                    <div>
                      <strong>Produits à catégoriser</strong>
                      <span>
                        {formatNumber(productImportReport.uncategorizedItems.length)} produit(s) sans catégorie métier exploitable dans Prestashop.
                      </span>
                    </div>
                    <PackageSearch aria-hidden="true" />
                  </div>

                  <div className={styles.imageErrorTableWrap}>
                    <table className={styles.imageErrorTable}>
                      <thead>
                        <tr>
                          <th>Prestashop</th>
                          <th>Produit</th>
                          <th>Référence</th>
                          <th>Statut</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...productImportReport.uncategorizedItems]
                          .sort((a, b) => a.name.localeCompare(b.name, "fr"))
                          .map((item) => (
                            <tr key={item.productId}>
                              <td>#{item.prestashopId}</td>
                              <td>
                                <strong>{item.name}</strong>
                                <small>Catégorie Prestashop par défaut : système / aucune catégorie métier liée</small>
                              </td>
                              <td>{item.reference || "—"}</td>
                              <td>{item.active ? "Actif" : "Inactif"}</td>
                              <td>
                                <a
                                  href={`/pilotage/produits/${item.productId}`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Catégoriser ↗
                                </a>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  <p className={styles.imageErrorLimit}>
                    Ces produits ne sont jamais classés automatiquement au hasard. Ouvrez leur fiche, choisissez la catégorie métier appropriée puis enregistrez.
                  </p>
                </div>
              ) : null}
            </>
          ) : null}

          <div className={styles.importStep}>
            <div>
              <p className={styles.eyebrow}>Étape 6 · Médias</p>
              <h3>Importer les images</h3>
              <p>Les chemins Prestashop sont reconstruits depuis <code>id_image</code>, puis chaque fichier est transféré vers Cloudinary en conservant l’image principale, la galerie et l’ordre.</p>
              <label className={styles.sourceUrlField}>
                <span>URL publique de l’ancien site Prestashop</span>
                <input type="url" value={imageBaseUrl} onChange={(event) => setImageBaseUrl(event.target.value)} placeholder="https://ancien-site.ch" disabled={imageImportLoading} />
                <small>Le moteur cherchera les fichiers dans <code>/img/p/…</code>. L’ancien site doit rester accessible pendant l’import.</small>
              </label>
            </div>
            <button className={styles.importButton} type="button" onClick={importImages} disabled={imageImportLoading || !analysis.capabilities.images || !imageBaseUrl.trim()}>
              {imageImportLoading ? <><LoaderCircle className={styles.spinner} />{formatNumber(imageImportProgress.processed)} / {formatNumber(imageImportProgress.total)}</> : <><ImageIcon />Importer les images</>}
            </button>
          </div>

          {(imageImportLoading || imageImportReport) ? (
            <div className={styles.imageImportStatus}>
              <div className={styles.progressTrack}><span style={{ width: `${imageImportProgress.total ? Math.min(100, (imageImportProgress.processed / imageImportProgress.total) * 100) : 0}%` }} /></div>
              <div className={styles.importReport}>
                <div><span>Créées</span><strong>{formatNumber(imageImportTotals.created)}</strong></div>
                <div><span>Mises à jour</span><strong>{formatNumber(imageImportTotals.updated)}</strong></div>
                <div><span>Inchangées</span><strong>{formatNumber(imageImportTotals.unchanged)}</strong></div>
                <div><span>Ignorées</span><strong>{formatNumber(imageImportTotals.ignored)}</strong></div>
                <div className={imageImportTotals.errors ? styles.importReportError : ""}><span>Erreurs</span><strong>{formatNumber(imageImportTotals.errors)}</strong></div>
                <p>{formatNumber(imageImportProgress.processed)} / {formatNumber(imageImportProgress.total)} image(s) traitée(s) · {formatNumber(imageImportTotals.missingProducts)} produit(s) source manquant(s){imageImportLoading ? " · import en cours, gardez cette page ouverte" : " · import terminé"}</p>
              </div>
              {imageImportErrors.length ? (
                <div className={styles.imageErrorPanel}>
                  <div className={styles.imageErrorHeader}>
                    <div>
                      <strong>Journal des erreurs</strong>
                      <span>{formatNumber(imageImportErrors.length)} erreur(s) détaillée(s)</span>
                    </div>
                    <button type="button" onClick={retryImageErrors} disabled={imageImportLoading}>
                      <PlayCircle /> Réessayer les erreurs
                    </button>
                  </div>
                  <div className={styles.imageErrorTableWrap}>
                    <table className={styles.imageErrorTable}>
                      <thead><tr><th>Image</th><th>Étape</th><th>HTTP</th><th>Type</th><th>URL / message</th></tr></thead>
                      <tbody>
                        {imageImportErrors.slice(0, 100).map((item) => (
                          <tr key={`${item.prestashopImageId}-${item.stage}`}>
                            <td>#{item.prestashopImageId}</td>
                            <td>{item.stage}</td>
                            <td>{item.httpStatus ?? "—"}</td>
                            <td>{item.contentType || "—"}</td>
                            <td><a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.sourceUrl}</a><small>{item.message || "Erreur inconnue"}</small></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {imageImportErrors.length > 100 ? <p className={styles.imageErrorLimit}>Les 100 premières erreurs sont affichées. Le bouton de reprise traite bien l’ensemble.</p> : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className={styles.importStep}>
            <div>
              <p className={styles.eyebrow}>Étape 7 · Stock</p>
              <h3>Synchroniser les stocks</h3>
              <p>Les quantités de <code>stock_available</code> sont appliquées aux produits FAST CASH via <code>prestashopId</code>. Les valeurs négatives sont automatiquement ramenées à zéro.</p>
            </div>
            <button
              className={styles.importButton}
              type="button"
              onClick={importStocks}
              disabled={stockImportLoading || !analysis.capabilities.stock}
            >
              {stockImportLoading ? <><LoaderCircle className={styles.spinner} />Synchronisation…</> : <><Database />Synchroniser les stocks</>}
            </button>
          </div>

          {stockImportReport ? (
            <div className={styles.importReport}>
              <div><span>Mis à jour</span><strong>{formatNumber(stockImportReport.updated)}</strong></div>
              <div><span>Inchangés</span><strong>{formatNumber(stockImportReport.unchanged)}</strong></div>
              <div><span>Normalisés à 0</span><strong>{formatNumber(stockImportReport.normalized)}</strong></div>
              <div><span>Ignorés</span><strong>{formatNumber(stockImportReport.ignored)}</strong></div>
              <div className={stockImportReport.errors ? styles.importReportError : ""}><span>Erreurs</span><strong>{formatNumber(stockImportReport.errors)}</strong></div>
              <p>
                {formatNumber(stockImportReport.productsProcessed)} produit(s) source · {formatNumber(stockImportReport.negativeDetected)} stock(s) négatif(s) détecté(s)
                {stockImportReport.variantRowsIgnored ? ` · ${formatNumber(stockImportReport.variantRowsIgnored)} ligne(s) de déclinaison ignorée(s)` : ""}
                {stockImportReport.duplicateRowsIgnored ? ` · ${formatNumber(stockImportReport.duplicateRowsIgnored)} doublon(s) multi-boutique ignoré(s)` : ""}
                {` · synchronisation terminée le ${new Intl.DateTimeFormat("fr-CH", { dateStyle: "short", timeStyle: "short" }).format(new Date(stockImportReport.importedAt))}`}
              </p>
            </div>
          ) : null}

          <div className={styles.kpiGrid}>
            <KpiCard icon={<BarChart3 />} label="Score qualité" value={`${analysis.quality.score}/100`} detail={`Niveau ${analysis.quality.grade}`} emphasis />
            <KpiCard icon={<Boxes />} label="Produits importables" value={formatNumber(analysis.statistics.products.importable)} detail={`${formatNumber(analysis.statistics.products.ignoredEmpty)} produit(s) ignoré(s)`} />
            <KpiCard icon={<Layers3 />} label="Catégories" value={formatNumber(analysis.statistics.categories.commercial)} detail={`${formatNumber(analysis.statistics.categories.system)} catégorie(s) système exclue(s)`} />
            <KpiCard icon={<Tags />} label="Marques" value={formatNumber(analysis.statistics.brands.total)} detail="Fabricants détectés" />
            <KpiCard icon={<ImageIcon />} label="Images" value={formatNumber(analysis.statistics.images.total)} detail={`${formatNumber(analysis.statistics.images.productsWithoutImage)} produit(s) sans image`} />
            <KpiCard icon={<Database />} label="Stocks" value={formatNumber(analysis.statistics.stock.rows)} detail={`${formatNumber(analysis.statistics.stock.negative)} stock(s) à normaliser`} />
          </div>

          <div className={styles.chartGrid}>
            <DistributionChart title="État des produits" items={[
              { label: "Actifs", value: analysis.statistics.products.active, tone: "positive" },
              { label: "Inactifs valides", value: analysis.statistics.products.inactiveImportable, tone: "neutral" },
              { label: "Ignorés", value: analysis.statistics.products.ignoredEmpty, tone: "warning" },
            ]} />
            <DistributionChart title="État des stocks" items={[
              { label: "Positifs", value: analysis.statistics.stock.positive, tone: "positive" },
              { label: "À zéro", value: analysis.statistics.stock.zero, tone: "neutral" },
              { label: "Négatifs", value: analysis.statistics.stock.negative, tone: "danger" },
            ]} />
            <DistributionChart title="Qualité des médias" items={[
              { label: "Produits avec image", value: Math.max(0, analysis.statistics.products.total - analysis.statistics.images.productsWithoutImage), tone: "gold" },
              { label: "Produits sans image", value: analysis.statistics.images.productsWithoutImage, tone: "warning" },
              { label: "Images orphelines", value: analysis.statistics.images.orphaned, tone: "danger" },
            ]} />
          </div>

          <div className={styles.dashboardGrid}>
            <div>
              <div className={styles.blockHeading}>
                <div><p className={styles.eyebrow}>Contrôles automatiques</p><h3>Points d’attention</h3></div>
                <span>{analysis.issues.length} signalement(s)</span>
              </div>
              {analysis.issues.length ? (
                <div className={styles.issueGrid}>{analysis.issues.map((issue) => <IssueCard key={issue.code} issue={issue} />)}</div>
              ) : (
                <div className={styles.successMessage}><CheckCircle2 /><span>Aucune anomalie de données détectée.</span></div>
              )}
            </div>

            <aside className={styles.qualityPanel}>
              <div className={styles.qualityGauge} style={{ "--quality-score": `${analysis.quality.score * 3.6}deg` } as CSSProperties}>
                <div><strong>{analysis.quality.score}</strong><span>/ 100</span></div>
              </div>
              <h3>Qualité {analysis.quality.grade}</h3>
              <p>Le score mesure la fiabilité du dump avant migration. Il ne bloque pas l’import.</p>
              <div className={styles.deductionList}>
                {analysis.quality.deductions.map((item) => (
                  <div key={item.code}><span>{item.reason}</span><strong>−{item.points}</strong></div>
                ))}
              </div>
            </aside>
          </div>

          <div className={styles.reportBlock}>
            <div className={styles.blockHeading}>
              <div><p className={styles.eyebrow}>Données détectées</p><h3>Rapport détaillé</h3></div>
              <span>Sections repliables</span>
            </div>

            <div className={styles.reportSections}>
              <ReportSection title="Produits et prix" icon={<Boxes />} open>
                <MetricList items={[
                  { label: "Produits dans le dump", value: analysis.statistics.products.total },
                  { label: "Produits importables", value: analysis.statistics.products.importable },
                  { label: "Produits actifs", value: analysis.statistics.products.active },
                  { label: "Produits inactifs valides", value: analysis.statistics.products.inactiveImportable },
                  { label: "Produits vides ignorés", value: analysis.statistics.products.ignoredEmpty, note: "Statut prévu : IGNORED_EMPTY_PRODUCT" },
                  { label: "Prix à zéro", value: analysis.statistics.products.zeroPrice },
                  { label: "Prix minimum", value: formatPrice(analysis.statistics.products.minimumPrice) },
                  { label: "Prix maximum", value: formatPrice(analysis.statistics.products.maximumPrice) },
                  { label: "Collisions de slug", value: analysis.statistics.products.duplicateSlugs, note: "La synchronisation reposera sur prestashopId" },
                ]} />
              </ReportSection>

              <ReportSection title="Catégories et marques" icon={<Tags />}>
                <MetricList items={[
                  { label: "Catégories totales", value: analysis.statistics.categories.total },
                  { label: "Catégories commerciales", value: analysis.statistics.categories.commercial },
                  { label: "Catégories système exclues", value: analysis.statistics.categories.system },
                  { label: "Catégories orphelines", value: analysis.statistics.categories.orphaned },
                  { label: "Relations produit/catégorie cassées", value: analysis.statistics.categories.brokenProductRelations },
                  { label: "Marques", value: analysis.statistics.brands.total },
                  { label: "Marques actives", value: analysis.statistics.brands.active },
                ]} />
              </ReportSection>

              <ReportSection title="Images et galeries" icon={<ImageIcon />}>
                <MetricList items={[
                  { label: "Images", value: analysis.statistics.images.total },
                  { label: "Produits sans image", value: analysis.statistics.images.productsWithoutImage },
                  { label: "Produits vides possédant des images", value: analysis.statistics.images.ignoredWithEmptyProducts, note: "Ces images seront ignorées avec leur produit" },
                  { label: "Images orphelines", value: analysis.statistics.images.orphaned },
                  { label: "Images principales multiples", value: analysis.statistics.images.duplicateCovers },
                  { label: "Positions dupliquées", value: analysis.statistics.images.duplicatePositions },
                ]} />
              </ReportSection>

              <ReportSection title="Stocks et déclinaisons" icon={<Database />}>
                <MetricList items={[
                  { label: "Lignes de stock", value: analysis.statistics.stock.rows },
                  { label: "Stocks positifs", value: analysis.statistics.stock.positive },
                  { label: "Stocks à zéro", value: analysis.statistics.stock.zero },
                  { label: "Stocks négatifs", value: analysis.statistics.stock.negative, note: "Ils seront normalisés à zéro lors de l’import" },
                  { label: "Stocks orphelins", value: analysis.statistics.stock.orphaned },
                  { label: "Lignes avec déclinaison", value: analysis.statistics.stock.combinations },
                ]} />
              </ReportSection>

              <ReportSection title="Langues et fiscalité" icon={<Languages />}>
                <div className={styles.languageGrid}>
                  {analysis.statistics.languages.detected.map((language) => (
                    <article key={language.id} className={language.id === analysis.statistics.languages.suggestedId ? styles.suggestedLanguage : ""}>
                      <div><strong>Langue #{language.id}</strong>{language.id === analysis.statistics.languages.suggestedId ? <span>Recommandée</span> : null}</div>
                      <p>{formatNumber(language.namedProducts)} produits nommés · {formatNumber(language.namedCategories)} catégories nommées</p>
                      <small>Complétude : {language.completenessScore}%</small>
                    </article>
                  ))}
                </div>
                <div className={styles.taxNotice}>
                  <CircleDollarSign aria-hidden="true" />
                  <div><strong>{analysis.statistics.tax.missingRules ? "Aucune règle de TVA détectée" : "Règles de TVA détectées"}</strong><p>{analysis.statistics.tax.missingRules ? "Les prix seront importés tels quels et un avertissement sera conservé dans le rapport final." : `Groupes détectés : ${analysis.statistics.tax.rulesGroups.join(", ")}`}</p></div>
                </div>
              </ReportSection>

              <ReportSection title="Structure technique" icon={<FileCode2 />}>
                <div className={styles.capabilityGrid}>
                  {(Object.entries(analysis.capabilities) as [PrestashopCapabilityKey, boolean][]).map(([capability, enabled]) => (
                    <div key={capability} className={`${styles.capability} ${enabled ? styles.capabilityEnabled : styles.capabilityDisabled}`}>
                      {enabled ? <CheckCircle2 /> : <XCircle />}<span>{capabilityLabels[capability]}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead><tr><th>Table</th><th>Colonnes</th><th>Structure</th><th>Données</th></tr></thead>
                    <tbody>{analysis.tables.map((table) => (
                      <tr key={table.fullName}>
                        <td><strong>{table.fullName}</strong><small>{table.name}</small></td>
                        <td>{table.columns.length}</td>
                        <td>{table.hasCreateStatement ? "Détectée" : "Absente"}</td>
                        <td>{table.hasInsertStatement ? `${table.insertStatementCount} bloc(s) INSERT` : "Aucune ligne"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </ReportSection>
            </div>
          </div>

          {analysis.warnings.length > 0 ? (
            <div className={styles.warningBox}>
              <strong>{analysis.warnings.length} avertissement(s) de structure</strong>
              <ul>{analysis.warnings.map((warning) => <li key={`${warning.code}-${warning.message}`}>{warning.message}</li>)}</ul>
            </div>
          ) : (
            <div className={styles.successMessage}><CheckCircle2 /><span>Structure Prestashop détectée sans avertissement bloquant.</span></div>
          )}
        </section>
      )}
    </div>
  );
}
