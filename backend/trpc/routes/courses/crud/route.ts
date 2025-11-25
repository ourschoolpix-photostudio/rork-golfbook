import { publicProcedure, createTRPCRouter } from "@/backend/trpc/create-context";
import { z } from "zod";



const getAllProcedure = publicProcedure
  .input(z.object({ 
    memberId: z.string(),
    source: z.enum(['admin', 'personal', 'all']).optional(),
  }).optional())
  .query(async ({ ctx, input }) => {
    try {
      console.log('[Courses tRPC] Getting courses for member:', input?.memberId, 'source:', input?.source);
      
      let query = ctx.supabase.from('courses').select('*');
      
      if (input?.source === 'admin') {
        query = query.eq('source_type', 'admin');
      } else if (input?.source === 'personal') {
        if (input?.memberId) {
          query = query.eq('source_type', 'personal').eq('member_id', input.memberId);
        } else {
          query = query.eq('source_type', 'personal');
        }
      } else {
        if (input?.memberId) {
          query = query.or(`source_type.eq.admin,and(source_type.eq.personal,member_id.eq.${input.memberId})`);
        } else {
          query = query.eq('source_type', 'admin');
        }
      }
      
      query = query.order('name', { ascending: true });
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[Courses tRPC] Error fetching courses:', error);
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
        memberId: course.member_id,
        isPublic: course.is_public,
        source: course.source_type,
        createdAt: course.created_at,
        updatedAt: course.updated_at,
      }));

      console.log('[Courses tRPC] Fetched courses:', courses.length);
      return courses;
    } catch (error) {
      console.error('[Courses tRPC] Error in getAll:', error);
      throw error;
    }
  });

const createProcedure = publicProcedure
  .input(z.object({
    memberId: z.string(),
    name: z.string(),
    par: z.number(),
    holePars: z.array(z.number()),
    strokeIndices: z.array(z.number()).optional(),
    slopeRating: z.number().optional(),
    courseRating: z.number().optional(),
    isPublic: z.boolean().optional(),
    source: z.enum(['admin', 'personal']).optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    try {
      console.log('[Courses tRPC] Creating course:', input.name, 'source:', input.source || 'personal');
      
      const { data, error } = await ctx.supabase
        .from('courses')
        .insert({
          member_id: input.memberId,
          name: input.name,
          par: input.par,
          hole_pars: input.holePars,
          stroke_indices: input.strokeIndices,
          slope_rating: input.slopeRating,
          course_rating: input.courseRating,
          is_public: input.isPublic || false,
          source_type: input.source || 'personal',
        })
        .select()
        .single();

      if (error) {
        console.error('[Courses tRPC] Error creating course:', error);
        throw new Error(`Failed to create course: ${error.message}`);
      }

      console.log('[Courses tRPC] Created course:', data.id);
      return {
        id: data.id,
        name: data.name,
        par: data.par,
        holePars: data.hole_pars,
        strokeIndices: data.stroke_indices,
        slopeRating: data.slope_rating,
        courseRating: data.course_rating,
        memberId: data.member_id,
        isPublic: data.is_public,
        source: data.source_type,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('[Courses tRPC] Error in create:', error);
      throw error;
    }
  });

const updateProcedure = publicProcedure
  .input(z.object({
    courseId: z.string(),
    name: z.string().optional(),
    par: z.number().optional(),
    holePars: z.array(z.number()).optional(),
    strokeIndices: z.array(z.number()).optional(),
    slopeRating: z.number().optional(),
    courseRating: z.number().optional(),
    isPublic: z.boolean().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    try {
      console.log('[Courses tRPC] Updating course:', input.courseId);
      
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };
      if (input.name) updateData.name = input.name;
      if (input.par) updateData.par = input.par;
      if (input.holePars) updateData.hole_pars = input.holePars;
      if (input.strokeIndices !== undefined) updateData.stroke_indices = input.strokeIndices;
      if (input.slopeRating !== undefined) updateData.slope_rating = input.slopeRating;
      if (input.courseRating !== undefined) updateData.course_rating = input.courseRating;
      if (input.isPublic !== undefined) updateData.is_public = input.isPublic;

      const { data, error } = await ctx.supabase
        .from('courses')
        .update(updateData)
        .eq('id', input.courseId)
        .select()
        .single();

      if (error) {
        console.error('[Courses tRPC] Error updating course:', error);
        throw new Error(`Failed to update course: ${error.message}`);
      }

      console.log('[Courses tRPC] Updated course:', data.id);
      return {
        id: data.id,
        name: data.name,
        par: data.par,
        holePars: data.hole_pars,
        strokeIndices: data.stroke_indices,
        slopeRating: data.slope_rating,
        courseRating: data.course_rating,
        memberId: data.member_id,
        isPublic: data.is_public,
        source: data.source_type,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('[Courses tRPC] Error in update:', error);
      throw error;
    }
  });

const deleteProcedure = publicProcedure
  .input(z.object({ courseId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    try {
      console.log('[Courses tRPC] Deleting course:', input.courseId);
      
      const { error } = await ctx.supabase
        .from('courses')
        .delete()
        .eq('id', input.courseId);

      if (error) {
        console.error('[Courses tRPC] Error deleting course:', error);
        throw new Error(`Failed to delete course: ${error.message}`);
      }

      console.log('[Courses tRPC] Deleted course:', input.courseId);
      return { success: true };
    } catch (error) {
      console.error('[Courses tRPC] Error in delete:', error);
      throw error;
    }
  });

export const coursesCrudRoute = createTRPCRouter({
  getAll: getAllProcedure,
  create: createProcedure,
  update: updateProcedure,
  delete: deleteProcedure,
});

export default coursesCrudRoute;
