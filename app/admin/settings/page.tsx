import AdminShell from "../AdminShell";
import styles from "../admin.module.css";
import { prisma } from "@/lib/prisma";
import SettingsForm from "./SettingsForm";
import { getGoogleBusinessConnection } from "@/lib/google-business-oauth";

const editableSettings = [
  { key:"shop.name", label:"Nom boutique", group:"Boutique", fallback:"FAST CASH Genève", type:"text", help:"Nom public et administratif." },
  { key:"shop.currency", label:"Devise principale", group:"Boutique", fallback:"CHF", type:"select", options:["CHF","EUR"], help:"Devise utilisée par défaut." },
  { key:"shop.languages", label:"Langues actives", group:"Boutique", fallback:"FR / EN", type:"multiselect", options:["FR","EN"], help:"Langues proposées aux visiteurs." },

  { key:"contact.addressLine1", label:"Adresse", group:"Coordonnées", fallback:"Rue de Monthoux 27", type:"text" },
  { key:"contact.postalCode", label:"NPA / Code postal", group:"Coordonnées", fallback:"1201", type:"text" },
  { key:"contact.city", label:"Ville", group:"Coordonnées", fallback:"Genève", type:"text" },
  { key:"contact.country", label:"Pays", group:"Coordonnées", fallback:"Suisse", type:"text" },
  { key:"contact.phoneDisplay", label:"Téléphone affiché", group:"Coordonnées", fallback:"+41 22 731 16 63", type:"text" },
  { key:"contact.phoneHref", label:"Téléphone international (lien)", group:"Coordonnées", fallback:"+41227311663", type:"text", help:"Format conseillé : +41227311663." },
  { key:"contact.email", label:"Email public", group:"Coordonnées", fallback:"contact@fastcash-geneve.ch", type:"email" },
  { key:"contact.mapsUrl", label:"Lien Google Maps", group:"Coordonnées", fallback:"https://www.google.com/maps/search/?api=1&query=Rue%20de%20Monthoux%2027%201201%20Gen%C3%A8ve", type:"url" },
  { key:"social.instagram", label:"Instagram", group:"Coordonnées", fallback:"", type:"url", help:"Laisser vide pour masquer Instagram." },

  { key:"hours.monday", label:"Lundi", group:"Horaires", fallback:"11:30 – 20:00", type:"text" },
  { key:"hours.tuesday", label:"Mardi", group:"Horaires", fallback:"10:00 – 20:00", type:"text" },
  { key:"hours.wednesday", label:"Mercredi", group:"Horaires", fallback:"10:00 – 20:00", type:"text" },
  { key:"hours.thursday", label:"Jeudi", group:"Horaires", fallback:"10:00 – 20:00", type:"text" },
  { key:"hours.friday", label:"Vendredi", group:"Horaires", fallback:"10:00 – 13:30 / 14:30 – 20:00", type:"text" },
  { key:"hours.saturday", label:"Samedi", group:"Horaires", fallback:"10:00 – 18:00", type:"text" },
  { key:"hours.sunday", label:"Dimanche", group:"Horaires", fallback:"Fermé", type:"text" },

  { key:"home.heroImage", label:"Image principale", group:"Accueil", fallback:"/images/hero/fastcash-luxury-hero.jpg", type:"image", help:"Image du grand Hero de la page d'accueil." },
  { key:"home.heroKickerFr", label:"Sur-titre FR", group:"Accueil", fallback:"Achat • Vente • Reprise", type:"text" },
  { key:"home.heroKickerEn", label:"Sur-titre EN", group:"Accueil", fallback:"Buy • Sell • Trade-in", type:"text" },
  { key:"home.heroTitle1Fr", label:"Titre ligne 1 FR", group:"Accueil", fallback:"Vos objets de valeur", type:"text" },
  { key:"home.heroTitle1En", label:"Titre ligne 1 EN", group:"Accueil", fallback:"Your valuables", type:"text" },
  { key:"home.heroTitle2Fr", label:"Titre ligne 2 FR", group:"Accueil", fallback:"Notre expertise", type:"text" },
  { key:"home.heroTitle2En", label:"Titre ligne 2 EN", group:"Accueil", fallback:"Our expertise", type:"text" },
  { key:"home.heroIntroFr", label:"Introduction FR", group:"Accueil", fallback:"Montres de luxe, iPhone, informatique, bijoux, maroquinerie et consoles : FAST CASH Genève sélectionne, contrôle et valorise vos produits premium.", type:"textarea" },
  { key:"home.heroIntroEn", label:"Introduction EN", group:"Accueil", fallback:"Luxury watches, iPhones, computers, jewelry, leather goods and consoles: FAST CASH Geneva selects, checks and values premium products.", type:"textarea" },
  { key:"home.heroProof1Fr", label:"Réassurance 1 FR", group:"Accueil", fallback:"Paiement immédiat", type:"text" },
  { key:"home.heroProof1En", label:"Réassurance 1 EN", group:"Accueil", fallback:"Immediate payment", type:"text" },
  { key:"home.heroProof2Fr", label:"Réassurance 2 FR", group:"Accueil", fallback:"Expertise gratuite", type:"text" },
  { key:"home.heroProof2En", label:"Réassurance 2 EN", group:"Accueil", fallback:"Free appraisal", type:"text" },
  { key:"home.heroProof3Fr", label:"Réassurance 3 FR", group:"Accueil", fallback:"Articles garantis", type:"text" },
  { key:"home.heroProof3En", label:"Réassurance 3 EN", group:"Accueil", fallback:"Guaranteed items", type:"text" },

  { key:"legal.businessName", label:"Raison sociale / nom légal", group:"Informations légales", fallback:"FAST CASH Genève", type:"text" },
  { key:"legal.companyId", label:"N° registre / IDE", group:"Informations légales", fallback:"", type:"text" },
  { key:"legal.vatNumber", label:"N° TVA", group:"Informations légales", fallback:"", type:"text" },
  { key:"legal.representative", label:"Représentant", group:"Informations légales", fallback:"", type:"text" },
  { key:"legal.jurisdiction", label:"For / juridiction", group:"Informations légales", fallback:"Genève, Suisse", type:"text" },
  { key:"legal.lastUpdated", label:"Dernière mise à jour", group:"Informations légales", fallback:"20 août 2026", type:"text" },

  { key:"orders.prefix", label:"Préfixe commandes", group:"Commandes", fallback:"FC", type:"text", help:"Exemple : FC-2026-0001." },
  { key:"invoices.prefix", label:"Préfixe factures", group:"Factures", fallback:"FA", type:"text", help:"Exemple : FA-2026-0001." },
  { key:"orders.email", label:"Email commandes", group:"Emails", fallback:"commande@fastcash-geneve.ch", type:"email" },
  { key:"payments.card", label:"Paiement CB", group:"Paiements", fallback:"Inactif", type:"switch" },
  { key:"payments.heylight", label:"Paiement HeyLight", group:"Paiements", fallback:"Inactif", type:"switch" },
  { key:"shipping.pickupEnabled", label:"Retrait en boutique", group:"Livraison", fallback:"Actif", type:"switch" },
  { key:"shipping.deliveryEnabled", label:"Livraison à domicile", group:"Livraison", fallback:"Inactif", type:"switch" },
  { key:"shipping.fee", label:"Frais de livraison (CHF)", group:"Livraison", fallback:"0", type:"number" },
  { key:"shipping.freeThreshold", label:"Livraison offerte dès (CHF)", group:"Livraison", fallback:"0", type:"number" },
  { key:"shipping.countries", label:"Pays desservis", group:"Livraison", fallback:"CH / FR", type:"text" },
  { key:"shipping.defaultCarrier", label:"Transporteur principal", group:"Livraison", fallback:"Poste Suisse", type:"text" },
  { key:"stock.lowThreshold", label:"Seuil stock faible", group:"Stock", fallback:"3", type:"number" },
] as const;

const groupOrder = ["Boutique","Coordonnées","Horaires","Accueil","Informations légales","Commandes","Factures","Paiements","Emails","Livraison","Stock"];

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
        <span className={styles.badge}>{editableFields.length} réglages V2</span>
      </header>

      <section className={`${styles.grid4} ${styles.settingsKpiGrid}`}>
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

      <SettingsForm settings={groupedSettings.flatMap((section) => section.items)} integrations={(
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
      )} />
    </AdminShell>
  );
}
