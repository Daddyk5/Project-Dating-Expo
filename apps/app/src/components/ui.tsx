import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, type ComponentProps, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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
  header,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
  wide?: boolean;
  /** Rendered above the scroll area so it stays pinned. */
  header?: ReactNode;
}) {
  const { colors } = useTheme();
  const column = [styles.column, { maxWidth: wide ? 1100 : MAX_CONTENT_WIDTH }, style];
  return (
    <SafeAreaView edges={edges} style={[styles.fill, { backgroundColor: colors.background }]}>
      {header && <View style={[styles.column, { maxWidth: wide ? 1100 : MAX_CONTENT_WIDTH }]}>{header}</View>}
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

/** Standard secondary-screen header: back button, title, optional right action. */
export function Header({
  title,
  subtitle,
  right,
  onBack,
  back = true,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
  back?: boolean;
}) {
  const goBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace("/")));
  return (
    <View style={styles.header}>
      {back ? <IconButton icon="chevron-back" label="Back" onPress={goBack} /> : null}
      <View style={{ flex: 1 }}>
        {title ? (
          <Text variant="heading" accessibilityRole="header" numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="caption" muted numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "royal";

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  icon,
  style,
  accessibilityLabel,
  size = "md",
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  size?: "sm" | "md";
}) {
  const { colors } = useTheme();
  const bg = { primary: "transparent", royal: "transparent", secondary: colors.surfaceRaised, ghost: "transparent", danger: colors.dangerFill }[variant];
  const fg =
    variant === "primary" || variant === "danger"
      ? colors.onPrimary
      : variant === "royal"
        ? "#1F1330"
        : variant === "ghost"
          ? colors.primary
          : colors.text;
  const gradient = variant === "primary" ? colors.gradient : variant === "royal" ? (["#F7CE68", "#E0A526"] as [string, string]) : null;
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
        size === "sm" && styles.buttonSm,
        { backgroundColor: bg, opacity: inactive ? 0.5 : pressed ? 0.88 : 1, transform: [{ scale: pressed && !inactive ? 0.98 : 1 }] },
        variant === "secondary" && { borderWidth: 1, borderColor: colors.border },
        gradient && !inactive && { boxShadow: colors.shadow },
        style,
      ]}
    >
      {gradient && <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: radii.pill }]} />}
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={size === "sm" ? 16 : 20} color={fg} />}
          <RNText style={[size === "sm" ? typeScale.small : typeScale.bodyBold, { color: fg, fontWeight: "700" }]}>{title}</RNText>
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
  elevated,
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
  /** Floating look: raised surface with a soft shadow (used for the Discover actions). */
  elevated?: boolean;
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
        {
          width: diameter,
          height: diameter,
          backgroundColor: background ?? (elevated ? colors.surfaceRaised : "transparent"),
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
          transform: [{ scale: pressed && !disabled ? 0.92 : 1 }],
        },
        elevated && { boxShadow: colors.shadow, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
        style,
      ]}
    >
      <Ionicons name={icon} size={size} color={color ?? colors.text} />
    </Pressable>
  );
}

export function TextField({
  label,
  error,
  style,
  icon,
  hint,
  ...props
}: TextInputProps & { label: string; error?: string | null; icon?: IconName; hint?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="caption" muted style={{ fontWeight: "600" }}>
        {label}
      </Text>
      <View>
        {icon && <Ionicons name={icon} size={18} color={colors.textMuted} style={styles.fieldIcon} />}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.textMuted}
          {...props}
          style={[
            styles.input,
            icon && { paddingLeft: 42 },
            { color: colors.text, backgroundColor: colors.surfaceRaised, borderColor: error ? colors.danger : colors.border },
            style as StyleProp<TextStyle>,
          ]}
        />
      </View>
      {error ? (
        <Text variant="caption" style={{ color: colors.danger }} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" muted>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? "checkbox" : "text"}
      accessibilityState={onPress ? { checked: !!selected } : undefined}
      accessibilityLabel={label}
      disabled={!onPress}
      onPress={onPress}
      style={[
        styles.chip,
        !onPress && styles.chipStatic,
        {
          backgroundColor: selected ? colors.primarySoft : colors.surfaceRaised,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      {(icon || selected) && <Ionicons name={selected ? "checkmark" : icon!} size={14} color={selected ? colors.primary : colors.textMuted} />}
      <Text variant="small" style={selected ? { color: colors.primary, fontWeight: "600" } : undefined}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={[styles.progress, { backgroundColor: colors.surface }]}
    >
      <View style={{ width: `${Math.round(value * 100)}%`, height: "100%", backgroundColor: color ?? colors.primary, borderRadius: radii.pill }} />
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
      <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={40} color={colors.primary} />
      </View>
      <Text variant="heading" style={{ textAlign: "center" }}>
        {title}
      </Text>
      <Text muted style={{ textAlign: "center", maxWidth: 340 }}>
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
      <RNText style={[typeScale.caption, { color, fontWeight: "700" }]}>{label}</RNText>
    </View>
  );
}

export const DemoBadge = () => <Badge label="Demo" icon="flask" color="#1F2937" background="#FDE68A" />;
export const VerifiedIcon = ({ size = 20 }: { size?: number }) => (
  <Ionicons name="checkmark-circle" size={size} color="#3B82F6" accessibilityLabel="Verified" />
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

/** Raised content surface with a hairline border and soft shadow. */
export function Card({ children, style, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surfaceRaised, borderColor: colors.border, boxShadow: colors.shadow },
        padded && { padding: spacing.lg },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Settings-style group: small uppercase title over a card of rows. */
export function Section({ title, children, footer }: { title?: string; children: ReactNode; footer?: string }) {
  return (
    <View style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
      {title && (
        <Text variant="overline" muted style={{ paddingHorizontal: spacing.xs }}>
          {title}
        </Text>
      )}
      <Card padded={false} style={{ overflow: "hidden" }}>
        {children}
      </Card>
      {footer && (
        <Text variant="caption" muted style={{ paddingHorizontal: spacing.xs }}>
          {footer}
        </Text>
      )}
    </View>
  );
}

function RowIcon({ icon, tint }: { icon: IconName; tint?: string }) {
  const { colors } = useTheme();
  const c = tint ?? colors.primary;
  return (
    <View style={[styles.rowIcon, { backgroundColor: `${c}1F` }]}>
      <Ionicons name={icon} size={18} color={c} />
    </View>
  );
}

/** Tappable settings row with a tinted icon tile. */
export function ListRow({
  icon,
  label,
  detail,
  value,
  onPress,
  tint,
  destructive,
  last,
  right,
}: {
  icon: IconName;
  label: string;
  detail?: string;
  value?: string;
  onPress?: () => void;
  tint?: string;
  destructive?: boolean;
  last?: boolean;
  right?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={[label, value, detail].filter(Boolean).join(". ")}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.surface : "transparent" },
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
      ]}
    >
      <RowIcon icon={icon} tint={destructive ? colors.danger : tint} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyBold" style={destructive ? { color: colors.danger } : undefined}>
          {label}
        </Text>
        {detail && (
          <Text variant="caption" muted>
            {detail}
          </Text>
        )}
      </View>
      {value && (
        <Text variant="small" muted>
          {value}
        </Text>
      )}
      {right ?? (onPress && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />)}
    </Pressable>
  );
}

export function ToggleRow({
  icon,
  label,
  detail,
  value,
  onChange,
  tint,
  last,
}: {
  icon: IconName;
  label: string;
  detail?: string;
  value: boolean;
  onChange(v: boolean): void;
  tint?: string;
  last?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <RowIcon icon={icon} tint={tint} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyBold">{label}</Text>
        {detail && (
          <Text variant="caption" muted>
            {detail}
          </Text>
        )}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

/** iOS-style segmented control. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; badge?: number }[];
  value: T;
  onChange(v: T): void;
}) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="tablist" style={[styles.segmented, { backgroundColor: colors.surface }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.badge ? `${o.label}, ${o.badge}` : o.label}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active && { backgroundColor: colors.surfaceRaised, boxShadow: colors.shadow }]}
          >
            <Text variant="small" style={{ fontWeight: active ? "700" : "500", color: active ? colors.text : colors.textMuted }}>
              {o.label}
            </Text>
            {!!o.badge && (
              <View style={[styles.segmentBadge, { backgroundColor: colors.primaryFill }]}>
                <RNText style={{ color: colors.onPrimary, fontSize: 11, fontWeight: "700" }}>{o.badge}</RNText>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Round photo with an optional gradient ring and online dot. */
export function Avatar({ uri, size = 56, ring, online, label }: { uri?: string; size?: number; ring?: boolean; online?: boolean; label?: string }) {
  const { colors } = useTheme();
  const pad = ring ? 3 : 0;
  const circle = { width: size, height: size, borderRadius: size / 2, borderWidth: ring ? 2 : 0, borderColor: colors.background };
  // No photo (not uploaded, or still in review): a person glyph instead of an empty circle.
  const img = uri ? (
    <Image source={{ uri }} style={[circle, { backgroundColor: colors.skeleton }]} contentFit="cover" accessibilityLabel={label} />
  ) : (
    <View accessibilityLabel={label} style={[circle, { backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }]}>
      <Ionicons name="person" size={size * 0.5} color={colors.primary} />
    </View>
  );
  return (
    <View>
      {ring ? (
        <LinearGradient colors={colors.gradient} style={{ padding: pad, borderRadius: (size + pad * 2) / 2 }}>
          {img}
        </LinearGradient>
      ) : (
        img
      )}
      {online && (
        <View style={{ position: "absolute", right: pad + 1, bottom: pad + 1 }}>
          <OnlineDot size={Math.max(10, size / 5)} />
        </View>
      )}
    </View>
  );
}

/** Brand mark: a heart with a gold crown-star. */
export function Logo({ size = 32, wordmark }: { size?: number; wordmark?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }} accessibilityLabel="KingxQueen">
      <View>
        <Ionicons name="heart-circle" size={size} color={colors.primary} />
        <Ionicons name="star" size={size * 0.34} color={colors.gold} style={{ position: "absolute", right: -size * 0.08, top: -size * 0.08 }} />
      </View>
      {wordmark && (
        <Text style={{ fontSize: size * 0.62, fontWeight: "800", letterSpacing: -0.5 }}>
          King<Text style={{ fontSize: size * 0.62, fontWeight: "800", color: colors.primary }}>x</Text>Queen
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { width: "100%", alignSelf: "center", paddingHorizontal: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: spacing.sm, minHeight: 56 },
  button: {
    minHeight: 52,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    overflow: "hidden",
  },
  buttonSm: { minHeight: TOUCH, paddingHorizontal: spacing.lg },
  iconButton: { alignItems: "center", justifyContent: "center", borderRadius: radii.pill },
  input: { minHeight: 52, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, fontSize: 16 },
  fieldIcon: { position: "absolute", left: 14, top: 17, zIndex: 1 },
  chip: {
    minHeight: TOUCH,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  chipStatic: { minHeight: 36 },
  progress: { height: 6, borderRadius: radii.pill, overflow: "hidden" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xl },
  emptyIcon: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.pill },
  card: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 60, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  segmented: { flexDirection: "row", borderRadius: radii.md, padding: 3, gap: 3 },
  segment: {
    flex: 1,
    minHeight: 38,
    borderRadius: radii.sm + 2,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  segmentBadge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
});
