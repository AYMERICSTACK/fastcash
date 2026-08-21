import { prisma } from "@/lib/prisma";

import type {
  GoogleBusinessReviewsData,
  GoogleBusinessReview,
} from "@/lib/google-business-reviews";

const KEY = "reviews.manual";

export type ManualReview = GoogleBusinessReview & {
  published: boolean;
  dateLabel?: string;
};

const INITIAL: ManualReview[] = [
  {
    id: "therese",
    author: "Therese",
    photoUrl: null,
    rating: 5,
    comment:
      "Une expérience incroyable pour l'achat de mes sandales Hermès Izmir ! Je suis absolument ravie de mon achat chez Fast Cash Genève.",
    createTime: "",
    dateLabel: "il y a un mois",
    published: true,
  },
  {
    id: "birboss",
    author: "Birboss Nedjari (Biboss)",
    photoUrl: null,
    rating: 5,
    comment:
      "Excellente expérience chez Fast Cash ! Une vraie mine d'or pour trouver des téléphones reconditionnés, des consoles, des montres connectées et bien d'autres produits de qualité à des prix vraiment imbattables.",
    createTime: "",
    dateLabel: "il y a un mois",
    published: true,
  },
  {
    id: "chantal",
    author: "Chantal Morbian",
    photoUrl: null,
    rating: 5,
    comment:
      "J'ai eu une très bonne expérience chez FastCash ! J'ai revendu des bijoux et j'ai été agréablement surprise par l'offre de rachat qui était vraiment intéressante. Le tout s'est déroulé rapidement et sans complications. Je recommande vivement FastCash !",
    createTime: "",
    dateLabel: "il y a 4 mois",
    published: true,
  },
  {
    id: "fm",
    author: "F M",
    photoUrl: null,
    rating: 5,
    comment:
      "Super service, gérant au top. Je recommande ce magasin dans l'hyper centre de Genève. Produits toujours d'excellentes qualités et magnifique boutique.",
    createTime: "",
    dateLabel: "il y a 3 mois",
    published: true,
  },
  {
    id: "steve",
    author: "Steve",
    photoUrl: null,
    rating: 5,
    comment:
      "Excellente adresse! Accueil très sympathique, conseils professionnels. Gestion très efficace des demandes.",
    createTime: "",
    dateLabel: "il y a 3 mois",
    published: true,
  },
  {
    id: "dan-bred",
    author: "dan bred",
    photoUrl: null,
    rating: 5,
    comment:
      "J’habite en France, j’étais réticent à l’idée de faire un achat pour une sono, mais au contraire, aujourd’hui, je suis ravi, le magasin est très réactif, envoi très rapide et gratuit. La marchandise est garantie un an je ne peux que recommander ce magasin.",
    createTime: "",
    dateLabel: "il y a une semaine",
    published: true,
  },
  {
    id: "guarineri",
    author: "Guarineri Alyssa",
    photoUrl: null,
    rating: 5,
    comment:
      "Service impeccable et souriant ! Offres de rachat d'articles très intéressantes. Je recommande vivement !",
    createTime: "",
    dateLabel: "il y a 5 mois",
    published: true,
  },
  {
    id: "lucky",
    author: "Lucky Shabrah",
    photoUrl: null,
    rating: 5,
    comment:
      "J'ai récemment acheté un téléphone sur leur site internet. Service très honnête, fiable et rapide. Le téléphone a été livré dans l'état décrit. Je suis ravi de mon achat et je recommande vivement ce service.",
    createTime: "",
    dateLabel: "il y a 8 mois",
    published: true,
  },
];

const VERIFIED_GOOGLE_RATINGS: Record<string, number> = {
  therese: 5,
  birboss: 5,
  chantal: 5,
  fm: 5,
  steve: 5,
  "dan-bred": 5,
  guarineri: 5,
  lucky: 5,
};

function applyVerifiedRatings(reviews: ManualReview[]) {
  return reviews.map((review) => {
    const verifiedRating = VERIFIED_GOOGLE_RATINGS[review.id];

    return verifiedRating && (!review.rating || review.rating <= 0)
      ? { ...review, rating: verifiedRating }
      : review;
  });
}

export async function getManualReviews(): Promise<ManualReview[]> {
  const row = await prisma.setting.findUnique({
    where: { key: KEY },
  });

  if (!row) {
    return applyVerifiedRatings(INITIAL);
  }

  try {
    const value = JSON.parse(row.value);

    return applyVerifiedRatings(Array.isArray(value) ? value : INITIAL);
  } catch {
    return applyVerifiedRatings(INITIAL);
  }
}

export async function saveManualReviews(reviews: ManualReview[]) {
  await prisma.setting.upsert({
    where: { key: KEY },
    update: {
      value: JSON.stringify(reviews),
    },
    create: {
      key: KEY,
      value: JSON.stringify(reviews),
      group: "Avis",
      label: "Avis clients manuels",
    },
  });
}

export async function getManualReviewsData(): Promise<GoogleBusinessReviewsData | null> {
  const reviews = (await getManualReviews()).filter(
    (review) => review.published,
  );

  if (!reviews.length) {
    return null;
  }

  return {
    // Snapshot vérifié sur la fiche Google FAST CASH dans la vidéo fournie (21/08/2026).
    averageRating: 4.9,
    totalReviewCount: 113,
    reviews,
  };
}
