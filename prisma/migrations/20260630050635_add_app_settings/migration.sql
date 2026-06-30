-- CreateTable
CREATE TABLE "AppSetting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "predictionCutoffEnabled" BOOLEAN NOT NULL DEFAULT true,
    "predictionCutoffTime" TEXT NOT NULL DEFAULT '19:00',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);
