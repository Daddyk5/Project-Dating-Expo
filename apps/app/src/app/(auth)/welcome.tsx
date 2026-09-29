import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, ErrorText, Text, type IconName } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { MAX_CONTENT_WIDTH, radii, spacing, TOUCH, useTheme } from "@/theme";

const SLIDES: { icon: IconName; title: string; body: string }[] = [
  { icon: "people", title: "Real people, close by", body: "Meet singles near you who share what you love, from island hopping to OPM nights." },
  { icon: "sparkles", title: "Smarter introductions", body: "AI highlights what you have in common and suggests icebreakers so the first message is easy." },
  { icon: "shield-checkmark", title: "Safety built in", body: "Scam and harassment detection, one-tap block and report, and a team that takes reports seriously." },
];

export default function Welcome() {
  const { colors } = useTheme();
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [width, setWidth] = useState(0);
  const scroller = useRef<ScrollView>(null);
  // Auto-advance pauses while the pointer is over the card or a dot has focus, and never runs with reduced motion.
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  const goTo = (i: number) => scroller.current?.scrollTo({ x: i * width, animated: true });
  useEffect(() => {
    if (!width || hovered || focused || reduceMotion) return;
    const next = (page + 1) % SLIDES.length;
    const t = setTimeout(() => scroller.current?.scrollTo({ x: next * width, animated: true }), 5000);
    return () => clearTimeout(t);
  }, [page, width, hovered, focused, reduceMotion]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient colors={[...colors.gradient, colors.background]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      <SafeAreaView edges={["top", "bottom"]} style={styles.column}>
        <View style={styles.brand}>
          <View style={[styles.logoTile, { backgroundColor: "rgba(255,255,255,0.18)" }]}>
            <Ionicons name="heart" size={40} color="#FFFFFF" />
            <Ionicons name="star" size={16} color={colors.gold} style={{ position: "absolute", top: 10, right: 10 }} />
          </View>
          <Text variant="hero" style={{ color: "#FFFFFF" }} accessibilityRole="header">
            KingxQueen
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.9)", textAlign: "center" }}>Dating, done with intention.</Text>
        </View>

        <Pressable
          accessible={false}
          onHoverIn={() => setHovered(true)}
          onHoverOut={() => setHovered(false)}
          style={[styles.carouselCard, { backgroundColor: colors.surfaceRaised, boxShadow: colors.shadowStrong, cursor: "auto" }]}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        >
          {width > 0 && (
            <ScrollView
              ref={scroller}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={32}
              onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
              accessibilityLabel="Why KingxQueen"
            >
              {SLIDES.map((s) => (
                <View key={s.title} style={[styles.slide, { width }]}>
                  <View style={[styles.slideIcon, { backgroundColor: colors.primarySoft }]}>
                    <Ionicons name={s.icon} size={26} color={colors.primary} />
                  </View>
                  <Text variant="heading" style={{ textAlign: "center" }}>
                    {s.title}
                  </Text>
                  <Text muted style={{ textAlign: "center" }}>
                    {s.body}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
          <View style={styles.dots}>
            {SLIDES.map((s, i) => (
              <Pressable
                key={s.title}
                accessibilityRole="button"
                accessibilityLabel={`Show slide ${i + 1} of ${SLIDES.length}: ${s.title}`}
                accessibilityState={{ selected: i === page }}
                onPress={() => goTo(i)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={styles.dotTarget}
              >
                <View style={[styles.dot, { width: i === page ? 20 : 8, backgroundColor: i === page ? colors.primary : colors.border }]} />
              </Pressable>
            ))}
          </View>
        </Pressable>

        <View style={{ gap: spacing.md, paddingBottom: spacing.lg }}>
          <Button title="Create account" icon="sparkles" onPress={() => router.push("/sign-up")} />
          <Button title="I already have an account" variant="secondary" onPress={() => router.push("/sign-in")} />
          {Platform.OS === "web" && (
            <Button
              title="Continue with Google"
              icon="logo-google"
              variant="ghost"
              onPress={() => signInWithGoogle().catch((e) => setError((e as Error).message))}
            />
          )}
          <ErrorText>{error}</ErrorText>
          <Text variant="caption" muted style={{ textAlign: "center" }}>
            KingxQueen is for adults 18 and over. By continuing you agree to our{" "}
            <Link href="/terms" style={{ color: colors.primary, textDecorationLine: "underline" }}>
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" style={{ color: colors.primary, textDecorationLine: "underline" }}>
              Privacy Policy
            </Link>
            .
          </Text>
          <View style={{ alignItems: "center" }}>
            <Link href="/help" style={{ color: colors.textMuted, fontSize: 12 }}>
              Help & FAQ
            </Link>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  column: { flex: 1, width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center", paddingHorizontal: spacing.lg, gap: spacing.xl },
  brand: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, minHeight: 200 },
  logoTile: { width: 84, height: 84, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  carouselCard: { borderRadius: radii.xl, paddingVertical: spacing.xl, gap: spacing.lg, overflow: "hidden" },
  slide: { alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.xl },
  slideIcon: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: spacing.xs },
  dots: { flexDirection: "row", justifyContent: "center", marginVertical: -spacing.md },
  // The dot stays small; the pressable area around it is a full touch target.
  dotTarget: { minWidth: TOUCH, height: TOUCH, alignItems: "center", justifyContent: "center" },
  dot: { height: 8, borderRadius: 4 },
});
