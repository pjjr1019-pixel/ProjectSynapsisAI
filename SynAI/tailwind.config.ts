import type { Config } from "tailwindcss";

export default {
  content: ["./apps/desktop/index.html", "./apps/desktop/src/**/*.{ts,tsx}"],
  theme: {
    extend: {}
  },
  plugins: []
} satisfies Config;
