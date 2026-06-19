import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import sonarjs from "eslint-plugin-sonarjs";
import reactPerf from "eslint-plugin-react-perf";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  sonarjs.configs.recommended,
  {
    plugins: { "react-perf": reactPerf },
    rules: {
      ...reactPerf.configs.recommended.rules,
      // Per-item map-callback handlers are legitimate — row memoization is a separate concern
      "react-perf/jsx-no-new-function-as-prop": "warn",
      "react-perf/jsx-no-new-object-as-prop": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "sonarjs/no-nested-conditional": "warn",
      "sonarjs/no-nested-functions": "warn",
    },
  },
  {
    // Downgrade unused eslint-disable directives to warnings (not errors)
    linterOptions: { reportUnusedDisableDirectives: "warn" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
  ]),
]);

export default eslintConfig;
