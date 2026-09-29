import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { MAX_PHOTOS, type Photo } from "@kxq/shared";
import { radii, spacing, useTheme } from "@/theme";
import { IconButton, Text } from "./ui";

const COLS = 3;
const GAP = spacing.sm;

/**
 * 3×2 photo grid. Drag a photo onto another slot to reorder (long-press first on
 * phones). The first photo is the main one. Screen readers get "move" actions.
 */
export function PhotoGrid({
  photos,
  onAdd,
  onDelete,
  onReorder,
  busy,
}: {
  photos: Photo[];
  onAdd(): void;
  onDelete(id: string): void;
  onReorder(ids: string[]): void;
  busy?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const tileW = (width - GAP * (COLS - 1)) / COLS;
  const tileH = tileW * (4 / 3);

  const move = (from: number, to: number) => {
    const target = Math.max(0, Math.min(photos.length - 1, to));
    if (target === from) return;
    const ids = photos.map((p) => p.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(target, 0, moved);
    onReorder(ids);
  };

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={styles.grid}>
      {width > 0 &&
        Array.from({ length: MAX_PHOTOS }, (_, i) => {
          const photo = photos[i];
          const style = { width: tileW, height: tileH };
          if (!photo) {
            return i === photos.length ? (
              <AddTile key="add" style={style} onPress={onAdd} busy={busy} />
            ) : (
              <EmptyTile key={`empty-${i}`} style={style} />
            );
          }
          return (
            <DraggableTile
              key={photo.id}
              photo={photo}
              index={i}
              style={style}
              step={{ x: tileW + GAP, y: tileH + GAP }}
              onMove={move}
              onDelete={() => onDelete(photo.id)}
              canDelete={photos.length > 1}
            />
          );
        })}
    </View>
  );
}

function DraggableTile({
  photo,
  index,
  style,
  step,
  onMove,
  onDelete,
  canDelete,
}: {
  photo: Photo;
  index: number;
  style: { width: number; height: number };
  step: { x: number; y: number };
  onMove(from: number, to: number): void;
  onDelete(): void;
  canDelete: boolean;
}) {
  const { colors } = useTheme();
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const lifted = useSharedValue(0);

  const drop = (dx: number, dy: number) => {
    const col = Math.round(dx / step.x);
    const row = Math.round(dy / step.y);
    onMove(index, index + row * COLS + col);
  };

  let pan = Gesture.Pan()
    .onStart(() => {
      lifted.value = 1;
    })
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd((e) => {
      scheduleOnRN(drop, e.translationX, e.translationY);
    })
    .onFinalize(() => {
      tx.value = withSpring(0);
      ty.value = withSpring(0);
      lifted.value = 0;
    });
  if (Platform.OS !== "web") pan = pan.activateAfterLongPress(250);

  const animated = useAnimatedStyle(() => ({
    zIndex: lifted.value ? 10 : 0,
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: lifted.value ? 1.05 : 1 }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[style, styles.tile, { backgroundColor: colors.surface }, animated]}
        accessible
        accessibilityLabel={`Photo ${index + 1}${index === 0 ? ", main photo" : ""}${
          photo.moderationStatus === "pending" ? ", awaiting review" : ""
        }`}
        accessibilityActions={[
          { name: "earlier", label: "Move earlier" },
          { name: "later", label: "Move later" },
          { name: "delete", label: "Delete photo" },
        ]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === "earlier") onMove(index, index - 1);
          if (e.nativeEvent.actionName === "later") onMove(index, index + 1);
          if (e.nativeEvent.actionName === "delete" && canDelete) onDelete();
        }}
      >
        <View style={[StyleSheet.absoluteFill, styles.noPointer]}>
          <Image source={{ uri: photo.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
        </View>
        {index === 0 && (
          <View style={[styles.mainTag, { backgroundColor: colors.primary }]}>
            <Text variant="caption" style={{ color: colors.onPrimary }}>
              Main
            </Text>
          </View>
        )}
        {photo.moderationStatus === "pending" && (
          <View style={styles.pending}>
            <Text variant="caption" style={{ color: "#FFFFFF" }}>
              In review
            </Text>
          </View>
        )}
        {canDelete && (
          <IconButton
            icon="close"
            label={`Delete photo ${index + 1}`}
            onPress={onDelete}
            size={16}
            diameter={28}
            color="#FFFFFF"
            background="rgba(0,0,0,0.6)"
            style={styles.delete}
          />
        )}
      </Animated.View>
    </GestureDetector>
  );
}

function AddTile({ style, onPress, busy }: { style: object; onPress(): void; busy?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add a photo"
      onPress={onPress}
      disabled={busy}
      style={[style, styles.tile, styles.add, { borderColor: colors.primary, backgroundColor: colors.surface }]}
    >
      {busy ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="add" size={32} color={colors.primary} />}
    </Pressable>
  );
}

function EmptyTile({ style }: { style: object }) {
  const { colors } = useTheme();
  return <View style={[style, styles.tile, styles.add, { borderColor: colors.border, backgroundColor: colors.surface }]} />;
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  // On web an <img> would start native drag-and-drop instead of our reorder gesture.
  noPointer: { pointerEvents: "none" },
  tile: { borderRadius: radii.md, overflow: "hidden" },
  add: { borderWidth: 2, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  mainTag: { position: "absolute", left: 6, bottom: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.pill },
  pending: { position: "absolute", left: 6, top: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.pill, backgroundColor: "rgba(0,0,0,0.6)" },
  delete: { position: "absolute", top: 4, right: 4 },
});
