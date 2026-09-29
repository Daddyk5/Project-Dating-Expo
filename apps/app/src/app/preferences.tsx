import { router } from "expo-router";
import { PreferencesForm } from "@/components/preferences-form";
import { Button, Card, Header, Screen, Text } from "@/components/ui";
import { shareLocation } from "@/lib/device";
import { useMe, useSetMe } from "@/lib/queries";
import { spacing, useTheme } from "@/theme";

export default function Preferences() {
  const { data: me } = useMe();
  const setMe = useSetMe();
  const { colors } = useTheme();
  if (!me) return null;
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));
  return (
    <Screen scroll edges={["top", "bottom"]} header={<Header title="Discovery preferences" subtitle="Who shows up in Discover and Nearby" onBack={back} />}>
      {!me.hasLocation && (
        <Card style={{ gap: spacing.sm, marginTop: spacing.sm, backgroundColor: colors.primarySoft, borderColor: colors.primary }}>
          <Text variant="bodyBold">Location is off</Text>
          <Text muted>Share your location to see distances and people nearby.</Text>
          <Button title="Share my location" size="sm" icon="location-outline" onPress={() => shareLocation().then(setMe).catch(() => {})} />
        </Card>
      )}
      <Card style={{ marginTop: spacing.lg }}>
        <PreferencesForm me={me} onSaved={back} />
      </Card>
    </Screen>
  );
}
