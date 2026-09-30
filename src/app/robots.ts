import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/signup", "/privacy", "/terms", "/refund-policy", "/risk-disclosure"],
        disallow: ["/app/", "/api/"],
      },
    ],
    sitemap: "https://journal-digital-trader.vercel.app/sitemap.xml",
  };
}
