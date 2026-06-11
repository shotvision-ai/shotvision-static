import { View, TouchableOpacity, ActivityIndicator } from "react-native";
import { Text } from "~/components/ui/text";
import LucideIcon from "~/lib/icons/LucideIcon";
import { createMatch, fieldLabelStyle, sectionTitleStyle } from "./createMatchStyles";
import { STANDARD_HIT_SLOP } from "~/src/utils/touchA11y";

export function formatMatchFormDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function timeFromDate(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function MatchFormSectionTitle({ children }: { children: string }) {
  return <Text style={sectionTitleStyle}>{children}</Text>;
}

export function MatchFormFieldLabel({ children }: { children: string }) {
  return <Text style={fieldLabelStyle}>{children}</Text>;
}

export function MatchFormPickerField({
  label,
  value,
  icon,
  onPress,
}: {
  label: string;
  value: string;
  icon: "Calendar" | "Clock";
  onPress: () => void;
}) {
  return (
    <View>
      <MatchFormFieldLabel>{label}</MatchFormFieldLabel>
      <TouchableOpacity
        onPress={onPress}
        hitSlop={STANDARD_HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: createMatch.cardBg,
          borderWidth: 1,
          borderColor: createMatch.cardBorder,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
        }}
      >
        <Text
          style={{
            fontFamily: createMatch.fonts.regular,
            fontSize: 15,
            color: createMatch.ink,
          }}
        >
          {value}
        </Text>
        <LucideIcon name={icon} size={18} color={createMatch.muted} />
      </TouchableOpacity>
    </View>
  );
}

type MatchFormFooterProps = {
  bottomInset: number;
  primaryLabel: string;
  onPrimary: () => void;
  isSubmitting?: boolean;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryDisabled?: boolean;
};

export function MatchFormFooter({
  bottomInset,
  primaryLabel,
  onPrimary,
  isSubmitting = false,
  primaryDisabled = false,
  secondaryLabel,
  onSecondary,
  secondaryDisabled = false,
}: MatchFormFooterProps) {
  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Math.max(bottomInset, 16),
        backgroundColor: createMatch.pageBg,
        borderTopWidth: 1,
        borderTopColor: createMatch.cardBorder,
        gap: 10,
      }}
    >
      <TouchableOpacity
        onPress={onPrimary}
        disabled={isSubmitting || primaryDisabled}
        accessibilityRole="button"
        accessibilityLabel={primaryLabel}
        style={{
          height: 52,
          borderRadius: 14,
          backgroundColor: createMatch.coral,
          alignItems: "center",
          justifyContent: "center",
          opacity: isSubmitting || primaryDisabled ? 0.75 : 1,
        }}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text
            style={{
              fontFamily: createMatch.fonts.extraBold,
              fontSize: 16,
              color: "#FFFFFF",
            }}
          >
            {primaryLabel}
          </Text>
        )}
      </TouchableOpacity>

      {secondaryLabel && onSecondary ? (
        <TouchableOpacity
          onPress={onSecondary}
          disabled={isSubmitting || secondaryDisabled}
          accessibilityRole="button"
          accessibilityLabel={secondaryLabel}
          style={{
            alignItems: "center",
            paddingVertical: 10,
            opacity: isSubmitting || secondaryDisabled ? 0.5 : 1,
          }}
        >
          <Text
            style={{
              fontFamily: createMatch.fonts.extraBold,
              fontSize: 15,
              color: createMatch.muted,
            }}
          >
            {secondaryLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function matchFormFooterPadding(bottomInset: number, hasSecondary = false): number {
  const base = Math.max(bottomInset, 16) + 72;
  return hasSecondary ? base + 40 : base;
}
