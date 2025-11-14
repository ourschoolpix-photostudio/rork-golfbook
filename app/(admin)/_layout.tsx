import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ 
      headerBackTitle: 'Back',
      headerLeft: () => null,
      headerStyle: {
        backgroundColor: '#003366',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        color: '#fff',
        fontWeight: '600',
      },
    }}>
      <Stack.Screen
        name="admin-players"
        options={{
          title: 'Player Management',
          headerTitleAlign: 'center',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="admin-events"
        options={{
          title: 'Event Management',
          headerTitleAlign: 'center',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="admin-financial"
        options={{
          title: 'Financial Summary',
          headerTitleAlign: 'center',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="bulk-update"
        options={{
          title: 'Bulk Update Members',
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'Settings',
          headerTitleAlign: 'center',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="import-members"
        options={{
          title: 'Import Members',
          headerTitleAlign: 'center',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
