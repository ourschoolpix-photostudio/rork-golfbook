import { createTRPCRouter } from "@/backend/trpc/create-context";
import hiRoute from "@/backend/trpc/routes/example/hi/route";
import membersRoute from "@/backend/trpc/routes/sync/members/route";
import eventsRoute from "@/backend/trpc/routes/sync/events/route";
import groupingsRoute from "@/backend/trpc/routes/sync/groupings/route";
import scoresRoute from "@/backend/trpc/routes/sync/scores/route";
import { getSyncStatusProcedure } from "@/backend/trpc/routes/sync/members/route";
import membersCrudRoute from "@/backend/trpc/routes/members/crud/route";
import eventsCrudRoute from "@/backend/trpc/routes/events/crud/route";
import registrationsCrudRoute from "@/backend/trpc/routes/registrations/crud/route";
import registrationsEmailRoute from "@/backend/trpc/routes/registrations/send-email/route";
import registrationsPaypalRoute from "@/backend/trpc/routes/registrations/paypal/route";
import financialsCrudRoute from "@/backend/trpc/routes/financials/crud/route";
import settingsRoute from "@/backend/trpc/routes/settings/get-paypal-config/route";
import settingsCrudRoute from "@/backend/trpc/routes/settings/crud/route";
import gamesCrudRoute from "@/backend/trpc/routes/games/crud/route";
import notificationsCrudRoute from "@/backend/trpc/routes/notifications/crud/route";
import preferencesCrudRoute from "@/backend/trpc/routes/preferences/crud/route";
import offlineCrudRoute from "@/backend/trpc/routes/offline/crud/route";
import coursesCrudRoute from "@/backend/trpc/routes/courses/crud/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  sync: createTRPCRouter({
    members: membersRoute,
    events: eventsRoute,
    groupings: groupingsRoute,
    scores: scoresRoute,
    status: getSyncStatusProcedure,
  }),
  members: createTRPCRouter({
    getAll: membersCrudRoute.getAll,
    get: membersCrudRoute.get,
    getByPin: membersCrudRoute.getByPin,
    create: membersCrudRoute.create,
    update: membersCrudRoute.update,
    delete: membersCrudRoute.delete,
    normalizeAllNames: membersCrudRoute.normalizeAllNames,
  }),
  events: createTRPCRouter({
    getAll: eventsCrudRoute.getAll,
    get: eventsCrudRoute.get,
    create: eventsCrudRoute.create,
    update: eventsCrudRoute.update,
    delete: eventsCrudRoute.delete,
    register: eventsCrudRoute.register,
    unregister: eventsCrudRoute.unregister,
  }),
  registrations: createTRPCRouter({
    create: registrationsCrudRoute.create,
    update: registrationsCrudRoute.update,
    getAll: registrationsCrudRoute.getAll,
    sendEmail: registrationsEmailRoute.sendEmail,
    paypal: registrationsPaypalRoute,
  }),
  financials: financialsCrudRoute,
  settings: createTRPCRouter({
    getPayPalConfig: settingsRoute.getPayPalConfig,
    getSettings: settingsCrudRoute.getSettings,
    updateSettings: settingsCrudRoute.updateSettings,
  }),
  games: gamesCrudRoute,
  notifications: notificationsCrudRoute,
  preferences: preferencesCrudRoute,
  offline: offlineCrudRoute,
  courses: coursesCrudRoute,
});

export type AppRouter = typeof appRouter;
