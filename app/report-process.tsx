import React from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useTheme } from "~/theming/ThemeProvider";
import {
  BRAND_BLUE,
  PolicyMutedText,
  PolicyPrimaryCallout,
  PolicyWarningCallout,
  usePolicySurfaces,
} from "~/components/layout/PolicyPrimitives";

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
  const surfaces = usePolicySurfaces();

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
          backgroundColor: BRAND_BLUE,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <LucideIcon name={icon as "Flag"} size={18} color="#ffffff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "700",
            color: surfaces.foreground,
            marginBottom: 4,
          }}
        >
          {number}. {title}
        </Text>
        <PolicyMutedText>{description}</PolicyMutedText>
      </View>
    </View>
  );
}

export default function ReportProcess() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useTheme();
  const surfaces = usePolicySurfaces();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
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
                Report a Match
              </Text>
            </View>

            <View style={{ width: 44 }} />
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 40 + insets.bottom,
          }}
          showsVerticalScrollIndicator={false}
        >
          <PolicyPrimaryCallout style={{ borderRadius: 20, padding: 20, marginBottom: 28 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: BRAND_BLUE,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <LucideIcon name="Flag" size={22} color="#ffffff" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: "700", color: surfaces.foreground }}>
                How Match Reporting Works
              </Text>
            </View>
            <PolicyMutedText>
              Reporting helps keep Shot Vision accurate and trustworthy. Here&apos;s what happens
              when you report a match.
            </PolicyMutedText>
          </PolicyPrimaryCallout>

          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: surfaces.muted,
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

          <PolicyWarningCallout>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <LucideIcon name="TriangleAlert" size={18} color={surfaces.warning.dot} />
              <Text style={{ fontSize: 14, fontWeight: "700", color: surfaces.warning.title }}>
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
                    backgroundColor: surfaces.warning.dot,
                    marginTop: 8,
                    marginRight: 10,
                    flexShrink: 0,
                  }}
                />
                <Text
                  style={{
                    fontSize: 13,
                    color: surfaces.warning.body,
                    lineHeight: 22,
                    flex: 1,
                  }}
                >
                  {item}
                </Text>
              </View>
            ))}
          </PolicyWarningCallout>

          <PolicyPrimaryCallout
            style={{
              marginTop: 16,
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 10,
              backgroundColor: surfaces.primary.softBg,
            }}
          >
            <LucideIcon name="Info" size={18} color={BRAND_BLUE} />
            <Text style={{ fontSize: 13, color: surfaces.foreground, lineHeight: 20, flex: 1 }}>
              Made a mistake? You can undo a report at any time by tapping the{" "}
              <Text style={{ fontWeight: "700", color: surfaces.foreground }}>Reported</Text> button
              on the match card.
            </Text>
          </PolicyPrimaryCallout>
        </ScrollView>
      </View>
    </>
  );
}
