import Link from "next/link";
import { revalidatePath } from "next/cache";
import AdminShell from "../AdminShell";
import AdminFlash from "../AdminFlash";
import styles from "../admin.module.css";
import { prisma } from "@/lib/prisma";
import { getShopSettings } from "@/lib/settings";
import { requireAdminSession } from "@/lib/session";

function parseOptionalDate(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim();
  return raw ? new Date(`${raw}T00:00:00.000Z`) : null;
}

function formatCouponValue(type: string, value: number, currency: string) {
  if (type === "PERCENT") return `${value}%`;
  return new Intl.NumberFormat("fr-CH", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(value);
}

function getCouponStatus(coupon: { active: boolean; startsAt: Date | null; expiresAt: Date | null }) {
  const now = new Date();
  if (!coupon.active) return "Inactif";
  if (coupon.startsAt && coupon.startsAt > now) return "Planifié";
  if (coupon.expiresAt && coupon.expiresAt < now) return "Expiré";
  return "Actif";
}

export default async function CouponsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const flashParams = await searchParams;
  const settings = await getShopSettings();
  const coupons = await prisma.coupon.findMany({ orderBy: { updatedAt: "desc" } });

  const activeCount = coupons.filter((coupon) => getCouponStatus(coupon) === "Actif").length;
  const plannedCount = coupons.filter((coupon) => getCouponStatus(coupon) === "Planifié").length;
  const inactiveCount = coupons.filter((coupon) => !coupon.active).length;

  async function createCoupon(formData: FormData) {
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

    await prisma.coupon.create({
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
  }

  return (
    <AdminShell>
      <AdminFlash value={flashParams?.flash} />
      <header className={styles.topbar}>
        <div>
          <p className={styles.kicker}>Marketing</p>
          <h1 className={styles.title}>Coupons</h1>
          <p className={styles.subtitle}>
            Créez, modifiez et désactivez les codes promotionnels FAST CASH depuis le back-office.
          </p>
        </div>
        <span className={styles.badge}>{coupons.length} coupons</span>
      </header>

      <section className={styles.grid4}>
        <div className={styles.card}>
          <p className={styles.statLabel}>Coupons</p>
          <div className={styles.statValueSmall}>{coupons.length}</div>
          <p className={styles.statHint}>Total en base</p>
        </div>
        <div className={styles.card}>
          <p className={styles.statLabel}>Actifs</p>
          <div className={styles.statValueSmall}>{activeCount}</div>
          <p className={styles.statHint}>Utilisables maintenant</p>
        </div>
        <div className={styles.card}>
          <p className={styles.statLabel}>Planifiés</p>
          <div className={styles.statValueSmall}>{plannedCount}</div>
          <p className={styles.statHint}>Activation future</p>
        </div>
        <div className={styles.card}>
          <p className={styles.statLabel}>Inactifs</p>
          <div className={styles.statValueSmall}>{inactiveCount}</div>
          <p className={styles.statHint}>Non visibles au checkout</p>
        </div>
      </section>

      <section className={styles.grid2}>
        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Créer un coupon</h3>
          <form action={createCoupon} className={styles.mockForm}>
            <label>
              <span>Code promo</span>
              <input name="code" placeholder="WELCOME10" required />
            </label>
            <label>
              <span>Type de remise</span>
              <select name="type" defaultValue="PERCENT">
                <option value="PERCENT">Pourcentage</option>
                <option value="FIXED">Montant fixe</option>
              </select>
            </label>
            <label>
              <span>Valeur</span>
              <input name="value" type="number" step="0.01" min="0" placeholder="10" required />
            </label>
            <label>
              <span>Statut</span>
              <select name="active" defaultValue="true">
                <option value="true">Actif</option>
                <option value="false">Inactif</option>
              </select>
            </label>
            <label>
              <span>Date de début</span>
              <input name="startsAt" type="date" />
            </label>
            <label>
              <span>Date de fin</span>
              <input name="expiresAt" type="date" />
            </label>
            <button className={styles.button} type="submit">
              Créer le coupon
            </button>
          </form>
        </div>

        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Règles actuelles</h3>
          <div className={styles.infoList}>
            <div>
              <span>Devise par défaut</span>
              <strong>{settings.defaultCurrency}</strong>
            </div>
            <div>
              <span>Types disponibles</span>
              <strong>Pourcentage ou montant fixe</strong>
            </div>
            <div>
              <span>Gestion</span>
              <strong>Activation, désactivation, modification et suppression</strong>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <h3 className={styles.sectionTitle}>Liste des coupons</h3>
        {coupons.length === 0 ? (
          <div className={styles.placeholder}>
            <div>
              <h3>Aucun coupon</h3>
              <p>Créez votre premier code promo FAST CASH.</p>
            </div>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Valeur</th>
                <th>Début</th>
                <th>Fin</th>
                <th>Statut</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td><strong>{coupon.code}</strong></td>
                  <td>{coupon.type === "PERCENT" ? "Pourcentage" : "Montant fixe"}</td>
                  <td>{formatCouponValue(coupon.type, coupon.value, settings.defaultCurrency)}</td>
                  <td>{formatDate(coupon.startsAt)}</td>
                  <td>{formatDate(coupon.expiresAt)}</td>
                  <td><span className={styles.status}>{getCouponStatus(coupon)}</span></td>
                  <td>
                    <Link href={`/admin/coupons/${coupon.id}`} className={styles.tableAction}>
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
