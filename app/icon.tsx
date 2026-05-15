// Browser tab favicon, generated at build time via ImageResponse.
// Next 15 picks this file up automatically and emits a 32x32 PNG.
//
// Design: ink (#1a1a1a) rounded square with a cream lowercase "p" and
// the brand's accent dot in the top-right corner. Small enough that the
// dot reads as a distinguishing mark in browser tabs and tab bars.

import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#1a1a1a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          borderRadius: 6,
        }}
      >
        <span
          style={{
            color: "#f7f5f0",
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: -1,
            lineHeight: 1,
            // Nudge optical centering — descender of "p" pulls it down.
            marginTop: -2,
          }}
        >
          p
        </span>
        <span
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 6,
            height: 6,
            background: "#d94f2e",
            borderRadius: 999,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
