import Constants from "expo-constants";
import { router } from "expo-router";
import { useState } from "react";
import { Platform, View } from "react-native";
import { ErrorText, Header, ListRow, Screen, Section, Segmented, Text, ToggleRow } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { confirm } from "@/lib/confirm";
import { queryClient } from "@/lib/queries";
import { updateSettings, useSettings, type Settings as AppSettings } from "@/lib/settings";
import { spacing, useTheme } from "@/theme";

export default function Settings() {
  const { colors } = useTheme();
  const settings = useSettings();
  const { user, signOut, forget } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const logOut = async () => {
    if (!(await confirm("Log out?", "You can sign back in any time.", "Log out"))) return;
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

  const toggle = (key: keyof AppSettings) => (v: boolean) => updateSettings({ [key]: v });

  return (
    <Screen scroll edges={["top", "bottom"]} header={<Header title="Settings" />}>
      <View style={{ height: spacing.sm }} />
      <Section title="Appearance">
        <View style={{ padding: spacing.md }}>
          <Segmented
            value={settings.theme}
            onChange={(theme) => updateSettings({ theme })}
            options={[
              { value: "system", label: "System" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
        </View>
      </Section>

      <Section title="Notifications" footer="Saved on this device. Push delivery arrives with the mobile store builds.">
        <ToggleRow icon="heart-outline" label="New matches" value={settings.notifyMatches} onChange={toggle("notifyMatches")} />
        <ToggleRow icon="chatbubble-outline" label="Messages" value={settings.notifyMessages} onChange={toggle("notifyMessages")} />
        <ToggleRow icon="star-outline" label="Likes & super likes" value={settings.notifyLikes} onChange={toggle("notifyLikes")} tint={colors.superlike} />
        <ToggleRow icon="bulb-outline" label="Dating tips & product news" value={settings.notifyTips} onChange={toggle("notifyTips")} tint={colors.goldDeep} last />
      </Section>

      <Section title="Discovery">
        <ListRow icon="options-outline" label="Discovery preferences" detail="Age range, distance, who you see" onPress={() => router.push("/preferences")} last={Platform.OS !== "web"} />
        {Platform.OS === "web" && (
          <ToggleRow icon="keypad-outline" label="Keyboard shortcut hints" detail="Show ← → ↑ tips on Discover" value={settings.keyboardHints} onChange={toggle("keyboardHints")} last />
        )}
      </Section>

      <Section title="Membership">
        <ListRow
          icon="diamond-outline"
          label="KingxQueen Royal"
          value={settings.royalWaitlist ? "Waitlisted" : "Free plan"}
          tint={colors.goldDeep}
          onPress={() => router.push("/premium")}
          last
        />
      </Section>

      <Section title="Account">
        <ListRow icon="mail-outline" label="Email" value={user?.email} tint={colors.textMuted} />
        <ListRow icon="key-outline" label="Change password" tint={colors.textMuted} onPress={() => router.push("/change-password")} />
        <ListRow icon="log-out-outline" label="Log out" onPress={logOut} tint={colors.textMuted} />
        <ListRow icon="trash-outline" label={deleting ? "Deleting…" : "Delete account"} detail="Permanently remove your data" destructive onPress={deleting ? undefined : deleteAccount} last />
      </Section>
      <ErrorText>{error}</ErrorText>

      <Section title="Support & legal">
        <ListRow icon="shield-checkmark-outline" label="Safety center" tint={colors.like} onPress={() => router.push("/safety")} />
        <ListRow icon="ban-outline" label="Blocked people" detail="Review or unblock" tint={colors.pass} onPress={() => router.push("/blocked")} />
        <ListRow icon="help-buoy-outline" label="Help & FAQ" tint={colors.superlike} onPress={() => router.push("/help")} />
        <ListRow icon="document-text-outline" label="Terms of Service" tint={colors.textMuted} onPress={() => router.push("/terms")} />
        <ListRow icon="lock-closed-outline" label="Privacy Policy" tint={colors.textMuted} onPress={() => router.push("/privacy")} last />
      </Section>

      <Text variant="caption" muted style={{ textAlign: "center" }}>
        KingxQueen v{Constants.expoConfig?.version ?? "1.0.0"}
      </Text>
    </Screen>
  );
}
