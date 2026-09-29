// Root ESLint config for the API and shared packages.
// The Expo app is linted separately with `npx expo lint` (apps/app).
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/node_modules/**", "**/dist/**", "apps/app/**", "apps/api/drizzle/**", "**/.expo/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,ts}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node, ...globals.es2024 },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  // Playwright passes some callbacks into the page, so browser globals are valid there.
  { files: ["e2e/**"], languageOptions: { globals: { ...globals.browser } } },
);
