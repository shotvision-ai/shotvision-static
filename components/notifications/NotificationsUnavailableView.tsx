import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "~/components/ui/text";
import LucideIcon from "~/lib/icons/LucideIcon";

type NotificationsUnavailableViewProps = {
  title?: string;
  detail?: string;
};

/**
 * Intentional empty state when notification APIs are disabled or not shipped yet.
 * No network calls. Parent must provide NotificationsScreenLayout header.
 */
export function NotificationsUnavailableView({
  title = "Notifications coming soon",
  detail = "Alerts aren't available yet. We'll turn this on when the notification service is ready.",
}: NotificationsUnavailableViewProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
        paddingBottom: insets.bottom + 24,
      }}
    >
      <LucideIcon name="Bell" size={64} color="#9ca3af" />
      <Text className="text-h4 font-semibold text-foreground mt-6 mb-2 text-center">
        {title}
      </Text>
      <Text className="text-body text-muted-foreground text-center">{detail}</Text>
    </View>
  );
}
