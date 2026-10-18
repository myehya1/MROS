/*
  Warnings:

  - A unique constraint covering the columns `[kioskCode]` on the table `Restaurant` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "kioskCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_kioskCode_key" ON "Restaurant"("kioskCode");
