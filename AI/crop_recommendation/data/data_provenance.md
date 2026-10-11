# HarvestWindow AI Phase 4: Data Provenance & Methodology

## 1. Starter Kaggle Crop Recommendation Dataset
- **Source:** [Kaggle Crop Recommendation Dataset](https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset)
- **License:** Open Database License (ODbL) / CC-BY 4.0
- **Columns & Units:**
  - `N`: Ratio of Nitrogen in soil ($\text{kg/ha}$ or index)
  - `P`: Ratio of Phosphorus in soil ($\text{kg/ha}$ or index)
  - `K`: Ratio of Potassium in soil ($\text{kg/ha}$ or index)
  - `temperature`: Temperature in degrees Celsius (°C)
  - `humidity`: Relative humidity in percentage (%)
  - `ph`: Soil pH value (standard logarithmic scale $0-14$)
  - `rainfall`: Rainfall in millimeters (mm)
  - `label`: Crop class (e.g. `rice`, `maize`, `chickpea`, `kidneybeans`, etc.)
- **Critical Limitations:**
  - This dataset contains synthetic or clustered soil-climate pairings per crop.
  - It does **not** model real-world Indian agricultural calendars, specific states/districts, farm acreage, or actual irrigation access.
  - Therefore, it is used strictly as an **auxiliary signal** when soil test data is supplied, and is never treated as a definitive farm suitability authority.

---

## 2. FAO GAEZ (Global Agro-Ecological Zones) v4 Specification
- **Source:** [FAO / IIASA GAEZ Data Portal](https://gaez.fao.org/)
- **License:** CC BY-NC-SA 3.0 IGO
- **Spatial Coverage:** Global 5 arc-minute (~9 km) and 30 arc-second (~1 km) resolution.
- **Data Layers:**
  1. *Land & Water Resources:* Soil quality, terrain slope, soil moisture regimes.
  2. *Agro-climatic Resources:* Length of growing period (LGP), thermal regimes.
  3. *Agro-ecological Suitability & Attainable Yield:* Crop suitability index ($0 - 10,000$ scaled to $0 - 100\%$) across rainfed and irrigated management levels (High, Intermediate, Low).
- **Integration Adapter:**
  - `fao_gaez_adapter.py` provides spatial matching via farm geographic coordinates (latitude, longitude) and administrative state/district codes to map the farm to its agro-ecological sub-zone.
  - When GAEZ raster tiles or regional tables are imported, the adapter merges empirical suitability indices into the hybrid scoring pipeline.
  - Until full GAEZ multi-gigabyte raster GeoTIFFs are locally staged, the adapter operates with literature-grounded agro-ecological zone bounds from ICAR-NBSS&LUP (National Bureau of Soil Survey & Land Use Planning) and marks GAEZ-specific high-resolution layers as provisional.

---

## 3. Soil Test vs. Inferred Soil Data Policy
- **Soil Type:** Qualitative classification (e.g. `Alluvial`, `Deep Black`, `Red Loamy`, `Sandy Loam`, `Laterite`). Used for physical drainage and rooting depth compatibility.
- **Measured Soil pH:** Strictly accepted from farmer-reported soil health cards or laboratory tests. Never assumed or silently imputed.
- **NPK Indicators:** When measured soil fertility values ($N, P, K$) are absent, they remain explicitly `null` (`UNKNOWN`), and the recommendation engine operates in *Evidence Coverage Mode*, calculating scores solely from verifiable climate, season, water, and soil type factors.
- **Evidence Coverage Index:** Reports the ratio of evaluated factors ($\text{coverage} \in [0.0, 1.0]$) so the farmer clearly sees whether a ranking is provisional or fully evidenced.
