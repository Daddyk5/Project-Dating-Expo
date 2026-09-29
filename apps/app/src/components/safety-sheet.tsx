import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { REPORT_REASONS, type ReportReason } from "@kxq/shared";
import { api } from "@/lib/api";
import { radii, spacing, TOUCH, useTheme } from "@/theme";
import { Button, ErrorText, Text, TextField } from "./ui";

const LABELS: Record<ReportReason, string> = {
  harassment: "Harassment or threats",
  scam: "Scam or asking for money",
  explicit_content: "Explicit content",
  fake_profile: "Fake profile",
  underage: "May be under 18",
  other: "Something else",
};

/** Report a user; optionally block them in the same step. */
export function ReportSheet({
  userId,
  name,
  visible,
  onClose,
  onDone,
}: {
  userId: string;
  name: string;
  visible: boolean;
  onClose(): void;
  onDone(blocked: boolean): void;
}) {
  const { colors } = useTheme();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (alsoBlock: boolean) => {
    if (!reason) return;
    setBusy(true);
    setError(null);
    try {
      await api.report(userId, reason, details.trim() || undefined);
      if (alsoBlock) await api.block(userId);
      onDone(alsoBlock);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: spacing.lg }} onPress={onClose} accessibilityLabel="Close">
        <Pressable style={{ backgroundColor: colors.surfaceRaised, borderRadius: radii.xl, padding: spacing.xl, gap: spacing.md, maxWidth: 480, width: "100%", alignSelf: "center" }}>
          <Text variant="heading" accessibilityRole="header">
            Report {name}
          </Text>
          <Text muted>Reports are confidential. {name} won’t know it was you.</Text>
          {REPORT_REASONS.map((r) => (
            <Pressable
              key={r}
              accessibilityRole="radio"
              accessibilityState={{ checked: reason === r }}
              onPress={() => setReason(r)}
              style={{
                minHeight: TOUCH,
                justifyContent: "center",
                paddingHorizontal: spacing.md,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: reason === r ? colors.primary : colors.border,
                backgroundColor: reason === r ? colors.chipSelected : "transparent",
              }}
            >
              <Text>{LABELS[r]}</Text>
            </Pressable>
          ))}
          <TextField label="Details (optional)" value={details} onChangeText={setDetails} multiline maxLength={1000} />
          <ErrorText>{error}</ErrorText>
          <Button title="Report and block" variant="danger" onPress={() => submit(true)} disabled={!reason} loading={busy} />
          <Button title="Report only" variant="secondary" onPress={() => submit(false)} disabled={!reason || busy} />
          <Button title="Cancel" variant="ghost" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Small action menu (… button) with Unmatch / Block / Report. */
export function ActionMenu({
  visible,
  onClose,
  items,
}: {
  visible: boolean;
  onClose(): void;
  items: { label: string; onPress(): void; destructive?: boolean }[];
}) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end", padding: spacing.lg }} onPress={onClose} accessibilityLabel="Close menu">
        <View style={{ backgroundColor: colors.surfaceRaised, borderRadius: radii.xl, padding: spacing.sm, maxWidth: 480, width: "100%", alignSelf: "center" }}>
          {items.map((it) => (
            <Pressable
              key={it.label}
              accessibilityRole="menuitem"
              onPress={() => {
                onClose();
                it.onPress();
              }}
              style={({ pressed }) => ({ minHeight: 52, justifyContent: "center", paddingHorizontal: spacing.lg, borderRadius: radii.md, backgroundColor: pressed ? colors.surface : "transparent" })}
            >
              <Text variant="bodyBold" style={{ color: it.destructive ? colors.danger : colors.text }}>
                {it.label}
              </Text>
            </Pressable>
          ))}
          <Button title="Cancel" variant="ghost" onPress={onClose} />
        </View>
      </Pressable>
    </Modal>
  );
}
