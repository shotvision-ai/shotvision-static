import { useState } from "react";
import { View, ScrollView, TouchableOpacity, Linking, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { Textarea } from "~/components/ui/textarea";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import LucideIcon from "~/lib/icons/LucideIcon";

export default function Help() {
  const router = useRouter();
  const androidTopOffset = Platform.OS === "android" ? 32 : 0;
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert("Missing Information", "Please enter both subject and message.");
      return;
    }

    Linking.openURL(
      `mailto:support@shotvision.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`,
    );

    Alert.alert(
      "Email Sent",
      "Your support request has been sent. We'll get back to you within 24 hours.",
      [
        {
          text: "OK",
          onPress: () => {
            setSubject("");
            setMessage("");
            router.back();
          },
        },
      ],
    );
  };

  const quickLinks = [
    {
      icon: "BookOpen",
      label: "FAQs",
      subtitle: "Browse frequently asked questions",
      action: () => router.push("/faq"),
    },
    {
      icon: "Mail",
      label: "Email Support",
      subtitle: "support@shotvision.app",
      action: () => Linking.openURL("mailto:support@shotvision.app"),
    },
  ];

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
          <Text className="text-h3 font-bold text-foreground mb-2">How Can We Help?</Text>
          <Text className="text-body text-muted-foreground leading-6">
            We're here to assist you. Send us a message and we'll respond within 24 hours.
          </Text>
        </View>

        {/* Quick Links */}
        <View className="mb-8">
          <Text className="text-caption font-semibold text-muted-foreground mb-3 px-1">
            QUICK LINKS
          </Text>
          <View className="gap-3">
            {quickLinks.map((link, index) => (
              <TouchableOpacity
                key={index}
                onPress={link.action}
                className="bg-card rounded-2xl overflow-hidden"
                style={{
                  shadowColor: "#2563eb",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <View className="flex-row items-center justify-between px-4 py-4">
                  <View className="flex-row items-center gap-3 flex-1">
                    <LucideIcon name={link.icon as any} size={20} color="#666" />
                    <View className="flex-1">
                      <Text className="text-body font-medium text-foreground">{link.label}</Text>
                      <Text className="text-caption text-muted-foreground mt-0.5">
                        {link.subtitle}
                      </Text>
                    </View>
                  </View>
                  <LucideIcon name="ChevronRight" size={20} color="#999" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Contact Form */}
        <View className="mb-6">
          <Text className="text-caption font-semibold text-muted-foreground mb-3 px-1">
            CONTACT SUPPORT
          </Text>

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
            {/* Subject */}
            <View className="mb-4">
              <Text className="text-body font-medium text-foreground mb-2">Subject</Text>
              <Input
                placeholder="Brief description of your issue"
                value={subject}
                onChangeText={setSubject}
                className="rounded-xl border-0 bg-muted/40 px-4 py-3.5"
              />
            </View>

            {/* Message */}
            <View className="mb-5">
              <Text className="text-body font-medium text-foreground mb-2">Message</Text>
              <Textarea
                placeholder="Describe your issue or question in detail..."
                value={message}
                onChangeText={setMessage}
                numberOfLines={6}
                className="min-h-[140px]"
              />
            </View>

            {/* Submit Button */}
            <Button
              onPress={handleSubmit}
              size="lg"
              className="rounded-xl bg-primary"
              disabled={!subject.trim() || !message.trim()}
            >
              <Text className="text-button text-primary-foreground">Send Message</Text>
            </Button>
          </View>
        </View>

        {/* Response Time */}
        <View
          className="bg-card rounded-2xl p-4 border border-primary/20"
          style={{ backgroundColor: "rgba(34, 197, 94, 0.05)" }}
        >
          <View className="flex-row items-center gap-3">
            <LucideIcon name="Clock" size={20} color="#22c55e" />
            <View className="flex-1">
              <Text className="text-body font-medium text-foreground">
                Average Response Time: 24 hours
              </Text>
              <Text className="text-caption text-muted-foreground mt-0.5">
                We typically respond within one business day
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
