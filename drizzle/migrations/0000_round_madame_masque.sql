CREATE TABLE `recalls` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` integer,
	`linkHref` text NOT NULL,
	`linkText` text NOT NULL,
	`product` text NOT NULL,
	`category` text NOT NULL,
	`reason` text NOT NULL,
	`company` text NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recalls_linkHref_unique` ON `recalls` (`linkHref`);