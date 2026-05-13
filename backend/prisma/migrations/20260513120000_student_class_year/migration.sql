-- AlterTable
ALTER TABLE "students" ADD COLUMN "class_year" INTEGER NOT NULL DEFAULT 11;

-- CreateIndex
CREATE INDEX "students_class_year_idx" ON "students"("class_year");
