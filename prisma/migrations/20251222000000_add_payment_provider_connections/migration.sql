-- CreateTable
CREATE TABLE "payment_provider_connections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "provider_account_id" VARCHAR(255),
    "provider_email" VARCHAR(255),
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "scopes" VARCHAR(100)[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMP(3),
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_provider_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_provider_connections_user_id_idx" ON "payment_provider_connections"("user_id");

-- CreateIndex
CREATE INDEX "payment_provider_connections_provider_idx" ON "payment_provider_connections"("provider");

-- CreateIndex
CREATE INDEX "payment_provider_connections_is_active_idx" ON "payment_provider_connections"("is_active");

-- CreateIndex (Unique constraint for one connection per provider per user)
CREATE UNIQUE INDEX "payment_provider_connections_user_id_provider_key" ON "payment_provider_connections"("user_id", "provider");

-- AddForeignKey
ALTER TABLE "payment_provider_connections" ADD CONSTRAINT "payment_provider_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
