import { View } from "react-native";
import { spacing, useTheme } from "@/theme";
import { ProgressBar, Text } from "./ui";

export const MIN_PASSWORD = 8;

/** 0–4: too short, then length ≥ 12, mixed case, digit + symbol. */
export function passwordStrength(pw: string) {
  if (pw.length < MIN_PASSWORD) return 0;
  let s = 1;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}

/** Meter shown under a new-password field once the user starts typing. */
export function PasswordStrength({ password }: { password: string }) {
  const { colors } = useTheme();
  if (!password) return null;
  const score = passwordStrength(password);
  const meter = [
    { label: "Too short", color: colors.danger },
    { label: "Fair", color: colors.goldDeep },
    { label: "Good", color: colors.goldDeep },
    { label: "Strong", color: colors.success },
    { label: "Excellent", color: colors.success },
  ][score];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }} accessibilityLabel={`Password strength: ${meter.label}`}>
      <View style={{ flex: 1 }}>
        <ProgressBar value={Math.max(0.08, score / 4)} color={meter.color} />
      </View>
      <Text variant="caption" style={{ color: meter.color, fontWeight: "700", minWidth: 64, textAlign: "right" }}>
        {meter.label}
      </Text>
    </View>
  );
}
