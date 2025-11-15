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
  members: membersCrudRoute,
  events: eventsCrudRoute,
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
});

export type AppRouter = typeof appRouter;
