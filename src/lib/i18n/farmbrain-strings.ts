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

const JA: FarmBrainStrings = {
  navGroupLabel: "FarmBrain AI",
  navFarmBrain: "節約ポテンシャル",
  navSimulator: "意思決定シミュレータ",
  homeCardTitle: "FarmBrain スマートアドバイザー",
  homeCardSubtitle: "年間どれくらい水・電気・時間を節約できるか確認し、変更を安全に試せます。",
  homeOpenSavings: "節約額を見る",
  homeOpenSimulator: "変更を試す",

  brainPageTitle: "FarmBrain で節約できる効果",
  brainPageSubtitle: "農園の広さ・作物・天気予報・センサーデータから自動計算された実数値です。",
  recalculateBtn: "分析を更新",
  recalculatingBtn: "更新中…",
  loadingBrain: "FarmBrain 分析を読み込んでいます…",
  noFarmSelected: "節約額を計算するため、まず農園を追加してください。",
  goToMyFarm: "私の農園へ",

  waterSavedTitle: "年間の節水量",
  litresUnit: "リットル/年",
  m3Unit: "m³/年",
  energySavedTitle: "節約できる電力量",
  kwhUnit: "kWh/年",
  timeSavedTitle: "圃場作業の時短",
  hoursUnit: "時間/年",
  moneySavedTitle: "年間節約見込み額",
  tndUnit: "TND/年",
  tariffsNeededNote: "下で水道・電気単価を入力すると金額が表示されます",
  solarFreeElectricityBadge: "太陽光でポンプ電力をすべて賄えます（電気代 0 TND）",

  tariffTitle: "地域の水・電気単価（任意）",
  tariffSubtitle: "不明な場合は空欄のままで構いません（単価を勝手に推測しません）。",
  waterTariffLabel: "水の単価（TND / m³）",
  electricityTariffLabel: "電気単価 STEG（TND / kWh）",
  saveTariffsBtn: "単価で再計算",

  trackingTitle: "節約効果の検証レベル",
  tierInitial: "初期推定（農園プロフィールより）",
  tierSensorUpdated: "圃場センサーでリアルタイム更新済み",
  tierVerifiedActual: "ポンプ実稼働データで検証済み",
  observedCyclesLabel: "ポンプ起動回数（過去24h）",
  observedHoursLabel: "ポンプ稼働時間（過去24h）",

  forecastTitle: "今後7日間の土壌予測",
  forecastSubtitle: "気象予報とセンサー傾向から予測した根域水分と1日あたりの必要水量です。",
  moistureChartLabel: "土壌水分 (%)",
  recommendedWaterLabel: "必要灌漑量 (mm)",
  plotsTitle: "区画・作物別の節約内訳",
  withoutSmartLabel: "固定スケジュール",
  withSmartLabel: "FarmBrain 最適化",

  adviceTitle: "農園へのわかりやすい提案",
  whatIsHappening: "現状",
  whyLabel: "理由",
  whatToDo: "対策",
  sensorAnomalyAlert: "土壌センサーの配線を確認してください",

  completenessTitle: "農園データ充実度スコア",
  completenessMissingHint: "実測データが揃うほど予測の精度が上がります。",
  provMeasured: "センサー実測",
  provFarmerProvided: "ユーザー入力",
  provEstimated: "気象・地図推定",
  provDefault: "標準作物値",

  engineerToggleLabel: "技術者・アドバイザー向け詳細",
  engineerSubtitle: "MLモデルの検証精度・作物物理モデル・手法上の制約",
  mlModelsHeading: "学習済みMLモデル（時系列厳密ホールドアウト検証）",

  simPageTitle: "導入前にシミュレーションで確認",
  simPageSubtitle: "実際のポンプや農園データに触れず、仮想コピー上で安全に比較テストできます。",
  simSafetyBanner: "安全シミュレーションモード — ここでの操作で実際のポンプが動くことはありません。",
  chooseScenarioHeading: "1. テストしたいシナリオを選択",

  scenWaterShortage: "水不足対策",
  scenWaterShortageDesc: "今日使える限られた水を優先度付きで配分して作物を守ります。",
  scenChangeCrop: "作物の変更",
  scenChangeCropDesc: "別の作物に変えた場合の水量・収穫への影響を比較します。",
  scenWeather: "猛暑・少雨シナリオ",
  scenWeatherDesc: "気温上昇や降雨減少が水需要に与える影響を確認します。",
  scenStrategy: "灌漑スケジュール",
  scenStrategyDesc: "毎日・2日おき・センサー連動・AI最適化の4方式を比較します。",
  scenExpansion: "農園の拡張",
  scenExpansionDesc: "耕作面積を増やしても今のポンプと太陽光で足りるか確認します。",

  scenarioNameLabel: "テスト名",
  availableWaterLabel: "今日使える水量は？",
  customLitresLabel: "任意入力（リットル/日）",
  pickPlotLabel: "対象の区画",
  newCropLabel: "試す新しい作物",
  tempShiftLabel: "気温の変化 (°C)",
  rainShiftLabel: "降水量の変化 (%)",
  humidityShiftLabel: "湿度の変化 (%)",
  strategyLabel: "試すスケジュール",
  stratCurrent: "現在の習慣",
  stratDaily: "毎日少量ずつ",
  stratEvery2Days: "2日おき",
  stratMoistureTrigger: "土壌水分が基準以下のみ",
  stratAiOptimized: "FarmBrain AI 最適化",
  thresholdLabel: "開始する土壌水分 (%)",
  addedAreaLabel: "追加する面積（ha）",
  addedCropLabel: "追加農地の作物",
  runAndSaveBtn: "シミュレーション実行＆保存",
  runningSimBtn: "計算中…",
  resetInputsBtn: "リセット",

  resultHeadline: "テスト結果",
  waterImpactLabel: "水量の変化",
  energyImpactLabel: "電力の変化",
  costImpactLabel: "コストの変化",
  yieldImpactLabel: "収穫への影響",
  pumpCheckLabel: "ポンプ能力チェック",
  pumpOkLabel: "現在のポンプで対応可能",
  pumpOverloadLabel: "ポンプ容量不足・過負荷",
  hoursPerDayUnit: "時間/日（ピーク時）",
  allocationHeading: "作物の耐性に基づくスマート配分（均等割りではありません）",
  trajectoryHeading: "30日間の土壌水分推移",
  savedScenariosHeading: "保存済みテスト — 横並び比較",
  compareSelectedBtn: "選択を比較",
  comparingBtn: "比較中…",
  deleteScenarioBtn: "削除",
  openScenarioBtn: "読み込む",
  comparisonHeading: "シナリオ横並び比較",
  bestWaterBadge: "最も節水",
  bestYieldBadge: "収穫保護が最良",
  bestOverallBadge: "総合バランス最良",
  noSavedScenarios: "上でテストを実行すると、ここに保存して比較できます。",
};

export const FARMBRAIN_STRINGS: Record<AppLanguage, FarmBrainStrings> = {
  en: EN,
  fr: FR,
  ar: AR,
  ja: JA,
};

const COMPLETENESS_LABEL_MAP: Record<string, { en: string; fr: string; ar: string; ja: string }> = {
  location_boundary: {
    en: "Farm location & field boundary",
    fr: "Emplacement et limites des parcelles",
    ar: "موقع الفيرمة وحدود الأرض",
    ja: "農園の位置と圃場境界",
  },
  crops_plots: {
    en: "Registered crops & plot areas",
    fr: "Cultures et surfaces enregistrées",
    ar: "الزراعات ومساحة كل قطعة",
    ja: "登録された作物と面積",
  },
  planting_stage: {
    en: "Planting dates & growth stages",
    fr: "Dates de plantation et stades",
    ar: "تواريخ الزراعة ومراحل النمو",
    ja: "植え付け日と生育段階",
  },
  soil_profile: {
    en: "Soil texture & water capacity",
    fr: "Type de sol et réserve en eau",
    ar: "نوع التربة وقدرتها على حفظ الماء",
    ja: "土質と保水容量",
  },
  pump_specs: {
    en: "Pump flow & pipe setup",
    fr: "Débit de pompe et tuyaux",
    ar: "قوة المضخة والأنابيب",
    ja: "ポンプ流量と配管構成",
  },
  solar_setup: {
    en: "Solar power configuration",
    fr: "Équipement solaire",
    ar: "تجهيزات الطاقة الشمسية",
    ja: "太陽光発電設備",
  },
  water_source: {
    en: "Water source",
    fr: "Source d'eau",
    ar: "مصدر الماء",
    ja: "水源情報",
  },
  live_sensor: {
    en: "ESP32 live soil & weather sensor",
    fr: "Capteur champ ESP32 en direct",
    ar: "حساس التربة والطقس المباشر",
    ja: "ESP32 リアルタイム土壌・気象センサー",
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
  if (lang === "ja") {
    if (tier === "VERIFIED_ACTUAL") {
      return `過去24時間の実測値より算出（ポンプ起動 ${cycles24h} 回、稼働 ${hours24h} 時間）。`;
    }
    if (tier === "SENSOR_UPDATED_PROJECTION") {
      return "接続された圃場センサーの最新測定値で推定を更新しました。";
    }
    return "農園データと地域気象に基づく初期予測です。ESP32センサーを接続すると実測検証に切り替わります。";
  }
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
  if (lang === "ja") {
    return "土壌センサーの値が異常です（断線または範囲外の値）。灌漑の前に配線・プローブを確認してください。";
  }
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
  if (lang === "ja") {
    if (rec.id === "rec_water_savings") {
      return {
        whatIsHappening: `年間で約 ${savings.waterSavedLitresYr.toLocaleString()} L（${savings.waterSavedM3Yr.toLocaleString()} m³）の節水が可能です（${savings.waterSavingsPct}%削減）。`,
        why: "根が本当に水を必要とする時だけ灌漑することで、地中への無駄な浸透ロスを防げます。",
        whatToDo: "固定タイマーではなく、アプリの実測土壌水分と気象予測に合わせて水やりしてください。",
        estimatedImpact: `-${savings.waterSavingsPct}% 節水 · -${savings.energySavedKwhYr} kWh/年`,
      };
    }
    if (rec.id === "rec_sensor_anomaly") {
      return {
        whatIsHappening: "土壌センサーの測定値に異常が見られます。",
        why: "配線の緩みやプローブの接触不良があると誤った値が出ます。",
        whatToDo: "ESP32ボックスの配線と土壌プローブの差し込みを確認してください。",
      };
    }
    if (rec.id === "rec_rain_skip") {
      return {
        whatIsHappening: "数日以内に雨が降る予報です。",
        why: "降雨直前の灌漑は水とポンプ電力の両方を無駄にします。",
        whatToDo: "水やりを後ろにずらし、雨上がりの土壌水分を確認してください。",
      };
    }
    if (rec.id === "rec_solar_free") {
      return {
        whatIsHappening: "太陽光パネルがポンプの電力をすでにすべて賄っています。",
        why: "太陽光により電力コストが0になるため、主なメリットは節水とポンプ長寿命化です。",
        whatToDo: "日照の強い時間帯や貯水タンク経由での灌漑を優先しましょう。",
      };
    }
    return rec;
  }
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

  if (lang === "ja") {
    const headlineJaMap: Record<string, string> = {
      WATER_SHORTAGE: "各作物の乾燥耐性に応じて限られた水を優先配分しました。",
      CHANGE_CROP:
        res.waterDeltaM3Season < 0
          ? `この作物変更で年間約 ${absW} m³（${pct}%）節水できます。`
          : `この作物変更で年間約 +${absW} m³ の追加水量が必要です。`,
      WEATHER_CLIMATE:
        res.waterDeltaM3Season >= 0
          ? `高温・少雨により年間水需要が +${absW} m³ 増加します。`
          : `この気象条件では年間水需要が ${absW} m³ 減少します。`,
      IRRIGATION_STRATEGY: `この灌漑スケジュールは水使用量を ${res.waterDeltaM3Season >= 0 ? "+" : "-"}${absW} m³/年 変化させます。`,
      FARM_EXPANSION: res.pumpOverloadRisk
        ? `拡張後はピーク時に1日 ${res.pumpRequiredHoursDay} 時間必要となり、ポンプ過負荷になります。`
        : `現在のポンプで十分対応できます（ピーク時 ${res.pumpRequiredHoursDay} 時間/日）。`,
    };
    return {
      headlineOutcome: headlineJaMap[res.scenarioType] ?? res.headlineOutcome,
      whatChanges: `予想される水量の変化：${res.waterDeltaM3Season >= 0 ? "+" : "-"}${absW} m³/年（${res.waterDeltaPct}%）。`,
      whyItHappens:
        res.scenarioType === "WATER_SHORTAGE"
          ? "全区画を均等に減らすと水を浪費するため、乾燥に弱い作物を優先して保護します。"
          : "気温、根の深さ、灌漑のタイミングによって毎日の蒸発散量と排水ロスが変わります。",
      whatFarmerShouldDo: res.pumpOverloadRisk
        ? "面積を広げる前に、貯水タンクを増設するか区画別の輪番灌漑を検討してください。"
        : "センサーの実測水分を見ながら各バルブの散水時間を調整してください。",
    };
  }

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
        ? `السخانة أو شح المطر يزيد حاجة السقي بـ \u2066+${absW}\u2069 م³/سنة.`
        : `تبدّل الطقس ينقّص حاجة السقي بـ \u2066${absW}\u2069 م³/سنة.`,
    IRRIGATION_STRATEGY: `برنامج السقي هذا يغيّر استهلاك الماء بـ \u2066${res.waterDeltaM3Season >= 0 ? "+" : "-"}${absW}\u2069 م³/سنة.`,
    FARM_EXPANSION: res.pumpOverloadRisk
      ? `التوسيع يوصل المضخة لـ ${res.pumpRequiredHoursDay} ساعة/يوم في الذروة — تحتاج خزان أو مضخة أقوى.`
      : `مضختك الحالية تكفي (${res.pumpRequiredHoursDay} ساعة/يوم في الذروة).`,
  };
  return {
    headlineOutcome: headlineArMap[res.scenarioType] ?? res.headlineOutcome,
    whatChanges: `التغيّر المتوقع في الماء: \u2066${res.waterDeltaM3Season >= 0 ? "+" : "-"}${absW}\u2069 م³/سنة (\u2066${res.waterDeltaPct}%\u2069).`,
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
  if (lang === "ja") {
    return fulfillmentPct >= 85
      ? `${cropName} は水不足に弱いため優先配分（充足率 ${Math.round(fulfillmentPct)}%）。`
      : `より乾燥に弱い作物を守るため配分を ${Math.round(fulfillmentPct)}% に調整。`;
  }
  if (lang === "fr") {
    return fulfillmentPct >= 85
      ? `Prioritaire (${Math.round(fulfillmentPct)}% couvert) car ${cropName} est sensible au manque d'eau.`
      : `Réduit à ${Math.round(fulfillmentPct)}% pour préserver les cultures les plus sensibles.`;
  }
  return fulfillmentPct >= 85
    ? `أولوية عالية (${Math.round(fulfillmentPct)}% من الحاجة) على خاطر ${cropName} يتأثر بسرعة بالعطش.`
    : `نقصنا الحصة لـ ${Math.round(fulfillmentPct)}% باش نحميو الزراعات الحساسة.`;
}
