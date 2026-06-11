import { View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import LucideIcon from "~/lib/icons/LucideIcon";
import { exploreColors, exploreFontFamily } from "~/lib/exploreDesign";
import { HEADER_ICON_HIT_SLOP } from "~/src/utils/touchA11y";

type MatchesListScreenHeaderProps = {
  title: string;
};

export function MatchesListScreenHeader({ title }: MatchesListScreenHeaderProps) {
  const router = useRouter();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 14,
      }}
    >
      <Text
        style={{
          fontFamily: exploreFontFamily.black,
          fontSize: 28,
          color: exploreColors.ink,
          letterSpacing: -0.8,
        }}
      >
        {title}
      </Text>
      <TouchableOpacity
        onPress={() => router.push("/notifications")}
        hitSlop={HEADER_ICON_HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        style={{
          width: 42,
          height: 42,
          borderRadius: 13,
          backgroundColor: exploreColors.cardBg,
          borderWidth: 1,
          borderColor: exploreColors.cardBorder,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LucideIcon name="Bell" size={20} color={exploreColors.ink} />
      </TouchableOpacity>
    </View>
  );
}
