import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Event } from '@/types';
import { useRouter } from 'expo-router';
import { formatDateForDisplay, formatDateAsFullDay } from '@/utils/dateUtils';

interface EventDetailsModalProps {
  visible: boolean;
  event: Event | null;
  onClose: () => void;
  onRegister?: () => void;
  currentUserId?: string;
  registeredPlayerIds?: string[];
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  visible,
  event,
  onClose,
  onRegister,
  currentUserId,
  registeredPlayerIds = [],
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  if (!event) return null;

  const isAlreadyRegistered = currentUserId && registeredPlayerIds.includes(currentUserId);
  const isRegistrationClosed = !event.registrationOpen;
  
  const getRegistrationMessage = () => {
    if (isAlreadyRegistered) return 'ALREADY REGISTERED';
    if (isRegistrationClosed) {
      const eventDate = new Date(event.date);
      const now = new Date();
      if (eventDate > now) {
        return 'REGISTRATION NOT OPEN YET';
      } else {
        return 'REGISTRATION CLOSED';
      }
    }
    return 'REGISTER NOW!';
  };

  const getPrizePoolItems = () => {
    const items: { label: string; value: string }[] = [];

    if (event.flightATrophy1st) {
      const cash = event.flightACashPrize1st ? ` + $${event.flightACashPrize1st} Cash` : '';
      items.push({ label: 'Flight A - 1st Place Trophy' + cash, value: '🏆' });
    } else if (event.flightACashPrize1st) {
      items.push({ label: 'Flight A - 1st Place No Trophy $' + event.flightACashPrize1st + ' cash only', value: '💵' });
    }

    if (event.flightATrophy2nd) {
      const cash = event.flightACashPrize2nd ? ` + $${event.flightACashPrize2nd} Cash` : '';
      items.push({ label: 'Flight A - 2nd Place Trophy' + cash, value: '🏆' });
    } else if (event.flightACashPrize2nd) {
      items.push({ label: 'Flight A - 2nd Place No Trophy $' + event.flightACashPrize2nd + ' cash only', value: '💵' });
    }

    if (event.flightATrophy3rd) {
      const cash = event.flightACashPrize3rd ? ` + $${event.flightACashPrize3rd} Cash` : '';
      items.push({ label: 'Flight A - 3rd Place Trophy' + cash, value: '🏆' });
    } else if (event.flightACashPrize3rd) {
      items.push({ label: 'Flight A - 3rd Place No Trophy $' + event.flightACashPrize3rd + ' cash only', value: '💵' });
    }

    if (event.flightBTrophy1st) {
      const cash = event.flightBCashPrize1st ? ` + $${event.flightBCashPrize1st} Cash` : '';
      items.push({ label: 'Flight B - 1st Place Trophy' + cash, value: '🏆' });
    } else if (event.flightBCashPrize1st) {
      items.push({ label: 'Flight B - 1st Place No Trophy $' + event.flightBCashPrize1st + ' cash only', value: '💵' });
    }

    if (event.flightBTrophy2nd) {
      const cash = event.flightBCashPrize2nd ? ` + $${event.flightBCashPrize2nd} Cash` : '';
      items.push({ label: 'Flight B - 2nd Place Trophy' + cash, value: '🏆' });
    } else if (event.flightBCashPrize2nd) {
      items.push({ label: 'Flight B - 2nd Place No Trophy $' + event.flightBCashPrize2nd + ' cash only', value: '💵' });
    }

    if (event.flightBTrophy3rd) {
      const cash = event.flightBCashPrize3rd ? ` + $${event.flightBCashPrize3rd} Cash` : '';
      items.push({ label: 'Flight B - 3rd Place Trophy' + cash, value: '🏆' });
    } else if (event.flightBCashPrize3rd) {
      items.push({ label: 'Flight B - 3rd Place No Trophy $' + event.flightBCashPrize3rd + ' cash only', value: '💵' });
    }

    if (event.flightCTrophy1st) {
      const cash = event.flightCCashPrize1st ? ` + $${event.flightCCashPrize1st} Cash` : '';
      items.push({ label: 'Flight C - 1st Place Trophy' + cash, value: '🏆' });
    } else if (event.flightCCashPrize1st) {
      items.push({ label: 'Flight C - 1st Place No Trophy $' + event.flightCCashPrize1st + ' cash only', value: '💵' });
    }

    if (event.flightCTrophy2nd) {
      const cash = event.flightCCashPrize2nd ? ` + $${event.flightCCashPrize2nd} Cash` : '';
      items.push({ label: 'Flight C - 2nd Place Trophy' + cash, value: '🏆' });
    } else if (event.flightCCashPrize2nd) {
      items.push({ label: 'Flight C - 2nd Place No Trophy $' + event.flightCCashPrize2nd + ' cash only', value: '💵' });
    }

    if (event.flightCTrophy3rd) {
      const cash = event.flightCCashPrize3rd ? ` + $${event.flightCCashPrize3rd} Cash` : '';
      items.push({ label: 'Flight C - 3rd Place Trophy' + cash, value: '🏆' });
    } else if (event.flightCCashPrize3rd) {
      items.push({ label: 'Flight C - 3rd Place No Trophy $' + event.flightCCashPrize3rd + ' cash only', value: '💵' });
    }

    if (event.flightLTrophy1st) {
      const cash = event.flightLCashPrize1st ? ` + $${event.flightLCashPrize1st} Cash` : '';
      items.push({ label: 'Flight L - 1st Place Trophy' + cash, value: '🏆' });
    } else if (event.flightLCashPrize1st) {
      items.push({ label: 'Flight L - 1st Place No Trophy $' + event.flightLCashPrize1st + ' cash only', value: '💵' });
    }

    if (event.flightLTrophy2nd) {
      const cash = event.flightLCashPrize2nd ? ` + $${event.flightLCashPrize2nd} Cash` : '';
      items.push({ label: 'Flight L - 2nd Place Trophy' + cash, value: '🏆' });
    } else if (event.flightLCashPrize2nd) {
      items.push({ label: 'Flight L - 2nd Place No Trophy $' + event.flightLCashPrize2nd + ' cash only', value: '💵' });
    }

    if (event.flightLTrophy3rd) {
      const cash = event.flightLCashPrize3rd ? ` + $${event.flightLCashPrize3rd} Cash` : '';
      items.push({ label: 'Flight L - 3rd Place Trophy' + cash, value: '🏆' });
    } else if (event.flightLCashPrize3rd) {
      items.push({ label: 'Flight L - 3rd Place No Trophy $' + event.flightLCashPrize3rd + ' cash only', value: '💵' });
    }

    if (event.lowGrossTrophy) {
      const cash = event.lowGrossCashPrize ? ` + $${event.lowGrossCashPrize} Cash` : '';
      items.push({ label: 'Low Gross Trophy' + cash, value: '🏆' });
    } else if (event.lowGrossCashPrize) {
      items.push({ label: 'Low Gross No Trophy $' + event.lowGrossCashPrize + ' cash only', value: '💵' });
    }

    if (event.closestToPin) {
      items.push({ label: 'Closest To Pin Prize', value: `$${event.closestToPin}` });
    }

    return items;
  };

  const formatScheduleItem = (day: number) => {
    const startTime = event[`day${day}StartTime` as keyof Event];
    const startPeriod = event[`day${day}StartPeriod` as keyof Event];
    const endTime = event[`day${day}EndTime` as keyof Event];
    const endPeriod = event[`day${day}EndPeriod` as keyof Event];
    const startType = event[`day${day}StartType` as keyof Event];
    const course = event[`day${day}Course` as keyof Event];
    const leadingHole = event[`day${day}LeadingHole` as keyof Event];

    if (!startTime) return null;

    let timeDisplay = `${startTime} ${startPeriod}`;
    if (endTime && endPeriod) {
      timeDisplay += ` - ${endTime} ${endPeriod}`;
    }

    return {
      day,
      time: timeDisplay,
      type: startType,
      course: course,
      leadingHole: startType === 'shotgun' ? leadingHole : null,
    };
  };

  const scheduleItems = [
    formatScheduleItem(1),
    (event.numberOfDays || 0) >= 2 ? formatScheduleItem(2) : null,
    (event.numberOfDays || 0) >= 3 ? formatScheduleItem(3) : null,
  ].filter(Boolean);

  const prizePoolItems = getPrizePoolItems();

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={onClose}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>EVENT DETAILS</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.contentWrapper}>
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {event.photoUrl && event.photoUrl.trim() !== '' && (
            <Image source={{ uri: event.photoUrl }} style={styles.eventPhoto} />
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>VENUE & COURSE DETAILS</Text>
            <View style={styles.detailCard}>
              <Text style={styles.eventName}>{event.name}</Text>
              <View style={styles.detailRow}>
                <Ionicons name="map" size={16} color="#666" />
                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>Venue</Text>
                  <Text style={styles.detailValue}>{event.location}</Text>
                </View>
              </View>

              {event.address && (
                <View style={styles.detailRow}>
                  <Ionicons name="location" size={16} color="#666" />
                  <View style={styles.detailText}>
                    <Text style={styles.detailLabel}>Address</Text>
                    <Text style={styles.detailValue}>
                      {event.address}
                      {event.city ? `, ${event.city}` : ''}
                      {event.state ? `, ${event.state}` : ''}
                    </Text>
                  </View>
                </View>
              )}

              {event.date && (
                <View style={styles.detailRow}>
                  <Ionicons name="calendar" size={16} color="#666" />
                  <View style={styles.detailText}>
                    <Text style={styles.detailLabel}>Dates</Text>
                    <Text style={styles.detailValue}>
                      {formatDateForDisplay(event.date)}
                      {event.endDate && event.endDate !== event.date ? ` - ${formatDateForDisplay(event.endDate)}` : ''}
                    </Text>
                  </View>
                </View>
              )}

              {event.numberOfDays && (
                <View style={styles.detailRow}>
                  <Ionicons name="list" size={16} color="#666" />
                  <View style={styles.detailText}>
                    <Text style={styles.detailLabel}>Duration</Text>
                    <Text style={styles.detailValue}>{event.numberOfDays} day{event.numberOfDays > 1 ? 's' : ''}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {scheduleItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>SCHEDULE</Text>
              <View style={styles.detailCard}>
                {scheduleItems.map((item: any, idx) => (
                  <View key={idx}>
                    <View style={styles.scheduleItem}>
                      <View style={styles.scheduleLeft}>
                        <Text style={styles.scheduleDay}>{formatDateAsFullDay(event.date, event.numberOfDays, item.day)}</Text>
                        <Text style={styles.scheduleTime}>{item.time}</Text>
                      </View>
                      <View style={styles.scheduleRight}>
                        <Text style={styles.scheduleType}>{item.type}</Text>
                        {item.course && <Text style={styles.scheduleCourse}>{item.course}</Text>}
                        {item.leadingHole && <Text style={styles.scheduleLeadingHole}>Leading Hole #{item.leadingHole}</Text>}
                      </View>
                    </View>
                    {idx < scheduleItems.length - 1 && <View style={styles.scheduleDevider} />}
                  </View>
                ))}
              </View>
            </View>
          )}

          {prizePoolItems.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>PRIZE POOL</Text>

              {prizePoolItems.filter(item => item.label.includes('Flight A')).length > 0 && (
                <View style={styles.prizeFlightCard}>
                  <Text style={styles.prizeFlightTitle}>Flight A</Text>
                  {prizePoolItems.filter(item => item.label.includes('Flight A')).map((item, idx) => (
                    <View key={idx} style={styles.bulletPoint}>
                      <Text style={styles.bullet}>{item.value}</Text>
                      <Text style={styles.bulletLabel}>{item.label.replace('Flight A - ', '')}</Text>
                    </View>
                  ))}
                </View>
              )}

              {prizePoolItems.filter(item => item.label.includes('Flight B')).length > 0 && (
                <View style={styles.prizeFlightCard}>
                  <Text style={styles.prizeFlightTitle}>Flight B</Text>
                  {prizePoolItems.filter(item => item.label.includes('Flight B')).map((item, idx) => (
                    <View key={idx} style={styles.bulletPoint}>
                      <Text style={styles.bullet}>{item.value}</Text>
                      <Text style={styles.bulletLabel}>{item.label.replace('Flight B - ', '')}</Text>
                    </View>
                  ))}
                </View>
              )}

              {prizePoolItems.filter(item => item.label.includes('Flight C')).length > 0 && (
                <View style={styles.prizeFlightCard}>
                  <Text style={styles.prizeFlightTitle}>Flight C</Text>
                  {prizePoolItems.filter(item => item.label.includes('Flight C')).map((item, idx) => (
                    <View key={idx} style={styles.bulletPoint}>
                      <Text style={styles.bullet}>{item.value}</Text>
                      <Text style={styles.bulletLabel}>{item.label.replace('Flight C - ', '')}</Text>
                    </View>
                  ))}
                </View>
              )}

              {prizePoolItems.filter(item => item.label.includes('Flight L')).length > 0 && (
                <View style={styles.prizeFlightCard}>
                  <Text style={styles.prizeFlightTitle}>Flight L</Text>
                  {prizePoolItems.filter(item => item.label.includes('Flight L')).map((item, idx) => (
                    <View key={idx} style={styles.bulletPoint}>
                      <Text style={styles.bullet}>{item.value}</Text>
                      <Text style={styles.bulletLabel}>{item.label.replace('Flight L - ', '')}</Text>
                    </View>
                  ))}
                </View>
              )}

              {(prizePoolItems.filter(item => item.label.includes('Low Gross')).length > 0 || 
                prizePoolItems.filter(item => item.label.includes('Closest To Pin')).length > 0) && (
                <View style={styles.prizeFlightCard}>
                  {prizePoolItems.filter(item => item.label.includes('Low Gross')).length > 0 && (
                    <>
                      <Text style={styles.prizeFlightTitle}>Low Gross</Text>
                      {prizePoolItems.filter(item => item.label.includes('Low Gross')).map((item, idx) => (
                        <View key={idx} style={styles.bulletPoint}>
                          <Text style={styles.bullet}>{item.value}</Text>
                          <Text style={styles.bulletLabel}>{item.label.replace('Low Gross ', '')}</Text>
                        </View>
                      ))}
                    </>
                  )}

                  {prizePoolItems.filter(item => item.label.includes('Closest To Pin')).length > 0 && 
                   prizePoolItems.filter(item => item.label.includes('Low Gross')).length > 0 && (
                    <View style={styles.cardDivider} />
                  )}

                  {prizePoolItems.filter(item => item.label.includes('Closest To Pin')).length > 0 && (
                    <>
                      <Text style={styles.prizeFlightTitle}>Closest To Pin</Text>
                      {prizePoolItems.filter(item => item.label.includes('Closest To Pin')).map((item, idx) => (
                        <View key={idx} style={styles.bulletPoint}>
                          <Text style={styles.bullet}>{item.value}</Text>
                          <Text style={styles.bulletLabel}>{item.label.replace('Closest To Pin ', '')}</Text>
                        </View>
                      ))}
                    </>
                  )}
                </View>
              )}
            </View>
          )}

          {event.memo && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>FINAL DETAILS</Text>
              <View style={styles.detailCard}>
                {event.memo.split('\n').filter((line: string) => line.trim()).map((line: string, idx: number) => (
                  <View key={idx} style={styles.memoBulletPoint}>
                    <Text style={styles.memoBullet}>•</Text>
                    <Text style={styles.memoText}>{line.trim()}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.spacer} />
          </ScrollView>

          <View style={[styles.buttonFooter, { paddingBottom: insets.bottom + 12 }]}>
            <TouchableOpacity 
              style={[styles.registerButton, (isAlreadyRegistered || isRegistrationClosed) && styles.registeredButton]}
              onPress={() => {
                if (!isAlreadyRegistered && !isRegistrationClosed && event) {
                  if (onRegister) {
                    onRegister();
                  } else {
                    onClose();
                    router.push({
                      pathname: '/(event)/[eventId]/registration',
                      params: { eventId: event.id, autoRegister: 'true' }
                    });
                  }
                }
              }}
              disabled={isAlreadyRegistered || isRegistrationClosed}
            >
              <Text style={styles.registerButtonText}>
                {getRegistrationMessage()}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1B5E20',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWrapper: {
    flex: 1,
    flexDirection: 'column',
  },
  content: {
    flex: 1,
  },
  eventPhoto: {
    width: '100%',
    height: 100,
    resizeMode: 'cover',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#666',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailCard: {
    backgroundColor: '#D9D9D9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  eventName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 14,
    gap: 12,
  },
  detailText: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginTop: 2,
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  scheduleLeft: {
    flex: 1,
  },
  scheduleRight: {
    alignItems: 'flex-end',
  },
  scheduleDay: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  scheduleTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 2,
  },
  scheduleType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'capitalize',
  },
  scheduleCourse: {
    fontSize: 11,
    color: '#333',
    marginTop: 2,
  },
  scheduleLeadingHole: {
    fontSize: 11,
    color: '#1B5E20',
    fontWeight: '600',
    marginTop: 2,
  },
  scheduleDevider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 0,
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
    alignItems: 'center',
  },
  bullet: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 0,
    minWidth: 20,
  },
  bulletContent: {
    flex: 1,
  },
  bulletLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  bulletValue: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  prizeFlightCard: {
    backgroundColor: '#D9D9D9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  prizeFlightTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#bbb',
    marginVertical: 12,
  },
  memoBulletPoint: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 10,
    alignItems: 'flex-start',
  },
  memoBullet: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B5E20',
    marginTop: 0,
    minWidth: 18,
  },
  memoText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#1a1a1a',
    lineHeight: 20,
    flex: 1,
  },
  spacer: {
    height: 40,
  },
  buttonFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 16,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  registerButton: {
    backgroundColor: '#1B5E20',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  registeredButton: {
    backgroundColor: '#666',
    opacity: 0.7,
  },
});
