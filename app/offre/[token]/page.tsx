import Image from "next/image";
import { notFound } from "next/navigation";

import NegotiatedOfferPurchase from "@/components/NegotiatedOfferPurchase";
import { prisma } from "@/lib/prisma";
import { toCatalogProduct } from "@/lib/public-categories";

export const dynamic = "force-dynamic";

export default async function NegotiatedOfferPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const offer = await prisma.productOffer.findUnique({
    where: {
      purchaseToken: token,
    },
    include: {
      product: {
        include: {
          category: true,
          brand: true,
          media: {
            include: {
              media: true,
            },
            orderBy: {
              position: "asc",
            },
          },
        },
      },
    },
  });

  if (
    !offer ||
    offer.negotiatedPrice === null ||
    offer.usedAt !== null ||
    offer.tokenExpiresAt === null ||
    offer.tokenExpiresAt < new Date() ||
    (offer.status !== "ACCEPTED" && offer.status !== "COUNTERED")
  ) {
    notFound();
  }

  // À partir d'ici TypeScript sait que ces deux valeurs ne sont plus null.
  const negotiatedPrice: number = offer.negotiatedPrice;
  const tokenExpiresAt: Date = offer.tokenExpiresAt;

  const product = toCatalogProduct(offer.product);

  return (
    <main className="section">
      <div className="container negotiated-offer-page">
        <div>
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              width={520}
              height={520}
            />
          ) : null}
        </div>

        <div>
          <p className="hero-kicker">Offre privée FAST CASH</p>

          <h1 className="title-lg">{product.name}</h1>

          <p className="muted">
            Prix public : <s>{offer.listPrice.toFixed(2)} CHF</s>
          </p>

          <h2>{negotiatedPrice.toFixed(2)} CHF</h2>

          <p>
            Cette proposition est personnelle et valable jusqu&apos;au{" "}
            {tokenExpiresAt.toLocaleString("fr-CH")}.
          </p>

          <NegotiatedOfferPurchase
            product={product}
            token={token}
            price={negotiatedPrice}
          />
        </div>
      </div>
    </main>
  );
}
