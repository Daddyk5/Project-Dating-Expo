import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { MatchesList, type MatchFilter } from "@/components/matches-list";
import { Avatar, Screen, Segmented, Text, TextField } from "@/components/ui";
import { useLikes, useMatches } from "@/lib/queries";
import { radii, spacing, useTheme } from "@/theme";

export default function Matches() {
  const { data } = useMatches();
  const [filter, setFilter] = useState<MatchFilter>("all");
  const [query, setQuery] = useState("");
  const unread = data?.filter((m) => m.unreadCount > 0).length ?? 0;
  const fresh = data?.filter((m) => !m.lastMessage).length ?? 0;

  return (
    <Screen>
      <View style={{ gap: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.lg }}>
        <View>
          <Text variant="display" accessibilityRole="header">
            Matches
          </Text>
          <Text muted>{data?.length ? `${data.length} connection${data.length === 1 ? "" : "s"}` : "Your connections live here"}</Text>
        </View>
        <LikesBanner />
        {!!data?.length && (
          <>
            <TextField label="Search matches" icon="search-outline" value={query} onChangeText={setQuery} placeholder="Search by name" autoCapitalize="none" />
            <Segmented<MatchFilter>
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All" },
                { value: "unread", label: "Unread", badge: unread },
                { value: "new", label: "New", badge: fresh },
              ]}
            />
          </>
        )}
      </View>
      <MatchesList filter={filter} query={query} />
    </Screen>
  );
}

/** Entry point to "Likes you": stacked faces + count. Hidden when nobody is waiting. */
function LikesBanner() {
  const { colors } = useTheme();
  const likes = useLikes().data ?? [];
  if (!likes.length) return null;
  const n = likes.length;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${n} ${n === 1 ? "person likes" : "people like"} you. See who`}
      onPress={() => router.push("/likes")}
      style={({ pressed }) => [
        { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radii.lg },
        { backgroundColor: colors.goldSoft, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={{ flexDirection: "row" }}>
        {/* Faces with photos first, so the stack rarely shows a placeholder. */}
        {[...likes].sort((a, b) => Number(!a.profile.photos.length) - Number(!b.profile.photos.length)).slice(0, 3).map((l, i) => (
          <View key={l.profile.id} style={{ marginLeft: i ? -14 : 0, borderWidth: 2, borderColor: colors.goldSoft, borderRadius: 22 }}>
            <Avatar uri={l.profile.photos[0]?.url} size={40} />
          </View>
        ))}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyBold">
          {n} {n === 1 ? "person likes" : "people like"} you
        </Text>
        <Text variant="caption" muted>
          Like them back to match instantly
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.goldDeep} />
    </Pressable>
  );
}
