import {
  boolean,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  farmerEnabled: boolean("farmerEnabled").default(false).notNull(),
  ownerEnabled: boolean("ownerEnabled").default(false).notNull(),
  phone: varchar("phone", { length: 20 }),
  district: varchar("district", { length: 80 }),
  taluk: varchar("taluk", { length: 80 }),
  village: varchar("village", { length: 100 }),
  language: mysqlEnum("language", ["en", "ta"]).default("en").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const machineryListings = mysqlTable(
  "machinery_listings",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 160 }).notNull(),
    machineName: varchar("machineName", { length: 100 }).notNull(),
    category: mysqlEnum("category", ["tractor", "harvester", "tillage", "seeding", "spraying", "irrigation", "other"]).notNull(),
    description: text("description"),
    operations: text("operations").notNull(),
    brand: varchar("brand", { length: 80 }),
    modelYear: int("modelYear"),
    horsepower: int("horsepower"),
    priceUnit: mysqlEnum("priceUnit", ["hour", "acre", "day", "trip"]).notNull(),
    priceRupees: int("priceRupees").notNull(),
    district: varchar("district", { length: 80 }).notNull(),
    taluk: varchar("taluk", { length: 80 }).notNull(),
    village: varchar("village", { length: 100 }).notNull(),
    serviceRadiusKm: int("serviceRadiusKm").default(20).notNull(),
    transportAvailable: boolean("transportAvailable").default(false).notNull(),
    imageUrl: text("imageUrl"),
    status: mysqlEnum("status", ["active", "paused"]).default("active").notNull(),
    isDemo: boolean("isDemo").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    locationIndex: index("machinery_location_idx").on(table.district, table.taluk),
    ownerIndex: index("machinery_owner_idx").on(table.ownerId, table.status),
    discoveryIndex: index("machinery_discovery_idx").on(table.category, table.status, table.priceRupees),
  }),
);

export const availabilityBlocks = mysqlTable(
  "availability_blocks",
  {
    id: int("id").autoincrement().primaryKey(),
    listingId: int("listingId").notNull().references(() => machineryListings.id, { onDelete: "cascade" }),
    ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    startDate: varchar("startDate", { length: 10 }).notNull(),
    endDate: varchar("endDate", { length: 10 }).notNull(),
    reason: varchar("reason", { length: 160 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ datesIndex: index("availability_listing_dates_idx").on(table.listingId, table.startDate, table.endDate) }),
);

export const rentalBookings = mysqlTable(
  "rental_bookings",
  {
    id: int("id").autoincrement().primaryKey(),
    listingId: int("listingId").notNull().references(() => machineryListings.id, { onDelete: "cascade" }),
    farmerId: int("farmerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    startDate: varchar("startDate", { length: 10 }).notNull(),
    endDate: varchar("endDate", { length: 10 }).notNull(),
    operation: varchar("operation", { length: 100 }).notNull(),
    areaAcres: decimal("areaAcres", { precision: 8, scale: 2 }),
    farmerDistrict: varchar("farmerDistrict", { length: 80 }).notNull(),
    farmerVillage: varchar("farmerVillage", { length: 100 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    logisticsNote: text("logisticsNote"),
    status: mysqlEnum("status", ["pending", "accepted", "rejected", "cancelled", "completed"]).default("pending").notNull(),
    ownerResponse: text("ownerResponse"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    farmerIndex: index("booking_farmer_idx").on(table.farmerId, table.status),
    ownerIndex: index("booking_owner_idx").on(table.ownerId, table.status),
    scheduleIndex: index("booking_schedule_idx").on(table.listingId, table.startDate, table.endDate),
  }),
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type MachineryListing = typeof machineryListings.$inferSelect;
export type AvailabilityBlock = typeof availabilityBlocks.$inferSelect;
export type RentalBooking = typeof rentalBookings.$inferSelect;
