import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";
import type { BlockedUser } from "@kxq/shared";
import { Avatar, Button, Card, EmptyState, ErrorText, Header, Screen, Skeleton, Text } from "@/components/ui";
import { api } from "@/lib/api";
import { confirm } from "@/lib/confirm";
import { timeAgo } from "@/lib/device";
import { keys } from "@/lib/queries";
import { spacing, useTheme } from "@/theme";

export default function Blocked() {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: keys.blocks, queryFn: async () => (await api.blocks()).blocks });
  const unblock = useMutation({
    mutationFn: (u: BlockedUser) => api.unblock(u.id),
    onSuccess: (_, u) => {
      qc.setQueryData<BlockedUser[]>(keys.blocks, (prev) => prev?.filter((b) => b.id !== u.id));
      qc.invalidateQueries({ queryKey: keys.discover });
      qc.invalidateQueries({ queryKey: keys.nearby });
    },
  });

  const ask = async (u: BlockedUser) => {
    const ok = await confirm(
      `Unblock ${u.displayName}?`,
      "They may appear in Discover and Nearby again. Your previous match and chat won’t come back.",
      "Unblock",
    );
    if (ok) unblock.mutate(u);
  };

  return (
    <Screen scroll edges={["top", "bottom"]} header={<Header title="Blocked people" subtitle={q.data?.length ? `${q.data.length} blocked` : undefined} />}>
      <View style={{ gap: spacing.md, paddingTop: spacing.sm }}>
        <Text muted>People you block can’t see your profile or message you, and you won’t see them. They aren’t told they were blocked.</Text>
        <ErrorText>{unblock.error ? (unblock.error as Error).message : null}</ErrorText>
        {q.isLoading ? (
          <Skeleton style={{ height: 160 }} />
        ) : q.isError ? (
          <EmptyState icon="cloud-offline-outline" title="Couldn’t load this list" message={(q.error as Error).message} action={{ label: "Try again", onPress: () => q.refetch() }} />
        ) : !q.data?.length ? (
          <EmptyState icon="ban-outline" title="You haven’t blocked anyone" message="You can block someone from their profile or from a chat, using the ••• menu." />
        ) : (
          <Card padded={false} style={{ overflow: "hidden" }}>
            {q.data.map((u, i) => (
              <View
                key={u.id}
                style={[styles.row, i < q.data.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
              >
                <Avatar uri={u.photoUrl ?? undefined} size={48} label={u.displayName} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyBold" numberOfLines={1}>
                    {u.displayName}
                  </Text>
                  <Text variant="caption" muted>
                    Blocked {timeAgo(u.blockedAt) === "now" ? "just now" : `${timeAgo(u.blockedAt)} ago`}
                  </Text>
                </View>
                <Button
                  title="Unblock"
                  size="sm"
                  variant="secondary"
                  accessibilityLabel={`Unblock ${u.displayName}`}
                  loading={unblock.isPending && unblock.variables?.id === u.id}
                  onPress={() => ask(u)}
                />
              </View>
            ))}
          </Card>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
});
