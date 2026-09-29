import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { MIN_PASSWORD, PasswordStrength } from "@/components/password-strength";
import { Button, ErrorText, Header, Screen, Text, TextField } from "@/components/ui";
import { resetPassword } from "@/lib/auth";
import { spacing, useTheme } from "@/theme";

/** Landing page for the emailed reset link: Neon Auth redirects here with ?token=… (or ?error=INVALID_TOKEN). */
export default function ResetPassword() {
  const { colors } = useTheme();
  const { token, error: linkError } = useLocalSearchParams<{ token?: string; error?: string }>();
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [done, setDone] = useState(false);
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirmPw.length > 0 && confirmPw !== password;
  const valid = password.length >= MIN_PASSWORD && confirmPw === password;

  const submit = async () => {
    if (!valid || !token) return;
    setLoading(true);
    setError(null);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (e) {
      const message = (e as Error).message;
      if (/invalid.*token|expired/i.test(message)) setExpired(true);
      else setError(message);
    } finally {
      setLoading(false);
    }
  };

  const status = (icon: "alert-circle-outline" | "checkmark-circle-outline", title: string, body: string, cta: string, go: () => void) => (
    <View style={{ alignItems: "center", gap: spacing.md, paddingVertical: spacing.xxxl }}>
      <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={40} color={colors.primary} />
      </View>
      <Text variant="title" accessibilityRole="header" style={{ textAlign: "center" }}>
        {title}
      </Text>
      <Text muted style={{ textAlign: "center" }} accessibilityLiveRegion="polite">
        {body}
      </Text>
      <Button title={cta} onPress={go} style={{ alignSelf: "stretch", marginTop: spacing.lg }} />
    </View>
  );

  return (
    <Screen scroll edges={["top", "bottom"]}>
      <Header title="" onBack={() => router.replace("/sign-in")} />
      {done
        ? status("checkmark-circle-outline", "Password updated", "You can now sign in with your new password.", "Sign in", () => router.replace("/sign-in"))
        : !token || linkError || expired
          ? status(
              "alert-circle-outline",
              "This link has expired",
              "Reset links work once and only for a short time. Request a new one and use it right away.",
              "Send a new link",
              () => router.replace("/forgot-password"),
            )
          : (
            <View style={{ gap: spacing.lg, marginTop: spacing.md }}>
              <View style={{ gap: spacing.xs }}>
                <Text variant="display" accessibilityRole="header">
                  Choose a new password
                </Text>
                <Text muted>Pick something you haven’t used here before.</Text>
              </View>
              <View style={{ gap: spacing.sm }}>
                <TextField
                  label="New password"
                  icon="lock-closed-outline"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="new-password"
                  hint={`At least ${MIN_PASSWORD} characters.`}
                  autoFocus
                />
                <PasswordStrength password={password} />
              </View>
              <TextField
                label="Confirm new password"
                icon="lock-closed-outline"
                value={confirmPw}
                onChangeText={setConfirmPw}
                secureTextEntry
                autoComplete="new-password"
                error={mismatch ? "Passwords don’t match" : null}
                onSubmitEditing={submit}
              />
              <ErrorText>{error}</ErrorText>
              <Button title="Update password" icon="key-outline" onPress={submit} loading={loading} disabled={!valid} />
            </View>
          )}
    </Screen>
  );
}
