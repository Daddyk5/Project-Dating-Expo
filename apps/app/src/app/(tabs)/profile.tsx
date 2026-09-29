import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Button, ErrorText, Screen, Skeleton, Text, VerifiedIcon, type IconName } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { confirm } from "@/lib/confirm";
import { queryClient, useMe } from "@/lib/queries";
import { radii, spacing, useTheme } from "@/theme";

export default function ProfileTab() {
  const { colors } = useTheme();
  const { data: me } = useMe();
  const { signOut, forget } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const logOut = async () => {
    await signOut();
    queryClient.clear();
  };

  const deleteAccount = async () => {
    const ok = await confirm(
      "Delete your account?",
      "This permanently deletes your profile, photos, matches and messages. This can't be undone.",
      "Delete",
      true,
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await api.deleteAccount();
      await signOut().catch(() => {});
      forget();
      queryClient.clear();
    } catch (e) {
      setError((e as Error).message);
      setDeleting(false);
    }
  };

  return (
    <Screen scroll>
      <Text variant="heading" accessibilityRole="header" style={{ paddingVertical: spacing.md }}>
        Profile
      </Text>
      {!me ? (
        <Skeleton style={{ height: 120 }} />
      ) : (
        <View style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg }}>
          <Image source={{ uri: me.photos[0]?.url }} style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: colors.primary }} accessibilityLabel="Your main photo" />
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <Text variant="title">
              {me.displayName}, {me.age}
            </Text>
            {me.isVerified && <VerifiedIcon />}
          </View>
          {me.photos.some((p) => p.moderationStatus === "pending") && (
            <Text variant="caption" muted>
              Some photos are waiting for review and aren’t shown to others yet.
            </Text>
          )}
        </View>
      )}

      <Section>
        <Row icon="create-outline" label="Edit profile" onPress={() => router.push("/edit-profile")} />
        <Row icon="eye-outline" label="Preview how others see me" onPress={() => router.push("/preview")} />
        <Row icon="options-outline" label="Discovery preferences" onPress={() => router.push("/preferences")} />
      </Section>
      <Section>
        <Row icon="notifications-outline" label="Notifications" detail="Push notifications arrive with the mobile builds" />
        <Row icon="shield-checkmark-outline" label="Safety center" onPress={() => router.push("/safety")} />
        <Row icon="document-text-outline" label="Terms of Service" onPress={() => router.push("/terms")} />
        <Row icon="lock-closed-outline" label="Privacy Policy" onPress={() => router.push("/privacy")} />
      </Section>

      <ErrorText>{error}</ErrorText>
      <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
        <Button title="Log out" variant="secondary" icon="log-out-outline" onPress={logOut} />
        <Button title="Delete account" variant="ghost" icon="trash-outline" onPress={deleteAccount} loading={deleting} accessibilityLabel="Delete my account permanently" />
      </View>
    </Screen>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return <View style={{ backgroundColor: colors.surface, borderRadius: radii.lg, marginBottom: spacing.md, overflow: "hidden" }}>{children}</View>;
}

function Row({ icon, label, detail, onPress }: { icon: IconName; label: string; detail?: string; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 56, paddingHorizontal: spacing.lg, opacity: pressed ? 0.7 : 1 })}
    >
      <Ionicons name={icon} size={22} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyBold">{label}</Text>
        {detail && (
          <Text variant="caption" muted>
            {detail}
          </Text>
        )}
      </View>
      {onPress && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
    </Pressable>
  );
}
