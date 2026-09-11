"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, Search, ShoppingBag, User, Store, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCart } from "./cart/CartProvider";
import CurrencySwitcher from "./currency/CurrencySwitcher";
import LanguageSwitcher from "./language/LanguageSwitcher";
import { useI18n, type Locale } from "@/lib/i18n";
import { translateCategoryLabel } from "@/lib/categories";
import type { PublicCategory } from "@/lib/public-categories";
import SocialLinks from "@/components/SocialLinks";

type NavChild = { href: string; label: string; productCount?: number };
type NavGroup = {
  href: string;
  label: string;
  image: string;
  eyebrow: string;
  title: string;
  description: string;
  parentSlugs: string[];
  children: NavChild[];
};

const navContent: Record<Locale, NavGroup[]> = {
  fr: [
    {
      href: "/categories/luxe",
      label: "Luxe",
      image: "/images/categories/maroquinerie.jpg",
      eyebrow: "Mode • bijoux • horlogerie",
      title: "Univers Luxe",
      description: "Maroquinerie, bijoux, montres, lunettes, vêtements et accessoires premium réunis dans un même univers.",
      parentSlugs: ["luxe"],
      children: [
        { href: "/categories/bijoux", label: "Bijoux" },
        { href: "/categories/maroquinerie", label: "Maroquinerie" },
        { href: "/categories/petite-maroquinerie", label: "Petite maroquinerie" },
        { href: "/categories/montres", label: "Montres de luxe" },
        { href: "/categories/lunettes", label: "Lunettes" },
        { href: "/categories/vetements", label: "Vêtements" },
        { href: "/categories/chaussures", label: "Chaussures" },
        { href: "/categories/accessoires-luxe", label: "Accessoires" },
      ],
    },
    {
      href: "/categories/telephonie",
      label: "Téléphonie",
      image: "/images/categories/telephonie.jpg",
      eyebrow: "Smartphones & accessoires",
      title: "Téléphonie",
      description: "iPhone, smartphones Android, accessoires et montres connectées classés simplement par famille.",
      parentSlugs: ["telephonie"],
      children: [
        { href: "/categories/apple", label: "Apple" },
        { href: "/categories/android", label: "Android" },
        { href: "/categories/accessoires-telephonie", label: "Accessoires" },
        { href: "/categories/montres-connectees", label: "Montres connectées" },
      ],
    },
    {
      href: "/categories/consoles",
      label: "Consoles & Jeux vidéo",
      image: "/images/categories/consoles.jpg",
      eyebrow: "Gaming",
      title: "Consoles & Jeux vidéo",
      description: "PlayStation, Nintendo, Xbox, retrogaming et accessoires réunis sous un même univers gaming.",
      parentSlugs: ["consoles-jeux-video", "consoles"],
      children: [
        { href: "/categories/playstation", label: "PlayStation" },
        { href: "/categories/nintendo", label: "Nintendo" },
        { href: "/categories/xbox", label: "Xbox" },
        { href: "/categories/retrogaming", label: "Retrogaming" },
        { href: "/categories/accessoires-jeux-video", label: "Accessoires" },
      ],
    },
    {
      href: "/categories/informatique",
      label: "Informatique",
      image: "/images/categories/informatique.jpg",
      eyebrow: "Ordinateurs & tablettes",
      title: "Informatique",
      description: "Ordinateurs, tablettes et accessoires informatiques dans une navigation courte et claire.",
      parentSlugs: ["informatique"],
      children: [
        { href: "/categories/ordinateurs", label: "Ordinateurs" },
        { href: "/categories/tablettes", label: "Tablettes" },
        { href: "/categories/accessoires-informatique", label: "Accessoires" },
      ],
    },
    {
      href: "/categories/image-son",
      label: "Image & Son",
      image: "/images/categories/image-son.jpg",
      eyebrow: "Photo • vidéo • audio",
      title: "Image & Son",
      description: "Photo, vidéo et audio organisés par usage pour trouver rapidement le bon rayon.",
      parentSlugs: ["image-et-son", "image-son"],
      children: [
        { href: "/categories/photo", label: "Photo" },
        { href: "/categories/video", label: "Vidéo" },
        { href: "/categories/audio", label: "Audio" },
      ],
    },
  ],
  en: [
    {
      href: "/categories/luxe",
      label: "Luxury",
      image: "/images/categories/maroquinerie.jpg",
      eyebrow: "Fashion • jewelry • watches",
      title: "Luxury universe",
      description: "Leather goods, jewelry, watches, eyewear, clothing and premium accessories grouped in one place.",
      parentSlugs: ["luxe"],
      children: [
        { href: "/categories/bijoux", label: "Jewelry" },
        { href: "/categories/maroquinerie", label: "Leather goods" },
        { href: "/categories/petite-maroquinerie", label: "Small leather goods" },
        { href: "/categories/montres", label: "Luxury watches" },
        { href: "/categories/lunettes", label: "Eyewear" },
        { href: "/categories/vetements", label: "Clothing" },
        { href: "/categories/chaussures", label: "Shoes" },
        { href: "/categories/accessoires-luxe", label: "Accessories" },
      ],
    },
    {
      href: "/categories/telephonie",
      label: "Phones",
      image: "/images/categories/telephonie.jpg",
      eyebrow: "Smartphones & accessories",
      title: "Phones",
      description: "iPhone, Android smartphones, accessories and smartwatches grouped naturally by family.",
      parentSlugs: ["telephonie"],
      children: [
        { href: "/categories/apple", label: "Apple" },
        { href: "/categories/android", label: "Android" },
        { href: "/categories/accessoires-telephonie", label: "Accessories" },
        { href: "/categories/montres-connectees", label: "Smartwatches" },
      ],
    },
    {
      href: "/categories/consoles",
      label: "Consoles & Games",
      image: "/images/categories/consoles.jpg",
      eyebrow: "Gaming",
      title: "Consoles & Games",
      description: "PlayStation, Nintendo, Xbox, retrogaming and accessories grouped into one gaming universe.",
      parentSlugs: ["consoles-jeux-video", "consoles"],
      children: [
        { href: "/categories/playstation", label: "PlayStation" },
        { href: "/categories/nintendo", label: "Nintendo" },
        { href: "/categories/xbox", label: "Xbox" },
        { href: "/categories/retrogaming", label: "Retrogaming" },
        { href: "/categories/accessoires-jeux-video", label: "Accessories" },
      ],
    },
    {
      href: "/categories/informatique",
      label: "Computers",
      image: "/images/categories/informatique.jpg",
      eyebrow: "Computers & tablets",
      title: "Computers",
      description: "Computers, tablets and accessories in a short, clear navigation.",
      parentSlugs: ["informatique"],
      children: [
        { href: "/categories/ordinateurs", label: "Computers" },
        { href: "/categories/tablettes", label: "Tablets" },
        { href: "/categories/accessoires-informatique", label: "Accessories" },
      ],
    },
    {
      href: "/categories/image-son",
      label: "Image & Sound",
      image: "/images/categories/image-son.jpg",
      eyebrow: "Photo • video • audio",
      title: "Image & Sound",
      description: "Photo, video and audio organized by use so customers can reach the right section quickly.",
      parentSlugs: ["image-et-son", "image-son"],
      children: [
        { href: "/categories/photo", label: "Photo" },
        { href: "/categories/video", label: "Video" },
        { href: "/categories/audio", label: "Audio" },
      ],
    },
  ],
};

function cleanCategoryTitle(title: string, locale: Locale) {
  const cleaned = title.replace(/^Produits\s+/i, "");
  return translateCategoryLabel(cleaned, locale);
}

function compactCategoryLabel(label: string, locale: Locale) {
  if (/^Accessoires(?:\s|$)/i.test(label)) {
    return locale === "fr" ? "Accessoires" : "Accessories";
  }
  return label;
}

function buildPrimaryNav(categories: PublicCategory[], groups: NavGroup[], locale: Locale) {
  const byHref = new Map(
    categories.map((category) => [`/categories/${category.slug}`, category]),
  );

  return groups.map((group) => ({
    ...group,
    children: group.children.map((child) => {
      const dynamic = byHref.get(child.href);
      return {
        ...child,
        label: dynamic ? cleanCategoryTitle(dynamic.title, locale) : child.label,
        productCount: dynamic?.productCount ?? 0,
      };
    }),
  }));
}

export default function Header({ categories = [] }: { categories?: PublicCategory[] }) {
  const { count } = useCart();
  const { locale, dict } = useI18n();
  const primaryNav = buildPrimaryNav(categories, navContent[locale], locale);
  const allCategoriesLabel = locale === "fr" ? "Toutes les catégories" : "All categories";
  const allCategoriesTitle = locale === "fr" ? "Catalogue par univers" : "Catalog by universe";
  const allCategoriesDescription =
    locale === "fr"
      ? "Partez d’un grand univers puis choisissez directement le rayon qui vous intéresse."
      : "Start from a main universe, then jump directly to the section you need.";
  const dealsLabel = locale === "fr" ? "Bonnes affaires" : "Deals";
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeMega, setActiveMega] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const closeMegaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!isMobile || !open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobile, open]);

  useEffect(() => {
    if (isMobile || !activeMega) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [isMobile, activeMega]);

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
    <>
      <header className="site-header luxe-site-header">
        <div className="luxe-topbar">
          <div className="container luxe-topbar-inner">
            {!isMobile ? (
              <div className="luxe-topbar-left">
                <span className="currency-label">Genève • Suisse</span>
                <CurrencySwitcher />
                <LanguageSwitcher />
              </div>
            ) : null}

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

        {isMobile ? (
          <div className="luxe-mobile-preferences">
            <div className="container luxe-mobile-preferences-inner">
              <div className="luxe-mobile-preference-group">
                <span>{locale === "en" ? "Currency" : "Devise"}</span>
                <CurrencySwitcher />
              </div>
              <div className="luxe-mobile-preference-separator" aria-hidden="true" />
              <div className="luxe-mobile-preference-group">
                <span>{locale === "en" ? "Language" : "Langue"}</span>
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        ) : null}

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
                  <Link href={item.href} onMouseEnter={() => openMega(item.href)} onClick={closeAllMenus}>
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
                      <small>{locale === "fr" ? "Rayons" : "Sections"}</small>
                      {item.children.map((subItem) => (
                        <Link key={subItem.href} href={subItem.href} onClick={closeAllMenus}>
                          <span>{compactCategoryLabel(subItem.label, locale)}</span>
                          <b>{subItem.productCount ? subItem.productCount : "→"}</b>
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
                <Link href="/recherche" onMouseEnter={() => openMega("/categories")} onClick={(event) => event.preventDefault()}>
                  {allCategoriesLabel}
                </Link>
                <div className="luxe-mega-menu luxe-mega-menu-categories" onMouseEnter={() => openMega("/categories")} onMouseLeave={closeMega}>
                  <div className="luxe-mega-copy">
                    <span>FAST CASH Genève</span>
                    <strong>{allCategoriesTitle}</strong>
                    <p>{allCategoriesDescription}</p>
                    <div className="luxe-mega-actions">
                      <Link href="/recherche" onClick={closeAllMenus}>{dict.nav.search}</Link>
                      <Link href="/promotions" onClick={closeAllMenus}>{dealsLabel}</Link>
                    </div>
                  </div>

                  <div className="luxe-category-group-grid" aria-label={allCategoriesLabel}>
                    {primaryNav.map((group) => (
                      <div className="luxe-category-group" key={group.href}>
                        <Link href={group.href} className="luxe-category-group-title" onClick={closeAllMenus}>{group.label}</Link>
                        {group.children.map((category) => (
                          <Link key={category.href} href={category.href} onClick={closeAllMenus}>
                            <span>{compactCategoryLabel(category.label, locale)}</span>
                            <b>{category.productCount ? category.productCount : "→"}</b>
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>

                  <Link href="/recherche" className="luxe-mega-image" aria-label={dict.nav.search} onClick={closeAllMenus}>
                    <Image src="/images/hero/fastcash-luxury-hero.jpg" alt="FAST CASH Genève" width={560} height={360} />
                    <div className="luxe-mega-image-caption">
                      <span>{locale === "en" ? "Clear catalog" : "Catalogue organisé"}</span>
                      <strong>{locale === "en" ? "Browse by universe" : "Naviguer par univers"}</strong>
                    </div>
                  </Link>
                </div>
              </div>

              <Link href="/contact" onClick={closeAllMenus}>{dict.footer.contact}</Link>
              <Link href="/estimation" className="luxe-nav-estimation" onClick={closeAllMenus}>{dict.nav.estimation}</Link>
            </nav>
          </div>
        </div>
      </header>

      {open && isMobile ? (
        <div
          className="luxe-mobile-panel"
          style={{
            position: "fixed",
            top: 116,
            right: 0,
            bottom: 0,
            left: 0,
            zIndex: 999,
            overflowX: "hidden",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
          }}
        >
          <div className="container luxe-mobile-inner">
            <div className="luxe-mobile-card">
              <p>{dict.nav.premiumCatalog}</p>
              <Link href="/recherche" onClick={() => setOpen(false)}>{dict.nav.mobileSearch}</Link>
              {primaryNav.map((group) => (
                <div className="luxe-mobile-category-group" key={group.href}>
                  <Link className="luxe-mobile-category-root" href={group.href} onClick={() => setOpen(false)}>{group.label}</Link>
                  <div className="luxe-mobile-category-children">
                    {group.children.map((category) => (
                      <Link key={category.href} href={category.href} onClick={() => setOpen(false)}>{compactCategoryLabel(category.label, locale)}</Link>
                    ))}
                  </div>
                </div>
              ))}
              <span className="luxe-mobile-section-title">{locale === "fr" ? "À découvrir" : "Discover"}</span>
              <Link href="/promotions" onClick={() => setOpen(false)}>{dealsLabel}</Link>
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
    </>
  );
}
