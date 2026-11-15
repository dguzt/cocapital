import { ImageResponse } from "next/og";

export const alt = "CoCapital: shared capital for small partnerships";

export const size = { width: 1200, height: 630 };

export const contentType = "image/png";

/**
 * Link preview card shown when CoCapital is shared.
 * @returns the 1200×630 PNG card
 */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        padding: 96,
        background: "#0b0b0e",
        color: "#fafafa",
      }}
    >
      <div style={{ fontSize: 112 }}>💰</div>
      <div style={{ fontSize: 96, fontWeight: 700 }}>CoCapital</div>
      <div style={{ fontSize: 40, color: "#a1a1aa" }}>
        Shared capital for small partnerships
      </div>
      <div style={{ fontSize: 30, color: "#34d399", marginTop: 32 }}>
        Sales · Loans · Installments · Receivables
      </div>
    </div>,
    size,
  );
}
