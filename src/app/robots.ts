import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: ["/", "/artista/cadastro", "/comunidade", "/downloads", "/privacidade", "/termos"],
      disallow: ["/admin", "/api", "/artista"],
    }],
    sitemap: "https://codigo-lirico-lunda-sul.vercel.app/sitemap.xml",
    host: "https://codigo-lirico-lunda-sul.vercel.app",
  };
}
