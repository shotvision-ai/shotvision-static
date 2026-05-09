import { useCallback, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Text } from "~/components/ui/text";
import LucideIcon from "~/lib/icons/LucideIcon";
import type { InAppNotification } from "~/types/notification";
import { notificationService } from "../src/services/api/notificationService";
import { AppError } from "../src/services/api/apiErrors";

const BLUE = "#2563eb";

export default function Notifications() {
  const insets = useSafeAreaInsets();
  const androidTopOffset = Platform.OS === "android" ? 32 : 0;
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMutating, setIsMutating] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      setError(null);
      if (!opts?.silent) setIsLoading(true);
      const list = await notificationService.list();
      setNotifications(list);
    } catch (e) {
      const msg =
        e instanceof AppError ? e.message : "Could not load notifications. Try again in a moment.";
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load({ silent: true });
    }, [load])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    void load({ silent: true });
  };

  const markAsRead = useCallback(async (id: string) => {
    try {
      setIsMutating(true);
      await notificationService.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (e) {
      const msg =
        e instanceof AppError ? e.message : "Could not update notification. Please try again.";
      Alert.alert("Error", msg);
    } finally {
      setIsMutating(false);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      setIsMutating(true);
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      const msg =
        e instanceof AppError ? e.message : "Could not mark all as read. Please try again.";
      Alert.alert("Error", msg);
    } finally {
      setIsMutating(false);
    }
  }, []);

  const toggleDeleteMode = () => {
    setDeleteMode((prev) => !prev);
    setSelectedIds(new Set());
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteSelected = () => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      "Delete Notifications",
      `Delete ${selectedIds.size} selected notification${selectedIds.size > 1 ? "s" : ""}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsMutating(true);
              await Promise.all([...selectedIds].map((id) => notificationService.deleteOne(id)));
              setSelectedIds(new Set());
              setDeleteMode(false);
              await load({ silent: true });
            } catch (e) {
              const msg =
                e instanceof AppError ? e.message : "Could not delete notifications. Please try again.";
              Alert.alert("Error", msg);
            } finally {
              setIsMutating(false);
            }
          },
        },
      ]
    );
  };

  const deleteAll = () => {
    Alert.alert("Delete All", "Delete all notifications?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete All",
        style: "destructive",
        onPress: async () => {
          try {
            setIsMutating(true);
            await notificationService.deleteAll();
            setDeleteMode(false);
            setSelectedIds(new Set());
            await load({ silent: true });
          } catch (e) {
            const msg =
              e instanceof AppError ? e.message : "Could not delete notifications. Please try again.";
            Alert.alert("Error", msg);
          } finally {
            setIsMutating(false);
          }
        },
      },
    ]);
  };

  const handlePress = (notification: InAppNotification) => {
    if (deleteMode) {
      toggleSelection(notification.id);
    } else if (!notification.read) {
      void markAsRead(notification.id);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIconName = (type: string) => {
    switch (type) {
      case "match":
        return "Trophy";
      case "alert":
        return "Bell";
      case "system":
        return "Info";
      default:
        return "Bell";
    }
  };

  const getIconColor = (type: string, read: boolean) => {
    if (read) return "#9ca3af";
    switch (type) {
      case "match":
        return BLUE;
      case "alert":
        return "#f59e0b";
      case "system":
        return "#8b5cf6";
      default:
        return BLUE;
    }
  };

  const getIconBg = (type: string, read: boolean) => {
    if (read) return "rgba(0,0,0,0.05)";
    switch (type) {
      case "match":
        return "rgba(37, 99, 235, 0.1)";
      case "alert":
        return "rgba(245, 158, 11, 0.1)";
      case "system":
        return "rgba(139, 92, 246, 0.1)";
      default:
        return "rgba(37, 99, 235, 0.1)";
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      {/* Header Actions */}
      <View className="flex-row items-center justify-between px-5 pt-1 pb-2">
        <View className="flex-row items-center gap-3">
          {unreadCount > 0 && !deleteMode && (
            <Text className="text-caption text-muted-foreground">{unreadCount} unread</Text>
          )}
          {deleteMode && (
            <Text className="text-caption text-muted-foreground">{selectedIds.size} selected</Text>
          )}
        </View>
        <View className="flex-row items-center gap-3">
          {!deleteMode && unreadCount > 0 && (
            <TouchableOpacity onPress={() => void markAllRead()} disabled={isMutating}>
              <Text className="text-caption font-semibold" style={{ color: BLUE }}>
                Mark all read
              </Text>
            </TouchableOpacity>
          )}
          {deleteMode ? (
            <>
              <TouchableOpacity
                onPress={deleteAll}
                disabled={isMutating}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 10,
                  backgroundColor: "rgba(220, 38, 38, 0.1)",
                  opacity: isMutating ? 0.5 : 1,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#dc2626" }}>
                  Delete All
                </Text>
              </TouchableOpacity>
              {selectedIds.size > 0 && (
                <TouchableOpacity
                  onPress={deleteSelected}
                  disabled={isMutating}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 10,
                    backgroundColor: "#dc2626",
                    opacity: isMutating ? 0.5 : 1,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#ffffff" }}>
                    Delete ({selectedIds.size})
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={toggleDeleteMode}
                disabled={isMutating}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 10,
                  backgroundColor: "rgba(0,0,0,0.06)",
                  opacity: isMutating ? 0.5 : 1,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#6b7280" }}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              onPress={toggleDeleteMode}
              disabled={isMutating}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 10,
                backgroundColor: "rgba(220, 38, 38, 0.08)",
                opacity: isMutating ? 0.5 : 1,
              }}
            >
              <LucideIcon name="Trash2" size={14} color="#dc2626" />
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#dc2626" }}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 4 + androidTopOffset,
          paddingBottom: 40 + insets.bottom,
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={BLUE} />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading && !isRefreshing ? (
          <View className="flex-1 items-center justify-center py-24">
            <ActivityIndicator size="large" color={BLUE} />
            <Text className="text-body text-muted-foreground mt-4">Loading notifications…</Text>
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center py-20 px-8">
            <LucideIcon name="CircleAlert" size={64} color="#dc2626" />
            <Text className="text-h4 font-semibold text-foreground mt-6 mb-2 text-center">
              {"Couldn't load notifications"}
            </Text>
            <Text className="text-body text-muted-foreground text-center mb-6">{error}</Text>
            <TouchableOpacity
              onPress={() => void load()}
              className="bg-primary px-6 py-3 rounded-xl"
              style={{ backgroundColor: BLUE }}
            >
              <Text className="text-white font-semibold">Try again</Text>
            </TouchableOpacity>
          </View>
        ) : notifications.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <LucideIcon name="Bell" size={64} color="#9ca3af" />
            <Text className="text-h4 font-semibold text-foreground mt-6 mb-2">All Caught Up!</Text>
            <Text className="text-body text-muted-foreground text-center">
              No notifications here.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {notifications.map((notification) => {
              const isSelected = selectedIds.has(notification.id);
              return (
                <TouchableOpacity
                  key={notification.id}
                  onPress={() => handlePress(notification)}
                  disabled={isMutating}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: isSelected
                      ? "rgba(37, 99, 235, 0.06)"
                      : notification.read
                        ? undefined
                        : "rgba(37, 99, 235, 0.03)",
                    borderRadius: 16,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? BLUE : "rgba(0,0,0,0.08)",
                    padding: 16,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: notification.read ? 0.03 : 0.06,
                    shadowRadius: 8,
                    elevation: notification.read ? 1 : 2,
                    opacity: notification.read && !deleteMode ? 0.8 : 1,
                  }}
                >
                  <View className="flex-row items-start gap-3">
                    {deleteMode ? (
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          borderWidth: 2,
                          borderColor: isSelected ? BLUE : "#d1d5db",
                          backgroundColor: isSelected ? BLUE : "transparent",
                          alignItems: "center",
                          justifyContent: "center",
                          marginTop: 8,
                        }}
                      >
                        {isSelected && <LucideIcon name="Check" size={14} color="#ffffff" />}
                      </View>
                    ) : (
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: getIconBg(notification.type, notification.read),
                        }}
                      >
                        <LucideIcon
                          name={getIconName(notification.type) as any}
                          size={20}
                          color={getIconColor(notification.type, notification.read)}
                        />
                      </View>
                    )}

                    <View className="flex-1">
                      <Text
                        className="text-body font-semibold text-foreground mb-1"
                        style={{ opacity: notification.read && !deleteMode ? 0.7 : 1 }}
                      >
                        {notification.title}
                      </Text>
                      <Text className="text-caption text-muted-foreground leading-5 mb-2">
                        {notification.message}
                      </Text>
                      <View className="flex-row items-center justify-between">
                        <Text className="text-caption text-muted-foreground/60">
                          {notification.time}
                        </Text>
                        {notification.read && !deleteMode && (
                          <View
                            style={{
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 6,
                              backgroundColor: "rgba(0,0,0,0.05)",
                            }}
                          >
                            <Text style={{ fontSize: 11, color: "#9ca3af" }}>Read</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {!notification.read && !deleteMode && (
                      <View
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: 5,
                          backgroundColor: BLUE,
                          marginTop: 4,
                        }}
                      />
                    )}
                  </View>

                  {!notification.read && !deleteMode && (
                    <Text className="text-caption text-muted-foreground/50 mt-2 text-right">
                      Tap to mark as read
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
