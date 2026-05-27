import type { ReactNode } from "react";
import { View, ActivityIndicator, TouchableOpacity, type ViewStyle } from "react-native";
import { Text } from "~/components/ui/text";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useTheme } from "~/theming/ThemeProvider";

/** Consistent primary action label for recoverable list/screen failures. */
export const TRY_AGAIN_LABEL = "Try again";

type CenteredContainerProps = {
  children: ReactNode;
  style?: ViewStyle;
};

function CenteredContainer({ children, style }: CenteredContainerProps) {
  return (
    <View
      style={[
        {
          flexGrow: 1,
          minHeight: 360,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
          paddingVertical: 48,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type ListLoadingStateProps = {
  message?: string;
  style?: ViewStyle;
};

export function ListLoadingState({
  message = "Loading…",
  style,
}: ListLoadingStateProps) {
  const { theme } = useTheme();

  return (
    <CenteredContainer style={style}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text className="text-body text-muted-foreground mt-4 text-center">{message}</Text>
    </CenteredContainer>
  );
}

type ListErrorStateProps = {
  title?: string;
  message: string;
  onRetry: () => void;
  style?: ViewStyle;
};

export function ListErrorState({
  title = "Couldn't load this content",
  message,
  onRetry,
  style,
}: ListErrorStateProps) {
  const { theme } = useTheme();

  return (
    <CenteredContainer style={style}>
      <LucideIcon name="CircleAlert" size={64} color={theme.colors.destructive} />
      <Text className="text-h3 font-semibold text-foreground mt-6 mb-2 text-center">{title}</Text>
      <Text className="text-body text-muted-foreground text-center mb-6">{message}</Text>
      <TouchableOpacity
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel={TRY_AGAIN_LABEL}
        className="bg-primary px-6 py-3 rounded-xl min-h-[44px] justify-center"
      >
        <Text className="text-primary-foreground font-semibold">{TRY_AGAIN_LABEL}</Text>
      </TouchableOpacity>
    </CenteredContainer>
  );
}

type ScreenLoadingStateProps = {
  message?: string;
};

/** Full-screen centered loader (detail screens, profile bootstrap). */
export function ScreenLoadingState({ message }: ScreenLoadingStateProps) {
  const { theme } = useTheme();

  return (
    <View className="flex-1 items-center justify-center px-8">
      <ActivityIndicator size="large" color={theme.colors.primary} />
      {message ? (
        <Text className="text-body text-muted-foreground mt-4 text-center">{message}</Text>
      ) : null}
    </View>
  );
}

type ScreenErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  onBack?: () => void;
  backLabel?: string;
};

/** Full-screen recoverable failure (match detail, edit match fetch). */
export function ScreenErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  onBack,
  backLabel = "Go back",
}: ScreenErrorStateProps) {
  const { theme } = useTheme();

  return (
    <View className="flex-1 items-center justify-center px-8">
      <LucideIcon name="CircleAlert" size={64} color={theme.colors.destructive} />
      <Text className="text-h3 font-semibold text-foreground mt-6 mb-2 text-center">{title}</Text>
      <Text className="text-body text-muted-foreground text-center mb-8">{message}</Text>
      {onRetry ? (
        <TouchableOpacity
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={TRY_AGAIN_LABEL}
          className="bg-primary px-8 py-4 rounded-xl mb-3 min-h-[44px] justify-center"
        >
          <Text className="text-primary-foreground font-semibold">{TRY_AGAIN_LABEL}</Text>
        </TouchableOpacity>
      ) : null}
      {onBack ? (
        <TouchableOpacity
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          className="px-6 py-3 min-h-[44px] justify-center"
        >
          <Text className="text-body font-semibold text-muted-foreground">{backLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
