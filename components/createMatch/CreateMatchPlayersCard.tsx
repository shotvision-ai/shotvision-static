import { useState } from "react";
import { View, TextInput } from "react-native";
import { Text } from "~/components/ui/text";
import { createMatch, inputStyle } from "./createMatchStyles";
import { playerInitials } from "~/lib/exploreDesign";

type CreateMatchPlayersCardProps = {
  playerA: string;
  playerB: string;
  onChangeA: (value: string) => void;
  onChangeB: (value: string) => void;
  /** Auto-focus this player's input on mount (edit screen). */
  initialFocusSide?: "A" | "B";
};

function PlayerBlock({
  side,
  label,
  value,
  onChangeText,
  showInitialFocus,
}: {
  side: "A" | "B";
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  showInitialFocus?: boolean;
}) {
  const [focused, setFocused] = useState(showInitialFocus ?? false);
  const avatarBg = side === "A" ? createMatch.playerA : createMatch.playerB;
  const initials = value.trim() ? playerInitials(value) : side;

  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: avatarBg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontFamily: createMatch.fonts.extraBold, fontSize: 13, color: "#FFF" }}>
            {initials}
          </Text>
        </View>
        <Text
          style={{
            fontFamily: createMatch.fonts.bold,
            fontSize: 13,
            color: createMatch.ink,
          }}
        >
          {label}
        </Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Enter player name"
        placeholderTextColor={createMatch.placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={inputStyle(focused)}
        accessibilityLabel={`${label} name`}
      />
    </View>
  );
}

export function CreateMatchPlayersCard({
  playerA,
  playerB,
  onChangeA,
  onChangeB,
  initialFocusSide,
}: CreateMatchPlayersCardProps) {
  return (
    <View
      style={{
        backgroundColor: createMatch.cardBg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: createMatch.cardBorder,
        padding: 16,
      }}
    >
      <PlayerBlock
        side="A"
        label="Player A"
        value={playerA}
        onChangeText={onChangeA}
        showInitialFocus={initialFocusSide === "A"}
      />

      <View style={{ alignItems: "center", marginVertical: 14 }}>
        <View
          style={{
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 20,
            backgroundColor: createMatch.pageBg,
          }}
        >
          <Text
            style={{
              fontFamily: createMatch.fonts.extraBold,
              fontSize: 11,
              color: createMatch.muted,
            }}
          >
            vs
          </Text>
        </View>
      </View>

      <PlayerBlock
        side="B"
        label="Player B"
        value={playerB}
        onChangeText={onChangeB}
        showInitialFocus={initialFocusSide === "B"}
      />
    </View>
  );
}
