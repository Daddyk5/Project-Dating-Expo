import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { FlatList, Pressable, RefreshControl, StyleSheet, useWindowDimensions, View } from "react-native";
import { describeProfile, formatDistance } from "@/components/profile-card";
import { DemoBadge, EmptyState, OnlineDot, Screen, Skeleton, Text, VerifiedIcon } from "@/components/ui";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";
import { MAX_CONTENT_WIDTH, radii, spacing, WIDE_BREAKPOINT } from "@/theme";

/** Badoo-style People Nearby: a grid sorted by distance with online-now dots. */
export default function Nearby() {
  const { width } = useWindowDimensions();
  const q = useQuery({ queryKey: keys.nearby, queryFn: async () => (await api.nearby(50)).profiles });
  const available = Math.min(width >= WIDE_BREAKPOINT ? width - 340 : width, width >= WIDE_BREAKPOINT ? 1000 : MAX_CONTENT_WIDTH * 2);
  const cols = available >= 900 ? 4 : available >= 600 ? 3 : 2;

  return (
    <Screen wide>
      <Text variant="heading" accessibilityRole="header" style={{ paddingVertical: spacing.md }}>
        People nearby
      </Text>
      {q.isLoading ? (
        <View style={styles.grid}>
          {Array.from({ length: cols * 3 }, (_, i) => (
            <Skeleton key={i} style={{ width: `${100 / cols - 2}%`, aspectRatio: 3 / 4, borderRadius: radii.lg }} />
          ))}
        </View>
      ) : !q.data?.length ? (
        <EmptyState
          icon="location-outline"
          title="No one nearby yet"
          message="Try widening your distance, or share your location so we can find people around you."
          action={{ label: "Open preferences", onPress: () => router.push("/preferences") }}
        />
      ) : (
        <FlatList
          key={cols}
          data={q.data}
          numColumns={cols}
          keyExtractor={(p) => p.id}
          columnWrapperStyle={{ gap: spacing.sm }}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xl }}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} />}
          renderItem={({ item: p }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${describeProfile(p)}${p.isOnline ? ", online now" : ""}`}
              onPress={() => router.push(`/profile/${p.id}`)}
              style={({ pressed }) => [styles.tile, { flex: 1 / cols, opacity: pressed ? 0.85 : 1 }]}
            >
              <Image source={{ uri: p.photos[0]?.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
              {p.isDemo && (
                <View style={{ position: "absolute", top: 8, left: 8 }}>
                  <DemoBadge />
                </View>
              )}
              <LinearGradient colors={["transparent", "rgba(0,0,0,0.8)"]} style={styles.caption}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  {p.isOnline && <OnlineDot />}
                  <Text variant="bodyBold" style={{ color: "#FFF", flexShrink: 1 }} numberOfLines={1}>
                    {p.displayName}, {p.age}
                  </Text>
                  {p.isVerified && <VerifiedIcon />}
                </View>
                <Text variant="caption" style={{ color: "#EEE" }}>
                  {p.distanceKm != null ? formatDistance(p.distanceKm) : p.city ?? ""}
                </Text>
              </LinearGradient>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tile: { aspectRatio: 3 / 4, borderRadius: radii.lg, overflow: "hidden" },
  caption: { position: "absolute", left: 0, right: 0, bottom: 0, padding: spacing.sm, paddingTop: spacing.xxl },
});
