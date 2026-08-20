"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { translateCategoryLabel } from "@/lib/categories";

export type Locale = "fr" | "en";

const STORAGE_KEY = "fc_locale";

const dictionaries = {
  fr: {
    nav: {
      search: "Rechercher",
      searchAria: "Rechercher",
      searchPlaceholder: "Rechercher Rolex, iPhone, MacBook, Louis Vuitton...",
      cart: "Panier",
      openMenu: "Ouvrir le menu",
      discover: "Découvrir",
      estimate: "Faire estimer",
      premiumCatalog: "Catalogue premium",
      mobileSearch: "Recherche",
      storeTitle: "Boutique FAST CASH",
      storeText: "Achat, vente et reprise de produits premium à Genève.",
      estimation: "Estimation",
      universe: "Univers",
    },
    home: {
      kicker: "Achat • Vente • Reprise",
      title1: "Vos objets de valeur",
      title2: "Notre expertise",
      intro:
        "Montres de luxe, iPhone, informatique, bijoux, maroquinerie et consoles : FAST CASH Genève sélectionne, contrôle et valorise vos produits premium.",
      estimateCta: "Faire estimer un article →",
      catalogCta: "Découvrir le catalogue →",
      proof1: "Paiement immédiat",
      proof2: "Expertise gratuite",
      proof3: "Articles garantis",
      univers: "Univers FAST CASH",
      premiumCategories: "Catégories premium",
      selected: "Sélection contrôlée FAST CASH Genève",
      arrivals: "Derniers arrivages",
      available: "Produits disponibles",
      more: "Voir plus de produits",
      discover: "Découvrir →",
    },
    product: {
      new: "Nouveau",
      veryGood: "Très bon état",
      available: "Disponible",
      onDemand: "Sur demande",
      inStock: "En stock",
      outOfStock: "Stock épuisé",
      checked: "Produit contrôlé en boutique",
    },
    category: {
      home: "Accueil",
      catalogue: "Catalogue",
      telephony: "Téléphonie",
      hightech: "High-tech",
      defaultEyebrow: "Sélection FAST CASH",
      discoverProducts: "Découvrir les produits",
      estimate: "Faire estimer",
      tagsAria: "Sélection catégorie",
      advantagesAria: "Avantages FAST CASH Genève",
      storeTitle: "FAST CASH GENÈVE",
      storeText:
        "Achat, vente et reprise de produits d'occasion premium. Notre équipe vous accompagne en boutique pour choisir, vérifier ou faire estimer vos articles.",
      inStore: "en boutique",
      benefits: [
        ["Produits contrôlés", "Testés et vérifiés"],
        ["Expertise professionnelle", "Conseils personnalisés"],
        ["Achat - reprise", "Estimation gratuite"],
        ["Service boutique", "Accompagnement sur place"],
      ],
      strongTexts: {
        apple:
          "Acheter un produit Apple d'occasion est une excellente alternative pour profiter de la qualité, du design et des performances de la marque à un prix plus avantageux.",
        samsung:
          "Profitez d'appareils Samsung Galaxy contrôlés, récents et proposés selon les arrivages disponibles en boutique.",
        montres:
          "Chaque montre est sélectionnée avec soin afin de proposer des pièces de qualité, adaptées aux amateurs d'horlogerie premium.",
        consoles:
          "Consoles, manettes et jeux sont testés avant la mise en vente pour garantir une expérience fiable dès l'achat.",
        informatique:
          "Ordinateurs, MacBook, écrans et accessoires sont contrôlés pour vous orienter vers un matériel performant et adapté à vos besoins.",
        "image-son":
          "Équipements audio, photo et vidéo sont sélectionnés pour leur qualité, leur état et leur disponibilité immédiate en boutique.",
        bijoux:
          "Bijoux, or et pièces précieuses peuvent être estimés directement en magasin avec un accompagnement clair et professionnel.",
        maroquinerie:
          "Sacs et accessoires premium sont sélectionnés selon leur état, leur style et les arrivages disponibles chez FAST CASH Genève.",
        telephonie:
          "Smartphones et accessoires sont vérifiés avant la mise en vente pour proposer des appareils fiables au meilleur prix.",
      },
    },
    catalog: {
      catalogue: "Catalogue",
      productsAvailable: "produits disponibles",
      shown: "affichés",
      sortBy: "Trier par",
      recent: "Les plus récents",
      priceAsc: "Prix croissant",
      priceDesc: "Prix décroissant",
      stock: "Stock disponible",
      universe: "Univers",
      allProducts: "Tous les produits",
      budget: "Budget",
      availability: "Disponibilité",
      inStockOnly: "En stock uniquement",
      showAll: "Tout afficher",
      reset: "Réinitialiser",
      allPrices: "Tous les prix",
      lessThan: "Moins de",
      andMore: "et +",
      previous: "← Précédent",
      next: "Suivant →",
      page: "Page",
      of: "sur",
      noResults: "Aucun produit ne correspond à ces filtres. Essayez d'élargir votre recherche.",
    },
    cart: {
      kicker: "Commande sécurisée",
      title: "Votre panier",
      intro: "Vérifiez votre sélection avant de finaliser votre achat avec FAST CASH Genève.",
      cancelled: "Paiement annulé. Votre panier est conservé.",
      emptyTitle: "Votre panier est vide.",
      emptyText: "Découvrez notre sélection de produits premium disponibles.",
      discover: "Découvrir le catalogue",
      itemsAria: "Produits du panier",
      fallbackCategory: "Sélection FAST CASH",
      unitPrice: "Prix",
      checked: "Produit contrôlé • Garantie FAST CASH • Disponible à Genève",
      quantity: "Quantité",
      decrease: "Diminuer la quantité",
      increase: "Augmenter la quantité",
      remove: "Retirer",
      itemTotal: "Total article",
      summaryAria: "Résumé commande",
      summary: "Résumé commande",
      totalCart: "Total panier",
      subtotal: "Sous-total",
      shipping: "Livraison",
      free: "Gratuite",
      payment: "Paiement",
      stripe: "Stripe sécurisé",
      total: "Total",
      redirect: "Redirection sécurisée...",
      pay: "Payer en toute sécurité",
      reassurance: [
        "Paiement sécurisé Stripe",
        "Produits contrôlés FAST CASH",
        "Retrait boutique Genève possible",
        "Expédition rapide",
      ],
      stripeInitError: "Stripe n'a pas pu être initialisé.",
      genericError: "Une erreur est survenue.",
    },
    search: {
      metadataTitle: "Recherche | FAST CASH Genève",
      kicker: "Recherche catalogue",
      title: "Que recherchez-vous ?",
      intro:
        "Trouvez rapidement une montre, un iPhone, un MacBook, une console, un bijou ou une pièce de maroquinerie disponible chez FAST CASH Genève.",
      placeholder: "Rechercher Rolex, iPhone, Louis Vuitton...",
      submit: "Rechercher",
      popularAria: "Recherches populaires",
      results: "Résultats",
      productFound: "produit trouvé",
      productsFound: "produits trouvés",
      query: "Recherche",
      empty: "Saisissez une recherche ou choisissez une suggestion pour explorer le catalogue.",
      refine: "Affinez votre recherche pour obtenir des résultats plus précis.",
      noResults1: "Aucun produit trouvé pour",
      noResults2: "Essayez une marque, un modèle ou une catégorie.",
    },
        contact: {
      heroKicker: "Contact FAST CASH Genève",
      title: "Une question, une estimation ou une commande ?",
      intro:
        "Contactez directement l'équipe FAST CASH Genève pour vérifier une disponibilité, demander une estimation ou obtenir une information sur une commande.",
      callStore: "Appeler la boutique",
      estimate: "Demander une estimation",
      storeLabel: "FAST CASH Genève",
      addressLine1: "Rue de Monthoux 27",
      addressLine2: "1201 Genève, Suisse",
      storeSmall: "Produits premium contrôlés • Achat • Vente • Reprise",
      messageKicker: "Message",
      formTitle: "Écrire à FAST CASH",
      formIntro:
        "Décrivez votre demande en quelques lignes. L'équipe recevra votre message par email avec vos coordonnées.",
      detailsKicker: "Coordonnées",
      cards: {
        store: {
          label: "Boutique",
          title: "FAST CASH Genève",
          text: "Rue de Monthoux 27, 1201 Genève",
          action: "Voir l'itinéraire",
        },
        phone: {
          label: "Téléphone",
          title: "+41 22 731 16 63",
          text: "Pour une question urgente ou une disponibilité produit.",
          action: "Appeler la boutique",
        },
        email: {
          label: "Email",
          title: "Contact FAST CASH",
          text: "Votre message est transmis directement à l'équipe boutique.",
          action: "Écrire un email",
        },
      },
      hoursKicker: "Horaires",
      hoursTitle: "Ouverture boutique",
      hours: [
        ["Lundi", "11:30 – 20:00"],
        ["Mardi", "10:00 – 20:00"],
        ["Mercredi", "10:00 – 20:00"],
        ["Jeudi", "10:00 – 20:00"],
        ["Vendredi", "10:00 – 13:30 / 14:30 – 20:00"],
        ["Samedi", "10:00 – 18:00"],
        ["Dimanche", "Fermé"],
      ],
      mapKicker: "Adresse",
      mapTitle: "FAST CASH au cœur de Genève",
      mapText:
        "Retrouvez la boutique FAST CASH Genève Rue de Monthoux 27 pour vos achats, ventes, reprises et estimations.",
      mapCta: "Ouvrir dans Google Maps",
      form: {
        name: "Nom complet *",
        namePlaceholder: "Votre nom",
        email: "Email *",
        emailPlaceholder: "vous@email.com",
        phone: "Téléphone",
        phonePlaceholder: "+41 ...",
        subject: "Sujet",
        subjects: [
          "Demande générale",
          "Disponibilité produit",
          "Suivi de commande",
          "Estimation / reprise",
          "Facture ou paiement",
        ],
        message: "Message *",
        messagePlaceholder: "Expliquez votre demande...",
        loading: "Envoi en cours...",
        submit: "Envoyer le message",
        success: "Votre message a bien été envoyé.",
        error: "Impossible d'envoyer votre message.",
      },
    },
estimation: {
      kicker: "Reprise FAST CASH",
      title: "Faire estimer votre produit",
      intro: "Envoyez les informations de votre produit. L'équipe FAST CASH Genève vous répondra rapidement.",
      name: "Nom et prénom",
      email: "Email",
      phone: "Téléphone",
      description: "Décrivez le produit, son état, ses accessoires...",
      submit: "Envoyer la demande",
      categories: ["Apple / iPhone / iPad", "Samsung", "Montre de luxe", "Informatique", "Console", "Image & Son", "Bijoux / Maroquinerie"],
    },
    block: {
      title: "FAST CASH GENÈVE",
      text: "Situé au cœur de Genève, FAST CASH est spécialisé dans l'achat, la vente et la reprise de produits d'occasion de qualité. Notre équipe vous accompagne dans le choix de votre produit et peut également estimer vos articles.",
      cta: "Faire estimer votre produit",
    },
    footer: {
      brandText: "Achat, vente et reprise de produits premium à Genève.",
      store: "Boutique Genève",
      categories: "Univers",
      watches: "Montres",
      apple: "Apple",
      samsung: "Samsung",
      leather: "Maroquinerie",
      jewelry: "Bijoux",
      computers: "Informatique",
      imageSound: "Image & Son",
      consoles: "Consoles",
      services: "Services",
      estimate: "Faire estimer un article",
      search: "Recherche",
      cart: "Panier",
      contact: "Contactez-nous",
      reassuranceTitle: "Nos garanties",
      reassurance: [
        "Paiement sécurisé",
        "Produits contrôlés",
        "Retrait boutique Genève",
        "Expertise gratuite",
      ],
      hoursTitle: "Horaires d'ouverture",
      hours: [
        { day: "Lundi", time: "11:30–20:00" },
        { day: "Mardi", time: "10:00–20:00" },
        { day: "Mercredi", time: "10:00–20:00" },
        { day: "Jeudi", time: "10:00–20:00" },
        { day: "Vendredi", time: "10:00–13:30 · 14:30–20:00" },
        { day: "Samedi", time: "10:00–18:00" },
        { day: "Dimanche", time: "Fermé" },
      ],
      copyright: "© FAST CASH Genève — Tous droits réservés",
      legal: "Mentions légales",
      privacy: "Confidentialité",
    },
  },
  en: {
    nav: {
      search: "Search",
      searchAria: "Search",
      searchPlaceholder: "Search Rolex, iPhone, MacBook, Louis Vuitton...",
      cart: "Cart",
      openMenu: "Open menu",
      discover: "Discover",
      estimate: "Get an estimate",
      premiumCatalog: "Premium catalog",
      mobileSearch: "Search",
      storeTitle: "FAST CASH Store",
      storeText: "Buying, selling and trade-ins for premium products in Geneva.",
      estimation: "Estimate",
      universe: "Universe",
    },
    home: {
      kicker: "Buy • Sell • Trade in",
      title1: "Your valuable items",
      title2: "Our expertise",
      intro:
        "Luxury watches, iPhone, computers, jewelry, leather goods and consoles: FAST CASH Geneva selects, checks and values your premium products.",
      estimateCta: "Get an item estimated →",
      catalogCta: "Explore the catalog →",
      proof1: "Immediate payment",
      proof2: "Free expertise",
      proof3: "Guaranteed items",
      univers: "FAST CASH universe",
      premiumCategories: "Premium categories",
      selected: "Checked selection by FAST CASH Geneva",
      arrivals: "Latest arrivals",
      available: "Available products",
      more: "See more products",
      discover: "Discover →",
    },
    product: {
      new: "New",
      veryGood: "Very good condition",
      available: "Available",
      onDemand: "On request",
      inStock: "In stock",
      outOfStock: "Out of stock",
      checked: "Product checked in store",
    },
    category: {
      home: "Home",
      catalogue: "Catalog",
      telephony: "Phones",
      hightech: "High-tech",
      defaultEyebrow: "FAST CASH selection",
      discoverProducts: "Discover products",
      estimate: "Get an estimate",
      tagsAria: "Category selection",
      advantagesAria: "FAST CASH Geneva advantages",
      storeTitle: "FAST CASH GENEVA",
      storeText:
        "Buying, selling and trade-ins for premium pre-owned products. Our in-store team helps you choose, check or estimate your items.",
      inStore: "in store",
      benefits: [
        ["Checked products", "Tested and verified"],
        ["Professional expertise", "Personal advice"],
        ["Buy & trade-in", "Free estimate"],
        ["In-store service", "Support on site"],
      ],
      strongTexts: {
        apple:
          "Buying a pre-owned Apple product is a smart way to enjoy the brand’s quality, design and performance at a better price.",
        samsung:
          "Enjoy checked, recent Samsung Galaxy devices available according to store arrivals.",
        montres:
          "Each watch is carefully selected to offer quality pieces for premium watch enthusiasts.",
        consoles:
          "Consoles, controllers and games are tested before sale to ensure a reliable experience from day one.",
        informatique:
          "Computers, MacBooks, screens and accessories are checked to guide you toward reliable equipment suited to your needs.",
        "image-son":
          "Audio, photo and video equipment is selected for quality, condition and immediate in-store availability.",
        bijoux:
          "Jewelry, gold and precious pieces can be estimated directly in store with clear, professional support.",
        maroquinerie:
          "Premium bags and accessories are selected for their condition, style and availability at FAST CASH Geneva.",
        telephonie:
          "Smartphones and accessories are checked before sale to offer reliable devices at the best price.",
      },
    },
    catalog: {
      catalogue: "Catalog",
      productsAvailable: "available products",
      shown: "shown",
      sortBy: "Sort by",
      recent: "Newest",
      priceAsc: "Price low to high",
      priceDesc: "Price high to low",
      stock: "Available stock",
      universe: "Universe",
      allProducts: "All products",
      budget: "Budget",
      availability: "Availability",
      inStockOnly: "In stock only",
      showAll: "Show all",
      reset: "Reset",
      allPrices: "All prices",
      lessThan: "Less than",
      andMore: "and more",
      previous: "← Previous",
      next: "Next →",
      page: "Page",
      of: "of",
      noResults: "No products match these filters. Try broadening your search.",
    },
    cart: {
      kicker: "Secure checkout",
      title: "Your cart",
      intro: "Review your selection before completing your purchase with FAST CASH Geneva.",
      cancelled: "Payment cancelled. Your cart has been kept.",
      emptyTitle: "Your cart is empty.",
      emptyText: "Discover our selection of available premium products.",
      discover: "Explore the catalog",
      itemsAria: "Cart products",
      fallbackCategory: "FAST CASH selection",
      unitPrice: "Price",
      checked: "Checked product • FAST CASH warranty • Available in Geneva",
      quantity: "Quantity",
      decrease: "Decrease quantity",
      increase: "Increase quantity",
      remove: "Remove",
      itemTotal: "Item total",
      summaryAria: "Order summary",
      summary: "Order summary",
      totalCart: "Cart total",
      subtotal: "Subtotal",
      shipping: "Shipping",
      free: "Free",
      payment: "Payment",
      stripe: "Secure Stripe",
      total: "Total",
      redirect: "Secure redirect...",
      pay: "Pay securely",
      reassurance: [
        "Secure Stripe payment",
        "FAST CASH checked products",
        "Geneva store pickup available",
        "Fast shipping",
      ],
      stripeInitError: "Stripe could not be initialized.",
      genericError: "An error occurred.",
    },
    search: {
      metadataTitle: "Search | FAST CASH Geneva",
      kicker: "Catalog search",
      title: "What are you looking for?",
      intro:
        "Quickly find a watch, iPhone, MacBook, console, jewelry item or leather good available at FAST CASH Geneva.",
      placeholder: "Search Rolex, iPhone, Louis Vuitton...",
      submit: "Search",
      popularAria: "Popular searches",
      results: "Results",
      productFound: "product found",
      productsFound: "products found",
      query: "Search",
      empty: "Enter a search or choose a suggestion to explore the catalog.",
      refine: "Refine your search for more precise results.",
      noResults1: "No product found for",
      noResults2: "Try a brand, model or category.",
    },
        contact: {
      heroKicker: "Contact FAST CASH Geneva",
      title: "A question, estimate or order request?",
      intro:
        "Contact the FAST CASH Geneva team directly to check availability, request an estimate or ask a question about an order.",
      callStore: "Call the store",
      estimate: "Request an estimate",
      storeLabel: "FAST CASH Geneva",
      addressLine1: "Rue de Monthoux 27",
      addressLine2: "1201 Geneva, Switzerland",
      storeSmall: "Checked premium products • Buy • Sell • Trade-in",
      messageKicker: "Message",
      formTitle: "Write to FAST CASH",
      formIntro:
        "Describe your request in a few lines. The team will receive your message by email with your contact details.",
      detailsKicker: "Contact details",
      cards: {
        store: {
          label: "Store",
          title: "FAST CASH Geneva",
          text: "Rue de Monthoux 27, 1201 Geneva",
          action: "Get directions",
        },
        phone: {
          label: "Phone",
          title: "+41 22 731 16 63",
          text: "For an urgent question or product availability.",
          action: "Call the store",
        },
        email: {
          label: "Email",
          title: "FAST CASH contact",
          text: "Your message is sent directly to the store team.",
          action: "Write an email",
        },
      },
      hoursKicker: "Opening hours",
      hoursTitle: "Store opening hours",
      hours: [
        ["Monday", "11:30 – 20:00"],
        ["Tuesday", "10:00 – 20:00"],
        ["Wednesday", "10:00 – 20:00"],
        ["Thursday", "10:00 – 20:00"],
        ["Friday", "10:00 – 13:30 / 14:30 – 20:00"],
        ["Saturday", "10:00 – 18:00"],
        ["Sunday", "Closed"],
      ],
      mapKicker: "Address",
      mapTitle: "FAST CASH in central Geneva",
      mapText:
        "Visit the FAST CASH Geneva store at Rue de Monthoux 27 for purchases, sales, trade-ins and estimates.",
      mapCta: "Open in Google Maps",
      form: {
        name: "Full name *",
        namePlaceholder: "Your name",
        email: "Email *",
        emailPlaceholder: "you@email.com",
        phone: "Phone",
        phonePlaceholder: "+41 ...",
        subject: "Subject",
        subjects: [
          "General request",
          "Product availability",
          "Order follow-up",
          "Estimate / trade-in",
          "Invoice or payment",
        ],
        message: "Message *",
        messagePlaceholder: "Explain your request...",
        loading: "Sending...",
        submit: "Send message",
        success: "Your message has been sent.",
        error: "Unable to send your message.",
      },
    },
estimation: {
      kicker: "FAST CASH trade-in",
      title: "Get your product estimated",
      intro: "Send your product details. The FAST CASH Geneva team will get back to you quickly.",
      name: "Full name",
      email: "Email",
      phone: "Phone",
      description: "Describe the product, its condition, accessories...",
      submit: "Send request",
      categories: ["Apple / iPhone / iPad", "Samsung", "Luxury watch", "Computers", "Console", "Image & Sound", "Jewelry / Leather goods"],
    },
    block: {
      title: "FAST CASH GENEVA",
      text: "Located in the heart of Geneva, FAST CASH specializes in buying, selling and trade-ins for quality pre-owned products. Our team helps you choose your product and can also estimate your items.",
      cta: "Get your product estimated",
    },
    footer: {
      brandText: "Buying, selling and trade-ins for premium products in Geneva.",
      store: "Geneva store",
      categories: "Universes",
      watches: "Watches",
      apple: "Apple",
      samsung: "Samsung",
      leather: "Leather goods",
      jewelry: "Jewelry",
      computers: "Computers",
      imageSound: "Image & Sound",
      consoles: "Consoles",
      services: "Services",
      estimate: "Get an item estimated",
      search: "Search",
      cart: "Cart",
      contact: "Contact us",
      reassuranceTitle: "Our guarantees",
      reassurance: [
        "Secure payment",
        "Checked products",
        "Geneva store pickup",
        "Free expertise",
      ],
      hoursTitle: "Opening hours",
      hours: [
        { day: "Monday", time: "11:30–20:00" },
        { day: "Tuesday", time: "10:00–20:00" },
        { day: "Wednesday", time: "10:00–20:00" },
        { day: "Thursday", time: "10:00–20:00" },
        { day: "Friday", time: "10:00–13:30 · 14:30–20:00" },
        { day: "Saturday", time: "10:00–18:00" },
        { day: "Sunday", time: "Closed" },
      ],
      copyright: "© FAST CASH Geneva — All rights reserved",
      legal: "Legal notice",
      privacy: "Privacy",
    },
  },
} as const;


export function translateCategoryName(value: string | undefined | null, locale: Locale) {
  return translateCategoryLabel(value, locale);
}

export function translateBreadcrumbLabel(value: string, locale: Locale) {
  return translateCategoryLabel(value, locale);
}

const categoryHeroTranslations: Record<string, { eyebrow: string; title: string; subtitle: string; description: string; cta: string }> = {
  apple: {
    eyebrow: "Premium phones",
    title: "Apple products",
    subtitle: "pre-owned in Geneva",
    description:
      "Explore our selection of pre-owned Apple products at FAST CASH Geneva: iPhone, iPad, Apple Watch, MacBook and accessories carefully checked by our team.",
    cta: "Get your Apple device estimated",
  },
  samsung: {
    eyebrow: "Galaxy & accessories",
    title: "Samsung products",
    subtitle: "pre-owned in Geneva",
    description:
      "Find a selection of checked pre-owned Samsung Galaxy smartphones and devices in Geneva, available according to store arrivals.",
    cta: "Get your Samsung estimated",
  },
  montres: {
    eyebrow: "Swiss watchmaking",
    title: "Luxury watches",
    subtitle: "pre-owned in Geneva",
    description:
      "FAST CASH Geneva offers a curated selection of pre-owned luxury watches from Rolex, Omega, Breitling, TAG Heuer, Cartier, Tudor and other prestigious brands.",
    cta: "Get your watch estimated",
  },
  consoles: {
    eyebrow: "Gaming & accessories",
    title: "PlayStation • Xbox",
    subtitle: "Nintendo Switch",
    description:
      "Discover pre-owned consoles and video games in Geneva: PlayStation, Xbox, Nintendo Switch, controllers, games and accessories according to FAST CASH arrivals.",
    cta: "Get your console estimated",
  },
  informatique: {
    eyebrow: "MacBook • PC • screens",
    title: "Computers",
    subtitle: "pre-owned in Geneva",
    description:
      "Laptops, MacBooks, screens and computer accessories are available at FAST CASH Geneva, with in-store advice and trade-in options.",
    cta: "Get your computer estimated",
  },
  "image-son": {
    eyebrow: "Audio • photo • video",
    title: "Image & Sound",
    subtitle: "pre-owned in Geneva",
    description:
      "Cameras, headphones, speakers and image & sound equipment are tested and available in Geneva according to current stock.",
    cta: "Get your device estimated",
  },
  bijoux: {
    eyebrow: "Jewelry & precious pieces",
    title: "Jewelry",
    subtitle: "pre-owned in Geneva",
    description:
      "Pre-owned jewelry, rings, bracelets, necklaces and precious pieces are available according to FAST CASH Geneva arrivals. Estimates and trade-ins are handled in store.",
    cta: "Get your jewelry estimated",
  },
  maroquinerie: {
    eyebrow: "Luxury bags & accessories",
    title: "Leather goods",
    subtitle: "pre-owned in Geneva",
    description:
      "Premium bags and leather accessories are selected with care according to their condition, style and availability at FAST CASH Geneva.",
    cta: "Get your item estimated",
  },
  telephonie: {
    eyebrow: "Smartphones & accessories",
    title: "Phones",
    subtitle: "pre-owned in Geneva",
    description:
      "Smartphones, iPhone, Samsung Galaxy devices and phone accessories are checked before sale and available at FAST CASH Geneva.",
    cta: "Get your phone estimated",
  },
};

export function getLocalizedBrandHero(category: { slug?: string; title: string; subtitle: string; description: string; eyebrow?: string; cta: string }, locale: Locale) {
  if (locale === "fr") {
    return {
      eyebrow: category.eyebrow,
      title: category.title,
      subtitle: category.subtitle,
      description: category.description,
      cta: category.cta,
    };
  }

  const isBrandPage = category.eyebrow === "Marque FAST CASH";

  if (isBrandPage) {
    return {
      eyebrow: "FAST CASH brand",
      title: category.title,
      subtitle: "pre-owned in Geneva",
      description: `Discover the ${category.title} selection available at FAST CASH Geneva. Products are checked in store and offered according to arrivals.`,
      cta: "Get your item estimated",
    };
  }

  const translatedCategory = category.slug ? categoryHeroTranslations[category.slug] : undefined;

  if (translatedCategory) return translatedCategory;

  return {
    eyebrow: translateCategoryName(category.eyebrow, locale) || category.eyebrow,
    title: translateCategoryName(category.title, locale) || category.title,
    subtitle: category.subtitle === "D'occasion à Genève" ? "pre-owned in Geneva" : category.subtitle,
    description: category.description,
    cta: "Get your item estimated",
  };
}

type I18nContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dict: typeof dictionaries.fr | typeof dictionaries.en;
};

const I18nContext = createContext<I18nContextType | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored === "fr" || stored === "en") {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    localStorage.setItem(STORAGE_KEY, nextLocale);
    document.documentElement.lang = nextLocale;
  };

  const value = useMemo(
    () => ({ locale, setLocale, dict: dictionaries[locale] }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("LocaleProvider missing");
  }

  return context;
}
