PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_recalls` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sourceId` integer NOT NULL,
	`url` text NOT NULL,
	`brand` text NOT NULL,
	`product` text NOT NULL,
	`category` text NOT NULL,
	`reason` text NOT NULL,
	`company` text NOT NULL,
	`date` integer NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`sourceId`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_recalls`("id", "sourceId", "url", "brand", "product", "category", "reason", "company", "date", "createdAt", "updatedAt", "deleted_at") SELECT "id", "sourceId", "url", "brand", "product", "category", "reason", "company", "date", "createdAt", "updatedAt", "deleted_at" FROM `recalls`;--> statement-breakpoint
DROP TABLE `recalls`;--> statement-breakpoint
ALTER TABLE `__new_recalls` RENAME TO `recalls`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `recalls_url_unique` ON `recalls` (`url`);