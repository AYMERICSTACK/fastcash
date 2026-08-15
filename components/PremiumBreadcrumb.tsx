import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type PremiumBreadcrumbProps = {
  items: BreadcrumbItem[];
  variant?: "light" | "dark";
  className?: string;
};

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[], siteUrl: string) {
  function absoluteUrl(pathOrUrl?: string) {
    if (!pathOrUrl) return siteUrl;
    if (pathOrUrl.startsWith("http")) return pathOrUrl;
    return `${siteUrl}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
  }

  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: absoluteUrl(item.href),
    })),
  };
}

export default function PremiumBreadcrumb({
  items,
  variant = "light",
  className = "",
}: PremiumBreadcrumbProps) {
  if (!items.length) return null;

  return (
    <nav
      className={`premium-breadcrumb premium-breadcrumb-${variant} ${className}`.trim()}
      aria-label="Fil d'Ariane"
    >
      <ol>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`}>
              {item.href && !isLast ? (
                <Link href={item.href}>{item.label}</Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
