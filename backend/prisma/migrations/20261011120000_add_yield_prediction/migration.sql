-- Phase AI-5: Yield Forecasting & Production Estimation Engine Migration

CREATE TABLE IF NOT EXISTS `yield_predictions` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `farmId` VARCHAR(191) NOT NULL,
  `cropId` VARCHAR(191) NOT NULL,
  `predictedYieldTonnesPerHectare` DECIMAL(10, 4) NOT NULL,
  `plantedAreaHectares` DECIMAL(12, 4) NOT NULL,
  `originalAreaValue` DECIMAL(12, 4) NOT NULL,
  `originalAreaUnit` VARCHAR(30) NOT NULL DEFAULT 'HECTARE',
  `expectedProductionTonnes` DECIMAL(14, 4) NOT NULL,
  `lowerYieldTonnesPerHectare` DECIMAL(10, 4) NULL,
  `upperYieldTonnesPerHectare` DECIMAL(10, 4) NULL,
  `lowerProductionTonnes` DECIMAL(14, 4) NULL,
  `upperProductionTonnes` DECIMAL(14, 4) NULL,
  `predictionStage` VARCHAR(50) NOT NULL DEFAULT 'MID_SEASON',
  `confidence` VARCHAR(30) NOT NULL DEFAULT 'MODERATE',
  `modelVersion` VARCHAR(60) NOT NULL DEFAULT '1.0.0',
  `algorithm` VARCHAR(100) NOT NULL DEFAULT 'HistGradientBoostingRegressor',
  `uncertaintyMethod` VARCHAR(80) NULL,
  `inputSnapshotJson` TEXT NULL,
  `dataQualityJson` TEXT NULL,
  `evaluatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  INDEX `yield_predictions_userId_cropId_idx` (`userId`, `cropId`),
  INDEX `yield_predictions_farmId_idx` (`farmId`),
  INDEX `yield_predictions_cropId_evaluatedAt_idx` (`cropId`, `evaluatedAt`),
  INDEX `yield_predictions_evaluatedAt_idx` (`evaluatedAt`),
  CONSTRAINT `yield_predictions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `yield_predictions_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `farms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `yield_predictions_cropId_fkey` FOREIGN KEY (`cropId`) REFERENCES `crops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `actual_productions` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `farmId` VARCHAR(191) NOT NULL,
  `cropId` VARCHAR(191) NOT NULL,
  `actualYieldTonnesPerHectare` DECIMAL(10, 4) NULL,
  `actualProductionTonnes` DECIMAL(14, 4) NOT NULL,
  `originalQuantity` DECIMAL(14, 4) NOT NULL,
  `originalUnit` VARCHAR(30) NOT NULL DEFAULT 'TONNE',
  `harvestDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  INDEX `actual_productions_userId_cropId_idx` (`userId`, `cropId`),
  INDEX `actual_productions_farmId_idx` (`farmId`),
  INDEX `actual_productions_cropId_harvestDate_idx` (`cropId`, `harvestDate`),
  CONSTRAINT `actual_productions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `actual_productions_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `farms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `actual_productions_cropId_fkey` FOREIGN KEY (`cropId`) REFERENCES `crops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
