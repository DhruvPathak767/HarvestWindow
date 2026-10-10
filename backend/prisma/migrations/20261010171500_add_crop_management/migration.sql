-- CreateTable
CREATE TABLE `crops` (
    `id` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NOT NULL,
    `cropName` VARCHAR(120) NOT NULL,
    `variety` VARCHAR(100) NULL,
    `sowingDate` DATETIME(3) NOT NULL,
    `expectedHarvestDate` DATETIME(3) NULL,
    `growthStage` VARCHAR(50) NULL,
    `irrigationMethod` VARCHAR(100) NULL,
    `irrigationFrequency` VARCHAR(100) NULL,
    `fieldArea` DECIMAL(12, 2) NULL,
    `expectedYield` VARCHAR(100) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `crops_farmId_idx`(`farmId`),
    INDEX `crops_cropName_idx`(`cropName`),
    INDEX `crops_growthStage_idx`(`growthStage`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `crops` ADD CONSTRAINT `crops_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `farms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
