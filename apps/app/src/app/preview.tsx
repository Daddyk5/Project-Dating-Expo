import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import type { PublicProfile } from "@kxq/shared";
import { ProfileCard } from "@/components/profile-card";
import { Button, Chip, Header, Screen, Text } from "@/components/ui";
import { useMe } from "@/lib/queries";
import { spacing } from "@/theme";

/** "How others see me": the same card people get in Discover. */
export default function Preview() {
  const { data: me } = useMe();
  const [photo, setPhoto] = useState(0);
  if (!me) return null;
  const visiblePhotos = me.photos.filter((p) => p.moderationStatus === "approved");
  const asPublic: PublicProfile = { ...me, photos: visiblePhotos, distanceKm: 2, isOnline: true };

  return (
    <Screen
      scroll
      edges={["top", "bottom"]}
      header={
        <Header
          title="How others see you"
          subtitle="Tap the card to flip through photos"
          right={<Button title="Edit" size="sm" variant="secondary" onPress={() => router.push("/edit-profile")} />}
        />
      }
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next photo"
        onPress={() => setPhoto((i) => (i + 1) % Math.max(1, visiblePhotos.length))}
        style={{ aspectRatio: 3 / 4.4, width: "100%", marginTop: spacing.sm, borderRadius: 24, boxShadow: "0px 16px 40px rgba(0,0,0,0.18)" }}
      >
        <ProfileCard profile={asPublic} photoIndex={photo} compat="You both love… (people see what you have in common here)" />
      </Pressable>
      <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
        <Text variant="bodyBold">Interests</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {me.interests.map((i) => (
            <Chip key={i} label={i} />
          ))}
        </View>
        {visiblePhotos.length < me.photos.length && (
          <Text variant="caption" muted>
            Photos still in review aren’t shown to others.
          </Text>
        )}
      </View>
    </Screen>
  );
}
