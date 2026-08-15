import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import AdminShell from "../AdminShell";
import styles from "../admin.module.css";
import { prisma } from "@/lib/prisma";
import AdminFlash from "../AdminFlash";
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

async function getUniqueCategorySlug(baseValue: string) {
  const baseSlug = normalizeSlug(baseValue) || `categorie-${Date.now()}`;
  let slug = baseSlug;
  let suffix = 2;

  while (await prisma.category.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const flashParams = await searchParams;
  const categories = await prisma.category.findMany({
    orderBy: [{ name: "asc" }, { position: "asc" }, { slug: "asc" }],
    include: {
      parent: { select: { name: true, slug: true } },
      _count: { select: { products: true, productLinks: true, children: true } },
    },
  });

  const totalProducts = categories.reduce((sum, category) => sum + category._count.products, 0);
  const emptyCategories = categories.filter((category) => category._count.products === 0 && category._count.productLinks === 0).length;

  async function createCategory(formData: FormData) {
    "use server";
    await requireAdminSession();

    const name = String(formData.get("name") || "").trim();
    const slugInput = String(formData.get("slug") || "").trim();

    if (!name) {
      throw new Error("Le nom de la catégorie est obligatoire.");
    }

    const requestedSlug = normalizeSlug(slugInput || name);

    if (RESERVED_CATEGORY_SLUGS.has(requestedSlug)) {
      redirect("/admin/categories?flash=reserved-category");
    }

    const slug = await getUniqueCategorySlug(slugInput || name);

    await prisma.category.create({
      data: { name, slug },
    });

    revalidatePath("/admin/categories");
    revalidatePath("/admin/products");
    revalidatePath("/admin/products/new");
    revalidatePath("/");
    revalidatePath("/sitemap.xml");
    redirect("/admin/categories?flash=categoryCreated");
  }

  return (
    <AdminShell>
      <AdminFlash value={flashParams?.flash} />
      <header className={styles.topbar}>
        <div>
          <p className={styles.kicker}>Catalogue FAST CASH</p>
          <h1 className={styles.title}>Catégories</h1>
          <p className={styles.subtitle}>
            Créez et organisez les univers produits utilisés dans le back-office FAST CASH.
          </p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.badge}>{categories.length} catégories</span>
          <Link href="/admin/products/new" className={styles.buttonSecondary}>
            + Nouveau produit
          </Link>
        </div>
      </header>

      <section className={styles.grid3}>
        <div className={styles.card}>
          <p className={styles.statLabel}>Catégories</p>
          <div className={styles.statValueSmall}>{categories.length}</div>
          <p className={styles.statHint}>Univers administrables</p>
        </div>
        <div className={styles.card}>
          <p className={styles.statLabel}>Produits associés</p>
          <div className={styles.statValueSmall}>{totalProducts}</div>
          <p className={styles.statHint}>Produits liés à une catégorie</p>
        </div>
        <div className={styles.card}>
          <p className={styles.statLabel}>Catégories vides</p>
          <div className={styles.statValueSmall}>{emptyCategories}</div>
          <p className={styles.statHint}>Supprimables directement</p>
        </div>
      </section>

      <section className={styles.grid2}>
        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Créer une catégorie</h3>
          <form action={createCategory} className={styles.mockForm}>
            <label>
              <span>Nom catégorie</span>
              <input name="name" placeholder="Ex : Trottinettes électriques" required />
            </label>
            <label>
              <span>Slug SEO optionnel</span>
              <input name="slug" placeholder="Laissez vide pour générer automatiquement" />
            </label>
            <button className={styles.button} type="submit">
              Créer la catégorie
            </button>
          </form>
          <p className={styles.formNote}>
            La catégorie sera immédiatement disponible dans l’admin, le menu boutique, les pages catégories et le sitemap.
          </p>
        </div>

        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Conseil catalogue</h3>
          <p className={styles.formNote}>
            Les catégories sont maintenant dynamiques côté boutique. Après création, ajoutez au moins un produit pour enrichir automatiquement la page publique.
          </p>
          <div className={styles.infoList}>
            <div><span>Création</span><strong>Oui</strong></div>
            <div><span>Modification</span><strong>Oui</strong></div>
            <div><span>Suppression</span><strong>Si catégorie vide</strong></div>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        {categories.length === 0 ? (
          <div className={styles.placeholder}>
            <div>
              <h3>Aucune catégorie</h3>
              <p>Créez votre première catégorie pour organiser le catalogue.</p>
            </div>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Catégorie</th>
                <th>Slug</th>
                <th>Parent / contexte</th>
                <th>Produits</th>
                <th>Statut</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td><strong>{category.name}</strong></td>
                  <td>{category.slug}</td>
                  <td>{category.parent ? `${category.parent.name} (${category.parent.slug})` : "Racine"}</td>
                  <td>{category._count.products}</td>
                  <td>
                    <span className={styles.status}>
                      {category._count.products > 0 || category._count.productLinks > 0 ? "Utilisée" : "Vide"}
                    </span>
                  </td>
                  <td>
                    <Link href={`/admin/categories/${category.id}`} className={styles.tableAction}>
                      Modifier
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AdminShell>
  );
}
