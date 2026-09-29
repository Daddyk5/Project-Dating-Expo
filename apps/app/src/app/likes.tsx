import Ionicons from "@expo/vector-icons/Ionicons";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, useWindowDimensions, View } from "react-native";
import type { IncomingLike, SwipeAction } from "@kxq/shared";
import { describeProfile, formatDistance } from "@/components/profile-card";
import { DemoBadge, EmptyState, ErrorText, Header, IconButton, OnlineDot, Screen, Skeleton, Text, VerifiedIcon } from "@/components/ui";
import { api } from "@/lib/api";
import { haptic } from "@/lib/device";
import { keys, useLikes } from "@/lib/queries";
import { MAX_CONTENT_WIDTH, radii, spacing, useTheme } from "@/theme";

/** "Likes you": people who already liked me. Liking one back is an instant match. */
export default function Likes() {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const { width } = useWindowDimensions();
  const q = useLikes();
  const [error, setError] = useState<string | null>(null);
  const cols = Math.min(width, MAX_CONTENT_WIDTH * 2) >= 600 ? 3 : 2;
  const supers = q.data?.filter((l) => l.superlike).length ?? 0;

  const respond = async (like: IncomingLike, action: SwipeAction) => {
    const { profile } = like;
    setError(null);
    haptic.swipe();
    // Optimistic: they leave the list right away.
    qc.setQueryData<IncomingLike[]>(keys.likes, (prev) => prev?.filter((l) => l.profile.id !== profile.id));
    try {
      const r = await api.swipe(profile.id, action);
      qc.invalidateQueries({ queryKey: keys.discover });
      if (r.matched && r.matchId) {
        haptic.match();
        qc.invalidateQueries({ queryKey: keys.matches });
        router.push({ pathname: "/match", params: { matchId: r.matchId, otherId: profile.id } });
      }
    } catch (e) {
      setError((e as Error).message);
      qc.invalidateQueries({ queryKey: keys.likes });
    }
  };

  const count = q.data?.length ?? 0;
  return (
    <Screen
      wide
      edges={["top", "bottom"]}
      header={
        <Header
          title="Likes you"
          subtitle={count ? `${count} ${count === 1 ? "person" : "people"}${supers ? ` · ${supers} super like${supers === 1 ? "" : "s"}` : ""}` : undefined}
        />
      }
    >
      {q.isLoading ? (
        <View style={styles.grid}>
          {Array.from({ length: cols * 2 }, (_, i) => (
            <Skeleton key={i} style={{ width: `${100 / cols - 2}%`, aspectRatio: 3 / 4, borderRadius: radii.lg }} />
          ))}
        </View>
      ) : q.isError ? (
        <EmptyState icon="cloud-offline-outline" title="Couldn’t load your likes" message={(q.error as Error).message} action={{ label: "Try again", onPress: () => q.refetch() }} />
      ) : !count ? (
        <EmptyState
          icon="heart-half-outline"
          title="No new likes yet"
          message="When someone likes you, they’ll show up here so you can like them back and match instantly. A complete profile gets noticed more."
          action={{ label: "Keep swiping", onPress: () => router.navigate("/") }}
        />
      ) : (
        <>
          <ErrorText>{error}</ErrorText>
          <FlatList
            key={cols}
            data={q.data}
            numColumns={cols}
            keyExtractor={(l) => l.profile.id}
            columnWrapperStyle={{ gap: spacing.sm }}
            contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xl, paddingTop: spacing.sm }}
            refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} />}
            renderItem={({ item: l }) => {
              const p = l.profile;
              return (
                <View style={{ flex: 1 / cols, gap: spacing.xs }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${l.superlike ? "Super liked you: " : "Liked you: "}${describeProfile(p)}. Open profile`}
                    onPress={() => router.push(`/profile/${p.id}`)}
                    style={({ pressed }) => [
                      styles.tile,
                      { opacity: pressed ? 0.85 : 1, borderColor: l.superlike ? colors.superlike : "transparent" },
                    ]}
                  >
                    <Image source={{ uri: p.photos[0]?.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    <View style={styles.badges}>
                      {l.superlike && (
                        <View style={[styles.superBadge, { backgroundColor: colors.superlike }]}>
                          <Ionicons name="star" size={12} color="#FFFFFF" />
                          <Text variant="caption" style={{ color: "#FFFFFF", fontWeight: "700" }}>
                            Super like
                          </Text>
                        </View>
                      )}
                      {p.isDemo && <DemoBadge />}
                    </View>
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
                  <View style={{ flexDirection: "row", justifyContent: "center", gap: spacing.md }}>
                    <IconButton icon="close" label={`Pass on ${p.displayName}`} onPress={() => respond(l, "pass")} color={colors.pass} elevated diameter={44} size={22} />
                    <IconButton icon="heart" label={`Like ${p.displayName} back`} onPress={() => respond(l, "like")} color={colors.onPrimary} background={colors.primary} elevated diameter={44} size={22} />
                  </View>
                </View>
              );
            }}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingTop: spacing.sm },
  tile: { aspectRatio: 3 / 4, borderRadius: radii.lg, overflow: "hidden", borderWidth: 2, boxShadow: "0px 6px 18px rgba(0,0,0,0.12)" },
  badges: { position: "absolute", top: 8, left: 8, right: 8, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  superBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.pill },
  caption: { position: "absolute", left: 0, right: 0, bottom: 0, padding: spacing.sm, paddingTop: spacing.xxl },
});
