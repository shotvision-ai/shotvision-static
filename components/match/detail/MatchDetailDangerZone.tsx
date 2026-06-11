import { View, TouchableOpacity } from "react-native";
import { Text } from "~/components/ui/text";
import LucideIcon from "~/lib/icons/LucideIcon";
import { exploreColors, exploreFontFamily } from "~/lib/exploreDesign";
import { STANDARD_HIT_SLOP } from "~/src/utils/touchA11y";

const dangerBtnStyle = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  gap: 10,
  paddingVertical: 16,
  borderRadius: 14,
  backgroundColor: exploreColors.cardBg,
  borderWidth: 1,
  borderColor: "#FFE5E5",
};

type MatchDetailDangerZoneProps = {
  showCancel: boolean;
  showDelete: boolean;
  onCancel: () => void;
  onDelete: () => void;
};

export function MatchDetailDangerZone({
  showCancel,
  showDelete,
  onCancel,
  onDelete,
}: MatchDetailDangerZoneProps) {
  if (!showCancel && !showDelete) return null;

  return (
    <View style={{ gap: 8, marginBottom: 24 }}>
      {showCancel ? (
        <TouchableOpacity
          onPress={onCancel}
          hitSlop={STANDARD_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Cancel match"
          style={dangerBtnStyle}
        >
          <LucideIcon name="Ban" size={18} color={exploreColors.heart} />
          <Text
            style={{
              fontFamily: exploreFontFamily.extraBold,
              fontSize: 15,
              color: exploreColors.heart,
            }}
          >
            Cancel Match
          </Text>
        </TouchableOpacity>
      ) : null}
      {showDelete ? (
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={STANDARD_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Delete match"
          style={dangerBtnStyle}
        >
          <LucideIcon name="Trash2" size={18} color={exploreColors.heart} />
          <Text
            style={{
              fontFamily: exploreFontFamily.extraBold,
              fontSize: 15,
              color: exploreColors.heart,
            }}
          >
            Delete Match
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
