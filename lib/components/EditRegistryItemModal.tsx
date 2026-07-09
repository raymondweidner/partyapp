import { BlurView } from 'expo-blur';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Member } from '../data/Member';
import { RegistryItem } from '../data/RegistryItem';
import { colors, globalStyles } from '../theme';
import { DropdownSelect } from './DropdownSelect';

export interface EditRegistryItemModalProps {
  visible: boolean;
  item: RegistryItem | null;
  tribeMembers: Member[];
  onClose: () => void;
  onSave: (itemData: Partial<RegistryItem>) => void;
}

const STATUS_OPTIONS = [
  { label: 'Todo', value: 'Todo' },
  { label: 'In Progress', value: 'In Progress' },
  { label: 'Blocked', value: 'Blocked' },
  { label: 'Completed', value: 'Completed' },
  { label: 'Cancelled', value: 'Cancelled' },
];

export function EditRegistryItemModal({ visible, item, tribeMembers, onClose, onSave }: EditRegistryItemModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [details, setDetails] = useState('');
  const [status, setStatus] = useState('Todo');
  const [helperId, setHelperId] = useState<string | undefined>(undefined);

  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      if (item) {
        setIsEditing(false);
        setDetails(item.details || '');
        setStatus(item.status || 'Todo');
        setHelperId(item.helper_id);
      } else {
        setIsEditing(true);
        setDetails('');
        setStatus('Todo');
        setHelperId(undefined);
      }
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
        })
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [visible, item]);

  const handleSave = () => {
    onSave({
      details,
      status,
      helper_id: helperId,
    });
  };

  const memberOptions = [
    { label: 'Available', value: '' },
    ...tribeMembers.map(m => ({ label: m.name || m.email, value: m.id || '' }))
  ];

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <BlurView intensity={20} tint="light" style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[styles.modalContent, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.headerButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{item ? 'Registry Item' : 'New Item'}</Text>
            {isEditing ? (
              <TouchableOpacity onPress={handleSave}>
                <Text style={[styles.headerButton, { fontWeight: 'bold' }]}>Save</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Text style={styles.headerButton}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.body}>
            <Text style={globalStyles.label}>Details</Text>
            <TextInput
              style={[globalStyles.input, !isEditing && styles.readOnlyInput]}
              value={details}
              onChangeText={setDetails}
              placeholder="What needs to be done?"
              placeholderTextColor={colors.textMuted}
              multiline
              editable={isEditing}
            />

            <View style={{ marginTop: 15, zIndex: 2000 }}>
              <Text style={globalStyles.label}>Assigned To</Text>
              <DropdownSelect
                options={memberOptions}
                value={helperId || ''}
                onSelect={(val) => {
                  setHelperId(val || undefined);
                  if (!isEditing && item) {
                    onSave({ ...item, helper_id: val || undefined, status });
                  }
                }}
                placeholder="Select a member..."
              />
            </View>

            <View style={{ marginTop: 15, zIndex: 1000 }}>
              <Text style={globalStyles.label}>Status</Text>
              <DropdownSelect
                options={STATUS_OPTIONS}
                value={status}
                onSelect={(val) => {
                  setStatus(val);
                  if (!isEditing && item) {
                    onSave({ ...item, status: val, helper_id: helperId });
                  }
                }}
                placeholder="Select status..."
              />
            </View>

          </View>
        </Animated.View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerButton: {
    color: colors.primary,
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  body: {
    padding: 20,
    minHeight: 300,
  },
  readOnlyInput: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
    color: colors.text,
  },
});
