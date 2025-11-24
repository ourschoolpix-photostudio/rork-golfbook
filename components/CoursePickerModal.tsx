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
} from 'react-native';
import { X, Plus, ChevronRight } from 'lucide-react-native';
import { Course } from '@/types';

interface CoursePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCourse: (course: Course) => void;
  onCreateNew: (name: string, par: number, holePars: number[]) => Promise<void>;
  myCourses: Course[];
  publicCourses: Course[];
}

export default function CoursePickerModal({
  visible,
  onClose,
  onSelectCourse,
  onCreateNew,
  myCourses,
  publicCourses,
}: CoursePickerModalProps) {
  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [courseName, setCourseName] = useState<string>('');
  const [coursePar, setCoursePar] = useState<string>('72');
  const [holePars, setHolePars] = useState<string[]>(new Array(18).fill(''));
  const holeInputRefs = React.useRef<(TextInput | null)[]>([]);

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

  const handleCreateCourse = async () => {
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

    console.log('[CoursePickerModal] Creating course:', courseName);

    try {
      await onCreateNew(courseName, par, parsedHolePars);
      setCourseName('');
      setCoursePar('72');
      setHolePars(new Array(18).fill(''));
      setMode('select');
    } catch (error) {
      console.error('[CoursePickerModal] Error creating course:', error);
      Alert.alert('Error', 'Failed to create course');
    }
  };

  const handleClose = () => {
    setMode('select');
    onClose();
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
            <Text style={styles.title}>
              {mode === 'select' ? 'Select Course' : 'Create New Course'}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <X size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {mode === 'select' ? (
            <>
              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {myCourses.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>My Courses</Text>
                    {myCourses.map((course) => (
                      <TouchableOpacity
                        key={course.id}
                        style={styles.courseCard}
                        onPress={() => {
                          onSelectCourse(course);
                          handleClose();
                        }}
                      >
                        <View style={styles.courseInfo}>
                          <Text style={styles.courseName}>{course.name}</Text>
                          <Text style={styles.coursePar}>Par {course.par}</Text>
                        </View>
                        <ChevronRight size={20} color="#9CA3AF" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {publicCourses.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Public Courses</Text>
                    {publicCourses.map((course) => (
                      <TouchableOpacity
                        key={course.id}
                        style={styles.courseCard}
                        onPress={() => {
                          onSelectCourse(course);
                          handleClose();
                        }}
                      >
                        <View style={styles.courseInfo}>
                          <Text style={styles.courseName}>{course.name}</Text>
                          <Text style={styles.coursePar}>Par {course.par}</Text>
                        </View>
                        <ChevronRight size={20} color="#9CA3AF" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {myCourses.length === 0 && publicCourses.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No courses available</Text>
                    <Text style={styles.emptySubtext}>Create your first course to get started</Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={() => setMode('create')}
                >
                  <View style={styles.createButtonContent}>
                    <Plus size={20} color="#fff" />
                    <Text style={styles.createButtonText}>Create New Course</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Course Information</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Course Name"
                    placeholderTextColor="#999"
                    value={courseName}
                    onChangeText={setCourseName}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Course Par"
                    placeholderTextColor="#999"
                    keyboardType="number-pad"
                    value={coursePar}
                    onChangeText={setCoursePar}
                  />
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Hole Pars (1-18)</Text>
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
                                style={styles.holeInput}
                                keyboardType="number-pad"
                                value={par}
                                onChangeText={(value) => handleHoleParChange(index, value)}
                                maxLength={1}
                              />
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>

              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setMode('select')}
                >
                  <Text style={styles.cancelButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleCreateCourse}
                >
                  <Text style={styles.saveButtonText}>Save Course</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
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
  courseCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  coursePar: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
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
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  createButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#1B5E20',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  createButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
    marginLeft: 8,
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
