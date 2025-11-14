import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TournamentTermsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function TournamentTermsModal({ visible, onClose }: TournamentTermsModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Tournament Terms</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#1a1a1a" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>TOURNAMENT TERMS</Text>
              <Text style={styles.paragraph}>
                All tournament fees are final. There are no refunds for no shows or cancellations made by the member. Refunds are issued only if the golf course cancels the tournament.
              </Text>
              <Text style={styles.paragraph}>
                The DMVVGA Committee reserves the right to alter any of the conditions and schedules herein. The Committee reserves the right to reject the entry of any applicant at anytime for any reason. Any decision by the Committee in any matter shall be final.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>TROPHIES AND PRIZE MONEY</Text>
              <Text style={styles.paragraph}>
                Trophies and prize money are reserved for paid members with a GHIN handicap only. All other prizes are open to members and guests.
              </Text>
              <Text style={styles.paragraph}>
                New members are ineligible to win trophies or prize money on their first tournament. They are deemed eligible once they completely finish all 18 holes of their first tournament with DMVVGA.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>LIABILITY</Text>
              <Text style={styles.paragraph}>
                DMVVGA is not liable for any damages that may occur to a member's equipment or personal property while participating in a tournament. Furthermore, DMVVGA is not liable for any injury that may occur to a member while participating in a tournament. All DMVVGA tournament are play at your own risk.
              </Text>
            </View>

            <View style={[styles.section, styles.lastSection]}>
              <Text style={styles.sectionTitle}>ETIQUETTE</Text>
              <Text style={styles.paragraph}>
                All participants are expected to follow the rules and regulations of the golf course and all golf etiquette. Any member or guest not following course rules and regulations or not behaving within DMVVGA standards or the expectations of the golf course will be ask to leave the tournament without refund. DMVVGA reserves the right to terminate membership any time for repeat offenses.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>I Understand</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1a1a1a',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  lastSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1B5E20',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  paragraph: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    marginBottom: 12,
  },
  closeButton: {
    backgroundColor: '#1B5E20',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.5,
  },
});
