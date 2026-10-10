"""
HarvestWindow Crop Knowledge Base & Phase AI-1 Integration Adapter
Provides validated agronomic durations, growing degree-day (GDD) requirements,
base temperatures, and developmental stage boundaries grounded in ICAR/SAU benchmarks.
"""

from typing import Dict, Any, Optional, List

# Standard Agronomic Benchmark Database for Indian Crops
VERIFIED_CROP_KNOWLEDGE: List[Dict[str, Any]] = [
    # --- WHEAT (Triticum aestivum) ---
    {
        "crop_name": "Wheat",
        "variety": "HD-2967",
        "aliases": ["hd2967", "hd 2967"],
        "min_days": 138,
        "typical_days": 145,
        "max_days": 155,
        "base_temperature_c": 4.5,
        "upper_temperature_c": 35.0,
        "required_gdd_c": 1950.0,
        "season": "Rabi",
        "stage_template": "wheat",
        "source": "ICAR-IARI / Punjab Agricultural University (PAU) NWPZ package",
        "applicability": "North-Western Plains Zone, timely sown irrigated conditions",
    },
    {
        "crop_name": "Wheat",
        "variety": "HD-3086",
        "aliases": ["hd3086", "hd 3086", "pusa gautama"],
        "min_days": 135,
        "typical_days": 142,
        "max_days": 152,
        "base_temperature_c": 4.5,
        "upper_temperature_c": 35.0,
        "required_gdd_c": 1920.0,
        "season": "Rabi",
        "stage_template": "wheat",
        "source": "ICAR-Indian Agricultural Research Institute (IARI)",
        "applicability": "Irrigated timely sown, high input responsiveness",
    },
    {
        "crop_name": "Wheat",
        "variety": "Lokwan",
        "aliases": ["lok 1", "lokwan"],
        "min_days": 110,
        "typical_days": 118,
        "max_days": 128,
        "base_temperature_c": 5.0,
        "upper_temperature_c": 36.0,
        "required_gdd_c": 1650.0,
        "season": "Rabi",
        "stage_template": "wheat",
        "source": "MPKV Rahuri / ICAR Central Zone recommendations",
        "applicability": "Central & Peninsular India, early-maturing semi-dwarf bread wheat",
    },
    {
        "crop_name": "Wheat",
        "variety": None,  # Generic Fallback
        "aliases": [],
        "min_days": 125,
        "typical_days": 140,
        "max_days": 158,
        "base_temperature_c": 4.5,
        "upper_temperature_c": 35.0,
        "required_gdd_c": 1850.0,
        "season": "Rabi",
        "stage_template": "wheat",
        "source": "ICAR-IIWBR Karnal National Agronomic Baseline",
        "applicability": "Standard Indian Rabi wheat cultivation across agro-climatic zones",
    },

    # --- RICE / PADDY (Oryza sativa) ---
    {
        "crop_name": "Rice (Paddy)",
        "variety": "Basmati",
        "aliases": ["rice", "paddy", "pusa basmati 1121", "1121", "1509", "pusa basmati 1509"],
        "min_days": 115,
        "typical_days": 125,
        "max_days": 140,
        "base_temperature_c": 10.0,
        "upper_temperature_c": 38.0,
        "required_gdd_c": 2100.0,
        "season": "Kharif",
        "stage_template": "cerealGrain",
        "source": "ICAR-NRRI Cuttack & Basmati Export Development Foundation (BEDF)",
        "applicability": "Transplanted aromatic paddy in traditional GI zones",
    },
    {
        "crop_name": "Rice (Paddy)",
        "variety": "PR-126",
        "aliases": ["pr 126", "pr126"],
        "min_days": 93,
        "typical_days": 100,
        "max_days": 110,
        "base_temperature_c": 10.0,
        "upper_temperature_c": 38.0,
        "required_gdd_c": 1800.0,
        "season": "Kharif",
        "stage_template": "cerealGrain",
        "source": "Punjab Agricultural University (PAU) short-duration variety release",
        "applicability": "Short-duration transplanted rice saving nursery and water resources",
    },
    {
        "crop_name": "Rice (Paddy)",
        "variety": None,
        "aliases": ["rice", "paddy"],
        "min_days": 115,
        "typical_days": 130,
        "max_days": 150,
        "base_temperature_c": 10.0,
        "upper_temperature_c": 38.0,
        "required_gdd_c": 2150.0,
        "season": "Kharif",
        "stage_template": "cerealGrain",
        "source": "ICAR-National Rice Research Institute (NRRI) benchmark",
        "applicability": "Medium-duration transplanted and direct-seeded rice in India",
    },

    # --- COTTON (Gossypium hirsutum) ---
    {
        "crop_name": "Cotton",
        "variety": "Bt Cotton",
        "aliases": ["bt cotton", "bollgard", "bg ii"],
        "min_days": 150,
        "typical_days": 165,
        "max_days": 180,
        "base_temperature_c": 15.5,
        "upper_temperature_c": 38.0,
        "required_gdd_c": 2250.0,
        "season": "Kharif",
        "stage_template": "fibre",
        "source": "ICAR-Central Institute for Cotton Research (CICR) Nagpur",
        "applicability": "Medium to deep black soils, irrigated and assured rainfall regimes",
    },
    {
        "crop_name": "Cotton",
        "variety": None,
        "aliases": [],
        "min_days": 145,
        "typical_days": 160,
        "max_days": 185,
        "base_temperature_c": 15.5,
        "upper_temperature_c": 38.0,
        "required_gdd_c": 2200.0,
        "season": "Kharif",
        "stage_template": "fibre",
        "source": "ICAR-CICR Cotton Agronomy Guide",
        "applicability": "Standard Indian commercial cotton cultivation",
    },

    # --- SUGARCANE (Saccharum officinarum) ---
    {
        "crop_name": "Sugarcane",
        "variety": "Co-0238",
        "aliases": ["co 0238", "karan 4"],
        "min_days": 330,
        "typical_days": 360,
        "max_days": 395,
        "base_temperature_c": 12.0,
        "upper_temperature_c": 38.0,
        "required_gdd_c": 4600.0,
        "season": "Whole Year",
        "stage_template": "cane",
        "source": "ICAR-Sugarcane Breeding Institute (SBI) & ICAR-IISR Lucknow",
        "applicability": "Subtropical high-sugar early-maturing cane",
    },
    {
        "crop_name": "Sugarcane",
        "variety": None,
        "aliases": [],
        "min_days": 300,
        "typical_days": 360,
        "max_days": 420,
        "base_temperature_c": 12.0,
        "upper_temperature_c": 38.0,
        "required_gdd_c": 4500.0,
        "season": "Whole Year",
        "stage_template": "cane",
        "source": "ICAR-Indian Institute of Sugarcane Research (IISR)",
        "applicability": "Annual plant cane under tropical and subtropical conditions",
    },

    # --- MUSTARD / RAPESEED (Brassica juncea) ---
    {
        "crop_name": "Mustard",
        "variety": "Pusa Mustard",
        "aliases": ["pusa jai kisan", "pusa bold", "mustard", "rapeseed"],
        "min_days": 105,
        "typical_days": 120,
        "max_days": 135,
        "base_temperature_c": 5.0,
        "upper_temperature_c": 32.0,
        "required_gdd_c": 1450.0,
        "season": "Rabi",
        "stage_template": "pod",
        "source": "ICAR-Directorate of Rapeseed-Mustard Research (DRMR) Bharatpur",
        "applicability": "Rabi oilseed crop in semi-arid and irrigated alluvial soils",
    },
    {
        "crop_name": "Mustard",
        "variety": None,
        "aliases": ["sarson", "rai"],
        "min_days": 100,
        "typical_days": 115,
        "max_days": 130,
        "base_temperature_c": 5.0,
        "upper_temperature_c": 32.0,
        "required_gdd_c": 1400.0,
        "season": "Rabi",
        "stage_template": "pod",
        "source": "ICAR-DRMR Package of Practices",
        "applicability": "Standard Indian Indian Mustard cultivation",
    },

    # --- CHICKPEA / GRAM (Cicer arietinum) ---
    {
        "crop_name": "Chickpea",
        "variety": "JG-11",
        "aliases": ["chana", "gram", "bengal gram", "jg 11"],
        "min_days": 95,
        "typical_days": 105,
        "max_days": 118,
        "base_temperature_c": 5.0,
        "upper_temperature_c": 32.0,
        "required_gdd_c": 1350.0,
        "season": "Rabi",
        "stage_template": "pod",
        "source": "ICAR-Indian Institute of Pulses Research (IIPR) Kanpur / ICRISAT",
        "applicability": "Desi chickpea widely cultivated in Central and Southern India",
    },
    {
        "crop_name": "Chickpea",
        "variety": None,
        "aliases": ["chana", "gram"],
        "min_days": 95,
        "typical_days": 110,
        "max_days": 125,
        "base_temperature_c": 5.0,
        "upper_temperature_c": 32.0,
        "required_gdd_c": 1380.0,
        "season": "Rabi",
        "stage_template": "pod",
        "source": "ICAR-IIPR Pulses Agronomy Guide",
        "applicability": "Rainfed and residual moisture pulse cultivation",
    },

    # --- MAIZE (Zea mays) ---
    {
        "crop_name": "Maize",
        "variety": "Hybrid",
        "aliases": ["corn", "makka", "pioneer"],
        "min_days": 85,
        "typical_days": 95,
        "max_days": 110,
        "base_temperature_c": 10.0,
        "upper_temperature_c": 35.0,
        "required_gdd_c": 1600.0,
        "season": "Kharif",
        "stage_template": "cerealGrain",
        "source": "ICAR-Indian Institute of Maize Research (IIMR) Ludhiana",
        "applicability": "Single cross commercial hybrids in Kharif and Rabi",
    },
    {
        "crop_name": "Maize",
        "variety": None,
        "aliases": ["corn", "makka"],
        "min_days": 85,
        "typical_days": 100,
        "max_days": 115,
        "base_temperature_c": 10.0,
        "upper_temperature_c": 35.0,
        "required_gdd_c": 1650.0,
        "season": "Kharif",
        "stage_template": "cerealGrain",
        "source": "ICAR-IIMR Maize Agronomy Manual",
        "applicability": "General field corn cultivation across India",
    },

    # --- GROUNDNUT / PEANUT (Arachis hypogaea) ---
    {
        "crop_name": "Groundnut",
        "variety": "TAG-24",
        "aliases": ["peanut", "moongphali", "tag 24"],
        "min_days": 100,
        "typical_days": 112,
        "max_days": 125,
        "base_temperature_c": 10.0,
        "upper_temperature_c": 35.0,
        "required_gdd_c": 1750.0,
        "season": "Kharif",
        "stage_template": "pod",
        "source": "ICAR-Directorate of Groundnut Research (DGR) Junagadh / BARC release",
        "applicability": "Semi-spreading and bunch groundnut in Gujarat, AP, and Maharashtra",
    },
    {
        "crop_name": "Groundnut",
        "variety": None,
        "aliases": ["peanut", "moongphali"],
        "min_days": 100,
        "typical_days": 115,
        "max_days": 130,
        "base_temperature_c": 10.0,
        "upper_temperature_c": 35.0,
        "required_gdd_c": 1800.0,
        "season": "Kharif",
        "stage_template": "pod",
        "source": "ICAR-DGR Groundnut Compendium",
        "applicability": "Kharif and summer irrigated groundnut",
    },

    # --- SOYBEAN (Glycine max) ---
    {
        "crop_name": "Soybean",
        "variety": "JS-335",
        "aliases": ["soya", "js 335", "js335", "js 9560"],
        "min_days": 92,
        "typical_days": 100,
        "max_days": 108,
        "base_temperature_c": 10.0,
        "upper_temperature_c": 35.0,
        "required_gdd_c": 1500.0,
        "season": "Kharif",
        "stage_template": "pod",
        "source": "ICAR-Indian Institute of Soybean Research (IISR) Indore",
        "applicability": "Malwa plateau and Vidarbha rainfed vertisol conditions",
    },
    {
        "crop_name": "Soybean",
        "variety": None,
        "aliases": ["soya"],
        "min_days": 90,
        "typical_days": 102,
        "max_days": 115,
        "base_temperature_c": 10.0,
        "upper_temperature_c": 35.0,
        "required_gdd_c": 1520.0,
        "season": "Kharif",
        "stage_template": "pod",
        "source": "ICAR-IISR Soybean Technology Manual",
        "applicability": "Standard Indian rainfed Kharif oilseed cultivation",
    },

    # --- TOMATO (Solanum lycopersicum) ---
    {
        "crop_name": "Tomato",
        "variety": None,
        "aliases": ["tamatar"],
        "min_days": 75,
        "typical_days": 90,
        "max_days": 110,
        "base_temperature_c": 10.0,
        "upper_temperature_c": 34.0,
        "required_gdd_c": 1300.0,
        "season": "Whole Year",
        "stage_template": "fruitingVegetable",
        "source": "ICAR-Indian Institute of Horticultural Research (IIHR) Bengaluru",
        "applicability": "Transplanted indeterminate and determinate commercial hybrids",
    },

    # --- ONION (Allium cepa) ---
    {
        "crop_name": "Onion",
        "variety": None,
        "aliases": ["pyaz"],
        "min_days": 90,
        "typical_days": 110,
        "max_days": 130,
        "base_temperature_c": 7.0,
        "upper_temperature_c": 30.0,
        "required_gdd_c": 1400.0,
        "season": "Rabi",
        "stage_template": "fruitingVegetable",
        "source": "ICAR-Directorate of Onion and Garlic Research (DOGR) Pune",
        "applicability": "Kharif, Late Kharif, and Rabi bulb onion crops",
    },

    # --- POTATO (Solanum tuberosum) ---
    {
        "crop_name": "Potato",
        "variety": None,
        "aliases": ["aloo"],
        "min_days": 75,
        "typical_days": 95,
        "max_days": 115,
        "base_temperature_c": 7.0,
        "upper_temperature_c": 28.0,
        "required_gdd_c": 1250.0,
        "season": "Rabi",
        "stage_template": "fruitingVegetable",
        "source": "ICAR-Central Potato Research Institute (CPRI) Shimla",
        "applicability": "Indo-Gangetic plains short winter tuber production",
    },
]

# Conservative Generic Fallback when an unrecognized crop is queried
GENERIC_CROP_PROFILE: Dict[str, Any] = {
    "crop_name": "Generic Field Crop",
    "variety": None,
    "aliases": [],
    "min_days": 100,
    "typical_days": 120,
    "max_days": 140,
    "base_temperature_c": 10.0,
    "upper_temperature_c": 35.0,
    "required_gdd_c": 1600.0,
    "season": "Kharif",
    "stage_template": "cerealGrain",
    "source": "HarvestWindow Indian Agro-Climatic Generic Baseline",
    "applicability": "Fallback estimate where variety and cultivar parameters are uncataloged",
}

def normalize_text(text: Optional[str]) -> str:
    if not text:
        return ""
    return text.strip().lower().replace("-", " ").replace("_", " ").replace("(", "").replace(")", "")

def resolve_crop_profile(
    crop_name: str,
    variety: Optional[str] = None,
    external_knowledge: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Resolves the most specific matching crop profile.
    First checks if Phase AI-1 external knowledge provides specific parameters.
    Then performs exact Variety match, followed by Crop-level match,
    and finally generic fallback.
    """
    if external_knowledge and external_knowledge.get("typical_duration_days"):
        return {
            "crop_name": external_knowledge.get("crop_name", crop_name),
            "variety": external_knowledge.get("variety", variety),
            "min_days": external_knowledge.get("min_duration_days", int(external_knowledge["typical_duration_days"] * 0.9)),
            "typical_days": int(external_knowledge["typical_duration_days"]),
            "max_days": external_knowledge.get("max_duration_days", int(external_knowledge["typical_duration_days"] * 1.15)),
            "base_temperature_c": float(external_knowledge.get("base_temperature_c", 10.0)),
            "upper_temperature_c": float(external_knowledge.get("upper_temperature_c", 35.0)),
            "required_gdd_c": float(external_knowledge.get("required_gdd_c", 1700.0)),
            "season": external_knowledge.get("season", "Kharif"),
            "stage_template": external_knowledge.get("stage_template", "cerealGrain"),
            "source": f"Phase AI-1 Registry: {external_knowledge.get('source', 'Harmonized Database')}",
            "match_type": "PHASE_AI_1_EXTERNAL",
        }

    norm_crop = normalize_text(crop_name)
    norm_variety = normalize_text(variety)

    # 1. Variety match
    if norm_variety:
        for profile in VERIFIED_CROP_KNOWLEDGE:
            if not profile.get("variety"):
                continue
            rule_crop = normalize_text(profile["crop_name"])
            if rule_crop in norm_crop or norm_crop in rule_crop:
                rule_variety = normalize_text(profile["variety"])
                if rule_variety in norm_variety or norm_variety in rule_variety:
                    res = profile.copy()
                    res["match_type"] = "EXACT_VARIETY"
                    return res
                for alias in profile.get("aliases", []):
                    if normalize_text(alias) in norm_variety:
                        res = profile.copy()
                        res["match_type"] = "EXACT_VARIETY_ALIAS"
                        return res

    # 2. Crop level match (variety is None in profile)
    for profile in VERIFIED_CROP_KNOWLEDGE:
        if profile.get("variety") is not None:
            continue
        rule_crop = normalize_text(profile["crop_name"])
        if rule_crop in norm_crop or norm_crop in rule_crop:
            res = profile.copy()
            res["match_type"] = "CROP_LEVEL"
            return res
        for alias in profile.get("aliases", []):
            if normalize_text(alias) in norm_crop or norm_crop in normalize_text(alias):
                res = profile.copy()
                res["match_type"] = "CROP_ALIAS"
                return res

    # 3. Fallback
    fallback = GENERIC_CROP_PROFILE.copy()
    fallback["crop_name"] = crop_name
    fallback["variety"] = variety
    fallback["match_type"] = "GENERIC_FALLBACK"
    return fallback
