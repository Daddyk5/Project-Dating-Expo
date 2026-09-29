import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Button, ErrorText, IconButton, Screen, Text, TextField } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { spacing } from "@/theme";

export default function SignIn() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
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
      <IconButton icon="chevron-back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/welcome"))} />
      <View style={{ gap: spacing.lg, marginTop: spacing.lg }}>
        <Text variant="title" accessibilityRole="header">
          Welcome back
        </Text>
        <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" inputMode="email" />
        <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" onSubmitEditing={submit} />
        <ErrorText>{error}</ErrorText>
        <Button title="Sign in" onPress={submit} loading={loading} disabled={!email || !password} />
        <Button title="New here? Create an account" variant="ghost" onPress={() => router.replace("/sign-up")} />
      </View>
    </Screen>
  );
}
