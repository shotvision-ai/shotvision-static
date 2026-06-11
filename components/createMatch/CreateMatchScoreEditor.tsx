import { View, TouchableOpacity } from "react-native";
import { Text } from "~/components/ui/text";
import type { MatchSet } from "~/types/match";
import { createMatch } from "./createMatchStyles";
import LucideIcon from "~/lib/icons/LucideIcon";
import { STANDARD_HIT_SLOP } from "~/src/utils/touchA11y";

type CreateMatchScoreEditorProps = {
  sets: MatchSet[];
  onChange: (sets: MatchSet[]) => void;
  maxSets?: number;
};

function CircleButton({ onPress, icon }: { onPress: () => void; icon: "Minus" | "Plus" }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={STANDARD_HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={icon === "Minus" ? "Decrease score" : "Increase score"}
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: createMatch.divider,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <LucideIcon name={icon} size={16} color={createMatch.muted} />
    </TouchableOpacity>
  );
}

export function CreateMatchScoreEditor({
  sets,
  onChange,
  maxSets = 5,
}: CreateMatchScoreEditorProps) {
  const adjust = (index: number, field: "playerAScore" | "playerBScore", delta: number) => {
    const next = sets.map((s, i) =>
      i === index ? { ...s, [field]: Math.max(0, s[field] + delta) } : s
    );
    onChange(next);
  };

  const addSet = () => {
    if (sets.length >= maxSets) return;
    onChange([...sets, { playerAScore: 0, playerBScore: 0 }]);
  };

  const removeSet = (index: number) => {
    if (sets.length <= 1) return;
    onChange(sets.filter((_, i) => i !== index));
  };

  return (
    <View style={{ gap: 10 }}>
      {sets.map((set, index) => (
        <View
          key={index}
          style={{
            backgroundColor: createMatch.cardBg,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: createMatch.cardBorder,
            paddingHorizontal: 16,
            paddingVertical: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 8,
                backgroundColor: createMatch.notesBtnBg,
                marginRight: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: createMatch.fonts.extraBold,
                  fontSize: 11,
                  color: createMatch.coral,
                }}
              >
                S{index + 1}
              </Text>
            </View>

            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <CircleButton onPress={() => adjust(index, "playerAScore", -1)} icon="Minus" />
              <TouchableOpacity
                onPress={() => adjust(index, "playerAScore", 1)}
                hitSlop={STANDARD_HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel="Increase player A score"
                style={{
                  minWidth: 52,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 10,
                  backgroundColor: createMatch.pageBg,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: createMatch.fonts.black,
                    fontSize: 36,
                    color: createMatch.ink,
                    lineHeight: 46,
                  }}
                >
                  {set.playerAScore}
                </Text>
              </TouchableOpacity>
              <Text
                style={{
                  fontFamily: createMatch.fonts.regular,
                  fontSize: 28,
                  color: createMatch.scoreMuted,
                }}
              >
                –
              </Text>
              <TouchableOpacity
                onPress={() => adjust(index, "playerBScore", -1)}
                hitSlop={STANDARD_HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel="Decrease player B score"
                style={{
                  minWidth: 52,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 10,
                  backgroundColor: createMatch.pageBg,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: createMatch.fonts.black,
                    fontSize: 36,
                    color: createMatch.ink,
                    lineHeight: 46,
                  }}
                >
                  {set.playerBScore}
                </Text>
              </TouchableOpacity>
              <CircleButton onPress={() => adjust(index, "playerBScore", 1)} icon="Plus" />
            </View>

            {sets.length > 1 ? (
              <TouchableOpacity
                onPress={() => removeSet(index)}
                hitSlop={STANDARD_HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel={`Remove set ${index + 1}`}
                style={{ padding: 4, marginLeft: 8 }}
              >
                <LucideIcon name="X" size={16} color={createMatch.muted} />
              </TouchableOpacity>
            ) : <View style={{ width: 24 }} />}
          </View>
        </View>
      ))}

      {sets.length < maxSets ? (
        <TouchableOpacity
          onPress={addSet}
          hitSlop={STANDARD_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Add another set"
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            paddingVertical: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: createMatch.cardBorder,
          }}
        >
          <LucideIcon name="Plus" size={18} color={createMatch.coral} />
          <Text
            style={{
              fontFamily: createMatch.fonts.extraBold,
              fontSize: 14,
              color: createMatch.coral,
            }}
          >
            + Add Set
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
