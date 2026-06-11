import { View, Animated, StyleSheet } from "react-native";
import { Text } from "~/components/ui/text";
import { MatchStatus } from "~/types/match";
import { useEffect, useRef } from "react";
import { useAppTheming } from "~/src/hooks/useAppTheming";

interface StatusBadgeProps {
  status: MatchStatus;
  compact?: boolean;
}

export function StatusBadge({ status, compact = false }: StatusBadgeProps) {
  const { colors } = useAppTheming();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === "live") {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [status, pulseAnim]);

  const getStatusConfig = () => {
    switch (status) {
      case "live":
        return {
          text: "Live",
          bgColor: colors.badge.live.bg,
          textColor: colors.badge.live.text,
          borderColor: colors.badge.live.border,
        };
      case "completed":
        return {
          text: "Finished",
          bgColor: colors.badge.finished.bg,
          textColor: colors.badge.finished.text,
          borderColor: undefined,
        };
      case "scheduled":
        return {
          text: "Scheduled",
          bgColor: colors.badge.scheduled.bg,
          textColor: colors.badge.scheduled.text,
          borderColor: undefined,
        };
      case "cancelled":
        return {
          text: "Cancelled",
          bgColor: "rgba(239,68,68,0.12)",
          textColor: "#dc2626",
          borderColor: undefined,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View
      style={[
        styles.badge,
        compact && styles.badgeCompact,
        {
          backgroundColor: config.bgColor,
          borderLeftWidth: status === "live" ? 3 : 0,
          borderLeftColor: config.borderColor,
        },
      ]}
    >
      {status === "live" && (
        <Animated.View
          style={[
            styles.pulseDot,
            {
              backgroundColor: config.textColor,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
      )}
      <Text
        style={[styles.text, compact && styles.textCompact, { color: config.textColor }]}
      >
        {config.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
  textCompact: {
    fontSize: 11,
  },
});
