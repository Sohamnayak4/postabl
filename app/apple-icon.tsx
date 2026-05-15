// iOS home-screen icon and macOS / Safari pinned tab fallback.
// Next 15 emits this as apple-icon.png at the documented 180x180 size.
//
// Same composition as the favicon, scaled up so the wordmark and the
// accent dot both have presence on the home screen.

import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          // iOS auto-masks corners but we round anyway for the macOS
          // pinned-tab case, where the icon shows as-is.
          borderRadius: 36,
        }}
      >
        <span
          style={{
            color: "#f7f5f0",
            fontSize: 128,
            fontWeight: 600,
            letterSpacing: -6,
            lineHeight: 1,
            marginTop: -10,
          }}
        >
          p
        </span>
        <span
          style={{
            position: "absolute",
            top: 36,
            right: 36,
            width: 28,
            height: 28,
            background: "#d94f2e",
            borderRadius: 999,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
