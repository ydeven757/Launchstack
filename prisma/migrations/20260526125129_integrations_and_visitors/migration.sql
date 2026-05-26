-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT,
    "credentials" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastEventAt" DATETIME,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Integration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Visitor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "cookieId" TEXT NOT NULL,
    "contactId" TEXT,
    "fbclid" TEXT,
    "gclid" TEXT,
    "ttclid" TEXT,
    "msclkid" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "country" TEXT,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL,
    CONSTRAINT "Visitor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClickEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "tid" TEXT NOT NULL,
    "visitorId" TEXT,
    "contactId" TEXT,
    "linkId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "utmJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClickEvent_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "Visitor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Integration_tenantId_idx" ON "Integration"("tenantId");

-- CreateIndex
CREATE INDEX "Integration_type_idx" ON "Integration"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Visitor_cookieId_key" ON "Visitor"("cookieId");

-- CreateIndex
CREATE INDEX "Visitor_tenantId_idx" ON "Visitor"("tenantId");

-- CreateIndex
CREATE INDEX "Visitor_contactId_idx" ON "Visitor"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "ClickEvent_tid_key" ON "ClickEvent"("tid");

-- CreateIndex
CREATE INDEX "ClickEvent_tenantId_idx" ON "ClickEvent"("tenantId");

-- CreateIndex
CREATE INDEX "ClickEvent_visitorId_idx" ON "ClickEvent"("visitorId");

-- CreateIndex
CREATE INDEX "ClickEvent_contactId_idx" ON "ClickEvent"("contactId");
