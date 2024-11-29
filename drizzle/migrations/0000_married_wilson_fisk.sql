CREATE TABLE `posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recallId` integer NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`uri` text NOT NULL,
	`cid` text NOT NULL,
	`metadata` text,
	`embeds` text,
	`raw` text NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`recallId`) REFERENCES `recalls`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `posts_uri_unique` ON `posts` (`uri`);--> statement-breakpoint
CREATE TABLE `recalls` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sourceId` integer NOT NULL,
	`linkHref` text NOT NULL,
	`linkText` text NOT NULL,
	`product` text NOT NULL,
	`category` text NOT NULL,
	`reason` text NOT NULL,
	`company` text NOT NULL,
	`date` integer,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`sourceId`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recalls_linkHref_unique` ON `recalls` (`linkHref`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sources_key_unique` ON `sources` (`key`);
INSERT OR IGNORE INTO `sources` (`key`, `name`) VALUES ('US-FDA', 'U.S. Food and Drug Administration');
