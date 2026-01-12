import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Member } from '@/types';

interface MemberListingModalProps {
  visible: boolean;
  onClose: () => void;
  members: Member[];
}

type MemberCategory = 'all' | 'active' | 'inactive' | 'local' | 'guests';

interface FieldOption {
  key: string;
  label: string;
  checked: boolean;
}

const LOCAL_STATES = ['', 'MD', 'VA', 'PA', 'NJ', 'DE'];

export function MemberListingModal({ visible, onClose, members }: MemberListingModalProps) {
  const [activeTab, setActiveTab] = useState<MemberCategory>('all');
  const [outputTab, setOutputTab] = useState<'text' | 'email'>('text');
  const [copied, setCopied] = useState(false);
  const [fields, setFields] = useState<FieldOption[]>([
    { key: 'name', label: 'Member Name', checked: true },
    { key: 'handicap', label: 'GHIN Handicap', checked: false },
    { key: 'ghin', label: 'GHIN Number', checked: false },
    { key: 'flight', label: 'Flight', checked: false },
    { key: 'rolexFlight', label: 'Rolex Flight', checked: false },
  ]);

  const toggleField = useCallback((key: string) => {
    setFields(prev => prev.map(f => 
      f.key === key ? { ...f, checked: !f.checked } : f
    ));
  }, []);

  const filteredMembers = useMemo(() => {
    let result = [...members];
    
    switch (activeTab) {
      case 'active':
        result = result.filter(m => m.membershipType === 'active');
        break;
      case 'inactive':
        result = result.filter(m => m.membershipType === 'in-active');
        break;
      case 'local':
        result = result.filter(m => LOCAL_STATES.includes(m.state || ''));
        break;
      case 'guests':
        result = result.filter(m => m.membershipType === 'guest');
        break;
    }
    
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [members, activeTab]);

  const getFieldValue = useCallback((member: Member, fieldKey: string): string => {
    switch (fieldKey) {
      case 'name':
        return member.name;
      case 'handicap':
        return member.handicap?.toString() || member.currentHandicap || '-';
      case 'ghin':
        return member.ghin || '-';
      case 'flight':
        return member.flight || '-';
      case 'rolexFlight':
        return member.rolexFlight || '-';
      default:
        return '-';
    }
  }, []);

  const selectedFields = useMemo(() => fields.filter(f => f.checked), [fields]);

  const textOutput = useMemo(() => {
    if (selectedFields.length === 0) return 'Please select at least one field';
    
    const lines: string[] = [];
    
    const header = selectedFields.map(f => f.label).join(' | ');
    lines.push(header);
    lines.push('-'.repeat(header.length));
    
    filteredMembers.forEach((member, index) => {
      const values = selectedFields.map(f => getFieldValue(member, f.key));
      lines.push(`${index + 1}. ${values.join(' | ')}`);
    });
    
    lines.push('');
    lines.push(`Total: ${filteredMembers.length} members`);
    
    return lines.join('\n');
  }, [filteredMembers, selectedFields, getFieldValue]);

  const emailOutput = useMemo(() => {
    if (selectedFields.length === 0) return 'Please select at least one field';
    
    const categoryLabels: Record<MemberCategory, string> = {
      all: 'All Members',
      active: 'Active Members',
      inactive: 'Inactive Members',
      local: 'Local Members',
      guests: 'Guest Players',
    };
    
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 20px; background-color: #f9f9f9;">
  <div style="max-width: 700px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background-color: #2c3e50; color: #ffffff; padding: 20px 24px;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 600;">${categoryLabels[activeTab]}</h1>
      <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">${filteredMembers.length} member${filteredMembers.length !== 1 ? 's' : ''}</p>
    </div>
    <div style="padding: 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        <thead>
          <tr style="background-color: #34495e;">
            <th style="padding: 12px 16px; text-align: center; color: #ffffff; font-size: 13px; font-weight: 600; border-bottom: 2px solid #2c3e50;">#</th>
`;
    
    selectedFields.forEach(f => {
      html += `            <th style="padding: 12px 16px; text-align: left; color: #ffffff; font-size: 13px; font-weight: 600; border-bottom: 2px solid #2c3e50;">${f.label}</th>\n`;
    });
    
    html += `          </tr>
        </thead>
        <tbody>
`;
    
    filteredMembers.forEach((member, index) => {
      const bgColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
      const borderColor = '#e9ecef';
      html += `          <tr style="background-color: ${bgColor};">\n`;
      html += `            <td style="padding: 10px 16px; text-align: center; color: #6c757d; font-size: 13px; border-bottom: 1px solid ${borderColor};">${index + 1}</td>\n`;
      selectedFields.forEach((f, fIndex) => {
        const fontWeight = f.key === 'name' ? 'font-weight: 600;' : '';
        const textColor = f.key === 'name' ? '#2c3e50' : '#495057';
        html += `            <td style="padding: 10px 16px; text-align: left; color: ${textColor}; font-size: 13px; border-bottom: 1px solid ${borderColor}; ${fontWeight}">${getFieldValue(member, f.key)}</td>\n`;
      });
      html += `          </tr>\n`;
    });
    
    html += `        </tbody>
      </table>
    </div>
    <div style="background-color: #f8f9fa; padding: 16px 24px; border-top: 1px solid #e9ecef;">
      <p style="margin: 0; font-size: 14px; color: #6c757d;">Total: <strong style="color: #2c3e50;">${filteredMembers.length} member${filteredMembers.length !== 1 ? 's' : ''}</strong></p>
    </div>
  </div>
</body>
</html>`;
    
    return html;
  }, [filteredMembers, selectedFields, activeTab, getFieldValue]);

  const handleCopy = useCallback(async () => {
    const content = outputTab === 'text' ? textOutput : emailOutput;
    await Clipboard.setStringAsync(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    console.log('[MemberListingModal] Copied to clipboard:', outputTab);
  }, [outputTab, textOutput, emailOutput]);

  const getCategoryCount = useCallback((category: MemberCategory): number => {
    switch (category) {
      case 'all':
        return members.length;
      case 'active':
        return members.filter(m => m.membershipType === 'active').length;
      case 'inactive':
        return members.filter(m => m.membershipType === 'in-active').length;
      case 'local':
        return members.filter(m => LOCAL_STATES.includes(m.state || '')).length;
      case 'guests':
        return members.filter(m => m.membershipType === 'guest').length;
    }
  }, [members]);

  const categories: { key: MemberCategory; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'inactive', label: 'Inactive' },
    { key: 'local', label: 'Local' },
    { key: 'guests', label: 'Guests' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Member Listing</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.categoryTabs}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.categoryTab, activeTab === cat.key && styles.categoryTabActive]}
              onPress={() => setActiveTab(cat.key)}
            >
              <Text style={[styles.categoryTabText, activeTab === cat.key && styles.categoryTabTextActive]}>
                {cat.label}
              </Text>
              <Text style={[styles.categoryCount, activeTab === cat.key && styles.categoryCountActive]}>
                {getCategoryCount(cat.key)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.fieldsSection}>
          <Text style={styles.sectionTitle}>Select Fields to Include</Text>
          <View style={styles.fieldsRow}>
            {fields.map(field => (
              <TouchableOpacity
                key={field.key}
                style={[styles.fieldCheckbox, field.checked && styles.fieldCheckboxChecked]}
                onPress={() => toggleField(field.key)}
              >
                <Ionicons
                  name={field.checked ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={field.checked ? '#007AFF' : '#666'}
                />
                <Text style={[styles.fieldLabel, field.checked && styles.fieldLabelChecked]}>
                  {field.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.outputTabs}>
          <TouchableOpacity
            style={[styles.outputTab, outputTab === 'text' && styles.outputTabActive]}
            onPress={() => setOutputTab('text')}
          >
            <Ionicons name="document-text-outline" size={18} color={outputTab === 'text' ? '#fff' : '#666'} />
            <Text style={[styles.outputTabText, outputTab === 'text' && styles.outputTabTextActive]}>
              Text
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.outputTab, outputTab === 'email' && styles.outputTabActive]}
            onPress={() => setOutputTab('email')}
          >
            <Ionicons name="mail-outline" size={18} color={outputTab === 'email' ? '#fff' : '#666'} />
            <Text style={[styles.outputTabText, outputTab === 'email' && styles.outputTabTextActive]}>
              Email
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.outputContainer}>
          <ScrollView style={styles.outputScroll} showsVerticalScrollIndicator={true}>
            <Text style={styles.outputText} selectable>
              {outputTab === 'text' ? textOutput : emailOutput}
            </Text>
          </ScrollView>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.copyButton, copied && styles.copyButtonSuccess]}
            onPress={handleCopy}
          >
            <Ionicons
              name={copied ? 'checkmark-circle' : 'copy-outline'}
              size={20}
              color="#fff"
            />
            <Text style={styles.copyButtonText}>
              {copied ? 'Copied!' : `Copy ${outputTab === 'text' ? 'Text' : 'Email HTML'}`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  categoryTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  categoryTabActive: {
    backgroundColor: '#4a4a4a',
  },
  categoryTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  categoryTabTextActive: {
    color: '#fff',
  },
  categoryCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginTop: 2,
  },
  categoryCountActive: {
    color: '#fff',
  },
  fieldsSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  fieldsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fieldCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    gap: 6,
  },
  fieldCheckboxChecked: {
    backgroundColor: '#e3f2fd',
  },
  fieldLabel: {
    fontSize: 13,
    color: '#666',
  },
  fieldLabelChecked: {
    color: '#007AFF',
    fontWeight: '500',
  },
  outputTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  outputTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    gap: 6,
  },
  outputTabActive: {
    backgroundColor: '#007AFF',
  },
  outputTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  outputTabTextActive: {
    color: '#fff',
  },
  outputContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  outputScroll: {
    flex: 1,
    padding: 12,
  },
  outputText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#333',
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  copyButtonSuccess: {
    backgroundColor: '#34C759',
  },
  copyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
