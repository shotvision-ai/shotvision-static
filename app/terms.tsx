import React from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useTheme } from "~/theming/ThemeProvider";
import {
  PolicyBodyText,
  PolicyBulletItem,
  PolicyMutedText,
  PolicyPrimaryCallout,
  PolicySection,
  usePolicySurfaces,
} from "~/components/layout/PolicyPrimitives";

export default function Terms() {
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
                Terms of Service
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
          <View className="mb-6">
            <PolicyMutedText style={{ fontSize: 13 }}>
              Last updated: February 26, 2026
            </PolicyMutedText>
          </View>

          <PolicySection number="1" title="Acceptable Use">
            <PolicyBodyText style={{ marginBottom: 10 }}>You agree not to:</PolicyBodyText>
            <PolicyBulletItem text="Upload illegal, harmful, or offensive content" />
            <PolicyBulletItem text="Abuse the public match feature" />
            <PolicyBulletItem text="Attempt to disrupt the service" />
          </PolicySection>

          <PolicySection number="2" title="Public Matches">
            <PolicyBodyText style={{ marginBottom: 10 }}>If you make a match public:</PolicyBodyText>
            <PolicyBulletItem text="It may be visible to other users" />
            <PolicyBulletItem text="You are responsible for its content" />
            <PolicyBodyText style={{ marginTop: 6 }}>
              We reserve the right to remove public content that violates these terms.
            </PolicyBodyText>
          </PolicySection>

          <PolicySection number="3" title="Account Responsibility">
            <PolicyBodyText>
              You are responsible for maintaining your account security.
            </PolicyBodyText>
          </PolicySection>

          <PolicySection number="4" title="No Warranty">
            <PolicyBodyText style={{ marginBottom: 6 }}>
              Shot Vision is provided as is.
            </PolicyBodyText>
            <PolicyBodyText>We do not guarantee accuracy of match data.</PolicyBodyText>
          </PolicySection>

          <PolicySection number="5" title="Limitation of Liability">
            <PolicyBodyText style={{ marginBottom: 10 }}>We are not liable for:</PolicyBodyText>
            <PolicyBulletItem text="Data inaccuracies" />
            <PolicyBulletItem text="Data loss" />
            <PolicyBulletItem text="User generated content" />
          </PolicySection>

          <PolicySection number="6" title="Termination">
            <PolicyBodyText>
              We may suspend accounts that violate these terms.
            </PolicyBodyText>
          </PolicySection>

          <PolicySection number="7" title="Contact">
            <PolicyPrimaryCallout>
              <Text style={{ fontSize: 15, fontWeight: "600", color: surfaces.primary.accent }}>
                support@shotvision.app
              </Text>
            </PolicyPrimaryCallout>
          </PolicySection>
        </ScrollView>
      </View>
    </>
  );
}
