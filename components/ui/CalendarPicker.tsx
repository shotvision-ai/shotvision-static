import { useState } from "react";
import { View, TouchableOpacity, Modal, ScrollView } from "react-native";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useAppTheming } from "../../src/hooks/useAppTheming";
import { HEADER_ICON_HIT_SLOP } from "../../src/utils/touchA11y";

interface CalendarPickerProps {
  visible: boolean;
  selectedDate: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
  minimumDate?: Date;
  maximumDate?: Date;
}

export function CalendarPicker({
  visible,
  selectedDate,
  onConfirm,
  onCancel,
  minimumDate,
  maximumDate,
}: CalendarPickerProps) {
  const { colors, brand, isDark } = useAppTheming();
  const headerBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0, 0, 0, 0.08)";

  const [currentMonth, setCurrentMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );
  const [selectedDay, setSelectedDay] = useState(selectedDate);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];

    // Add empty slots for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days in month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const isDateDisabled = (date: Date) => {
    if (minimumDate && date < minimumDate) return true;
    if (maximumDate && date > maximumDate) return true;
    return false;
  };

  const handleDayPress = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (!isDateDisabled(newDate)) {
      setSelectedDay(newDate);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleConfirm = () => {
    onConfirm(selectedDay);
  };

  const handleYearPress = () => {
    setShowYearPicker(true);
  };

  const handleYearSelect = (year: number) => {
    setCurrentMonth(new Date(year, currentMonth.getMonth(), 1));
    setShowYearPicker(false);
  };

  const getYearRange = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    // Start from current year and go backwards 100 years
    for (let year = currentYear; year >= currentYear - 100; year--) {
      years.push(year);
    }
    return years;
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];
  const days = getDaysInMonth(currentMonth);

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onCancel}>
      <View
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: colors.modalOverlay }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={onCancel}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />

        <View
          style={{
            width: 340,
            backgroundColor: colors.card,
            borderRadius: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 24,
              paddingVertical: 20,
              borderBottomWidth: 1,
              borderBottomColor: headerBorder,
            }}
          >
            {!showYearPicker ? (
              <>
                <TouchableOpacity
                  onPress={handlePreviousMonth}
                  hitSlop={HEADER_ICON_HIT_SLOP}
                  accessibilityRole="button"
                  accessibilityLabel="Previous month"
                  style={{ padding: 8, minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center" }}
                >
                  <LucideIcon name="ChevronLeft" size={22} color={colors.muted} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleYearPress}
                  hitSlop={HEADER_ICON_HIT_SLOP}
                  accessibilityRole="button"
                  accessibilityLabel="Select year"
                  style={{ padding: 8, minHeight: 44, justifyContent: "center" }}
                >
                  <Text style={{ fontSize: 17, fontWeight: "600", color: colors.foreground }}>
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleNextMonth}
                  hitSlop={HEADER_ICON_HIT_SLOP}
                  accessibilityRole="button"
                  accessibilityLabel="Next month"
                  style={{ padding: 8, minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center" }}
                >
                  <LucideIcon name="ChevronRight" size={22} color={colors.muted} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => setShowYearPicker(false)}
                  hitSlop={HEADER_ICON_HIT_SLOP}
                  accessibilityRole="button"
                  accessibilityLabel="Back to month view"
                  style={{ padding: 8, minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center" }}
                >
                  <LucideIcon name="ChevronLeft" size={22} color={colors.muted} />
                </TouchableOpacity>

                <Text style={{ fontSize: 17, fontWeight: "600", color: colors.foreground }}>
                  Select Year
                </Text>

                <View style={{ width: 30 }} />
              </>
            )}
          </View>

          {/* Calendar Grid */}
          <View style={{ paddingHorizontal: 20, paddingVertical: 24, height: 360 }}>
            {!showYearPicker ? (
              <>
                {/* Week Days */}
                <View style={{ flexDirection: "row", marginBottom: 16 }}>
                  {weekDays.map((day, index) => (
                    <View key={index} style={{ flex: 1, alignItems: "center" }}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted }}>
                        {day}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Days Grid - Fixed height for consistency */}
                <View style={{ gap: 6, height: 280 }}>
                  {Array.from({ length: Math.ceil(days.length / 7) }).map((_, weekIndex) => (
                    <View key={weekIndex} style={{ flexDirection: "row", gap: 6 }}>
                      {days.slice(weekIndex * 7, weekIndex * 7 + 7).map((day, dayIndex) => {
                        if (day === null) {
                          return <View key={dayIndex} style={{ flex: 1, height: 44 }} />;
                        }

                        const date = new Date(
                          currentMonth.getFullYear(),
                          currentMonth.getMonth(),
                          day,
                        );
                        const isSelected =
                          selectedDay.getDate() === day &&
                          selectedDay.getMonth() === currentMonth.getMonth() &&
                          selectedDay.getFullYear() === currentMonth.getFullYear();
                        const isDisabled = isDateDisabled(date);
                        const isToday =
                          new Date().getDate() === day &&
                          new Date().getMonth() === currentMonth.getMonth() &&
                          new Date().getFullYear() === currentMonth.getFullYear();

                        return (
                          <TouchableOpacity
                            key={dayIndex}
                            onPress={() => handleDayPress(day)}
                            disabled={isDisabled}
                            style={{
                              flex: 1,
                              height: 44,
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: 12,
                              backgroundColor: isSelected
                                ? brand.blue
                                : isToday
                                  ? isDark
                                    ? "rgba(34, 197, 94, 0.15)"
                                    : "rgba(34, 197, 94, 0.1)"
                                  : "transparent",
                              opacity: isDisabled ? 0.25 : 1,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 15,
                                fontWeight: isSelected || isToday ? "600" : "400",
                                color: isSelected
                                  ? colors.onPrimary
                                  : isToday
                                    ? brand.blue
                                    : colors.foreground,
                              }}
                            >
                              {day}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </>
            ) : (
              /* Year Picker Grid */
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 10 }}
              >
                {Array.from({ length: Math.ceil(getYearRange().length / 3) }).map((_, rowIndex) => (
                  <View key={rowIndex} style={{ flexDirection: "row", gap: 8 }}>
                    {getYearRange()
                      .slice(rowIndex * 3, rowIndex * 3 + 3)
                      .map((year) => {
                        const isSelected = year === currentMonth.getFullYear();
                        const isCurrentYear = year === new Date().getFullYear();

                        return (
                          <TouchableOpacity
                            key={year}
                            onPress={() => handleYearSelect(year)}
                            style={{
                              flex: 1,
                              height: 48,
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: 12,
                              backgroundColor: isSelected
                                ? brand.blue
                                : isCurrentYear
                                  ? isDark
                                    ? "rgba(34, 197, 94, 0.15)"
                                    : "rgba(34, 197, 94, 0.1)"
                                  : "transparent",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 16,
                                fontWeight: isSelected || isCurrentYear ? "600" : "400",
                                color: isSelected
                                  ? colors.onPrimary
                                  : isCurrentYear
                                    ? brand.blue
                                    : colors.foreground,
                              }}
                            >
                              {year}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Actions */}
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              paddingHorizontal: 20,
              paddingBottom: 24,
              paddingTop: 8,
            }}
          >
            <Button variant="outline" onPress={onCancel} className="flex-1 rounded-xl">
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>Cancel</Text>
            </Button>
            <Button
              onPress={handleConfirm}
              className="flex-1 rounded-xl"
              style={{ backgroundColor: brand.blue }}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.onPrimary }}>OK</Text>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
