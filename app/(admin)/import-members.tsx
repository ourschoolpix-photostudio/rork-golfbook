import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { storageService } from '@/utils/storage';
import { Member } from '@/types';

export default function ImportMembersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [importData, setImportData] = useState('');
  const [importing, setImporting] = useState(false);

  const parseAndImportMembers = async () => {
    try {
      setImporting(true);
      const lines = importData.trim().split('\n').filter(line => line.trim());
      const newMembers: Member[] = [];

      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;

        let name = trimmedLine;
        let handicap = 0;

        // Support multiple formats:
        // 1. "John Smith, 15" (comma separator)
        // 2. "John Smith 15" (space-separated, last word is number)
        // 3. "John Smith\t15" (tab separator)
        // 4. "John Smith" (name only, handicap defaults to 0)

        // Try comma separator first
        if (trimmedLine.includes(',')) {
          const parts = trimmedLine.split(',').map(p => p.trim());
          name = parts[0];
          const handicapStr = parts[1];
          if (handicapStr && !isNaN(parseFloat(handicapStr))) {
            handicap = parseFloat(handicapStr);
          }
        }
        // Try tab separator
        else if (trimmedLine.includes('\t')) {
          const parts = trimmedLine.split('\t').filter(p => p.trim());
          name = parts[0].trim();
          const handicapStr = parts[1]?.trim();
          if (handicapStr && !isNaN(parseFloat(handicapStr))) {
            handicap = parseFloat(handicapStr);
          }
        }
        // Try space separator (last word should be a number)
        else {
          const parts = trimmedLine.split(/\s+/);
          if (parts.length > 1) {
            const lastPart = parts[parts.length - 1];
            if (!isNaN(parseFloat(lastPart))) {
              handicap = parseFloat(lastPart);
              name = parts.slice(0, -1).join(' ');
            }
          }
        }

        if (name) {
          const member: Member = {
            id: `member-${Date.now()}-${index}`,
            username: name,
            name: name,
            fullName: name,
            pin: '1111',
            isAdmin: false,
            handicap: handicap,
            flight: 'A',
            phone: '',
            email: '',
            profilePhotoUrl: '',
            membershipType: 'active',
            joinDate: new Date().toISOString().split('T')[0],
            rolexPoints: 0,
            createdAt: new Date().toISOString(),
          };
          newMembers.push(member);
        }
      });

      if (newMembers.length === 0) {
        Alert.alert('Error', 'No members found to import');
        return;
      }

      console.log('Importing members:', newMembers);

      for (const member of newMembers) {
        await storageService.addMember(member);
      }

      console.log('Members saved successfully');
      Alert.alert('Success', `${newMembers.length} members imported successfully!`);
      setImportData('');

      router.back();
    } catch (error) {
      console.error('Import error:', error);
      Alert.alert('Error', `Failed to import members: ${error}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Import Members</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>Paste member data (one per line):</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={10}
            value={importData}
            onChangeText={setImportData}
            placeholder="John Smith, 15&#10;Jane Doe, 8&#10;Bob Johnson 12&#10;Mary Williams&#10;..."
            placeholderTextColor="#999"
          />
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Format Options:</Text>
            <Text style={styles.info}>• Name, Handicap → John Smith, 15</Text>
            <Text style={styles.info}>• Name Handicap → Jane Doe 8</Text>
            <Text style={styles.info}>• Name only → Bob Johnson (handicap = 0)</Text>
            <Text style={[styles.infoTitle, { marginTop: 12 }]}>Default Settings:</Text>
            <Text style={styles.info}>• PIN: 1111</Text>
            <Text style={styles.info}>• Flight: A</Text>
            <Text style={styles.info}>• Status: Active</Text>
            <Text style={styles.infoNote}>(All values can be edited later)</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.importButton, importing && styles.importButtonDisabled]}
          onPress={parseAndImportMembers}
          disabled={importing || !importData.trim()}
        >
          <Ionicons name="cloud-upload" size={20} color="#fff" />
          <Text style={styles.importButtonText}>
            {importing ? 'Importing...' : 'Import Members'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerWrapper: {
    backgroundColor: '#003366',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#003366',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1a1a1a',
    textAlignVertical: 'top',
    marginBottom: 16,
    minHeight: 200,
    backgroundColor: '#fafafa',
  },
  infoBox: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#003366',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#003366',
    marginBottom: 8,
  },
  info: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
    marginBottom: 2,
  },
  infoNote: {
    fontSize: 12,
    color: '#777',
    fontStyle: 'italic',
    marginTop: 8,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 32,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  importButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
