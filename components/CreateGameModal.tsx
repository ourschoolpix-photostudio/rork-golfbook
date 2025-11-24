import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, ChevronDown, BookOpen } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

interface CreateGameModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (
    courseName: string,
    coursePar: number,
    holePars: number[],
    players: { name: string; handicap: number }[]
  ) => Promise<void>;
}

export default function CreateGameModal({ visible, onClose, onSave }: CreateGameModalProps) {
  const { currentUser } = useAuth();
  const [showCourseSelector, setShowCourseSelector] = useState<boolean>(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courseName, setCourseName] = useState<string>('');
  const [coursePar, setCoursePar] = useState<string>('72');
  const [holePars, setHolePars] = useState<string[]>(new Array(18).fill(''));
  const [players, setPlayers] = useState<{ name: string; handicap: string }[]>([
    { name: '', handicap: '' },
    { name: '', handicap: '' },
    { name: '', handicap: '' },
    { name: '', handicap: '' },
  ]);
  const holeInputRefs = React.useRef<(TextInput | null)[]>([]);

  const coursesQuery = trpc.courses.getAll.useQuery(
    { memberId: currentUser?.id || '' },
    { enabled: !!currentUser?.id && visible }
  );

  const courses = coursesQuery.data || [];

  const handleSelectCourse = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (course) {
      setSelectedCourseId(courseId);
      setCourseName(course.name);
      setCoursePar(course.par.toString());
      setHolePars(course.holePars.map((p: number) => p.toString()));
      setShowCourseSelector(false);
    }
  };

  const handleClearCourse = () => {
    setSelectedCourseId(null);
    setCourseName('');
    setCoursePar('72');
    setHolePars(new Array(18).fill(''));
  };

  const handleHoleParChange = (index: number, value: string) => {
    if (value.length > 1) {
      return;
    }
    const updated = [...holePars];
    updated[index] = value;
    setHolePars(updated);

    if (value.length === 1 && index < 17) {
      setTimeout(() => {
        holeInputRefs.current[index + 1]?.focus();
      }, 50);
    }
  };

  const handlePlayerNameChange = (index: number, value: string) => {
    const updated = [...players];
    updated[index] = { ...updated[index], name: value };
    setPlayers(updated);
  };

  const handlePlayerHandicapChange = (index: number, value: string) => {
    if (value === '' || /^\d*\.?\d{0,1}$/.test(value)) {
      const updated = [...players];
      updated[index] = { ...updated[index], handicap: value };
      setPlayers(updated);
    }
  };

  const handleSave = async () => {
    if (!courseName.trim()) {
      Alert.alert('Error', 'Please enter a course name');
      return;
    }

    const par = parseInt(coursePar, 10);
    if (isNaN(par) || par < 54 || par > 90) {
      Alert.alert('Error', 'Please enter a valid course par (54-90)');
      return;
    }

    const parsedHolePars = holePars.map(hp => parseInt(hp, 10));
    if (parsedHolePars.some(p => isNaN(p) || p < 3 || p > 6)) {
      Alert.alert('Error', 'All hole pars must be between 3 and 6');
      return;
    }

    const activePlayers = players.filter(p => p.name.trim() !== '');
    if (activePlayers.length === 0) {
      Alert.alert('Error', 'Please enter at least one player');
      return;
    }

    const parsedPlayers = activePlayers.map(p => ({
      name: p.name.trim(),
      handicap: parseFloat(p.handicap) || 0,
    }));

    console.log('[CreateGameModal] Creating game:', { courseName, par, parsedPlayers });

    try {
      await onSave(courseName, par, parsedHolePars, parsedPlayers);
      setSelectedCourseId(null);
      setCourseName('');
      setCoursePar('72');
      setHolePars(new Array(18).fill(''));
      setPlayers([
        { name: '', handicap: '' },
        { name: '', handicap: '' },
        { name: '', handicap: '' },
        { name: '', handicap: '' },
      ]);
      onClose();
    } catch (error) {
      console.error('[CreateGameModal] Error creating game:', error);
      Alert.alert('Error', 'Failed to create game');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Create New Game</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Course Information</Text>
              
              {courses.length > 0 && (
                <TouchableOpacity
                  style={styles.courseSelector}
                  onPress={() => setShowCourseSelector(!showCourseSelector)}
                >
                  <BookOpen size={18} color="#1B5E20" />
                  <Text style={styles.courseSelectorText}>
                    {selectedCourseId ? 'Change Course' : 'Select Saved Course'}
                  </Text>
                  <ChevronDown size={18} color="#666" />
                </TouchableOpacity>
              )}

              {showCourseSelector && (
                <View style={styles.coursesList}>
                  {coursesQuery.isLoading ? (
                    <View style={styles.coursesLoading}>
                      <ActivityIndicator size="small" color="#1B5E20" />
                    </View>
                  ) : (
                    courses.map((course) => (
                      <TouchableOpacity
                        key={course.id}
                        style={styles.courseOption}
                        onPress={() => handleSelectCourse(course.id)}
                      >
                        <Text style={styles.courseOptionName}>{course.name}</Text>
                        <Text style={styles.courseOptionPar}>Par {course.par}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}

              {selectedCourseId && (
                <View style={styles.selectedCourseBadge}>
                  <Text style={styles.selectedCourseText}>Using saved course</Text>
                  <TouchableOpacity onPress={handleClearCourse}>
                    <Text style={styles.clearCourseText}>Clear</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TextInput
                style={[styles.input, selectedCourseId && styles.inputDisabled]}
                placeholder="Course Name"
                placeholderTextColor="#999"
                value={courseName}
                onChangeText={setCourseName}
                editable={!selectedCourseId}
              />
              <TextInput
                style={[styles.input, selectedCourseId && styles.inputDisabled]}
                placeholder="Course Par"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                value={coursePar}
                onChangeText={setCoursePar}
                editable={!selectedCourseId}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hole Pars (1-18)</Text>
              {selectedCourseId && (
                <Text style={styles.holeParsNote}>Pre-filled from saved course</Text>
              )}
              <View style={styles.holeParsGrid}>
                {[0, 1, 2].map((rowIndex) => (
                  <View key={rowIndex} style={styles.holeParsRow}>
                    {holePars.slice(rowIndex * 6, rowIndex * 6 + 6).map((par, colIndex) => {
                      const index = rowIndex * 6 + colIndex;
                      return (
                        <View key={index} style={styles.holePar}>
                          <Text style={styles.holeLabel}>{index + 1}</Text>
                          <TextInput
                            ref={(ref) => {
                              holeInputRefs.current[index] = ref;
                            }}
                            style={[styles.holeInput, selectedCourseId && styles.holeInputDisabled]}
                            keyboardType="number-pad"
                            value={par}
                            onChangeText={(value) => handleHoleParChange(index, value)}
                            maxLength={1}
                            editable={!selectedCourseId}
                          />
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Players</Text>
              {players.map((player, index) => (
                <View key={index} style={styles.playerRow}>
                  <Text style={styles.playerNumber}>{index + 1}.</Text>
                  <TextInput
                    style={[styles.input, styles.playerNameInput]}
                    placeholder={`Player ${index + 1} Name`}
                    placeholderTextColor="#999"
                    value={player.name}
                    onChangeText={(value) => handlePlayerNameChange(index, value)}
                  />
                  <TextInput
                    style={[styles.input, styles.handicapInput]}
                    placeholder="HDC"
                    placeholderTextColor="#999"
                    keyboardType="decimal-pad"
                    value={player.handicap}
                    onChangeText={(value) => handlePlayerHandicapChange(index, value)}
                  />
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Create Game</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1a1a1a',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1a1a1a',
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#666',
  },
  courseSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1B5E20',
    borderRadius: 8,
    backgroundColor: '#f0f8f0',
    marginBottom: 12,
  },
  courseSelectorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1B5E20',
  },
  coursesList: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 12,
    maxHeight: 200,
  },
  coursesLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  courseOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  courseOptionName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1a1a1a',
  },
  courseOptionPar: {
    fontSize: 13,
    color: '#1B5E20',
  },
  selectedCourseBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#e8f5e9',
    borderRadius: 6,
    marginBottom: 12,
  },
  selectedCourseText: {
    fontSize: 13,
    color: '#1B5E20',
    fontWeight: '600' as const,
  },
  clearCourseText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600' as const,
  },
  holeParsNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic' as const,
    marginBottom: 8,
  },
  holeParsGrid: {
    flexDirection: 'column',
  },
  holeParsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  holePar: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  holeLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#666',
    marginBottom: 4,
  },
  holeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    width: '100%',
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  holeInputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#666',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  playerNumber: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
    width: 20,
    marginRight: 8,
  },
  playerNameInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 8,
  },
  handicapInput: {
    width: 70,
    marginBottom: 0,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    marginRight: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#666',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#1B5E20',
    alignItems: 'center',
    marginLeft: 6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
