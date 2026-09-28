-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "department" TEXT,
    "employeeCode" TEXT,
    "avatar" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientType" TEXT NOT NULL,
    "personalName" TEXT,
    "officialName" TEXT,
    "documentName" TEXT,
    "bizNumber" TEXT,
    "ceoName" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "address" TEXT,
    "salesManagerId" TEXT,
    "creditLimit" INTEGER,
    "currentBalance" INTEGER DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "organizationType" TEXT,
    "contractNumber" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "clients_salesManagerId_fkey" FOREIGN KEY ("salesManagerId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "travel_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productType" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "description" TEXT,
    "basePrice" INTEGER NOT NULL,
    "seasonalPricing" TEXT,
    "options" TEXT,
    "duration" INTEGER,
    "minParticipants" INTEGER,
    "maxParticipants" INTEGER,
    "region" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "standardTemplateId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "totalDays" INTEGER NOT NULL DEFAULT 1,
    "startTime" TEXT,
    "endTime" TEXT,
    "departureLocation" TEXT,
    "arrivalLocation" TEXT,
    "contractId" TEXT,
    "clientId" TEXT,
    "participants" INTEGER NOT NULL DEFAULT 0,
    "adultCount" INTEGER NOT NULL DEFAULT 0,
    "childCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "remark" TEXT,
    "specialRequest" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "schedules_productId_fkey" FOREIGN KEY ("productId") REFERENCES "travel_products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "schedules_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "schedules_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractNumber" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "contractDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "depositAmount" INTEGER,
    "depositPaid" INTEGER NOT NULL DEFAULT 0,
    "balancePaid" INTEGER NOT NULL DEFAULT 0,
    "items" TEXT,
    "quotedBy" TEXT,
    "approvedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "contracts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "travel_products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "contracts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleType" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "ownership" TEXT NOT NULL DEFAULT 'OWN',
    "externalCompany" TEXT,
    "externalCost" INTEGER,
    "maxDailyHours" INTEGER DEFAULT 10,
    "allowedRegions" TEXT,
    "insuranceExpiry" DATETIME,
    "inspectionExpiry" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "licenseType" TEXT NOT NULL,
    "licenseExpiry" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "availableRegion" TEXT,
    "overtimeAllowed" BOOLEAN NOT NULL DEFAULT false,
    "maxDailyHours" INTEGER DEFAULT 10,
    "weeklyRestDays" TEXT,
    "preferredRoutes" TEXT,
    "excludedRoutes" TEXT,
    "isExternal" BOOLEAN NOT NULL DEFAULT false,
    "externalCompany" TEXT,
    "complaintCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "rating" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "drivers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "guides" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "languages" TEXT,
    "specializations" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "availableRegion" TEXT,
    "preferredTypes" TEXT,
    "excludedTypes" TEXT,
    "tourCount" INTEGER NOT NULL DEFAULT 0,
    "rating" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "guides_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dispatches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduleId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "guideId" TEXT,
    "scheduledStart" DATETIME NOT NULL,
    "scheduledEnd" DATETIME NOT NULL,
    "actualStart" DATETIME,
    "actualEnd" DATETIME,
    "departureLocation" TEXT,
    "arrivalLocation" TEXT,
    "route" TEXT,
    "specialConditions" TEXT,
    "notes" TEXT,
    "issues" TEXT,
    "autoRecommended" BOOLEAN NOT NULL DEFAULT false,
    "recommendationScore" INTEGER,
    "warnings" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "forcedBy" TEXT,
    "forcedReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "dispatches_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "dispatches_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "dispatches_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "dispatches_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "guides" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "driver_work_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dispatchId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "breakStartTime" DATETIME,
    "breakEndTime" DATETIME,
    "startOdometer" INTEGER,
    "endOdometer" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'STARTED',
    "photos" TEXT,
    "issues" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "driver_work_logs_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "dispatches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "driver_work_logs_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dispatch_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "conditions" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "accounting_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryNumber" TEXT NOT NULL,
    "entryDate" DATETIME NOT NULL,
    "entryType" TEXT NOT NULL,
    "accountCode" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "subAccountCode" TEXT,
    "debit" INTEGER NOT NULL DEFAULT 0,
    "credit" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "contractId" TEXT,
    "dispatchId" TEXT,
    "settlementId" TEXT,
    "dzExportReady" BOOLEAN NOT NULL DEFAULT false,
    "dzExportedAt" DATETIME,
    "dzExportStatus" TEXT,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "accounting_entries_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "accounting_slips" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slipNumber" TEXT NOT NULL,
    "slipDate" DATETIME NOT NULL,
    "slipType" TEXT NOT NULL,
    "totalDebit" INTEGER NOT NULL DEFAULT 0,
    "totalCredit" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "remark" TEXT,
    "createdBy" TEXT,
    "department" TEXT,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "dzSlipNumber" TEXT,
    "dzExportedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "settlementNumber" TEXT NOT NULL,
    "settlementDate" DATETIME NOT NULL,
    "settlementEndDate" DATETIME NOT NULL,
    "settlementType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetName" TEXT NOT NULL,
    "driverId" TEXT,
    "guideId" TEXT,
    "baseAmount" INTEGER NOT NULL DEFAULT 0,
    "overtimeAmount" INTEGER NOT NULL DEFAULT 0,
    "bonusAmount" INTEGER NOT NULL DEFAULT 0,
    "deductionAmount" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "details" TEXT,
    "paidAt" DATETIME,
    "paymentMethod" TEXT,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "settlements_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "settlements_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "guides" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "raw_import_files" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileType" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parsedStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "parsedAt" DATETIME,
    "parseMessage" TEXT,
    "mappedTarget" TEXT,
    "mappingConfig" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "raw_import_rows" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileId" TEXT NOT NULL,
    "sheetName" TEXT,
    "rowIndex" INTEGER NOT NULL,
    "rawJson" TEXT NOT NULL,
    "mappedToTable" TEXT,
    "mappedToId" TEXT,
    "mappedStatus" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "raw_import_rows_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "raw_import_files" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "document_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institutionType" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "templatePath" TEXT NOT NULL,
    "templateFormat" TEXT NOT NULL,
    "fieldMapping" TEXT NOT NULL,
    "coordinateMapping" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "document_fields" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldCode" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "x" REAL,
    "y" REAL,
    "width" REAL,
    "height" REAL,
    "sourceTable" TEXT,
    "sourceField" TEXT,
    "transformFunction" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "document_fields_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "document_templates" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "document_output_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "outputPath" TEXT NOT NULL,
    "outputFormat" TEXT NOT NULL,
    "dataSnapshot" TEXT NOT NULL,
    "printedBy" TEXT NOT NULL,
    "printedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isOfficialDoc" BOOLEAN NOT NULL DEFAULT false,
    "officialDocRef" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "notification_queue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetPhone" TEXT,
    "targetEmail" TEXT,
    "channel" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" TEXT,
    "scheduledAt" DATETIME,
    "sentAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "userName" TEXT,
    "userRole" TEXT,
    "action" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "description" TEXT,
    "prevHash" TEXT,
    "entryHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "fails" INTEGER NOT NULL DEFAULT 0,
    "firstFail" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "douzone_export_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "requestPayload" TEXT NOT NULL,
    "responsePayload" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetryAt" DATETIME
);

-- CreateTable
CREATE TABLE "stats_cache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cacheKey" TEXT NOT NULL,
    "cacheType" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "dataCount" INTEGER NOT NULL DEFAULT 0,
    "validUntil" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_employeeCode_key" ON "users"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "clients_bizNumber_key" ON "clients"("bizNumber");

-- CreateIndex
CREATE UNIQUE INDEX "travel_products_productCode_key" ON "travel_products"("productCode");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_contractNumber_key" ON "contracts"("contractNumber");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_plateNumber_key" ON "vehicles"("plateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_userId_key" ON "drivers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_licenseNumber_key" ON "drivers"("licenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "guides_userId_key" ON "guides"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "guides_licenseNumber_key" ON "guides"("licenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_entries_entryNumber_key" ON "accounting_entries"("entryNumber");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_slips_slipNumber_key" ON "accounting_slips"("slipNumber");

-- CreateIndex
CREATE UNIQUE INDEX "settlements_settlementNumber_key" ON "settlements"("settlementNumber");

-- CreateIndex
CREATE UNIQUE INDEX "settlements_driverId_key" ON "settlements"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "settlements_guideId_key" ON "settlements"("guideId");

-- CreateIndex
CREATE UNIQUE INDEX "document_fields_fieldCode_key" ON "document_fields"("fieldCode");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "app_settings_key_key" ON "app_settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "login_attempts_key_key" ON "login_attempts"("key");

-- CreateIndex
CREATE UNIQUE INDEX "stats_cache_cacheKey_key" ON "stats_cache"("cacheKey");

