import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useAuth } from '../auth';
import { getEventCheckIns } from '../data/service';
import { EventCheckIn } from '../data/EventCheckIn';
import { LiveMapModal } from './LiveMapModal';
import { useCurrentMember } from '../../app/_layout';

interface AttendanceTabsProps {
  eventId: string;
}

export const AttendanceTabs: React.FC<AttendanceTabsProps> = ({ eventId }) => {
  const { user } = useAuth();
  const { member } = useCurrentMember(); // Provides current user's DB member record
  
  const [activeTab, setActiveTab] = useState<'in_attendance' | 'not_in_attendance'>('in_attendance');
  const [checkIns, setCheckIns] = useState<EventCheckIn[]>([]);
  
  const [mapVisible, setMapVisible] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (eventId && user) {
      loadCheckIns();
    }
  }, [eventId, user]);

  const loadCheckIns = async () => {
    try {
      const token = await user?.getIdToken();
      if (!token) return;
      const data = await getEventCheckIns(token, eventId);
      setCheckIns(data);
    } catch (err) {
      console.error("Failed to load checkins", err);
    }
  };

  const inAttendance = checkIns.filter(c => c.status === 'checked_in');
  const notInAttendance = checkIns.filter(c => c.status === 'checked_out'); // or no record

  const isTribalCouncil = false; // TODO: Query TribalCouncil table for current member

  const handleLocateUser = (memberId: string) => {
    setTargetUserId(memberId);
    setMapVisible(true);
  };

  const handleLocateAll = () => {
    setTargetUserId(undefined);
    setMapVisible(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabHeader}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'in_attendance' && styles.activeTab]}
          onPress={() => setActiveTab('in_attendance')}
        >
          <Text>In-Attendance ({inAttendance.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'not_in_attendance' && styles.activeTab]}
          onPress={() => setActiveTab('not_in_attendance')}
        >
          <Text>Not In-Attendance ({notInAttendance.length})</Text>
        </TouchableOpacity>
      </View>

      {isTribalCouncil && activeTab === 'in_attendance' && (
        <TouchableOpacity style={styles.locateAllButton} onPress={handleLocateAll}>
          <Text style={styles.locateAllText}>Map All Attendees</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={activeTab === 'in_attendance' ? inAttendance : notInAttendance}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text>User: {item.member_id}</Text>
            {activeTab === 'in_attendance' && (
              <TouchableOpacity style={styles.locateButton} onPress={() => handleLocateUser(item.member_id)}>
                <Text style={styles.locateText}>Locate</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      <LiveMapModal 
        visible={mapVisible} 
        onClose={() => setMapVisible(false)} 
        eventId={eventId} 
        targetUserId={targetUserId} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
  },
  tabHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  locateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  locateText: {
    color: '#fff',
  },
  locateAllButton: {
    backgroundColor: '#34C759',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  locateAllText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
