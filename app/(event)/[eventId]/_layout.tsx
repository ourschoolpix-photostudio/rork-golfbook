import { Stack } from 'expo-router';

export default function EventLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1B5E20',
        },
        headerTintColor: '#fff',
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="registration" />
      <Stack.Screen name="groupings" />
      <Stack.Screen name="scoring" />
      <Stack.Screen name="rolex" />
      <Stack.Screen name="finance" />
      <Stack.Screen name="leaderboard" />
    </Stack>
  );
}
