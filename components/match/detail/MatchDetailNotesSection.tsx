import { View, TouchableOpacity } from "react-native";
import { Text } from "~/components/ui/text";
import { exploreColors, exploreFontFamily } from "~/lib/exploreDesign";
import LucideIcon from "~/lib/icons/LucideIcon";
import { STANDARD_HIT_SLOP } from "~/src/utils/touchA11y";

type MatchDetailNotesSectionProps = {
  notes?: string;
  canEdit: boolean;
  onAddOrEdit: () => void;
};

export function MatchDetailNotesSection({ notes, canEdit, onAddOrEdit }: MatchDetailNotesSectionProps) {
  if (!notes && !canEdit) return null;

  return (
    <View style={{ marginBottom: 20 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <Text
          style={{
            fontFamily: exploreFontFamily.extraBold,
            fontSize: 18,
            color: exploreColors.ink,
          }}
        >
          Notes
        </Text>
        {canEdit ? (
          <TouchableOpacity
            onPress={onAddOrEdit}
            hitSlop={STANDARD_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={notes ? "Edit notes" : "Add notes"}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: exploreColors.notesBtnBg,
            }}
          >
            <LucideIcon name="FileText" size={14} color={exploreColors.coral} />
            <Text
              style={{
                fontFamily: exploreFontFamily.extraBold,
                fontSize: 12,
                color: exploreColors.coral,
              }}
            >
              {notes ? "Edit" : "Add"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {notes ? (
        <View
          style={{
            backgroundColor: exploreColors.cardBg,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: exploreColors.cardBorder,
            padding: 16,
          }}
        >
          <Text
            style={{
              fontFamily: exploreFontFamily.regular,
              fontSize: 14,
              color: exploreColors.ink,
              lineHeight: 22,
            }}
          >
            {notes}
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          onPress={onAddOrEdit}
          accessibilityRole="button"
          accessibilityLabel="Add match notes"
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: exploreColors.scoreMuted,
            backgroundColor: exploreColors.cardBg,
            paddingVertical: 28,
            paddingHorizontal: 20,
          }}
        >
          <Text
            style={{
              fontFamily: exploreFontFamily.regular,
              fontSize: 13,
              color: exploreColors.scoreMuted,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            No notes yet. Tap to add match notes.
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
