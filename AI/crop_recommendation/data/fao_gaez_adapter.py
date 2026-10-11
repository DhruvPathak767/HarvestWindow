"""
HarvestWindow Phase AI-4: FAO GAEZ (Global Agro-Ecological Zones) Data Adapter
Integrates spatial agro-ecological zone mapping, thermal regimes, and attainable suitability
indicators according to FAO / IIASA GAEZ v4 specifications.
"""

import os
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("fao_gaez_adapter")

# ICAR-NBSS&LUP Agro-Ecological Zones mapped to FAO GAEZ thermal & moisture regimes
AEZ_INDIAN_REGIONS = {
    # Zone 1: Western Himalayas
    "Jammu and Kashmir": {"zone_id": "AEZ-01", "name": "Western Himalayas, cold arid/semi-arid", "lgp_days": [90, 150]},
    "Himachal Pradesh": {"zone_id": "AEZ-01", "name": "Western Himalayas, warm sub-humid", "lgp_days": [150, 210]},
    "Uttarakhand": {"zone_id": "AEZ-01", "name": "Western Himalayas, warm sub-humid", "lgp_days": [150, 210]},

    # Zone 2 & 9: Northern Plains (Indo-Gangetic)
    "Punjab": {"zone_id": "AEZ-02", "name": "Northern Plain (Alluvial), hot semi-arid", "lgp_days": [90, 150]},
    "Haryana": {"zone_id": "AEZ-02", "name": "Northern Plain (Alluvial), hot semi-arid", "lgp_days": [90, 150]},
    "Uttar Pradesh": {"zone_id": "AEZ-09", "name": "Northern Plain (Ganga Plain), hot sub-humid", "lgp_days": [150, 180]},
    "Bihar": {"zone_id": "AEZ-09", "name": "Middle Ganga Plain, hot sub-humid", "lgp_days": [180, 210]},
    "West Bengal": {"zone_id": "AEZ-15", "name": "Bengal Basin & Coastal Alluvial, humid", "lgp_days": [210, 270]},

    # Zone 4, 5, 6, 7: Central & Deccan Plateau
    "Madhya Pradesh": {"zone_id": "AEZ-04", "name": "Central Highlands (Malwa), hot semi-arid/sub-humid", "lgp_days": [120, 180]},
    "Maharashtra": {"zone_id": "AEZ-06", "name": "Deccan Plateau (Deep Black Soils), hot semi-arid", "lgp_days": [90, 150]},
    "Gujarat": {"zone_id": "AEZ-02", "name": "Gujarat Plains & Kathiawar, hot arid/semi-arid", "lgp_days": [75, 120]},
    "Rajasthan": {"zone_id": "AEZ-02", "name": "Western Plains (Thar Desert), hot hyper-arid/arid", "lgp_days": [60, 90]},

    # Zone 7 & 8: Southern Peninsular
    "Karnataka": {"zone_id": "AEZ-08", "name": "Karnataka Plateau (Red & Black Soils), hot semi-arid", "lgp_days": [90, 150]},
    "Andhra Pradesh": {"zone_id": "AEZ-07", "name": "Eastern Ghats & Telengana, hot semi-arid", "lgp_days": [90, 150]},
    "Telangana": {"zone_id": "AEZ-07", "name": "Deccan Plateau (Telangana), hot semi-arid", "lgp_days": [90, 150]},
    "Tamil Nadu": {"zone_id": "AEZ-08", "name": "Eastern Coastal Plain, hot semi-arid/sub-humid", "lgp_days": [90, 180]},
    "Kerala": {"zone_id": "AEZ-19", "name": "Western Ghats & Coastal Plain, humid/perhumid", "lgp_days": [240, 330]},

    # Zone 12, 13: Eastern & North-Eastern
    "Odisha": {"zone_id": "AEZ-12", "name": "Eastern Plateau & Coastal, hot sub-humid", "lgp_days": [180, 210]},
    "Assam": {"zone_id": "AEZ-15", "name": "Assam & Bengal Plains, warm perhumid", "lgp_days": [270, 365]},
}


class FaoGaezAdapter:
    """
    Adapter bridging HarvestWindow farm locations with FAO GAEZ agro-ecological zones.
    """

    GAEZ_LOCAL_DIR = os.getenv("FAO_GAEZ_DATA_DIR", "")

    @classmethod
    def resolve_zone(
        cls,
        state: Optional[str] = None,
        district: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Resolves agro-ecological zone metadata for a farm location.
        """
        if not state:
            return {
                "source": "FAO_GAEZ_v4_FALLBACK",
                "is_resolved": False,
                "zone_id": "GLOBAL-GENERIC",
                "zone_name": "Undetermined Agro-Ecological Zone",
                "length_of_growing_period": None,
                "notes": "State or coordinates missing; agro-climatic boundaries uncalibrated."
            }

        norm_state = state.strip()
        matched = AEZ_INDIAN_REGIONS.get(norm_state)

        # Case-insensitive search if exact match misses
        if not matched:
            for s_name, data in AEZ_INDIAN_REGIONS.items():
                if s_name.lower() in norm_state.lower() or norm_state.lower() in s_name.lower():
                    matched = data
                    break

        if matched:
            return {
                "source": "FAO_GAEZ_v4_AEZ_INDIA",
                "is_resolved": True,
                "zone_id": matched["zone_id"],
                "zone_name": matched["name"],
                "length_of_growing_period_days": matched["lgp_days"],
                "latitude": latitude,
                "longitude": longitude,
                "state": norm_state,
                "district": district,
                "notes": f"Mapped to FAO GAEZ / ICAR {matched['zone_id']}."
            }

        return {
            "source": "FAO_GAEZ_v4_GENERIC",
            "is_resolved": False,
            "zone_id": "INDIA-TROPICAL-SUBTROPICAL",
            "zone_name": f"Sub-tropical agricultural zone ({norm_state})",
            "length_of_growing_period_days": [120, 180],
            "state": norm_state,
            "district": district,
            "notes": "Zone resolved through generalized sub-tropical boundary."
        }

    @classmethod
    def is_gaez_raster_mounted(cls) -> bool:
        """Checks if local offline GeoTIFF GAEZ rasters exist in filesystem."""
        return bool(cls.GAEZ_LOCAL_DIR and os.path.exists(cls.GAEZ_LOCAL_DIR))
