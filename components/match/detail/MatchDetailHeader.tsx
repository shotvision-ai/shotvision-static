import { View, TouchableOpacity } from "react-native";
import { Text } from "~/components/ui/text";
import LucideIcon from "~/lib/icons/LucideIcon";
import { exploreColors, exploreFontFamily } from "~/lib/exploreDesign";
import { HEADER_ICON_HIT_SLOP } from "~/src/utils/touchA11y";

const headerBtnStyle = {
  width: 38,
  height: 38,
  borderRadius: 12,
  backgroundColor: exploreColors.cardBg,
  borderWidth: 1,
  borderColor: exploreColors.cardBorder,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

type MatchDetailHeaderProps = {
  topInset: number;
  onBack: () => void;
  onShare: () => void;
  onEdit?: () => void;
  showEdit?: boolean;
};

export function MatchDetailHeader({
  topInset,
  onBack,
  onShare,
  onEdit,
  showEdit = false,
}: MatchDetailHeaderProps) {
  return (
    <View
      style={{
        paddingTop: topInset,
        paddingHorizontal: 12,
        paddingBottom: 8,
        backgroundColor: exploreColors.pageBg,
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
          <LucideIcon name="ChevronLeft" size={22} color={exploreColors.ink} />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 8 }}>
          <Text
            style={{
              fontFamily: exploreFontFamily.extraBold,
              fontSize: 18,
              color: exploreColors.ink,
            }}
            numberOfLines={1}
          >
            Match Details
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            onPress={onShare}
            hitSlop={HEADER_ICON_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Share match"
            style={headerBtnStyle}
          >
            <LucideIcon name="Share2" size={18} color={exploreColors.ink} />
          </TouchableOpacity>
          {showEdit && onEdit ? (
            <TouchableOpacity
              onPress={onEdit}
              hitSlop={HEADER_ICON_HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Edit match"
              style={headerBtnStyle}
            >
              <LucideIcon name="PenLine" size={18} color={exploreColors.ink} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 38 }} />
          )}
        </View>
      </View>
    </View>
  );
}
