import { useState } from "react";
import { View, ScrollView, TouchableOpacity, Linking, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import LucideIcon from "~/lib/icons/LucideIcon";

export default function Feedback() {
  const router = useRouter();
  const androidTopOffset = Platform.OS === "android" ? 32 : 0;
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
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8 + androidTopOffset,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View className="mb-6">
          <Text className="text-h3 font-bold text-foreground mb-2">We Value Your Feedback</Text>
          <Text className="text-body text-muted-foreground leading-6">
            Help us improve Shot Vision by sharing your thoughts, reporting bugs, or suggesting new
            features.
          </Text>
        </View>

        {/* Feedback Type Selection */}
        <View className="mb-6">
          <Text className="text-body font-semibold text-foreground mb-3">Feedback Type</Text>
          <View className="gap-3">
            {feedbackTypes.map((type) => (
              <TouchableOpacity
                key={type.value}
                onPress={() => setSelectedType(type.value as any)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 16,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: selectedType === type.value ? type.color : "rgba(0, 0, 0, 0.1)",
                  backgroundColor: selectedType === type.value ? `${type.color}10` : "transparent",
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
                    color: selectedType === type.value ? type.color : "#1f2937",
                    marginLeft: 12,
                  }}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Feedback Text */}
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

        {/* Screenshot Upload (Future) */}
        <View
          className="bg-card rounded-2xl p-4 mb-6 border border-dashed border-border"
          style={{ opacity: 0.5 }}
        >
          <View className="flex-row items-center gap-3">
            <LucideIcon name="Image" size={20} color="#999" />
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

        {/* Submit Button */}
        <Button
          onPress={handleSubmit}
          size="lg"
          className="rounded-xl bg-primary"
          disabled={!feedback.trim() || !selectedType}
        >
          <Text className="text-button text-primary-foreground">Submit Feedback</Text>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
