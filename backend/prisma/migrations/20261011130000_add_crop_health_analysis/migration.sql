-- CreateTable
CREATE TABLE `crop_health_analyses` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NULL,
    `cropId` VARCHAR(191) NULL,
    `imageUrl` VARCHAR(500) NULL,
    `imageName` VARCHAR(255) NULL,
    `predictedClassId` VARCHAR(100) NOT NULL,
    `predictedClassName` VARCHAR(150) NOT NULL,
    `cropName` VARCHAR(100) NOT NULL,
    `conditionCategory` VARCHAR(50) NOT NULL,
    `confidence` DECIMAL(5, 2) NOT NULL,
    `confidenceLevel` VARCHAR(30) NOT NULL,
    `status` VARCHAR(30) NOT NULL,
    `symptomsJson` TEXT NULL,
    `recommendationsJson` TEXT NULL,
    `alternativesJson` TEXT NULL,
    `qualityWarningsJson` TEXT NULL,
    `expertAdvice` TEXT NULL,
    `modelVersion` VARCHAR(60) NOT NULL DEFAULT '1.0.0',
    `analyzedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `crop_health_analyses_userId_analyzedAt_idx`(`userId`, `analyzedAt`),
    INDEX `crop_health_analyses_cropId_idx`(`cropId`),
    INDEX `crop_health_analyses_farmId_idx`(`farmId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `crop_health_analyses` ADD CONSTRAINT `crop_health_analyses_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crop_health_analyses` ADD CONSTRAINT `crop_health_analyses_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `farms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crop_health_analyses` ADD CONSTRAINT `crop_health_analyses_cropId_fkey` FOREIGN KEY (`cropId`) REFERENCES `crops`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
