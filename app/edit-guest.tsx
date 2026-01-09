import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Button,
    FlatList,
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

export default function EditGuest() {
  const { user } = useAuth();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchGuests();
  }, [user]);

  const fetchGuests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${getResourceEndpoint()}/guest`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGuests(data);
      } else {
        showAlert('Error', 'Failed to fetch guests');
      }
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGuest = (guest: Guest) => {
    setSelectedGuest(guest);
    setName(guest.name);
    setEmail(guest.email);
    setPhone(guest.phone);
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string) => {
    return /^\+?[\d\s-]{7,}$/.test(phone);
  };

  const handleUpdate = async () => {
    if (!selectedGuest || !user) return;

    if (!name || !email || !phone) {
      showAlert('Validation Error', 'All fields are required.');
      return;
    }

    if (!validateEmail(email)) {
      showAlert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    if (!validatePhone(phone)) {
      showAlert('Validation Error', 'Please enter a valid phone number.');
      return;
    }

    setUpdating(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${getResourceEndpoint()}/guest/${selectedGuest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name, email, phone }),
      });

      if (!response.ok) {
        throw new Error('Failed to update guest.');
      }

      showAlert('Success', 'Guest updated successfully!', [
        { 
          text: 'OK', 
          onPress: () => {
            setSelectedGuest(null);
            fetchGuests();
          } 
        }
      ]);
    } catch (error: any) {
      showAlert('Error', error.message || 'An error occurred while updating the guest.');
    } finally {
      setUpdating(false);
    }
  };

  const renderGuestItem = ({ item }: { item: Guest }) => (
    <TouchableOpacity style={styles.item} onPress={() => handleSelectGuest(item)}>
      <Text style={styles.itemTitle}>{item.name}</Text>
      <Text style={styles.itemSubtitle}>{item.email}</Text>
      <Text style={styles.itemSubtitle}>{item.phone}</Text>
    </TouchableOpacity>
  );

  if (selectedGuest) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Edit Guest Details' }} />
        <Button title="Back to List" onPress={() => setSelectedGuest(null)} />
        
        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Guest Name" placeholderTextColor="#a0a0a0" />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#a0a0a0" />

        <Text style={styles.label}>Phone</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone Number" keyboardType="phone-pad" placeholderTextColor="#a0a0a0" />

        <View style={styles.buttonContainer}>
          {updating ? <ActivityIndicator size="large" /> : <Button title="Update Guest" onPress={handleUpdate} />}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Select Guest to Edit' }} />
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
        <FlatList 
          data={guests}
          keyExtractor={(item) => item.id || Math.random().toString()}
          renderItem={renderGuestItem}
          ListEmptyComponent={<Text style={styles.emptyText}>No guests found.</Text>}
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
  buttonContainer: { marginTop: 20 },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: '#666' }
});