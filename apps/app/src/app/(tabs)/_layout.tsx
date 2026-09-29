import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { router, Tabs, usePathname } from "expo-router";
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MatchesList } from "@/components/matches-list";
import { Logo, Text, type IconName } from "@/components/ui";
import { useMatches } from "@/lib/queries";
import { radii, spacing, TOUCH, useTheme, WIDE_BREAKPOINT } from "@/theme";

const TABS: { name: string; href: "/" | "/nearby" | "/matches" | "/profile"; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: "index", href: "/", title: "Discover", icon: "flame-outline", iconActive: "flame" },
  { name: "nearby", href: "/nearby", title: "Nearby", icon: "people-outline", iconActive: "people" },
  { name: "matches", href: "/matches", title: "Matches", icon: "chatbubbles-outline", iconActive: "chatbubbles" },
  { name: "profile", href: "/profile", title: "Profile", icon: "person-outline", iconActive: "person" },
];

export default function TabsLayout() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const wide = Platform.OS === "web" && width >= WIDE_BREAKPOINT;
  const unread = useMatches().data?.reduce((n, m) => n + m.unreadCount, 0) ?? 0;

  const tabs = (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surfaceRaised,
          borderTopColor: colors.border,
          boxShadow: colors.shadow,
          // Web's default 49px clips the labels; native keeps its safe-area-aware height.
          ...(Platform.OS === "web" ? { height: 64, paddingTop: 4 } : null),
        },
        tabBarBadgeStyle: { backgroundColor: colors.primary, fontSize: 11, fontWeight: "700" },
        tabBarLabelStyle: { fontSize: 11, lineHeight: 16, fontWeight: "700" },
      }}
      // Desktop web uses the sidebar instead of a bottom bar.
      tabBar={wide ? () => null : undefined}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarBadge: t.name === "matches" && unread ? unread : undefined,
            tabBarIcon: ({ color, focused, size }) => <Ionicons name={focused ? t.iconActive : t.icon} size={size} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );

  if (!wide) return tabs;
  return (
    <View style={{ flex: 1, flexDirection: "row", backgroundColor: colors.background }}>
      <Sidebar unread={unread} />
      <View style={{ flex: 1 }}>{tabs}</View>
    </View>
  );
}

/** ≥1024px web: navigation + matches list in a left sidebar. */
function Sidebar({ unread }: { unread: number }) {
  const { colors } = useTheme();
  const pathname = usePathname();
  return (
    <SafeAreaView style={[styles.sidebar, { borderRightColor: colors.border, backgroundColor: colors.background }]}>
      <View style={{ paddingHorizontal: spacing.sm }}>
        <Logo size={32} wordmark />
      </View>
      <View accessibilityRole="tablist" style={{ gap: 2 }}>
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Pressable
              key={t.name}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t.name === "matches" && unread ? `${t.title}, ${unread} unread` : t.title}
              onPress={() => router.navigate(t.href)}
              style={({ pressed }) => [
                styles.navItem,
                { backgroundColor: active ? colors.primarySoft : pressed ? colors.surface : "transparent" },
              ]}
            >
              <Ionicons name={active ? t.iconActive : t.icon} size={22} color={active ? colors.primary : colors.text} />
              <Text variant="bodyBold" style={active ? { color: colors.primary } : undefined}>
                {t.title}
              </Text>
              {t.name === "matches" && unread > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                  <Text variant="caption" style={{ color: colors.onPrimary }}>
                    {unread}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      <View style={{ flex: 1, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.md }}>
        <MatchesList compact />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Upgrade to KingxQueen Royal"
        onPress={() => router.push("/premium")}
        style={({ pressed }) => [styles.royal, { opacity: pressed ? 0.9 : 1 }]}
      >
        <LinearGradient colors={colors.royal} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Ionicons name="diamond" size={22} color={colors.gold} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyBold" style={{ color: "#FFFFFF" }}>
            KingxQueen Royal
          </Text>
          <Text variant="caption" style={{ color: "rgba(255,255,255,0.75)" }}>
            Unlimited rewinds, weekly super likes
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/settings")}
        style={({ pressed }) => [styles.navItem, { backgroundColor: pressed ? colors.surface : "transparent" }]}
      >
        <Ionicons name="settings-outline" size={22} color={colors.text} />
        <Text variant="bodyBold">Settings</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sidebar: { width: 340, borderRightWidth: StyleSheet.hairlineWidth, padding: spacing.lg, gap: spacing.md },
  royal: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderRadius: radii.lg, overflow: "hidden" },
  navItem: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: TOUCH, paddingHorizontal: spacing.md, borderRadius: radii.md },
  badge: { marginLeft: "auto", minWidth: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
});
