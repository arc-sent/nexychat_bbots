-- AlterTable
ALTER TABLE "User" ADD COLUMN     "coinViewed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ratingViewed" BOOLEAN NOT NULL DEFAULT true;
