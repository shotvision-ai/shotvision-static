import { View, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Text } from "~/components/ui/text";
import LucideIcon, { type IconName } from "~/lib/icons/LucideIcon";
import { exploreColors, exploreFontFamily } from "~/lib/exploreDesign";

const TAB_CONFIG: Record<string, { label: string; icon: IconName }> = {
  explore: { label: "Explore", icon: "Compass" },
  dashboard: { label: "My Matches", icon: "LayoutList" },
  profile: { label: "Profile", icon: "CircleUser" },
};

export function ShotVisionTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        backgroundColor: exploreColors.cardBg,
        borderTopWidth: 1,
        borderTopColor: exploreColors.cardBorder,
        paddingBottom: Math.max(insets.bottom, Platform.OS === "ios" ? 8 : 10),
        paddingTop: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const config = TAB_CONFIG[route.name] ?? { label: route.name, icon: "Circle" as IconName };
          const color = focused ? exploreColors.tabActive : exploreColors.tabInactive;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={config.label}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                minHeight: 48,
              }}
            >
              <LucideIcon name={config.icon} size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
              <Text
                style={{
                  marginTop: 4,
                  fontFamily: exploreFontFamily.extraBold,
                  fontSize: 10,
                  color,
                }}
              >
                {config.label}
              </Text>
              {focused ? (
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: exploreColors.tabActive,
                    marginTop: 3,
                  }}
                />
              ) : (
                <View style={{ height: 8 }} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
