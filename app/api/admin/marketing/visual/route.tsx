import { ImageResponse } from "next/og";
import { requireAdminSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Theme = "tech" | "luxury" | "watches";

type VisualProps = {
  width: number;
  height: number;
  image: string | null;
  title: string;
  subtitle: string;
  price: string;
  badge: string;
};

function clean(value: string | null, fallback: string, max = 100) {
  const text = (value || "").trim();
  return (text || fallback).slice(0, max);
}

function absoluteImageUrl(value: string, requestUrl: string) {
  try {
    return new URL(value, requestUrl).toString();
  } catch {
    return null;
  }
}

async function imageToDataUri(value: string | null | undefined, requestUrl: string, zoom: -1 | 0 | 1 = 0) {
  if (!value) return null;
  const url = absoluteImageUrl(value, requestUrl);
  if (!url) return null;

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8",
        "User-Agent": "FAST-CASH-Studio/4.2",
      },
    });

    if (!response.ok) return null;
    const type = response.headers.get("content-type") || "image/jpeg";
    if (!type.startsWith("image/")) return null;

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > 12 * 1024 * 1024) return null;

    // Smart Crop V4.1: les photos catalogue ont souvent de très grandes marges
    // blanches. On les retire côté serveur sans modifier le produit lui-même.
    // Une petite marge est ensuite réinjectée pour que le produit ne touche
    // jamais le bord du cadre du template.
    try {
      const cropped = await sharp(bytes, { failOn: "none" })
        .flatten({ background: "#ffffff" })
        .trim({ background: "#ffffff", threshold: 18 })
        .extend({ top: zoom === 1 ? 6 : zoom === -1 ? 58 : 24, right: zoom === 1 ? 6 : zoom === -1 ? 58 : 24, bottom: zoom === 1 ? 6 : zoom === -1 ? 58 : 24, left: zoom === 1 ? 6 : zoom === -1 ? 58 : 24, background: "#ffffff" })
        .resize({ width: 1000, height: 1000, fit: "inside", withoutEnlargement: false })
        .png({ compressionLevel: 8 })
        .toBuffer();

      return `data:image/png;base64,${cropped.toString("base64")}`;
    } catch (cropError) {
      console.warn("FAST CASH Studio smart crop fallback:", cropError);
      return `data:${type};base64,${bytes.toString("base64")}`;
    }
  } catch (error) {
    console.error("FAST CASH Studio image fetch error:", error);
    return null;
  }
}

function socialTitle(value: string, subtitle: string) {
  let title = value.trim();
  const label = subtitle.trim();

  // La marque est déjà affichée comme surtitre : éviter de la répéter dans le titre social.
  if (label.length >= 3 && title.toLocaleLowerCase("fr").startsWith(`${label.toLocaleLowerCase("fr")} `)) {
    title = title.slice(label.length).trim();
  }

  // Les mentions d'état restent disponibles sur la fiche produit et dans le BO,
  // mais alourdissent inutilement la créa Instagram.
  title = title
    .replace(/[,.;:\s-]*(?:état|etat)\s+(?:neuf|comme neuf|bon|très bon|tres bon)\.?$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (title.length <= 62) return title;
  const shortened = title.slice(0, 62).replace(/\s+\S*$/, "").replace(/[,.;:\s-]+$/, "");
  return `${shortened}…`;
}

function Brand({ light = false }: { light?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", color: light ? "#ffffff" : "#111111" }}>
      <span style={{ display: "flex", fontSize: 36, fontWeight: 900, letterSpacing: 6.2 }}>FAST CASH</span>
      <span style={{ display: "flex", marginTop: 5, color: "#d4af37", fontSize: 12, fontWeight: 900, letterSpacing: 8.5 }}>GENÈVE</span>
    </div>
  );
}

function ProductImage({ image }: { image: string | null }) {
  if (!image) {
    return (
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", color: "#8f8f8f", fontSize: 22, fontWeight: 700 }}>
        Photo produit indisponible
      </div>
    );
  }

  return <img src={image} alt="" width="760" height="760" style={{ width: "100%", height: "100%", objectFit: "contain" }} />;
}

function Price({ value, accent = "#d4af37", light = false, story = false }: { value: string; accent?: string; light?: boolean; story?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
      <span style={{ display: "flex", fontSize: story ? 84 : 74, lineHeight: 1, fontWeight: 900, letterSpacing: -2, color: light ? "#ffffff" : "#17120e" }}>{value}</span>
      <span style={{ display: "flex", color: accent, fontSize: story ? 25 : 21, fontWeight: 900, letterSpacing: 2 }}>CHF</span>
    </div>
  );
}

function Footer({ color = "#d4af37", muted = "#8b8170", label = "GENÈVE · SUISSE", story = false }: { color?: string; muted?: string; label?: string; story?: boolean }) {
  return (
    <div style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", paddingTop: story ? 28 : 22, borderTop: `1px solid ${muted}55`, fontSize: story ? 21 : 17, fontWeight: 900, letterSpacing: story ? 2.4 : 2 }}>
      <span style={{ display: "flex", color }}>FASTCASH-GENEVE.CH</span>
      <span style={{ display: "flex", color: muted }}>{label}</span>
    </div>
  );
}

function TechVisual({ height, image, title, subtitle, price, badge }: VisualProps) {
  const story = height > 1500;
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", flexDirection: "column", position: "relative", backgroundColor: "#050914", color: "#ffffff", fontFamily: "Arial, sans-serif", padding: story ? "66px 66px 54px" : "52px 62px 44px", overflow: "hidden" }}>
      <div style={{ display: "flex", position: "absolute", width: story ? 680 : 560, height: story ? 680 : 560, right: -150, top: -180, borderRadius: 999, background: "linear-gradient(135deg,#173bff,#00b8ff)", opacity: .9 }} />
      <div style={{ display: "flex", position: "absolute", width: 330, height: 330, left: -210, bottom: 120, borderRadius: 999, border: "42px solid #173bff", opacity: .18 }} />

      <div style={{ display: "flex", position: "relative", alignItems: "center", justifyContent: "space-between" }}>
        <Brand light />
        <div style={{ display: "flex", padding: "11px 20px", borderRadius: 999, backgroundColor: "#ffffff", color: "#07101f", fontSize: 13, fontWeight: 900, letterSpacing: 2.4 }}>{badge}</div>
      </div>

      <div style={{ display: "flex", position: "relative", flex: 1, minHeight: 0, flexDirection: story ? "column" : "row", marginTop: story ? 58 : 40, gap: story ? 36 : 42 }}>
        <div style={{ display: "flex", flex: story ? "0 0 auto" : "0 0 39%", flexDirection: "column", justifyContent: "center", zIndex: 2 }}>
          <span style={{ display: "flex", color: "#69c9ff", fontSize: 15, fontWeight: 900, letterSpacing: 5, textTransform: "uppercase" }}>{subtitle}</span>
          <span style={{ display: "flex", marginTop: 18, fontSize: title.length > 55 ? 44 : title.length > 35 ? 53 : 64, lineHeight: .96, fontWeight: 900, letterSpacing: -2.6 }}>{title}</span>
          <div style={{ display: "flex", alignItems: "center", marginTop: 34, gap: 16 }}>
            <div style={{ display: "flex", width: 54, height: 6, backgroundColor: "#18bfff" }} />
            <span style={{ display: "flex", color: "#8d9ab5", fontSize: story ? 18 : 15, fontWeight: 800, letterSpacing: 2 }}>SÉLECTION FAST CASH</span>
          </div>
          <div style={{ display: "flex", marginTop: 26 }}><Price value={price} accent="#5bc9ff" light story={story} /></div>
          <div style={{ display: "flex", marginTop: 22, padding: "13px 18px", alignSelf: "flex-start", border: "1px solid #274269", borderRadius: 999, color: "#d7e4f7", fontSize: story ? 21 : 17 }}>Disponible maintenant · Genève</div>
          <div style={{ display: "flex", marginTop: 28, gap: 28, color: "#a6b8d3", fontSize: story ? 18 : 15, fontWeight: 800, letterSpacing: 1.5 }}>
            <span style={{ display: "flex" }}>PRODUIT CONTRÔLÉ</span><span style={{ display: "flex" }}>RETRAIT À GENÈVE</span>
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, minHeight: story ? 900 : 0, position: "relative", alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", position: "absolute", width: "88%", height: "88%", right: 0, bottom: 0, borderRadius: 48, background: "linear-gradient(145deg,#173bff,#0b1732 58%,#00a9e8)", transform: "rotate(4deg)" }} />
          <div style={{ display: "flex", width: "92%", height: "92%", position: "relative", padding: story ? 34 : 24, alignItems: "center", justifyContent: "center", borderRadius: 46, backgroundColor: "#f7f8fb", border: "1px solid #4a6ab1", boxShadow: "0 32px 100px rgba(0,0,0,.38)" }}>
            <ProductImage image={image} />
          </div>
        </div>
      </div>
      <div style={{ display: "flex", position: "relative", marginTop: 30 }}><Footer color="#5bc9ff" muted="#75829c" label="FAST CASH · GENÈVE" story={story} /></div>
    </div>
  );
}

function LuxuryVisual({ height, image, title, subtitle, price, badge }: VisualProps) {
  const story = height > 1500;
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", flexDirection: "column", position: "relative", backgroundColor: "#eee7da", color: "#17120e", fontFamily: "Arial, sans-serif", padding: story ? "68px 68px 56px" : "54px 64px 44px", overflow: "hidden" }}>
      <div style={{ display: "flex", position: "absolute", left: 0, top: 0, width: 18, height: "100%", backgroundColor: "#b78a37" }} />
      <div style={{ display: "flex", position: "absolute", right: -120, top: -130, width: 440, height: 440, borderRadius: 999, border: "1px solid #c9ad75", opacity: .55 }} />
      <div style={{ display: "flex", position: "absolute", right: -30, top: -40, width: 260, height: 260, borderRadius: 999, border: "1px solid #c9ad75", opacity: .38 }} />

      <div style={{ display: "flex", position: "relative", alignItems: "center", justifyContent: "space-between" }}>
        <Brand />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "flex", width: 44, height: 1, backgroundColor: "#9d762e" }} />
          <span style={{ display: "flex", color: "#6c552d", fontSize: 12, fontWeight: 900, letterSpacing: 3 }}>{badge}</span>
        </div>
      </div>

      <div style={{ display: "flex", position: "relative", flex: 1, minHeight: 0, marginTop: story ? 56 : 40, gap: story ? 42 : 50, flexDirection: story ? "column" : "row" }}>
        <div style={{ display: "flex", flex: story ? "0 0 auto" : "0 0 38%", flexDirection: "column", justifyContent: "center" }}>
          <span style={{ display: "flex", color: "#a17a31", fontSize: 14, fontWeight: 900, letterSpacing: 5.5, textTransform: "uppercase" }}>{subtitle}</span>
          <span style={{ display: "flex", marginTop: 22, fontFamily: "Georgia, serif", fontSize: title.length > 55 ? 46 : title.length > 35 ? 55 : 67, lineHeight: .96, fontWeight: 700, letterSpacing: -1.3 }}>{title}</span>
          <span style={{ display: "flex", marginTop: 24, color: "#756b5e", fontFamily: "Georgia, serif", fontSize: story ? 27 : 23, fontStyle: "italic" }}>Une pièce sélectionnée à Genève.</span>
          <span style={{ display: "flex", marginTop: 10, color: "#9d762e", fontSize: story ? 17 : 14, fontWeight: 900, letterSpacing: 2.4 }}>AUTHENTICITÉ · ÉTAT · DÉTAILS CONTRÔLÉS</span>
          <div style={{ display: "flex", width: 96, height: 2, margin: "30px 0 26px", backgroundColor: "#b88a32" }} />
          <Price value={price} accent="#9d762e" story={story} />
          <span style={{ display: "flex", marginTop: 20, color: "#74695b", fontSize: story ? 20 : 17, fontWeight: 700, letterSpacing: .4 }}>EN BOUTIQUE & SUR FASTCASH-GENEVE.CH</span>
        </div>

        <div style={{ display: "flex", flex: 1, minHeight: story ? 850 : 0, position: "relative", alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", position: "absolute", width: "86%", height: "94%", right: 0, top: "3%", border: "1px solid #b88a32", borderRadius: 76 }} />
          <div style={{ display: "flex", width: "90%", height: "90%", position: "relative", padding: story ? 34 : 24, alignItems: "center", justifyContent: "center", borderRadius: 64, backgroundColor: "#fffdf8", boxShadow: "0 28px 80px rgba(73,55,27,.13)" }}>
            <ProductImage image={image} />
          </div>
          <div style={{ display: "flex", position: "absolute", right: -6, bottom: story ? 70 : 46, padding: "13px 18px", backgroundColor: "#17120e", color: "#d8b768", fontSize: story ? 17 : 14, fontWeight: 900, letterSpacing: 2.4 }}>SÉLECTION FAST CASH</div>
        </div>
      </div>
      <div style={{ display: "flex", position: "relative", marginTop: 30 }}><Footer color="#9d762e" muted="#7d7468" label="GENÈVE · SUISSE" story={story} /></div>
    </div>
  );
}

function WatchesVisual({ height, image, title, subtitle, price, badge }: VisualProps) {
  const story = height > 1500;
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", flexDirection: "column", position: "relative", backgroundColor: "#050504", color: "#f6f0e4", fontFamily: "Arial, sans-serif", padding: story ? "68px 68px 56px" : "54px 64px 44px", overflow: "hidden" }}>
      <div style={{ display: "flex", position: "absolute", left: 80, right: 80, top: story ? 235 : 190, height: 1, backgroundColor: "#4f4023" }} />
      <div style={{ display: "flex", position: "relative", alignItems: "center", justifyContent: "space-between" }}>
        <Brand light />
        <div style={{ display: "flex", color: "#d4af37", fontSize: 12, fontWeight: 900, letterSpacing: 3 }}>{badge}</div>
      </div>

      <div style={{ display: "flex", position: "relative", flexDirection: "column", alignItems: "center", textAlign: "center", marginTop: story ? 58 : 42 }}>
        <span style={{ display: "flex", color: "#b69a5a", fontSize: 13, fontWeight: 900, letterSpacing: 7, textTransform: "uppercase" }}>{subtitle}</span>
        <span style={{ display: "flex", maxWidth: 900, marginTop: 20, fontFamily: "Georgia, serif", fontSize: title.length > 48 ? 40 : title.length > 30 ? 48 : 58, lineHeight: 1.02, fontWeight: 700 }}>{title}</span>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0, position: "relative", margin: story ? "40px 62px 24px" : "30px 72px 18px", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", position: "absolute", width: "100%", height: "100%", border: "1px solid #6a5426", backgroundColor: "#0b0a08" }} />
        <div style={{ display: "flex", width: "96%", height: "94%", position: "relative", padding: story ? 34 : 24, alignItems: "center", justifyContent: "center", backgroundColor: "#fffdf8" }}>
          <ProductImage image={image} />
        </div>
        <div style={{ display: "flex", position: "absolute", left: -18, top: 36, width: 3, height: 110, backgroundColor: "#d4af37" }} />
        <div style={{ display: "flex", position: "absolute", right: -18, bottom: 36, width: 3, height: 110, backgroundColor: "#d4af37" }} />
      </div>

      <div style={{ display: "flex", position: "relative", alignItems: "flex-end", justifyContent: "space-between", marginTop: story ? 28 : 18 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ display: "flex", color: "#8f8164", fontSize: story ? 20 : 16, fontWeight: 900, letterSpacing: story ? 3.2 : 2.6 }}>DISPONIBLE À GENÈVE</span>
          <span style={{ display: "flex", marginTop: 8, color: "#c5b99e", fontSize: story ? 24 : 19 }}>Boutique & achat en ligne</span>
          <span style={{ display: "flex", marginTop: 10, color: "#d4af37", fontSize: story ? 18 : 14, fontWeight: 900, letterSpacing: story ? 2.4 : 2 }}>PRODUIT CONTRÔLÉ · SÉLECTION FAST CASH</span>
        </div>
        <Price value={price} accent="#d4af37" light story={story} />
      </div>
      <div style={{ display: "flex", position: "relative", marginTop: story ? 36 : 28 }}><Footer color="#d4af37" muted="#827866" label="SÉLECTION FAST CASH" story={story} /></div>
    </div>
  );
}

export async function GET(request: Request) {
  await requireAdminSession();

  const { searchParams } = new URL(request.url);
  const rawTheme = searchParams.get("theme");
  const theme: Theme = rawTheme === "tech" || rawTheme === "luxury" ? rawTheme : "watches";
  const format = searchParams.get("format") === "story" ? "story" : "post";
  const width = 1080;
  const height = format === "story" ? 1920 : 1350;

  const rawZoom = Number(searchParams.get("zoom") || "0");
  const zoom: -1 | 0 | 1 = rawZoom < 0 ? -1 : rawZoom > 0 ? 1 : 0;

  const productId = searchParams.get("productId");
  const product = productId
    ? await prisma.product.findUnique({ where: { id: productId }, select: { image: true } })
    : null;

  const productImage = await imageToDataUri(product?.image, request.url, zoom);
  const rawTitle = clean(searchParams.get("title"), "Produit FAST CASH", 100);
  const subtitle = clean(searchParams.get("subtitle"), searchParams.get("category") || searchParams.get("brand") || "Sélection FAST CASH", 55);
  const title = socialTitle(rawTitle, subtitle);
  const rawPrice = clean(searchParams.get("price"), "0.00", 18).replace(/\s*CHF$/i, "").replace(/\s/g, "").replace(",", ".");
  const numericPrice = Number(rawPrice);
  const price = Number.isFinite(numericPrice)
    ? new Intl.NumberFormat("fr-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numericPrice)
    : rawPrice;
  const badge = clean(searchParams.get("badge"), "DISPONIBLE", 24).toUpperCase();

  const props: VisualProps = { width, height, image: productImage, title, subtitle, price, badge };
  const element = theme === "tech"
    ? <TechVisual {...props} />
    : theme === "luxury"
      ? <LuxuryVisual {...props} />
      : <WatchesVisual {...props} />;

  try {
    return new ImageResponse(element, {
      width,
      height,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("FAST CASH visual generation error:", error);
    return new Response("Impossible de générer le visuel.", { status: 500 });
  }
}
