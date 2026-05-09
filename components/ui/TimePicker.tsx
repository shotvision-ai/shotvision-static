import { useState } from "react";
import { View, TouchableOpacity, Modal, ScrollView } from "react-native";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";

interface TimePickerProps {
  visible: boolean;
  selectedTime: string; // Format: "HH:MM"
  onConfirm: (time: string) => void;
  onCancel: () => void;
}

export function TimePicker({ visible, selectedTime, onConfirm, onCancel }: TimePickerProps) {
  const [hour, setHour] = useState(parseInt(selectedTime.split(":")[0]) || 14);
  const [minute, setMinute] = useState(parseInt(selectedTime.split(":")[1]) || 0);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  const handleConfirm = () => {
    const formattedTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    onConfirm(formattedTime);
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onCancel}>
      <View
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={onCancel}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />

        <View
          style={{
            width: 300,
            backgroundColor: "#ffffff",
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
              paddingHorizontal: 24,
              paddingVertical: 20,
              borderBottomWidth: 1,
              borderBottomColor: "rgba(0, 0, 0, 0.08)",
            }}
          >
            <Text
              style={{ fontSize: 17, fontWeight: "600", color: "#1f2937", textAlign: "center" }}
            >
              Select Time
            </Text>
          </View>

          {/* Time Picker */}
          <View style={{ flexDirection: "row", paddingVertical: 20, height: 200 }}>
            {/* Hours */}
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 12 }}
            >
              {hours.map((h) => (
                <TouchableOpacity
                  key={h}
                  onPress={() => setHour(h)}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    backgroundColor: hour === h ? "#2563eb" : "transparent",
                    marginBottom: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: hour === h ? "600" : "400",
                      color: hour === h ? "#ffffff" : "#1f2937",
                      textAlign: "center",
                    }}
                  >
                    {String(h).padStart(2, "0")}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Separator */}
            <View style={{ width: 2, backgroundColor: "#e5e7eb", marginVertical: 20 }} />

            {/* Minutes */}
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 12 }}
            >
              {minutes.map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setMinute(m)}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    backgroundColor: minute === m ? "#2563eb" : "transparent",
                    marginBottom: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: minute === m ? "600" : "400",
                      color: minute === m ? "#ffffff" : "#1f2937",
                      textAlign: "center",
                    }}
                  >
                    {String(m).padStart(2, "0")}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#1f2937" }}>Cancel</Text>
            </Button>
            <Button
              onPress={handleConfirm}
              className="flex-1 rounded-xl"
              style={{ backgroundColor: "#2563eb" }}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#ffffff" }}>OK</Text>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
