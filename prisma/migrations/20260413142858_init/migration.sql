-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prior" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "claim" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "currentProbability" DOUBLE PRECISION NOT NULL,
    "distributionType" TEXT NOT NULL DEFAULT 'POINT',
    "distributionParams" TEXT NOT NULL DEFAULT '{}',
    "creatorId" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "updateCount" INTEGER NOT NULL DEFAULT 0,
    "trendingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prior_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriorUpdate" (
    "id" TEXT NOT NULL,
    "priorId" TEXT NOT NULL,
    "userId" TEXT,
    "sourceType" TEXT NOT NULL,
    "evidenceDescription" TEXT NOT NULL,
    "likelihoodRatio" DOUBLE PRECISION,
    "probabilityBefore" DOUBLE PRECISION NOT NULL,
    "probabilityAfter" DOUBLE PRECISION NOT NULL,
    "distributionBefore" TEXT,
    "distributionAfter" TEXT,
    "dataFeedLinkId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriorUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriorSnapshot" (
    "id" TEXT NOT NULL,
    "priorId" TEXT NOT NULL,
    "probability" DOUBLE PRECISION NOT NULL,
    "distributionParams" TEXT,
    "snapshotDate" DATE NOT NULL,

    CONSTRAINT "PriorSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataFeed" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "apiKeyEncrypted" TEXT,
    "pollIntervalSeconds" INTEGER NOT NULL DEFAULT 300,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataFeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataFeedLink" (
    "id" TEXT NOT NULL,
    "priorId" TEXT NOT NULL,
    "dataFeedId" TEXT NOT NULL,
    "externalMarketId" TEXT NOT NULL,
    "lastPolledAt" TIMESTAMP(3),
    "lastExternalValue" DOUBLE PRECISION,
    "dampingFactor" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "mappingConfig" TEXT NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataFeedLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "priorUpdateId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Prior_slug_key" ON "Prior"("slug");

-- CreateIndex
CREATE INDEX "Prior_trendingScore_idx" ON "Prior"("trendingScore" DESC);

-- CreateIndex
CREATE INDEX "Prior_category_idx" ON "Prior"("category");

-- CreateIndex
CREATE INDEX "Prior_creatorId_idx" ON "Prior"("creatorId");

-- CreateIndex
CREATE INDEX "PriorUpdate_priorId_createdAt_idx" ON "PriorUpdate"("priorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PriorUpdate_userId_idx" ON "PriorUpdate"("userId");

-- CreateIndex
CREATE INDEX "PriorSnapshot_priorId_idx" ON "PriorSnapshot"("priorId");

-- CreateIndex
CREATE UNIQUE INDEX "PriorSnapshot_priorId_snapshotDate_key" ON "PriorSnapshot"("priorId", "snapshotDate");

-- CreateIndex
CREATE INDEX "DataFeedLink_isActive_lastPolledAt_idx" ON "DataFeedLink"("isActive", "lastPolledAt");

-- CreateIndex
CREATE UNIQUE INDEX "DataFeedLink_priorId_dataFeedId_externalMarketId_key" ON "DataFeedLink"("priorId", "dataFeedId", "externalMarketId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_userId_priorUpdateId_key" ON "Vote"("userId", "priorUpdateId");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prior" ADD CONSTRAINT "Prior_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriorUpdate" ADD CONSTRAINT "PriorUpdate_priorId_fkey" FOREIGN KEY ("priorId") REFERENCES "Prior"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriorUpdate" ADD CONSTRAINT "PriorUpdate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriorUpdate" ADD CONSTRAINT "PriorUpdate_dataFeedLinkId_fkey" FOREIGN KEY ("dataFeedLinkId") REFERENCES "DataFeedLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriorSnapshot" ADD CONSTRAINT "PriorSnapshot_priorId_fkey" FOREIGN KEY ("priorId") REFERENCES "Prior"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataFeedLink" ADD CONSTRAINT "DataFeedLink_priorId_fkey" FOREIGN KEY ("priorId") REFERENCES "Prior"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataFeedLink" ADD CONSTRAINT "DataFeedLink_dataFeedId_fkey" FOREIGN KEY ("dataFeedId") REFERENCES "DataFeed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_priorUpdateId_fkey" FOREIGN KEY ("priorUpdateId") REFERENCES "PriorUpdate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
