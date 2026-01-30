-- CreateEnum
CREATE TYPE "MLComplexity" AS ENUM ('SIMPLE', 'MEDIUM', 'COMPLEX');

-- CreateEnum
CREATE TYPE "MLTemplateSourceType" AS ENUM ('MANUAL', 'LEARNED', 'GENERATED');

-- CreateEnum
CREATE TYPE "MLModelStatus" AS ENUM ('TRAINING', 'READY', 'DEPLOYED', 'DEPRECATED');

-- CreateTable
CREATE TABLE "ml_training_pairs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "customer_message_id" TEXT NOT NULL,
    "customer_query" TEXT NOT NULL,
    "customer_embedding" DOUBLE PRECISION[],
    "agent_message_id" TEXT NOT NULL,
    "agent_response" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "response_time" INTEGER NOT NULL,
    "was_ai_assisted" BOOLEAN NOT NULL DEFAULT false,
    "ai_suggestion_used" BOOLEAN,
    "ai_suggestion_edited" BOOLEAN,
    "category" TEXT,
    "intent" TEXT,
    "sentiment" TEXT,
    "complexity" "MLComplexity" NOT NULL DEFAULT 'MEDIUM',
    "ticket_resolved" BOOLEAN,
    "customer_rating" INTEGER,
    "nps_score" INTEGER,
    "first_contact_resolution" BOOLEAN,
    "quality_score" DOUBLE PRECISION,
    "is_validated" BOOLEAN NOT NULL DEFAULT false,
    "validated_by" TEXT,
    "validated_at" TIMESTAMP(3),
    "used_in_training" BOOLEAN NOT NULL DEFAULT false,
    "training_batch_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ml_training_pairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ml_intent_patterns" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "example_phrases" TEXT[],
    "keywords" TEXT[],
    "centroid_embedding" DOUBLE PRECISION[],
    "suggested_response_template" TEXT,
    "occurrence_count" INTEGER NOT NULL DEFAULT 0,
    "success_rate" DOUBLE PRECISION,
    "avg_customer_rating" DOUBLE PRECISION,
    "avg_response_time" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "confidence" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ml_intent_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ml_response_templates" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "intent" TEXT,
    "template" TEXT NOT NULL,
    "variables" JSONB,
    "template_embedding" DOUBLE PRECISION[],
    "source_type" "MLTemplateSourceType" NOT NULL DEFAULT 'LEARNED',
    "source_training_pair_id" TEXT,
    "intent_pattern_id" TEXT,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "avg_rating" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ml_response_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ml_model_versions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "model_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "training_pairs_count" INTEGER NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "precision" DOUBLE PRECISION,
    "recall" DOUBLE PRECISION,
    "f1_score" DOUBLE PRECISION,
    "config_json" JSONB,
    "model_path" TEXT,
    "status" "MLModelStatus" NOT NULL DEFAULT 'TRAINING',
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "deployed_at" TIMESTAMP(3),
    "deprecated_at" TIMESTAMP(3),
    "changelog" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ml_model_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ml_learning_metrics" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "total_tickets" INTEGER NOT NULL DEFAULT 0,
    "ai_handled_tickets" INTEGER NOT NULL DEFAULT 0,
    "human_handled_tickets" INTEGER NOT NULL DEFAULT 0,
    "ai_to_human_transfers" INTEGER NOT NULL DEFAULT 0,
    "ai_resolution_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ai_avg_rating" DOUBLE PRECISION,
    "ai_nps_score" DOUBLE PRECISION,
    "new_training_pairs" INTEGER NOT NULL DEFAULT 0,
    "validated_pairs" INTEGER NOT NULL DEFAULT 0,
    "new_patterns_learned" INTEGER NOT NULL DEFAULT 0,
    "new_templates_added" INTEGER NOT NULL DEFAULT 0,
    "knowledge_gaps_found" INTEGER NOT NULL DEFAULT 0,
    "intent_accuracy" DOUBLE PRECISION,
    "template_match_rate" DOUBLE PRECISION,
    "ai_resolution_rate_delta" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ml_learning_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ml_ai_decision_logs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "customer_message" TEXT NOT NULL,
    "message_embedding" DOUBLE PRECISION[],
    "detected_intent" TEXT,
    "intent_confidence" DOUBLE PRECISION,
    "detected_category" TEXT,
    "category_confidence" DOUBLE PRECISION,
    "decision" TEXT NOT NULL,
    "decision_reason" TEXT,
    "generated_response" TEXT,
    "template_used_id" TEXT,
    "documents_used_ids" TEXT[],
    "quality_score" DOUBLE PRECISION,
    "was_correct_decision" BOOLEAN,
    "human_override" BOOLEAN NOT NULL DEFAULT false,
    "final_outcome" TEXT,
    "processing_time_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ml_ai_decision_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ml_training_batches" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "batch_number" INTEGER NOT NULL,
    "description" TEXT,
    "pairs_count" INTEGER NOT NULL,
    "patterns_created" INTEGER NOT NULL DEFAULT 0,
    "templates_created" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error" TEXT,
    "result_summary" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ml_training_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ml_training_pairs_company_id_idx" ON "ml_training_pairs"("company_id");
CREATE INDEX "ml_training_pairs_category_idx" ON "ml_training_pairs"("category");
CREATE INDEX "ml_training_pairs_intent_idx" ON "ml_training_pairs"("intent");
CREATE INDEX "ml_training_pairs_quality_score_idx" ON "ml_training_pairs"("quality_score");
CREATE INDEX "ml_training_pairs_is_validated_idx" ON "ml_training_pairs"("is_validated");
CREATE INDEX "ml_training_pairs_used_in_training_idx" ON "ml_training_pairs"("used_in_training");

-- CreateIndex
CREATE UNIQUE INDEX "ml_intent_patterns_company_id_intent_key" ON "ml_intent_patterns"("company_id", "intent");
CREATE INDEX "ml_intent_patterns_company_id_idx" ON "ml_intent_patterns"("company_id");
CREATE INDEX "ml_intent_patterns_category_idx" ON "ml_intent_patterns"("category");
CREATE INDEX "ml_intent_patterns_is_active_idx" ON "ml_intent_patterns"("is_active");
CREATE INDEX "ml_intent_patterns_is_approved_idx" ON "ml_intent_patterns"("is_approved");

-- CreateIndex
CREATE INDEX "ml_response_templates_company_id_idx" ON "ml_response_templates"("company_id");
CREATE INDEX "ml_response_templates_category_idx" ON "ml_response_templates"("category");
CREATE INDEX "ml_response_templates_intent_idx" ON "ml_response_templates"("intent");
CREATE INDEX "ml_response_templates_is_active_idx" ON "ml_response_templates"("is_active");
CREATE INDEX "ml_response_templates_is_approved_idx" ON "ml_response_templates"("is_approved");

-- CreateIndex
CREATE INDEX "ml_model_versions_company_id_idx" ON "ml_model_versions"("company_id");
CREATE INDEX "ml_model_versions_model_type_idx" ON "ml_model_versions"("model_type");
CREATE INDEX "ml_model_versions_is_active_idx" ON "ml_model_versions"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "ml_learning_metrics_company_id_date_key" ON "ml_learning_metrics"("company_id", "date");
CREATE INDEX "ml_learning_metrics_company_id_idx" ON "ml_learning_metrics"("company_id");
CREATE INDEX "ml_learning_metrics_date_idx" ON "ml_learning_metrics"("date");

-- CreateIndex
CREATE INDEX "ml_ai_decision_logs_company_id_idx" ON "ml_ai_decision_logs"("company_id");
CREATE INDEX "ml_ai_decision_logs_ticket_id_idx" ON "ml_ai_decision_logs"("ticket_id");
CREATE INDEX "ml_ai_decision_logs_detected_intent_idx" ON "ml_ai_decision_logs"("detected_intent");
CREATE INDEX "ml_ai_decision_logs_decision_idx" ON "ml_ai_decision_logs"("decision");
CREATE INDEX "ml_ai_decision_logs_created_at_idx" ON "ml_ai_decision_logs"("created_at");

-- CreateIndex
CREATE INDEX "ml_training_batches_company_id_idx" ON "ml_training_batches"("company_id");
CREATE INDEX "ml_training_batches_status_idx" ON "ml_training_batches"("status");

-- AddForeignKey
ALTER TABLE "ml_training_pairs" ADD CONSTRAINT "ml_training_pairs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_intent_patterns" ADD CONSTRAINT "ml_intent_patterns_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_response_templates" ADD CONSTRAINT "ml_response_templates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ml_response_templates" ADD CONSTRAINT "ml_response_templates_intent_pattern_id_fkey" FOREIGN KEY ("intent_pattern_id") REFERENCES "ml_intent_patterns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_model_versions" ADD CONSTRAINT "ml_model_versions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_learning_metrics" ADD CONSTRAINT "ml_learning_metrics_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_ai_decision_logs" ADD CONSTRAINT "ml_ai_decision_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_training_batches" ADD CONSTRAINT "ml_training_batches_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
