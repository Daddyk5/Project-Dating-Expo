import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRef } from "react";
import { StyleSheet, View } from "react-native";
import type { PublicProfile } from "@kxq/shared";
import { radii, spacing, useTheme } from "@/theme";
import { DemoBadge, OnlineDot, Text, VerifiedIcon } from "./ui";

export function describeProfile(p: PublicProfile) {
  const parts = [`${p.displayName}, ${p.age}`];
  if (p.distanceKm != null) parts.push(`${formatDistance(p.distanceKm)} away`);
  if (p.isVerified) parts.push("verified");
  if (p.isDemo) parts.push("demo profile");
  return parts.join(", ");
}

export function formatDistance(km: number) {
  return km < 1 ? "less than 1 km" : `${Math.round(km)} km`;
}

/** Full-bleed photo card with progress dots and the name/details overlay. */
export function ProfileCard({
  profile,
  photoIndex,
  compat,
  compatExpanded,
  onCompatLayout,
}: {
  profile: PublicProfile;
  photoIndex: number;
  compat?: string | null;
  /** Show the whole AI line instead of two lines. */
  compatExpanded?: boolean;
  /** Where the AI line sits, in card coordinates, so the deck can make it tappable. */
  onCompatLayout?: (rect: { y: number; height: number }) => void;
}) {
  const { colors } = useTheme();
  const infoY = useRef(0);
  const photo = profile.photos[photoIndex] ?? profile.photos[0];
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {photo ? (
        <View style={[StyleSheet.absoluteFill, styles.noPointer]}>
          <Image
            source={{ uri: photo.url }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={120}
            accessibilityIgnoresInvertColors
            recyclingKey={photo.id}
          />
        </View>
      ) : null}

      {profile.photos.length > 1 && (
        <View style={styles.dots} accessibilityLabel={`Photo ${photoIndex + 1} of ${profile.photos.length}`}>
          {profile.photos.map((p, i) => (
            <View key={p.id} style={[styles.dot, { backgroundColor: i === photoIndex ? "#FFFFFF" : "rgba(255,255,255,0.4)" }]} />
          ))}
        </View>
      )}

      {profile.isDemo && (
        <View style={styles.topRight}>
          <DemoBadge />
        </View>
      )}

      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.85)"]}
        style={styles.info}
        pointerEvents="none"
        onLayout={(e) => (infoY.current = e.nativeEvent.layout.y)}
      >
        <View style={styles.row}>
          <Text variant="title" style={styles.white} numberOfLines={1}>
            {profile.displayName}
          </Text>
          <Text variant="title" style={[styles.white, { fontWeight: "400" }]}>
            {profile.age}
          </Text>
          {profile.isVerified && <VerifiedIcon />}
          {profile.isOnline && <OnlineDot />}
        </View>
        <View style={styles.row}>
          <Ionicons name="location-outline" size={16} color="#F4F4F6" />
          <Text variant="small" style={styles.white}>
            {[profile.city, profile.distanceKm != null ? `${formatDistance(profile.distanceKm)} away` : null]
              .filter(Boolean)
              .join(" · ") || "Nearby"}
          </Text>
        </View>
        {compat ? (
          <View
            style={styles.compat}
            onLayout={(e) => onCompatLayout?.({ y: infoY.current + e.nativeEvent.layout.y, height: e.nativeEvent.layout.height })}
          >
            <Ionicons name="sparkles" size={14} color="#F5B82E" />
            <Text variant="small" style={[styles.white, { flex: 1 }]} numberOfLines={compatExpanded ? undefined : 2}>
              {compat}
            </Text>
          </View>
        ) : null}
        {profile.bio ? (
          <Text variant="small" style={[styles.white, { opacity: 0.9 }]} numberOfLines={2}>
            {profile.bio}
          </Text>
        ) : null}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  // Keeps the browser's native image drag from stealing the swipe gesture on web.
  noPointer: { pointerEvents: "none" },
  card: { flex: 1, borderRadius: radii.xl, overflow: "hidden", userSelect: "none" },
  dots: { position: "absolute", top: spacing.sm, left: spacing.sm, right: spacing.sm, flexDirection: "row", gap: 4 },
  dot: { flex: 1, height: 4, borderRadius: 2 },
  topRight: { position: "absolute", top: spacing.xl, right: spacing.md },
  info: { position: "absolute", left: 0, right: 0, bottom: 0, padding: spacing.lg, paddingTop: spacing.xxxl * 2, gap: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  white: { color: "#FFFFFF" },
  compat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginTop: spacing.xs,
  },
});
