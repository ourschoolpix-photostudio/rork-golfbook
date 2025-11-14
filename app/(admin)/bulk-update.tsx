import React, { useState } from 'react';
import { Stack } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { AdminFooter } from '@/components/AdminFooter';
import { Member } from '@/types';
import { bulkUpdateMembers, BulkUpdateFields } from '@/utils/bulk-update';

type UpdateOperation = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  action: () => Promise<void>;
};

export default function BulkUpdateScreen() {
  const [loading, setLoading] = useState(false);
  const { members, updateMember } = useAuth();

  const handleUpdateRolexFlights = async () => {
    Alert.alert(
      'Update Rolex Flights',
      'This will update all members\' Rolex flights based on their handicaps:\n\n• 11.0+ = Flight B\n• 10.9 and below = Flight A\n\nProceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          style: 'default',
          onPress: async () => {
            try {
              setLoading(true);
              console.log('[Bulk Update] Starting Rolex flight update');

              const updates: Array<{ 
                id: string; 
                name: string; 
                handicap: number; 
                oldFlight: string; 
                newFlight: 'A' | 'B';
              }> = [];

              for (const member of members) {
                const handicap = member.handicap || 0;
                const newFlight: 'A' | 'B' = handicap >= 11 ? 'B' : 'A';
                const oldFlight = member.rolexFlight || '';

                if (oldFlight !== newFlight) {
                  updates.push({
                    id: member.id,
                    name: member.name,
                    handicap,
                    oldFlight,
                    newFlight,
                  });
                }
              }

              if (updates.length === 0) {
                Alert.alert('No Updates Needed', 'All members already have correct Rolex flights.');
                return;
              }

              console.log(`[Bulk Update] Found ${updates.length} members needing updates`);

              for (const update of updates) {
                const member = members.find(m => m.id === update.id);
                if (member) {
                  const updatedMember: Member = {
                    ...member,
                    rolexFlight: update.newFlight,
                  };
                  await updateMember(member.id, updatedMember);
                  console.log(
                    `[Bulk Update] ${update.name}: ${update.oldFlight || 'none'} -> ${update.newFlight} (HC: ${update.handicap})`
                  );
                }
              }

              Alert.alert(
                'Success',
                `Updated ${updates.length} member(s) Rolex flight assignments.`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('[Bulk Update] Error updating Rolex flights:', error);
              Alert.alert('Error', 'Failed to update Rolex flights. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleBulkUpdate = async (updateFields: BulkUpdateFields, confirmTitle: string, confirmMessage: string) => {
    Alert.alert(
      confirmTitle,
      confirmMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          style: 'default',
          onPress: async () => {
            try {
              setLoading(true);
              const result = await bulkUpdateMembers(updateFields);
              Alert.alert(
                'Success',
                `Updated ${result.updated} out of ${result.total} members.`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('[Bulk Update] Error:', error);
              Alert.alert('Error', 'Failed to complete bulk update. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleResetRolexPoints = async () => {
    await handleBulkUpdate(
      { rolexPoints: '0' },
      'Reset All Rolex Points',
      'This will set all members\' Rolex points to 0. This action cannot be undone. Proceed?'
    );
  };



  const handleSetMembershipActive = async () => {
    await handleBulkUpdate(
      { membershipType: 'active' },
      'Set All to Active',
      'This will set ALL members\' membership type to "Active". Proceed?'
    );
  };

  const handleSetMembershipInactive = async () => {
    await handleBulkUpdate(
      { membershipType: 'in-active' },
      'Set All to In-Active',
      'This will set ALL members\' membership type to "In-Active". Proceed?'
    );
  };



  const operations: UpdateOperation[] = [
    {
      id: 'rolex-flights',
      title: 'Update Rolex Flights',
      description: 'Update all Rolex flights based on handicaps (11+ = B, 10.9 and below = A)',
      icon: 'trophy',
      action: handleUpdateRolexFlights,
    },
    {
      id: 'set-active',
      title: 'Set All to Active',
      description: 'Set all members\' membership type to Active',
      icon: 'checkmark-circle',
      action: handleSetMembershipActive,
    },
    {
      id: 'set-inactive',
      title: 'Set All to In-Active',
      description: 'Set all members\' membership type to In-Active',
      icon: 'close-circle',
      action: handleSetMembershipInactive,
    },

    {
      id: 'reset-rolex-points',
      title: 'Reset Rolex Points',
      description: 'Set all members\' Rolex points to 0',
      icon: 'refresh',
      action: handleResetRolexPoints,
    },

  ];

  const totalMembers = members.length;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: `Bulk Update Tool • ${totalMembers} members`,
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {operations.map((operation) => (
          <TouchableOpacity
            key={operation.id}
            style={styles.operationCard}
            onPress={operation.action}
            disabled={loading}
          >
            <View style={styles.operationIconContainer}>
              <Ionicons name={operation.icon} size={28} color="#2563eb" />
            </View>
            <View style={styles.operationContent}>
              <Text style={styles.operationTitle}>{operation.title}</Text>
              <Text style={styles.operationDescription}>{operation.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
          </TouchableOpacity>
        ))}

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}
      </ScrollView>

      <AdminFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },

  operationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  operationIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  operationContent: {
    flex: 1,
  },
  operationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  operationDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  loadingOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
});
