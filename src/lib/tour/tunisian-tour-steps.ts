import type { AppLanguage } from "@/lib/i18n/translations";

export interface TunisianTourStep {
  id: string;
  route: string;
  targetSelector: string;
  audioUrl: string;
  title: Record<AppLanguage, string>;
  subtitleDerja: string;
}

export const TUNISIAN_TOUR_STEPS: TunisianTourStep[] = [
  {
    id: "welcome",
    route: "/",
    targetSelector: '[data-tour="home-header"]',
    audioUrl: "/audio/tour/step-1-welcome.mp3",
    title: {
      en: "1. Welcome to TerraPulse",
      fr: "1. Bienvenue sur TerraPulse",
      ar: "1. مرحباً بيك في تيرا بالس",
    },
    subtitleDerja:
      "أهلا بيك في تيرا بالس! أنا دليلك التونسي، باش نعمل معاك دورة صغيرة نوريك كيفاش تستعمل السيت بسهولة.",
  },
  {
    id: "sensor",
    route: "/",
    targetSelector: '[data-tour="sensor-card"]',
    audioUrl: "/audio/tour/step-2-sensor.mp3",
    title: {
      en: "2. Live Field Sensor & Bluetooth",
      fr: "2. Capteur en Direct & Bluetooth",
      ar: "2. الحسّاس المباشر والبلوتوث",
    },
    subtitleDerja:
      "لهنا تشوف شنوة قاعد يصير في حقلك مباشرة: رطوبة التربة، الحرارة، مستوى الخزان، والمضخة. تنجم تربط جهاز الحقل بالبلوتوث بضغطة وحدة.",
  },
  {
    id: "farmbrain",
    route: "/farmbrain",
    targetSelector: '[data-tour="farmbrain-savings"]',
    audioUrl: "/audio/tour/step-3-farmbrain.mp3",
    title: {
      en: "3. FarmBrain Potential & Savings",
      fr: "3. FarmBrain Potentiel & Économies",
      ar: "3. فارم براين وفرص التوفير",
    },
    subtitleDerja:
      "هذا قسم فارم براين الذكي! يحسبلك قداش تنجم توفر ماء، ضوء، وقت، وفلوس في العام من معطيات فيرمتك، ويعطيك توقعات التربة لسبعة أيام.",
  },
  {
    id: "simulator",
    route: "/simulator",
    targetSelector: '[data-tour="simulator-scenarios"]',
    audioUrl: "/audio/tour/step-4-simulator.mp3",
    title: {
      en: "4. Safe Decision Simulator",
      fr: "4. Simulateur de Décisions Sûr",
      ar: "4. محاكي القرارات الآمن",
    },
    subtitleDerja:
      "ولهنا المحاكي! تنجم تجرب أي تغيير قبل ما تصرف فلوسك: نقص الماء، تبديل النبتة، السخانة، ولا توسيع الفيرمة — من غير ما تمس المضخة الحقيقية.",
  },
  {
    id: "checks",
    route: "/",
    targetSelector: '[data-tour="status-tiles"]',
    audioUrl: "/audio/tour/step-5-checks.mp3",
    title: {
      en: "5. Water, Solar & Weather",
      fr: "5. Eau, Solaire & Météo",
      ar: "5. الماء، الطاقة الشمسية والطقس",
    },
    subtitleDerja:
      "من لهنا تراقب بسرعة حالة الماء، الطاقة الشمسية، والطقس متاع الأسبوع، وتعرف كان فما إنذار حرارة ولا مطر.",
  },
  {
    id: "assistant",
    route: "/",
    targetSelector: '[data-tour="assistant-report"]',
    audioUrl: "/audio/tour/step-6-assistant.mp3",
    title: {
      en: "6. AI Advisor & Farm Report",
      fr: "6. Conseiller IA & Rapport PDF",
      ar: "6. المساعد الذكي والتقرير",
    },
    subtitleDerja:
      "تنجم تسأل المساعد الذكي أي سؤال بالصوت ولا بالكتابة، وتخرج تقرير كامل على مزرعتك.",
  },
  {
    id: "settings",
    route: "/",
    targetSelector: '[data-tour="theme-lang"]',
    audioUrl: "/audio/tour/step-7-settings.mp3",
    title: {
      en: "7. Language & Night Mode",
      fr: "7. Langue & Mode Nuit",
      ar: "7. اللغة والوضع الليلي",
    },
    subtitleDerja:
      "وفي الآخر، من لهنا تبدّل اللغة بين العربية والفرنسية والإنجليزية، وتشعّل الوضع الليلي وقت تحب. بالتوفيق في فلاحتك!",
  },
];

export const TOUR_UI_STRINGS: Record<
  AppLanguage,
  {
    floatingButton: string;
    welcomeTitle: string;
    welcomeBody: string;
    startTour: string;
    skipTour: string;
    stepOf: string;
    prev: string;
    next: string;
    finish: string;
    replay: string;
    pause: string;
    play: string;
    mute: string;
    unmute: string;
    autoAdvanceOn: string;
    autoAdvanceOff: string;
    close: string;
    speakingBadge: string;
  }
> = {
  en: {
    floatingButton: "Tunisian Voice Guide",
    welcomeTitle: "Want a quick tour in Tunisian Derja?",
    welcomeBody: "A friendly Tunisian voice walks you through the site step by step.",
    startTour: "Start Voice Guide",
    skipTour: "No thanks",
    stepOf: "Step {current} of {total}",
    prev: "Back",
    next: "Next",
    finish: "Finish",
    replay: "Replay",
    pause: "Pause",
    play: "Play",
    mute: "Mute",
    unmute: "Unmute",
    autoAdvanceOn: "Auto-next: ON",
    autoAdvanceOff: "Auto-next: OFF",
    close: "Close guide",
    speakingBadge: "Speaking (Tunisian Derja)",
  },
  fr: {
    floatingButton: "Guide Vocal Tounsi",
    welcomeTitle: "Une visite guidée en Derja tunisienne ?",
    welcomeBody: "Une voix tunisienne vous explique tout le site étape par étape.",
    startTour: "Démarrer le guide",
    skipTour: "Plus tard",
    stepOf: "Étape {current} sur {total}",
    prev: "Précédent",
    next: "Suivant",
    finish: "Terminer",
    replay: "Réécouter",
    pause: "Pause",
    play: "Lire",
    mute: "Couper",
    unmute: "Son activé",
    autoAdvanceOn: "Auto-suite : OUI",
    autoAdvanceOff: "Auto-suite : NON",
    close: "Fermer",
    speakingBadge: "En train de parler (Tounsi)",
  },
  ar: {
    floatingButton: "الدليل الصوتي التونسي",
    welcomeTitle: "تحب جولة بالصوت التونسي؟",
    welcomeBody: "صوت تونسي يفسّرلك السيت خطوة بخطوة بالدارجة.",
    startTour: "ابدأ الجولة",
    skipTour: "لا شكراً",
    stepOf: "الخطوة {current} من {total}",
    prev: "السابق",
    next: "التالي",
    finish: "إنهاء",
    replay: "أعد",
    pause: "إيقاف",
    play: "تشغيل",
    mute: "كتم",
    unmute: "صوت",
    autoAdvanceOn: "انتقال تلقائي",
    autoAdvanceOff: "انتقال يدوي",
    close: "إغلاق",
    speakingBadge: "يتكلّم بالتونسي",
  },
};
