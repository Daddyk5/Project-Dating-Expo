import { View } from "react-native";
import { spacing } from "@/theme";
import { Card, Header, Screen, Text } from "./ui";

export function LegalPage({ title, sections }: { title: string; sections: [string, string][] }) {
  return (
    <Screen scroll edges={["top", "bottom"]} header={<Header title={title} />}>
      <Card style={{ gap: spacing.xl, marginTop: spacing.sm }}>
        {sections.map(([h, body], i) => (
          <View key={h} style={{ gap: spacing.xs }}>
            <Text variant="bodyBold">
              {i + 1}. {h}
            </Text>
            <Text muted>{body}</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
