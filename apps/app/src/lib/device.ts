import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Platform } from "react-native";
import { api } from "./api";

/** Haptics are native-only; no-ops on web. */
export const haptic = {
  swipe: () => Platform.OS !== "web" && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  match: () =>
    Platform.OS !== "web" && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
};

/** Pick an image and upload it straight to the private bucket via a presigned URL. */
export async function pickAndUploadPhoto() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [3, 4],
    quality: 0.8,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const blob = await (await fetch(asset.uri)).blob();
  const type = ["image/jpeg", "image/png", "image/webp"].includes(blob.type) ? blob.type : "image/jpeg";
  const { uploadUrl, storageKey } = await api.uploadUrl(type);
  const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": type }, body: blob });
  if (!put.ok) throw new Error("Upload failed — please try again");
  return api.confirmPhoto(storageKey);
}

export async function shareLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") throw new Error("Location permission was not granted");
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  let city: string | undefined;
  let country: string | undefined;
  if (Platform.OS !== "web") {
    try {
      const [place] = await Location.reverseGeocodeAsync(pos.coords);
      city = place?.city ?? place?.subregion ?? undefined;
      country = place?.country ?? undefined;
    } catch {
      /* city is optional */
    }
  }
  return api.setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, city, country });
}

export function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
