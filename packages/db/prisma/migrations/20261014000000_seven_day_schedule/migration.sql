-- CreateEnum
CREATE TYPE "SchedulingMode" AS ENUM ('TEST_NOW', 'SCHEDULED');

-- AlterEnum
ALTER TYPE "SlotStatus" ADD VALUE 'MISSED';

-- DropIndex
DROP INDEX "post_slots_brand_id_target_local_date_key";

-- AlterTable
ALTER TABLE "post_slots" ADD COLUMN     "mode" "SchedulingMode" NOT NULL DEFAULT 'TEST_NOW',
ADD COLUMN     "publish_at_utc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "post_slots_brand_id_target_local_date_mode_key" ON "post_slots"("brand_id", "target_local_date", "mode");

-- AddForeignKey
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "post_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

