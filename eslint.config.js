// Not `@ts-check`ed: eslint-plugin-jsx-a11y ships no type declarations.
// Running `pnpm lint` is the real check on this file.

import js from "@eslint/js"
import eslintPluginQuery from "@tanstack/eslint-plugin-query"
import eslintPluginRouter from "@tanstack/eslint-plugin-router"
import eslintPluginStart from "@tanstack/eslint-plugin-start"
import eslintConfigPrettier from "eslint-config-prettier"
import eslintPluginBetterTailwind from "eslint-plugin-better-tailwindcss"
import eslintPluginImport from "eslint-plugin-import"
import eslintPluginJsxA11y from "eslint-plugin-jsx-a11y"
import eslintPluginReact from "eslint-plugin-react"
import eslintPluginReactHooks from "eslint-plugin-react-hooks"
import globals from "globals"
import tseslint from "typescript-eslint"

const GLOBAL_CSS = "src/styles.css"

export default tseslint.config(
  {
    ignores: [
      "dist",
      "node_modules",
      ".output",
      ".nitro",
      ".tanstack",
      ".claude",
      "src/routeTree.gen.ts",
      "src/paraglide",
    ],
  },

  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      eslintPluginQuery.configs["flat/recommended"],
      eslintPluginRouter.configs["flat/recommended"],
      eslintPluginStart.configs["flat/recommended"],
    ],
    plugins: {
      import: eslintPluginImport,
      react: eslintPluginReact,
      "jsx-a11y": eslintPluginJsxA11y,
      "react-hooks": eslintPluginReactHooks,
      "better-tailwindcss": eslintPluginBetterTailwind,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: "detect" },
      "import/resolver": {
        typescript: { alwaysTryTypes: true, project: "./tsconfig.json" },
      },
      "better-tailwindcss": {
        entryPoint: GLOBAL_CSS,
        attributes: ["class", "className"],
        callees: ["cn", "clsx", "cva", "tw", "twMerge"],
      },
    },
    rules: {
      ...eslintPluginReactHooks.configs.recommended.rules,
      ...eslintPluginJsxA11y.flatConfigs.recommended.rules,

      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-alert": "error",
      "no-var": "error",
      "prefer-const": "error",
      "no-param-reassign": "error",
      "no-shadow": "off",
      "@typescript-eslint/no-shadow": "error",
      "no-multi-spaces": "error",
      "no-loop-func": "error",
      "no-tabs": "error",
      "prefer-arrow-callback": "error",

      "react/jsx-filename-extension": ["error", { extensions: [".tsx"] }],
      "react/react-in-jsx-scope": "off",
      "react/jsx-props-no-spreading": "error",
      "react/function-component-definition": [
        "error",
        { namedComponents: "arrow-function", unnamedComponents: "arrow-function" },
      ],
      "react/require-default-props": "off",
      "react/button-has-type": "error",

      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/ban-ts-comment": "error",
      "@typescript-eslint/naming-convention": [
        "error",
        { selector: "interface", format: ["PascalCase"], prefix: ["I"] },
        { selector: "typeAlias", format: ["PascalCase"], prefix: ["T"] },
      ],

      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/components/ui",
              message:
                "Import directly from the component file. Example: import { Card } from '@/components/ui/card'",
            },
            {
              name: "@/components/ui/index",
              message:
                "Import directly from the component file. Example: import { Card } from '@/components/ui/card'",
            },
            {
              name: "cn",
              message:
                "`cn` comes from '@/lib/utils'. The shadcn registry ships `from \"cn\"` — normalize the import after every `shadcn add`.",
            },
          ],
        },
      ],

      "no-restricted-syntax": [
        "error",
        {
          selector: "TSEnumDeclaration",
          message:
            "No enum. Use an `as const` object plus a derived union type instead — it survives `verbatimModuleSyntax` and erases at build time.",
        },
        {
          selector: "JSXAttribute[name.name='className'] Literal[value=/(^|\\s)space-[xy]-/]",
          message: "Use `gap-*` on the flex/grid container instead of `space-x/y-*`.",
        },
        {
          selector:
            "CallExpression[callee.name=/^(cn|cva|clsx|twMerge)$/] Literal[value=/(^|\\s)space-[xy]-/]",
          message: "Use `gap-*` on the flex/grid container instead of `space-x/y-*`.",
        },
      ],

      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index", "type"],
          pathGroups: [{ pattern: "@/**", group: "internal", position: "before" }],
          pathGroupsExcludedImportTypes: ["builtin"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import/prefer-default-export": "off",
      "import/no-default-export": "off",
      "import/no-duplicates": "error",
      "import/no-cycle": "error",

      ...eslintPluginBetterTailwind.configs.recommended.rules,
      // Prettier owns Tailwind class order and wrapping — a second autofixer
      // would fight it on every save.
      "better-tailwindcss/enforce-consistent-class-order": "off",
      "better-tailwindcss/enforce-consistent-line-wrapping": "off",
      "better-tailwindcss/no-unknown-classes": [
        "error",
        { ignore: ["dark", "group", "peer", "container/.*"] },
      ],
    },
  },

  {
    files: ["src/components/**/*.{ts,tsx}", "src/features/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ["src/routes/**/*.{ts,tsx}", "src/router.tsx", "src/lib/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ["src/routes/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/only-throw-error": "off",
    },
  },
  {
    files: ["src/server.ts", "src/server/**/*.ts", "src/lambda/**/*.ts", "**/*.server.{ts,tsx}"],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      "no-console": "off",
      "better-tailwindcss/no-unknown-classes": "off",
    },
  },
  {
    files: ["src/components/ui/**/*.tsx"],
    rules: {
      "react/function-component-definition": "off",
      "react/jsx-props-no-spreading": "off",
      "@typescript-eslint/naming-convention": "off",
      "no-restricted-syntax": "off",
    },
  },

  {
    files: ["src/router.tsx"],
    rules: {
      "@typescript-eslint/naming-convention": "off",
    },
  },
  {
    files: ["eval/**/*.ts", "scripts/**/*.ts"],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      "no-console": "off",
      "better-tailwindcss/no-unknown-classes": "off",
    },
  },
  {
    files: ["**/*.test.{ts,tsx}"],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      "no-console": "off",
      "react/jsx-props-no-spreading": "off",
      "@tanstack/query/exhaustive-deps": "off",
    },
  },
  {
    files: ["*.config.{js,ts}", "eslint.config.js", "prettier.config.js", "commitlint.config.js"],
    extends: [js.configs.recommended],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      "import/no-default-export": "off",
      "no-console": "off",
    },
  },

  // Must stay last: turns off every rule Prettier already decides.
  eslintConfigPrettier,
)
