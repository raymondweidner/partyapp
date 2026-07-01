// NOTE: Please rename this file to edit-member.tsx
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    DeviceEventEmitter,
    Image,
    Switch,
    ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Member } from "../lib/data/Member";
import { MemberAlertPreference } from "../lib/data/MemberAlertPreference";
import { getMembers, updateMember, getMemberAlertPreferences, updateMemberAlertPreference } from "../lib/data/service";

import { useAuth } from "../lib/auth";
import { showAlert, safeBack } from "../lib/util";
import { colors, globalStyles } from "../lib/theme";
import { DropdownSelect } from "../lib/components/DropdownSelect";
import { CustomHeaderLeft, useInfoModal } from "./_layout";

export default function EditMember() {
  const router = useRouter();
  const { id: paramMemberId, profile } = useLocalSearchParams<{
    id?: string;
    profile?: string;
  }>();
  const { user, loading: authLoading } = useAuth();
  const { showInfoModal } = useInfoModal();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const isProfile = profile === "true";

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profilePicData, setProfilePicData] = useState<string | null>(null);
  const [mapType, setMapType] = useState<string>("google");
  const [updating, setUpdating] = useState(false);

  const [alertPreferences, setAlertPreferences] = useState<MemberAlertPreference[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const data = await getMembers(token);
      setMembers(data);

      if (paramMemberId) {
        const found = data.find((f) => f.id === paramMemberId);
        if (found) handleSelectMember(found);
      }
    } catch (error: any) {
      showAlert("Error", error.message);
    } finally {
      setLoading(false);
    }
  }, [user, paramMemberId]);

  useFocusEffect(
    useCallback(() => {
      fetchMembers();
    }, [fetchMembers])
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("refreshView", () => {
      fetchMembers();
    });
    return () => sub.remove();
  }, [fetchMembers]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
  }, [user, authLoading, router]);

  const handleBack = () => {
    if (paramMemberId) {
      safeBack(router, "/");
    } else {
      setSelectedMember(null);
    }
  };

  const handleSelectMember = (member: Member) => {
    setSelectedMember(member);
    setName(member.name || "");
    setEmail(member.email || "");
    setPhone((member as any).phone || "");
    setProfilePicData(member.profile_pic_data || null);
    setMapType(member.map_type || "google");

    if (member.id && user && isProfile) {
      setLoadingAlerts(true);
      user.getIdToken().then(token => {
        getMemberAlertPreferences(member.id!, token).then(prefs => {
          setAlertPreferences(prefs.sort((a, b) => a.alert_type.localeCompare(b.alert_type)));
          setLoadingAlerts(false);
        }).catch(err => {
          console.error("Failed to fetch alert preferences", err);
          setLoadingAlerts(false);
        });
      });
    }
  };

  const handleToggleAlert = async (pref: MemberAlertPreference, type: 'email' | 'push', value: boolean) => {
    if (!user) return;
    const updatedPref = { ...pref };
    if (type === 'email') updatedPref.email_enabled = value;
    if (type === 'push') updatedPref.push_enabled = value;
    
    // Optimistic update
    setAlertPreferences(prev => prev.map(p => p.id === pref.id ? updatedPref : p));
    
    try {
      const token = await user.getIdToken();
      await updateMemberAlertPreference(updatedPref, token);
    } catch (e: any) {
      showAlert("Error", "Failed to update alert preference: " + e.message);
      // Revert optimistic update
      setAlertPreferences(prev => prev.map(p => p.id === pref.id ? pref : p));
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const manipResult = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 400, height: 400 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      if (manipResult.base64) {
        setProfilePicData(`data:image/jpeg;base64,${manipResult.base64}`);
      }
    }
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleUpdate = async () => {
    if (!selectedMember || !user) return;

    if (!name || !email || !phone) {
      showAlert(
        "Validation Error",
        "Name, email, and phone number are required.",
      );
      return;
    }

    if (!validateEmail(email)) {
      showAlert("Validation Error", "Please enter a valid email address.");
      return;
    }

    setUpdating(true);
    try {
      const token = await user.getIdToken();
      // @ts-ignore
      await updateMember({ ...selectedMember, name, email, phone, profile_pic_data: profilePicData, map_type: mapType }, token);

      showAlert("Success", "Member updated successfully!", [
        {
          text: "OK",
          onPress: () => {
            if (paramMemberId) {
              safeBack(router, "/");
            } else {
              setSelectedMember(null);
              fetchMembers();
            }
          },
        },
      ]);
    } catch (error: any) {
      showAlert(
        "Error",
        error.message || "An error occurred while updating the member.",
      );
    } finally {
      setUpdating(false);
    }
  };

  const renderMemberItem = ({ item }: { item: Member }) => {
    const cleanEmail = item.email ? String(item.email).trim() : "";
    const cleanPhone = (item as any).phone
      ? String((item as any).phone).trim()
      : "";
    const hasEmail =
      cleanEmail.length > 0 &&
      cleanEmail !== "undefined" &&
      cleanEmail !== "null";
    const hasPhone =
      cleanPhone.length > 0 &&
      cleanPhone !== "undefined" &&
      cleanPhone !== "null";
    const isPending = item.status === "invited";
    const statusText = isPending ? "Pending App Join" : "Active";
    const infoText = [
      hasEmail ? `Email: ${cleanEmail}` : null,
      hasPhone ? `Phone: ${cleanPhone}` : null,
      `Status: ${statusText}`,
    ]
      .filter(Boolean)
      .join("\n");
    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => {
          showInfoModal(item.name || "Member", infoText, {
            phone: cleanPhone,
            email: cleanEmail,
            memberId: item.id,
          });
        }}
        {...(Platform.OS === "web" ? ({ title: infoText } as any) : {})}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.name || "Unnamed Member"}
            </Text>
            {isPending && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  showInfoModal("Status", "Pending App Join");
                }}
              >
                <Text style={styles.itemTitle}> ✉️</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (selectedMember) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: isProfile ? "Update Profile" : "Edit Member Details",
            headerLeft: () => <CustomHeaderLeft onBack={handleBack} />,
          }}
        />

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={styles.formCard}>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <TouchableOpacity onPress={pickImage} style={styles.profilePicContainer}>
              {profilePicData ? (
                <Image source={{ uri: profilePicData }} style={styles.profilePic} />
              ) : (
                <View style={styles.profilePicPlaceholder}>
                  <Text style={styles.profilePicPlaceholderText}>Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Member Name"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, isProfile && styles.readOnlyInput]}
            value={email}
            onChangeText={setEmail}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={colors.textMuted}
            editable={!isProfile}
          />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone Number"
            keyboardType="phone-pad"
            placeholderTextColor={colors.textMuted}
          />

          {isProfile && (
            <>
              <Text style={styles.label}>Preferred Map App</Text>
              <View style={{ zIndex: 3000, marginBottom: 15 }}>
                <DropdownSelect
                  options={[
                    { label: "Google Maps", value: "google" },
                    { label: "Apple Maps", value: "apple" }
                  ]}
                  value={mapType}
                  onSelect={setMapType}
                  placeholder="Select Map App"
                />
              </View>
            </>
          )}

          <View style={styles.buttonContainer}>
            {updating ? (
              <ActivityIndicator size="large" color="#007bff" />
            ) : (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleUpdate}
              >
                <Text style={styles.primaryButtonText}>Update Member</Text>
              </TouchableOpacity>
            )}
            </View>
          </View>
          
          {isProfile && (
            <View style={[styles.formCard, { marginTop: 20 }]}>
              <Text style={[styles.label, { fontSize: 18, marginBottom: 15 }]}>Alert Preferences</Text>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 10 }}>
                <Text style={{ flex: 2, fontWeight: 'bold', color: colors.text }}>Scenario</Text>
                <Text style={{ flex: 1, textAlign: 'center', fontWeight: 'bold', color: colors.text }}>Email</Text>
                <Text style={{ flex: 1, textAlign: 'center', fontWeight: 'bold', color: colors.text }}>Push</Text>
              </View>

              {loadingAlerts ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : alertPreferences.length === 0 ? (
                <Text style={{ color: colors.textMuted, fontStyle: 'italic' }}>No alert preferences found.</Text>
              ) : (
                alertPreferences.map(pref => (
                  <View key={pref.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Text style={{ flex: 2, fontSize: 14, color: colors.text }}>
                      {pref.alert_type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </Text>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Switch 
                        value={pref.email_enabled} 
                        onValueChange={(val) => handleToggleAlert(pref, 'email', val)} 
                        trackColor={{ false: "#767577", true: colors.primary }}
                        thumbColor={pref.email_enabled ? colors.accent : "#f4f3f4"}
                      />
                    </View>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Switch 
                        value={pref.push_enabled} 
                        onValueChange={(val) => handleToggleAlert(pref, 'push', val)} 
                        trackColor={{ false: "#767577", true: colors.primary }}
                        thumbColor={pref.push_enabled ? colors.accent : "#f4f3f4"}
                      />
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Select Member to Edit",
          headerLeft: () => (
            <CustomHeaderLeft onBack={() => router.navigate("/")} />
          ),
        }}
      />
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          style={{ maxHeight: 212, flexGrow: 0 }}
          data={members}
          keyExtractor={(item: any) => item.id || Math.random().toString()}
          renderItem={renderMemberItem}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No members found.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...globalStyles.container, padding: 20 },
  formCard: {
    backgroundColor: colors.glassBackground,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  item: { padding: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemTitle: { fontSize: 16, fontWeight: "bold", color: colors.text },
  itemSubtitle: { fontSize: 14, color: colors.textSecondary },
  label: globalStyles.label,
  input: globalStyles.input,
  buttonContainer: { marginTop: 8 },
  primaryButton: globalStyles.primaryButton,
  primaryButtonText: globalStyles.primaryButtonText,
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: colors.textMuted,
  },
  readOnlyInput: globalStyles.readOnlyInput,
  profilePicContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: colors.glassBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  profilePic: {
    width: '100%',
    height: '100%',
  },
  profilePicPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicPlaceholderText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
});
