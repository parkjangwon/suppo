import type { Config } from "tailwindcss";
import { uiTailwindConfig } from "@suppo/ui/tailwind.config.base";

const config: Config = {
  ...uiTailwindConfig,
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
    "../../packages/shared/src/**/*.{ts,tsx}"
  ]
} as Config;

export default config;
