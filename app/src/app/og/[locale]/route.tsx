import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { dictionaries } from "@/i18n/dictionaries";
import { LOCALES, toLocale } from "@/i18n/locale";

const size = { width: 1200, height: 630 };

const color = {
  bg: "#0b0b0e",
  card: "#161619",
  border: "#27272c",
  fg: "#fafafa",
  muted: "#a1a1aa",
  faint: "#71717a",
  primary: "#34d399",
};

const buckets = [
  { key: "cash", value: "S/ 520.00", pct: "50.5%", swatch: color.primary },
  { key: "lent", value: "S/ 300.00", pct: "29.1%", swatch: "#38bdf8" },
  { key: "inventory", value: "S/ 130.00", pct: "12.6%", swatch: "#fbbf24" },
  { key: "receivable", value: "S/ 80.00", pct: "7.8%", swatch: "#a78bfa" },
] as const;

const font = (file: string) =>
  readFile(join(process.cwd(), "assets/fonts", file));

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

/**
 * Link preview card shown when CoCapital is shared, in the visitor's language:
 * the pitch on the left, the capital panel on the right.
 * @returns the 1200×630 PNG card
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const locale = toLocale((await params).locale);

  if (!locale) {
    return new Response(null, { status: 404 });
  }

  const t = dictionaries[locale].og;

  const [regular, medium, semibold, mono] = await Promise.all([
    font("Geist-Regular.ttf"),
    font("Geist-Medium.ttf"),
    font("Geist-SemiBold.ttf"),
    font("GeistMono-Medium.ttf"),
  ]);

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: color.bg,
        backgroundImage:
          "radial-gradient(circle at 88% 18%, rgba(52,211,153,0.22), rgba(11,11,14,0) 46%)",
        fontFamily: "Geist",
        color: color.fg,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: 600,
          padding: "72px 0 64px 80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 52,
              height: 52,
              borderRadius: 14,
              background: color.primary,
              boxShadow: "0 10px 30px rgba(52,211,153,0.25)",
              color: "#04170e",
              fontFamily: "Geist Mono",
              fontSize: 20,
            }}
          >
            S/
          </div>
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>
            CoCapital
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 600,
              lineHeight: 1.04,
              letterSpacing: -2.6,
            }}
          >
            {t.headline}
          </div>
          <div
            style={{
              marginTop: 24,
              fontSize: 27,
              lineHeight: 1.4,
              color: color.muted,
            }}
          >
            {t.subline}
          </div>
        </div>

        <div
          style={{
            fontFamily: "Geist Mono",
            fontSize: 20,
            color: color.faint,
          }}
        >
          cocapital-five.vercel.app
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          position: "absolute",
          left: 704,
          top: 92,
          width: 460,
          padding: 36,
          borderRadius: 26,
          border: `1px solid ${color.border}`,
          backgroundImage: `linear-gradient(145deg, ${color.card}, #111114)`,
          boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: 2.4,
            color: color.muted,
          }}
        >
          {t.totalCapital}
        </div>
        <div
          style={{
            marginTop: 10,
            fontFamily: "Geist Mono",
            fontSize: 54,
            letterSpacing: -2,
          }}
        >
          S/ 1,030.00
        </div>

        <div
          style={{
            display: "flex",
            gap: 4,
            height: 14,
            marginTop: 22,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {buckets.map((bucket) => (
            <div
              key={bucket.key}
              style={{ width: bucket.pct, background: bucket.swatch }}
            />
          ))}
        </div>

        <div
          style={{ display: "flex", flexDirection: "column", marginTop: 22 }}
        >
          {buckets.map((bucket) => (
            <div
              key={bucket.key}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "11px 0",
                borderTop: `1px solid ${color.border}`,
                fontSize: 21,
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 4,
                  marginRight: 14,
                  background: bucket.swatch,
                }}
              />
              <div style={{ flexGrow: 1, fontWeight: 500 }}>
                {t[bucket.key]}
              </div>
              <div style={{ fontFamily: "Geist Mono" }}>{bucket.value}</div>
              <div
                style={{
                  width: 76,
                  textAlign: "right",
                  justifyContent: "flex-end",
                  fontFamily: "Geist Mono",
                  fontSize: 17,
                  color: color.faint,
                }}
              >
                {bucket.pct}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            alignSelf: "flex-start",
            marginTop: 18,
            padding: "8px 14px",
            borderRadius: 999,
            background: "rgba(52,211,153,0.12)",
            color: color.primary,
            fontSize: 17,
            fontWeight: 500,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              marginRight: 10,
              background: color.primary,
            }}
          />
          {t.badge}
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist", data: medium, weight: 500, style: "normal" },
        { name: "Geist", data: semibold, weight: 600, style: "normal" },
        { name: "Geist Mono", data: mono, weight: 500, style: "normal" },
      ],
    },
  );
}
