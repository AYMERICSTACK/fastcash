import Link from "next/link";
import styles from "../admin.module.css";
import AdminLoginForm from "./AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <main className={styles.loginPage}>
      <section className={styles.loginCard}>
        <p className={styles.kicker}>FAST CASH Admin</p>
        <h1 className={styles.loginTitle}>Connexion back-office</h1>
        <p className={styles.subtitle}>
          Accès sécurisé à l'administration FAST CASH Genève.
        </p>

        <AdminLoginForm />

        <div className={styles.loginActions}>
          <Link href="/" className={styles.buttonSecondary}>Retour boutique</Link>
        </div>

        <p className={styles.loginNote}>
          Accès réservé à l'équipe FAST CASH. Connexion sécurisée.
        </p>
      </section>
    </main>
  );
}
