"use client";

import { useMemo, useState } from "react";
import styles from "../admin.module.css";

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
};

function rootIdFor(categoryId: string, byId: Map<string, CategoryOption>) {
  let current = byId.get(categoryId);
  const visited = new Set<string>();

  while (current?.parentId && !visited.has(current.id)) {
    visited.add(current.id);
    const parent = byId.get(current.parentId);
    if (!parent) break;
    current = parent;
  }

  return current?.id ?? "";
}

export default function GuidedCategoryField({
  categories,
  defaultCategoryId = "",
}: {
  categories: CategoryOption[];
  defaultCategoryId?: string | null;
}) {
  const byId = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const roots = useMemo(
    () => categories.filter((category) => !category.parentId).sort((a, b) => a.name.localeCompare(b.name, "fr")),
    [categories],
  );

  const initialCategoryId = defaultCategoryId || "";
  const initialRootId = initialCategoryId ? rootIdFor(initialCategoryId, byId) : "";
  const [universeId, setUniverseId] = useState(initialRootId);
  const [categoryId, setCategoryId] = useState(initialCategoryId);

  const children = useMemo(
    () => categories.filter((category) => category.parentId === universeId).sort((a, b) => a.name.localeCompare(b.name, "fr")),
    [categories, universeId],
  );

  const selectedUniverse = byId.get(universeId);
  const needsSubcategory = children.length > 0;

  function handleUniverseChange(nextUniverseId: string) {
    setUniverseId(nextUniverseId);
    if (!nextUniverseId) {
      setCategoryId("");
      return;
    }

    const nextChildren = categories.filter((category) => category.parentId === nextUniverseId);
    setCategoryId(nextChildren.length ? "" : nextUniverseId);
  }

  return (
    <div className={styles.guidedCategoryBox}>
      <div className={styles.guidedCategoryIntro}>
        <strong>Classement guidé</strong>
        <span>Choisissez d’abord l’univers, puis la sous-catégorie. Le produit sera rangé au bon endroit automatiquement.</span>
      </div>

      <input type="hidden" name="categoryId" value={categoryId} />

      <div className={styles.guidedCategoryGrid}>
        <label>
          <span>1. Univers</span>
          <select value={universeId} onChange={(event) => handleUniverseChange(event.target.value)}>
            <option value="">Choisir un univers…</option>
            {roots.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>2. Sous-catégorie</span>
          <select
            value={needsSubcategory ? (categoryId === universeId ? "" : categoryId) : categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            disabled={!universeId || !needsSubcategory}
          >
            {!universeId ? (
              <option value="">Choisissez d’abord un univers</option>
            ) : needsSubcategory ? (
              <>
                <option value="">Choisir dans {selectedUniverse?.name || "cet univers"}…</option>
                {children.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </>
            ) : (
              <option value={universeId}>{selectedUniverse?.name || "Catégorie sélectionnée"}</option>
            )}
          </select>
        </label>
      </div>

      {universeId && needsSubcategory && !categoryId ? (
        <p className={styles.guidedCategoryHint}>Il reste à choisir la sous-catégorie pour éviter de ranger le produit directement dans « {selectedUniverse?.name} ».</p>
      ) : categoryId ? (
        <p className={styles.guidedCategorySuccess}>
          Classement : {selectedUniverse?.name}{categoryId !== universeId ? ` › ${byId.get(categoryId)?.name || ""}` : ""}
        </p>
      ) : (
        <p className={styles.guidedCategoryHint}>Aucune catégorie sélectionnée.</p>
      )}
    </div>
  );
}
