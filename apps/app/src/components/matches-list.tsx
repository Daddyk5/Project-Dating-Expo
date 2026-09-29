import Ionicons from "@expo/vector-icons/Ionicons";
import { router, usePathname } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { MatchSummary } from "@kxq/shared";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/device";
import { useMatches } from "@/lib/queries";
import { radii, spacing, TOUCH, useTheme } from "@/theme";
import { Avatar, DemoBadge, EmptyState, Skeleton, Text } from "./ui";

const openChat = (m: MatchSummary) => router.push(`/chat/${m.id}`);

export type MatchFilter = "all" | "unread" | "new";

/** New-matches row + conversations list. Used by the Matches tab and the desktop sidebar. */
export function MatchesList({ compact, filter = "all", query = "" }: { compact?: boolean; filter?: MatchFilter; query?: string }) {
  const { data, isLoading } = useMatches();
  const { user } = useAuth();
  const pathname = usePathname();
  const { colors } = useTheme();

  if (isLoading) return <MatchesSkeleton />;
  if (!data?.length) {
    return (
      <EmptyState
        icon="heart-outline"
        title="No matches yet"
        message="Keep swiping — when someone likes you back, they'll show up here."
        action={compact ? undefined : { label: "Start swiping", onPress: () => router.navigate("/") }}
      />
    );
  }

  const q = query.trim().toLowerCase();
  const visible = data.filter(
    (m) =>
      (!q || m.other.displayName.toLowerCase().includes(q)) &&
      (filter === "all" || (filter === "unread" ? m.unreadCount > 0 : !m.lastMessage)),
  );
  if (!visible.length) {
    return (
      <EmptyState
        icon={q ? "search-outline" : filter === "unread" ? "checkmark-done-outline" : "sparkles-outline"}
        title={q ? "No matches found" : filter === "unread" ? "You're all caught up" : "No new matches"}
        message={q ? `Nobody named “${query.trim()}” in your matches.` : filter === "unread" ? "No unread messages right now." : "Everyone you've matched with already has a conversation going."}
      />
    );
  }
  const fresh = visible.filter((m) => !m.lastMessage);
  const conversations = visible.filter((m) => m.lastMessage);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
      {fresh.length > 0 && (
        <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
          <Text variant="overline" muted>
            New matches · {fresh.length}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
            {fresh.map((m) => (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                accessibilityLabel={`New match with ${m.other.displayName}. Say hi`}
                onPress={() => openChat(m)}
                style={{ alignItems: "center", width: 76, gap: 6 }}
              >
                <Avatar uri={m.other.photos[0]?.url} size={64} ring online={m.other.isOnline} />
                <Text variant="caption" numberOfLines={1}>
                  {m.other.displayName}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {conversations.length > 0 && (
        <Text variant="overline" muted style={{ marginBottom: spacing.sm }}>
          Messages
        </Text>
      )}
      {conversations.map((m) => {
        const last = m.lastMessage!;
        const mine = last.senderId === user?.id;
        const active = pathname === `/chat/${m.id}`;
        // A flagged message is previewed neutrally; the full warning lives inside the chat.
        const held = last.flagged && !mine;
        const preview = held ? "Message held for review" : `${mine ? "You: " : ""}${last.body}`;
        return (
          <Pressable
            key={m.id}
            accessibilityRole="button"
            accessibilityLabel={`Chat with ${m.other.displayName}. ${m.unreadCount ? `${m.unreadCount} unread. ` : ""}Last message: ${preview}`}
            onPress={() => openChat(m)}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: active ? colors.primarySoft : pressed ? colors.surface : "transparent" },
            ]}
          >
            <Avatar uri={m.other.photos[0]?.url} size={56} online={m.other.isOnline} />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <Text variant="bodyBold" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {m.other.displayName}
                </Text>
                {m.other.isDemo && <DemoBadge />}
                <Text variant="caption" muted style={{ marginLeft: "auto" }}>
                  {timeAgo(last.createdAt)}
                </Text>
              </View>
              {held ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="shield-half-outline" size={14} color={colors.textMuted} />
                  <Text variant="small" muted numberOfLines={1} style={{ fontStyle: "italic" }}>
                    {preview}
                  </Text>
                </View>
              ) : (
                <Text variant="small" muted={!m.unreadCount} numberOfLines={1} style={m.unreadCount ? { fontWeight: "600" } : undefined}>
                  {preview}
                </Text>
              )}
            </View>
            {m.unreadCount > 0 && (
              <View style={[styles.unread, { backgroundColor: colors.primaryFill }]}>
                <Text variant="caption" style={{ color: colors.onPrimary }}>
                  {m.unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
      {!compact && conversations.length === 0 && (
        <View style={styles.hint}>
          <Ionicons name="chatbubbles-outline" size={20} color={colors.textMuted} />
          <Text variant="small" muted>
            Tap a new match to start the conversation.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

export function MatchesSkeleton() {
  return (
    <View style={{ gap: spacing.lg }} accessibilityLabel="Loading matches">
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} style={{ width: 68, height: 68, borderRadius: 34 }} />
        ))}
      </View>
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={{ flexDirection: "row", gap: spacing.md, alignItems: "center" }}>
          <Skeleton style={{ width: 56, height: 56, borderRadius: 28 }} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton style={{ height: 14, width: "40%" }} />
            <Skeleton style={{ height: 12, width: "75%" }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: TOUCH + 20, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radii.md },
  unread: { minWidth: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  hint: { flexDirection: "row", gap: spacing.sm, alignItems: "center", paddingTop: spacing.md },
});
