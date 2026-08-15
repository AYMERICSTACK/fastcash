import Image from "next/image";
import Link from "next/link";
import AdminShell from "../AdminShell";
import AdminFlash from "../AdminFlash";
import styles from "../admin.module.css";
import { prisma } from "@/lib/prisma";
import { formatAdminPrice } from "@/lib/admin-data";
import { getShopSettings } from "@/lib/settings";
import { getStockLabel } from "@/lib/admin-ui";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const settings = await getShopSettings();
  const value = (key: string) => {
    const raw = params[key];
    return Array.isArray(raw) ? raw[0] ?? "" : raw ?? "";
  };
  const q = value("q").trim();
  const category = value("category");
  const brand = value("brand");
  const status = value("status");
  const sort = value("sort") || "updated-desc";
  const page = Math.max(1, Number.parseInt(value("page") || "1", 10) || 1);
  const pageSize = 50;

  const where = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { reference: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
            { brand: { name: { contains: q, mode: "insensitive" as const } } },
            { category: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
    ...(category ? { category: { slug: category } } : {}),
    ...(brand ? { brand: { slug: brand } } : {}),
    ...(status === "active" ? { active: true } : {}),
    ...(status === "out" ? { stock: { lte: 0 } } : {}),
    ...(status === "low"
      ? { stock: { gt: 0, lte: settings.lowStockThreshold } }
      : {}),
  };

  const orderBy =
    sort === "name-asc" ? { name: "asc" as const } :
    sort === "price-asc" ? { price: "asc" as const } :
    sort === "price-desc" ? { price: "desc" as const } :
    sort === "stock-asc" ? { stock: "asc" as const } :
    sort === "stock-desc" ? { stock: "desc" as const } :
    { updatedAt: "desc" as const };

  const [productCount, filteredCount, products, categories, brands, lowStockTotal, outOfStockTotal] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { category: true, brand: true },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.category.findMany({ where: { active: true, products: { some: {} } }, orderBy: { name: "asc" }, select: { name: true, slug: true } }),
    prisma.brand.findMany({ where: { active: true, products: { some: {} } }, orderBy: { name: "asc" }, select: { name: true, slug: true } }),
    prisma.product.count({ where: { stock: { gt: 0, lte: settings.lowStockThreshold } } }),
    prisma.product.count({ where: { stock: { lte: 0 } } }),
  ]);
  const pageCount = Math.max(1, Math.ceil(filteredCount / pageSize));
  const hrefForPage = (target: number) => {
    const next = new URLSearchParams();
    for (const key of ["q", "category", "brand", "status", "sort"]) {
      const current = value(key);
      if (current) next.set(key, current);
    }
    next.set("page", String(target));
    return `/admin/products?${next.toString()}`;
  };

  return (
    <AdminShell>
      <AdminFlash value={params.flash} />
      <header className={styles.topbar}>
        <div>
          <p className={styles.kicker}>Catalogue FAST CASH</p>
          <h1 className={styles.title}>Produits</h1>
          <p className={styles.subtitle}>Recherchez et filtrez tout le catalogue sans parcourir les produits un par un.</p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.badge}>{productCount} produits en base</span>
          <Link href="/admin/products/new" className={styles.button}>+ Nouveau produit</Link>
        </div>
      </header>

      <section className={styles.grid4}>
        <div className={styles.card}><p className={styles.statLabel}>Produits</p><div className={styles.statValueSmall}>{productCount}</div><p className={styles.statHint}>Catalogue complet</p></div>
        <div className={styles.card}><p className={styles.statLabel}>Résultats</p><div className={styles.statValueSmall}>{filteredCount}</div><p className={styles.statHint}>Selon vos filtres</p></div>
        <div className={styles.card}><p className={styles.statLabel}>Stock faible</p><div className={styles.statValueSmall}>{lowStockTotal}</div><p className={styles.statHint}>Catalogue complet</p></div>
        <div className={styles.card}><p className={styles.statLabel}>Ruptures</p><div className={styles.statValueSmall}>{outOfStockTotal}</div><p className={styles.statHint}>Catalogue complet</p></div>
      </section>

      <form className={styles.catalogToolbar} action="/admin/products" method="get">
        <label className={styles.catalogSearch}>
          <span>Recherche</span>
          <input name="q" defaultValue={q} placeholder="Nom, référence, marque, catégorie…" />
        </label>
        <label><span>Catégorie</span><select name="category" defaultValue={category}><option value="">Toutes</option>{categories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
        <label><span>Marque</span><select name="brand" defaultValue={brand}><option value="">Toutes</option>{brands.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
        <label><span>Stock / statut</span><select name="status" defaultValue={status}><option value="">Tous</option><option value="active">Actifs</option><option value="low">Stock faible</option><option value="out">Rupture</option></select></label>
        <label><span>Trier par</span><select name="sort" defaultValue={sort}><option value="updated-desc">Plus récents</option><option value="name-asc">Nom A–Z</option><option value="price-asc">Prix croissant</option><option value="price-desc">Prix décroissant</option><option value="stock-asc">Stock croissant</option><option value="stock-desc">Stock décroissant</option></select></label>
        <button className={styles.button} type="submit">Rechercher</button>
        <Link className={styles.buttonSecondary} href="/admin/products">Réinitialiser</Link>
      </form>

      <section className={styles.card}>
        {products.length === 0 ? <div className={styles.placeholder}><div><h3>Aucun produit trouvé</h3><p>Modifiez ou réinitialisez les filtres.</p></div></div> : (
          <table className={styles.table}><thead><tr><th>Produit</th><th>Catégorie</th><th>Marque</th><th>Référence</th><th>Stock</th><th>Prix</th><th>Statut</th></tr></thead><tbody>
          {products.map((product) => <tr key={product.id}><td><Link href={`/admin/products/${product.id}`} className={styles.productCell}>{product.image ? <Image src={product.image} alt="" width={46} height={46} className={styles.thumb} /> : <span className={styles.thumb} />}<span className={styles.stacked}><strong>{product.name}</strong><span>{product.slug}</span></span></Link></td><td>{product.category?.name || "—"}</td><td>{product.brand?.name || "—"}</td><td>{product.reference || product.prestashopId || "—"}</td><td><span className={styles.stockValue}>{product.stock}</span></td><td>{formatAdminPrice(product.price, settings.defaultCurrency)}</td><td><span className={styles.status}>{getStockLabel(product.stock, settings.lowStockThreshold)}</span></td></tr>)}
          </tbody></table>
        )}
      </section>

      {pageCount > 1 && <nav className={styles.catalogPagination} aria-label="Pagination produits"><Link className={styles.buttonSecondary} aria-disabled={page <= 1} href={hrefForPage(Math.max(1, page - 1))}>← Précédent</Link><span>Page {page} / {pageCount} · {filteredCount} résultat{filteredCount > 1 ? "s" : ""}</span><Link className={styles.buttonSecondary} aria-disabled={page >= pageCount} href={hrefForPage(Math.min(pageCount, page + 1))}>Suivant →</Link></nav>}
    </AdminShell>
  );
}
