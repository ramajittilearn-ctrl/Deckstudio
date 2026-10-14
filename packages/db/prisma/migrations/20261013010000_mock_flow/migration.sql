-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('DRAFT', 'APPROVED', 'PUBLISHING', 'MOCK_PUBLISHED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('APPROVED', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "content_items" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_versions" (
    "id" TEXT NOT NULL,
    "content_item_id" TEXT NOT NULL,
    "version_no" INTEGER NOT NULL,
    "caption" TEXT NOT NULL,
    "image_path" TEXT NOT NULL,
    "snapshot_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_slots" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "target_local_date" TEXT NOT NULL,
    "content_item_id" TEXT NOT NULL,
    "current_version_id" TEXT NOT NULL,
    "status" "SlotStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" TEXT NOT NULL,
    "slot_id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "snapshot_hash" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'APPROVED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publish_attempts" (
    "id" TEXT NOT NULL,
    "slot_id" TEXT NOT NULL,
    "approval_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "mock_post_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publish_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "slot_id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "slot_id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "dispatched_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "content_versions_content_item_id_version_no_key" ON "content_versions"("content_item_id", "version_no");

-- CreateIndex
CREATE UNIQUE INDEX "post_slots_content_item_id_key" ON "post_slots"("content_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_slots_brand_id_target_local_date_key" ON "post_slots"("brand_id", "target_local_date");

-- CreateIndex
CREATE UNIQUE INDEX "approvals_slot_id_version_id_key" ON "approvals"("slot_id", "version_id");

-- CreateIndex
CREATE UNIQUE INDEX "publish_attempts_slot_id_key" ON "publish_attempts"("slot_id");

-- CreateIndex
CREATE UNIQUE INDEX "publish_attempts_idempotency_key_key" ON "publish_attempts"("idempotency_key");

-- CreateIndex
CREATE INDEX "audit_events_slot_id_created_at_idx" ON "audit_events"("slot_id", "created_at");

-- CreateIndex
CREATE INDEX "outbox_events_dispatched_at_created_at_idx" ON "outbox_events"("dispatched_at", "created_at");

-- AddForeignKey
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_content_item_id_fkey" FOREIGN KEY ("content_item_id") REFERENCES "content_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_slots" ADD CONSTRAINT "post_slots_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_slots" ADD CONSTRAINT "post_slots_content_item_id_fkey" FOREIGN KEY ("content_item_id") REFERENCES "content_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_slots" ADD CONSTRAINT "post_slots_current_version_id_fkey" FOREIGN KEY ("current_version_id") REFERENCES "content_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "post_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "content_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_attempts" ADD CONSTRAINT "publish_attempts_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "post_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_attempts" ADD CONSTRAINT "publish_attempts_approval_id_fkey" FOREIGN KEY ("approval_id") REFERENCES "approvals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

