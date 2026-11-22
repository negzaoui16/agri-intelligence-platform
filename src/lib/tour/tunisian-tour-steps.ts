import type { AppLanguage } from "@/lib/i18n/translations";

export interface TunisianTourStep {
  id: string;
  route: string;
  targetSelector: string;
  audioUrl: Record<AppLanguage, string>;
  title: Record<AppLanguage, string>;
  subtitle: Record<AppLanguage, string>;
}

export const TUNISIAN_TOUR_STEPS: TunisianTourStep[] = [
  {
    id: "welcome",
    route: "/",
    targetSelector: '[data-tour="home-header"]',
    audioUrl: {
      ar: "/audio/tour/step-1-welcome.mp3",
      en: "/audio/tour/en/step-1-welcome.mp3",
      fr: "/audio/tour/fr/step-1-welcome.mp3",
      ja: "/audio/tour/ja/step-1-welcome.mp3",
    },
    title: {
      en: "1. Welcome to TerraPulse",
      fr: "1. Bienvenue sur TerraPulse",
      ar: "1. مرحباً بيك في تيرا بالس",
      ja: "1. TerraPulse へようこそ",
    },
    subtitle: {
      ar: "أهلا بيك في تيرا بالس! أنا دليلك التونسي، باش نعمل معاك دورة صغيرة نوريك كيفاش تستعمل السيت بسهولة.",
      en: "Welcome to TerraPulse! I am your voice guide. Let us take a quick tour so you can use every tool on your farm with ease.",
      fr: "Bienvenue sur TerraPulse ! Je suis votre guide vocal. Faisons un rapide tour pour découvrir facilement tous les outils de votre ferme.",
      ja: "テラパルスへようこそ！音声ガイドです。農場の便利なツールをわかりやすく順番にご紹介します。",
    },
  },
  {
    id: "sensor",
    route: "/",
    targetSelector: '[data-tour="sensor-card"]',
    audioUrl: {
      ar: "/audio/tour/step-2-sensor.mp3",
      en: "/audio/tour/en/step-2-sensor.mp3",
      fr: "/audio/tour/fr/step-2-sensor.mp3",
      ja: "/audio/tour/ja/step-2-sensor.mp3",
    },
    title: {
      en: "2. Live Field Sensor & Bluetooth",
      fr: "2. Capteur en Direct & Bluetooth",
      ar: "2. الحسّاس المباشر والبلوتوث",
      ja: "2. 圃場センサー＆Bluetooth",
    },
    subtitle: {
      ar: "لهنا تشوف شنوة قاعد يصير في حقلك مباشرة: رطوبة التربة، الحرارة، مستوى الخزان، والمضخة. تنجم تربط جهاز الحقل بالبلوتوث بضغطة وحدة.",
      en: "Here you see live field readings in real time: soil moisture, temperature, water tank level, and pump status. You can pair your field sensor over Bluetooth in one tap.",
      fr: "Ici vous voyez vos mesures du champ en direct : humidité du sol, température, niveau du réservoir et état de la pompe. Vous pouvez connecter le capteur en Bluetooth en un clic.",
      ja: "ここでは土壌水分、気温と湿度、タンク残量、ポンプの稼働状況をリアルタイムで確認できます。Bluetoothセンサーもワンタップで接続できます。",
    },
  },
  {
    id: "farmbrain",
    route: "/farmbrain",
    targetSelector: '[data-tour="farmbrain-savings"]',
    audioUrl: {
      ar: "/audio/tour/step-3-farmbrain.mp3",
      en: "/audio/tour/en/step-3-farmbrain.mp3",
      fr: "/audio/tour/fr/step-3-farmbrain.mp3",
      ja: "/audio/tour/ja/step-3-farmbrain.mp3",
    },
    title: {
      en: "3. FarmBrain Potential & Savings",
      fr: "3. FarmBrain Potentiel & Économies",
      ar: "3. فارم براين وفرص التوفير",
      ja: "3. FarmBrain AI 節水・節約予測",
    },
    subtitle: {
      ar: "هذا قسم فارم براين الذكي! يحسبلك قداش تنجم توفر ماء، ضوء، وقت، وفلوس في العام من معطيات فيرمتك، ويعطيك توقعات التربة لسبعة أيام.",
      en: "This is FarmBrain AI! It calculates how much water, electricity, field time, and money your farm can save each year, along with a 7-day soil moisture forecast.",
      fr: "Voici FarmBrain IA ! Il calcule combien d'eau, d'électricité, de temps et d'argent votre ferme peut économiser par an, avec la prévision d'humidité sur sept jours.",
      ja: "こちらはファームブレインAIです。年間の節水量・節電量・作業時間の削減と節約額を計算し、7日間の土壌水分予測を表示します。",
    },
  },
  {
    id: "simulator",
    route: "/simulator",
    targetSelector: '[data-tour="simulator-scenarios"]',
    audioUrl: {
      ar: "/audio/tour/step-4-simulator.mp3",
      en: "/audio/tour/en/step-4-simulator.mp3",
      fr: "/audio/tour/fr/step-4-simulator.mp3",
      ja: "/audio/tour/ja/step-4-simulator.mp3",
    },
    title: {
      en: "4. Safe Decision Simulator",
      fr: "4. Simulateur de Décisions Sûr",
      ar: "4. محاكي القرارات الآمن",
      ja: "4. 安全な意思決定シミュレーター",
    },
    subtitle: {
      ar: "ولهنا المحاكي! تنجم تجرب أي تغيير قبل ما تصرف فلوسك: نقص الماء، تبديل النبتة، السخانة، ولا توسيع الفيرمة — من غير ما تمس المضخة الحقيقية.",
      en: "And here is the safe Decision Simulator! Test any change before spending money: water shortage, switching crops, heatwaves, or expanding plots, without ever touching your real pump.",
      fr: "Et voici le Simulateur de Décisions sûr ! Testez tout changement avant d'investir : manque d'eau, changement de culture, chaleur ou extension, sans toucher à la vraie pompe.",
      ja: "こちらは安全な意思決定シミュレーターです。実際のポンプを動かさずに、水不足、作物の変更、猛暑、農地拡大などの影響を事前にテストできます。",
    },
  },
  {
    id: "checks",
    route: "/",
    targetSelector: '[data-tour="status-tiles"]',
    audioUrl: {
      ar: "/audio/tour/step-5-checks.mp3",
      en: "/audio/tour/en/step-5-checks.mp3",
      fr: "/audio/tour/fr/step-5-checks.mp3",
      ja: "/audio/tour/ja/step-5-checks.mp3",
    },
    title: {
      en: "5. Water, Solar & Weather",
      fr: "5. Eau, Solaire & Météo",
      ar: "5. الماء، الطاقة الشمسية والطقس",
      ja: "5. 水・太陽光・天気チェック",
    },
    subtitle: {
      ar: "من لهنا تراقب بسرعة حالة الماء، الطاقة الشمسية، والطقس متاع الأسبوع، وتعرف كان فما إنذار حرارة ولا مطر.",
      en: "From here you quickly monitor water balance, solar power adequacy, and this week's weather forecast, including any heat or rain alerts.",
      fr: "D'ici vous suivez d'un coup d'œil l'eau disponible, l'énergie solaire et la météo de la semaine, avec les alertes de chaleur ou de pluie.",
      ja: "ここから水バランス、太陽光発電の充足度、今週の天気予報や高温・降雨のアラートをひと目で確認できます。",
    },
  },
  {
    id: "assistant",
    route: "/",
    targetSelector: '[data-tour="assistant-report"]',
    audioUrl: {
      ar: "/audio/tour/step-6-assistant.mp3",
      en: "/audio/tour/en/step-6-assistant.mp3",
      fr: "/audio/tour/fr/step-6-assistant.mp3",
      ja: "/audio/tour/ja/step-6-assistant.mp3",
    },
    title: {
      en: "6. AI Advisor & Farm Report",
      fr: "6. Conseiller IA & Rapport PDF",
      ar: "6. المساعد الذكي والتقرير",
      ja: "6. AI相談＆農園レポートPDF",
    },
    subtitle: {
      ar: "تنجم تسأل المساعد الذكي أي سؤال بالصوت ولا بالكتابة، وتخرج تقرير كامل على مزرعتك.",
      en: "You can ask the AI farm advisor any question by voice or text, and generate a complete printable farm feasibility report.",
      fr: "Vous pouvez poser n'importe quelle question au conseiller agricole IA par la voix ou par écrit, et exporter un rapport complet de votre ferme.",
      ja: "AI農業アドバイザーに音声やテキストで気軽に質問したり、農場の診断レポートPDFを作成・印刷したりできます。",
    },
  },
  {
    id: "settings",
    route: "/",
    targetSelector: '[data-tour="theme-lang"]',
    audioUrl: {
      ar: "/audio/tour/step-7-settings.mp3",
      en: "/audio/tour/en/step-7-settings.mp3",
      fr: "/audio/tour/fr/step-7-settings.mp3",
      ja: "/audio/tour/ja/step-7-settings.mp3",
    },
    title: {
      en: "7. Language & Night Mode",
      fr: "7. Langue & Mode Nuit",
      ar: "7. اللغة والوضع الليلي",
      ja: "7. 言語切り替え＆ナイトモード",
    },
    subtitle: {
      ar: "وفي الآخر، من لهنا تبدّل اللغة بين العربية والفرنسية والإنجليزية، وتشعّل الوضع الليلي وقت تحب. بالتوفيق في فلاحتك!",
      en: "Finally, switch languages between English, Arabic, and French anytime right here, or toggle Night Mode for comfortable reading. Wishing you a great harvest!",
      fr: "Enfin, changez de langue entre le français, l'arabe et l'anglais à tout moment ici, ou activez le mode nuit pour plus de confort. Bonne récolte !",
      ja: "最後に、ここからいつでも言語の切り替えやナイトモードの設定ができます。素晴らしい収穫になりますように！",
    },
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
    floatingButton: "Voice Guide",
    welcomeTitle: "Want a quick guided tour?",
    welcomeBody: "A friendly voice walks you through the site step by step in your chosen language.",
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
    speakingBadge: "Speaking (English)",
  },
  fr: {
    floatingButton: "Guide Vocal",
    welcomeTitle: "Une visite guidée vocale ?",
    welcomeBody: "Une voix vous explique tout le site étape par étape dans la langue choisie.",
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
    speakingBadge: "En train de parler (Français)",
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
  ja: {
    floatingButton: "音声ガイド",
    welcomeTitle: "日本語の音声ガイドを使いますか？",
    welcomeBody: "優しい音声でサイトの使い方をステップごとにご案内します。",
    startTour: "ガイドを開始",
    skipTour: "あとで",
    stepOf: "ステップ {current} / {total}",
    prev: "前へ",
    next: "次へ",
    finish: "完了",
    replay: "もう一度",
    pause: "一時停止",
    play: "再生",
    mute: "ミュート",
    unmute: "音声オン",
    autoAdvanceOn: "自動送り：オン",
    autoAdvanceOff: "自動送り：オフ",
    close: "閉じる",
    speakingBadge: "音声案内中（日本語）",
  },
};
