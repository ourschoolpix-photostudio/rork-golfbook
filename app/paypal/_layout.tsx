import { Stack } from 'expo-router';

export default function PayPalLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="success" />
      <Stack.Screen name="cancel" />
    </Stack>
  );
}
