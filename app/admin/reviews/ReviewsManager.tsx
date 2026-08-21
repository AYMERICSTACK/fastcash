"use client";

import { useMemo, useState } from "react";
import type { ManualReview } from "@/lib/manual-reviews";
import styles from "../admin.module.css";

export default function ReviewsManager({
  initialReviews,
}: {
  initialReviews: ManualReview[];
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const publishedCount = useMemo(
    () => reviews.filter((review) => review.published).length,
    [reviews]
  );

  const patch = (index: number, values: Partial<ManualReview>) =>
    setReviews((current) =>
      current.map((review, reviewIndex) =>
        reviewIndex === index ? { ...review, ...values } : review
      )
    );

  const add = () =>
    setReviews((current) => [
      {
        id: `manual-${Date.now()}`,
        author: "",
        comment: "",
        rating: 5,
        photoUrl: null,
        createTime: "",
        dateLabel: "",
        published: false,
      },
      ...current,
    ]);

  const save = async () => {
    setSaving(true);
    setMsg("");

    const response = await fetch("/api/admin/reviews", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviews }),
    });

    setSaving(false);
    setMsg(response.ok ? "Avis enregistrés." : "Impossible d’enregistrer.");
  };

  return (
    <div className={styles.reviewsManager}>
      <header className={styles.reviewsHeader}>
        <div>
          <p className={styles.reviewsEyebrow}>Marketing</p>
          <h1>Avis clients</h1>
          <p className={styles.reviewsIntro}>
            Gérez les avis affichés sur le site en attendant la synchronisation
            Google Business.
          </p>
        </div>

        <button className={styles.button} onClick={add}>
          + Ajouter un avis
        </button>
      </header>

      <section className={styles.reviewsSummary}>
        <div className={styles.reviewsSummaryCard}>
          <span>Avis enregistrés</span>
          <strong>{reviews.length}</strong>
          <small>Dans le back-office</small>
        </div>
        <div className={styles.reviewsSummaryCard}>
          <span>Publiés</span>
          <strong>{publishedCount}</strong>
          <small>Visibles sur le site</small>
        </div>
        <div className={styles.reviewsSummaryCard}>
          <span>Note Google</span>
          <strong>4,9/5</strong>
          <small>113 avis Google</small>
        </div>
      </section>

      <div className={styles.reviewsList}>
        {reviews.map((review, index) => {
          const initial = review.author.trim().charAt(0).toUpperCase() || "★";
          const rating = Math.max(0, Math.min(5, Number(review.rating) || 0));

          return (
            <article className={styles.reviewEditorCard} key={review.id}>
              <div className={styles.reviewEditorTop}>
                <div className={styles.reviewIdentity}>
                  <div className={styles.reviewAvatar}>{initial}</div>
                  <div>
                    <span className={styles.reviewCardLabel}>Avis client</span>
                    <strong>{review.author || "Nouvel avis"}</strong>
                    <div className={styles.reviewStars} aria-label={`${rating} sur 5`}>
                      {"★".repeat(rating)}
                      <span>{"★".repeat(5 - rating)}</span>
                    </div>
                  </div>
                </div>

                <label className={styles.reviewPublishToggle}>
                  <input
                    type="checkbox"
                    checked={review.published}
                    onChange={(event) =>
                      patch(index, { published: event.target.checked })
                    }
                  />
                  <span>{review.published ? "Publié" : "Masqué"}</span>
                </label>
              </div>

              <div className={styles.reviewEditorGrid}>
                <label className={styles.reviewField}>
                  <span>Client</span>
                  <input
                    value={review.author}
                    onChange={(event) =>
                      patch(index, { author: event.target.value })
                    }
                  />
                </label>

                <label className={styles.reviewField}>
                  <span>Date affichée</span>
                  <input
                    value={review.dateLabel || ""}
                    placeholder="il y a 1 mois"
                    onChange={(event) =>
                      patch(index, { dateLabel: event.target.value })
                    }
                  />
                </label>

                <label className={styles.reviewField}>
                  <span>Note</span>
                  <select
                    value={rating}
                    onChange={(event) =>
                      patch(index, { rating: Number(event.target.value) })
                    }
                  >
                    <option value={5}>5 — ★★★★★</option>
                    <option value={4}>4 — ★★★★☆</option>
                    <option value={3}>3 — ★★★☆☆</option>
                    <option value={2}>2 — ★★☆☆☆</option>
                    <option value={1}>1 — ★☆☆☆☆</option>
                    <option value={0}>Sans note</option>
                  </select>
                </label>
              </div>

              <label className={`${styles.reviewField} ${styles.reviewCommentField}`}>
                <span>Avis</span>
                <textarea
                  value={review.comment}
                  onChange={(event) =>
                    patch(index, { comment: event.target.value })
                  }
                />
              </label>

              <div className={styles.reviewEditorFooter}>
                <span>
                  {review.published
                    ? "Cet avis est actuellement visible sur le site."
                    : "Cet avis est conservé mais n’est pas affiché sur le site."}
                </span>
                <button
                  className={styles.reviewDeleteButton}
                  onClick={() =>
                    setReviews((current) =>
                      current.filter((_, reviewIndex) => reviewIndex !== index)
                    )
                  }
                >
                  Supprimer
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className={styles.reviewsSaveBar}>
        <div>
          <strong>Modifications des avis</strong>
          <span>
            {msg || "Enregistrez pour appliquer les changements sur le site."}
          </span>
        </div>
        <button className={styles.button} disabled={saving} onClick={save}>
          {saving ? "Enregistrement…" : "Enregistrer les avis"}
        </button>
      </div>
    </div>
  );
}
