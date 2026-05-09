import { View, Animated, StyleSheet } from "react-native";
import { Text } from "~/components/ui/text";
import { MatchStatus } from "~/types/match";
import { useEffect, useRef } from "react";

interface StatusBadgeProps {
  status: MatchStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
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
          bgColor: "#FFF4E5",
          textColor: "#F97316",
          borderColor: "#F97316",
        };
      case "completed":
        return {
          text: "Finished",
          bgColor: "#E6F4EA",
          textColor: "#16A34A",
          borderColor: undefined,
        };
      case "scheduled":
        return {
          text: "Scheduled",
          bgColor: "#E8F0FE",
          textColor: "#3B82F6",
          borderColor: undefined,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View
      style={[
        styles.badge,
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
      <Text style={[styles.text, { color: config.textColor }]}>{config.text}</Text>
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
});
