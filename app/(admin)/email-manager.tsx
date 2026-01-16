import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  FlatList,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Mail, Users, FileText, Send, Plus, Trash2, Edit2 } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Member } from '@/types';
import { supabaseService } from '@/utils/supabaseService';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  isHtml: boolean;
  createdAt: string;
}

interface MemberGroup {
  id: string;
  name: string;
  memberIds: string[];
  createdAt: string;
}

function getPaymentReminderTemplate(): EmailTemplate {
  return {
    id: crypto.randomUUID(),
    name: 'Payment Reminder - Professional',
    subject: 'Payment Reminder: Your Outstanding Balance',
    isHtml: true,
    createdAt: new Date().toISOString(),
    body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%); padding: 40px 20px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 2px; }
    .header-icon { width: 64px; height: 64px; background-color: rgba(255,255,255,0.2); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; font-size: 32px; }
    .content { padding: 40px 20px; }
    .greeting { font-size: 18px; color: #333333; margin-bottom: 24px; }
    .invoice-card { background-color: #F8F9FA; border: 1px solid #E0E0E0; border-radius: 12px; padding: 24px; margin: 24px 0; }
    .invoice-header { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #D0D0D0; }
    .invoice-title { font-size: 24px; font-weight: 700; color: #1B5E20; letter-spacing: 2px; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
    .detail-label { font-size: 14px; color: #666666; font-weight: 600; }
    .detail-value { font-size: 14px; color: #1a1a1a; font-weight: 600; text-align: right; }
    .amount-box { background-color: #ffffff; border: 2px solid #1B5E20; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
    .amount-label { font-size: 16px; color: #666666; margin-bottom: 8px; }
    .amount-value { font-size: 36px; font-weight: 700; color: #1B5E20; }
    .payment-methods { margin: 32px 0; }
    .section-title { font-size: 18px; font-weight: 700; color: #333333; margin-bottom: 16px; }
    .payment-option { background-color: #F8F9FA; border: 2px solid #E0E0E0; border-radius: 8px; padding: 20px; margin-bottom: 16px; }
    .payment-option-header { display: flex; align-items: center; margin-bottom: 12px; }
    .payment-icon { width: 40px; height: 40px; background-color: #1B5E20; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; color: #ffffff; font-size: 20px; }
    .payment-icon.zelle { background-color: #6B21A8; }
    .payment-icon.paypal { background-color: #0070BA; }
    .payment-name { font-size: 16px; font-weight: 700; color: #333333; }
    .payment-info { font-size: 20px; font-weight: 700; color: #1B5E20; text-align: center; padding: 16px; background-color: #ffffff; border-radius: 8px; margin-top: 12px; letter-spacing: 1px; }
    .payment-info.zelle { color: #6B21A8; }
    .payment-info.paypal { color: #0070BA; }
    .deadline-box { background-color: #FEE2E2; border-left: 4px solid #DC2626; padding: 16px; border-radius: 8px; margin: 24px 0; }
    .deadline-text { color: #DC2626; font-size: 14px; font-weight: 600; margin: 0; }
    .footer { background-color: #f8f9fa; padding: 24px 20px; text-align: center; border-top: 1px solid #e0e0e0; }
    .footer-text { font-size: 12px; color: #666666; margin: 4px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-icon">💳</div>
      <h1>PAYMENT REMINDER</h1>
    </div>
    
    <div class="content">
      <p class="greeting">Dear Member,</p>
      
      <p style="font-size: 15px; color: #333333; line-height: 1.6;">
        This is a friendly reminder that you have an outstanding balance. Please review the details below and submit your payment at your earliest convenience.
      </p>
      
      <div class="invoice-card">
        <div class="invoice-header">
          <div class="invoice-title">INVOICE DETAILS</div>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Invoice For:</span>
          <span class="detail-value">{{ITEM_DESCRIPTION}}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Due Date:</span>
          <span class="detail-value">{{DUE_DATE}}</span>
        </div>
      </div>
      
      <div class="amount-box">
        <div class="amount-label">Amount Due</div>
        <div class="amount-value">$‌{{AMOUNT}}</div>
      </div>
      
      <div class="payment-methods">
        <h2 class="section-title">Payment Options</h2>
        
        <div class="payment-option">
          <div class="payment-option-header">
            <div class="payment-icon zelle">💸</div>
            <div class="payment-name">Zelle</div>
          </div>
          <p style="font-size: 14px; color: #666666; margin: 0 0 12px 0;">Send payment via Zelle to:</p>
          <div class="payment-info zelle">{{ZELLE_PHONE}}</div>
        </div>
        
        <div class="payment-option">
          <div class="payment-option-header">
            <div class="payment-icon paypal">🅿️</div>
            <div class="payment-name">PayPal</div>
          </div>
          <p style="font-size: 14px; color: #666666; margin: 0 0 12px 0;">Send payment via PayPal to:</p>
          <div class="payment-info paypal">{{PAYPAL_EMAIL}}</div>
        </div>
      </div>
      
      <div class="deadline-box">
        <p class="deadline-text">⏰ Payment must be received by {{DUE_DATE}} to avoid any late fees or removal from the participant list.</p>
      </div>
      
      <p style="font-size: 14px; color: #666666; line-height: 1.6; font-style: italic;">
        If you have already submitted your payment, please disregard this reminder. If you have any questions or concerns, please don't hesitate to reach out.
      </p>
      
      <p style="font-size: 14px; color: #333333; margin-top: 32px;">
        Thank you,<br>
        <strong>The Management Team</strong>
      </p>
    </div>
    
    <div class="footer">
      <p class="footer-text">This is an automated payment reminder</p>
      <p class="footer-text">Please do not reply directly to this email</p>
    </div>
  </div>
</body>
</html>`
  };
}

export default function EmailManagerScreen() {
  const router = useRouter();
  const { members } = useAuth();
  const [activeTab, setActiveTab] = useState<'compose' | 'templates' | 'groups'>('compose');
  
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [groups, setGroups] = useState<MemberGroup[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [editingGroup, setEditingGroup] = useState<MemberGroup | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [templatesData, groupsData] = await Promise.all([
        supabaseService.emailTemplates.getAll(),
        supabaseService.emailMemberGroups.getAll(),
      ]);

      setTemplates(templatesData.map(t => ({
        ...t,
        isHtml: t.isHtml ?? false,
      })));
      setGroups(groupsData);
    } catch (error) {
      console.error('Failed to load email data:', error);
      Alert.alert('Error', 'Failed to load email data');
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (template: EmailTemplate) => {
    try {
      await supabaseService.emailTemplates.create(template);
      await loadData();
    } catch (error) {
      console.error('Failed to create template:', error);
      Alert.alert('Error', 'Failed to create template');
      throw error;
    }
  };

  const updateTemplate = async (template: EmailTemplate) => {
    try {
      await supabaseService.emailTemplates.update(template.id, {
        name: template.name,
        subject: template.subject,
        body: template.body,
        isHtml: template.isHtml,
      });
      await loadData();
    } catch (error) {
      console.error('Failed to update template:', error);
      Alert.alert('Error', 'Failed to update template');
      throw error;
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      await supabaseService.emailTemplates.delete(templateId);
      setTemplates(templates.filter(t => t.id !== templateId));
    } catch (error) {
      console.error('Failed to delete template:', error);
      Alert.alert('Error', 'Failed to delete template');
    }
  };

  const createGroup = async (group: MemberGroup) => {
    try {
      console.log('Creating group:', group);
      await supabaseService.emailMemberGroups.create(group);
      console.log('Group created successfully');
      setGroups([group, ...groups]);
    } catch (error: any) {
      console.error('Failed to create group:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      const errorMessage = error?.message || error?.error?.message || 'Failed to create group. Please check if the database tables are set up.';
      Alert.alert('Error', errorMessage);
      throw error;
    }
  };

  const updateGroup = async (group: MemberGroup) => {
    try {
      await supabaseService.emailMemberGroups.update(group.id, {
        name: group.name,
        memberIds: group.memberIds,
      });
      setGroups(groups.map(g => g.id === group.id ? group : g));
    } catch (error) {
      console.error('Failed to update group:', error);
      Alert.alert('Error', 'Failed to update group');
      throw error;
    }
  };

  const deleteGroup = async (groupId: string) => {
    try {
      await supabaseService.emailMemberGroups.delete(groupId);
      setGroups(groups.filter(g => g.id !== groupId));
    } catch (error) {
      console.error('Failed to delete group:', error);
      Alert.alert('Error', 'Failed to delete group');
    }
  };

  const handleSendEmail = async () => {
    const recipientMembers = Array.from(selectedMembers)
      .map(id => members.find(m => m.id === id))
      .filter((m): m is Member => !!m && !!m.email);

    if (recipientMembers.length === 0) {
      Alert.alert('No Recipients', 'Please select members with email addresses.');
      return;
    }

    if (!emailSubject.trim()) {
      Alert.alert('Missing Subject', 'Please enter an email subject.');
      return;
    }

    const batchSize = 40;
    const batches: Member[][] = [];
    for (let i = 0; i < recipientMembers.length; i += batchSize) {
      batches.push(recipientMembers.slice(i, i + batchSize));
    }

    Alert.alert(
      'Send Email',
      `This will open ${batches.length} email${batches.length > 1 ? 's' : ''} with ${recipientMembers.length} recipient${recipientMembers.length > 1 ? 's' : ''} in BCC.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            for (let i = 0; i < batches.length; i++) {
              const batch = batches[i];
              const bccEmails = batch.map((m: Member) => m.email).join(',');
              const subject = encodeURIComponent(emailSubject);
              const body = encodeURIComponent(emailBody);
              
              const mailtoUrl = `mailto:?bcc=${bccEmails}&subject=${subject}&body=${body}`;
              
              try {
                const supported = await Linking.canOpenURL(mailtoUrl);
                if (supported) {
                  await Linking.openURL(mailtoUrl);
                  if (i < batches.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                  }
                } else {
                  Alert.alert('Error', 'Unable to open email client.');
                }
              } catch (error) {
                console.error('Failed to open email:', error);
                Alert.alert('Error', 'Failed to open email client.');
              }
            }
          },
        },
      ]
    );
  };

  const membersWithEmail = members.filter(m => m.email);

  const renderComposeTab = () => {
    const selectedMemberList = Array.from(selectedMembers)
      .map(id => members.find(m => m.id === id))
      .filter((m): m is Member => !!m);

    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Recipients</Text>
          
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickButton}
              onPress={() => setShowGroupModal(true)}
            >
              <Users size={18} color="#003366" />
              <Text style={styles.quickButtonText}>Use Group</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickButton}
              onPress={() => {
                Alert.alert(
                  'Load Pre-Designed Template',
                  'Load a payment reminder template?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Load',
                      onPress: () => {
                        const paymentTemplate = getPaymentReminderTemplate();
                        setEditingTemplate(null);
                        createTemplate(paymentTemplate);
                        Alert.alert('Success', 'Payment reminder template added!');
                      },
                    },
                  ]
                );
              }}
            >
              <FileText size={18} color="#1B5E20" />
              <Text style={[styles.quickButtonText, { color: '#1B5E20' }]}>Add Payment Template</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickButton}
              onPress={() => {
                const allIds = new Set(membersWithEmail.map(m => m.id));
                setSelectedMembers(allIds);
              }}
            >
              <Users size={18} color="#003366" />
              <Text style={styles.quickButtonText}>Select All</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickButton}
              onPress={() => setSelectedMembers(new Set())}
            >
              <Trash2 size={18} color="#dc3545" />
              <Text style={[styles.quickButtonText, { color: '#dc3545' }]}>Clear</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.selectedCount}>
            Selected: {selectedMemberList.length} member{selectedMemberList.length !== 1 ? 's' : ''} with email
          </Text>

          <FlatList
            data={membersWithEmail}
            scrollEnabled={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.memberItem}
                onPress={() => {
                  const newSelected = new Set(selectedMembers);
                  if (newSelected.has(item.id)) {
                    newSelected.delete(item.id);
                  } else {
                    newSelected.add(item.id);
                  }
                  setSelectedMembers(newSelected);
                }}
              >
                <View style={[
                  styles.checkbox,
                  selectedMembers.has(item.id) && styles.checkboxChecked
                ]} />
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{item.name}</Text>
                  <Text style={styles.memberEmail}>{item.email}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Compose Email</Text>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setShowTemplateModal(true)}
            >
              <FileText size={20} color="#003366" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Subject"
            value={emailSubject}
            onChangeText={setEmailSubject}
            placeholderTextColor="#999"
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Email body"
            value={emailBody}
            onChangeText={setEmailBody}
            multiline
            numberOfLines={10}
            textAlignVertical="top"
            placeholderTextColor="#999"
          />

          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSendEmail}
          >
            <Send size={20} color="#fff" />
            <Text style={styles.sendButtonText}>Send Email</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderTemplatesTab = () => {
    return (
      <View style={styles.tabContent}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setEditingTemplate(null);
            setShowTemplateModal(true);
          }}
        >
          <Plus size={20} color="#fff" />
          <Text style={styles.addButtonText}>New Template</Text>
        </TouchableOpacity>

        <FlatList
          data={templates}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.templateCard}>
              <View style={styles.templateHeader}>
                <Text style={styles.templateName}>{item.name}</Text>
                <View style={styles.templateActions}>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingTemplate(item);
                      setShowTemplateModal(true);
                    }}
                    style={styles.iconButton}
                  >
                    <Edit2 size={18} color="#003366" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        'Delete Template',
                        `Delete "${item.name}"?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => {
                              deleteTemplate(item.id);
                            },
                          },
                        ]
                      );
                    }}
                    style={styles.iconButton}
                  >
                    <Trash2 size={18} color="#dc3545" />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.templateSubject}>{item.subject}</Text>
              {item.isHtml && <Text style={styles.htmlBadge}>HTML</Text>}
              <Text style={styles.templateBody} numberOfLines={3}>
                {item.isHtml ? item.body.replace(/<[^>]*>/g, ' ').substring(0, 150) + '...' : item.body}
              </Text>
              <TouchableOpacity
                style={styles.useTemplateButton}
                onPress={() => {
                  setEmailSubject(item.subject);
                  setEmailBody(item.body);
                  setActiveTab('compose');
                }}
              >
                <Text style={styles.useTemplateButtonText}>Use Template</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <FileText size={48} color="#ccc" />
              <Text style={styles.emptyText}>No templates yet</Text>
            </View>
          }
        />
      </View>
    );
  };

  const renderGroupsTab = () => {
    return (
      <View style={styles.tabContent}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setEditingGroup(null);
            setShowGroupModal(true);
          }}
        >
          <Plus size={20} color="#fff" />
          <Text style={styles.addButtonText}>New Group</Text>
        </TouchableOpacity>

        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const groupMembers = item.memberIds
              .map(id => members.find(m => m.id === id))
              .filter((m): m is Member => !!m);
            
            return (
              <View style={styles.groupCard}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupName}>{item.name}</Text>
                  <View style={styles.groupActions}>
                    <TouchableOpacity
                      onPress={() => {
                        setEditingGroup(item);
                        setShowGroupModal(true);
                      }}
                      style={styles.iconButton}
                    >
                      <Edit2 size={18} color="#003366" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert(
                          'Delete Group',
                          `Delete "${item.name}"?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: () => {
                                deleteGroup(item.id);
                              },
                            },
                          ]
                        );
                      }}
                      style={styles.iconButton}
                    >
                      <Trash2 size={18} color="#dc3545" />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.groupMemberCount}>
                  {groupMembers.length} member{groupMembers.length !== 1 ? 's' : ''}
                </Text>
                <TouchableOpacity
                  style={styles.useGroupButton}
                  onPress={() => {
                    setSelectedMembers(new Set(item.memberIds));
                    setActiveTab('compose');
                  }}
                >
                  <Text style={styles.useGroupButtonText}>Use Group</Text>
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Users size={48} color="#ccc" />
              <Text style={styles.emptyText}>No groups yet</Text>
            </View>
          }
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Email Manager</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'compose' && styles.tabActive]}
          onPress={() => setActiveTab('compose')}
        >
          <Mail size={20} color={activeTab === 'compose' ? '#003366' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'compose' && styles.tabTextActive]}>
            Compose
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'templates' && styles.tabActive]}
          onPress={() => setActiveTab('templates')}
        >
          <FileText size={20} color={activeTab === 'templates' ? '#003366' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'templates' && styles.tabTextActive]}>
            Templates
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'groups' && styles.tabActive]}
          onPress={() => setActiveTab('groups')}
        >
          <Users size={20} color={activeTab === 'groups' ? '#003366' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'groups' && styles.tabTextActive]}>
            Groups
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#003366" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <>
          {activeTab === 'compose' && renderComposeTab()}
          {activeTab === 'templates' && renderTemplatesTab()}
          {activeTab === 'groups' && renderGroupsTab()}
        </>
      )}

      {showTemplateModal && (
        <TemplateModal
          template={editingTemplate}
          onClose={() => {
            setShowTemplateModal(false);
            setEditingTemplate(null);
          }}
          onSave={async (template) => {
            try {
              if (editingTemplate) {
                await updateTemplate(template);
              } else {
                await createTemplate(template);
              }
              setShowTemplateModal(false);
              setEditingTemplate(null);
            } catch (error) {
              console.error('Failed to save template:', error);
            }
          }}
        />
      )}

      {showGroupModal && (
        <GroupModal
          group={editingGroup}
          members={membersWithEmail}
          onClose={() => {
            setShowGroupModal(false);
            setEditingGroup(null);
          }}
          onSave={async (group) => {
            try {
              if (editingGroup) {
                await updateGroup(group);
              } else {
                await createGroup(group);
              }
              setShowGroupModal(false);
              setEditingGroup(null);
            } catch (error) {
              console.error('Failed to save group:', error);
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

interface TemplateModalProps {
  template: EmailTemplate | null;
  onClose: () => void;
  onSave: (template: EmailTemplate) => Promise<void>;
}

function TemplateModal({ template, onClose, onSave }: TemplateModalProps) {
  const [name, setName] = useState(template?.name || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [body, setBody] = useState(template?.body || '');

  const handleSave = async () => {
    if (!name.trim() || !subject.trim()) {
      Alert.alert('Required Fields', 'Please enter a name and subject.');
      return;
    }

    await onSave({
      id: template?.id || crypto.randomUUID(),
      name: name.trim(),
      subject: subject.trim(),
      body: body.trim(),
      isHtml: template?.isHtml ?? false,
      createdAt: template?.createdAt || new Date().toISOString(),
    });
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modal}>
        <Text style={styles.modalTitle}>
          {template ? 'Edit Template' : 'New Template'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Template Name"
          value={name}
          onChangeText={setName}
          placeholderTextColor="#999"
        />

        <TextInput
          style={styles.input}
          placeholder="Subject"
          value={subject}
          onChangeText={setSubject}
          placeholderTextColor="#999"
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Email Body"
          value={body}
          onChangeText={setBody}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
          placeholderTextColor="#999"
        />

        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.modalButton} onPress={onClose}>
            <Text style={styles.modalButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, styles.modalButtonPrimary]}
            onPress={handleSave}
          >
            <Text style={styles.modalButtonTextPrimary}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

interface GroupModalProps {
  group: MemberGroup | null;
  members: Member[];
  onClose: () => void;
  onSave: (group: MemberGroup) => Promise<void>;
}

function GroupModal({ group, members, onClose, onSave }: GroupModalProps) {
  const [name, setName] = useState(group?.name || '');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(group?.memberIds || [])
  );

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter a group name.');
      return;
    }

    if (selectedIds.size === 0) {
      Alert.alert('No Members', 'Please select at least one member.');
      return;
    }

    await onSave({
      id: group?.id || crypto.randomUUID(),
      name: name.trim(),
      memberIds: Array.from(selectedIds),
      createdAt: group?.createdAt || new Date().toISOString(),
    });
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={[styles.modal, styles.modalLarge]}>
        <Text style={styles.modalTitle}>
          {group ? 'Edit Group' : 'New Group'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Group Name"
          value={name}
          onChangeText={setName}
          placeholderTextColor="#999"
        />

        <Text style={styles.selectedCount}>
          Selected: {selectedIds.size} member{selectedIds.size !== 1 ? 's' : ''}
        </Text>

        <ScrollView style={styles.memberList}>
          {members.map((member) => (
            <TouchableOpacity
              key={member.id}
              style={styles.memberItem}
              onPress={() => {
                const newSelected = new Set(selectedIds);
                if (newSelected.has(member.id)) {
                  newSelected.delete(member.id);
                } else {
                  newSelected.add(member.id);
                }
                setSelectedIds(newSelected);
              }}
            >
              <View style={[
                styles.checkbox,
                selectedIds.has(member.id) && styles.checkboxChecked
              ]} />
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberEmail}>{member.email}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.modalButton} onPress={onClose}>
            <Text style={styles.modalButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, styles.modalButtonPrimary]}
            onPress={handleSave}
          >
            <Text style={styles.modalButtonTextPrimary}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#003366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  placeholder: {
    width: 32,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#003366',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#003366',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  quickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
  },
  quickButtonText: {
    fontSize: 13,
    color: '#003366',
    fontWeight: '500',
  },
  selectedCount: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#003366',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#003366',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  memberEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  textArea: {
    height: 150,
    textAlignVertical: 'top',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#003366',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#003366',
    paddingVertical: 12,
    borderRadius: 8,
    margin: 16,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  templateCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  templateActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
  templateSubject: {
    fontSize: 14,
    fontWeight: '500',
    color: '#003366',
    marginBottom: 6,
  },
  htmlBadge: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#fff',
    backgroundColor: '#1B5E20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start' as const,
    marginBottom: 6,
    marginTop: 2,
  },
  templateBody: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  useTemplateButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  useTemplateButtonText: {
    fontSize: 13,
    color: '#003366',
    fontWeight: '500',
  },
  groupCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  groupActions: {
    flexDirection: 'row',
    gap: 8,
  },
  groupMemberCount: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  useGroupButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  useGroupButtonText: {
    fontSize: 13,
    color: '#003366',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 500,
  },
  modalLarge: {
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  memberList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  modalButtonPrimary: {
    backgroundColor: '#003366',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  modalButtonTextPrimary: {
    color: '#fff',
  },
});
