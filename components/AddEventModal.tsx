import React, { useState, useRef } from 'react';
import {
  Modal,
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AddEventModalProps {
  visible: boolean;
  isEditing: boolean;
  form: {
    status: 'upcoming' | 'active' | 'complete';
    type: 'tournament' | 'social';
    eventName: string;
    entryFee: string;
    course: string;
    address: string;
    city: string;
    state: string;
    zipcode: string;
    startDate: string;
    endDate: string;
    numberOfDays: 1 | 2 | 3;
    day1StartTime: string;
    day1StartPeriod: 'AM' | 'PM';
    day1EndTime: string;
    day1EndPeriod: 'AM' | 'PM';
    day1Course: string;
    day1StartType: 'tee-time' | 'shotgun' | 'gala' | 'happy-hour' | 'party';
    day1LeadingHole: string;
    day1Par: string;
    day1SlopeRating: string;
    day1CourseRating: string;
    day1HolePars?: string[];
    day2StartTime: string;
    day2StartPeriod: 'AM' | 'PM';
    day2EndTime: string;
    day2EndPeriod: 'AM' | 'PM';
    day2Course: string;
    day2StartType: 'tee-time' | 'shotgun' | 'gala' | 'happy-hour' | 'party';
    day2LeadingHole: string;
    day2Par: string;
    day2SlopeRating: string;
    day2CourseRating: string;
    day2HolePars?: string[];
    day3StartTime: string;
    day3StartPeriod: 'AM' | 'PM';
    day3EndTime: string;
    day3EndPeriod: 'AM' | 'PM';
    day3Course: string;
    day3StartType: 'tee-time' | 'shotgun' | 'gala' | 'happy-hour' | 'party';
    day3LeadingHole: string;
    day3Par: string;
    day3SlopeRating: string;
    day3CourseRating: string;
    day3HolePars?: string[];
    flightACutoff: string;
    flightBCutoff: string;
    flightATeebox: string;
    flightBTeebox: string;
    flightLTeebox: string;
    photoUrl?: string;
    flightATrophy1st?: boolean;
    flightATrophy2nd?: boolean;
    flightATrophy3rd?: boolean;
    flightBTrophy1st?: boolean;
    flightBTrophy2nd?: boolean;
    flightBTrophy3rd?: boolean;
    flightCTrophy1st?: boolean;
    flightCTrophy2nd?: boolean;
    flightCTrophy3rd?: boolean;
    flightLTrophy1st?: boolean;
    flightLTrophy2nd?: boolean;
    flightLTrophy3rd?: boolean;
    flightACashPrize1st?: string;
    flightACashPrize2nd?: string;
    flightACashPrize3rd?: string;
    flightBCashPrize1st?: string;
    flightBCashPrize2nd?: string;
    flightBCashPrize3rd?: string;
    flightCCashPrize1st?: string;
    flightCCashPrize2nd?: string;
    flightCCashPrize3rd?: string;
    flightLCashPrize1st?: string;
    flightLCashPrize2nd?: string;
    flightLCashPrize3rd?: string;
    lowGrossTrophy?: boolean;
    lowGrossCashPrize?: string;
    closestToPin?: string;
    memo?: string;
    holePars?: string[];
  };
  onFormChange: (field: string, value: any) => void;
  onClose: () => void;
  onSave: () => Promise<void>;
}

export function AddEventModal({
  visible,
  isEditing,
  form,
  onFormChange,
  onClose,
  onSave,
}: AddEventModalProps) {
  const [useSameCourseDay2, setUseSameCourseDay2] = useState(false);
  const [useSameCourseDay3, setUseSameCourseDay3] = useState(false);
  
  const day1HoleRefs = useRef<(TextInput | null)[]>(Array(18).fill(null));
  const day2HoleRefs = useRef<(TextInput | null)[]>(Array(18).fill(null));
  const day3HoleRefs = useRef<(TextInput | null)[]>(Array(18).fill(null));

  const handleEntryFeeChange = (text: string) => {
    const numericValue = text.replace(/[^0-9.]/g, '');
    const parts = numericValue.split('.');
    const formattedValue = parts.length > 2 
      ? parts[0] + '.' + parts.slice(1).join('')
      : numericValue;
    onFormChange('entryFee', formattedValue);
  };

  const handleDateChange = (field: string, text: string) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    let formattedDate = '';
    if (numericValue.length > 0) {
      formattedDate = numericValue.substring(0, 2);
      if (numericValue.length >= 3) {
        formattedDate += '/' + numericValue.substring(2, 4);
      }
      if (numericValue.length >= 5) {
        formattedDate += '/' + numericValue.substring(4, 8);
      }
    }
    onFormChange(field, formattedDate);
  };

  const handleTimeChange = (field: string, text: string) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    let formattedTime = '';
    
    if (numericValue.length === 0) {
      formattedTime = '';
    } else if (numericValue.length === 1) {
      formattedTime = numericValue;
    } else if (numericValue.length === 2) {
      formattedTime = numericValue;
    } else if (numericValue.length === 3) {
      const hours = numericValue.substring(0, 1);
      const minutes = numericValue.substring(1, 3);
      formattedTime = hours + ':' + minutes;
    } else {
      const hours = numericValue.substring(0, 2);
      const minutes = numericValue.substring(2, 4);
      formattedTime = hours + ':' + minutes;
    }
    
    onFormChange(field, formattedTime);
  };



  const handleMemoChange = (text: string) => {
    onFormChange('memo', text);
  };

  const displayEntryFee = form.entryFee ? `$${form.entryFee}` : '';

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <SafeAreaView style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {isEditing ? 'Edit Event' : 'Create Event'}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#1a1a1a" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Event Status</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.statusButton, form.status === 'upcoming' && styles.statusButtonActive]}
                  onPress={() => onFormChange('status', 'upcoming')}
                >
                  <Text style={[styles.statusButtonText, form.status === 'upcoming' && styles.statusButtonTextActive]}>
                    UPCOMING
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statusButton, form.status === 'active' && styles.statusButtonActive]}
                  onPress={() => onFormChange('status', 'active')}
                >
                  <Text style={[styles.statusButtonText, form.status === 'active' && styles.statusButtonTextActive]}>
                    ACTIVE
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statusButton, form.status === 'complete' && styles.statusButtonActive]}
                  onPress={() => onFormChange('status', 'complete')}
                >
                  <Text style={[styles.statusButtonText, form.status === 'complete' && styles.statusButtonTextActive]}>
                    COMPLETE
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Event Type</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.typeButton, form.type === 'tournament' && styles.typeButtonActive]}
                  onPress={() => onFormChange('type', 'tournament')}
                >
                  <Text style={[styles.typeButtonText, form.type === 'tournament' && styles.typeButtonTextActive]}>
                    TOURNAMENT
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, form.type === 'social' && styles.typeButtonActive]}
                  onPress={() => onFormChange('type', 'social')}
                >
                  <Text style={[styles.typeButtonText, form.type === 'social' && styles.typeButtonTextActive]}>
                    SOCIAL EVENT
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>VENUE</Text>
              <View style={styles.twoColumnRow}>
                <TextInput
                  style={[styles.input, styles.twoColumnInput]}
                  placeholder="Event Name"
                  placeholderTextColor="#666"
                  autoCapitalize="words"
                  value={form.eventName}
                  onChangeText={(text) => onFormChange('eventName', text)}
                />
                <TextInput
                  style={[styles.input, styles.twoColumnInput]}
                  placeholder="Entry Fee"
                  placeholderTextColor="#666"
                  keyboardType="decimal-pad"
                  value={displayEntryFee}
                  onChangeText={handleEntryFeeChange}
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Venue"
                placeholderTextColor="#666"
                autoCapitalize="words"
                value={form.course}
                onChangeText={(text) => onFormChange('course', text)}
              />
              <TextInput
                style={styles.input}
                placeholder="Address"
                placeholderTextColor="#666"
                autoCapitalize="words"
                value={form.address}
                onChangeText={(text) => onFormChange('address', text)}
              />
              <View style={styles.threeColumnRow}>
                <TextInput
                  style={[styles.input, styles.threeColumnInput]}
                  placeholder="City"
                  placeholderTextColor="#666"
                  autoCapitalize="words"
                  value={form.city}
                  onChangeText={(text) => onFormChange('city', text)}
                />
                <TextInput
                  style={[styles.input, styles.threeColumnInputSmall]}
                  placeholder="State"
                  placeholderTextColor="#666"
                  autoCapitalize="characters"
                  value={form.state}
                  onChangeText={(text) => onFormChange('state', text)}
                />
                <TextInput
                  style={[styles.input, styles.threeColumnInput]}
                  placeholder="Zipcode"
                  placeholderTextColor="#666"
                  keyboardType="number-pad"
                  value={form.zipcode}
                  onChangeText={(text) => onFormChange('zipcode', text)}
                />
              </View>

              <View style={styles.photoSection}>
                <Text style={styles.sectionLabel}>Event Photo URL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter photo URL (optional)"
                  placeholderTextColor="#999"
                  value={form.photoUrl || ''}
                  onChangeText={(text) => onFormChange('photoUrl', text)}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>SCHEDULING</Text>
              <View style={styles.twoColumnRow}>
                <TextInput
                  style={[styles.input, styles.twoColumnInput]}
                  placeholder="Start Date (MM/DD/YYYY)"
                  placeholderTextColor="#666"
                  keyboardType="number-pad"
                  maxLength={10}
                  value={form.startDate}
                  onChangeText={(text) => handleDateChange('startDate', text)}
                />
                <TextInput
                  style={[styles.input, styles.twoColumnInput]}
                  placeholder="End Date (MM/DD/YYYY)"
                  placeholderTextColor="#666"
                  keyboardType="number-pad"
                  maxLength={10}
                  value={form.endDate}
                  onChangeText={(text) => handleDateChange('endDate', text)}
                />
              </View>
              <View style={styles.daysRow}>
                <Text style={styles.daysLabel}>Number of Days</Text>
                <View style={styles.daysButtons}>
                  <TouchableOpacity
                    style={[styles.dayButton, form.numberOfDays === 1 && styles.dayButtonActive]}
                    onPress={() => onFormChange('numberOfDays', 1)}
                  >
                    <Text style={[styles.dayButtonText, form.numberOfDays === 1 && styles.dayButtonTextActive]}>1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.dayButton, form.numberOfDays === 2 && styles.dayButtonActive]}
                    onPress={() => onFormChange('numberOfDays', 2)}
                  >
                    <Text style={[styles.dayButtonText, form.numberOfDays === 2 && styles.dayButtonTextActive]}>2</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.dayButton, form.numberOfDays === 3 && styles.dayButtonActive]}
                    onPress={() => onFormChange('numberOfDays', 3)}
                  >
                    <Text style={[styles.dayButtonText, form.numberOfDays === 3 && styles.dayButtonTextActive]}>3</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

              {form.numberOfDays >= 1 && (
                <View style={styles.dayScheduleSection}>
                  <Text style={styles.dayLabel}>DAY 1</Text>
                  <View style={styles.fieldColumn}>
                    <Text style={styles.fieldLabel}>Start Type</Text>
                    {form.type === 'social' ? (
                      <View style={styles.toggleButtons}>
                        <TouchableOpacity
                          style={[styles.toggleButton, form.day1StartType === 'gala' && styles.toggleButtonActive]}
                          onPress={() => onFormChange('day1StartType', 'gala')}
                        >
                          <Text style={[styles.toggleButtonText, form.day1StartType === 'gala' && styles.toggleButtonTextActive]}>
                            Gala
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.toggleButton, form.day1StartType === 'happy-hour' && styles.toggleButtonActive]}
                          onPress={() => onFormChange('day1StartType', 'happy-hour')}
                        >
                          <Text style={[styles.toggleButtonText, form.day1StartType === 'happy-hour' && styles.toggleButtonTextActive]}>
                            Happy Hour
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.toggleButton, form.day1StartType === 'party' && styles.toggleButtonActive]}
                          onPress={() => onFormChange('day1StartType', 'party')}
                        >
                          <Text style={[styles.toggleButtonText, form.day1StartType === 'party' && styles.toggleButtonTextActive]}>
                            Party
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.toggleButtons}>
                        <TouchableOpacity
                          style={[styles.toggleButton, form.day1StartType === 'tee-time' && styles.toggleButtonActive]}
                          onPress={() => onFormChange('day1StartType', 'tee-time')}
                        >
                          <Text style={[styles.toggleButtonText, form.day1StartType === 'tee-time' && styles.toggleButtonTextActive]}>
                            Tee Time
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.toggleButton, form.day1StartType === 'shotgun' && styles.toggleButtonActive]}
                          onPress={() => onFormChange('day1StartType', 'shotgun')}
                        >
                          <Text style={[styles.toggleButtonText, form.day1StartType === 'shotgun' && styles.toggleButtonTextActive]}>
                            Shotgun
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  <View style={styles.fieldColumn}>
                    <Text style={styles.fieldLabel}>Start Time</Text>
                    <View style={styles.timeInputRow}>
                      <TextInput
                        style={[styles.input, styles.timeInput]}
                        placeholder="HH:MM"
                        placeholderTextColor="#999"
                        keyboardType="number-pad"
                        maxLength={5}
                        value={form.day1StartTime}
                        onChangeText={(text) => handleTimeChange('day1StartTime', text)}
                      />
                      <View style={styles.periodToggle}>
                        <TouchableOpacity
                          style={[styles.periodButton, form.day1StartPeriod === 'AM' && styles.periodButtonActive]}
                          onPress={() => onFormChange('day1StartPeriod', 'AM')}
                        >
                          <Text style={[styles.periodButtonText, form.day1StartPeriod === 'AM' && styles.periodButtonTextActive]}>AM</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.periodButton, form.day1StartPeriod === 'PM' && styles.periodButtonActive]}
                          onPress={() => onFormChange('day1StartPeriod', 'PM')}
                        >
                          <Text style={[styles.periodButtonText, form.day1StartPeriod === 'PM' && styles.periodButtonTextActive]}>PM</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  {form.type === 'social' && (
                    <View style={styles.fieldColumn}>
                      <Text style={styles.fieldLabel}>End Time</Text>
                      <View style={styles.timeInputRow}>
                        <TextInput
                          style={[styles.input, styles.timeInput]}
                          placeholder="HH:MM"
                          placeholderTextColor="#999"
                          keyboardType="number-pad"
                          maxLength={5}
                          value={form.day1EndTime}
                          onChangeText={(text) => handleTimeChange('day1EndTime', text)}
                        />
                        <View style={styles.periodToggle}>
                          <TouchableOpacity
                            style={[styles.periodButton, form.day1EndPeriod === 'AM' && styles.periodButtonActive]}
                            onPress={() => onFormChange('day1EndPeriod', 'AM')}
                          >
                            <Text style={[styles.periodButtonText, form.day1EndPeriod === 'AM' && styles.periodButtonTextActive]}>AM</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.periodButton, form.day1EndPeriod === 'PM' && styles.periodButtonActive]}
                            onPress={() => onFormChange('day1EndPeriod', 'PM')}
                          >
                            <Text style={[styles.periodButtonText, form.day1EndPeriod === 'PM' && styles.periodButtonTextActive]}>PM</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}
                  {form.type !== 'social' && (
                    <>
                  {form.day1StartType === 'shotgun' ? (
                    <View style={styles.threeColumnRow}>
                      <View style={[styles.fieldColumn, { flex: 2 }]}>
                        <Text style={styles.fieldLabel}>Course</Text>
                        <TextInput
                          style={[styles.input, styles.threeColumnInput]}
                          placeholder="Course"
                          placeholderTextColor="#666"
                          autoCapitalize="words"
                          value={form.day1Course}
                          onChangeText={(text) => onFormChange('day1Course', text)}
                        />
                      </View>
                      <View style={[styles.fieldColumn, { flex: 1 }]}>
                        <Text style={styles.fieldLabel}>Par#</Text>
                        <TextInput
                          style={[styles.input, styles.threeColumnInput]}
                          placeholder="Par"
                          placeholderTextColor="#999"
                          keyboardType="number-pad"
                          maxLength={2}
                          value={form.day1Par}
                          onChangeText={(text) => onFormChange('day1Par', text)}
                        />
                      </View>
                      <View style={[styles.fieldColumn, { flex: 1 }]}>
                        <Text style={styles.fieldLabel}>Leading Hole</Text>
                        <TextInput
                          style={[styles.input, styles.threeColumnInput]}
                          placeholder="Hole #"
                          placeholderTextColor="#999"
                          keyboardType="number-pad"
                          maxLength={2}
                          value={form.day1LeadingHole}
                          onChangeText={(text) => onFormChange('day1LeadingHole', text)}
                        />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.twoColumnRow}>
                      <View style={[styles.fieldColumn, { flex: 2 }]}>
                        <Text style={styles.fieldLabel}>Course</Text>
                        <TextInput
                          style={[styles.input, styles.twoColumnInput]}
                          placeholder="Course"
                          placeholderTextColor="#666"
                          autoCapitalize="words"
                          value={form.day1Course}
                          onChangeText={(text) => onFormChange('day1Course', text)}
                        />
                      </View>
                      <View style={[styles.fieldColumn, { flex: 1 }]}>
                        <Text style={styles.fieldLabel}>Par#</Text>
                        <TextInput
                          style={[styles.input, styles.twoColumnInput]}
                          placeholder="Par"
                          placeholderTextColor="#999"
                          keyboardType="number-pad"
                          maxLength={2}
                          value={form.day1Par}
                          onChangeText={(text) => onFormChange('day1Par', text)}
                        />
                      </View>
                    </View>
                  )}
                  
                  <View style={styles.twoColumnRow}>
                    <View style={[styles.fieldColumn, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>Slope Rating</Text>
                      <TextInput
                        style={[styles.input, styles.twoColumnInput]}
                        placeholder="Slope Rating"
                        placeholderTextColor="#999"
                        keyboardType="decimal-pad"
                        value={form.day1SlopeRating}
                        onChangeText={(text) => onFormChange('day1SlopeRating', text)}
                      />
                    </View>
                    <View style={[styles.fieldColumn, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>Course Rating</Text>
                      <TextInput
                        style={[styles.input, styles.twoColumnInput]}
                        placeholder="Course Rating"
                        placeholderTextColor="#999"
                        keyboardType="decimal-pad"
                        value={form.day1CourseRating}
                        onChangeText={(text) => onFormChange('day1CourseRating', text)}
                      />
                    </View>
                  </View>
                  
                  <View style={styles.holeParContainer}>
                    <Text style={styles.holeParLabel}>Par for Each Hole</Text>
                    <View style={styles.holeParRow}>
                      {Array.from({ length: 9 }, (_, i) => i + 1).map((hole) => (
                        <View key={`day1-hole-${hole}`} style={styles.holeParBox}>
                          <Text style={styles.holeParBoxLabel}>{hole}</Text>
                          <TextInput
                            ref={(ref) => { day1HoleRefs.current[hole - 1] = ref; }}
                            style={styles.holeParInput}
                            placeholder="-"
                            placeholderTextColor="#999"
                            keyboardType="number-pad"
                            maxLength={1}
                            value={form.day1HolePars?.[hole - 1] || ''}
                            onChangeText={(text) => {
                              const newPars = [...(form.day1HolePars || Array(18).fill(''))];
                              newPars[hole - 1] = text;
                              onFormChange('day1HolePars', newPars);
                              if (text && hole < 18) {
                                day1HoleRefs.current[hole]?.focus();
                              }
                            }}
                          />
                        </View>
                      ))}
                    </View>
                    <View style={styles.holeParRow}>
                      {Array.from({ length: 9 }, (_, i) => i + 10).map((hole) => (
                        <View key={`day1-hole-${hole}`} style={styles.holeParBox}>
                          <Text style={styles.holeParBoxLabel}>{hole}</Text>
                          <TextInput
                            ref={(ref) => { day1HoleRefs.current[hole - 1] = ref; }}
                            style={styles.holeParInput}
                            placeholder="-"
                            placeholderTextColor="#999"
                            keyboardType="number-pad"
                            maxLength={1}
                            value={form.day1HolePars?.[hole - 1] || ''}
                            onChangeText={(text) => {
                              const newPars = [...(form.day1HolePars || Array(18).fill(''))];
                              newPars[hole - 1] = text;
                              onFormChange('day1HolePars', newPars);
                              if (text && hole < 18) {
                                day1HoleRefs.current[hole]?.focus();
                              }
                            }}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                    </>
                  )}
                </View>
              )}

              {form.numberOfDays >= 2 && (
                <View style={styles.dayScheduleSection}>
                  <Text style={styles.dayLabel}>DAY 2</Text>
                  <View style={styles.fieldColumn}>
                    <Text style={styles.fieldLabel}>Start Type</Text>
                    {form.type === 'social' ? (
                      <View style={styles.toggleButtons}>
                        <TouchableOpacity
                          style={[styles.toggleButton, form.day2StartType === 'gala' && styles.toggleButtonActive]}
                          onPress={() => onFormChange('day2StartType', 'gala')}
                        >
                          <Text style={[styles.toggleButtonText, form.day2StartType === 'gala' && styles.toggleButtonTextActive]}>
                            Gala
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.toggleButton, form.day2StartType === 'happy-hour' && styles.toggleButtonActive]}
                          onPress={() => onFormChange('day2StartType', 'happy-hour')}
                        >
                          <Text style={[styles.toggleButtonText, form.day2StartType === 'happy-hour' && styles.toggleButtonTextActive]}>
                            Happy Hour
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.toggleButton, form.day2StartType === 'party' && styles.toggleButtonActive]}
                          onPress={() => onFormChange('day2StartType', 'party')}
                        >
                          <Text style={[styles.toggleButtonText, form.day2StartType === 'party' && styles.toggleButtonTextActive]}>
                            Party
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.toggleButtons}>
                        <TouchableOpacity
                          style={[styles.toggleButton, form.day2StartType === 'tee-time' && styles.toggleButtonActive]}
                          onPress={() => onFormChange('day2StartType', 'tee-time')}
                        >
                          <Text style={[styles.toggleButtonText, form.day2StartType === 'tee-time' && styles.toggleButtonTextActive]}>
                            Tee Time
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.toggleButton, form.day2StartType === 'shotgun' && styles.toggleButtonActive]}
                          onPress={() => onFormChange('day2StartType', 'shotgun')}
                        >
                          <Text style={[styles.toggleButtonText, form.day2StartType === 'shotgun' && styles.toggleButtonTextActive]}>
                            Shotgun
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  <View style={styles.fieldColumn}>
                    <Text style={styles.fieldLabel}>Start Time</Text>
                    <View style={styles.timeInputRow}>
                      <TextInput
                        style={[styles.input, styles.timeInput]}
                        placeholder="HH:MM"
                        placeholderTextColor="#999"
                        keyboardType="number-pad"
                        maxLength={5}
                        value={form.day2StartTime}
                        onChangeText={(text) => handleTimeChange('day2StartTime', text)}
                      />
                      <View style={styles.periodToggle}>
                        <TouchableOpacity
                          style={[styles.periodButton, form.day2StartPeriod === 'AM' && styles.periodButtonActive]}
                          onPress={() => onFormChange('day2StartPeriod', 'AM')}
                        >
                          <Text style={[styles.periodButtonText, form.day2StartPeriod === 'AM' && styles.periodButtonTextActive]}>AM</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.periodButton, form.day2StartPeriod === 'PM' && styles.periodButtonActive]}
                          onPress={() => onFormChange('day2StartPeriod', 'PM')}
                        >
                          <Text style={[styles.periodButtonText, form.day2StartPeriod === 'PM' && styles.periodButtonTextActive]}>PM</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  {form.type === 'social' && (
                    <View style={styles.fieldColumn}>
                      <Text style={styles.fieldLabel}>End Time</Text>
                      <View style={styles.timeInputRow}>
                        <TextInput
                          style={[styles.input, styles.timeInput]}
                          placeholder="HH:MM"
                          placeholderTextColor="#999"
                          keyboardType="number-pad"
                          maxLength={5}
                          value={form.day2EndTime}
                          onChangeText={(text) => handleTimeChange('day2EndTime', text)}
                        />
                        <View style={styles.periodToggle}>
                          <TouchableOpacity
                            style={[styles.periodButton, form.day2EndPeriod === 'AM' && styles.periodButtonActive]}
                            onPress={() => onFormChange('day2EndPeriod', 'AM')}
                          >
                            <Text style={[styles.periodButtonText, form.day2EndPeriod === 'AM' && styles.periodButtonTextActive]}>AM</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.periodButton, form.day2EndPeriod === 'PM' && styles.periodButtonActive]}
                            onPress={() => onFormChange('day2EndPeriod', 'PM')}
                          >
                            <Text style={[styles.periodButtonText, form.day2EndPeriod === 'PM' && styles.periodButtonTextActive]}>PM</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}
                  {form.type !== 'social' && (
                    <>
                  {form.day2StartType === 'shotgun' ? (
                    <View style={styles.threeColumnRow}>
                      <View style={[styles.fieldColumn, { flex: 2 }]}>
                        <Text style={styles.fieldLabel}>Course</Text>
                        <TextInput
                          style={[styles.input, styles.threeColumnInput]}
                          placeholder="Course"
                          placeholderTextColor="#666"
                          autoCapitalize="words"
                          value={form.day2Course}
                          onChangeText={(text) => onFormChange('day2Course', text)}
                        />
                      </View>
                      <View style={[styles.fieldColumn, { flex: 1 }]}>
                        <Text style={styles.fieldLabel}>Par#</Text>
                        <TextInput
                          style={[styles.input, styles.threeColumnInput]}
                          placeholder="Par"
                          placeholderTextColor="#999"
                          keyboardType="number-pad"
                          maxLength={2}
                          value={form.day2Par}
                          onChangeText={(text) => onFormChange('day2Par', text)}
                        />
                      </View>
                      <View style={[styles.fieldColumn, { flex: 1 }]}>
                        <Text style={styles.fieldLabel}>Leading Hole</Text>
                        <TextInput
                          style={[styles.input, styles.threeColumnInput]}
                          placeholder="Hole #"
                          placeholderTextColor="#999"
                          keyboardType="number-pad"
                          maxLength={2}
                          value={form.day2LeadingHole}
                          onChangeText={(text) => onFormChange('day2LeadingHole', text)}
                        />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.twoColumnRow}>
                      <View style={[styles.fieldColumn, { flex: 2 }]}>
                        <Text style={styles.fieldLabel}>Course</Text>
                        <TextInput
                          style={[styles.input, styles.twoColumnInput]}
                          placeholder="Course"
                          placeholderTextColor="#666"
                          autoCapitalize="words"
                          value={form.day2Course}
                          onChangeText={(text) => onFormChange('day2Course', text)}
                        />
                      </View>
                      <View style={[styles.fieldColumn, { flex: 1 }]}>
                        <Text style={styles.fieldLabel}>Par#</Text>
                        <TextInput
                          style={[styles.input, styles.twoColumnInput]}
                          placeholder="Par"
                          placeholderTextColor="#999"
                          keyboardType="number-pad"
                          maxLength={2}
                          value={form.day2Par}
                          onChangeText={(text) => onFormChange('day2Par', text)}
                        />
                      </View>
                    </View>
                  )}
                  
                  <View style={styles.twoColumnRow}>
                    <View style={[styles.fieldColumn, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>Slope Rating</Text>
                      <TextInput
                        style={[styles.input, styles.twoColumnInput]}
                        placeholder="Slope Rating"
                        placeholderTextColor="#999"
                        keyboardType="decimal-pad"
                        value={form.day2SlopeRating}
                        onChangeText={(text) => onFormChange('day2SlopeRating', text)}
                      />
                    </View>
                    <View style={[styles.fieldColumn, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>Course Rating</Text>
                      <TextInput
                        style={[styles.input, styles.twoColumnInput]}
                        placeholder="Course Rating"
                        placeholderTextColor="#999"
                        keyboardType="decimal-pad"
                        value={form.day2CourseRating}
                        onChangeText={(text) => onFormChange('day2CourseRating', text)}
                      />
                    </View>
                  </View>
                  
                  <View style={styles.holeParContainer}>
                    <Text style={styles.holeParLabel}>Par for Each Hole</Text>
                    <View style={styles.holeParRow}>
                      {Array.from({ length: 9 }, (_, i) => i + 1).map((hole) => (
                        <View key={`day2-hole-${hole}`} style={styles.holeParBox}>
                          <Text style={styles.holeParBoxLabel}>{hole}</Text>
                          <TextInput
                            ref={(ref) => { day2HoleRefs.current[hole - 1] = ref; }}
                            style={styles.holeParInput}
                            placeholder="-"
                            placeholderTextColor="#999"
                            keyboardType="number-pad"
                            maxLength={1}
                            editable={!useSameCourseDay2}
                            value={useSameCourseDay2 ? (form.day1HolePars?.[hole - 1] || '') : (form.day2HolePars?.[hole - 1] || '')}
                            onChangeText={(text) => {
                              const newPars = [...(form.day2HolePars || Array(18).fill(''))];
                              newPars[hole - 1] = text;
                              onFormChange('day2HolePars', newPars);
                              if (text && hole < 18) {
                                day2HoleRefs.current[hole]?.focus();
                              }
                            }}
                          />
                        </View>
                      ))}
                    </View>
                    <View style={styles.holeParRow}>
                      {Array.from({ length: 9 }, (_, i) => i + 10).map((hole) => (
                        <View key={`day2-hole-${hole}`} style={styles.holeParBox}>
                          <Text style={styles.holeParBoxLabel}>{hole}</Text>
                          <TextInput
                            ref={(ref) => { day2HoleRefs.current[hole - 1] = ref; }}
                            style={styles.holeParInput}
                            placeholder="-"
                            placeholderTextColor="#999"
                            keyboardType="number-pad"
                            maxLength={1}
                            editable={!useSameCourseDay2}
                            value={useSameCourseDay2 ? (form.day1HolePars?.[hole - 1] || '') : (form.day2HolePars?.[hole - 1] || '')}
                            onChangeText={(text) => {
                              const newPars = [...(form.day2HolePars || Array(18).fill(''))];
                              newPars[hole - 1] = text;
                              onFormChange('day2HolePars', newPars);
                              if (text && hole < 18) {
                                day2HoleRefs.current[hole]?.focus();
                              }
                            }}
                          />
                        </View>
                      ))}
                    </View>
                    <TouchableOpacity
                      style={[styles.fullWidthToggle, useSameCourseDay2 && styles.fullWidthToggleActive]}
                      onPress={() => {
                        const newValue = !useSameCourseDay2;
                        setUseSameCourseDay2(newValue);
                        if (newValue && form.day1HolePars) {
                          onFormChange('day2HolePars', [...form.day1HolePars]);
                        } else if (!newValue) {
                          onFormChange('day2HolePars', Array(18).fill(''));
                        }
                      }}
                    >
                      <Text style={[styles.fullWidthToggleText, useSameCourseDay2 && styles.fullWidthToggleTextActive]}>
                        Same as Day 1
                      </Text>
                    </TouchableOpacity>
                  </View>
                    </>
                  )}
                </View>
              )}

              {form.numberOfDays >= 3 && (
                <View style={styles.dayScheduleSection}>
                  <Text style={styles.dayLabel}>DAY 3</Text>
                  <View style={styles.fieldColumn}>
                    <Text style={styles.fieldLabel}>Start Type</Text>
                    {form.type === 'social' ? (
                      <View style={styles.toggleButtons}>
                        <TouchableOpacity
                          style={[styles.toggleButton, form.day3StartType === 'gala' && styles.toggleButtonActive]}
                          onPress={() => onFormChange('day3StartType', 'gala')}
                        >
                          <Text style={[styles.toggleButtonText, form.day3StartType === 'gala' && styles.toggleButtonTextActive]}>
                            Gala
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.toggleButton, form.day3StartType === 'happy-hour' && styles.toggleButtonActive]}
                          onPress={() => onFormChange('day3StartType', 'happy-hour')}
                        >
                          <Text style={[styles.toggleButtonText, form.day3StartType === 'happy-hour' && styles.toggleButtonTextActive]}>
                            Happy Hour
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.toggleButton, form.day3StartType === 'party' && styles.toggleButtonActive]}
                          onPress={() => onFormChange('day3StartType', 'party')}
                        >
                          <Text style={[styles.toggleButtonText, form.day3StartType === 'party' && styles.toggleButtonTextActive]}>
                            Party
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.toggleButtons}>
                        <TouchableOpacity
                          style={[styles.toggleButton, form.day3StartType === 'tee-time' && styles.toggleButtonActive]}
                          onPress={() => onFormChange('day3StartType', 'tee-time')}
                        >
                          <Text style={[styles.toggleButtonText, form.day3StartType === 'tee-time' && styles.toggleButtonTextActive]}>
                            Tee Time
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.toggleButton, form.day3StartType === 'shotgun' && styles.toggleButtonActive]}
                          onPress={() => onFormChange('day3StartType', 'shotgun')}
                        >
                          <Text style={[styles.toggleButtonText, form.day3StartType === 'shotgun' && styles.toggleButtonTextActive]}>
                            Shotgun
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  <View style={styles.fieldColumn}>
                    <Text style={styles.fieldLabel}>Start Time</Text>
                    <View style={styles.timeInputRow}>
                      <TextInput
                        style={[styles.input, styles.timeInput]}
                        placeholder="HH:MM"
                        placeholderTextColor="#999"
                        keyboardType="number-pad"
                        maxLength={5}
                        value={form.day3StartTime}
                        onChangeText={(text) => handleTimeChange('day3StartTime', text)}
                      />
                      <View style={styles.periodToggle}>
                        <TouchableOpacity
                          style={[styles.periodButton, form.day3StartPeriod === 'AM' && styles.periodButtonActive]}
                          onPress={() => onFormChange('day3StartPeriod', 'AM')}
                        >
                          <Text style={[styles.periodButtonText, form.day3StartPeriod === 'AM' && styles.periodButtonTextActive]}>AM</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.periodButton, form.day3StartPeriod === 'PM' && styles.periodButtonActive]}
                          onPress={() => onFormChange('day3StartPeriod', 'PM')}
                        >
                          <Text style={[styles.periodButtonText, form.day3StartPeriod === 'PM' && styles.periodButtonTextActive]}>PM</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  {form.type === 'social' && (
                    <View style={styles.fieldColumn}>
                      <Text style={styles.fieldLabel}>End Time</Text>
                      <View style={styles.timeInputRow}>
                        <TextInput
                          style={[styles.input, styles.timeInput]}
                          placeholder="HH:MM"
                          placeholderTextColor="#999"
                          keyboardType="number-pad"
                          maxLength={5}
                          value={form.day3EndTime}
                          onChangeText={(text) => handleTimeChange('day3EndTime', text)}
                        />
                        <View style={styles.periodToggle}>
                          <TouchableOpacity
                            style={[styles.periodButton, form.day3EndPeriod === 'AM' && styles.periodButtonActive]}
                            onPress={() => onFormChange('day3EndPeriod', 'AM')}
                          >
                            <Text style={[styles.periodButtonText, form.day3EndPeriod === 'AM' && styles.periodButtonTextActive]}>AM</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.periodButton, form.day3EndPeriod === 'PM' && styles.periodButtonActive]}
                            onPress={() => onFormChange('day3EndPeriod', 'PM')}
                          >
                            <Text style={[styles.periodButtonText, form.day3EndPeriod === 'PM' && styles.periodButtonTextActive]}>PM</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}
                  {form.type !== 'social' && (
                    <>
                  {form.day3StartType === 'shotgun' ? (
                    <View style={styles.threeColumnRow}>
                      <View style={[styles.fieldColumn, { flex: 2 }]}>
                        <Text style={styles.fieldLabel}>Course</Text>
                        <TextInput
                          style={[styles.input, styles.threeColumnInput]}
                          placeholder="Course"
                          placeholderTextColor="#666"
                          autoCapitalize="words"
                          value={form.day3Course}
                          onChangeText={(text) => onFormChange('day3Course', text)}
                        />
                      </View>
                      <View style={[styles.fieldColumn, { flex: 1 }]}>
                        <Text style={styles.fieldLabel}>Par#</Text>
                        <TextInput
                          style={[styles.input, styles.threeColumnInput]}
                          placeholder="Par"
                          placeholderTextColor="#999"
                          keyboardType="number-pad"
                          maxLength={2}
                          value={form.day3Par}
                          onChangeText={(text) => onFormChange('day3Par', text)}
                        />
                      </View>
                      <View style={[styles.fieldColumn, { flex: 1 }]}>
                        <Text style={styles.fieldLabel}>Leading Hole</Text>
                        <TextInput
                          style={[styles.input, styles.threeColumnInput]}
                          placeholder="Hole #"
                          placeholderTextColor="#999"
                          keyboardType="number-pad"
                          maxLength={2}
                          value={form.day3LeadingHole}
                          onChangeText={(text) => onFormChange('day3LeadingHole', text)}
                        />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.twoColumnRow}>
                      <View style={[styles.fieldColumn, { flex: 2 }]}>
                        <Text style={styles.fieldLabel}>Course</Text>
                        <TextInput
                          style={[styles.input, styles.twoColumnInput]}
                          placeholder="Course"
                          placeholderTextColor="#666"
                          autoCapitalize="words"
                          value={form.day3Course}
                          onChangeText={(text) => onFormChange('day3Course', text)}
                        />
                      </View>
                      <View style={[styles.fieldColumn, { flex: 1 }]}>
                        <Text style={styles.fieldLabel}>Par#</Text>
                        <TextInput
                          style={[styles.input, styles.twoColumnInput]}
                          placeholder="Par"
                          placeholderTextColor="#999"
                          keyboardType="number-pad"
                          maxLength={2}
                          value={form.day3Par}
                          onChangeText={(text) => onFormChange('day3Par', text)}
                        />
                      </View>
                    </View>
                  )}
                  
                  <View style={styles.twoColumnRow}>
                    <View style={[styles.fieldColumn, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>Slope Rating</Text>
                      <TextInput
                        style={[styles.input, styles.twoColumnInput]}
                        placeholder="Slope Rating"
                        placeholderTextColor="#999"
                        keyboardType="decimal-pad"
                        value={form.day3SlopeRating}
                        onChangeText={(text) => onFormChange('day3SlopeRating', text)}
                      />
                    </View>
                    <View style={[styles.fieldColumn, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>Course Rating</Text>
                      <TextInput
                        style={[styles.input, styles.twoColumnInput]}
                        placeholder="Course Rating"
                        placeholderTextColor="#999"
                        keyboardType="decimal-pad"
                        value={form.day3CourseRating}
                        onChangeText={(text) => onFormChange('day3CourseRating', text)}
                      />
                    </View>
                  </View>
                  
                  <View style={styles.holeParContainer}>
                    <View style={styles.holeParHeaderRow}>
                      <Text style={styles.holeParLabel}>Par for Each Hole</Text>
                      <TouchableOpacity
                        style={styles.sameCourseCheckbox}
                        onPress={() => {
                          const newValue = !useSameCourseDay3;
                          setUseSameCourseDay3(newValue);
                          if (newValue && form.day1HolePars) {
                            onFormChange('day3HolePars', [...form.day1HolePars]);
                          } else if (!newValue) {
                            onFormChange('day3HolePars', Array(18).fill(''));
                          }
                        }}
                      >
                        <View style={[styles.checkbox, useSameCourseDay3 && styles.checkboxChecked]}>
                          {useSameCourseDay3 && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>
                        <Text style={styles.checkboxLabel}>Same as Day 1</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.holeParRow}>
                      {Array.from({ length: 9 }, (_, i) => i + 1).map((hole) => (
                        <View key={`day3-hole-${hole}`} style={styles.holeParBox}>
                          <Text style={styles.holeParBoxLabel}>{hole}</Text>
                          <TextInput
                            ref={(ref) => { day3HoleRefs.current[hole - 1] = ref; }}
                            style={styles.holeParInput}
                            placeholder="-"
                            placeholderTextColor="#999"
                            keyboardType="number-pad"
                            maxLength={1}
                            editable={!useSameCourseDay3}
                            value={useSameCourseDay3 ? (form.day1HolePars?.[hole - 1] || '') : (form.day3HolePars?.[hole - 1] || '')}
                            onChangeText={(text) => {
                              const newPars = [...(form.day3HolePars || Array(18).fill(''))];
                              newPars[hole - 1] = text;
                              onFormChange('day3HolePars', newPars);
                              if (text && hole < 18) {
                                day3HoleRefs.current[hole]?.focus();
                              }
                            }}
                          />
                        </View>
                      ))}
                    </View>
                    <View style={styles.holeParRow}>
                      {Array.from({ length: 9 }, (_, i) => i + 10).map((hole) => (
                        <View key={`day3-hole-${hole}`} style={styles.holeParBox}>
                          <Text style={styles.holeParBoxLabel}>{hole}</Text>
                          <TextInput
                            ref={(ref) => { day3HoleRefs.current[hole - 1] = ref; }}
                            style={styles.holeParInput}
                            placeholder="-"
                            placeholderTextColor="#999"
                            keyboardType="number-pad"
                            maxLength={1}
                            editable={!useSameCourseDay3}
                            value={useSameCourseDay3 ? (form.day1HolePars?.[hole - 1] || '') : (form.day3HolePars?.[hole - 1] || '')}
                            onChangeText={(text) => {
                              const newPars = [...(form.day3HolePars || Array(18).fill(''))];
                              newPars[hole - 1] = text;
                              onFormChange('day3HolePars', newPars);
                              if (text && hole < 18) {
                                day3HoleRefs.current[hole]?.focus();
                              }
                            }}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                    </>
                  )}
                </View>
              )}

            {form.type !== 'social' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>COURSE DETAILS</Text>
              <View style={styles.twoColumnRow}>
                <View style={styles.fieldColumn}>
                  <Text style={styles.fieldLabel}>Flight A Cutoff</Text>
                  <TextInput
                    style={[styles.input, styles.twoColumnInput]}
                    placeholder="Enter cutoff"
                    placeholderTextColor="#999"
                    keyboardType="number-pad"
                    value={form.flightACutoff}
                    onChangeText={(text) => onFormChange('flightACutoff', text)}
                  />
                </View>
                <View style={styles.fieldColumn}>
                  <Text style={styles.fieldLabel}>Flight B Cutoff</Text>
                  <TextInput
                    style={[styles.input, styles.twoColumnInput]}
                    placeholder="Enter cutoff"
                    placeholderTextColor="#999"
                    keyboardType="number-pad"
                    value={form.flightBCutoff}
                    onChangeText={(text) => onFormChange('flightBCutoff', text)}
                  />
                </View>
              </View>
              <View style={styles.threeColumnRow}>
                <View style={styles.fieldColumn}>
                  <Text style={styles.fieldLabel}>Flight A Teebox</Text>
                  <TextInput
                    style={[styles.input, styles.threeColumnInput]}
                    placeholder="Teebox"
                    placeholderTextColor="#999"
                    autoCapitalize="words"
                    value={form.flightATeebox}
                    onChangeText={(text) => onFormChange('flightATeebox', text)}
                  />
                </View>
                <View style={styles.fieldColumn}>
                  <Text style={styles.fieldLabel}>Flight B Teebox</Text>
                  <TextInput
                    style={[styles.input, styles.threeColumnInput]}
                    placeholder="Teebox"
                    placeholderTextColor="#999"
                    autoCapitalize="words"
                    value={form.flightBTeebox}
                    onChangeText={(text) => onFormChange('flightBTeebox', text)}
                  />
                </View>
                <View style={styles.fieldColumn}>
                  <Text style={styles.fieldLabel}>Flight L Teebox</Text>
                  <TextInput
                    style={[styles.input, styles.threeColumnInput]}
                    placeholder="Teebox"
                    placeholderTextColor="#999"
                    autoCapitalize="words"
                    value={form.flightLTeebox}
                    onChangeText={(text) => onFormChange('flightLTeebox', text)}
                  />
                </View>
              </View>
            </View>
            )}

            {form.type !== 'social' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>PRIZE PURSE</Text>
              
              <View style={styles.flightRow}>
                <Text style={styles.flightLabel}>Flight A Trophy</Text>
                <View style={styles.prizeButtonsRow}>
                  <TouchableOpacity 
                    style={[styles.prizeButton, form.flightATrophy1st ? styles.prizeButtonActive : styles.prizeButtonInactive]}
                    onPress={() => onFormChange('flightATrophy1st', !form.flightATrophy1st)}
                  >
                    <Text style={[styles.prizeButtonText, form.flightATrophy1st && styles.prizeButtonTextActive]}>1st</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.prizeButton, form.flightATrophy2nd ? styles.prizeButtonActive : styles.prizeButtonInactive]}
                    onPress={() => onFormChange('flightATrophy2nd', !form.flightATrophy2nd)}
                  >
                    <Text style={[styles.prizeButtonText, form.flightATrophy2nd && styles.prizeButtonTextActive]}>2nd</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.prizeButton, form.flightATrophy3rd ? styles.prizeButtonActive : styles.prizeButtonInactive]}
                    onPress={() => onFormChange('flightATrophy3rd', !form.flightATrophy3rd)}
                  >
                    <Text style={[styles.prizeButtonText, form.flightATrophy3rd && styles.prizeButtonTextActive]}>3rd</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.cashPrizeRow}>
                <Text style={styles.flightLabel}>Flight A Cash Prize</Text>
                <View style={styles.cashPrizeInputsRow}>
                  <View style={styles.prizeInputColumn}>
                    <Text style={styles.prizeInputLabel}>1st</Text>
                    <TextInput
                      style={styles.prizeInput}
                      placeholder="$0"
                      placeholderTextColor="#999"
                      keyboardType="decimal-pad"
                      value={form.flightACashPrize1st || ''}
                      onChangeText={(text) => onFormChange('flightACashPrize1st', text)}
                    />
                  </View>
                  <View style={styles.prizeInputColumn}>
                    <Text style={styles.prizeInputLabel}>2nd</Text>
                    <TextInput
                      style={styles.prizeInput}
                      placeholder="$0"
                      placeholderTextColor="#999"
                      keyboardType="decimal-pad"
                      value={form.flightACashPrize2nd || ''}
                      onChangeText={(text) => onFormChange('flightACashPrize2nd', text)}
                    />
                  </View>
                  <View style={styles.prizeInputColumn}>
                    <Text style={styles.prizeInputLabel}>3rd</Text>
                    <TextInput
                      style={styles.prizeInput}
                      placeholder="$0"
                      placeholderTextColor="#999"
                      keyboardType="decimal-pad"
                      value={form.flightACashPrize3rd || ''}
                      onChangeText={(text) => onFormChange('flightACashPrize3rd', text)}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.flightRow}>
                <Text style={styles.flightLabel}>Flight B Trophy</Text>
                <View style={styles.prizeButtonsRow}>
                  <TouchableOpacity 
                    style={[styles.prizeButton, form.flightBTrophy1st ? styles.prizeButtonActive : styles.prizeButtonInactive]}
                    onPress={() => onFormChange('flightBTrophy1st', !form.flightBTrophy1st)}
                  >
                    <Text style={[styles.prizeButtonText, form.flightBTrophy1st && styles.prizeButtonTextActive]}>1st</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.prizeButton, form.flightBTrophy2nd ? styles.prizeButtonActive : styles.prizeButtonInactive]}
                    onPress={() => onFormChange('flightBTrophy2nd', !form.flightBTrophy2nd)}
                  >
                    <Text style={[styles.prizeButtonText, form.flightBTrophy2nd && styles.prizeButtonTextActive]}>2nd</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.prizeButton, form.flightBTrophy3rd ? styles.prizeButtonActive : styles.prizeButtonInactive]}
                    onPress={() => onFormChange('flightBTrophy3rd', !form.flightBTrophy3rd)}
                  >
                    <Text style={[styles.prizeButtonText, form.flightBTrophy3rd && styles.prizeButtonTextActive]}>3rd</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.cashPrizeRow}>
                <Text style={styles.flightLabel}>Flight B Cash Prize</Text>
                <View style={styles.cashPrizeInputsRow}>
                  <View style={styles.prizeInputColumn}>
                    <Text style={styles.prizeInputLabel}>1st</Text>
                    <TextInput
                      style={styles.prizeInput}
                      placeholder="$0"
                      placeholderTextColor="#999"
                      keyboardType="decimal-pad"
                      value={form.flightBCashPrize1st || ''}
                      onChangeText={(text) => onFormChange('flightBCashPrize1st', text)}
                    />
                  </View>
                  <View style={styles.prizeInputColumn}>
                    <Text style={styles.prizeInputLabel}>2nd</Text>
                    <TextInput
                      style={styles.prizeInput}
                      placeholder="$0"
                      placeholderTextColor="#999"
                      keyboardType="decimal-pad"
                      value={form.flightBCashPrize2nd || ''}
                      onChangeText={(text) => onFormChange('flightBCashPrize2nd', text)}
                    />
                  </View>
                  <View style={styles.prizeInputColumn}>
                    <Text style={styles.prizeInputLabel}>3rd</Text>
                    <TextInput
                      style={styles.prizeInput}
                      placeholder="$0"
                      placeholderTextColor="#999"
                      keyboardType="decimal-pad"
                      value={form.flightBCashPrize3rd || ''}
                      onChangeText={(text) => onFormChange('flightBCashPrize3rd', text)}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.flightRow}>
                <Text style={styles.flightLabel}>Flight C Trophy</Text>
                <View style={styles.prizeButtonsRow}>
                  <TouchableOpacity 
                    style={[styles.prizeButton, form.flightCTrophy1st ? styles.prizeButtonActive : styles.prizeButtonInactive]}
                    onPress={() => onFormChange('flightCTrophy1st', !form.flightCTrophy1st)}
                  >
                    <Text style={[styles.prizeButtonText, form.flightCTrophy1st && styles.prizeButtonTextActive]}>1st</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.prizeButton, form.flightCTrophy2nd ? styles.prizeButtonActive : styles.prizeButtonInactive]}
                    onPress={() => onFormChange('flightCTrophy2nd', !form.flightCTrophy2nd)}
                  >
                    <Text style={[styles.prizeButtonText, form.flightCTrophy2nd && styles.prizeButtonTextActive]}>2nd</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.prizeButton, form.flightCTrophy3rd ? styles.prizeButtonActive : styles.prizeButtonInactive]}
                    onPress={() => onFormChange('flightCTrophy3rd', !form.flightCTrophy3rd)}
                  >
                    <Text style={[styles.prizeButtonText, form.flightCTrophy3rd && styles.prizeButtonTextActive]}>3rd</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.cashPrizeRow}>
                <Text style={styles.flightLabel}>Flight C Cash Prize</Text>
                <View style={styles.cashPrizeInputsRow}>
                  <View style={styles.prizeInputColumn}>
                    <Text style={styles.prizeInputLabel}>1st</Text>
                    <TextInput
                      style={styles.prizeInput}
                      placeholder="$0"
                      placeholderTextColor="#999"
                      keyboardType="decimal-pad"
                      value={form.flightCCashPrize1st || ''}
                      onChangeText={(text) => onFormChange('flightCCashPrize1st', text)}
                    />
                  </View>
                  <View style={styles.prizeInputColumn}>
                    <Text style={styles.prizeInputLabel}>2nd</Text>
                    <TextInput
                      style={styles.prizeInput}
                      placeholder="$0"
                      placeholderTextColor="#999"
                      keyboardType="decimal-pad"
                      value={form.flightCCashPrize2nd || ''}
                      onChangeText={(text) => onFormChange('flightCCashPrize2nd', text)}
                    />
                  </View>
                  <View style={styles.prizeInputColumn}>
                    <Text style={styles.prizeInputLabel}>3rd</Text>
                    <TextInput
                      style={styles.prizeInput}
                      placeholder="$0"
                      placeholderTextColor="#999"
                      keyboardType="decimal-pad"
                      value={form.flightCCashPrize3rd || ''}
                      onChangeText={(text) => onFormChange('flightCCashPrize3rd', text)}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.flightRow}>
                <Text style={styles.flightLabel}>Flight L Trophy</Text>
                <View style={styles.prizeButtonsRow}>
                  <TouchableOpacity 
                    style={[styles.prizeButton, form.flightLTrophy1st ? styles.prizeButtonActive : styles.prizeButtonInactive]}
                    onPress={() => onFormChange('flightLTrophy1st', !form.flightLTrophy1st)}
                  >
                    <Text style={[styles.prizeButtonText, form.flightLTrophy1st && styles.prizeButtonTextActive]}>1st</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.prizeButton, form.flightLTrophy2nd ? styles.prizeButtonActive : styles.prizeButtonInactive]}
                    onPress={() => onFormChange('flightLTrophy2nd', !form.flightLTrophy2nd)}
                  >
                    <Text style={[styles.prizeButtonText, form.flightLTrophy2nd && styles.prizeButtonTextActive]}>2nd</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.prizeButton, form.flightLTrophy3rd ? styles.prizeButtonActive : styles.prizeButtonInactive]}
                    onPress={() => onFormChange('flightLTrophy3rd', !form.flightLTrophy3rd)}
                  >
                    <Text style={[styles.prizeButtonText, form.flightLTrophy3rd && styles.prizeButtonTextActive]}>3rd</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.cashPrizeRow}>
                <Text style={styles.flightLabel}>Flight L Cash Prize</Text>
                <View style={styles.cashPrizeInputsRow}>
                  <View style={styles.prizeInputColumn}>
                    <Text style={styles.prizeInputLabel}>1st</Text>
                    <TextInput
                      style={styles.prizeInput}
                      placeholder="$0"
                      placeholderTextColor="#999"
                      keyboardType="decimal-pad"
                      value={form.flightLCashPrize1st || ''}
                      onChangeText={(text) => onFormChange('flightLCashPrize1st', text)}
                    />
                  </View>
                  <View style={styles.prizeInputColumn}>
                    <Text style={styles.prizeInputLabel}>2nd</Text>
                    <TextInput
                      style={styles.prizeInput}
                      placeholder="$0"
                      placeholderTextColor="#999"
                      keyboardType="decimal-pad"
                      value={form.flightLCashPrize2nd || ''}
                      onChangeText={(text) => onFormChange('flightLCashPrize2nd', text)}
                    />
                  </View>
                  <View style={styles.prizeInputColumn}>
                    <Text style={styles.prizeInputLabel}>3rd</Text>
                    <TextInput
                      style={styles.prizeInput}
                      placeholder="$0"
                      placeholderTextColor="#999"
                      keyboardType="decimal-pad"
                      value={form.flightLCashPrize3rd || ''}
                      onChangeText={(text) => onFormChange('flightLCashPrize3rd', text)}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.lowGrossRow}>
                <View style={styles.lowGrossLeftColumn}>
                  <Text style={styles.flightLabel}>Low Gross Trophy</Text>
                  <TouchableOpacity 
                    style={[styles.yesNoButton, form.lowGrossTrophy ? styles.yesNoButtonActive : styles.yesNoButtonInactive]}
                    onPress={() => onFormChange('lowGrossTrophy', !form.lowGrossTrophy)}
                  >
                    <Text style={[styles.yesNoButtonText, form.lowGrossTrophy && styles.yesNoButtonTextActive]}>
                      {form.lowGrossTrophy ? 'YES' : 'NO'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.lowGrossRightColumn}>
                  <Text style={styles.flightLabel}>Cash Prize</Text>
                  <TextInput
                    style={styles.prizeInput}
                    placeholder="$0"
                    placeholderTextColor="#999"
                    keyboardType="decimal-pad"
                    value={form.lowGrossCashPrize || ''}
                    onChangeText={(text) => onFormChange('lowGrossCashPrize', text)}
                  />
                </View>
              </View>

              <View style={styles.closestToPinRow}>
                <Text style={styles.flightLabel}>Closest To Pin Cash Prize</Text>
                <TextInput
                  style={styles.prizeInput}
                  placeholder="$0"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                  value={form.closestToPin || ''}
                  onChangeText={(text) => onFormChange('closestToPin', text)}
                />
              </View>
            </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>FINAL DETAILS</Text>
              <TextInput
                style={styles.memoInput}
                placeholder="Add custom event details, notes, or special instructions... (one per line)"
                placeholderTextColor="#999"
                multiline={true}
                textAlignVertical="top"
                autoCapitalize="words"
                value={form.memo || ''}
                onChangeText={handleMemoChange}
              />
              {form.memo && form.memo.trim() && (
                <View style={styles.memoPreviewContainer}>
                  <Text style={styles.memoPreviewLabel}>Preview:</Text>
                  {form.memo.split('\n').filter(line => line.trim()).map((line, idx) => {
                    const text = line.trim().startsWith('•') ? line.trim().slice(1).trim() : line.trim();
                    return (
                      <View key={idx} style={styles.memoBulletPreview}>
                        <Text style={styles.memoBulletChar}>•</Text>
                        <Text style={styles.memoBulletText}>{text}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={onSave}>
              <Text style={styles.submitText}>{isEditing ? 'Update Event' : 'Create Event'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: '#f5f5f5' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  modalContent: { flex: 1, paddingHorizontal: 16 },
  section: { marginTop: 12, marginBottom: 6, paddingHorizontal: 8, paddingVertical: 8, backgroundColor: '#D9D9D9', borderRadius: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#1a1a1a', marginBottom: 16, letterSpacing: 0.5 },
  buttonRow: { flexDirection: 'row', gap: 8 },
  statusButton: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff', alignItems: 'center' },
  statusButtonActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  statusButtonText: { fontSize: 12, fontWeight: '700', color: '#666' },
  statusButtonTextActive: { color: '#fff' },
  typeButton: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff', alignItems: 'center' },
  typeButtonActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  typeButtonText: { fontSize: 12, fontWeight: '700', color: '#666' },
  typeButtonTextActive: { color: '#fff' },
  input: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12, fontSize: 16 },
  threeColumnRow: { flexDirection: 'row', gap: 8, marginBottom: 0 },
  threeColumnInput: { flex: 1, marginBottom: 0 },
  threeColumnInputSmall: { width: 70, marginBottom: 0 },
  fieldColumn: { flex: 1 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
  twoColumnRow: { flexDirection: 'row', gap: 8 },
  twoColumnInput: { flex: 1 },
  daysRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  daysLabel: { fontSize: 16, fontWeight: '500', color: '#1a1a1a' },
  daysButtons: { flexDirection: 'row', gap: 8 },
  dayButton: { width: 48, height: 48, borderRadius: 8, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  dayButtonActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  dayButtonText: { fontSize: 18, fontWeight: '600', color: '#666' },
  dayButtonTextActive: { color: '#fff' },
  photoSection: { marginTop: 16 },
  submitButton: { backgroundColor: '#007AFF', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginTop: 32, marginBottom: 32 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  dayScheduleSection: { marginTop: 12, marginBottom: 6, paddingHorizontal: 8, paddingVertical: 8, backgroundColor: '#D9D9D9', borderRadius: 12 },
  dayLabel: { fontSize: 14, fontWeight: '800', color: '#1a1a1a', marginBottom: 12 },
  toggleButtons: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  toggleButton: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff', alignItems: 'center' },
  toggleButtonActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  toggleButtonText: { fontSize: 14, fontWeight: '600', color: '#666' },
  toggleButtonTextActive: { color: '#fff' },
  flightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  flightLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  prizeButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  prizeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
  },
  prizeButtonActive: {
    backgroundColor: '#007AFF',
  },
  prizeButtonInactive: {
    backgroundColor: '#666666',
  },
  prizeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  prizeButtonTextActive: {
    color: '#fff',
  },
  cashPrizeRow: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cashPrizeInputsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  prizeInputColumn: {
    flex: 1,
  },
  prizeInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  prizeInput: {
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  lowGrossRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lowGrossLeftColumn: {
    flex: 0.6,
  },
  lowGrossRightColumn: {
    flex: 1,
  },
  yesNoButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  yesNoButtonActive: {
    backgroundColor: '#007AFF',
  },
  yesNoButtonInactive: {
    backgroundColor: '#666666',
  },
  yesNoButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  yesNoButtonTextActive: {
    color: '#fff',
  },
  closestToPinRow: {
    marginBottom: 0,
    paddingBottom: 0,
  },
  memoInput: {
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '400',
    color: '#1a1a1a',
    height: 100,
    marginBottom: 12,
  },
  memoPreviewContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
    marginTop: 8,
  },
  memoPreviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  memoBulletPreview: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 10,
    alignItems: 'flex-start',
  },
  memoBulletChar: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B5E20',
    marginTop: 0,
    minWidth: 18,
  },
  memoBulletText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#1a1a1a',
    flex: 1,
    lineHeight: 18,
  },
  holeParContainer: {
    marginBottom: 12,
  },
  holeParLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  holeParRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  holeParBox: {
    flex: 1,
    alignItems: 'center',
  },
  holeParBoxLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  holeParInput: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 8,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  holeParHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sameCourseCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkboxLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  sameAsDay1Row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  sameAsDay1Label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  sameAsDay1Button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#666666',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  sameAsDay1ButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  sameAsDay1ButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  sameAsDay1ButtonTextActive: {
    color: '#fff',
  },
  timeInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  timeInput: {
    flex: 1,
    marginBottom: 0,
  },
  periodToggle: {
    flexDirection: 'row',
    gap: 4,
  },
  periodButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
  },
  periodButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  fullWidthToggle: {
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#666666',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  fullWidthToggleActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  fullWidthToggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  fullWidthToggleTextActive: {
    color: '#fff',
  },
});
