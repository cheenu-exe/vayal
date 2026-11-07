CREATE TABLE `machinery_listings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`machineName` varchar(100) NOT NULL,
	`category` enum('tractor','harvester','tillage','seeding','spraying','irrigation','other') NOT NULL,
	`description` text,
	`operations` text NOT NULL,
	`brand` varchar(80),
	`modelYear` int,
	`horsepower` int,
	`priceUnit` enum('hour','acre','day','trip') NOT NULL,
	`priceRupees` int NOT NULL,
	`district` varchar(80) NOT NULL,
	`taluk` varchar(80) NOT NULL,
	`village` varchar(100) NOT NULL,
	`serviceRadiusKm` int NOT NULL DEFAULT 20,
	`transportAvailable` boolean NOT NULL DEFAULT false,
	`imageUrl` text,
	`status` enum('active','paused') NOT NULL DEFAULT 'active',
	`isDemo` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `machinery_listings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rental_bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listingId` int NOT NULL,
	`farmerId` int NOT NULL,
	`ownerId` int NOT NULL,
	`startDate` varchar(10) NOT NULL,
	`endDate` varchar(10) NOT NULL,
	`operation` varchar(100) NOT NULL,
	`areaAcres` decimal(8,2),
	`farmerDistrict` varchar(80) NOT NULL,
	`farmerVillage` varchar(100) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`logisticsNote` text,
	`status` enum('pending','accepted','rejected','cancelled','completed') NOT NULL DEFAULT 'pending',
	`ownerResponse` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rental_bookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`farmerEnabled` boolean NOT NULL DEFAULT false,
	`ownerEnabled` boolean NOT NULL DEFAULT false,
	`phone` varchar(20),
	`district` varchar(80),
	`taluk` varchar(80),
	`village` varchar(100),
	`language` enum('en','ta') NOT NULL DEFAULT 'en',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_profiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `machinery_listings` ADD CONSTRAINT `machinery_listings_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rental_bookings` ADD CONSTRAINT `rental_bookings_listingId_machinery_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `machinery_listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rental_bookings` ADD CONSTRAINT `rental_bookings_farmerId_users_id_fk` FOREIGN KEY (`farmerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rental_bookings` ADD CONSTRAINT `rental_bookings_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD CONSTRAINT `user_profiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `machinery_location_idx` ON `machinery_listings` (`district`,`taluk`);--> statement-breakpoint
CREATE INDEX `machinery_owner_idx` ON `machinery_listings` (`ownerId`,`status`);--> statement-breakpoint
CREATE INDEX `machinery_discovery_idx` ON `machinery_listings` (`category`,`status`,`priceRupees`);--> statement-breakpoint
CREATE INDEX `booking_farmer_idx` ON `rental_bookings` (`farmerId`,`status`);--> statement-breakpoint
CREATE INDEX `booking_owner_idx` ON `rental_bookings` (`ownerId`,`status`);--> statement-breakpoint
CREATE INDEX `booking_schedule_idx` ON `rental_bookings` (`listingId`,`startDate`,`endDate`);