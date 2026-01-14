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
  Image,
} from 'react-native';
import { X, Plus, Edit2, Trash2, Save, Download, Camera, ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { generateText } from '@rork-ai/toolkit-sdk';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Course {
  id: string;
  name: string;
  par: number;
  holePars: number[];
  strokeIndices?: number[];
  slopeRating?: number;
  courseRating?: number;
  tipsCourseRating?: number;
  tipsSlopeRating?: number;
  menCourseRating?: number;
  menSlopeRating?: number;
  ladyCourseRating?: number;
  ladySlopeRating?: number;
  memberId: string;
  isPublic: boolean;
}

interface CoursesManagementModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CoursesManagementModal({ visible, onClose }: CoursesManagementModalProps) {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [courseName, setCourseName] = useState<string>('');
  const [holePars, setHolePars] = useState<string[]>(new Array(18).fill(''));
  const [strokeIndices, setStrokeIndices] = useState<string[]>(new Array(18).fill(''));
  const [slopeRating, setSlopeRating] = useState<string>('');
  const [courseRating, setCourseRating] = useState<string>('');
  const [tipsCourseRating, setTipsCourseRating] = useState<string>('');
  const [tipsSlopeRating, setTipsSlopeRating] = useState<string>('');
  const [menCourseRating, setMenCourseRating] = useState<string>('');
  const [menSlopeRating, setMenSlopeRating] = useState<string>('');
  const [ladyCourseRating, setLadyCourseRating] = useState<string>('');
  const [ladySlopeRating, setLadySlopeRating] = useState<string>('');
  const [courseUrl, setCourseUrl] = useState<string>('');
  const [scoreCardImage, setScoreCardImage] = useState<string | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState<boolean>(false);

  const holeInputRefs = React.useRef<(TextInput | null)[]>([]);
  const strokeIndexInputRefs = React.useRef<(TextInput | null)[]>([]);

  const coursesQuery = useQuery({
    queryKey: ['courses', currentUser?.id, 'admin'],
    queryFn: async () => {
      console.log('[CoursesManagementModal] Fetching courses for member:', currentUser?.id);
      let query = supabase.from('courses').select('*');
      
      query = query.eq('source', 'admin');
      query = query.order('name', { ascending: true });
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[CoursesManagementModal] Error fetching courses:', error);
        throw new Error(`Failed to fetch courses: ${error.message}`);
      }

      const courses = data.map(course => ({
        id: course.id,
        name: course.name,
        par: course.par,
        holePars: course.hole_pars,
        strokeIndices: course.stroke_indices,
        slopeRating: course.slope_rating,
        courseRating: course.course_rating,
        tipsCourseRating: course.tips_course_rating,
        tipsSlopeRating: course.tips_slope_rating,
        menCourseRating: course.men_course_rating,
        menSlopeRating: course.men_slope_rating,
        ladyCourseRating: course.lady_course_rating,
        ladySlopeRating: course.lady_slope_rating,
        memberId: course.member_id,
        isPublic: course.is_public,
        source: course.source,
        createdAt: course.created_at,
        updatedAt: course.updated_at,
      }));

      console.log('[CoursesManagementModal] Fetched courses:', courses.length);
      return courses;
    },
    enabled: !!currentUser?.id && visible,
  });

  const createCourseMutation = useMutation({
    mutationFn: async (input: {
      memberId: string;
      name: string;
      par: number;
      holePars: number[];
      strokeIndices?: number[];
      slopeRating?: number;
      courseRating?: number;
      tipsCourseRating?: number;
      tipsSlopeRating?: number;
      menCourseRating?: number;
      menSlopeRating?: number;
      ladyCourseRating?: number;
      ladySlopeRating?: number;
      isPublic: boolean;
      source: string;
    }) => {
      console.log('[CoursesManagementModal] Creating course:', input.name);
      
      const { data, error } = await supabase
        .from('courses')
        .insert({
          member_id: input.memberId,
          name: input.name,
          par: input.par,
          hole_pars: input.holePars,
          stroke_indices: input.strokeIndices,
          slope_rating: input.slopeRating,
          course_rating: input.courseRating,
          tips_course_rating: input.tipsCourseRating,
          tips_slope_rating: input.tipsSlopeRating,
          men_course_rating: input.menCourseRating,
          men_slope_rating: input.menSlopeRating,
          lady_course_rating: input.ladyCourseRating,
          lady_slope_rating: input.ladySlopeRating,
          is_public: input.isPublic,
          source: input.source,
        })
        .select()
        .single();

      if (error) {
        console.error('[CoursesManagementModal] Error creating course:', error);
        throw new Error(`Failed to create course: ${error.message}`);
      }

      console.log('[CoursesManagementModal] Created course:', data.id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      resetForm();
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: async (input: {
      courseId: string;
      name?: string;
      par?: number;
      holePars?: number[];
      strokeIndices?: number[];
      slopeRating?: number;
      courseRating?: number;
      tipsCourseRating?: number;
      tipsSlopeRating?: number;
      menCourseRating?: number;
      menSlopeRating?: number;
      ladyCourseRating?: number;
      ladySlopeRating?: number;
    }) => {
      console.log('[CoursesManagementModal] Updating course:', input.courseId);
      
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };
      if (input.name) updateData.name = input.name;
      if (input.par) updateData.par = input.par;
      if (input.holePars) updateData.hole_pars = input.holePars;
      if (input.strokeIndices !== undefined) updateData.stroke_indices = input.strokeIndices;
      if (input.slopeRating !== undefined) updateData.slope_rating = input.slopeRating;
      if (input.courseRating !== undefined) updateData.course_rating = input.courseRating;
      if (input.tipsCourseRating !== undefined) updateData.tips_course_rating = input.tipsCourseRating;
      if (input.tipsSlopeRating !== undefined) updateData.tips_slope_rating = input.tipsSlopeRating;
      if (input.menCourseRating !== undefined) updateData.men_course_rating = input.menCourseRating;
      if (input.menSlopeRating !== undefined) updateData.men_slope_rating = input.menSlopeRating;
      if (input.ladyCourseRating !== undefined) updateData.lady_course_rating = input.ladyCourseRating;
      if (input.ladySlopeRating !== undefined) updateData.lady_slope_rating = input.ladySlopeRating;

      const { data, error } = await supabase
        .from('courses')
        .update(updateData)
        .eq('id', input.courseId)
        .select()
        .single();

      if (error) {
        console.error('[CoursesManagementModal] Error updating course:', error);
        throw new Error(`Failed to update course: ${error.message}`);
      }

      console.log('[CoursesManagementModal] Updated course:', data.id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      resetForm();
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (input: { courseId: string }) => {
      console.log('[CoursesManagementModal] Deleting course:', input.courseId);
      
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', input.courseId);

      if (error) {
        console.error('[CoursesManagementModal] Error deleting course:', error);
        throw new Error(`Failed to delete course: ${error.message}`);
      }

      console.log('[CoursesManagementModal] Deleted course:', input.courseId);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });

  const resetForm = () => {
    setIsCreating(false);
    setEditingCourse(null);
    setCourseName('');
    setHolePars(new Array(18).fill(''));
    setStrokeIndices(new Array(18).fill(''));
    setSlopeRating('');
    setCourseRating('');
    setTipsCourseRating('');
    setTipsSlopeRating('');
    setMenCourseRating('');
    setMenSlopeRating('');
    setLadyCourseRating('');
    setLadySlopeRating('');
    setCourseUrl('');
    setScoreCardImage(null);
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setCourseName('');
    setHolePars(new Array(18).fill(''));
    setStrokeIndices(new Array(18).fill(''));
    setSlopeRating('');
    setCourseRating('');
    setTipsCourseRating('');
    setTipsSlopeRating('');
    setMenCourseRating('');
    setMenSlopeRating('');
    setLadyCourseRating('');
    setLadySlopeRating('');
    setCourseUrl('');
    setScoreCardImage(null);
  };

  const handleFetchFromUrl = async () => {
    if (!courseUrl.trim()) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }

    Alert.alert(
      'URL Import Not Available',
      'Automatic URL scraping is not currently supported. Please enter the course information manually below.\n\nTip: You can find scorecard information on the golf course\'s official website and enter the hole pars one by one.',
      [{ text: 'OK' }]
    );
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to use this feature.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setScoreCardImage(asset.uri);
        
        if (asset.base64) {
          await analyzeScoreCardImage(asset.base64, asset.mimeType || 'image/jpeg');
        }
      }
    } catch (error) {
      console.error('[CoursesManagementModal] Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow camera access to use this feature.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setScoreCardImage(asset.uri);
        
        if (asset.base64) {
          await analyzeScoreCardImage(asset.base64, asset.mimeType || 'image/jpeg');
        }
      }
    } catch (error) {
      console.error('[CoursesManagementModal] Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const analyzeScoreCardImage = async (base64Data: string, mimeType: string) => {
    setIsAnalyzingImage(true);
    console.log('[CoursesManagementModal] Analyzing scorecard image...');

    interface TeeBoxRatings {
      courseRating?: number;
      slopeRating?: number;
    }

    interface CourseData {
      courseName: string;
      holePars: number[];
      strokeIndices?: number[];
      tips?: TeeBoxRatings;
      men?: TeeBoxRatings;
      lady?: TeeBoxRatings;
    }

    try {
      const responseText = await generateText({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this golf course scorecard image and extract the following information. Return ONLY a valid JSON object with no additional text:

{
  "courseName": "Name of the golf course",
  "holePars": [par1, par2, ..., par18],
  "strokeIndices": [si1, si2, ..., si18],
  "tips": { "courseRating": 74.5, "slopeRating": 135 },
  "men": { "courseRating": 72.3, "slopeRating": 128 },
  "lady": { "courseRating": 70.1, "slopeRating": 118 }
}

IMPORTANT - Tee Box Ratings:
- Golf scorecards typically show multiple tee boxes with different ratings
- "tips" = Back tees (longest, most difficult) - often labeled as "Black", "Tips", "Championship", "Back", or the longest yardage
- "men" = Middle tees (standard men's tees) - often labeled as "White", "Blue", "Men", "Regular", or middle yardage
- "lady" = Forward tees (shortest) - often labeled as "Red", "Gold", "Ladies", "Forward", or shortest yardage
- Look for Course Rating (CR) and Slope Rating (SR) values next to each tee box row
- Course Rating is typically 67-77 (decimal like 72.3)
- Slope Rating is typically 100-155 (whole number like 128)
- Extract ALL tee box ratings you can find in the image

Rules:
- holePars must be an array of exactly 18 numbers (each between 3-6)
- strokeIndices is optional, if visible include all 18 values (1-18, where 1 = hardest hole)
- If only 9 holes visible, duplicate them to make 18
- Make reasonable assumptions if values are unclear
- Include ALL tee box ratings visible on the scorecard`,
              },
              {
                type: 'image',
                image: `data:${mimeType};base64,${base64Data}`,
              },
            ],
          },
        ],
      });

      console.log('[CoursesManagementModal] Raw response:', responseText);

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const result = JSON.parse(jsonMatch[0]) as CourseData;
      console.log('[CoursesManagementModal] Parsed result:', result);

      if (result.courseName) {
        setCourseName(result.courseName);
      }

      if (result.holePars && result.holePars.length === 18) {
        setHolePars(result.holePars.map((p: number) => p.toString()));
      }

      if (result.strokeIndices && result.strokeIndices.length === 18) {
        setStrokeIndices(result.strokeIndices.map((si: number) => si.toString()));
      }

      if (result.tips?.courseRating) {
        setTipsCourseRating(result.tips.courseRating.toString());
      }
      if (result.tips?.slopeRating) {
        setTipsSlopeRating(result.tips.slopeRating.toString());
      }

      if (result.men?.courseRating) {
        setMenCourseRating(result.men.courseRating.toString());
      }
      if (result.men?.slopeRating) {
        setMenSlopeRating(result.men.slopeRating.toString());
      }

      if (result.lady?.courseRating) {
        setLadyCourseRating(result.lady.courseRating.toString());
      }
      if (result.lady?.slopeRating) {
        setLadySlopeRating(result.lady.slopeRating.toString());
      }

      const extractedRatings: string[] = [];
      if (result.tips?.courseRating || result.tips?.slopeRating) extractedRatings.push('Tips');
      if (result.men?.courseRating || result.men?.slopeRating) extractedRatings.push('Men');
      if (result.lady?.courseRating || result.lady?.slopeRating) extractedRatings.push('Lady');

      const ratingsMsg = extractedRatings.length > 0 
        ? `\n\nTee box ratings found: ${extractedRatings.join(', ')}` 
        : '\n\nNo tee box ratings were detected. You may need to enter them manually.';

      Alert.alert(
        'Success',
        `Extracted course information for "${result.courseName || 'Unknown Course'}". Please review and adjust the values if needed.${ratingsMsg}`
      );
    } catch (error) {
      console.error('[CoursesManagementModal] Error analyzing image:', error);
      Alert.alert(
        'Analysis Failed',
        'Could not extract course information from the image. Please ensure the image clearly shows a golf scorecard and try again, or enter the information manually.'
      );
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const handleStartEdit = (course: Course) => {
    setEditingCourse(course);
    setCourseName(course.name);
    setHolePars(course.holePars.map(p => p.toString()));
    const indices = new Array(18).fill('');
    if (course.strokeIndices && course.strokeIndices.length === 18) {
      course.strokeIndices.forEach((si, i) => {
        indices[i] = si.toString();
      });
    }
    setStrokeIndices(indices);
    setSlopeRating(course.slopeRating ? course.slopeRating.toString() : '');
    setCourseRating(course.courseRating ? course.courseRating.toString() : '');
    setTipsCourseRating(course.tipsCourseRating ? course.tipsCourseRating.toString() : '');
    setTipsSlopeRating(course.tipsSlopeRating ? course.tipsSlopeRating.toString() : '');
    setMenCourseRating(course.menCourseRating ? course.menCourseRating.toString() : '');
    setMenSlopeRating(course.menSlopeRating ? course.menSlopeRating.toString() : '');
    setLadyCourseRating(course.ladyCourseRating ? course.ladyCourseRating.toString() : '');
    setLadySlopeRating(course.ladySlopeRating ? course.ladySlopeRating.toString() : '');
  };

  const handleSave = async () => {
    // Clear temporary fetch fields before saving
    setScoreCardImage(null);
    setCourseUrl('');

    if (!courseName.trim()) {
      Alert.alert('Error', 'Please enter a course name');
      return;
    }

    const parsedHolePars = holePars.map(hp => parseInt(hp, 10));
    if (parsedHolePars.some(p => isNaN(p) || p < 3 || p > 6)) {
      Alert.alert('Error', 'All hole pars must be between 3 and 6');
      return;
    }

    const parsedStrokeIndices = strokeIndices
      .map(si => {
        const trimmed = si.trim();
        if (!trimmed) return null;
        const parsed = parseInt(trimmed, 10);
        return isNaN(parsed) ? null : parsed;
      })
      .filter((si): si is number => si !== null);

    if (parsedStrokeIndices.length > 0) {
      if (parsedStrokeIndices.some(si => isNaN(si) || si < 1 || si > 18)) {
        Alert.alert('Error', 'Stroke indices must be between 1 and 18');
        return;
      }

      const uniqueIndices = new Set(parsedStrokeIndices);
      if (uniqueIndices.size !== parsedStrokeIndices.length) {
        Alert.alert('Error', 'Stroke indices must be unique');
        return;
      }

      if (parsedStrokeIndices.length !== 18) {
        Alert.alert('Error', 'Please enter stroke indices for all 18 holes or leave them all empty');
        return;
      }
    }

    const parsedSlopeRating = slopeRating.trim() ? parseFloat(slopeRating) : undefined;
    const parsedCourseRating = courseRating.trim() ? parseFloat(courseRating) : undefined;
    const parsedTipsCourseRating = tipsCourseRating.trim() ? parseFloat(tipsCourseRating) : undefined;
    const parsedTipsSlopeRating = tipsSlopeRating.trim() ? parseFloat(tipsSlopeRating) : undefined;
    const parsedMenCourseRating = menCourseRating.trim() ? parseFloat(menCourseRating) : undefined;
    const parsedMenSlopeRating = menSlopeRating.trim() ? parseFloat(menSlopeRating) : undefined;
    const parsedLadyCourseRating = ladyCourseRating.trim() ? parseFloat(ladyCourseRating) : undefined;
    const parsedLadySlopeRating = ladySlopeRating.trim() ? parseFloat(ladySlopeRating) : undefined;

    if (parsedSlopeRating !== undefined && (isNaN(parsedSlopeRating) || parsedSlopeRating < 55 || parsedSlopeRating > 155)) {
      Alert.alert('Error', 'Slope rating must be between 55 and 155');
      return;
    }

    if (parsedCourseRating !== undefined && (isNaN(parsedCourseRating) || parsedCourseRating < 60 || parsedCourseRating > 80)) {
      Alert.alert('Error', 'Course rating must be between 60 and 80');
      return;
    }

    const validateTeeRatings = (name: string, course?: number, slope?: number) => {
      if (slope !== undefined && (isNaN(slope) || slope < 55 || slope > 155)) {
        Alert.alert('Error', `${name} slope rating must be between 55 and 155`);
        return false;
      }
      if (course !== undefined && (isNaN(course) || course < 60 || course > 80)) {
        Alert.alert('Error', `${name} course rating must be between 60 and 80`);
        return false;
      }
      return true;
    };

    if (!validateTeeRatings('Tips', parsedTipsCourseRating, parsedTipsSlopeRating)) return;
    if (!validateTeeRatings('Men', parsedMenCourseRating, parsedMenSlopeRating)) return;
    if (!validateTeeRatings('Lady', parsedLadyCourseRating, parsedLadySlopeRating)) return;

    const totalPar = parsedHolePars.reduce((sum, par) => sum + par, 0);

    try {
      if (editingCourse) {
        await updateCourseMutation.mutateAsync({
          courseId: editingCourse.id,
          name: courseName,
          par: totalPar,
          holePars: parsedHolePars,
          strokeIndices: parsedStrokeIndices.length === 18 ? parsedStrokeIndices : undefined,
          slopeRating: parsedSlopeRating,
          courseRating: parsedCourseRating,
          tipsCourseRating: parsedTipsCourseRating,
          tipsSlopeRating: parsedTipsSlopeRating,
          menCourseRating: parsedMenCourseRating,
          menSlopeRating: parsedMenSlopeRating,
          ladyCourseRating: parsedLadyCourseRating,
          ladySlopeRating: parsedLadySlopeRating,
        });
        console.log('[CoursesManagementModal] Updated course:', editingCourse.id);
      } else {
        await createCourseMutation.mutateAsync({
          memberId: currentUser?.id || '',
          name: courseName,
          par: totalPar,
          holePars: parsedHolePars,
          strokeIndices: parsedStrokeIndices.length === 18 ? parsedStrokeIndices : undefined,
          slopeRating: parsedSlopeRating,
          courseRating: parsedCourseRating,
          tipsCourseRating: parsedTipsCourseRating,
          tipsSlopeRating: parsedTipsSlopeRating,
          menCourseRating: parsedMenCourseRating,
          menSlopeRating: parsedMenSlopeRating,
          ladyCourseRating: parsedLadyCourseRating,
          ladySlopeRating: parsedLadySlopeRating,
          isPublic: false,
          source: 'admin',
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

  const handleStrokeIndexChange = (index: number, value: string) => {
    if (value.length > 2) {
      return;
    }
    const updated = [...strokeIndices];
    updated[index] = value;
    setStrokeIndices(updated);

    if (value.length === 2 && index < 17) {
      setTimeout(() => {
        strokeIndexInputRefs.current[index + 1]?.focus();
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
                  <Text style={styles.sectionTitle}>Import from Photo</Text>
                  <Text style={styles.sectionDescription}>
                    Take a photo or select an image of a scorecard to automatically extract course information.
                  </Text>
                  
                  <View style={styles.imageImportRow}>
                    <TouchableOpacity
                      style={[styles.imageButton, isAnalyzingImage && styles.imageButtonDisabled]}
                      onPress={handleTakePhoto}
                      disabled={isAnalyzingImage}
                    >
                      <Camera size={20} color={isAnalyzingImage ? '#999' : '#1B5E20'} />
                      <Text style={[styles.imageButtonText, isAnalyzingImage && styles.imageButtonTextDisabled]}>Take Photo</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.imageButton, isAnalyzingImage && styles.imageButtonDisabled]}
                      onPress={handlePickImage}
                      disabled={isAnalyzingImage}
                    >
                      <ImageIcon size={20} color={isAnalyzingImage ? '#999' : '#1B5E20'} />
                      <Text style={[styles.imageButtonText, isAnalyzingImage && styles.imageButtonTextDisabled]}>Choose Image</Text>
                    </TouchableOpacity>
                  </View>

                  {isAnalyzingImage && (
                    <View style={styles.analyzingContainer}>
                      <ActivityIndicator size="small" color="#1B5E20" />
                      <Text style={styles.analyzingText}>Analyzing scorecard...</Text>
                    </View>
                  )}

                  {scoreCardImage && !isAnalyzingImage && (
                    <View style={styles.imagePreviewContainer}>
                      <Image source={{ uri: scoreCardImage }} style={styles.imagePreview} resizeMode="contain" />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => setScoreCardImage(null)}
                      >
                        <X size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Import from URL (Optional)</Text>
                  <Text style={styles.sectionDescription}>
                    URL import is not currently available. Please enter course information manually below.
                  </Text>
                  <View style={styles.urlRow}>
                    <TextInput
                      style={[styles.input, styles.urlInput]}
                      placeholder="https://golfcourse.com/scorecard"
                      placeholderTextColor="#999"
                      value={courseUrl}
                      onChangeText={setCourseUrl}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                    />
                    <TouchableOpacity
                      style={styles.fetchButton}
                      onPress={handleFetchFromUrl}
                    >
                      <Download size={16} color="#fff" />
                      <Text style={styles.fetchButtonText}>Info</Text>
                    </TouchableOpacity>
                  </View>
                </View>

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

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Tee Box Ratings (Optional)</Text>
                  <Text style={styles.sectionDescription}>
                    Enter course rating and slope for each tee box. Tips = Back tees, Men = Middle tees, Lady = Forward tees.
                  </Text>
                  
                  <View style={styles.teeBoxSection}>
                    <Text style={styles.teeBoxLabel}>Tips (Back Tees)</Text>
                    <View style={styles.ratingRow}>
                      <View style={styles.ratingInput}>
                        <Text style={styles.ratingLabel}>Course Rating</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="e.g., 74.5"
                          placeholderTextColor="#999"
                          keyboardType="decimal-pad"
                          value={tipsCourseRating}
                          onChangeText={setTipsCourseRating}
                        />
                      </View>
                      <View style={styles.ratingInput}>
                        <Text style={styles.ratingLabel}>Slope Rating</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="e.g., 135"
                          placeholderTextColor="#999"
                          keyboardType="decimal-pad"
                          value={tipsSlopeRating}
                          onChangeText={setTipsSlopeRating}
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.teeBoxSection}>
                    <Text style={styles.teeBoxLabel}>Men (Middle Tees)</Text>
                    <View style={styles.ratingRow}>
                      <View style={styles.ratingInput}>
                        <Text style={styles.ratingLabel}>Course Rating</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="e.g., 72.3"
                          placeholderTextColor="#999"
                          keyboardType="decimal-pad"
                          value={menCourseRating}
                          onChangeText={setMenCourseRating}
                        />
                      </View>
                      <View style={styles.ratingInput}>
                        <Text style={styles.ratingLabel}>Slope Rating</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="e.g., 128"
                          placeholderTextColor="#999"
                          keyboardType="decimal-pad"
                          value={menSlopeRating}
                          onChangeText={setMenSlopeRating}
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.teeBoxSection}>
                    <Text style={styles.teeBoxLabel}>Lady (Forward Tees)</Text>
                    <View style={styles.ratingRow}>
                      <View style={styles.ratingInput}>
                        <Text style={styles.ratingLabel}>Course Rating</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="e.g., 70.1"
                          placeholderTextColor="#999"
                          keyboardType="decimal-pad"
                          value={ladyCourseRating}
                          onChangeText={setLadyCourseRating}
                        />
                      </View>
                      <View style={styles.ratingInput}>
                        <Text style={styles.ratingLabel}>Slope Rating</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="e.g., 118"
                          placeholderTextColor="#999"
                          keyboardType="decimal-pad"
                          value={ladySlopeRating}
                          onChangeText={setLadySlopeRating}
                        />
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Stroke Indices (Optional)</Text>
                  <Text style={styles.sectionDescription}>
                    Enter difficulty index for each hole (1-18, where 1 = hardest hole).
                    Leave empty if not needed.
                  </Text>
                  <View style={styles.holeParsGrid}>
                    {[0, 1, 2].map((rowIndex) => (
                      <View key={rowIndex} style={styles.holeParsRow}>
                        {strokeIndices.slice(rowIndex * 6, rowIndex * 6 + 6).map((strokeIndex, colIndex) => {
                          const index = rowIndex * 6 + colIndex;
                          return (
                            <View key={index} style={styles.holePar}>
                              <Text style={styles.holeLabel}>{index + 1}</Text>
                              <TextInput
                                ref={(ref) => {
                                  strokeIndexInputRefs.current[index] = ref;
                                }}
                                style={styles.holeInput}
                                keyboardType="number-pad"
                                value={strokeIndex}
                                onChangeText={(value) => handleStrokeIndexChange(index, value)}
                                maxLength={2}
                                placeholder="-"
                                placeholderTextColor="#ccc"
                              />
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>
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
                      Create courses to save time when creating games. You will not have to enter hole pars every time!
                    </Text>
                  </View>
                ) : (
                  courses.map((course) => (
                    <View key={course.id} style={styles.courseCard}>
                      <View style={styles.courseHeader}>
                        <View style={styles.courseInfo}>
                          <Text style={styles.courseName}>{course.name}</Text>
                          <Text style={styles.coursePar}>Par {course.par}</Text>
                          {(course.tipsCourseRating || course.tipsSlopeRating || course.menCourseRating || course.menSlopeRating || course.ladyCourseRating || course.ladySlopeRating) && (
                            <View style={styles.teeRatingsPreview}>
                              {(course.tipsCourseRating || course.tipsSlopeRating) && (
                                <Text style={styles.courseDetails}>
                                  Tips: {course.tipsCourseRating || '-'}/{course.tipsSlopeRating || '-'}
                                </Text>
                              )}
                              {(course.menCourseRating || course.menSlopeRating) && (
                                <Text style={styles.courseDetails}>
                                  Men: {course.menCourseRating || '-'}/{course.menSlopeRating || '-'}
                                </Text>
                              )}
                              {(course.ladyCourseRating || course.ladySlopeRating) && (
                                <Text style={styles.courseDetails}>
                                  Lady: {course.ladyCourseRating || '-'}/{course.ladySlopeRating || '-'}
                                </Text>
                              )}
                            </View>
                          )}
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
  sectionDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    lineHeight: 18,
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
  ratingRow: {
    flexDirection: 'row',
    gap: 12,
  },
  ratingInput: {
    flex: 1,
  },
  ratingLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#666',
    marginBottom: 8,
  },
  teeBoxSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#1B5E20',
  },
  teeBoxLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#1B5E20',
    marginBottom: 10,
  },
  teeRatingsPreview: {
    marginTop: 4,
  },
  courseDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  urlRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'stretch',
  },
  urlInput: {
    flex: 1,
  },
  fetchButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  fetchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  imageImportRow: {
    flexDirection: 'row',
    gap: 12,
  },
  imageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#1B5E20',
    backgroundColor: '#f0f7f0',
  },
  imageButtonDisabled: {
    borderColor: '#ccc',
    backgroundColor: '#f5f5f5',
  },
  imageButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1B5E20',
  },
  imageButtonTextDisabled: {
    color: '#999',
  },
  analyzingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: '#f0f7f0',
    borderRadius: 8,
  },
  analyzingText: {
    fontSize: 14,
    color: '#1B5E20',
    fontWeight: '500' as const,
  },
  imagePreviewContainer: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
