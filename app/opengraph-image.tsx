// Open Graph card for Slack / LinkedIn / Discord / generic-unfurler
// previews. Next 15 emits this at the conventional 1200x630 size.
//
// Composition: cream backdrop matching the app, the postabl wordmark
// + accent dot top-left, the tagline below, and a small "postabl.xyz"
// stamp bottom-right so the share preview reads as a real product, not
// a screenshot of a screenshot.

import { ImageResponse } from "next/og";

export const alt = "Postabl — Make your screenshots postabl";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#f7f5f0",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 96,
          position: "relative",
        }}
      >
        {/* Decorative grid corner — subtle nod to the editor canvas. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 520,
            height: 520,
            backgroundImage:
              "linear-gradient(#efece5 1px, transparent 1px), linear-gradient(90deg, #efece5 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            opacity: 0.75,
            display: "flex",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span
              style={{
                fontSize: 168,
                fontWeight: 500,
                color: "#1a1a1a",
                lineHeight: 1,
                letterSpacing: -6,
              }}
            >
              postabl
            </span>
            <span
              style={{
                width: 20,
                height: 20,
                background: "#d94f2e",
                borderRadius: 999,
                marginBottom: 22,
                display: "flex",
              }}
            />
          </div>

          <div
            style={{
              fontSize: 40,
              color: "#555",
              maxWidth: 880,
              lineHeight: 1.35,
              display: "flex",
            }}
          >
            Turn raw screenshots into scroll-stopping images for X, LinkedIn, and the rest of the internet.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 24,
            color: "#8a8680",
            letterSpacing: 0.5,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 10,
                height: 10,
                background: "#d94f2e",
                borderRadius: 999,
                display: "flex",
              }}
            />
            free to start
          </span>
          <span>postabl.xyz</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
