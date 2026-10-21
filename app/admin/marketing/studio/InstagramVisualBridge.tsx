"use client";

import { useState } from "react";
import VisualCreator from "../VisualCreator";
import MarketingStudio from "../MarketingStudio";

type Product = {
  id: string;
  name: string;
  slug: string;
  reference: string | null;
  brand: string | null;
  price: number;
  stock: number;
  image: string | null;
};

type GeneratedVisual = {
  file: File;
  format: "post" | "story";
  product: Product;
  attestation: string;
};

export default function InstagramVisualBridge({
  instagramConnected,
  instagramUsername,
}: {
  instagramConnected: boolean;
  instagramUsername: string;
}) {
  const [generatedVisual, setGeneratedVisual] = useState<GeneratedVisual | null>(null);

  return (
    <>
      <VisualCreator
        onUseVisual={(file, format, product, attestation) => {
          setGeneratedVisual({ file, format, product, attestation });
        }}
      />
      <MarketingStudio
        instagramConnected={instagramConnected}
        instagramUsername={instagramUsername}
        generatedVisual={generatedVisual}
      />
    </>
  );
}