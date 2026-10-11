"""
Class Registry for Crop Disease and Health Detection
Maps machine learning class identifiers to verified agronomic taxonomies, crops, pathogens, and condition categories.
"""
from typing import Dict, Any, Optional

CLASS_REGISTRY: Dict[str, Dict[str, Any]] = {
    # Potato
    "Potato___Early_blight": {
        "class_id": "Potato___Early_blight",
        "crop": "Potato",
        "display_name": "Potato Early Blight",
        "pathogen": "Alternaria solani",
        "category": "FUNGAL_DISEASE",
        "is_healthy": False,
        "symptoms": [
            "Concentric rings ('target-board' or bullseye pattern) on older lower leaves.",
            "Dark brown to black angular necrotic spots bounded by leaf veins.",
            "Chlorotic yellow halo surrounding mature lesions.",
            "Premature senescence and leaf drop in severe infections."
        ]
    },
    "Potato___Late_blight": {
        "class_id": "Potato___Late_blight",
        "crop": "Potato",
        "display_name": "Potato Late Blight",
        "pathogen": "Phytophthora infestans",
        "category": "FUNGAL_DISEASE",
        "is_healthy": False,
        "symptoms": [
            "Water-soaked irregular pale-to-dark green lesions rapidly turning dark brown or purplish-black.",
            "White velvety fungal growth (sporangia) on the undersides of leaves during humid mornings.",
            "Rapid collapse and rotting of foliage within 48 to 72 hours under cool, wet weather.",
            "Brownish dry rot spreading to potato tubers."
        ]
    },
    "Potato___healthy": {
        "class_id": "Potato___healthy",
        "crop": "Potato",
        "display_name": "Potato Healthy Leaf",
        "pathogen": None,
        "category": "HEALTHY",
        "is_healthy": True,
        "symptoms": [
            "Foliage displays vibrant uniform green coloration.",
            "Intact leaf lamina with no necrotic spotting, mildew, or wilting.",
            "Normal leaflet margins with regular venation."
        ]
    },

    # Tomato
    "Tomato___Bacterial_spot": {
        "class_id": "Tomato___Bacterial_spot",
        "crop": "Tomato",
        "display_name": "Tomato Bacterial Spot",
        "pathogen": "Xanthomonas vesicatoria / campestris",
        "category": "BACTERIAL_DISEASE",
        "is_healthy": False,
        "symptoms": [
            "Small water-soaked circular spots (1-3 mm) turning dark brown or black with greasy margins.",
            "Center of lesions may dry out and crack, giving a shot-hole appearance.",
            "Scabby, elevated dark blisters on green fruit surfaces.",
            "Severe leaf defoliation exposing developing tomatoes to sunscald."
        ]
    },
    "Tomato___Early_blight": {
        "class_id": "Tomato___Early_blight",
        "crop": "Tomato",
        "display_name": "Tomato Early Blight",
        "pathogen": "Alternaria linariae / solani",
        "category": "FUNGAL_DISEASE",
        "is_healthy": False,
        "symptoms": [
            "Brown-black target-like lesions with concentric rings starting on lower mature leaves.",
            "Surrounding tissue turns yellow (chlorosis), leading to leaf drop.",
            "Sunken dark cankers at the soil line on stems of young transplants.",
            "Dark leathery concentric lesions near the stem end of mature fruit."
        ]
    },
    "Tomato___Late_blight": {
        "class_id": "Tomato___Late_blight",
        "crop": "Tomato",
        "display_name": "Tomato Late Blight",
        "pathogen": "Phytophthora infestans",
        "category": "FUNGAL_DISEASE",
        "is_healthy": False,
        "symptoms": [
            "Large irregular water-soaked spots turning dark oily brown.",
            "Delicate white cottony mildew on leaf undersides in high humidity (>90%).",
            "Petiole and stem cankers causing whole vine collapse in wet conditions.",
            "Firm, greasy golden-brown rot on green and ripe fruits."
        ]
    },
    "Tomato___Leaf_Mold": {
        "class_id": "Tomato___Leaf_Mold",
        "crop": "Tomato",
        "display_name": "Tomato Leaf Mold",
        "pathogen": "Passalora fulva (Cladosporium fulvum)",
        "category": "FUNGAL_DISEASE",
        "is_healthy": False,
        "symptoms": [
            "Pale greenish-yellow patches with indefinite margins on upper leaf surfaces.",
            "Olive-green to velvety brown velvety mold sporulation on corresponding lower leaf surface.",
            "Leaves curl, wither, and drop prematurely from bottom upward."
        ]
    },
    "Tomato___Septoria_leaf_spot": {
        "class_id": "Tomato___Septoria_leaf_spot",
        "crop": "Tomato",
        "display_name": "Tomato Septoria Leaf Spot",
        "pathogen": "Septoria lycopersici",
        "category": "FUNGAL_DISEASE",
        "is_healthy": False,
        "symptoms": [
            "Numerous small circular spots (2-4 mm) with gray or tan centers and dark brown borders.",
            "Tiny black specks (pycnidia fruiting bodies) visible in lesion centers with a hand lens.",
            "Heavily infected leaves turn yellow, curl up, and drop."
        ]
    },
    "Tomato___Spider_mites Two-spotted_spider_mite": {
        "class_id": "Tomato___Spider_mites Two-spotted_spider_mite",
        "crop": "Tomato",
        "display_name": "Tomato Spider Mite Damage",
        "pathogen": "Tetranychus urticae (Two-spotted spider mite)",
        "category": "PEST_DAMAGE",
        "is_healthy": False,
        "symptoms": [
            "Fine white, yellow, or bronze stippling / speckling on leaf surfaces.",
            "Fine silky webbing on leaf undersides and terminal shoots.",
            "Leaves turn dull bronze, become dry and brittle, then desiccate under dry dusty conditions."
        ]
    },
    "Tomato___Target_Spot": {
        "class_id": "Tomato___Target_Spot",
        "crop": "Tomato",
        "display_name": "Tomato Target Spot",
        "pathogen": "Corynespora cassiicola",
        "category": "FUNGAL_DISEASE",
        "is_healthy": False,
        "symptoms": [
            "Brown pinpoint spots on foliage expanding into circular lesions with light brown centers.",
            "Concentric rings frequently visible on mature leaves resembling target board.",
            "Depressed circular lesions on green and ripening fruit."
        ]
    },
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus": {
        "class_id": "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
        "crop": "Tomato",
        "display_name": "Tomato Yellow Leaf Curl Virus (TYLCV)",
        "pathogen": "Tomato Yellow Leaf Curl Begomovirus (Vector: Whitefly Bemisia tabaci)",
        "category": "VIRAL_DISEASE",
        "is_healthy": False,
        "symptoms": [
            "Severe upward and inward cupping / curling of leaflet margins.",
            "Interveinal yellowing (chlorosis) with stunted, bushy, erect growth habit.",
            "Flower drop with drastic reduction in fruit setting if infected early."
        ]
    },
    "Tomato___Tomato_mosaic_virus": {
        "class_id": "Tomato___Tomato_mosaic_virus",
        "crop": "Tomato",
        "display_name": "Tomato Mosaic Virus (ToMV)",
        "pathogen": "Tomato Mosaic Tobamovirus",
        "category": "VIRAL_DISEASE",
        "is_healthy": False,
        "symptoms": [
            "Alternating mottled light and dark green mosaic patterns on foliage.",
            "Leaves may become narrow, distorted, or stringy ('fern leaf' symptom).",
            "Internal browning of fruit wall and uneven ripening."
        ]
    },
    "Tomato___healthy": {
        "class_id": "Tomato___healthy",
        "crop": "Tomato",
        "display_name": "Tomato Healthy Leaf",
        "pathogen": None,
        "category": "HEALTHY",
        "is_healthy": True,
        "symptoms": [
            "Deep green compound foliage free of spots, blisters, or mosaic patterns.",
            "Firm turgid leaflets with healthy glandular trichomes (leaf hairs).",
            "Normal vegetative shoot elongation."
        ]
    },

    # Corn / Maize
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot": {
        "class_id": "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
        "crop": "Corn (Maize)",
        "display_name": "Corn Gray Leaf Spot",
        "pathogen": "Cercospora zeae-maydis",
        "category": "FUNGAL_DISEASE",
        "is_healthy": False,
        "symptoms": [
            "Narrow, rectangular lesions restricted by parallel leaf veins.",
            "Lesions start tan or grayish-brown and elongate up to 5 cm.",
            "Foliage blight spreading upward from lower leaves during warm humid weather."
        ]
    },
    "Corn_(maize)___Common_rust_": {
        "class_id": "Corn_(maize)___Common_rust_",
        "crop": "Corn (Maize)",
        "display_name": "Corn Common Rust",
        "pathogen": "Puccinia sorghi",
        "category": "FUNGAL_DISEASE",
        "is_healthy": False,
        "symptoms": [
            "Golden-brown to cinnamon-brown powdery pustules (uredinia) scattered on both leaf surfaces.",
            "Pustules rupture the epidermis, releasing powdery rusty spores.",
            "Leaves may turn chlorotic and desiccate prematurely under moderate temperatures."
        ]
    },
    "Corn_(maize)___Northern_Leaf_Blight": {
        "class_id": "Corn_(maize)___Northern_Leaf_Blight",
        "crop": "Corn (Maize)",
        "display_name": "Corn Northern Leaf Blight",
        "pathogen": "Exserohilum turcicum",
        "category": "FUNGAL_DISEASE",
        "is_healthy": False,
        "symptoms": [
            "Long, elliptical, cigar-shaped grayish-green to tan lesions (2.5 to 15 cm long).",
            "Dark olive-gray fuzzy fungal spore mats visible in lesion centers under wet conditions.",
            "Extensive blighting of ear-leaf canopy during grain filling."
        ]
    },
    "Corn_(maize)___healthy": {
        "class_id": "Corn_(maize)___healthy",
        "crop": "Corn (Maize)",
        "display_name": "Corn Healthy Leaf",
        "pathogen": None,
        "category": "HEALTHY",
        "is_healthy": True,
        "symptoms": [
            "Vigorous broad arching leaves with uniform green color and prominent midrib.",
            "Clean leaf blade free of pustules, striping, or rectangular blighting.",
            "Smooth, healthy leaf margin."
        ]
    },

    # Grape
    "Grape___Black_rot": {
        "class_id": "Grape___Black_rot",
        "crop": "Grape",
        "display_name": "Grape Black Rot",
        "pathogen": "Guignardia bidwellii",
        "category": "FUNGAL_DISEASE",
        "is_healthy": False,
        "symptoms": [
            "Reddish-brown circular leaf spots with dark margins and ring of black dots (pycnidia).",
            "Berries shrivel into hard, black, wrinkled mummies that cling to clusters.",
            "Dark elliptical cankers on young canes."
        ]
    },
    "Grape___Esca_(Black_Measles)": {
        "class_id": "Grape___Esca_(Black_Measles)",
        "crop": "Grape",
        "display_name": "Grape Esca (Black Measles)",
        "pathogen": "Phaeomoniella chlamydospora & Fomitiporia mediterranea",
        "category": "FUNGAL_DISEASE",
        "is_healthy": False,
        "symptoms": [
            "Distinctive 'tiger-stripe' interveinal chlorosis and necrosis on leaves.",
            "Dark brown or purple speckled spotting on berry skins ('measles').",
            "Spongy white heartwood decay in trunk and arms upon cross-section."
        ]
    },
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)": {
        "class_id": "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
        "crop": "Grape",
        "display_name": "Grape Leaf Blight",
        "pathogen": "Pseudocercospora vitis (Isariopsis clavispora)",
        "category": "FUNGAL_DISEASE",
        "is_healthy": False,
        "symptoms": [
            "Irregular reddish-brown lesions with distinct dark borders on upper leaf surface.",
            "Olive to dark brown fuzzy sporulation on corresponding underside.",
            "Premature defoliation compromising vine vigor and winter hardiness."
        ]
    },
    "Grape___healthy": {
        "class_id": "Grape___healthy",
        "crop": "Grape",
        "display_name": "Grape Healthy Leaf",
        "pathogen": None,
        "category": "HEALTHY",
        "is_healthy": True,
        "symptoms": [
            "Deep green lobed palmate leaf with intact serrated margins.",
            "Clean veins with no tiger-striping or necrotic spotting.",
            "Supple foliage free of powdery or downy coatings."
        ]
    },

    # Apple
    "Apple___Apple_scab": {
        "class_id": "Apple___Apple_scab",
        "crop": "Apple",
        "display_name": "Apple Scab",
        "pathogen": "Venturia inaequalis",
        "category": "FUNGAL_DISEASE",
        "is_healthy": False,
        "symptoms": [
            "Olive-green to velvety brown circular spots on leaf surfaces and sepals.",
            "Lesions become dark brown and corky with distinct margins.",
            "Infected leaves twist, pucker, and drop prematurely.",
            "Corky, scabby brown patches on apple fruits causing deformation."
        ]
    },
    "Apple___Black_rot": {
        "class_id": "Apple___Black_rot",
        "crop": "Apple",
        "display_name": "Apple Black Rot (Frogeye Leaf Spot)",
        "pathogen": "Botryosphaeria obtusa",
        "category": "FUNGAL_DISEASE",
        "is_healthy": False,
        "symptoms": [
            "Small purple specks on leaves expanding to 'frogeye' spots with tan centers and purple rings.",
            "Black rotting of fruit beginning as firm brown decay with concentric rings.",
            "Sunken limb cankers with bark cracking and black pycnidia."
        ]
    },
    "Apple___Cedar_apple_rust": {
        "class_id": "Apple___Cedar_apple_rust",
        "crop": "Apple",
        "display_name": "Apple Cedar Apple Rust",
        "pathogen": "Gymnosporangium juniperi-virginianae",
        "category": "FUNGAL_DISEASE",
        "is_healthy": False,
        "symptoms": [
            "Bright yellow-orange spots on upper leaf surface appearing in spring.",
            "Lesions develop reddish borders with small black specks in centers.",
            "Fringed tubular fungal structures (aecia) protrude from leaf undersides in summer."
        ]
    },
    "Apple___healthy": {
        "class_id": "Apple___healthy",
        "crop": "Apple",
        "display_name": "Apple Healthy Leaf",
        "pathogen": None,
        "category": "HEALTHY",
        "is_healthy": True,
        "symptoms": [
            "Lustrous dark green ovate leaves with fine serrations.",
            "Even leaf texture with no corky blemishes, rust pustules, or frogeye spots.",
            "Firm petiole attachment and vigorous shoot development."
        ]
    }
}

def get_class_info(class_id: str) -> Optional[Dict[str, Any]]:
    return CLASS_REGISTRY.get(class_id)

def get_all_classes() -> list:
    return list(CLASS_REGISTRY.keys())
