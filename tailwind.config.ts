import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        flip: {
          to: {
            transform: "rotate(360deg)",
          },
        },
        rotate: {
          to: {
            transform: "rotate(90deg)",
          },
        },
        spinner: {
          "0%": {
            opacity: "1",
          },
          "100%": {
            opacity: "0.15",
          },
        },
        glitch: {
          "0%, 100%": { transform: "translate(0, 0)", filter: "hue-rotate(0deg)" },
          "10%": { transform: "translate(-6px, 3px)", filter: "hue-rotate(90deg)" },
          "20%": { transform: "translate(6px, -3px)", filter: "hue-rotate(180deg)" },
          "30%": { transform: "translate(-4px, 4px) skewX(3deg)", filter: "hue-rotate(270deg)" },
          "40%": { transform: "translate(4px, -4px) skewX(-3deg)", filter: "hue-rotate(0deg)" },
          "50%": { transform: "translate(-8px, 0)", filter: "hue-rotate(90deg)" },
          "60%": { transform: "translate(8px, 2px)", filter: "hue-rotate(180deg)" },
          "70%": { transform: "translate(-3px, -3px) skewX(2deg)", filter: "hue-rotate(270deg)" },
          "80%": { transform: "translate(3px, 3px)", filter: "hue-rotate(0deg)" },
          "90%": { transform: "translate(-5px, -2px)", filter: "hue-rotate(90deg)" },
        },
        flicker: {
          "0%, 19%, 21%, 23%, 25%, 54%, 56%, 100%": { opacity: "1" },
          "20%, 22%, 24%, 55%": { opacity: "0.35" },
        },
        "led-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.25" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        flip: "flip 6s infinite steps(2, end)",
        rotate: "rotate 3s linear infinite both",
        spinner: "spinner 1.2s linear infinite",
        glitch: "glitch 0.6s steps(2, end) infinite",
        flicker: "flicker 3s linear infinite",
        "led-blink": "led-blink 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
