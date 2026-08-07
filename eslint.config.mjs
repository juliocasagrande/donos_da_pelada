import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: directory });

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "public/sw.js",
      "public/workbox-*.js",
      "public/worker-*.js"
    ]
  },
  ...compat.extends("next/core-web-vitals", "next/typescript")
];

export default config;
