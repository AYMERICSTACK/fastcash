import AdminShell from "../AdminShell";
import styles from "../admin.module.css";
import { prisma } from "@/lib/prisma";
import SettingsForm from "./SettingsForm";
import { getGoogleBusinessConnection } from "@/lib/google-business-oauth";

const editableSettings = [
  {
    key: "shop.name",
    label: "Nom boutique",
    group: "Boutique",
    fallback: "FAST CASH Genève",
    type: "text",
    help: "Nom affiché dans l'administration et les documents clients.",
  },
  {
    key: "shop.currency",
    label: "Devise principale",
    group: "Boutique",
    fallback: "CHF",
    type: "select",
    options: ["CHF", "EUR"],
    help: "Devise utilisée par défaut dans FAST CASH.",
  },
  {
    key: "shop.languages",
    label: "Langues actives",
    group: "Boutique",
    fallback: "FR / EN",
    type: "multiselect",
    options: ["FR", "EN"],
    help: "Langues actuellement disponibles sur la boutique.",
  },
  {
    key: "orders.prefix",
    label: "Préfixe commandes",
    group: "Commandes",
    fallback: "FC",
    type: "text",
    help: "Exemple : FC-2026-0001.",
  },
  {
    key: "invoices.prefix",
    label: "Préfixe factures",
    group: "Factures",
    fallback: "FA",
    type: "text",
    help: "Exemple : FA-2026-0001.",
  },
  {
    key: "orders.email",
    label: "Email commandes",
    group: "Emails",
    fallback: "commande@fastcash-geneve.ch",
    type: "email",
    help: "Adresse de réception des notifications de commandes.",
  },
  {
    key: "payments.card",
    label: "Paiement CB",
    group: "Paiements",
    fallback: "Inactif",
    type: "switch",
    help: "Permet d'activer l'affichage du paiement carte quand Stripe sera réel.",
  },
  {
    key: "payments.heylight",
    label: "Paiement HeyLight",
    group: "Paiements",
    fallback: "Inactif",
    type: "switch",
    help: "Prépare l'activation du paiement en plusieurs fois quand l'intégration HeyLight sera validée.",
  },
  {
    key: "shipping.pickupEnabled",
    label: "Retrait en boutique",
    group: "Livraison",
    fallback: "Actif",
    type: "switch",
    help: "Autorise le retrait gratuit directement chez FAST CASH Genève.",
  },
  {
    key: "shipping.deliveryEnabled",
    label: "Livraison à domicile",
    group: "Livraison",
    fallback: "Inactif",
    type: "switch",
    help: "Active l'expédition des commandes depuis le panier.",
  },
  {
    key: "shipping.fee",
    label: "Frais de livraison (CHF)",
    group: "Livraison",
    fallback: "0",
    type: "number",
    help: "Montant ajouté à la commande lorsque la livraison est choisie.",
  },
  {
    key: "shipping.freeThreshold",
    label: "Livraison offerte dès (CHF)",
    group: "Livraison",
    fallback: "0",
    type: "number",
    help: "0 désactive la gratuité automatique.",
  },
  {
    key: "shipping.countries",
    label: "Pays desservis",
    group: "Livraison",
    fallback: "CH",
    type: "text",
    help: "Codes pays séparés par /, par exemple CH / FR.",
  },
  {
    key: "shipping.defaultCarrier",
    label: "Transporteur principal",
    group: "Livraison",
    fallback: "Poste Suisse",
    type: "text",
    help: "Transporteur affiché par défaut sur les commandes.",
  },
  {
    key: "stock.lowThreshold",
    label: "Seuil stock faible",
    group: "Stock",
    fallback: "3",
    type: "number",
    help: "Déclenche l'alerte stock faible dans l'administration.",
  },
] as const;

const groupOrder = ["Boutique", "Commandes", "Factures", "Paiements", "Emails", "Livraison", "Stock"];

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const [settings, googleConnection, query] = await Promise.all([prisma.setting.findMany({
    orderBy: [{ group: "asc" }, { key: "asc" }],
  }), getGoogleBusinessConnection(), searchParams]);

  const settingsByKey = new Map(settings.map((setting) => [setting.key, setting]));

  const editableFields = editableSettings.map((setting) => ({
    ...setting,
    options: "options" in setting ? Array.from(setting.options) : undefined,
    value: settingsByKey.get(setting.key)?.value || setting.fallback,
  }));

  const groupedSettings = groupOrder
    .map((group) => ({
      group,
      items: editableFields.filter((setting) => setting.group === group),
    }))
    .filter((section) => section.items.length > 0);

  const activePayments = editableFields.find((setting) => setting.key === "payments.card")?.value === "Actif";
  const defaultCurrency = editableFields.find((setting) => setting.key === "shop.currency")?.value || "CHF";
  const lowStockThreshold = editableFields.find((setting) => setting.key === "stock.lowThreshold")?.value || "3";

  return (
    <AdminShell>
      <header className={styles.topbar}>
        <div>
          <p className={styles.kicker}>Configuration</p>
          <h1 className={styles.title}>Paramètres FAST CASH</h1>
          <p className={styles.subtitle}>
            Pilotez les réglages essentiels de la boutique depuis un centre de configuration clair,
            éditable et connecté aux données FAST CASH.
          </p>
        </div>
        <span className={styles.badge}>{editableFields.length} réglages V1</span>
      </header>

      <section className={styles.grid4}>
        <div className={styles.card}>
          <p className={styles.statLabel}>Boutique</p>
          <div className={styles.statValueSmall}>{settingsByKey.get("shop.name")?.value || "FAST CASH"}</div>
          <p className={styles.statHint}>Nom officiel</p>
        </div>
        <div className={styles.card}>
          <p className={styles.statLabel}>Devise</p>
          <div className={styles.statValueSmall}>{defaultCurrency}</div>
          <p className={styles.statHint}>Devise active</p>
        </div>
        <div className={styles.card}>
          <p className={styles.statLabel}>Paiement CB</p>
          <div className={styles.statValueSmall}>{activePayments ? "Actif" : "Inactif"}</div>
          <p className={styles.statHint}>Stripe réel à finaliser</p>
        </div>
        <div className={styles.card}>
          <p className={styles.statLabel}>Stock faible</p>
          <div className={styles.statValueSmall}>≤ {lowStockThreshold}</div>
          <p className={styles.statHint}>Seuil d'alerte</p>
        </div>
      </section>

      <section className={styles.googleBusinessPanel}>
        <div>
          <p className={styles.kicker}>Avis Google automatiques</p>
          <h2>{googleConnection.connected ? "Google Business connecté" : "Connecter Google Business"}</h2>
          <p className={styles.subtitle}>
            {googleConnection.connected
              ? `Établissement connecté : ${googleConnection.locationName || "Google Business"}. Les avis publics sont récupérés automatiquement sur la boutique.`
              : "Le client autorise FAST CASH avec son propre compte Google. Aucun mot de passe n’est transmis ni stocké."}
          </p>
          {query.google === "connected" ? <p className={styles.googleBusinessSuccess}>Connexion réussie : les avis Google sont maintenant reliés à FAST CASH.</p> : null}
          {query.google && !["connected", "disconnected"].includes(query.google) ? <p className={styles.googleBusinessError}>La connexion Google n’a pas pu être finalisée ({query.google}).</p> : null}
        </div>
        <div className={styles.googleBusinessActions}>
          {googleConnection.connected ? (
            <>
              <span className={styles.googleBusinessStatus}>● Connecté</span>
              <form action="/api/admin/google-business/disconnect" method="post">
                <button className={styles.buttonSecondary} type="submit">Déconnecter</button>
              </form>
            </>
          ) : (
            <a className={styles.button} href="/api/admin/google-business/connect">Connecter le compte Google</a>
          )}
        </div>
      </section>

      <SettingsForm settings={groupedSettings.flatMap((section) => section.items)} />
    </AdminShell>
  );
}
