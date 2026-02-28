import { StyleSheet } from "react-native";

export const navigationDemoStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 140,
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
  bottomSpacer: {
    height: 100,
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
