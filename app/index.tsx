import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { auth } from '../src/firebaseConfig';

type MenuSection = {
  title: string;
  items: string[];
};

const MENU_DATA: MenuSection[] = [
  {
    title: 'Parties',
    items: ['Create party', 'Edit party'],
  },
  {
    title: 'Guests',
    items: ['Create guest', 'Edit guest'],
  },
];

export default function Home() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const router = useRouter();

  const toggleSection = (title: string) => {
    setExpandedSection(expandedSection === title ? null : title);
  };

  const handlePress = (action: string) => {
    // Convert "Create party" -> "/create-party"
    const route = action.toLowerCase().replace(' ', '-');
    // @ts-ignore: Dynamic routes are valid in this context
    router.push(`/${route}`);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>PartyParty! Event Manager</Text>
        
        {MENU_DATA.map((section) => (
          <View key={section.title} style={styles.sectionContainer}>
            <TouchableOpacity 
              style={styles.sectionHeader} 
              onPress={() => toggleSection(section.title)}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.chevron}>
                {expandedSection === section.title ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>

            {expandedSection === section.title && (
              <View style={styles.itemsContainer}>
                {section.items.map((item) => (
                  <TouchableOpacity 
                    key={item} 
                    style={styles.itemButton} 
                    onPress={() => handlePress(item)}
                  >
                    <Text style={styles.itemText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContent: { padding: 20 },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
  sectionContainer: { marginBottom: 15, backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#fff' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  chevron: { fontSize: 18, color: '#666' },
  itemsContainer: { backgroundColor: '#fafafa', borderTopWidth: 1, borderTopColor: '#eee' },
  itemButton: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', paddingLeft: 30 },
  itemText: { fontSize: 16, color: '#007bff' },
  signOutButton: { marginTop: 20, padding: 15, backgroundColor: '#ff4444', borderRadius: 8, alignItems: 'center' },
  signOutText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});