import * as agricultureService from "./agriculture.service.js";

export async function handleListCrops(req, res, next) {
  try {
    const data = await agricultureService.listCrops(req.query);
    res.status(200).json({
      success: true,
      message: "Crops retrieved successfully",
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleGetCrop(req, res, next) {
  try {
    const crop = await agricultureService.getCropById(req.params.cropId);
    res.status(200).json({
      success: true,
      message: "Crop details retrieved successfully",
      data: crop,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleListSeasons(req, res, next) {
  try {
    const seasons = await agricultureService.listSeasons();
    res.status(200).json({
      success: true,
      message: "Seasons retrieved successfully",
      data: seasons,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleListRegions(req, res, next) {
  try {
    const data = await agricultureService.listRegions(req.query);
    res.status(200).json({
      success: true,
      message: "Agricultural regions retrieved successfully",
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleGetCropCalendars(req, res, next) {
  try {
    const data = await agricultureService.getCropCalendars(req.query);
    res.status(200).json({
      success: true,
      message: "Crop calendars retrieved successfully",
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleGetCropGrowthProfiles(req, res, next) {
  try {
    const profiles = await agricultureService.getCropGrowthProfiles(req.query);
    res.status(200).json({
      success: true,
      message: "Crop growth profiles retrieved successfully",
      data: profiles,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleGetCropSuitability(req, res, next) {
  try {
    const suitabilities = await agricultureService.getCropSuitabilityProfiles(req.query);
    res.status(200).json({
      success: true,
      message: "Crop suitability profiles retrieved successfully",
      data: suitabilities,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleGetDataSources(req, res, next) {
  try {
    const sources = await agricultureService.getDataSources();
    res.status(200).json({
      success: true,
      message: "Agricultural data sources retrieved successfully",
      data: sources,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleGetDataQuality(req, res, next) {
  try {
    const summary = await agricultureService.getDataQualitySummary();
    res.status(200).json({
      success: true,
      message: "Data quality summary retrieved successfully",
      data: summary,
    });
  } catch (err) {
    next(err);
  }
}
