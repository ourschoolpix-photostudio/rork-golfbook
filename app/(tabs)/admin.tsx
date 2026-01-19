import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '@/utils/auth';
import { storageService } from '@/utils/storage';
import { User } from '@/types';
import {
  canAccessPlayerManagement,
  canAccessEventManagement,
  canAccessFinancialSummary,
  canAccessBulkUpdate,
  canAccessSettings,
  canAccessBackupRestore,
} from '@/utils/rolePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { CreateAlertModal } from '@/components/CreateAlertModal';


export default function AdminScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [alertsModalVisible, setAlertsModalVisible] = useState<boolean>(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const currentUserFromAuth = await authService.getCurrentUser();
      setUser(currentUserFromAuth);
      const hasAnyAccess = currentUserFromAuth?.isAdmin ||
        canAccessPlayerManagement(currentUser) ||
        canAccessEventManagement(currentUser) ||
        canAccessFinancialSummary(currentUser) ||
        canAccessBulkUpdate(currentUser) ||
        canAccessSettings(currentUser) ||
        canAccessBackupRestore(currentUser);
      
      if (!hasAnyAccess) {
        router.replace('/');
      }
    };
    checkAdmin();
  }, [router, currentUser]);

  const hasAnyAccess = user?.isAdmin ||
    canAccessPlayerManagement(currentUser) ||
    canAccessEventManagement(currentUser) ||
    canAccessFinancialSummary(currentUser) ||
    canAccessBulkUpdate(currentUser) ||
    canAccessSettings(currentUser) ||
    canAccessBackupRestore(currentUser);
  
  if (!hasAnyAccess) {
    return null;
  }

  const adminOptions = [
    {
      id: 'players',
      title: 'Player Management',
      description: 'Add, edit, or remove players',
      icon: 'people',
      href: '/(admin)/admin-players' as const,
    },
    {
      id: 'events',
      title: 'Event Management',
      description: 'Create and manage tournaments',
      icon: 'calendar',
      href: '/(admin)/admin-events' as const,
    },
    {
      id: 'financial',
      title: 'Financial Summary',
      description: 'View event expenses and income',
      icon: 'cash',
      href: '/(admin)/admin-financial' as const,
    },
    {
      id: 'email-manager',
      title: 'Email Manager',
      description: 'Send emails to members with templates',
      icon: 'mail',
      href: '/(admin)/email-manager' as const,
    },
    {
      id: 'alerts',
      title: 'Alerts Management',
      description: 'Create and manage player alerts',
      icon: 'notifications',
      action: 'openAlerts',
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Configure app branding and preferences',
      icon: 'settings',
      href: '/(admin)/settings' as const,
    },
  ];

  const handleAdminOption = (href: string, action?: string) => {
    if (action === 'openAlerts') {
      setAlertsModalVisible(true);
    } else {
      router.push(href as any);
    }
  };

  const handleBackupData = async () => {
    try {
      const [members, events, financials, registrations] = await Promise.all([
        storageService.getMembers(),
        storageService.getEvents(),
        storageService.getFinancials(),
        storageService.getRegistrations(),
      ]);

      const backupData = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        data: {
          members,
          events,
          financials,
          registrations,
        },
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const fileName = `golf_app_backup_${new Date().toISOString().split('T')[0]}.json`;
      
      if (Platform.OS === 'web') {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        Alert.alert('Success', 'Backup data exported successfully!');
      } else {
        const file = new File(Paths.document, fileName);
        if (file.exists) {
          file.delete();
        }
        file.create();
        file.write(jsonString);
        
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(file.uri, {
            mimeType: 'application/json',
            dialogTitle: 'Save Backup File',
            UTI: 'public.json',
          });
          Alert.alert('Success', 'Backup file ready to share!');
        } else {
          Alert.alert('Success', `Backup saved to: ${file.uri}`);
        }
      }
    } catch (error) {
      console.error('Backup error:', error);
      Alert.alert('Error', 'Failed to create backup. Check console for details.');
    }
  };

  const handleRestoreData = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json,.json';
        
        input.onchange = async (e: any) => {
          const file = e.target.files[0];
          if (!file) return;
          
          const reader = new FileReader();
          reader.onload = async (event: any) => {
            try {
              const jsonString = event.target.result;
              const backupData = JSON.parse(jsonString);
              
              if (!backupData.data || !backupData.version) {
                Alert.alert('Error', 'Invalid backup file format');
                return;
              }
              
              Alert.alert(
                'Choose Restore Mode',
                `Restore data from ${new Date(backupData.timestamp).toLocaleDateString()}.\n\n• Replace: Overwrites all current data\n• Merge: Adds only new records (no duplicates)`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Replace All',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        const { members, events, financials, registrations } = backupData.data;
                        
                        await Promise.all([
                          storageService.restoreMembers(members || [], false),
                          storageService.restoreEvents(events || [], false),
                          storageService.restoreFinancials(financials || [], false),
                          storageService.restoreRegistrations(registrations || [], false),
                        ]);
                        
                        Alert.alert(
                          'Success',
                          `Replaced:\n• ${members?.length || 0} members\n• ${events?.length || 0} events\n• ${financials?.length || 0} financial records\n• ${registrations?.length || 0} registrations`,
                          [{ text: 'OK', onPress: () => router.replace('/') }]
                        );
                      } catch (error) {
                        console.error('Restore error:', error);
                        Alert.alert('Error', 'Failed to restore data. Check console for details.');
                      }
                    },
                  },
                  {
                    text: 'Merge (No Duplicates)',
                    onPress: async () => {
                      try {
                        const { members, events, financials, registrations } = backupData.data;
                        
                        await Promise.all([
                          storageService.restoreMembers(members || [], true),
                          storageService.restoreEvents(events || [], true),
                          storageService.restoreFinancials(financials || [], true),
                          storageService.restoreRegistrations(registrations || [], true),
                        ]);
                        
                        Alert.alert(
                          'Success',
                          'Data merged successfully! Duplicates were skipped.',
                          [{ text: 'OK', onPress: () => router.replace('/') }]
                        );
                      } catch (error) {
                        console.error('Restore error:', error);
                        Alert.alert('Error', 'Failed to restore data. Check console for details.');
                      }
                    },
                  },
                ]
              );
            } catch (error) {
              console.error('Parse error:', error);
              Alert.alert('Error', 'Failed to parse backup file. Make sure it\'s a valid JSON backup.');
            }
          };
          reader.readAsText(file);
        };
        
        input.click();
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: 'application/json',
          copyToCacheDirectory: true,
        });
        
        if (result.canceled || !result.assets || result.assets.length === 0) {
          return;
        }
        
        const fileUri = result.assets[0].uri;
        const file = new File(fileUri);
        
        console.log('Reading backup file from:', fileUri);
        console.log('File exists:', file.exists);
        
        let jsonString: string;
        try {
          jsonString = await file.text();
          console.log('File content type:', typeof jsonString);
          console.log('File content preview:', jsonString.substring(0, 100));
        } catch (readError) {
          console.error('Error reading file:', readError);
          Alert.alert('Error', `Failed to read backup file: ${readError}`);
          return;
        }
        
        if (typeof jsonString !== 'string') {
          console.error('Invalid content type:', typeof jsonString);
          Alert.alert('Error', 'Failed to read backup file content');
          return;
        }
        
        const backupData = JSON.parse(jsonString);
        
        if (!backupData.data || !backupData.version) {
          Alert.alert('Error', 'Invalid backup file format');
          return;
        }
        
        Alert.alert(
          'Choose Restore Mode',
          `Restore data from ${new Date(backupData.timestamp).toLocaleDateString()}.\n\n• Replace: Overwrites all current data\n• Merge: Adds only new records (no duplicates)`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Replace All',
              style: 'destructive',
              onPress: async () => {
                try {
                  const { members, events, financials, registrations } = backupData.data;
                  
                  await Promise.all([
                    storageService.restoreMembers(members || [], false),
                    storageService.restoreEvents(events || [], false),
                    storageService.restoreFinancials(financials || [], false),
                    storageService.restoreRegistrations(registrations || [], false),
                  ]);
                  
                  Alert.alert(
                    'Success',
                    `Replaced:\n• ${members?.length || 0} members\n• ${events?.length || 0} events\n• ${financials?.length || 0} financial records\n• ${registrations?.length || 0} registrations`,
                    [{ text: 'OK', onPress: () => router.replace('/') }]
                  );
                } catch (error) {
                  console.error('Restore error:', error);
                  Alert.alert('Error', 'Failed to restore data. Check console for details.');
                }
              },
            },
            {
              text: 'Merge (No Duplicates)',
              onPress: async () => {
                try {
                  const { members, events, financials, registrations } = backupData.data;
                  
                  await Promise.all([
                    storageService.restoreMembers(members || [], true),
                    storageService.restoreEvents(events || [], true),
                    storageService.restoreFinancials(financials || [], true),
                    storageService.restoreRegistrations(registrations || [], true),
                  ]);
                  
                  Alert.alert(
                    'Success',
                    'Data merged successfully! Duplicates were skipped.',
                    [{ text: 'OK', onPress: () => router.replace('/') }]
                  );
                } catch (error) {
                  console.error('Restore error:', error);
                  Alert.alert('Error', 'Failed to restore data. Check console for details.');
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert('Error', 'Failed to restore backup. Check console for details.');
    }
  };

  const backupOption = {
    id: 'backup',
    title: 'Backup Data',
    description: 'Export all tournament data as JSON',
    icon: 'download',
    action: handleBackupData,
  };

  const restoreOption = {
    id: 'restore',
    title: 'Restore Data',
    description: 'Import data from a backup file',
    icon: 'cloud-upload',
    action: handleRestoreData,
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.optionsContainer}>
          {adminOptions.map((option) => {
            let hasAccess = false;
            if (option.id === 'players') hasAccess = canAccessPlayerManagement(currentUser);
            else if (option.id === 'events') hasAccess = canAccessEventManagement(currentUser);
            else if (option.id === 'financial') hasAccess = canAccessFinancialSummary(currentUser);
            else if (option.id === 'settings') hasAccess = canAccessSettings(currentUser);
            else if (option.id === 'email-manager') hasAccess = canAccessSettings(currentUser);
            else if (option.id === 'alerts') hasAccess = canAccessSettings(currentUser);
            
            if (!hasAccess) return null;
            
            return (
              <TouchableOpacity
                key={option.id}
                style={styles.optionCard}
                onPress={() => handleAdminOption((option as any).href, (option as any).action)}
              >
                <View style={styles.optionIcon}>
                  <Ionicons name={option.icon as any} size={28} color="#007AFF" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </TouchableOpacity>
            );
          })}

          {canAccessBackupRestore(currentUser) && (
            <TouchableOpacity
              style={[styles.optionCard, styles.backupCard]}
              onPress={backupOption.action}
            >
              <View style={[styles.optionIcon, styles.backupIcon]}>
                <Ionicons name={backupOption.icon as any} size={28} color="#34C759" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{backupOption.title}</Text>
                <Text style={styles.optionDescription}>{backupOption.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </TouchableOpacity>
          )}

          {canAccessBackupRestore(currentUser) && (
            <TouchableOpacity
              style={[styles.optionCard, styles.restoreCard]}
              onPress={restoreOption.action}
            >
              <View style={[styles.optionIcon, styles.restoreIcon]}>
                <Ionicons name={restoreOption.icon as any} size={28} color="#FF9500" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{restoreOption.title}</Text>
                <Text style={styles.optionDescription}>{restoreOption.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <CreateAlertModal
        visible={alertsModalVisible}
        onClose={() => setAlertsModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  optionsContainer: {
    marginTop: 16,
    marginBottom: 32,
  },
  optionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
  },
  backupCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#34C759',
    marginTop: 8,
  },
  backupIcon: {
    backgroundColor: '#dcfce7',
  },
  restoreCard: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#FF9500',
    marginTop: 8,
  },
  restoreIcon: {
    backgroundColor: '#ffedd5',
  },
});
