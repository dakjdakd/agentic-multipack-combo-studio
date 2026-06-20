import { Tag } from 'lucide-react';
import { Product, AmazonListing, TaskJob, TraceGroup, ReviewItem, BudgetConfig, CostBreakdown, SettingsState, EvaluationHarness } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    sku: "MUG-STEEL-01",
    title: "AeroTherm Matte Black Stainless Steel Travel Mug - 16oz Vacuum Insulated Tumbler",
    brand: "AeroTherm",
    category: "Kitchen & Dining > Drinkware > Tumblers",
    color: "Matte Black",
    material: "18/8 Double-Wall Stainless Steel",
    dimensions: { length: 3.2, width: 3.2, height: 6.8, unit: "in" },
    weight: { value: 0.75, unit: "lbs" },
    image: "https://images.unsplash.com/photo-1577937927133-66ef06acdf18?w=400&auto=format&fit=crop&q=80",
    normalizedJson: JSON.stringify({
      product_name: "AeroTherm Vacuum Insulated Travel Mug",
      sku_id: "MUG-STEEL-01",
      brand: "AeroTherm",
      core_specs: {
        capacity_oz: 16,
        insulation_type: "double-wall vacuum",
        hot_hours_retention: 12,
        cold_hours_retention: 24,
        leakproof_mechanism: "leak-proof autoshut slider lid"
      },
      materials: {
         body: "304 kitchen-grade stainless steel",
         paint: "anti-condensation powder coat matte",
         gasket: "food-safe silicone"
      }
    }, null, 2),
    rawFields: {
      LEGACY_SKU: "MUG_SL_16_BLK_V2",
      VOL_LITRES: "0.47L",
      PAINT_TYPE: "POWDER_COAT_COBALT_BLACK_REINFORCED",
      LEAK_PROOF_VAL: "TRUE_SILICONE_GASKET",
      UNIT_QTY: 1,
      UPC_CODE: "847190028120",
      ORIGIN: "CN_ZHEJIANG",
      EST_SHIPPING_WEIGHT_KG: "0.41"
    },
    missingFields: [
      "BPA Free certification body name missing",
      "Dishwasher safe qualification standard missing"
    ],
    unitCount: 1
  },
  {
    sku: "STAND-ALUM-09",
    title: "ErgoLift Aluminum Laptop Stand - 6-Angle Adjustable Portable Notebook Riser",
    brand: "ErgoLift",
    category: "Office Products > Computer Accessories > Laptop Stands",
    color: "Space Gray",
    material: "6000-Series Aerospace Grade Aluminum",
    dimensions: { length: 9.8, width: 8.5, height: 1.2, unit: "in" },
    weight: { value: 1.4, unit: "lbs" },
    image: "https://images.unsplash.com/photo-1527443154391-507e9dc6c5cc?w=400&auto=format&fit=crop&q=80",
    normalizedJson: JSON.stringify({
      product_name: "ErgoLift Adjustable Laptop Stand",
      sku_id: "STAND-ALUM-09",
      brand: "ErgoLift",
      ergonomic_factors: {
        adjustable_angles: [15, 20, 25, 30, 35, 40],
        max_lift_height_in: 5.5,
        ventilation_structure: "open-back pass-through airflow cutout"
      },
      durability: {
        material: "extruded CNC anodized aluminum",
        silicone_anti_slip_pads: 8,
        max_load_capacity_lbs: 40
      }
    }, null, 2),
    rawFields: {
      LEGACY_SKU: "STAND_IND_60_SLVR",
      ANODIZATION_GRADE: "AA10_ARCHITECTURAL",
      MAX_LOAD_KG: "18.2",
      PAD_MATERIAL: "NEOPRENE_RUBBER_HYBRID_GREY",
      UNIT_QTY: 1,
      ASSEMBLY_REQUIRED: "FALSE",
      MANUAL_INCLUDED: "TRUE"
    },
    missingFields: [
      "No specific device compatibility list declared (MacBook / Dell size restriction details missing)",
      "Anodized finish durability rating (ASTM report) is not attached"
    ],
    unitCount: 1
  },
  {
    sku: "CHARGER-GAN-65",
    title: "Veloce 65W GaN Charger - Ultra-Compact Dual USB-C Fast Charger Block",
    brand: "Veloce",
    category: "Cell Phones & Accessories > Chargers & Power Adapters",
    color: "Arctic White",
    material: "Fireproof Polycarbonate (V0 Rating)",
    dimensions: { length: 2.1, width: 1.5, height: 1.5, unit: "in" },
    weight: { value: 0.32, unit: "lbs" },
    image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&auto=format&fit=crop&q=80",
    normalizedJson: JSON.stringify({
      product_name: "Veloce 65W GaN Dual-Port Wall Charger",
      sku_id: "CHARGER-GAN-65",
      brand: "Veloce",
      power_profile: {
        total_output_watts: 65,
        technology: "Gallium Nitride (GaN III) Semiconductor",
        ports: [
          { label: "USB-C1", max_wattage: 65, protocol: "PD 3.0 / PPS" },
          { label: "USB-C2", max_wattage: 20, protocol: "PD 3.0" },
          { label: "Combined Output", usb_c1_wattage: 45, usb_c2_wattage: 20 }
        ]
      },
      safeties: {
        overcurrent_protection: "True",
        thermal_throttle_threshold_celsius: 85
      }
    }, null, 2),
    rawFields: {
      LEGACY_SKU: "CHGR_GAN_65W_WHT",
      CHIP_MAKER: "NAVIP_NV6115_INTEGRATED",
      SAFETY_CERTIFICATIONS: "UL_FCC_CE_ROHS",
      PLUG_MATE: "USA_FOLDING_PRONG_TYPE_A",
      EFFICIENCY_LEVEL: "DOE_VI",
      STIPP_MARK: "V_0_SELF_EXTINGUISH_PLASTIC"
    },
    missingFields: [
      "Missing detailed PPS voltage step intervals (required for high-speed Samsung Super Fast Charging declaration)",
      "E-Mark safety cable bundling recommendation is unverified"
    ],
    unitCount: 1
  },
  {
    sku: "MAT-ECO-02",
    title: "ZenFlow 6mm Eco-Friendly TPE Gym Yoga Mat - Non-Slip Dual Texture Alignment Lines",
    brand: "ZenFlow",
    category: "Sports & Outdoors > Exercise & Fitness > Yoga Mats",
    color: "Forest Green",
    material: "Thermoplastic Elastomer (TPE)",
    dimensions: { length: 72, width: 24, height: 0.24, unit: "in" },
    weight: { value: 1.9, unit: "lbs" },
    image: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&auto=format&fit=crop&q=80",
    normalizedJson: JSON.stringify({
      product_name: "ZenFlow Eco-Friendly TPE Yoga Mat",
      sku_id: "MAT-ECO-02",
      brand: "ZenFlow",
      comfort_specs: {
        thickness_mm: 6,
        texture: "dual-sided ribbed & non-slip geometric texture",
        body_alignment_system: "laser engraved laser symmetry guidelines"
      },
      eco_compliance: {
        latex_free: true,
        pvc_free: true,
        phthalates_free: true,
        biodegradability: "partially biodegradable under high humidity compositing"
      }
    }, null, 2),
    rawFields: {
      LEGACY_SKU: "YOGA_TPE_6MM_GRN",
      CELL_STRUCTURE: "CLOSED_CELL_ANTI_MOISTURE",
      TENSILITY_PSI: "45_HIGH_ELASTIC_GRADE",
      STRAP_INCLUDED: "TRUE_BLACK_POLYPROPYLENE_CORD",
      TOXICITY_REPORTS: "REACH_SUBSTANCE_SVG_PASS_EXEMPT"
    },
    missingFields: [
      "Laser print guideline durability testing report (scratch/sweat resistance) is missing",
      "Instruction booklet recycling symbol missing"
    ],
    unitCount: 1
  }
];

export const INITIAL_LISTINGS: Record<string, AmazonListing> = {
  "MUG-STEEL-01": {
    sku: "MUG-STEEL-01",
    title: "AeroTherm 16oz Vacuum Insulated Coffee Mug - Matte Black Double Wall Stainless Steel Travel Tumbler with Spill-Proof Autoshut Slider Lid, Keeps Drinks Hot 12 Hours, Cold 24 Hours",
    bullets: [
      "12H HOT / 24H COLD INSULATION: Proprietary double-wall copper-infused vacuum technology maintains precise thermal integrity, preventing outside temperatures from affecting drink variables.",
      "18/8 FOOD-GRADE STAINLESS STEEL: Crafted from uncompromised 304 food-grade stainless steel which does not harbor structural oxidization, rust, or transfer stubborn metallic aftertastes.",
      "SPILL-PROOF AUTOSHUT SLIDER: Optimized high-tension tension slider secures a watertight silicone tight barrier. Opens with one finger for quick, seamless access during morning transit.",
      "MATTE POWDER-COATED OUTERS: Hard-wearing proprietary dry-coating supports a secure slip-free surface. Resists chips, scratches, and sweat-induced relative slippage.",
      "CAR-CUP DOCK COMPATIBLE: Elegant tapered narrow profile base (2.8 inches diameter) easily glides into standard automotive slot channels. Designed for universal commuter environments."
    ],
    description: "The AeroTherm Professional Vacuum Insulated Mug represents the frontier of advanced thermal dynamics. Formulated with laboratory-tested dual wall vacuum engineering, it encapsulates a highly pressurized copper-plated barrier that blocks radiative heat paths completely. Useful for office, commute, or outdoor routines, its heavy-duty 18/8 stainless steel core helps your standard espresso shot or ice-cold beverage retains pristine organic purity without metallic leeching. Enhanced with a high-resistance powder-coat exterior, it maintains a comfortable, ultra-dry texture that protects against manual slips and impact scratches.",
    searchTerms: "travel mug vacuum insulated tumbler leakproof travel coffee cup stainless steel bottle dual wall black mug camper tea flask commuting cup",
    aPlusModules: [
      {
        id: "ap-1",
        type: "header-text",
        title: "AERO-THERM ENGINEERING DELIVERS ABSOLUTE RETENTION",
        body: "Standard mugs rely on standard plastic-shielded jackets. AeroTherm applies deep vacuum evacuations, drawing 99.9% of gaseous content out of the dual-wall interval. This blocks conductive heat travel immediately, preserving exact taste properties for up to 24 hours of standard use."
      },
      {
        id: "ap-2",
        type: "single-image-sidebar",
        title: "304 Culinary Grade Outer Shielding",
        body: "Every grain of AeroTherm steel is cold-pressed at specialized tooling labs. The 18/8 alloy offers peerless resistance to organic acids and volatile thermal cycles without showing micro-fractures, ensuring zero taste transfer across coffee, tea, and ice drinks.",
        imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop"
      }
    ],
    images: {
      main: "https://images.unsplash.com/photo-1577937927133-66ef06acdf18?w=800&auto=format&fit=crop",
      lifestyle: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop",
      infographic: "https://images.unsplash.com/photo-1517256064527-09c53b2d0bc6?w=800&auto=format&fit=crop",
      aPlus: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop"
    },
    compliancePassed: true,
    score: 96
  },
  "STAND-ALUM-09": {
    sku: "STAND-ALUM-09",
    title: "ErgoLift Premium Multi-Angle Aluminum Laptop Stand - Portable Ergonomic Notebook Riser with Airflow Heat Cutouts, Anti-Slip Protective Pads, Fully Foldable Structure for Desk & Travel",
    bullets: [
      "6 SCIENTIFIC ERGONOMIC STAGINGS: Engineered positions raise laptops from 15 to 40 degrees, supporting an ergonomic eye-level alignment that relieves neck fatigue and poor cervical posture.",
      "MILITARY GRADE ANODIZED ALUMINUM: Specially processed 6000 aerospace-grade aluminum alloy ensures massive static structural security. Rated for weights up to 40 lbs without flex.",
      "OPEN-CORE PASSIVE VENTILATION: Unique open grid layout bypasses generic passive heat build-up. Accelerates warm air dispersal from high-load cooling setups seamlessly.",
      "FULL BODY SILICONE BUFFER pads: 8 strategical soft rubber surfaces secure your precious laptop and prevent desktop scratches, shielding devices from direct aluminum contact.",
      "PORTABLE CARRY FOLDABLE FORM: Slim profile folds down flat to 0.4 inches width within seconds. Slip it directly into your backpack sleeve for business commutes and study."
    ],
    description: "The ErgoLift Pro Ergonomic Laptop Stand is designed to stabilize high-performance workstation computers. Engineered with a military-grade CNC anodized finish, this ultra-stable structural riser helps creative professionals and software engineers avoid the ergonomic strain of curved postures. Built-in thermal heat cutouts maximize natural convection and structural cooling by maximizing the flow of ambient air directly surrounding laptop exhaust fans. Non-slip silicone protective pads secure expensive gear while ensuring the polished metallic casing remains completely immune to cosmetic abrasions.",
    searchTerms: "laptop stand portable riser aluminum ergonomic computer base desk laptop tray adjustable MacBook holder foldable desk notebook riser xps mount",
    aPlusModules: [
      {
        id: "ap-3",
        type: "header-text",
        title: "ERGOLIFT: ELIMINATE CERVICAL COGNITIVE FATIGUE",
        body: "Chronic hunching during long work sessions reduces productivity and induces chronic spinal load. ErgoLift immediately brings screen height up into natural ocular alignment, relaxing the neck muscle fibers by up to 34%."
      }
    ],
    images: {
      main: "https://images.unsplash.com/photo-1527443154391-507e9dc6c5cc?w=800&auto=format&fit=crop",
      lifestyle: "https://images.unsplash.com/photo-1616440347437-b1c73416efc2?w=800&auto=format&fit=crop",
      infographic: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop",
      aPlus: "https://images.unsplash.com/photo-1616440347437-b1c73416efc2?w=600&auto=format&fit=crop"
    },
    compliancePassed: true,
    score: 94
  }
};

export const INITIAL_JOBS: TaskJob[] = [
  { jobId: "JOB-40112", sku: "MUG-STEEL-01", workflowType: "listing", status: "completed", cost: 0.18, time: "2026-06-20 07:12:00" },
  { jobId: "JOB-40113", sku: "STAND-ALUM-09", workflowType: "listing", status: "completed", cost: 0.22, time: "2026-06-20 07:25:32" },
  { jobId: "JOB-40114", sku: "CHARGER-GAN-65", workflowType: "multipack", status: "pending", cost: 0.05, time: "2026-06-20 08:31:10" },
  { jobId: "JOB-40115", sku: "MAT-ECO-02", workflowType: "combo", status: "failed", cost: 0.12, time: "2026-06-20 08:04:41" }
];

export const INITIAL_TRACES: Record<string, TraceGroup> = {
  "MUG-STEEL-01": {
    jobId: "JOB-40112",
    sku: "MUG-STEEL-01",
    workflowType: "listing",
    timestamp: "2026-06-20 07:12:00",
    steps: [
      {
        agentName: "Supervisor",
        inputSummary: "Target SKU: MUG-STEEL-01. Mode: Full Listing Copy & Image validation request.",
        toolCalls: [
          { name: "read_sku_specs_db", input: JSON.stringify({ sku: "MUG-STEEL-01" }), durationMs: 420 },
          { name: "dispatch_worker_agents", input: JSON.stringify({ dispatch_list: ["Research", "Copy", "Image", "Critic", "Compliance"] }), durationMs: 310 }
        ],
        outputArtifact: "Supervisor initiated pipeline. Current token allocation: 12,000 max. Handing data structure token sequence to Research Specialist.",
        latencyMs: 780,
        inputTokens: 1204,
        outputTokens: 345,
        estimatedCostUsd: 0.015,
        promptSnippet: "SYSTEM: You are the Lead Coordinator (Supervisor Agent). Oversee execution files... USER: Generate optimized listing for AeroTherm Mug (MUG-STEEL-01)."
      },
      {
        agentName: "Research",
        inputSummary: "Normalized spec tree for Travel Mug SKUs + Competitor listings search input.",
        toolCalls: [
          { name: "web_search_amazon_drinkware", input: JSON.stringify({ query: "insulated travel mug 16oz product specs" }), durationMs: 1240 },
          { name: "parse_material_safety_limits", input: JSON.stringify({ compound: "304 stainless steel contact temperature limits" }), durationMs: 340 }
        ],
        outputArtifact: "Synthesized core selling points: 1) Thermal durability threshold is vacuum-sealed copper cladding 2) Commuter vehicle cup holder standards limit base diameter to 2.85 inches 3) Lid latch requires high-tension food-grade silicone standard warnings.",
        latencyMs: 2110,
        inputTokens: 2540,
        outputTokens: 890,
        estimatedCostUsd: 0.041,
        promptSnippet: "SYSTEM: Analyze technical materials data, consumer specifications, and structural limits... Identify essential benefits of vacuum camping equipment."
      },
      {
        agentName: "Copy",
        inputSummary: "Research points on copper thermal barriers, base sizing, Autoshut slider lid specs.",
        toolCalls: [
          { name: "generate_listing_copy_llm", input: JSON.stringify({ prompt: "Write copy emphasizing 12H HOT / 24H COLD, no metallic taste, Autoshut slider lid" }), durationMs: 2500 }
        ],
        outputArtifact: "Generated Draft Copy (1 Title, 5 Bullets, 1 Premium Product Description, 1 Search Terms set, 2 A+ modules structure). Applied dynamic word count compliance constraint limits.",
        latencyMs: 2500,
        inputTokens: 4120,
        outputTokens: 1800,
        estimatedCostUsd: 0.062,
        promptSnippet: "SYSTEM: You are an expert Amazon Copywriter. Bypasses robotic phrases like 'revolutionary', 'game-changing'. Use high-contrast technical details, precise metric listings."
      },
      {
        agentName: "Image",
        inputSummary: "Draft copy + item properties for Matte Black powder coating.",
        toolCalls: [
          { name: "prompt_image_generator", input: JSON.stringify({ prompt: "Premium studio photograph of AeroTherm travel mug, matte black, clean soft shadows" }), durationMs: 3800 }
        ],
        outputArtifact: "Successfully generated 4 demo visual drafts (Main Studio Close-Up, Lifestyle Office Mug, Technical thermal infographic, and A+ structural module spacer banner). References saved to state.",
        latencyMs: 3800,
        inputTokens: 1510,
        outputTokens: 450,
        estimatedCostUsd: 0.024,
        promptSnippet: "SYSTEM: Create high-fidelity visual prompts representing a tangible commercial product photo sequence. Focus on material light response, premium lighting contrast ratios."
      },
      {
        agentName: "Critic",
        inputSummary: "Full Draft Copy, Search terms, and visual layouts.",
        toolCalls: [
          { name: "evaluate_seo_density", input: JSON.stringify({ search_terms: "travel mug insulated cup tumbler" }), durationMs: 470 }
        ],
        outputArtifact: "Critique feedback: 1) Good keyword coverage. 2) Replaced marketing jargon in Bullet #1 with actual physical metric 'Maintain precise thermal integrity via vacuum-sealed copper core' for exactness. 3) Checked physical color match (Black vs Image Black). Passed.",
        latencyMs: 1050,
        inputTokens: 5410,
        outputTokens: 620,
        estimatedCostUsd: 0.028,
        promptSnippet: "SYSTEM: Act as a ruthless Senior Listing Auditor. Screen copy for generic marketing hyperbole. Ensure exact physical characteristics (color, components) align with product JSON."
      },
      {
        agentName: "Compliance",
        inputSummary: "Revised listings + image tags feedback.",
        toolCalls: [
          { name: "validate_fda_claims", input: JSON.stringify({ text: "304 food-grade uncompromised steel core" }), durationMs: 290 },
          { name: "validate_trademark_violations", input: JSON.stringify({ text: "AeroTherm 16oz mug" }), durationMs: 150 }
        ],
        outputArtifact: "Compliance Report: No FTC/FDA health claim violations (no explicit therapeutic claim). No trademark violations. Byte metric for backend search terms calculated (172 bytes, limits under 250). Final approval status: PASSED.",
        latencyMs: 980,
        inputTokens: 3820,
        outputTokens: 480,
        estimatedCostUsd: 0.010,
        promptSnippet: "SYSTEM: Scan listing outputs for FDA health treatments, absolute warranty claims, competitor brand trademark names. Ensure character limits fit Amazon seller regulations."
      }
    ]
  }
};

export const INITIAL_REVIEWS: ReviewItem[] = [
  {
    id: "REV-901",
    sku: "CHARGER-GAN-65",
    workflowType: "multipack",
    requestDate: "2026-06-20 08:31:10",
    originalListing: {
      title: "Veloce 65W GaN Wall Charger - Classic fast adapter single pack",
      bullets: [
        "FAST CHARGE: 65 watt total power.",
        "PORTABLE: Foldable USA standard wall adapter.",
        "UNIVERSAL: Safe USB plug block."
      ],
      description: "Fast charging power brick with GaN tech inside."
    },
    generatedListing: {
      sku: "CHARGER-GAN-65",
      title: "Veloce [3-Pack] 65W GaN Charger - Ultra-Compact Dual Port USB-C Fast Wall Charger Block, Premium Gallium Nitride Charging Plugs - Value Multipack (Arctic White)",
      bullets: [
        "3-PACK HIGH-DENSITY MULTIPACK: Secure reliable fast power in your main office, home bedroom, and travel gear simultaneously inside one cost-effective bulk pack bundle.",
        "65W TOTAL GAN DYNAMIC DELIVERY: Channels top-tier Gallium Nitride structural density to supply ultra-fast MacBook, iPad, and high-wattage device power safely.",
        "DUAL SMART-PORTS ALLOCATION: Charge multiple hardware units concurrently. Intelligent circuitry safely shifts wattage rates dynamically to match devices.",
        "UP TO 40% TEMPERATURE DUMP: GaN III semiconductor layout dramatically reduces structural heating, keeping wall plugs incredibly stable under intense heavy-duty currents.",
        "TRAVEL CONVENIENT FLIPPABLE PRONG: Streamlined USA folding terminal pins avoid scratching surrounding carry gears, maintaining minimal footprint layout."
      ],
      description: "Our Veloce 65W multi-pack adapter delivers three high-grade Gallium Nitride wall chargers. Programmed with thermal security tracking, it actively keeps your electronics protected. Ideal for travel, daily commutes, households, or office groups.",
      searchTerms: "charger multipack GaN charger 65w usb-c wall charger block cell phone adapter fast charger block compact power hub fold plug laptop travel adapter value pack",
      aPlusModules: [
        {
          id: "ap-gan-multi",
          type: "three-column",
          title: "THREE-FOLD CHARGING UTILITY STRATEGY",
          body: "Why carry adapters from room to room? This 3-pack distributes premium 65W speed across your major physical hubs. Arctic white fireproof composite shell integrates naturally into modern home aesthetics."
        }
      ],
      images: {
        main: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop",
        lifestyle: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&auto=format&fit=crop",
        infographic: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop",
        aPlus: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&auto=format&fit=crop"
      },
      compliancePassed: true,
      score: 95
    },
    complianceReport: [
      { id: "c-1", rule: "FDA/FTC Health Claim scan", status: "passed", observedValue: "No physiological cure claims noticed", expectedLimit: "0 medical keywords" },
      { id: "c-2", rule: "Byte counter for search terms", status: "passed", observedValue: "204 bytes", expectedLimit: "max 250 bytes" },
      { id: "c-3", rule: "No rival trademark brands", status: "passed", observedValue: "0 competitor names flag", expectedLimit: "no TM references" }
    ],
    physicalConsistency: {
      expectedColor: "Arctic White",
      observedColorInImage: "Arctic White Plugs with gray interface markings",
      expectedMaterial: "Fireproof Polycarbonate (V0)",
      observedMaterialInImage: "High-density polymers with matte impact finish",
      expectedUnitCount: 3,
      observedUnitCountInImage: 3,
      imageCriticVerdict: "Physical consistency report completed. Grid contains exactly three identical custom chargers matching the Arctic White SKU profile. No alignment deviation detected."
    },
    status: "pending"
  },
  {
    id: "REV-902",
    sku: "MAT-ECO-02",
    workflowType: "combo",
    requestDate: "2026-06-20 08:04:41",
    originalListing: {
      title: "ZenFlow 6mm Gym Yoga Mat - Basic single mat in plastic",
      bullets: [
        "ECO FRIENDLY: TPE non-toxic foam material.",
        "TEXTURE: Good grasp properties."
      ],
      description: "Basic exercise sheet mat."
    },
    generatedListing: {
      sku: "MAT-ECO-02",
      title: "ZenFlow [Duo-Shield Combo] Eco-Friendly 6mm TPE Yoga Mat & Stretch Straps - Dual Texture Anti-Moisture Fitness Mat with Laser-Engraved Posture Alignment Lines (Forest Green)",
      bullets: [
        "DUO-SHIELD COMBO PACK: Premium workout bundle integrates our 6mm TPE physical mat together with an adjustable high-tensility black carrying & stretch physical strap.",
        "LASER-ETCHED ALIGNMENT GRIDS: Precise laser alignments assist with accurate postures, preventing orthopedic strain during yoga, pilates, or core bodyweight sessions.",
        "DUAL-SIDED SLIP PREVENTION: Ribbed top texture grabs hands safely, while structural suction geometric base helps the mat stay positioned on wood, concrete, and rug.",
        "NATURALLY ECO-COMPLIANT MATERIAL: Formulated with organic Thermoplastic Elastomer (TPE) composites that completely exclude Latex, PVC, and Heavy Metal compounds.",
        "CLOSED-CELL ANTI-SWEAT LAYER: Water-resistant block structure avoids moisture penetration, keeping the gym surface free from heavy sweat accumulations and odors."
      ],
      description: "Enjoy advanced gym exercises with the ZenFlow Duo-Shield Combo. Featuring custom-engraved alignment curves and a sturdy stretch carrying binding, this high-durability kit keeps athletes aligned, safe, and hygienic across all levels of exercise routines.",
      searchTerms: "yoga mat combo with strap exercise mat TPE eco-friendly fitness mat non slip alignment mat forest green floor mat carrying rope gym set",
      aPlusModules: [
        {
          id: "ap-combo-1",
          type: "single-image-sidebar",
          title: "COMPLEMENTARY GYM BUNDLING EXPERIENCE",
          body: "Our custom combination takes the guesswork out of yoga. Outfitted with high-tensility strapping and durable alignment markings, you enjoy immediate, portable studio convenience in any environment."
        }
      ],
      images: {
        main: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&auto=format&fit=crop",
        lifestyle: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&auto=format&fit=crop",
        infographic: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&auto=format&fit=crop",
        aPlus: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&auto=format&fit=crop"
      },
      compliancePassed: false,
      score: 82
    },
    complianceReport: [
      { id: "c-4", rule: "FDA/FTC No Medical Claims scan", status: "passed", observedValue: "No therapeutic cure claims noted", expectedLimit: "0 medical keywords" },
      { id: "c-5", rule: "Byte counter for search terms", status: "warning", observedValue: "248 bytes", expectedLimit: "max 250 bytes (close to threshold)" },
      { id: "c-6", rule: "Word counts checklist", status: "failed", observedValue: "Title exceeds 150-char local marketplace limit", expectedLimit: "max 150 characters (Actual: 162)" }
    ],
    physicalConsistency: {
      expectedColor: "Forest Green",
      observedColorInImage: "Forest Green Mat with complementary styling elements",
      expectedMaterial: "Thermoplastic Elastomer (TPE) + Polypropylene Strap",
      observedMaterialInImage: "Micro-porous flexible polymer foam, thick woven textile strand",
      expectedUnitCount: 2,
      observedUnitCountInImage: 1,
      imageCriticVerdict: "Physical inconsistency warning. The generated lifestyle image failed to show the carrying black strap bundle. Image shows only the Green Mat. Recommend running Image Agent Regenerate."
    },
    status: "revision-requested",
    revisionNotes: "Title takes too many characters (162 vs target 150 limit). Image agent must include the carrying black polypropylene strap to remain consistent with expected components."
  }
];

export const INITIAL_BUDGET: BudgetConfig = {
  targetRmb: 1700.00,
  spentRmb: 284.50,
  remainingRmb: 1415.50,
  forecastRmb: 610.20
};

export const INITIAL_COSTS_BREAKDOWN: CostBreakdown = {
  llmInputTokens: 954000,
  llmOutputTokens: 382000,
  imageGenerationsCount: 112,
  webSearchesCount: 48,
  retriesCount: 6,
  cachedSavingsRmb: 45.80
};

export const INITIAL_EVALUATION: EvaluationHarness = {
  selectedSkus: ["MUG-STEEL-01", "STAND-ALUM-09", "CHARGER-GAN-65"],
  complianceScore: 92.5,
  physicalConsistencyScore: 89.0,
  listingQualityScore: 94.2,
  overallScore: 91.9
};

export const INITIAL_SETTINGS: SettingsState = {
  dbConfigured: true,
  llmApiConfigured: true,
  imageApiConfigured: true,
  searchApiConfigured: true,
  demoMode: true,
  llmProvider: "Google Gemini 2.5 Flash (Production Server)",
  imageProvider: "Imagen 3 (Via Cloud Vertex Platform)",
  searchProvider: "Google Search Grounding Engine"
};


