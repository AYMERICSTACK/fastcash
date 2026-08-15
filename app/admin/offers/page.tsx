import Link from "next/link";
import AdminShell from "../AdminShell";
import styles from "../admin.module.css";
import { prisma } from "@/lib/prisma";
import { formatAdminDate, getOfferStatusLabel } from "@/lib/admin-ui";
import { formatAdminPrice } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

function statusClass(status: string) {
  if (status === "PENDING") return styles.offerStatusPending;
  if (status === "ACCEPTED") return styles.offerStatusAccepted;
  if (status === "COUNTERED") return styles.offerStatusCountered;
  if (status === "PURCHASED") return styles.offerStatusPurchased;
  if (status === "REFUSED") return styles.offerStatusRefused;
  return styles.offerStatusExpired;
}

export default async function Page() {
  const rows = await prisma.productOffer.findMany({
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });
  const pendingCount = rows.filter((row) => row.status === "PENDING").length;

  return (
    <AdminShell>
      <header className={styles.topbar}>
        <div>
          <p className={styles.kicker}>Négociation commerciale</p>
          <h1 className={styles.title}>Offres clients</h1>
          <p className={styles.subtitle}>Acceptez, refusez ou envoyez une contre-offre avec lien d&apos;achat privé.</p>
        </div>
        <span className={styles.badge}>{pendingCount} en attente</span>
      </header>

      <section className={`${styles.card} ${styles.offerDesktopTable}`}>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead><tr><th>Produit</th><th>Client</th><th>Prix</th><th>Offre</th><th>Statut</th><th>Date</th><th></th></tr></thead>
            <tbody>
              {rows.map((offer) => (
                <tr key={offer.id}>
                  <td><Link href={`/pilotage/offres/${offer.id}`}><strong>{offer.product.name}</strong></Link></td>
                  <td>{offer.customerName}<br/><small>{offer.customerEmail}</small></td>
                  <td>{formatAdminPrice(offer.listPrice, "CHF")}</td>
                  <td><strong>{formatAdminPrice(offer.negotiatedPrice ?? offer.offeredPrice, "CHF")}</strong></td>
                  <td><span className={`${styles.offerStatus} ${statusClass(offer.status)}`}>{getOfferStatusLabel(offer.status)}</span></td>
                  <td>{formatAdminDate(offer.createdAt)}</td>
                  <td><Link href={`/pilotage/offres/${offer.id}`} className={styles.tableAction}>Ouvrir</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.offerMobileList}>
        {rows.map((offer) => (
          <Link href={`/pilotage/offres/${offer.id}`} className={styles.offerMobileCard} key={offer.id}>
            <div className={styles.offerMobileTop}>
              <span className={`${styles.offerStatus} ${statusClass(offer.status)}`}>{getOfferStatusLabel(offer.status)}</span>
              <time>{formatAdminDate(offer.createdAt)}</time>
            </div>
            <strong className={styles.offerMobileProduct}>{offer.product.name}</strong>
            <div className={styles.offerMobileClient}><strong>{offer.customerName}</strong><span>{offer.customerEmail}</span></div>
            <div className={styles.offerMobilePrices}>
              <span>Prix public<strong>{formatAdminPrice(offer.listPrice, "CHF")}</strong></span>
              <span>Offre<strong>{formatAdminPrice(offer.negotiatedPrice ?? offer.offeredPrice, "CHF")}</strong></span>
            </div>
            <span className={styles.offerMobileOpen}>Voir et traiter l&apos;offre →</span>
          </Link>
        ))}
      </section>
    </AdminShell>
  );
}
