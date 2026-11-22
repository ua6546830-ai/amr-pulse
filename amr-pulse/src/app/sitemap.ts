import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

const PATHS = [
  "",
  "/dashboard",
  "/datasets",
  "/import",
  "/quality",
  "/analysis",
  "/isolates",
  "/investigations",
  "/ai-workspace",
  "/reports",
  "/methods",
  "/settings",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();
  return PATHS.map((path) => ({
    url: new URL(path, base).toString(),
    lastModified: now,
    changeFrequency: path === "" ? "monthly" : "weekly",
    priority: path === "" ? 1 : path === "/dashboard" ? 0.9 : 0.6,
  }));
}
