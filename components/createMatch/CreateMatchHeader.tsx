import { View, TouchableOpacity } from "react-native";
import { Text } from "~/components/ui/text";
import LucideIcon from "~/lib/icons/LucideIcon";
import { createMatch, headerBtnStyle } from "./createMatchStyles";
import { HEADER_ICON_HIT_SLOP } from "~/src/utils/touchA11y";

type CreateMatchHeaderProps = {
  topInset: number;
  onBack: () => void;
  title?: string;
};

export function CreateMatchHeader({
  topInset,
  onBack,
  title = "Create Match",
}: CreateMatchHeaderProps) {
  return (
    <View
      style={{
        paddingTop: topInset,
        paddingHorizontal: 12,
        paddingBottom: 8,
        backgroundColor: createMatch.pageBg,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", height: 48 }}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={HEADER_ICON_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={headerBtnStyle}
        >
          <LucideIcon name="ChevronLeft" size={22} color={createMatch.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{
              fontFamily: createMatch.fonts.extraBold,
              fontSize: 18,
              color: createMatch.ink,
            }}
          >
            {title}
          </Text>
        </View>
        <View style={{ width: 38 }} />
      </View>
    </View>
  );
}
