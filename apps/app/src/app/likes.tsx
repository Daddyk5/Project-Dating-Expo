import Ionicons from "@expo/vector-icons/Ionicons";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, useWindowDimensions, View } from "react-native";
import type { IncomingLike, SwipeAction } from "@kxq/shared";
import { describeProfile, formatDistance } from "@/components/profile-card";
import { SwipeDeck, type DeckHandle } from "@/components/swipe-deck";
import { Button, DemoBadge, EmptyState, ErrorText, Header, IconButton, OnlineDot, Screen, Skeleton, Text, VerifiedIcon } from "@/components/ui";
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
  const [reviewing, setReviewing] = useState(false);
  const deck = useRef<DeckHandle>(null);
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
  const inDeck = reviewing && count > 0;
  return (
    <Screen
      wide
      edges={["top", "bottom"]}
      header={
        <Header
          title="Likes you"
          subtitle={count ? `${count} ${count === 1 ? "person" : "people"}${supers ? ` · ${supers} super like${supers === 1 ? "" : "s"}` : ""}` : undefined}
          right={
            count > 1 ? (
              <Button
                title={inDeck ? "Show grid" : "Review one by one"}
                icon={inDeck ? "grid-outline" : "albums-outline"}
                size="sm"
                variant="secondary"
                onPress={() => setReviewing((r) => !r)}
              />
            ) : undefined
          }
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
      ) : inDeck ? (
        <View style={{ flex: 1, gap: spacing.md, paddingTop: spacing.sm }}>
          <ErrorText>{error}</ErrorText>
          <View style={{ flex: 1 }}>
            <SwipeDeck
              ref={deck}
              profiles={q.data!.map((l) => l.profile)}
              onSwipe={(profile, action) => {
                const like = q.data!.find((l) => l.profile.id === profile.id);
                if (like) respond(like, action === "superlike" ? "like" : action);
              }}
              onOpen={(p) => router.push(`/profile/${p.id}`)}
            />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: spacing.xl, paddingBottom: spacing.md }}>
            <IconButton icon="close" label="Pass" onPress={() => deck.current?.swipe("pass")} color={colors.pass} elevated diameter={66} size={32} />
            <IconButton icon="heart" label="Like back" onPress={() => deck.current?.swipe("like")} color={colors.onPrimary} background={colors.primaryFill} elevated diameter={66} size={32} />
          </View>
        </View>
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
                <View style={[styles.tile, { flex: 1 / cols, borderColor: l.superlike ? colors.superlike : "transparent" }]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${l.superlike ? "Super liked you: " : "Liked you: "}${describeProfile(p)}. Open profile`}
                    onPress={() => router.push(`/profile/${p.id}`)}
                    style={({ pressed }) => [StyleSheet.absoluteFill, { opacity: pressed ? 0.85 : 1 }]}
                  >
                    {p.photos[0] ? (
                      <Image source={{ uri: p.photos[0].url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    ) : (
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }]}>
                        <Ionicons name="person" size={56} color={colors.primary} />
                      </View>
                    )}
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
                  {/* Slim action bar on the photo: a sibling of the tile's button, not nested inside it. */}
                  <View style={styles.bar}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Pass on ${p.displayName}`}
                      onPress={() => respond(l, "pass")}
                      style={({ pressed }) => [styles.barButton, { backgroundColor: pressed ? "rgba(255,255,255,0.12)" : "transparent" }]}
                    >
                      <Ionicons name="close" size={22} color="#FFFFFF" />
                    </Pressable>
                    <View style={styles.barDivider} />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Like ${p.displayName} back`}
                      onPress={() => respond(l, "like")}
                      style={({ pressed }) => [styles.barButton, { backgroundColor: pressed ? "rgba(255,255,255,0.12)" : "transparent" }]}
                    >
                      <Ionicons name="heart" size={22} color="#FF6B9A" />
                    </Pressable>
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

const BAR = 44; // full touch-target height

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingTop: spacing.sm },
  tile: { aspectRatio: 3 / 4, borderRadius: radii.lg, overflow: "hidden", borderWidth: 2, boxShadow: "0px 6px 18px rgba(0,0,0,0.12)" },
  badges: { position: "absolute", top: 8, left: 8, right: 8, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  superBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.pill },
  // Bottom padding leaves room for the action bar under the name.
  caption: { position: "absolute", left: 0, right: 0, bottom: 0, padding: spacing.sm, paddingTop: spacing.xxl, paddingBottom: BAR + spacing.sm },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, height: BAR, flexDirection: "row", backgroundColor: "rgba(12,6,16,0.55)" },
  barButton: { flex: 1, alignItems: "center", justifyContent: "center" },
  barDivider: { width: StyleSheet.hairlineWidth, marginVertical: 10, backgroundColor: "rgba(255,255,255,0.35)" },
});
