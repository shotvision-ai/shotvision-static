import { ScrollView, TouchableOpacity } from "react-native";
import { Text } from "~/components/ui/text";
import { exploreColors, exploreFontFamily } from "~/lib/exploreDesign";
import type { MatchStatusFilter } from "../../src/services/api/matchService";

const TABS: { label: string; value: MatchStatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Live", value: "live" },
  { label: "Finished", value: "completed" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Cancelled", value: "cancelled" },
];

type ExploreFilterTabsProps = {
  selected: MatchStatusFilter;
  onChange: (value: MatchStatusFilter) => void;
};

export function ExploreFilterTabs({ selected, onChange }: ExploreFilterTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }}
    >
      {TABS.map((tab) => {
        const active = tab.value === selected;
        return (
          <TouchableOpacity
            key={tab.value}
            onPress={() => onChange(tab.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 7,
              borderRadius: 20,
              backgroundColor: active ? exploreColors.coral : exploreColors.cardBg,
              borderWidth: active ? 0 : 1,
              borderColor: exploreColors.cardBorder,
            }}
          >
            <Text
              style={{
                fontFamily: exploreFontFamily.extraBold,
                fontSize: 12,
                fontWeight: "800",
                color: active ? "#FFFFFF" : exploreColors.muted,
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
