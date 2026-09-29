import { router, Stack } from "expo-router";
import { View } from "react-native";
import { EmptyState, Logo, Screen } from "@/components/ui";
import { spacing } from "@/theme";

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: "Page not found" }} />
      <Screen edges={["top", "bottom"]}>
        <View style={{ paddingVertical: spacing.md }}>
          <Logo size={30} wordmark />
        </View>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState
            icon="compass-outline"
            title="This page wandered off"
            message="The link may be broken, or the page may have moved."
            action={{ label: "Go to KingxQueen", onPress: () => router.replace("/") }}
          />
        </View>
      </Screen>
    </>
  );
}
