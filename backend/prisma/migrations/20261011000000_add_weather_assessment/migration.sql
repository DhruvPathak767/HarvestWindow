-- CreateTable
CREATE TABLE IF NOT EXISTS `weather_assessments` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NOT NULL,
    `cropId` VARCHAR(191) NULL,
    `overallRiskScore` INTEGER NOT NULL DEFAULT 0,
    `harvestSuitability` VARCHAR(30) NOT NULL,
    `urgency` VARCHAR(20) NOT NULL,
    `confidence` VARCHAR(30) NOT NULL,
    `rainfallRiskScore` INTEGER NOT NULL DEFAULT 0,
    `humidityRiskScore` INTEGER NOT NULL DEFAULT 0,
    `windRiskScore` INTEGER NOT NULL DEFAULT 0,
    `temperatureRiskScore` INTEGER NOT NULL DEFAULT 0,
    `harvestWindowStart` DATETIME(3) NULL,
    `harvestWindowEnd` DATETIME(3) NULL,
    `forecastCoverageStart` DATETIME(3) NULL,
    `forecastCoverageEnd` DATETIME(3) NULL,
    `risksJson` LONGTEXT NULL,
    `recommendationsJson` TEXT NULL,
    `explanationJson` TEXT NULL,
    `dataQualityJson` TEXT NULL,
    `sourceProvider` VARCHAR(100) NOT NULL,
    `sourceFetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `weather_assessments_userId_cropId_idx`(`userId`, `cropId`),
    INDEX `weather_assessments_farmId_idx`(`farmId`),
    INDEX `weather_assessments_cropId_createdAt_idx`(`cropId`, `createdAt`),
    INDEX `weather_assessments_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `weather_assessments` ADD CONSTRAINT `weather_assessments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `weather_assessments` ADD CONSTRAINT `weather_assessments_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `farms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `weather_assessments` ADD CONSTRAINT `weather_assessments_cropId_fkey` FOREIGN KEY (`cropId`) REFERENCES `crops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
