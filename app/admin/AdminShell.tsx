import Link from "next/link";
import styles from "./admin.module.css";
import AdminLogoutButton from "./AdminLogoutButton";
import AdminProviders from "./AdminProviders";

const navItems = [
  ["Dashboard", "/pilotage"],
  ["Commandes", "/pilotage/commandes"],
  ["Produits", "/pilotage/produits"],
  ["Médiathèque", "/pilotage/medias"],
  ["Stocks", "/pilotage/stocks"],
  ["Catégories", "/pilotage/categories"],
  ["Marques", "/pilotage/marques"],
  ["Clients", "/pilotage/clients"],
  ["Factures", "/pilotage/factures"],
  ["Coupons", "/pilotage/coupons"],
  ["Migration Prestashop", "/pilotage/migration-prestashop"],
  ["Paramètres", "/pilotage/parametres"],
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminProviders>
      <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/pilotage" className={styles.brand}>
          <strong>FAST CASH</strong>
          <span>Admin Genève</span>
        </Link>
        <nav className={styles.nav} aria-label="Administration">
          {navItems.map(([label, href]) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <Link href="/" className={styles.backToStore}>Retour boutique</Link>
          <AdminLogoutButton />
        </div>
      </aside>
      <section className={styles.content}>{children}</section>
      </main>
    </AdminProviders>
  );
}
