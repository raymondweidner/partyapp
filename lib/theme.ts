import { StyleSheet } from 'react-native';

export const colors = {
  background: '#121212',
  surface: '#1E1E1E',
  primary: '#00F0FF',
  accent: '#9D4EDD',
  text: '#FFFFFF',
  textSecondary: '#E0E0E0',
  textMuted: '#AAAAAA',
  danger: '#FF4D4D',
  border: 'rgba(255, 255, 255, 0.1)',
  borderLight: 'rgba(255, 255, 255, 0.2)',
  glassBackground: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.15)',
  overlay: 'rgba(0,0,0,0.7)',
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
    fontSize: 36,
    fontWeight: "900",
    marginBottom: 4,
    textAlign: "center",
    color: colors.primary,
    letterSpacing: 1,
    textShadowColor: "rgba(0, 240, 255, 0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 16,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: { 
    fontSize: 22, 
    fontWeight: "800", 
    color: colors.textSecondary 
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 16,
    color: colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.glassBackground,
  },
  readOnlyInput: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    color: colors.textMuted,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
    paddingTop: 16,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 20,
  },
  primaryButtonText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "bold" 
  },
  dangerButton: {
    backgroundColor: colors.danger,
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  dangerButtonText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "bold" 
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: "italic",
    marginTop: 5,
    marginBottom: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: colors.overlay,
  },
  modalContent: {
    margin: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: colors.text,
  },
});
