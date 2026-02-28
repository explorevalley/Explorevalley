import React from "react";
import { SafeAreaView, StatusBar, ImageBackground } from "react-native";
import HomeScreen from "./screens/HomeScreen";
import CookieConsentGate from "./components/CookieConsentGate";
import { cxAppStyles } from "./styles/cxAppStyles";
import { appData as t } from "./staticData/app.staticData";

export default function App() {
  return (
    <SafeAreaView style={cxAppStyles.root}>
      <StatusBar barStyle={t.statusBarStyle} />
      <ImageBackground
        source={{ uri: t.backgroundImageUrl }}
        style={cxAppStyles.background}
        imageStyle={cxAppStyles.backgroundImage}
        resizeMode="cover"
      >
        <HomeScreen />
        <CookieConsentGate />
      </ImageBackground>
    </SafeAreaView>
  );
}
