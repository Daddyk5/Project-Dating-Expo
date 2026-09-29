import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { MIN_PASSWORD, PasswordStrength } from "@/components/password-strength";
import { Button, ErrorText, Header, Screen, Text, TextField } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { spacing, TOUCH, useTheme } from "@/theme";

export default function SignUp() {
  const { colors } = useTheme();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adult, setAdult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = name.trim().length >= 2 && /.+@.+\..+/.test(email) && password.length >= MIN_PASSWORD && adult;

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      await signUp(name.trim(), email.trim(), password);
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
            Create your account
          </Text>
          <Text muted>It takes about two minutes. You can edit everything later.</Text>
        </View>
        <TextField label="First name" icon="person-outline" value={name} onChangeText={setName} autoComplete="given-name" />
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
        <View style={{ gap: spacing.sm }}>
          <TextField
            label="Password"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            hint="At least 8 characters. Mix in numbers and symbols for a stronger password."
          />
          <PasswordStrength password={password} />
        </View>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: adult }}
          accessibilityLabel="I confirm I am 18 or older"
          onPress={() => setAdult((a) => !a)}
          style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: TOUCH }}
        >
          <Ionicons name={adult ? "checkbox" : "square-outline"} size={26} color={adult ? colors.primary : colors.textMuted} />
          <Text style={{ flex: 1 }}>
            I’m 18 or older and agree to the{" "}
            <Link href="/terms" style={{ color: colors.primary, fontWeight: "600" }}>
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" style={{ color: colors.primary, fontWeight: "600" }}>
              Privacy Policy
            </Link>
            .
          </Text>
        </Pressable>
        <ErrorText>{error}</ErrorText>
        <Button title="Create account" onPress={submit} loading={loading} disabled={!valid} />
        <Button title="Already have an account? Sign in" variant="ghost" onPress={() => router.replace("/sign-in")} />
      </View>
    </Screen>
  );
}
