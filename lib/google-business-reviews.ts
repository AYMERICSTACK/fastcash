import { getGoogleBusinessConnection } from "@/lib/google-business-oauth";
export type GoogleBusinessReview = {
  id: string;
  author: string;
  photoUrl: string | null;
  rating: number;
  comment: string;
  createTime: string;
};

export type GoogleBusinessReviewsData = {
  averageRating: number;
  totalReviewCount: number;
  reviews: GoogleBusinessReview[];
};

type GoogleReviewApi = {
  reviewId?: string;
  reviewer?: {
    displayName?: string;
    profilePhotoUrl?: string;
    isAnonymous?: boolean;
  };
  starRating?: string;
  comment?: string;
  createTime?: string;
  updateTime?: string;
};

type GoogleReviewsResponse = {
  reviews?: GoogleReviewApi[];
  averageRating?: number;
  totalReviewCount?: number;
  nextPageToken?: string;
};

const STAR_RATINGS: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

async function getAccessToken(refreshTokenOverride?: string | null) {
  const clientId = process.env.GOOGLE_BUSINESS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_BUSINESS_CLIENT_SECRET;
  const refreshToken = refreshTokenOverride || process.env.GOOGLE_BUSINESS_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) return null;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("FAST CASH Google Reviews: impossible de renouveler le jeton OAuth.", response.status);
    return null;
  }

  const payload = (await response.json()) as { access_token?: string };
  return payload.access_token ?? null;
}

export async function getGoogleBusinessReviews(): Promise<GoogleBusinessReviewsData | null> {
  try {
    const connection = await getGoogleBusinessConnection().catch(() => null);
    const accountId = connection?.accountId || process.env.GOOGLE_BUSINESS_ACCOUNT_ID;
    const locationId = connection?.locationId || process.env.GOOGLE_BUSINESS_LOCATION_ID;
    if (!accountId || !locationId) return null;

    const accessToken = await getAccessToken(connection?.refreshToken);
    if (!accessToken) return null;

    const reviews: GoogleBusinessReview[] = [];
    let pageToken = "";
    let averageRating = 0;
    let totalReviewCount = 0;

    do {
      const params = new URLSearchParams({ pageSize: "50" });
      if (pageToken) params.set("pageToken", pageToken);

      const response = await fetch(
        `https://mybusiness.googleapis.com/v4/accounts/${encodeURIComponent(accountId)}/locations/${encodeURIComponent(locationId)}/reviews?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          next: { revalidate: 3600 },
        },
      );

      if (!response.ok) {
        console.error("FAST CASH Google Reviews: erreur API.", response.status);
        return null;
      }

      const payload = (await response.json()) as GoogleReviewsResponse;
      averageRating = Number(payload.averageRating ?? averageRating);
      totalReviewCount = Number(payload.totalReviewCount ?? totalReviewCount);

      for (const review of payload.reviews ?? []) {
        reviews.push({
          id: review.reviewId ?? `${review.createTime}-${reviews.length}`,
          author: review.reviewer?.isAnonymous
            ? "Client Google"
            : review.reviewer?.displayName || "Client Google",
          photoUrl: review.reviewer?.profilePhotoUrl || null,
          rating: STAR_RATINGS[review.starRating ?? ""] ?? 0,
          comment: review.comment?.trim() || "",
          createTime: review.createTime || review.updateTime || "",
        });
      }

      pageToken = payload.nextPageToken ?? "";
    } while (pageToken);

    reviews.sort((a, b) => {
      const aTime = a.createTime ? new Date(a.createTime).getTime() : 0;
      const bTime = b.createTime ? new Date(b.createTime).getTime() : 0;
      return bTime - aTime;
    });

    return { averageRating, totalReviewCount, reviews };
  } catch (error) {
    console.error("FAST CASH Google Reviews:", error);
    return null;
  }
}
