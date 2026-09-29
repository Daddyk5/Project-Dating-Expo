import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { formatDistance } from "@/components/profile-card";
import { ReportSheet } from "@/components/safety-sheet";
import { Button, Chip, DemoBadge, EmptyState, IconButton, OnlineDot, Screen, Skeleton, Text, VerifiedIcon } from "@/components/ui";
import { api } from "@/lib/api";
import { confirm } from "@/lib/confirm";
import { keys, queryClient, useProfile } from "@/lib/queries";
import { MAX_CONTENT_WIDTH, radii, spacing, useTheme } from "@/theme";

export default function FullProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const q = useProfile(id);
  const compat = useQuery({ queryKey: keys.compat(id), queryFn: async () => (await api.compatibility(id)).summary, staleTime: Infinity, retry: false });
  const [page, setPage] = useState(0);
  const [reporting, setReporting] = useState(false);
  const photoWidth = Math.min(width, MAX_CONTENT_WIDTH) - spacing.lg * 2;
  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const afterBlock = () => {
    queryClient.invalidateQueries({ queryKey: keys.matches });
    queryClient.invalidateQueries({ queryKey: keys.discover });
    router.replace("/");
  };

  if (q.isError) {
    return (
      <Screen>
        <EmptyState icon="person-outline" title="Profile unavailable" message="This profile isn't available anymore." action={{ label: "Close", onPress: close }} />
      </Screen>
    );
  }
  const p = q.data;

  return (
    <Screen scroll edges={["top", "bottom"]}>
      <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingVertical: spacing.sm }}>
        <IconButton icon="close" label="Close profile" onPress={close} background={colors.surface} />
      </View>
      {!p ? (
        <View style={{ gap: spacing.md }}>
          <Skeleton style={{ width: "100%", aspectRatio: 3 / 4, borderRadius: radii.xl }} />
          <Skeleton style={{ height: 24, width: "50%" }} />
          <Skeleton style={{ height: 60 }} />
        </View>
      ) : (
        <View style={{ gap: spacing.lg }}>
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / photoWidth))}
              onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / photoWidth))}
              scrollEventThrottle={64}
              style={{ borderRadius: radii.xl }}
            >
              {p.photos.map((ph, i) => (
                <Image
                  key={ph.id}
                  source={{ uri: ph.url }}
                  style={{ width: photoWidth, aspectRatio: 3 / 4 }}
                  contentFit="cover"
                  accessibilityLabel={`${p.displayName}, photo ${i + 1} of ${p.photos.length}`}
                />
              ))}
            </ScrollView>
            {p.photos.length > 1 && (
              <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: spacing.sm }}>
                {p.photos.map((ph, i) => (
                  <View key={ph.id} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i === page ? colors.primary : colors.border }} />
                ))}
              </View>
            )}
          </View>

          <View style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" }}>
              <Text variant="title" accessibilityRole="header">
                {p.displayName}, {p.age}
              </Text>
              {p.isVerified && <VerifiedIcon />}
              {p.isOnline && <OnlineDot size={12} />}
              {p.isDemo && <DemoBadge />}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
              <Ionicons name="location-outline" size={16} color={colors.textMuted} />
              <Text muted>{[p.city, p.distanceKm != null ? `${formatDistance(p.distanceKm)} away` : null].filter(Boolean).join(" · ")}</Text>
            </View>
          </View>

          {compat.data && (
            <View style={{ flexDirection: "row", gap: spacing.sm, backgroundColor: colors.chipSelected, borderRadius: radii.md, padding: spacing.md }}>
              <Ionicons name="sparkles" size={18} color={colors.primary} />
              <Text style={{ flex: 1 }}>{compat.data}</Text>
            </View>
          )}

          {p.bio ? (
            <View style={{ gap: spacing.xs }}>
              <Text variant="bodyBold">About</Text>
              <Text>{p.bio}</Text>
            </View>
          ) : null}

          <View style={{ gap: spacing.sm }}>
            <Text variant="bodyBold">Interests</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {p.interests.map((i) => (
                <Chip key={i} label={i} />
              ))}
            </View>
          </View>

          <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
            <Button
              title={`Block ${p.displayName}`}
              variant="secondary"
              icon="ban"
              onPress={async () => {
                if (await confirm(`Block ${p.displayName}?`, "They won't see you or be able to message you.", "Block", true)) {
                  await api.block(p.id);
                  afterBlock();
                }
              }}
            />
            <Button title={`Report ${p.displayName}`} variant="ghost" icon="flag" onPress={() => setReporting(true)} />
          </View>
          <ReportSheet
            userId={p.id}
            name={p.displayName}
            visible={reporting}
            onClose={() => setReporting(false)}
            onDone={(blocked) => {
              setReporting(false);
              if (blocked) afterBlock();
            }}
          />
        </View>
      )}
    </Screen>
  );
}
