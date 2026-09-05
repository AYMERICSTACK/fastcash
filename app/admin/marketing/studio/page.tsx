import Link from "next/link";
import { requireAdminSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import MarketingStudio from "../MarketingStudio";
import styles from "../../admin.module.css";

export const dynamic = "force-dynamic";

export default async function MarketingStudioPage() {
  await requireAdminSession();

  const products = await prisma.product.findMany({
    where: {
      active: true,
      stock: { gt: 0 },
    },
    select: {
      id: true,
      name: true,
      price: true,
      image: true,
      descriptionShort: true,
      category: { select: { name: true } },
      brand: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });

  return (
    <>
      <header className={styles.marketingStudioHero}>
        <div>
          <p>Marketing · Réseaux sociaux</p>
          <h1>Studio visuels</h1>
          <span>
            Créez un visuel Instagram FAST CASH à partir d’un produit du catalogue,
            puis exportez-le en haute définition.
          </span>
        </div>
        <Link href="/pilotage/marketing" className={styles.buttonSecondary}>
          ← Campagnes email
        </Link>
      </header>

      <MarketingStudio products={products} />
    </>
  );
}
