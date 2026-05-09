import React from "react";
import { View, ScrollView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/components/ui/text";
import LucideIcon from "~/lib/icons/LucideIcon";

const BLUE = "#2563eb";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-7">
      <Text style={{ fontSize: 17, fontWeight: "700", color: "#1f2937", marginBottom: 10 }}>
        {title}
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
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: BLUE,
          marginTop: 7,
          marginRight: 10,
          flexShrink: 0,
        }}
      />
      <Text style={{ fontSize: 15, color: "#374151", lineHeight: 24, flex: 1 }}>{text}</Text>
    </View>
  );
}

export default function DataDeletion() {
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
        {/* Hero */}
        <View
          style={{
            backgroundColor: "rgba(37,99,235,0.06)",
            borderRadius: 20,
            padding: 20,
            marginBottom: 24,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            borderWidth: 1,
            borderColor: "rgba(37,99,235,0.12)",
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: BLUE,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LucideIcon name="ShieldCheck" size={24} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#1f2937", marginBottom: 2 }}>
              You control your data
            </Text>
            <Text style={{ fontSize: 13, color: "#6b7280", lineHeight: 20 }}>
              You have full control over your data in Shot Vision.
            </Text>
          </View>
        </View>

        <Section title="How to Delete Your Account">
          <View
            style={{
              backgroundColor: "rgba(37,99,235,0.04)",
              borderRadius: 14,
              padding: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: "rgba(37,99,235,0.1)",
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <LucideIcon name="Settings" size={18} color={BLUE} />
            <Text style={{ fontSize: 15, fontWeight: "600", color: BLUE }}>
              Settings → Delete Account
            </Text>
          </View>
          <Text style={{ fontSize: 14, color: "#6b7280", lineHeight: 22, marginBottom: 12 }}>
            Once you confirm deletion:
          </Text>
          <BulletItem text="Your profile will be permanently removed" />
          <BulletItem text="All matches you created will be permanently deleted" />
          <BulletItem text="Public matches will be removed from public view" />
          <BulletItem text="Your device notification tokens will be removed" />
          <BulletItem text="All associated data will be erased from our servers" />
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: "rgba(220,38,38,0.06)",
              borderRadius: 12,
              padding: 12,
              marginTop: 12,
              borderWidth: 1,
              borderColor: "rgba(220,38,38,0.15)",
            }}
          >
            <LucideIcon name="TriangleAlert" size={16} color="#dc2626" />
            <Text style={{ fontSize: 13, color: "#dc2626", fontWeight: "600", flex: 1 }}>
              This action cannot be undone.
            </Text>
          </View>
        </Section>

        <Section title="What Happens After Deletion">
          <Text style={{ fontSize: 14, color: "#6b7280", lineHeight: 22, marginBottom: 12 }}>
            After deletion:
          </Text>
          <BulletItem text="You will be logged out immediately" />
          <BulletItem text="Your data will no longer be accessible" />
          <BulletItem text="You will need to create a new account to use the app again" />
        </Section>

        <Section title="Processing Time">
          <Text style={{ fontSize: 15, color: "#374151", lineHeight: 24, marginBottom: 8 }}>
            Account deletion is processed immediately upon confirmation.
          </Text>
          <Text style={{ fontSize: 15, color: "#374151", lineHeight: 24 }}>
            In rare technical cases, deletion may take up to 7 days to fully propagate through
            backups.
          </Text>
        </Section>

        <Section title="Need Help?">
          <Text style={{ fontSize: 15, color: "#374151", lineHeight: 24, marginBottom: 12 }}>
            If you experience issues deleting your account, contact:
          </Text>
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
            <LucideIcon name="Mail" size={18} color={BLUE} />
            <Text style={{ fontSize: 15, fontWeight: "600", color: BLUE }}>
              support@yourdomain.com
            </Text>
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
