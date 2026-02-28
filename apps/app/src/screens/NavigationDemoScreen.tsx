import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import MobileBottomNav from "../components/MobileBottomNav";
import MobileTopBar from "../components/MobileTopBar";

/**
 * Demo screen showcasing the award-winning mobile navigation components
 * This demonstrates all features including animations, badges, and interactions
 */
export default function NavigationDemoScreen() {
  const [activeTab, setActiveTab] = useState("travel");
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationCount, setNotificationCount] = useState(3);

  // Custom navigation items with badges
  const navItems = [
    { key: "travel", label: "Explore", icon: "🗺️" },
    { key: "taxi", label: "Taxi", icon: "🚕", badge: 2 },
    { key: "food", label: "Food", icon: "🍽️", badge: 5 },
    { key: "profile", label: "Profile", icon: "👤" },
  ];

  const handleFilter = () => {
    console.log("Filter pressed");
  };

  const handleNotifications = () => {
    console.log("Notifications pressed");
    setNotificationCount(0); // Clear notifications on press
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    console.log("Tab changed to:", tab);
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
          <Text style={styles.title}>🏆 Award-Winning Navigation</Text>
          <Text style={styles.subtitle}>
            Experience modern mobile navigation with glassmorphism, smooth
            animations, and delightful micro-interactions.
          </Text>
        </View>

        {/* Active Tab Content */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {activeTab === "travel" && "🗺️ Explore Amazing Places"}
            {activeTab === "taxi" && "🚕 Book Your Ride"}
            {activeTab === "food" && "🍽️ Delicious Food"}
            {activeTab === "profile" && "👤 Your Profile"}
          </Text>
          <Text style={styles.cardDescription}>
            {activeTab === "travel" &&
              "Discover beautiful destinations, hotels, and cottages in the valley."}
            {activeTab === "taxi" &&
              "Quick and reliable cab booking service. 2 pending bookings."}
            {activeTab === "food" &&
              "Order from the best restaurants. 5 items in your cart."}
            {activeTab === "profile" &&
              "Manage your account, bookings, and preferences."}
          </Text>
        </View>

        {/* Features Showcase */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>✨ Key Features</Text>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🎨</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureName}>Glassmorphism Design</Text>
              <Text style={styles.featureDesc}>
                Frosted glass effect with backdrop blur
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>⚡</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureName}>Smooth Animations</Text>
              <Text style={styles.featureDesc}>
                60fps native-driven spring animations
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>👆</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureName}>Thumb-Friendly</Text>
              <Text style={styles.featureDesc}>
                Bottom navigation for easy reach
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🔔</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureName}>Smart Badges</Text>
              <Text style={styles.featureDesc}>
                Notification counts with overflow handling
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📱</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureName}>Responsive</Text>
              <Text style={styles.featureDesc}>
                Auto-hides on desktop and tablet
              </Text>
            </View>
          </View>
        </View>

        {/* Interactive Demo Controls */}
        <View style={styles.controlsSection}>
          <Text style={styles.sectionTitle}>🎮 Try It Out</Text>

          <Pressable
            style={styles.button}
            onPress={() =>
              setNotificationCount((prev) => Math.min(prev + 1, 99))
            }
          >
            <Text style={styles.buttonText}>
              Add Notification ({notificationCount})
            </Text>
          </Pressable>

          <Pressable
            style={styles.button}
            onPress={() => setSearchQuery("Sample search query")}
          >
            <Text style={styles.buttonText}>Fill Search Bar</Text>
          </Pressable>

          <Pressable
            style={styles.button}
            onPress={() => {
              const tabs = ["travel", "taxi", "food", "profile"];
              const currentIndex = tabs.indexOf(activeTab);
              const nextIndex = (currentIndex + 1) % tabs.length;
              setActiveTab(tabs[nextIndex]);
            }}
          >
            <Text style={styles.buttonText}>Cycle Through Tabs</Text>
          </Pressable>
        </View>

        {/* Add extra padding at bottom for the nav bar */}
        <View style={{ height: 100 }} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 140, // Space for top bar
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  demoSection: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#f5f2e8",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 24,
  },
  card: {
    backgroundColor: "rgba(30, 30, 30, 0.8)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(245, 242, 232, 0.1)",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f5f2e8",
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    lineHeight: 20,
  },
  featuresSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f5f2e8",
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(30, 30, 30, 0.6)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(245, 242, 232, 0.08)",
  },
  featureIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
    lineHeight: 18,
  },
  controlsSection: {
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#f5f2e8",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e9e3d4",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1c1c1c",
  },
});
