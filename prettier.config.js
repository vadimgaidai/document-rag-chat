//  @ts-check

/** @type {import('prettier').Config} */
const config = {
  semi: false,
  singleQuote: false,
  trailingComma: "all",
  bracketSpacing: true,
  bracketSameLine: false,
  printWidth: 100,
  tabWidth: 2,
  proseWrap: "never",
  endOfLine: "lf",
  plugins: ["prettier-plugin-tailwindcss"],
  tailwindStylesheet: "./src/styles.css",
  tailwindFunctions: ["cn", "clsx", "cva", "twMerge"],
}

export default config
