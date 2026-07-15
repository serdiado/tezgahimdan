import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma tarafindan uretilen kod - elle yazilmadi, lint kurallarina tabi degil.
    "src/generated/**",
    // Standalone CommonJS seed script (node ile calisir, Next.js ESM derlemesinin disinda).
    "prisma/seed.js",
    // Ayni gerekce: demo verisi script'leri de node ile elle calistirilan
    // standalone CommonJS - uygulama paketine hic girmez.
    "scripts/demo-veri/**",
  ]),
]);

export default eslintConfig;
