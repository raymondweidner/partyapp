import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Button,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { useAuth } from '../src/auth';
import { getResourceEndpoint, showAlert } from '../src/util';

export default function CreateGuest() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string) => {
    // Basic validation for length and allowed characters
    return /^\+?[\d\s-]{7,}$/.test(phone);
  };

  const handleCreate = async () => {
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

    setLoading(true);
    try {
      const token = await user?.getIdToken();
      if (!token) {
        throw new Error('User is not authenticated.');
      }

      const response = await fetch(`${getResourceEndpoint()}/guest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name, email, phone }),
      });

      if (!response.ok) {
        throw new Error('Failed to create guest record.');
      }

      showAlert('Success', 'Guest created successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      showAlert('Error', error.message || 'An error occurred while creating the guest.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Create guest' }} />
      
      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Guest Name" placeholderTextColor="#a0a0a0" />

      <Text style={styles.label}>Email</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#a0a0a0" />

      <Text style={styles.label}>Phone</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone Number" keyboardType="phone-pad" placeholderTextColor="#a0a0a0" />

      <View style={styles.buttonContainer}>
        {loading ? <ActivityIndicator size="large" /> : <Button title="Create Guest" onPress={handleCreate} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 5, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, fontSize: 16 },
  buttonContainer: { marginTop: 20 },
});