import { useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useTheme } from "~/theming/ThemeProvider";

export default function Feedback() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme.name === "dark";
  const borderDefault = theme.colors.border ?? (isDark ? "hsl(240 3.7% 20%)" : "rgba(0,0,0,0.1)");
  const unselectedCardBg = theme.colors.card ?? theme.colors.background;
  const [feedback, setFeedback] = useState("");
  const [selectedType, setSelectedType] = useState<"bug" | "feature" | "improvement" | null>(null);

  const feedbackTypes = [
    { value: "bug", label: "Bug Report", icon: "Bug", color: "#ef4444" },
    { value: "feature", label: "Feature Request", icon: "Lightbulb", color: "#22c55e" },
    { value: "improvement", label: "Improvement", icon: "TrendingUp", color: "#3b82f6" },
  ];

  const handleSubmit = () => {
    if (!feedback.trim() || !selectedType) {
      Alert.alert("Missing Information", "Please select a feedback type and enter your feedback.");
      return;
    }

    const subject = `Shot Vision Feedback: ${feedbackTypes.find((t) => t.value === selectedType)?.label}`;
    const body = feedback;

    Linking.openURL(
      `mailto:feedback@shotvision.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    );

    Alert.alert("Thank You!", "Your feedback has been sent. We appreciate your input!", [
      {
        text: "OK",
        onPress: () => {
          setFeedback("");
          setSelectedType(null);
          router.back();
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {/* JS header: sits below the status bar using insets.top directly (FAQ pattern) */}
        <View
          style={{
            paddingTop: insets.top,
            paddingLeft: insets.left,
            paddingRight: insets.right,
            backgroundColor: theme.colors.background,
          }}
        >
          <View
            style={{
              height: 56,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 4,
            }}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={{
                padding: 8,
                marginLeft: 4,
                minWidth: 44,
                minHeight: 44,
                justifyContent: "center",
              }}
            >
              <LucideIcon name="ChevronLeft" size={26} color={theme.colors.foreground} />
            </TouchableOpacity>

            <View style={{ flex: 1, alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  fontFamily: theme.typography.h2?.fontFamily,
                  color: theme.colors.foreground,
                }}
                numberOfLines={1}
              >
                Send Feedback
              </Text>
            </View>

            <View style={{ width: 44 }} />
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 56 : 0}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 8,
              paddingBottom: 40 + insets.bottom,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View className="mb-6">
              <Text className="text-h3 font-bold text-foreground mb-2">We Value Your Feedback</Text>
              <Text className="text-body text-muted-foreground leading-6">
                Help us improve Shot Vision by sharing your thoughts, reporting bugs, or suggesting
                new features.
              </Text>
            </View>

            <View className="mb-6">
              <Text className="text-body font-semibold text-foreground mb-3">Feedback Type</Text>
              <View className="gap-3">
                {feedbackTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    onPress={() => setSelectedType(type.value as "bug" | "feature" | "improvement")}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 16,
                      borderRadius: 16,
                      borderWidth: 2,
                      borderColor: selectedType === type.value ? type.color : borderDefault,
                      backgroundColor:
                        selectedType === type.value
                          ? `${type.color}${isDark ? "22" : "10"}`
                          : unselectedCardBg,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: `${type.color}20`,
                      }}
                    >
                      <LucideIcon name={type.icon as any} size={20} color={type.color} />
                    </View>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color:
                          selectedType === type.value
                            ? type.color
                            : theme.colors.foreground,
                        marginLeft: 12,
                      }}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-body font-semibold text-foreground mb-3">Your Feedback</Text>
              <Textarea
                placeholder="Tell us what's on your mind..."
                value={feedback}
                onChangeText={setFeedback}
                numberOfLines={8}
                className="min-h-[180px]"
              />
            </View>

            <View
              className="bg-card rounded-2xl p-4 mb-6 border border-dashed border-border"
              style={{ opacity: 0.5 }}
            >
              <View className="flex-row items-center gap-3">
                <LucideIcon name="Image" size={20} color={theme.colors.mutedForeground} />
                <View className="flex-1">
                  <Text className="text-body font-medium text-muted-foreground">
                    Attach Screenshot (Coming Soon)
                  </Text>
                  <Text className="text-caption text-muted-foreground mt-0.5">
                    Optional: Add a screenshot to help explain
                  </Text>
                </View>
              </View>
            </View>

            <Button
              onPress={handleSubmit}
              size="lg"
              className="rounded-xl bg-primary"
              disabled={!feedback.trim() || !selectedType}
            >
              <Text className="text-button text-primary-foreground">Submit Feedback</Text>
            </Button>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </>
  );
}
