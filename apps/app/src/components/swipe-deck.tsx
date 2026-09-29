import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { Image } from "expo-image";
import type { PublicProfile, SwipeAction } from "@kxq/shared";
import { radii } from "@/theme";
import { describeProfile, ProfileCard } from "./profile-card";
import { Text } from "./ui";

const THRESHOLD = 110;

export interface DeckHandle {
  /** Animate the top card off-screen, then report the swipe (buttons & keyboard use this). */
  swipe(action: SwipeAction): void;
}

interface Props {
  profiles: PublicProfile[];
  compat?: string | null;
  onSwipe(profile: PublicProfile, action: SwipeAction): void;
  onOpen(profile: PublicProfile): void;
}

export const SwipeDeck = forwardRef<DeckHandle, Props>(function SwipeDeck({ profiles, compat, onSwipe, onOpen }, ref) {
  const [top, next, third] = profiles;
  const [handle, setHandle] = useState<DeckHandle | null>(null);
  useImperativeHandle(ref, () => ({ swipe: (a) => handle?.swipe(a) }), [handle]);

  // Preload photos for the next few cards so they're ready before they surface.
  useEffect(() => {
    const urls = [next, third].flatMap((p) => p?.photos.map((ph) => ph.url) ?? []);
    if (urls.length) Image.prefetch(urls).catch(() => {});
  }, [next, third]);

  if (!top) return null;
  return (
    <View style={styles.deck}>
      {next && (
        <View style={[StyleSheet.absoluteFill, styles.under]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <ProfileCard profile={next} photoIndex={0} />
        </View>
      )}
      {/* key: every top card gets fresh animation values, so the next one never flashes off-screen */}
      <TopCard key={top.id} profile={top} compat={compat} onSwipe={onSwipe} onOpen={onOpen} registerHandle={setHandle} />
    </View>
  );
});

function TopCard({
  profile,
  compat,
  onSwipe,
  onOpen,
  registerHandle,
}: {
  profile: PublicProfile;
  compat?: string | null;
  onSwipe: Props["onSwipe"];
  onOpen: Props["onOpen"];
  registerHandle(h: DeckHandle): void;
}) {
  const { width, height } = useWindowDimensions();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [cardWidth, setCardWidth] = useState(1);
  const [cardHeight, setCardHeight] = useState(1);
  const [compatOpen, setCompatOpen] = useState(false);
  const [compatRect, setCompatRect] = useState<{ y: number; height: number } | null>(null);

  const done = useCallback((action: SwipeAction) => onSwipe(profile, action), [onSwipe, profile]);

  const fling = useCallback(
    (action: SwipeAction) => {
      const toX = action === "like" ? width * 1.5 : action === "pass" ? -width * 1.5 : 0;
      const toY = action === "superlike" ? -height * 1.5 : 0;
      x.set(withTiming(toX, { duration: 260 }));
      y.set(
        withTiming(toY, { duration: 260 }, (finished) => {
          if (finished) scheduleOnRN(done, action);
        }),
      );
    },
    [width, height, x, y, done],
  );

  useEffect(() => registerHandle({ swipe: fling }), [fling, registerHandle]);

  const tapAt = useCallback(
    (tx: number, ty: number) => {
      if (compatRect && ty >= compatRect.y && ty <= compatRect.y + compatRect.height) return setCompatOpen((o) => !o);
      if (ty > cardHeight * 0.7) return onOpen(profile); // tapping the details opens the full profile
      const n = profile.photos.length;
      if (n < 2) return;
      setPhotoIndex((i) => (tx < cardWidth / 2 ? Math.max(0, i - 1) : Math.min(n - 1, i + 1)));
    },
    [cardWidth, cardHeight, compatRect, onOpen, profile],
  );

  const pan = Gesture.Pan()
    .minDistance(8)
    .onUpdate((e) => {
      x.set(e.translationX);
      y.set(e.translationY);
    })
    .onEnd((e) => {
      const toX = width * 1.5;
      const toY = height * 1.5;
      if (e.translationX > THRESHOLD || e.velocityX > 900) {
        x.set(withTiming(toX, { duration: 200 }, (f) => f && scheduleOnRN(done, "like")));
      } else if (e.translationX < -THRESHOLD || e.velocityX < -900) {
        x.set(withTiming(-toX, { duration: 200 }, (f) => f && scheduleOnRN(done, "pass")));
      } else if (e.translationY < -THRESHOLD || e.velocityY < -900) {
        y.set(withTiming(-toY, { duration: 200 }, (f) => f && scheduleOnRN(done, "superlike")));
      } else {
        x.set(withSpring(0));
        y.set(withSpring(0));
      }
    });

  const tap = Gesture.Tap()
    .maxDistance(8)
    .onEnd((e) => {
      scheduleOnRN(tapAt, e.x, e.y);
    });

  const gesture = Gesture.Race(pan, tap);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${interpolate(x.value, [-width, 0, width], [-14, 0, 14], Extrapolation.CLAMP)}deg` },
    ],
  }));
  const likeStyle = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [20, THRESHOLD], [0, 1], Extrapolation.CLAMP) }));
  const nopeStyle = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [-THRESHOLD, -20], [1, 0], Extrapolation.CLAMP) }));
  const superStyle = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [-THRESHOLD, -20], [1, 0], Extrapolation.CLAMP) }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[StyleSheet.absoluteFill, cardStyle]}
        onLayout={(e) => {
          setCardWidth(e.nativeEvent.layout.width);
          setCardHeight(e.nativeEvent.layout.height);
        }}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={describeProfile(profile)}
        accessibilityHint="Swipe right to like, left to pass, up to super like. Actions are also available as buttons."
        accessibilityActions={[
          { name: "like", label: "Like" },
          { name: "pass", label: "Pass" },
          { name: "superlike", label: "Super like" },
          { name: "activate", label: "Open profile" },
        ]}
        onAccessibilityAction={(e) => {
          const a = e.nativeEvent.actionName;
          if (a === "activate") onOpen(profile);
          else fling(a as SwipeAction);
        }}
      >
        <ProfileCard profile={profile} photoIndex={photoIndex} compat={compat} compatExpanded={compatOpen} onCompatLayout={setCompatRect} />
        <Animated.View style={[styles.stamp, styles.likeStamp, likeStyle]} pointerEvents="none">
          <Text variant="title" style={{ color: "#22C55E" }}>
            LIKE
          </Text>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.nopeStamp, nopeStyle]} pointerEvents="none">
          <Text variant="title" style={{ color: "#EF4444" }}>
            NOPE
          </Text>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.superStamp, superStyle]} pointerEvents="none">
          <Text variant="title" style={{ color: "#3B82F6" }}>
            SUPER LIKE
          </Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  deck: { flex: 1 },
  under: { transform: [{ scale: 0.96 }], opacity: 0.9 },
  stamp: { position: "absolute", borderWidth: 4, borderRadius: radii.md, paddingHorizontal: 12, paddingVertical: 4 },
  likeStamp: { top: 40, left: 24, borderColor: "#22C55E", transform: [{ rotate: "-15deg" }] },
  nopeStamp: { top: 40, right: 24, borderColor: "#EF4444", transform: [{ rotate: "15deg" }] },
  superStamp: { bottom: 160, alignSelf: "center", borderColor: "#3B82F6" },
});
