import { paraglideVitePlugin } from "@inlang/paraglide-js"
import babel from "@rolldown/plugin-babel"
import tailwindcss from "@tailwindcss/vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react"
import { nitro } from "nitro/vite"
import { defineConfig } from "vite"

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // Builds the server into `.output/server` as a Lambda handler with response
  // streaming on — the zip that `.planning/aws/SETUP.md` uploads to the site function,
  // whose Function URL runs in RESPONSE_STREAM mode to match.
  //
  // A Lambda bundle cannot run outside Lambda: its entry is wrapped in
  // `awslambda.streamifyResponse`, a global only the Lambda runtime provides.
  // `pnpm preview` therefore rebuilds with `NITRO_PRESET=node-server`. Nitro
  // does not honour that variable on its own — the config value wins — so it is
  // read here.
  nitro: {
    preset: process.env.NITRO_PRESET ?? "aws-lambda",
    awsLambda: { streaming: true },
  },
  plugins: [
    nitro(),
    devtools(),
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/paraglide",
      strategy: ["url", "baseLocale"],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
})

export default config
