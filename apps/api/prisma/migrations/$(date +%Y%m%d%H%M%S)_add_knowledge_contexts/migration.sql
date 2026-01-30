-- CreateEnum
CREATE TYPE "KnowledgeSourceType" AS ENUM ('TEXT', 'PDF', 'NOTION', 'URL', 'DOCX', 'CSV', 'JSON');

-- CreateEnum
CREATE TYPE "KnowledgeSourceStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "knowledge_contexts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "system_prompt" TEXT,
    "keywords" TEXT[],
    "priority" INTEGER NOT NULL DEFAULT 0,
    "ai_agent_ids" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "company_id" TEXT NOT NULL,

    CONSTRAINT "knowledge_contexts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "KnowledgeSourceType" NOT NULL,
    "status" "KnowledgeSourceStatus" NOT NULL DEFAULT 'PENDING',
    "source_url" TEXT,
    "file_path" TEXT,
    "content" TEXT,
    "metadata" JSONB,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "processed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "context_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,

    CONSTRAINT "knowledge_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_chunks" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" TEXT,
    "chunk_index" INTEGER NOT NULL,
    "start_char" INTEGER,
    "end_char" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source_id" TEXT NOT NULL,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_contexts_company_id_slug_key" ON "knowledge_contexts"("company_id", "slug");

-- CreateIndex
CREATE INDEX "knowledge_contexts_company_id_is_active_idx" ON "knowledge_contexts"("company_id", "is_active");

-- CreateIndex
CREATE INDEX "knowledge_sources_context_id_status_idx" ON "knowledge_sources"("context_id", "status");

-- CreateIndex
CREATE INDEX "knowledge_sources_company_id_type_idx" ON "knowledge_sources"("company_id", "type");

-- CreateIndex
CREATE INDEX "knowledge_chunks_source_id_chunk_index_idx" ON "knowledge_chunks"("source_id", "chunk_index");

-- AddForeignKey
ALTER TABLE "knowledge_contexts" ADD CONSTRAINT "knowledge_contexts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_context_id_fkey" FOREIGN KEY ("context_id") REFERENCES "knowledge_contexts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "knowledge_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;






