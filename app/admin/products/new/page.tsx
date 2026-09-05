import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import AdminShell from "../../AdminShell";
import NewProductGalleryField from "../NewProductGalleryField";
import styles from "../../admin.module.css";
import { prisma } from "@/lib/prisma";
import { getShopSettings } from "@/lib/settings";
import { uploadMediaToCloudinary } from "@/lib/cloudinary";
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

async function getUniqueProductSlug(baseValue: string) {
  const baseSlug = normalizeSlug(baseValue) || `produit-${Date.now()}`;
  let slug = baseSlug;
  let suffix = 2;

  while (await prisma.product.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

async function getNextProductReference() {
  const prefix = "FC-P-";
  const products = await prisma.product.findMany({
    where: { reference: { startsWith: prefix } },
    select: { reference: true },
  });

  const maxNumber = products.reduce((max, product) => {
    const reference = product.reference || "";
    const numericPart = reference.slice(prefix.length);
    const value = Number.parseInt(numericPart, 10);
    return Number.isNaN(value) ? max : Math.max(max, value);
  }, 0);

  let nextNumber = maxNumber + 1;
  let reference = `${prefix}${String(nextNumber).padStart(6, "0")}`;

  while (await prisma.product.findFirst({ where: { reference }, select: { id: true } })) {
    nextNumber += 1;
    reference = `${prefix}${String(nextNumber).padStart(6, "0")}`;
  }

  return reference;
}

function parsePrice(value: FormDataEntryValue | null) {
  return Number(String(value || "0").replace(",", "."));
}

function parseStock(value: FormDataEntryValue | null) {
  return Number.parseInt(String(value || "0"), 10);
}


async function getOrCreateBrandId(brandId: string, brandName: string) {
  if (brandId) return brandId;

  const cleanName = brandName.trim();
  if (!cleanName) return null;

  const baseSlug = normalizeSlug(cleanName) || `marque-${Date.now()}`;
  let slug = baseSlug;
  let suffix = 2;

  while (await prisma.brand.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const brand = await prisma.brand.create({
    data: { name: cleanName, slug },
    select: { id: true },
  });

  revalidatePath("/admin/brands");
  return brand.id;
}

async function getOrCreateCategoryId(categoryId: string, categoryName: string) {
  if (categoryId) return categoryId;

  const cleanName = categoryName.trim();
  if (!cleanName) return null;

  const baseSlug = normalizeSlug(cleanName) || `categorie-${Date.now()}`;
  let slug = baseSlug;
  let suffix = 2;

  while (await prisma.category.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const category = await prisma.category.create({
    data: { name: cleanName, slug },
    select: { id: true },
  });

  revalidatePath("/admin/categories");
  return category.id;
}

export default async function NewProductPage() {
  const [settings, categories, brands] = await Promise.all([
    getShopSettings(),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
  ]);

  async function createProduct(formData: FormData) {
    "use server";
    await requireAdminSession();

    const name = String(formData.get("name") || "").trim();
    const slugInput = String(formData.get("slug") || "").trim();
    const referenceInput = String(formData.get("reference") || "").trim();
    const imageInput = String(formData.get("image") || "").trim();
    const galleryFiles = formData.getAll("galleryFiles").filter((entry): entry is File => entry instanceof File && entry.size > 0);
    const description = String(formData.get("description") || "").trim();
    const categoryId = String(formData.get("categoryId") || "").trim();
    const newCategoryName = String(formData.get("newCategoryName") || "").trim();
    const brandId = String(formData.get("brandId") || "").trim();
    const newBrandName = String(formData.get("newBrandName") || "").trim();
    const price = parsePrice(formData.get("price"));
    const stock = parseStock(formData.get("stock"));
    const visibility = String(formData.get("visibility") || "active");
    const condition = String(formData.get("condition") || "GOOD");

    if (!name) {
      throw new Error("Le nom du produit est obligatoire.");
    }

    if (Number.isNaN(price) || price < 0) {
      throw new Error("Le prix du produit est invalide.");
    }

    if (Number.isNaN(stock) || stock < 0) {
      throw new Error("Le stock du produit est invalide.");
    }

    const slug = await getUniqueProductSlug(slugInput || name);
    const reference = referenceInput || (await getNextProductReference());
    const finalCategoryId = await getOrCreateCategoryId(categoryId, newCategoryName);
    const finalBrandId = await getOrCreateBrandId(brandId, newBrandName);
    if (galleryFiles.length > 12) {
      throw new Error("Vous pouvez ajouter jusqu’à 12 photos par produit.");
    }

    const uploadedGallery = [];
    for (const file of galleryFiles) {
      const uploaded = await uploadMediaToCloudinary(file);
      uploadedGallery.push({ file, uploaded });
    }

    const primaryImage = uploadedGallery[0]?.uploaded.secure_url || imageInput || null;

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        reference,
        image: primaryImage,
        description: description || null,
        categoryId: finalCategoryId,
        brandId: finalBrandId,
        price,
        stock,
        condition,
        active: visibility === "active",
        media: uploadedGallery.length
          ? {
              create: uploadedGallery.map(({ file, uploaded }, index) => ({
                position: index,
                isPrimary: index === 0,
                alt: name,
                media: {
                  create: {
                    url: uploaded.secure_url,
                    publicId: uploaded.public_id,
                    fileName: file.name || uploaded.original_filename,
                    mimeType: file.type,
                    format: uploaded.format,
                    width: uploaded.width,
                    height: uploaded.height,
                    bytes: uploaded.bytes,
                  },
                },
              })),
            }
          : undefined,
      },
      select: {
        id: true,
        slug: true,
      },
    });

    revalidatePath("/admin/products");
    revalidatePath("/admin/brands");
    revalidatePath("/admin/inventory");
    revalidatePath("/recherche");
    revalidatePath("/sitemap.xml");
    revalidatePath(`/produits/${product.slug}`);

    redirect(`/pilotage/produits/${product.id}?flash=productCreated`);
  }

  return (
    <AdminShell>
      <header className={styles.topbar}>
        <div>
          <p className={styles.kicker}>Catalogue FAST CASH</p>
          <h1 className={styles.title}>Nouveau produit</h1>
          <p className={styles.subtitle}>
            Ajoutez un produit directement dans le système FAST CASH. Le slug peut être généré automatiquement à partir du nom.
          </p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.badge}>Création produit</span>
          <Link href="/admin/products" className={styles.buttonSecondary}>
            ← Retour aux produits
          </Link>
        </div>
      </header>

      <section className={styles.grid2}>
        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Informations produit</h3>
          <form action={createProduct} className={styles.mockForm}>
            <label>
              <span>Nom du produit</span>
              <input name="name" placeholder="Ex : iPhone 15 Pro Max 256GB" required />
            </label>

            <label>
              <span>Slug SEO optionnel</span>
              <input name="slug" placeholder="Laissez vide pour générer automatiquement" />
            </label>

            <label>
              <span>Référence interne</span>
              <input name="reference" placeholder="Automatique : FC-P-000001" />
              <small>Laissez vide : FAST CASH génère automatiquement une référence unique.</small>
            </label>

            <NewProductGalleryField />

            <label>
              <span>Description</span>
              <textarea
                name="description"
                rows={6}
                placeholder="Décrivez l’état, les accessoires inclus, la garantie et les informations utiles pour le client."
              />
            </label>

            <label>
              <span>Catégorie</span>
              <select name="categoryId" defaultValue="">
                <option value="">Sans catégorie</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <div className={styles.inlineCreateBox}>
              <strong>Nouvelle catégorie rapide</strong>
              <p>À remplir uniquement si la catégorie n’existe pas encore.</p>
              <input name="newCategoryName" placeholder="Ex : Trottinettes électriques" />
            </div>

            <label>
              <span>Marque</span>
              <select name="brandId" defaultValue="">
                <option value="">Sans marque</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </label>

            <div className={styles.inlineCreateBox}>
              <strong>Nouvelle marque rapide</strong>
              <p>À remplir uniquement si la marque n’existe pas encore.</p>
              <input name="newBrandName" placeholder="Ex : Rolex, Apple, Sony" />
            </div>


            <label>
              <span>Prix de vente {settings.defaultCurrency}</span>
              <input name="price" type="number" step="0.01" min="0" placeholder="0.00" required />
            </label>

            <label>
              <span>Stock disponible</span>
              <input name="stock" type="number" step="1" min="0" placeholder="1" required />
            </label>

            <label>
              <span>État du produit</span>
              <select name="condition" defaultValue="GOOD">
                <option value="DAMAGED">Abîmé</option>
                <option value="GOOD">Bon état</option>
                <option value="EXCELLENT">Excellent état</option>
                <option value="LIKE_NEW">Comme neuf</option>
                <option value="NEW">Neuf</option>
              </select>
            </label>

            <label>
              <span>Visibilité</span>
              <select name="visibility" defaultValue="active">
                <option value="active">Actif sur la boutique</option>
                <option value="hidden">Créer en brouillon / masqué</option>
              </select>
            </label>

            <div className={styles.actions}>
              <button className={styles.button} type="submit">
                Créer le produit
              </button>
              <Link href="/admin/products" className={styles.buttonSecondary}>
                Annuler
              </Link>
            </div>
          </form>
        </div>

        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Bonnes pratiques</h3>
          <div className={styles.infoList}>
            <div>
              <span>Slug</span>
              <strong>Automatique si le champ reste vide</strong>
            </div>
            <div>
              <span>Référence</span>
              <strong>Automatique au format FC-P-000001 si le champ reste vide</strong>
            </div>
            <div>
              <span>Image</span>
              <strong>Ajout fichier premium ou URL existante</strong>
            </div>
            <div>
              <span>Marque</span>
              <strong>Sélectionnez une marque existante ou créez-la rapidement</strong>
            </div>
            <div>
              <span>Stock</span>
              <strong>0 = rupture, le produit reste administrable</strong>
            </div>
            <div>
              <span>Visibilité</span>
              <strong>Masqué permet de préparer un produit sans l’afficher</strong>
            </div>
          </div>
          <p className={styles.formNote}>
            Le produit créé sera immédiatement disponible dans le back-office. S’il est actif, il pourra apparaître côté boutique selon les pages catalogue.
          </p>
        </div>
      </section>
    </AdminShell>
  );
}
