const { designTokens, semanticColors, animationTokens } = require('./lib/design-system/tokens.ts');

/**
 * Helper to map semantic color names to their CSS variables.
 * @param {Record<string, string>} colors - An object where keys are semantic names and values are CSS variable names.
 * @returns {Record<string, string>} A Tailwind-compatible color palette.
 */
const createColorPalette = (colors) => {
  const palette = {};
  for (const name of Object.keys(colors)) {
    palette[name] = `var(--${name})`;
  }
  return palette;
};

/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: ["class", "[data-theme='dark']"],
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    screens: designTokens.breakpoints,
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
        xl: '5rem',
        '2xl': '6rem',
      },
    },
    extend: {
      colors: {
        ...designTokens.colors,
        ...createColorPalette(semanticColors.background),
        ...createColorPalette(semanticColors.text),
        ...createColorPalette(semanticColors.border),
        ...createColorPalette(semanticColors.status),
        // Template color system
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
      },
      spacing: designTokens.spacing,
      borderRadius: {
        ...designTokens.borderRadius,
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: designTokens.typography.fontFamilies,
      fontSize: designTokens.typography.fontSizes,
      fontWeight: designTokens.typography.fontWeights,
      lineHeight: designTokens.typography.lineHeights,
      letterSpacing: designTokens.typography.letterSpacing,
      boxShadow: designTokens.shadows,
      zIndex: designTokens.zIndex,
      transitionDuration: designTokens.transitions.duration,
      transitionTimingFunction: designTokens.transitions.timing,
      keyframes: {
        ...Object.entries(animationTokens).reduce((acc, [name, anim]) => {
          acc[name] = anim.keyframes;
          return acc;
        }, {}),
        // Accordion keyframes from original config
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        ...Object.entries(animationTokens).reduce((acc, [name, anim]) => {
          acc[name] = `${name} ${anim.duration} ${anim.timing} ${anim.iterationCount || ''}`;
          return acc;
        }, {}),
        // Accordion animation from original config
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

module.exports = config;
