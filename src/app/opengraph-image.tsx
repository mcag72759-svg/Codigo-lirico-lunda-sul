import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Código Lírico — Cultura independente angolana";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          color: "#f1f0eb",
          background:
            "radial-gradient(circle at 82% 32%, rgba(184,139,105,.28), transparent 30%), radial-gradient(circle at 15% 95%, rgba(201,206,209,.12), transparent 34%), linear-gradient(135deg,#0d0f11 0%,#1c2023 58%,#101214 100%)",
          fontFamily: "Arial, Helvetica, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 60, height: 60, border: "1px solid #c9ced1", borderRadius: 30, display: "flex", alignItems: "center", justifyContent: "center", color: "#d6dadd", fontSize: 20, fontWeight: 700 }}>CL</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 18, letterSpacing: 5, fontWeight: 700 }}>CÓDIGO LÍRICO</span>
            <span style={{ color: "#b88b69", fontSize: 13, letterSpacing: 4 }}>CULTURA INDEPENDENTE · ANGOLA</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 850, gap: 20 }}>
          <div style={{ color: "#c69a79", fontSize: 16, letterSpacing: 5 }}>LUNDA SUL · ANGOLA</div>
          <div style={{ fontSize: 76, lineHeight: 1.02, letterSpacing: -4, fontWeight: 700 }}>A cultura tem voz.</div>
          <div style={{ fontSize: 76, lineHeight: 1.02, letterSpacing: -4, color: "#c9ced1" }}>A nossa também.</div>
          <div style={{ width: 130, height: 3, background: "#b88b69", marginTop: 10 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,.18)", paddingTop: 22, color: "#b5b9bb", fontSize: 15, letterSpacing: 3 }}>
          <span>MÚSICA · ARTE · COMUNIDADE · OPORTUNIDADES</span>
          <span>CODIGOLIRICO</span>
        </div>
        <div style={{ position: "absolute", right: -100, top: 125, width: 430, height: 430, border: "1px solid rgba(201,206,209,.18)", borderRadius: 215 }} />
        <div style={{ position: "absolute", right: -35, top: 190, width: 300, height: 300, border: "1px solid rgba(184,139,105,.2)", borderRadius: 150 }} />
      </div>
    ),
    { ...size },
  );
}
