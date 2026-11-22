/**
 * Farmer wording for the farm wizard (My farm / onboarding) and the full Map screen,
 * in English, French and Arabic. Kept apart from translations.ts so those screens can be
 * translated without growing the main string table.
 * REVIEW: native Arabic / French speaker review still recommended before launch.
 */
import type { AppLanguage } from "./translations";

export interface FarmUiStrings {
  // Wizard — step 1 (where)
  searchVillage: string;
  farmName: string;
  sizeHectares: string;
  regionGovernorate: string;
  otherRegion: string;
  tapMapToSetSpot: string;
  movePinOnMap: string;
  tapCornersOnMap: string;
  drawLandShape: string;
  farmCenterPin: string;
  yourFarmAbout: string; // "{area}" is the size with its unit
  optional: string;
  typeGpsOrCountry: string;
  latitude: string;
  longitude: string;
  country: string;
  later: string;
  cancel: string;
  nextStep: string; // "{step}"
  back: string;
  gpsFinding: string;
  gpsUnavailable: string;
  gpsFound: string;
  gpsFailed: string;
  // Wizard — step 2 (crops)
  whatDoYouGrow: string;
  findMainCrop: string;
  cropSearchPlaceholder: string;
  droughtLow: string;
  droughtModerate: string;
  droughtHigh: string;
  plantingStartMonth: string;
  soilFeel: string;
  soilSandy: string;
  soilSandyLoam: string;
  soilLoam: string;
  soilSiltLoam: string;
  soilClayLoam: string;
  soilClay: string;
  // Wizard — step 3 (water)
  waterPumpPanels: string;
  weFillSafeValues: string; // "{estimate}"
  mainWaterSource: string;
  waterSources: Record<string, string>;
  howYouWater: string;
  wateringMethods: Record<string, string>;
  haveAPump: string;
  yes: string;
  noOrPlanning: string;
  pumpPerHour: string;
  hoursPerDay: string;
  haveSolar: string;
  solarYes: string;
  solarPlanning: string;
  solarNo: string;
  solarNotSure: string;
  panelCount: string;
  advancedSummary: string;
  wellDepth: string;
  liftHeight: string;
  pipeLength: string;
  pipeSize: string;
  pumpEfficiency: string;
  panelTilt: string;
  panelDirection: string;
  southHint: string;
  systemLoss: string;
  // Map screen
  fullMap: string;
  mapTitle: string;
  mapSubtitle: string;
  waterNearMe: string;
  rainRadar: string;
  refreshFarmData: string;
  whatToMark: string;
  pinRoles: Record<string, string>;
  addAnotherFarm: string;
  addFarmHint: string;
  farmNamePlaceholder: string;
  addFarmHere: string;
  chosenSpot: string; // "{lat}", "{lon}"
  yourLand: string;
  landSize: string;
  edgeLength: string;
  heightAboveSea: string;
  nearestWater: string;
  fromYourField: string; // "{dist}"
  heightEasy: string;
  heightLower: string; // "{m}"
  heightHigher: string; // "{m}"
  checkMyWater: string;
  farmReport: string;
  marksOnFarm: string; // "{n}", "{farm}"
  marksHint: string;
  noMarksYet: string;
  removeMark: string; // "{label}"
  // Map component
  toolMove: string;
  toolMark: string;
  toolDraw: string;
  toolMyLocation: string;
  layerStreet: string;
  layerSatellite: string;
  layerHills: string;
  drawingCorners: string; // "{n}"
  undo: string;
  finish: string;
  removeFieldEdges: string;
  waterPlacesOnMap: string; // "{n}"
  popupDistance: string; // "{m}"
  popupNotChecked: string;
  mapFallbackHint: string;
}

const EN: FarmUiStrings = {
  searchVillage: "Search village",
  farmName: "Farm name",
  sizeHectares: "Size (hectares)",
  regionGovernorate: "Region",
  otherRegion: "Other region",
  tapMapToSetSpot: "Tap the map to set the spot…",
  movePinOnMap: "Move the pin on the map",
  tapCornersOnMap: "Tap the corners on the map…",
  drawLandShape: "Draw my field (optional)",
  farmCenterPin: "Farm center",
  yourFarmAbout: "Your farm: about {area}. Drag the corners if the shape is wrong.",
  optional: "(Optional)",
  typeGpsOrCountry: "type GPS coordinates or country",
  latitude: "Latitude",
  longitude: "Longitude",
  country: "Country",
  later: "Later",
  cancel: "Cancel",
  nextStep: "Next: {step}",
  back: "Back",
  gpsFinding: "Finding your location…",
  gpsUnavailable: "Location is not available on this device. Search your village below.",
  gpsFound: "Location found and pinned on the map.",
  gpsFailed: "Could not read the GPS signal. Enter your nearest village or tap the map.",
  whatDoYouGrow: "What do you grow?",
  findMainCrop: "Find your main crop",
  cropSearchPlaceholder: "Olive, citrus, tomato, wheat, dates…",
  droughtLow: "Needs regular water",
  droughtModerate: "Handles a few dry days",
  droughtHigh: "Handles dry summers",
  plantingStartMonth: "Planting month",
  soilFeel: "Your soil",
  soilSandy: "Sandy (water drains fast)",
  soilSandyLoam: "Sandy, a little earthy",
  soilLoam: "Ordinary soil",
  soilSiltLoam: "Fine and soft",
  soilClayLoam: "Heavy, holds water",
  soilClay: "Very heavy clay",
  waterPumpPanels: "Water, pump and solar panels",
  weFillSafeValues: "— we fill in safe values marked “{estimate}”.",
  mainWaterSource: "Main water source",
  waterSources: {
    WELL: "Well",
    BOREHOLE: "Deep well (borehole)",
    RIVER: "River / oued",
    LAKE: "Lake or pond",
    RESERVOIR: "Dam",
    RAINWATER_COLLECTION: "Collected rainwater",
    PUBLIC_NETWORK: "Public water network",
    OTHER: "Other",
    UNKNOWN: "I don't know yet",
  },
  howYouWater: "How you water",
  wateringMethods: {
    DRIP: "Drip",
    SUBSURFACE_DRIP: "Buried drip",
    SPRINKLER: "Sprinklers",
    CENTER_PIVOT: "Center pivot",
    FURROW: "Furrows / flooding",
    MANUAL: "By hand or hose",
    NONE: "Rain only, no watering",
    OTHER: "Other",
  },
  haveAPump: "Do you already have a pump?",
  yes: "Yes",
  noOrPlanning: "No / planning",
  pumpPerHour: "Water your pump gives per hour (m³)",
  hoursPerDay: "Hours you pump each day",
  haveSolar: "Do you have solar panels?",
  solarYes: "Yes, I have them",
  solarPlanning: "Planning to add",
  solarNo: "No panels",
  solarNotSure: "Not sure",
  panelCount: "Number of solar panels (500 W each)",
  advancedSummary: "pipe size, well depth, panel angle",
  wellDepth: "Well depth (m)",
  liftHeight: "How high the water is lifted (m)",
  pipeLength: "Pipe length (m)",
  pipeSize: "Pipe width (mm)",
  pumpEfficiency: "Pump efficiency (%)",
  panelTilt: "Panel angle (°)",
  panelDirection: "Panel direction (°)",
  southHint: "0 (facing south)",
  systemLoss: "Power lost in cables (%)",
  fullMap: "Full map",
  mapTitle: "My farm on the map",
  mapSubtitle: "Mark your well, pump and panels, and draw the edges of your field.",
  waterNearMe: "Water near me",
  rainRadar: "Rain radar",
  refreshFarmData: "Update my farm data",
  whatToMark: "What do you want to mark?",
  pinRoles: {
    FIELD_CENTER: "Middle of my field",
    WELL_CANDIDATE: "Well or water point",
    SOLAR_ARRAY: "Solar panels",
    PUMP_INTAKE: "Pump",
    SOIL_SAMPLE: "Soil test spot",
    CUSTOM: "Other",
  },
  addAnotherFarm: "Add another farm here",
  addFarmHint: "Tap the map to choose the spot, then add it.",
  farmNamePlaceholder: "For example: north field",
  addFarmHere: "Add farm here",
  chosenSpot: "Chosen spot: {lat}, {lon}",
  yourLand: "Your land",
  landSize: "Size",
  edgeLength: "Edge length",
  heightAboveSea: "Height above sea",
  nearestWater: "Nearest water",
  fromYourField: "{dist} from your field",
  heightEasy: "Easy to pump: about the same height",
  heightLower: "Harder to pump: {m} m lower than your farm",
  heightHigher: "Easy: {m} m higher than your farm",
  checkMyWater: "Check my water",
  farmReport: "Farm report",
  marksOnFarm: "Marks on {farm} ({n})",
  marksHint: "Tap “Mark a spot”, then tap the map.",
  noMarksYet: "No marks yet.",
  removeMark: "Remove {label}",
  toolMove: "Move",
  toolMark: "Mark a spot",
  toolDraw: "Draw my field",
  toolMyLocation: "My location",
  layerStreet: "Roads",
  layerSatellite: "Satellite",
  layerHills: "Hills",
  drawingCorners: "Drawing your field: {n} corners",
  undo: "Undo",
  finish: "Finish",
  removeFieldEdges: "Remove field edges",
  waterPlacesOnMap: "{n} water places on the map",
  popupDistance: "{m} m from your field",
  popupNotChecked: "Not checked: go and see",
  mapFallbackHint: "Tap the map to mark a spot or draw your field.",
};

const FR: FarmUiStrings = {
  searchVillage: "Chercher un village",
  farmName: "Nom de la ferme",
  sizeHectares: "Surface (hectares)",
  regionGovernorate: "Région",
  otherRegion: "Autre région",
  tapMapToSetSpot: "Touchez la carte pour placer le point…",
  movePinOnMap: "Déplacer le repère sur la carte",
  tapCornersOnMap: "Touchez les coins sur la carte…",
  drawLandShape: "Tracer mon champ (facultatif)",
  farmCenterPin: "Centre de la ferme",
  yourFarmAbout: "Votre ferme : environ {area}. Déplacez les coins si la forme est fausse.",
  optional: "(Facultatif)",
  typeGpsOrCountry: "saisir les coordonnées GPS ou le pays",
  latitude: "Latitude",
  longitude: "Longitude",
  country: "Pays",
  later: "Plus tard",
  cancel: "Annuler",
  nextStep: "Suivant : {step}",
  back: "Retour",
  gpsFinding: "Recherche de votre position…",
  gpsUnavailable: "La position n'est pas disponible sur cet appareil. Cherchez votre village ci-dessous.",
  gpsFound: "Position trouvée et placée sur la carte.",
  gpsFailed: "Signal GPS introuvable. Saisissez le village le plus proche ou touchez la carte.",
  whatDoYouGrow: "Que cultivez-vous ?",
  findMainCrop: "Trouvez votre culture principale",
  cropSearchPlaceholder: "Olivier, agrumes, tomate, blé, dattes…",
  droughtLow: "A besoin d'eau régulièrement",
  droughtModerate: "Supporte quelques jours secs",
  droughtHigh: "Supporte les étés secs",
  plantingStartMonth: "Mois de plantation",
  soilFeel: "Votre sol",
  soilSandy: "Sableux (l'eau s'écoule vite)",
  soilSandyLoam: "Sableux, un peu terreux",
  soilLoam: "Sol ordinaire",
  soilSiltLoam: "Fin et doux",
  soilClayLoam: "Lourd, garde l'eau",
  soilClay: "Argile très lourde",
  waterPumpPanels: "Eau, pompe et panneaux solaires",
  weFillSafeValues: "— nous mettons des valeurs sûres marquées « {estimate} ».",
  mainWaterSource: "Source d'eau principale",
  waterSources: {
    WELL: "Puits",
    BOREHOLE: "Forage (puits profond)",
    RIVER: "Rivière / oued",
    LAKE: "Lac ou bassin",
    RESERVOIR: "Barrage",
    RAINWATER_COLLECTION: "Eau de pluie récupérée",
    PUBLIC_NETWORK: "Réseau public",
    OTHER: "Autre",
    UNKNOWN: "Je ne sais pas encore",
  },
  howYouWater: "Comment vous arrosez",
  wateringMethods: {
    DRIP: "Goutte-à-goutte",
    SUBSURFACE_DRIP: "Goutte-à-goutte enterré",
    SPRINKLER: "Aspersion",
    CENTER_PIVOT: "Pivot central",
    FURROW: "Raies / submersion",
    MANUAL: "À la main ou au tuyau",
    NONE: "Pluie seulement, pas d'arrosage",
    OTHER: "Autre",
  },
  haveAPump: "Avez-vous déjà une pompe ?",
  yes: "Oui",
  noOrPlanning: "Non / en projet",
  pumpPerHour: "Eau donnée par la pompe par heure (m³)",
  hoursPerDay: "Heures de pompage par jour",
  haveSolar: "Avez-vous des panneaux solaires ?",
  solarYes: "Oui, j'en ai",
  solarPlanning: "En projet",
  solarNo: "Pas de panneaux",
  solarNotSure: "Je ne sais pas",
  panelCount: "Nombre de panneaux solaires (500 W chacun)",
  advancedSummary: "taille du tuyau, profondeur du puits, angle des panneaux",
  wellDepth: "Profondeur du puits (m)",
  liftHeight: "Hauteur de levée de l'eau (m)",
  pipeLength: "Longueur du tuyau (m)",
  pipeSize: "Largeur du tuyau (mm)",
  pumpEfficiency: "Rendement de la pompe (%)",
  panelTilt: "Angle des panneaux (°)",
  panelDirection: "Orientation des panneaux (°)",
  southHint: "0 (vers le sud)",
  systemLoss: "Pertes dans les câbles (%)",
  fullMap: "Grande carte",
  mapTitle: "Ma ferme sur la carte",
  mapSubtitle: "Marquez votre puits, votre pompe et vos panneaux, et tracez les limites de votre champ.",
  waterNearMe: "Eau à proximité",
  rainRadar: "Radar de pluie",
  refreshFarmData: "Mettre à jour mes données",
  whatToMark: "Que voulez-vous marquer ?",
  pinRoles: {
    FIELD_CENTER: "Milieu de mon champ",
    WELL_CANDIDATE: "Puits ou point d'eau",
    SOLAR_ARRAY: "Panneaux solaires",
    PUMP_INTAKE: "Pompe",
    SOIL_SAMPLE: "Point d'analyse du sol",
    CUSTOM: "Autre",
  },
  addAnotherFarm: "Ajouter une autre ferme ici",
  addFarmHint: "Touchez la carte pour choisir l'endroit, puis ajoutez-la.",
  farmNamePlaceholder: "Par exemple : champ nord",
  addFarmHere: "Ajouter la ferme ici",
  chosenSpot: "Endroit choisi : {lat}, {lon}",
  yourLand: "Votre terrain",
  landSize: "Surface",
  edgeLength: "Longueur des limites",
  heightAboveSea: "Altitude",
  nearestWater: "Eau la plus proche",
  fromYourField: "à {dist} de votre champ",
  heightEasy: "Facile à pomper : presque la même hauteur",
  heightLower: "Plus difficile : {m} m plus bas que votre ferme",
  heightHigher: "Facile : {m} m plus haut que votre ferme",
  checkMyWater: "Vérifier mon eau",
  farmReport: "Rapport de la ferme",
  marksOnFarm: "Repères sur {farm} ({n})",
  marksHint: "Touchez « Marquer », puis touchez la carte.",
  noMarksYet: "Aucun repère pour l'instant.",
  removeMark: "Supprimer {label}",
  toolMove: "Déplacer",
  toolMark: "Marquer",
  toolDraw: "Tracer mon champ",
  toolMyLocation: "Ma position",
  layerStreet: "Routes",
  layerSatellite: "Satellite",
  layerHills: "Relief",
  drawingCorners: "Tracé du champ : {n} coins",
  undo: "Annuler",
  finish: "Terminer",
  removeFieldEdges: "Effacer les limites",
  waterPlacesOnMap: "{n} points d'eau sur la carte",
  popupDistance: "à {m} m de votre champ",
  popupNotChecked: "Non vérifié : allez voir",
  mapFallbackHint: "Touchez la carte pour marquer un endroit ou tracer votre champ.",
};

const AR: FarmUiStrings = {
  searchVillage: "ابحث عن قرية",
  farmName: "اسم المزرعة",
  sizeHectares: "المساحة (هكتار)",
  regionGovernorate: "الولاية",
  otherRegion: "ولاية أخرى",
  tapMapToSetSpot: "المس الخريطة لتحديد المكان…",
  movePinOnMap: "حرّك العلامة على الخريطة",
  tapCornersOnMap: "المس زوايا الحقل على الخريطة…",
  drawLandShape: "ارسم حقلي (اختياري)",
  farmCenterPin: "وسط المزرعة",
  yourFarmAbout: "مزرعتك: حوالي {area}. اسحب الزوايا إذا كان الشكل غير صحيح.",
  optional: "(اختياري)",
  typeGpsOrCountry: "اكتب إحداثيات GPS أو البلد",
  latitude: "خط العرض",
  longitude: "خط الطول",
  country: "البلد",
  later: "لاحقاً",
  cancel: "إلغاء",
  nextStep: "التالي: {step}",
  back: "رجوع",
  gpsFinding: "جارٍ تحديد موقعك…",
  gpsUnavailable: "تحديد الموقع غير متاح على هذا الجهاز. ابحث عن قريتك في الأسفل.",
  gpsFound: "تم تحديد موقعك ووضعه على الخريطة.",
  gpsFailed: "تعذّر التقاط إشارة GPS. اكتب أقرب قرية أو المس الخريطة.",
  whatDoYouGrow: "ماذا تزرع؟",
  findMainCrop: "ابحث عن محصولك الرئيسي",
  cropSearchPlaceholder: "زيتون، قوارص، طماطم، قمح، تمور…",
  droughtLow: "يحتاج سقياً منتظماً",
  droughtModerate: "يتحمل بضعة أيام جافة",
  droughtHigh: "يتحمل الصيف الجاف",
  plantingStartMonth: "شهر الزراعة",
  soilFeel: "نوع تربتك",
  soilSandy: "رملية (الماء ينزل بسرعة)",
  soilSandyLoam: "رملية قليلاً",
  soilLoam: "تربة عادية",
  soilSiltLoam: "ناعمة وخفيفة",
  soilClayLoam: "ثقيلة، تحفظ الماء",
  soilClay: "طينية ثقيلة جداً",
  waterPumpPanels: "الماء والمضخة والألواح الشمسية",
  weFillSafeValues: "— نضع قيماً آمنة عليها علامة «{estimate}».",
  mainWaterSource: "مصدر الماء الرئيسي",
  waterSources: {
    WELL: "بئر",
    BOREHOLE: "بئر عميقة",
    RIVER: "وادي",
    LAKE: "بحيرة أو بركة",
    RESERVOIR: "سد",
    RAINWATER_COLLECTION: "ماء المطر المجمّع",
    PUBLIC_NETWORK: "شبكة الماء العمومية",
    OTHER: "أخرى",
    UNKNOWN: "لا أعرف بعد",
  },
  howYouWater: "طريقة السقي",
  wateringMethods: {
    DRIP: "قطرة قطرة",
    SUBSURFACE_DRIP: "قطرة قطرة تحت التربة",
    SPRINKLER: "الرشّ",
    CENTER_PIVOT: "الرشّاش المحوري",
    FURROW: "السواقي / الغمر",
    MANUAL: "باليد أو بالخرطوم",
    NONE: "المطر فقط، بدون سقي",
    OTHER: "أخرى",
  },
  haveAPump: "هل عندك مضخة؟",
  yes: "نعم",
  noOrPlanning: "لا / أخطط لذلك",
  pumpPerHour: "كمية الماء التي تعطيها المضخة في الساعة (م³)",
  hoursPerDay: "عدد ساعات الضخ في اليوم",
  haveSolar: "هل عندك ألواح شمسية؟",
  solarYes: "نعم، عندي",
  solarPlanning: "أخطط لتركيبها",
  solarNo: "ليس عندي",
  solarNotSure: "لست متأكداً",
  panelCount: "عدد الألواح الشمسية (500 واط لكل لوح)",
  advancedSummary: "قطر الأنبوب، عمق البئر، زاوية الألواح",
  wellDepth: "عمق البئر (م)",
  liftHeight: "ارتفاع رفع الماء (م)",
  pipeLength: "طول الأنبوب (م)",
  pipeSize: "عرض الأنبوب (مم)",
  pumpEfficiency: "مردود المضخة (%)",
  panelTilt: "زاوية الألواح (°)",
  panelDirection: "اتجاه الألواح (°)",
  southHint: "0 (نحو الجنوب)",
  systemLoss: "الطاقة الضائعة في الأسلاك (%)",
  fullMap: "الخريطة الكاملة",
  mapTitle: "مزرعتي على الخريطة",
  mapSubtitle: "حدّد بئرك ومضختك وألواحك الشمسية، وارسم حدود حقلك.",
  waterNearMe: "الماء القريب",
  rainRadar: "رادار المطر",
  refreshFarmData: "حدّث بيانات مزرعتي",
  whatToMark: "ماذا تريد أن تحدّد؟",
  pinRoles: {
    FIELD_CENTER: "وسط حقلي",
    WELL_CANDIDATE: "بئر أو نقطة ماء",
    SOLAR_ARRAY: "الألواح الشمسية",
    PUMP_INTAKE: "المضخة",
    SOIL_SAMPLE: "مكان فحص التربة",
    CUSTOM: "أخرى",
  },
  addAnotherFarm: "أضف مزرعة أخرى هنا",
  addFarmHint: "المس الخريطة لاختيار المكان، ثم أضفها.",
  farmNamePlaceholder: "مثلاً: الحقل الشمالي",
  addFarmHere: "أضف المزرعة هنا",
  chosenSpot: "المكان المختار: {lat}، {lon}",
  yourLand: "أرضك",
  landSize: "المساحة",
  edgeLength: "طول الحدود",
  heightAboveSea: "الارتفاع عن سطح البحر",
  nearestWater: "أقرب ماء",
  fromYourField: "على بعد {dist} من حقلك",
  heightEasy: "ضخ سهل: تقريباً نفس الارتفاع",
  heightLower: "ضخ أصعب: أخفض من مزرعتك بـ {m} م",
  heightHigher: "سهل: أعلى من مزرعتك بـ {m} م",
  checkMyWater: "افحص مائي",
  farmReport: "تقرير المزرعة",
  marksOnFarm: "العلامات على {farm} ({n})",
  marksHint: "المس «ضع علامة» ثم المس الخريطة.",
  noMarksYet: "لا توجد علامات بعد.",
  removeMark: "احذف {label}",
  toolMove: "تحريك",
  toolMark: "ضع علامة",
  toolDraw: "ارسم حقلي",
  toolMyLocation: "موقعي",
  layerStreet: "طرقات",
  layerSatellite: "قمر صناعي",
  layerHills: "تضاريس",
  drawingCorners: "رسم الحقل: {n} زوايا",
  undo: "تراجع",
  finish: "إنهاء",
  removeFieldEdges: "امسح حدود الحقل",
  waterPlacesOnMap: "{n} أماكن ماء على الخريطة",
  popupDistance: "على بعد {m} م من حقلك",
  popupNotChecked: "غير مؤكد: اذهب وتحقق",
  mapFallbackHint: "المس الخريطة لوضع علامة أو لرسم حقلك.",
};

const JA: FarmUiStrings = {
  searchVillage: "村・地域を検索",
  farmName: "農園名",
  sizeHectares: "広さ（ヘクタール）",
  regionGovernorate: "地域",
  otherRegion: "その他の地域",
  tapMapToSetSpot: "地図をタップして位置を設定…",
  movePinOnMap: "地図上のピンを移動",
  tapCornersOnMap: "地図上で農地の角をタップ…",
  drawLandShape: "農地の境界を描く（任意）",
  farmCenterPin: "農園の中心",
  yourFarmAbout: "農園面積：約 {area}。形が違う場合は角をドラッグしてください。",
  optional: "（任意）",
  typeGpsOrCountry: "GPS座標または国名を入力",
  latitude: "緯度",
  longitude: "経度",
  country: "国",
  later: "あとで",
  cancel: "キャンセル",
  nextStep: "次へ：{step}",
  back: "戻る",
  gpsFinding: "現在地を取得しています…",
  gpsUnavailable: "この端末では位置情報が使えません。下の地域検索をご利用ください。",
  gpsFound: "現在地を取得して地図にピンを立てました。",
  gpsFailed: "GPS信号を取得できませんでした。最寄りの地域を入力するか地図をタップしてください。",
  whatDoYouGrow: "何を栽培していますか？",
  findMainCrop: "主な作物を検索",
  cropSearchPlaceholder: "オリーブ、柑橘類、トマト、小麦、ナツメヤシ…",
  droughtLow: "定期的な水やりが必要",
  droughtModerate: "数日の乾燥に耐えられる",
  droughtHigh: "乾燥した夏にも強い",
  plantingStartMonth: "植え付け月",
  soilFeel: "土壌の種類",
  soilSandy: "砂質土（水はけが非常に早い）",
  soilSandyLoam: "砂壌土（やや砂が多い土）",
  soilLoam: "壌土（標準的な農地の土）",
  soilSiltLoam: "シルト質壌土（きめ細かく柔らかい土）",
  soilClayLoam: "埴壌土（重く保水性が高い）",
  soilClay: "粘土質（非常に保水力が高い）",
  waterPumpPanels: "水・ポンプ・太陽光パネル",
  weFillSafeValues: "— 分からない項目は「{estimate}」として安全な推定値を使います。",
  mainWaterSource: "主な水源",
  waterSources: {
    WELL: "井戸",
    BOREHOLE: "深井戸（ボーリング）",
    RIVER: "河川・ワジ",
    LAKE: "湖・ため池",
    RESERVOIR: "ダム・貯水池",
    RAINWATER_COLLECTION: "雨水貯留",
    PUBLIC_NETWORK: "上水道・公共用水",
    OTHER: "その他",
    UNKNOWN: "まだ分からない",
  },
  howYouWater: "灌漑方法",
  wateringMethods: {
    DRIP: "点滴灌漑",
    SUBSURFACE_DRIP: "地中点滴灌漑",
    SPRINKLER: "スプリンクラー",
    CENTER_PIVOT: "センターピボット",
    FURROW: "畝間灌漑・湛水",
    MANUAL: "手作業・ホース",
    NONE: "天水のみ（灌漑なし）",
    OTHER: "その他",
  },
  haveAPump: "すでにポンプをお持ちですか？",
  yes: "はい",
  noOrPlanning: "いいえ・計画中",
  pumpPerHour: "ポンプの時間あたり吐出量（m³/時）",
  hoursPerDay: "1日のポンプ稼働時間",
  haveSolar: "太陽光パネルはありますか？",
  solarYes: "はい、導入済み",
  solarPlanning: "導入を検討中",
  solarNo: "パネルなし",
  solarNotSure: "分からない",
  panelCount: "パネル枚数（1枚 500 W 想定）",
  advancedSummary: "配管径・井戸深さ・パネル角度",
  wellDepth: "井戸の深さ (m)",
  liftHeight: "揚程（汲み上げ高さ m）",
  pipeLength: "配管の長さ (m)",
  pipeSize: "配管径 (mm)",
  pumpEfficiency: "ポンプ効率 (%)",
  panelTilt: "パネル傾斜角 (°)",
  panelDirection: "パネルの方位 (°)",
  southHint: "0（真南向き）",
  systemLoss: "配線・システム損失 (%)",
  fullMap: "全画面マップ",
  mapTitle: "地図上の私の農園",
  mapSubtitle: "井戸・ポンプ・太陽光パネルの位置や畑の境界線を描けます。",
  waterNearMe: "周辺の水源",
  rainRadar: "雨雲レーダー",
  refreshFarmData: "農園データを更新",
  whatToMark: "何を登録しますか？",
  pinRoles: {
    FIELD_CENTER: "農園の中心",
    WELL_CANDIDATE: "井戸・水利ポイント",
    SOLAR_ARRAY: "太陽光パネル",
    PUMP_INTAKE: "ポンプ",
    SOIL_SAMPLE: "土壌調査地点",
    CUSTOM: "その他",
  },
  addAnotherFarm: "ここに別の農園を追加",
  addFarmHint: "地図をタップして場所を選び、追加してください。",
  farmNamePlaceholder: "例：北側の区画",
  addFarmHere: "この場所に農園を追加",
  chosenSpot: "選択した地点：{lat}, {lon}",
  yourLand: "農地の情報",
  landSize: "面積",
  edgeLength: "外周長",
  heightAboveSea: "標高（海抜）",
  nearestWater: "最寄りの水源",
  fromYourField: "農園から {dist}",
  heightEasy: "揚水しやすい：農園とほぼ同じ標高",
  heightLower: "揚水負担あり：農園より {m} m 低い",
  heightHigher: "有利：農園より {m} m 高い",
  checkMyWater: "水収支を確認",
  farmReport: "農園レポート",
  marksOnFarm: "{farm} の登録地点（{n}件）",
  marksHint: "「地点をマーク」を押してから地図をタップします。",
  noMarksYet: "登録された地点はまだありません。",
  removeMark: "{label} を削除",
  toolMove: "移動",
  toolMark: "地点をマーク",
  toolDraw: "畑を囲む",
  toolMyLocation: "現在地",
  layerStreet: "道路地図",
  layerSatellite: "衛星写真",
  layerHills: "地形図",
  drawingCorners: "境界を描画中：{n} 頂点",
  undo: "1つ戻る",
  finish: "完了",
  removeFieldEdges: "境界線を削除",
  waterPlacesOnMap: "地図上に {n} 件の水利ポイント",
  popupDistance: "農園から {m} m",
  popupNotChecked: "未確認：現地でお確かめください",
  mapFallbackHint: "地図をタップしてピンを置くか、畑の境界を描いてください。",
};

export const FARM_UI_STRINGS: Record<AppLanguage, FarmUiStrings> = { en: EN, fr: FR, ar: AR, ja: JA };

export function fillTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

// Display names for Tunisian governorates (stored values stay in Latin letters).
const GOVERNORATES: Record<string, { fr: string; ar: string }> = {
  Tunis: { fr: "Tunis", ar: "تونس" },
  Ariana: { fr: "Ariana", ar: "أريانة" },
  "Ben Arous": { fr: "Ben Arous", ar: "بن عروس" },
  Manouba: { fr: "La Manouba", ar: "منوبة" },
  Nabeul: { fr: "Nabeul", ar: "نابل" },
  Zaghouan: { fr: "Zaghouan", ar: "زغوان" },
  Bizerte: { fr: "Bizerte", ar: "بنزرت" },
  Beja: { fr: "Béja", ar: "باجة" },
  Jendouba: { fr: "Jendouba", ar: "جندوبة" },
  Kef: { fr: "Le Kef", ar: "الكاف" },
  Siliana: { fr: "Siliana", ar: "سليانة" },
  Sousse: { fr: "Sousse", ar: "سوسة" },
  Monastir: { fr: "Monastir", ar: "المنستير" },
  Mahdia: { fr: "Mahdia", ar: "المهدية" },
  Sfax: { fr: "Sfax", ar: "صفاقس" },
  Kairouan: { fr: "Kairouan", ar: "القيروان" },
  Kasserine: { fr: "Kasserine", ar: "القصرين" },
  "Sidi Bouzid": { fr: "Sidi Bouzid", ar: "سيدي بوزيد" },
  Gabes: { fr: "Gabès", ar: "قابس" },
  Medenine: { fr: "Médenine", ar: "مدنين" },
  Tataouine: { fr: "Tataouine", ar: "تطاوين" },
  Gafsa: { fr: "Gafsa", ar: "قفصة" },
  Tozeur: { fr: "Tozeur", ar: "توزر" },
  Kebili: { fr: "Kébili", ar: "قبلي" },
};

export function localizeGovernorate(name: string, lang: AppLanguage): string {
  if (lang === "en" || lang === "ja") return name;
  return GOVERNORATES[name]?.[lang] ?? name;
}
