import React from "react";
import { View, ScrollView, TouchableOpacity, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/components/ui/text";
import LucideIcon from "~/lib/icons/LucideIcon";
import * as WebBrowser from "expo-web-browser";
import { PRIVACY_POLICY_URL } from "../src/constants/legalUrls";

export default function Privacy() {
  const handleOpenPolicy = async () => {
    await WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 40,
          paddingBottom: 60,
          alignItems: "center",
          justifyContent: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: "rgba(37, 99, 235, 0.1)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <LucideIcon name="ShieldCheck" size={40} color="#2563eb" />
        </View>

        <Text style={{ fontSize: 24, fontWeight: "700", color: "#1f2937", textAlign: "center", marginBottom: 12 }}>
          Privacy Policy
        </Text>

        <Text style={{ fontSize: 16, color: "#6b7280", textAlign: "center", lineHeight: 24, marginBottom: 32, paddingHorizontal: 20 }}>
          Our privacy policy is hosted on Notion to ensure you always have access to the latest version.
        </Text>

        <TouchableOpacity
          onPress={handleOpenPolicy}
          style={{
            backgroundColor: "#2563eb",
            paddingHorizontal: 32,
            paddingVertical: 16,
            borderRadius: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            shadowColor: "#2563eb",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#ffffff" }}>
            View Privacy Policy
          </Text>
          <LucideIcon name="ExternalLink" size={18} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
          style={{ marginTop: 24 }}
        >
          <Text style={{ fontSize: 14, color: "#2563eb", textDecorationLine: "underline" }}>
            Open in browser
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
