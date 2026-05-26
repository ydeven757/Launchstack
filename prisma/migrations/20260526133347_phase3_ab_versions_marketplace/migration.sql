-- CreateTable
CREATE TABLE "PageVariant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 50,
    "blocksJson" TEXT NOT NULL DEFAULT '[]',
    "isControl" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PageVariant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PageVariant_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PageVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "blocksJson" TEXT NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "publishedBy" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PageVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PageVersion_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketplaceProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "network" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "vendor" TEXT,
    "niche" TEXT,
    "category" TEXT,
    "gravity" REAL,
    "avgPayout" REAL,
    "initialPayout" REAL,
    "rebillPayout" REAL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "commission" REAL,
    "hopUrl" TEXT NOT NULL,
    "salesPageUrl" TEXT,
    "description" TEXT,
    "recommendedFunnel" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Page" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "funnelId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'OPT_IN',
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "state" TEXT NOT NULL DEFAULT 'DRAFT',
    "blocksJson" TEXT NOT NULL DEFAULT '[]',
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoImage" TEXT,
    "publishedBlocks" TEXT,
    "publishedAt" DATETIME,
    "requiresDisclosure" BOOLEAN NOT NULL DEFAULT false,
    "abEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Page_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Page_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "Funnel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Page" ("blocksJson", "createdAt", "funnelId", "id", "name", "position", "publishedAt", "publishedBlocks", "seoDescription", "seoImage", "seoTitle", "slug", "state", "tenantId", "type", "updatedAt") SELECT "blocksJson", "createdAt", "funnelId", "id", "name", "position", "publishedAt", "publishedBlocks", "seoDescription", "seoImage", "seoTitle", "slug", "state", "tenantId", "type", "updatedAt" FROM "Page";
DROP TABLE "Page";
ALTER TABLE "new_Page" RENAME TO "Page";
CREATE INDEX "Page_tenantId_idx" ON "Page"("tenantId");
CREATE INDEX "Page_funnelId_idx" ON "Page"("funnelId");
CREATE UNIQUE INDEX "Page_tenantId_slug_key" ON "Page"("tenantId", "slug");
CREATE TABLE "new_Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "niche" TEXT,
    "trafficSource" TEXT,
    "conversionGoal" TEXT,
    "brandPrimary" TEXT NOT NULL DEFAULT '#2563eb',
    "brandSecondary" TEXT NOT NULL DEFAULT '#0f172a',
    "brandLogo" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "disclosureText" TEXT,
    "legalFooterHtml" TEXT,
    "onboardingDone" BOOLEAN NOT NULL DEFAULT false,
    "ownerUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tenant_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Tenant" ("brandLogo", "brandPrimary", "brandSecondary", "conversionGoal", "createdAt", "id", "name", "niche", "ownerUserId", "plan", "slug", "status", "timezone", "trafficSource", "updatedAt") SELECT "brandLogo", "brandPrimary", "brandSecondary", "conversionGoal", "createdAt", "id", "name", "niche", "ownerUserId", "plan", "slug", "status", "timezone", "trafficSource", "updatedAt" FROM "Tenant";
DROP TABLE "Tenant";
ALTER TABLE "new_Tenant" RENAME TO "Tenant";
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PageVariant_tenantId_idx" ON "PageVariant"("tenantId");

-- CreateIndex
CREATE INDEX "PageVariant_pageId_idx" ON "PageVariant"("pageId");

-- CreateIndex
CREATE INDEX "PageVersion_tenantId_idx" ON "PageVersion"("tenantId");

-- CreateIndex
CREATE INDEX "PageVersion_pageId_idx" ON "PageVersion"("pageId");

-- CreateIndex
CREATE INDEX "MarketplaceProduct_niche_idx" ON "MarketplaceProduct"("niche");

-- CreateIndex
CREATE INDEX "MarketplaceProduct_gravity_idx" ON "MarketplaceProduct"("gravity");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceProduct_network_externalId_key" ON "MarketplaceProduct"("network", "externalId");
