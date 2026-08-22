import React, { useEffect, useRef } from "react";
import { Animated, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BlurView } from "expo-blur";
import { Member } from "../data/Member";
import { colors, globalStyles } from "../theme";
import { HintBox } from "./HintBox";

export function MemberModal({
  visible,
  onClose,
  member,
  isMe,
  isFam,
  isPendingFam,
  hasIncomingFamRequest = false,
  onSendEmail,
  onSendDM,
  onSendFamRequest,
  onAcceptFamRequest,
  showContactHint = false,
  showEjectButton = false,
  onEject,
}: {
  visible: boolean;
  onClose: () => void;
  member: Member | null;
  isMe: boolean;
  isFam: boolean;
  isPendingFam: boolean;
  hasIncomingFamRequest?: boolean;
  onSendEmail: () => void;
  onSendDM: () => void;
  onSendFamRequest: () => void;
  onAcceptFamRequest?: () => void;
  showContactHint?: boolean;
  showEjectButton?: boolean;
  onEject?: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  const emailRef = useRef<any>(null);
  const dmRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 8,
          tension: 100,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!member) return null;

  const cleanEmail = member.email ? String(member.email).trim() : "";
  const cleanPhone = (member as any).phone ? String((member as any).phone).trim() : "";
  const hasEmail = cleanEmail.length > 0 && cleanEmail !== "undefined" && cleanEmail !== "null";
  const hasPhone = cleanPhone.length > 0 && cleanPhone !== "undefined" && cleanPhone !== "null";

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <BlurView intensity={20} tint="light" style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[styles.modalContent, { transform: [{ scale: scaleAnim }], opacity: opacityAnim, alignItems: "center" }]}>
          <View style={styles.memberCardImageContainer}>
            {member.profile_pic_data ? (
              <Image source={{ uri: member.profile_pic_data }} style={styles.memberCardImage} />
            ) : (
              <Text style={styles.memberCardSilhouette}>👤</Text>
            )}
          </View>
          <Text style={styles.modalTitle}>{member.name || "Unnamed"}</Text>

          <View style={{ width: "100%", marginVertical: 10 }}>
            {hasEmail && (
              <Text style={styles.contactText}>📧 {cleanEmail}</Text>
            )}
            {hasPhone && (
              <Text style={styles.contactText}>📱 {cleanPhone}</Text>
            )}
            {!hasEmail && !hasPhone && (
              <Text style={[styles.contactText, { color: colors.textMuted, fontStyle: "italic" }]}>No contact info available</Text>
            )}
          </View>

          {!isMe && (
            <View style={{ width: "100%", marginTop: 10, gap: 10 }}>
              {hasEmail && (
                <View ref={emailRef} collapsable={false}>
                  <TouchableOpacity style={styles.actionButton} onPress={onSendEmail}>
                    <Text style={styles.actionButtonText}>📧 Send Email</Text>
                  </TouchableOpacity>
                </View>
              )}
              {hasPhone && (
                <View ref={dmRef} collapsable={false}>
                  <TouchableOpacity style={styles.actionButton} onPress={onSendDM}>
                    <Text style={styles.actionButtonText}>💬 Send DM</Text>
                  </TouchableOpacity>
                </View>
              )}
              {!isFam && (
                <>
                  {hasIncomingFamRequest ? (
                    <TouchableOpacity 
                      style={styles.actionButton} 
                      onPress={onAcceptFamRequest}
                    >
                      <Text style={styles.actionButtonText}>✅ Accept Invitation</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      style={[styles.actionButton, isPendingFam && { opacity: 0.5 }]} 
                      onPress={onSendFamRequest}
                      disabled={isPendingFam}
                    >
                      <Text style={styles.actionButtonText}>
                        {isPendingFam ? "⏳ Fam Request Pending" : "🙌 Send Fam Request"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
              {showEjectButton && onEject && (
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: "#FFE5E5" }]} 
                  onPress={onEject}
                >
                  <Text style={[styles.actionButtonText, { color: "#D32F2F" }]}>🚫 Eject from Tribe</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surface, marginTop: 15 }]} onPress={onClose}>
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>Close</Text>
          </TouchableOpacity>
        </Animated.View>
      </BlurView>
      {showContactHint && (
        <View style={{ position: 'absolute', top: 150, left: 0, right: 0, alignItems: 'center', zIndex: 1000 }} pointerEvents="box-none">
          <HintBox
            title="Want to get in touch?"
            width={280}
            hints={[
              ...(hasEmail ? [{ text: "Send them an email here.", targetRef: emailRef }] : []),
              ...(hasPhone ? [{ text: "Whatsapp them here.", targetRef: dmRef }] : []),
            ]}
          />
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: globalStyles.modalOverlay,
  modalContent: {
    ...globalStyles.modalContent,
    padding: 30,
    width: "85%",
    maxWidth: 400,
  },
  modalTitle: {
    ...globalStyles.modalTitle,
    marginBottom: 10,
    textAlign: "center",
  },
  memberCardImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.glassBackground,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 2,
    borderColor: colors.border,
  },
  memberCardImage: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
  },
  memberCardSilhouette: {
    fontSize: 50,
  },
  contactText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 5,
    textAlign: "center",
  },
  actionButton: {
    ...globalStyles.primaryButton,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    paddingVertical: 12,
  },
  actionButtonText: {
    ...globalStyles.primaryButtonText,
    fontSize: 16,
  },
});
