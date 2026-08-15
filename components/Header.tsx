"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, Search, ShoppingBag, User, Store, X } from "lucide-react";
import { useRef, useState } from "react";
import { useCart } from "./cart/CartProvider";
import CurrencySwitcher from "./currency/CurrencySwitcher";
import LanguageSwitcher from "./language/LanguageSwitcher";
import { useI18n, type Locale } from "@/lib/i18n";
import { translateCategoryLabel } from "@/lib/categories";
import type { PublicCategory } from "@/lib/public-categories";
import SocialLinks from "@/components/SocialLinks";

const navContent = {
  fr: [
    { href: "/categories/montres", label: "Montres", image: "/images/categories/montres.jpg", eyebrow: "Horlogerie premium", title: "Montres de luxe", description: "Rolex, Omega, Breitling, Cartier et pièces sélectionnées selon les arrivages FAST CASH Genève.", items: ["Rolex", "Omega", "Breitling", "Cartier"] },
    { href: "/marques/apple", label: "Apple", image: "/images/categories/apple-dark.jpg", eyebrow: "Apple Store", title: "iPhone, Watch & Mac", description: "iPhone, iPad, Apple Watch, MacBook et accessoires contrôlés avant mise en vente.", items: ["iPhone", "iPad", "Apple Watch", "MacBook"] },
    { href: "/marques/samsung", label: "Samsung", image: "/images/categories/samsung.jpg", eyebrow: "Galaxy sélection", title: "Samsung Galaxy", description: "Smartphones Galaxy, tablettes et accessoires disponibles selon stock en boutique.", items: ["Galaxy S", "Galaxy Z", "Tablettes", "Accessoires"] },
    { href: "/categories/consoles", label: "Consoles", image: "/images/categories/consoles.jpg", eyebrow: "Gaming", title: "Consoles & jeux", description: "PlayStation, Xbox, Nintendo Switch, manettes et jeux testés par nos équipes.", items: ["PlayStation", "Xbox", "Nintendo", "Jeux vidéo"] },
    { href: "/categories/informatique", label: "Informatique", image: "/images/categories/informatique.jpg", eyebrow: "Tech premium", title: "MacBook & PC", description: "Ordinateurs portables, MacBook, écrans et accessoires informatiques contrôlés.", items: ["MacBook", "PC portables", "Ordinateurs", "Accessoires"] },
    { href: "/categories/maroquinerie", label: "Maroquinerie", image: "/images/categories/maroquinerie.jpg", eyebrow: "Luxe & accessoires", title: "Maroquinerie", description: "Sacs et accessoires de marques premium sélectionnés avec soin à Genève.", items: ["Sacs premium", "Accessoires", "Luxe", "Sélection"] },
    { href: "/categories/image-son", label: "Image & Son", image: "/images/categories/image-son.jpg", eyebrow: "Audio • photo • vidéo", title: "Image & Son", description: "TV, casques, enceintes, appareils photo et équipements audio-vidéo contrôlés en boutique.", items: ["TV", "Audio", "Photo", "Vidéo"] },
    { href: "/categories/bijoux", label: "Bijoux", image: "/images/categories/bijoux.jpg", eyebrow: "Bijouterie", title: "Bijoux & pièces", description: "Bagues, bracelets, colliers, or et pièces précieuses estimés directement en boutique.", items: ["Bagues", "Bracelets", "Colliers", "Or & pièces"] },
  ],
  en: [
    { href: "/categories/montres", label: "Watches", image: "/images/categories/montres.jpg", eyebrow: "Premium watchmaking", title: "Luxury watches", description: "Rolex, Omega, Breitling, Cartier and selected pieces according to FAST CASH Geneva arrivals.", items: ["Rolex", "Omega", "Breitling", "Cartier"] },
    { href: "/marques/apple", label: "Apple", image: "/images/categories/apple-dark.jpg", eyebrow: "Apple Store", title: "iPhone, Watch & Mac", description: "iPhone, iPad, Apple Watch, MacBook and accessories checked before sale.", items: ["iPhone", "iPad", "Apple Watch", "MacBook"] },
    { href: "/marques/samsung", label: "Samsung", image: "/images/categories/samsung.jpg", eyebrow: "Galaxy selection", title: "Samsung Galaxy", description: "Galaxy smartphones, tablets and accessories available depending on in-store stock.", items: ["Galaxy S", "Galaxy Z", "Tablets", "Accessories"] },
    { href: "/categories/consoles", label: "Consoles", image: "/images/categories/consoles.jpg", eyebrow: "Gaming", title: "Consoles & games", description: "PlayStation, Xbox, Nintendo Switch, controllers and games tested by our team.", items: ["PlayStation", "Xbox", "Nintendo", "Video games"] },
    { href: "/categories/informatique", label: "Computers", image: "/images/categories/informatique.jpg", eyebrow: "Premium tech", title: "MacBook & PC", description: "Laptops, MacBooks, screens and computer accessories checked in store.", items: ["MacBook", "Laptops", "Computers", "Accessories"] },
    { href: "/categories/maroquinerie", label: "Leather goods", image: "/images/categories/maroquinerie.jpg", eyebrow: "Luxury & accessories", title: "Leather goods", description: "Premium bags and accessories carefully selected in Geneva.", items: ["Premium bags", "Accessories", "Luxury", "Selection"] },
    { href: "/categories/image-son", label: "Image & Sound", image: "/images/categories/image-son.jpg", eyebrow: "Audio • photo • video", title: "Image & Sound", description: "TVs, headphones, speakers, cameras and audio-video equipment checked in store.", items: ["TV", "Audio", "Photo", "Video"] },
    { href: "/categories/bijoux", label: "Jewelry", image: "/images/categories/bijoux.jpg", eyebrow: "Jewelry", title: "Jewelry & pieces", description: "Rings, bracelets, necklaces, gold and precious pieces estimated directly in store.", items: ["Rings", "Bracelets", "Necklaces", "Gold & pieces"] },
  ],
} satisfies Record<Locale, Array<{ href: string; label: string; image: string; eyebrow: string; title: string; description: string; items: string[] }>>;

type MegaNavItem = (typeof navContent)[Locale][number];

function buildPrimaryNav(categories: PublicCategory[], fallback: MegaNavItem[]) {
  if (!categories.length) return fallback;

  return fallback.map((item) => {
    if (!item.href.startsWith("/categories/")) return item;

    const slug = item.href.replace("/categories/", "");
    const dynamicCategory = categories.find((category) => category.slug === slug);

    if (!dynamicCategory) return item;

    return {
      ...item,
      image: item.image ?? dynamicCategory.image,
      eyebrow: item.eyebrow ?? dynamicCategory.eyebrow ?? "Univers FAST CASH",
      title: item.title ?? dynamicCategory.title,
      description: item.description ?? dynamicCategory.description,
    };
  });
}

function buildAllCategoryLinks(categories: PublicCategory[], fallback: MegaNavItem[], locale: Locale) {
  const fallbackLinks = fallback.map((item) => ({
    href: item.href,
    label: item.label,
    productCount: 0,
  }));

  if (!categories.length) return fallbackLinks;

  const dynamicLinks = categories
    .filter((category) => category.productCount > 0)
    .map((category) => ({
      href: `/categories/${category.slug}`,
      label: translateCategoryLabel(category.title.replace("Produits ", ""), locale),
      productCount: category.productCount,
    }));

  const seen = new Set<string>();
  return [...dynamicLinks, ...fallbackLinks].filter((item) => {
    if (seen.has(item.href)) return false;
    seen.add(item.href);
    return true;
  });
}

export default function Header({ categories = [] }: { categories?: PublicCategory[] }) {
  const { count } = useCart();
  const { locale, dict } = useI18n();
  const primaryNav = buildPrimaryNav(categories, navContent[locale]);
  const allCategoryLinks = buildAllCategoryLinks(categories, navContent[locale], locale);
  const allCategoriesLabel = locale === "fr" ? "Toutes les catégories" : "All categories";
  const allCategoriesTitle = locale === "fr" ? "Tous les univers FAST CASH" : "All FAST CASH universes";
  const allCategoriesDescription =
    locale === "fr"
      ? "Accédez à toutes les catégories disponibles en boutique, y compris les nouveaux univers ajoutés depuis le back-office."
      : "Browse every in-store category, including new universes added from the back office.";
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeMega, setActiveMega] = useState<string | null>(null);
  const closeMegaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMega = (href: string) => {
    if (closeMegaTimer.current) clearTimeout(closeMegaTimer.current);
    setActiveMega(href);
  };

  const closeMega = () => {
    if (closeMegaTimer.current) clearTimeout(closeMegaTimer.current);
    closeMegaTimer.current = setTimeout(() => setActiveMega(null), 180);
  };

  const closeAllMenus = () => {
    if (closeMegaTimer.current) clearTimeout(closeMegaTimer.current);
    setActiveMega(null);
    setOpen(false);
    setSearchOpen(false);
  };

  return (
    <header className="site-header luxe-site-header">
      <div className="luxe-topbar">
        <div className="container luxe-topbar-inner">
          <div className="luxe-topbar-left">
            <span className="currency-label">Genève • Suisse</span>
            <CurrencySwitcher />
            <LanguageSwitcher />
          </div>

          <Link href="/" className="luxe-logo" onClick={closeAllMenus}>
            <span className="luxe-logo-mark">
              <Image src="/images/logo-fastcash-white.png" alt="FAST CASH Genève" width={52} height={52} priority />
            </span>
            <span className="luxe-logo-text">
              <strong>FASTCASH</strong>
              <small>Genève</small>
            </span>
          </Link>

          <div className="luxe-actions">
            <SocialLinks className="header-social-links" compact />
            <button
              title={dict.nav.search}
              className="luxe-icon-btn"
              aria-label={dict.nav.searchAria}
              aria-expanded={searchOpen}
              onClick={() => {
                setOpen(false);
                setActiveMega(null);
                setSearchOpen((value) => !value);
              }}
            >
              <Search size={21} />
            </button>
            <Link href="/compte" title={locale === "en" ? "My account" : "Mon compte"} className="luxe-icon-btn luxe-admin-btn" aria-label={locale === "en" ? "Customer account" : "Mon compte client"}>
              <User size={20} />
            </Link>
            <Link href="/panier" title={dict.nav.cart} className="luxe-icon-btn luxe-cart-btn" aria-label={dict.nav.cart}>
              <ShoppingBag size={21} />
              {count > 0 ? <b>{count}</b> : null}
            </Link>
            <button
              className="luxe-menu-toggle"
              aria-label={dict.nav.openMenu}
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>
      </div>

      {searchOpen ? (
        <div className="luxe-search-panel">
          <div className="container luxe-search-inner">
            <form action="/recherche" className="luxe-search-form">
              <Search size={19} />
              <input type="search" name="q" placeholder={dict.nav.searchPlaceholder} autoFocus aria-label={dict.nav.searchAria} />
              <button type="submit">{dict.nav.search}</button>
            </form>
          </div>
        </div>
      ) : null}

      <div className="luxe-nav-wrap">
        <div className="container luxe-nav-inner">
          <nav className="luxe-nav" aria-label={locale === "en" ? "Main navigation" : "Navigation principale"}>
            {primaryNav.map((item) => (
              <div
                className={`luxe-nav-item${activeMega === item.href ? " is-active" : ""}`}
                key={item.href}
                onMouseLeave={closeMega}
              >
                <Link
                  href={item.href}
                  onMouseEnter={() => openMega(item.href)}
                  onClick={closeAllMenus}
                >
                  {item.label}
                </Link>
                <div className="luxe-mega-menu" onMouseEnter={() => openMega(item.href)} onMouseLeave={closeMega}>
                  <div className="luxe-mega-copy">
                    <span>{item.eyebrow}</span>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                    <div className="luxe-mega-actions">
                      <Link href={item.href} onClick={closeAllMenus}>{dict.nav.discover}</Link>
                      <Link href="/estimation" onClick={closeAllMenus}>{dict.nav.estimate}</Link>
                    </div>
                  </div>

                  <div className="luxe-mega-links" aria-label={`${dict.nav.universe} ${item.label}`}>
                    <small>{dict.nav.universe}</small>
                    {item.items.map((subItem) => (
                      <Link key={subItem} href={item.href} onClick={closeAllMenus}>
                        <span>{subItem}</span>
                        <b>→</b>
                      </Link>
                    ))}
                  </div>

                  <Link href={item.href} className="luxe-mega-image" aria-label={`${dict.nav.discover} ${item.label}`} onClick={closeAllMenus}>
                    <Image src={item.image} alt={item.label} width={560} height={360} />
                    <div className="luxe-mega-image-caption">
                      <span>FAST CASH Genève</span>
                      <strong>{item.label}</strong>
                    </div>
                  </Link>
                </div>
              </div>
            ))}
            <div
              className={`luxe-nav-item luxe-nav-item-all${activeMega === "/categories" ? " is-active" : ""}`}
              onMouseLeave={closeMega}
            >
              <Link
                href="/recherche"
                onMouseEnter={() => openMega("/categories")}
                onClick={(event) => event.preventDefault()}
              >
                {allCategoriesLabel}
              </Link>
              <div className="luxe-mega-menu luxe-mega-menu-categories" onMouseEnter={() => openMega("/categories")} onMouseLeave={closeMega}>
                <div className="luxe-mega-copy">
                  <span>FAST CASH Genève</span>
                  <strong>{allCategoriesTitle}</strong>
                  <p>{allCategoriesDescription}</p>
                  <div className="luxe-mega-actions">
                    <Link href="/recherche" onClick={closeAllMenus}>{dict.nav.search}</Link>
                    <Link href="/estimation" onClick={closeAllMenus}>{dict.nav.estimate}</Link>
                  </div>
                </div>

                <div className="luxe-mega-links luxe-mega-links-grid" aria-label={allCategoriesLabel}>
                  <small>{dict.nav.universe}</small>
                  {allCategoryLinks.map((category) => (
                    <Link key={category.href} href={category.href} onClick={closeAllMenus}>
                      <span>{category.label}</span>
                      <b>{category.productCount > 0 ? category.productCount : "→"}</b>
                    </Link>
                  ))}
                </div>

                <Link href="/recherche" className="luxe-mega-image" aria-label={dict.nav.search} onClick={closeAllMenus}>
                  <Image src="/images/hero/fastcash-luxury-hero.jpg" alt="FAST CASH Genève" width={560} height={360} />
                  <div className="luxe-mega-image-caption">
                    <span>{locale === "en" ? "Dynamic catalog" : "Catalogue dynamique"}</span>
                    <strong>{locale === "en" ? "FAST CASH universes" : "Univers FAST CASH"}</strong>
                  </div>
                </Link>
              </div>
            </div>
            <Link href="/contact" onClick={closeAllMenus}>{dict.footer.contact}</Link>
            <Link href="/estimation" className="luxe-nav-estimation" onClick={closeAllMenus}>{dict.nav.estimation}</Link>
          </nav>
        </div>
      </div>

      {open ? (
        <div className="luxe-mobile-panel">
          <div className="container luxe-mobile-inner">
            <div className="luxe-mobile-card">
              <p>{dict.nav.premiumCatalog}</p>
              <Link href="/recherche" onClick={() => setOpen(false)}>{dict.nav.mobileSearch}</Link>
              {primaryNav.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</Link>
              ))}
              <span className="luxe-mobile-section-title">{allCategoriesLabel}</span>
              {allCategoryLinks.map((category) => (
                <Link key={category.href} href={category.href} onClick={() => setOpen(false)}>{category.label}</Link>
              ))}
            </div>

            <div className="luxe-mobile-highlight">
              <Store size={22} />
              <div>
                <strong>{dict.nav.storeTitle}</strong>
                <p>{dict.nav.storeText}</p>
              </div>
            </div>

            <SocialLinks className="mobile-social-links" showLabels onNavigate={() => setOpen(false)} />

            <Link href="/contact" className="btn btn-ghost luxe-mobile-cta" onClick={() => setOpen(false)}>
              {dict.footer.contact}
            </Link>
            <Link href="/estimation" className="btn btn-gold luxe-mobile-cta" onClick={() => setOpen(false)}>
              {dict.nav.estimate}
            </Link>
            <Link href="/compte" className="btn btn-ghost luxe-mobile-cta" onClick={() => setOpen(false)}>
              {locale === "en" ? "My account" : "Mon compte"}
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
