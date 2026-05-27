import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  InteractionManager,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { ProfileAvatar } from "~/components/ui/ProfileAvatar";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useTheme } from "~/theming/ThemeProvider";
import { useAuth } from "../src/context/AuthContext";
import { useDefaultAvatar } from "../src/context/DefaultAvatarContext";
import { profileService } from "../src/services/api/profileService";
import { devLog } from "../src/utils/devLog";
import { getUserFriendlyErrorMessage } from "../src/services/api/userFriendlyErrors";
import { useAuthStore } from "../src/stores/authStore";
import {
  CLASSIC_AVATAR_MAX,
  defaultAvatarAccent,
  defaultAvatarBuiltInImage,
  FEMALE_AVATAR_MAX,
  FEMALE_AVATAR_MIN,
  MALE_AVATAR_MAX,
  MALE_AVATAR_MIN,
} from "~/lib/defaultAvatars";

export default function EditProfile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const applyUserProfileUpdate = useAuthStore((s) => s.applyUserProfileUpdate);
  const { preferredAvatarId, setPreferredAvatarId, useBuiltInAvatar, displayRevision } =
    useDefaultAvatar();
  const profileImageRevision = useAuthStore((s) => s.profileImageRevision);
  const avatarCacheRevision = displayRevision + profileImageRevision;
  const imageDisplayKey = user ? `${user.id}-${avatarCacheRevision}` : undefined;
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setBio(user.bio || "");
      setLocation(user.location || "");
    }
  }, [user]);

  const handleSave = useCallback(async () => {
    if (!user) return;

    const trimmedName = name.trim();
    if (trimmedName === "") {
      Alert.alert("Validation Error", "Name cannot be empty.");
      return;
    }

    setIsSubmitting(true);
    try {
      const patch = {
        name: trimmedName,
        bio: bio.trim() || undefined,
        location: location.trim() || undefined,
      };

      devLog.info("[edit-profile] save", { patch });

      const updated = await profileService.updateProfile(patch, user);
      applyUserProfileUpdate(updated);

      if (!isMountedRef.current) return;

      router.back();

      InteractionManager.runAfterInteractions(() => {
        if (!isMountedRef.current) return;
        Alert.alert("Success", "Profile updated successfully!");
      });
    } catch (error: unknown) {
      if (!isMountedRef.current) return;
      devLog.error("[edit-profile] save failed:", error);
      Alert.alert(
        "Error",
        getUserFriendlyErrorMessage(error, "Failed to update profile. Please try again.")
      );
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }, [user, name, bio, location, applyUserProfileUpdate, router]);

  if (!user) return null;

  const renderDefaultPickerTile = (id: number) => {
    const src = defaultAvatarBuiltInImage(id);
    if (src) {
      return (
        <Image
          source={src}
          style={{ width: 64, height: 64, borderRadius: 32 }}
          contentFit="cover"
        />
      );
    }
    return (
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: defaultAvatarAccent(id),
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LucideIcon name="User" size={28} color="#ffffff" />
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {/* JS header — inset-aware (same pattern as FAQ) */}
        <View
          style={{
            paddingTop: insets.top,
            paddingLeft: insets.left,
            paddingRight: insets.right,
            backgroundColor: theme.colors.background,
          }}
        >
          <View
            style={{
              height: 56,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 4,
            }}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={{ padding: 8, marginLeft: 4, minWidth: 44, minHeight: 44, justifyContent: "center" }}
            >
              <LucideIcon name="ChevronLeft" size={26} color={theme.colors.foreground} />
            </TouchableOpacity>

            <View style={{ flex: 1, alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  fontFamily: theme.typography.h2?.fontFamily,
                  color: theme.colors.foreground,
                }}
                numberOfLines={1}
              >
                Edit Profile
              </Text>
            </View>

            <View style={{ width: 44 }} />
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 56 : 0}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 8,
              paddingBottom: 40 + insets.bottom,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View className="items-center mb-6">
              <ProfileAvatar
                imageUrl={user.image}
                preferredAvatarId={useBuiltInAvatar ? preferredAvatarId : undefined}
                fallbackUserId={user.id}
                imageDisplayKey={imageDisplayKey}
                profileImageCacheRevision={avatarCacheRevision}
                size={120}
                withBorder={true}
              />

              <View className="flex-row flex-wrap justify-center gap-3 w-full mt-6 mb-3">
                {Array.from({ length: CLASSIC_AVATAR_MAX }, (_, i) => i + 1).map((id) => {
                  const selected = preferredAvatarId === id;
                  return (
                    <TouchableOpacity
                      key={id}
                      onPress={() => void setPreferredAvatarId(id)}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel="Select profile picture"
                      accessibilityState={{ selected }}
                      style={{
                        borderRadius: 999,
                        padding: selected ? 3 : 0,
                        borderWidth: selected ? 3 : 0,
                        borderColor: "#2563eb",
                      }}
                    >
                      {renderDefaultPickerTile(id)}
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View className="flex-row flex-wrap justify-center gap-3 w-full mb-3">
                {Array.from(
                  { length: FEMALE_AVATAR_MAX - FEMALE_AVATAR_MIN + 1 },
                  (_, i) => i + FEMALE_AVATAR_MIN
                ).map((id) => {
                  const selected = preferredAvatarId === id;
                  return (
                    <TouchableOpacity
                      key={id}
                      onPress={() => void setPreferredAvatarId(id)}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel="Select profile picture"
                      accessibilityState={{ selected }}
                      style={{
                        borderRadius: 999,
                        padding: selected ? 3 : 0,
                        borderWidth: selected ? 3 : 0,
                        borderColor: "#2563eb",
                      }}
                    >
                      {renderDefaultPickerTile(id)}
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View className="flex-row flex-wrap justify-center gap-3 w-full">
                {Array.from(
                  { length: MALE_AVATAR_MAX - MALE_AVATAR_MIN + 1 },
                  (_, i) => i + MALE_AVATAR_MIN
                ).map((id) => {
                  const selected = preferredAvatarId === id;
                  return (
                    <TouchableOpacity
                      key={id}
                      onPress={() => void setPreferredAvatarId(id)}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel="Select profile picture"
                      accessibilityState={{ selected }}
                      style={{
                        borderRadius: 999,
                        padding: selected ? 3 : 0,
                        borderWidth: selected ? 3 : 0,
                        borderColor: "#2563eb",
                      }}
                    >
                      {renderDefaultPickerTile(id)}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View className="gap-5 mt-2">
              <View>
                <Text className="text-caption font-semibold text-muted-foreground mb-2 px-1">NAME</Text>
                <Input
                  placeholder="Enter your name"
                  value={name}
                  onChangeText={setName}
                  className="rounded-xl border-0 bg-muted/40 px-4 py-3.5 text-body"
                />
              </View>

              <View>
                <Text className="text-caption font-semibold text-muted-foreground mb-2 px-1">
                  EMAIL
                </Text>
                <View className="rounded-xl bg-muted/20 px-4 py-3.5">
                  <Text className="text-body text-muted-foreground/60">{user.email}</Text>
                </View>
              </View>

              <View>
                <Text className="text-caption font-semibold text-muted-foreground mb-2 px-1">
                  BIO (OPTIONAL)
                </Text>
                <Textarea
                  placeholder="Tell us about yourself"
                  value={bio}
                  onChangeText={setBio}
                  numberOfLines={4}
                  className="rounded-xl border-0 bg-muted/40 px-4 py-3.5 text-body min-h-[100px]"
                />
              </View>

              <View>
                <Text className="text-caption font-semibold text-muted-foreground mb-2 px-1">
                  LOCATION (OPTIONAL)
                </Text>
                <Input
                  placeholder="City, State"
                  value={location}
                  onChangeText={setLocation}
                  className="rounded-xl border-0 bg-muted/40 px-4 py-3.5 text-body"
                />
              </View>
            </View>

            <View
              className="mt-8"
              style={{
                shadowColor: "#22c55e",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <Button
                onPress={() => void handleSave()}
                size="lg"
                className="rounded-xl py-4 bg-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-button font-semibold text-primary-foreground">
                    Save Changes
                  </Text>
                )}
              </Button>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </>
  );
}
