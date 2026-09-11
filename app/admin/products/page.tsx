import Image from "next/image";
import Link from "next/link";
import AdminShell from "../AdminShell";
import AdminFlash from "../AdminFlash";
import styles from "../admin.module.css";
import { prisma } from "@/lib/prisma";
import { formatAdminPrice } from "@/lib/admin-data";
import { getShopSettings } from "@/lib/settings";
import { getStockLabel } from "@/lib/admin-ui";
import { getDescendantCategoryIds } from "@/lib/category-tree";
import ProductCategoryFilter from "./ProductCategoryFilter";
import ProductToolbarSelect from "./ProductToolbarSelect";

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

  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, parentId: true },
  });
  const selectedCategory = category ? categories.find((item) => item.slug === category) : undefined;
  const selectedCategoryIds = selectedCategory
    ? [selectedCategory.id, ...getDescendantCategoryIds(selectedCategory.id, categories)]
    : [];

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
    ...(selectedCategoryIds.length ? { categoryId: { in: selectedCategoryIds } } : {}),
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

  const [productCount, filteredCount, products, brands, lowStockTotal, outOfStockTotal] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { category: true, brand: true },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
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
        <ProductCategoryFilter categories={categories} defaultSlug={category} />
        <ProductToolbarSelect
          name="brand"
          label="Marque"
          eyebrow="Marque"
          defaultValue={brand}
          allLabel="Toutes les marques"
          searchable
          options={brands.map((item) => ({ value: item.slug, label: item.name }))}
        />
        <ProductToolbarSelect
          name="status"
          label="Stock / statut"
          eyebrow="Disponibilité"
          defaultValue={status}
          allLabel="Tous les statuts"
          options={[
            { value: "active", label: "Actifs", hint: "Produits publiés" },
            { value: "low", label: "Stock faible", hint: "À surveiller" },
            { value: "out", label: "Rupture", hint: "Stock à zéro" },
          ]}
        />
        <ProductToolbarSelect
          name="sort"
          label="Trier par"
          eyebrow="Ordre"
          defaultValue={sort}
          allLabel="Plus récents"
          options={[
            { value: "updated-desc", label: "Plus récents", hint: "Modifiés récemment" },
            { value: "name-asc", label: "Nom A–Z" },
            { value: "price-asc", label: "Prix croissant" },
            { value: "price-desc", label: "Prix décroissant" },
            { value: "stock-asc", label: "Stock croissant" },
            { value: "stock-desc", label: "Stock décroissant" },
          ]}
        />
        <button className={styles.button} type="submit">Rechercher</button>
        <Link className={styles.buttonSecondary} href="/admin/products">Réinitialiser</Link>
      </form>

      <section className={styles.card}>
        {products.length === 0 ? <div className={styles.placeholder}><div><h3>Aucun produit trouvé</h3><p>Modifiez ou réinitialisez les filtres.</p></div></div> : (
          <>
          <div className={styles.adminDesktopTable}>
            <table className={styles.table}><thead><tr><th>Produit</th><th>Catégorie</th><th>Marque</th><th>Référence</th><th>Stock</th><th>Prix</th><th>Statut</th></tr></thead><tbody>
            {products.map((product) => <tr key={product.id}><td><Link href={`/pilotage/produits/${product.id}`} className={styles.productCell}>{product.image ? <Image src={product.image} alt="" width={46} height={46} className={styles.thumb} /> : <span className={styles.thumb} />}<span className={styles.stacked}><strong>{product.name}</strong><span>{product.slug}</span></span></Link></td><td>{product.category?.name || "—"}</td><td>{product.brand?.name || "—"}</td><td>{product.reference || product.prestashopId || "—"}</td><td><span className={styles.stockValue}>{product.stock}</span></td><td>{formatAdminPrice(product.price, settings.defaultCurrency)}</td><td><span className={styles.status}>{getStockLabel(product.stock, settings.lowStockThreshold)}</span></td></tr>)}
            </tbody></table>
          </div>
          <div className={styles.adminMobileList}>
            {products.map((product) => (
              <Link key={product.id} href={`/pilotage/produits/${product.id}`} className={styles.adminMobileCard}>
                <div className={styles.adminMobileProductRow}>
                  {product.image ? <Image src={product.image} alt="" width={58} height={58} className={styles.thumb} /> : <span className={styles.thumb} />}
                  <div className={styles.adminMobileMain}><strong>{product.name}</strong><span>{product.reference || product.prestashopId || product.slug}</span></div>
                </div>
                <div className={styles.adminMobileMetaGrid}>
                  <span><small>Catégorie</small><strong>{product.category?.name || "—"}</strong></span>
                  <span><small>Marque</small><strong>{product.brand?.name || "—"}</strong></span>
                  <span><small>Stock</small><strong>{product.stock}</strong></span>
                  <span><small>Prix</small><strong>{formatAdminPrice(product.price, settings.defaultCurrency)}</strong></span>
                </div>
                <span className={styles.adminMobileOpen}>Modifier le produit →</span>
              </Link>
            ))}
          </div>
          </>
        )}
      </section>

      {pageCount > 1 && <nav className={styles.catalogPagination} aria-label="Pagination produits"><Link className={styles.buttonSecondary} aria-disabled={page <= 1} href={hrefForPage(Math.max(1, page - 1))}>← Précédent</Link><span>Page {page} / {pageCount} · {filteredCount} résultat{filteredCount > 1 ? "s" : ""}</span><Link className={styles.buttonSecondary} aria-disabled={page >= pageCount} href={hrefForPage(Math.min(pageCount, page + 1))}>Suivant →</Link></nav>}
    </AdminShell>
  );
}
