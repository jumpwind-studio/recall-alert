PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recallId` integer,
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
	FOREIGN KEY (`recallId`) REFERENCES `recalls`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_posts`("id", "recallId", "title", "content", "uri", "cid", "metadata", "embeds", "raw", "createdAt", "updatedAt", "deleted_at") SELECT "id", "recallId", "title", "content", "uri", "cid", "metadata", "embeds", "raw", "createdAt", "updatedAt", "deleted_at" FROM `posts`;--> statement-breakpoint
DROP TABLE `posts`;--> statement-breakpoint
ALTER TABLE `__new_posts` RENAME TO `posts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `posts_uri_unique` ON `posts` (`uri`);