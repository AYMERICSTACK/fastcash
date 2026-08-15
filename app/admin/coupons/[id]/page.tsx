import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import AdminShell from "../../AdminShell";
import ConfirmSubmitButton from "../../ConfirmSubmitButton";
import styles from "../../admin.module.css";
import { prisma } from "@/lib/prisma";
import { getShopSettings } from "@/lib/settings";
import { requireAdminSession } from "@/lib/session";

function parseOptionalDate(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim();
  return raw ? new Date(`${raw}T00:00:00.000Z`) : null;
}

function toDateInputValue(value: Date | null) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

function formatCouponValue(type: string, value: number, currency: string) {
  if (type === "PERCENT") return `${value}%`;
  return new Intl.NumberFormat("fr-CH", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function getCouponStatus(coupon: { active: boolean; startsAt: Date | null; expiresAt: Date | null }) {
  const now = new Date();
  if (!coupon.active) return "Inactif";
  if (coupon.startsAt && coupon.startsAt > now) return "Planifié";
  if (coupon.expiresAt && coupon.expiresAt < now) return "Expiré";
  return "Actif";
}

export default async function CouponDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const settings = await getShopSettings();
  const coupon = await prisma.coupon.findUnique({ where: { id } });

  if (!coupon) {
    notFound();
  }

  const couponId = coupon.id;

  async function updateCoupon(formData: FormData) {
    "use server";
    await requireAdminSession();

    const code = String(formData.get("code") || "").trim().toUpperCase().replace(/\s+/g, "-");
    const type = String(formData.get("type") || "PERCENT");
    const value = Number(String(formData.get("value") || "0").replace(",", "."));
    const active = String(formData.get("active") || "true") === "true";
    const startsAt = parseOptionalDate(formData.get("startsAt"));
    const expiresAt = parseOptionalDate(formData.get("expiresAt"));

    if (!code || !["PERCENT", "FIXED"].includes(type) || Number.isNaN(value) || value <= 0) {
      throw new Error("Coupon invalide.");
    }

    await prisma.coupon.update({
      where: { id: couponId },
      data: {
        code,
        type,
        value,
        active,
        startsAt,
        expiresAt,
      },
    });

    revalidatePath("/admin/coupons");
    revalidatePath(`/admin/coupons/${couponId}`);
  }

  async function toggleCoupon() {
    "use server";
    await requireAdminSession();

    const currentCoupon = await prisma.coupon.findUnique({
      where: { id: couponId },
      select: { active: true },
    });

    if (!currentCoupon) {
      notFound();
    }

    await prisma.coupon.update({
      where: { id: couponId },
      data: { active: !currentCoupon.active },
    });

    revalidatePath("/admin/coupons");
    revalidatePath(`/admin/coupons/${couponId}`);
  }

  async function deleteCoupon() {
    "use server";
    await requireAdminSession();

    await prisma.coupon.delete({ where: { id: couponId } });
    revalidatePath("/admin/coupons");
    redirect("/admin/coupons?flash=couponDeleted");
  }

  return (
    <AdminShell>
      <header className={styles.topbar}>
        <div>
          <p className={styles.kicker}>Fiche coupon</p>
          <h1 className={styles.title}>{coupon.code}</h1>
          <p className={styles.subtitle}>
            Modifiez la valeur, la période de validité et l’activation du coupon.
          </p>
        </div>
        <Link href="/admin/coupons" className={styles.buttonSecondary}>
          ← Retour aux coupons
        </Link>
      </header>

      <section className={styles.grid4}>
        <div className={styles.card}>
          <p className={styles.statLabel}>Code</p>
          <div className={styles.statValueSmall}>{coupon.code}</div>
          <p className={styles.statHint}>Identifiant promotionnel</p>
        </div>
        <div className={styles.card}>
          <p className={styles.statLabel}>Remise</p>
          <div className={styles.statValueSmall}>{formatCouponValue(coupon.type, coupon.value, settings.defaultCurrency)}</div>
          <p className={styles.statHint}>{coupon.type === "PERCENT" ? "Pourcentage" : "Montant fixe"}</p>
        </div>
        <div className={styles.card}>
          <p className={styles.statLabel}>Statut</p>
          <div className={styles.statValueSmall}>{getCouponStatus(coupon)}</div>
          <p className={styles.statHint}>État actuel du coupon</p>
        </div>
        <div className={styles.card}>
          <p className={styles.statLabel}>Devise</p>
          <div className={styles.statValueSmall}>{settings.defaultCurrency}</div>
          <p className={styles.statHint}>Pour les montants fixes</p>
        </div>
      </section>

      <section className={styles.grid2}>
        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Modifier le coupon</h3>
          <form action={updateCoupon} className={styles.mockForm}>
            <label>
              <span>Code promo</span>
              <input name="code" defaultValue={coupon.code} required />
            </label>
            <label>
              <span>Type de remise</span>
              <select name="type" defaultValue={coupon.type}>
                <option value="PERCENT">Pourcentage</option>
                <option value="FIXED">Montant fixe</option>
              </select>
            </label>
            <label>
              <span>Valeur</span>
              <input name="value" type="number" step="0.01" min="0" defaultValue={coupon.value} required />
            </label>
            <label>
              <span>Statut</span>
              <select name="active" defaultValue={coupon.active ? "true" : "false"}>
                <option value="true">Actif</option>
                <option value="false">Inactif</option>
              </select>
            </label>
            <label>
              <span>Date de début</span>
              <input name="startsAt" type="date" defaultValue={toDateInputValue(coupon.startsAt)} />
            </label>
            <label>
              <span>Date de fin</span>
              <input name="expiresAt" type="date" defaultValue={toDateInputValue(coupon.expiresAt)} />
            </label>
            <button className={styles.button} type="submit">
              Enregistrer les modifications
            </button>
          </form>
        </div>

        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Actions rapides</h3>
          <div className={styles.actions}>
            <form action={toggleCoupon}>
              <button className={styles.buttonSecondary} type="submit">
                {coupon.active ? "Désactiver" : "Réactiver"}
              </button>
            </form>
          </div>
          <div className={styles.infoList}>
            <div>
              <span>Créé le</span>
              <strong>{coupon.createdAt.toLocaleDateString("fr-FR")}</strong>
            </div>
            <div>
              <span>Dernière modification</span>
              <strong>{coupon.updatedAt.toLocaleDateString("fr-FR")}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <h3 className={styles.sectionTitle}>Zone sensible</h3>
        <p className={styles.formNote}>
          Supprimer un coupon l’enlève définitivement du back-office. Pour le garder en historique, préférez le désactiver.
        </p>
        <form action={deleteCoupon} className={styles.dangerZone}>
          <ConfirmSubmitButton
            className={styles.buttonDanger}
            message="Supprimer définitivement ce coupon ? Cette action est irréversible."
          >
            Supprimer définitivement le coupon
          </ConfirmSubmitButton>
        </form>
      </section>
    </AdminShell>
  );
}
