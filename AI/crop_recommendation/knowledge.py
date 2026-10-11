"""
HarvestWindow Phase AI-4: Agronomic Crop Knowledge Base
Standardized agricultural benchmarks for 26 Indian crops, integrating ICAR, SAU,
and Ministry of Agriculture crop production packages.
"""

from typing import Dict, Any, List, Optional

CROPS_KNOWLEDGE_BASE: List[Dict[str, Any]] = [
    # 1. Wheat
    {
        "id": "wheat",
        "crop_name": "Wheat",
        "hindi_name": "Gehun (गेहूं)",
        "scientific_name": "Triticum aestivum",
        "category": "Cereals",
        "supported_seasons": ["Rabi"],
        "sowing_months": [10, 11, 12],  # Oct - Dec
        "duration_days": [115, 145],
        "temperature_range": {"optimal_min": 15.0, "optimal_max": 25.0, "critical_min": 4.0, "critical_max": 35.0},
        "rainfall_mm": {"optimal_min": 350.0, "optimal_max": 650.0, "critical_min": 150.0, "critical_max": 1100.0},
        "water_requirement": "MODERATE",
        "soil_types": ["Alluvial", "Clay Loam", "Loamy", "Deep Black Soil"],
        "soil_ph": {"optimal_min": 6.0, "optimal_max": 7.5, "critical_min": 5.2, "critical_max": 8.5},
        "npk_demand": {"N": "High", "P": "Moderate", "K": "Moderate"},
        "compatible_irrigation": ["Canal", "Tube Well", "Borewell", "Sprinkler"],
        "primary_states": ["Punjab", "Haryana", "Uttar Pradesh", "Madhya Pradesh", "Rajasthan", "Bihar"],
        "management_notes": "Requires cool winter conditions during vegetative stage and bright sunshine during grain filling.",
        "hard_constraints": ["Severe heat (>32°C during vegetative stage causes premature heading). Cannot be grown in Kharif/Monsoon."]
    },

    # 2. Rice / Paddy
    {
        "id": "rice",
        "crop_name": "Rice (Paddy)",
        "hindi_name": "Dhan (धान)",
        "scientific_name": "Oryza sativa",
        "category": "Cereals",
        "supported_seasons": ["Kharif", "Whole Year"],
        "sowing_months": [5, 6, 7, 8],  # May - Aug
        "duration_days": [120, 155],
        "temperature_range": {"optimal_min": 21.0, "optimal_max": 35.0, "critical_min": 15.0, "critical_max": 42.0},
        "rainfall_mm": {"optimal_min": 1000.0, "optimal_max": 2500.0, "critical_min": 600.0, "critical_max": 3500.0},
        "water_requirement": "VERY_HIGH",
        "soil_types": ["Clay", "Clay Loam", "Alluvial", "Silty Clay"],
        "soil_ph": {"optimal_min": 5.5, "optimal_max": 7.2, "critical_min": 4.5, "critical_max": 8.2},
        "npk_demand": {"N": "High", "P": "Moderate", "K": "High"},
        "compatible_irrigation": ["Canal", "Tube Well", "Borewell", "Flooding", "Rainfed"],
        "primary_states": ["West Bengal", "Uttar Pradesh", "Punjab", "Andhra Pradesh", "Odisha", "Tamil Nadu", "Bihar"],
        "management_notes": "Requires standing water (5-7 cm) in early stages and heavy moisture retentive soils.",
        "hard_constraints": ["Cannot be cultivated on coarse sandy soils without heavy irrigation; requires high moisture."]
    },

    # 3. Maize (Corn)
    {
        "id": "maize",
        "crop_name": "Maize (Corn)",
        "hindi_name": "Makka (मक्का)",
        "scientific_name": "Zea mays",
        "category": "Cereals",
        "supported_seasons": ["Kharif", "Rabi", "Whole Year"],
        "sowing_months": [6, 7, 10, 11],
        "duration_days": [90, 120],
        "temperature_range": {"optimal_min": 18.0, "optimal_max": 32.0, "critical_min": 10.0, "critical_max": 38.0},
        "rainfall_mm": {"optimal_min": 500.0, "optimal_max": 900.0, "critical_min": 300.0, "critical_max": 1500.0},
        "water_requirement": "MODERATE",
        "soil_types": ["Alluvial", "Deep Black Soil", "Red Loam", "Sandy Loam"],
        "soil_ph": {"optimal_min": 6.0, "optimal_max": 7.5, "critical_min": 5.4, "critical_max": 8.0},
        "npk_demand": {"N": "High", "P": "Moderate", "K": "Moderate"},
        "compatible_irrigation": ["Canal", "Tube Well", "Borewell", "Drip", "Sprinkler", "Rainfed"],
        "primary_states": ["Karnataka", "Madhya Pradesh", "Bihar", "Tamil Nadu", "Telangana", "Maharashtra", "Rajasthan"],
        "management_notes": "Highly susceptible to waterlogging; demands well-drained fertile soils with good organic matter.",
        "hard_constraints": ["Cannot tolerate standing water/stagnation for more than 24-48 hours."]
    },

    # 4. Chickpea (Gram)
    {
        "id": "chickpea",
        "crop_name": "Chickpea (Gram)",
        "hindi_name": "Chana (चना)",
        "scientific_name": "Cicer arietinum",
        "category": "Pulses",
        "supported_seasons": ["Rabi"],
        "sowing_months": [10, 11],  # Oct - Nov
        "duration_days": [95, 125],
        "temperature_range": {"optimal_min": 14.0, "optimal_max": 25.0, "critical_min": 8.0, "critical_max": 34.0},
        "rainfall_mm": {"optimal_min": 300.0, "optimal_max": 500.0, "critical_min": 150.0, "critical_max": 800.0},
        "water_requirement": "LOW",
        "soil_types": ["Deep Black Soil", "Sandy Loam", "Alluvial", "Medium Black"],
        "soil_ph": {"optimal_min": 6.2, "optimal_max": 7.8, "critical_min": 5.5, "critical_max": 8.5},
        "npk_demand": {"N": "Low", "P": "High", "K": "Low"},
        "compatible_irrigation": ["Rainfed", "Canal", "Tube Well", "Sprinkler"],
        "primary_states": ["Madhya Pradesh", "Maharashtra", "Rajasthan", "Karnataka", "Uttar Pradesh"],
        "management_notes": "Deep taproot system; ideal for rainfed residual moisture after Kharif harvest.",
        "hard_constraints": ["Cloudy weather and frost during flowering cause severe flower drop and pod borer damage."]
    },

    # 5. Pigeonpea (Tur / Arhar)
    {
        "id": "pigeonpeas",
        "crop_name": "Pigeonpea (Arhar / Tur)",
        "hindi_name": "Tur / Arhar (अरहर)",
        "scientific_name": "Cajanus cajan",
        "category": "Pulses",
        "supported_seasons": ["Kharif"],
        "sowing_months": [6, 7],  # June - July
        "duration_days": [140, 210],
        "temperature_range": {"optimal_min": 20.0, "optimal_max": 35.0, "critical_min": 12.0, "critical_max": 40.0},
        "rainfall_mm": {"optimal_min": 600.0, "optimal_max": 1000.0, "critical_min": 400.0, "critical_max": 1500.0},
        "water_requirement": "LOW",
        "soil_types": ["Deep Black Soil", "Alluvial", "Red Loam", "Sandy Loam"],
        "soil_ph": {"optimal_min": 6.0, "optimal_max": 7.5, "critical_min": 5.0, "critical_max": 8.2},
        "npk_demand": {"N": "Low", "P": "Moderate", "K": "Low"},
        "compatible_irrigation": ["Rainfed", "Borewell", "Drip", "Canal"],
        "primary_states": ["Maharashtra", "Madhya Pradesh", "Karnataka", "Uttar Pradesh", "Gujarat"],
        "management_notes": "Drought-hardy legume with deep roots; excellent intercrop with cotton and soybean.",
        "hard_constraints": ["Sensitive to severe water stagnation and saline/alkaline soils."]
    },

    # 6. Green Gram (Moong)
    {
        "id": "mungbean",
        "crop_name": "Green Gram (Moong)",
        "hindi_name": "Moong (मूंग)",
        "scientific_name": "Vigna radiata",
        "category": "Pulses",
        "supported_seasons": ["Kharif", "Zaid", "Whole Year"],
        "sowing_months": [3, 4, 6, 7],
        "duration_days": [60, 75],
        "temperature_range": {"optimal_min": 25.0, "optimal_max": 35.0, "critical_min": 15.0, "critical_max": 42.0},
        "rainfall_mm": {"optimal_min": 350.0, "optimal_max": 650.0, "critical_min": 200.0, "critical_max": 900.0},
        "water_requirement": "LOW",
        "soil_types": ["Loamy", "Sandy Loam", "Alluvial", "Medium Black"],
        "soil_ph": {"optimal_min": 6.2, "optimal_max": 7.5, "critical_min": 5.5, "critical_max": 8.2},
        "npk_demand": {"N": "Low", "P": "Moderate", "K": "Low"},
        "compatible_irrigation": ["Rainfed", "Tube Well", "Sprinkler", "Canal"],
        "primary_states": ["Rajasthan", "Madhya Pradesh", "Maharashtra", "Karnataka", "Gujarat", "Punjab"],
        "management_notes": "Short duration catch crop, fits easily between Rabi wheat and Kharif crops in summer (Zaid).",
        "hard_constraints": ["Severe rainfall at maturity causes seed germination inside pods."]
    },

    # 7. Black Gram (Urad)
    {
        "id": "blackgram",
        "crop_name": "Black Gram (Urad)",
        "hindi_name": "Urad (उड़द)",
        "scientific_name": "Vigna mungo",
        "category": "Pulses",
        "supported_seasons": ["Kharif", "Rabi", "Zaid"],
        "sowing_months": [6, 7, 10, 11],
        "duration_days": [70, 90],
        "temperature_range": {"optimal_min": 25.0, "optimal_max": 35.0, "critical_min": 16.0, "critical_max": 40.0},
        "rainfall_mm": {"optimal_min": 400.0, "optimal_max": 750.0, "critical_min": 250.0, "critical_max": 1000.0},
        "water_requirement": "LOW",
        "soil_types": ["Deep Black Soil", "Alluvial", "Clay Loam"],
        "soil_ph": {"optimal_min": 6.0, "optimal_max": 7.5, "critical_min": 5.2, "critical_max": 8.0},
        "npk_demand": {"N": "Low", "P": "Moderate", "K": "Low"},
        "compatible_irrigation": ["Rainfed", "Canal", "Tube Well"],
        "primary_states": ["Madhya Pradesh", "Uttar Pradesh", "Andhra Pradesh", "Tamil Nadu", "Maharashtra"],
        "management_notes": "Nitrogen-fixing pulse, responds well to phosphorous fertilization.",
        "hard_constraints": ["Prolonged waterlogging during seedling stage triggers root rot."]
    },

    # 8. Lentil (Masoor)
    {
        "id": "lentil",
        "crop_name": "Lentil (Masoor)",
        "hindi_name": "Masoor (मसूर)",
        "scientific_name": "Lens culinaris",
        "category": "Pulses",
        "supported_seasons": ["Rabi"],
        "sowing_months": [10, 11, 12],
        "duration_days": [110, 130],
        "temperature_range": {"optimal_min": 15.0, "optimal_max": 25.0, "critical_min": 6.0, "critical_max": 32.0},
        "rainfall_mm": {"optimal_min": 300.0, "optimal_max": 500.0, "critical_min": 150.0, "critical_max": 700.0},
        "water_requirement": "LOW",
        "soil_types": ["Alluvial", "Sandy Loam", "Clay Loam", "Black Soil"],
        "soil_ph": {"optimal_min": 6.0, "optimal_max": 7.5, "critical_min": 5.5, "critical_max": 8.2},
        "npk_demand": {"N": "Low", "P": "Moderate", "K": "Low"},
        "compatible_irrigation": ["Rainfed", "Tube Well", "Canal"],
        "primary_states": ["Madhya Pradesh", "Uttar Pradesh", "Bihar", "West Bengal"],
        "management_notes": "Tolerates cold weather during vegetative stage; vulnerable to waterlogging.",
        "hard_constraints": ["Cannot tolerate wet, poorly-drained soils during pod formation."]
    },

    # 9. Cotton
    {
        "id": "cotton",
        "crop_name": "Cotton",
        "hindi_name": "Kapas (कपास)",
        "scientific_name": "Gossypium hirsutum",
        "category": "Fiber",
        "supported_seasons": ["Kharif"],
        "sowing_months": [4, 5, 6],
        "duration_days": [150, 180],
        "temperature_range": {"optimal_min": 21.0, "optimal_max": 35.0, "critical_min": 15.0, "critical_max": 44.0},
        "rainfall_mm": {"optimal_min": 500.0, "optimal_max": 900.0, "critical_min": 350.0, "critical_max": 1400.0},
        "water_requirement": "MODERATE",
        "soil_types": ["Deep Black Soil", "Alluvial", "Medium Black"],
        "soil_ph": {"optimal_min": 6.5, "optimal_max": 8.0, "critical_min": 5.5, "critical_max": 8.8},
        "npk_demand": {"N": "High", "P": "Moderate", "K": "High"},
        "compatible_irrigation": ["Canal", "Tube Well", "Drip", "Borewell", "Rainfed"],
        "primary_states": ["Gujarat", "Maharashtra", "Telangana", "Andhra Pradesh", "Rajasthan", "Haryana", "Punjab"],
        "management_notes": "Black cotton soils (Vertisols) retain moisture ideal for deep tap roots. Drip fertigation doubles efficiency.",
        "hard_constraints": ["Cold weather (<15°C) stops boll maturation; continuous rain during boll opening ruins lint."]
    },

    # 10. Sugarcane
    {
        "id": "sugarcane",
        "crop_name": "Sugarcane",
        "hindi_name": "Ganna (गन्ना)",
        "scientific_name": "Saccharum officinarum",
        "category": "Cash Crops",
        "supported_seasons": ["Whole Year"],
        "sowing_months": [1, 2, 3, 10, 11],
        "duration_days": [300, 365],
        "temperature_range": {"optimal_min": 24.0, "optimal_max": 38.0, "critical_min": 16.0, "critical_max": 45.0},
        "rainfall_mm": {"optimal_min": 1200.0, "optimal_max": 2000.0, "critical_min": 800.0, "critical_max": 3000.0},
        "water_requirement": "VERY_HIGH",
        "soil_types": ["Alluvial", "Deep Black Soil", "Loamy"],
        "soil_ph": {"optimal_min": 6.5, "optimal_max": 7.5, "critical_min": 5.5, "critical_max": 8.5},
        "npk_demand": {"N": "High", "P": "High", "K": "High"},
        "compatible_irrigation": ["Canal", "Tube Well", "Borewell", "Drip", "Flooding"],
        "primary_states": ["Uttar Pradesh", "Maharashtra", "Karnataka", "Tamil Nadu", "Gujarat", "Bihar"],
        "management_notes": "Long duration heavy-feeder crop requiring guaranteed irrigation throughout the year.",
        "hard_constraints": ["Cannot be cultivated under rainfed conditions in semi-arid zones without reliable irrigation."]
    },

    # 11. Groundnut (Peanut)
    {
        "id": "groundnut",
        "crop_name": "Groundnut (Peanut)",
        "hindi_name": "Moongphali (मूँगफली)",
        "scientific_name": "Arachis hypogaea",
        "category": "Oilseeds",
        "supported_seasons": ["Kharif", "Rabi", "Zaid"],
        "sowing_months": [6, 7, 10, 11, 1, 2],
        "duration_days": [105, 125],
        "temperature_range": {"optimal_min": 22.0, "optimal_max": 32.0, "critical_min": 15.0, "critical_max": 38.0},
        "rainfall_mm": {"optimal_min": 450.0, "optimal_max": 750.0, "critical_min": 300.0, "critical_max": 1100.0},
        "water_requirement": "MODERATE",
        "soil_types": ["Sandy Loam", "Red Sandy", "Alluvial", "Light Black"],
        "soil_ph": {"optimal_min": 6.0, "optimal_max": 7.5, "critical_min": 5.2, "critical_max": 8.0},
        "npk_demand": {"N": "Low", "P": "Moderate", "K": "Moderate"},
        "compatible_irrigation": ["Rainfed", "Sprinkler", "Canal", "Tube Well"],
        "primary_states": ["Gujarat", "Rajasthan", "Tamil Nadu", "Andhra Pradesh", "Karnataka"],
        "management_notes": "Requires friable, loose sandy-loam soils to allow easy peg penetration and pod development.",
        "hard_constraints": ["Heavy, stiff clay soils restrict peg penetration and cause high pod harvesting losses."]
    },

    # 12. Mustard / Rapeseed
    {
        "id": "mustard",
        "crop_name": "Mustard (Sarson / Rai)",
        "hindi_name": "Sarson / Rai (सरसों)",
        "scientific_name": "Brassica juncea",
        "category": "Oilseeds",
        "supported_seasons": ["Rabi"],
        "sowing_months": [9, 10, 11],  # Sep - Nov
        "duration_days": [105, 135],
        "temperature_range": {"optimal_min": 12.0, "optimal_max": 25.0, "critical_min": 5.0, "critical_max": 32.0},
        "rainfall_mm": {"optimal_min": 250.0, "optimal_max": 450.0, "critical_min": 150.0, "critical_max": 650.0},
        "water_requirement": "LOW",
        "soil_types": ["Alluvial", "Sandy Loam", "Clay Loam"],
        "soil_ph": {"optimal_min": 6.0, "optimal_max": 7.5, "critical_min": 5.5, "critical_max": 8.5},
        "npk_demand": {"N": "High", "P": "Moderate", "K": "Moderate"},
        "compatible_irrigation": ["Rainfed", "Canal", "Tube Well", "Sprinkler"],
        "primary_states": ["Rajasthan", "Madhya Pradesh", "Haryana", "Uttar Pradesh", "West Bengal", "Gujarat"],
        "management_notes": "Very low water footprint; requires dry sunny weather during seed pod development.",
        "hard_constraints": ["High humidity with warm weather causes severe aphid outbreaks and white rust."]
    },

    # 13. Soybean
    {
        "id": "soybean",
        "crop_name": "Soybean",
        "hindi_name": "Soyabean (सोयाबीन)",
        "scientific_name": "Glycine max",
        "category": "Oilseeds",
        "supported_seasons": ["Kharif"],
        "sowing_months": [6, 7],
        "duration_days": [90, 115],
        "temperature_range": {"optimal_min": 22.0, "optimal_max": 32.0, "critical_min": 15.0, "critical_max": 38.0},
        "rainfall_mm": {"optimal_min": 600.0, "optimal_max": 950.0, "critical_min": 400.0, "critical_max": 1400.0},
        "water_requirement": "MODERATE",
        "soil_types": ["Deep Black Soil", "Medium Black", "Alluvial", "Clay Loam"],
        "soil_ph": {"optimal_min": 6.2, "optimal_max": 7.5, "critical_min": 5.5, "critical_max": 8.2},
        "npk_demand": {"N": "Low", "P": "High", "K": "Moderate"},
        "compatible_irrigation": ["Rainfed", "Canal", "Tube Well", "Sprinkler"],
        "primary_states": ["Madhya Pradesh", "Maharashtra", "Rajasthan", "Karnataka", "Telangana"],
        "management_notes": "Key rainfed Kharif oilseed in central Vertisols; broad bed furrow planting prevents waterlogging.",
        "hard_constraints": ["Sensitive to drought at pod-filling stage and water stagnation during germination."]
    },

    # 14. Tomato
    {
        "id": "tomato",
        "crop_name": "Tomato",
        "hindi_name": "Tamatar (टमाटर)",
        "scientific_name": "Solanum lycopersicum",
        "category": "Horticultural",
        "supported_seasons": ["Kharif", "Rabi", "Zaid", "Whole Year"],
        "sowing_months": [6, 7, 10, 11, 1, 2],
        "duration_days": [100, 135],
        "temperature_range": {"optimal_min": 18.0, "optimal_max": 28.0, "critical_min": 10.0, "critical_max": 38.0},
        "rainfall_mm": {"optimal_min": 450.0, "optimal_max": 750.0, "critical_min": 250.0, "critical_max": 1200.0},
        "water_requirement": "MODERATE",
        "soil_types": ["Sandy Loam", "Red Loam", "Alluvial", "Clay Loam"],
        "soil_ph": {"optimal_min": 6.0, "optimal_max": 7.2, "critical_min": 5.5, "critical_max": 8.0},
        "npk_demand": {"N": "High", "P": "High", "K": "High"},
        "compatible_irrigation": ["Drip", "Tube Well", "Borewell", "Canal"],
        "primary_states": ["Andhra Pradesh", "Madhya Pradesh", "Karnataka", "Gujarat", "Odisha", "West Bengal", "Maharashtra"],
        "management_notes": "Responds exceptionally well to drip fertigation and plastic mulching; staking enhances marketable yield.",
        "hard_constraints": ["Frost damages foliage instantly; night temperatures >26°C lead to poor fruit setting."]
    },

    # 15. Potato
    {
        "id": "potato",
        "crop_name": "Potato",
        "hindi_name": "Aloo (आलू)",
        "scientific_name": "Solanum tuberosum",
        "category": "Horticultural",
        "supported_seasons": ["Rabi"],
        "sowing_months": [10, 11],
        "duration_days": [80, 110],
        "temperature_range": {"optimal_min": 15.0, "optimal_max": 22.0, "critical_min": 8.0, "critical_max": 30.0},
        "rainfall_mm": {"optimal_min": 400.0, "optimal_max": 650.0, "critical_min": 200.0, "critical_max": 900.0},
        "water_requirement": "MODERATE",
        "soil_types": ["Sandy Loam", "Alluvial", "Loamy"],
        "soil_ph": {"optimal_min": 5.2, "optimal_max": 6.8, "critical_min": 4.8, "critical_max": 7.8},
        "npk_demand": {"N": "High", "P": "High", "K": "High"},
        "compatible_irrigation": ["Furrow", "Drip", "Tube Well", "Canal", "Sprinkler"],
        "primary_states": ["Uttar Pradesh", "West Bengal", "Bihar", "Gujarat", "Punjab", "Madhya Pradesh"],
        "management_notes": "Tuberization strictly requires cool nights (<20°C). Requires loose, aerated friable seedbeds.",
        "hard_constraints": ["Tuber bulking stops if night temperatures exceed 22°C."]
    },

    # 16. Onion
    {
        "id": "onion",
        "crop_name": "Onion",
        "hindi_name": "Pyaaz (प्याज)",
        "scientific_name": "Allium cepa",
        "category": "Horticultural",
        "supported_seasons": ["Kharif", "Rabi", "Zaid"],
        "sowing_months": [6, 7, 10, 11, 12],
        "duration_days": [120, 150],
        "temperature_range": {"optimal_min": 15.0, "optimal_max": 30.0, "critical_min": 9.0, "critical_max": 38.0},
        "rainfall_mm": {"optimal_min": 500.0, "optimal_max": 750.0, "critical_min": 300.0, "critical_max": 1100.0},
        "water_requirement": "MODERATE",
        "soil_types": ["Sandy Loam", "Alluvial", "Clay Loam", "Red Loam"],
        "soil_ph": {"optimal_min": 6.0, "optimal_max": 7.5, "critical_min": 5.5, "critical_max": 8.0},
        "npk_demand": {"N": "High", "P": "Moderate", "K": "High"},
        "compatible_irrigation": ["Drip", "Sprinkler", "Tube Well", "Canal"],
        "primary_states": ["Maharashtra", "Madhya Pradesh", "Karnataka", "Gujarat", "Rajasthan", "Bihar"],
        "management_notes": "Shallow root feeder; sensitive to both soil drought and excess water stagnation.",
        "hard_constraints": ["Heavy clay soils produce deformed bulbs; water stagnation causes basal bulb rot."]
    },

    # 17. Banana
    {
        "id": "banana",
        "crop_name": "Banana",
        "hindi_name": "Kela (केला)",
        "scientific_name": "Musa acuminata",
        "category": "Horticultural",
        "supported_seasons": ["Whole Year"],
        "sowing_months": [2, 3, 6, 7, 9, 10],
        "duration_days": [300, 360],
        "temperature_range": {"optimal_min": 22.0, "optimal_max": 32.0, "critical_min": 14.0, "critical_max": 40.0},
        "rainfall_mm": {"optimal_min": 1200.0, "optimal_max": 2200.0, "critical_min": 800.0, "critical_max": 3000.0},
        "water_requirement": "VERY_HIGH",
        "soil_types": ["Alluvial", "Clay Loam", "Deep Black Soil"],
        "soil_ph": {"optimal_min": 6.5, "optimal_max": 7.5, "critical_min": 5.5, "critical_max": 8.2},
        "npk_demand": {"N": "High", "P": "Moderate", "K": "Very High"},
        "compatible_irrigation": ["Drip", "Canal", "Tube Well", "Borewell"],
        "primary_states": ["Andhra Pradesh", "Maharashtra", "Gujarat", "Tamil Nadu", "Karnataka", "Kerala", "Uttar Pradesh"],
        "management_notes": "Tropical perennial requiring high humidity, sheltered winds, and continuous drip irrigation.",
        "hard_constraints": ["Frost kills vegetative pseudostem; high wind velocities cause lodging."]
    },

    # 18. Grapes
    {
        "id": "grapes",
        "crop_name": "Grapes",
        "hindi_name": "Angoor (अंगूर)",
        "scientific_name": "Vitis vinifera",
        "category": "Horticultural",
        "supported_seasons": ["Whole Year"],
        "sowing_months": [1, 2, 10, 11],
        "duration_days": [120, 160],
        "temperature_range": {"optimal_min": 18.0, "optimal_max": 32.0, "critical_min": 10.0, "critical_max": 40.0},
        "rainfall_mm": {"optimal_min": 500.0, "optimal_max": 850.0, "critical_min": 300.0, "critical_max": 1200.0},
        "water_requirement": "MODERATE",
        "soil_types": ["Sandy Loam", "Red Sandy", "Medium Black"],
        "soil_ph": {"optimal_min": 6.5, "optimal_max": 8.0, "critical_min": 5.5, "critical_max": 8.5},
        "npk_demand": {"N": "Moderate", "P": "Moderate", "K": "High"},
        "compatible_irrigation": ["Drip", "Borewell", "Tube Well"],
        "primary_states": ["Maharashtra", "Karnataka", "Tamil Nadu", "Andhra Pradesh"],
        "management_notes": "Strictly requires bower/trellis architecture; dry weather required during berry ripening.",
        "hard_constraints": ["Rainfall during berry ripening causes berry cracking and downey/powdery mildew explosion."]
    },

    # 19. Apple
    {
        "id": "apple",
        "crop_name": "Apple",
        "hindi_name": "Seb (सेब)",
        "scientific_name": "Malus domestica",
        "category": "Horticultural",
        "supported_seasons": ["Whole Year"],
        "sowing_months": [1, 2],
        "duration_days": [150, 180],
        "temperature_range": {"optimal_min": 10.0, "optimal_max": 24.0, "critical_min": -5.0, "critical_max": 30.0},
        "rainfall_mm": {"optimal_min": 1000.0, "optimal_max": 1600.0, "critical_min": 600.0, "critical_max": 2500.0},
        "water_requirement": "MODERATE",
        "soil_types": ["Loamy", "Clay Loam", "Hilly Alluvial"],
        "soil_ph": {"optimal_min": 5.8, "optimal_max": 6.8, "critical_min": 5.0, "critical_max": 7.5},
        "npk_demand": {"N": "Moderate", "P": "Moderate", "K": "High"},
        "compatible_irrigation": ["Drip", "Rainfed", "Borewell"],
        "primary_states": ["Jammu and Kashmir", "Himachal Pradesh", "Uttarakhand"],
        "management_notes": "Temperate tree fruit requiring 800-1200 hours of chilling (<7°C) during winter for bud break.",
        "hard_constraints": ["Cannot be grown in tropical/plains climate without sufficient winter chilling hours."]
    },

    # 20. Watermelon
    {
        "id": "watermelon",
        "crop_name": "Watermelon",
        "hindi_name": "Tarbooj (तरबूज)",
        "scientific_name": "Citrullus lanatus",
        "category": "Horticultural",
        "supported_seasons": ["Zaid", "Kharif"],
        "sowing_months": [1, 2, 3, 6],
        "duration_days": [80, 100],
        "temperature_range": {"optimal_min": 24.0, "optimal_max": 35.0, "critical_min": 18.0, "critical_max": 42.0},
        "rainfall_mm": {"optimal_min": 350.0, "optimal_max": 600.0, "critical_min": 200.0, "critical_max": 900.0},
        "water_requirement": "MODERATE",
        "soil_types": ["Sandy Loam", "Riverbed Sandy", "Alluvial"],
        "soil_ph": {"optimal_min": 6.0, "optimal_max": 7.2, "critical_min": 5.5, "critical_max": 8.0},
        "npk_demand": {"N": "High", "P": "Moderate", "K": "High"},
        "compatible_irrigation": ["Drip", "Tube Well", "Canal", "Riverbed Furrow"],
        "primary_states": ["Uttar Pradesh", "Karnataka", "Andhra Pradesh", "Tamil Nadu", "Rajasthan", "Madhya Pradesh", "Gujarat"],
        "management_notes": "Warm dry weather with plenty of sunshine yields sweetest fruits. Popular riverbed (Diaras) crop.",
        "hard_constraints": ["High humidity during fruit growth invites powdery mildew and causes poor sugar development."]
    },

    # 21. Mango
    {
        "id": "mango",
        "crop_name": "Mango",
        "hindi_name": "Aam (आम)",
        "scientific_name": "Mangifera indica",
        "category": "Horticultural",
        "supported_seasons": ["Whole Year"],
        "sowing_months": [7, 8, 9],
        "duration_days": [120, 150],
        "temperature_range": {"optimal_min": 24.0, "optimal_max": 36.0, "critical_min": 12.0, "critical_max": 46.0},
        "rainfall_mm": {"optimal_min": 750.0, "optimal_max": 1500.0, "critical_min": 400.0, "critical_max": 2500.0},
        "water_requirement": "MODERATE",
        "soil_types": ["Alluvial", "Red Loam", "Deep Black Soil", "Laterite"],
        "soil_ph": {"optimal_min": 5.5, "optimal_max": 7.5, "critical_min": 4.8, "critical_max": 8.2},
        "npk_demand": {"N": "Moderate", "P": "Moderate", "K": "High"},
        "compatible_irrigation": ["Drip", "Canal", "Tube Well", "Rainfed"],
        "primary_states": ["Uttar Pradesh", "Andhra Pradesh", "Karnataka", "Bihar", "Gujarat", "Maharashtra", "West Bengal"],
        "management_notes": "Needs distinct dry period of 2-3 months prior to flowering to induce floral buds.",
        "hard_constraints": ["Frost (<5°C) kills blossoms and young shoots; rain during flowering causes anthracnose."]
    },

    # 22. Coconut
    {
        "id": "coconut",
        "crop_name": "Coconut",
        "hindi_name": "Nariyal (नारियल)",
        "scientific_name": "Cocos nucifera",
        "category": "Cash Crops",
        "supported_seasons": ["Whole Year"],
        "sowing_months": [5, 6, 9, 10],
        "duration_days": [365, 365],
        "temperature_range": {"optimal_min": 24.0, "optimal_max": 32.0, "critical_min": 18.0, "critical_max": 38.0},
        "rainfall_mm": {"optimal_min": 1300.0, "optimal_max": 2500.0, "critical_min": 1000.0, "critical_max": 4000.0},
        "water_requirement": "HIGH",
        "soil_types": ["Coastal Sandy", "Alluvial", "Red Loam", "Laterite"],
        "soil_ph": {"optimal_min": 5.2, "optimal_max": 7.5, "critical_min": 4.5, "critical_max": 8.5},
        "npk_demand": {"N": "High", "P": "Moderate", "K": "Very High"},
        "compatible_irrigation": ["Borewell", "Drip", "Canal", "Rainfed"],
        "primary_states": ["Kerala", "Tamil Nadu", "Karnataka", "Andhra Pradesh", "Odisha", "West Bengal", "Goa"],
        "management_notes": "Humid coastal and littoral belt palm requiring non-waterlogged soils and steady potassium nutrition.",
        "hard_constraints": ["Cannot survive cold winter temperatures (<12°C); unsuitable for Northern plains."]
    },

    # 23. Jute
    {
        "id": "jute",
        "crop_name": "Jute",
        "hindi_name": "Patson (पटसन)",
        "scientific_name": "Corchorus olitorius",
        "category": "Fiber",
        "supported_seasons": ["Kharif"],
        "sowing_months": [3, 4, 5],
        "duration_days": [120, 150],
        "temperature_range": {"optimal_min": 24.0, "optimal_max": 35.0, "critical_min": 18.0, "critical_max": 40.0},
        "rainfall_mm": {"optimal_min": 1200.0, "optimal_max": 1800.0, "critical_min": 800.0, "critical_max": 2500.0},
        "water_requirement": "HIGH",
        "soil_types": ["Alluvial", "Clay Loam", "Silty Loam"],
        "soil_ph": {"optimal_min": 6.0, "optimal_max": 7.4, "critical_min": 5.0, "critical_max": 8.0},
        "npk_demand": {"N": "High", "P": "Low", "K": "Moderate"},
        "compatible_irrigation": ["Rainfed", "Canal", "Tube Well"],
        "primary_states": ["West Bengal", "Bihar", "Assam", "Odisha"],
        "management_notes": "Golden fiber crop of the eastern alluvial delta; requires abundant slow-moving clean water for retting.",
        "hard_constraints": ["Cannot be grown in arid/semi-arid regions lacking retting water sources."]
    },

    # 24. Coffee
    {
        "id": "coffee",
        "crop_name": "Coffee (Arabica / Robusta)",
        "hindi_name": "Coffee (कॉफी)",
        "scientific_name": "Coffea arabica",
        "category": "Cash Crops",
        "supported_seasons": ["Whole Year"],
        "sowing_months": [6, 7, 8],
        "duration_days": [240, 270],
        "temperature_range": {"optimal_min": 18.0, "optimal_max": 28.0, "critical_min": 12.0, "critical_max": 34.0},
        "rainfall_mm": {"optimal_min": 1500.0, "optimal_max": 2500.0, "critical_min": 1100.0, "critical_max": 3500.0},
        "water_requirement": "HIGH",
        "soil_types": ["Red Loam", "Laterite", "Hilly Forest Loam"],
        "soil_ph": {"optimal_min": 5.5, "optimal_max": 6.5, "critical_min": 4.8, "critical_max": 7.2},
        "npk_demand": {"N": "High", "P": "Moderate", "K": "High"},
        "compatible_irrigation": ["Sprinkler", "Rainfed", "Drip"],
        "primary_states": ["Karnataka", "Kerala", "Tamil Nadu", "Andhra Pradesh", "Odisha"],
        "management_notes": "Shade-grown plantation crop on Western/Eastern Ghat slopes; requires blossom showers in March-April.",
        "hard_constraints": ["Cannot tolerate direct blazing sun without canopy trees or frost/freezing cold."]
    },

    # 25. Pearl Millet (Bajra)
    {
        "id": "bajra",
        "crop_name": "Pearl Millet (Bajra)",
        "hindi_name": "Bajra (बाजरा)",
        "scientific_name": "Pennisetum glaucum",
        "category": "Cereals",
        "supported_seasons": ["Kharif", "Zaid"],
        "sowing_months": [6, 7, 3],
        "duration_days": [75, 95],
        "temperature_range": {"optimal_min": 25.0, "optimal_max": 38.0, "critical_min": 15.0, "critical_max": 45.0},
        "rainfall_mm": {"optimal_min": 350.0, "optimal_max": 600.0, "critical_min": 180.0, "critical_max": 800.0},
        "water_requirement": "LOW",
        "soil_types": ["Sandy", "Sandy Loam", "Light Alluvial", "Red Sandy"],
        "soil_ph": {"optimal_min": 6.5, "optimal_max": 8.0, "critical_min": 5.5, "critical_max": 8.8},
        "npk_demand": {"N": "Moderate", "P": "Low", "K": "Low"},
        "compatible_irrigation": ["Rainfed", "Canal", "Tube Well"],
        "primary_states": ["Rajasthan", "Uttar Pradesh", "Gujarat", "Haryana", "Maharashtra"],
        "management_notes": "C4 dryland drought-hardy millets; thrives in coarse arid sandy soils with minimal water.",
        "hard_constraints": ["Cannot tolerate waterlogged, water-saturated or highly acidic soils (pH < 5.2)."]
    },

    # 26. Sorghum (Jowar)
    {
        "id": "sorghum",
        "crop_name": "Sorghum (Jowar)",
        "hindi_name": "Jowar (ज्वार)",
        "scientific_name": "Sorghum bicolor",
        "category": "Cereals",
        "supported_seasons": ["Kharif", "Rabi"],
        "sowing_months": [6, 7, 9, 10],
        "duration_days": [100, 120],
        "temperature_range": {"optimal_min": 24.0, "optimal_max": 34.0, "critical_min": 14.0, "critical_max": 42.0},
        "rainfall_mm": {"optimal_min": 400.0, "optimal_max": 750.0, "critical_min": 250.0, "critical_max": 1000.0},
        "water_requirement": "LOW",
        "soil_types": ["Deep Black Soil", "Medium Black", "Alluvial", "Clay Loam"],
        "soil_ph": {"optimal_min": 6.0, "optimal_max": 8.0, "critical_min": 5.2, "critical_max": 8.5},
        "npk_demand": {"N": "Moderate", "P": "Moderate", "K": "Low"},
        "compatible_irrigation": ["Rainfed", "Canal", "Tube Well"],
        "primary_states": ["Maharashtra", "Karnataka", "Rajasthan", "Madhya Pradesh", "Andhra Pradesh", "Tamil Nadu"],
        "management_notes": "Excellent dual-purpose grain and fodder crop with superior heat and drought tolerance.",
        "hard_constraints": ["Excessive continuous rainfall during grain maturity causes mold and grain blackening."]
    }
]

# Quick access lookups
CROPS_BY_ID = {c["id"]: c for c in CROPS_KNOWLEDGE_BASE}
CROPS_BY_NAME = {c["crop_name"].lower(): c for c in CROPS_KNOWLEDGE_BASE}

SUPPORTED_SEASONS = ["Kharif", "Rabi", "Zaid", "Whole Year"]

# Standard Soil Types recognized across India
RECOGNIZED_SOIL_TYPES = [
    "Alluvial",
    "Deep Black Soil",
    "Medium Black",
    "Red Loam",
    "Red Sandy",
    "Sandy Loam",
    "Clay Loam",
    "Clay",
    "Laterite",
    "Coastal Sandy",
    "Hilly Forest Loam"
]
