"use client";

import { useMemo, useState } from "react";
import styles from "../admin.module.css";

type Option = {
  value: string;
  label: string;
  hint?: string;
};

export default function ProductToolbarSelect({
  name,
  label,
  eyebrow,
  defaultValue = "",
  options,
  allLabel,
  searchable = false,
}: {
  name: string;
  label: string;
  eyebrow?: string;
  defaultValue?: string;
  options: Option[];
  allLabel: string;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(defaultValue);
  const [query, setQuery] = useState("");

  const selected = options.find((option) => option.value === selectedValue);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    if (!normalized) return options;
    return options.filter((option) => option.label.toLocaleLowerCase("fr").includes(normalized));
  }, [options, query]);

  function choose(value: string) {
    setSelectedValue(value);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className={styles.catalogSmartFilter}>
      <span className={styles.catalogCategoryLabel}>{label}</span>
      <input type="hidden" name={name} value={selectedValue} />
      <button
        type="button"
        className={`${styles.catalogSmartTrigger}${open ? ` ${styles.catalogSmartTriggerOpen}` : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span>
          <small>{eyebrow || label}</small>
          <strong>{selected?.label || allLabel}</strong>
        </span>
        <b aria-hidden="true">⌄</b>
      </button>

      {open ? (
        <div className={`${styles.catalogSmartPopover}${searchable ? ` ${styles.catalogSmartPopoverWide}` : ""}`}>
          <div className={styles.catalogSmartHead}>
            <div>
              <strong>{label}</strong>
              <span>{searchable ? "Tapez pour trouver rapidement" : "Choisissez une option"}</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer">×</button>
          </div>

          {searchable ? (
            <div className={styles.catalogSmartSearchWrap}>
              <input
                className={styles.catalogSmartSearch}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Rechercher une ${label.toLocaleLowerCase("fr")}…`}
                autoFocus
              />
            </div>
          ) : null}

          <div className={`${styles.catalogSmartOptions}${searchable ? ` ${styles.catalogSmartOptionsScrollable}` : ""}`}>
            <button
              type="button"
              className={!selectedValue ? styles.catalogSmartSelected : ""}
              onClick={() => choose("")}
            >
              <span>{allLabel}</span>
            </button>
            {filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                className={selectedValue === option.value ? styles.catalogSmartSelected : ""}
                onClick={() => choose(option.value)}
              >
                <span>{option.label}</span>
                {option.hint ? <small>{option.hint}</small> : null}
              </button>
            ))}
            {searchable && filtered.length === 0 ? (
              <p className={styles.catalogSmartEmpty}>Aucune marque trouvée.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
