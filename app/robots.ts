import type { MetadataRoute } from "next"
import { APP_URL } from "@/lib/app-url"

const BASE = APP_URL

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/admin/", "/api/"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  }
}
