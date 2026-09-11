"use client";

import { useMemo, useState } from "react";
import styles from "../admin.module.css";

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
};

export default function ProductCategoryFilter({
  categories,
  defaultSlug = "",
}: {
  categories: CategoryOption[];
  defaultSlug?: string;
}) {
  const [open, setOpen] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState(defaultSlug);

  const byId = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const bySlug = useMemo(
    () => new Map(categories.map((category) => [category.slug, category])),
    [categories],
  );
  const roots = useMemo(
    () =>
      categories
        .filter((category) => !category.parentId)
        .sort((a, b) => a.name.localeCompare(b.name, "fr")),
    [categories],
  );

  const selected = selectedSlug ? bySlug.get(selectedSlug) : undefined;
  const selectedParent = selected?.parentId
    ? byId.get(selected.parentId)
    : undefined;
  const selectedLabel = selected
    ? selectedParent
      ? `${selectedParent.name} › ${selected.name}`
      : selected.name
    : "Toutes les catégories";

  function choose(slug: string) {
    setSelectedSlug(slug);
    setOpen(false);
  }

  return (
    <div className={styles.catalogCategoryFilter}>
      <span className={styles.catalogCategoryLabel}>Catégorie</span>
      <input type="hidden" name="category" value={selectedSlug} />
      <button
        type="button"
        className={`${styles.catalogCategoryTrigger}${open ? ` ${styles.catalogCategoryTriggerOpen}` : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span>
          <small>
            {selectedParent
              ? selectedParent.name
              : selected
                ? "Univers"
                : "Catalogue"}
          </small>
          <strong>
            {selectedParent && selected ? selected.name : selectedLabel}
          </strong>
        </span>
        <b aria-hidden="true">⌄</b>
      </button>

      {open ? (
        <div className={styles.catalogCategoryPopover}>
          <div className={styles.catalogCategoryPopoverHead}>
            <div>
              <strong>Choisir un rayon</strong>
              <span>Univers → sous-catégorie</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
            >
              ×
            </button>
          </div>

          <button
            type="button"
            className={`${styles.catalogCategoryAll}${!selectedSlug ? ` ${styles.catalogCategorySelected}` : ""}`}
            onClick={() => choose("")}
          >
            Tous les produits
          </button>

          <div className={styles.catalogCategoryUniverses}>
            {roots.map((root) => {
              const children = categories
                .filter((category) => category.parentId === root.id)
                .sort((a, b) => a.name.localeCompare(b.name, "fr"));
              return (
                <section
                  key={root.id}
                  className={styles.catalogCategoryUniverse}
                >
                  <button
                    type="button"
                    className={`${styles.catalogCategoryUniverseTitle}${selectedSlug === root.slug ? ` ${styles.catalogCategorySelected}` : ""}`}
                    onClick={() => choose(root.slug)}
                    title={`Voir tout ${root.name}`}
                  >
                    <span>{root.name}</span>
                    <small>Tout l’univers</small>
                  </button>
                  {children.length ? (
                    <div className={styles.catalogCategoryChildren}>
                      {children.map((child) => (
                        <button
                          key={child.id}
                          type="button"
                          className={
                            selectedSlug === child.slug
                              ? styles.catalogCategorySelected
                              : ""
                          }
                          onClick={() => choose(child.slug)}
                        >
                          {child.name}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
