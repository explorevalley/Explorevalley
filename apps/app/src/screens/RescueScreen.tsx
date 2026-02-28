import React from "react";
import { View, Text, ScrollView, Pressable, Linking, useWindowDimensions } from "react-native";
import { rescueDynamicStyles as ds, rescueStyles as styles } from "../styles/RescueScreen.styles";
import { rescueScreenData as t } from "../staticData/rescueScreen.staticData";

type ContactNumber = {
  label: string;
  value: string;
};

type RescueTeam = {
  name: string;
  role: string;
  coverage: string;
  numbers: ContactNumber[];
};

type AmbulanceService = {
  name: string;
  coverage: string;
  numbers: ContactNumber[];
};

const RESCUE_TEAMS: RescueTeam[] = t.rescueTeams;
const AMBULANCE_SERVICES: AmbulanceService[] = t.ambulanceServices;

function canCall(value: string) {
  return Boolean(value && value !== t.placeholder);
}

function callNumber(value: string) {
  if (!canCall(value)) return;
  Linking.openURL(`tel:${value}`);
}

export default function RescueScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <ScrollView
      contentContainerStyle={[styles.content, ds.contentPad(isMobile)]}
    >
      <View style={[styles.hero, ds.heroPad(isMobile)]}>
        <Text style={[styles.heroTitle, ds.heroTitleSize(isMobile)]}>
          {t.hero.title}
        </Text>
        <Text style={[styles.heroBody, ds.heroBodySize(isMobile)]}>
          {t.hero.body}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t.sections.teams}
        </Text>
        {RESCUE_TEAMS.map((team) => (
          <View
            key={team.name}
            style={[styles.card, ds.teamCardBorder]}
          >
            <Text style={styles.cardTitle}>{team.name}</Text>
            <Text style={styles.cardText}>{team.role}</Text>
            <Text style={styles.cardMuted}>{t.labels.coverage} {team.coverage}</Text>
            <View style={styles.mt10}>
              {team.numbers.map((num) => (
                <View key={`${team.name}-${num.label}`} style={styles.rowBetween}>
                  <View>
                    <Text style={styles.labelGreen}>{num.label}</Text>
                    <Text style={styles.value}>{num.value}</Text>
                  </View>
                  <Pressable
                    disabled={!canCall(num.value)}
                    onPress={() => callNumber(num.value)}
                    style={[styles.callBtn, ds.callButton(canCall(num.value), "green")]}
                  >
                    <Text style={[styles.callText, ds.callText(canCall(num.value), "green")]}>
                      {canCall(num.value) ? t.labels.call : t.placeholder}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t.sections.ambulance}
        </Text>
        {AMBULANCE_SERVICES.map((service) => (
          <View
            key={service.name}
            style={[styles.card, ds.ambulanceCardBorder]}
          >
            <Text style={styles.cardTitle}>{service.name}</Text>
            <Text style={styles.cardMuted}>{t.labels.coverage} {service.coverage}</Text>
            <View style={styles.mt10}>
              {service.numbers.map((num) => (
                <View key={`${service.name}-${num.label}`} style={styles.rowBetween}>
                  <View>
                    <Text style={styles.labelBlue}>{num.label}</Text>
                    <Text style={styles.value}>{num.value}</Text>
                  </View>
                  <Pressable
                    disabled={!canCall(num.value)}
                    onPress={() => callNumber(num.value)}
                    style={[styles.callBtn, ds.callButton(canCall(num.value), "blue")]}
                  >
                    <Text style={[styles.callText, ds.callText(canCall(num.value), "blue")]}>
                      {canCall(num.value) ? t.labels.call : t.placeholder}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>{t.sections.tips}</Text>
        <Text style={styles.tipsBody}>
          {t.tips}
        </Text>
      </View>
    </ScrollView>
  );
}
