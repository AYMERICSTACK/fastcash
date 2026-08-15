import AdminShell from "../AdminShell";
import MediaLibrary from "./MediaLibrary";
import styles from "../admin.module.css";
import { prisma } from "@/lib/prisma";

export default async function MediaPage() {
  const assets = await prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { products: true } } }, take: 300 });
  return <AdminShell><header className={styles.topbar}><div><p className={styles.kicker}>Catalogue visuel</p><h1 className={styles.title}>Médiathèque</h1><p className={styles.subtitle}>Centralisez les images Cloudinary et réutilisez-les sur plusieurs produits.</p></div></header><section className={styles.card}><MediaLibrary initialAssets={assets} /></section></AdminShell>;
}
