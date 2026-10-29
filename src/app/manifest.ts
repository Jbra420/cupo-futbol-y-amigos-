import type { MetadataRoute } from "next";
import { APP_NAME } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: "Organiza el fútbol con tu gente.",
    start_url: "/",
    display: "standalone",
    background_color: "#111d17",
    theme_color: "#14291d",
    icons: [
      { src: "/brand/cupo-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/cupo-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
