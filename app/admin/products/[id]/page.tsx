import Image from "next/image";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import AdminShell from "../../AdminShell";
import AdminFlash from "../../AdminFlash";
import ConfirmSubmitButton from "../../ConfirmSubmitButton";
import ProductImageField from "../ProductImageField";
import ProductMediaManager from "../ProductMediaManager";
import styles from "../../admin.module.css";
import { prisma } from "@/lib/prisma";
import { getShopSettings } from "@/lib/settings";
import { saveProductImageFromForm } from "@/lib/admin-product-images";
import { requireAdminSession } from "@/lib/session";

function formatAdminPrice(value: number, currency: string) {
  return new Intl.NumberFormat("fr-CH", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function getStockLabel(stock: number, lowStockThreshold: number) {
  if (stock <= 0) return "Rupture";
  if (stock <= lowStockThreshold) return "Stock faible";
  return "Disponible";
}


function renderInlineProductText(value: string) {
  return value
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, index) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={`${index}-${part}`}>{part.slice(2, -2)}</strong>
      ) : (
        <span key={`${index}-${part}`}>{part}</span>
      ),
    );
}

function ProductDescription({ value }: { value: string }) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const sections = normalized.split(/\s*·\s*/).filter(Boolean);

  return (
    <div className={styles.productDescriptionContent}>
      {sections.map((section, index) =>
        index === 0 ? (
          <p key={`${index}-${section}`} className={styles.productDescriptionLead}>
            {renderInlineProductText(section)}
          </p>
        ) : (
          <div key={`${index}-${section}`} className={styles.productDescriptionItem}>
            <span className={styles.productDescriptionDot} aria-hidden="true" />
            <p>{renderInlineProductText(section)}</p>
          </div>
        ),
      )}
    </div>
  );
}

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

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const flashParams = await searchParams;
  const settings = await getShopSettings();
  const [product, categories, brands, mediaLibrary] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { category: true, brand: true, media: { orderBy: { position: "asc" }, include: { media: true } }, _count: { select: { orderItems: true } } },
    }),
    prisma.category.findMany({
      orderBy: [{ name: "asc" }, { position: "asc" }, { slug: "asc" }],
      include: { parent: { select: { name: true, slug: true } } },
    }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take: 200, select: { id: true, url: true, fileName: true, width: true, height: true, bytes: true } }),
  ]);

  if (!product) {
    notFound();
  }

  const productId = product.id;
  const productSlug = product.slug;
  const productReference = product.reference;
  const productUrl = productSlug ? `/produits/${productSlug}` : `/pilotage/produits/${productId}`;
  const inventoryValue = product.price * Math.max(product.stock, 0);
  const hasOrderHistory = product._count.orderItems > 0;

  async function updateProduct(formData: FormData) {
    "use server";
    await requireAdminSession();

    const name = String(formData.get("name") || "").trim();
    const referenceInput = String(formData.get("reference") || "").trim();
    const imageInput = String(formData.get("image") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const categoryId = String(formData.get("categoryId") || "").trim();
    const newCategoryName = String(formData.get("newCategoryName") || "").trim();
    const brandId = String(formData.get("brandId") || "").trim();
    const newBrandName = String(formData.get("newBrandName") || "").trim();
    const price = Number(String(formData.get("price") || "0").replace(",", "."));
    const stock = Number.parseInt(String(formData.get("stock") || "0"), 10);
    const visibility = String(formData.get("visibility") || "active");
    const condition = String(formData.get("condition") || "GOOD");

    if (!name || Number.isNaN(price) || Number.isNaN(stock) || price < 0) {
      throw new Error("Données produit invalides.");
    }

    const reference = referenceInput || productReference || (await getNextProductReference());
    const image = await saveProductImageFromForm(formData.get("imageFile"), imageInput, productSlug || productId);
    const finalCategoryId = await getOrCreateCategoryId(categoryId, newCategoryName);
    const finalBrandId = await getOrCreateBrandId(brandId, newBrandName);

    await prisma.product.update({
      where: { id: productId },
      data: {
        name,
        reference,
        image,
        description: description || null,
        categoryId: finalCategoryId,
        brandId: finalBrandId,
        price,
        stock,
        condition,
        active: visibility === "active",
      },
    });

    revalidatePath("/admin/products");
    revalidatePath("/admin/brands");
    revalidatePath("/admin/inventory");
    revalidatePath(`/admin/products/${productId}`);
    if (productSlug) {
      revalidatePath(`/produits/${productSlug}`);
    }

    redirect(`/pilotage/produits/${productId}?flash=productSaved`);
  }

  async function toggleProductVisibility() {
    "use server";
    await requireAdminSession();

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: { active: true, slug: true },
    });

    if (!existingProduct) {
      notFound();
    }

    await prisma.product.update({
      where: { id: productId },
      data: { active: !existingProduct.active },
    });

    revalidatePath("/admin/products");
    revalidatePath("/admin/brands");
    revalidatePath("/admin/inventory");
    revalidatePath(`/admin/products/${productId}`);
    if (existingProduct.slug) {
      revalidatePath(`/produits/${existingProduct.slug}`);
    }
  }

  async function deleteProduct() {
    "use server";
    await requireAdminSession();

    const orderItemsCount = await prisma.orderItem.count({ where: { productId } });

    if (orderItemsCount > 0) {
      await prisma.product.update({
        where: { id: productId },
        data: { active: false, stock: 0 },
      });
    } else {
      await prisma.product.delete({ where: { id: productId } });
    }

    revalidatePath("/admin/products");
    revalidatePath("/admin/brands");
    revalidatePath("/admin/inventory");
    if (productSlug) {
      revalidatePath(`/produits/${productSlug}`);
    }
    redirect("/pilotage/produits?flash=productDeleted");
  }

  return (
    <AdminShell>
      <AdminFlash value={flashParams?.flash} />
      <header className={styles.topbar}>
        <div>
          <p className={styles.kicker}>Fiche produit</p>
          <h1 className={styles.title}>{product.name}</h1>
          <p className={styles.subtitle}>
            Modifiez le prix, le stock, la catégorie et la visibilité. Les suppressions sont sécurisées pour préserver l’historique des commandes.
          </p>
        </div>
        <Link href="/pilotage/produits" className={styles.buttonSecondary}>
          ← Retour aux produits
        </Link>
      </header>

      <section className={styles.productHeroCard}>
        <div className={styles.productPreview}>
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              width={420}
              height={420}
              className={styles.productDetailImage}
              priority
            />
          ) : (
            <div className={styles.placeholder}>Image produit à importer</div>
          )}
        </div>

        <div className={styles.productSummary}>
          <div className={styles.productMetaLine}>
            <span>{product.category?.name || "Sans catégorie"}</span>
            <span>{product.brand?.name || "Sans marque"}</span>
            <span>{product.reference || `ID ${product.prestashopId || product.id}`}</span>
          </div>

          <h2>{formatAdminPrice(product.price, settings.defaultCurrency)}</h2>

          {product.description ? (
            <div className={styles.productDescriptionBlock}>
              <div className={styles.productDescriptionPreview}>
                <ProductDescription value={product.description} />
              </div>
              <details className={styles.productDescriptionDetails}>
                <summary>Voir toute la description</summary>
                <ProductDescription value={product.description} />
              </details>
            </div>
          ) : (
            <p className={styles.productDescriptionEmpty}>Description produit FAST CASH.</p>
          )}

          <div className={styles.productBadges}>
            <span className={styles.status}>{getStockLabel(product.stock, settings.lowStockThreshold)}</span>
            <span className={styles.status}>{product.stock} en stock</span>
            <span className={styles.status}>{product.active ? "Actif boutique" : "Masqué"}</span>
            {product.brand ? <span className={styles.status}>Marque : {product.brand.name}</span> : null}
            {hasOrderHistory ? <span className={styles.status}>Historique commandes</span> : null}
          </div>

          <div className={styles.actions}>
            <Link href={productUrl} className={styles.button}>
              Voir côté boutique
            </Link>
            <form action={toggleProductVisibility}>
              <button className={styles.buttonSecondary} type="submit">
                {product.active ? "Masquer de la boutique" : "Réactiver le produit"}
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <ProductMediaManager productId={product.id} initialLinks={product.media} library={mediaLibrary} />
      </section>

      <section className={styles.grid4}>
        <div className={styles.card}>
          <p className={styles.statLabel}>Prix actuel</p>
          <div className={styles.statValueSmall}>{formatAdminPrice(product.price, settings.defaultCurrency)}</div>
          <p className={styles.statHint}>Prix affiché sur la boutique</p>
        </div>
        <div className={styles.card}>
          <p className={styles.statLabel}>Stock</p>
          <div className={styles.statValueSmall}>{product.stock}</div>
          <p className={styles.statHint}>{getStockLabel(product.stock, settings.lowStockThreshold)}</p>
        </div>
        <div className={styles.card}>
          <p className={styles.statLabel}>Valeur stock</p>
          <div className={styles.statValueSmall}>{formatAdminPrice(inventoryValue, settings.defaultCurrency)}</div>
          <p className={styles.statHint}>Estimation prix de vente</p>
        </div>
        <div className={styles.card}>
          <p className={styles.statLabel}>Statut</p>
          <div className={styles.statValueSmall}>{product.active ? "Actif" : "Masqué"}</div>
          <p className={styles.statHint}>{hasOrderHistory ? "Suppression protégée" : "Suppression possible"}</p>
        </div>
      </section>

      <section className={styles.grid2}>
        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Modifier le produit</h3>
          <form action={updateProduct} className={styles.mockForm}>
            <label>
              <span>Nom du produit</span>
              <input name="name" defaultValue={product.name} required />
            </label>
            <label>
              <span>Référence interne</span>
              <input name="reference" defaultValue={product.reference || ""} placeholder="Automatique : FC-P-000001" />
              <small>Laissez vide : FAST CASH génère automatiquement une référence unique.</small>
            </label>
            <ProductImageField defaultImage={product.image} helpText="Remplacez l’image actuelle ou collez une URL déjà existante." />
            <label>
              <span>Description</span>
              <textarea name="description" defaultValue={product.description || ""} rows={5} />
            </label>
            <label>
              <span>Catégorie</span>
              <select name="categoryId" defaultValue={product.categoryId || ""}>
                <option value="">Sans catégorie</option>
                {categories.map((category) => {
                  const context = category.parent?.name || category.slug;
                  return (
                    <option key={category.id} value={category.id}>
                      {category.name} — {context}
                    </option>
                  );
                })}
              </select>
            </label>
            <div className={styles.inlineCreateBox}>
              <strong>Nouvelle catégorie rapide</strong>
              <p>À remplir uniquement si vous voulez créer une nouvelle catégorie et l’assigner à ce produit.</p>
              <input name="newCategoryName" placeholder="Ex : Trottinettes électriques" />
            </div>
            <label>
              <span>Marque</span>
              <select name="brandId" defaultValue={product.brandId || ""}>
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
              <p>À remplir uniquement si vous voulez créer une nouvelle marque et l’assigner à ce produit.</p>
              <input name="newBrandName" placeholder="Ex : Rolex, Apple, Sony" />
            </div>
            <label>
              <span>Prix de vente {settings.defaultCurrency}</span>
              <input name="price" type="number" step="0.01" min="0" defaultValue={product.price.toFixed(2)} required />
            </label>
            <label>
              <span>Stock disponible</span>
              <input name="stock" type="number" step="1" defaultValue={product.stock} required />
            </label>
            <label>
              <span>État du produit</span>
              <select name="condition" defaultValue={product.condition}>
                <option value="DAMAGED">Abîmé</option>
                <option value="GOOD">Bon état</option>
                <option value="EXCELLENT">Excellent état</option>
                <option value="LIKE_NEW">Comme neuf</option>
                <option value="NEW">Neuf</option>
              </select>
              <small>Cette information sera affichée clairement sur la fiche produit.</small>
            </label>
            <label>
              <span>Visibilité</span>
              <select name="visibility" defaultValue={product.active ? "active" : "hidden"}>
                <option value="active">Actif sur la boutique</option>
                <option value="hidden">Masqué temporairement</option>
              </select>
            </label>
            <ConfirmSubmitButton
              className={styles.button}
              message="Enregistrer les modifications ? Vérifiez la catégorie, le prix, le stock et la visibilité avant de confirmer."
              tone="default"
              pendingLabel="Enregistrement…"
            >
              Enregistrer les modifications
            </ConfirmSubmitButton>
          </form>
          <p className={styles.formNote}>
            Les changements sont enregistrés dans le système FAST CASH et répercutés sur le catalogue.
          </p>
        </div>

        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>SEO & catalogue</h3>
          <div className={styles.infoList}>
            <div>
              <span>Slug</span>
              <strong>{product.slug}</strong>
            </div>
            <div>
              <span>Catégorie</span>
              <strong>{product.category?.name || "—"}</strong>
            </div>
            <div>
              <span>Marque</span>
              <strong>{product.brand?.name || "—"}</strong>
            </div>
            <div>
              <span>URL boutique</span>
              <strong>{productUrl}</strong>
            </div>
            <div>
              <span>Titre SEO</span>
              <strong>{product.name} | FAST CASH Genève</strong>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <h3 className={styles.sectionTitle}>Zone sensible</h3>
        <p className={styles.formNote}>
          Si le produit est déjà lié à une commande, FAST CASH le masque automatiquement au lieu de le supprimer définitivement.
        </p>
        <form action={deleteProduct} className={styles.dangerZone}>
          <ConfirmSubmitButton
            className={styles.buttonDanger}
            message={
              hasOrderHistory
                ? "Ce produit est lié à une commande. Il sera masqué de la boutique et son stock sera mis à 0. Confirmer ?"
                : "Supprimer définitivement ce produit ? Cette action est irréversible."
            }
          >
            {hasOrderHistory ? "Masquer et vider le stock" : "Supprimer définitivement"}
          </ConfirmSubmitButton>
        </form>
      </section>
    </AdminShell>
  );
}
