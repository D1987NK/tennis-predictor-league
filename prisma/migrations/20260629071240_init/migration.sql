-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Tour" AS ENUM ('ATP', 'WTA');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('UPCOMING', 'PUBLISHED', 'LOCKED', 'FINISHED');

-- CreateEnum
CREATE TYPE "ImportType" AS ENUM ('MATCHES', 'RESULTS');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "tournament" TEXT NOT NULL,
    "draw" TEXT NOT NULL,
    "tour" "Tour" NOT NULL,
    "round" TEXT,
    "bestOf" INTEGER NOT NULL DEFAULT 3,
    "matchDate" DATE NOT NULL,
    "timeBst" TEXT,
    "timeAest" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "player1" TEXT NOT NULL,
    "player2" TEXT NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'UPCOMING',
    "winner" TEXT,
    "finalScore" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "importBatchId" TEXT,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchSet" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "player1Games" INTEGER NOT NULL,
    "player2Games" INTEGER NOT NULL,

    CONSTRAINT "MatchSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prediction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "predictedWinner" TEXT NOT NULL,
    "predictedScore" TEXT NOT NULL,
    "predictedSets" JSONB NOT NULL,
    "pointsAwarded" INTEGER,
    "winnerCorrect" BOOLEAN NOT NULL DEFAULT false,
    "scoreCorrect" BOOLEAN NOT NULL DEFAULT false,
    "setsCorrect" INTEGER NOT NULL DEFAULT 0,
    "scoredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "type" "ImportType" NOT NULL,
    "fileName" TEXT,
    "uploadedById" TEXT,
    "rowsTotal" INTEGER NOT NULL DEFAULT 0,
    "rowsValid" INTEGER NOT NULL DEFAULT 0,
    "rowsInvalid" INTEGER NOT NULL DEFAULT 0,
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_totalPoints_idx" ON "User"("totalPoints");

-- CreateIndex
CREATE INDEX "Match_matchDate_status_idx" ON "Match"("matchDate", "status");

-- CreateIndex
CREATE INDEX "Match_tour_idx" ON "Match"("tour");

-- CreateIndex
CREATE UNIQUE INDEX "Match_tournament_matchDate_player1_player2_key" ON "Match"("tournament", "matchDate", "player1", "player2");

-- CreateIndex
CREATE UNIQUE INDEX "MatchSet_matchId_setNumber_key" ON "MatchSet"("matchId", "setNumber");

-- CreateIndex
CREATE INDEX "Prediction_matchId_idx" ON "Prediction"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "Prediction_userId_matchId_key" ON "Prediction"("userId", "matchId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSet" ADD CONSTRAINT "MatchSet_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
