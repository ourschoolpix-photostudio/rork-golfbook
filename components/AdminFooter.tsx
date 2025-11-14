import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export function AdminFooter() {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'grid-outline',
      activeIcon: 'grid',
      route: '/(tabs)/dashboard',
      pathMatch: '/dashboard',
    },
    {
      id: 'players',
      label: 'Players',
      icon: 'people-outline',
      activeIcon: 'people',
      route: '/(admin)/admin-players',
      pathMatch: '/admin-players',
    },
    {
      id: 'events',
      label: 'Events',
      icon: 'calendar-outline',
      activeIcon: 'calendar',
      route: '/(admin)/admin-events',
      pathMatch: '/admin-events',
    },
    {
      id: 'finance',
      label: 'Finance',
      icon: 'cash-outline',
      activeIcon: 'cash',
      route: '/(admin)/admin-financial',
      pathMatch: '/admin-financial',
    },
    {
      id: 'admin',
      label: 'Admin',
      icon: 'settings-outline',
      activeIcon: 'settings',
      route: '/(tabs)/admin',
      pathMatch: '/admin',
    },
  ];

  const handleTabPress = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={styles.footer}>
      {tabs.map((tab) => {
        const isActive = pathname === tab.pathMatch;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabButton}
            onPress={() => handleTabPress(tab.route)}
            disabled={isActive}
          >
            <Ionicons
              name={isActive ? (tab.activeIcon as any) : (tab.icon as any)}
              size={24}
              color={isActive ? '#fff' : '#8899AA'}
            />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#003366',
    borderTopWidth: 1,
    borderTopColor: '#002244',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 4,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 12,
    paddingTop: 4,
  },
  tabLabel: {
    fontSize: 10,
    color: '#8899AA',
    marginTop: 4,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
