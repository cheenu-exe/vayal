CREATE TABLE `availability_blocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listingId` int NOT NULL,
	`ownerId` int NOT NULL,
	`startDate` varchar(10) NOT NULL,
	`endDate` varchar(10) NOT NULL,
	`reason` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `availability_blocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `availability_blocks` ADD CONSTRAINT `availability_blocks_listingId_machinery_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `machinery_listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `availability_blocks` ADD CONSTRAINT `availability_blocks_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `availability_listing_dates_idx` ON `availability_blocks` (`listingId`,`startDate`,`endDate`);