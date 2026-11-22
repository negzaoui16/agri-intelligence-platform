import type { AppLanguage } from "./translations";

export interface FarmBrainStrings {
  // Navigation & Home shortcuts
  navGroupLabel: string;
  navFarmBrain: string;
  navSimulator: string;
  homeCardTitle: string;
  homeCardSubtitle: string;
  homeOpenSavings: string;
  homeOpenSimulator: string;

  // FarmBrain Savings Analysis page (/farmbrain)
  brainPageTitle: string;
  brainPageSubtitle: string;
  recalculateBtn: string;
  recalculatingBtn: string;
  loadingBrain: string;
  noFarmSelected: string;
  goToMyFarm: string;

  // Savings Hero & KPI Cards
  waterSavedTitle: string;
  litresUnit: string;
  m3Unit: string;
  energySavedTitle: string;
  kwhUnit: string;
  timeSavedTitle: string;
  hoursUnit: string;
  moneySavedTitle: string;
  tndUnit: string;
  tariffsNeededNote: string;
  solarFreeElectricityBadge: string;

  // Tariff Editor
  tariffTitle: string;
  tariffSubtitle: string;
  waterTariffLabel: string;
  electricityTariffLabel: string;
  saveTariffsBtn: string;

  // Verification Tier
  trackingTitle: string;
  tierInitial: string;
  tierSensorUpdated: string;
  tierVerifiedActual: string;
  observedCyclesLabel: string;
  observedHoursLabel: string;

  // 7-Day Soil Forecast & Plot Table
  forecastTitle: string;
  forecastSubtitle: string;
  moistureChartLabel: string;
  recommendedWaterLabel: string;
  plotsTitle: string;
  withoutSmartLabel: string;
  withSmartLabel: string;

  // Recommendations (3-part explanations)
  adviceTitle: string;
  whatIsHappening: string;
  whyLabel: string;
  whatToDo: string;
  sensorAnomalyAlert: string;

  // Data Completeness & Provenance
  completenessTitle: string;
  completenessMissingHint: string;
  provMeasured: string;
  provFarmerProvided: string;
  provEstimated: string;
  provDefault: string;

  // Engineer Drawer
  engineerToggleLabel: string;
  engineerSubtitle: string;
  mlModelsHeading: string;

  // Simulator Page (/simulator)
  simPageTitle: string;
  simPageSubtitle: string;
  simSafetyBanner: string;
  chooseScenarioHeading: string;

  // 5 Scenarios
  scenWaterShortage: string;
  scenWaterShortageDesc: string;
  scenChangeCrop: string;
  scenChangeCropDesc: string;
  scenWeather: string;
  scenWeatherDesc: string;
  scenStrategy: string;
  scenStrategyDesc: string;
  scenExpansion: string;
  scenExpansionDesc: string;

  // Scenario Inputs
  scenarioNameLabel: string;
  availableWaterLabel: string;
  customLitresLabel: string;
  pickPlotLabel: string;
  newCropLabel: string;
  tempShiftLabel: string;
  rainShiftLabel: string;
  humidityShiftLabel: string;
  strategyLabel: string;
  stratCurrent: string;
  stratDaily: string;
  stratEvery2Days: string;
  stratMoistureTrigger: string;
  stratAiOptimized: string;
  thresholdLabel: string;
  addedAreaLabel: string;
  addedCropLabel: string;
  runAndSaveBtn: string;
  runningSimBtn: string;
  resetInputsBtn: string;

  // Simulator Results & Comparison
  resultHeadline: string;
  waterImpactLabel: string;
  energyImpactLabel: string;
  costImpactLabel: string;
  yieldImpactLabel: string;
  pumpCheckLabel: string;
  pumpOkLabel: string;
  pumpOverloadLabel: string;
  hoursPerDayUnit: string;
  allocationHeading: string;
  trajectoryHeading: string;
  savedScenariosHeading: string;
  compareSelectedBtn: string;
  comparingBtn: string;
  deleteScenarioBtn: string;
  openScenarioBtn: string;
  comparisonHeading: string;
  bestWaterBadge: string;
  bestYieldBadge: string;
  bestOverallBadge: string;
  noSavedScenarios: string;
}

const EN: FarmBrainStrings = {
  navGroupLabel: "FarmBrain AI",
  navFarmBrain: "Farm Potential",
  navSimulator: "Decision Simulator",
  homeCardTitle: "FarmBrain Smart Advisor",
  homeCardSubtitle: "See how much water, power, and time you can save — or test a change safely first.",
  homeOpenSavings: "See my savings",
  homeOpenSimulator: "Try a change",

  brainPageTitle: "What FarmBrain Can Save You",
  brainPageSubtitle: "Real numbers built automatically from your farm, crops, weather, and sensors.",
  recalculateBtn: "Refresh Analysis",
  recalculatingBtn: "Refreshing…",
  loadingBrain: "Loading your FarmBrain analysis…",
  noFarmSelected: "Add your farm first so FarmBrain can calculate your savings.",
  goToMyFarm: "Go to My Farm",

  waterSavedTitle: "Water saved each year",
  litresUnit: "litres/yr",
  m3Unit: "m³/yr",
  energySavedTitle: "Electricity saved",
  kwhUnit: "kWh/yr",
  timeSavedTitle: "Time saved in fields",
  hoursUnit: "hours/yr",
  moneySavedTitle: "Estimated money saved",
  tndUnit: "TND/yr",
  tariffsNeededNote: "Enter your water & STEG rates below to see TND",
  solarFreeElectricityBadge: "Solar runs your pump for free (0 TND electricity bill)",

  tariffTitle: "Your local water & electricity rates (optional)",
  tariffSubtitle: "Leave blank if unsure — we never guess your local prices.",
  waterTariffLabel: "Water price (TND per m³)",
  electricityTariffLabel: "STEG electricity (TND per kWh)",
  saveTariffsBtn: "Update with rates",

  trackingTitle: "How we verify your savings",
  tierInitial: "Starting estimate (from farm profile)",
  tierSensorUpdated: "Live-updated from your field sensor",
  tierVerifiedActual: "Verified from actual pump runs",
  observedCyclesLabel: "Pump runs (last 24h)",
  observedHoursLabel: "Pump hours (last 24h)",

  forecastTitle: "Next 7 days in your soil",
  forecastSubtitle: "Predicted root wetness and daily watering needs from local weather and sensor trends.",
  moistureChartLabel: "Soil moisture (%)",
  recommendedWaterLabel: "Water needed (mm)",
  plotsTitle: "Savings by crop plot",
  withoutSmartLabel: "Fixed schedule",
  withSmartLabel: "With FarmBrain",

  adviceTitle: "Plain advice for your farm",
  whatIsHappening: "What is happening",
  whyLabel: "Why",
  whatToDo: "What to do",
  sensorAnomalyAlert: "Check your field sensor wire",

  completenessTitle: "Your farm data score",
  completenessMissingHint: "More real details make your savings estimate sharper.",
  provMeasured: "Measured by sensor",
  provFarmerProvided: "Entered by you",
  provEstimated: "Weather / map estimate",
  provDefault: "Standard crop default",

  engineerToggleLabel: "For engineers & advisors",
  engineerSubtitle: "ML evaluation metrics, crop models, and methodology limits",
  mlModelsHeading: "Trained ML models (strict chronological validation)",

  simPageTitle: "Try a Change Before You Spend",
  simPageSubtitle: "Test ideas on a safe digital copy of your farm without touching your pump or real data.",
  simSafetyBanner: "Safe simulation mode — changes here never turn on your pump or overwrite your farm profile.",
  chooseScenarioHeading: "1. What would you like to test?",

  scenWaterShortage: "Water Shortage",
  scenWaterShortageDesc: "Limited water available today — share it to protect crops.",
  scenChangeCrop: "Change Crop",
  scenChangeCropDesc: "Compare another crop on one of your plots.",
  scenWeather: "Hotter / Drier Weather",
  scenWeatherDesc: "See how extra heat or less rain affects water demand.",
  scenStrategy: "Watering Schedule",
  scenStrategyDesc: "Compare daily, every 2 days, sensor-trigger, and AI schedules.",
  scenExpansion: "Expand Farm Area",
  scenExpansionDesc: "Check if your pump and solar can handle more land.",

  scenarioNameLabel: "Name this test",
  availableWaterLabel: "How much water do you have today?",
  customLitresLabel: "Custom litres/day",
  pickPlotLabel: "Which plot?",
  newCropLabel: "New crop to try",
  tempShiftLabel: "Temperature change (°C)",
  rainShiftLabel: "Rain change (%)",
  humidityShiftLabel: "Humidity change (%)",
  strategyLabel: "Schedule to test",
  stratCurrent: "Current habit",
  stratDaily: "Small amount every day",
  stratEvery2Days: "Every 2 days",
  stratMoistureTrigger: "Only when soil drops below %",
  stratAiOptimized: "FarmBrain smart timing",
  thresholdLabel: "Trigger at soil wetness (%)",
  addedAreaLabel: "Extra hectares to add",
  addedCropLabel: "Crop for new land",
  runAndSaveBtn: "Run & Save Test",
  runningSimBtn: "Running…",
  resetInputsBtn: "Reset",

  resultHeadline: "Test Result",
  waterImpactLabel: "Water change",
  energyImpactLabel: "Power change",
  costImpactLabel: "Cost change",
  yieldImpactLabel: "Harvest effect",
  pumpCheckLabel: "Pump capacity check",
  pumpOkLabel: "Pump can handle it",
  pumpOverloadLabel: "Pump too small / overloaded",
  hoursPerDayUnit: "h/day at peak",
  allocationHeading: "Smart water split by plot (prioritized, not equal split)",
  trajectoryHeading: "30-day soil wetness path",
  savedScenariosHeading: "Saved tests — compare side by side",
  compareSelectedBtn: "Compare selected",
  comparingBtn: "Comparing…",
  deleteScenarioBtn: "Delete",
  openScenarioBtn: "Load",
  comparisonHeading: "Side-by-side comparison",
  bestWaterBadge: "Saves most water",
  bestYieldBadge: "Protects harvest best",
  bestOverallBadge: "Best balance",
  noSavedScenarios: "Run a test above to save and compare options here.",
};

const FR: FarmBrainStrings = {
  navGroupLabel: "FarmBrain IA",
  navFarmBrain: "Potentiel & Économies",
  navSimulator: "Simulateur Décisions",
  homeCardTitle: "Conseiller Intelligent FarmBrain",
  homeCardSubtitle: "Voyez l'eau, l'énergie et le temps économisés — ou testez un changement sans risque.",
  homeOpenSavings: "Voir mes économies",
  homeOpenSimulator: "Tester un changement",

  brainPageTitle: "Ce que FarmBrain Peut Économiser",
  brainPageSubtitle: "Calculé automatiquement à partir de votre ferme, vos cultures, la météo et vos capteurs.",
  recalculateBtn: "Actualiser l'analyse",
  recalculatingBtn: "Actualisation…",
  loadingBrain: "Chargement de votre analyse FarmBrain…",
  noFarmSelected: "Ajoutez d'abord votre ferme pour calculer vos économies.",
  goToMyFarm: "Aller à Ma Ferme",

  waterSavedTitle: "Eau économisée par an",
  litresUnit: "litres/an",
  m3Unit: "m³/an",
  energySavedTitle: "Électricité économisée",
  kwhUnit: "kWh/an",
  timeSavedTitle: "Temps gagné aux champs",
  hoursUnit: "heures/an",
  moneySavedTitle: "Économie estimée",
  tndUnit: "DT/an",
  tariffsNeededNote: "Entrez vos tarifs eau & STEG ci-dessous pour voir en DT",
  solarFreeElectricityBadge: "Le solaire couvre votre pompe (0 DT d'électricité)",

  tariffTitle: "Vos tarifs locaux eau et électricité (facultatif)",
  tariffSubtitle: "Laissez vide en cas de doute — nous ne devinons jamais vos tarifs.",
  waterTariffLabel: "Prix de l'eau (DT par m³)",
  electricityTariffLabel: "Tarif STEG (DT par kWh)",
  saveTariffsBtn: "Mettre à jour",

  trackingTitle: "Suivi des économies réelles",
  tierInitial: "Estimation initiale (profil de ferme)",
  tierSensorUpdated: "Mise à jour en direct par capteur",
  tierVerifiedActual: "Vérifié sur les cycles réels de la pompe",
  observedCyclesLabel: "Démarrages pompe (24h)",
  observedHoursLabel: "Heures de pompage (24h)",

  forecastTitle: "Les 7 prochains jours dans votre sol",
  forecastSubtitle: "Humidité prévue des racines et besoins journaliers selon météo et capteur.",
  moistureChartLabel: "Humidité sol (%)",
  recommendedWaterLabel: "Arrosage conseillé (mm)",
  plotsTitle: "Économies par parcelle",
  withoutSmartLabel: "Habitude fixe",
  withSmartLabel: "Avec FarmBrain",

  adviceTitle: "Conseils simples pour votre ferme",
  whatIsHappening: "Ce qui se passe",
  whyLabel: "Pourquoi",
  whatToDo: "Quoi faire",
  sensorAnomalyAlert: "Vérifiez le fil du capteur au champ",

  completenessTitle: "Qualité des données de la ferme",
  completenessMissingHint: "Plus de données réelles donnent une estimation encore plus juste.",
  provMeasured: "Mesuré par capteur",
  provFarmerProvided: "Saisi par vous",
  provEstimated: "Estimation météo / carte",
  provDefault: "Référence standard culture",

  engineerToggleLabel: "Pour ingénieurs & conseillers",
  engineerSubtitle: "Métriques des modèles ML, modèles agronomiques et limites",
  mlModelsHeading: "Modèles ML entraînés (validation chronologique stricte)",

  simPageTitle: "Testez un Changement Avant d'Investir",
  simPageSubtitle: "Essayez vos idées sur une copie virtuelle sans toucher à votre pompe ni à vos données.",
  simSafetyBanner: "Mode simulation sûr — n'allume jamais la pompe et ne modifie pas votre ferme.",
  chooseScenarioHeading: "1. Que souhaitez-vous tester ?",

  scenWaterShortage: "Manque d'Eau",
  scenWaterShortageDesc: "Eau limitée aujourd'hui — répartir au mieux pour sauver la récolte.",
  scenChangeCrop: "Changer de Culture",
  scenChangeCropDesc: "Comparer une nouvelle culture sur l'une de vos parcelles.",
  scenWeather: "Chaleur / Sécheresse",
  scenWeatherDesc: "Voir l'effet d'une hausse de température ou d'une baisse de pluie.",
  scenStrategy: "Rythme d'Arrosage",
  scenStrategyDesc: "Comparer arrosage quotidien, tous les 2 jours, par seuil ou par IA.",
  scenExpansion: "Agrandir la Ferme",
  scenExpansionDesc: "Vérifier si votre pompe et vos panneaux suivent la cadence.",

  scenarioNameLabel: "Nommer ce test",
  availableWaterLabel: "Quelle quantité d'eau avez-vous aujourd'hui ?",
  customLitresLabel: "Litres/jour personnalisés",
  pickPlotLabel: "Quelle parcelle ?",
  newCropLabel: "Nouvelle culture à tester",
  tempShiftLabel: "Écart température (°C)",
  rainShiftLabel: "Variation pluie (%)",
  humidityShiftLabel: "Variation humidité (%)",
  strategyLabel: "Rythme à tester",
  stratCurrent: "Rythme actuel",
  stratDaily: "Un peu chaque jour",
  stratEvery2Days: "Tous les 2 jours",
  stratMoistureTrigger: "Uniquement sous le seuil d'humidité",
  stratAiOptimized: "Pilotage intelligent FarmBrain",
  thresholdLabel: "Seuil d'humidité du sol (%)",
  addedAreaLabel: "Hectares supplémentaires",
  addedCropLabel: "Culture de l'extension",
  runAndSaveBtn: "Lancer & Enregistrer",
  runningSimBtn: "Calcul en cours…",
  resetInputsBtn: "Réinitialiser",

  resultHeadline: "Résultat du Test",
  waterImpactLabel: "Effet sur l'eau",
  energyImpactLabel: "Effet sur l'énergie",
  costImpactLabel: "Impact financier",
  yieldImpactLabel: "Effet sur la récolte",
  pumpCheckLabel: "Capacité de la pompe",
  pumpOkLabel: "La pompe suit le besoin",
  pumpOverloadLabel: "Pompe insuffisante au pic",
  hoursPerDayUnit: "h/jour au pic",
  allocationHeading: "Répartition prioritaire par parcelle (optimisée, pas égale)",
  trajectoryHeading: "Évolution de l'humidité sur 30 jours",
  savedScenariosHeading: "Tests enregistrés — comparer",
  compareSelectedBtn: "Comparer la sélection",
  comparingBtn: "Comparaison…",
  deleteScenarioBtn: "Supprimer",
  openScenarioBtn: "Charger",
  comparisonHeading: "Comparaison côte à côte",
  bestWaterBadge: "Économise le plus d'eau",
  bestYieldBadge: "Protège le mieux la récolte",
  bestOverallBadge: "Meilleur équilibre",
  noSavedScenarios: "Lancez un test ci-dessus pour l'enregistrer et le comparer.",
};

const AR: FarmBrainStrings = {
  navGroupLabel: "العقل الذكي FarmBrain",
  navFarmBrain: "فرص التوفير",
  navSimulator: "تجربة القرارات",
  homeCardTitle: "مستشار FarmBrain الذكي",
  homeCardSubtitle: "شوف قداش تنجم توفر ماء وضوء ووقت — وإلا جرب أي تغيير قبل ما تصرف.",
  homeOpenSavings: "شوف التوفير متاعي",
  homeOpenSimulator: "جرب تغيير",

  brainPageTitle: "قداش تنجم توفر في فيرمتك",
  brainPageSubtitle: "حسابات مبنية أوتوماتيكياً من أرضك، نباتاتك، الطقس، والحساسات.",
  recalculateBtn: "تحديث الحساب",
  recalculatingBtn: "جارٍ التحديث…",
  loadingBrain: "جارٍ تحميل تحليل FarmBrain…",
  noFarmSelected: "أضف مزرعتك أولاً باش يحسبلك FarmBrain التوفير.",
  goToMyFarm: "امشي لمزرعتي",

  waterSavedTitle: "الماء الموفر في العام",
  litresUnit: "لتر/سنة",
  m3Unit: "م³/سنة",
  energySavedTitle: "الضوء / الطاقة الموفرة",
  kwhUnit: "كيلوواط ساعة/سنة",
  timeSavedTitle: "الوقت الموفر في الحقل",
  hoursUnit: "ساعة/سنة",
  moneySavedTitle: "التوفير التقديري بالدينار",
  tndUnit: "د.ت/سنة",
  tariffsNeededNote: "أدخل تسعيرة الماء و STEG لتظهر الحسبة بالدينار",
  solarFreeElectricityBadge: "الطاقة الشمسية تشغّل المضخة مجاناً (0 د.ت كهرباء)",

  tariffTitle: "أسعار الماء والضوء في منطقتك (اختياري)",
  tariffSubtitle: "إذا ما تعرفش السعر خلّيه فارغ — ما نخمنوش أسعار من راسنا.",
  waterTariffLabel: "سعر الماء (دينار للمتر المكعب)",
  electricityTariffLabel: "تسعيرة STEG (دينار للكيلوواط ساعة)",
  saveTariffsBtn: "تحديث بالأسعار",

  trackingTitle: "كيفاش نثبّتوا في التوفير الحقيقي",
  tierInitial: "تقدير أولي (من معطيات الفيرمة)",
  tierSensorUpdated: "محيّن مباشرة من حساس التربة",
  tierVerifiedActual: "مثبّت من عمل المضخة الفعلي",
  observedCyclesLabel: "مرات تشغيل المضخة (24 ساعة)",
  observedHoursLabel: "ساعات عمل المضخة (24 ساعة)",

  forecastTitle: "توقعات التربة لـ 7 أيام الجاية",
  forecastSubtitle: "نسبة بلل التربة المتوقعة وحاجة السقي اليومية حسب الطقس والحساس.",
  moistureChartLabel: "رطوبة التربة (%)",
  recommendedWaterLabel: "الماء المطلوب (مم)",
  plotsTitle: "التوفير حسب كل قطعة",
  withoutSmartLabel: "بالطريقة العادية",
  withSmartLabel: "مع FarmBrain",

  adviceTitle: "نصائح واضحة لفيرمتك",
  whatIsHappening: "شنوة قاعد يصير",
  whyLabel: "علاش",
  whatToDo: "شنوة تعمل",
  sensorAnomalyAlert: "تثبّت من سلك حساس التربة",

  completenessTitle: "نسبة اكتمال معطيات فيرمتك",
  completenessMissingHint: "كل ما تعمّر معطيات حقيقية أكثر، النتيجة تكون أدق.",
  provMeasured: "مقاس بالحساس",
  provFarmerProvided: "مدخل من الفلاح",
  provEstimated: "تقدير بالطقس / الخريطة",
  provDefault: "قيمة علمية افتراضية",

  engineerToggleLabel: "للمهندسين والمرشدين الفلاحيين",
  engineerSubtitle: "دقة نماذج الذكاء الاصطناعي، نماذج النمو، وحدود الحساب",
  mlModelsHeading: "نماذج التعلّم الآلي (اختبار زمني حقيقي)",

  simPageTitle: "جرب تغيير قبل ما تصرف فلوسك",
  simPageSubtitle: "اختبر أفكارك على نسخة افتراضية آمنة بلا ما تمس المضخة ولا معطياتك.",
  simSafetyBanner: "وضع محاكاة آمن — لا يمس المضخة الحقيقية ولا يغيّر معطيات مزرعتك.",
  chooseScenarioHeading: "1. شنوة تحب تجرب اليوم؟",

  scenWaterShortage: "نقص الماء",
  scenWaterShortageDesc: "كمية ماء محدودة — كيفاش نقسموها باش نحميو الصابة.",
  scenChangeCrop: "تبديل النبتة",
  scenChangeCropDesc: "قارن زراعة نوع جديد في وحدة من القطع.",
  scenWeather: "سخانة أو شح المطر",
  scenWeatherDesc: "شوف تأثير زيادة الحرارة ولا نقص المطر على حاجة السقي.",
  scenStrategy: "برنامج السقي",
  scenStrategyDesc: "قارن السقي كل يوم، كل يومين، بالحساس، ولا بالذكاء الاصطناعي.",
  scenExpansion: "توسيع الفيرمة",
  scenExpansionDesc: "شوف كان مضختك والطاقة الشمسية يكفيو مساحة جديدة.",

  scenarioNameLabel: "سمّي هذه التجربة",
  availableWaterLabel: "قداش عندك ماء متوفر اليوم؟",
  customLitresLabel: "لتر/يوم مخصص",
  pickPlotLabel: "أنهي قطعة؟",
  newCropLabel: "النبتة الجديدة للتجربة",
  tempShiftLabel: "تغيّر الحرارة (°م)",
  rainShiftLabel: "تغيّر المطر (%)",
  humidityShiftLabel: "تغيّر الرطوبة (%)",
  strategyLabel: "الطريقة اللي تحب تجربها",
  stratCurrent: "العادة الحالية",
  stratDaily: "شوية كل يوم",
  stratEvery2Days: "نهار بعد نهار",
  stratMoistureTrigger: "كان كي تنشف التربة تحت %",
  stratAiOptimized: "توقيت FarmBrain الذكي",
  thresholdLabel: "حد رطوبة التربة (%)",
  addedAreaLabel: "الهكتارات الزايدة",
  addedCropLabel: "نبتة المساحة الجديدة",
  runAndSaveBtn: "شغّل واحفظ التجربة",
  runningSimBtn: "جارٍ الحساب…",
  resetInputsBtn: "إعادة ضبط",

  resultHeadline: "نتيجة التجربة",
  waterImpactLabel: "تأثير على الماء",
  energyImpactLabel: "تأثير على الطاقة",
  costImpactLabel: "التأثير المالي",
  yieldImpactLabel: "تأثير على الصابة",
  pumpCheckLabel: "فحص قدرة المضخة",
  pumpOkLabel: "المضخة تكفي",
  pumpOverloadLabel: "المضخة ضعيفة في الذروة",
  hoursPerDayUnit: "ساعة/يوم في الذروة",
  allocationHeading: "توزيع الماء الذكي حسب أولوية كل نبتة (مش تقسيم متساوي)",
  trajectoryHeading: "مسار رطوبة التربة لـ 30 يوم",
  savedScenariosHeading: "التجارب المحفوظة — قارن بيناتها",
  compareSelectedBtn: "قارن المختارين",
  comparingBtn: "جارٍ المقارنة…",
  deleteScenarioBtn: "حذف",
  openScenarioBtn: "فتح",
  comparisonHeading: "مقارنة جنب إلى جنب",
  bestWaterBadge: "أكثر توفير للماء",
  bestYieldBadge: "أفضل حماية للصابة",
  bestOverallBadge: "أفضل توازن",
  noSavedScenarios: "شغّل تجربة لفوق باش تحفظها وتقارن بين الحلول هنا.",
};

export const FARMBRAIN_STRINGS: Record<AppLanguage, FarmBrainStrings> = {
  en: EN,
  fr: FR,
  ar: AR,
};

const COMPLETENESS_LABEL_MAP: Record<string, { en: string; fr: string; ar: string }> = {
  location_boundary: {
    en: "Farm location & field boundary",
    fr: "Emplacement et limites des parcelles",
    ar: "موقع الفيرمة وحدود الأرض",
  },
  crops_plots: {
    en: "Registered crops & plot areas",
    fr: "Cultures et surfaces enregistrées",
    ar: "الزراعات ومساحة كل قطعة",
  },
  planting_stage: {
    en: "Planting dates & growth stages",
    fr: "Dates de plantation et stades",
    ar: "تواريخ الزراعة ومراحل النمو",
  },
  soil_profile: {
    en: "Soil texture & water capacity",
    fr: "Type de sol et réserve en eau",
    ar: "نوع التربة وقدرتها على حفظ الماء",
  },
  pump_specs: {
    en: "Pump flow & pipe setup",
    fr: "Débit de pompe et tuyaux",
    ar: "قوة المضخة والأنابيب",
  },
  solar_setup: {
    en: "Solar power configuration",
    fr: "Équipement solaire",
    ar: "تجهيزات الطاقة الشمسية",
  },
  water_source: {
    en: "Water source",
    fr: "Source d'eau",
    ar: "مصدر الماء",
  },
  live_sensor: {
    en: "ESP32 live soil & weather sensor",
    fr: "Capteur champ ESP32 en direct",
    ar: "حساس التربة والطقس المباشر",
  },
};

export function localizeCompletenessLabel(
  key: string,
  fallbackLabel: string,
  lang: AppLanguage
): string {
  return COMPLETENESS_LABEL_MAP[key]?.[lang] ?? fallbackLabel;
}

export function localizeTrackingExplanation(
  tier: "INITIAL_PROJECTION" | "SENSOR_UPDATED_PROJECTION" | "VERIFIED_ACTUAL",
  cycles24h: number,
  hours24h: number,
  fallback: string,
  lang: AppLanguage
): string {
  if (lang === "en") return fallback;
  if (lang === "fr") {
    if (tier === "VERIFIED_ACTUAL") {
      return `Mesuré sur les dernières 24h (${cycles24h} démarrage(s) de pompe, ${hours24h} h de marche).`;
    }
    if (tier === "SENSOR_UPDATED_PROJECTION") {
      return "Estimation actualisée avec la dernière lecture de votre capteur terrain.";
    }
    return "Basé sur le profil de votre ferme et le climat local. Connectez un capteur ESP32 pour vérifier sur le terrain.";
  }
  if (tier === "VERIFIED_ACTUAL") {
    return `محسوب من قراءات الحساس في آخر 24 ساعة (${cycles24h} مرة تشغيل مضخة، ${hours24h} ساعة عمل).`;
  }
  if (tier === "SENSOR_UPDATED_PROJECTION") {
    return "تقدير محيّن حسب آخر قراءة من حساس الحقل المتصل.";
  }
  return "مبني على معطيات فيرمتك والطقس المحلي. اربط حساس التربة باش نثبّتوا التوفير الفعلي.";
}

export function localizeAnomalyReason(reason: string | null, lang: AppLanguage): string | null {
  if (!reason) return null;
  if (lang === "en") return reason;
  if (lang === "fr") {
    return "La lecture brute du capteur de sol semble anormale (hors plage ou fil coupé). Vérifiez le câble avant d'arroser.";
  }
  return "قراءة حساس التربة غير طبيعية (ممكن سلك مقطوع أو تلامس ضعيف). تثبّت من كابل الحساس في الصندوق قبل ما تسقي.";
}

export function localizeBrainRecommendation(
  rec: {
    id: string;
    whatIsHappening: string;
    why: string;
    whatToDo: string;
    estimatedImpact?: string;
  },
  savings: { waterSavedLitresYr: number; waterSavedM3Yr: number; waterSavingsPct: number; energySavedKwhYr: number },
  lang: AppLanguage
): { whatIsHappening: string; why: string; whatToDo: string; estimatedImpact?: string } {
  if (lang === "en") return rec;
  if (lang === "fr") {
    if (rec.id === "rec_water_savings") {
      return {
        whatIsHappening: `Vous pouvez économiser environ ${savings.waterSavedLitresYr.toLocaleString()} L (${savings.waterSavedM3Yr.toLocaleString()} m³) d'eau par an (${savings.waterSavingsPct}%).`,
        why: "Arroser uniquement lorsque les racines en ont besoin évite les pertes en profondeur.",
        whatToDo: "Suivez l'humidité réelle et les besoins météo au lieu d'un programme fixe.",
        estimatedImpact: `-${savings.waterSavingsPct}% eau · -${savings.energySavedKwhYr} kWh/an`,
      };
    }
    if (rec.id === "rec_sensor_anomaly") {
      return {
        whatIsHappening: "La lecture de votre capteur de sol semble anormale.",
        why: "Un câble desserré ou un capteur hors sol donne une mesure invalide.",
        whatToDo: "Vérifiez la sonde et la prise du boîtier ESP32.",
      };
    }
    if (rec.id === "rec_rain_skip") {
      return {
        whatIsHappening: "De la pluie est prévue dans les prochains jours.",
        why: "Arroser juste avant une bonne pluie gaspille l'eau et l'énergie de pompage.",
        whatToDo: "Décalez l'arrosage et vérifiez l'humidité du sol après la pluie.",
      };
    }
    if (rec.id === "rec_solar_free") {
      return {
        whatIsHappening: "Vos panneaux solaires couvrent déjà l'électricité de la pompe.",
        why: "L'énergie solaire rend le pompage gratuit ; le vrai gain porte sur l'eau et l'usure.",
        whatToDo: "Privilégiez l'arrosage durant les heures ensoleillées ou via votre bassin.",
      };
    }
    return rec;
  }

  // Arabic (Tunisian-friendly clear phrasing)
  if (rec.id === "rec_water_savings") {
    return {
      whatIsHappening: `تنجم توفر حوالي ${savings.waterSavedLitresYr.toLocaleString()} لتر (${savings.waterSavedM3Yr.toLocaleString()} م³) من الماء كل عام (${savings.waterSavingsPct}%).`,
      why: "السقي وقت ما تحتاج الجذور فعلاً يمنع ضياع الماء تحت التربة في الأيام السخونة.",
      whatToDo: "تبع رطوبة التربة وحالة الطقس في التطبيق في عوض التوقيت الثابت.",
      estimatedImpact: `-${savings.waterSavingsPct}% ماء · -${savings.energySavedKwhYr} كيلوواط/سنة`,
    };
  }
  if (rec.id === "rec_sensor_anomaly") {
    return {
      whatIsHappening: "قراءة حساس التربة تبان فيها مشكلة.",
      why: "سلك مرخي أو حساس خارج من التربة يعطي رقم غالط.",
      whatToDo: "افحص سلك الحساس والفيشة في علبة الـ ESP32 قبل ما تاخذ قرار السقي.",
    };
  }
  if (rec.id === "rec_rain_skip") {
    return {
      whatIsHappening: "فما مطر متوقع في الأيام الجاية.",
      why: "السقي قبل المطر يضيع ماء البئر والوقت على الفاضي.",
      whatToDo: "أجّل السقي قبل نهار المطر وتفقد رطوبة التربة بعد ما تصب.",
    };
  }
  if (rec.id === "rec_solar_free") {
    return {
      whatIsHappening: "الألواح الشمسية تغطي كامل ضوء المضخة.",
      why: "الطاقة الشمسية تخلي الضخ مجاني — ربحك الحقيقي هو توفير ماء البئر والوقت وعمر المضخة.",
      whatToDo: "اسقي في أوقات الشمس القوية أو عبّي الشارج/الصهريج نهاراً.",
    };
  }
  return rec;
}

export function localizeSimulationResult(
  res: {
    scenarioType: string;
    headlineOutcome: string;
    waterDeltaM3Season: number;
    waterDeltaPct: number;
    pumpOverloadRisk: boolean;
    pumpRequiredHoursDay: number;
    explanation: {
      whatChanges: string;
      whyItHappens: string;
      whatFarmerShouldDo: string;
    };
  },
  lang: AppLanguage
): {
  headlineOutcome: string;
  whatChanges: string;
  whyItHappens: string;
  whatFarmerShouldDo: string;
} {
  if (lang === "en") {
    return {
      headlineOutcome: res.headlineOutcome,
      whatChanges: res.explanation.whatChanges,
      whyItHappens: res.explanation.whyItHappens,
      whatFarmerShouldDo: res.explanation.whatFarmerShouldDo,
    };
  }

  const absW = Math.abs(res.waterDeltaM3Season).toLocaleString();
  const pct = Math.abs(res.waterDeltaPct);

  if (lang === "fr") {
    const headlineMap: Record<string, string> = {
      WATER_SHORTAGE: "Répartition prioritaire calculée selon la sensibilité de chaque culture.",
      CHANGE_CROP:
        res.waterDeltaM3Season < 0
          ? `Ce changement économise environ ${absW} m³/an (${pct}%).`
          : `Ce changement demande environ +${absW} m³/an d'eau supplémentaire.`,
      WEATHER_CLIMATE:
        res.waterDeltaM3Season >= 0
          ? `Ce climat plus chaud/sec augmente le besoin d'eau de +${absW} m³/an.`
          : `Ce scénario météo réduit le besoin d'eau de ${absW} m³/an.`,
      IRRIGATION_STRATEGY: `Ce rythme d'arrosage modifie l'eau de ${res.waterDeltaM3Season >= 0 ? "+" : "-"}${absW} m³/an.`,
      FARM_EXPANSION: res.pumpOverloadRisk
        ? `Agrandir la ferme demande ${res.pumpRequiredHoursDay} h/jour au pic — la pompe sera surchargée.`
        : `Votre pompe actuelle suffit (${res.pumpRequiredHoursDay} h/jour au pic).`,
    };
    return {
      headlineOutcome: headlineMap[res.scenarioType] ?? res.headlineOutcome,
      whatChanges: `Variation prévue de l'eau : ${res.waterDeltaM3Season >= 0 ? "+" : "-"}${absW} m³/an (${res.waterDeltaPct}%).`,
      whyItHappens:
        res.scenarioType === "WATER_SHORTAGE"
          ? "Couper toutes les parcelles à égalité gaspille l'eau ; nous protégeons d'abord les cultures sensibles."
          : "La chaleur, la taille des racines et le rythme d'arrosage changent l'eau perdue chaque jour.",
      whatFarmerShouldDo: res.pumpOverloadRisk
        ? "Prévoyez un bassin tampon ou arrosez par secteurs séparés avant de planter plus."
        : "Suivez l'humidité réelle du capteur et ajustez la durée de chaque vanne.",
    };
  }

  // Arabic (Tunisian-friendly)
  const headlineArMap: Record<string, string> = {
    WATER_SHORTAGE: "قسمنا الماء المتوفر حسب حساسية كل نبتة باش نحميو الصابة.",
    CHANGE_CROP:
      res.waterDeltaM3Season < 0
        ? `تبديل النبتة هذي يوفر حوالي ${absW} م³ ماء في العام (${pct}%).`
        : `تبديل النبتة هذي يزيد الحاجة بحوالي ${absW} م³ ماء في العام.`,
    WEATHER_CLIMATE:
      res.waterDeltaM3Season >= 0
        ? `السخانة أو شح المطر يزيد حاجة السقي بـ +${absW} م³/سنة.`
        : `تبدّل الطقس ينقّص حاجة السقي بـ ${absW} م³/سنة.`,
    IRRIGATION_STRATEGY: `برنامج السقي هذا يغيّر استهلاك الماء بـ ${res.waterDeltaM3Season >= 0 ? "+" : "-"}${absW} م³/سنة.`,
    FARM_EXPANSION: res.pumpOverloadRisk
      ? `التوسيع يوصل المضخة لـ ${res.pumpRequiredHoursDay} ساعة/يوم في الذروة — تحتاج خزان أو مضخة أقوى.`
      : `مضختك الحالية تكفي (${res.pumpRequiredHoursDay} ساعة/يوم في الذروة).`,
  };
  return {
    headlineOutcome: headlineArMap[res.scenarioType] ?? res.headlineOutcome,
    whatChanges: `التغيّر المتوقع في الماء: ${res.waterDeltaM3Season >= 0 ? "+" : "-"}${absW} م³/سنة (${res.waterDeltaPct}%).`,
    whyItHappens:
      res.scenarioType === "WATER_SHORTAGE"
        ? "تقسيم الماء بالتساوي يضيعو على الأشجار القوية؛ الأولوية للنباتات اللي ما تصبرش على العطش."
        : "السخانة، نوع النبتة، وطريقة السقي يبدلو كمية الماء اللي يتبخر كل يوم.",
    whatFarmerShouldDo: res.pumpOverloadRisk
      ? "قسّم السقي على فانات/أيام مختلفة أو زيد صهريج قبل ما تزرع المساحة الجديدة."
      : "تبع نسبة بلل التربة في الحساس وعدّل وقت السقي حسب النتيجة.",
  };
}

export function localizeAllocationRationale(
  fulfillmentPct: number,
  cropName: string,
  lang: AppLanguage
): string | null {
  if (lang === "en") return null;
  if (lang === "fr") {
    return fulfillmentPct >= 85
      ? `Prioritaire (${Math.round(fulfillmentPct)}% couvert) car ${cropName} est sensible au manque d'eau.`
      : `Réduit à ${Math.round(fulfillmentPct)}% pour préserver les cultures les plus sensibles.`;
  }
  return fulfillmentPct >= 85
    ? `أولوية عالية (${Math.round(fulfillmentPct)}% من الحاجة) على خاطر ${cropName} يتأثر بسرعة بالعطش.`
    : `نقصنا الحصة لـ ${Math.round(fulfillmentPct)}% باش نحميو الزراعات الحساسة.`;
}
