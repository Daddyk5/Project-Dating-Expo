import { router } from "expo-router";
import { View } from "react-native";
import { PreferencesForm } from "@/components/preferences-form";
import { Button, IconButton, Screen, Text } from "@/components/ui";
import { shareLocation } from "@/lib/device";
import { useMe, useSetMe } from "@/lib/queries";
import { spacing } from "@/theme";

export default function Preferences() {
  const { data: me } = useMe();
  const setMe = useSetMe();
  if (!me) return null;
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));
  return (
    <Screen scroll edges={["top", "bottom"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm }}>
        <IconButton icon="chevron-back" label="Back" onPress={back} />
        <Text variant="heading" accessibilityRole="header">
          Discovery preferences
        </Text>
      </View>
      <PreferencesForm me={me} onSaved={back} />
      {!me.hasLocation && (
        <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
          <Text muted>Share your location to see distances and people nearby.</Text>
          <Button title="Share my location" variant="secondary" icon="location-outline" onPress={() => shareLocation().then(setMe).catch(() => {})} />
        </View>
      )}
    </Screen>
  );
}
