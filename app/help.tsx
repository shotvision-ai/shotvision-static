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
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useTheme } from "~/theming/ThemeProvider";

export default function Help() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
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
                Get Help
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
              <Text className="text-h3 font-bold text-foreground mb-2">How Can We Help?</Text>
              <Text className="text-body text-muted-foreground leading-6">
                We&apos;re here to assist you. Send us a message and we&apos;ll respond within 24
                hours.
              </Text>
            </View>

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
                        <LucideIcon
                          name={link.icon as any}
                          size={20}
                          color={theme.colors.mutedForeground ?? "#6b7280"}
                        />
                        <View className="flex-1">
                          <Text className="text-body font-medium text-foreground">{link.label}</Text>
                          <Text className="text-caption text-muted-foreground mt-0.5">
                            {link.subtitle}
                          </Text>
                        </View>
                      </View>
                      <LucideIcon
                        name="ChevronRight"
                        size={20}
                        color={theme.colors.mutedForeground ?? "#9ca3af"}
                      />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

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
                <View className="mb-4">
                  <Text className="text-body font-medium text-foreground mb-2">Subject</Text>
                  <Input
                    placeholder="Brief description of your issue"
                    value={subject}
                    onChangeText={setSubject}
                    className="rounded-xl border-0 bg-muted/40 px-4 py-3.5"
                  />
                </View>

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
        </KeyboardAvoidingView>
      </View>
    </>
  );
}
