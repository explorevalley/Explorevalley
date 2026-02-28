import React, { useState } from "react";
import { Modal, View, Text, TextInput, Pressable, Switch, useWindowDimensions, ScrollView } from "react-native";
import { filterModalColors, filterModalDynamicStyles as ds, filterModalStyles as styles } from "../styles/FilterModal.styles";
import { filterModalData as t } from "../staticData/filterModal.staticData";

export default function FilterModal({ visible, onClose, onApply, initial }: any) {
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 768;

  const [minPrice, setMinPrice] = useState(String(initial?.minPrice ?? ""));
  const [maxPrice, setMaxPrice] = useState(String(initial?.maxPrice ?? ""));
  const [type, setType] = useState(initial?.type ?? "all");
  const [vegOnly, setVegOnly] = useState(!!initial?.vegOnly);

  function apply() {
    const payload: any = { type, vegOnly };
    if (minPrice) payload.minPrice = Number(minPrice);
    if (maxPrice) payload.maxPrice = Number(maxPrice);
    onApply(payload);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView style={styles.screen}>
        <View style={[styles.body, ds.body(isMobile)]}>
          <View style={styles.header}>
            <Text style={[styles.title, ds.text(isMobile, "title")]}>{t.title}</Text>
            <Pressable onPress={onClose}>
              <Text style={[styles.title, ds.text(isMobile, "title")]}>{t.close}</Text>
            </Pressable>
          </View>

          <View style={[styles.section, ds.section(isMobile)]}>
            <Text style={[styles.label, ds.text(isMobile, "label")]}>{t.typeLabel}</Text>
            <View style={[styles.typeRow, ds.rowDirection(isMobile)]}>
              <Pressable
                onPress={() => setType("all")}
                style={[styles.typeBtn, ds.typeBtn(isMobile, type === "all")]}
              >
                <Text style={[styles.typeBtnText, ds.typeBtnText(isMobile, type === "all")]}>{t.typeAll}</Text>
              </Pressable>
              <Pressable
                onPress={() => setType("tour")}
                style={[styles.typeBtn, ds.typeBtn(isMobile, type === "tour")]}
              >
                <Text style={[styles.typeBtnText, ds.typeBtnText(isMobile, type === "tour")]}>{t.typeTours}</Text>
              </Pressable>
              <Pressable
                onPress={() => setType("hotel")}
                style={[styles.typeBtn, ds.typeBtn(isMobile, type === "hotel")]}
              >
                <Text style={[styles.typeBtnText, ds.typeBtnText(isMobile, type === "hotel")]}>{t.typeHotels}</Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.section, ds.section(isMobile)]}>
            <Text style={[styles.label, ds.text(isMobile, "label")]}>
              {t.priceLabel}
            </Text>
            <View style={[styles.inputRow, ds.rowDirection(isMobile)]}>
              <TextInput
                value={minPrice}
                onChangeText={setMinPrice}
                keyboardType="numeric"
                placeholder={t.minPlaceholder}
                placeholderTextColor={filterModalColors.placeholder}
                style={[styles.input, ds.input(isMobile)]}
              />
              <TextInput
                value={maxPrice}
                onChangeText={setMaxPrice}
                keyboardType="numeric"
                placeholder={t.maxPlaceholder}
                placeholderTextColor={filterModalColors.placeholder}
                style={[styles.input, ds.input(isMobile)]}
              />
            </View>
          </View>

          <View style={[styles.switchRow, ds.switchRow(isMobile)]}>
            <Text style={[styles.label, styles.labelNoMargin, ds.text(isMobile, "label")]}>{t.vegOnly}</Text>
            <Switch value={vegOnly} onValueChange={setVegOnly} />
          </View>

          <View style={[styles.actionsRow, ds.actionsRow(isMobile)]}>
            <Pressable
              onPress={apply}
              style={[styles.applyBtn, ds.actionBtn(isMobile)]}
            >
              <Text style={[styles.applyBtnText, ds.text(isMobile, "button")]}>{t.apply}</Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              style={[styles.cancelBtn, ds.actionBtn(isMobile)]}
            >
              <Text style={[styles.cancelBtnText, ds.text(isMobile, "button")]}>{t.cancel}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
}
