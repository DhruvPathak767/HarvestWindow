-- AlterTable: add harvest_outcomes and prediction_evaluations relationships

-- CreateTable
CREATE TABLE `harvest_outcomes` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NOT NULL,
    `cropId` VARCHAR(191) NOT NULL,
    `predictionId` VARCHAR(191) NULL,
    `actualHarvestDate` DATETIME(3) NOT NULL,
    `actualHarvestStart` DATETIME(3) NULL,
    `actualHarvestEnd` DATETIME(3) NULL,
    `season` VARCHAR(50) NULL,
    `outcomeSource` VARCHAR(50) NOT NULL DEFAULT 'FARMER_RECORDED',
    `verificationStatus` VARCHAR(40) NOT NULL DEFAULT 'PENDING_VERIFICATION',
    `verifiedAt` DATETIME(3) NULL,
    `verifiedByUserId` VARCHAR(191) NULL,
    `verificationNotes` TEXT NULL,
    `consentEvaluation` BOOLEAN NOT NULL DEFAULT true,
    `consentTraining` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NULL,
    `correctionCount` INTEGER NOT NULL DEFAULT 0,
    `previousOutcomeJson` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `harvest_outcomes_userId_cropId_idx`(`userId`, `cropId`),
    INDEX `harvest_outcomes_farmId_idx`(`farmId`),
    INDEX `harvest_outcomes_cropId_actualHarvestDate_idx`(`cropId`, `actualHarvestDate`),
    INDEX `harvest_outcomes_verificationStatus_idx`(`verificationStatus`),
    INDEX `harvest_outcomes_predictionId_idx`(`predictionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prediction_evaluations` (
    `id` VARCHAR(191) NOT NULL,
    `outcomeId` VARCHAR(191) NOT NULL,
    `predictionId` VARCHAR(191) NOT NULL,
    `cropId` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NOT NULL,
    `modelVersion` VARCHAR(60) NOT NULL,
    `modelName` VARCHAR(100) NOT NULL DEFAULT 'HarvestWindow-Predictor',
    `actualHarvestDate` DATETIME(3) NOT NULL,
    `predictedHarvestDate` DATETIME(3) NOT NULL,
    `predictedWindowStart` DATETIME(3) NULL,
    `predictedWindowEnd` DATETIME(3) NULL,
    `errorDays` INTEGER NOT NULL,
    `absoluteErrorDays` INTEGER NOT NULL,
    `isExactDate` BOOLEAN NOT NULL DEFAULT false,
    `isWithin3Days` BOOLEAN NOT NULL DEFAULT false,
    `isWithin7Days` BOOLEAN NOT NULL DEFAULT false,
    `isWithinWindow` BOOLEAN NULL,
    `windowDistanceDays` INTEGER NULL,
    `forecastHorizonDays` INTEGER NULL,
    `evaluationRevision` INTEGER NOT NULL DEFAULT 1,
    `isEligibleForTraining` BOOLEAN NOT NULL DEFAULT false,
    `exclusionReason` VARCHAR(150) NULL,
    `calculatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `prediction_evaluations_cropId_idx`(`cropId`),
    INDEX `prediction_evaluations_farmId_idx`(`farmId`),
    INDEX `prediction_evaluations_modelVersion_idx`(`modelVersion`),
    INDEX `prediction_evaluations_calculatedAt_idx`(`calculatedAt`),
    UNIQUE INDEX `prediction_evaluations_outcomeId_predictionId_evaluationRevision_key`(`outcomeId`, `predictionId`, `evaluationRevision`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `model_evaluation_reports` (
    `id` VARCHAR(191) NOT NULL,
    `reportId` VARCHAR(100) NOT NULL,
    `modelVersion` VARCHAR(60) NOT NULL,
    `modelName` VARCHAR(100) NOT NULL DEFAULT 'HarvestWindow-Predictor',
    `evaluationPeriodStart` DATETIME(3) NULL,
    `evaluationPeriodEnd` DATETIME(3) NULL,
    `cropFilter` VARCHAR(100) NULL,
    `regionFilter` VARCHAR(100) NULL,
    `seasonFilter` VARCHAR(50) NULL,
    `totalEvaluated` INTEGER NOT NULL DEFAULT 0,
    `eligibleCount` INTEGER NOT NULL DEFAULT 0,
    `excludedCount` INTEGER NOT NULL DEFAULT 0,
    `meanAbsoluteError` DECIMAL(8, 3) NULL,
    `meanSignedError` DECIMAL(8, 3) NULL,
    `rootMeanSquaredError` DECIMAL(8, 3) NULL,
    `exactDateAccuracyPct` DECIMAL(6, 2) NULL,
    `within3DaysPct` DECIMAL(6, 2) NULL,
    `within7DaysPct` DECIMAL(6, 2) NULL,
    `windowCoveragePct` DECIMAL(6, 2) NULL,
    `meanWindowDistance` DECIMAL(8, 3) NULL,
    `isInsufficientData` BOOLEAN NOT NULL DEFAULT false,
    `subgroupsJson` LONGTEXT NULL,
    `warningsJson` TEXT NULL,
    `generatedBy` VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED_JOB',
    `schemaVersion` VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `model_evaluation_reports_reportId_key`(`reportId`),
    INDEX `model_evaluation_reports_modelVersion_idx`(`modelVersion`),
    INDEX `model_evaluation_reports_createdAt_idx`(`createdAt`),
    INDEX `model_evaluation_reports_cropFilter_idx`(`cropFilter`),
    INDEX `model_evaluation_reports_regionFilter_idx`(`regionFilter`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `drift_assessments` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(100) NOT NULL,
    `modelVersion` VARCHAR(60) NOT NULL,
    `driftType` VARCHAR(50) NOT NULL,
    `severity` VARCHAR(30) NOT NULL DEFAULT 'NORMAL',
    `referencePeriodStart` DATETIME(3) NULL,
    `referencePeriodEnd` DATETIME(3) NULL,
    `currentPeriodStart` DATETIME(3) NULL,
    `currentPeriodEnd` DATETIME(3) NULL,
    `referenceSampleSize` INTEGER NOT NULL DEFAULT 0,
    `currentSampleSize` INTEGER NOT NULL DEFAULT 0,
    `featuresCheckedJson` TEXT NULL,
    `statisticalMethod` VARCHAR(100) NOT NULL,
    `driftScore` DECIMAL(8, 4) NULL,
    `threshold` DECIMAL(8, 4) NULL,
    `summaryDetailsJson` LONGTEXT NULL,
    `recommendations` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `drift_assessments_assessmentId_key`(`assessmentId`),
    INDEX `drift_assessments_modelVersion_idx`(`modelVersion`),
    INDEX `drift_assessments_driftType_idx`(`driftType`),
    INDEX `drift_assessments_severity_idx`(`severity`),
    INDEX `drift_assessments_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `model_version_registry` (
    `id` VARCHAR(191) NOT NULL,
    `modelName` VARCHAR(100) NOT NULL,
    `modelVersion` VARCHAR(60) NOT NULL,
    `trainingRunId` VARCHAR(100) NULL,
    `experimentName` VARCHAR(100) NULL,
    `datasetReference` VARCHAR(255) NULL,
    `datasetFingerprint` VARCHAR(64) NULL,
    `featureSchemaVer` VARCHAR(30) NOT NULL DEFAULT '1.0.0',
    `algorithm` VARCHAR(100) NOT NULL DEFAULT 'AgronomicGDDHybrid',
    `hyperparametersJson` TEXT NULL,
    `validationMae` DECIMAL(8, 3) NULL,
    `validationRmse` DECIMAL(8, 3) NULL,
    `validationBias` DECIMAL(8, 3) NULL,
    `promotionStatus` VARCHAR(40) NOT NULL DEFAULT 'CANDIDATE',
    `rejectionReason` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `promotedAt` DATETIME(3) NULL,
    `promotedByUserId` VARCHAR(191) NULL,
    `artifactPath` VARCHAR(255) NULL,
    `artifactChecksum` VARCHAR(64) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `model_version_registry_modelName_modelVersion_key`(`modelName`, `modelVersion`),
    INDEX `model_version_registry_modelName_isActive_idx`(`modelName`, `isActive`),
    INDEX `model_version_registry_promotionStatus_idx`(`promotionStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monitoring_job_runs` (
    `id` VARCHAR(191) NOT NULL,
    `jobType` VARCHAR(60) NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `recordsProcessed` INTEGER NOT NULL DEFAULT 0,
    `resultsSummaryJson` TEXT NULL,
    `errorMessage` TEXT NULL,
    `triggeredBy` VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `monitoring_job_runs_jobType_status_idx`(`jobType`, `status`),
    INDEX `monitoring_job_runs_startedAt_idx`(`startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `harvest_outcomes` ADD CONSTRAINT `harvest_outcomes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `harvest_outcomes` ADD CONSTRAINT `harvest_outcomes_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `farms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `harvest_outcomes` ADD CONSTRAINT `harvest_outcomes_cropId_fkey` FOREIGN KEY (`cropId`) REFERENCES `crops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `harvest_outcomes` ADD CONSTRAINT `harvest_outcomes_predictionId_fkey` FOREIGN KEY (`predictionId`) REFERENCES `harvest_predictions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prediction_evaluations` ADD CONSTRAINT `prediction_evaluations_outcomeId_fkey` FOREIGN KEY (`outcomeId`) REFERENCES `harvest_outcomes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prediction_evaluations` ADD CONSTRAINT `prediction_evaluations_predictionId_fkey` FOREIGN KEY (`predictionId`) REFERENCES `harvest_predictions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
