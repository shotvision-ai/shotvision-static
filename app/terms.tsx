import React from "react";
import { View, ScrollView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/components/ui/text";

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-7">
      <Text style={{ fontSize: 17, fontWeight: "700", color: "#1f2937", marginBottom: 10 }}>
        {number}. {title}
      </Text>
      {children}
    </View>
  );
}

function BulletItem({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 6 }}>
      <View
        style={{
          width: 5,
          height: 5,
          borderRadius: 3,
          backgroundColor: "#2563eb",
          marginTop: 8,
          marginRight: 10,
          flexShrink: 0,
        }}
      />
      <Text style={{ fontSize: 15, color: "#374151", lineHeight: 24, flex: 1 }}>{text}</Text>
    </View>
  );
}

export default function Terms() {
  const androidTopOffset = Platform.OS === "android" ? 32 : 0;
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8 + androidTopOffset,
          paddingBottom: 60,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6">
          <Text style={{ fontSize: 13, color: "#6b7280" }}>Last updated: February 26, 2026</Text>
        </View>

        <Section number="1" title="Acceptable Use">
          <Text style={{ fontSize: 15, color: "#374151", lineHeight: 24, marginBottom: 10 }}>
            You agree not to:
          </Text>
          <BulletItem text="Upload illegal, harmful, or offensive content" />
          <BulletItem text="Abuse the public match feature" />
          <BulletItem text="Attempt to disrupt the service" />
        </Section>

        <Section number="2" title="Public Matches">
          <Text style={{ fontSize: 15, color: "#374151", lineHeight: 24, marginBottom: 10 }}>
            If you make a match public:
          </Text>
          <BulletItem text="It may be visible to other users" />
          <BulletItem text="You are responsible for its content" />
          <Text style={{ fontSize: 15, color: "#374151", lineHeight: 24, marginTop: 6 }}>
            We reserve the right to remove public content that violates these terms.
          </Text>
        </Section>

        <Section number="3" title="Account Responsibility">
          <Text style={{ fontSize: 15, color: "#374151", lineHeight: 24 }}>
            You are responsible for maintaining your account security.
          </Text>
        </Section>

        <Section number="4" title="No Warranty">
          <Text style={{ fontSize: 15, color: "#374151", lineHeight: 24, marginBottom: 6 }}>
            Shot Vision is provided as is.
          </Text>
          <Text style={{ fontSize: 15, color: "#374151", lineHeight: 24 }}>
            We do not guarantee accuracy of match data.
          </Text>
        </Section>

        <Section number="5" title="Limitation of Liability">
          <Text style={{ fontSize: 15, color: "#374151", lineHeight: 24, marginBottom: 10 }}>
            We are not liable for:
          </Text>
          <BulletItem text="Data inaccuracies" />
          <BulletItem text="Data loss" />
          <BulletItem text="User generated content" />
        </Section>

        <Section number="6" title="Termination">
          <Text style={{ fontSize: 15, color: "#374151", lineHeight: 24 }}>
            We may suspend accounts that violate these terms.
          </Text>
        </Section>

        <Section number="7" title="Contact">
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: "rgba(37,99,235,0.06)",
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: "rgba(37,99,235,0.12)",
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#2563eb" }}>
              support@yourdomain.com
            </Text>
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
