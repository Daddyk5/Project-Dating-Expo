import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Button, ErrorText, IconButton, Screen, Text, TextField } from "@/components/ui";
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

  const valid = name.trim().length >= 2 && /.+@.+\..+/.test(email) && password.length >= 8 && adult;

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
      <IconButton icon="chevron-back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/welcome"))} />
      <View style={{ gap: spacing.lg, marginTop: spacing.lg }}>
        <Text variant="title" accessibilityRole="header">
          Create your account
        </Text>
        <TextField label="First name" value={name} onChangeText={setName} autoComplete="given-name" />
        <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" inputMode="email" />
        <TextField
          label="Password (8+ characters)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          error={password && password.length < 8 ? "Use at least 8 characters" : null}
        />
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: adult }}
          accessibilityLabel="I confirm I am 18 or older"
          onPress={() => setAdult((a) => !a)}
          style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: TOUCH }}
        >
          <Ionicons name={adult ? "checkbox" : "square-outline"} size={26} color={adult ? colors.primary : colors.textMuted} />
          <Text style={{ flex: 1 }}>I’m 18 or older and agree to the Terms and Privacy Policy.</Text>
        </Pressable>
        <View style={{ flexDirection: "row", gap: spacing.lg }}>
          <Link href="/terms" style={{ color: colors.primary }}>
            Terms
          </Link>
          <Link href="/privacy" style={{ color: colors.primary }}>
            Privacy
          </Link>
        </View>
        <ErrorText>{error}</ErrorText>
        <Button title="Create account" onPress={submit} loading={loading} disabled={!valid} />
        <Button title="Already have an account? Sign in" variant="ghost" onPress={() => router.replace("/sign-in")} />
      </View>
    </Screen>
  );
}
