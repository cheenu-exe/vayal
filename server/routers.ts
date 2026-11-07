import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";

const categories = ["tractor", "harvester", "tillage", "seeding", "spraying", "irrigation", "other"] as const;
const units = ["hour", "acre", "day", "trip"] as const;
const profileInput = z.object({
  farmerEnabled: z.boolean(), ownerEnabled: z.boolean(),
  phone: z.string().trim().max(20).default(""),
  district: z.string().trim().max(80).default(""),
  taluk: z.string().trim().max(80).default(""),
  village: z.string().trim().max(100).default(""),
  language: z.enum(["en", "ta"]).default("en"),
});
const listingFields = {
  title: z.string().trim().min(4).max(160),
  machineName: z.string().trim().min(2).max(100),
  category: z.enum(categories),
  description: z.string().trim().min(10).max(3000),
  operations: z.array(z.string().trim().min(2).max(60)).min(1).max(12),
  brand: z.string().trim().max(80).optional(),
  modelYear: z.number().int().min(1980).max(new Date().getFullYear() + 1).optional(),
  horsepower: z.number().int().min(1).max(1000).optional(),
  priceUnit: z.enum(units),
  priceRupees: z.number().int().min(1).max(1000000),
  district: z.string().trim().min(2).max(80),
  taluk: z.string().trim().min(2).max(80),
  village: z.string().trim().min(2).max(100),
  serviceRadiusKm: z.number().int().min(1).max(200),
  transportAvailable: z.boolean(),
  imageUrl: z.string().max(2048).optional(),
};
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const todayInIndia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const isRealDate = (value: string) => {
  if (!datePattern.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const futureDate = z.string().refine(value => isRealDate(value) && value >= todayInIndia(), { message: "Choose a real date today or later." });
const calendarDate = z.string().refine(isRealDate, { message: "Enter a real calendar date." });
const dateRangeInput = z.object({ startDate: futureDate, endDate: calendarDate }).refine(value => value.startDate <= value.endDate, { message: "End date must be on or after start date." });

async function requireRole(userId: number, role: "farmer" | "owner") {
  const profile = await db.getProfile(userId);
  if (role === "farmer" && !profile.farmerEnabled) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Enable farmer access in your Vayal profile before requesting machinery." });
  }
  if (role === "owner" && !profile.ownerEnabled) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Enable owner access in your Vayal profile before listing machinery." });
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  marketplace: router({
    list: publicProcedure.input(z.object({
      query: z.string().trim().max(100).optional(),
      district: z.string().trim().max(80).optional(),
      locality: z.string().trim().max(100).optional(),
      category: z.enum(categories).optional(),
      priceUnit: z.enum(units).optional(),
      maxPrice: z.number().int().min(1).max(1000000).optional(),
      operation: z.string().trim().max(100).optional(),
      startDate: futureDate.optional(),
      endDate: calendarDate.optional(),
    }).refine(value => (value.startDate === undefined) === (value.endDate === undefined), { message: "Choose both a start and end date for availability search." })
      .refine(value => !value.startDate || !value.endDate || value.startDate <= value.endDate, { message: "End date must be on or after start date." })
      .default({})).query(({ input }) => db.listMachines(input)),
    byId: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input }) => db.getMachine(input.id)),
    profile: protectedProcedure.query(({ ctx }) => db.getProfile(ctx.user.id)),
    saveProfile: protectedProcedure.input(profileInput).mutation(({ ctx, input }) => db.saveProfile(ctx.user.id, input)),
    myListings: protectedProcedure.query(async ({ ctx }) => {
      await requireRole(ctx.user.id, "owner");
      return db.listOwnerMachines(ctx.user.id);
    }),
    createListing: protectedProcedure.input(z.object(listingFields)).mutation(async ({ ctx, input }) => {
      await requireRole(ctx.user.id, "owner");
      return db.createMachine(ctx.user.id, input);
    }),
    updateListing: protectedProcedure.input(z.object({
      id: z.number().int().positive(),
      patch: z.object({ ...listingFields, status: z.enum(["active", "paused"]) }).partial(),
    })).mutation(async ({ ctx, input }) => {
      await requireRole(ctx.user.id, "owner");
      const updated = await db.updateMachine(ctx.user.id, input.id, input.patch);
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Machinery listing not found." });
      return updated;
    }),
    addAvailabilityBlock: protectedProcedure.input(dateRangeInput.safeExtend({
      listingId: z.number().int().positive(),
      reason: z.string().trim().max(160).optional(),
    })).mutation(async ({ ctx, input }) => {
      await requireRole(ctx.user.id, "owner");
      try {
        return { id: await db.addAvailabilityBlock(ctx.user.id, input) };
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Could not block these dates." });
      }
    }),
    removeAvailabilityBlock: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await requireRole(ctx.user.id, "owner");
      await db.removeAvailabilityBlock(ctx.user.id, input.id);
      return { success: true };
    }),
    requestRental: protectedProcedure.input(z.object({
      listingId: z.number().int().positive(),
      startDate: futureDate,
      endDate: calendarDate,
      operation: z.string().trim().min(2).max(100),
      areaAcres: z.string().regex(/^\d{1,5}(\.\d{1,2})?$/).optional().or(z.literal("")),
      farmerDistrict: z.string().trim().min(2).max(80),
      farmerVillage: z.string().trim().min(2).max(100),
      phone: z.string().trim().min(8).max(20),
      logisticsNote: z.string().trim().max(1500).optional(),
    }).refine(input => input.startDate <= input.endDate, { message: "End date must be on or after start date." })).mutation(async ({ ctx, input }) => {
      await requireRole(ctx.user.id, "farmer");
      try {
        const id = await db.createRentalBooking(ctx.user.id, input);
        return { id };
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Could not submit the request." });
      }
    }),
    myBookings: protectedProcedure.query(async ({ ctx }) => {
      await requireRole(ctx.user.id, "farmer");
      return db.listFarmerBookings(ctx.user.id);
    }),
    ownerBookings: protectedProcedure.query(async ({ ctx }) => {
      await requireRole(ctx.user.id, "owner");
      return db.listOwnerBookings(ctx.user.id);
    }),
    updateBooking: protectedProcedure.input(z.object({
      id: z.number().int().positive(),
      status: z.enum(["accepted", "rejected", "cancelled", "completed"]),
      response: z.string().trim().max(1000).optional(),
    })).mutation(async ({ ctx, input }) => {
      const profile = await db.getProfile(ctx.user.id);
      if (input.status === "cancelled" && !profile.farmerEnabled) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Enable farmer access to manage your requests." });
      }
      if (input.status !== "cancelled" && !profile.ownerEnabled) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Enable owner access to manage rental requests." });
      }
      const result = await db.updateBookingStatus(ctx.user.id, input.id, input.status, input.response);
      if (result.error === "NOT_FOUND") throw new TRPCError({ code: "NOT_FOUND", message: "Rental request not found." });
      if (result.error === "CONFLICT") throw new TRPCError({ code: "CONFLICT", message: "Another accepted booking overlaps these dates. Review the schedule before accepting." });
      if (result.error === "AVAILABILITY_BLOCKED") throw new TRPCError({ code: "CONFLICT", message: "The owner has marked these dates unavailable." });
      if (result.error) throw new TRPCError({ code: "FORBIDDEN", message: "This request cannot make that status change." });
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
