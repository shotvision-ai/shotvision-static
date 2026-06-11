import { TouchableOpacity, Animated, Platform } from "react-native";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useRouter } from "expo-router";
import { useRef } from "react";
import { exploreColors } from "~/lib/exploreDesign";

type FloatingActionButtonProps = {
  /** Safe-area bottom inset so FAB clears the tab bar. */
  bottomInset?: number;
};

export function FloatingActionButton({ bottomInset = 0 }: FloatingActionButtonProps) {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const tabBarClearance = Platform.OS === "web" ? 0 : 56;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={{
        position: "absolute",
        right: 20,
        bottom: Math.max(20, 20 + bottomInset + tabBarClearance),
        transform: [{ scale: scaleAnim }],
      }}
    >
      <TouchableOpacity
        onPress={() => router.push("/create-match")}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel="Create match"
        accessibilityHint="Opens the create match form"
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: exploreColors.coral,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: exploreColors.coral,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 12,
          elevation: 8,
        }}
        activeOpacity={1}
      >
        <LucideIcon name="Plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );
}
