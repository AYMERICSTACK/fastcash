import AdminShell from "../AdminShell";
import styles from "../admin.module.css";
import PrestashopMigrationPanel from "./PrestashopMigrationPanel";

export default function PrestashopMigrationPage() {
  return (
    <AdminShell>
      <header className={styles.topbar}>
        <div>
          <p className={styles.kicker}>Migration catalogue</p>
          <h1 className={styles.title}>Migration Prestashop</h1>
          <p className={styles.subtitle}>
            Déposez un export SQL Prestashop pour vérifier sa structure, détecter
            automatiquement son préfixe et identifier les données disponibles avant
            tout import dans FAST CASH.
          </p>
        </div>
        <span className={styles.badge}>Analyse seule · aucune écriture</span>
      </header>

      <PrestashopMigrationPanel />
    </AdminShell>
  );
}
