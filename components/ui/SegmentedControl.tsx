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

const PRIMARY = "#2563eb";

export function SegmentedControl({ options, selectedValue, onChange }: SegmentedControlProps) {
  const { theme } = useTheme();
  const isDark = theme.name === "dark";

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(37,99,235,0.07)",
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
              backgroundColor: isSelected ? PRIMARY : "transparent",
              shadowColor: isSelected ? PRIMARY : "transparent",
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
                color: isSelected ? "#ffffff" : isDark ? "rgba(255,255,255,0.5)" : "#6b7280",
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
