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
import { X, Plus, Edit2, Trash2, Save } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

interface Course {
  id: string;
  name: string;
  par: number;
  holePars: number[];
  memberId: string;
  isPublic: boolean;
}

interface CoursesManagementModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CoursesManagementModal({ visible, onClose }: CoursesManagementModalProps) {
  const { currentUser } = useAuth();
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [courseName, setCourseName] = useState<string>('');
  const [holePars, setHolePars] = useState<string[]>(new Array(18).fill(''));
  const holeInputRefs = React.useRef<(TextInput | null)[]>([]);

  const coursesQuery = trpc.courses.getAll.useQuery(
    { memberId: currentUser?.id || '' },
    { enabled: !!currentUser?.id && visible }
  );

  const createCourseMutation = trpc.courses.create.useMutation({
    onSuccess: () => {
      coursesQuery.refetch();
      resetForm();
    },
  });

  const updateCourseMutation = trpc.courses.update.useMutation({
    onSuccess: () => {
      coursesQuery.refetch();
      resetForm();
    },
  });

  const deleteCourseMutation = trpc.courses.delete.useMutation({
    onSuccess: () => {
      coursesQuery.refetch();
    },
  });

  const resetForm = () => {
    setIsCreating(false);
    setEditingCourse(null);
    setCourseName('');
    setHolePars(new Array(18).fill(''));
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setCourseName('');
    setHolePars(new Array(18).fill(''));
  };

  const handleStartEdit = (course: Course) => {
    setEditingCourse(course);
    setCourseName(course.name);
    setHolePars(course.holePars.map(p => p.toString()));
  };

  const handleSave = async () => {
    if (!courseName.trim()) {
      Alert.alert('Error', 'Please enter a course name');
      return;
    }

    const parsedHolePars = holePars.map(hp => parseInt(hp, 10));
    if (parsedHolePars.some(p => isNaN(p) || p < 3 || p > 6)) {
      Alert.alert('Error', 'All hole pars must be between 3 and 6');
      return;
    }

    const totalPar = parsedHolePars.reduce((sum, par) => sum + par, 0);

    try {
      if (editingCourse) {
        await updateCourseMutation.mutateAsync({
          courseId: editingCourse.id,
          name: courseName,
          par: totalPar,
          holePars: parsedHolePars,
        });
        console.log('[CoursesManagementModal] Updated course:', editingCourse.id);
      } else {
        await createCourseMutation.mutateAsync({
          memberId: currentUser?.id || '',
          name: courseName,
          par: totalPar,
          holePars: parsedHolePars,
          isPublic: false,
        });
        console.log('[CoursesManagementModal] Created course');
      }
    } catch (error) {
      console.error('[CoursesManagementModal] Error saving course:', error);
      Alert.alert('Error', 'Failed to save course');
    }
  };

  const handleDelete = (courseId: string, courseName: string) => {
    Alert.alert(
      'Delete Course',
      `Are you sure you want to delete "${courseName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCourseMutation.mutateAsync({ courseId });
              console.log('[CoursesManagementModal] Deleted course:', courseId);
            } catch (error) {
              console.error('[CoursesManagementModal] Error deleting course:', error);
              Alert.alert('Error', 'Failed to delete course');
            }
          },
        },
      ]
    );
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

  const isFormVisible = isCreating || editingCourse;
  const courses = coursesQuery.data || [];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {isFormVisible ? (editingCourse ? 'Edit Course' : 'New Course') : 'My Courses'}
            </Text>
            <TouchableOpacity onPress={() => {
              resetForm();
              onClose();
            }}>
              <X size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {isFormVisible ? (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Course Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Pebble Beach, Augusta National"
                    placeholderTextColor="#999"
                    value={courseName}
                    onChangeText={setCourseName}
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
                  <Text style={styles.totalPar}>
                    Total Par: {holePars.reduce((sum, p) => sum + (parseInt(p, 10) || 0), 0)}
                  </Text>
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={resetForm}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSave}
                    disabled={createCourseMutation.isPending || updateCourseMutation.isPending}
                  >
                    {createCourseMutation.isPending || updateCourseMutation.isPending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Save size={18} color="#fff" />
                        <Text style={styles.saveButtonText}>Save Course</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {coursesQuery.isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#1B5E20" />
                  </View>
                ) : courses.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No courses saved yet</Text>
                    <Text style={styles.emptyDescription}>
                      Create courses to save time when creating games.
                      You won&apos;t have to enter hole pars every time!
                    </Text>
                  </View>
                ) : (
                  courses.map((course) => (
                    <View key={course.id} style={styles.courseCard}>
                      <View style={styles.courseHeader}>
                        <View style={styles.courseInfo}>
                          <Text style={styles.courseName}>{course.name}</Text>
                          <Text style={styles.coursePar}>Par {course.par}</Text>
                        </View>
                        <View style={styles.courseActions}>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleStartEdit(course)}
                          >
                            <Edit2 size={18} color="#007AFF" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleDelete(course.id, course.name)}
                          >
                            <Trash2 size={18} color="#FF3B30" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={styles.holeParsPreview}>
                        {course.holePars.slice(0, 9).map((par: number, i: number) => (
                          <Text key={i} style={styles.holeParsPreviewText}>{par}</Text>
                        ))}
                      </View>
                      <View style={styles.holeParsPreview}>
                        {course.holePars.slice(9, 18).map((par: number, i: number) => (
                          <Text key={i} style={styles.holeParsPreviewText}>{par}</Text>
                        ))}
                      </View>
                    </View>
                  ))
                )}

                <TouchableOpacity
                  style={styles.addCourseButton}
                  onPress={handleStartCreate}
                >
                  <Plus size={20} color="#1B5E20" />
                  <Text style={styles.addCourseButtonText}>Add New Course</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
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
  totalPar: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1B5E20',
    textAlign: 'center',
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
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
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  courseCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  coursePar: {
    fontSize: 13,
    color: '#1B5E20',
    fontWeight: '600' as const,
  },
  courseActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  holeParsPreview: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  holeParsPreviewText: {
    fontSize: 12,
    color: '#666',
    width: 24,
    textAlign: 'center',
  },
  addCourseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#1B5E20',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addCourseButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1B5E20',
  },
});
