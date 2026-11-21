export type AppLanguage = "en" | "fr" | "ar";

export const MAGHREB_ARABIC_MONTHS: Record<string, string> = {
  January: "جانفي",
  February: "فيفري",
  March: "مارس",
  April: "أفريل",
  May: "ماي",
  June: "جوان",
  July: "جويلية",
  August: "أوت",
  September: "سبتمبر",
  October: "أكتوبر",
  November: "نوفمبر",
  December: "ديسمبر",
};

// REVIEW: native French speaker review recommended for agricultural idioms
export const FRENCH_MONTHS: Record<string, string> = {
  January: "janvier",
  February: "février",
  March: "mars",
  April: "avril",
  May: "mai",
  June: "juin",
  July: "juillet",
  August: "août",
  September: "septembre",
  October: "octobre",
  November: "novembre",
  December: "décembre",
};

export function localizeMonthName(monthName: string, lang: AppLanguage): string {
  const normalized = monthName.trim();
  const key = Object.keys(MAGHREB_ARABIC_MONTHS).find(
    (m) => m.toLowerCase() === normalized.toLowerCase()
  );
  if (!key) return monthName;
  if (lang === "ar") return MAGHREB_ARABIC_MONTHS[key];
  if (lang === "fr") return FRENCH_MONTHS[key];
  return key;
}

export function localizeCropLabel(cropName: string, cropCode: string, lang: AppLanguage): string {
  const map: Record<string, { en: string; fr: string; ar: string }> = {
    citrus: { en: "Citrus", fr: "Agrumes", ar: "حمضيات" },
    olive: { en: "Olive", fr: "Olivier", ar: "زيتون" },
    wheat: { en: "Wheat", fr: "Blé", ar: "قمح" },
    barley: { en: "Barley", fr: "Orge", ar: "شعير" },
    tomato: { en: "Tomato", fr: "Tomate", ar: "طماطم" },
    potato: { en: "Potato", fr: "Pomme de terre", ar: "بطاطا" },
    onion: { en: "Onion", fr: "Oignon", ar: "بصل" },
    pepper: { en: "Pepper", fr: "Piment / Poivron", ar: "فلفل" },
    watermelon: { en: "Watermelon", fr: "Pastèque", ar: "دلاع" },
    melon: { en: "Melon", fr: "Melon", ar: "بطيخ" },
    grapes: { en: "Grapes", fr: "Raisin", ar: "عنب" },
    almond: { en: "Almond", fr: "Amandier", ar: "لوز" },
    date_palm: { en: "Date palm", fr: "Palmier dattier", ar: "نخيل" },
    sorghum: { en: "Sorghum", fr: "Sorgho", ar: "سورغوم" },
    alfalfa: { en: "Alfalfa", fr: "Luzerne", ar: "فصة" },
    maize: { en: "Maize", fr: "Maïs", ar: "ذرة" },
  };
  const found = map[cropCode];
  if (found) return found[lang];
  return cropName;
}

export function localizeWeatherCondition(
  summary: string | null | undefined,
  lang: AppLanguage
): string {
  const s = (summary || "Partly cloudy").toLowerCase();
  if (s.includes("clear") || s.includes("sunny")) {
    return lang === "ar" ? "صافي ومشمس" : lang === "fr" ? "Ciel dégagé" : summary || "Mainly clear";
  }
  if (s.includes("overcast")) {
    return lang === "ar" ? "غائم كلياً" : lang === "fr" ? "Couvert" : summary || "Overcast";
  }
  if (s.includes("rain") || s.includes("shower") || s.includes("drizzle")) {
    return lang === "ar" ? "ممطر" : lang === "fr" ? "Pluie" : summary || "Rain";
  }
  if (s.includes("fog")) {
    return lang === "ar" ? "ضباب" : lang === "fr" ? "Brouillard" : summary || "Fog";
  }
  return lang === "ar" ? "غائم جزئياً" : lang === "fr" ? "Partiellement nuageux" : summary || "Partly cloudy";
}

export interface TranslationStrings {
  // Brand & Navigation
  appName: string;
  navHome: string;
  navMyFarm: string;
  navAsk: string;
  navReport: string;
  navCheckGroup: string;
  navWater: string;
  navSunPower: string;
  navWeather: string;
  changeFarm: string;
  backToHome: string;
  signOut: string;
  changeLanguageLabel: string;
  hectaresShort: string;
  hectaresFull: string;

  // Status labels (Word + Icon + Color)
  statusGood: string;
  statusOk: string;
  statusProblem: string;
  statusAllGood: string;
  needsAttention: string;
  goAndCheck: string;
  askForPermission: string;

  // Short sidebar / card statuses
  shortInMonth: string; // "Short in {month}"
  shortInSummer: string;
  enoughAllYear: string;
  calmWeek: string;
  alertAhead: string;

  // Home screen (Main / HomeArabic / DeskHome)
  goodMorning: string;
  yourFarmToday: string;
  liveDataLabel: string;
  waterWillBeShortInMonth: string; // "Water will be short in {month}"
  waterFineTitle: string;
  yourPumpGivesPerDay: string; // "Your pump gives {supply} m³ a day. In {month} your crops need {demand} m³ a day."
  yourTreesNeed: string;
  yourPumpGives: string;
  m3ADay: string;
  seeWhatToDo: string;
  pumpCupsCaption: string; // "Pump gives 1 of every {cups} cups needed"
  sunRestOfYearCaption: string;
  weatherCalmCaption: string;
  todayTitle: string;
  waterAsNormalToday: string;
  holdWaterRainToday: string;
  noRainNoFrostLightWind: string;
  yourNextSteps: string;
  stepVisitWaterPoint: string; // "Visit the water point {distance} m away. Check it has water all year."
  stepPlanSummerWater: string;
  stepAddFarmPrompt: string;
  farmReportCardTitle: string;
  verdictSolveWaterFirst: string;
  verdictGoodChoice: string;
  openReport: string;
  askAQuestion: string;

  // Water screen (Water / DeskWater)
  waterQuestionTitle: string; // "Do I have enough water?"
  notInMonth: string; // "Not in {month}."
  yesEnoughWater: string; // "Yes, your pump covers peak {month} needs."
  hottestMonthSubtitle: string;
  pumpDetailFormula: string; // "Your pump gives ({flow} m³ an hour × {hours} hours)"
  cupsOfTreesNeed: string; // "That is about 1 of every {cups} cups your crops need."
  whatCanYouDo: string;
  optBiggerPump: string;
  optBiggerPumpDesc: string; // "About {needed} m³ per hour. Yours gives {current}."
  optPumpLonger: string;
  optPumpLongerDesc: string; // "You would need {needed} hours a day in {month}. You pump {current} now."
  optSecondSource: string;
  optSecondSourcePhone: string; // "Closest: {name} {dist} away."
  optSecondSourceDesktop: string;
  waterNearYou: string;
  showingTopSources: string; // "Showing the {shown} most useful of {total} places on the map"
  colPlace: string;
  colHowFar: string;
  colHowHardToPump: string;
  colStatus: string;
  easySameHeight: string;
  easyHigher: string; // "Easy: {m} m higher than your farm"
  hardLower: string; // "Hard: {m} m lower than your farm"
  heightUnknown: string;
  waterCheckWarning: string;
  forYourEngineerTitle: string;
  howDoWeKnowTitle: string;

  // Sun power screen (Sun / DeskSun)
  sunQuestionTitle: string; // "Can the sun run my pump?"
  yesMostOfYear: string;
  yesOverFullYear: string;
  withYourPanelsFullYear: string; // "With your {kw} kW of panels (about {panels} panels), over a full year:"
  sunMakes: string;
  pumpUses: string;
  kwhUnit: string;
  kwhAYear: string;
  extraWinterPowerNote: string;
  notEnoughInMonth: string; // "But not enough in {month}."
  treesDrinkMostWhenHot: string; // "Crops drink the most when it is hot. The sun gives {units} of every 10 units your pump needs."
  missingInMonthKwh: string; // "Missing in {month}: about {kwh} kWh."
  howToCoverSummer: string;
  optWaterTank: string;
  optWaterTankDesc: string; // "Pump on sunny days, water later. About {m3} m³."
  usuallyCheapest: string;
  optBattery: string;
  optBatteryDesc: string; // "Store power for evening pumping. About {kwh} kWh."
  optGridOrGen: string;
  optGridOrGenDesc: string;
  yourPanelsCard: string;
  panelSizeLabel: string;
  panelSizeVal: string; // "{kw} kW (about {panels} panels)"
  facingLabel: string;
  facingSouth: string;
  angleLabel: string;
  angleGoodArea: string; // "{deg}° (good for your area)"
  changeMyPanels: string;

  // Weather screen (Weather)
  weatherQuestionTitle: string; // "Should I water today?"
  yesWaterAsNormal: string;
  skipRainComing: string;
  soilLosesMmDay: string; // "No rain is coming. Sun and wind take about {mm} mm of water from your soil each day."
  rainComingTodayDetail: string; // "About {mm} mm of rain is forecast today. Check soil moisture before running your pump."
  next4Days: string;
  todayLabel: string;
  warningsTitle: string;
  noFrost: string;
  frostAlert: string;
  noHeatWave: string;
  heatAlert: string;
  noStrongWind: string;
  windAlert: string;
  alertNoticeHint: string;
  lastYearLabel: string;
  lastYearRainSummary: string; // "{annual} mm of rain, and {summer} mm from June to August. Plan your summer water early."

  // Ask screen (Ask / DeskAsk)
  askTitle: string;
  askSubtitle: string;
  listenBtn: string;
  stopListeningBtn: string;
  seeSunPowerLink: string;
  seeWaterLink: string;
  whatIKnowAboutFarm: string;
  somethingWrongFixIt: string;
  otherFarmersAsk: string;
  typeYourQuestion: string;
  speakYourQuestion: string;
  sampleQ1: string;
  sampleQ2: string;
  sampleQ3: string;
  sampleQ4: string;

  // Report screen (Report / DeskReport)
  reportQuestionTitle: string; // "Is this farm a good choice?"
  landAndClimate: string;
  bestCropsForPlace: string;
  checkInPersonTitle: string;
  checkPointAllYear: string;
  checkSoilTest: string;
  checkGroundwaterDepth: string;
  savePdfBtn: string;
  sendToEngineerBtn: string;
  yourCropTag: string;

  // Add / Edit Farm (AddFarm / DeskAddFarm)
  addFarmTitle: string;
  myFarmTitle: string;
  threeShortSteps: string;
  step1Where: string;
  step1WhereSub: string;
  step2WhatGrow: string;
  step2WhatGrowSub: string;
  step3Water: string;
  step3WaterSub: string;
  whereIsYourFarm: string;
  standOnLandHint: string;
  iAmOnMyFarmNow: string;
  useMyLocation: string;
  nearestVillageOrTown: string;
  villagePlaceholder: string;
  skipIfDontKnow: string;
  ourEstimateBadge: string;
  saveFarmBtn: string;
  deleteFarmConfirm: string; // "Delete \"{name}\"? This removes the saved parcel and cannot be undone."
}

const EN_STRINGS: TranslationStrings = {
  appName: "TerraPulse",
  navHome: "Home",
  navMyFarm: "My farm",
  navAsk: "Ask",
  navReport: "Report",
  navCheckGroup: "CHECK",
  navWater: "Water",
  navSunPower: "Sun power",
  navWeather: "Weather",
  changeFarm: "Change farm",
  backToHome: "Back to home",
  signOut: "Sign out",
  changeLanguageLabel: "Change language",
  hectaresShort: "ha",
  hectaresFull: "hectares",

  statusGood: "Good",
  statusOk: "OK",
  statusProblem: "Problem",
  statusAllGood: "All good",
  needsAttention: "NEEDS ATTENTION",
  goAndCheck: "Go and check",
  askForPermission: "Ask for permission",

  shortInMonth: "Short in {month}",
  shortInSummer: "Short in summer",
  enoughAllYear: "Enough all year",
  calmWeek: "Calm week",
  alertAhead: "Check alerts",

  goodMorning: "Good morning",
  yourFarmToday: "Your farm today",
  liveDataLabel: "Live data",
  waterWillBeShortInMonth: "Water will be short in {month}",
  waterFineTitle: "Water and weather look healthy",
  yourPumpGivesPerDay: "Your pump gives {supply} m³ a day. In {month} your crops need {demand} m³ a day.",
  yourTreesNeed: "Your crops need",
  yourPumpGives: "Your pump gives",
  m3ADay: "m³ a day",
  seeWhatToDo: "See what to do",
  pumpCupsCaption: "Pump gives 1 of every {cups} cups needed",
  sunRestOfYearCaption: "Enough the rest of the year",
  weatherCalmCaption: "No frost, no storms coming",
  todayTitle: "Today",
  waterAsNormalToday: "Water as normal today.",
  holdWaterRainToday: "Hold irrigation if rain falls.",
  noRainNoFrostLightWind: "No rain · No frost · Light wind",
  yourNextSteps: "Your next steps",
  stepVisitWaterPoint: "Visit the water point {distance} m away. Check it has water all year.",
  stepPlanSummerWater: "Plan more water for summer: tank or bigger pump.",
  stepAddFarmPrompt: "Add your farm location and crop to get tailored checks.",
  farmReportCardTitle: "Farm report",
  verdictSolveWaterFirst: "Good choice, if you solve summer water first.",
  verdictGoodChoice: "Good choice for your crops and location.",
  openReport: "Open report",
  askAQuestion: "Ask a question",

  waterQuestionTitle: "Do I have enough water?",
  notInMonth: "Not in {month}.",
  yesEnoughWater: "Yes, your pump covers {month} demand.",
  hottestMonthSubtitle: "{month} is the hottest month. This is the water you need each day:",
  pumpDetailFormula: "Your pump gives ({flow} m³ an hour × {hours} hours)",
  cupsOfTreesNeed: "That is about 1 of every {cups} cups your crops need.",
  whatCanYouDo: "What can you do?",
  optBiggerPump: "Get a bigger pump",
  optBiggerPumpDesc: "About {needed} m³ per hour. Yours gives {current}.",
  optPumpLonger: "Pump longer each day",
  optPumpLongerDesc: "You would need {needed} hours a day in {month}. You pump {current} now.",
  optSecondSource: "Find a second water source",
  optSecondSourcePhone: "Closest: {name} {dist} away.",
  optSecondSourceDesktop: "See the water near you below.",
  waterNearYou: "Water near you",
  showingTopSources: "Showing the {shown} most useful of {total} places on the map",
  colPlace: "Place",
  colHowFar: "How far",
  colHowHardToPump: "How hard to pump",
  colStatus: "Status",
  easySameHeight: "Easy: almost the same height",
  easyHigher: "Easy: {m} m higher than your farm",
  hardLower: "Hard: {m} m lower than your farm",
  heightUnknown: "Check elevation in person",
  waterCheckWarning: "A place on the map may be dry, salty or private. Visit it before you buy a pump.",
  forYourEngineerTitle: "For your engineer: technical details and sources",
  howDoWeKnowTitle: "How do we know this?",

  sunQuestionTitle: "Can the sun run my pump?",
  yesMostOfYear: "Yes, most of the year.",
  yesOverFullYear: "Yes, over the full year.",
  withYourPanelsFullYear: "With your {kw} kW of panels (about {panels} panels), over a full year:",
  sunMakes: "Sun makes",
  pumpUses: "Pump uses",
  kwhUnit: "kWh",
  kwhAYear: "kWh a year",
  extraWinterPowerNote: "Extra power in winter, but it cannot be saved for summer without a tank or battery.",
  notEnoughInMonth: "Not enough in {month}.",
  treesDrinkMostWhenHot: "Crops drink the most when it is hot. The sun gives {units} of every 10 units your pump needs.",
  missingInMonthKwh: "Missing in {month}: about {kwh} kWh.",
  howToCoverSummer: "How to cover summer",
  optWaterTank: "Store water in a tank",
  optWaterTankDesc: "Pump on sunny days, water later. About {m3} m³.",
  usuallyCheapest: "Usually the cheapest",
  optBattery: "Battery",
  optBatteryDesc: "Store power for evening pumping. About {kwh} kWh.",
  optGridOrGen: "Keep the grid or a generator",
  optGridOrGenDesc: "Only for the hot months.",
  yourPanelsCard: "Your panels",
  panelSizeLabel: "Size",
  panelSizeVal: "{kw} kW (about {panels} panels)",
  facingLabel: "Facing",
  facingSouth: "South",
  angleLabel: "Angle",
  angleGoodArea: "{deg}° (good for your area)",
  changeMyPanels: "Change my panels",

  weatherQuestionTitle: "Should I water today?",
  yesWaterAsNormal: "Yes, water as normal.",
  skipRainComing: "Wait — rain is expected today.",
  soilLosesMmDay: "No rain is coming. Sun and wind take about {mm} mm of water from your soil each day.",
  rainComingTodayDetail: "About {mm} mm of rain is forecast today. Check the soil before turning on your pump.",
  next4Days: "Next 4 days",
  todayLabel: "Today",
  warningsTitle: "Warnings",
  noFrost: "No frost",
  frostAlert: "Frost risk",
  noHeatWave: "No heat wave",
  heatAlert: "Heat wave",
  noStrongWind: "No strong wind",
  windAlert: "Strong wind",
  alertNoticeHint: "We will warn you here if frost, extreme heat, or a storm is coming.",
  lastYearLabel: "Last year:",
  lastYearRainSummary: "{annual} mm of rain, and {summer} mm in summer. Plan your summer water early.",

  askTitle: "Ask about your farm",
  askSubtitle: "Type or speak. Answers use your farm's real data.",
  listenBtn: "Listen",
  stopListeningBtn: "Stop",
  seeSunPowerLink: "See sun power",
  seeWaterLink: "See water",
  whatIKnowAboutFarm: "What I know about your farm",
  somethingWrongFixIt: "Something wrong? Fix it",
  otherFarmersAsk: "Other farmers ask",
  typeYourQuestion: "Type your question…",
  speakYourQuestion: "Speak your question",
  sampleQ1: "Is my land good for olives?",
  sampleQ2: "When should I plant?",
  sampleQ3: "What are my biggest risks?",
  sampleQ4: "Is the water point good to use?",

  reportQuestionTitle: "Is this farm a good choice?",
  landAndClimate: "Land and climate",
  bestCropsForPlace: "Best crops for this place",
  checkInPersonTitle: "Check in person before you buy",
  checkPointAllYear: "Does the water point have water all year?",
  checkSoilTest: "Soil test: how salty, how well it holds water",
  checkGroundwaterDepth: "How deep is the groundwater?",
  savePdfBtn: "Save PDF",
  sendToEngineerBtn: "Send to my engineer",
  yourCropTag: "(your crop)",

  addFarmTitle: "Add my farm",
  myFarmTitle: "My farm",
  threeShortSteps: "3 short steps. Skip anything you don't know: we use a safe estimate and tell you.",
  step1Where: "Where",
  step1WhereSub: "Location and size",
  step2WhatGrow: "What you grow",
  step2WhatGrowSub: "Crops and how much land",
  step3Water: "Water",
  step3WaterSub: "Well, pump, panels (optional)",
  whereIsYourFarm: "Where is your farm?",
  standOnLandHint: "Stand on your land and tap the green button. We do the rest.",
  iAmOnMyFarmNow: "I am on my farm now",
  useMyLocation: "Use my location",
  nearestVillageOrTown: "Nearest village or town",
  villagePlaceholder: "For example: Korba",
  skipIfDontKnow: "Skip if you don't know",
  ourEstimateBadge: "our estimate",
  saveFarmBtn: "Save my farm",
  deleteFarmConfirm: "Delete \"{name}\"? This will permanently remove your saved parcel and analysis.",
};

// REVIEW: native French speaker review recommended for agricultural idioms
const FR_STRINGS: TranslationStrings = {
  appName: "TerraPulse",
  navHome: "Accueil",
  navMyFarm: "Ma ferme",
  navAsk: "Demander",
  navReport: "Rapport",
  navCheckGroup: "CONTRÔLE",
  navWater: "Eau",
  navSunPower: "Solaire",
  navWeather: "Météo",
  changeFarm: "Changer de ferme",
  backToHome: "Retour à l'accueil",
  signOut: "Déconnexion",
  changeLanguageLabel: "Changer de langue",
  hectaresShort: "ha",
  hectaresFull: "hectares",

  statusGood: "Bon",
  statusOk: "Correct",
  statusProblem: "Problème",
  statusAllGood: "Tout est bon",
  needsAttention: "ATTENTION REQUISE",
  goAndCheck: "Aller vérifier",
  askForPermission: "Demander autorisation",

  shortInMonth: "Insuffisant en {month}",
  shortInSummer: "Court en été",
  enoughAllYear: "Suffisant toute l'année",
  calmWeek: "Semaine calme",
  alertAhead: "Voir alertes",

  goodMorning: "Bonjour",
  yourFarmToday: "Votre ferme aujourd'hui",
  liveDataLabel: "Données en direct",
  waterWillBeShortInMonth: "L'eau va manquer en {month}",
  waterFineTitle: "L'eau et la météo sont favorables",
  yourPumpGivesPerDay: "Votre pompe donne {supply} m³ par jour. En {month}, vos cultures ont besoin de {demand} m³ par jour.",
  yourTreesNeed: "Vos cultures demandent",
  yourPumpGives: "Votre pompe donne",
  m3ADay: "m³ / jour",
  seeWhatToDo: "Voir quoi faire",
  pumpCupsCaption: "La pompe couvre 1 verre sur {cups} nécessaires",
  sunRestOfYearCaption: "Suffisant le reste de l'année",
  weatherCalmCaption: "Pas de gel, pas d'orage prévu",
  todayTitle: "Aujourd'hui",
  waterAsNormalToday: "Arrosez normalement aujourd'hui.",
  holdWaterRainToday: "Attendez avant d'arroser : pluie prévue.",
  noRainNoFrostLightWind: "Pas de pluie · Pas de gel · Vent léger",
  yourNextSteps: "Vos prochaines étapes",
  stepVisitWaterPoint: "Visitez le point d'eau à {distance} m. Vérifiez qu'il y a de l'eau toute l'année.",
  stepPlanSummerWater: "Prévoyez plus d'eau pour l'été : bassin ou pompe plus puissante.",
  stepAddFarmPrompt: "Ajoutez votre ferme pour lancer les vérifications.",
  farmReportCardTitle: "Rapport de ferme",
  verdictSolveWaterFirst: "Bon choix, à condition de régler l'eau d'été.",
  verdictGoodChoice: "Bon choix pour vos cultures et votre terrain.",
  openReport: "Ouvrir le rapport",
  askAQuestion: "Poser une question",

  waterQuestionTitle: "Ai-je assez d'eau ?",
  notInMonth: "Pas en {month}.",
  yesEnoughWater: "Oui, votre pompe couvre les besoins en {month}.",
  hottestMonthSubtitle: "{month} est le mois le plus chaud. Voici vos besoins par jour :",
  pumpDetailFormula: "Votre pompe donne ({flow} m³/h × {hours} heures)",
  cupsOfTreesNeed: "C'est environ 1 verre sur {cups} dont vos cultures ont besoin.",
  whatCanYouDo: "Que pouvez-vous faire ?",
  optBiggerPump: "Prendre une pompe plus grande",
  optBiggerPumpDesc: "Environ {needed} m³ par heure. La vôtre donne {current}.",
  optPumpLonger: "Pomper plus longtemps chaque jour",
  optPumpLongerDesc: "Il faudrait {needed} heures par jour en {month}. Vous pompez {current} h maintenant.",
  optSecondSource: "Trouver une deuxième source d'eau",
  optSecondSourcePhone: "Plus proche : {name} à {dist}.",
  optSecondSourceDesktop: "Voir les points d'eau ci-dessous.",
  waterNearYou: "Points d'eau à proximité",
  showingTopSources: "{shown} points les plus utiles sur {total} trouvés sur la carte",
  colPlace: "Lieu",
  colHowFar: "Distance",
  colHowHardToPump: "Effort de pompage",
  colStatus: "Statut",
  easySameHeight: "Facile : presque au même niveau",
  easyHigher: "Facile : {m} m plus haut que la ferme",
  hardLower: "Difficile : {m} m plus bas que la ferme",
  heightUnknown: "Vérifier l'altitude sur place",
  waterCheckWarning: "Un point sur la carte peut être à sec, salé ou privé. Visitez-le avant d'acheter une pompe.",
  forYourEngineerTitle: "Pour votre ingénieur : détails techniques et sources",
  howDoWeKnowTitle: "Comment le savons-nous ?",

  sunQuestionTitle: "Le soleil peut-il alimenter ma pompe ?",
  yesMostOfYear: "Oui, presque toute l'année.",
  yesOverFullYear: "Oui, sur l'ensemble de l'année.",
  withYourPanelsFullYear: "Avec vos {kw} kW de panneaux (environ {panels} panneaux), sur une année complète :",
  sunMakes: "Le soleil produit",
  pumpUses: "La pompe utilise",
  kwhUnit: "kWh",
  kwhAYear: "kWh par an",
  extraWinterPowerNote: "Surplus en hiver, impossible à garder pour l'été sans bassin ni batterie.",
  notEnoughInMonth: "Pas assez en {month}.",
  treesDrinkMostWhenHot: "Les cultures boivent plus quand il fait chaud. Le soleil donne {units} parts sur 10 nécessaires.",
  missingInMonthKwh: "Manque en {month} : environ {kwh} kWh.",
  howToCoverSummer: "Comment couvrir l'été",
  optWaterTank: "Stocker l'eau dans un bassin",
  optWaterTankDesc: "Pompez au soleil, arrosez ensuite. Environ {m3} m³.",
  usuallyCheapest: "Souvent le moins cher",
  optBattery: "Batterie",
  optBatteryDesc: "Stocker l'énergie pour le soir. Environ {kwh} kWh.",
  optGridOrGen: "Garder le réseau ou un groupe électrogène",
  optGridOrGenDesc: "Uniquement pour les mois chauds.",
  yourPanelsCard: "Vos panneaux",
  panelSizeLabel: "Puissance",
  panelSizeVal: "{kw} kW (environ {panels} panneaux)",
  facingLabel: "Orientation",
  facingSouth: "Sud",
  angleLabel: "Inclinaison",
  angleGoodArea: "{deg}° (adapté à votre région)",
  changeMyPanels: "Modifier mes panneaux",

  weatherQuestionTitle: "Dois-je arroser aujourd'hui ?",
  yesWaterAsNormal: "Oui, arrosez normalement.",
  skipRainComing: "Attendez — de la pluie est prévue aujourd'hui.",
  soilLosesMmDay: "Pas de pluie prévue. Le soleil et le vent retirent environ {mm} mm d'eau du sol par jour.",
  rainComingTodayDetail: "Environ {mm} mm de pluie annoncés aujourd'hui. Vérifiez l'humidité du sol avant de pomper.",
  next4Days: "4 prochains jours",
  todayLabel: "Aujourd'hui",
  warningsTitle: "Alertes",
  noFrost: "Pas de gel",
  frostAlert: "Risque de gel",
  noHeatWave: "Pas de canicule",
  heatAlert: "Vague de chaleur",
  noStrongWind: "Pas de vent fort",
  windAlert: "Vent fort",
  alertNoticeHint: "Nous vous préviendrons ici si du gel, une canicule ou un orage approche.",
  lastYearLabel: "L'an dernier :",
  lastYearRainSummary: "{annual} mm de pluie, dont seulement {summer} mm en été. Préparez votre eau tôt.",

  askTitle: "Poser une question sur votre ferme",
  askSubtitle: "Écrivez ou parlez. Réponses basées sur vos vraies données.",
  listenBtn: "Écouter",
  stopListeningBtn: "Arrêter",
  seeSunPowerLink: "Voir le solaire",
  seeWaterLink: "Voir l'eau",
  whatIKnowAboutFarm: "Ce que je sais sur votre ferme",
  somethingWrongFixIt: "Une erreur ? Corriger",
  otherFarmersAsk: "Autres questions fréquentes",
  typeYourQuestion: "Posez votre question…",
  speakYourQuestion: "Parler dans le micro",
  sampleQ1: "Ma terre est-elle bonne pour les oliviers ?",
  sampleQ2: "Quand planter ?",
  sampleQ3: "Quels sont mes plus gros risques ?",
  sampleQ4: "Le point d'eau est-il utilisable ?",

  reportQuestionTitle: "Cette ferme est-elle un bon choix ?",
  landAndClimate: "Terre et climat",
  bestCropsForPlace: "Meilleures cultures pour ce lieu",
  checkInPersonTitle: "À vérifier sur place avant d'acheter",
  checkPointAllYear: "Le point d'eau a-t-il de l'eau toute l'année ?",
  checkSoilTest: "Analyse du sol : salinité et rétention d'eau",
  checkGroundwaterDepth: "À quelle profondeur est la nappe ?",
  savePdfBtn: "Enregistrer PDF",
  sendToEngineerBtn: "Envoyer à mon ingénieur",
  yourCropTag: "(votre culture)",

  addFarmTitle: "Ajouter ma ferme",
  myFarmTitle: "Ma ferme",
  threeShortSteps: "3 étapes rapides. Passez ce que vous ignorez : nous utilisons une estimation sûre.",
  step1Where: "Où",
  step1WhereSub: "Lieu et surface",
  step2WhatGrow: "Cultures",
  step2WhatGrowSub: "Ce que vous plantez",
  step3Water: "Eau",
  step3WaterSub: "Puits, pompe, panneaux (optionnel)",
  whereIsYourFarm: "Où est votre ferme ?",
  standOnLandHint: "Placez-vous sur votre terrain et appuyez sur le bouton vert.",
  iAmOnMyFarmNow: "Je suis sur ma ferme maintenant",
  useMyLocation: "Utiliser ma position GPS",
  nearestVillageOrTown: "Village ou ville la plus proche",
  villagePlaceholder: "Par exemple : Korba",
  skipIfDontKnow: "Passer si vous ne savez pas",
  ourEstimateBadge: "notre estimation",
  saveFarmBtn: "Enregistrer ma ferme",
  deleteFarmConfirm: "Supprimer « {name} » ? Cette action efface définitivement votre parcelle.",
};

// REVIEW: native Maghreb Arabic speaker review recommended for dialectal / farming terms
const AR_STRINGS: TranslationStrings = {
  appName: "TerraPulse",
  navHome: "الرئيسية",
  navMyFarm: "مزرعتي",
  navAsk: "اسأل",
  navReport: "التقرير",
  navCheckGroup: "فحص",
  navWater: "الماء",
  navSunPower: "طاقة الشمس",
  navWeather: "الطقس",
  changeFarm: "تبديل المزرعة",
  backToHome: "الرجوع للرئيسية",
  signOut: "تسجيل الخروج",
  changeLanguageLabel: "تغيير اللغة",
  hectaresShort: "هكتار",
  hectaresFull: "هكتار",

  statusGood: "جيد",
  statusOk: "مقبول",
  statusProblem: "مشكلة",
  statusAllGood: "كل شيء بخير",
  needsAttention: "يحتاج انتباهك",
  goAndCheck: "اذهب وتأكّد",
  askForPermission: "اطلب إذناً",

  shortInMonth: "ناقص في {month}",
  shortInSummer: "ناقصة في الصيف",
  enoughAllYear: "كافية طول العام",
  calmWeek: "أسبوع هادئ",
  alertAhead: "تنبيهات الطقس",

  goodMorning: "صباح الخير",
  yourFarmToday: "مزرعتك اليوم",
  liveDataLabel: "بيانات مباشرة",
  waterWillBeShortInMonth: "الماء لن يكفي في شهر {month}",
  waterFineTitle: "الماء والطقس في حالة جيدة",
  yourPumpGivesPerDay: "مضختك تعطي {supply} م³ في اليوم. محاصيلك تحتاج {demand} م³ في اليوم في {month}.",
  yourTreesNeed: "محاصيلك تحتاج",
  yourPumpGives: "مضختك تعطي",
  m3ADay: "م³ في اليوم",
  seeWhatToDo: "ماذا أفعل؟",
  pumpCupsCaption: "المضخة تعطي كأساً واحداً من كل {cups} كؤوس مطلوبة",
  sunRestOfYearCaption: "كافية باقي أيام العام",
  weatherCalmCaption: "لا صقيع ولا عواصف قادمة",
  todayTitle: "اليوم",
  waterAsNormalToday: "اسقِ كالمعتاد اليوم.",
  holdWaterRainToday: "انتظر قبل السقي: هناك مطر متوقع اليوم.",
  noRainNoFrostLightWind: "لا مطر · لا صقيع · رياح خفيفة",
  yourNextSteps: "خطواتك القادمة",
  stepVisitWaterPoint: "زُر نقطة الماء على بعد {distance} م وتأكد أن فيها ماء طول العام.",
  stepPlanSummerWater: "خطط لمزيد من الماء في الصيف: خزان أو مضخة أكبر.",
  stepAddFarmPrompt: "أضف موقع مزرعتك ومحصولك لتظهر الفحوصات.",
  farmReportCardTitle: "تقرير المزرعة",
  verdictSolveWaterFirst: "اختيار جيد، بشرط حل نقص الماء في الصيف.",
  verdictGoodChoice: "اختيار جيد لأرضك ومحاصيلك.",
  openReport: "افتح التقرير",
  askAQuestion: "اطرح سؤالاً",

  waterQuestionTitle: "هل عندي ما يكفي من الماء؟",
  notInMonth: "ليس في شهر {month}.",
  yesEnoughWater: "نعم، مضختك تكفي في شهر {month}.",
  hottestMonthSubtitle: "{month} هو أحر شهر. هذا ما تحتاجه من الماء كل يوم:",
  pumpDetailFormula: "مضختك تعطي ({flow} م³ في الساعة × {hours} ساعات)",
  cupsOfTreesNeed: "هذا حوالي كأس واحد من كل {cups} كؤوس يحتاجها محصولك.",
  whatCanYouDo: "ماذا يمكنك أن تفعل؟",
  optBiggerPump: "أحضر مضخة أكبر",
  optBiggerPumpDesc: "حوالي {needed} م³ في الساعة. مضختك تعطي {current}.",
  optPumpLonger: "ضخ لساعات أطول كل يوم",
  optPumpLongerDesc: "ستحتاج إلى {needed} ساعة في اليوم في {month}. أنت تضخ {current} ساعات الآن.",
  optSecondSource: "ابحث عن مصدر ماء ثانٍ",
  optSecondSourcePhone: "الأقرب: {name} على بعد {dist}.",
  optSecondSourceDesktop: "شاهد مصادر الماء القريبة بالأسفل.",
  waterNearYou: "مصادر الماء القريبة منك",
  showingTopSources: "عرض أهم {shown} أماكن من أصل {total} على الخريطة",
  colPlace: "المكان",
  colHowFar: "المسافة",
  colHowHardToPump: "صعوبة الضخ",
  colStatus: "الحالة",
  easySameHeight: "سهل: نفس الارتفاع تقريباً",
  easyHigher: "سهل: أعلى من مزرعتك بـ {m} م",
  hardLower: "صعب: أخفض من مزرعتك بـ {m} م",
  heightUnknown: "تحقّق من الارتفاع ميدانياً",
  waterCheckWarning: "نقطة الماء على الخريطة قد تكون جافة أو مالحة أو خاصة. عاينها بنفسك قبل الشراء.",
  forYourEngineerTitle: "لمهندسك: التفاصيل التقنية والمصادر",
  howDoWeKnowTitle: "كيف نعرف ذلك؟",

  sunQuestionTitle: "هل تكفي الشمس لتشغيل مضختي؟",
  yesMostOfYear: "نعم، معظم أيام العام.",
  yesOverFullYear: "نعم، على مدار العام الكامل.",
  withYourPanelsFullYear: "مع ألواحك بقدرة {kw} كيلوواط (حوالي {panels} لوحاً) خلال عام كامل:",
  sunMakes: "الشمس تنتج",
  pumpUses: "المضخة تستهلك",
  kwhUnit: "كيلوواط ساعة",
  kwhAYear: "كيلوواط ساعة في السنة",
  extraWinterPowerNote: "يوجد فائض في الشتاء، لكن لا يمكن حفظه للصيف دون صهريج أو بطارية.",
  notEnoughInMonth: "لكن لا تكفي في شهر {month}.",
  treesDrinkMostWhenHot: "المحاصيل تشرب أكثر عند الحر. الشمس تغطي {units} من كل 10 وحدات تحتاجها مضختك.",
  missingInMonthKwh: "النقص في {month}: حوالي {kwh} كيلوواط ساعة.",
  howToCoverSummer: "كيف تغطي نقص الصيف؟",
  optWaterTank: "خزّن الماء في صهريج",
  optWaterTankDesc: "ضخ في الأيام المشمسة واسقِ لاحقاً. الحجم حوالي {m3} م³.",
  usuallyCheapest: "الأقل تكلفة غالباً",
  optBattery: "بطارية",
  optBatteryDesc: "تخزين الكهرباء للضخ مساءً. حوالي {kwh} كيلوواط ساعة.",
  optGridOrGen: "احتفظ بالشبكة أو المولد",
  optGridOrGenDesc: "للأشهر الحارة فقط.",
  yourPanelsCard: "ألواحك الشمسية",
  panelSizeLabel: "القدرة",
  panelSizeVal: "{kw} كيلوواط (حوالي {panels} لوحاً)",
  facingLabel: "الاتجاه",
  facingSouth: "نحو الجنوب",
  angleLabel: "الميل",
  angleGoodArea: "{deg}° (مناسب لمنطقتك)",
  changeMyPanels: "تعديل ألواحي",

  weatherQuestionTitle: "هل أسقي اليوم؟",
  yesWaterAsNormal: "نعم، اسقِ كالمعتاد.",
  skipRainComing: "تمهل — هناك مطر متوقع اليوم.",
  soilLosesMmDay: "لا أمطار قادمة. الشمس والرياح تأخذ حوالي {mm} مم من ماء التربة كل يوم.",
  rainComingTodayDetail: "يتوقع هطول حوالي {mm} مم من المطر اليوم. تفقد التربة قبل تشغيل المضخة.",
  next4Days: "الأيام الأربعة القادمة",
  todayLabel: "اليوم",
  warningsTitle: "التحذيرات",
  noFrost: "لا صقيع",
  frostAlert: "خطر صقيع",
  noHeatWave: "لا موجة حر",
  heatAlert: "موجة حر",
  noStrongWind: "لا رياح قوية",
  windAlert: "رياح قوية",
  alertNoticeHint: "سننبهك هنا إذا اقترب صقيع أو حر شديد أو عاصفة.",
  lastYearLabel: "العام الماضي:",
  lastYearRainSummary: "{annual} مم من المطر، منها {summer} مم فقط في الصيف. خطط لماء الصيف باكراً.",

  askTitle: "اسأل عن مزرعتك",
  askSubtitle: "اكتب أو تحدث. الإجابات تعتمد على بيانات مزرعتك الحقيقية.",
  listenBtn: "استمع",
  stopListeningBtn: "إيقاف",
  seeSunPowerLink: "شاهد طاقة الشمس",
  seeWaterLink: "شاهد الماء",
  whatIKnowAboutFarm: "ما أعرفه عن مزرعتك",
  somethingWrongFixIt: "هناك خطأ؟ صحّحه",
  otherFarmersAsk: "أسئلة يطرحها فلاحون آخرون",
  typeYourQuestion: "اكتب سؤالك…",
  speakYourQuestion: "تحدث بسؤالك",
  sampleQ1: "هل أرضي مناسبة للزيتون؟",
  sampleQ2: "متى يجب أن أزرع؟",
  sampleQ3: "ما هي أكبر المخاطر عندي؟",
  sampleQ4: "هل نقطة الماء صالحة للاستعمال؟",

  reportQuestionTitle: "هل هذه المزرعة اختيار جيد؟",
  landAndClimate: "الأرض والمناخ",
  bestCropsForPlace: "أفضل المحاصيل لهذا المكان",
  checkInPersonTitle: "تأكّد بنفسك قبل الشراء",
  checkPointAllYear: "هل يوجد ماء في نقطة الماء طول العام؟",
  checkSoilTest: "تحليل التربة: نسبة الملوحة واحتفاظها بالماء",
  checkGroundwaterDepth: "ما هو عمق المياه الجوفية؟",
  savePdfBtn: "حفظ PDF",
  sendToEngineerBtn: "إرسال لمهندسي",
  yourCropTag: "(محصولك)",

  addFarmTitle: "أضف مزرعتي",
  myFarmTitle: "مزرعتي",
  threeShortSteps: "3 خطوات قصيرة. تجاوز ما لا تعرفه: سنضع تقديراً آمناً ونخبرك به.",
  step1Where: "المكان",
  step1WhereSub: "الموقع والمساحة",
  step2WhatGrow: "ماذا تزرع",
  step2WhatGrowSub: "المحاصيل والمساحة",
  step3Water: "الماء",
  step3WaterSub: "البئر، المضخة، الألواح (اختياري)",
  whereIsYourFarm: "أين تقع مزرعتك؟",
  standOnLandHint: "قف في أرضك واضغط الزر الأخضر. نحن نتولى الباقي.",
  iAmOnMyFarmNow: "أنا في مزرعتي الآن",
  useMyLocation: "استعمل موقعي",
  nearestVillageOrTown: "أقرب قرية أو مدينة",
  villagePlaceholder: "مثال: قربة",
  skipIfDontKnow: "تجاوز إذا لم تكن متأكداً",
  ourEstimateBadge: "تقديرنا",
  saveFarmBtn: "حفظ مزرعتي",
  deleteFarmConfirm: "هل تريد حذف \"{name}\"؟ سيتم مسح بيانات الأرض نهائياً.",
};

export const TRANSLATIONS: Record<AppLanguage, TranslationStrings> = {
  en: EN_STRINGS,
  fr: FR_STRINGS,
  ar: AR_STRINGS,
};

export function formatTemplate(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`
  );
}
