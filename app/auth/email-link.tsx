import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { useAuth } from "../../src/context/AuthContext";
import { urlLooksLikeEmailSignInLink } from "../../src/config/emailLinkAuth";
import { getUserFriendlyErrorMessage } from "../../src/services/api/userFriendlyErrors";
import { BRAND_BLUE } from "../../src/hooks/useAppTheming";

/**
 * Deep-link landing route for Firebase Email Link sign-in.
 * Primary completion is handled globally in AuthProvider; this screen is a fallback UI.
 */
export default function EmailLinkAuthScreen() {
  const router = useRouter();
  const { completeEmailLinkSignIn, isAuthenticating, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/(tabs)/dashboard");
      return;
    }

    void (async () => {
      const url = await Linking.getInitialURL();
      if (!url || !urlLooksLikeEmailSignInLink(url)) {
        router.replace("/login");
        return;
      }

      try {
        await completeEmailLinkSignIn(url);
      } catch (error) {
        const message = getUserFriendlyErrorMessage(
          error,
          "Could not complete email sign-in. Request a new link from the login screen."
        );
        router.replace({ pathname: "/login", params: { emailLinkError: message } });
      }
    })();
  }, [completeEmailLinkSignIn, isAuthenticated, router]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-8">
        <ActivityIndicator size="large" color={BRAND_BLUE} />
        <Text className="text-body text-muted-foreground mt-4 text-center">
          {isAuthenticating ? "Completing email sign-in…" : "Opening sign-in link…"}
        </Text>
      </View>
    </SafeAreaView>
  );
}
