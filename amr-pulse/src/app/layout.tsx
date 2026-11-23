import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

const title = "AMR PULSE — Genotype–phenotype discordance research workspace";
const description =
  "A reproducibility-first workspace for bacterial AMR genotype–phenotype concordance: five-class comparison, Wilson 95% intervals, data-quality audit, read-only AI assistant, and a synthetic 220-isolate demo. Research use only.";

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: title,
    template: "%s · AMR PULSE",
  },
  description,
  applicationName: "AMR PULSE",
  keywords: [
    "antimicrobial resistance",
    "AMR",
    "genotype phenotype discordance",
    "AST",
    "AMR surveillance",
    "Escherichia coli",
    "ceftriaxone",
    "bioinformatics",
    "research software",
    "reproducibility",
  ],
  authors: [{ name: "AMR PULSE contributors" }],
  category: "science",
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "AMR PULSE",
    title,
    description,
    url: "/",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "AMR PULSE — genotype–phenotype discordance, investigated properly",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#F4F6FB",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  );
}
