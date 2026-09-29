import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, type ComponentProps, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { MAX_CONTENT_WIDTH, radii, spacing, TOUCH, type as typeScale, useTheme } from "@/theme";

export type IconName = ComponentProps<typeof Ionicons>["name"];

export function Text({
  variant = "body",
  muted,
  style,
  ...props
}: TextProps & { variant?: keyof typeof typeScale; muted?: boolean }) {
  const { colors } = useTheme();
  return <RNText {...props} style={[typeScale[variant], { color: muted ? colors.textMuted : colors.text }, style]} />;
}

/** Full-height screen with safe areas and a centered, max-width content column on web. */
export function Screen({
  children,
  scroll,
  edges = ["top"],
  style,
  wide,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
  wide?: boolean;
}) {
  const { colors } = useTheme();
  const column = [styles.column, { maxWidth: wide ? 1100 : MAX_CONTENT_WIDTH }, style];
  return (
    <SafeAreaView edges={edges} style={[styles.fill, { backgroundColor: colors.background }]}>
      {scroll ? (
        <ScrollView contentContainerStyle={[column, { paddingBottom: spacing.xxxl }]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[column, styles.fill]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  icon,
  style,
  accessibilityLabel,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const bg = { primary: colors.primary, secondary: colors.surface, ghost: "transparent", danger: colors.danger }[variant];
  const fg = variant === "primary" || variant === "danger" ? colors.onPrimary : variant === "ghost" ? colors.primary : colors.text;
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: inactive ? 0.5 : pressed ? 0.85 : 1 },
        variant === "secondary" && { borderWidth: 1, borderColor: colors.border },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={20} color={fg} />}
          <RNText style={[typeScale.bodyBold, { color: fg }]}>{title}</RNText>
        </>
      )}
    </Pressable>
  );
}

/** Icon-only button. Always labelled for screen readers; min 44×44. */
export function IconButton({
  icon,
  label,
  onPress,
  color,
  size = 24,
  background,
  diameter = TOUCH,
  disabled,
  style,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  color?: string;
  size?: number;
  background?: string;
  diameter?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={Math.max(0, (TOUCH - diameter) / 2)}
      style={({ pressed }) => [
        styles.iconButton,
        { width: diameter, height: diameter, backgroundColor: background ?? "transparent", opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
        style,
      ]}
    >
      <Ionicons name={icon} size={size} color={color ?? colors.text} />
    </Pressable>
  );
}

export function TextField({ label, error, style, ...props }: TextInputProps & { label: string; error?: string | null }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="caption" muted>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        {...props}
        style={[
          styles.input,
          { color: colors.text, backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.border },
          style as StyleProp<TextStyle>,
        ]}
      />
      {error ? (
        <Text variant="caption" style={{ color: colors.danger }} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.chipSelected : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <Text variant="small" style={selected ? { color: colors.primary, fontWeight: "600" } : undefined}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={[styles.progress, { backgroundColor: colors.surface }]}
    >
      <View style={{ width: `${Math.round(value * 100)}%`, height: "100%", backgroundColor: colors.primary, borderRadius: radii.pill }} />
    </View>
  );
}

/** Pulsing placeholder block (used instead of spinners). */
export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.5);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, [opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View accessible={false} style={[{ backgroundColor: colors.skeleton, borderRadius: radii.md }, style, animated]} />;
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: IconName;
  title: string;
  message: string;
  action?: { label: string; onPress: () => void };
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={48} color={colors.primary} />
      <Text variant="heading" style={{ textAlign: "center" }}>
        {title}
      </Text>
      <Text muted style={{ textAlign: "center" }}>
        {message}
      </Text>
      {action && <Button title={action.label} onPress={action.onPress} style={{ marginTop: spacing.sm }} />}
    </View>
  );
}

export function Badge({ label, icon, color, background }: { label: string; icon?: IconName; color: string; background: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: background }]} accessibilityLabel={label}>
      {icon && <Ionicons name={icon} size={12} color={color} />}
      <RNText style={[typeScale.caption, { color }]}>{label}</RNText>
    </View>
  );
}

export const DemoBadge = () => <Badge label="Demo" icon="flask" color="#1F2937" background="#FDE68A" />;
export const VerifiedIcon = () => (
  <Ionicons name="checkmark-circle" size={20} color="#3B82F6" accessibilityLabel="Verified" />
);

export function OnlineDot({ size = 10 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityLabel="Online now"
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.online, borderWidth: 2, borderColor: colors.background }}
    />
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  if (!children) return null;
  return (
    <Text variant="small" style={{ color: colors.danger }} accessibilityLiveRegion="polite" accessibilityRole="alert">
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { width: "100%", alignSelf: "center", paddingHorizontal: spacing.lg },
  button: {
    minHeight: 50,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  iconButton: { alignItems: "center", justifyContent: "center", borderRadius: radii.pill },
  input: { minHeight: 50, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, fontSize: 16 },
  chip: { minHeight: TOUCH, paddingHorizontal: spacing.lg, borderRadius: radii.pill, borderWidth: 1, justifyContent: "center" },
  progress: { height: 6, borderRadius: radii.pill, overflow: "hidden" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xl },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.pill },
});
