import { Tabs, useRouter } from "expo-router";
import { LayoutDashboard, Users, Trophy, ShieldCheck, LogOut, FlagTriangleRight, Bell } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { useNotifications } from "@/contexts/NotificationsContext";
import { NotificationsModal } from "@/components/NotificationsModal";
import { hasAnyRole } from "@/utils/rolePermissions";

export default function TabLayout() {
  const { currentUser, logout } = useAuth();
  const router = useRouter();
  const { unreadCount } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      router.replace('/login' as any);
    }
  }, [currentUser, router]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#e5e7eb',
          tabBarInactiveTintColor: '#9ca3af',
          tabBarStyle: {
            backgroundColor: '#374151',
            borderTopColor: '#1f2937',
          },
          headerStyle: {
            backgroundColor: '#374151',
            height: 130,
          },
          headerTintColor: '#ffffff',
          headerShown: true,
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color }) => <LayoutDashboard size={24} color={color} />,
            headerRight: () => (
              <View style={headerStyles.headerRight}>
                {currentUser?.isAdmin && (
                  <TouchableOpacity 
                    onPress={() => setShowNotifications(true)} 
                    style={headerStyles.bellButton}
                  >
                    <Bell size={22} color="#e5e7eb" />
                    {unreadCount > 0 && (
                      <View style={headerStyles.badge}>
                        <Text style={headerStyles.badgeText}>
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={handleLogout} style={headerStyles.logoutButton}>
                  <LogOut size={22} color="#e5e7eb" />
                </TouchableOpacity>
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="games"
          options={{
            title: "Games",
            tabBarIcon: ({ color }) => <FlagTriangleRight size={24} color={color} />,
            headerRight: () => null,
          }}
        />
        <Tabs.Screen
          name="members"
          options={{
            title: "Members",
            tabBarIcon: ({ color }) => <Users size={24} color={color} />,
            headerTitleAlign: 'center',
            headerTitleStyle: {
              fontSize: 16,
              fontWeight: '700',
            },
            headerRight: () => null,
          }}
        />
        <Tabs.Screen
          name="rolex-points"
          options={{
            title: "Global Rolex",
            tabBarIcon: ({ color }) => <Trophy size={24} color={color} />,
            headerRight: () => null,
          }}
        />
        <Tabs.Screen
          name="admin"
          options={{
            title: "Admin",
            tabBarIcon: ({ color }) => <ShieldCheck size={24} color={color} />,
            href: (currentUser?.isAdmin || hasAnyRole(currentUser, ['President', 'VP', 'Tournament Director', 'Handicap Director', 'Member Relations', 'Financer', 'Operations'])) ? undefined : null,
            headerRight: () => null,
          }}
        />
        <Tabs.Screen
          name="archived"
          options={{
            href: null,
          }}
        />
      </Tabs>
      {currentUser?.isAdmin && (
        <NotificationsModal
          visible={showNotifications}
          onClose={() => setShowNotifications(false)}
        />
      )}
    </>
  );
}

const headerStyles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 16,
  },
  bellButton: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  logoutButton: {
    padding: 4,
  },
});
