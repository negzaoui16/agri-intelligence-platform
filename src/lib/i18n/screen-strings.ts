/**
 * Farmer wording for the sign-in screens, the offline screen, the report verdict, the
 * assistant side panel, weather days and the "For your engineer" sections, in English,
 * French and Arabic. Kept apart from translations.ts like farm-ui-strings.ts.
 * Placeholders such as "{crop}" are filled with fillTemplate().
 * REVIEW: native Arabic / French speaker review still recommended before launch.
 */
import type { AppLanguage } from "./translations";

export interface ScreenStrings {
  // Sign-in layout
  appTagline: string;
  panelBadge: string;
  panelTitle: string;
  panelBody: string;
  panelMapTitle: string;
  panelMapText: string;
  panelWaterTitle: string;
  panelWaterText: string;
  panelSunTitle: string;
  panelSunText: string;
  panelOfflineTitle: string;
  panelOfflineText: string;
  panelFootnote: string;

  // Shared sign-in words
  email: string;
  password: string;
  showPassword: string;
  hidePassword: string;
  continueWithGoogle: string;
  orUseEmail: string;
  noConnection: string;
  googleNeedsInternet: string;
  tooManyTries: string;
  somethingWentWrong: string;
  backToSignIn: string;
  googleTestTitle: string;
  googleTestSubtitle: string;
  googleTestNote: string;
  googleName: string;
  googleEmail: string;
  completeGoogle: string;
  googleFailed: string;

  // Login
  loginTitle: string;
  loginSubtitle: string;
  offlineSignIn: string;
  sessionExpired: string;
  googleNotReady: string;
  signInProblem: string;
  enterEmailAndPassword: string;
  wrongEmailOrPassword: string;
  forgotPassword: string;
  yourPassword: string;
  signIn: string;
  signingIn: string;
  newHere: string;
  createAccount: string;
  tryDemoFarm: string;

  // Register
  registerTitle: string;
  registerSubtitle: string;
  offlineRegister: string;
  signUpWithGoogle: string;
  firstName: string;
  lastName: string;
  choosePassword: string;
  passwordHint: string;
  ruleLength: string;
  ruleUpper: string;
  ruleLower: string;
  ruleNumber: string;
  passwordRulesNotMet: string;
  emailTaken: string;
  checkWhatYouTyped: string;
  createAccountBtn: string;
  creatingAccount: string;
  haveAccount: string;

  // Forgot password
  resetTitle: string;
  resetSubtitle: string;
  sendMeACode: string;
  devCodeNotice: string;
  codeLabel: string;
  newPassword: string;
  saveNewPassword: string;
  resetDone: string;
  goToSignIn: string;
  rememberedIt: string;
  resetUnavailable: string;
  wrongOrOldCode: string;

  // Offline screen
  offlineBadge: string;
  offlineShort: string;
  changesSaved: string;
  sendNow: string;
  refresh: string;
  refreshFarmData: string;
  conflictNotice: string;
  keepCloud: string;
  keepPhone: string;
  offlineBanner: string;
  changesWaiting: string;
  offlineTitle: string;
  offlineBody: string;
  openMyFarm: string;
  myFarms: string;
  water: string;
  savedFarms: string; // {count}
  noSavedFarms: string;
  report: string;

  // Report
  preparingReport: string;
  verdictYesIfWater: string;
  verdictYesGood: string;
  verdictShortDetail: string; // {crop} {supply} {month} {demand}
  verdictOkDetail: string; // {crop}
  flatLand: string;
  slopedLand: string;
  rainPerYear: string; // {mm}
  pumpGivesVsNeed: string; // {supply} {month} {demand}
  pumpCoversPeak: string; // {month}
  seeFixes: string;
  seeDetails: string;
  sunCoversUnits: string; // {units} {month}
  sunCoversAllYear: string;
  cropSelectedForLand: string; // {crop}
  needInternetForPdf: string;
  pdfSaved: string;
  engineerPdfReady: string;
  pdfArabicFallback: string;

  // Farms
  farmSavedOnline: string;
  farmSavedOffline: string;
  deleteFarmTitle: string; // {name}
  keepFarm: string;
  removing: string;
  yesDelete: string; // {name}

  // Onboarding
  finishAndCheck: string;
  couldNotSaveFarm: string;

  // Water
  noWaterNearby: string;

  // Weather
  checkingForecast: string;
  dayRainExpected: string;
  dayFewDrops: string;
  daySunnyHot: string;
  daySunnyNoRain: string;
  noRain: string;
  checkingLiveData: string;
  statusNotChecked: string;
  notCheckedTitle: string;
  notCheckedBody: string;
  checkMyFarm: string;
  checkingFarm: string;
  checkFailed: string;

  // Assistant
  askIntro: string; // {farm}
  micError: string;
  listening: string;
  sendQuestion: string;
  factLand: string;
  factWatering: string;
  factPump: string;
  factPanels: string;
  factWater: string;
  pumpFlowLine: string; // {flow} {hours}
  panelsLine: string; // {kw} {count}
  nearestWater: string; // {m}
  noWaterOnMap: string;

  // "For your engineer" sections: technical names stay, labels and units are translated
  perYear: string;
  perDay: string;
  notAvailable: string;
  sources: string;
  engEt0: string;
  engGrossIrrigation: string;
  engTdh: string;
  engStaticHead: string;
  engFriction: string;
  engElectricalPower: string;
  engDailyEnergy: string;
  engAnnualEtc: string;
  engWatershed: string;
  engPvCapacity: string;
  engSpecificYield: string;
  engPvAnnual: string;
  engAnnualCoverage: string;
  engSystemLosses: string;
  engTilt: string;
  engAridity: string;
  engElevation: string;
  engSlope: string;
  engWaporEt: string;
  engWaporBiomass: string;
  engScore: string;
  engPumpPower: string;
  engApplicationEfficiency: string;

  // Live Field Sensors (Home card, modal & metrics)
  rightNowInField: string;
  fromYourSensor: string;
  fromTheForecast: string;
  sensorNotSending: string;
  sensorNotSendingBody: string;
  sensorConnectedWaiting: string;
  lastUpdateJustNow: string;
  lastUpdateMinAgo: string; // {minutes}
  soilWetness: string;
  soilDryLabel: string;
  soilGoodLabel: string;
  soilWetLabel: string;
  soilWireProblem: string;
  airTempAndHumidity: string;
  airHumidityWord: string;
  tankLevel: string;
  tankEmptyLabel: string;
  tankLowLabel: string;
  tankGoodLabel: string;
  tankFullLabel: string;
  pumpRunningState: string;
  pumpOnLabel: string;
  pumpOffLabel: string;
  noSensorYetBody: string;
  addASensor: string;
  addAnotherSensor: string;
  addSensorModalTitle: string;
  addSensorModalBody: string;
  sensorNameLabel: string;
  sensorNamePlaceholder: string;
  createSensorBtn: string;
  creatingSensor: string;
  sensorCreateError: string;
  sensorKeyReadyTitle: string;
  sensorKeyOnceWarning: string;
  sensorKeyInstructions: string;
  copyKeyBtn: string;
  keyCopied: string;
  closeBtn: string;
  removeSensorBtn: string;
  waterTodayFromSensorDry: string;
  skipWaterTodayFromSensorWet: string;
  connectBluetoothBtn: string;
  connectingBluetooth: string;
  bluetoothConnectedBadge: string;
  disconnectBluetoothBtn: string;
  bluetoothConnectionFailed: string;
  bluetoothUnsupportedHint: string;
}

const EN: ScreenStrings = {
  appTagline: "Your farm, water and sun power",
  panelBadge: "Made for farmers",
  panelTitle: "Know if your water and sun power are enough, before you spend.",
  panelBody:
    "Put your farm on the map. TerraPulse checks the weather, the water near you and the sunshine, then tells you in plain words what to fix.",
  panelMapTitle: "Your farm on the map",
  panelMapText: "Mark your land in a few taps",
  panelWaterTitle: "Water for your crops",
  panelWaterText: "How much water each month, and if your pump is enough",
  panelSunTitle: "Sun power",
  panelSunText: "If solar panels can run your pump in summer",
  panelOfflineTitle: "Works without internet",
  panelOfflineText: "Saved on your phone, sent when you are back online",
  panelFootnote:
    "Weather and maps are measured. Water and sun numbers are estimates: check them with your engineer before buying.",

  email: "Email",
  password: "Password",
  showPassword: "Show password",
  hidePassword: "Hide password",
  continueWithGoogle: "Continue with Google",
  orUseEmail: "or use your email",
  noConnection: "No connection. Check your internet and try again.",
  googleNeedsInternet: "Google sign-in needs internet.",
  tooManyTries: "Too many tries. Wait a few minutes and try again.",
  somethingWentWrong: "Something went wrong. Please try again.",
  backToSignIn: "Back to sign in",
  googleTestTitle: "Google sign-in (test)",
  googleTestSubtitle: "Finish signing in with your Google account.",
  googleTestNote: "This test page only works on a developer computer without Google keys. On the real site, Google sign-in goes straight through Google.",
  googleName: "Your name",
  googleEmail: "Your Google email",
  completeGoogle: "Continue",
  googleFailed: "Google sign-in did not work. Please try again.",

  loginTitle: "Welcome back",
  loginSubtitle: "Sign in to see your farm, water and sun power.",
  offlineSignIn: "You are offline. Connect to the internet to sign in.",
  sessionExpired: "You were signed out. Please sign in again.",
  googleNotReady: "Google sign-in is not ready yet. Please use your email and password.",
  signInProblem: "Sign-in did not work. Please try again.",
  enterEmailAndPassword: "Type your email and your password.",
  wrongEmailOrPassword: "Wrong email or password.",
  forgotPassword: "Forgot password?",
  yourPassword: "Your password",
  signIn: "Sign in",
  signingIn: "Signing in…",
  newHere: "New here?",
  createAccount: "Create an account",
  tryDemoFarm: "Try the demo farm",

  registerTitle: "Create your account",
  registerSubtitle: "It is free. Then add your farm in 3 short steps.",
  offlineRegister: "You are offline. Connect to the internet to create an account.",
  signUpWithGoogle: "Sign up with Google",
  firstName: "First name",
  lastName: "Last name",
  choosePassword: "Choose a password",
  passwordHint: "At least 8 letters and numbers",
  ruleLength: "8 or more characters",
  ruleUpper: "A capital letter",
  ruleLower: "A small letter",
  ruleNumber: "A number",
  passwordRulesNotMet: "Your password needs all 4 points under it.",
  emailTaken: "This email already has an account. Sign in instead.",
  checkWhatYouTyped: "Please check what you typed.",
  createAccountBtn: "Create my account",
  creatingAccount: "Creating your account…",
  haveAccount: "Already have an account?",

  resetTitle: "Reset your password",
  resetSubtitle: "We will help you get back into your account.",
  sendMeACode: "Send me a code",
  devCodeNotice: "Test code (on this computer only):",
  codeLabel: "6-digit code",
  newPassword: "New password",
  saveNewPassword: "Save new password",
  resetDone: "Your password is changed. You can sign in now.",
  goToSignIn: "Go to sign in",
  rememberedIt: "Remembered it?",
  resetUnavailable:
    "Password reset by email is not available yet. Please contact support to get back into your account.",
  wrongOrOldCode: "This code is wrong or too old. Ask for a new one.",

  offlineBadge: "No internet",
  offlineShort: "Offline",
  changesSaved: "{count} saved on phone",
  sendNow: "Send now",
  refresh: "Refresh",
  refreshFarmData: "Refresh farm data",
  conflictNotice: "{count} change(s) made offline are different from your saved farm.",
  keepCloud: "Keep saved version",
  keepPhone: "Keep my phone change",
  offlineBanner: "No internet: your changes are saved on this phone",
  changesWaiting: "{count} change(s) waiting to be sent",
  offlineTitle: "You are offline",
  offlineBody:
    "New weather and sun numbers need internet. You can still open your saved farms and change them. Your changes are sent when you are back online.",
  openMyFarm: "Open my farm",
  myFarms: "My farms",
  water: "Water",
  savedFarms: "Farms saved on this phone ({count})",
  noSavedFarms: "No farm is saved on this phone yet.",
  report: "Report",

  preparingReport: "Preparing your farm report…",
  verdictYesIfWater: "Yes, if you solve summer water first.",
  verdictYesGood: "Yes, good land for your crops.",
  verdictShortDetail:
    "Good land and climate for {crop}. Your pump gives {supply} m³ a day, while {month} needs {demand} m³ a day.",
  verdictOkDetail: "Good land and climate for {crop}. Your water and sun power match what your farm needs.",
  flatLand: "Flat land.",
  slopedLand: "Sloped land.",
  rainPerYear: "{mm} mm of rain a year.",
  pumpGivesVsNeed: "Pump gives {supply} m³ a day. {month} needs {demand} m³.",
  pumpCoversPeak: "Your pump covers what {month} needs.",
  seeFixes: "See fixes",
  seeDetails: "See details",
  sunCoversUnits: "Enough over the year. Covers {units} of 10 parts in {month}.",
  sunCoversAllYear: "Covers the pump all year.",
  cropSelectedForLand: "{crop} is chosen for your land.",
  needInternetForPdf: "Connect to the internet once to prepare the PDF for your engineer.",
  pdfSaved: "PDF saved on your device.",
  engineerPdfReady: "PDF saved, and a short summary copied. You can paste it in a message to your engineer.",
  pdfArabicFallback: "The Arabic letters could not load, so the PDF was saved in English. Try again when you are online.",

  farmSavedOnline: "Saved. Your farm numbers are updated.",
  farmSavedOffline: "Saved on your phone. It will be sent when you are back online.",
  deleteFarmTitle: "Delete {name}?",
  keepFarm: "Keep farm",
  removing: "Removing…",
  yesDelete: "Yes, delete {name}",

  finishAndCheck: "Finish and check my farm",
  couldNotSaveFarm: "Could not save your farm. Please try again.",

  noWaterNearby:
    "No river, lake, dam or mapped well within 10 km on open maps. Ask your neighbours, or test the ground water before digging a well.",

  checkingForecast: "Checking the 7-day forecast and rain…",
  dayRainExpected: "Rain expected",
  dayFewDrops: "A few drops",
  daySunnyHot: "Sunny · Hot",
  daySunnyNoRain: "Sunny · No rain",
  noRain: "No rain",
  checkingLiveData: "Checking live weather and sun…",
  statusNotChecked: "Not checked yet",
  notCheckedTitle: "We have not checked your farm yet",
  notCheckedBody: "Water, sun and weather need the internet once. Connect, then tap \"Check my farm\".",
  checkMyFarm: "Check my farm",
  checkingFarm: "Checking your farm…",
  checkFailed: "Could not check right now. Try again in a moment.",

  askIntro:
    "Ask anything about water, pumps, solar panels, crops or weather for {farm}. Tap a question, or tap the green microphone to speak.",
  micError: "Could not hear you clearly. Please try again or type.",
  listening: "Listening…",
  sendQuestion: "Send question",
  factLand: "Land",
  factWatering: "Watering",
  factPump: "Pump",
  factPanels: "Panels",
  factWater: "Water",
  pumpFlowLine: "{flow} m³ an hour, {hours} hours a day",
  panelsLine: "{kw} kW (about {count} panels)",
  nearestWater: "Nearest point {m} m",
  noWaterOnMap: "None nearby on the map",

  perYear: "a year",
  perDay: "a day",
  notAvailable: "Not available",
  sources: "Sources",
  engEt0: "Reference evapotranspiration (ET₀)",
  engGrossIrrigation: "Gross irrigation",
  engTdh: "Total dynamic head (TDH)",
  engStaticHead: "Static head",
  engFriction: "Friction",
  engElectricalPower: "Electrical power",
  engDailyEnergy: "Pump energy",
  engAnnualEtc: "Crop evapotranspiration (FAO-56 ETc)",
  engWatershed: "Watershed (HydroBASINS)",
  engPvCapacity: "Installed solar capacity",
  engSpecificYield: "Specific yield (PVGIS)",
  engPvAnnual: "Solar production (PVGIS)",
  engAnnualCoverage: "Pump energy covered over the year",
  engSystemLosses: "System losses assumed",
  engTilt: "Best panel tilt",
  engAridity: "Aridity index",
  engElevation: "Elevation",
  engSlope: "Slope",
  engWaporEt: "Actual evapotranspiration (FAO WaPOR v3)",
  engWaporBiomass: "Biomass (WaPOR)",
  engScore: "Composite score",
  engPumpPower: "Pump power",
  engApplicationEfficiency: "application efficiency",

  rightNowInField: "Right now in your field",
  fromYourSensor: "from your sensor",
  fromTheForecast: "from the forecast",
  sensorNotSending: "Sensor not sending",
  sensorNotSendingBody: "No new message for more than 15 minutes. Check its power or Wi-Fi.",
  sensorConnectedWaiting: "Waiting for the first reading from your sensor.",
  lastUpdateJustNow: "Last update just now",
  lastUpdateMinAgo: "Last update {minutes} min ago",
  soilWetness: "Soil wetness",
  soilDryLabel: "Dry — needs water",
  soilGoodLabel: "Good moisture",
  soilWetLabel: "Wet — plenty of water",
  soilWireProblem: "Soil sensor wire problem — check probe",
  airTempAndHumidity: "Air temperature & humidity",
  airHumidityWord: "humidity",
  tankLevel: "Water tank",
  tankEmptyLabel: "Empty",
  tankLowLabel: "Low",
  tankGoodLabel: "Enough",
  tankFullLabel: "Full",
  pumpRunningState: "Pump",
  pumpOnLabel: "On now",
  pumpOffLabel: "Off",
  noSensorYetBody: "Connect your field box to see live soil moisture, tank water and air readings right here.",
  addASensor: "Add a sensor",
  addAnotherSensor: "Add another sensor",
  addSensorModalTitle: "Add a field sensor",
  addSensorModalBody: "Give your sensor box a simple name. You will get one private key to put inside it.",
  sensorNameLabel: "Sensor name",
  sensorNamePlaceholder: "For example: North trees sensor",
  createSensorBtn: "Create key",
  creatingSensor: "Creating key…",
  sensorCreateError: "Could not create the sensor key. Check your connection and try again.",
  sensorKeyReadyTitle: "Copy your sensor key now",
  sensorKeyOnceWarning: "You will only see this key once. Copy and save it in your field box now.",
  sensorKeyInstructions: "Paste this key next to DEVICE_KEY inside secrets.h on your sensor box.",
  copyKeyBtn: "Copy key",
  keyCopied: "Copied!",
  closeBtn: "Done",
  removeSensorBtn: "Disconnect sensor",
  waterTodayFromSensorDry: "Water today — soil is dry",
  skipWaterTodayFromSensorWet: "Skip watering today — soil is already wet",
  connectBluetoothBtn: "Connect Bluetooth",
  connectingBluetooth: "Connecting…",
  bluetoothConnectedBadge: "Bluetooth live",
  disconnectBluetoothBtn: "Disconnect",
  bluetoothConnectionFailed: "Could not connect to the sensor over Bluetooth. Make sure the box is turned on and nearby.",
  bluetoothUnsupportedHint: "Use Chrome or Edge to connect directly by Bluetooth, or add a Wi-Fi sensor key.",
};

const FR: ScreenStrings = {
  appTagline: "Votre ferme, l'eau et l'énergie solaire",
  panelBadge: "Fait pour les agriculteurs",
  panelTitle: "Sachez si votre eau et votre énergie solaire suffisent, avant de dépenser.",
  panelBody:
    "Placez votre ferme sur la carte. TerraPulse vérifie la météo, l'eau autour de vous et le soleil, puis vous dit simplement quoi corriger.",
  panelMapTitle: "Votre ferme sur la carte",
  panelMapText: "Marquez votre terrain en quelques gestes",
  panelWaterTitle: "L'eau pour vos cultures",
  panelWaterText: "Combien d'eau chaque mois, et si votre pompe suffit",
  panelSunTitle: "Énergie solaire",
  panelSunText: "Si des panneaux solaires peuvent faire tourner votre pompe en été",
  panelOfflineTitle: "Marche sans internet",
  panelOfflineText: "Enregistré sur votre téléphone, envoyé au retour du réseau",
  panelFootnote:
    "La météo et les cartes sont mesurées. Les chiffres d'eau et de soleil sont des estimations : vérifiez-les avec votre ingénieur avant d'acheter.",

  email: "E-mail",
  password: "Mot de passe",
  showPassword: "Afficher le mot de passe",
  hidePassword: "Masquer le mot de passe",
  continueWithGoogle: "Continuer avec Google",
  orUseEmail: "ou utilisez votre e-mail",
  noConnection: "Pas de connexion. Vérifiez internet et réessayez.",
  googleNeedsInternet: "La connexion Google demande internet.",
  tooManyTries: "Trop d'essais. Attendez quelques minutes et réessayez.",
  somethingWentWrong: "Un problème est survenu. Veuillez réessayer.",
  backToSignIn: "Retour à la connexion",
  googleTestTitle: "Connexion Google (test)",
  googleTestSubtitle: "Terminez la connexion avec votre compte Google.",
  googleTestNote: "Cette page de test ne marche que sur un ordinateur de développement sans clés Google. Sur le vrai site, la connexion passe directement par Google.",
  googleName: "Votre nom",
  googleEmail: "Votre e-mail Google",
  completeGoogle: "Continuer",
  googleFailed: "La connexion Google n'a pas marché. Veuillez réessayer.",

  loginTitle: "Bon retour",
  loginSubtitle: "Connectez-vous pour voir votre ferme, l'eau et l'énergie solaire.",
  offlineSignIn: "Vous êtes hors ligne. Connectez-vous à internet pour vous identifier.",
  sessionExpired: "Vous avez été déconnecté. Veuillez vous reconnecter.",
  googleNotReady: "La connexion Google n'est pas encore prête. Utilisez votre e-mail et votre mot de passe.",
  signInProblem: "La connexion n'a pas marché. Veuillez réessayer.",
  enterEmailAndPassword: "Tapez votre e-mail et votre mot de passe.",
  wrongEmailOrPassword: "E-mail ou mot de passe incorrect.",
  forgotPassword: "Mot de passe oublié ?",
  yourPassword: "Votre mot de passe",
  signIn: "Se connecter",
  signingIn: "Connexion…",
  newHere: "Nouveau ici ?",
  createAccount: "Créer un compte",
  tryDemoFarm: "Essayer la ferme de démonstration",

  registerTitle: "Créez votre compte",
  registerSubtitle: "C'est gratuit. Ensuite, ajoutez votre ferme en 3 étapes courtes.",
  offlineRegister: "Vous êtes hors ligne. Connectez-vous à internet pour créer un compte.",
  signUpWithGoogle: "S'inscrire avec Google",
  firstName: "Prénom",
  lastName: "Nom",
  choosePassword: "Choisissez un mot de passe",
  passwordHint: "Au moins 8 lettres et chiffres",
  ruleLength: "8 caractères ou plus",
  ruleUpper: "Une majuscule",
  ruleLower: "Une minuscule",
  ruleNumber: "Un chiffre",
  passwordRulesNotMet: "Votre mot de passe doit respecter les 4 points en dessous.",
  emailTaken: "Cet e-mail a déjà un compte. Connectez-vous plutôt.",
  checkWhatYouTyped: "Veuillez vérifier ce que vous avez tapé.",
  createAccountBtn: "Créer mon compte",
  creatingAccount: "Création du compte…",
  haveAccount: "Vous avez déjà un compte ?",

  resetTitle: "Changer votre mot de passe",
  resetSubtitle: "Nous allons vous aider à retrouver votre compte.",
  sendMeACode: "Envoyez-moi un code",
  devCodeNotice: "Code de test (sur cet ordinateur seulement) :",
  codeLabel: "Code à 6 chiffres",
  newPassword: "Nouveau mot de passe",
  saveNewPassword: "Enregistrer le mot de passe",
  resetDone: "Votre mot de passe est changé. Vous pouvez vous connecter.",
  goToSignIn: "Aller à la connexion",
  rememberedIt: "Vous vous en souvenez ?",
  resetUnavailable:
    "La réinitialisation par e-mail n'est pas encore disponible. Contactez le support pour retrouver votre compte.",
  wrongOrOldCode: "Ce code est faux ou trop ancien. Demandez-en un nouveau.",

  offlineBadge: "Pas d'internet",
  offlineShort: "Hors ligne",
  changesSaved: "{count} gardé(s) sur le téléphone",
  sendNow: "Envoyer",
  refresh: "Actualiser",
  refreshFarmData: "Actualiser les données de la ferme",
  conflictNotice: "{count} changement(s) faits hors ligne diffèrent de votre ferme enregistrée.",
  keepCloud: "Garder la version enregistrée",
  keepPhone: "Garder mon changement",
  offlineBanner: "Pas d'internet : vos changements sont gardés sur ce téléphone",
  changesWaiting: "{count} changement(s) en attente d'envoi",
  offlineTitle: "Vous êtes hors ligne",
  offlineBody:
    "Les nouvelles données de météo et de soleil demandent internet. Vous pouvez quand même ouvrir vos fermes enregistrées et les modifier. Vos changements seront envoyés au retour du réseau.",
  openMyFarm: "Ouvrir ma ferme",
  myFarms: "Mes fermes",
  water: "Eau",
  savedFarms: "Fermes enregistrées sur ce téléphone ({count})",
  noSavedFarms: "Aucune ferme n'est encore enregistrée sur ce téléphone.",
  report: "Rapport",

  preparingReport: "Préparation du rapport de votre ferme…",
  verdictYesIfWater: "Oui, si vous réglez d'abord l'eau en été.",
  verdictYesGood: "Oui, bonne terre pour vos cultures.",
  verdictShortDetail:
    "Bonne terre et bon climat pour {crop}. Votre pompe donne {supply} m³ par jour, alors qu'en {month} il faut {demand} m³ par jour.",
  verdictOkDetail: "Bonne terre et bon climat pour {crop}. Votre eau et votre énergie solaire couvrent les besoins de la ferme.",
  flatLand: "Terrain plat.",
  slopedLand: "Terrain en pente.",
  rainPerYear: "{mm} mm de pluie par an.",
  pumpGivesVsNeed: "La pompe donne {supply} m³ par jour. En {month}, il faut {demand} m³.",
  pumpCoversPeak: "Votre pompe couvre les besoins de {month}.",
  seeFixes: "Voir les solutions",
  seeDetails: "Voir le détail",
  sunCoversUnits: "Suffisant sur l'année. Couvre {units} parts sur 10 en {month}.",
  sunCoversAllYear: "Couvre la pompe toute l'année.",
  cropSelectedForLand: "{crop} est choisi pour votre terrain.",
  needInternetForPdf: "Connectez-vous une fois à internet pour préparer le PDF pour votre ingénieur.",
  pdfSaved: "PDF enregistré sur votre appareil.",
  engineerPdfReady:
    "PDF enregistré et court résumé copié. Vous pouvez le coller dans un message à votre ingénieur.",
  pdfArabicFallback: "Les lettres arabes n'ont pas pu se charger, le PDF est donc en anglais. Réessayez une fois en ligne.",

  farmSavedOnline: "Enregistré. Les chiffres de votre ferme sont à jour.",
  farmSavedOffline: "Enregistré sur votre téléphone. Ce sera envoyé au retour du réseau.",
  deleteFarmTitle: "Supprimer {name} ?",
  keepFarm: "Garder la ferme",
  removing: "Suppression…",
  yesDelete: "Oui, supprimer {name}",

  finishAndCheck: "Terminer et vérifier ma ferme",
  couldNotSaveFarm: "Impossible d'enregistrer votre ferme. Veuillez réessayer.",

  noWaterNearby:
    "Aucune rivière, lac, barrage ou puits connu à moins de 10 km sur les cartes ouvertes. Demandez à vos voisins, ou faites tester la nappe avant de creuser un puits.",

  checkingForecast: "Vérification des prévisions sur 7 jours et de la pluie…",
  dayRainExpected: "Pluie prévue",
  dayFewDrops: "Quelques gouttes",
  daySunnyHot: "Ensoleillé · Chaud",
  daySunnyNoRain: "Ensoleillé · Pas de pluie",
  noRain: "Pas de pluie",
  checkingLiveData: "Vérification de la météo et du soleil…",
  statusNotChecked: "Pas encore vérifié",
  notCheckedTitle: "Nous n'avons pas encore vérifié votre ferme",
  notCheckedBody: "L'eau, le soleil et la météo demandent internet une fois. Connectez-vous, puis touchez « Vérifier ma ferme ».",
  checkMyFarm: "Vérifier ma ferme",
  checkingFarm: "Vérification de votre ferme…",
  checkFailed: "Vérification impossible pour l'instant. Réessayez dans un moment.",

  askIntro:
    "Posez toute question sur l'eau, les pompes, les panneaux solaires, les cultures ou la météo pour {farm}. Touchez une question, ou le micro vert pour parler.",
  micError: "Nous ne vous avons pas bien entendu. Réessayez ou tapez votre question.",
  listening: "J'écoute…",
  sendQuestion: "Envoyer la question",
  factLand: "Terrain",
  factWatering: "Arrosage",
  factPump: "Pompe",
  factPanels: "Panneaux",
  factWater: "Eau",
  pumpFlowLine: "{flow} m³ par heure, {hours} heures par jour",
  panelsLine: "{kw} kW (environ {count} panneaux)",
  nearestWater: "Point le plus proche à {m} m",
  noWaterOnMap: "Aucun point proche sur la carte",

  perYear: "par an",
  perDay: "par jour",
  notAvailable: "Non disponible",
  sources: "Sources",
  engEt0: "Évapotranspiration de référence (ET₀)",
  engGrossIrrigation: "Irrigation brute",
  engTdh: "Hauteur manométrique totale (HMT)",
  engStaticHead: "Hauteur géométrique",
  engFriction: "Pertes de charge",
  engElectricalPower: "Puissance électrique",
  engDailyEnergy: "Énergie de la pompe",
  engAnnualEtc: "Évapotranspiration de la culture (FAO-56 ETc)",
  engWatershed: "Bassin versant (HydroBASINS)",
  engPvCapacity: "Puissance solaire installée",
  engSpecificYield: "Productible spécifique (PVGIS)",
  engPvAnnual: "Production solaire (PVGIS)",
  engAnnualCoverage: "Énergie de pompe couverte sur l'année",
  engSystemLosses: "Pertes du système supposées",
  engTilt: "Meilleure inclinaison des panneaux",
  engAridity: "Indice d'aridité",
  engElevation: "Altitude",
  engSlope: "Pente",
  engWaporEt: "Évapotranspiration réelle (FAO WaPOR v3)",
  engWaporBiomass: "Biomasse (WaPOR)",
  engScore: "Score global",
  engPumpPower: "Puissance de la pompe",
  engApplicationEfficiency: "efficience d'application",

  rightNowInField: "En ce moment dans votre champ",
  fromYourSensor: "de votre capteur",
  fromTheForecast: "de la météo prévue",
  sensorNotSending: "Le capteur n'envoie plus",
  sensorNotSendingBody: "Aucun message depuis plus de 15 minutes. Vérifiez son alimentation ou le Wi-Fi.",
  sensorConnectedWaiting: "En attente de la première mesure de votre capteur.",
  lastUpdateJustNow: "Dernière mise à jour à l'instant",
  lastUpdateMinAgo: "Dernière mise à jour il y a {minutes} min",
  soilWetness: "Humidité du sol",
  soilDryLabel: "Sec — a besoin d'eau",
  soilGoodLabel: "Bonne humidité",
  soilWetLabel: "Humide — assez d'eau",
  soilWireProblem: "Problème de fil du capteur de sol — vérifiez la sonde",
  airTempAndHumidity: "Air : chaleur et humidité",
  airHumidityWord: "humidité",
  tankLevel: "Réservoir d'eau",
  tankEmptyLabel: "Vide",
  tankLowLabel: "Bas",
  tankGoodLabel: "Suffisant",
  tankFullLabel: "Plein",
  pumpRunningState: "Pompe",
  pumpOnLabel: "Allumée",
  pumpOffLabel: "Éteinte",
  noSensorYetBody: "Connectez votre boîtier de terrain pour voir en direct l'humidité du sol, le niveau du réservoir et l'air.",
  addASensor: "Ajouter un capteur",
  addAnotherSensor: "Ajouter un autre capteur",
  addSensorModalTitle: "Ajouter un capteur de terrain",
  addSensorModalBody: "Donnez un nom simple à votre boîtier. Vous recevrez une clé privée à copier dedans.",
  sensorNameLabel: "Nom du capteur",
  sensorNamePlaceholder: "Par exemple : Capteur parcelle nord",
  createSensorBtn: "Créer la clé",
  creatingSensor: "Création de la clé…",
  sensorCreateError: "Impossible de créer la clé. Vérifiez internet et réessayez.",
  sensorKeyReadyTitle: "Copiez votre clé maintenant",
  sensorKeyOnceWarning: "Cette clé ne s'affiche qu'une seule fois. Copiez-la et mettez-la dans votre boîtier.",
  sensorKeyInstructions: "Collez cette clé dans DEVICE_KEY dans le fichier secrets.h du boîtier.",
  copyKeyBtn: "Copier la clé",
  keyCopied: "Copié !",
  closeBtn: "Terminer",
  removeSensorBtn: "Déconnecter",
  waterTodayFromSensorDry: "Arroser aujourd'hui — la terre est sèche",
  skipWaterTodayFromSensorWet: "Pas besoin d'arroser aujourd'hui — la terre est humide",
  connectBluetoothBtn: "Connecter en Bluetooth",
  connectingBluetooth: "Connexion…",
  bluetoothConnectedBadge: "Bluetooth en direct",
  disconnectBluetoothBtn: "Déconnecter",
  bluetoothConnectionFailed: "Connexion Bluetooth impossible. Vérifiez que le boîtier est allumé et proche de vous.",
  bluetoothUnsupportedHint: "Utilisez Chrome ou Edge pour vous connecter en Bluetooth, ou créez une clé Wi-Fi.",
};

const AR: ScreenStrings = {
  appTagline: "مزرعتك والماء وطاقة الشمس",
  panelBadge: "مصمّم للفلاحين",
  panelTitle: "اعرف إن كان الماء وطاقة الشمس يكفيان، قبل أن تصرف.",
  panelBody:
    "ضع مزرعتك على الخريطة. يتحقق TerraPulse من الطقس والماء القريب منك والشمس، ثم يقول لك بكلمات بسيطة ما الذي يجب إصلاحه.",
  panelMapTitle: "مزرعتك على الخريطة",
  panelMapText: "حدّد أرضك ببضع لمسات",
  panelWaterTitle: "الماء لمحاصيلك",
  panelWaterText: "كم من الماء كل شهر، وهل تكفي مضختك",
  panelSunTitle: "طاقة الشمس",
  panelSunText: "هل تستطيع الألواح الشمسية تشغيل مضختك في الصيف",
  panelOfflineTitle: "يعمل بدون إنترنت",
  panelOfflineText: "يُحفظ في هاتفك ويُرسل عند عودة الاتصال",
  panelFootnote:
    "الطقس والخرائط مقاسة. أرقام الماء والشمس تقديرية: راجعها مع مهندسك قبل الشراء.",

  email: "البريد الإلكتروني",
  password: "كلمة السر",
  showPassword: "أظهر كلمة السر",
  hidePassword: "أخفِ كلمة السر",
  continueWithGoogle: "المتابعة عبر Google",
  orUseEmail: "أو استعمل بريدك الإلكتروني",
  noConnection: "لا يوجد اتصال. تحقق من الإنترنت وحاول مجدداً.",
  googleNeedsInternet: "الدخول عبر Google يحتاج إلى الإنترنت.",
  tooManyTries: "محاولات كثيرة. انتظر بضع دقائق ثم حاول مجدداً.",
  somethingWentWrong: "حدث خطأ. حاول مجدداً من فضلك.",
  backToSignIn: "العودة إلى الدخول",
  googleTestTitle: "الدخول عبر Google (تجربة)",
  googleTestSubtitle: "أكمل الدخول بحساب Google الخاص بك.",
  googleTestNote: "صفحة التجربة هذه تعمل فقط على حاسوب المطوّر بدون مفاتيح Google. في الموقع الحقيقي يمر الدخول مباشرة عبر Google.",
  googleName: "اسمك",
  googleEmail: "بريدك في Google",
  completeGoogle: "متابعة",
  googleFailed: "لم ينجح الدخول عبر Google. حاول مجدداً من فضلك.",

  loginTitle: "مرحباً بعودتك",
  loginSubtitle: "ادخل لترى مزرعتك والماء وطاقة الشمس.",
  offlineSignIn: "أنت غير متصل. اتصل بالإنترنت لتدخل.",
  sessionExpired: "تم إخراجك من حسابك. ادخل مجدداً من فضلك.",
  googleNotReady: "الدخول عبر Google غير جاهز بعد. استعمل بريدك الإلكتروني وكلمة السر.",
  signInProblem: "لم ينجح الدخول. حاول مجدداً من فضلك.",
  enterEmailAndPassword: "اكتب بريدك الإلكتروني وكلمة السر.",
  wrongEmailOrPassword: "البريد الإلكتروني أو كلمة السر غير صحيحة.",
  forgotPassword: "نسيت كلمة السر؟",
  yourPassword: "كلمة السر",
  signIn: "دخول",
  signingIn: "جارٍ الدخول…",
  newHere: "جديد هنا؟",
  createAccount: "أنشئ حساباً",
  tryDemoFarm: "جرّب المزرعة التجريبية",

  registerTitle: "أنشئ حسابك",
  registerSubtitle: "مجاناً. بعدها أضف مزرعتك في 3 خطوات قصيرة.",
  offlineRegister: "أنت غير متصل. اتصل بالإنترنت لتنشئ حساباً.",
  signUpWithGoogle: "التسجيل عبر Google",
  firstName: "الاسم",
  lastName: "اللقب",
  choosePassword: "اختر كلمة سر",
  passwordHint: "8 حروف وأرقام على الأقل",
  ruleLength: "8 رموز أو أكثر",
  ruleUpper: "حرف لاتيني كبير",
  ruleLower: "حرف لاتيني صغير",
  ruleNumber: "رقم",
  passwordRulesNotMet: "يجب أن تستوفي كلمة السر النقاط الأربع تحتها.",
  emailTaken: "لهذا البريد حساب من قبل. ادخل بدلاً من ذلك.",
  checkWhatYouTyped: "راجع ما كتبته من فضلك.",
  createAccountBtn: "أنشئ حسابي",
  creatingAccount: "جارٍ إنشاء حسابك…",
  haveAccount: "لديك حساب؟",

  resetTitle: "غيّر كلمة السر",
  resetSubtitle: "سنساعدك على استرجاع حسابك.",
  sendMeACode: "أرسل لي رمزاً",
  devCodeNotice: "رمز تجريبي (على هذا الحاسوب فقط):",
  codeLabel: "رمز من 6 أرقام",
  newPassword: "كلمة السر الجديدة",
  saveNewPassword: "احفظ كلمة السر الجديدة",
  resetDone: "تم تغيير كلمة السر. يمكنك الدخول الآن.",
  goToSignIn: "اذهب إلى الدخول",
  rememberedIt: "تذكّرتها؟",
  resetUnavailable: "تغيير كلمة السر عبر البريد غير متاح بعد. تواصل مع الدعم لاسترجاع حسابك.",
  wrongOrOldCode: "هذا الرمز خاطئ أو قديم. اطلب رمزاً جديداً.",

  offlineBadge: "لا إنترنت",
  offlineShort: "غير متصل",
  changesSaved: "{count} محفوظ في الهاتف",
  sendNow: "أرسل الآن",
  refresh: "تحديث",
  refreshFarmData: "حدّث بيانات المزرعة",
  conflictNotice: "{count} تعديل قمت به دون اتصال يختلف عن مزرعتك المحفوظة.",
  keepCloud: "أبقِ النسخة المحفوظة",
  keepPhone: "أبقِ تعديل الهاتف",
  offlineBanner: "لا إنترنت: تعديلاتك محفوظة في هذا الهاتف",
  changesWaiting: "{count} تعديل في انتظار الإرسال",
  offlineTitle: "أنت غير متصل",
  offlineBody:
    "أرقام الطقس والشمس الجديدة تحتاج إلى الإنترنت. لكن يمكنك فتح مزارعك المحفوظة وتعديلها. تُرسل تعديلاتك عند عودة الاتصال.",
  openMyFarm: "افتح مزرعتي",
  myFarms: "مزارعي",
  water: "الماء",
  savedFarms: "مزارع محفوظة في هذا الهاتف ({count})",
  noSavedFarms: "لا توجد مزرعة محفوظة في هذا الهاتف بعد.",
  report: "التقرير",

  preparingReport: "جارٍ تحضير تقرير مزرعتك…",
  verdictYesIfWater: "نعم، إذا حللت مشكلة ماء الصيف أولاً.",
  verdictYesGood: "نعم، أرض جيدة لمحاصيلك.",
  verdictShortDetail:
    "أرض ومناخ جيدان لـ{crop}. مضختك تعطي {supply} م³ في اليوم، بينما يحتاج شهر {month} إلى {demand} م³ في اليوم.",
  verdictOkDetail: "أرض ومناخ جيدان لـ{crop}. الماء وطاقة الشمس يكفيان حاجة مزرعتك.",
  flatLand: "أرض مستوية.",
  slopedLand: "أرض منحدرة.",
  rainPerYear: "{mm} مم من المطر في السنة.",
  pumpGivesVsNeed: "المضخة تعطي {supply} م³ في اليوم. شهر {month} يحتاج {demand} م³.",
  pumpCoversPeak: "مضختك تكفي حاجة شهر {month}.",
  seeFixes: "شاهد الحلول",
  seeDetails: "شاهد التفاصيل",
  sunCoversUnits: "تكفي على مدار السنة. تغطي {units} من 10 أجزاء في {month}.",
  sunCoversAllYear: "تغطي المضخة طوال السنة.",
  cropSelectedForLand: "تم اختيار {crop} لأرضك.",
  needInternetForPdf: "اتصل بالإنترنت مرة واحدة لتحضير ملف PDF لمهندسك.",
  pdfSaved: "تم حفظ ملف PDF في جهازك.",
  engineerPdfReady: "تم حفظ ملف PDF ونسخ ملخص قصير. يمكنك لصقه في رسالة إلى مهندسك.",
  pdfArabicFallback: "تعذّر تحميل الحروف العربية، لذلك حُفظ ملف PDF بالإنجليزية. حاول مجدداً عند الاتصال بالإنترنت.",

  farmSavedOnline: "تم الحفظ. أرقام مزرعتك محدّثة.",
  farmSavedOffline: "تم الحفظ في هاتفك. سيُرسل عند عودة الاتصال.",
  deleteFarmTitle: "حذف {name}؟",
  keepFarm: "أبقِ المزرعة",
  removing: "جارٍ الحذف…",
  yesDelete: "نعم، احذف {name}",

  finishAndCheck: "أنهِ وافحص مزرعتي",
  couldNotSaveFarm: "تعذّر حفظ مزرعتك. حاول مجدداً من فضلك.",

  noWaterNearby:
    "لا يوجد واد أو بحيرة أو سد أو بئر معروفة في حدود 10 كم على الخرائط المفتوحة. اسأل جيرانك، أو افحص المياه الجوفية قبل حفر بئر.",

  checkingForecast: "جارٍ فحص توقعات 7 أيام والمطر…",
  dayRainExpected: "مطر متوقع",
  dayFewDrops: "بضع قطرات",
  daySunnyHot: "مشمس · حار",
  daySunnyNoRain: "مشمس · لا مطر",
  noRain: "لا مطر",
  checkingLiveData: "جارٍ فحص الطقس والشمس…",
  statusNotChecked: "لم يُفحص بعد",
  notCheckedTitle: "لم نفحص مزرعتك بعد",
  notCheckedBody: "الماء والشمس والطقس تحتاج إلى الإنترنت مرة واحدة. اتصل ثم المس «افحص مزرعتي».",
  checkMyFarm: "افحص مزرعتي",
  checkingFarm: "جارٍ فحص مزرعتك…",
  checkFailed: "تعذّر الفحص الآن. حاول مجدداً بعد قليل.",

  askIntro:
    "اسأل أي سؤال عن الماء أو المضخات أو الألواح الشمسية أو المحاصيل أو الطقس في {farm}. المس سؤالاً، أو المس الميكروفون الأخضر لتتكلم.",
  micError: "لم نسمعك جيداً. حاول مجدداً أو اكتب سؤالك.",
  listening: "أستمع…",
  sendQuestion: "أرسل السؤال",
  factLand: "الأرض",
  factWatering: "السقي",
  factPump: "المضخة",
  factPanels: "الألواح",
  factWater: "الماء",
  pumpFlowLine: "{flow} م³ في الساعة، {hours} ساعات في اليوم",
  panelsLine: "{kw} كيلوواط (حوالي {count} لوحاً)",
  nearestWater: "أقرب نقطة على {m} م",
  noWaterOnMap: "لا شيء قريب على الخريطة",

  perYear: "في السنة",
  perDay: "في اليوم",
  notAvailable: "غير متوفر",
  sources: "المصادر",
  engEt0: "التبخر النتحي المرجعي (ET₀)",
  engGrossIrrigation: "الري الإجمالي",
  engTdh: "الارتفاع المانومتري الكلي (TDH)",
  engStaticHead: "الارتفاع الهندسي",
  engFriction: "فواقد الاحتكاك",
  engElectricalPower: "القدرة الكهربائية",
  engDailyEnergy: "طاقة المضخة",
  engAnnualEtc: "التبخر النتحي للمحصول (FAO-56 ETc)",
  engWatershed: "الحوض المائي (HydroBASINS)",
  engPvCapacity: "القدرة الشمسية المركّبة",
  engSpecificYield: "المردود النوعي (PVGIS)",
  engPvAnnual: "الإنتاج الشمسي (PVGIS)",
  engAnnualCoverage: "طاقة المضخة المغطاة في السنة",
  engSystemLosses: "فواقد النظام المفترضة",
  engTilt: "أفضل ميل للألواح",
  engAridity: "مؤشر الجفاف",
  engElevation: "الارتفاع عن سطح البحر",
  engSlope: "الانحدار",
  engWaporEt: "التبخر النتحي الفعلي (FAO WaPOR v3)",
  engWaporBiomass: "الكتلة الحيوية (WaPOR)",
  engScore: "النتيجة الإجمالية",
  engPumpPower: "قدرة المضخة",
  engApplicationEfficiency: "كفاءة الري",

  rightNowInField: "الآن في حقلك",
  fromYourSensor: "من حساسك",
  fromTheForecast: "من التوقعات",
  sensorNotSending: "الحساس لا يرسل",
  sensorNotSendingBody: "لا توجد قراءة جديدة منذ أكثر من 15 دقيقة. افحص الكهرباء أو الواي فاي.",
  sensorConnectedWaiting: "في انتظار أول قراءة من حساسك.",
  lastUpdateJustNow: "آخر تحديث الآن",
  lastUpdateMinAgo: "آخر تحديث منذ {minutes} د",
  soilWetness: "رطوبة التربة",
  soilDryLabel: "جافة — تحتاج إلى السقي",
  soilGoodLabel: "رطوبة جيدة",
  soilWetLabel: "مبلّلة — فيها ما يكفي من الماء",
  soilWireProblem: "مشكلة في سلك حساس التربة — افحص السلك",
  airTempAndHumidity: "حرارة الهواء ورطوبته",
  airHumidityWord: "رطوبة",
  tankLevel: "خزان الماء",
  tankEmptyLabel: "فارغ",
  tankLowLabel: "منخفض",
  tankGoodLabel: "جيد",
  tankFullLabel: "ممتلئ",
  pumpRunningState: "المضخة",
  pumpOnLabel: "تعمل الآن",
  pumpOffLabel: "متوقفة",
  noSensorYetBody: "اربط جهاز الحقل لترى مباشرة رطوبة التربة ومستوى الخزان وحرارة الهواء هنا.",
  addASensor: "أضف حساساً",
  addAnotherSensor: "أضف حساساً آخر",
  addSensorModalTitle: "إضافة حساس للحقل",
  addSensorModalBody: "اختر اسماً بسيطاً للجهاز. سنعطيك مفتاحاً سرياً تضعه بداخله.",
  sensorNameLabel: "اسم الحساس",
  sensorNamePlaceholder: "مثال: حساس قطعة الزيتون",
  createSensorBtn: "أنشئ المفتاح",
  creatingSensor: "جارٍ إنشاء المفتاح…",
  sensorCreateError: "تعذّر إنشاء المفتاح. تحقق من الإنترنت وحاول مجدداً.",
  sensorKeyReadyTitle: "انسخ مفتاح الحساس الآن",
  sensorKeyOnceWarning: "سيظهر هذا المفتاح مرة واحدة فقط. انسخه واحفظه في جهازك الآن.",
  sensorKeyInstructions: "ضع هذا المفتاح مقابل DEVICE_KEY في ملف secrets.h داخل الجهاز.",
  copyKeyBtn: "نسخ المفتاح",
  keyCopied: "تم النسخ!",
  closeBtn: "تم",
  removeSensorBtn: "فصل الحساس",
  waterTodayFromSensorDry: "اسقِ اليوم — التربة جافة",
  skipWaterTodayFromSensorWet: "لا تسقِ اليوم — التربة ما زالت رطبة",
  connectBluetoothBtn: "اتصل عبر البلوتوث",
  connectingBluetooth: "جارٍ الاتصال…",
  bluetoothConnectedBadge: "بلوتوث مباشر",
  disconnectBluetoothBtn: "قطع الاتصال",
  bluetoothConnectionFailed: "تعذّر الاتصال بالحساس عبر البلوتوث. تأكد أن الجهاز مشتغل وقريب منك.",
  bluetoothUnsupportedHint: "استعمل Chrome أو Edge للاتصال المباشر بالبلوتوث، أو أضف مفتاح واي فاي.",
};

const JA: ScreenStrings = {
  appTagline: "農園・水・太陽光パワー",
  panelBadge: "農家のためのスマート支援",
  panelTitle: "投資する前に、水と太陽光電力が足りるかを確かめましょう。",
  panelBody:
    "地図上に農園を登録するだけで、TerraPulseが気象・周辺水源・日照量を解析し、必要な対策をわかりやすくお伝えします。",
  panelMapTitle: "地図で農園を管理",
  panelMapText: "数タップで農地の位置と形を登録",
  panelWaterTitle: "作物に必要な水量",
  panelWaterText: "月ごとの水需要とポンプ能力を診断",
  panelSunTitle: "太陽光発電パワー",
  panelSunText: "夏のピーク時に太陽光でポンプを動かせるか判定",
  panelOfflineTitle: "オフラインでも動作",
  panelOfflineText: "端末に保存し、ネット復帰時に自動同期",
  panelFootnote:
    "気象・標高・地図データは実測/公開データに基づきます。水量・発電数値は推定値のため購入前に専門家へご確認ください。",

  email: "メールアドレス",
  password: "パスワード",
  showPassword: "パスワードを表示",
  hidePassword: "パスワードを隠す",
  continueWithGoogle: "Googleで続ける",
  orUseEmail: "またはメールでサインイン",
  noConnection: "インターネットに接続されていません。接続を確認してください。",
  googleNeedsInternet: "Googleサインインにはインターネット接続が必要です。",
  tooManyTries: "試行回数が多すぎます。数分待ってからもう一度お試しください。",
  somethingWentWrong: "エラーが発生しました。もう一度お試しください。",
  backToSignIn: "サインインへ戻る",
  googleTestTitle: "Google サインイン（テスト）",
  googleTestSubtitle: "Googleアカウントでのログインを完了してください。",
  googleTestNote: "これは開発用テスト画面です。本番環境ではGoogle認証画面へ直接移動します。",
  googleName: "お名前",
  googleEmail: "Googleメールアドレス",
  completeGoogle: "続ける",
  googleFailed: "Googleサインインに失敗しました。もう一度お試しください。",

  loginTitle: "おかえりなさい",
  loginSubtitle: "サインインして農園の水・太陽光データを確認しましょう。",
  offlineSignIn: "オフラインです。初回サインインには接続が必要です。",
  sessionExpired: "セッションの有効期限が切れました。再度サインインしてください。",
  googleNotReady: "Googleサインインの準備ができていません。メールとパスワードをご利用ください。",
  signInProblem: "サインインできませんでした。入力内容をお確かめください。",
  enterEmailAndPassword: "メールアドレスとパスワードを入力してください。",
  wrongEmailOrPassword: "メールアドレスまたはパスワードが正しくありません。",
  forgotPassword: "パスワードをお忘れですか？",
  yourPassword: "パスワード",
  signIn: "サインイン",
  signingIn: "サインイン中…",
  newHere: "初めてご利用ですか？",
  createAccount: "アカウント作成",
  tryDemoFarm: "デモ農園を試す",

  registerTitle: "アカウントを作成",
  registerSubtitle: "無料登録のあと、3ステップで農園を登録できます。",
  offlineRegister: "オフラインです。新規登録にはインターネット接続が必要です。",
  signUpWithGoogle: "Googleで登録",
  firstName: "名（First name）",
  lastName: "姓（Last name）",
  choosePassword: "パスワードを設定",
  passwordHint: "英数字を含む8文字以上",
  ruleLength: "8文字以上",
  ruleUpper: "大文字を1文字以上",
  ruleLower: "小文字を1文字以上",
  ruleNumber: "数字を1文字以上",
  passwordRulesNotMet: "パスワードは下の4つの条件をすべて満たす必要があります。",
  emailTaken: "このメールアドレスは既に登録されています。サインインしてください。",
  checkWhatYouTyped: "入力内容を確認してください。",
  createAccountBtn: "アカウントを作成",
  creatingAccount: "作成中…",
  haveAccount: "すでにアカウントをお持ちですか？",

  resetTitle: "パスワードをリセット",
  resetSubtitle: "確認コードを使って再設定できます。",
  sendMeACode: "確認コードを送信",
  devCodeNotice: "テスト用コード（開発端末のみ）：",
  codeLabel: "6桁の確認コード",
  newPassword: "新しいパスワード",
  saveNewPassword: "新しいパスワードを保存",
  resetDone: "パスワードを変更しました。サインインできます。",
  goToSignIn: "サインイン画面へ",
  rememberedIt: "思い出しましたか？",
  resetUnavailable: "メールでのリセットは現在利用できません。サポートへご連絡ください。",
  wrongOrOldCode: "コードが間違っているか期限切れです。再発行してください。",

  offlineBadge: "オフライン",
  offlineShort: "オフライン",
  changesSaved: "{count}件を端末に保存",
  sendNow: "今すぐ同期",
  refresh: "更新",
  refreshFarmData: "農園データを再計算",
  conflictNotice: "オフラインでの変更 {count} 件がサーバーの保存内容と競合しています。",
  keepCloud: "サーバー側を残す",
  keepPhone: "端末の変更を残す",
  offlineBanner: "オフライン：変更はこの端末に安全に保存されます",
  changesWaiting: "{count}件の同期待ち",
  offlineTitle: "オフライン状態です",
  offlineBody: "最新の気象・太陽光取得には接続が必要ですが、保存済み農園の確認や編集はそのまま行えます。",
  openMyFarm: "農園を開く",
  myFarms: "登録農園",
  water: "水収支",
  savedFarms: "端末に保存された農園（{count}件）",
  noSavedFarms: "この端末に保存された農園はまだありません。",
  report: "レポート",

  preparingReport: "農園レポートを作成しています…",
  verdictYesIfWater: "まず夏の水確保ができれば適しています。",
  verdictYesGood: "はい、この作物に適した良い農地です。",
  verdictShortDetail: "{crop} に適した土地と気候ですが、{month}は1日 {demand} m³ 必要なのに対しポンプ供給量は {supply} m³/日です。",
  verdictOkDetail: "{crop} に適した土地と気候です。水と太陽光電力は農園の規模に見合っています。",
  flatLand: "平坦な地形です。",
  slopedLand: "傾斜のある地形です。",
  rainPerYear: "年間降水量は約 {mm} mm です。",
  pumpGivesVsNeed: "ポンプ供給量 {supply} m³/日 · {month}必要量 {demand} m³/日。",
  pumpCoversPeak: "{month}のピーク需要をポンプで賄えます。",
  seeFixes: "対策を見る",
  seeDetails: "詳細を見る",
  sunCoversUnits: "年間では十分です。{month}は需要の10分の {units} を賄えます。",
  sunCoversAllYear: "年間を通じてポンプ電力を賄えます。",
  cropSelectedForLand: "{crop} がこの農地に設定されています。",
  needInternetForPdf: "技術者向けPDFの準備にはインターネット接続が必要です。",
  pdfSaved: "PDFを端末に保存しました。",
  engineerPdfReady: "PDFを保存し、要約テキストをコピーしました。技術者にそのまま送信できます。",
  pdfArabicFallback: "一部文字フォントの読み込み制限により、PDFは英語レイアウトで保存されました。",

  farmSavedOnline: "保存しました。農園の数値が更新されました。",
  farmSavedOffline: "端末に保存しました。オンライン復帰時に自動送信されます。",
  deleteFarmTitle: "{name} を削除しますか？",
  keepFarm: "残す",
  removing: "削除中…",
  yesDelete: "はい、{name} を削除",

  finishAndCheck: "完了して農園を診断",
  couldNotSaveFarm: "農園を保存できませんでした。もう一度お試しください。",

  noWaterNearby: "公開地図の半径10km以内に河川・ダム・井戸の登録がありません。掘削前に近隣確認や地下水位調査を行ってください。",

  checkingForecast: "7日間の天気予報と降水を確認中…",
  dayRainExpected: "雨の予報",
  dayFewDrops: "弱い雨・小雨",
  daySunnyHot: "晴れ · 高温",
  daySunnyNoRain: "晴れ · 雨なし",
  noRain: "雨なし",
  checkingLiveData: "最新の気象と日照データを取得中…",
  statusNotChecked: "未診断",
  notCheckedTitle: "この農園はまだ診断されていません",
  notCheckedBody: "水・太陽光・天気の取得には接続が必要です。接続後「農園を診断」を押してください。",
  checkMyFarm: "農園を診断する",
  checkingFarm: "農園を診断中…",
  checkFailed: "現在診断を取得できませんでした。少し後でお試しください。",

  askIntro: "{farm} の水・ポンプ・太陽光・作物・天気について何でも質問できます。例文を押すかマイクで話してください。",
  micError: "音声を聞き取れませんでした。もう一度話すか文字で入力してください。",
  listening: "聞き取り中…",
  sendQuestion: "質問を送信",
  factLand: "土地",
  factWatering: "灌漑",
  factPump: "ポンプ",
  factPanels: "太陽光",
  factWater: "水需要",
  pumpFlowLine: "{flow} m³/時 · 1日 {hours} 時間",
  panelsLine: "{kw} kW（パネル約 {count} 枚）",
  nearestWater: "最寄り水源まで {m} m",
  noWaterOnMap: "周辺マップに水源データなし",

  perYear: "/年",
  perDay: "/日",
  notAvailable: "データなし",
  sources: "データ出典",
  engEt0: "基準蒸発散量 (ET₀)",
  engGrossIrrigation: "総灌漑水量",
  engTdh: "全揚程 (TDH)",
  engStaticHead: "実揚程",
  engFriction: "配管摩擦損失",
  engElectricalPower: "所要電力",
  engDailyEnergy: "日次ポンプ電力量",
  engAnnualEtc: "作物蒸発散量 (FAO-56 ETc)",
  engWatershed: "流域 (HydroBASINS)",
  engPvCapacity: "太陽光設備容量",
  engSpecificYield: "比発電量 (PVGIS)",
  engPvAnnual: "年間太陽光発電量 (PVGIS)",
  engAnnualCoverage: "年間ポンプ電力自給率",
  engSystemLosses: "想定システム損失",
  engTilt: "最適パネル傾斜角",
  engAridity: "乾燥指数",
  engElevation: "標高",
  engSlope: "傾斜度",
  engWaporEt: "実蒸発散量 (FAO WaPOR v3)",
  engWaporBiomass: "バイオマス生産量 (WaPOR)",
  engScore: "総合スコア",
  engPumpPower: "ポンプ定格電力",
  engApplicationEfficiency: "灌漑効率",

  rightNowInField: "現在の圃場リアルタイム状況",
  fromYourSensor: "センサー実測",
  fromTheForecast: "天気予報より",
  sensorNotSending: "センサーからの信号が途絶えています",
  sensorNotSendingBody: "15分以上データを受信していません。電源やWi-Fi/Bluetoothを確認してください。",
  sensorConnectedWaiting: "最初のセンサーデータを待っています。",
  lastUpdateJustNow: "たった今更新",
  lastUpdateMinAgo: "{minutes}分前に更新",
  soilWetness: "土壌水分",
  soilDryLabel: "乾燥 — 水やりが必要",
  soilGoodLabel: "適度な水分",
  soilWetLabel: "湿潤 — 十分な水分",
  soilWireProblem: "土壌センサー配線異常 — プローブを確認",
  airTempAndHumidity: "気温と湿度",
  airHumidityWord: "湿度",
  tankLevel: "貯水タンク",
  tankEmptyLabel: "空",
  tankLowLabel: "残量少",
  tankGoodLabel: "十分",
  tankFullLabel: "満水",
  pumpRunningState: "ポンプ",
  pumpOnLabel: "稼働中",
  pumpOffLabel: "停止",
  noSensorYetBody: "圃場デバイスを接続すると、土壌水分・タンク残量・気温と湿度がリアルタイムで表示されます。",
  addASensor: "センサーを追加",
  addAnotherSensor: "別のセンサーを追加",
  addSensorModalTitle: "圃場センサーを登録",
  addSensorModalBody: "センサー端末の名前を入力すると、専用の接続キーを発行します。",
  sensorNameLabel: "センサー名",
  sensorNamePlaceholder: "例：北側オリーブ畑センサー",
  createSensorBtn: "キーを発行",
  creatingSensor: "発行中…",
  sensorCreateError: "センサーキーを作成できませんでした。接続を確認してください。",
  sensorKeyReadyTitle: "今すぐキーをコピーしてください",
  sensorKeyOnceWarning: "このキーは1度しか表示されません。コピーして端末設定に貼り付けてください。",
  sensorKeyInstructions: "このキーを ESP32 の secrets.h の DEVICE_KEY に貼り付けます。",
  copyKeyBtn: "キーをコピー",
  keyCopied: "コピー完了！",
  closeBtn: "閉じる",
  removeSensorBtn: "センサー接続解除",
  waterTodayFromSensorDry: "今日水やり — 土壌が乾燥しています",
  skipWaterTodayFromSensorWet: "今日の水やりをスキップ — 土壌は十分湿っています",
  connectBluetoothBtn: "Bluetooth接続",
  connectingBluetooth: "接続中…",
  bluetoothConnectedBadge: "Bluetooth 接続中",
  disconnectBluetoothBtn: "切断",
  bluetoothConnectionFailed: "Bluetoothセンサーに接続できませんでした。電源が入っていて近くにあるか確認してください。",
  bluetoothUnsupportedHint: "直接Bluetooth接続にはChromeまたはEdgeをご利用ください。またはWi-Fiセンサーキーを登録してください。",
};

export const SCREEN_STRINGS: Record<AppLanguage, ScreenStrings> = { en: EN, fr: FR, ar: AR, ja: JA };
