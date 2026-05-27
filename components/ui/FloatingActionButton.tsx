import { TouchableOpacity, Animated, Platform } from "react-native";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useRouter } from "expo-router";
import { useRef } from "react";

export function FloatingActionButton() {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;

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
        bottom: Platform.OS === "web" ? 20 : 80,
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
          borderRadius: 28,
          backgroundColor: "#1d4ed8",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#1d4ed8",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.45,
          shadowRadius: 10,
          elevation: 8,
        }}
        activeOpacity={1}
      >
        <LucideIcon name="Plus" size={28} color="white" />
      </TouchableOpacity>
    </Animated.View>
  );
}
