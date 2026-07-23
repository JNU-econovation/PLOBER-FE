import { Stack } from "expo-router";

export default function CrewsLayout() {
  return (
    <Stack
      screenOptions={{
        animation: "slide_from_right",
        headerShown: false,
      }}
    />
  );
}
