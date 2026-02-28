import React from "react";
import { View } from "react-native";
import AdminDashboardCard from "../components/admin/AdminDashboardCard";
import AdminHeaderCard from "../components/admin/AdminHeaderCard";
import { BASE_URL, ADMIN_UI_PATH } from "../lib/api";
import { uiText } from "../lib/ui";

export default function AdminScreen() {
  const adminUrl = `${BASE_URL}${ADMIN_UI_PATH}`;

  return (
    <View style={{ flex: 1, justifyContent: "center", backgroundColor: "transparent", padding: 20 }}>
      <AdminHeaderCard
        title={uiText("admin", "title", "Admin Panel")}
        subtitle={uiText("admin", "subtitle", "Opens in a separate window.")}
      />
      <AdminDashboardCard adminUrl={adminUrl} openLabel={uiText("admin", "openButton", "Open Admin URL")} />
    </View>
  );
}
