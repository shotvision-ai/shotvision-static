import { View, TouchableOpacity, Modal } from "react-native";
import { Text } from "~/components/ui/text";
import { MatchStatus } from "~/types/match";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useTheme } from "~/theming/ThemeProvider";

interface MatchFilterProps {
  visible: boolean;
  onClose: () => void;
  selectedFilters: MatchStatus[];
  onFilterChange: (filters: MatchStatus[]) => void;
}

export function MatchFilter({
  visible,
  onClose,
  selectedFilters,
  onFilterChange,
}: MatchFilterProps) {
  const { theme } = useTheme();

  const filterOptions: { value: MatchStatus; label: string; color: string }[] = [
    { value: "scheduled", label: "Scheduled", color: theme.colors.tertiary ?? "#2563eb" },
    { value: "live", label: "Live", color: theme.colors.warning ?? "#f97316" },
    { value: "completed", label: "Finished", color: theme.colors.success ?? "#2563eb" },
  ];

  const toggleFilter = (status: MatchStatus) => {
    if (selectedFilters.includes(status)) {
      onFilterChange(selectedFilters.filter((f) => f !== status));
    } else {
      onFilterChange([...selectedFilters, status]);
    }
  };

  const clearAll = () => {
    onFilterChange([]);
  };

  const selectAll = () => {
    onFilterChange(["scheduled", "live", "completed"]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        className="flex-1 items-center justify-center px-5"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      >
        <View
          className="rounded-3xl w-full max-w-md"
          style={{
            backgroundColor: theme.colors.card || "#FFFFFF",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
            elevation: 12,
          }}
        >
          {/* Header */}
          <View
            className="flex-row items-center justify-between p-5 border-b"
            style={{ borderBottomColor: theme.colors.border || "#E8E8E8" }}
          >
            <Text className="text-h3 font-semibold text-foreground">Filter Matches</Text>
            <TouchableOpacity onPress={onClose} className="p-2">
              <LucideIcon name="X" size={24} color={theme.colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Filter Options */}
          <View className="p-5 gap-3">
            {filterOptions.map((option) => {
              const isSelected = selectedFilters.includes(option.value);
              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => toggleFilter(option.value)}
                  className="flex-row items-center justify-between p-4 rounded-2xl border"
                  style={{
                    backgroundColor: isSelected
                      ? theme.colors.primary
                        ? `${theme.colors.primary}15`
                        : "#F0F7FF"
                      : theme.colors.background || "#FFFFFF",
                    borderColor: isSelected
                      ? theme.colors.primary || "#2563EB"
                      : theme.colors.border || "#E8E8E8",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isSelected ? 0.05 : 0.02,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >
                  <View className="flex-row items-center flex-1">
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: option.color + "20" }}
                    >
                      <View
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: option.color }}
                      />
                    </View>
                    <Text
                      className={`text-base font-medium ${
                        isSelected ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {option.label}
                    </Text>
                  </View>
                  {isSelected && <LucideIcon name="Check" size={22} color={theme.colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Action Buttons */}
          <View
            className="flex-row gap-3 p-5 border-t"
            style={{ borderTopColor: theme.colors.border || "#E8E8E8" }}
          >
            <TouchableOpacity
              onPress={clearAll}
              className="flex-1 py-3 px-4 rounded-xl border items-center"
              style={{
                backgroundColor: theme.colors.background || "#F5F5F5",
                borderColor: theme.colors.border || "#E8E8E8",
              }}
            >
              <Text className="text-base font-medium text-foreground">Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={selectAll}
              className="flex-1 py-3 px-4 rounded-xl items-center"
              style={{ backgroundColor: theme.colors.primary || "#2563EB" }}
            >
              <Text className="text-base font-medium" style={{ color: "#FFFFFF" }}>
                Select All
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
