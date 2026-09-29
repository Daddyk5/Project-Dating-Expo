import { MatchesList } from "@/components/matches-list";
import { Screen, Text } from "@/components/ui";
import { spacing } from "@/theme";

export default function Matches() {
  return (
    <Screen>
      <Text variant="heading" accessibilityRole="header" style={{ paddingVertical: spacing.md }}>
        Matches
      </Text>
      <MatchesList />
    </Screen>
  );
}
