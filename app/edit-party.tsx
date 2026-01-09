import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Button,
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../src/auth';
import { getResourceEndpoint, showAlert } from '../src/util';

type Guest = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

type Party = {
  id: string;
  title: string;
  details: string;
  scheduled_for: string;
  user_id: string;
};

type Invitation = {
  id: string;
  party_id: string;
  guest_id: string;
};

export default function EditParty() {
  const { user } = useAuth();
  
  // Data State
  const [parties, setParties] = useState<Party[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [originalInvitations, setOriginalInvitations] = useState<Invitation[]>([]);

  // Form State
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [scheduledFor, setScheduledFor] = useState(new Date());
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    fetchParties();
    fetchGuests();
  }, [user]);

  const fetchParties = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${getResourceEndpoint()}/party`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setParties(data);
      }
    } catch (error) {
      console.error('Failed to fetch parties', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGuests = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${getResourceEndpoint()}/guest`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setGuests(data);
      }
    } catch (error) {
      console.error('Failed to fetch guests', error);
    }
  };

  const fetchInvitations = async (partyId: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${getResourceEndpoint()}/invite`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const allInvitations: Invitation[] = await response.json();
        const partyInvitations = allInvitations.filter(inv => inv.party_id === partyId);
        setOriginalInvitations(partyInvitations);
        setSelectedGuestIds(partyInvitations.map(inv => inv.guest_id));
      }
    } catch (error) {
      console.error('Failed to fetch invitations', error);
    }
  };

  const handleSelectParty = async (party: Party) => {
    setSelectedParty(party);
    setTitle(party.title);
    setDetails(party.details);
    setScheduledFor(new Date(party.scheduled_for));
    await fetchInvitations(party.id);
  };

  const toggleGuestSelection = (id: string) => {
    if (selectedGuestIds.includes(id)) {
      setSelectedGuestIds(selectedGuestIds.filter(gId => gId !== id));
    } else {
      setSelectedGuestIds([...selectedGuestIds, id]);
    }
  };

  const handleUpdate = async () => {
    if (!selectedParty || !user) return;

    if (!title || !details) {
      showAlert('Validation Error', 'Title and Details are required.');
      return;
    }

    if (scheduledFor <= new Date()) {
      showAlert('Validation Error', 'Scheduled date must be in the future.');
      return;
    }

    setUpdating(true);
    try {
      const token = await user.getIdToken();
      
      // Update Party
      const partyResponse = await fetch(`${getResourceEndpoint()}/party/${selectedParty.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          details,
          scheduled_for: scheduledFor.toISOString(),
          user_id: user?.uid
        }),
      });

      if (!partyResponse.ok) {
        throw new Error('Failed to update party.');
      }

      // Handle Invitations
      const originalGuestIds = originalInvitations.map(inv => inv.guest_id);
      const guestsToAdd = selectedGuestIds.filter(id => !originalGuestIds.includes(id));
      const invitationsToRemove = originalInvitations.filter(inv => !selectedGuestIds.includes(inv.guest_id));

      const promises = [];

      for (const guestId of guestsToAdd) {
        promises.push(
          fetch(`${getResourceEndpoint()}/invite`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              party_id: selectedParty.id,
              guest_id: guestId,
            }),
          })
        );
      }

      for (const inv of invitationsToRemove) {
        promises.push(
          fetch(`${getResourceEndpoint()}/invite`, {
             method: 'DELETE',
             headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${token}`,
             },
             body: JSON.stringify({ id: inv.id })
          })
        );
      }

      await Promise.all(promises);

      showAlert('Success', 'Party updated successfully!', [
        { 
          text: 'OK', 
          onPress: () => {
            setSelectedParty(null);
            fetchParties();
          } 
        }
      ]);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setUpdating(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || scheduledFor;
    if (Platform.OS !== 'web') {
      setShowPicker(Platform.OS === 'ios');
    }
    setScheduledFor(currentDate);
  };

  const renderGuestItem = ({ item }: { item: Guest }) => {
    const isSelected = selectedGuestIds.includes(item.id);
    return (
      <TouchableOpacity 
        style={[styles.guestItem, isSelected && styles.selectedGuestItem]} 
        onPress={() => toggleGuestSelection(item.id)}
      >
        <View>
          <Text style={styles.guestName}>{item.name}</Text>
          <Text style={styles.guestDetail}>{item.email}</Text>
          <Text style={styles.guestDetail}>{item.phone}</Text>
        </View>
        {isSelected && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
    );
  };

  const renderPartyItem = ({ item }: { item: Party }) => (
    <TouchableOpacity style={styles.item} onPress={() => handleSelectParty(item)}>
      <Text style={styles.itemTitle}>{item.title}</Text>
      <Text style={styles.itemSubtitle}>{new Date(item.scheduled_for).toLocaleString()}</Text>
    </TouchableOpacity>
  );

  if (selectedParty) {
  return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Edit Party Details' }} />
        <Button title="Back to List" onPress={() => setSelectedParty(null)} />
        
        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Party Title" placeholderTextColor="#a0a0a0" />

        <Text style={styles.label}>Details</Text>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          value={details} 
          onChangeText={setDetails} 
          placeholder="Party Details" 
          multiline 
          numberOfLines={4}
          placeholderTextColor="#a0a0a0"
        />

        <Text style={styles.label}>Scheduled For</Text>
        {Platform.OS === 'web' ? (
          <View style={styles.webDatePicker}>
            {React.createElement('input', {
              type: 'datetime-local',
              value: new Date(scheduledFor.getTime() - (scheduledFor.getTimezoneOffset() * 60000)).toISOString().slice(0, 16),
              onChange: (e: any) => {
                const d = new Date(e.target.value);
                if (!isNaN(d.getTime())) setScheduledFor(d);
              },
              style: {
                border: 'none',
                width: '100%',
                height: 30,
                fontSize: 16,
                backgroundColor: 'transparent',
                outline: 'none'
              }
            })}
          </View>
        ) : (
          <>
            <View style={styles.dateRow}>
              <Text style={styles.dateText}>{scheduledFor.toLocaleString()}</Text>
              <Button 
                title={showPicker ? "Done" : "Select Date"} 
                onPress={() => setShowPicker(!showPicker)} 
              />
            </View>
            
            {showPicker && (
              <DateTimePicker
                testID="dateTimePicker"
                value={scheduledFor}
                mode="datetime"
                is24Hour={true}
                display="default"
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )}
          </>
        )}

        <View style={styles.spacer} />

        <TouchableOpacity style={styles.inviteButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.inviteButtonText}>Invite Guests ({selectedGuestIds.length})</Text>
        </TouchableOpacity>

        <View style={styles.spacer} />

        {updating ? (
          <ActivityIndicator size="large" />
        ) : (
          <Button title="Update Party" onPress={handleUpdate} color="#007bff" />
        )}

        <Modal
          animationType="slide"
          transparent={false}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Select Guests</Text>
            <FlatList
              data={guests}
              keyExtractor={(item) => item.id}
              renderItem={renderGuestItem}
              contentContainerStyle={styles.listContent}
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity style={styles.updateButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.updateButtonText}>Update Guest List</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Select Party to Edit' }} />
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
        <FlatList 
          data={parties}
          keyExtractor={(item) => item.id}
          renderItem={renderPartyItem}
          ListEmptyComponent={<Text style={styles.emptyText}>No parties found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  item: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemTitle: { fontSize: 18, fontWeight: 'bold' },
  itemSubtitle: { fontSize: 14, color: '#666' },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 5, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  webDatePicker: { marginVertical: 10, padding: 5, borderWidth: 1, borderColor: '#ccc', borderRadius: 5 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 10, padding: 10, borderWidth: 1, borderColor: '#eee', borderRadius: 5 },
  dateText: { fontSize: 16 },
  spacer: { height: 20 },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: '#666' },
  
  // Modal Styles
  modalContainer: { flex: 1, paddingTop: 50, backgroundColor: '#fff' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  listContent: { paddingBottom: 100 },
  modalButtonContainer: { padding: 20, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fff' },
  updateButton: { backgroundColor: '#007bff', padding: 15, borderRadius: 8, alignItems: 'center' },
  updateButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  inviteButton: { backgroundColor: '#333', padding: 15, borderRadius: 8, alignItems: 'center' },
  inviteButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  
  // Guest Item Styles
  guestItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  selectedGuestItem: { backgroundColor: '#e6f2ff' },
  guestName: { fontSize: 16, fontWeight: 'bold' },
  guestDetail: { fontSize: 14, color: '#666' },
  checkmark: { fontSize: 20, color: '#007bff', fontWeight: 'bold' },
});