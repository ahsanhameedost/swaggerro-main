import { heroui } from "@heroui/react";

// Align HeroUI's theme (used across the /dashboard admin) with the brand palette:
// Primary Blue #2196FF, Deep Navy #0D1B3D, Accent Yellow #FFC428.
const brandPrimary = {
  50: "#e8f2ff",
  100: "#c7e0ff",
  200: "#a3ccff",
  300: "#7eb8ff",
  400: "#54a4ff",
  500: "#2196ff",
  600: "#1782ed",
  700: "#0f6bc9",
  800: "#0a55a5",
  900: "#0d3b7a",
  DEFAULT: "#2196ff",
  foreground: "#ffffff",
};

const brandWarning = {
  50: "#fff8e6",
  100: "#ffefc2",
  200: "#ffe294",
  300: "#ffd45c",
  400: "#ffca42",
  500: "#ffc428",
  600: "#e0a911",
  700: "#b3850b",
  800: "#866008",
  900: "#0d1b3d",
  DEFAULT: "#ffc428",
  foreground: "#0d1b3d",
};

export default heroui({
  themes: {
    light: {
      colors: {
        primary: brandPrimary,
        warning: brandWarning,
        focus: "#2196ff",
      },
    },
  },
});
