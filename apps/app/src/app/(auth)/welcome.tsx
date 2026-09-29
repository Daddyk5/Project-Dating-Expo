import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Platform, View } from "react-native";
import { Button, ErrorText, Screen, Text } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { spacing, useTheme } from "@/theme";

export default function Welcome() {
  const { colors } = useTheme();
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);

  return (
    <Screen edges={["top", "bottom"]}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
          <Ionicons name="heart-circle" size={88} color={colors.primary} accessibilityElementsHidden />
          <Ionicons name="star" size={28} color={colors.gold} style={{ marginLeft: -18, marginBottom: 56 }} accessibilityElementsHidden />
        </View>
        <Text variant="display" accessibilityRole="header">
          KingxQueen
        </Text>
        <Text muted style={{ textAlign: "center", maxWidth: 320 }}>
          Meet people nearby who are into the same things you are.
        </Text>
      </View>

      <View style={{ gap: spacing.md, paddingBottom: spacing.xl }}>
        <Button title="Create account" onPress={() => router.push("/sign-up")} />
        <Button title="Sign in" variant="secondary" onPress={() => router.push("/sign-in")} />
        {Platform.OS === "web" && (
          <Button
            title="Continue with Google"
            icon="logo-google"
            variant="ghost"
            onPress={() => signInWithGoogle().catch((e) => setError((e as Error).message))}
          />
        )}
        <ErrorText>{error}</ErrorText>
        <Text variant="caption" muted style={{ textAlign: "center" }}>
          KingxQueen is for adults 18 and over. By continuing you agree to our{" "}
          <Link href="/terms" style={{ color: colors.primary, textDecorationLine: "underline" }}>
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" style={{ color: colors.primary, textDecorationLine: "underline" }}>
            Privacy Policy
          </Link>
          .
        </Text>
      </View>
    </Screen>
  );
}
