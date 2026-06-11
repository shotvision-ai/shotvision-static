import {
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Text } from "~/components/ui/text";
import LucideIcon from "~/lib/icons/LucideIcon";
import { exploreColors, exploreFontFamily } from "~/lib/exploreDesign";

const REPORT_REASONS = [
  "Incorrect or fabricated match score",
  "Wrong or fake player name",
  "Inappropriate or offensive match notes",
  "Misleading match details",
  "Fake or duplicate match entry",
  "Wrong profile picture",
];

type ExploreReportModalsProps = {
  showReport: boolean;
  showUndo: boolean;
  selectedReason: string | null;
  reportNotes: string;
  isSubmitting: boolean;
  onCloseReport: () => void;
  onCloseUndo: () => void;
  onSelectReason: (reason: string) => void;
  onChangeNotes: (text: string) => void;
  onSubmit: () => void;
  onConfirmUndo: () => void;
};

export function ExploreReportModals({
  showReport,
  showUndo,
  selectedReason,
  reportNotes,
  isSubmitting,
  onCloseReport,
  onCloseUndo,
  onSelectReason,
  onChangeNotes,
  onSubmit,
  onConfirmUndo,
}: ExploreReportModalsProps) {
  return (
    <>
      <Modal visible={showReport} transparent animationType="fade" onRequestClose={onCloseReport}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            backgroundColor: "rgba(15,15,26,0.45)",
            paddingHorizontal: 20,
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={onCloseReport}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View
            style={{
              backgroundColor: exploreColors.cardBg,
              borderRadius: 20,
              overflow: "hidden",
              maxHeight: "85%",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 18,
                borderBottomWidth: 1,
                borderBottomColor: exploreColors.divider,
              }}
            >
              <Text style={{ fontFamily: exploreFontFamily.bold, fontSize: 17, color: exploreColors.ink }}>
                Report Match
              </Text>
              <TouchableOpacity onPress={onCloseReport} accessibilityLabel="Close">
                <LucideIcon name="X" size={22} color={exploreColors.muted} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 16, gap: 8 }}>
              {REPORT_REASONS.map((reason) => {
                const selected = selectedReason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    onPress={() => onSelectReason(reason)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: selected ? exploreColors.coral : exploreColors.cardBorder,
                      backgroundColor: selected ? "#FFF0EC" : exploreColors.pageBg,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: exploreFontFamily.bold,
                        fontSize: 14,
                        color: selected ? exploreColors.coral : exploreColors.ink,
                      }}
                    >
                      {reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <TextInput
                value={reportNotes}
                onChangeText={onChangeNotes}
                placeholder="Additional details (optional)"
                placeholderTextColor={exploreColors.muted}
                multiline
                style={{
                  borderWidth: 1,
                  borderColor: exploreColors.cardBorder,
                  borderRadius: 12,
                  padding: 12,
                  minHeight: 72,
                  fontFamily: exploreFontFamily.regular,
                  fontSize: 14,
                  color: exploreColors.ink,
                  textAlignVertical: "top",
                }}
              />
            </View>
            <View style={{ padding: 16, gap: 8 }}>
              <TouchableOpacity
                onPress={onSubmit}
                disabled={!selectedReason || isSubmitting}
                style={{
                  backgroundColor:
                    selectedReason && !isSubmitting ? exploreColors.coral : exploreColors.divider,
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text
                    style={{
                      fontFamily: exploreFontFamily.extraBold,
                      fontSize: 15,
                      color: selectedReason ? "#FFFFFF" : exploreColors.muted,
                    }}
                  >
                    Submit Report
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showUndo} transparent animationType="fade" onRequestClose={onCloseUndo}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            backgroundColor: "rgba(15,15,26,0.45)",
            paddingHorizontal: 28,
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={onCloseUndo}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View
            style={{
              backgroundColor: exploreColors.cardBg,
              borderRadius: 20,
              padding: 24,
            }}
          >
            <Text
              style={{
                fontFamily: exploreFontFamily.bold,
                fontSize: 17,
                color: exploreColors.ink,
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              Withdraw report?
            </Text>
            <Text
              style={{
                fontFamily: exploreFontFamily.regular,
                fontSize: 14,
                color: exploreColors.muted,
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              Your report for this match will be removed.
            </Text>
            <TouchableOpacity
              onPress={onConfirmUndo}
              disabled={isSubmitting}
              style={{
                backgroundColor: exploreColors.coral,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: "center",
                marginBottom: 8,
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ fontFamily: exploreFontFamily.extraBold, fontSize: 15, color: "#FFF" }}>
                  Yes, withdraw
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={onCloseUndo} style={{ paddingVertical: 10, alignItems: "center" }}>
              <Text style={{ fontFamily: exploreFontFamily.bold, fontSize: 14, color: exploreColors.muted }}>
                Keep report
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
