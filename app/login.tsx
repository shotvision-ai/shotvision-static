import { useState, useEffect } from "react";
import { View, TouchableOpacity, Platform, Alert, ActivityIndicator } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import LucideIcon from "~/lib/icons/LucideIcon";
import Svg, { Path } from "react-native-svg";
import { useAuth } from "../src/context/AuthContext";
import { isGoogleOAuthConfigured } from "../src/config/googleOAuth";
import { formatLoginFailure } from "../src/utils/loginErrorUi";
import {
  configureGoogleSignIn,
  signInWithGoogle,
} from "../src/services/google/signInWithGoogle";

const BLUE = "#2563eb";

/** Compact Google “G” mark (brand colors). */
function GoogleMark({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <Path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </Svg>
  );
}

function AppleLogo({ size = 22, color = "#1f2937" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
        fill={color}
      />
    </Svg>
  );
}

const oauthButtonStyle = {
  backgroundColor: "#ffffff",
  borderWidth: 1.5,
  borderColor: "#e5e7eb",
  borderRadius: 14,
  paddingVertical: 14,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  elevation: 1,
};

type LoginBodyProps = {
  googleDisabled: boolean;
  googleLoading: boolean;
  googleOpacity: number;
  onGooglePress: () => void;
};

function LoginBody({
  googleDisabled,
  googleLoading,
  googleOpacity,
  onGooglePress,
}: LoginBodyProps) {
  const router = useRouter();
  const androidTopOffset = Platform.OS === "android" ? 32 : 0;
  const [isLoggingInApple, setIsLoggingInApple] = useState(false);

  const handleAppleSignIn = async () => {
    try {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("Not Available", "Apple Sign-In is not available on this device.");
        return;
      }
      setIsLoggingInApple(true);
      await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      Alert.alert(
        "Coming Soon",
        "Apple Sign-In will be connected to your account soon. Please use Google Sign-In for now."
      );
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err?.code === "ERR_REQUEST_CANCELED") return;
      console.error("Apple Sign-In error:", e);
      Alert.alert("Error", "Failed to sign in with Apple.");
    } finally {
      setIsLoggingInApple(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: "center", paddingTop: androidTopOffset }}>
        <View className="items-center mb-12">
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 42,
              backgroundColor: BLUE,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
              shadowColor: BLUE,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 14,
              elevation: 8,
            }}
          >
            <LucideIcon name="Trophy" size={42} color="#ffffff" />
          </View>
          <Text className="text-h2 font-bold text-foreground mb-1">Shot Vision</Text>
          <Text className="text-body text-muted-foreground text-center">
            Track your tennis journey
          </Text>
        </View>

        <TouchableOpacity
          onPress={onGooglePress}
          disabled={googleDisabled}
          style={{
            ...oauthButtonStyle,
            marginBottom: 12,
            opacity: googleOpacity,
          }}
        >
          <View className="flex-row items-center gap-3">
            {googleLoading ? (
              <ActivityIndicator size="small" color={BLUE} />
            ) : (
              <>
                <GoogleMark size={22} />
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#1f2937" }}>
                  Continue with Google
                </Text>
              </>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleAppleSignIn}
          disabled={isLoggingInApple}
          style={{
            ...oauthButtonStyle,
            opacity: isLoggingInApple ? 0.6 : 1,
          }}
        >
          <View className="flex-row items-center gap-3">
            {isLoggingInApple ? (
              <ActivityIndicator size="small" color={BLUE} />
            ) : (
              <>
                <AppleLogo size={22} color="#1f2937" />
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#1f2937" }}>
                  Continue with Apple
                </Text>
              </>
            )}
          </View>
        </TouchableOpacity>

        <Text className="text-caption text-muted-foreground text-center mt-8 leading-5">
          {"By continuing you agree to our "}
          <Text onPress={() => router.push("/terms")} style={{ color: BLUE, fontWeight: "600" }}>
            Terms
          </Text>
          {" & "}
          <Text onPress={() => router.push("/privacy")} style={{ color: BLUE, fontWeight: "600" }}>
            Privacy Policy
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

function LoginWithGoogleAuth() {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoggingInGoogle, setIsLoggingInGoogle] = useState(false);

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  const onGooglePress = async () => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Use the mobile app",
        "Google Sign-In runs through the native Google SDK. Open Shot Vision on iOS or Android to sign in with Google."
      );
      return;
    }

    setIsLoggingInGoogle(true);
    try {
      const result = await signInWithGoogle();
      if (result.type === "cancel") return;

      await login(result);
      router.replace("/(tabs)/dashboard");
    } catch (err: unknown) {
      const { title, message } = formatLoginFailure(err);
      console.error("Google login error:", err);
      Alert.alert(title, message);
    } finally {
      setIsLoggingInGoogle(false);
    }
  };

  return (
    <LoginBody
      onGooglePress={() => void onGooglePress()}
      googleDisabled={isLoggingInGoogle}
      googleLoading={isLoggingInGoogle}
      googleOpacity={isLoggingInGoogle ? 0.6 : 1}
    />
  );
}

function LoginGoogleNotConfigured() {
  const onGooglePress = () => {
    Alert.alert(
      "Finish Google setup",
      "Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to your Firebase Web client ID (Google Cloud → APIs & Services → Credentials → OAuth 2.0 Web client). Add your Android SHA-1 in Firebase and keep android/app/google-services.json in sync."
    );
  };

  return (
    <LoginBody
      onGooglePress={onGooglePress}
      googleDisabled={false}
      googleLoading={false}
      googleOpacity={1}
    />
  );
}

export default function Login() {
  return isGoogleOAuthConfigured() ? <LoginWithGoogleAuth /> : <LoginGoogleNotConfigured />;
}
