import { publicProcedure, createTRPCRouter } from "@/backend/trpc/create-context";
import { z } from "zod";

export const sendRegistrationEmailProcedure = publicProcedure
  .input(z.object({
    email: z.string().email(),
    playerName: z.string(),
    eventName: z.string(),
    venue: z.string(),
    eventDate: z.string(),
    entryFee: z.string(),
    paymentDeadline: z.string(),
  }))
  .mutation(async ({ input }) => {
    console.log('📧 Sending registration email to:', input.email);
    
    console.log('✅ Email sent successfully (simulated)');
    return { success: true };
  });

export default createTRPCRouter({
  sendEmail: sendRegistrationEmailProcedure,
});
