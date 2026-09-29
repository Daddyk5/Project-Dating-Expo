import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Button, ErrorText, Header, Screen, Text, TextField } from "@/components/ui";
import { requestPasswordReset } from "@/lib/auth";
import { spacing, useTheme } from "@/theme";

export default function ForgotPassword() {
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = /.+@.+\..+/.test(email);

  const submit = async () => {
    if (!valid) return;
    setLoading(true);
    setError(null);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll edges={["top", "bottom"]}>
      <Header title="" onBack={() => (router.canGoBack() ? router.back() : router.replace("/sign-in"))} />
      {sent ? (
        <View style={{ alignItems: "center", gap: spacing.md, paddingVertical: spacing.xxxl }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="mail-open-outline" size={40} color={colors.primary} />
          </View>
          <Text variant="title" accessibilityRole="header" style={{ textAlign: "center" }}>
            Check your inbox
          </Text>
          <Text muted style={{ textAlign: "center" }} accessibilityLiveRegion="polite">
            If an account exists for {email.trim()}, we’ve sent a link to reset your password. It may take a minute to arrive — check spam too.
          </Text>
          <Button title="Back to sign in" onPress={() => router.replace("/sign-in")} style={{ alignSelf: "stretch", marginTop: spacing.lg }} />
          <Button title="Use a different email" variant="ghost" onPress={() => setSent(false)} />
        </View>
      ) : (
        <View style={{ gap: spacing.lg, marginTop: spacing.md }}>
          <View style={{ gap: spacing.xs }}>
            <Text variant="display" accessibilityRole="header">
              Reset password
            </Text>
            <Text muted>Enter the email you signed up with and we’ll send you a reset link.</Text>
          </View>
          <TextField
            label="Email"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            placeholder="you@example.com"
            onSubmitEditing={submit}
            autoFocus
          />
          <ErrorText>{error}</ErrorText>
          <Button title="Send reset link" icon="paper-plane-outline" onPress={submit} loading={loading} disabled={!valid} />
        </View>
      )}
    </Screen>
  );
}
