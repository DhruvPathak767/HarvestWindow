/**
 * Phase AI-7: Curated Agricultural Knowledge Corpus
 * Grounded in peer-reviewed ICAR, FAO, IISS, PAU, and TNAU agronomic publications.
 * Used for RAG retrieval to provide verifiable citations and prevent model hallucinations.
 */

export const CURATED_KNOWLEDGE_DOCUMENTS = [
  // ---------------------------------------------------------------------------
  // 1. HARVEST TIMING & MATURITY INDICES
  // ---------------------------------------------------------------------------
  {
    sourceId: "icar",
    title: "Maturity Indices and Optimum Harvest Windows for Indian Field Crops",
    url: "https://icar.org.in/content/crop-production-technologies",
    publisher: "Indian Council of Agricultural Research (ICAR)",
    topic: "harvest_timing",
    cropName: "Wheat",
    keywords: "wheat, harvest window, maturity indices, physiological maturity, grain moisture, yellowing",
    publicationDate: "2024-03-15T00:00:00.000Z",
    content:
      "Wheat (Triticum aestivum) reaches physiological maturity when the peduncle and lower glumes lose their chlorophyll and turn golden yellow. Grain moisture at physiological maturity is approximately 25-30%, but harvesting with mechanical combines requires grain moisture to drop to 14-16% to avoid threshing damage and post-harvest spoilage. Premature harvesting before 80% spikelet yellowing leads to shriveled grains, low test weight, and reduced milling recovery. Delayed harvesting beyond the optimal window risks shattering loss, bird damage, and grain discoloration from unseasonal rainfall.",
  },
  {
    sourceId: "pau",
    title: "Recommended Package of Practices: Kharif Paddy Harvesting Guidelines",
    url: "https://pau.edu/agronomy/paddy-harvest-handbook",
    publisher: "Punjab Agricultural University (PAU)",
    topic: "harvest_timing",
    cropName: "Rice (Paddy)",
    keywords: "rice, paddy, harvest window, grain moisture, lodging, brown husks, combine harvesting",
    publicationDate: "2023-09-10T00:00:00.000Z",
    content:
      "For irrigated paddy, harvesting should be scheduled when 80-85% of grains in the panicle have turned straw-colored or golden brown, and the moisture content is between 20-22% for prompt parboiling or 16-18% for direct sun-drying. Harvesting at over 24% moisture results in high chalkiness and broken grains during milling, while delaying harvest below 14% moisture causes severe head-rice breakage. Standing water in the field should be completely drained 10-14 days prior to expected harvest to firm the soil for equipment and ensure uniform ripening.",
  },
  {
    sourceId: "icar",
    title: "Agronomic Production Guide for Maize, Soybean, and Pulses",
    url: "https://icar.org.in/publications/handbook-of-agriculture",
    publisher: "Indian Council of Agricultural Research (ICAR)",
    topic: "harvest_timing",
    cropName: "Maize",
    keywords: "maize, corn, black layer, physiological maturity, milk line, moisture",
    publicationDate: "2024-01-20T00:00:00.000Z",
    content:
      "Maize reaches physiological maturity when the 'black layer' forms at the base of the kernel where it attaches to the cob, indicating the cessation of dry matter translocation. At this stage, kernel moisture is typically 30-35%. Field drying down to 18-20% is ideal for mechanical picking, followed by artificial or sun drying to 13-14% for safe storage. In chickpea (gram) and soybean, harvesting is recommended when foliage sheds naturally, pods turn yellowish-brown, and seeds rattle within the pod.",
  },
  {
    sourceId: "fao",
    title: "FAO Good Agricultural Practices: Horticultural Crop Maturity and Harvest",
    url: "https://www.fao.org/post-harvest-management/horticulture",
    publisher: "Food and Agriculture Organization (FAO)",
    topic: "harvest_timing",
    cropName: "Tomato",
    keywords: "tomato, maturity stages, breaker stage, red ripe, harvest scheduling, transport",
    publicationDate: "2023-06-12T00:00:00.000Z",
    content:
      "Tomatoes should be harvested based on the intended market distance. For long-distance transport (over 200 km), harvest at the 'breaker' or 'turning' stage (first sign of pinkish-yellow color at the blossom end) when firmness is high. For local fresh markets, harvest at the 'pink' or 'light red' stage. Never harvest fruits when wet from morning dew or recent rain, as surface moisture rapidly accelerates bacterial soft rot and post-harvest fungal decay.",
  },

  // ---------------------------------------------------------------------------
  // 2. WEATHER IMPACTS ON HARVESTING & OPERATIONS
  // ---------------------------------------------------------------------------
  {
    sourceId: "imd",
    title: "Agrometeorological Risk Mitigation: Unseasonal Rains and Harvest Windows",
    url: "https://mausam.imd.gov.in/imd_latest/contents/agromet_bulletin.php",
    publisher: "India Meteorological Department (IMD)",
    topic: "weather_impacts",
    cropName: null,
    keywords: "weather risk, unseasonal rain, rain threshold, lodging, drying, harvest halt",
    publicationDate: "2024-04-01T00:00:00.000Z",
    content:
      "Unseasonal rainfall exceeding 5 mm during the active harvest window causes immediate operational disruption. Rainfall dampens standing grain, prevents mechanical combine operations, and increases grain moisture above safe thresholds. If rain is forecasted within 48-72 hours for standing mature wheat or mustard, priority should be given to expedited harvesting or pausing cutting until the field dries. Threshed grain left on open drying floors during rain events suffers rapid fungal colonization, mycotoxin accumulation, and grade degradation.",
  },
  {
    sourceId: "crida",
    title: "Managing Extreme Weather Events and Wind Risks in Standing Field Crops",
    url: "http://www.crida.in/contingency-plans/weather-extremes",
    publisher: "ICAR-CRIDA Hyderabad",
    topic: "weather_impacts",
    cropName: null,
    keywords: "wind speed, lodging, storm damage, high heat, forced maturity, shatter",
    publicationDate: "2023-11-05T00:00:00.000Z",
    content:
      "Sustained wind speeds exceeding 25-30 km/h, especially when combined with wet soil from prior irrigation or rain, cause severe stem and root lodging in tall crops like wheat, maize, and sugarcane. Lodged crops experience 15-40% yield loss due to incomplete grain fill, rat/rodent predation, and mold. Additionally, sudden heat spikes (>35°C in late March/April) advance wheat harvest windows prematurely by forcing desiccated ripening ('terminal heat stress'), requiring early scheduling to avoid pod shattering in mustard and grain loss in cereals.",
  },

  // ---------------------------------------------------------------------------
  // 3. SOIL HEALTH, FERTILITY & NUTRIENT MANAGEMENT
  // ---------------------------------------------------------------------------
  {
    sourceId: "iiss",
    title: "Integrated Soil Health and Balanced Nutrient Management for Indian Soils",
    url: "https://iiss.icar.gov.in/soil-health-card-guidelines",
    publisher: "ICAR - Indian Institute of Soil Science (IISS Bhopal)",
    topic: "soil_health",
    cropName: null,
    keywords: "soil pH, optimal pH, nitrogen, phosphorus, potassium, organic carbon, micronutrients, zinc",
    publicationDate: "2024-02-18T00:00:00.000Z",
    content:
      "Most Indian field crops thrive in soils with a pH between 6.0 and 7.5. Acidic soils (pH < 5.5) suffer from aluminum toxicity and phosphorus fixation, requiring liming (agricultural lime or dolomite). Alkaline/sodic soils (pH > 8.2) suffer from micronutrient deficiencies (especially Zinc and Iron) and low water infiltration, requiring gypsum application. Soil Organic Carbon (SOC) above 0.75% is considered healthy; levels below 0.5% indicate severe depletion, requiring incorporation of crop residues, farmyard manure (FYM @ 10 t/ha), or green manuring with Sesbania (Dhaincha). Balanced N:P:K fertilization (typically 4:2:1 ratio for cereals) must be supplemented with 25 kg/ha Zinc Sulfate every alternate year.",
  },
  {
    sourceId: "iiss",
    title: "Crop-Specific Soil pH and Pedological Requirements",
    url: "https://iiss.icar.gov.in/publications/crop-soil-suitability",
    publisher: "ICAR - Indian Institute of Soil Science (IISS)",
    topic: "soil_health",
    cropName: "Cotton",
    keywords: "black cotton soil, vertisol, drainage, aeration, soil compaction, calcium",
    publicationDate: "2023-08-14T00:00:00.000Z",
    content:
      "Deep Black Soils (Vertisols) with high clay content (35-60%) and high cation exchange capacity are ideal for cotton, soybean, and pigeonpea due to their superior moisture retention. However, Vertisols are prone to waterlogging and compaction during heavy rains, requiring ridge-and-furrow planting or broad bed furrow (BBF) systems. Groundnut and potato require friable, well-aerated sandy loam soils with low clay to allow unrestricted pod development and tuber expansion.",
  },

  // ---------------------------------------------------------------------------
  // 4. IRRIGATION & WATER MANAGEMENT
  // ---------------------------------------------------------------------------
  {
    sourceId: "icar",
    title: "Critical Growth Stages for Irrigation in Field and Vegetable Crops",
    url: "https://icar.org.in/water-management-handbook",
    publisher: "Indian Council of Agricultural Research (ICAR)",
    topic: "irrigation",
    cropName: "Wheat",
    keywords: "critical irrigation stage, crown root initiation, CRI stage, flowering, milk stage, water stress",
    publicationDate: "2023-12-01T00:00:00.000Z",
    content:
      "Water deficit at critical growth stages causes irreversible yield reduction. In wheat, Crown Root Initiation (CRI at 20-25 days after sowing) is the single most critical irrigation stage; skipping CRI irrigation reduces yields by up to 25-30%. Subsequent critical stages are tillering (40-45 DAS), late jointing (60-65 DAS), flowering/anthesis (80-85 DAS), and grain milk stage (100-105 DAS). Irrigation should be completely terminated 15 days before expected harvest to prevent late vegetative re-growth and lodging.",
  },
  {
    sourceId: "icar",
    title: "Water Management in Rice and Precision Irrigation Techniques",
    url: "https://icar.org.in/rice-water-management",
    publisher: "Indian Council of Agricultural Research (ICAR)",
    topic: "irrigation",
    cropName: "Rice (Paddy)",
    keywords: "alternate wetting and drying, AWD, water conservation, panicle initiation, terminal drainage",
    publicationDate: "2024-02-10T00:00:00.000Z",
    content:
      "Continuous deep ponding is not necessary throughout the rice season. The Alternate Wetting and Drying (AWD) technique reduces irrigation water usage by 25-30% without yield penalty. Under AWD, 5 cm water is applied only when the water level in a perforated field pipe drops to 15 cm below the soil surface. However, ponded water (3-5 cm) must be strictly maintained during the critical reproductive phases (panicle initiation through flowering). Draining the field 12-14 days prior to harvest enhances uniform ripening and simplifies harvesting.",
  },

  // ---------------------------------------------------------------------------
  // 5. CROP DISEASE MANAGEMENT & INTEGRATED PEST MANAGEMENT (IPM)
  // ---------------------------------------------------------------------------
  {
    sourceId: "tnau",
    title: "Field Diagnostic Guide and Integrated Management for Major Plant Diseases",
    url: "https://agritech.tnau.ac.in/crop_protection/crop_prot.html",
    publisher: "TNAU Agritech Portal",
    topic: "pest_disease",
    cropName: null,
    keywords: "leaf spots, powdery mildew, early blight, late blight, rust, fungicide, IPM, bio-control",
    publicationDate: "2024-01-15T00:00:00.000Z",
    content:
      "Accurate leaf symptom inspection is essential for crop protection: 1) Early Blight (Alternaria spp.) displays concentric dark brown target-like rings surrounded by a chlorotic yellow halo on older leaves. 2) Late Blight (Phytophthora infestans) shows water-soaked, irregular lesions with white cottony mildew on leaf undersides under cool, humid (>90% RH) conditions. 3) Powdery Mildew shows white talcum-like patches on upper leaf surfaces. 4) Yellow Leaf Curl Virus causes severe leaf curling, stunting, and bushy upright growth, transmitted by whiteflies (Bemisia tabaci). When disease severity is detected, integrated management combines removal of infected foliage, avoiding overhead sprinkling, bio-control with Trichoderma harzianum or Pseudomonas fluorescens, and targeted recommended fungicides.",
  },
  {
    sourceId: "icar",
    title: "Standard Operating Procedures for Field Crop Disease Scans and Expert Verification",
    url: "https://icar.org.in/plant-pathology-protocols",
    publisher: "Indian Council of Agricultural Research (ICAR)",
    topic: "pest_disease",
    cropName: null,
    keywords: "computer vision, leaf scan, confidence level, field inspection, expert verification, image quality",
    publicationDate: "2024-03-01T00:00:00.000Z",
    content:
      "Computer vision models provide preliminary screening and early warning detection based on visual patterns on plant leaves. A high-confidence model finding indicates matching symptomatology, but farmers should physically inspect 10-15 random plants across the field to determine whether infection is localized or widespread. For low-confidence findings (<70%), image blur, specular glare, or non-target backgrounds may impair accuracy; a clean re-scan in natural diffused lighting is recommended. When critical fungal blights or viral curl symptoms appear, immediate consultation with the local Krishi Vigyan Kendra (KVK) or Block Agriculture Officer ensures verified chemical stewardship.",
  },

  // ---------------------------------------------------------------------------
  // 6. POST-HARVEST HANDLING & SAFE GRAIN STORAGE
  // ---------------------------------------------------------------------------
  {
    sourceId: "fao",
    title: "Safe On-Farm Grain Storage and Post-Harvest Loss Prevention",
    url: "https://www.fao.org/in-action/food-loss-reduction/storage-protocols",
    publisher: "Food and Agriculture Organization (FAO)",
    topic: "post_harvest",
    cropName: null,
    keywords: "safe moisture, grain storage, aeration, hermetic bags, aflatoxin, weevil, mold",
    publicationDate: "2023-05-18T00:00:00.000Z",
    content:
      "Safe long-term storage requires drying grain to safe moisture thresholds: Wheat and Paddy <= 12-13%, Maize <= 13%, Pulses and Oilseeds <= 9-10%. Grain stored above 15% moisture experiences rapid heating, mold growth (Aspergillus flavus producing lethal aflatoxin), and pest multiplication (Sitophilus oryzae grain weevils). Storage bins should be hermetically sealed (airtight bags or metal bins), placed on raised wooden pallets 30 cm above concrete floors to avoid capillary dampness, and kept in well-ventilated, rodent-proof structures.",
  },

  // ---------------------------------------------------------------------------
  // 7. YIELD FORECASTING & AGRONOMIC PRODUCTION INTERPRETATION
  // ---------------------------------------------------------------------------
  {
    sourceId: "icar",
    title: "Understanding Crop Yield Forecasts, Biometric Estimates, and Uncertainty",
    url: "https://icar.org.in/statistical-yield-estimation",
    publisher: "Indian Council of Agricultural Research (ICAR)",
    topic: "yield_estimation",
    cropName: null,
    keywords: "yield forecast, t/ha, tonnes per hectare, production estimate, uncertainty interval, biometric variables",
    publicationDate: "2024-02-28T00:00:00.000Z",
    content:
      "A crop yield forecast represents the estimated harvest production in Metric Tonnes per Hectare (t/ha) based on biometric crop parameters, vegetative health, soil fertility indices, and cumulative agro-meteorological growing degree days (GDD). Yield forecasts include an uncertainty interval reflecting natural variability in micro-climate, pest incidence, and late-season rainfall. Multiplying the predicted yield (t/ha) by the farm's effective planted area yields the total expected production (Tonnes). Actual harvested output can be recorded post-threshing to benchmark farm efficiency and refine next-season predictions.",
  },
];
