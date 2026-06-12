import { ImageResponse } from "next/og"

export const runtime = "edge"
export const size = { width: 192, height: 192 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 30% 30%, rgba(34,197,94,0.35), transparent 45%), linear-gradient(180deg, #0a1118, #05070a)",
          color: "#e5f7ec",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 24,
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: 2,
        }}
      >
        MO
      </div>
    ),
    size,
  )
}
