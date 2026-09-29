import { router } from "expo-router";
import { View } from "react-native";
import { spacing } from "@/theme";
import { IconButton, Screen, Text } from "./ui";

export function LegalPage({ title, sections }: { title: string; sections: [string, string][] }) {
  return (
    <Screen scroll edges={["top", "bottom"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm }}>
        <IconButton icon="chevron-back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
        <Text variant="heading" accessibilityRole="header">
          {title}
        </Text>
      </View>
      <View style={{ gap: spacing.lg }}>
        {sections.map(([h, body]) => (
          <View key={h} style={{ gap: spacing.xs }}>
            <Text variant="bodyBold">{h}</Text>
            <Text muted>{body}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}
