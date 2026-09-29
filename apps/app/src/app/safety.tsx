import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { View } from "react-native";
import { IconButton, Screen, Text, type IconName } from "@/components/ui";
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
    <Screen scroll edges={["top", "bottom"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm }}>
        <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
        <Text variant="heading" accessibilityRole="header">
          Safety center
        </Text>
      </View>
      <View style={{ gap: spacing.md }}>
        {TIPS.map((t) => (
          <View key={t.title} style={{ flexDirection: "row", gap: spacing.md, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg }}>
            <Ionicons name={t.icon} size={24} color={colors.primary} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text variant="bodyBold">{t.title}</Text>
              <Text muted>{t.body}</Text>
            </View>
          </View>
        ))}
        <Text variant="small" muted>
          In immediate danger? Call 911 (Philippines emergency hotline).
        </Text>
      </View>
    </Screen>
  );
}
