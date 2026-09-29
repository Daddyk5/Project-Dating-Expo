import { useState } from "react";
import { Pressable, View } from "react-native";
import { MAX_BIO } from "@kxq/shared";
import { api } from "@/lib/api";
import { radii, spacing, useTheme } from "@/theme";
import { Button, ErrorText, Text, TextField } from "./ui";

/** Bio input with "Polish with AI": shows two rewrites the user can pick from. */
export function BioEditor({ value, onChange }: { value: string; onChange(v: string): void }) {
  const { colors } = useTheme();
  const [versions, setVersions] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const polish = async () => {
    setLoading(true);
    setError(null);
    try {
      setVersions((await api.bioPolish(value)).versions);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ gap: spacing.md }}>
      <TextField
        label={`Bio (${value.length}/${MAX_BIO})`}
        value={value}
        onChangeText={(t) => onChange(t.slice(0, MAX_BIO))}
        multiline
        placeholder="A few lines about you — what you love, what you're looking for."
        style={{ minHeight: 120, paddingTop: spacing.md, textAlignVertical: "top" }}
      />
      <Button
        title="Polish with AI"
        icon="sparkles"
        variant="secondary"
        onPress={polish}
        loading={loading}
        disabled={value.trim().length < 10}
        accessibilityLabel="Polish my bio with AI"
      />
      {value.trim().length < 10 && (
        <Text variant="caption" muted>
          Write at least a sentence, then let AI tidy it up. It keeps your facts — it never adds new ones.
        </Text>
      )}
      <ErrorText>{error}</ErrorText>
      {versions?.map((v, i) => (
        <Pressable
          key={i}
          accessibilityRole="button"
          accessibilityLabel={`Use suggestion ${i + 1}: ${v}`}
          onPress={() => {
            onChange(v);
            setVersions(null);
          }}
          style={{ borderWidth: 1, borderColor: colors.primary, borderRadius: radii.md, padding: spacing.md, gap: spacing.xs }}
        >
          <Text variant="caption" style={{ color: colors.primary }}>
            Suggestion {i + 1} · tap to use
          </Text>
          <Text>{v}</Text>
        </Pressable>
      ))}
    </View>
  );
}
