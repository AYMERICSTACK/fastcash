import Link from "next/link";
import { requireAdminSession } from "@/lib/session";
import { getInstagramConnection } from "@/lib/instagram-oauth";
import MarketingStudio from "../MarketingStudio";
import styles from "../../admin.module.css";

export const dynamic = "force-dynamic";

export default async function MarketingStudioPage() {
  await requireAdminSession();
  const instagram = await getInstagramConnection();

  const expiresSoon = instagram.expiresAt
    ? instagram.expiresAt.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
    : false;

  return (
    <>
      <header className={styles.marketingStudioHero}>
        <div>
          <p>Marketing · Réseaux sociaux</p>
          <h1>Publication Instagram</h1>
          <span>
            Importez un visuel créé sur Canva, ajoutez votre légende puis publiez-le directement sur Instagram.
          </span>
        </div>
        <Link href="/pilotage" className={styles.buttonSecondary}>
          ← Retour au Pilotage
        </Link>
      </header>

      <section className={styles.instagramConnectCard}>
        <div className={styles.instagramConnectIcon} aria-hidden="true">◎</div>
        <div className={styles.instagramConnectCopy}>
          <span>Instagram Business</span>
          {instagram.connected ? (
            <>
              <strong>@{instagram.username || "fastcash.ge"} connecté</strong>
              <small>
                Publication API autorisée
                {instagram.expiresAt ? ` · jeton valable jusqu’au ${instagram.expiresAt.toLocaleDateString("fr-CH")}` : ""}
              </small>
              {expiresSoon ? <em>Le jeton arrive bientôt à expiration : reconnectez Instagram.</em> : null}
            </>
          ) : (
            <>
              <strong>Connecter le compte Instagram FAST CASH</strong>
              <small>
                Noureddine peut effectuer cette connexion lui-même depuis le BO, sans partager son mot de passe.
              </small>
            </>
          )}
        </div>
        <div className={styles.instagramConnectActions}>
          {instagram.connected ? (
            <>
              <a className={styles.buttonSecondary} href="/api/admin/instagram/connect">Reconnecter</a>
              <form action="/api/admin/instagram/disconnect" method="post">
                <button className={styles.instagramDisconnect} type="submit">Déconnecter</button>
              </form>
            </>
          ) : (
            <a className={styles.button} href="/api/admin/instagram/connect">Connecter Instagram</a>
          )}
        </div>
      </section>

      <MarketingStudio
        instagramConnected={instagram.connected}
        instagramUsername={instagram.username || "fastcash.ge"}
      />
    </>
  );
}
