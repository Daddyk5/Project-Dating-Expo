import { useColorScheme } from "react-native";
import { useSettings } from "@/lib/settings";

// Brand: royal rose (primary) fading into plum, with a gold "crown" accent.
// Text colors meet WCAG AA on their backgrounds.
const palette = {
  rose: "#D81B60",
  roseDark: "#AD1457",
  plum: "#7B1FA2",
  gold: "#F5B82E",
  goldDeep: "#B7791F",
  like: "#16A34A",
  pass: "#DC2626",
  superlike: "#2563EB",
  online: "#22C55E",
  verified: "#3B82F6",
};

export const lightColors = {
  ...palette,
  primary: palette.rose,
  /** Filled surfaces that carry white text (bubbles, badges, filled buttons). ≥ 4.5:1 with onPrimary. */
  primaryFill: palette.rose,
  onPrimary: "#FFFFFF",
  /** Primary CTA gradient (white text passes AA across the whole ramp). */
  gradient: ["#D81B60", "#8E1A7E"] as [string, string],
  /** Premium / Royal gradient. */
  royal: ["#1F1330", "#4A1942"] as [string, string],
  background: "#FAFAFC",
  surface: "#F1F1F5",
  surfaceRaised: "#FFFFFF",
  border: "#E6E6EC",
  text: "#101018",
  textMuted: "#5E5E6E",
  danger: "#B91C1C",
  dangerFill: "#B91C1C",
  success: "#15803D",
  warningBg: "#FEF3C7",
  warningText: "#78350F",
  overlay: "rgba(10,8,16,0.55)",
  skeleton: "#E9E9EF",
  chipSelected: "#FCE4EC",
  primarySoft: "#FCE4EC",
  goldSoft: "#FDF3DC",
  shadow: "0px 8px 24px rgba(16, 16, 24, 0.08)",
  shadowStrong: "0px 16px 40px rgba(16, 16, 24, 0.16)",
};

export type Colors = typeof lightColors;

export const darkColors: Colors = {
  ...palette,
  // #EC407A is for icons, text and outlines on dark surfaces; white text on it is only 3.8:1.
  primary: "#EC407A",
  primaryFill: "#C2185B",
  onPrimary: "#FFFFFF",
  gradient: ["#D81B60", "#7B1FA2"],
  royal: ["#1A1024", "#3D1438"],
  background: "#0B0B10",
  surface: "#17171F",
  surfaceRaised: "#1E1E28",
  border: "#2A2A36",
  text: "#F4F4F7",
  textMuted: "#A6A6B4",
  danger: "#F87171",
  dangerFill: "#B91C1C",
  success: "#4ADE80",
  warningBg: "#422006",
  warningText: "#FDE68A",
  overlay: "rgba(0,0,0,0.7)",
  skeleton: "#24242E",
  chipSelected: "#4A1030",
  primarySoft: "#3A0F27",
  goldSoft: "#3A2A0A",
  shadow: "0px 8px 24px rgba(0, 0, 0, 0.4)",
  shadowStrong: "0px 16px 40px rgba(0, 0, 0, 0.55)",
  like: "#22C55E",
  pass: "#EF4444",
  superlike: "#3B82F6",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radii = { sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, pill: 999 } as const;
export const type = {
  hero: { fontSize: 40, fontWeight: "800" as const, letterSpacing: -1, lineHeight: 46 },
  display: { fontSize: 32, fontWeight: "800" as const, letterSpacing: -0.6 },
  title: { fontSize: 24, fontWeight: "700" as const, letterSpacing: -0.3 },
  heading: { fontSize: 18, fontWeight: "700" as const, letterSpacing: -0.2 },
  body: { fontSize: 16, fontWeight: "400" as const, lineHeight: 22 },
  bodyBold: { fontSize: 16, fontWeight: "600" as const },
  small: { fontSize: 14, fontWeight: "400" as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: "500" as const },
  overline: { fontSize: 12, fontWeight: "700" as const, letterSpacing: 1.2, textTransform: "uppercase" as const },
};
/** Minimum touch target (WCAG / platform guidelines). */
export const TOUCH = 44;
export const MAX_CONTENT_WIDTH = 520;
export const WIDE_BREAKPOINT = 1024;

export function useTheme() {
  const system = useColorScheme();
  const { theme } = useSettings();
  const dark = theme === "system" ? system === "dark" : theme === "dark";
  return { colors: dark ? darkColors : lightColors, dark, spacing, radii, type };
}
