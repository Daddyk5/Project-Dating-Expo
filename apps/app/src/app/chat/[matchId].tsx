import Ionicons from "@expo/vector-icons/Ionicons";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, useWindowDimensions, View } from "react-native";
import type { MatchSummary, Message } from "@kxq/shared";
import { ActionMenu, ReportSheet } from "@/components/safety-sheet";
import { DemoBadge, EmptyState, ErrorText, IconButton, Screen, Skeleton, Text } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { confirm } from "@/lib/confirm";
import { keys, useMatches, useMessages, useSendMessage } from "@/lib/queries";
import { useSocket } from "@/lib/socket";
import { MAX_CONTENT_WIDTH, radii, spacing, TOUCH, useTheme } from "@/theme";

export default function Chat() {
  const { matchId, icebreakers: autoIcebreakers } = useLocalSearchParams<{ matchId: string; icebreakers?: string }>();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const qc = useQueryClient();
  const socket = useSocket();
  const matches = useMatches();
  const match = matches.data?.find((m) => m.id === matchId);
  const messages = useMessages(matchId);
  const send = useSendMessage(matchId, user?.id);

  const [text, setText] = useState("");
  const [otherTyping, setOtherTyping] = useState(false);
  const [ideas, setIdeas] = useState<string[] | null>(null);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [reporting, setReporting] = useState(false);
  const typingSent = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Join the match room (server verifies membership) and listen for typing.
  useEffect(() => {
    if (!socket) return;
    socket.emit("match:join", { matchId });
    const onTyping = (p: { matchId: string; isTyping: boolean }) => {
      if (p.matchId === matchId) setOtherTyping(p.isTyping);
    };
    // A new message from them ends their typing indicator.
    const onMessage = (m: Message) => {
      if (m.matchId === matchId && m.senderId !== user?.id) setOtherTyping(false);
    };
    socket.on("typing", onTyping);
    socket.on("message:new", onMessage);
    return () => {
      socket.off("typing", onTyping);
      socket.off("message:new", onMessage);
    };
  }, [socket, matchId, user?.id]);

  // Read receipts: mark the other person's messages as read whenever new ones arrive.
  const unreadFromThem = messages.data?.some((m) => m.senderId !== user?.id && !m.readAt);
  useEffect(() => {
    if (!unreadFromThem) return;
    if (socket?.connected) socket.emit("message:read", { matchId });
    else api.markRead(matchId).catch(() => {});
    qc.setQueryData<Message[]>(keys.messages(matchId), (prev) =>
      prev?.map((m) => (m.senderId !== user?.id && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m)),
    );
    qc.setQueryData<MatchSummary[]>(keys.matches, (prev) => prev?.map((m) => (m.id === matchId ? { ...m, unreadCount: 0 } : m)));
  }, [unreadFromThem, socket, matchId, qc, user?.id]);

  const loadIdeas = useCallback(async () => {
    setIdeasLoading(true);
    setError(null);
    try {
      setIdeas((await api.icebreakers(matchId)).icebreakers);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIdeasLoading(false);
    }
  }, [matchId]);

  const isDemo = !!match?.other.isDemo;
  // Coming from "It's a Match!": pre-fill icebreaker ideas for a brand-new chat (once).
  const autoLoaded = useRef(false);
  useEffect(() => {
    if (autoLoaded.current || !autoIcebreakers || !messages.data || messages.data.length > 0 || isDemo) return;
    autoLoaded.current = true;
    Promise.resolve().then(loadIdeas);
  }, [autoIcebreakers, messages.data, isDemo, loadIdeas]);

  const onChangeText = (t: string) => {
    setText(t);
    if (!socket) return;
    const now = Date.now();
    if (now - typingSent.current > 2000) {
      socket.emit("typing", { matchId, isTyping: true });
      typingSent.current = now;
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit("typing", { matchId, isTyping: false });
      typingSent.current = 0;
    }, 3000);
  };

  const canSend = !!text.trim() && !send.isPending;

  const submit = async () => {
    const body = text.trim();
    if (!body) return;
    setError(null);
    setText("");
    setIdeas(null);
    socket?.emit("typing", { matchId, isTyping: false });
    try {
      await send.mutateAsync(body);
    } catch (e) {
      setText(body);
      setError((e as Error).message);
    }
  };

  const leave = () => {
    qc.invalidateQueries({ queryKey: keys.matches });
    if (router.canGoBack()) router.back();
    else router.replace("/matches");
  };

  const unmatch = async () => {
    if (!match) return;
    if (!(await confirm(`Unmatch ${match.other.displayName}?`, "You won't be able to message each other again.", "Unmatch", true))) return;
    await api.unmatch(matchId).catch((e) => setError((e as Error).message));
    leave();
  };

  const block = async () => {
    if (!match) return;
    if (!(await confirm(`Block ${match.other.displayName}?`, "They won't see you or be able to message you.", "Block", true))) return;
    await api.block(match.other.id).catch((e) => setError((e as Error).message));
    leave();
  };

  const data = useMemo(() => [...(messages.data ?? [])].reverse(), [messages.data]); // inverted list
  const lastMineId = messages.data?.filter((m) => m.senderId === user?.id).at(-1)?.id;

  if (!matches.isLoading && !match) {
    return (
      <Screen>
        <EmptyState icon="chatbubble-ellipses-outline" title="This chat isn't available" message="The match may have ended." action={{ label: "Back to matches", onPress: () => router.replace("/matches") }} />
      </Screen>
    );
  }

  return (
    <Screen edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <IconButton icon="chevron-back" label="Back" onPress={leave} />
          {match ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View ${match.other.displayName}'s profile`}
              onPress={() => router.push(`/profile/${match.other.id}`)}
              style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1, minHeight: TOUCH }}
            >
              <Image source={{ uri: match.other.photos[0]?.url }} style={{ width: 40, height: 40, borderRadius: 20 }} />
              <View style={{ flexShrink: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                  <Text variant="bodyBold" numberOfLines={1}>
                    {match.other.displayName}
                  </Text>
                  {isDemo && <DemoBadge />}
                </View>
                <Text variant="caption" muted>
                  {otherTyping ? "typing…" : match.other.isOnline ? "Online now" : " "}
                </Text>
              </View>
            </Pressable>
          ) : (
            <Skeleton style={{ height: 40, flex: 1 }} />
          )}
          <IconButton icon="ellipsis-horizontal" label="Chat options" onPress={() => setMenu(true)} disabled={!match} />
        </View>

        {/* Messages */}
        {messages.isLoading ? (
          <ChatSkeleton />
        ) : (
          <FlatList
            inverted
            data={data}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ paddingVertical: spacing.md, gap: spacing.sm, flexGrow: 1 }}
            ListHeaderComponent={otherTyping ? <TypingBubble /> : null}
            ListEmptyComponent={
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, transform: [{ scaleY: -1 }], padding: spacing.xl }}>
                <Ionicons name="sparkles" size={32} color={colors.gold} />
                <Text muted style={{ textAlign: "center" }}>
                  {isDemo
                    ? "This is a demo profile for testing — messaging is turned off."
                    : `You matched with ${match?.other.displayName ?? "them"}! Say hi, or try an icebreaker.`}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <Bubble message={item} mine={item.senderId === user?.id} showSeen={item.id === lastMineId && !!item.readAt} />
            )}
          />
        )}

        {/* Icebreaker suggestions */}
        {ideas && ideas.length > 0 && (
          <View style={{ gap: spacing.xs, paddingTop: spacing.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="sparkles" size={14} color={colors.goldDeep} />
              <Text variant="caption" muted style={{ fontWeight: "600" }}>
                {ideas.length} {ideas.length === 1 ? "idea" : "ideas"} from what you share
              </Text>
            </View>
            {width >= 600 ? (
              // Wide screens: room to show every idea at once.
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingBottom: spacing.xs }}>
                {ideas.map((idea) => (
                  <IdeaChip key={idea} idea={idea} onPress={() => setText(idea)} />
                ))}
              </View>
            ) : (
              <View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xs, paddingRight: spacing.xxl }} style={{ flexGrow: 0 }}>
                  {ideas.map((idea) => (
                    <IdeaChip key={idea} idea={idea} onPress={() => setText(idea)} />
                  ))}
                </ScrollView>
                {/* Fade hints that the row scrolls. */}
                <LinearGradient
                  colors={["transparent", colors.background]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  pointerEvents="none"
                  style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: spacing.xxl }}
                />
              </View>
            )}
          </View>
        )}

        <ErrorText>{error}</ErrorText>

        {/* Composer */}
        {isDemo ? (
          <View style={{ padding: spacing.md, backgroundColor: colors.surface, borderRadius: radii.md, marginBottom: spacing.sm }}>
            <Text variant="small" muted style={{ textAlign: "center" }}>
              Demo profiles can’t receive messages.
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, paddingVertical: spacing.sm }}>
            <IconButton icon="bulb-outline" label="Icebreaker ideas" onPress={loadIdeas} disabled={ideasLoading} color={colors.gold} background={colors.surface} />
            <TextInput
              accessibilityLabel="Message"
              value={text}
              onChangeText={onChangeText}
              placeholder={ideasLoading ? "Thinking of icebreakers…" : "Type a message"}
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={2000}
              onSubmitEditing={submit}
              blurOnSubmit={false}
              onKeyPress={(e) => {
                // Web: Enter sends, Shift+Enter adds a line.
                const ne = e.nativeEvent as unknown as { key: string; shiftKey?: boolean };
                if (Platform.OS === "web" && ne.key === "Enter" && !ne.shiftKey) {
                  (e as unknown as { preventDefault(): void }).preventDefault();
                  submit();
                }
              }}
              style={{ flex: 1, minHeight: TOUCH, maxHeight: 120, borderRadius: radii.xl, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, color: colors.text, fontSize: 16 }}
            />
            {/* Empty box: a quiet neutral button (not a faded pink one), brand colour once there's text. */}
            <IconButton
              icon="send"
              label="Send message"
              onPress={submit}
              disabled={!canSend}
              color={canSend ? colors.onPrimary : colors.textMuted}
              background={canSend ? colors.primaryFill : colors.surface}
              style={{ opacity: 1 }}
            />
          </View>
        )}
      </KeyboardAvoidingView>

      {match && (
        <>
          <ActionMenu
            visible={menu}
            onClose={() => setMenu(false)}
            items={[
              { label: `View ${match.other.displayName}'s profile`, onPress: () => router.push(`/profile/${match.other.id}`) },
              { label: "Unmatch", onPress: unmatch, destructive: true },
              { label: "Block", onPress: block, destructive: true },
              { label: "Report", onPress: () => setReporting(true), destructive: true },
            ]}
          />
          <ReportSheet
            userId={match.other.id}
            name={match.other.displayName}
            visible={reporting}
            onClose={() => setReporting(false)}
            onDone={(blocked) => {
              setReporting(false);
              if (blocked) leave();
            }}
          />
        </>
      )}
    </Screen>
  );
}

function Bubble({ message, mine, showSeen }: { message: Message; mine: boolean; showSeen: boolean }) {
  const { colors } = useTheme();
  const [revealed, setRevealed] = useState(false);
  const held = message.flagged && !mine && !revealed;
  return (
    <View style={{ alignItems: mine ? "flex-end" : "flex-start", maxWidth: MAX_CONTENT_WIDTH }}>
      {held ? (
        <View style={{ maxWidth: "85%", backgroundColor: colors.warningBg, borderRadius: radii.lg, padding: spacing.md, gap: spacing.sm }} accessibilityRole="alert">
          <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
            <Ionicons name="warning" size={18} color={colors.warningText} />
            <Text variant="bodyBold" style={{ color: colors.warningText }}>
              This message may be unsafe
            </Text>
          </View>
          <Text variant="small" style={{ color: colors.warningText }}>
            It may contain harassment, a scam (like a request for money or an “investment”), or explicit content. Never send money to someone you met here.
          </Text>
          <Pressable accessibilityRole="button" onPress={() => setRevealed(true)} style={{ minHeight: TOUCH, justifyContent: "center" }}>
            <Text variant="bodyBold" style={{ color: colors.warningText, textDecorationLine: "underline" }}>
              Show message
            </Text>
          </Pressable>
        </View>
      ) : (
        <View
          style={{
            maxWidth: "80%",
            backgroundColor: mine ? colors.primaryFill : colors.surface,
            borderRadius: radii.lg,
            borderBottomRightRadius: mine ? 4 : radii.lg,
            borderBottomLeftRadius: mine ? radii.lg : 4,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }}
        >
          <Text style={{ color: mine ? colors.onPrimary : colors.text }}>{message.body}</Text>
        </View>
      )}
      {mine && message.flagged && (
        <Text variant="caption" muted>
          Shown to them with a safety warning
        </Text>
      )}
      {showSeen && (
        <Text variant="caption" muted accessibilityLabel="Seen">
          Seen
        </Text>
      )}
    </View>
  );
}

function IdeaChip({ idea, onPress }: { idea: string; onPress(): void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Use icebreaker: ${idea}`}
      onPress={onPress}
      style={({ pressed }) => ({
        maxWidth: 260,
        borderWidth: 1,
        borderColor: colors.primary,
        borderRadius: radii.lg,
        padding: spacing.md,
        backgroundColor: colors.chipSelected,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text variant="small">{idea}</Text>
    </Pressable>
  );
}

function TypingBubble() {
  const { colors } = useTheme();
  return (
    <View style={{ alignSelf: "flex-start", backgroundColor: colors.surface, borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }} accessibilityLabel="typing">
      <Text muted>•••</Text>
    </View>
  );
}

function ChatSkeleton() {
  return (
    <View style={{ flex: 1, gap: spacing.md, paddingVertical: spacing.lg }} accessibilityLabel="Loading messages">
      {[0.6, 0.4, 0.7, 0.5, 0.3].map((w, i) => (
        <Skeleton key={i} style={{ height: 40, width: `${w * 100}%`, alignSelf: i % 2 ? "flex-end" : "flex-start", borderRadius: radii.lg }} />
      ))}
    </View>
  );
}
