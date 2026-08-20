import { ImageResponse } from "next/og";
import { requireAdminSession } from "@/lib/session";

export const runtime = "nodejs";

type Theme = "tech" | "luxury" | "watches";

function clean(value: string | null, fallback: string, max = 100) {
  const text = (value || "").trim();
  return (text || fallback).slice(0, max);
}

async function imageToDataUri(url?: string | null) {
  if (!url) return null;

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8",
        "User-Agent": "FAST-CASH-Studio/2.0",
      },
    });

    if (!response.ok) return null;

    const type = response.headers.get("content-type") || "image/jpeg";
    const data = Buffer.from(await response.arrayBuffer()).toString("base64");
    return `data:${type};base64,${data}`;
  } catch {
    return null;
  }
}

function Logo({ logo, dark = false }: { logo: string | null; dark?: boolean }) {
  if (logo) {
    return (
      <img
        src={logo}
        alt=""
        width="245"
        height="74"
        style={{ objectFit: "contain" }}
      />
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        color: dark ? "#111111" : "#ffffff",
      }}
    >
      <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: 5 }}>
        FAST CASH
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: 9,
          color: "#d4af37",
        }}
      >
        GENÈVE
      </span>
    </div>
  );
}

function Feature({
  text,
  accent,
  fg,
  bg,
  border,
}: {
  text: string;
  accent: string;
  fg: string;
  bg: string;
  border: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        minHeight: 60,
        padding: "11px 14px",
        borderRadius: 14,
        border: `1px solid ${border}`,
        backgroundColor: bg,
        color: fg,
      }}
    >
      <div
        style={{
          display: "flex",
          width: 30,
          height: 30,
          borderRadius: 30,
          alignItems: "center",
          justifyContent: "center",
          border: `1px solid ${accent}`,
          color: accent,
          fontWeight: 900,
          fontSize: 14,
        }}
      >
        ✓
      </div>
      <span
        style={{
          display: "flex",
          flex: 1,
          fontSize: 15,
          lineHeight: 1.15,
          fontWeight: 800,
        }}
      >
        {text}
      </span>
    </div>
  );
}

function TechVisual({
  width,
  height,
  logo,
  image,
  title,
  subtitle,
  price,
  badge,
  features,
}: any) {
  const story = height > 1500;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#f6f7fb",
        color: "#111111",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 0,
          top: 0,
          width: 250,
          height: 18,
          backgroundColor: "#1547ff",
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          right: -130,
          top: 125,
          width: 430,
          height: 430,
          borderRadius: 430,
          backgroundColor: "#e4ebff",
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          right: 54,
          top: 72,
          width: 115,
          height: 115,
          border: "1px solid #1547ff",
          transform: "rotate(45deg)",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: story ? "60px 58px 20px" : "42px 58px 18px",
          zIndex: 2,
        }}
      >
        <Logo logo={logo} dark />
        <div
          style={{
            display: "flex",
            padding: "11px 18px",
            borderRadius: 999,
            border: "1px solid #1547ff",
            color: "#1547ff",
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: 2,
          }}
        >
          {badge}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "15px 58px 0",
          zIndex: 2,
        }}
      >
        <span
          style={{
            display: "flex",
            color: "#1547ff",
            fontSize: 18,
            fontWeight: 900,
            letterSpacing: 5,
            textTransform: "uppercase",
          }}
        >
          {subtitle}
        </span>
        <span
          style={{
            display: "flex",
            maxWidth: 880,
            marginTop: 12,
            fontSize: title.length > 55 ? 44 : title.length > 34 ? 55 : 66,
            lineHeight: 1.02,
            fontWeight: 900,
          }}
        >
          {title}
        </span>
        <div
          style={{
            display: "flex",
            width: 90,
            height: 5,
            marginTop: 17,
            backgroundColor: "#1547ff",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          position: "relative",
          margin: story ? "34px 58px 22px" : "26px 58px 20px",
          minHeight: 0,
          borderRadius: 30,
          border: "1px solid #dfe4ef",
          backgroundColor: "#ffffff",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: -100,
            bottom: -150,
            width: 480,
            height: 480,
            borderRadius: 480,
            backgroundColor: "#eef2ff",
          }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 50,
            top: 46,
            width: story ? 650 : 610,
            height: story ? 760 : 520,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {image ? (
            <img
              src={image}
              alt=""
              width={story ? 650 : 610}
              height={story ? 760 : 520}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          ) : (
            <span style={{ fontSize: 24, color: "#6e7480" }}>
              Photo indisponible
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "absolute",
            top: 42,
            right: 34,
            width: 280,
            gap: 10,
          }}
        >
          {features.map((f: string) => (
            <Feature
              key={f}
              text={f}
              accent="#1547ff"
              fg="#111111"
              bg="#f9faff"
              border="#dfe5f3"
            />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "absolute",
            left: 28,
            bottom: 26,
            minWidth: 310,
            padding: "18px 24px",
            borderRadius: 18,
            backgroundColor: "#0d1e58",
            color: "#ffffff",
            border: "1px solid #1547ff",
          }}
        >
          <span
            style={{
              display: "flex",
              fontSize: 12,
              letterSpacing: 4,
              color: "#aebcff",
            }}
          >
            PRIX
          </span>
          <span
            style={{
              display: "flex",
              marginTop: 3,
              fontSize: 46,
              fontWeight: 900,
            }}
          >
            {price} CHF
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "18px 58px 32px",
          color: "#59606c",
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: 1,
        }}
      >
        <span style={{ display: "flex", color: "#1547ff" }}>
          FASTCASH-GENEVE.CH
        </span>
        <span style={{ display: "flex" }}>
          AUTHENTIFIÉ · GARANTIE · PAIEMENT SÉCURISÉ
        </span>
      </div>
    </div>
  );
}

function LuxuryVisual({
  height,
  logo,
  image,
  title,
  subtitle,
  price,
  badge,
  features,
}: any) {
  const story = height > 1500;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#f5ecdd",
        color: "#17120d",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          position: "absolute",
          right: -120,
          top: 0,
          width: 470,
          height: 470,
          borderRadius: 470,
          backgroundColor: "#ead8b3",
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 0,
          top: 0,
          width: 16,
          height: "100%",
          backgroundColor: "#c99a2e",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: story ? "64px 60px 20px" : "46px 60px 18px",
          zIndex: 2,
        }}
      >
        <Logo logo={logo} dark />
        <div
          style={{
            display: "flex",
            padding: "11px 18px",
            borderRadius: 999,
            backgroundColor: "#19130d",
            color: "#d8b65a",
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: 2,
          }}
        >
          {badge}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "16px 60px 0",
          zIndex: 2,
        }}
      >
        <span
          style={{
            display: "flex",
            color: "#9c721d",
            fontSize: 18,
            fontWeight: 900,
            letterSpacing: 5,
            textTransform: "uppercase",
          }}
        >
          {subtitle}
        </span>
        <span
          style={{
            display: "flex",
            maxWidth: 900,
            marginTop: 14,
            fontFamily: "Georgia, serif",
            fontSize: title.length > 55 ? 46 : title.length > 34 ? 57 : 70,
            lineHeight: 1.01,
            fontWeight: 700,
          }}
        >
          {title}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          position: "relative",
          margin: story ? "34px 60px 24px" : "27px 60px 20px",
          minHeight: 0,
          borderRadius: 34,
          backgroundColor: "#fffaf2",
          border: "1px solid #ddc89f",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 70,
            top: 80,
            width: story ? 650 : 600,
            height: story ? 790 : 540,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {image ? (
            <img
              src={image}
              alt=""
              width={story ? 650 : 600}
              height={story ? 790 : 540}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          ) : (
            <span style={{ fontSize: 24, color: "#7a6d5d" }}>
              Photo indisponible
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            position: "absolute",
            right: 34,
            top: 38,
            width: 250,
            height: 250,
            borderRadius: 250,
            border: "1px solid #d7bc83",
          }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            right: 77,
            top: 81,
            width: 165,
            height: 165,
            borderRadius: 165,
            backgroundColor: "#f0dfbf",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "absolute",
            right: 35,
            bottom: 38,
            width: 290,
            gap: 10,
          }}
        >
          {features.map((f: string) => (
            <Feature
              key={f}
              text={f}
              accent="#b98521"
              fg="#17120d"
              bg="#fffdf8"
              border="#e5d7bd"
            />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "absolute",
            left: 34,
            bottom: 30,
            minWidth: 330,
            padding: "19px 26px",
            borderRadius: 18,
            backgroundColor: "#17120d",
            color: "#d8b65a",
            border: "1px solid #b98521",
          }}
        >
          <span
            style={{
              display: "flex",
              fontSize: 12,
              letterSpacing: 4,
              color: "#a99b84",
            }}
          >
            PRIX
          </span>
          <span
            style={{
              display: "flex",
              marginTop: 3,
              fontFamily: "Georgia, serif",
              fontSize: 47,
              fontWeight: 700,
            }}
          >
            {price} CHF
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 60px 34px",
          color: "#786b58",
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: 1,
        }}
      >
        <span style={{ display: "flex", color: "#9c721d" }}>
          FASTCASH-GENEVE.CH
        </span>
        <span style={{ display: "flex" }}>
          LUXE · AUTHENTIFIÉ · GENÈVE
        </span>
      </div>
    </div>
  );
}

function WatchesVisual({
  height,
  logo,
  image,
  title,
  subtitle,
  price,
  badge,
  features,
}: any) {
  const story = height > 1500;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#050505",
        color: "#f7f1e4",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: -180,
          top: 300,
          width: 620,
          height: 620,
          borderRadius: 620,
          border: "1px solid #392d14",
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          right: -240,
          bottom: 180,
          width: 700,
          height: 700,
          borderRadius: 700,
          border: "1px solid #2e2513",
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: 8,
          backgroundColor: "#d4af37",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: story ? "64px 58px 18px" : "45px 58px 18px",
          zIndex: 3,
        }}
      >
        <Logo logo={logo} />
        <div
          style={{
            display: "flex",
            padding: "11px 18px",
            borderRadius: 999,
            border: "1px solid #d4af37",
            color: "#d4af37",
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: 2,
          }}
        >
          ◆ {badge}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "15px 58px 0",
          zIndex: 3,
        }}
      >
        <span
          style={{
            display: "flex",
            color: "#d4af37",
            fontSize: 18,
            fontWeight: 900,
            letterSpacing: 5,
            textTransform: "uppercase",
          }}
        >
          {subtitle}
        </span>
        <span
          style={{
            display: "flex",
            maxWidth: 910,
            marginTop: 14,
            fontSize: title.length > 55 ? 45 : title.length > 34 ? 56 : 68,
            lineHeight: 1.02,
            fontWeight: 900,
          }}
        >
          {title}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          position: "relative",
          margin: story ? "32px 58px 22px" : "26px 58px 20px",
          minHeight: 0,
          borderRadius: 34,
          border: "1px solid #3a2f17",
          backgroundColor: "#0b0b0b",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: story ? 115 : 105,
            top: story ? 130 : 90,
            width: story ? 650 : 610,
            height: story ? 650 : 510,
            borderRadius: story ? 650 : 610,
            backgroundColor: "#171207",
            border: "1px solid #3e3014",
          }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: story ? 155 : 145,
            top: story ? 170 : 125,
            width: story ? 570 : 530,
            height: story ? 570 : 440,
            borderRadius: story ? 570 : 530,
            border: "1px solid #d4af37",
          }}
        />

        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 75,
            top: story ? 100 : 70,
            width: story ? 720 : 650,
            height: story ? 830 : 565,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {image ? (
            <img
              src={image}
              alt=""
              width={story ? 720 : 650}
              height={story ? 830 : 565}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          ) : (
            <span style={{ fontSize: 24, color: "#a89e8f" }}>
              Photo indisponible
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "absolute",
            top: 40,
            right: 32,
            width: 275,
            gap: 10,
          }}
        >
          {features.map((f: string) => (
            <Feature
              key={f}
              text={f}
              accent="#d4af37"
              fg="#f7f1e4"
              bg="#101010"
              border="#3a301a"
            />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "absolute",
            left: 34,
            bottom: 30,
            minWidth: 335,
            padding: "20px 26px",
            borderRadius: 18,
            backgroundColor: "#070707",
            color: "#d4af37",
            border: "1px solid #d4af37",
          }}
        >
          <span
            style={{
              display: "flex",
              fontSize: 12,
              letterSpacing: 4,
              color: "#9b8b67",
            }}
          >
            PRIX
          </span>
          <span
            style={{
              display: "flex",
              marginTop: 3,
              fontSize: 48,
              fontWeight: 900,
            }}
          >
            {price} CHF
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          padding: "5px 58px 18px",
        }}
      >
        {["AUTHENTIFIÉ", "GARANTIE 1 AN", "PAIEMENT SÉCURISÉ", "GENÈVE"].map(
          (label) => (
            <div
              key={label}
              style={{
                display: "flex",
                flex: 1,
                minHeight: 52,
                alignItems: "center",
                justifyContent: "center",
                borderTop: "1px solid #3a301a",
                borderBottom: "1px solid #3a301a",
                color: "#b8ad95",
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: 1,
              }}
            >
              <span style={{ display: "flex", color: "#d4af37", marginRight: 8 }}>
                ◇
              </span>
              {label}
            </div>
          )
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "12px 58px 32px",
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: 2,
          color: "#8e846e",
        }}
      >
        <span style={{ display: "flex", color: "#d4af37" }}>
          FASTCASH-GENEVE.CH
        </span>
        <span style={{ display: "flex" }}>MONTRES · BIJOUX · LUXE</span>
      </div>
    </div>
  );
}

export async function GET(request: Request) {
  await requireAdminSession();

  const { searchParams } = new URL(request.url);

  const rawTheme = searchParams.get("theme");
  const theme: Theme =
    rawTheme === "tech" || rawTheme === "luxury" ? rawTheme : "watches";

  const format = searchParams.get("format") === "story" ? "story" : "post";
  const width = 1080;
  const height = format === "story" ? 1920 : 1350;

  const title = clean(searchParams.get("title"), "Produit FAST CASH", 100);
  const subtitle = clean(
    searchParams.get("subtitle"),
    searchParams.get("category") || searchParams.get("brand") || "Sélection FAST CASH",
    55
  );
  const price = clean(searchParams.get("price"), "0.00", 18);
  const badge = clean(searchParams.get("badge"), "NOUVEAUTÉ", 24);

  const features = [
    clean(searchParams.get("feature1"), "Produit contrôlé et vérifié", 48),
    clean(searchParams.get("feature2"), "Garantie FAST CASH", 48),
    clean(searchParams.get("feature3"), "Disponible à Genève", 48),
  ];

  const imageUrl = searchParams.get("image") || null;

  const [productImage, logoLight, logoDark] = await Promise.all([
    imageToDataUri(imageUrl),
    imageToDataUri(new URL("/images/logo-fastcash-white.png", request.url).toString()),
    imageToDataUri(new URL("/images/logo-fastcash.jpg", request.url).toString()),
  ]);

  const props = {
    width,
    height,
    logo: theme === "watches" ? logoLight : logoDark,
    image: productImage,
    title,
    subtitle,
    price,
    badge,
    features,
  };

  const element =
    theme === "tech" ? (
      <TechVisual {...props} />
    ) : theme === "luxury" ? (
      <LuxuryVisual {...props} />
    ) : (
      <WatchesVisual {...props} />
    );

  try {
    return new ImageResponse(element, { width, height });
  } catch (error) {
    console.error("FAST CASH visual generation error:", error);
    return new Response("Impossible de générer le visuel.", { status: 500 });
  }
}
