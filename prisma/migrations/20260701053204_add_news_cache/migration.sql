-- CreateTable
CREATE TABLE "NewsCache" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "articles" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsCache_pkey" PRIMARY KEY ("id")
);
