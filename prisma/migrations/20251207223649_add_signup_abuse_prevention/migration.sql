-- CreateTable
CREATE TABLE "signup_records" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "ip_address" TEXT,
    "device_fingerprint" TEXT,
    "user_agent" TEXT,
    "free_credit_granted" BOOLEAN NOT NULL DEFAULT false,
    "is_suspicious" BOOLEAN NOT NULL DEFAULT false,
    "suspicion_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signup_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "signup_records_user_id_key" ON "signup_records"("user_id");

-- CreateIndex
CREATE INDEX "signup_records_ip_address_idx" ON "signup_records"("ip_address");

-- CreateIndex
CREATE INDEX "signup_records_device_fingerprint_idx" ON "signup_records"("device_fingerprint");

-- CreateIndex
CREATE INDEX "signup_records_free_credit_granted_idx" ON "signup_records"("free_credit_granted");

-- AddForeignKey
ALTER TABLE "signup_records" ADD CONSTRAINT "signup_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
