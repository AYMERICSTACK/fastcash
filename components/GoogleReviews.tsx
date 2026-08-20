"use client";

import type { GoogleBusinessReviewsData } from "@/lib/google-business-reviews";
import { useI18n } from "@/lib/i18n";

function formatDate(value: string, locale: "fr" | "en") {
  if (!value) return "";
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-CH", {
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="google-review-stars" aria-label={`${rating} sur 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} className={index < rating ? "is-filled" : ""}>★</span>
      ))}
    </span>
  );
}

export default function GoogleReviews({ data }: { data: GoogleBusinessReviewsData | null }) {
  const { locale } = useI18n();

  if (!data || data.reviews.length === 0) return null;

  const mapsUrl =
    process.env.NEXT_PUBLIC_GOOGLE_REVIEWS_URL ||
    "https://www.google.com/maps/search/?api=1&query=FAST+CASH+Gen%C3%A8ve";

  return (
    <section className="section google-reviews-section" aria-labelledby="google-reviews-title">
      <div className="container">
        <div className="google-reviews-heading">
          <div>
            <p className="hero-kicker">{locale === "en" ? "Customer reviews" : "Avis clients"}</p>
            <h2 className="title-lg" id="google-reviews-title">
              {locale === "en" ? "They trust FAST CASH" : "Ils font confiance à FAST CASH"}
            </h2>
          </div>

          <a className="google-rating-summary" href={mapsUrl} target="_blank" rel="noreferrer">
            <span className="google-g-mark" aria-hidden="true">G</span>
            <span>
              <strong>{data.averageRating.toFixed(1).replace(".", ",")}/5</strong>
              <Stars rating={Math.round(data.averageRating)} />
            </span>
            <small>
              {data.totalReviewCount} {locale === "en" ? "Google reviews" : "avis Google"}
            </small>
          </a>
        </div>

        <div className="google-reviews-track">
          {data.reviews.map((review) => (
            <article className="google-review-card" key={review.id}>
              <div className="google-review-card-top">
                {review.photoUrl ? (
                  <img src={review.photoUrl} alt="" className="google-review-avatar" referrerPolicy="no-referrer" />
                ) : (
                  <span className="google-review-avatar google-review-avatar-fallback">
                    {review.author.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div>
                  <strong>{review.author}</strong>
                  <span>{formatDate(review.createTime, locale)}</span>
                </div>
                <span className="google-review-source" aria-label="Google">G</span>
              </div>

              <Stars rating={review.rating} />

              {review.comment ? (
                <p className="google-review-comment">{review.comment}</p>
              ) : (
                <p className="google-review-comment google-review-comment-muted">
                  {locale === "en" ? "Rating left on Google." : "Note laissée sur Google."}
                </p>
              )}
            </article>
          ))}
        </div>

        <div className="google-reviews-footer">
          <span>
            {locale === "en"
              ? "Reviews are retrieved automatically from the official Google Business Profile."
              : "Avis récupérés automatiquement depuis la fiche Google officielle."}
          </span>
          <a href={mapsUrl} target="_blank" rel="noreferrer">
            {locale === "en" ? "View all reviews on Google →" : "Voir tous les avis sur Google →"}
          </a>
        </div>
      </div>
    </section>
  );
}
