import { useColorScheme } from "react-native";

// Brand: rose (primary) with a gold "crown" accent. Text colors meet WCAG AA on their backgrounds.
const palette = {
  rose: "#D81B60",
  roseDark: "#AD1457",
  gold: "#F5B82E",
  like: "#16A34A",
  pass: "#DC2626",
  superlike: "#2563EB",
  online: "#22C55E",
};

export const lightColors = {
  ...palette,
  primary: palette.rose,
  onPrimary: "#FFFFFF",
  background: "#FFFFFF",
  surface: "#F5F5F7",
  surfaceRaised: "#FFFFFF",
  border: "#E4E4E7",
  text: "#111114",
  textMuted: "#5F5F6B",
  danger: "#B91C1C",
  warningBg: "#FEF3C7",
  warningText: "#78350F",
  overlay: "rgba(0,0,0,0.55)",
  skeleton: "#E9E9EE",
  chipSelected: "#FCE4EC",
};

export type Colors = typeof lightColors;

export const darkColors: Colors = {
  ...palette,
  primary: "#EC407A",
  onPrimary: "#FFFFFF",
  background: "#0E0E12",
  surface: "#1A1A21",
  surfaceRaised: "#23232C",
  border: "#2E2E38",
  text: "#F4F4F6",
  textMuted: "#A6A6B2",
  danger: "#F87171",
  warningBg: "#422006",
  warningText: "#FDE68A",
  overlay: "rgba(0,0,0,0.7)",
  skeleton: "#26262F",
  chipSelected: "#4A1030",
  like: "#22C55E",
  pass: "#EF4444",
  superlike: "#3B82F6",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radii = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;
export const type = {
  display: { fontSize: 32, fontWeight: "800" as const, letterSpacing: -0.5 },
  title: { fontSize: 24, fontWeight: "700" as const },
  heading: { fontSize: 18, fontWeight: "700" as const },
  body: { fontSize: 16, fontWeight: "400" as const },
  bodyBold: { fontSize: 16, fontWeight: "600" as const },
  small: { fontSize: 14, fontWeight: "400" as const },
  caption: { fontSize: 12, fontWeight: "500" as const },
};
/** Minimum touch target (WCAG / platform guidelines). */
export const TOUCH = 44;
export const MAX_CONTENT_WIDTH = 520;
export const WIDE_BREAKPOINT = 1024;

export function useTheme() {
  const scheme = useColorScheme();
  const dark = scheme === "dark";
  return { colors: dark ? darkColors : lightColors, dark, spacing, radii, type };
}
