import { and, desc, eq, gte, inArray, lte, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  availabilityBlocks,
  MachineryListing,
  machineryListings,
  rentalBookings,
  RentalBooking,
  userProfiles,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

function requireDatabase(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) throw new Error("Marketplace database is not available");
  return db;
}

function parseOperations(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function listingView(row: MachineryListing, ownerName?: string | null) {
  return { ...row, operations: parseOperations(row.operations), ownerName: ownerName || "Local machinery owner" };
}

export type ListingInput = {
  title: string;
  machineName: string;
  category: MachineryListing["category"];
  description: string;
  operations: string[];
  brand?: string;
  modelYear?: number;
  horsepower?: number;
  priceUnit: MachineryListing["priceUnit"];
  priceRupees: number;
  district: string;
  taluk: string;
  village: string;
  serviceRadiusKm: number;
  transportAvailable: boolean;
  imageUrl?: string;
};

export async function listMachines(filters: {
  query?: string; district?: string; category?: MachineryListing["category"];
  priceUnit?: MachineryListing["priceUnit"]; maxPrice?: number; operation?: string;
  locality?: string; startDate?: string; endDate?: string;
}) {
  const db = requireDatabase(await getDb());
  const clauses = [eq(machineryListings.status, "active")];
  if (filters.district) clauses.push(eq(machineryListings.district, filters.district));
  if (filters.category) clauses.push(eq(machineryListings.category, filters.category));
  if (filters.priceUnit) clauses.push(eq(machineryListings.priceUnit, filters.priceUnit));
  if (filters.maxPrice) clauses.push(lte(machineryListings.priceRupees, filters.maxPrice));
  const rows = await db.select({ listing: machineryListings, ownerName: users.name })
    .from(machineryListings).leftJoin(users, eq(users.id, machineryListings.ownerId))
    .where(and(...clauses)).orderBy(desc(machineryListings.createdAt)).limit(300);
  const unavailableIds = new Set<number>();
  if (filters.startDate && filters.endDate && rows.length) {
    const ids = rows.map(row => row.listing.id);
    const [accepted, blocked] = await Promise.all([
      db.select({ listingId: rentalBookings.listingId }).from(rentalBookings).where(and(
        inArray(rentalBookings.listingId, ids), eq(rentalBookings.status, "accepted"),
        lte(rentalBookings.startDate, filters.endDate), gte(rentalBookings.endDate, filters.startDate),
      )),
      db.select({ listingId: availabilityBlocks.listingId }).from(availabilityBlocks).where(and(
        inArray(availabilityBlocks.listingId, ids), lte(availabilityBlocks.startDate, filters.endDate),
        gte(availabilityBlocks.endDate, filters.startDate),
      )),
    ]);
    accepted.forEach(row => unavailableIds.add(row.listingId));
    blocked.forEach(row => unavailableIds.add(row.listingId));
  }
  const query = filters.query?.trim().toLocaleLowerCase();
  const locality = filters.locality?.trim().toLocaleLowerCase();
  const operation = filters.operation?.trim().toLocaleLowerCase();
  return rows.map(row => listingView(row.listing, row.ownerName)).filter(item => {
    if (query && ![item.title, item.machineName, item.district, item.taluk, item.village, item.description].some(value => value?.toLocaleLowerCase().includes(query))) return false;
    if (locality && ![item.taluk, item.village].some(value => value.toLocaleLowerCase().includes(locality))) return false;
    if (operation && !item.operations.some(value => value.toLocaleLowerCase().includes(operation))) return false;
    if (unavailableIds.has(item.id)) return false;
    return true;
  });
}

export async function getMachine(id: number, includePaused = false, ownerId?: number) {
  const db = requireDatabase(await getDb());
  const clauses = [eq(machineryListings.id, id)];
  if (!includePaused) clauses.push(eq(machineryListings.status, "active"));
  if (ownerId !== undefined) clauses.push(eq(machineryListings.ownerId, ownerId));
  const rows = await db.select({ listing: machineryListings, ownerName: users.name })
    .from(machineryListings).leftJoin(users, eq(users.id, machineryListings.ownerId))
    .where(and(...clauses)).limit(1);
  return rows[0] ? listingView(rows[0].listing, rows[0].ownerName) : null;
}

export async function getProfile(userId: number) {
  const db = requireDatabase(await getDb());
  const rows = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return rows[0] ?? {
    id: 0,
    userId,
    farmerEnabled: false,
    ownerEnabled: false,
    phone: null,
    district: null,
    taluk: null,
    village: null,
    language: "en" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function saveProfile(userId: number, input: {
  farmerEnabled: boolean;
  ownerEnabled: boolean;
  phone: string;
  district: string;
  taluk: string;
  village: string;
  language: "en" | "ta";
}) {
  const db = requireDatabase(await getDb());
  const values = {
    userId,
    farmerEnabled: input.farmerEnabled,
    ownerEnabled: input.ownerEnabled,
    phone: input.phone || null,
    district: input.district || null,
    taluk: input.taluk || null,
    village: input.village || null,
    language: input.language,
  };
  await db.insert(userProfiles).values(values).onDuplicateKeyUpdate({
    set: {
      farmerEnabled: values.farmerEnabled,
      ownerEnabled: values.ownerEnabled,
      phone: values.phone,
      district: values.district,
      taluk: values.taluk,
      village: values.village,
      language: values.language,
    },
  });
  return getProfile(userId);
}

export async function listOwnerMachines(ownerId: number) {
  const db = requireDatabase(await getDb());
  const rows = await db.select().from(machineryListings).where(eq(machineryListings.ownerId, ownerId)).orderBy(desc(machineryListings.createdAt));
  const ids = rows.map(row => row.id);
  const blocks = ids.length ? await db.select().from(availabilityBlocks)
    .where(and(eq(availabilityBlocks.ownerId, ownerId), inArray(availabilityBlocks.listingId, ids)))
    .orderBy(availabilityBlocks.startDate) : [];
  return rows.map(row => ({ ...listingView(row), availabilityBlocks: blocks.filter(block => block.listingId === row.id) }));
}

export async function addAvailabilityBlock(ownerId: number, input: { listingId: number; startDate: string; endDate: string; reason?: string }) {
  const db = requireDatabase(await getDb());
  return db.transaction(async tx => {
    const owned = await tx.select({ id: machineryListings.id }).from(machineryListings)
      .where(and(eq(machineryListings.id, input.listingId), eq(machineryListings.ownerId, ownerId))).limit(1).for("update");
    if (!owned.length) throw new Error("Machinery listing not found.");
    const accepted = await tx.select({ id: rentalBookings.id }).from(rentalBookings).where(and(
      eq(rentalBookings.listingId, input.listingId), eq(rentalBookings.status, "accepted"),
      lte(rentalBookings.startDate, input.endDate), gte(rentalBookings.endDate, input.startDate),
    )).limit(1).for("update");
    if (accepted.length) throw new Error("These dates overlap an accepted booking.");
    const result = await tx.insert(availabilityBlocks).values({ ...input, ownerId, reason: input.reason || null }).$returningId();
    return result[0].id;
  });
}

export async function removeAvailabilityBlock(ownerId: number, id: number) {
  const db = requireDatabase(await getDb());
  await db.delete(availabilityBlocks).where(and(eq(availabilityBlocks.id, id), eq(availabilityBlocks.ownerId, ownerId)));
}

export async function createMachine(ownerId: number, input: ListingInput) {
  const db = requireDatabase(await getDb());
  const result = await db.insert(machineryListings).values({
    ...input,
    ownerId,
    operations: JSON.stringify(input.operations),
    imageUrl: input.imageUrl || null,
    brand: input.brand || null,
    modelYear: input.modelYear || null,
    horsepower: input.horsepower || null,
    status: "active",
    isDemo: false,
  }).$returningId();
  return getMachine(result[0].id);
}

export async function updateMachine(ownerId: number, id: number, input: Partial<ListingInput> & { status?: "active" | "paused" }) {
  const db = requireDatabase(await getDb());
  const existing = await db.select().from(machineryListings).where(and(eq(machineryListings.id, id), eq(machineryListings.ownerId, ownerId))).limit(1);
  if (!existing[0]) return null;
  const update: Record<string, unknown> = { ...input };
  if (input.operations) update.operations = JSON.stringify(input.operations);
  await db.update(machineryListings).set(update).where(and(eq(machineryListings.id, id), eq(machineryListings.ownerId, ownerId)));
  return getMachine(id, true, ownerId);
}

export async function createRentalBooking(farmerId: number, input: {
  listingId: number;
  startDate: string;
  endDate: string;
  operation: string;
  areaAcres?: string;
  farmerDistrict: string;
  farmerVillage: string;
  phone: string;
  logisticsNote?: string;
}) {
  const db = requireDatabase(await getDb());
  const machine = await db.select().from(machineryListings).where(eq(machineryListings.id, input.listingId)).limit(1);
  if (!machine[0] || machine[0].status !== "active") throw new Error("This machine is no longer available.");
  if (machine[0].ownerId === farmerId) throw new Error("You cannot request your own machinery.");
  const [blocked, accepted] = await Promise.all([
    db.select({ id: availabilityBlocks.id }).from(availabilityBlocks).where(and(
      eq(availabilityBlocks.listingId, input.listingId), lte(availabilityBlocks.startDate, input.endDate),
      gte(availabilityBlocks.endDate, input.startDate),
    )).limit(1),
    db.select({ id: rentalBookings.id }).from(rentalBookings).where(and(
      eq(rentalBookings.listingId, input.listingId), eq(rentalBookings.status, "accepted"),
      lte(rentalBookings.startDate, input.endDate), gte(rentalBookings.endDate, input.startDate),
    )).limit(1),
  ]);
  if (blocked.length) throw new Error("The owner has marked these dates unavailable.");
  if (accepted.length) throw new Error("These dates overlap an accepted booking. Please choose another date range.");
  const result = await db.insert(rentalBookings).values({
    listingId: machine[0].id,
    farmerId,
    ownerId: machine[0].ownerId,
    startDate: input.startDate,
    endDate: input.endDate,
    operation: input.operation,
    areaAcres: input.areaAcres || null,
    farmerDistrict: input.farmerDistrict,
    farmerVillage: input.farmerVillage,
    phone: input.phone,
    logisticsNote: input.logisticsNote || null,
    status: "pending",
  }).$returningId();
  return result[0].id;
}

export async function listFarmerBookings(farmerId: number) {
  const db = requireDatabase(await getDb());
  return db.select({ booking: rentalBookings, machineTitle: machineryListings.title, machineName: machineryListings.machineName, imageUrl: machineryListings.imageUrl, machineDistrict: machineryListings.district, ownerName: users.name })
    .from(rentalBookings)
    .innerJoin(machineryListings, eq(machineryListings.id, rentalBookings.listingId))
    .innerJoin(users, eq(users.id, rentalBookings.ownerId))
    .where(eq(rentalBookings.farmerId, farmerId))
    .orderBy(desc(rentalBookings.createdAt));
}

export async function listOwnerBookings(ownerId: number) {
  const db = requireDatabase(await getDb());
  return db.select({ booking: rentalBookings, machineTitle: machineryListings.title, machineName: machineryListings.machineName, imageUrl: machineryListings.imageUrl, farmerName: users.name })
    .from(rentalBookings)
    .innerJoin(machineryListings, eq(machineryListings.id, rentalBookings.listingId))
    .innerJoin(users, eq(users.id, rentalBookings.farmerId))
    .where(eq(rentalBookings.ownerId, ownerId))
    .orderBy(desc(rentalBookings.createdAt));
}

export async function updateBookingStatus(actorId: number, id: number, status: RentalBooking["status"], response?: string) {
  const db = requireDatabase(await getDb());
  return db.transaction(async tx => {
    const rows = await tx.select().from(rentalBookings).where(eq(rentalBookings.id, id)).limit(1).for("update");
    const booking = rows[0];
    if (!booking) return { error: "NOT_FOUND" as const };
    const isOwner = booking.ownerId === actorId;
    const isFarmer = booking.farmerId === actorId;
    if (status === "cancelled") {
      if (!isFarmer || booking.status !== "pending") return { error: "FORBIDDEN" as const };
    } else if (status === "accepted" || status === "rejected") {
      if (!isOwner || booking.status !== "pending") return { error: "FORBIDDEN" as const };
      if (status === "accepted") {
        const machine = await tx.select({ id: machineryListings.id }).from(machineryListings)
          .where(eq(machineryListings.id, booking.listingId)).limit(1).for("update");
        if (!machine.length) return { error: "NOT_FOUND" as const };
        const blocked = await tx.select({ id: availabilityBlocks.id }).from(availabilityBlocks).where(and(
          eq(availabilityBlocks.listingId, booking.listingId),
          lte(availabilityBlocks.startDate, booking.endDate), gte(availabilityBlocks.endDate, booking.startDate),
        )).limit(1).for("update");
        if (blocked.length) return { error: "AVAILABILITY_BLOCKED" as const };
        const conflict = await tx.select({ id: rentalBookings.id }).from(rentalBookings).where(and(
          eq(rentalBookings.listingId, booking.listingId), eq(rentalBookings.status, "accepted"),
          lte(rentalBookings.startDate, booking.endDate), gte(rentalBookings.endDate, booking.startDate),
          ne(rentalBookings.id, id),
        )).limit(1).for("update");
        if (conflict.length) return { error: "CONFLICT" as const };
      }
    } else if (status === "completed") {
      if (!isOwner || booking.status !== "accepted") return { error: "FORBIDDEN" as const };
    } else {
      return { error: "FORBIDDEN" as const };
    }
    await tx.update(rentalBookings).set({ status, ownerResponse: response || booking.ownerResponse }).where(eq(rentalBookings.id, id));
    return { error: null };
  });
}

export async function seedDemoMachines() {
  const db = requireDatabase(await getDb());
  const existing = await db.select({ id: machineryListings.id }).from(machineryListings).where(eq(machineryListings.isDemo, true)).limit(1);
  if (existing.length) return false;
  const demoOwner = await db.insert(users).values({ openId: "vayal-demo-machinery-owner", name: "Vayal Demo Owner", email: null, loginMethod: "demo", role: "user" }).onDuplicateKeyUpdate({ set: { name: "Vayal Demo Owner" } }).$returningId();
  let ownerId = demoOwner[0]?.id;
  if (!ownerId) {
    const owner = await db.select({ id: users.id }).from(users).where(eq(users.openId, "vayal-demo-machinery-owner")).limit(1);
    ownerId = owner[0]?.id;
  }
  if (!ownerId) throw new Error("Could not initialize the demo owner");
  await db.insert(machineryListings).values([
    {
      ownerId, title: "Mahindra 575 DI · Field-ready tractor", machineName: "Utility tractor", category: "tractor", description: "A dependable 47 HP tractor for ploughing, trailer work and field preparation. Operator included; transport can be arranged within the service area.", operations: JSON.stringify(["Ploughing", "Trailer work", "Field preparation"]), brand: "Mahindra", modelYear: 2021, horsepower: 47, priceUnit: "hour", priceRupees: 850, district: "Thanjavur", taluk: "Kumbakonam", village: "Swamimalai", serviceRadiusKm: 25, transportAvailable: true, imageUrl: "/manus-storage/async-images/8P6agS5NXeeAVtkqdQiTO1/image-2.webp", status: "active", isDemo: true,
    },
    {
      ownerId, title: "Kubota DC-68G · Rice harvester", machineName: "Combine harvester", category: "harvester", description: "Compact combine harvester suited for paddy fields, with an experienced operator. Please request early during the harvest season.", operations: JSON.stringify(["Paddy harvesting", "Harvest transport"]), brand: "Kubota", modelYear: 2022, horsepower: 68, priceUnit: "acre", priceRupees: 2200, district: "Thanjavur", taluk: "Papanasam", village: "Ayyampet", serviceRadiusKm: 30, transportAvailable: true, imageUrl: "/manus-storage/async-images/8P6agS5NXeeAVtkqdQiTO1/image-3.webp", status: "active", isDemo: true,
    },
    {
      ownerId, title: "Sonalika 42 HP + rotavator", machineName: "Rotavator set", category: "tillage", description: "Tractor with 6-foot rotary tiller for seedbed preparation and residue mixing. Rate is per acre; confirm field access and mobilisation with the owner.", operations: JSON.stringify(["Rotavating", "Seedbed preparation", "Residue mixing"]), brand: "Sonalika", modelYear: 2020, horsepower: 42, priceUnit: "acre", priceRupees: 1100, district: "Coimbatore", taluk: "Pollachi", village: "Anaimalai", serviceRadiusKm: 20, transportAvailable: false, imageUrl: "/manus-storage/async-images/8P6agS5NXeeAVtkqdQiTO1/image-4.webp", status: "active", isDemo: true,
    },
    {
      ownerId, title: "Power tiller · Compact 9 HP", machineName: "Power tiller", category: "tillage", description: "A walk-behind tiller for smaller plots, vegetable beds and narrow field access. Operator is available on request.", operations: JSON.stringify(["Tilling", "Vegetable bed preparation"]), brand: "VST", modelYear: 2023, horsepower: 9, priceUnit: "day", priceRupees: 1800, district: "Madurai", taluk: "Melur", village: "Keelavalavu", serviceRadiusKm: 15, transportAvailable: true, imageUrl: "/manus-storage/async-images/8P6agS5NXeeAVtkqdQiTO1/image-1.webp", status: "active", isDemo: true,
    },
  ]);
  return true;
}
