import type { ReactNode } from "react";
import { View, type TextStyle, type ViewStyle } from "react-native";
import { Text } from "~/components/ui/text";
import { useTheme } from "~/theming/ThemeProvider";

const BRAND_BLUE = "#2563eb";

/** Tinted surfaces that stay readable in light and dark mode. */
export function usePolicySurfaces() {
  const { theme } = useTheme();
  const isDark = theme.name === "dark";

  return {
    foreground: theme.colors.foreground ?? (isDark ? "#f9fafb" : "#1f2937"),
    muted: theme.colors.mutedForeground ?? (isDark ? "#9ca3af" : "#6b7280"),
    card: theme.colors.card ?? theme.colors.background,
    border: theme.colors.border ?? (isDark ? "hsl(240 3.7% 15.9%)" : "hsl(240 5.9% 90%)"),
    primary: {
      bg: isDark ? "rgba(37,99,235,0.15)" : "rgba(37,99,235,0.06)",
      border: isDark ? "rgba(37,99,235,0.28)" : "rgba(37,99,235,0.12)",
      softBg: isDark ? "rgba(37,99,235,0.1)" : "rgba(37,99,235,0.04)",
      accent: BRAND_BLUE,
    },
    warning: {
      bg: isDark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.06)",
      border: isDark ? "rgba(245,158,11,0.28)" : "rgba(245,158,11,0.15)",
      title: isDark ? "#fbbf24" : "#92400e",
      body: isDark ? (theme.colors.foreground ?? "#e5e7eb") : "#78350f",
      dot: isDark ? "#fbbf24" : "#f59e0b",
    },
    danger: {
      bg: isDark ? "rgba(220,38,38,0.12)" : "rgba(220,38,38,0.06)",
      border: isDark ? "rgba(220,38,38,0.28)" : "rgba(220,38,38,0.15)",
      text: isDark ? "#f87171" : "#dc2626",
    },
  };
}

type PolicySectionProps = {
  title: string;
  number?: string;
  children: ReactNode;
};

export function PolicySection({ title, number, children }: PolicySectionProps) {
  const surfaces = usePolicySurfaces();
  const heading = number ? `${number}. ${title}` : title;

  return (
    <View className="mb-7">
      <Text
        style={{
          fontSize: 17,
          fontWeight: "700",
          color: surfaces.foreground,
          marginBottom: 10,
        }}
      >
        {heading}
      </Text>
      {children}
    </View>
  );
}

export function PolicyBodyText({
  children,
  style,
}: {
  children: ReactNode;
  style?: TextStyle;
}) {
  const surfaces = usePolicySurfaces();
  return (
    <Text style={[{ fontSize: 15, color: surfaces.foreground, lineHeight: 24 }, style]}>
      {children}
    </Text>
  );
}

export function PolicyMutedText({
  children,
  style,
}: {
  children: ReactNode;
  style?: TextStyle;
}) {
  const surfaces = usePolicySurfaces();
  return (
    <Text style={[{ fontSize: 14, color: surfaces.muted, lineHeight: 22 }, style]}>{children}</Text>
  );
}

export function PolicyBulletItem({ text }: { text: string }) {
  const surfaces = usePolicySurfaces();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 6 }}>
      <View
        style={{
          width: 5,
          height: 5,
          borderRadius: 3,
          backgroundColor: surfaces.primary.accent,
          marginTop: 8,
          marginRight: 10,
          flexShrink: 0,
        }}
      />
      <Text style={{ fontSize: 15, color: surfaces.foreground, lineHeight: 24, flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}

export function PolicyPrimaryCallout({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  const surfaces = usePolicySurfaces();
  return (
    <View
      style={[
        {
          backgroundColor: surfaces.primary.bg,
          borderRadius: 12,
          padding: 14,
          borderWidth: 1,
          borderColor: surfaces.primary.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function PolicyWarningCallout({ children }: { children: ReactNode }) {
  const surfaces = usePolicySurfaces();
  return (
    <View
      style={{
        backgroundColor: surfaces.warning.bg,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: surfaces.warning.border,
      }}
    >
      {children}
    </View>
  );
}

export { BRAND_BLUE };
