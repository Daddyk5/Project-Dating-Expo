import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { INTERESTS, MAX_INTERESTS, MIN_INTERESTS } from "@kxq/shared";
import { BioEditor } from "@/components/bio-editor";
import { PhotoGrid } from "@/components/photo-grid";
import { Button, Card, Chip, ErrorText, Header, Screen, Text, TextField } from "@/components/ui";
import { api } from "@/lib/api";
import { pickAndUploadPhoto } from "@/lib/device";
import { useMe, useSetMe } from "@/lib/queries";
import { spacing } from "@/theme";

export default function EditProfile() {
  const { data: me } = useMe();
  const setMe = useSetMe();
  const [name, setName] = useState(me?.displayName ?? "");
  const [bio, setBio] = useState(me?.bio ?? "");
  const [interests, setInterests] = useState<string[]>(me?.interests ?? []);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!me) return null;

  const photoOp = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      setMe(await api.updateMe({ displayName: name.trim(), bio: bio.trim(), interests }));
      router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const valid = name.trim().length >= 2 && interests.length >= MIN_INTERESTS;
  // Use the saved list so custom interests (not in INTERESTS) stay selectable.
  const options = [...new Set([...me.interests, ...INTERESTS])];

  return (
    <Screen
      scroll
      edges={["top", "bottom"]}
      header={<Header title="Edit profile" right={<Button title="Save" size="sm" onPress={save} loading={saving} disabled={!valid} />} />}
    >
      <View style={{ gap: spacing.lg, paddingTop: spacing.sm }}>
        <Card style={{ gap: spacing.sm }}>
          <Text variant="heading">Photos</Text>
          <Text variant="caption" muted>
            Drag to reorder. The first photo is your main one.
          </Text>
          <PhotoGrid
            photos={me.photos}
            busy={busy}
            onAdd={() => photoOp(async () => { const u = await pickAndUploadPhoto(); if (u) setMe(u); })}
            onDelete={(id) => photoOp(async () => setMe(await api.deletePhoto(id)))}
            onReorder={(ids) => photoOp(async () => setMe(await api.reorderPhotos(ids)))}
          />
        </Card>
        <Card style={{ gap: spacing.lg }}>
          <Text variant="heading">About you</Text>
          <TextField label="First name" icon="person-outline" value={name} onChangeText={setName} maxLength={40} />
          <BioEditor value={bio} onChange={setBio} />
        </Card>
        <Card style={{ gap: spacing.sm }}>
          <Text variant="heading">Interests</Text>
          <Text variant="caption" muted>
            {interests.length}/{MAX_INTERESTS} selected · pick at least {MIN_INTERESTS}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {options.map((i) => (
              <Chip
                key={i}
                label={i}
                selected={interests.includes(i)}
                onPress={() =>
                  setInterests((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : cur.length < MAX_INTERESTS ? [...cur, i] : cur))
                }
              />
            ))}
          </View>
        </Card>
        <ErrorText>{error}</ErrorText>
        <Button title="Save changes" onPress={save} loading={saving} disabled={!valid} />
      </View>
    </Screen>
  );
}
