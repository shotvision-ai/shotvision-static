import { View, TouchableOpacity } from "react-native";
import { Text } from "~/components/ui/text";
import { useTheme } from "~/theming/ThemeProvider";

interface SegmentedControlOption {
  label: string;
  value: string;
}

interface SegmentedControlProps {
  options: SegmentedControlOption[];
  selectedValue: string;
  onChange: (value: string) => void;
}

export function SegmentedControl({ options, selectedValue, onChange }: SegmentedControlProps) {
  const { theme } = useTheme();
  const isDark = theme.name === "dark";
  const primary = theme.colors.primary ?? "hsl(221 83% 53%)";
  const onPrimary = theme.colors.primaryForeground ?? "hsl(0 0% 100%)";
  const trackBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(37,99,235,0.08)";
  const inactiveLabel = theme.colors.mutedForeground ?? (isDark ? "rgba(255,255,255,0.5)" : "#6b7280");

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: trackBg,
        borderRadius: 14,
        padding: 4,
        height: 44,
      }}
    >
      {options.map((option) => {
        const isSelected = selectedValue === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: isSelected }}
            style={{
              flex: 1,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isSelected ? primary : "transparent",
              shadowColor: isSelected ? primary : "transparent",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isSelected ? 0.3 : 0,
              shadowRadius: 4,
              elevation: isSelected ? 3 : 0,
            }}
            activeOpacity={0.75}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: isSelected ? "700" : "500",
                color: isSelected ? onPrimary : inactiveLabel,
                letterSpacing: 0.1,
              }}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
