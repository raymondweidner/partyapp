import { StyleSheet } from 'react-native';

export const colors = {
  background: '#FFFDF0', // Warm white
  surface: '#FFFFFF', // Pure white for cards/modals
  primary: '#60A5FA', // Pastel Blue
  accent: '#34D399', // Darker Pastel Mint Green
  text: '#333333', // Dark gray for readability
  textSecondary: '#666666',
  textMuted: '#999999',
  danger: '#FCA5A5', // Pastel Red
  border: 'rgba(0, 0, 0, 0.08)',
  borderLight: 'rgba(0, 0, 0, 0.04)',
  glassBackground: 'rgba(255, 255, 255, 0.7)',
  glassBorder: 'rgba(0, 0, 0, 0.05)',
  overlay: 'rgba(255,255,255,0.4)', // Translucent blur fallback
};

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    fontFamily: "Nunito_900Black",
    fontSize: 34,
    marginBottom: 8,
    textAlign: "center",
    color: colors.primary,
    letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sectionTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 22, 
    color: colors.text,
  },
  label: {
    fontFamily: "Quicksand_700Bold",
    fontSize: 15,
    marginBottom: 6,
    marginTop: 16,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  valueText: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 16,
    color: colors.text,
    marginBottom: 4,
  },
  input: {
    fontFamily: "Nunito_600SemiBold",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.glassBackground,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  readOnlyLabel: {
    marginTop: 8,
    marginBottom: 2,
    color: "#999999",
    fontSize: 12,
    textTransform: "uppercase",
  },
  readOnlyInput: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    margin: 0,
    minHeight: 0,
    height: "auto",
    color: colors.text,
    shadowOpacity: 0,
    elevation: 0,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
    paddingTop: 16,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 24,
  },
  primaryButtonText: {
    fontFamily: "Nunito_800ExtraBold",
    color: "#F8F9FA", 
    fontSize: 16,
  },
  dangerButton: {
    backgroundColor: colors.danger,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  dangerButtonText: { 
    fontFamily: "Nunito_800ExtraBold",
    color: "#F8F9FA", 
    fontSize: 16,
  },
  emptyText: {
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: "italic",
    marginTop: 5,
    marginBottom: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
  },
  modalContent: {
    margin: 20,
    backgroundColor: colors.glassBackground,
    borderRadius: 20,
    padding: 24,
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 22,
    marginBottom: 16,
    textAlign: "center",
    color: colors.text,
  },
});
