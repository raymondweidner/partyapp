// NOTE: Please rename this file to edit-member.tsx
import * as AuthSession from 'expo-auth-session';

import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  FlatList,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Member } from "../lib/data/Member";
import { MemberAlertPreference } from "../lib/data/MemberAlertPreference";
import { createMemberAlertPreference, deleteUserDevice, getMeetups, getMemberAlertPreferences, getMembers, getProposals, updateMeetup, updateMember, updateMemberAlertPreference, updateProposal } from "../lib/data/service";

const ALL_ALERT_TYPES = [
  'meetup_state_changed', 'proposal_selected', 'chat_invite', 'tribe_invite',
  'meetup_created', 'proposal_created', 'tribe_member_added', 'app_invite_accepted',
  'availability_updated', 'contact_request_received', 'contact_request_accepted', 'meetup_cancelled', 'poll_created',
  'poll_voting_open', 'poll_completed', 'poll_no_entries', 'poll_no_votes', 'registry_item_updated',
  'tribal_council_added', 'tribal_council_removed', 'squad_added', 'squad_removed'
];

WebBrowser.maybeCompleteAuthSession();

import { parsePhoneNumber } from "libphonenumber-js";
import { useAuth } from "../lib/auth";
import { DropdownSelect } from "../lib/components/DropdownSelect";
import PhoneInput from "../lib/components/PhoneInput";
import { FloralDivider } from "../lib/components/FloralDivider";
import { updatePassword } from "firebase/auth";
import { auth } from "../lib/firebaseConfig";
import { colors, globalStyles } from "../lib/theme";
import { safeBack, showAlert } from "../lib/util";
import { CustomHeaderLeft } from "../lib/components/CustomHeaderLeft";
import { useCurrentMember, useUserDevice } from "../lib/RootContext";

export default function ReadMember() {
  const router = useRouter();
  const { id: paramMemberId, profile } = useLocalSearchParams<{
    id?: string;
    profile?: string;
  }>();
  const { user, loading: authLoading } = useAuth();
  const { refreshMember } = useCurrentMember();
  const { userDevice } = useUserDevice();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const isProfile = true;

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [mapType, setMapType] = useState("google");
  const [profilePicData, setProfilePicData] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const [alertPreferences, setAlertPreferences] = useState<MemberAlertPreference[]>([]);
  const [originalAlertPreferences, setOriginalAlertPreferences] = useState<MemberAlertPreference[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  const [activeTab, setActiveTab] = useState<"profile" | "apps" | "notifications">("profile");

  // Change Password state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPasswordLoader, setChangingPasswordLoader] = useState(false);

  const discovery = AuthSession.useAutoDiscovery('https://accounts.google.com');
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_GOOGLE_AUTH_CLIENT_ID || "",
      scopes: ['https://www.googleapis.com/auth/drive.file'],
      redirectUri: AuthSession.makeRedirectUri(),
      extraParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
    discovery
  );

  useEffect(() => {
    if (response?.type === 'success' && request?.codeVerifier && discovery) {
      const { code } = response.params;
      AuthSession.exchangeCodeAsync(
        {
          clientId: process.env.EXPO_PUBLIC_GOOGLE_AUTH_CLIENT_ID || "",
          clientSecret: process.env.EXPO_PUBLIC_GOOGLE_AUTH_CLIENT_SECRET || "",
          code,
          redirectUri: AuthSession.makeRedirectUri(),
          extraParams: {
            code_verifier: request.codeVerifier,
          },
        },
        discovery
      ).then(async (tokenResult) => {
        const refreshToken = tokenResult.refreshToken;
        if (refreshToken && selectedMember && selectedMember.id && user) {
          try {
            const token = await user.getIdToken();
            const updatedMember = { ...selectedMember, id: selectedMember.id, google_refresh_token: refreshToken };
            const returnedMember = await updateMember(token, updatedMember);
            setSelectedMember(returnedMember);



            showAlert("Success", "Google Drive connected successfully!");
            fetchMembers();
          } catch (e: any) {
            showAlert("Error", "Failed to save Google Drive token: " + e.message);
          }
        } else if (!refreshToken) {
          showAlert("Error", "Did not receive a refresh token from Google.");
        }
      }).catch(err => {
        showAlert("Error", "Failed to exchange auth code: " + err.message);
      });
    }
  }, [response, request, discovery]);

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

  const handleSignOut = async () => {
    try {
      const deviceId = userDevice?.id;
      if (user && deviceId) {
        const token = await user.getIdToken();
        await deleteUserDevice(token, deviceId);
      }
      await auth.signOut();
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleSelectMember = (member: Member) => {
    setSelectedMember(member);
    setName(member.name || "");
    setEmail(member.email || "");
    setPhone((member as any).phone || "");
    setMapType(member.map_type || "google");
    setProfilePicData(member.profile_pic_data || null);

    if (member.id && user && isProfile) {
      setLoadingAlerts(true);
      user.getIdToken().then(token => {
        getMemberAlertPreferences(token, member.id!).then(prefs => {
          const sorted = prefs.sort((a, b) => a.alert_type.localeCompare(b.alert_type));
          setAlertPreferences(sorted);
          setOriginalAlertPreferences(JSON.parse(JSON.stringify(sorted)));
          setLoadingAlerts(false);
        }).catch(err => {
          console.error("Failed to fetch alert preferences", err);
          setLoadingAlerts(false);
        });
      });
    }
  };

  const handleToggleAlert = (pref: MemberAlertPreference, type: 'email' | 'push', value: boolean) => {
    if (!selectedMember?.id) return;
    const updatedPref = { ...pref, member_id: selectedMember.id };
    if (type === 'email') updatedPref.email_enabled = value;
    if (type === 'push') updatedPref.push_enabled = value;

    setAlertPreferences(prev => {
      if (prev.some(p => p.alert_type === pref.alert_type)) {
        return prev.map(p => p.alert_type === pref.alert_type ? updatedPref : p);
      } else {
        return [...prev, updatedPref];
      }
    });
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      try {
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 300, height: 300 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        setProfilePicData(`data:image/jpeg;base64,${manipResult.base64}`);
      } catch (error) {
        console.error("Error manipulating image:", error);
        showAlert("Error", "Failed to process image.");
      }
    }
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleDisconnectDrive = () => {
    const disconnect = async () => {
      if (!selectedMember || !selectedMember.id || !user) return;
      try {
        const token = await user.getIdToken();
        const updatedMember = { ...selectedMember, id: selectedMember.id, google_refresh_token: null as any, root_folder_id: null as any };
        await updateMember(token, updatedMember);
        setSelectedMember(updatedMember);



        showAlert("Success", "Google Drive disconnected!");
        fetchMembers();
      } catch (e: any) {
        showAlert("Error", "Failed to disconnect: " + e.message);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to disconnect your Google Drive Photo Album?")) {
        disconnect();
      }
    } else {
      Alert.alert(
        "Disconnect Google Drive",
        "Are you sure you want to disconnect your Google Drive Photo Album?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Disconnect", style: "destructive", onPress: disconnect }
        ]
      );
    }
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
      await updateMember(token, { ...selectedMember, name, email, phone, map_type: mapType, profile_pic_data: profilePicData });

      const hasNotificationChanges = JSON.stringify(alertPreferences) !== JSON.stringify(originalAlertPreferences);
      if (isProfile && hasNotificationChanges) {
        for (const pref of alertPreferences) {
          const orig = originalAlertPreferences.find(p => p.alert_type === pref.alert_type);
          if (JSON.stringify(pref) !== JSON.stringify(orig)) {
            if (pref.id) {
              await updateMemberAlertPreference(token, pref);
            } else {
              const { id, ...prefWithoutId } = pref;
              await createMemberAlertPreference(token, prefWithoutId);
            }
          }
        }
        setOriginalAlertPreferences(JSON.parse(JSON.stringify(alertPreferences)));
      }

      showAlert("Success", "Profile updated successfully!", [
        {
          text: "OK",
          onPress: () => {
            if (isProfile) {
              refreshMember();
              router.replace("/");
            } else if (paramMemberId) {
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

  const toggleChangePassword = () => {
    if (!isChangingPassword) {
      if (Platform.OS === 'web') {
        const confirmed = window.confirm("You will be logged off after making this change. Are you sure you want to proceed?");
        if (confirmed) {
          setIsChangingPassword(true);
        }
      } else {
        Alert.alert(
          "Confirm Password Change",
          "You will be logged off after making this change. Are you sure you want to proceed?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Continue", style: "default", onPress: () => setIsChangingPassword(true) }
          ]
        );
      }
    } else {
      setIsChangingPassword(false);
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      showAlert("Error", "Passwords do not match or are empty.");
      return;
    }
    if (newPassword.length < 6) {
      showAlert("Error", "Password must be at least 6 characters.");
      return;
    }
    
    if (!auth.currentUser) return;
    setChangingPasswordLoader(true);
    try {
      if (Platform.OS === 'web') {
        await updatePassword(auth.currentUser as any, newPassword);
      } else {
        await auth.currentUser.updatePassword(newPassword);
      }
      showAlert("Success", "Password updated successfully! You will now be logged out.", [
        { text: "OK", onPress: () => handleSignOut() }
      ]);
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        if (Platform.OS === 'web') {
          alert("Session Expired: For security reasons, please log in again to change your password.");
          handleSignOut();
        } else {
          Alert.alert("Session Expired", "For security reasons, please log in again to change your password.", [
            { text: "OK", onPress: () => handleSignOut() }
          ]);
        }
      } else {
        showAlert("Error", error.message || "Failed to update password.");
      }
    } finally {
      setChangingPasswordLoader(false);
    }
  };

  const renderMemberItem = ({ item }: { item: Member }) => {
    const cleanEmail = item.email ? String(item.email).trim() : "";
    let cleanPhone = (item as any).phone
      ? String((item as any).phone).trim()
      : "";

    if (cleanPhone) {
      try {
        const pn = parsePhoneNumber(cleanPhone);
        if (pn) cleanPhone = pn.formatNational();
      } catch (e) {
        // Leave as is if unparseable
      }
    }
    const hasEmail =
      cleanEmail.length > 0 &&
      cleanEmail !== "undefined" &&
      cleanEmail !== "null";
    const hasPhone =
      cleanPhone.length > 0 &&
      cleanPhone !== "undefined" &&
      cleanPhone !== "null";
    const isPending = item.status === "Invited";
    const statusText = isPending ? "Pending App Join" : "Active";
    const infoText = [
      hasEmail ? `Email: ${cleanEmail}` : null,
      hasPhone ? `Phone: ${cleanPhone}` : null,
      `Status: ${statusText}`,
    ]
      .filter(Boolean)
      .join("\n");
    return (
      <View
        style={styles.item}
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
              <View>
                <Text style={styles.itemTitle}> ✉️</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (selectedMember) {
    const hasProfileChanges =
      name !== (selectedMember.name || "") ||
      email !== (selectedMember.email || "") ||
      phone !== ((selectedMember as any).phone || "") ||
      profilePicData !== (selectedMember.profile_pic_data || null);

    const hasAppsChanges =
      mapType !== (selectedMember.map_type || "google");

    const hasNotificationChanges = JSON.stringify(alertPreferences) !== JSON.stringify(originalAlertPreferences);

    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: isProfile ? "My Profile" : "Member Details",
            headerLeft: () => <CustomHeaderLeft onBack={handleBack} />,
          }}
        />

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={styles.formCard}>
            {activeTab === "profile" && (
              <>
                <View style={globalStyles.sectionHeader}>
                  <Text style={styles.sectionTitle}>👤 Profile Details</Text>
                </View>
                
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
                <PhoneInput
                  value={phone}
                  onChangeText={setPhone}
                  defaultCountry="US"
                />

                {isProfile && (
                  <View style={{ marginBottom: 20, marginTop: 20 }}>
                    <TouchableOpacity onPress={toggleChangePassword}>
                      <Text style={{ color: colors.primary, fontWeight: 'bold' }}>
                        {isChangingPassword ? "Cancel password change" : "Change Password"}
                      </Text>
                    </TouchableOpacity>

                    {isChangingPassword && (
                      <View style={{ marginTop: 15, padding: 15, backgroundColor: colors.glassBackground, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
                        <Text style={[styles.label, { marginTop: 0 }]}>New Password</Text>
                        <TextInput
                          style={[styles.input, { paddingVertical: 10, fontSize: 14 }]}
                          value={newPassword}
                          onChangeText={setNewPassword}
                          secureTextEntry
                          placeholder="New Password"
                          placeholderTextColor={colors.textMuted}
                        />
                        <Text style={[styles.label, { marginTop: 10 }]}>Confirm New Password</Text>
                        <TextInput
                          style={[styles.input, { paddingVertical: 10, fontSize: 14 }]}
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          secureTextEntry
                          placeholder="Confirm New Password"
                          placeholderTextColor={colors.textMuted}
                        />
                        
                        <TouchableOpacity
                          style={[styles.primaryButton, { marginTop: 10 }, (!newPassword || newPassword !== confirmPassword) && { opacity: 0.5 }]}
                          onPress={handleChangePassword}
                          disabled={changingPasswordLoader || !newPassword || newPassword !== confirmPassword}
                        >
                          {changingPasswordLoader ? (
                            <ActivityIndicator color="#fff" />
                          ) : (
                            <Text style={styles.primaryButtonText}>Submit Password Change</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.buttonContainer}>
                  {updating ? (
                    <ActivityIndicator size="large" color="#007bff" />
                  ) : (
                    <TouchableOpacity
                      style={[styles.primaryButton, !hasProfileChanges && { opacity: 0.5 }]}
                      onPress={handleUpdate}
                      disabled={!hasProfileChanges}
                    >
                      <Text style={styles.primaryButtonText}>Update Profile</Text>
                    </TouchableOpacity>
                  )}
                  {isProfile && (
                    <TouchableOpacity
                      style={[styles.secondaryButton, { marginTop: 12, width: '100%', backgroundColor: colors.primary, borderColor: colors.primary }]}
                      onPress={handleSignOut}
                    >
                      <Text style={[styles.secondaryButtonText, { color: colors.background }]}>Sign Out</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}

            {activeTab === "apps" && (
              <>
                <View style={globalStyles.sectionHeader}>
                  <Text style={styles.sectionTitle}>📱 Integrations</Text>
                </View>
                
                <Text style={styles.label}>Preferred Map App</Text>
                <View style={{ marginBottom: 20, zIndex: 10 }}>
                  <DropdownSelect
                    options={[
                      { label: "Google Maps", value: "google" },
                      { label: "Apple Maps", value: "apple" }
                    ]}
                    value={mapType}
                    onSelect={setMapType}
                  />
                </View>

                {isProfile && (
                  <View style={{ marginBottom: 20 }}>
                    <Text style={[styles.label, { marginBottom: 15 }]}>Google Drive Integration</Text>
                    {!selectedMember.google_refresh_token ? (
                      <TouchableOpacity onPress={() => promptAsync()} disabled={!request}>
                        <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Setup Google Drive Photo Album</Text>
                      </TouchableOpacity>
                    ) : (
                      <View>
                        <TouchableOpacity
                          onPress={() => {
                            const url = selectedMember.root_folder_id
                              ? `https://drive.google.com/drive/folders/${selectedMember.root_folder_id}`
                              : 'https://drive.google.com/';
                            Linking.openURL(url);
                          }}
                          style={{ marginBottom: 15 }}
                        >
                          <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Go To Google Drive Photo Album</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleDisconnectDrive}>
                          <Text style={{ color: '#d9534f', fontWeight: 'bold' }}>Disconnect Google Drive Photo Album</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.buttonContainer}>
                  {updating ? (
                    <ActivityIndicator size="large" color="#007bff" />
                  ) : (
                    <TouchableOpacity
                      style={[styles.primaryButton, !hasAppsChanges && { opacity: 0.5 }]}
                      onPress={handleUpdate}
                      disabled={!hasAppsChanges}
                    >
                      <Text style={styles.primaryButtonText}>Update Profile</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}

            {activeTab === "notifications" && isProfile && (
              <>
                <View style={globalStyles.sectionHeader}>
                  <Text style={styles.sectionTitle}>🔔 Alert Preferences</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 10 }}>
                  <Text style={{ fontWeight: 'bold', width: '40%' }}>Type</Text>
                  <Text style={{ fontWeight: 'bold', width: '30%', textAlign: 'center' }}>Email</Text>
                  <Text style={{ fontWeight: 'bold', width: '30%', textAlign: 'center' }}>Push</Text>
                </View>
                {loadingAlerts ? (
                  <ActivityIndicator size="large" />
                ) : (
                  ALL_ALERT_TYPES.map(type => {
                    const pref = alertPreferences.find(p => p.alert_type === type) || {
                      id: "",
                      alert_type: type,
                      email_enabled: false,
                      push_enabled: false,
                      member_id: selectedMember.id!
                    };
                    return (
                      <View key={type} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.glassBorder }}>
                        <Text style={{ width: '40%', fontSize: 13 }}>
                          {type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </Text>
                        <View style={{ width: '30%', alignItems: 'center' }}>
                          <Switch
                            value={pref.email_enabled}
                            onValueChange={(val) => handleToggleAlert(pref, 'email', val)}
                          />
                        </View>
                        <View style={{ width: '30%', alignItems: 'center' }}>
                          <Switch
                            value={pref.push_enabled}
                            onValueChange={(val) => handleToggleAlert(pref, 'push', val)}
                          />
                        </View>
                      </View>
                    );
                  })
                )}

                <View style={styles.buttonContainer}>
                  {updating ? (
                    <ActivityIndicator size="large" color="#007bff" />
                  ) : (
                    <TouchableOpacity
                      style={[styles.primaryButton, !hasNotificationChanges && { opacity: 0.5 }]}
                      onPress={handleUpdate}
                      disabled={!hasNotificationChanges}
                    >
                      <Text style={styles.primaryButtonText}>Update Profile</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </ScrollView>

        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.bottomNavItem}
            onPress={() => setActiveTab("profile")}
          >
            <Text style={styles.bottomNavIcon}>👤</Text>
            <Text style={[styles.bottomNavText, activeTab === "profile" && styles.bottomNavTextActive]}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomNavItem}
            onPress={() => setActiveTab("apps")}
          >
            <Text style={styles.bottomNavIcon}>📱</Text>
            <Text style={[styles.bottomNavText, activeTab === "apps" && styles.bottomNavTextActive]}>Apps</Text>
          </TouchableOpacity>

          {isProfile && (
            <TouchableOpacity
              style={styles.bottomNavItem}
              onPress={() => setActiveTab("notifications")}
            >
              <Text style={styles.bottomNavIcon}>🔔</Text>
              <Text style={[styles.bottomNavText, activeTab === "notifications" && styles.bottomNavTextActive]}>Alerts</Text>
            </TouchableOpacity>
          )}
        </View>
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
    backgroundColor: colors.glassCardBackground,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  item: { padding: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemTitle: { fontFamily: "BricolageGrotesque_500Medium", fontSize: 15, color: colors.text },
  itemSubtitle: { fontSize: 14, color: colors.textSecondary },
  label: globalStyles.label,
  input: globalStyles.input,
  buttonContainer: { marginTop: 8 },
  primaryButton: globalStyles.primaryButton,
  primaryButtonText: globalStyles.primaryButtonText,
  secondaryButton: globalStyles.secondaryButton,
  secondaryButtonText: globalStyles.secondaryButtonText,
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
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
  },
  bottomNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 65,
  },
  bottomNavIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  bottomNavText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#aaa',
  },
  bottomNavTextActive: {
    color: colors.accent || '#ff6b6b',
  },
  sectionTitle: { fontSize: 24, fontFamily: "PaytoneOne_400Regular", color: colors.text, textAlign: "left" },
});
