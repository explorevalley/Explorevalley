import React from "react";
import { SafeAreaView, StatusBar, ImageBackground } from "react-native";
import HomeScreen from "./screens/HomeScreen";
import CookieConsentGate from "./components/CookieConsentGate";
import { cxAppStyles } from "./styles/cxAppStyles";

export default function App() {
  const appBackgroundImage = "https://upload.wikimedia.org/wikipedia/commons/c/c3/Chandrakhani_Pass_Malana_Kullu.jpg";

  return (
    <SafeAreaView style={cxAppStyles.root}>
      <StatusBar barStyle="light-content" />
      <ImageBackground
        source={{ uri: appBackgroundImage }}
        style={{ flex: 1 }}
        imageStyle={{ opacity: 0.6 }}
        resizeMode="cover"
      >
        <HomeScreen />
        <CookieConsentGate />
      </ImageBackground>
    </SafeAreaView>
  );
}
