-- AlterTable
ALTER TABLE `farms` DROP COLUMN `pincode`,
    DROP COLUMN `village`,
    ADD COLUMN `postalCode` VARCHAR(10) NULL,
    ADD COLUMN `villageOrTaluka` VARCHAR(120) NULL,
    MODIFY `name` VARCHAR(120) NOT NULL,
    MODIFY `areaUnit` ENUM('HECTARE', 'ACRE') NOT NULL DEFAULT 'HECTARE',
    MODIFY `soilType` VARCHAR(50) NULL,
    MODIFY `irrigationSource` VARCHAR(50) NULL;
