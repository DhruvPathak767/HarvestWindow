"""
Agronomic Recommendation Registry for Crop Health & Disease Management
Contains verified non-chemical, cultural, hygiene, and monitoring recommendations.
Strictly avoids unverified chemical pesticides, invented dosages, or speculative treatments.
"""
from typing import Dict, Any, Optional

RECOMMENDATIONS_REGISTRY: Dict[str, Dict[str, Any]] = {
    "Potato___Early_blight": {
        "condition_id": "Potato___Early_blight",
        "display_name": "Potato Early Blight Management",
        "symptoms": [
            "Concentric rings ('target-board') on older foliage with yellow chlorotic halos.",
            "Premature defoliation starting from the lower canopy."
        ],
        "immediate_actions": [
            "Scout the field to determine the proportion of plants exhibiting target spots.",
            "Carefully prune and remove heavily infected lower leaves using clean shears.",
            "Dispose of infected plant foliage outside the field; do not compost infected residues."
        ],
        "preventive_measures": [
            "Maintain optimal crop spacing to encourage air circulation and rapid canopy drying.",
            "Implement drip or furrow irrigation rather than overhead sprinklers to minimize leaf wetness.",
            "Follow a 2- to 3-year crop rotation with non-solanaceous crops (e.g. pulses, maize, or cereals)."
        ],
        "hygiene_practices": [
            "Disinfect pruning tools with a 70% alcohol solution between rows.",
            "Avoid entering fields when potato foliage is wet from dew or morning irrigation.",
            "Deep plow crop residues immediately after harvest to accelerate decomposition."
        ],
        "when_to_contact_expert": "Consult your local Krishi Vigyan Kendra (KVK) or State Agricultural University extension officer if lesions rapidly advance above the lower third of the plant canopy within 5 days, or before initiating any chemical fungicide program."
    },
    "Potato___Late_blight": {
        "condition_id": "Potato___Late_blight",
        "display_name": "Potato Late Blight Emergency Advisory",
        "symptoms": [
            "Rapid water-soaked lesions turning dark brown with white downy growth on undersides.",
            "Foliage collapse and rapid vine rot under cool humid conditions."
        ],
        "immediate_actions": [
            "Immediately isolate affected field patches and inspect tuber hills for brownish dry rot.",
            "Destroy and bury severely infected blighted plants away from water channels.",
            "If near harvest, cut and remove potato haulms (vines) 10-14 days prior to harvest to prevent tuber contamination."
        ],
        "preventive_measures": [
            "Plant certified disease-free seed tubers from verified agricultural sources.",
            "Select resistant or tolerant varieties recommended for your region (e.g. Kufri Girdhari, Kufri Himalini).",
            "Ensure proper hill mounding with adequate soil cover (at least 5-7 cm) over developing tubers."
        ],
        "hygiene_practices": [
            "Eliminate cull piles, volunteer potato sprouts, and weed hosts (Solanum nigrum) around the farm.",
            "Do not wash harvested tubers prior to curing and dry storage.",
            "Ensure cold storage maintains proper ventilation (90-95% RH with continuous airflow)."
        ],
        "when_to_contact_expert": "CRITICAL RISK: Contact your district agricultural officer or local university plant pathology clinic immediately. Late blight can destroy an entire field within 7-10 days under favorable weather; do not apply unverified chemical mixtures without official local advisory."
    },
    "Potato___healthy": {
        "condition_id": "Potato___healthy",
        "display_name": "Healthy Potato Maintenance Guidelines",
        "symptoms": ["Uniform green leaves with vigorous growth and no visible lesions."],
        "immediate_actions": [
            "Continue regular scouting twice weekly, focusing on lower canopy leaves and soil moisture.",
            "Record plant height, emergence rate, and canopy closure milestones."
        ],
        "preventive_measures": [
            "Ensure balanced fertilization; avoid excess nitrogen which creates soft succulent tissue vulnerable to blight.",
            "Maintain consistent soil moisture through tuber initiation and bulking stages."
        ],
        "hygiene_practices": [
            "Clean tractor wheels and footwear before moving between different farm blocks.",
            "Keep field borders clear of wild solanaceous weeds."
        ],
        "when_to_contact_expert": "Routine monitoring is sufficient. Contact extension services if sudden leaf curling or discoloration appears following abrupt weather shifts."
    },

    "Tomato___Bacterial_spot": {
        "condition_id": "Tomato___Bacterial_spot",
        "display_name": "Tomato Bacterial Spot Management",
        "symptoms": [
            "Small greasy dark spots with translucent halos on leaves and scabby raised spots on fruit.",
            "Severe premature defoliation under warm wet weather."
        ],
        "immediate_actions": [
            "Halt overhead irrigation immediately; switch to ground-level furrow or drip systems.",
            "Avoid handling, pruning, or tying tomato vines while plants are damp.",
            "Remove and safely burn or bury heavily blighted tomato plants."
        ],
        "preventive_measures": [
            "Use certified pathogen-free seed or hot-water treated seeds (50°C for 25 minutes).",
            "Maintain 2-year crop rotation away from tomatoes, peppers, and eggplants.",
            "Mulch with straw or black plastic to create a physical barrier preventing rain-splash from soil."
        ],
        "hygiene_practices": [
            "Sanitize trellising stakes and cages with bleach or disinfectant before reuse.",
            "Clean hands and garden tools frequently during sucker pruning."
        ],
        "when_to_contact_expert": "Consult a certified agronomist if spotting spreads to more than 15% of the canopy or fruit lesions begin developing, to verify whether registered copper bactericide formulations are appropriate for your district."
    },
    "Tomato___Early_blight": {
        "condition_id": "Tomato___Early_blight",
        "display_name": "Tomato Early Blight Advisory",
        "symptoms": [
            "Concentric ring target lesions on mature leaves with yellow chlorosis and stem cankers."
        ],
        "immediate_actions": [
            "Prune bottom 25-30 cm of foliage to elevate leaves above wet soil and improve airflow.",
            "Collect and dispose of pruned infected leaves outside the field perimeter."
        ],
        "preventive_measures": [
            "Stake or cage plants upright to keep foliage and fruit completely off the soil.",
            "Apply organic mulch (straw or pine needles) to prevent rain splash dispersal of fungal spores.",
            "Rotate crops with non-solanaceous crops for a minimum of 2 years."
        ],
        "hygiene_practices": [
            "Disinfect stakes, trellis wires, and pruning shears after each use.",
            "Clear away all spent tomato vines and roots at end of season."
        ],
        "when_to_contact_expert": "Contact local extension services if target lesions appear on green stems or young fruit calyxes."
    },
    "Tomato___Late_blight": {
        "condition_id": "Tomato___Late_blight",
        "display_name": "Tomato Late Blight Emergency Protocol",
        "symptoms": [
            "Water-soaked dark lesions, white fungal growth under leaves, rapid plant collapse."
        ],
        "immediate_actions": [
            "Inspect neighboring tomato and potato plantings immediately.",
            "Bag and remove infected plants during dry midday hours to avoid spore spread.",
            "Do not harvest green tomatoes from infected vines for storage."
        ],
        "preventive_measures": [
            "Plant resistant tomato cultivars where available.",
            "Ensure maximum spacing between rows to accelerate leaf drying.",
            "Monitor local weather forecasts; prolonged humidity above 90% with 15-22°C temps represents high alert."
        ],
        "hygiene_practices": [
            "Completely destroy volunteer tomato and potato seedlings.",
            "Disinfect farm footwear and implements with quaternary ammonium or 10% bleach."
        ],
        "when_to_contact_expert": "URGENT: Alert your district agricultural extension office immediately. Late blight spreads rapidly on wind currents and requires community-level vigilance."
    },
    "Tomato___Leaf_Mold": {
        "condition_id": "Tomato___Leaf_Mold",
        "display_name": "Tomato Leaf Mold Management",
        "symptoms": [
            "Yellow patches on upper leaf surface with olive-brown velvety mold on lower surface."
        ],
        "immediate_actions": [
            "Open greenhouse ventilation or thin field canopy to reduce relative humidity below 85%.",
            "Prune dense interior suckers to promote internal light penetration."
        ],
        "preventive_measures": [
            "Avoid overhead irrigation; irrigate early in the morning so leaves dry quickly.",
            "Space plants generously in polyhouse or high tunnel cultivation."
        ],
        "hygiene_practices": [
            "Sterilize greenhouse structures and benches thoroughly between cropping cycles."
        ],
        "when_to_contact_expert": "Contact greenhouse management specialists if mold persists despite humidity reduction below 80%."
    },
    "Tomato___Septoria_leaf_spot": {
        "condition_id": "Tomato___Septoria_leaf_spot",
        "display_name": "Tomato Septoria Leaf Spot Advisory",
        "symptoms": [
            "Numerous small circular spots with gray centers, dark borders, and tiny black dots."
        ],
        "immediate_actions": [
            "Strip off infected lower leaves as soon as first spots are detected.",
            "Ensure foliage does not touch bare soil."
        ],
        "preventive_measures": [
            "Mulch heavily around base of plants to suppress spore splash.",
            "Maintain 3-year crop rotation away from nightshade family members."
        ],
        "hygiene_practices": [
            "Keep field free of horsenettle and nightshade weeds which act as alternate hosts."
        ],
        "when_to_contact_expert": "Consult your local KVK if defoliation exceeds 20% of lower canopy."
    },
    "Tomato___Spider_mites Two-spotted_spider_mite": {
        "condition_id": "Tomato___Spider_mites Two-spotted_spider_mite",
        "display_name": "Tomato Spider Mite Integrated Pest Management",
        "symptoms": [
            "Fine stippling / bronzing on leaf surfaces and delicate silken webbing under leaves."
        ],
        "immediate_actions": [
            "Isolate heavily infested plants; prune and bag severely webbed branches.",
            "Wash foliage underside with a strong spray of clean water during early morning to dislodge mites and reduce dust."
        ],
        "preventive_measures": [
            "Avoid broad-spectrum insecticide sprays which eliminate beneficial predatory mites (Phytoseiidae).",
            "Keep farm access roads moist to minimize airborne dust which promotes mite flare-ups.",
            "Consider releasing biological control agents (e.g. Phytoseiulus persimilis) in protected cultivation."
        ],
        "hygiene_practices": [
            "Clear weeds from field borders that serve as overwintering mite reservoirs."
        ],
        "when_to_contact_expert": "Contact an IPM specialist if mite webbing envelopes growing tips or flower clusters."
    },
    "Tomato___Target_Spot": {
        "condition_id": "Tomato___Target_Spot",
        "display_name": "Tomato Target Spot Advisory",
        "symptoms": [
            "Brown circular lesions with concentric rings and sunken circular fruit lesions."
        ],
        "immediate_actions": [
            "Remove diseased leaves and fallen debris from underneath the canopy.",
            "Improve drainage in low-lying sections of the field."
        ],
        "preventive_measures": [
            "Increase plant spacing to accelerate canopy drying.",
            "Avoid high nitrogen applications that promote excessive canopy density."
        ],
        "hygiene_practices": [
            "Remove and destroy crop residues immediately after final harvest."
        ],
        "when_to_contact_expert": "Consult agricultural extension if fruit lesions are observed."
    },
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus": {
        "condition_id": "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
        "display_name": "Tomato Yellow Leaf Curl Virus (TYLCV) Vector Management",
        "symptoms": [
            "Severe upward leaf curling, yellow chlorotic margins, stunted bushy growth."
        ],
        "immediate_actions": [
            "Rogue out and destroy infected viral plants immediately to remove pathogen source.",
            "Place yellow sticky traps (15-20 per acre) to monitor and mass-trap whitefly vectors (Bemisia tabaci)."
        ],
        "preventive_measures": [
            "Use 40-50 mesh insect-proof netting in seedling nurseries to prevent viruliferous whitefly feeding.",
            "Plant TYLCV-resistant hybrids recommended by state universities.",
            "Plant barrier crops (e.g. 2-3 rows of maize or sorghum) around tomato plots to intercept incoming whiteflies."
        ],
        "hygiene_practices": [
            "Eliminate weed hosts (Datura, Parthenium, Abutilon) surrounding the fields.",
            "Maintain a host-free fallow period between tomato seasons."
        ],
        "when_to_contact_expert": "Consult your district entomologist regarding integrated whitefly vector management and regional viral alert statuses."
    },
    "Tomato___Tomato_mosaic_virus": {
        "condition_id": "Tomato___Tomato_mosaic_virus",
        "display_name": "Tomato Mosaic Virus (ToMV) Sanitation Protocol",
        "symptoms": [
            "Mottled light and dark green mosaic pattern on leaves with distorted fern-like growth."
        ],
        "immediate_actions": [
            "Strictly avoid touching healthy plants after contacting symptomatic ones (mechanically transmitted).",
            "Carefully rogue out infected plants, placing them in plastic bags before moving out of the row."
        ],
        "preventive_measures": [
            "Use certified virus-free seeds.",
            "Prohibit tobacco use (smoking, chewing) near tomato plots as tobacco can carry mosaic tobamoviruses.",
            "Wash hands thoroughly with soap and water or skim milk solution before handling transplants."
        ],
        "hygiene_practices": [
            "Soak tools in a 20% non-fat dry milk solution or 10% trisodium phosphate (TSP) between plants."
        ],
        "when_to_contact_expert": "Consult a virology specialist for molecular confirmation if mosaic symptoms appear widely in young seedbeds."
    },
    "Tomato___healthy": {
        "condition_id": "Tomato___healthy",
        "display_name": "Healthy Tomato Crop Care",
        "symptoms": ["Vibrant green foliage, sturdy stem growth, and healthy flowering."],
        "immediate_actions": [
            "Continue scheduled scouting twice weekly.",
            "Ensure regular staking and sucker pruning as vines develop."
        ],
        "preventive_measures": [
            "Maintain balanced N-P-K nutrition with supplemental calcium to prevent blossom end rot.",
            "Ensure consistent soil moisture."
        ],
        "hygiene_practices": ["Keep pruning shears disinfected and pathways weed-free."],
        "when_to_contact_expert": "Routine care. Contact extension if unexpected foliage distortion or wilting occurs."
    },

    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot": {
        "condition_id": "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
        "display_name": "Corn Gray Leaf Spot Advisory",
        "symptoms": ["Rectangular tan lesions constrained between parallel leaf veins."],
        "immediate_actions": [
            "Assess severity relative to the ear leaf; disease on or above ear leaf at silking impacts yield."
        ],
        "preventive_measures": [
            "Select resistant or tolerant maize hybrids for subsequent seasons.",
            "Practice crop rotation with soybeans, pulses, or sunflowers to reduce residue inoculum.",
            "Manage residue through conservation tillage practices that promote decomposition."
        ],
        "hygiene_practices": ["Clean harvesting equipment between fields to avoid spore transfer."],
        "when_to_contact_expert": "Consult agronomy extension if lesions reach the ear leaf prior to dough stage."
    },
    "Corn_(maize)___Common_rust_": {
        "condition_id": "Corn_(maize)___Common_rust_",
        "display_name": "Corn Common Rust Advisory",
        "symptoms": ["Cinnamon-brown powdery pustules scattered on upper and lower leaf surfaces."],
        "immediate_actions": [
            "Monitor pustule density on the upper canopy leaves."
        ],
        "preventive_measures": [
            "Plant rust-resistant hybrids adapted to your agro-climatic zone.",
            "Plant early in the season to avoid peak spore migration windows."
        ],
        "hygiene_practices": ["Eliminate volunteer corn plants between seasons."],
        "when_to_contact_expert": "Consult local experts if rust pustules cover more than 10% of ear-leaf area before grain filling."
    },
    "Corn_(maize)___Northern_Leaf_Blight": {
        "condition_id": "Corn_(maize)___Northern_Leaf_Blight",
        "display_name": "Corn Northern Leaf Blight Protocol",
        "symptoms": ["Long elliptical cigar-shaped grayish-green to tan lesions on foliage."],
        "immediate_actions": [
            "Determine disease progression: lesions below the ear leaf pose lower yield penalty."
        ],
        "preventive_measures": [
            "Deploy multi-genic resistant maize hybrids in areas with chronic blight pressure.",
            "Rotate crops away from corn for at least 1-2 years.",
            "Plow under infected crop residue where soil conservation practices permit."
        ],
        "hygiene_practices": ["Ensure proper residue burial post-harvest."],
        "when_to_contact_expert": "Contact extension officers if large cigar lesions appear on the ear leaf before or during tasseling."
    },
    "Corn_(maize)___healthy": {
        "condition_id": "Corn_(maize)___healthy",
        "display_name": "Healthy Corn Crop Maintenance",
        "symptoms": ["Vigorous arching dark green leaves with clean midribs."],
        "immediate_actions": ["Maintain optimal nitrogen top-dressing at knee-high and tasseling stages."],
        "preventive_measures": ["Ensure adequate moisture during silking and pollination."],
        "hygiene_practices": ["Maintain clean border strips around field."],
        "when_to_contact_expert": "Routine care."
    },

    "Grape___Black_rot": {
        "condition_id": "Grape___Black_rot",
        "display_name": "Grape Black Rot Management",
        "symptoms": ["Reddish-brown leaf spots with black rings, shriveled black mummified berries."],
        "immediate_actions": [
            "Prune out and collect all black mummified berry clusters remaining on vines.",
            "Rake and bury all dropped fruit mummies and infected leaves from the vineyard floor."
        ],
        "preventive_measures": [
            "Canopy management: prune vines and position shoots to maximize sunlight penetration and wind flow.",
            "Orient vineyard rows parallel to prevailing winds where possible."
        ],
        "hygiene_practices": [
            "Sterilize pruning shears between vine rows.",
            "Cultivate beneath the trellis in early spring to bury overwintered mummies."
        ],
        "when_to_contact_expert": "Consult viticulture specialists early in spring before bloom for regional prevention schedules."
    },
    "Grape___Esca_(Black_Measles)": {
        "condition_id": "Grape___Esca_(Black_Measles)",
        "display_name": "Grape Esca (Black Measles) Care Protocol",
        "symptoms": ["Tiger-stripe leaf discoloration, spotted berry skin, trunk fungal wood decay."],
        "immediate_actions": [
            "Mark symptomatic vines with flagging tape during summer for remedial winter pruning.",
            "Avoid severe stress (water stress, excessive crop load) on marked vines."
        ],
        "preventive_measures": [
            "Delay annual pruning until late winter when wound healing is rapid and spore dispersal is lower.",
            "Protect large pruning cuts (>2 cm) immediately with approved pruning wound sealant.",
            "Avoid making flush cuts against the cordon or trunk."
        ],
        "hygiene_practices": [
            "Remove and burn dead arms, trunks, and pruned vine wood; do not leave dead wood near the vineyard."
        ],
        "when_to_contact_expert": "Consult a viticulturist for trunk renewal or remedial surgery techniques on established vines."
    },
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)": {
        "condition_id": "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
        "display_name": "Grape Leaf Blight Management",
        "symptoms": ["Irregular reddish-brown spots with dark margins and velvety spore mats on undersides."],
        "immediate_actions": [
            "Prune congested interior leaves in the fruiting zone to facilitate drying."
        ],
        "preventive_measures": [
            "Maintain open canopy architecture with shoot positioning.",
            "Manage ground cover to prevent high humidity in the vine microclimate."
        ],
        "hygiene_practices": [
            "Destroy fallen vine leaves in autumn to eliminate overwintering fungal structures."
        ],
        "when_to_contact_expert": "Contact local horticulture extension if premature defoliation occurs before veraison."
    },
    "Grape___healthy": {
        "condition_id": "Grape___healthy",
        "display_name": "Healthy Vineyard Care",
        "symptoms": ["Intact palmate green foliage with clean canes and developing clusters."],
        "immediate_actions": ["Maintain shoot positioning and regular cluster thinning."],
        "preventive_measures": ["Balanced potassium and micronutrient management; avoid excess nitrogen."],
        "hygiene_practices": ["Keep vineyard rows cleanly mowed or cultivated."],
        "when_to_contact_expert": "Routine care."
    },

    "Apple___Apple_scab": {
        "condition_id": "Apple___Apple_scab",
        "display_name": "Apple Scab Management Protocol",
        "symptoms": ["Olive-green to velvety brown scabby lesions on leaves and fruit."],
        "immediate_actions": [
            "Inspect newly expanding leaves and flower sepals in spring for first scab spots."
        ],
        "preventive_measures": [
            "Prune trees annually during dormancy to create an open vase or central leader canopy that dries rapidly.",
            "Rake, flail-mow, or shred fallen autumn leaves to accelerate decomposition of overwintering scab perithecia.",
            "Apply 5% agricultural urea spray to fallen autumn foliage to stimulate beneficial leaf-decomposing microbes."
        ],
        "hygiene_practices": [
            "Remove scabby dropped fruit from the orchard floor."
        ],
        "when_to_contact_expert": "Consult your district horticultural officer or KVK orchard advisor during green-tip through petal-fall stages."
    },
    "Apple___Black_rot": {
        "condition_id": "Apple___Black_rot",
        "display_name": "Apple Black Rot (Frogeye) Protocol",
        "symptoms": ["Frogeye circular leaf spots with purple rings; firm black rotting fruit."],
        "immediate_actions": [
            "Prune out dead wood, cankered branches, and fire-blight strikes during dormant pruning.",
            "Remove all mummified apples hanging in the tree canopy or lying on the ground."
        ],
        "preventive_measures": [
            "Prevent bark injury and sunscald by painting trunks with white latex paint if needed.",
            "Maintain tree vigor through balanced fertilization and soil moisture."
        ],
        "hygiene_practices": [
            "Burn or chip all pruned orchard brush away from the block."
        ],
        "when_to_contact_expert": "Contact orchard health specialists if trunk cankers girdling limbs are found."
    },
    "Apple___Cedar_apple_rust": {
        "condition_id": "Apple___Cedar_apple_rust",
        "display_name": "Apple Cedar Apple Rust Advisory",
        "symptoms": ["Bright yellow-orange spots on leaves with tubular fungal horns on undersides."],
        "immediate_actions": [
            "Identify and inspect nearby eastern red cedar or juniper trees for gelatinous orange rust galls."
        ],
        "preventive_measures": [
            "Remove or prune galls from cedar/juniper trees within 200-300 meters of the apple orchard where feasible.",
            "Plant rust-resistant apple cultivars (e.g. Liberty, Enterprise, Freedom) in high-pressure regions."
        ],
        "hygiene_practices": [
            "Scout wild juniper bushes along fence rows and windbreaks in early spring."
        ],
        "when_to_contact_expert": "Consult orchard extension if rust spots appear on fruit calyxes or young twigs."
    },
    "Apple___healthy": {
        "condition_id": "Apple___healthy",
        "display_name": "Healthy Apple Orchard Maintenance",
        "symptoms": ["Lustrous dark green leaves with uniform growth and clean fruit."],
        "immediate_actions": ["Maintain regular irrigation and codling moth monitoring traps."],
        "preventive_measures": ["Annual balanced soil testing and dormant oil sprays for scale management."],
        "hygiene_practices": ["Keep under-tree grass mowed."],
        "when_to_contact_expert": "Routine care."
    }
}

def get_recommendation_for_class(class_id: str) -> Optional[Dict[str, Any]]:
    return RECOMMENDATIONS_REGISTRY.get(class_id)
