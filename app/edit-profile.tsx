import { useState, useEffect } from "react";
import { View, ScrollView, TouchableOpacity, Platform, Alert, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { ProfileAvatar } from "~/components/ui/ProfileAvatar";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useAuth } from "../src/context/AuthContext";
import { useDefaultAvatar } from "../src/context/DefaultAvatarContext";
import { profileService } from "../src/services/api/profileService";
import { PROFILE_IMAGE_UPLOAD_ENABLED } from "../src/config/featureFlags";
import { devLog } from "../src/utils/devLog";
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
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { preferredAvatarId, setPreferredAvatarId } = useDefaultAvatar();
  const androidTopOffset = Platform.OS === "android" ? 32 : 0;

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setBio(user.bio || "");
      setLocation(user.location || "");
    }
  }, [user]);

  const handleSave = async () => {
    if (name.trim() === "") {
      Alert.alert("Validation Error", "Name cannot be empty.");
      return;
    }

    setIsSubmitting(true);
    try {
      await profileService.updateProfile({
        name,
        bio,
        location,
      });
      
      await refreshUser();
      
      Alert.alert("Success", "Profile updated successfully!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error: any) {
      devLog.error("[edit-profile] save failed:", error);
      Alert.alert("Error", error.message || "Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8 + androidTopOffset,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile photo: display only. Upload UI disabled until storage is live. */}
        <View className="items-center mb-8">
          <ProfileAvatar
            imageUrl={user.image}
            preferredAvatarId={preferredAvatarId}
            size={120}
            withBorder={true}
          />
          {/* TODO: Re-enable after production storage integration (Cloudinary/S3). Set PROFILE_IMAGE_UPLOAD_ENABLED. */}
          {!PROFILE_IMAGE_UPLOAD_ENABLED ? (
            <Text className="text-caption text-muted-foreground mt-4 text-center px-4">
              Custom photo upload is coming soon. Choose a default picture below.
            </Text>
          ) : null}

          <Text className="text-caption font-semibold text-muted-foreground mt-8 mb-3 self-start px-1">
            DEFAULT PICTURE
          </Text>
          <Text className="text-caption text-muted-foreground mb-4 self-start px-1">
            Used when you don&apos;t have a profile photo. Female (9–12) and male (13–16) use bundled
            illustrations; classic (1–8) uses color placeholders.
          </Text>
          <Text className="text-caption font-semibold text-muted-foreground mb-3 self-start px-1">
            Classic
          </Text>
          <View className="flex-row flex-wrap justify-center gap-3 w-full mb-2">
            {Array.from({ length: CLASSIC_AVATAR_MAX }, (_, i) => i + 1).map((id) => {
              const selected = preferredAvatarId === id;
              return (
                <TouchableOpacity
                  key={id}
                  onPress={() => void setPreferredAvatarId(id)}
                  activeOpacity={0.85}
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
          <Text className="text-caption font-semibold text-muted-foreground mb-3 mt-4 self-start px-1">
            Female
          </Text>
          <View className="flex-row flex-wrap justify-center gap-3 w-full">
            {Array.from({ length: FEMALE_AVATAR_MAX - FEMALE_AVATAR_MIN + 1 }, (_, i) => i + FEMALE_AVATAR_MIN).map(
              (id) => {
                const selected = preferredAvatarId === id;
                return (
                  <TouchableOpacity
                    key={id}
                    onPress={() => void setPreferredAvatarId(id)}
                    activeOpacity={0.85}
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
              }
            )}
          </View>
          <Text className="text-caption font-semibold text-muted-foreground mb-3 mt-4 self-start px-1">
            Male
          </Text>
          <View className="flex-row flex-wrap justify-center gap-3 w-full">
            {Array.from({ length: MALE_AVATAR_MAX - MALE_AVATAR_MIN + 1 }, (_, i) => i + MALE_AVATAR_MIN).map(
              (id) => {
                const selected = preferredAvatarId === id;
                return (
                  <TouchableOpacity
                    key={id}
                    onPress={() => void setPreferredAvatarId(id)}
                    activeOpacity={0.85}
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
              }
            )}
          </View>
        </View>

        {/* Form Fields */}
        <View className="gap-5">
          {/* Name */}
          <View>
            <Text className="text-caption font-semibold text-muted-foreground mb-2 px-1">NAME</Text>
            <Input
              placeholder="Enter your name"
              value={name}
              onChangeText={setName}
              className="rounded-xl border-0 bg-muted/40 px-4 py-3.5 text-body"
            />
          </View>

          {/* Email (Read-only) */}
          <View>
            <Text className="text-caption font-semibold text-muted-foreground mb-2 px-1">
              EMAIL
            </Text>
            <View className="rounded-xl bg-muted/20 px-4 py-3.5">
              <Text className="text-body text-muted-foreground/60">{user.email}</Text>
            </View>
          </View>

          {/* Bio */}
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

          {/* Location */}
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

        {/* Save Button */}
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
            onPress={handleSave} 
            size="lg" 
            className="rounded-xl py-4 bg-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-button font-semibold text-primary-foreground">Save Changes</Text>
            )}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
