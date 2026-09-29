import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MAX_PHOTOS, MIN_INTERESTS, MIN_PHOTOS } from "@kxq/shared";
import { Button, Card, EmptyState, Header, Screen, Text, TextField } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { spacing, useTheme } from "@/theme";

const FAQ: { topic: string; items: [string, string][] }[] = [
  {
    topic: "Getting started",
    items: [
      ["How does matching work?", "Swipe right (or tap the heart) to like someone and left to pass. When two people like each other, it's a match and you can chat. A super like (swipe up or tap the star) tells them you're especially interested."],
      ["What does my profile need?", `At least ${MIN_PHOTOS} photos (up to ${MAX_PHOTOS}) and ${MIN_INTERESTS}+ interests. A bio is optional but profiles with one tend to get more matches — use “Polish with AI” if you're stuck.`],
      ["Why am I not seeing anyone?", "You've probably seen everyone who fits your preferences. Widen your distance or age range in Discovery preferences, and make sure you've shared your location."],
    ],
  },
  {
    topic: "Matches & messages",
    items: [
      ["Can I undo a swipe?", "Yes — the gold rewind button brings back the last person you passed. Royal members will get unlimited rewinds."],
      ["Who has liked me?", "Open Matches → Likes you (or Profile → Likes you). Everyone there already liked you, so liking them back is an instant match."],
      ["What are icebreakers?", "Tap the lightbulb in a chat and AI suggests openers based on what you both like. You can edit them before sending."],
      ["What does “Seen” mean?", "Your last message was read. Read receipts appear under the most recent message you sent."],
      ["Why can't I message a Demo profile?", "Demo profiles are fictional and exist for testing the app. Messaging them is turned off."],
    ],
  },
  {
    topic: "Safety & privacy",
    items: [
      ["Who can see my location?", "Only your approximate distance (for example “3 km away”) and city are shown. Your exact location is never shared."],
      ["What happens when I report someone?", "Reports are confidential — they won't know it was you. You can also block them in the same step, which ends the match immediately."],
      ["Why is a message hidden behind a warning?", "Our safety checks flagged it as a possible scam, harassment or explicit content. You choose whether to read it. Never send money to someone you met here."],
      ["How do I unblock someone?", "Profile → Settings → Blocked people. Unblocking lets you see each other again, but an ended match and its chat don't come back."],
      ["How do I get verified?", "Verification badges are currently granted by the KingxQueen team after review. Self-serve photo verification is coming soon."],
    ],
  },
  {
    topic: "Account",
    items: [
      ["How do I change my theme or notifications?", "Profile → Settings. Appearance and notification choices are saved on this device."],
      ["How do I delete my account?", "Profile → Settings → Delete account. This permanently removes your profile, photos, matches and messages."],
      ["I forgot my password", "On the sign-in screen tap “Forgot password?” and we'll email you a reset link. Open it on this device to choose a new password."],
      ["How do I change my password?", "Profile → Settings → Change password. Your other devices are signed out when you change it."],
    ],
  },
];

export default function Help() {
  const { colors } = useTheme();
  const { status } = useAuth();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const q = query.trim().toLowerCase();
  const groups = FAQ.map((g) => ({ ...g, items: g.items.filter(([h, b]) => !q || h.toLowerCase().includes(q) || b.toLowerCase().includes(q)) })).filter((g) => g.items.length);

  return (
    <Screen scroll edges={["top", "bottom"]} header={<Header title="Help & FAQ" />}>
      <View style={{ gap: spacing.xl, paddingTop: spacing.sm }}>
        <TextField label="Search help" icon="search-outline" value={query} onChangeText={setQuery} placeholder="e.g. location, report, undo" autoCapitalize="none" />

        {groups.length === 0 ? (
          <EmptyState icon="search-outline" title="No answers found" message="Try a different word." />
        ) : (
          groups.map((g) => (
            <View key={g.topic} style={{ gap: spacing.sm }}>
              <Text variant="overline" muted style={{ paddingHorizontal: spacing.xs }}>
                {g.topic}
              </Text>
              <Card padded={false} style={{ overflow: "hidden" }}>
                {g.items.map(([h, b], i) => {
                  const expanded = open === h || !!q;
                  return (
                    <View key={h} style={i < g.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ expanded }}
                        onPress={() => setOpen(open === h ? null : h)}
                        style={({ pressed }) => [styles.question, { backgroundColor: pressed ? colors.surface : "transparent" }]}
                      >
                        <Text variant="bodyBold" style={{ flex: 1 }}>
                          {h}
                        </Text>
                        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
                      </Pressable>
                      {expanded && (
                        <Text muted style={styles.answer}>
                          {b}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </Card>
            </View>
          ))
        )}

        <Card style={{ gap: spacing.md, alignItems: "center" }}>
          <Ionicons name="shield-checkmark" size={32} color={colors.like} />
          <Text variant="heading">Feeling unsafe?</Text>
          <Text muted style={{ textAlign: "center" }}>
            Block or report anyone from their profile or chat. In immediate danger, call 911.
          </Text>
          {status === "signedIn" && (
            <Button title="Open Safety center" variant="secondary" icon="shield-checkmark-outline" onPress={() => router.push("/safety")} style={{ alignSelf: "stretch" }} />
          )}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  question: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 56, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  answer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
});
