import React from "react";
import { SafeAreaView, StatusBar } from "react-native";
import HomeScreen from "./screens/HomeScreen";
import CookieConsentGate from "./components/CookieConsentGate";
import { cxAppStyles } from "./styles/cxAppStyles";

export default function App() {
  return (
    <SafeAreaView style={cxAppStyles.root}>
      <StatusBar barStyle="light-content" />
      <HomeScreen />
      <CookieConsentGate />
    </SafeAreaView>
  );
}
