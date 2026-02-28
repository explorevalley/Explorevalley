import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "transparent"
  },
  content: {
    paddingTop: 110,
    paddingHorizontal: 18,
    paddingBottom: 120,
    gap: 14
  },
  contentWeb: {
    maxWidth: 860,
    alignSelf: "center",
    width: "100%"
  },
  headerCard: {
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#ffffff"
  },
  kicker: {
    fontSize: 12,
    letterSpacing: 1.4,
    color: "#111",
    fontWeight: "800"
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#000"
  },
  subTitle: {
    marginTop: 6,
    color: "#333",
    fontSize: 13.5
  },
  formCard: {
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#ffffff",
    gap: 10
  },
  formCardOpen: {
    paddingBottom: 220
  },
  resultsCard: {
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#ffffff",
    gap: 10
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000"
  },
  field: {
    gap: 6
  },
  fieldLabel: {
    color: "#222",
    fontWeight: "700",
    fontSize: 12
  },
  input: {
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff"
  },
  datePickerWrap: {
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 6,
    zIndex: 5
  },
  inputText: {
    color: "#111",
    fontWeight: "600"
  },
  inputDisabled: {
    backgroundColor: "#f5f5f5",
    borderColor: "#ededed"
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 12,
    padding: 8,
    backgroundColor: "#fff",
    gap: 6
  },
  dropdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#f7f7f7"
  },
  dropdownText: {
    color: "#111",
    fontWeight: "600"
  },
  muted: {
    color: "#666",
    fontSize: 12.5
  },
  bookBtn: {
    marginTop: 6,
    backgroundColor: "#000000",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
    alignItems: "center"
  },
  bookBtnDisabled: {
    backgroundColor: "#444444"
  },
  bookBtnText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 12
  },
  submitNote: {
    marginTop: 6,
    color: "#0a7a45",
    fontSize: 12.5
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e6e6e6",
    gap: 10
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000000"
  },
  modalSub: {
    fontSize: 12.5,
    color: "#444444"
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 6
  },
  modalBtn: {
    backgroundColor: "#000000",
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14
  },
  modalBtnText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 12.5
  },
  modalBtnGhost: {
    borderWidth: 1,
    borderColor: "#d1d1d1",
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14
  },
  modalBtnGhostText: {
    color: "#111111",
    fontWeight: "700",
    fontSize: 12.5
  },
  notice: {
    position: "absolute",
    right: 18,
    top: 120,
    backgroundColor: "rgba(0,0,0,0.85)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  noticeText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12.5
  },
  error: {
    color: "#b42318",
    fontSize: 12.5
  },
  routeLabel: {
    color: "#0a7a45",
    fontWeight: "800"
  },
  rateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  rateCard: {
    flexBasis: 160,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#ffffff"
  },
  rateCardSelected: {
    borderColor: "#111",
    backgroundColor: "#f5f5f5"
  },
  rateCardPressed: {
    opacity: 0.95,
  },
  rateAction: {
    marginTop: 7,
    color: "#666",
    fontSize: 11,
    fontWeight: "700"
  },
  rateCardMuted: {
    backgroundColor: "#fafafa"
  },
  rateTitle: {
    fontWeight: "800",
    color: "#111",
    fontSize: 12
  },
  ratePrice: {
    marginTop: 6,
    fontWeight: "800",
    color: "#000"
  },
  ratePriceMuted: {
    marginTop: 6,
    fontWeight: "700",
    color: "#777"
  },
  modalRow: {
    borderTopWidth: 1,
    borderTopColor: "#ececec",
    paddingTop: 8,
    gap: 2
  },
  modalRowLabel: {
    color: "#666",
    fontSize: 11,
    fontWeight: "700"
  },
  modalRowValue: {
    color: "#111",
    fontWeight: "700"
  }
});
