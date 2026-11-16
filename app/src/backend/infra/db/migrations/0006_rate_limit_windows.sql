CREATE TABLE "rate_limit_windows" (
	"key" text NOT NULL,
	"window_seconds" integer NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"hits" integer NOT NULL,
	CONSTRAINT "rate_limit_windows_key_window_seconds_window_start_pk" PRIMARY KEY("key","window_seconds","window_start")
);
