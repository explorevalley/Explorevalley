import React from "react";
import { View } from "react-native";
import AdminDashboardCard from "../components/admin/AdminDashboardCard";
import AdminHeaderCard from "../components/admin/AdminHeaderCard";
import { BASE_URL, ADMIN_UI_PATH } from "../lib/api";
import { uiText } from "../lib/ui";
import { adminScreenStyles as styles } from "../styles/AdminScreen.styles";
import { adminScreenData as t } from "../staticData/adminScreen.staticData";

export default function AdminScreen() {
  const adminUrl = `${BASE_URL}${ADMIN_UI_PATH}`;

  return (
    <View style={styles.root}>
      <AdminHeaderCard
        title={uiText("admin", "title", t.title)}
        subtitle={uiText("admin", "subtitle", t.subtitle)}
      />
      <AdminDashboardCard adminUrl={adminUrl} openLabel={uiText("admin", "openButton", t.openLabel)} />
    </View>
  );
}
