import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import AdminShell from "../../AdminShell";
import AdminFlash from "../../AdminFlash";
import ConfirmSubmitButton from "../../ConfirmSubmitButton";
import styles from "../../admin.module.css";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/session";

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
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: { select: { products: true } },
      products: {
        orderBy: { updatedAt: "desc" },
        take: 12,
        select: { id: true, name: true, stock: true, active: true },
      },
    },
  });

  if (!category) {
    notFound();
  }

  async function updateCategory(formData: FormData) {
    "use server";
    await requireAdminSession();

    const name = String(formData.get("name") || "").trim();
    const slugInput = String(formData.get("slug") || "").trim();

    if (!name) {
      throw new Error("Le nom de la catégorie est obligatoire.");
    }

    const requestedSlug = normalizeSlug(slugInput || name);

    if (RESERVED_CATEGORY_SLUGS.has(requestedSlug)) {
      redirect(`/admin/categories/${id}?flash=reserved-category`);
    }

    const slug = await getUniqueCategorySlug(slugInput || name, id);

    await prisma.category.update({
      where: { id },
      data: { name, slug },
    });

    revalidatePath("/admin/categories");
    revalidatePath(`/admin/categories/${id}`);
    revalidatePath("/admin/products");
    revalidatePath("/");
    revalidatePath(`/categories/${slug}`);
    revalidatePath("/sitemap.xml");
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
            Modifiez le nom et le slug utilisés dans le catalogue administrable.
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
          <p className={styles.statHint}>Associés à cette catégorie</p>
        </div>
        <div className={styles.card}>
          <p className={styles.statLabel}>Slug</p>
          <div className={styles.statValueSmall}>{category.slug}</div>
          <p className={styles.statHint}>Identifiant SEO</p>
        </div>
        <div className={styles.card}>
          <p className={styles.statLabel}>Suppression</p>
          <div className={styles.statValueSmall}>{category._count.products === 0 ? "Possible" : "Protégée"}</div>
          <p className={styles.statHint}>Sécurité catalogue</p>
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
              <span>Slug SEO</span>
              <input name="slug" defaultValue={category.slug} required />
            </label>
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

      <section className={styles.card}>
        <h3 className={styles.sectionTitle}>Zone sensible</h3>
        <p className={styles.formNote}>
          Une catégorie ne peut être supprimée que si aucun produit n’y est associé.
        </p>
        {category._count.products === 0 ? (
          <form action={deleteCategory} className={styles.dangerZone}>
            <ConfirmSubmitButton
              className={styles.buttonDanger}
              message="Supprimer définitivement cette catégorie ? Cette action est irréversible."
            >
              Supprimer définitivement
            </ConfirmSubmitButton>
          </form>
        ) : (
          <span className={styles.status}>Suppression verrouillée : catégorie utilisée</span>
        )}
      </section>
    </AdminShell>
  );
}
