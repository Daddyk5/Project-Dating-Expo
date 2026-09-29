import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, View } from "react-native";
import type { PublicProfile, SwipeAction } from "@kxq/shared";
import { SwipeDeck, type DeckHandle } from "@/components/swipe-deck";
import { EmptyState, ErrorText, IconButton, Logo, Screen, Skeleton, Text } from "@/components/ui";
import { api } from "@/lib/api";
import { haptic } from "@/lib/device";
import { keys } from "@/lib/queries";
import { useSettings } from "@/lib/settings";
import { radii, spacing, useTheme } from "@/theme";

export default function Discover() {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const { keyboardHints } = useSettings();
  const deckRef = useRef<DeckHandle>(null);
  // The deck is derived: server candidates, minus cards swiped optimistically, plus undo-restored cards.
  const [swiped, setSwiped] = useState<ReadonlySet<string>>(() => new Set());
  const [restored, setRestored] = useState<PublicProfile[]>([]);
  const [lastPass, setLastPass] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const discover = useQuery({ queryKey: keys.discover, queryFn: async () => (await api.discover(20)).profiles, staleTime: 0 });

  const deck = useMemo(() => {
    const seen = new Set<string>();
    return [...restored, ...(discover.data ?? [])].filter((p) => {
      if (swiped.has(p.id) || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [restored, discover.data, swiped]);

  // Keep the deck topped up so the next card is always ready.
  useEffect(() => {
    if (deck.length < 4 && discover.isSuccess && !discover.isFetching && discover.data.length > deck.length) discover.refetch();
  }, [deck.length, discover]);

  const top = deck[0];
  const [dwelled, setDwelled] = useState<string | null>(null);
  useEffect(() => {
    if (!top) return;
    const t = setTimeout(() => setDwelled(top.id), 700); // only ask the AI for cards people linger on
    return () => clearTimeout(t);
  }, [top]);
  const compat = useQuery({
    queryKey: keys.compat(top?.id ?? ""),
    queryFn: async () => (await api.compatibility(top!.id)).summary,
    enabled: !!top && dwelled === top.id,
    staleTime: Infinity,
    retry: false,
  });

  const onSwipe = useCallback(
    (profile: PublicProfile, action: SwipeAction) => {
      haptic.swipe();
      setSwiped((s) => new Set(s).add(profile.id)); // optimistic: the card leaves immediately
      setRestored((r) => r.filter((p) => p.id !== profile.id));
      setLastPass(action === "pass" ? profile : null);
      setError(null);
      api
        .swipe(profile.id, action)
        .then((r) => {
          if (r.matched && r.matchId) {
            haptic.match();
            qc.invalidateQueries({ queryKey: keys.matches });
            router.push({ pathname: "/match", params: { matchId: r.matchId, otherId: profile.id } });
          }
        })
        .catch((e) => {
          setSwiped((s) => {
            const next = new Set(s);
            next.delete(profile.id);
            return next;
          });
          setRestored((r) => [profile, ...r]);
          setError((e as Error).message);
        });
    },
    [qc],
  );

  const undo = async () => {
    if (!lastPass) return;
    try {
      const { profile } = await api.undo();
      setSwiped((s) => {
        const next = new Set(s);
        next.delete(profile.id);
        return next;
      });
      setRestored((r) => [profile, ...r.filter((p) => p.id !== profile.id)]);
      setLastPass(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const open = useCallback((p: PublicProfile) => router.push(`/profile/${p.id}`), []);

  // Web: ← pass, → like, ↑ super like.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const action = ({ ArrowLeft: "pass", ArrowRight: "like", ArrowUp: "superlike" } as const)[e.key as "ArrowLeft"];
      if (action) {
        e.preventDefault();
        deckRef.current?.swipe(action);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const loading = discover.isLoading && deck.length === 0;
  const empty = !loading && deck.length === 0 && !discover.isFetching;

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.sm }}>
        <View accessibilityRole="header" accessibilityLabel="Discover">
          <Logo size={30} wordmark />
        </View>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <IconButton icon="diamond-outline" label="KingxQueen Royal" onPress={() => router.push("/premium")} color={colors.goldDeep} elevated diameter={40} size={20} />
          <IconButton icon="options-outline" label="Discovery preferences" onPress={() => router.push("/preferences")} elevated diameter={40} size={20} />
        </View>
      </View>

      <View style={{ flex: 1, marginBottom: spacing.md }}>
        {loading ? (
          <Skeleton style={{ flex: 1, borderRadius: radii.xl }} />
        ) : empty ? (
          discover.isError ? (
            <EmptyState icon="cloud-offline-outline" title="Couldn't load profiles" message={(discover.error as Error).message} action={{ label: "Try again", onPress: () => discover.refetch() }} />
          ) : (
            <EmptyState
              icon="compass-outline"
              title="No one new nearby"
              message="You've seen everyone who fits your preferences. Widen your distance or age range to see more people."
              action={{ label: "Widen your distance", onPress: () => router.push("/preferences") }}
            />
          )
        ) : (
          <SwipeDeck ref={deckRef} profiles={deck} compat={compat.data} onSwipe={onSwipe} onOpen={open} />
        )}
      </View>

      <ErrorText>{error}</ErrorText>

      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: spacing.md, paddingBottom: spacing.md }}>
        <IconButton icon="arrow-undo" label="Undo last pass" onPress={undo} disabled={!lastPass} color={colors.goldDeep} elevated diameter={48} size={22} />
        <IconButton icon="close" label="Pass" onPress={() => deckRef.current?.swipe("pass")} disabled={!top} color={colors.pass} elevated diameter={66} size={32} />
        <IconButton icon="star" label="Super like" onPress={() => deckRef.current?.swipe("superlike")} disabled={!top} color={colors.superlike} elevated diameter={52} size={24} />
        <IconButton icon="heart" label="Like" onPress={() => deckRef.current?.swipe("like")} disabled={!top} color={colors.onPrimary} background={colors.primary} elevated diameter={66} size={32} />
        <IconButton icon="information-circle" label="View full profile" onPress={() => top && open(top)} disabled={!top} color={colors.textMuted} elevated diameter={48} size={22} />
      </View>
      {Platform.OS === "web" && keyboardHints && (
        <Text variant="caption" muted style={{ textAlign: "center", paddingBottom: spacing.sm }}>
          Tip: use ← → ↑ on your keyboard
        </Text>
      )}
    </Screen>
  );
}
