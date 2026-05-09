import { View } from "react-native";
import { Image } from "expo-image";

interface ProfileAvatarProps {
  imageUrl: string;
  size?: number;
  withBorder?: boolean;
}

export function ProfileAvatar({ imageUrl, size = 40, withBorder = false }: ProfileAvatarProps) {
  return (
    <View
      style={{
        width: size + (withBorder ? 4 : 0),
        height: size + (withBorder ? 4 : 0),
        borderRadius: (size + (withBorder ? 4 : 0)) / 2,
        backgroundColor: withBorder ? "white" : "transparent",
        padding: withBorder ? 2 : 0,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
      }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: "hidden",
        }}
        className="bg-muted"
      >
        <Image
          source={{ uri: imageUrl }}
          style={{ width: size, height: size }}
          contentFit="cover"
        />
      </View>
    </View>
  );
}
