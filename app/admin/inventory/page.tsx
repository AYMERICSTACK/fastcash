import Image from "next/image";
import Link from "next/link";
import AdminShell from "../AdminShell";
import styles from "../admin.module.css";
import { prisma } from "@/lib/prisma";
import { formatAdminPrice } from "@/lib/admin-data";
import { getShopSettings } from "@/lib/settings";
import { getStockLabel } from "@/lib/admin-ui";

export default async function AdminInventoryPage() {
  const settings = await getShopSettings();
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { stock: { lte: settings.lowStockThreshold } },
        { active: false },
      ],
    },
    include: { category: true },
    orderBy: [{ stock: "asc" }, { updatedAt: "desc" }],
    take: 80,
  });

  const [totalProducts, activeProducts, outOfStockCount, globalStock] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { active: true } }),
    prisma.product.count({ where: { stock: { lte: 0 } } }),
    prisma.product.findMany({ select: { price: true, stock: true } }),
  ]);

  const lowStockCount = await prisma.product.count({
    where: { stock: { gt: 0, lte: settings.lowStockThreshold } },
  });

  const totalValue = globalStock.reduce(
    (sum, product) => sum + product.price * Math.max(product.stock, 0),
    0,
  );

  return (
    <AdminShell>
      <header className={styles.topbar}>
        <div>
          <p className={styles.kicker}>Opérationnel magasin</p>
          <h1 className={styles.title}>Stocks</h1>
          <p className={styles.subtitle}>
            Surveillance réelle du catalogue FAST CASH : ruptures, stocks faibles,
            produits masqués et valeur immobilisée.
          </p>
        </div>
        <span className={styles.badge}>Seuil faible : {settings.lowStockThreshold}</span>
      </header>

      <section className={styles.grid4}>
        <article className={styles.card}>
          <p className={styles.statLabel}>Produits en base</p>
          <div className={styles.statValue}>{totalProducts}</div>
          <p className={styles.statHint}>{activeProducts} visibles boutique</p>
        </article>
        <article className={styles.card}>
          <p className={styles.statLabel}>Valeur stock</p>
          <div className={styles.statValue}>{formatAdminPrice(totalValue, settings.defaultCurrency)}</div>
          <p className={styles.statHint}>Prix de vente estimé</p>
        </article>
        <article className={styles.card}>
          <p className={styles.statLabel}>Stock faible</p>
          <div className={styles.statValue}>{lowStockCount}</div>
          <p className={styles.statHint}>Entre 1 et {settings.lowStockThreshold}</p>
        </article>
        <article className={styles.card}>
          <p className={styles.statLabel}>Ruptures</p>
          <div className={styles.statValue}>{outOfStockCount}</div>
          <p className={styles.statHint}>À traiter en priorité</p>
        </article>
      </section>

      <div className={styles.grid2}>
        <section className={styles.card}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>Alertes</p>
              <h2 className={styles.sectionTitle}>Produits à surveiller</h2>
            </div>
            <span className={styles.badge}>{products.length} ligne(s)</span>
          </div>

          {products.length === 0 ? (
            <div className={styles.placeholder}>
              <div>
                <h3>Aucune alerte stock</h3>
                <p>Tous les produits visibles sont au-dessus du seuil configuré.</p>
              </div>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Catégorie</th>
                  <th>Stock</th>
                  <th>Valeur</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <Link href={`/admin/products/${product.id}`} className={styles.productCell}>
                        {product.image ? (
                          <Image src={product.image} alt="" width={46} height={46} className={styles.thumb} />
                        ) : (
                          <span className={styles.thumb} />
                        )}
                        <span className={styles.stacked}>
                          <strong>{product.name}</strong>
                          <span>{product.active ? "Visible boutique" : "Produit masqué"}</span>
                        </span>
                      </Link>
                    </td>
                    <td>{product.category?.name || "—"}</td>
                    <td>
                      <span className={styles.status}>{getStockLabel(product.stock, settings.lowStockThreshold)}</span>
                    </td>
                    <td>{formatAdminPrice(product.price * Math.max(product.stock, 0), settings.defaultCurrency)}</td>
                    <td>
                      <Link href={`/admin/products/${product.id}`} className={styles.tableAction}>Corriger</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Actions rapides</h2>
          <div className={styles.quickActions}>
            <Link className={styles.actionBtn} href="/admin/products">Catalogue complet</Link>
            <Link className={styles.actionBtn} href="/admin/settings">Modifier le seuil faible</Link>
            <Link className={styles.actionBtn} href="/admin/orders">Commandes à préparer</Link>
          </div>
          <p className={styles.formNote}>
            Le seuil de stock faible vient des paramètres FAST CASH. Une modification dans Paramètres met à jour cette page.
          </p>
        </section>
      </div>
    </AdminShell>
  );
}
