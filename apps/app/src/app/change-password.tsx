import { useState } from "react";
import { View } from "react-native";
import { MIN_PASSWORD, PasswordStrength } from "@/components/password-strength";
import { Button, Card, ErrorText, Header, Screen, Text, TextField } from "@/components/ui";
import { changePassword } from "@/lib/auth";
import { spacing, useTheme } from "@/theme";

export default function ChangePassword() {
  const { colors } = useTheme();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirmPw.length > 0 && confirmPw !== password;
  const same = password.length > 0 && password === current;
  const valid = current.length > 0 && password.length >= MIN_PASSWORD && confirmPw === password && !same;

  const submit = async () => {
    if (!valid) return;
    setLoading(true);
    setError(null);
    try {
      await changePassword(current, password);
      setDone(true);
      setCurrent("");
      setPassword("");
      setConfirmPw("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll edges={["top", "bottom"]} header={<Header title="Change password" />}>
      <View style={{ gap: spacing.lg, paddingTop: spacing.sm }}>
        {done && (
          <Card style={{ borderColor: colors.success }}>
            <Text variant="bodyBold" style={{ color: colors.success }} accessibilityLiveRegion="polite">
              Password changed. You’ve been signed out on your other devices.
            </Text>
          </Card>
        )}
        <TextField
          label="Current password"
          icon="lock-closed-outline"
          value={current}
          onChangeText={setCurrent}
          secureTextEntry
          autoComplete="current-password"
        />
        <View style={{ gap: spacing.sm }}>
          <TextField
            label="New password"
            icon="key-outline"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            error={same ? "Choose a password different from your current one" : null}
            hint={`At least ${MIN_PASSWORD} characters.`}
          />
          <PasswordStrength password={password} />
        </View>
        <TextField
          label="Confirm new password"
          icon="key-outline"
          value={confirmPw}
          onChangeText={setConfirmPw}
          secureTextEntry
          autoComplete="new-password"
          error={mismatch ? "Passwords don’t match" : null}
          onSubmitEditing={submit}
        />
        <ErrorText>{error}</ErrorText>
        <Button title="Change password" onPress={submit} loading={loading} disabled={!valid} />
        <Text variant="caption" muted style={{ textAlign: "center" }}>
          Signed up with Google? Your password is managed by Google, not KingxQueen.
        </Text>
      </View>
    </Screen>
  );
}
