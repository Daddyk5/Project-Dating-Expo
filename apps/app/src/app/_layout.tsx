import Ionicons from "@expo/vector-icons/Ionicons";
import { QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Button, Text } from "@/components/ui";
import { AuthProvider, useAuth } from "@/lib/auth";
import { queryClient, useMe } from "@/lib/queries";
import { SocketProvider } from "@/lib/socket";
import { spacing, useTheme } from "@/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { dark, colors } = useTheme();
  const navTheme = dark ? DarkTheme : DefaultTheme;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SocketProvider>
              <ThemeProvider
                value={{ ...navTheme, colors: { ...navTheme.colors, background: colors.background, primary: colors.primary, card: colors.background, text: colors.text, border: colors.border } }}
              >
                <StatusBar style={dark ? "light" : "dark"} />
                <RootStack />
              </ThemeProvider>
            </SocketProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootStack() {
  const { status } = useAuth();
  const signedIn = status === "signedIn";
  const me = useMe(signedIn);
  const loading = status === "loading" || (signedIn && me.isLoading);

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => {});
  }, [loading]);

  if (loading) return <BrandSplash />;
  if (signedIn && me.isError) return <ApiDown onRetry={() => me.refetch()} message={(me.error as Error).message} />;

  const onboarded = !!me.data?.onboardingComplete;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat/[matchId]" />
        <Stack.Screen name="profile/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="match" options={{ presentation: "transparentModal", animation: "fade" }} />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="preferences" />
        <Stack.Screen name="preview" />
        <Stack.Screen name="safety" />
      </Stack.Protected>
      <Stack.Screen name="terms" />
      <Stack.Screen name="privacy" />
    </Stack>
  );
}

function BrandSplash() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, gap: spacing.md }}>
      <Ionicons name="heart-circle" size={72} color={colors.primary} />
      <Text variant="title">KingxQueen</Text>
    </View>
  );
}

function ApiDown({ onRetry, message }: { onRetry(): void; message: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, gap: spacing.md, padding: spacing.xl }}>
      <Ionicons name="cloud-offline-outline" size={48} color={colors.primary} />
      <Text variant="heading">Can’t reach KingxQueen</Text>
      <Text muted style={{ textAlign: "center" }}>
        {message}
      </Text>
      <Button title="Try again" onPress={onRetry} />
    </View>
  );
}
