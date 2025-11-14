import { Stack } from 'expo-router';

export default function GameLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="scoring" />
      <Stack.Screen name="scorecard" />
    </Stack>
  );
}
