import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Linking, Platform, StyleSheet, View } from "react-native";
import { Button, Card, Header, Screen, Text, type IconName } from "@/components/ui";
import { radii, spacing, useTheme } from "@/theme";

const TIPS: { icon: IconName; title: string; body: string }[] = [
  { icon: "cash-outline", title: "Never send money", body: "No matter the story — an emergency, a ticket, a \"sure\" investment. Requests for money, GCash, gift cards or crypto are the most common scam." },
  { icon: "chatbubbles-outline", title: "Keep chats here at first", body: "Scammers push to move to other apps quickly. Get to know someone in KingxQueen, where our safety checks can warn you." },
  { icon: "cafe-outline", title: "Meet in public", body: "First dates belong in busy public places. Tell a friend where you're going and arrange your own ride." },
  { icon: "warning-outline", title: "Watch for warnings", body: "Messages that may be harassment, scams or explicit are held behind a warning. You choose whether to read them." },
  { icon: "ban-outline", title: "Block and report", body: "Open any chat or profile, tap ••• and choose Block or Report. Reports are confidential; blocking ends the match immediately." },
];

export default function Safety() {
  const { colors } = useTheme();
  return (
    <Screen scroll edges={["top", "bottom"]} header={<Header title="Safety center" />}>
      <View style={[styles.hero, { boxShadow: colors.shadowStrong }]}>
        <LinearGradient colors={["#15803D", "#0F5132"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Ionicons name="shield-checkmark" size={36} color="#FFFFFF" />
        <Text variant="title" style={{ color: "#FFFFFF" }}>
          Your safety comes first
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.88)" }}>
          Every message is screened for scams, harassment and explicit content, and every report is reviewed.
        </Text>
      </View>

      <Text variant="overline" muted style={{ marginTop: spacing.xl, marginBottom: spacing.sm, paddingHorizontal: spacing.xs }}>
        Dating safely
      </Text>
      <View style={{ gap: spacing.md }}>
        {TIPS.map((t, i) => (
          <Card key={t.title} style={{ flexDirection: "row", gap: spacing.md }}>
            <View style={[styles.num, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name={t.icon} size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text variant="bodyBold">
                {i + 1}. {t.title}
              </Text>
              <Text muted>{t.body}</Text>
            </View>
          </Card>
        ))}
      </View>

      <Card style={{ marginTop: spacing.xl, gap: spacing.md, borderColor: colors.danger }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <Ionicons name="call" size={20} color={colors.danger} />
          <Text variant="heading">In immediate danger?</Text>
        </View>
        <Text muted>Call 911, the Philippines national emergency hotline.</Text>
        {Platform.OS !== "web" && <Button title="Call 911" variant="danger" icon="call-outline" onPress={() => Linking.openURL("tel:911")} />}
      </Card>

      <Button title="Manage blocked people" variant="secondary" icon="ban-outline" onPress={() => router.push("/blocked")} style={{ marginTop: spacing.xl }} />
      <Button title="Read the Help & FAQ" variant="ghost" icon="help-buoy-outline" onPress={() => router.push("/help")} style={{ marginTop: spacing.md }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radii.xl, padding: spacing.xl, gap: spacing.sm, overflow: "hidden", marginTop: spacing.sm },
  num: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
