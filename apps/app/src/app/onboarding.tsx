import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import {
  ageFromBirthdate,
  GENDER_LABELS,
  GENDERS,
  INTERESTS,
  MAX_INTERESTS,
  MIN_AGE,
  MIN_INTERESTS,
  MIN_PHOTOS,
  type Gender,
  type MyProfile,
} from "@kxq/shared";
import { BioEditor } from "@/components/bio-editor";
import { PhotoGrid } from "@/components/photo-grid";
import { Button, Chip, ErrorText, IconButton, ProgressBar, Screen, Text, TextField } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { pickAndUploadPhoto, shareLocation } from "@/lib/device";
import { useMe, useSetMe } from "@/lib/queries";
import { spacing, useTheme } from "@/theme";

const STEPS = ["name", "birthdate", "gender", "photos", "interests", "bio", "location", "done"] as const;
type Step = (typeof STEPS)[number];

/** Resume at the first step the saved profile hasn't covered yet. */
function firstIncomplete(me: MyProfile | null): number {
  if (!me) return 0;
  if (me.photos.length < MIN_PHOTOS) return STEPS.indexOf("photos");
  if (me.interests.length < MIN_INTERESTS) return STEPS.indexOf("interests");
  if (!me.bio) return STEPS.indexOf("bio");
  if (!me.hasLocation) return STEPS.indexOf("location");
  return STEPS.indexOf("done");
}

export default function Onboarding() {
  const { colors } = useTheme();
  const { user, signOut } = useAuth();
  const { data: me } = useMe();
  const setMe = useSetMe();

  const [step, setStepRaw] = useState(() => firstIncomplete(me ?? null));
  const setStep = (fn: (s: number) => number) => {
    setError(null);
    setStepRaw(fn);
  };
  const [name, setName] = useState(me?.displayName ?? user?.name ?? "");
  const [year, setYear] = useState(me?.birthdate.slice(0, 4) ?? "");
  const [month, setMonth] = useState(me?.birthdate.slice(5, 7) ?? "");
  const [day, setDay] = useState(me?.birthdate.slice(8, 10) ?? "");
  const [gender, setGender] = useState<Gender | null>(me?.gender ?? null);
  const [interestedIn, setInterestedIn] = useState<Gender[]>(me?.interestedIn ?? []);
  const [interests, setInterests] = useState<string[]>(me?.interests ?? []);
  const [bio, setBio] = useState(me?.bio ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const birthdate = `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const birthError = useMemo(() => {
    if (year.length < 4 || !month || !day) return null;
    const d = new Date(`${birthdate}T00:00:00`);
    if (Number.isNaN(d.getTime()) || d.getMonth() + 1 !== Number(month)) return "That date doesn't look right";
    if (ageFromBirthdate(birthdate) < MIN_AGE) return `You must be ${MIN_AGE} or older to use KingxQueen.`;
    if (ageFromBirthdate(birthdate) > 100) return "That date doesn't look right";
    return null;
  }, [birthdate, year, month, day]);

  const run = async (fn: () => Promise<unknown>, advance = true) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      if (advance) setStep((s) => s + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const current: Step = STEPS[step];
  const next = {
    name: { ok: name.trim().length >= 2, go: () => setStep((s) => s + 1) },
    birthdate: { ok: year.length === 4 && !!month && !!day && !birthError, go: () => setStep((s) => s + 1) },
    gender: {
      ok: !!gender && interestedIn.length > 0,
      go: () =>
        run(async () => setMe(await api.updateMe({ displayName: name.trim(), birthdate, gender: gender!, interestedIn }))),
    },
    photos: { ok: (me?.photos.length ?? 0) >= MIN_PHOTOS, go: () => setStep((s) => s + 1) },
    interests: {
      ok: interests.length >= MIN_INTERESTS && interests.length <= MAX_INTERESTS,
      go: () => run(async () => setMe(await api.updateMe({ interests }))),
    },
    bio: { ok: true, go: () => run(async () => setMe(await api.updateMe({ bio: bio.trim() }))) },
    location: { ok: true, go: () => run(async () => setMe(await shareLocation())) },
    done: { ok: true, go: () => run(async () => setMe(await api.completeOnboarding()), false) },
  }[current];

  return (
    <Screen edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm }}>
          {step > 0 && current !== "done" ? (
            <IconButton icon="chevron-back" label="Previous step" onPress={() => setStep((s) => Math.max(0, s - 1))} />
          ) : (
            <View style={{ width: 44 }} />
          )}
          <View style={{ flex: 1 }}>
            <ProgressBar value={(step + 1) / STEPS.length} />
          </View>
          <Button title="Log out" variant="ghost" onPress={signOut} style={{ paddingHorizontal: spacing.sm }} />
        </View>

        <ScrollView contentContainerStyle={{ gap: spacing.lg, paddingVertical: spacing.lg }} keyboardShouldPersistTaps="handled">
          {current === "name" && (
            <>
              <Title text="What's your first name?" sub="This is how you'll appear on KingxQueen." />
              <TextField label="First name" value={name} onChangeText={setName} maxLength={40} autoFocus />
            </>
          )}

          {current === "birthdate" && (
            <>
              <Title text="When's your birthday?" sub="Only your age is shown. You must be 18 or older." />
              <View style={{ flexDirection: "row", gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <TextField label="Month" placeholder="MM" value={month} onChangeText={(t) => setMonth(t.replace(/\D/g, "").slice(0, 2))} keyboardType="number-pad" inputMode="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField label="Day" placeholder="DD" value={day} onChangeText={(t) => setDay(t.replace(/\D/g, "").slice(0, 2))} keyboardType="number-pad" inputMode="numeric" />
                </View>
                <View style={{ flex: 1.4 }}>
                  <TextField label="Year" placeholder="YYYY" value={year} onChangeText={(t) => setYear(t.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" inputMode="numeric" />
                </View>
              </View>
              {birthError ? (
                <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
                  <Ionicons name="alert-circle" size={20} color={colors.danger} />
                  <ErrorText>{birthError}</ErrorText>
                </View>
              ) : year.length === 4 && month && day ? (
                <Text muted>You’re {ageFromBirthdate(birthdate)}.</Text>
              ) : null}
            </>
          )}

          {current === "gender" && (
            <>
              <Title text="I am a…" />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                {GENDERS.map((g) => (
                  <Chip key={g} label={GENDER_LABELS[g]} selected={gender === g} onPress={() => setGender(g)} />
                ))}
              </View>
              <Title text="Show me…" sub="Pick one or more." />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                {GENDERS.map((g) => (
                  <Chip
                    key={g}
                    label={g === "man" ? "Men" : g === "woman" ? "Women" : "Non-binary people"}
                    selected={interestedIn.includes(g)}
                    onPress={() => setInterestedIn((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]))}
                  />
                ))}
              </View>
            </>
          )}

          {current === "photos" && me && (
            <>
              <Title
                text="Add your photos"
                sub={`Add at least ${MIN_PHOTOS} (up to 6). Drag to reorder — the first is your main photo.`}
              />
              <PhotoGrid
                photos={me.photos}
                busy={busy}
                onAdd={() => run(async () => { const updated = await pickAndUploadPhoto(); if (updated) setMe(updated); }, false)}
                onDelete={(id) => run(async () => setMe(await api.deletePhoto(id)), false)}
                onReorder={(ids) => run(async () => setMe(await api.reorderPhotos(ids)), false)}
              />
            </>
          )}

          {current === "interests" && (
            <>
              <Title text="What are you into?" sub={`Pick ${MIN_INTERESTS} to ${MAX_INTERESTS}. (${interests.length} selected)`} />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                {INTERESTS.map((i) => (
                  <Chip
                    key={i}
                    label={i}
                    selected={interests.includes(i)}
                    onPress={() =>
                      setInterests((cur) =>
                        cur.includes(i) ? cur.filter((x) => x !== i) : cur.length < MAX_INTERESTS ? [...cur, i] : cur,
                      )
                    }
                  />
                ))}
              </View>
            </>
          )}

          {current === "bio" && (
            <>
              <Title text="Write a short bio" sub="Optional, but profiles with a bio get more matches." />
              <BioEditor value={bio} onChange={setBio} />
            </>
          )}

          {current === "location" && (
            <>
              <Title text="Find people near you" sub="We use your approximate location to show distance. Your exact location is never shown." />
              <View style={{ alignItems: "center", paddingVertical: spacing.xl }}>
                <Ionicons name="location" size={72} color={colors.primary} />
              </View>
              <Button title="Skip for now" variant="ghost" onPress={() => setStep((s) => s + 1)} />
            </>
          )}

          {current === "done" && (
            <View style={{ alignItems: "center", gap: spacing.md, paddingVertical: spacing.xxl }}>
              <Ionicons name="sparkles" size={72} color={colors.gold} />
              <Title text="You're all set!" sub="Start swiping to meet people nearby." center />
            </View>
          )}

          <ErrorText>{error}</ErrorText>
        </ScrollView>

        <Button
          title={current === "location" ? "Share my location" : current === "done" ? "Start swiping" : "Continue"}
          onPress={next.go}
          disabled={!next.ok}
          loading={busy && current !== "photos"}
          style={{ marginBottom: spacing.lg }}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Title({ text, sub, center }: { text: string; sub?: string; center?: boolean }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="title" accessibilityRole="header" style={center ? { textAlign: "center" } : undefined}>
        {text}
      </Text>
      {sub && (
        <Text muted style={center ? { textAlign: "center" } : undefined}>
          {sub}
        </Text>
      )}
    </View>
  );
}
