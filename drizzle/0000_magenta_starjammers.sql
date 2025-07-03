CREATE TABLE "pipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"pipe_id" integer NOT NULL,
	"version_number" varchar(50) NOT NULL,
	"asset_url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "versions_version_number_unique" UNIQUE("version_number")
);
--> statement-breakpoint
ALTER TABLE "versions" ADD CONSTRAINT "versions_pipe_id_pipes_id_fk" FOREIGN KEY ("pipe_id") REFERENCES "public"."pipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_pipe_version" ON "versions" USING btree ("pipe_id","version_number");