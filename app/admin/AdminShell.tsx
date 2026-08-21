import Link from "next/link";
import styles from "./admin.module.css";
import AdminLogoutButton from "./AdminLogoutButton";
import AdminProviders from "./AdminProviders";
import { prisma } from "@/lib/prisma";

const navItems = [
  ["Dashboard", "/pilotage"],
  ["Commandes", "/pilotage/commandes"],
  ["Offres clients", "/pilotage/offres"],
  ["Produits", "/pilotage/produits"],
  ["Médiathèque", "/pilotage/medias"],
  ["Stocks", "/pilotage/stocks"],
  ["Catégories", "/pilotage/categories"],
  ["Marques", "/pilotage/marques"],
  ["Clients", "/pilotage/clients"],
  ["Factures", "/pilotage/factures"],
  ["Coupons", "/pilotage/coupons"],
  ["Avis clients", "/pilotage/avis"],
  ["Migration Prestashop", "/pilotage/migration-prestashop"],
  ["Paramètres", "/pilotage/parametres"],
] as const;

function NavLinks({ pendingOffers }: { pendingOffers: number }) {
  return (
    <>
      {navItems.map(([label, href]) => (
        <Link key={href} href={href}>
          <span>{label}</span>
          {href === "/pilotage/offres" && pendingOffers > 0 ? (
            <span className={styles.navCounter} aria-label={`${pendingOffers} offre(s) en attente`}>
              {pendingOffers > 99 ? "99+" : pendingOffers}
            </span>
          ) : null}
        </Link>
      ))}
    </>
  );
}

export default async function AdminShell({ children }: { children: React.ReactNode }) {
  const pendingOffers = await prisma.productOffer.count({ where: { status: "PENDING" } });

  return (
    <AdminProviders>
      <main className={styles.shell}>
        <aside className={styles.sidebar}>
          <Link href="/pilotage" className={styles.brand}>
            <strong>FAST CASH</strong>
            <span>Admin Genève</span>
          </Link>
          <nav className={styles.nav} aria-label="Administration">
            <NavLinks pendingOffers={pendingOffers} />
          </nav>
          <div className={styles.sidebarFooter}>
            <Link href="/" className={styles.backToStore}>Retour boutique</Link>
            <AdminLogoutButton />
          </div>
        </aside>

        <div className={styles.mobileAdminHeader}>
          <Link href="/pilotage" className={styles.mobileBrand}>
            <strong>FAST CASH</strong>
            <span>Pilotage</span>
          </Link>
          <details className={styles.mobileMenu}>
            <summary>
              <span>Menu</span>
              {pendingOffers > 0 ? <span className={styles.mobileAlertDot}>{pendingOffers > 99 ? "99+" : pendingOffers}</span> : null}
              <span className={styles.burgerIcon} aria-hidden="true"><i></i><i></i><i></i></span>
            </summary>
            <div className={styles.mobileMenuPanel}>
              <nav className={styles.mobileNav} aria-label="Administration mobile">
                <NavLinks pendingOffers={pendingOffers} />
              </nav>
              <div className={styles.mobileMenuFooter}>
                <Link href="/" className={styles.backToStore}>Retour boutique</Link>
                <AdminLogoutButton />
              </div>
            </div>
          </details>
        </div>

        <section className={styles.content}>{children}</section>
      </main>
    </AdminProviders>
  );
}
