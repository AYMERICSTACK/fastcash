import AdminShell from "../AdminShell";
import styles from "../admin.module.css";
import { prisma } from "@/lib/prisma";
import MarketingStudio from "./MarketingStudio";

export default async function MarketingPage() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      price: true,
      image: true,
      descriptionShort: true,
      category: { select: { name: true } },
      brand: { select: { name: true } },
    },
  });

  return (
    <AdminShell>
      <header className={styles.topbar}>
        <div>
          <p className={styles.kicker}>Marketing FAST CASH</p>
          <h1 className={styles.title}>Créateur de visuels</h1>
          <p className={styles.subtitle}>
            Transformez un produit du catalogue en publication Instagram premium en quelques secondes.
          </p>
        </div>
        <span className={styles.badge}>Instagram · Story</span>
      </header>

      <MarketingStudio products={products} />
    </AdminShell>
  );
}
