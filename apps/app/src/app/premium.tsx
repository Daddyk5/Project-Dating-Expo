import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, IconButton, Text, type IconName } from "@/components/ui";
import { updateSettings, useSettings } from "@/lib/settings";
import { MAX_CONTENT_WIDTH, radii, spacing } from "@/theme";

const GOLD = "#F5B82E";
const INK = "#FFFFFF";
const INK_MUTED = "rgba(255,255,255,0.72)";

const PERKS: { icon: IconName; title: string; body: string }[] = [
  { icon: "arrow-undo", title: "Unlimited rewinds", body: "Undo any swipe, not just the last pass." },
  { icon: "star", title: "5 super likes a week", body: "Stand out at the top of their deck." },
  { icon: "rocket", title: "Monthly spotlight", body: "Be a top profile nearby for 30 minutes." },
  { icon: "sparkles", title: "Deeper AI insights", body: "Full compatibility breakdowns and date ideas." },
  { icon: "airplane", title: "Passport", body: "Match in another city before you travel." },
];

const PLANS = [
  { id: "1m", months: 1, price: 399, tag: null },
  { id: "3m", months: 3, price: 899, tag: "Most popular" },
  { id: "6m", months: 6, price: 1499, tag: "Best value" },
] as const;

const COMPARE: [string, boolean, boolean][] = [
  ["Unlimited likes", true, true],
  ["Chat with matches", true, true],
  ["Safety tools", true, true],
  ["See who likes you", true, true],
  ["Unlimited rewinds", false, true],
  ["Passport", false, true],
];

export default function Premium() {
  const { royalWaitlist } = useSettings();
  const [plan, setPlan] = useState<(typeof PLANS)[number]["id"]>("3m");
  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <View style={{ flex: 1, backgroundColor: "#140C1E" }}>
      <LinearGradient colors={["#2A1340", "#140C1E", "#0C0812"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1 }}>
        <View style={styles.column}>
          <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingVertical: spacing.sm }}>
            <IconButton icon="close" label="Close" onPress={close} color={INK} background="rgba(255,255,255,0.1)" />
          </View>
        </View>
        <ScrollView contentContainerStyle={[styles.column, { paddingBottom: spacing.xxxl, gap: spacing.xl }]}>
          <View style={{ alignItems: "center", gap: spacing.sm }}>
            <View style={styles.crown}>
              <LinearGradient colors={["#F7CE68", "#E0A526"]} style={[StyleSheet.absoluteFill, { borderRadius: 28 }]} />
              <Ionicons name="diamond" size={36} color="#1F1330" />
            </View>
            <Text variant="overline" style={{ color: GOLD }}>
              KingxQueen Royal
            </Text>
            <Text variant="display" style={{ color: INK, textAlign: "center" }} accessibilityRole="header">
              Date like royalty
            </Text>
            <Text style={{ color: INK_MUTED, textAlign: "center", maxWidth: 360 }}>
              Everything in Free, plus the tools that get you to a real date faster.
            </Text>
          </View>

          <View style={{ gap: spacing.md }}>
            {PERKS.map((p) => (
              <View key={p.title} style={styles.perk}>
                <View style={styles.perkIcon}>
                  <Ionicons name={p.icon} size={20} color={GOLD} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyBold" style={{ color: INK }}>
                    {p.title}
                  </Text>
                  <Text variant="small" style={{ color: INK_MUTED }}>
                    {p.body}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: spacing.sm }}>
            {PLANS.map((p) => {
              const active = plan === p.id;
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={`${p.months} month${p.months > 1 ? "s" : ""}, ₱${p.price}${p.tag ? `, ${p.tag}` : ""}`}
                  onPress={() => setPlan(p.id)}
                  style={[styles.plan, { borderColor: active ? GOLD : "rgba(255,255,255,0.14)", backgroundColor: active ? "rgba(245,184,46,0.1)" : "rgba(255,255,255,0.04)" }]}
                >
                  {p.tag && (
                    <View style={[styles.planTag, { backgroundColor: active ? GOLD : "rgba(255,255,255,0.16)" }]}>
                      <Text style={{ fontSize: 10, fontWeight: "800", color: active ? "#1F1330" : INK }}>{p.tag.toUpperCase()}</Text>
                    </View>
                  )}
                  <Text variant="title" style={{ color: INK }}>
                    {p.months}
                  </Text>
                  <Text variant="caption" style={{ color: INK_MUTED }}>
                    month{p.months > 1 ? "s" : ""}
                  </Text>
                  <Text variant="bodyBold" style={{ color: INK, marginTop: spacing.sm }}>
                    ₱{p.price.toLocaleString()}
                  </Text>
                  <Text variant="caption" style={{ color: INK_MUTED }}>
                    ₱{Math.round(p.price / p.months)}/mo
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.compare}>
            <View style={styles.compareRow}>
              <Text variant="overline" style={{ color: INK_MUTED, flex: 1 }}>
                Compare
              </Text>
              <Text variant="overline" style={[styles.compareCol, { color: INK_MUTED }]}>
                Free
              </Text>
              <Text variant="overline" style={[styles.compareCol, { color: GOLD }]}>
                Royal
              </Text>
            </View>
            {COMPARE.map(([label, free, royal]) => (
              <View key={label} style={[styles.compareRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.12)" }]}>
                <Text variant="small" style={{ color: INK, flex: 1 }}>
                  {label}
                </Text>
                {[free, royal].map((on, i) => (
                  <View key={i} style={styles.compareCol} accessibilityLabel={`${i ? "Royal" : "Free"}: ${on ? "included" : "not included"}`}>
                    <Ionicons name={on ? "checkmark-circle" : "remove"} size={20} color={on ? (i ? GOLD : INK) : "rgba(255,255,255,0.3)"} />
                  </View>
                ))}
              </View>
            ))}
          </View>

          <View style={{ gap: spacing.md }}>
            {royalWaitlist ? (
              <View style={styles.joined} accessibilityLiveRegion="polite">
                <Ionicons name="checkmark-circle" size={22} color={GOLD} />
                <Text style={{ color: INK, flex: 1 }}>You’re on the waitlist. We’ll let you know the moment Royal launches.</Text>
              </View>
            ) : (
              <Button title="Join the Royal waitlist" icon="diamond" variant="royal" onPress={() => updateSettings({ royalWaitlist: true })} />
            )}
            <Text variant="caption" style={{ color: INK_MUTED, textAlign: "center" }}>
              Royal isn’t on sale yet — no payment is taken. Prices shown are planned launch pricing and may change.
            </Text>
            {royalWaitlist && (
              <Button title="Leave the waitlist" variant="ghost" onPress={() => updateSettings({ royalWaitlist: false })} />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  column: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center", paddingHorizontal: spacing.lg },
  crown: { width: 76, height: 76, borderRadius: 28, alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: spacing.sm },
  perk: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  perkIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(245,184,46,0.12)" },
  plan: { flex: 1, alignItems: "center", borderWidth: 2, borderRadius: radii.lg, paddingTop: spacing.xl, paddingBottom: spacing.lg, paddingHorizontal: spacing.xs },
  planTag: { position: "absolute", top: -10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.pill },
  compare: { borderRadius: radii.lg, backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: spacing.lg },
  compareRow: { flexDirection: "row", alignItems: "center", minHeight: 44 },
  compareCol: { width: 56, alignItems: "center", textAlign: "center" },
  joined: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderRadius: radii.lg, backgroundColor: "rgba(245,184,46,0.12)" },
});
