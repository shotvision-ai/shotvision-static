import { useState } from "react";
import { View, ScrollView, TouchableOpacity, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useTheme } from "~/theming/ThemeProvider";

type FAQ = {
  question: string;
  answer: string;
};

export default function FAQ() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useTheme();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [customQuery, setCustomQuery] = useState("");

  const faqs: FAQ[] = [
    {
      question: "How do I create a new match?",
      answer:
        "Tap the '+' button at the bottom of the My Matches screen. Fill in the player names, date, location, and scores. You can save it as Live, Scheduled, or Complete.",
    },
    {
      question: "What's the difference between Live, Scheduled, and Finished matches?",
      answer:
        "Live matches are currently in progress. Scheduled matches are planned for the future. Finished matches are completed and show the final scores and winner.",
    },
    {
      question: "How long can I edit a finished match?",
      answer:
        "You can edit a finished match for up to 48 hours after completion. After 48 hours, the match becomes locked and cannot be edited.",
    },
    {
      question: "What does making a match public do?",
      answer:
        "Public matches appear in the Explore tab where other users can view them. Private matches are only visible to you in the My Matches tab.",
    },
    {
      question: "How do I change my profile picture?",
      answer:
        "Go to Profile → Edit Profile and pick a default picture. Custom photo upload will be available in a future update.",
    },
  ];

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleSubmitQuery = () => {
    if (customQuery.trim()) {
      Linking.openURL(
        `mailto:support@shotvision.app?subject=Custom%20Query&body=${encodeURIComponent(customQuery)}`,
      );
      setCustomQuery("");
      alert("Your query has been sent to support!");
    }
  };

  return (
    <>
      {/* Tell the native-stack to render no header — we draw our own below */}
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {/* JS header: sits below the status bar using insets.top directly */}
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
            {/* Back button */}
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={{ padding: 8, marginLeft: 4 }}
            >
              <LucideIcon name="ChevronLeft" size={26} color={theme.colors.foreground} />
            </TouchableOpacity>

            {/* Title */}
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
                FAQs
              </Text>
            </View>

            {/* Spacer to balance the back button width */}
            <View style={{ width: 42 }} />
          </View>
        </View>

        {/* Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 40 + insets.bottom,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* FAQ List */}
          <View className="mb-8">
            {faqs.map((faq, index) => (
              <View
                key={index}
                className="bg-card rounded-2xl mb-4 overflow-hidden"
                style={{
                  shadowColor: "#2563eb",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <TouchableOpacity
                  onPress={() => toggleExpand(index)}
                  className="flex-row items-center justify-between px-4 py-4"
                  accessibilityRole="button"
                  accessibilityLabel={faq.question}
                  accessibilityState={{ expanded: expandedIndex === index }}
                  hitSlop={{ top: 8, bottom: 8, left: 0, right: 0 }}
                >
                  <View className="flex-1 pr-3">
                    <Text className="text-body font-semibold text-foreground">{faq.question}</Text>
                  </View>
                  <LucideIcon
                    name={expandedIndex === index ? "ChevronUp" : "ChevronDown"}
                    size={20}
                    color={theme.colors.mutedForeground ?? "#6b7280"}
                  />
                </TouchableOpacity>

                {expandedIndex === index && (
                  <View className="px-4 pb-4 pt-2 border-t border-border/10">
                    <Text className="text-body text-muted-foreground leading-6">{faq.answer}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Query Not Found Section */}
          <View className="mb-6">
            <View
              className="bg-card rounded-2xl p-5"
              style={{
                shadowColor: "#2563eb",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View className="flex-row items-center gap-2 mb-3">
                <LucideIcon name="MessageSquare" size={20} color="#22c55e" />
                <Text className="text-h4 font-semibold text-foreground">Query Not Found?</Text>
              </View>

              <Text className="text-body text-muted-foreground mb-4">
                Can't find what you're looking for? Send us your question and we'll get back to you.
              </Text>

              <Textarea
                placeholder="Type your question here..."
                value={customQuery}
                onChangeText={setCustomQuery}
                numberOfLines={4}
                className="min-h-[100px] mb-4"
              />

              <Button
                onPress={handleSubmitQuery}
                size="lg"
                className="rounded-xl bg-primary"
                disabled={!customQuery.trim()}
              >
                <Text className="text-button text-primary-foreground">Submit Query</Text>
              </Button>
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
}
