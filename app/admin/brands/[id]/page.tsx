import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import AdminShell from "../../AdminShell";
import AdminFlash from "../../AdminFlash";
import ConfirmSubmitButton from "../../ConfirmSubmitButton";
import styles from "../../admin.module.css";
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

async function getUniqueBrandSlug(baseValue: string, currentId: string) {
  const baseSlug = normalizeSlug(baseValue) || `marque-${Date.now()}`;
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await prisma.brand.findUnique({ where: { slug }, select: { id: true } });
    if (!existing || existing.id === currentId) return slug;
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

export default async function AdminBrandDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const flashParams = await searchParams;
  const brand = await prisma.brand.findUnique({
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

  if (!brand) {
    notFound();
  }

  async function updateBrand(formData: FormData) {
    "use server";
    await requireAdminSession();

    const name = String(formData.get("name") || "").trim();
    const slugInput = String(formData.get("slug") || "").trim();

    if (!name) {
      throw new Error("Le nom de la marque est obligatoire.");
    }

    const slug = await getUniqueBrandSlug(slugInput || name, id);

    await prisma.brand.update({
      where: { id },
      data: { name, slug },
    });

    revalidatePath("/admin/brands");
    revalidatePath(`/admin/brands/${id}`);
    revalidatePath("/admin/products");
    revalidatePath("/admin/products/new");
    revalidatePath("/");
    revalidatePath("/sitemap.xml");
    redirect(`/admin/brands/${id}?flash=brandSaved`);
  }

  async function deleteBrand() {
    "use server";
    await requireAdminSession();

    const productsCount = await prisma.product.count({ where: { brandId: id } });

    if (productsCount > 0) {
      throw new Error("Impossible de supprimer une marque qui contient des produits.");
    }

    await prisma.brand.delete({ where: { id } });

    revalidatePath("/admin/brands");
    revalidatePath("/admin/products");
    revalidatePath("/admin/products/new");
    revalidatePath("/");
    revalidatePath("/sitemap.xml");
    redirect("/admin/brands?flash=brandDeleted");
  }

  return (
    <AdminShell>
      <AdminFlash value={flashParams?.flash} />
      <header className={styles.topbar}>
        <div>
          <p className={styles.kicker}>Marque FAST CASH</p>
          <h1 className={styles.title}>{brand.name}</h1>
          <p className={styles.subtitle}>
            Modifiez le nom et le slug utilisés dans le catalogue administrable.
          </p>
        </div>
        <Link href="/admin/brands" className={styles.buttonSecondary}>
          ← Retour aux marques
        </Link>
      </header>

      <section className={styles.grid3}>
        <div className={styles.card}>
          <p className={styles.statLabel}>Produits</p>
          <div className={styles.statValueSmall}>{brand._count.products}</div>
          <p className={styles.statHint}>Associés à cette marque</p>
        </div>
        <div className={styles.card}>
          <p className={styles.statLabel}>Slug</p>
          <div className={styles.statValueSmall}>{brand.slug}</div>
          <p className={styles.statHint}>Identifiant SEO</p>
        </div>
        <div className={styles.card}>
          <p className={styles.statLabel}>Suppression</p>
          <div className={styles.statValueSmall}>{brand._count.products === 0 ? "Possible" : "Protégée"}</div>
          <p className={styles.statHint}>Sécurité catalogue</p>
        </div>
      </section>

      <section className={styles.grid2}>
        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Modifier la marque</h3>
          <form action={updateBrand} className={styles.mockForm}>
            <label>
              <span>Nom marque</span>
              <input name="name" defaultValue={brand.name} required />
            </label>
            <label>
              <span>Slug SEO</span>
              <input name="slug" defaultValue={brand.slug} required />
            </label>
            <button className={styles.button} type="submit">
              Enregistrer les modifications
            </button>
          </form>
        </div>

        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Produits récents</h3>
          {brand.products.length === 0 ? (
            <p className={styles.formNote}>Aucun produit n’est encore associé à cette marque.</p>
          ) : (
            <div className={styles.alertList}>
              {brand.products.map((product: { id: string; name: string; stock: number; active: boolean }) => (
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
          Une marque ne peut être supprimée que si aucun produit n’y est associé.
        </p>
        {brand._count.products === 0 ? (
          <form action={deleteBrand} className={styles.dangerZone}>
            <ConfirmSubmitButton
              className={styles.buttonDanger}
              message="Supprimer définitivement cette marque ? Cette action est irréversible."
            >
              Supprimer définitivement
            </ConfirmSubmitButton>
          </form>
        ) : (
          <span className={styles.status}>Suppression verrouillée : marque utilisée</span>
        )}
      </section>
    </AdminShell>
  );
}
