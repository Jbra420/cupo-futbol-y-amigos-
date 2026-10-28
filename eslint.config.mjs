import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "node:url";

const compat = new FlatCompat({
  baseDirectory: fileURLToPath(new URL(".", import.meta.url)),
});

const config = [
  {
    ignores: [
      ".next/**",
      ".next-qa/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "artifacts/**",
      "playwright-report/**",
      "test-results/**",
      "supabase/.temp/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];
export default config;
