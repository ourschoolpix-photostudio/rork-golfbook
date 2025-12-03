import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Guest } from '@/types';

interface TableCardProps {
  tableLabel: string;
  tableNumber: number;
  guests: Guest[];
  selectedCount: number;
  onAddGuests: () => void;
  onRemoveGuest: (guestId: string) => void;
  isCheckboxMode: boolean;
  checkedGuests: { tableIdx: number; guestId: string }[];
  onGuestCheckboxChange: (tableIdx: number, guestId: string, checked: boolean) => void;
  tableIdx: number;
  isChecked: boolean;
  onTableCheckboxChange: (tableIdx: number, checked: boolean) => void;
  onResetTable: () => void;
  onDeleteTable: () => void;
  isAdmin: boolean;
}

export function TableCard({
  tableLabel,
  tableNumber,
  guests,
  selectedCount,
  onAddGuests,
  onRemoveGuest,
  isCheckboxMode,
  checkedGuests,
  onGuestCheckboxChange,
  tableIdx,
  isChecked,
  onTableCheckboxChange,
  onResetTable,
  onDeleteTable,
  isAdmin,
}: TableCardProps) {
  const tableName = `${tableLabel}${tableNumber}`;
  const guestCount = guests.length;

  return (
    <View style={[styles.card, isChecked && styles.cardChecked]}>
      <View style={styles.cardHeader}>
        {isAdmin && (
          <TouchableOpacity
            style={styles.tableCheckbox}
            onPress={() => onTableCheckboxChange(tableIdx, !isChecked)}
          >
            <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
              {isChecked && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
          </TouchableOpacity>
        )}
        <View style={styles.tableInfo}>
          <Text style={styles.tableName}>{tableName}</Text>
          <Text style={styles.guestCount}>{guestCount} guests</Text>
        </View>
        {isAdmin && (
          <View style={styles.tableActions}>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={onResetTable}
            >
              <Ionicons name="refresh" size={18} color="#E91E63" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={onDeleteTable}
            >
              <Ionicons name="trash" size={18} color="#d32f2f" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        {guests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={32} color="#ccc" />
            <Text style={styles.emptyText}>No guests assigned</Text>
          </View>
        ) : (
          <ScrollView style={styles.guestsList} showsVerticalScrollIndicator={false}>
            {guests.map((guest) => {
              const isGuestChecked = checkedGuests.some(
                (cg) => cg.tableIdx === tableIdx && cg.guestId === guest.id
              );
              
              return (
                <View
                  key={guest.id}
                  style={[
                    styles.guestItem,
                    isGuestChecked && styles.guestItemChecked,
                  ]}
                >
                  {isCheckboxMode && isAdmin && (
                    <TouchableOpacity
                      style={styles.guestCheckbox}
                      onPress={() =>
                        onGuestCheckboxChange(tableIdx, guest.id, !isGuestChecked)
                      }
                    >
                      <View
                        style={[
                          styles.checkbox,
                          isGuestChecked && styles.checkboxChecked,
                        ]}
                      >
                        {isGuestChecked && (
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        )}
                      </View>
                    </TouchableOpacity>
                  )}
                  <Text
                    style={[
                      styles.guestName,
                      isGuestChecked && styles.guestNameChecked,
                    ]}
                  >
                    {guest.name}
                  </Text>
                  {isAdmin && !isCheckboxMode && (
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => onRemoveGuest(guest.id)}
                    >
                      <Ionicons name="close-circle" size={20} color="#d32f2f" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {isAdmin && selectedCount > 0 && !isCheckboxMode && (
        <TouchableOpacity style={styles.addBtn} onPress={onAddGuests}>
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.addBtnText}>
            ADD {selectedCount} {selectedCount === 1 ? 'GUEST' : 'GUESTS'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardChecked: {
    borderColor: '#FFA500',
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tableCheckbox: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#1B5E20',
    borderColor: '#1B5E20',
  },
  tableInfo: {
    flex: 1,
  },
  tableName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#333',
  },
  guestCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  tableActions: {
    flexDirection: 'row',
    gap: 8,
  },
  resetBtn: {
    padding: 6,
  },
  deleteBtn: {
    padding: 6,
  },
  cardBody: {
    minHeight: 120,
    maxHeight: 200,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  guestsList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  guestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 6,
    backgroundColor: '#f9f9f9',
  },
  guestItemChecked: {
    backgroundColor: '#1B5E20',
  },
  guestCheckbox: {
    marginRight: 10,
  },
  guestName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#333',
  },
  guestNameChecked: {
    color: '#fff',
  },
  removeBtn: {
    padding: 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#1B5E20',
    gap: 8,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
