"use client";

import { useEffect } from "react";
import { useAdminToast } from "./AdminProviders";

const displayedFlashKeys = new Set<string>();

const messages: Record<string, { tone: "success" | "error"; text: string }> = {
  created: { tone: "success", text: "Création effectuée avec succès." },
  saved: { tone: "success", text: "Modifications enregistrées avec succès." },
  deleted: { tone: "success", text: "Suppression effectuée avec succès." },
  productCreated: { tone: "success", text: "Produit créé avec succès." },
  productSaved: { tone: "success", text: "Produit mis à jour avec succès." },
  productDeleted: { tone: "success", text: "Produit supprimé avec succès." },
  brandCreated: { tone: "success", text: "Marque créée avec succès." },
  brandDeleted: { tone: "success", text: "Marque supprimée avec succès." },
  brandSaved: { tone: "success", text: "Marque mise à jour avec succès." },
  categoryCreated: { tone: "success", text: "Catégorie créée avec succès." },
  categoryDeleted: { tone: "success", text: "Catégorie supprimée avec succès." },
  categorySaved: { tone: "success", text: "Catégorie mise à jour avec succès." },
  couponCreated: { tone: "success", text: "Coupon créé avec succès." },
  couponSaved: { tone: "success", text: "Coupon mis à jour avec succès." },
  couponDeleted: { tone: "success", text: "Coupon supprimé avec succès." },
  "reserved-category": { tone: "error", text: "Accueil est une page système, pas une catégorie catalogue." },
  "delete-brand-products": { tone: "error", text: "Impossible de supprimer une marque qui contient des produits." },
  "delete-category-products": { tone: "error", text: "Impossible de supprimer une catégorie qui contient des produits." },
};

export default function AdminFlash({ value }: { value?: string | string[] }) {
  const toast = useAdminToast();
  const key = Array.isArray(value) ? value[0] : value;

  useEffect(() => {
    if (!key || !messages[key]) return;

    if (displayedFlashKeys.has(key)) return;
    displayedFlashKeys.add(key);

    const message = messages[key];
    if (message.tone === "error") {
      toast.error(message.text);
    } else {
      toast.success(message.text);
    }

    window.setTimeout(() => {
      displayedFlashKeys.delete(key);
    }, 1500);
  }, [key, toast]);

  return null;
}
