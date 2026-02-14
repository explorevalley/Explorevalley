import React from "react";
import { SafeAreaView, StatusBar } from "react-native";
import HomeScreen from "./screens/HomeScreen";
import CookieConsentGate from "./components/CookieConsentGate";

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "black" }}>
      <StatusBar barStyle="light-content" />
      <HomeScreen />
      <CookieConsentGate />
    </SafeAreaView>
  );
}
