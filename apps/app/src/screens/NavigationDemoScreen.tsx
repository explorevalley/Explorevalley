import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import MobileBottomNav from "../components/MobileBottomNav";
import MobileTopBar from "../components/MobileTopBar";
import { navigationDemoStyles as styles } from "../styles/NavigationDemoScreen.styles";
import { navigationDemoData as t } from "../staticData/navigationDemoScreen.staticData";

/**
 * Demo screen showcasing the award-winning mobile navigation components
 * This demonstrates all features including animations, badges, and interactions
 */
export default function NavigationDemoScreen() {
  const [activeTab, setActiveTab] = useState(t.initial.activeTab);
  const [searchQuery, setSearchQuery] = useState(t.initial.searchQuery);
  const [notificationCount, setNotificationCount] = useState(t.initial.notificationCount);

  // Custom navigation items with badges
  const navItems = t.navItems;

  const handleFilter = () => {
    console.log(t.logs.filter);
  };

  const handleNotifications = () => {
    console.log(t.logs.notifications);
    setNotificationCount(0); // Clear notifications on press
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    console.log(t.logs.tabChanged, tab);
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <MobileTopBar
        query={searchQuery}
        setQuery={setSearchQuery}
        onFilter={handleFilter}
        onNotifications={handleNotifications}
        notificationCount={notificationCount}
        showSearch={activeTab === "travel"}
      />

      {/* Main Content Area */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.demoSection}>
          <Text style={styles.title}>{t.header.title}</Text>
          <Text style={styles.subtitle}>{t.header.subtitle}</Text>
        </View>

        {/* Active Tab Content */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {activeTab === t.tabs.travel && t.card.titleByTab.travel}
            {activeTab === t.tabs.taxi && t.card.titleByTab.taxi}
            {activeTab === t.tabs.food && t.card.titleByTab.food}
            {activeTab === t.tabs.profile && t.card.titleByTab.profile}
          </Text>
          <Text style={styles.cardDescription}>
            {activeTab === t.tabs.travel && t.card.descByTab.travel}
            {activeTab === t.tabs.taxi && t.card.descByTab.taxi}
            {activeTab === t.tabs.food && t.card.descByTab.food}
            {activeTab === t.tabs.profile && t.card.descByTab.profile}
          </Text>
        </View>

        {/* Features Showcase */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>{t.features.title}</Text>

          {t.features.items.map((feature) => (
            <View key={feature.name} style={styles.featureItem}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureName}>{feature.name}</Text>
                <Text style={styles.featureDesc}>{feature.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Interactive Demo Controls */}
        <View style={styles.controlsSection}>
          <Text style={styles.sectionTitle}>{t.controls.title}</Text>

          <Pressable
            style={styles.button}
            onPress={() =>
              setNotificationCount((prev) => Math.min(prev + 1, 99))
            }
          >
            <Text style={styles.buttonText}>
              {t.controls.addNotification(notificationCount)}
            </Text>
          </Pressable>

          <Pressable
            style={styles.button}
            onPress={() => setSearchQuery(t.controls.sampleQuery)}
          >
            <Text style={styles.buttonText}>{t.controls.fillSearch}</Text>
          </Pressable>

          <Pressable
            style={styles.button}
            onPress={() => {
              const tabs = [t.tabs.travel, t.tabs.taxi, t.tabs.food, t.tabs.profile];
              const currentIndex = tabs.indexOf(activeTab);
              const nextIndex = (currentIndex + 1) % tabs.length;
              setActiveTab(tabs[nextIndex]);
            }}
          >
            <Text style={styles.buttonText}>{t.controls.cycleTabs}</Text>
          </Pressable>
        </View>

        {/* Add extra padding at bottom for the nav bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        items={navItems}
      />
    </View>
  );
}
