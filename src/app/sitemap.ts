import type { MetadataRoute } from "next";

const base = "https://codigo-lirico-lunda-sul.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: base + "/artista/cadastro", changeFrequency: "monthly", priority: 0.8 },
    { url: base + "/comunidade", changeFrequency: "daily", priority: 0.8 },
    { url: base + "/downloads", changeFrequency: "daily", priority: 0.8 },
    { url: base + "/privacidade", changeFrequency: "yearly", priority: 0.3 },
    { url: base + "/termos", changeFrequency: "yearly", priority: 0.3 },
  ];
}
