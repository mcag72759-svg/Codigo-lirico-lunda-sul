import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Código Lírico — Cultura independente angolana",
  description: "Uma plataforma para aproximar artistas, ideias e oportunidades. Da Lunda Sul para Angola e para o mundo.",
  applicationName: "Código Lírico",
  openGraph: {
    title: "Código Lírico — Cultura independente angolana",
    description: "A cultura tem voz. A nossa também.",
    type: "website",
    locale: "pt_AO",
  },
  twitter: {
    card: "summary_large_image",
    title: "Código Lírico — Cultura independente angolana",
    description: "Um espaço para artistas, ideias e oportunidades.",
  },
};

export const viewport: Viewport = {
  themeColor: "#111214",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-AO">
      <body>{children}</body>
    </html>
  );
}
