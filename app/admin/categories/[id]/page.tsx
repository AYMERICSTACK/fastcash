import { invalidateCategoryCache } from "@/lib/cache-invalidation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import AdminShell from "../../AdminShell";
import AdminFlash from "../../AdminFlash";
import ConfirmSubmitButton from "../../ConfirmSubmitButton";
import CategoryImageField from "./CategoryImageField";
import styles from "../../admin.module.css";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/session";
import { toPublicCategory } from "@/lib/public-categories";
import { categoryPathLabel, getDescendantCategoryIds, sortCategoriesByPath } from "@/lib/category-tree";

const RESERVED_CATEGORY_SLUGS = new Set(["accueil"]);

function normalizeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " et ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

async function getUniqueCategorySlug(baseValue: string, currentId: string) {
  const baseSlug = normalizeSlug(baseValue) || `categorie-${Date.now()}`;
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
    if (!existing || existing.id === currentId) return slug;
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

export default async function AdminCategoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const flashParams = await searchParams;
  const [category, allCategoriesRaw] = await Promise.all([
    prisma.category.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: { select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } },
        _count: { select: { products: true, children: true } },
        products: {
        orderBy: { updatedAt: "desc" },
        take: 12,
        select: { id: true, name: true, stock: true, active: true },
        },
      },
    }),
    prisma.category.findMany({
      select: { id: true, name: true, slug: true, parentId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!category) {
    notFound();
  }


  const allCategories = sortCategoriesByPath(allCategoriesRaw);
  const categoryById = new Map(allCategories.map((item) => [item.id, item]));
  const descendantIds = getDescendantCategoryIds(id, allCategories);
  const availableParents = allCategories.filter(
    (item) => item.id !== id && !descendantIds.has(item.id),
  );

  // Mirror the storefront resolution order: custom DB image → static category visual → global fallback.
  const effectiveCategoryImage = toPublicCategory(category).image;

  async function updateCategory(formData: FormData) {
    "use server";
    await requireAdminSession();

    const name = String(formData.get("name") || "").trim();
    const slugInput = String(formData.get("slug") || "").trim();
    const image = String(formData.get("image") || "").trim();
    const parentId = String(formData.get("parentId") || "").trim() || null;

    if (!name) {
      throw new Error("Le nom de la catégorie est obligatoire.");
    }

    const requestedSlug = normalizeSlug(slugInput || name);

    if (RESERVED_CATEGORY_SLUGS.has(requestedSlug)) {
      invalidateCategoryCache();
      redirect(`/admin/categories/${id}?flash=reserved-category`);
    }

    const slug = await getUniqueCategorySlug(slugInput || name, id);

    if (parentId) {
      const candidates = await prisma.category.findMany({
        select: { id: true, name: true, slug: true, parentId: true },
      });
      const forbidden = getDescendantCategoryIds(id, candidates);
      if (parentId === id || forbidden.has(parentId)) {
        throw new Error("Une catégorie ne peut pas être placée sous elle-même ou sous l’une de ses sous-catégories.");
      }
      const parentExists = candidates.some((item) => item.id === parentId);
      if (!parentExists) throw new Error("La catégorie parente sélectionnée est introuvable.");
    }

    await prisma.category.update({
      where: { id },
      data: { name, slug, image: image || null, parentId },
    });

    revalidatePath("/admin/categories");
    revalidatePath(`/admin/categories/${id}`);
    revalidatePath("/admin/products");
    revalidatePath("/");
    revalidatePath(`/categories/${slug}`);
    revalidatePath("/sitemap.xml");
    invalidateCategoryCache();
    redirect(`/admin/categories/${id}?flash=categorySaved`);
  }

  async function deleteCategory() {
    "use server";
    await requireAdminSession();

    const [productsCount, linksCount, childrenCount] = await Promise.all([
      prisma.product.count({ where: { categoryId: id } }),
      prisma.productCategory.count({ where: { categoryId: id } }),
      prisma.category.count({ where: { parentId: id } }),
    ]);

    if (productsCount > 0 || linksCount > 0 || childrenCount > 0) {
      throw new Error("Impossible de supprimer une catégorie encore utilisée par des produits ou des sous-catégories.");
    }

    await prisma.category.delete({ where: { id } });

    revalidatePath("/admin/categories");
    revalidatePath("/admin/products");
    revalidatePath("/");
    revalidatePath("/sitemap.xml");
    invalidateCategoryCache();
    redirect("/admin/categories?flash=categoryDeleted");
  }

  return (
    <AdminShell>
      <AdminFlash value={flashParams?.flash} />
      <header className={styles.topbar}>
        <div>
          <p className={styles.kicker}>Catégorie FAST CASH</p>
          <h1 className={styles.title}>{category.name}</h1>
          <p className={styles.subtitle}>
            Modifiez le nom, le parent, le slug et le visuel de cette catégorie.
          </p>
        </div>
        <Link href="/admin/categories" className={styles.buttonSecondary}>
          ← Retour aux catégories
        </Link>
      </header>

      <section className={styles.grid3}>
        <div className={styles.card}>
          <p className={styles.statLabel}>Produits</p>
          <div className={styles.statValueSmall}>{category._count.products}</div>
          <p className={styles.statHint}>Associés directement à cette catégorie</p>
        </div>
        <div className={styles.card}>
          <p className={styles.statLabel}>Slug</p>
          <div className={styles.statValueSmall}>{category.slug}</div>
          <p className={styles.statHint}>Identifiant SEO</p>
        </div>
        <div className={styles.card}>
          <p className={styles.statLabel}>Sous-catégories</p>
          <div className={styles.statValueSmall}>{category._count.children}</div>
          <p className={styles.statHint}>{category.parent ? `Parent : ${category.parent.name}` : "Catégorie principale"}</p>
        </div>
      </section>

      <section className={styles.grid2}>
        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Modifier la catégorie</h3>
          <form action={updateCategory} className={styles.mockForm}>
            <label>
              <span>Nom catégorie</span>
              <input name="name" defaultValue={category.name} required />
            </label>
            <label>
              <span>Catégorie parente</span>
              <select name="parentId" defaultValue={category.parentId || ""}>
                <option value="">— Catégorie principale —</option>
                {availableParents.map((item) => (
                  <option key={item.id} value={item.id}>
                    {categoryPathLabel(item, categoryById)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Slug SEO</span>
              <input name="slug" defaultValue={category.slug} required />
            </label>
            <CategoryImageField
              currentImage={category.image}
              effectiveImage={effectiveCategoryImage}
              categoryName={category.name}
            />
            <button className={styles.button} type="submit">
              Enregistrer les modifications
            </button>
          </form>
        </div>

        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Produits récents</h3>
          {category.products.length === 0 ? (
            <p className={styles.formNote}>Aucun produit n’est encore associé à cette catégorie.</p>
          ) : (
            <div className={styles.alertList}>
              {category.products.map((product: { id: string; name: string; stock: number; active: boolean }) => (
                <Link key={product.id} href={`/admin/products/${product.id}`} className={styles.alertRow}>
                  <span>
                    <strong>{product.name}</strong>
                    <small>{product.active ? "Actif" : "Masqué"} · stock {product.stock}</small>
                  </span>
                  <em>Ouvrir</em>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {category.children.length > 0 ? (
        <section className={styles.card}>
          <h3 className={styles.sectionTitle}>Sous-catégories</h3>
          <div className={styles.alertList}>
            {category.children.map((child) => (
              <Link key={child.id} href={`/admin/categories/${child.id}`} className={styles.alertRow}>
                <span><strong>{child.name}</strong><small>{child.slug}</small></span>
                <em>Ouvrir</em>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.card}>
        <h3 className={styles.sectionTitle}>Zone sensible</h3>
        <p className={styles.formNote}>
          Une catégorie ne peut être supprimée que si aucun produit n’y est associé.
        </p>
        {category._count.products === 0 && category._count.children === 0 ? (
          <form action={deleteCategory} className={styles.dangerZone}>
            <ConfirmSubmitButton
              className={styles.buttonDanger}
              message="Supprimer définitivement cette catégorie ? Cette action est irréversible."
            >
              Supprimer définitivement
            </ConfirmSubmitButton>
          </form>
        ) : (
          <span className={styles.status}>Suppression verrouillée : catégorie utilisée ou contenant des sous-catégories</span>
        )}
      </section>
    </AdminShell>
  );
}
