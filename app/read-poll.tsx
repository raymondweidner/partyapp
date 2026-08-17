import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { useAuth } from "../lib/auth";
import { NumberStepper } from "../lib/components/NumberStepper";
import { AVAILABLE_ICONS } from "../lib/constants";
import { Poll } from "../lib/data/Poll";
import { PollEntry } from "../lib/data/PollEntry";
import { PollVote } from "../lib/data/PollVote";
import {
  createPollVote,
  deletePollEntry,
  deletePollVote,
  getPoll,
  getPollEntries,
  getPollVotes,
  updatePoll,
  updatePollVote,
  uploadMedia,
} from "../lib/service";
import { colors, globalStyles } from "../lib/theme";
import { showAlert } from "../lib/util";
import { CustomHeaderLeft } from "../lib/components/CustomHeaderLeft";
import { useCurrentMember } from "../lib/RootContext";

export default function ReadPoll() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { member } = useCurrentMember();

  const [poll, setPoll] = useState<Poll | null>(null);
  const [entries, setEntries] = useState<PollEntry[]>([]);
  const [votes, setVotes] = useState<PollVote[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [voting, setVoting] = useState(false);

  // Edit fields
  const [title, setTitle] = useState("");
  const [iconType, setIconType] = useState("📊");
  const [details, setDetails] = useState("");
  const [daysToPost, setDaysToPost] = useState("3");
  const [daysToVote, setDaysToVote] = useState("3");

  // Modal fields
  const [selectedEntry, setSelectedEntry] = useState<PollEntry | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Caption modal fields
  const [pendingAsset, setPendingAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [captionModalVisible, setCaptionModalVisible] = useState(false);
  const [entryCaption, setEntryCaption] = useState("");

  useEffect(() => {
    fetchData();
  }, [id, user]);

  const fetchData = async () => {
    if (!id || !user) return;
    try {
      const token = await user.getIdToken();
      const [fetchedPoll, fetchedEntries, fetchedVotes] = await Promise.all([
        getPoll(token, id as string),
        getPollEntries(token, id as string),
        getPollVotes(token, id as string),
      ]);

      setPoll(fetchedPoll);
      setEntries(fetchedEntries);
      setVotes(fetchedVotes);

      setTitle(fetchedPoll.title || "");
      setIconType(fetchedPoll.icon_type || "📊");
      setDetails(fetchedPoll.details || "");

      const now = new Date();
      if (fetchedPoll.entry_deadline) {
        const d = Math.ceil((new Date(fetchedPoll.entry_deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        setDaysToPost(Math.max(1, d).toString());
      }
      if (fetchedPoll.entry_deadline && fetchedPoll.vote_deadline) {
        const d = Math.ceil((new Date(fetchedPoll.vote_deadline).getTime() - new Date(fetchedPoll.entry_deadline).getTime()) / (1000 * 60 * 60 * 24));
        setDaysToVote(Math.max(1, d).toString());
      }

    } catch (error) {
      console.error(error);
      showAlert("Error", "Failed to load poll.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showAlert("Validation Error", "Poll name is required.");
      return;
    }
    if (!user || !poll) return;

    setSaving(true);
    try {
      const token = await user.getIdToken();
      const now = new Date();
      const entryDeadline = new Date(now.getTime() + parseInt(daysToPost, 10) * 24 * 60 * 60 * 1000);
      const voteDeadline = new Date(entryDeadline.getTime() + parseInt(daysToVote, 10) * 24 * 60 * 60 * 1000);

      const updated = await updatePoll(token, {
          ...poll,
          id: poll.id!,
          title: title.trim(),
          details: details.trim(),
          entry_deadline: entryDeadline.toISOString(),
          vote_deadline: voteDeadline.toISOString(),
          icon_type: iconType,
        }
      );
      setPoll(updated);
    } catch (error) {
      console.error(error);
      showAlert("Error", "Failed to update poll.");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadEntry = async () => {
    if (!user || !poll || !member) return;
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        showAlert("Permission Required", "You need to allow access to your photos to upload an entry.");
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!pickerResult.canceled && pickerResult.assets.length > 0) {
        setPendingAsset(pickerResult.assets[0]);
        setEntryCaption("");
        setCaptionModalVisible(true);
      }
    } catch (error) {
      console.error(error);
      showAlert("Upload Error", "Failed to upload the entry.");
    }
  };

  const confirmUpload = async () => {
    if (!pendingAsset || !user || !poll || !member) return;
    setCaptionModalVisible(false);
    setUploading(true);

    try {
      const token = await user.getIdToken();
      const filename = pendingAsset.fileName || pendingAsset.uri.split("/").pop() || "upload.jpg";
      const mimeType = pendingAsset.mimeType || "image/jpeg";

      await uploadMedia(token, pendingAsset.uri, filename, mimeType, poll.meetup_id, poll.id!, entryCaption.trim());

      // Refresh entries
      const fetchedEntries = await getPollEntries(token, poll.id!);
      setEntries(fetchedEntries);
      setPendingAsset(null);
    } catch (error) {
      console.error(error);
      showAlert("Upload Error", "Failed to upload the entry.");
    } finally {
      setUploading(false);
    }
  };

  const currentVote = votes.find((v) => v.voter_id === member?.id);

  const handleVote = async (entry: PollEntry) => {
    if (!user || !member || !poll) return;
    setVoting(true);
    try {
      const token = await user.getIdToken();
      if (currentVote) {
        if (currentVote.poll_entry_id === entry.id) {
          setVoting(false);
          return; // already voted for this
        }
        // Update vote
        const updated = await updatePollVote(token, { ...currentVote, id: currentVote.id!, poll_entry_id: entry.id! }
        );
        setVotes((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
      } else {
        // Create vote
        const newVote = await createPollVote(token, {
            poll_id: poll.id!,
            voter_id: member.id!,
            poll_entry_id: entry.id!,
          }
        );
        setVotes((prev) => [...prev, newVote]);
      }
    } catch (error) {
      console.error(error);
      showAlert("Error", "Failed to cast vote.");
    } finally {
      setVoting(false);
    }
  };

  const handleCancelVote = async () => {
    if (!user || !currentVote) return;
    setVoting(true);
    try {
      const token = await user.getIdToken();
      await deletePollVote(token, currentVote.id!);
      setVotes((prev) => prev.filter((v) => v.id !== currentVote.id));
    } catch (error) {
      console.error(error);
      showAlert("Error", "Failed to cancel vote.");
    } finally {
      setVoting(false);
    }
  };

  if (loading) {
    return (
      <View style={[globalStyles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!poll) return null;

  return (
    <View style={globalStyles.container}>
      <Stack.Screen
        options={{
          headerTitle: "Poll Details",
          headerLeft: () => <CustomHeaderLeft />,
          headerRight: () =>
            poll.creator_id === member?.id ? (
              <TouchableOpacity onPress={() => router.push(`/write-poll?id=${id}`)}>
                <Text style={{ color: colors.primary, fontFamily: "Nunito_700Bold", fontSize: 16 }}>
                  Edit
                </Text>
              </TouchableOpacity>
            ) : null,
        }}
      />

      <ScrollView contentContainerStyle={globalStyles.contentContainer}>
        <View>
            <View style={{ alignItems: "center", marginTop: 24 }}>
              <Text style={{ fontSize: 72, marginBottom: 12 }}>{poll.icon_type || "📊"}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 8, flexWrap: "wrap", gap: 12 }}>
                <Text style={{ fontSize: 32, fontFamily: "BricolageGrotesque_500Medium", color: colors.text, textAlign: "center" }}>{poll.title}</Text>
              </View>
              {poll.details ? (
                <Text style={{ fontSize: 18, fontFamily: "Fraunces_200ExtraLight", color: colors.textSecondary, textAlign: "center", paddingHorizontal: 20, marginBottom: 24 }}>{poll.details}</Text>
              ) : <View style={{ marginBottom: 24 }} />}
            </View>

            <View style={globalStyles.listHeader}>
              <Text style={globalStyles.listTitle}>Entries</Text>
              {poll.status?.toLowerCase() === "posting" && !entries.some((e) => e.creator_id === member?.id) && (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleUploadEntry}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.addButtonText}>+ Add</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {entries.length === 0 ? (
              <Text style={globalStyles.emptyText}>No entries yet!</Text>
            ) : (
              <View style={globalStyles.listContainer}>
                {entries.map((entry) => {
                  const isVoted = currentVote?.poll_entry_id === entry.id;
                  const isMyEntry = entry.creator_id === member?.id;

                  return (
                    <TouchableOpacity
                      key={entry.id}
                      style={[
                        globalStyles.listItem,
                        isVoted && { borderColor: colors.primary, borderWidth: 2 },
                        { padding: 12 }
                      ]}
                      onPress={() => {
                        setSelectedEntry(entry);
                        setModalVisible(true);
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                          <Image
                            source={{ uri: entry.thumbnail || `https://drive.google.com/uc?id=${entry.file_id}` }}
                            style={{ width: 50, height: 50, borderRadius: 8, marginRight: 12 }}
                            resizeMode="cover"
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={globalStyles.itemTitle} numberOfLines={1}>
                              {entry.caption || "No Caption"}
                            </Text>
                          </View>
                        </View>

                        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                          {poll.status?.toLowerCase() === "posting" && isMyEntry && (
                            <>
                              <TouchableOpacity onPress={handleUploadEntry} disabled={uploading}>
                                <Ionicons name="pencil" size={24} color={colors.primary} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={async () => {
                                  if (!user) return;
                                  try {
                                    const token = await user.getIdToken();
                                    await deletePollEntry(token, entry.id!);
                                    setEntries(entries.filter(e => e.id !== entry.id));
                                  } catch (error) {
                                    console.error(error);
                                    showAlert("Error", "Failed to delete entry");
                                  }
                                }}
                                disabled={uploading}
                              >
                                <Ionicons name="trash" size={24} color="rgba(255,0,0,0.8)" />
                              </TouchableOpacity>
                            </>
                          )}

                          {poll.status?.toLowerCase() === "voting" && (
                            isVoted ? (
                              <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 4 }} onPress={handleCancelVote}>
                                <Text style={{ fontSize: 20 }}>✅</Text>
                                <Text style={{ color: colors.danger, fontFamily: "Nunito_600SemiBold", fontSize: 12 }}>Cancel</Text>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity
                                style={{ backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                                onPress={() => handleVote(entry)}
                                disabled={voting}
                              >
                                {voting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={{ color: "#FFF", fontFamily: "Nunito_700Bold", fontSize: 14 }}>Vote</Text>}
                              </TouchableOpacity>
                            )
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
      </ScrollView>

      {/* Media Modal */}
      <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.closeArea} onPress={() => setModalVisible(false)} />
          <View style={styles.modalContent}>
            {selectedEntry && (
              <>
                {selectedEntry.caption && (
                  <Text style={[styles.modalCaptionText, { fontSize: 28, marginBottom: 20, marginTop: 0 }]}>
                    {selectedEntry.caption}
                  </Text>
                )}
                <View style={styles.fullImage}>
                  {Platform.OS === 'web' ? (
                    <iframe
                      src={`https://drive.google.com/file/d/${selectedEntry.file_id}/preview`}
                      style={{ width: "100%", height: "100%", border: "none" }}
                    />
                  ) : (
                    <WebView
                      source={{ uri: `https://drive.google.com/file/d/${selectedEntry.file_id}/view` }}
                      style={{ flex: 1 }}
                      scalesPageToFit={true}
                    />
                  )}
                </View>
              </>
            )}
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Text style={{ color: "#FFF", fontSize: 18, fontFamily: "Nunito_700Bold" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Caption Input Modal */}
      <Modal visible={captionModalVisible} transparent={true} animationType="slide" onRequestClose={() => setCaptionModalVisible(false)}>
        <View style={styles.captionModalOverlay}>
          <View style={styles.captionModalContent}>
            <Text style={styles.captionModalTitle}>Add a Caption (Optional)</Text>
            <TextInput
              style={styles.captionInput}
              placeholder="Type your caption here..."
              placeholderTextColor={colors.textMuted}
              value={entryCaption}
              onChangeText={setEntryCaption}
              maxLength={100}
            />
            <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
              <TouchableOpacity style={styles.captionCancelButton} onPress={() => setCaptionModalVisible(false)}>
                <Text style={{ color: colors.text, fontFamily: "Nunito_600SemiBold", textAlign: "center" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.captionSubmitButton} onPress={confirmUpload}>
                <Text style={{ color: "#FFF", fontFamily: "Nunito_700Bold", textAlign: "center" }}>Upload</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  addButtonText: {
    color: "#F8F9FA",
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: "Nunito_700Bold",
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
    marginTop: -4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  thumbnailContainer: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    borderWidth: 2,
    borderColor: "transparent",
  },
  votedThumbnail: {
    borderColor: colors.accent,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  checkOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeArea: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalContent: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  fullImage: {
    width: "100%",
    height: "70%",
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    padding: 10,
    zIndex: 10,
  },
  votingContainer: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  voteButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: "100%",
    alignItems: "center",
  },
  votedStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: "100%",
    justifyContent: "center",
  },
  cancelVoteButton: {
    marginLeft: 16,
    padding: 8,
    backgroundColor: "rgba(255,0,0,0.6)",
    borderRadius: 8,
  },
  entryCaptionText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    marginTop: 4,
  },
  modalCaptionText: {
    color: "#FFF",
    fontSize: 18,
    fontFamily: "Nunito_600SemiBold",
    marginTop: 16,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  captionModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  captionModalContent: {
    backgroundColor: colors.surface,
    padding: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  captionModalTitle: {
    color: colors.text,
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    marginBottom: 16,
  },
  captionInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    padding: 16,
    color: colors.text,
    fontFamily: "Nunito_400Regular",
    fontSize: 16,
  },
  captionCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.borderLight,
  },
  captionSubmitButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
});
