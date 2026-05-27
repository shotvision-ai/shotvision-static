import { Redirect } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { ScreenLoadingState } from "~/components/ui/AsyncListState";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScreenLoadingState message="Starting Shot Vision…" />
      </SafeAreaView>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  // Unauthenticated: root layout navigates to /login (avoid duplicate Redirect + replace race)
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScreenLoadingState />
    </SafeAreaView>
  );
}
