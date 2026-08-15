import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import AdminShell from "../AdminShell";
import AdminFlash from "../AdminFlash";
import styles from "../admin.module.css";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/session";

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

async function getUniqueBrandSlug(baseValue: string) {
  const baseSlug = normalizeSlug(baseValue) || `marque-${Date.now()}`;
  let slug = baseSlug;
  let suffix = 2;

  while (await prisma.brand.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

export default async function AdminBrandsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const flashParams = await searchParams;
  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  const totalProducts = brands.reduce((sum: number, brand: { _count: { products: number } }) => sum + brand._count.products, 0);
  const emptyBrands = brands.filter((brand: { _count: { products: number } }) => brand._count.products === 0).length;

  async function createBrand(formData: FormData) {
    "use server";
    await requireAdminSession();

    const name = String(formData.get("name") || "").trim();
    const slugInput = String(formData.get("slug") || "").trim();

    if (!name) {
      throw new Error("Le nom de la marque est obligatoire.");
    }

    const slug = await getUniqueBrandSlug(slugInput || name);

    await prisma.brand.create({
      data: { name, slug },
    });

    revalidatePath("/admin/brands");
    revalidatePath("/admin/products");
    revalidatePath("/admin/products/new");
    revalidatePath("/");
    revalidatePath("/sitemap.xml");
    redirect("/admin/brands?flash=brandCreated");
  }

  return (
    <AdminShell>
      <AdminFlash value={flashParams?.flash} />
      <header className={styles.topbar}>
        <div>
          <p className={styles.kicker}>Catalogue FAST CASH</p>
          <h1 className={styles.title}>Marques</h1>
          <p className={styles.subtitle}>
            Gérez les marques utilisées pour enrichir les fiches produits et structurer le catalogue.
          </p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.badge}>{brands.length} marques</span>
          <Link href="/admin/products/new" className={styles.buttonSecondary}>
            + Nouveau produit
          </Link>
        </div>
      </header>

      <section className={styles.grid3}>
        <div className={styles.card}>
          <p className={styles.statLabel}>Marques</p>
          <div className={styles.statValueSmall}>{brands.length}</div>
          <p className={styles.statHint}>Références administrables</p>
        </div>
        <div className={styles.card}>
          <p className={styles.statLabel}>Produits associés</p>
          <div className={styles.statValueSmall}>{totalProducts}</div>
          <p className={styles.statHint}>Produits liés à une marque</p>
        </div>
        <div className={styles.card}>
          <p className={styles.statLabel}>Marques vides</p>
          <div className={styles.statValueSmall}>{emptyBrands}</div>
          <p className={styles.statHint}>Supprimables directement</p>
        </div>
      </section>

      <section className={styles.grid2}>
        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Créer une marque</h3>
          <form action={createBrand} className={styles.mockForm}>
            <label>
              <span>Nom marque</span>
              <input name="name" placeholder="Ex : Rolex, Apple, Samsung" required />
            </label>
            <label>
              <span>Slug SEO optionnel</span>
              <input name="slug" placeholder="Laissez vide pour générer automatiquement" />
            </label>
            <button className={styles.button} type="submit">
              Créer la marque
            </button>
          </form>
          <p className={styles.formNote}>
            La marque sera immédiatement disponible dans les formulaires produits.
          </p>
        </div>

        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Conseil catalogue</h3>
          <p className={styles.formNote}>
            Les marques permettent d’améliorer la lecture des fiches produits et préparer de futurs filtres premium.
          </p>
          <div className={styles.infoList}>
            <div><span>Création</span><strong>Oui</strong></div>
            <div><span>Modification</span><strong>Oui</strong></div>
            <div><span>Suppression</span><strong>Si marque vide</strong></div>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        {brands.length === 0 ? (
          <div className={styles.placeholder}>
            <div>
              <h3>Aucune marque</h3>
              <p>Créez votre première marque pour organiser le catalogue.</p>
            </div>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Marque</th>
                <th>Slug</th>
                <th>Produits</th>
                <th>Statut</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((brand: { id: string; name: string; slug: string; _count: { products: number } }) => (
                <tr key={brand.id}>
                  <td><strong>{brand.name}</strong></td>
                  <td>{brand.slug}</td>
                  <td>{brand._count.products}</td>
                  <td>
                    <span className={styles.status}>
                      {brand._count.products > 0 ? "Utilisée" : "Vide"}
                    </span>
                  </td>
                  <td>
                    <Link href={`/admin/brands/${brand.id}`} className={styles.tableAction}>
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
