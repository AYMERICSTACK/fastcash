"use client";

import { useI18n, type Locale } from "@/lib/i18n";

const languages: Locale[] = ["fr", "en"];

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="language-switcher" aria-label="Choix de la langue">
      {languages.map((item) => (
        <button
          key={item}
          type="button"
          className={locale === item ? "active" : undefined}
          onClick={() => setLocale(item)}
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
