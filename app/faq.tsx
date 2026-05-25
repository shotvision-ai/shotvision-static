import { useState } from "react";
import { View, ScrollView, TouchableOpacity, Linking, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/components/ui/text";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import LucideIcon from "~/lib/icons/LucideIcon";

type FAQ = {
  question: string;
  answer: string;
};

export default function FAQ() {
  const androidTopOffset = Platform.OS === "android" ? 32 : 0;
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
              >
                <View className="flex-1 pr-3">
                  <Text className="text-body font-semibold text-foreground">{faq.question}</Text>
                </View>
                <LucideIcon
                  name={expandedIndex === index ? "ChevronUp" : "ChevronDown"}
                  size={20}
                  color="#666"
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
    </SafeAreaView>
  );
}
