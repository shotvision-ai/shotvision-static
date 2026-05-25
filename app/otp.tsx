import { useState, useRef, useEffect, useCallback } from "react";
import { View, TextInput, TouchableOpacity, Platform, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useAuth } from "../src/context/AuthContext";
import { devLog } from "../src/utils/devLog";

const BLUE = "#2563eb";
const RESEND_SECONDS = 60;

export default function OTP() {
  const router = useRouter();
  const params = useLocalSearchParams<{ identifier: string; method: string }>();
  const { identifier, method } = params;

  const { loginWithOtp, sendOtp, isLoading: isAuthLoading } = useAuth();
  const androidTopOffset = Platform.OS === "android" ? 32 : 0;
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const [timer, setTimer] = useState(RESEND_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (timer <= 0) {
      setCanResend(true);
      return;
    }
    const interval = setInterval(() => {
      setTimer((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    
    if (value === "") {
      // Handle deletion
      newOtp[index] = "";
      setOtp(newOtp);
      // Move focus back if not the first field
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      return;
    }

    // Handle digit entry
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    // Move focus forward if not the last field
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // This handles backspace on an already empty field
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleClearAll = () => {
    setOtp(["", "", "", "", "", ""]);
    setError(null);
    inputRefs.current[0]?.focus();
  };

  const handleVerify = async () => {
    const otpValue = otp.join("");
    if (otpValue.length !== 6) {
      setError("Please enter complete OTP");
      return;
    }
    
    setError(null);
    setIsVerifying(true);
    try {
      await loginWithOtp(identifier || "", otpValue);
      // Navigation is handled globally in _layout.tsx based on isAuthenticated
    } catch (err: any) {
      devLog.error("[otp] verify failed:", err);
      setError(err.message || "Invalid or expired verification code");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = useCallback(async () => {
    if (!canResend || !identifier) return;
    
    setError(null);
    setIsResending(true);
    try {
      await sendOtp(identifier, (method as any) || "email");
      Alert.alert("Success", "Verification code resent successfully.");
      setOtp(["", "", "", "", "", ""]);
      setTimer(RESEND_SECONDS);
      setCanResend(false);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      devLog.error("[otp] resend failed:", err);
      Alert.alert("Error", err.message || "Failed to resend verification code.");
    } finally {
      setIsResending(false);
    }
  }, [canResend, identifier, method, sendOtp]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: "center", paddingTop: androidTopOffset }}>
        {/* Header */}
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
          <Text className="text-h2 font-bold text-foreground mb-2">Verify Your Code</Text>
          <Text className="text-body text-muted-foreground text-center">
            We've sent a 6-digit code to your email/phone
          </Text>
        </View>

        {/* OTP Input */}
        <View className="mb-8">
          <View className="flex-row justify-between mb-4">
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                value={digit}
                onChangeText={(value) => handleOtpChange(value, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                style={{
                  width: 48,
                  height: 58,
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor: error ? "#ef4444" : digit ? BLUE : "#e5e7eb",
                  backgroundColor: digit ? "rgba(37, 99, 235, 0.05)" : "#f9fafb",
                  fontSize: 24,
                  fontWeight: "700",
                  textAlign: "center",
                  color: "#1f2937",
                }}
              />
            ))}
          </View>

          <View className="flex-row items-center justify-between mb-6">
            {error ? (
              <View className="flex-row items-center gap-1.5">
                <LucideIcon name="CircleAlert" size={14} color="#ef4444" />
                <Text style={{ fontSize: 13, color: "#ef4444", fontWeight: "500" }}>{error}</Text>
              </View>
            ) : (
              <View />
            )}
            
            {otp.some(d => d !== "") && (
              <TouchableOpacity onPress={handleClearAll}>
                <Text style={{ fontSize: 13, color: BLUE, fontWeight: "600" }}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Timer + Resend */}
          <View className="items-center">
            {isResending ? (
              <ActivityIndicator size="small" color={BLUE} />
            ) : !canResend ? (
              <View className="flex-row items-center gap-2">
                <Text className="text-body text-muted-foreground">Resend code in</Text>
                <View
                  style={{
                    backgroundColor: BLUE,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    minWidth: 44,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#ffffff" }}>
                    {timer}s
                  </Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleResend}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 24,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: BLUE,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: "600", color: BLUE }}>Resend OTP</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Verify Button */}
        <Button
          onPress={handleVerify}
          size="lg"
          className="rounded-xl mb-4"
          style={{ backgroundColor: BLUE }}
          disabled={otp.join("").length !== 6 || isVerifying}
        >
          {isVerifying ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text className="text-button font-semibold text-white">Verify & Continue</Text>
          )}
        </Button>

        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} className="items-center py-4">
          <Text className="text-body text-muted-foreground">Back to login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
