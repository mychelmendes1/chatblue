-- Make connection_id nullable on tickets and messages so that when a connection (session) is deleted,
-- conversations are preserved and can be reattached to a new connection when the company reconnects.
ALTER TABLE "tickets" ALTER COLUMN "connection_id" DROP NOT NULL;
ALTER TABLE "messages" ALTER COLUMN "connection_id" DROP NOT NULL;
