-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('PURCHASE', 'GRANT', 'SPEND', 'REFUND', 'RESTORE', 'ADMIN', 'PROMO', 'REFERRAL', 'EXPIRE');

-- AlterTable
ALTER TABLE "signup_records" ADD COLUMN     "phone_number" VARCHAR(20),
ADD COLUMN     "phone_verified_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "usage_logs" ADD COLUMN     "amount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "interview_id" UUID,
ADD COLUMN     "resource_type" VARCHAR(50);

-- CreateTable
CREATE TABLE "credits_wallets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "total_earned" INTEGER NOT NULL DEFAULT 0,
    "total_spent" INTEGER NOT NULL DEFAULT 0,
    "total_purchased" INTEGER NOT NULL DEFAULT 0,
    "total_granted" INTEGER NOT NULL DEFAULT 0,
    "last_credit_at" TIMESTAMP(3),
    "last_debit_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credits_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_ledger" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "CreditTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reference_type" VARCHAR(50),
    "reference_id" UUID,
    "description" VARCHAR(255) NOT NULL,
    "metadata" JSONB,
    "idempotency_key" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_cards" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "last_four" VARCHAR(4) NOT NULL,
    "brand" VARCHAR(20) NOT NULL,
    "expiry_month" VARCHAR(2) NOT NULL,
    "expiry_year" VARCHAR(4) NOT NULL,
    "holder_name" VARCHAR(100) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_documents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "base64_data" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "parsed_text" TEXT,
    "parsed_metadata" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parent_version_id" UUID,
    "is_latest" BOOLEAN NOT NULL DEFAULT true,
    "quality_score" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_phones" (
    "id" UUID NOT NULL,
    "phone_number" VARCHAR(20) NOT NULL,
    "reason" TEXT NOT NULL,
    "blocked_by" TEXT NOT NULL,
    "blocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_phones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credits_wallets_user_id_key" ON "credits_wallets"("user_id");

-- CreateIndex
CREATE INDEX "credits_wallets_balance_idx" ON "credits_wallets"("balance");

-- CreateIndex
CREATE UNIQUE INDEX "credit_ledger_idempotency_key_key" ON "credit_ledger"("idempotency_key");

-- CreateIndex
CREATE INDEX "credit_ledger_user_id_created_at_idx" ON "credit_ledger"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "credit_ledger_type_idx" ON "credit_ledger"("type");

-- CreateIndex
CREATE INDEX "credit_ledger_reference_type_reference_id_idx" ON "credit_ledger"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "credit_ledger_created_at_idx" ON "credit_ledger"("created_at");

-- CreateIndex
CREATE INDEX "saved_cards_user_id_idx" ON "saved_cards"("user_id");

-- CreateIndex
CREATE INDEX "saved_cards_is_default_idx" ON "saved_cards"("is_default");

-- CreateIndex
CREATE INDEX "resume_documents_user_id_idx" ON "resume_documents"("user_id");

-- CreateIndex
CREATE INDEX "resume_documents_is_primary_idx" ON "resume_documents"("is_primary");

-- CreateIndex
CREATE INDEX "resume_documents_is_active_is_latest_idx" ON "resume_documents"("is_active", "is_latest");

-- CreateIndex
CREATE INDEX "resume_documents_tags_idx" ON "resume_documents"("tags");

-- CreateIndex
CREATE UNIQUE INDEX "blocked_phones_phone_number_key" ON "blocked_phones"("phone_number");

-- CreateIndex
CREATE INDEX "blocked_phones_phone_number_idx" ON "blocked_phones"("phone_number");

-- CreateIndex
CREATE INDEX "signup_records_phone_number_idx" ON "signup_records"("phone_number");

-- CreateIndex
CREATE INDEX "usage_logs_user_id_resource_type_created_at_idx" ON "usage_logs"("user_id", "resource_type", "created_at");

-- AddForeignKey
ALTER TABLE "credits_wallets" ADD CONSTRAINT "credits_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_cards" ADD CONSTRAINT "saved_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_documents" ADD CONSTRAINT "resume_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_documents" ADD CONSTRAINT "resume_documents_parent_version_id_fkey" FOREIGN KEY ("parent_version_id") REFERENCES "resume_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
