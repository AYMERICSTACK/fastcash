import Link from "next/link";
import AdminShell from "../AdminShell";
import styles from "../admin.module.css";
import { getGa4Snapshot, isGa4AdminConfigured, type AnalyticsPeriod } from "@/lib/ga4-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PERIODS: Array<[AnalyticsPeriod, string]> = [["today", "Aujourd’hui"], ["7d", "7 jours"], ["30d", "30 jours"]];
const deviceLabel: Record<string, string> = { mobile: "Mobile", desktop: "Ordinateur", tablet: "Tablette", smartTv: "TV" };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const params = await searchParams;
  const period: AnalyticsPeriod = params.periode === "today" || params.periode === "30d" ? params.periode : "7d";
  let data = null;
  let error = "";
  if (isGa4AdminConfigured()) {
    try { data = await getGa4Snapshot(period); } catch (e) { error = e instanceof Error ? e.message : "Impossible de charger Google Analytics."; }
  }

  return <AdminShell>
    <header className={styles.topbar}>
      <div><p className={styles.kicker}>Audience & performance</p><h1 className={styles.title}>Analytics</h1><p className={styles.subtitle}>Les chiffres essentiels de FAST CASH, directement dans le pilotage.</p></div>
      <span className={styles.badge}>{data ? "GA4 connecté" : "Configuration GA4"}</span>
    </header>

    <div className={styles.analyticsPeriodBar}>{PERIODS.map(([value, label]) => <Link key={value} href={`/pilotage/analytics?periode=${value}`} className={period === value ? styles.analyticsPeriodActive : ""}>{label}</Link>)}</div>

    {!isGa4AdminConfigured() ? <section className={`${styles.card} ${styles.analyticsSetup}`}>
      <p className={styles.kicker}>Une dernière connexion</p><h2 className={styles.sectionTitle}>Autoriser le BO à lire Google Analytics</h2>
      <p>La collecte GA4 fonctionne déjà sur le site. Pour afficher ces données ici, le serveur FAST CASH doit disposer d’un accès <strong>lecture seule</strong> à la propriété Analytics.</p>
      <div className={styles.analyticsEnvList}><code>GA4_PROPERTY_ID</code><code>GA4_CLIENT_EMAIL</code><code>GA4_PRIVATE_KEY</code></div>
      <p className={styles.formNote}>Ces valeurs restent uniquement côté serveur. Aucune clé Google n’est envoyée au navigateur.</p>
    </section> : error ? <section className={`${styles.card} ${styles.analyticsSetup}`}><p className={styles.kicker}>Connexion Google</p><h2 className={styles.sectionTitle}>Analytics temporairement indisponible</h2><p>{error}</p><p className={styles.formNote}>Vérifie l’accès lecture de la propriété et les trois variables GA4 dans Vercel.</p></section> : data ? <>
      <section className={styles.analyticsGrid4}>
        <article className={styles.card}><p className={styles.statLabel}>Visiteurs</p><div className={styles.statValue}>{data.users}</div><p className={styles.statHint}>{data.sessions} session(s)</p></article>
        <article className={styles.card}><p className={styles.statLabel}>Pages vues</p><div className={styles.statValue}>{data.views}</div><p className={styles.statHint}>{data.productViews} vue(s) produit</p></article>
        <article className={styles.card}><p className={styles.statLabel}>Ajouts panier</p><div className={styles.statValue}>{data.addToCart}</div><p className={styles.statHint}>{data.checkouts} checkout(s) démarré(s)</p></article>
        <article className={styles.card}><p className={styles.statLabel}>Conversions</p><div className={styles.statValue}>{data.purchases}</div><p className={styles.statHint}>{data.leads} estimation(s) · {data.offers} offre(s)</p></article>
      </section>

      <section className={styles.grid2}>
        <article className={styles.card}><div className={styles.sectionHead}><div><p className={styles.kicker}>Contenu</p><h2 className={styles.sectionTitle}>Pages les plus vues</h2></div></div><div className={styles.analyticsList}>{data.topPages.length ? data.topPages.map((row) => <div className={styles.analyticsRow} key={`${row.path}-${row.title}`}><span><strong>{row.title || row.path}</strong><small>{row.path}</small></span><em>{row.views} vue{row.views > 1 ? "s" : ""}</em></div>) : <p className={styles.formNote}>Pas encore assez de données.</p>}</div></article>
        <article className={styles.card}><div className={styles.sectionHead}><div><p className={styles.kicker}>Acquisition</p><h2 className={styles.sectionTitle}>D’où viennent les visiteurs ?</h2></div></div><div className={styles.analyticsList}>{data.sources.length ? data.sources.map((row) => <div className={styles.analyticsRow} key={row.source}><span><strong>{row.source}</strong><small>{row.users} visiteur(s)</small></span><em>{row.sessions} session(s)</em></div>) : <p className={styles.formNote}>Pas encore assez de données.</p>}</div></article>
      </section>

      <section className={styles.grid2}>
        <article className={styles.card}><div className={styles.sectionHead}><div><p className={styles.kicker}>Technologie</p><h2 className={styles.sectionTitle}>Appareils</h2></div></div><div className={styles.analyticsList}>{data.devices.map((row) => <div className={styles.analyticsRow} key={row.device}><strong>{deviceLabel[row.device] || row.device}</strong><em>{row.users} visiteur(s)</em></div>)}</div></article>
        <article className={styles.card}><div className={styles.sectionHead}><div><p className={styles.kicker}>Géographie</p><h2 className={styles.sectionTitle}>Pays</h2></div></div><div className={styles.analyticsList}>{data.countries.map((row) => <div className={styles.analyticsRow} key={row.country}><strong>{row.country}</strong><em>{row.users} visiteur(s)</em></div>)}</div></article>
      </section>
    </> : null}
  </AdminShell>;
}
