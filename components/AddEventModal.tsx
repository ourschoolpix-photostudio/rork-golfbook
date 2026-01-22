import React, { useState } from 'react';
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
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { photoService } from '@/utils/photoService';
import { supabase } from '@/integrations/supabase/client';

interface AddEventModalProps {
  visible: boolean;
  isEditing: boolean;
  form: {
    status: 'upcoming' | 'active' | 'complete';
    type: 'tournament' | 'team' | 'social';
    eventName: string;
    entryFee: string;
    course: string;
    address: string;
    city: string;
    state: string;
    zipcode: string;
    package1Name: string;
    package1Price: string;
    package1Description: string;
    package2Name: string;
    package2Price: string;
    package2Description: string;
    package3Name: string;
    package3Price: string;
    package3Description: string;
    specialNotes: string;
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
    day1CourseId?: string;
    day1TeeBox?: 'tips' | 'men' | 'lady';
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
    day2CourseId?: string;
    day2TeeBox?: 'tips' | 'men' | 'lady';
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
    day3CourseId?: string;
    day3TeeBox?: 'tips' | 'men' | 'lady';
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
    numberOfTeams?: string;
    teamCaptains?: string[];
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
  const [showCourseDropdown1, setShowCourseDropdown1] = useState(false);
  const [showCourseDropdown2, setShowCourseDropdown2] = useState(false);
  const [showCourseDropdown3, setShowCourseDropdown3] = useState(false);
  
  const [adminCourses, setAdminCourses] = React.useState<any[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = React.useState(false);

  React.useEffect(() => {
    const fetchCourses = async () => {
      setIsLoadingCourses(true);
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .order('name', { ascending: true });
        
        if (error) throw error;
        setAdminCourses(data || []);
        console.log('[AddEventModal] Fetched courses:', data?.length);
        if (data && data.length > 0) {
          console.log('[AddEventModal] Sample course data:', data[0]);
          console.log('[AddEventModal] Course fields:', Object.keys(data[0]));
        }
      } catch (error) {
        console.error('[AddEventModal] Error fetching courses:', error);
        setAdminCourses([]);
      } finally {
        setIsLoadingCourses(false);
      }
    };
    
    if (visible) {
      fetchCourses();
    }
  }, [visible]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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

  const handleCourseSelect = (day: 1 | 2 | 3, courseId: string, overrideTeeBox?: 'tips' | 'men' | 'lady') => {
    const course = adminCourses.find((c: any) => c.id === courseId);
    if (!course) {
      console.log('[AddEventModal] ❌ Course not found for ID:', courseId);
      return;
    }

    console.log('[AddEventModal] ✅ Selected course:', course.name);
    console.log('[AddEventModal] 📊 Available ratings:', {
      tips: { slope: course.tips_slope_rating, rating: course.tips_course_rating },
      men: { slope: course.men_slope_rating, rating: course.men_course_rating },
      lady: { slope: course.lady_slope_rating, rating: course.lady_course_rating },
      default: { slope: course.slope_rating, rating: course.course_rating },
    });

    const prefix = `day${day}` as 'day1' | 'day2' | 'day3';
    const teeBoxKey = `${prefix}TeeBox` as 'day1TeeBox' | 'day2TeeBox' | 'day3TeeBox';
    const currentTeeBox = overrideTeeBox || form[teeBoxKey] || 'men';
    
    let slopeRating: number | undefined;
    let courseRating: number | undefined;
    
    if (currentTeeBox === 'tips') {
      slopeRating = course.tips_slope_rating || course.slope_rating;
      courseRating = course.tips_course_rating || course.course_rating;
    } else if (currentTeeBox === 'lady') {
      slopeRating = course.lady_slope_rating || course.slope_rating;
      courseRating = course.lady_course_rating || course.course_rating;
    } else {
      slopeRating = course.men_slope_rating || course.slope_rating;
      courseRating = course.men_course_rating || course.course_rating;
    }
    
    console.log('[AddEventModal] 🎯 Using tee box:', currentTeeBox);
    console.log('[AddEventModal] 🎯 Selected slope rating:', slopeRating);
    console.log('[AddEventModal] 🎯 Selected course rating:', courseRating);
    
    onFormChange(`${prefix}CourseId`, courseId);
    onFormChange(`${prefix}Course`, course.name);
    onFormChange(`${prefix}Par`, course.par?.toString() || '');
    onFormChange(`${prefix}SlopeRating`, slopeRating?.toString() || '');
    onFormChange(`${prefix}CourseRating`, courseRating?.toString() || '');
    onFormChange(teeBoxKey, currentTeeBox);
    
    if (course.hole_pars && course.hole_pars.length === 18) {
      onFormChange(`${prefix}HolePars`, course.hole_pars.map((p: number) => p.toString()));
    }

    setShowCourseDropdown1(false);
    setShowCourseDropdown2(false);
    setShowCourseDropdown3(false);
    
    console.log('[AddEventModal] ✅ Course selection complete');
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
                  style={[styles.typeButton, form.type === 'team' && styles.typeButtonActive]}
                  onPress={() => onFormChange('type', 'team')}
                >
                  <Text style={[styles.typeButtonText, form.type === 'team' && styles.typeButtonTextActive]}>
                    TEAM
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

            {form.type === 'team' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>TEAM DETAILS</Text>
                <View style={styles.fieldColumn}>
                  <Text style={styles.fieldLabel}>Number of Teams</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter number of teams"
                    placeholderTextColor="#666"
                    keyboardType="number-pad"
                    value={form.numberOfTeams || ''}
                    onChangeText={(text) => {
                      const numericValue = text.replace(/[^0-9]/g, '');
                      onFormChange('numberOfTeams', numericValue);
                      const numTeams = parseInt(numericValue) || 0;
                      const currentCaptains = form.teamCaptains || [];
                      if (numTeams > currentCaptains.length) {
                        const newCaptains = [...currentCaptains];
                        for (let i = currentCaptains.length; i < numTeams; i++) {
                          newCaptains.push('');
                        }
                        onFormChange('teamCaptains', newCaptains);
                      } else if (numTeams < currentCaptains.length) {
                        onFormChange('teamCaptains', currentCaptains.slice(0, numTeams));
                      }
                    }}
                  />
                </View>
                {form.numberOfTeams && parseInt(form.numberOfTeams) > 0 && (
                  <View style={styles.teamCaptainsContainer}>
                    <Text style={styles.teamCaptainsLabel}>Team Captains</Text>
                    {Array.from({ length: parseInt(form.numberOfTeams) || 0 }).map((_, index) => (
                      <View key={index} style={styles.teamCaptainRow}>
                        <Text style={styles.teamCaptainLabel}>Team {index + 1}:</Text>
                        <TextInput
                          style={styles.teamCaptainInput}
                          placeholder="Captain's name"
                          placeholderTextColor="#999"
                          autoCapitalize="words"
                          value={(form.teamCaptains && form.teamCaptains[index]) || ''}
                          onChangeText={(text) => {
                            const newCaptains = [...(form.teamCaptains || [])];
                            newCaptains[index] = text;
                            onFormChange('teamCaptains', newCaptains);
                          }}
                        />
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>VENUE</Text>
              <TextInput
                style={styles.input}
                placeholder="Event Name"
                placeholderTextColor="#666"
                autoCapitalize="words"
                value={form.eventName}
                onChangeText={(text) => onFormChange('eventName', text)}
              />
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

            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>PACKAGE INFORMATION</Text>
              
              <View style={styles.packageContainer}>
                <Text style={styles.packageLabel}>Package 1</Text>
                <View style={styles.twoColumnRow}>
                  <TextInput
                    style={[styles.input, styles.twoColumnInput]}
                    placeholder="Package Name"
                    placeholderTextColor="#666"
                    autoCapitalize="words"
                    value={form.package1Name}
                    onChangeText={(text) => onFormChange('package1Name', text)}
                  />
                  <TextInput
                    style={[styles.input, styles.twoColumnInput]}
                    placeholder="Price"
                    placeholderTextColor="#666"
                    keyboardType="decimal-pad"
                    value={form.package1Price ? `${form.package1Price}` : ''}
                    onChangeText={(text) => {
                      const numericValue = text.replace(/[^0-9.]/g, '');
                      const parts = numericValue.split('.');
                      const formattedValue = parts.length > 2 
                        ? parts[0] + '.' + parts.slice(1).join('')
                        : numericValue;
                      onFormChange('package1Price', formattedValue);
                    }}
                  />
                </View>
                <TextInput
                  style={styles.packageDescriptionInput}
                  placeholder="What's included? (e.g., Golf, Cart, Lunch)"
                  placeholderTextColor="#666"
                  multiline
                  textAlignVertical="top"
                  value={form.package1Description}
                  onChangeText={(text) => onFormChange('package1Description', text)}
                />
              </View>

              <View style={styles.packageContainer}>
                <Text style={styles.packageLabel}>Package 2 (Optional)</Text>
                <View style={styles.twoColumnRow}>
                  <TextInput
                    style={[styles.input, styles.twoColumnInput]}
                    placeholder="Package Name"
                    placeholderTextColor="#666"
                    autoCapitalize="words"
                    value={form.package2Name}
                    onChangeText={(text) => onFormChange('package2Name', text)}
                  />
                  <TextInput
                    style={[styles.input, styles.twoColumnInput]}
                    placeholder="Price"
                    placeholderTextColor="#666"
                    keyboardType="decimal-pad"
                    value={form.package2Price ? `${form.package2Price}` : ''}
                    onChangeText={(text) => {
                      const numericValue = text.replace(/[^0-9.]/g, '');
                      const parts = numericValue.split('.');
                      const formattedValue = parts.length > 2 
                        ? parts[0] + '.' + parts.slice(1).join('')
                        : numericValue;
                      onFormChange('package2Price', formattedValue);
                    }}
                  />
                </View>
                <TextInput
                  style={styles.packageDescriptionInput}
                  placeholder="What's included?"
                  placeholderTextColor="#666"
                  multiline
                  textAlignVertical="top"
                  value={form.package2Description}
                  onChangeText={(text) => onFormChange('package2Description', text)}
                />
              </View>

              <View style={styles.packageContainer}>
                <Text style={styles.packageLabel}>Package 3 (Optional)</Text>
                <View style={styles.twoColumnRow}>
                  <TextInput
                    style={[styles.input, styles.twoColumnInput]}
                    placeholder="Package Name"
                    placeholderTextColor="#666"
                    autoCapitalize="words"
                    value={form.package3Name}
                    onChangeText={(text) => onFormChange('package3Name', text)}
                  />
                  <TextInput
                    style={[styles.input, styles.twoColumnInput]}
                    placeholder="Price"
                    placeholderTextColor="#666"
                    keyboardType="decimal-pad"
                    value={form.package3Price ? `${form.package3Price}` : ''}
                    onChangeText={(text) => {
                      const numericValue = text.replace(/[^0-9.]/g, '');
                      const parts = numericValue.split('.');
                      const formattedValue = parts.length > 2 
                        ? parts[0] + '.' + parts.slice(1).join('')
                        : numericValue;
                      onFormChange('package3Price', formattedValue);
                    }}
                  />
                </View>
                <TextInput
                  style={styles.packageDescriptionInput}
                  placeholder="What's included?"
                  placeholderTextColor="#666"
                  multiline
                  textAlignVertical="top"
                  value={form.package3Description}
                  onChangeText={(text) => onFormChange('package3Description', text)}
                />
              </View>

              <View style={styles.packageContainer}>
                <Text style={styles.packageLabel}>Special Notes (Optional)</Text>
                <TextInput
                  style={styles.packageDescriptionInput}
                  placeholder="Any special notes or instructions for all packages"
                  placeholderTextColor="#666"
                  multiline
                  textAlignVertical="top"
                  value={form.specialNotes}
                  onChangeText={(text) => onFormChange('specialNotes', text)}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>EVENT PHOTO</Text>
              <View style={styles.photoSection}>
                <TouchableOpacity 
                  style={styles.photoPickerButton} 
                  onPress={async () => {
                    try {
                      if (Platform.OS !== 'web') {
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status !== 'granted') {
                          Alert.alert('Permission Required', 'Please allow access to your photo library');
                          return;
                        }
                      }

                      const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: 'images',
                        allowsEditing: true,
                        aspect: [4, 3],
                        quality: 0.8,
                      });

                      if (!result.canceled && result.assets[0]) {
                        setUploadingPhoto(true);
                        const eventId = isEditing ? form.eventName.replace(/\s+/g, '-') : `event-${Date.now()}`;
                        const photoUrl = await photoService.uploadPhoto(result.assets[0], eventId, false);
                        onFormChange('photoUrl', photoUrl);
                        setUploadingPhoto(false);
                      }
                    } catch (error: any) {
                      setUploadingPhoto(false);
                      Alert.alert('Upload Failed', error.message || 'Failed to upload photo');
                      console.error('Photo upload error:', error);
                    }
                  }}
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? (
                    <View style={styles.photoPickerContent}>
                      <ActivityIndicator size="small" color="#007AFF" />
                      <Text style={styles.photoPickerText}>Uploading...</Text>
                    </View>
                  ) : form.photoUrl ? (
                    <View style={styles.photoPickerContent}>
                      <Image source={{ uri: form.photoUrl }} style={styles.photoPreview} />
                      <Text style={styles.photoPickerText}>Tap to change photo</Text>
                    </View>
                  ) : (
                    <View style={styles.photoPickerContent}>
                      <Ionicons name="camera" size={32} color="#007AFF" />
                      <Text style={styles.photoPickerText}>Tap to add event photo</Text>
                    </View>
                  )}
                </TouchableOpacity>
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
                  <View style={styles.teeBoxSection}>
                    <Text style={styles.teeBoxSectionLabel}>Select Tee Box (affects slope & rating)</Text>
                    <View style={styles.teeBoxButtons}>
                      <TouchableOpacity
                        style={[styles.teeBoxButton, form.day1TeeBox === 'tips' && styles.teeBoxButtonActive]}
                        onPress={() => {
                          console.log('[AddEventModal] Day 1 - Switching to Tips tee box');
                          onFormChange('day1TeeBox', 'tips');
                          if (form.day1CourseId) {
                            handleCourseSelect(1, form.day1CourseId, 'tips');
                          }
                        }}
                      >
                        <Text style={[styles.teeBoxButtonText, form.day1TeeBox === 'tips' && styles.teeBoxButtonTextActive]}>Tips</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.teeBoxButton, (form.day1TeeBox === 'men' || !form.day1TeeBox) && styles.teeBoxButtonActive]}
                        onPress={() => {
                          console.log('[AddEventModal] Day 1 - Switching to Men tee box');
                          onFormChange('day1TeeBox', 'men');
                          if (form.day1CourseId) {
                            handleCourseSelect(1, form.day1CourseId, 'men');
                          }
                        }}
                      >
                        <Text style={[styles.teeBoxButtonText, (form.day1TeeBox === 'men' || !form.day1TeeBox) && styles.teeBoxButtonTextActive]}>Men</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.teeBoxButton, form.day1TeeBox === 'lady' && styles.teeBoxButtonActive]}
                        onPress={() => {
                          console.log('[AddEventModal] Day 1 - Switching to Lady tee box');
                          onFormChange('day1TeeBox', 'lady');
                          if (form.day1CourseId) {
                            handleCourseSelect(1, form.day1CourseId, 'lady');
                          }
                        }}
                      >
                        <Text style={[styles.teeBoxButtonText, form.day1TeeBox === 'lady' && styles.teeBoxButtonTextActive]}>Lady</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.fieldColumn}>
                    <Text style={styles.fieldLabel}>Select Course</Text>
                    <TouchableOpacity
                      style={styles.courseDropdownButton}
                      onPress={() => setShowCourseDropdown1(!showCourseDropdown1)}
                    >
                      <Text style={styles.courseDropdownButtonText}>
                        {form.day1Course || 'Select a course...'}
                      </Text>
                      <Ionicons name={showCourseDropdown1 ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
                    </TouchableOpacity>
                    {showCourseDropdown1 && (
                      <View style={styles.courseDropdownList}>
                        <ScrollView style={styles.courseDropdownScroll} nestedScrollEnabled>
                          {isLoadingCourses ? (
                            <Text style={styles.courseDropdownItem}>Loading courses...</Text>
                          ) : adminCourses.length === 0 ? (
                            <Text style={styles.courseDropdownItem}>No courses available</Text>
                          ) : (
                            adminCourses.map((course) => (
                              <TouchableOpacity
                                key={course.id}
                                style={styles.courseDropdownItem}
                                onPress={() => handleCourseSelect(1, course.id)}
                              >
                                <Text style={styles.courseDropdownItemText}>{course.name}</Text>
                                <Text style={styles.courseDropdownItemSubtext}>Par {course.par}</Text>
                              </TouchableOpacity>
                            ))
                          )}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                  {form.day1StartType === 'shotgun' && (
                    <View style={styles.fieldColumn}>
                      <Text style={styles.fieldLabel}>Leading Hole</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Hole #"
                        placeholderTextColor="#999"
                        keyboardType="number-pad"
                        maxLength={2}
                        value={form.day1LeadingHole}
                        onChangeText={(text) => onFormChange('day1LeadingHole', text)}
                      />
                    </View>
                  )}
                  {form.day1Course && (
                    <View style={styles.courseInfoBox}>
                      <Text style={styles.courseInfoText}>📍 {form.day1Course}</Text>
                      <Text style={styles.courseInfoText}>⛳ Par: {form.day1Par || 'N/A'}</Text>
                      <Text style={styles.courseInfoText}>📊 Slope: {form.day1SlopeRating || 'N/A'} | Rating: {form.day1CourseRating || 'N/A'}</Text>
                      <Text style={styles.courseInfoText}>🎯 Tee Box: {form.day1TeeBox || 'men'}</Text>
                    </View>
                  )}
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
                  <View style={styles.teeBoxSection}>
                    <Text style={styles.teeBoxSectionLabel}>Select Tee Box (affects slope & rating)</Text>
                    <View style={styles.teeBoxButtons}>
                      <TouchableOpacity
                        style={[styles.teeBoxButton, form.day2TeeBox === 'tips' && styles.teeBoxButtonActive]}
                        onPress={() => {
                          console.log('[AddEventModal] Day 2 - Switching to Tips tee box');
                          onFormChange('day2TeeBox', 'tips');
                          if (form.day2CourseId) {
                            handleCourseSelect(2, form.day2CourseId, 'tips');
                          }
                        }}
                      >
                        <Text style={[styles.teeBoxButtonText, form.day2TeeBox === 'tips' && styles.teeBoxButtonTextActive]}>Tips</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.teeBoxButton, (form.day2TeeBox === 'men' || !form.day2TeeBox) && styles.teeBoxButtonActive]}
                        onPress={() => {
                          console.log('[AddEventModal] Day 2 - Switching to Men tee box');
                          onFormChange('day2TeeBox', 'men');
                          if (form.day2CourseId) {
                            handleCourseSelect(2, form.day2CourseId, 'men');
                          }
                        }}
                      >
                        <Text style={[styles.teeBoxButtonText, (form.day2TeeBox === 'men' || !form.day2TeeBox) && styles.teeBoxButtonTextActive]}>Men</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.teeBoxButton, form.day2TeeBox === 'lady' && styles.teeBoxButtonActive]}
                        onPress={() => {
                          console.log('[AddEventModal] Day 2 - Switching to Lady tee box');
                          onFormChange('day2TeeBox', 'lady');
                          if (form.day2CourseId) {
                            handleCourseSelect(2, form.day2CourseId, 'lady');
                          }
                        }}
                      >
                        <Text style={[styles.teeBoxButtonText, form.day2TeeBox === 'lady' && styles.teeBoxButtonTextActive]}>Lady</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.fieldColumn}>
                    <Text style={styles.fieldLabel}>Select Course</Text>
                    <TouchableOpacity
                      style={styles.courseDropdownButton}
                      onPress={() => setShowCourseDropdown2(!showCourseDropdown2)}
                    >
                      <Text style={styles.courseDropdownButtonText}>
                        {form.day2Course || 'Select a course...'}
                      </Text>
                      <Ionicons name={showCourseDropdown2 ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
                    </TouchableOpacity>
                    {showCourseDropdown2 && (
                      <View style={styles.courseDropdownList}>
                        <ScrollView style={styles.courseDropdownScroll} nestedScrollEnabled>
                          {isLoadingCourses ? (
                            <Text style={styles.courseDropdownItem}>Loading courses...</Text>
                          ) : adminCourses.length === 0 ? (
                            <Text style={styles.courseDropdownItem}>No courses available</Text>
                          ) : (
                            adminCourses.map((course) => (
                              <TouchableOpacity
                                key={course.id}
                                style={styles.courseDropdownItem}
                                onPress={() => handleCourseSelect(2, course.id)}
                              >
                                <Text style={styles.courseDropdownItemText}>{course.name}</Text>
                                <Text style={styles.courseDropdownItemSubtext}>Par {course.par}</Text>
                              </TouchableOpacity>
                            ))
                          )}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                  {form.day2StartType === 'shotgun' && (
                    <View style={styles.fieldColumn}>
                      <Text style={styles.fieldLabel}>Leading Hole</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Hole #"
                        placeholderTextColor="#999"
                        keyboardType="number-pad"
                        maxLength={2}
                        value={form.day2LeadingHole}
                        onChangeText={(text) => onFormChange('day2LeadingHole', text)}
                      />
                    </View>
                  )}
                  {form.day2Course && (
                    <View style={styles.courseInfoBox}>
                      <Text style={styles.courseInfoText}>📍 {form.day2Course}</Text>
                      <Text style={styles.courseInfoText}>⛳ Par: {form.day2Par || 'N/A'}</Text>
                      <Text style={styles.courseInfoText}>📊 Slope: {form.day2SlopeRating || 'N/A'} | Rating: {form.day2CourseRating || 'N/A'}</Text>
                      <Text style={styles.courseInfoText}>🎯 Tee Box: {form.day2TeeBox || 'men'}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[styles.fullWidthToggle, useSameCourseDay2 && styles.fullWidthToggleActive]}
                    onPress={() => {
                      const newValue = !useSameCourseDay2;
                      setUseSameCourseDay2(newValue);
                      if (newValue && form.day1CourseId) {
                        handleCourseSelect(2, form.day1CourseId);
                      }
                    }}
                  >
                    <Text style={[styles.fullWidthToggleText, useSameCourseDay2 && styles.fullWidthToggleTextActive]}>
                      Same as Day 1
                    </Text>
                  </TouchableOpacity>
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
                  <View style={styles.teeBoxSection}>
                    <Text style={styles.teeBoxSectionLabel}>Select Tee Box (affects slope & rating)</Text>
                    <View style={styles.teeBoxButtons}>
                      <TouchableOpacity
                        style={[styles.teeBoxButton, form.day3TeeBox === 'tips' && styles.teeBoxButtonActive]}
                        onPress={() => {
                          console.log('[AddEventModal] Day 3 - Switching to Tips tee box');
                          onFormChange('day3TeeBox', 'tips');
                          if (form.day3CourseId) {
                            handleCourseSelect(3, form.day3CourseId, 'tips');
                          }
                        }}
                      >
                        <Text style={[styles.teeBoxButtonText, form.day3TeeBox === 'tips' && styles.teeBoxButtonTextActive]}>Tips</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.teeBoxButton, (form.day3TeeBox === 'men' || !form.day3TeeBox) && styles.teeBoxButtonActive]}
                        onPress={() => {
                          console.log('[AddEventModal] Day 3 - Switching to Men tee box');
                          onFormChange('day3TeeBox', 'men');
                          if (form.day3CourseId) {
                            handleCourseSelect(3, form.day3CourseId, 'men');
                          }
                        }}
                      >
                        <Text style={[styles.teeBoxButtonText, (form.day3TeeBox === 'men' || !form.day3TeeBox) && styles.teeBoxButtonTextActive]}>Men</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.teeBoxButton, form.day3TeeBox === 'lady' && styles.teeBoxButtonActive]}
                        onPress={() => {
                          console.log('[AddEventModal] Day 3 - Switching to Lady tee box');
                          onFormChange('day3TeeBox', 'lady');
                          if (form.day3CourseId) {
                            handleCourseSelect(3, form.day3CourseId, 'lady');
                          }
                        }}
                      >
                        <Text style={[styles.teeBoxButtonText, form.day3TeeBox === 'lady' && styles.teeBoxButtonTextActive]}>Lady</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.fieldColumn}>
                    <Text style={styles.fieldLabel}>Select Course</Text>
                    <TouchableOpacity
                      style={styles.courseDropdownButton}
                      onPress={() => setShowCourseDropdown3(!showCourseDropdown3)}
                    >
                      <Text style={styles.courseDropdownButtonText}>
                        {form.day3Course || 'Select a course...'}
                      </Text>
                      <Ionicons name={showCourseDropdown3 ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
                    </TouchableOpacity>
                    {showCourseDropdown3 && (
                      <View style={styles.courseDropdownList}>
                        <ScrollView style={styles.courseDropdownScroll} nestedScrollEnabled>
                          {isLoadingCourses ? (
                            <Text style={styles.courseDropdownItem}>Loading courses...</Text>
                          ) : adminCourses.length === 0 ? (
                            <Text style={styles.courseDropdownItem}>No courses available</Text>
                          ) : (
                            adminCourses.map((course) => (
                              <TouchableOpacity
                                key={course.id}
                                style={styles.courseDropdownItem}
                                onPress={() => handleCourseSelect(3, course.id)}
                              >
                                <Text style={styles.courseDropdownItemText}>{course.name}</Text>
                                <Text style={styles.courseDropdownItemSubtext}>Par {course.par}</Text>
                              </TouchableOpacity>
                            ))
                          )}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                  {form.day3StartType === 'shotgun' && (
                    <View style={styles.fieldColumn}>
                      <Text style={styles.fieldLabel}>Leading Hole</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Hole #"
                        placeholderTextColor="#999"
                        keyboardType="number-pad"
                        maxLength={2}
                        value={form.day3LeadingHole}
                        onChangeText={(text) => onFormChange('day3LeadingHole', text)}
                      />
                    </View>
                  )}
                  {form.day3Course && (
                    <View style={styles.courseInfoBox}>
                      <Text style={styles.courseInfoText}>📍 {form.day3Course}</Text>
                      <Text style={styles.courseInfoText}>⛳ Par: {form.day3Par || 'N/A'}</Text>
                      <Text style={styles.courseInfoText}>📊 Slope: {form.day3SlopeRating || 'N/A'} | Rating: {form.day3CourseRating || 'N/A'}</Text>
                      <Text style={styles.courseInfoText}>🎯 Tee Box: {form.day3TeeBox || 'men'}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[styles.fullWidthToggle, useSameCourseDay3 && styles.fullWidthToggleActive]}
                    onPress={() => {
                      const newValue = !useSameCourseDay3;
                      setUseSameCourseDay3(newValue);
                      if (newValue && form.day1CourseId) {
                        handleCourseSelect(3, form.day1CourseId);
                      }
                    }}
                  >
                    <Text style={[styles.fullWidthToggleText, useSameCourseDay3 && styles.fullWidthToggleTextActive]}>
                      Same as Day 1
                    </Text>
                  </TouchableOpacity>
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
  photoPickerButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  photoPickerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPickerText: {
    marginTop: 8,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600' as const,
  },
  photoPreview: {
    width: 120,
    height: 90,
    borderRadius: 8,
  },
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
  courseDropdownButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseDropdownButtonText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  courseDropdownList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 200,
    marginBottom: 12,
  },
  courseDropdownScroll: {
    maxHeight: 200,
  },
  courseDropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  courseDropdownItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  courseDropdownItemSubtext: {
    fontSize: 13,
    color: '#666',
  },
  courseInfoBox: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  courseInfoText: {
    fontSize: 13,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  packageContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  packageLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  packageDescriptionInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 0,
    fontSize: 14,
    minHeight: 80,
  },
  teeBoxButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  teeBoxButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  teeBoxButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  teeBoxButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  teeBoxButtonTextActive: {
    color: '#fff',
  },
  teeBoxSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  teeBoxSectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  teamCaptainsContainer: {
    marginTop: 8,
  },
  teamCaptainsLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  teamCaptainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  teamCaptainLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    width: 70,
  },
  teamCaptainInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
});
