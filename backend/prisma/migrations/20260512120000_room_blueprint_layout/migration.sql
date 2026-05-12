-- Room blueprint layout (grid coordinates + spans)
ALTER TABLE "rooms" ADD COLUMN "x_position" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "rooms" ADD COLUMN "y_position" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "rooms" ADD COLUMN "layout_width" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "rooms" ADD COLUMN "layout_height" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX "rooms_hostel_id_floor_idx" ON "rooms"("hostel_id", "floor");
