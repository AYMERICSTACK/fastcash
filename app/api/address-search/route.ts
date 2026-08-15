import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/session";

type AddressSuggestion = {
  label: string;
  line1: string;
  postalCode: string;
  city: string;
  country: string;
};

type GeoAdminResult = {
  attrs?: {
    label?: string;
    detail?: string;
    origin?: string;
  };
};

type FranceCompletionResult = {
  fulltext?: string;
  street?: string;
  zipcode?: string;
  city?: string;
  country?: string;
  kind?: string;
};

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function normalizeKey(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeSuggestions(items: AddressSuggestion[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = normalizeKey(`${item.line1}|${item.postalCode}|${item.city}|${item.country}`);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseSwissAddress(result: GeoAdminResult): AddressSuggestion {
  const cleanLabel = stripHtml(result.attrs?.label ?? "");
  const detail = stripHtml(result.attrs?.detail ?? "");

  const labelPostal = cleanLabel.match(/\b(\d{4})\b/);
  const detailPostal = detail.match(/\b(\d{4})\b/);
  const postalCode = labelPostal?.[1] ?? detailPostal?.[1] ?? "";

  let line1 = cleanLabel;
  let city = "";

  if (postalCode) {
    const postalIndex = cleanLabel.indexOf(postalCode);

    if (postalIndex >= 0) {
      line1 = cleanLabel
        .slice(0, postalIndex)
        .replace(/[-,\s]+$/, "")
        .trim();

      city = cleanLabel
        .slice(postalIndex + postalCode.length)
        .replace(/^[-,\s]+/, "")
        .trim();
    }

    if (!city) {
      const detailIndex = detail.indexOf(postalCode);
      if (detailIndex >= 0) {
        city = detail
          .slice(detailIndex + postalCode.length)
          .replace(/^[-,\s]+/, "")
          .trim();
      }
    }
  }

  const lineLooksLikeLocalityOnly =
    !line1 ||
    /^\d{4}\b/.test(line1) ||
    line1.toLowerCase() === city.toLowerCase();

  if (lineLooksLikeLocalityOnly && postalCode) {
    const detailIndex = detail.indexOf(postalCode);
    const detailStreet =
      detailIndex >= 0
        ? detail.slice(0, detailIndex).replace(/[-,\s]+$/, "").trim()
        : "";

    if (detailStreet) line1 = detailStreet;
  }

  const label = [
    line1,
    [postalCode, city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  return {
    label: label || cleanLabel || detail,
    line1: line1 || cleanLabel || detail,
    postalCode,
    city,
    country: "Suisse",
  };
}

function parseFrenchAddress(result: FranceCompletionResult): AddressSuggestion {
  const fulltext = (result.fulltext ?? "").trim();
  const postalCode = (result.zipcode ?? "").trim();
  const city = (result.city ?? "").trim();

  // Le service IGN renvoie normalement `street`, mais `fulltext`
  // est prioritaire pour conserver le numéro de voie lors d'une adresse précise.
  let line1 = "";

  if (fulltext && postalCode) {
    const postalIndex = fulltext.lastIndexOf(postalCode);
    if (postalIndex > 0) {
      line1 = fulltext
        .slice(0, postalIndex)
        .replace(/[-,\s]+$/, "")
        .trim();
    }
  }

  if (!line1) line1 = (result.street ?? "").trim();
  if (!line1) line1 = fulltext;

  const label =
    fulltext ||
    [line1, [postalCode, city].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ");

  return {
    label,
    line1,
    postalCode,
    city,
    country: "France",
  };
}

async function searchSwitzerland(query: string) {
  const url = new URL("https://api3.geo.admin.ch/rest/services/ech/SearchServer");
  url.searchParams.set("searchText", query);
  url.searchParams.set("type", "locations");
  url.searchParams.set("origins", "address");
  url.searchParams.set("lang", "fr");
  url.searchParams.set("limit", "8");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("geo.admin.ch address search failed", response.status);
    return [];
  }

  const payload = (await response.json()) as { results?: GeoAdminResult[] };

  return dedupeSuggestions(
    (payload.results ?? [])
      .filter((item) => item.attrs?.origin === "address")
      .map(parseSwissAddress)
      .filter((item) => item.line1 && item.label),
  ).slice(0, 6);
}

async function searchFrance(query: string) {
  const url = new URL("https://data.geopf.fr/geocodage/completion/");
  url.searchParams.set("text", query);
  url.searchParams.set("type", "StreetAddress");
  url.searchParams.set("terr", "METROPOLE");
  url.searchParams.set("maximumResponses", "8");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("IGN France address completion failed", response.status);
    return [];
  }

  const payload = (await response.json()) as {
    results?: FranceCompletionResult[];
  };

  return dedupeSuggestions(
    (payload.results ?? [])
      .map(parseFrenchAddress)
      .filter(
        (item) =>
          item.line1 &&
          item.label &&
          item.postalCode &&
          item.city,
      ),
  ).slice(0, 6);
}

export async function GET(request: Request) {
  const session = await getCustomerSession();

  if (!session) {
    return NextResponse.json({ message: "Session expirée." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim().slice(0, 120);
  const country = (searchParams.get("country") ?? "Suisse").trim();

  if (query.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    if (country === "France") {
      return NextResponse.json({ suggestions: await searchFrance(query) });
    }

    if (country === "Suisse") {
      return NextResponse.json({ suggestions: await searchSwitzerland(query) });
    }

    return NextResponse.json({ suggestions: [] });
  } catch (error) {
    console.error("Address autocomplete failed", error);

    // Dégradation gracieuse : les champs restent saisissables manuellement.
    return NextResponse.json({ suggestions: [] });
  }
}
