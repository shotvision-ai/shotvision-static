import { useEffect, useRef } from "react";
import { View, Animated } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import LucideIcon from "~/lib/icons/LucideIcon";

export default function Splash() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate after 3 seconds
    const timer = setTimeout(() => {
      router.replace("/login");
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#1d4ed8",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: "#ffffff",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <LucideIcon name="Trophy" size={50} color="#1d4ed8" />
        </View>

        <Text
          style={{
            fontSize: 32,
            fontWeight: "700",
            color: "#ffffff",
            marginBottom: 8,
          }}
        >
          Shot Vision
        </Text>

        <Text
          style={{
            fontSize: 16,
            fontWeight: "500",
            color: "rgba(255, 255, 255, 0.9)",
          }}
        >
          Track Your Tennis Journey
        </Text>
      </Animated.View>
    </View>
  );
}
