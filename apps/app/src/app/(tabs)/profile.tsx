import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { MAX_PHOTOS, type MyProfile } from "@kxq/shared";
import { Avatar, Button, Card, IconButton, ListRow, ProgressBar, Screen, Section, Skeleton, Text, VerifiedIcon, type IconName } from "@/components/ui";
import { useLikes, useMatches, useMe } from "@/lib/queries";
import { useSettings } from "@/lib/settings";
import { radii, spacing, useTheme } from "@/theme";

/** Weighted checklist behind the "profile strength" meter. */
function profileChecks(me: MyProfile): { label: string; done: boolean; weight: number; icon: IconName }[] {
  return [
    { label: `Add ${MAX_PHOTOS} photos (${me.photos.length}/${MAX_PHOTOS})`, done: me.photos.length >= MAX_PHOTOS, weight: 30, icon: "images-outline" },
    { label: "Write a bio of 80+ characters", done: me.bio.trim().length >= 80, weight: 25, icon: "create-outline" },
    { label: "Pick at least 5 interests", done: me.interests.length >= 5, weight: 20, icon: "heart-outline" },
    { label: "Share your location", done: me.hasLocation, weight: 15, icon: "location-outline" },
    { label: "Get verified", done: me.isVerified, weight: 10, icon: "shield-checkmark-outline" },
  ];
}

export default function ProfileTab() {
  const { colors } = useTheme();
  const { data: me } = useMe();
  const matches = useMatches().data ?? [];
  const likes = useLikes().data?.length ?? 0;
  const { royalWaitlist } = useSettings();

  const checks = me ? profileChecks(me) : [];
  const score = checks.reduce((n, c) => n + (c.done ? c.weight : 0), 0);
  const todo = checks.filter((c) => !c.done);
  const conversations = matches.filter((m) => m.lastMessage).length;
  const unread = matches.reduce((n, m) => n + m.unreadCount, 0);

  return (
    <Screen scroll>
      <View style={{ flexDirection: "row", alignItems: "center", paddingTop: spacing.md, paddingBottom: spacing.lg }}>
        <Text variant="display" accessibilityRole="header" style={{ flex: 1 }}>
          Profile
        </Text>
        <IconButton icon="settings-outline" label="Settings" onPress={() => router.push("/settings")} elevated diameter={40} size={20} />
      </View>

      {!me ? (
        <Skeleton style={{ height: 220, borderRadius: radii.xl }} />
      ) : (
        <>
          <Card style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl, marginBottom: spacing.lg }}>
            <Avatar uri={me.photos[0]?.url} size={112} ring label="Your main photo" />
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm }}>
              <Text variant="title">
                {me.displayName}, {me.age}
              </Text>
              {me.isVerified && <VerifiedIcon />}
            </View>
            {(me.city || me.country) && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <Text variant="small" muted>
                  {[me.city, me.country].filter(Boolean).join(", ")}
                </Text>
              </View>
            )}
            {me.photos.some((p) => p.moderationStatus === "pending") && (
              <Text variant="caption" muted style={{ textAlign: "center" }}>
                Some photos are waiting for review and aren’t shown to others yet.
              </Text>
            )}
            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, alignSelf: "stretch" }}>
              <Button title="Edit profile" icon="create-outline" size="sm" onPress={() => router.push("/edit-profile")} style={{ flex: 1 }} />
              <Button title="Preview" icon="eye-outline" size="sm" variant="secondary" onPress={() => router.push("/preview")} style={{ flex: 1 }} />
            </View>
          </Card>

          <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg }}>
            <Stat icon="heart" value={matches.length} label="Matches" onPress={() => router.navigate("/matches")} />
            <Stat icon="chatbubbles" value={conversations} label="Chats" onPress={() => router.navigate("/matches")} />
            <Stat icon="mail-unread" value={unread} label="Unread" onPress={() => router.navigate("/matches")} />
          </View>

          <Card style={{ gap: spacing.md, marginBottom: spacing.lg }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View>
                <Text variant="overline" muted>
                  Profile strength
                </Text>
                <Text variant="title">{score}%</Text>
              </View>
              <View style={[styles.scoreBadge, { backgroundColor: score >= 80 ? colors.success : score >= 50 ? colors.goldDeep : colors.primary }]}>
                <Text variant="caption" style={{ color: "#FFFFFF", fontWeight: "700" }}>
                  {score >= 80 ? "Excellent" : score >= 50 ? "Good" : "Needs work"}
                </Text>
              </View>
            </View>
            <ProgressBar value={score / 100} />
            {todo.length > 0 ? (
              <View style={{ gap: spacing.xs }}>
                <Text variant="small" muted>
                  Complete profiles tend to get more matches. Next steps:
                </Text>
                {todo.slice(0, 3).map((c) => (
                  <Pressable
                    key={c.label}
                    accessibilityRole="button"
                    onPress={() => router.push(c.icon === "location-outline" ? "/preferences" : c.icon === "shield-checkmark-outline" ? "/help" : "/edit-profile")}
                    style={({ pressed }) => [styles.todo, { opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Ionicons name={c.icon} size={18} color={colors.primary} />
                    <Text variant="small" style={{ flex: 1 }}>
                      {c.label}
                    </Text>
                    <Text variant="caption" style={{ color: colors.primary, fontWeight: "700" }}>
                      +{c.weight}%
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text variant="small" muted>
                Your profile is complete. Nice work!
              </Text>
            )}
          </Card>
        </>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="KingxQueen Royal membership"
        onPress={() => router.push("/premium")}
        style={({ pressed }) => [styles.royal, { opacity: pressed ? 0.92 : 1, boxShadow: colors.shadowStrong }]}
      >
        <LinearGradient colors={colors.royal} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={[styles.royalIcon, { backgroundColor: "rgba(245,184,46,0.18)" }]}>
          <Ionicons name="diamond" size={24} color={colors.gold} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="heading" style={{ color: "#FFFFFF" }}>
            KingxQueen Royal
          </Text>
          <Text variant="small" style={{ color: "rgba(255,255,255,0.78)" }}>
            {royalWaitlist ? "You're on the waitlist — we'll let you know." : "Unlimited rewinds, weekly super likes, priority visibility."}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
      </Pressable>

      <Section title="Discovery">
        <ListRow icon="heart-half-outline" label="Likes you" value={likes ? String(likes) : undefined} detail="Like them back to match instantly" onPress={() => router.push("/likes")} />
        <ListRow icon="options-outline" label="Discovery preferences" detail="Age range, distance, who you see" onPress={() => router.push("/preferences")} />
        <ListRow icon="eye-outline" label="Preview my profile" detail="See what others see" onPress={() => router.push("/preview")} last />
      </Section>
      <Section title="Support">
        <ListRow icon="shield-checkmark-outline" label="Safety center" tint={colors.like} onPress={() => router.push("/safety")} />
        <ListRow icon="help-buoy-outline" label="Help & FAQ" tint={colors.superlike} onPress={() => router.push("/help")} />
        <ListRow icon="settings-outline" label="Settings" detail="Appearance, notifications, account" tint={colors.textMuted} onPress={() => router.push("/settings")} last />
      </Section>
    </Screen>
  );
}

function Stat({ icon, value, label, onPress }: { icon: IconName; value: number; label: string; onPress(): void }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${value} ${label}`} onPress={onPress} style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.8 : 1 })}>
      <Card style={{ alignItems: "center", gap: 2, paddingVertical: spacing.md }}>
        <Ionicons name={icon} size={18} color={colors.primary} />
        <Text variant="title">{value}</Text>
        <Text variant="caption" muted>
          {label}
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scoreBadge: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.pill },
  todo: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 40 },
  royal: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.xl,
    overflow: "hidden",
    marginBottom: spacing.xl,
  },
  royalIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
