import { Link, router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Button, ErrorText, Header, IconButton, Screen, Text, TextField } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { spacing, useTheme } from "@/theme";

export default function SignIn() {
  const { colors } = useTheme();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll edges={["top", "bottom"]}>
      <Header title="" onBack={() => (router.canGoBack() ? router.back() : router.replace("/welcome"))} />
      <View style={{ gap: spacing.lg, marginTop: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <Text variant="display" accessibilityRole="header">
            Welcome back
          </Text>
          <Text muted>Sign in to pick up where you left off.</Text>
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
        />
        <View>
          <TextField
            label="Password"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!show}
            autoComplete="current-password"
            onSubmitEditing={submit}
            style={{ paddingRight: 48 }}
          />
          <IconButton
            icon={show ? "eye-off-outline" : "eye-outline"}
            label={show ? "Hide password" : "Show password"}
            onPress={() => setShow((s) => !s)}
            size={20}
            color={colors.textMuted}
            style={{ position: "absolute", right: 4, top: 26 }}
          />
        </View>
        <View style={{ alignItems: "flex-end", marginTop: -spacing.sm }}>
          <Link href="/forgot-password" style={{ color: colors.primary, fontWeight: "600", paddingVertical: spacing.sm }}>
            Forgot password?
          </Link>
        </View>
        <ErrorText>{error}</ErrorText>
        <Button title="Sign in" onPress={submit} loading={loading} disabled={!email || !password} />
        <Button title="New here? Create an account" variant="ghost" onPress={() => router.replace("/sign-up")} />
      </View>
    </Screen>
  );
}
