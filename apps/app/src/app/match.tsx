import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Text } from "@/components/ui";
import { useMe, useProfile } from "@/lib/queries";
import { spacing } from "@/theme";

export default function ItsAMatch() {
  const { matchId, otherId } = useLocalSearchParams<{ matchId: string; otherId: string }>();
  const { data: me } = useMe();
  const { data: other } = useProfile(otherId);

  const title = useSharedValue(0);
  const left = useSharedValue(-300);
  const right = useSharedValue(300);
  useEffect(() => {
    title.value = withSpring(1, { damping: 9 });
    left.value = withDelay(120, withSpring(0, { damping: 13 }));
    right.value = withDelay(120, withSpring(0, { damping: 13 }));
  }, [title, left, right]);
  const titleStyle = useAnimatedStyle(() => ({ transform: [{ scale: title.value }], opacity: title.value }));
  const leftStyle = useAnimatedStyle(() => ({ transform: [{ translateX: left.value }, { rotate: "-8deg" }] }));
  const rightStyle = useAnimatedStyle(() => ({ transform: [{ translateX: right.value }, { rotate: "8deg" }] }));

  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <View style={styles.backdrop} accessibilityViewIsModal>
      <SafeAreaView style={styles.content}>
        <Animated.View style={[{ alignItems: "center", gap: spacing.sm }, titleStyle]}>
          <Ionicons name="heart" size={48} color="#F5B82E" />
          <Text variant="display" style={{ color: "#FFF", fontStyle: "italic" }} accessibilityRole="header" accessibilityLiveRegion="assertive">
            It’s a Match!
          </Text>
          <Text style={{ color: "#EEE", textAlign: "center" }}>
            You and {other?.displayName ?? "they"} liked each other.
          </Text>
        </Animated.View>

        <View style={styles.photos}>
          <Animated.View style={[styles.photoWrap, leftStyle]}>
            <Image source={{ uri: me?.photos[0]?.url }} style={styles.photo} contentFit="cover" accessibilityLabel="Your photo" />
          </Animated.View>
          <Animated.View style={[styles.photoWrap, rightStyle]}>
            <Image source={{ uri: other?.photos[0]?.url }} style={styles.photo} contentFit="cover" accessibilityLabel={`${other?.displayName ?? "Their"} photo`} />
          </Animated.View>
        </View>

        <View style={{ gap: spacing.md, width: "100%", maxWidth: 420 }}>
          <Button
            title="Send a message"
            icon="chatbubble"
            onPress={() => router.replace({ pathname: "/chat/[matchId]", params: { matchId, icebreakers: "1" } })}
          />
          <Button title="Keep swiping" variant="secondary" onPress={close} />
          {other?.isDemo && (
            <Text variant="caption" style={{ color: "#DDD", textAlign: "center" }}>
              {other.displayName} is a demo profile — you can open the chat, but messaging is turned off.
            </Text>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(20,4,12,0.92)" },
  content: { flex: 1, alignItems: "center", justifyContent: "space-evenly", padding: spacing.xl },
  photos: { flexDirection: "row", gap: -spacing.lg },
  photoWrap: { borderWidth: 4, borderColor: "#FFF", borderRadius: 24, overflow: "hidden" },
  photo: { width: 140, height: 190 },
});
