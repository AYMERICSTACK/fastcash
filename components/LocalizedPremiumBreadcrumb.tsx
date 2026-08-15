"use client";

import Link from "next/link";
import { useI18n, translateBreadcrumbLabel } from "@/lib/i18n";
import type { BreadcrumbItem } from "@/components/PremiumBreadcrumb";

type LocalizedPremiumBreadcrumbProps = {
  items: BreadcrumbItem[];
  variant?: "light" | "dark";
  className?: string;
};

export default function LocalizedPremiumBreadcrumb({
  items,
  variant = "light",
  className = "",
}: LocalizedPremiumBreadcrumbProps) {
  const { locale } = useI18n();

  if (!items.length) return null;

  return (
    <nav
      className={`premium-breadcrumb premium-breadcrumb-${variant} ${className}`.trim()}
      aria-label={locale === "en" ? "Breadcrumb" : "Fil d'Ariane"}
    >
      <ol>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const label = translateBreadcrumbLabel(item.label, locale);

          return (
            <li key={`${item.label}-${index}`}>
              {item.href && !isLast ? (
                <Link href={item.href}>{label}</Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined}>{label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
