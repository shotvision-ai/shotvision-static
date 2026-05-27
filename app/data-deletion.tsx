import React from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useTheme } from "~/theming/ThemeProvider";
import {
  BRAND_BLUE,
  PolicyBodyText,
  PolicyBulletItem,
  PolicyMutedText,
  PolicyPrimaryCallout,
  PolicySection,
  usePolicySurfaces,
} from "~/components/layout/PolicyPrimitives";

export default function DataDeletion() {
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
                Data Deletion
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
          <View
            style={{
              backgroundColor: surfaces.primary.bg,
              borderRadius: 20,
              padding: 20,
              marginBottom: 24,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              borderWidth: 1,
              borderColor: surfaces.primary.border,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: BRAND_BLUE,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LucideIcon name="ShieldCheck" size={24} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: surfaces.foreground,
                  marginBottom: 2,
                }}
              >
                You control your data
              </Text>
              <PolicyMutedText style={{ fontSize: 13, lineHeight: 20 }}>
                You have full control over your data in Shot Vision.
              </PolicyMutedText>
            </View>
          </View>

          <PolicySection title="How to Delete Your Account">
            <PolicyPrimaryCallout
              style={{
                marginBottom: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                backgroundColor: surfaces.primary.softBg,
              }}
            >
              <LucideIcon name="Settings" size={18} color={BRAND_BLUE} />
              <Text style={{ fontSize: 15, fontWeight: "600", color: BRAND_BLUE }}>
                Settings → Delete Account
              </Text>
            </PolicyPrimaryCallout>
            <PolicyMutedText style={{ marginBottom: 12 }}>
              Once you confirm deletion:
            </PolicyMutedText>
            <PolicyBulletItem text="Your profile will be permanently removed" />
            <PolicyBulletItem text="All matches you created will be permanently deleted" />
            <PolicyBulletItem text="Public matches will be removed from public view" />
            <PolicyBulletItem text="Your device notification tokens will be removed" />
            <PolicyBulletItem text="All associated data will be erased from our servers" />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: surfaces.danger.bg,
                borderRadius: 12,
                padding: 12,
                marginTop: 12,
                borderWidth: 1,
                borderColor: surfaces.danger.border,
              }}
            >
              <LucideIcon name="TriangleAlert" size={16} color={surfaces.danger.text} />
              <Text
                style={{ fontSize: 13, color: surfaces.danger.text, fontWeight: "600", flex: 1 }}
              >
                This action cannot be undone.
              </Text>
            </View>
          </PolicySection>

          <PolicySection title="What Happens After Deletion">
            <PolicyMutedText style={{ marginBottom: 12 }}>After deletion:</PolicyMutedText>
            <PolicyBulletItem text="You will be logged out immediately" />
            <PolicyBulletItem text="Your data will no longer be accessible" />
            <PolicyBulletItem text="You will need to create a new account to use the app again" />
          </PolicySection>

          <PolicySection title="Processing Time">
            <PolicyBodyText style={{ marginBottom: 8 }}>
              Account deletion is processed immediately upon confirmation.
            </PolicyBodyText>
            <PolicyBodyText>
              In rare technical cases, deletion may take up to 7 days to fully propagate through
              backups.
            </PolicyBodyText>
          </PolicySection>

          <PolicySection title="Need Help?">
            <PolicyBodyText style={{ marginBottom: 12 }}>
              If you experience issues deleting your account, contact:
            </PolicyBodyText>
            <PolicyPrimaryCallout
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <LucideIcon name="Mail" size={18} color={BRAND_BLUE} />
              <Text style={{ fontSize: 15, fontWeight: "600", color: BRAND_BLUE }}>
                support@shotvision.app
              </Text>
            </PolicyPrimaryCallout>
          </PolicySection>
        </ScrollView>
      </View>
    </>
  );
}
