import Slider from "@react-native-community/slider";
import { useState } from "react";
import { View } from "react-native";
import { GENDER_LABELS, GENDERS, MAX_AGE, MIN_AGE, type Gender, type MyProfile } from "@kxq/shared";
import { api } from "@/lib/api";
import { keys, queryClient, useSetMe } from "@/lib/queries";
import { spacing, useTheme } from "@/theme";
import { Button, Chip, ErrorText, Text } from "./ui";

/** Age range, distance and "show me". Two sliders make the age range work on every platform. */
export function PreferencesForm({ me, onSaved }: { me: MyProfile; onSaved?: () => void }) {
  const { colors } = useTheme();
  const setMe = useSetMe();
  const [ageMin, setAgeMin] = useState(me.ageMin);
  const [ageMax, setAgeMax] = useState(me.ageMax);
  const [distance, setDistance] = useState(me.maxDistanceKm);
  const [showMe, setShowMe] = useState<Gender[]>(me.interestedIn);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (g: Gender) =>
    setShowMe((cur) => (cur.includes(g) ? (cur.length > 1 ? cur.filter((x) => x !== g) : cur) : [...cur, g]));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      setMe(await api.setPreferences({ ageMin, ageMax, maxDistanceKm: distance, interestedIn: showMe }));
      await queryClient.invalidateQueries({ queryKey: keys.discover });
      await queryClient.invalidateQueries({ queryKey: keys.nearby });
      onSaved?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const sliderProps = {
    minimumTrackTintColor: colors.primary,
    maximumTrackTintColor: colors.border,
    thumbTintColor: colors.primary,
    style: { height: 44 },
    step: 1,
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text variant="bodyBold">Age range</Text>
          <Text muted>
            {ageMin} – {ageMax}
          </Text>
        </View>
        <Text variant="caption" muted>
          Youngest
        </Text>
        <Slider
          {...sliderProps}
          accessibilityLabel={`Minimum age, ${ageMin}`}
          minimumValue={MIN_AGE}
          maximumValue={MAX_AGE}
          value={ageMin}
          onValueChange={(v) => {
            setAgeMin(v);
            if (v > ageMax) setAgeMax(v);
          }}
        />
        <Text variant="caption" muted>
          Oldest
        </Text>
        <Slider
          {...sliderProps}
          accessibilityLabel={`Maximum age, ${ageMax}`}
          minimumValue={MIN_AGE}
          maximumValue={MAX_AGE}
          value={ageMax}
          onValueChange={(v) => {
            setAgeMax(v);
            if (v < ageMin) setAgeMin(v);
          }}
        />
      </View>

      <View style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text variant="bodyBold">Maximum distance</Text>
          <Text muted>{distance} km</Text>
        </View>
        <Slider
          {...sliderProps}
          accessibilityLabel={`Maximum distance, ${distance} kilometers`}
          minimumValue={1}
          maximumValue={500}
          value={distance}
          onValueChange={setDistance}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="bodyBold">Show me</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {GENDERS.map((g) => (
            <Chip key={g} label={GENDER_LABELS[g]} selected={showMe.includes(g)} onPress={() => toggle(g)} />
          ))}
        </View>
      </View>

      <ErrorText>{error}</ErrorText>
      <Button title="Save preferences" onPress={save} loading={saving} />
    </View>
  );
}
