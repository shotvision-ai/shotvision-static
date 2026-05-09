import { useState, useEffect } from "react";
import { View, ScrollView, TouchableOpacity, Platform, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text } from "~/components/ui/text";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { ProfileAvatar } from "~/components/ui/ProfileAvatar";
import LucideIcon from "~/lib/icons/LucideIcon";
import { useAuth } from "../src/context/AuthContext";
import { profileService } from "../src/services/api/profileService";

export default function EditProfile() {
  const router = useRouter();
  const { user, restoreSession } = useAuth();
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
      
      // Refresh global auth state
      await restoreSession();
      
      Alert.alert("Success", "Profile updated successfully!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      Alert.alert("Error", error.message || "Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePhoto = () => {
    Alert.alert(
      "Change Photo",
      "Image upload functionality will be fully integrated with a storage service in the next update.",
      [{ text: "OK" }]
    );
  };

  if (!user) return null;

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
        {/* Profile Photo Section */}
        <View className="items-center mb-8">
            <ProfileAvatar imageUrl={user.image || ""} size={120} withBorder={true} />

          <TouchableOpacity
            onPress={handleChangePhoto}
            className="mt-4 flex-row items-center gap-2"
          >
            <LucideIcon name="Camera" size={18} color="#22c55e" />
            <Text className="text-body font-medium text-primary">Change Photo</Text>
          </TouchableOpacity>
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
