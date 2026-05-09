import React from "react";
import { View, ScrollView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "~/components/ui/text";
import LucideIcon from "~/lib/icons/LucideIcon";

const BLUE = "#2563eb";

function Step({
  number,
  icon,
  title,
  description,
}: {
  number: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 14,
        marginBottom: 20,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: BLUE,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <LucideIcon name={icon as "Flag"} size={18} color="#ffffff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: "#1f2937", marginBottom: 4 }}>
          {number}. {title}
        </Text>
        <Text style={{ fontSize: 14, color: "#6b7280", lineHeight: 22 }}>{description}</Text>
      </View>
    </View>
  );
}

export default function ReportProcess() {
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
            marginBottom: 28,
            borderWidth: 1,
            borderColor: "rgba(37,99,235,0.12)",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: BLUE,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LucideIcon name="Flag" size={22} color="#ffffff" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1f2937" }}>
              How Match Reporting Works
            </Text>
          </View>
          <Text style={{ fontSize: 14, color: "#6b7280", lineHeight: 22 }}>
            Reporting helps keep Shot Vision accurate and trustworthy. Here's what happens when you
            report a match.
          </Text>
        </View>

        {/* Steps */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: "#9ca3af",
            letterSpacing: 0.5,
            marginBottom: 16,
          }}
        >
          THE PROCESS
        </Text>

        <Step
          number="1"
          icon="Flag"
          title="You submit a report"
          description="Tap the Report button on any public match. Select the reason that best describes the issue and optionally add more details."
        />
        <Step
          number="2"
          icon="Search"
          title="We review the report"
          description="Our team receives your report and reviews the match content — including scores, player names, notes, and profile pictures."
        />
        <Step
          number="3"
          icon="ShieldCheck"
          title="Action is taken"
          description="If the report is valid, the match may be edited, hidden from public view, or removed. The match creator may also be notified."
        />
        <Step
          number="4"
          icon="CircleCheck"
          title="You stay informed"
          description="In serious cases, we may follow up with you. Your identity as a reporter is kept confidential."
        />

        {/* What can be reported */}
        <View
          style={{
            backgroundColor: "rgba(245,158,11,0.06)",
            borderRadius: 16,
            padding: 16,
            marginTop: 8,
            borderWidth: 1,
            borderColor: "rgba(245,158,11,0.15)",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <LucideIcon name="TriangleAlert" size={18} color="#f59e0b" />
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#92400e" }}>
              What can be reported
            </Text>
          </View>
          {[
            "Incorrect or fabricated match scores",
            "Wrong or fake player names",
            "Inappropriate or offensive match notes",
            "Misleading match details",
            "Fake or duplicate match entries",
            "Wrong profile picture",
          ].map((item) => (
            <View
              key={item}
              style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 6 }}
            >
              <View
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: "#f59e0b",
                  marginTop: 8,
                  marginRight: 10,
                  flexShrink: 0,
                }}
              />
              <Text style={{ fontSize: 13, color: "#78350f", lineHeight: 22, flex: 1 }}>
                {item}
              </Text>
            </View>
          ))}
        </View>

        {/* Undo note */}
        <View
          style={{
            backgroundColor: "rgba(37,99,235,0.05)",
            borderRadius: 14,
            padding: 14,
            marginTop: 16,
            borderWidth: 1,
            borderColor: "rgba(37,99,235,0.1)",
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <LucideIcon name="Info" size={18} color={BLUE} />
          <Text style={{ fontSize: 13, color: "#1e40af", lineHeight: 20, flex: 1 }}>
            Made a mistake? You can undo a report at any time by tapping the{" "}
            <Text style={{ fontWeight: "700" }}>Reported</Text> button on the match card.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
