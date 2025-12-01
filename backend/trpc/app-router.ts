import { createTRPCRouter } from "@/backend/trpc/create-context";
import hiRoute from "@/backend/trpc/routes/example/hi/route";
import { syncMembersProcedure, getSyncStatusProcedure } from "@/backend/trpc/routes/sync/members/route";
import { syncEventProcedure } from "@/backend/trpc/routes/sync/events/route";
import { syncGroupingsProcedure, getGroupingsProcedure } from "@/backend/trpc/routes/sync/groupings/route";
import { submitScoreProcedure, getScoresProcedure, getPlayerScoreProcedure, deleteScoresProcedure } from "@/backend/trpc/routes/sync/scores/route";
import { 
  getAllMembersProcedure,
  getMemberProcedure,
  getMemberByPinProcedure,
  createMemberProcedure,
  updateMemberProcedure,
  deleteMemberProcedure,
  normalizeAllMemberNamesProcedure,
} from "@/backend/trpc/routes/members/crud/route";
import {
  getAllEventsProcedure,
  getEventProcedure,
  createEventProcedure,
  updateEventProcedure,
  deleteEventProcedure,
  registerForEventProcedure,
  unregisterFromEventProcedure,
} from "@/backend/trpc/routes/events/crud/route";
import { createRegistrationProcedure, updateRegistrationProcedure, getAllRegistrationsProcedure } from "@/backend/trpc/routes/registrations/crud/route";
import { sendRegistrationEmailProcedure } from "@/backend/trpc/routes/registrations/send-email/route";
import { createPaymentProcedure, capturePaymentProcedure } from "@/backend/trpc/routes/registrations/paypal/route";
import financialsCrud from "@/backend/trpc/routes/financials/crud/route";
import { getSettingsProcedure, updateSettingsProcedure } from "@/backend/trpc/routes/settings/crud/route";
import gamesCrud from "@/backend/trpc/routes/games/crud/route";
import notificationsCrud from "@/backend/trpc/routes/notifications/crud/route";
import preferencesCrud from "@/backend/trpc/routes/preferences/crud/route";
import offlineCrud from "@/backend/trpc/routes/offline/crud/route";
import coursesCrud from "@/backend/trpc/routes/courses/crud/route";

console.log('🏗️ [tRPC] Building app router...');

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  sync: createTRPCRouter({
    members: syncMembersProcedure,
    events: syncEventProcedure,
    groupings: createTRPCRouter({
      sync: syncGroupingsProcedure,
      get: getGroupingsProcedure,
    }),
    scores: createTRPCRouter({
      submit: submitScoreProcedure,
      getAll: getScoresProcedure,
      getPlayer: getPlayerScoreProcedure,
      deleteAll: deleteScoresProcedure,
    }),
    status: getSyncStatusProcedure,
  }),
  members: createTRPCRouter({
    getAll: getAllMembersProcedure,
    get: getMemberProcedure,
    getByPin: getMemberByPinProcedure,
    create: createMemberProcedure,
    update: updateMemberProcedure,
    delete: deleteMemberProcedure,
    normalizeAllNames: normalizeAllMemberNamesProcedure,
  }),
  events: createTRPCRouter({
    getAll: getAllEventsProcedure,
    get: getEventProcedure,
    create: createEventProcedure,
    update: updateEventProcedure,
    delete: deleteEventProcedure,
    register: registerForEventProcedure,
    unregister: unregisterFromEventProcedure,
  }),
  registrations: createTRPCRouter({
    create: createRegistrationProcedure,
    update: updateRegistrationProcedure,
    getAll: getAllRegistrationsProcedure,
    sendEmail: sendRegistrationEmailProcedure,
    paypal: createTRPCRouter({
      createPayment: createPaymentProcedure,
      capturePayment: capturePaymentProcedure,
    }),
  }),
  financials: financialsCrud,
  settings: createTRPCRouter({
    getSettings: getSettingsProcedure,
    updateSettings: updateSettingsProcedure,
  }),
  games: gamesCrud,
  notifications: notificationsCrud,
  preferences: preferencesCrud,
  offline: offlineCrud,
  courses: coursesCrud,
});

console.log('✅ [tRPC] App router built successfully');

export type AppRouter = typeof appRouter;
