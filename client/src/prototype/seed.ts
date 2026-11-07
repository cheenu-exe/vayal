import type { Booking, MachineListing, Profile, PrototypeState } from "./types";

const farmerPhone = "+919876543210";
const ownerPhone = "+919876543211";
const photos = "/manus-storage/async-images/8P6agS5NXeeAVtkqdQiTO1";

export function dayFromToday(offset: number) {
  const value = new Date();
  value.setHours(12, 0, 0, 0);
  value.setDate(value.getDate() + offset);
  return value.toISOString().slice(0, 10);
}

export const demoProfiles: Profile[] = [
  {
    id: "demo-farmer",
    role: "farmer",
    phone: farmerPhone,
    name: "Kavitha Raman",
    district: "Thanjavur",
    town: "Kumbakonam",
    village: "Swamimalai",
    pinCode: "612302",
    createdAt: "2026-01-12T08:00:00.000Z",
  },
  {
    id: "demo-owner",
    role: "owner",
    phone: ownerPhone,
    name: "Selvam Farm Services",
    district: "Thanjavur",
    town: "Kumbakonam",
    village: "Swamimalai",
    pinCode: "612302",
    createdAt: "2025-11-10T08:00:00.000Z",
  },
];

const baseMachine: Omit<MachineListing,
  "id" | "name" | "category" | "manufacturer" | "model" | "year" | "serialNumber" | "capacity" | "specifications" | "condition" | "fuelType" | "description" | "photos" | "hourlyRate" | "dailyRate" | "hasOperator" | "operatorName" | "district" | "town" | "village" | "pinCode" | "operatingArea" | "transportCharge" | "unavailableDates" | "verificationStatus" | "verificationReason" | "enabled" | "distanceKm" | "rating" | "reviewCount"
> = {
  ownerPhone,
  ownerName: "Selvam Farm Services",
  documents: ["Ownership declaration (demo).pdf"],
  availabilityStart: dayFromToday(0),
  availabilityEnd: dayFromToday(60),
  isDemo: true,
  createdAt: "2026-04-15T08:00:00.000Z",
};

export const demoMachines: MachineListing[] = [
  {
    ...baseMachine, id: "m-tractor-1", name: "Mahindra 575 DI", category: "Tractors", manufacturer: "Mahindra", model: "575 DI", year: 2022,
    serialNumber: "DEMO-MH-0575", capacity: "47 HP", specifications: "2WD · 8 forward gears · 42 L fuel tank", condition: "Very good", fuelType: "Diesel",
    description: "A field-ready tractor for ploughing, trailer work and everyday land preparation. Operator and local mobilisation can be discussed with the owner.",
    photos: [`${photos}/image-2.webp`], hourlyRate: 850, dailyRate: 5600, hasOperator: true, operatorName: "Operator arranged by owner",
    district: "Thanjavur", town: "Kumbakonam", village: "Swamimalai", pinCode: "612302", operatingArea: "Kumbakonam · Papanasam · nearby villages", transportCharge: 450,
    unavailableDates: [dayFromToday(18)], verificationStatus: "verified", verificationReason: "Simulated review passed in this sample record.", enabled: true, distanceKm: 4, rating: 4.8, reviewCount: 18,
  },
  {
    ...baseMachine, id: "m-harvester-1", name: "Kubota DC-68G Rice Harvester", category: "Harvesters", manufacturer: "Kubota", model: "DC-68G", year: 2023,
    serialNumber: "DEMO-KB-0068", capacity: "68 HP", specifications: "Paddy combine · Straw walker · Operator included", condition: "Excellent", fuelType: "Diesel",
    description: "Compact combine suited to paddy harvest work. Ask early during the season to coordinate field access, schedule and transport.",
    photos: [`${photos}/image-3.webp`], hourlyRate: 1800, dailyRate: 11800, hasOperator: true, operatorName: "Experienced operator included",
    district: "Thanjavur", town: "Papanasam", village: "Ayyampet", pinCode: "614201", operatingArea: "Papanasam · Ayyampet · Kumbakonam", transportCharge: 900,
    unavailableDates: [dayFromToday(12), dayFromToday(13)], verificationStatus: "verified", verificationReason: "Simulated review passed in this sample record.", enabled: true, distanceKm: 12, rating: 4.9, reviewCount: 11,
  },
  {
    ...baseMachine, id: "m-rotavator-1", name: "Sonalika 42 HP + 6 ft Rotavator", category: "Rotavators", manufacturer: "Sonalika", model: "DI 42 RX", year: 2021,
    serialNumber: "DEMO-SN-0042", capacity: "42 HP · 6 ft", specifications: "Rotary tiller · Soil preparation · Residue mixing", condition: "Very good", fuelType: "Diesel",
    description: "Tractor with a six-foot rotary tiller for seedbed preparation, residue mixing and soil finishing. Confirm your plot access before requesting.",
    photos: [`${photos}/image-4.webp`], hourlyRate: 950, dailyRate: 6200, hasOperator: true, operatorName: "Owner-operated", district: "Thanjavur", town: "Kumbakonam", village: "Thirunageswaram", pinCode: "612204",
    operatingArea: "Kumbakonam · Thirunageswaram · nearby villages", transportCharge: 350, unavailableDates: [], verificationStatus: "verified", verificationReason: "Simulated review passed in this sample record.", enabled: true, distanceKm: 9, rating: 4.7, reviewCount: 9,
  },
  {
    ...baseMachine, id: "m-cultivator-1", name: "Farmtrac Cultivator Set", category: "Cultivators", manufacturer: "Farmtrac", model: "45 Classic", year: 2022,
    serialNumber: "DEMO-FT-0045", capacity: "45 HP", specifications: "9-tine cultivator · Adjustable depth", condition: "Good", fuelType: "Diesel",
    description: "A practical cultivator setup for soil loosening and pre-sowing field work in the Pollachi area.",
    photos: [`${photos}/image-2.webp`], hourlyRate: 800, dailyRate: 5200, hasOperator: true, operatorName: "Operator available", district: "Coimbatore", town: "Pollachi", village: "Anaimalai", pinCode: "642104",
    operatingArea: "Pollachi · Anaimalai · nearby villages", transportCharge: 500, unavailableDates: [], verificationStatus: "verified", verificationReason: "Simulated review passed in this sample record.", enabled: true, distanceKm: 30, rating: 4.6, reviewCount: 7,
  },
  {
    ...baseMachine, id: "m-seeddrill-1", name: "KAMCO Paddy Seed Drill", category: "Seed Drills", manufacturer: "KAMCO", model: "Paddy Seeder 8-row", year: 2021,
    serialNumber: "DEMO-KM-0008", capacity: "8 rows", specifications: "Row spacing adjustable · Tractor mounted", condition: "Good", fuelType: "Tractor powered",
    description: "Seed placement equipment offered for seasonal planting. Confirm the seed type, field preparation and availability directly during this demo enquiry.",
    photos: [`${photos}/image-3.webp`], hourlyRate: 700, dailyRate: 4400, hasOperator: false, operatorName: "", district: "Tiruchirappalli", town: "Lalgudi", village: "Poovalur", pinCode: "621712",
    operatingArea: "Lalgudi · Tiruchirappalli district", transportCharge: 300, unavailableDates: [], verificationStatus: "verified", verificationReason: "Simulated review passed in this sample record.", enabled: true, distanceKm: 46, rating: 4.5, reviewCount: 5,
  },
  {
    ...baseMachine, id: "m-plough-1", name: "Massey Ferguson Reversible Plough", category: "Ploughs", manufacturer: "Massey Ferguson", model: "3-disc reversible", year: 2020,
    serialNumber: "DEMO-MF-0003", capacity: "3 disc", specifications: "Reversible mounted plough · Field preparation", condition: "Good", fuelType: "Tractor powered",
    description: "Reversible plough attachment for field preparation. Tractor and operator availability are coordinated with the owner.",
    photos: [`${photos}/image-4.webp`], hourlyRate: 760, dailyRate: 4800, hasOperator: true, operatorName: "Tractor operator available", district: "Madurai", town: "Melur", village: "Keelavalavu", pinCode: "625102",
    operatingArea: "Melur · nearby villages", transportCharge: 300, unavailableDates: [], verificationStatus: "verified", verificationReason: "Simulated review passed in this sample record.", enabled: true, distanceKm: 57, rating: 4.6, reviewCount: 6,
  },
  {
    ...baseMachine, id: "m-sprayer-1", name: "FieldPro Boom Sprayer", category: "Sprayers", manufacturer: "FieldPro", model: "400 L boom", year: 2024,
    serialNumber: "DEMO-FP-0400", capacity: "400 L", specifications: "Tractor mounted · 12 m boom", condition: "Excellent", fuelType: "Tractor powered",
    description: "A boom sprayer for crop-care work. Discuss chemical handling, water access and safe operating arrangements before use.",
    photos: [`${photos}/image-1.webp`], hourlyRate: 650, dailyRate: 3900, hasOperator: true, operatorName: "Operator available on request", district: "Salem", town: "Attur", village: "Thalaivasal", pinCode: "636112",
    operatingArea: "Attur · Thalaivasal · nearby villages", transportCharge: 250, unavailableDates: [], verificationStatus: "verified", verificationReason: "Simulated review passed in this sample record.", enabled: true, distanceKm: 72, rating: 4.7, reviewCount: 4,
  },
  {
    ...baseMachine, id: "m-tiller-1", name: "VST Power Tiller 9 HP", category: "Other agricultural equipment", manufacturer: "VST", model: "Shakti 135 DI", year: 2024,
    serialNumber: "DEMO-VST-0009", capacity: "9 HP", specifications: "Walk-behind tiller · Compact plots", condition: "Excellent", fuelType: "Diesel",
    description: "A compact tiller for smaller plots, vegetable beds and narrow field access. Operator can be arranged by request.",
    photos: [`${photos}/image-2.webp`], hourlyRate: 500, dailyRate: 2900, hasOperator: false, operatorName: "", district: "Dindigul", town: "Nilakottai", village: "Kullalagundu", pinCode: "624201",
    operatingArea: "Nilakottai · Dindigul district", transportCharge: 200, unavailableDates: [], verificationStatus: "under_review", verificationReason: "Sample status: documents are still being checked.", enabled: false, distanceKm: 84, rating: 0, reviewCount: 0,
  },
  {
    ...baseMachine, id: "m-reaper-1", name: "Mini Crop Reaper", category: "Other agricultural equipment", manufacturer: "Demo Equipment Co.", model: "MR-180", year: 2020,
    serialNumber: "DEMO-MR-0180", capacity: "1.8 m cutting width", specifications: "Self-propelled · Crop harvesting", condition: "Fair", fuelType: "Diesel",
    description: "A sample listing showing a review requiring additional information. It is not offered to farmers.",
    photos: [`${photos}/image-3.webp`], hourlyRate: 600, dailyRate: 3600, hasOperator: true, operatorName: "Operator available", district: "Erode", town: "Gobichettipalayam", village: "Nambiyur", pinCode: "638458",
    operatingArea: "Nambiyur · Gobi", transportCharge: 350, unavailableDates: [], verificationStatus: "rejected", verificationReason: "Please provide a clearer serial-number photograph and proof of ownership. (Simulated demo reason.)", enabled: false, distanceKm: 90, rating: 0, reviewCount: 0,
  },
];

function makeBooking(input: Omit<Booking, "createdAt">): Booking {
  return { ...input, createdAt: new Date().toISOString() };
}

export function makeDemoState(): PrototypeState {
  const tractor = demoMachines[0];
  const harvester = demoMachines[1];
  const rotavator = demoMachines[2];
  const sampleBookings: Booking[] = [
    makeBooking({
      id: "VY-2048", farmerPhone, farmerName: "Kavitha Raman", ownerPhone, ownerName: "Selvam Farm Services", machineId: tractor.id,
      machineName: tractor.name, machinePhoto: tractor.photos[0], requestedDate: dayFromToday(3), preferredTime: "07:00", duration: 4, durationUnit: "hours",
      farmLocation: { village: "Swamimalai", town: "Kumbakonam", district: "Thanjavur", pinCode: "612302" }, instructions: "Field entrance is beside the canal bund. Please call before dispatch.", estimatedAmount: tractor.hourlyRate * 4,
      status: "pending", bookingOtp: "", farmerPresent: false, operatorPresent: false, ownerResponse: "", 
    }),
    makeBooking({
      id: "VY-2046", farmerPhone, farmerName: "Kavitha Raman", ownerPhone, ownerName: "Selvam Farm Services", machineId: harvester.id,
      machineName: harvester.name, machinePhoto: harvester.photos[0], requestedDate: dayFromToday(7), preferredTime: "06:30", duration: 1, durationUnit: "days",
      farmLocation: { village: "Ayyampet", town: "Papanasam", district: "Thanjavur", pinCode: "614201" }, instructions: "Paddy harvest · about 3 acres.", estimatedAmount: harvester.dailyRate,
      status: "accepted", bookingOtp: "482731", farmerPresent: false, operatorPresent: false, ownerResponse: "Accepted for the requested day. We will confirm access the evening before.",
    }),
    makeBooking({
      id: "VY-2044", farmerPhone, farmerName: "Kavitha Raman", ownerPhone, ownerName: "Selvam Farm Services", machineId: rotavator.id,
      machineName: rotavator.name, machinePhoto: rotavator.photos[0], requestedDate: dayFromToday(1), preferredTime: "08:00", duration: 1, durationUnit: "days",
      farmLocation: { village: "Thirunageswaram", town: "Kumbakonam", district: "Thanjavur", pinCode: "612204" }, instructions: "Seedbed preparation; narrow access near the eastern side.", estimatedAmount: rotavator.dailyRate,
      status: "confirmed", bookingOtp: "517284", farmerPresent: false, operatorPresent: false, ownerResponse: "Booking confirmed in the local demo. Share the OTP only when the operator reaches your entered location.",
    }),
    makeBooking({
      id: "VY-1982", farmerPhone, farmerName: "Kavitha Raman", ownerPhone, ownerName: "Selvam Farm Services", machineId: tractor.id,
      machineName: tractor.name, machinePhoto: tractor.photos[0], requestedDate: dayFromToday(-18), preferredTime: "07:30", duration: 2, durationUnit: "days",
      farmLocation: { village: "Swamimalai", town: "Kumbakonam", district: "Thanjavur", pinCode: "612302" }, instructions: "Completed sample rental record.", estimatedAmount: tractor.dailyRate * 2,
      status: "completed", bookingOtp: "", farmerPresent: true, operatorPresent: true, ownerResponse: "Completed in the demo record.",
    }),
  ];

  return { version: 1, profiles: demoProfiles, machines: demoMachines, bookings: sampleBookings, session: null };
}
