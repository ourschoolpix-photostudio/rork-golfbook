import createContextHook from '@nkzw/create-context-hook';
import { useMemo, useCallback } from 'react';
import { Course } from '@/types';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

export const [CoursesProvider, useCourses] = createContextHook(() => {
  const { currentUser } = useAuth();

  const coursesQuery = trpc.courses.getAll.useQuery(
    currentUser?.id ? { memberId: currentUser.id } : undefined,
    { enabled: !!currentUser?.id }
  );

  const createCourseMutation = trpc.courses.create.useMutation({
    onSuccess: () => {
      coursesQuery.refetch();
    },
  });

  const updateCourseMutation = trpc.courses.update.useMutation({
    onSuccess: () => {
      coursesQuery.refetch();
    },
  });

  const deleteCourseMutation = trpc.courses.delete.useMutation({
    onSuccess: () => {
      coursesQuery.refetch();
    },
  });

  const createCourse = useCallback(async (
    name: string,
    par: number,
    holePars: number[],
    isPublic?: boolean
  ): Promise<string> => {
    if (!currentUser?.id) {
      throw new Error('User must be logged in to create a course');
    }

    const result = await createCourseMutation.mutateAsync({
      memberId: currentUser.id,
      name,
      par,
      holePars,
      isPublic: isPublic || false,
    });
    console.log('[CoursesContext] Created course:', result.id);
    return result.id;
  }, [currentUser, createCourseMutation]);

  const updateCourse = useCallback(async (
    courseId: string,
    updates: {
      name?: string;
      par?: number;
      holePars?: number[];
      isPublic?: boolean;
    }
  ) => {
    await updateCourseMutation.mutateAsync({
      courseId,
      ...updates,
    });
    console.log('[CoursesContext] Updated course:', courseId);
  }, [updateCourseMutation]);

  const deleteCourse = useCallback(async (courseId: string) => {
    await deleteCourseMutation.mutateAsync({ courseId });
    console.log('[CoursesContext] Deleted course:', courseId);
  }, [deleteCourseMutation]);

  const getCourse = useCallback((courseId: string): Course | undefined => {
    return coursesQuery.data?.find(c => c.id === courseId);
  }, [coursesQuery.data]);

  const courses = useMemo(() => coursesQuery.data || [], [coursesQuery.data]);
  const isLoading = coursesQuery.isLoading;

  const myCourses = useMemo(() => {
    return courses.filter((c: Course) => c.memberId === currentUser?.id);
  }, [courses, currentUser?.id]);

  const publicCourses = useMemo(() => {
    return courses.filter((c: Course) => c.isPublic && c.memberId !== currentUser?.id);
  }, [courses, currentUser?.id]);

  return useMemo(() => ({
    courses,
    myCourses,
    publicCourses,
    isLoading,
    createCourse,
    updateCourse,
    deleteCourse,
    getCourse,
  }), [courses, myCourses, publicCourses, isLoading, createCourse, updateCourse, deleteCourse, getCourse]);
});
