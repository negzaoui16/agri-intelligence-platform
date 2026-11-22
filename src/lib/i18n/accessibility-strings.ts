import type { AppLanguage } from "@/lib/i18n/translations";

export interface AccessibilityStrings {
  buttonLabel: string;
  buttonShort: string;
  modalTitle: string;
  modalSubtitle: string;
  shortcutHint: string;
  skipToContent: string;
  closeLabel: string;
  sectionDisplay: string;
  sectionColorFilters: string;
  sectionMotionTouch: string;
  sectionSpoken: string;
  largerTextLabel: string;
  largerTextDesc: string;
  textNormal: string;
  textLarge: string;
  textXLarge: string;
  textPreviewSample: string;
  boldTextLabel: string;
  boldTextDesc: string;
  increaseContrastLabel: string;
  increaseContrastDesc: string;
  buttonShapesLabel: string;
  buttonShapesDesc: string;
  colorFilterLabel: string;
  colorFilterDesc: string;
  filterNone: string;
  filterGrayscale: string;
  filterProtanopia: string;
  filterDeuteranopia: string;
  filterTritanopia: string;
  reduceMotionLabel: string;
  reduceMotionDesc: string;
  largerTargetsLabel: string;
  largerTargetsDesc: string;
  speakScreenLabel: string;
  speakScreenDesc: string;
  speakStartBtn: string;
  speakStopBtn: string;
  speakingStatus: string;
  speechSpeedLabel: string;
  speechUnavailable: string;
  resetAllBtn: string;
  resetDoneStatus: string;
}

export const ACCESSIBILITY_STRINGS: Record<AppLanguage, AccessibilityStrings> = {
  en: {
    buttonLabel: "Accessibility",
    buttonShort: "Access",
    modalTitle: "Accessibility",
    modalSubtitle: "iPhone-style vision, touch & speech controls for easier reading in the field",
    shortcutHint: "Shortcut: Alt + A",
    skipToContent: "Skip to main content",
    closeLabel: "Done",
    sectionDisplay: "Display & Text Size",
    sectionColorFilters: "Color Filters",
    sectionMotionTouch: "Motion & Touch",
    sectionSpoken: "Spoken Content",
    largerTextLabel: "Larger Text",
    largerTextDesc: "Scale reading text and cards up to 120% like iOS Dynamic Type",
    textNormal: "Default (A)",
    textLarge: "Large (A+)",
    textXLarge: "Extra Large (A++)",
    textPreviewSample: "Your soil moisture & solar pump status stay easy to read outdoors.",
    boldTextLabel: "Bold Text",
    boldTextDesc: "Thicken labels and numbers for bright sunlight visibility",
    increaseContrastLabel: "Increase Contrast",
    increaseContrastDesc: "Deepen text contrast, card borders, and keyboard focus rings",
    buttonShapesLabel: "Button Shapes",
    buttonShapesDesc: "Show clear outlines around buttons and underline links",
    colorFilterLabel: "Color Vision Filter",
    colorFilterDesc: "Adapt screen colors for color blindness or glare reduction",
    filterNone: "Off",
    filterGrayscale: "Grayscale",
    filterProtanopia: "Protanopia (Red-Green)",
    filterDeuteranopia: "Deuteranopia (Green-Red)",
    filterTritanopia: "Tritanopia (Blue-Yellow)",
    reduceMotionLabel: "Reduce Motion",
    reduceMotionDesc: "Turn off pulsing dots, transitions, and slide animations",
    largerTargetsLabel: "Larger Touch Targets",
    largerTargetsDesc: "Enlarge tap height (52px+) for gloved or outdoor hands",
    speakScreenLabel: "Speak Screen",
    speakScreenDesc: "Read the current screen aloud automatically",
    speakStartBtn: "Speak Screen",
    speakStopBtn: "Stop Speaking",
    speakingStatus: "Reading current page aloud…",
    speechSpeedLabel: "Speaking Rate",
    speechUnavailable: "Voice reading is unavailable on this browser.",
    resetAllBtn: "Reset All Settings",
    resetDoneStatus: "All accessibility settings reset to default.",
  },
  fr: {
    buttonLabel: "Accessibilité",
    buttonShort: "Accès",
    modalTitle: "Accessibilité",
    modalSubtitle: "Réglages de lecture, contraste, toucher et voix inspirés de l’iPhone",
    shortcutHint: "Raccourci : Alt + A",
    skipToContent: "Aller au contenu principal",
    closeLabel: "Terminé",
    sectionDisplay: "Affichage et taille du texte",
    sectionColorFilters: "Filtres de couleur",
    sectionMotionTouch: "Animations et toucher",
    sectionSpoken: "Contenu énoncé",
    largerTextLabel: "Texte plus grand",
    largerTextDesc: "Agrandir le texte et les cartes jusqu’à 120 % (type iOS)",
    textNormal: "Normal (A)",
    textLarge: "Grand (A+)",
    textXLarge: "Très grand (A++)",
    textPreviewSample: "L’humidité du sol et la pompe solaire restent faciles à lire au soleil.",
    boldTextLabel: "Texte en gras",
    boldTextDesc: "Épaissir les libellés et les chiffres en plein soleil",
    increaseContrastLabel: "Augmenter le contraste",
    increaseContrastDesc: "Renforcer les contrastes, bordures et contours de focus",
    buttonShapesLabel: "Formes des boutons",
    buttonShapesDesc: "Encadrer clairement les boutons et souligner les liens",
    colorFilterLabel: "Filtre de vision des couleurs",
    colorFilterDesc: "Adapter les couleurs pour le daltonisme ou les reflets",
    filterNone: "Désactivé",
    filterGrayscale: "Niveaux de gris",
    filterProtanopia: "Protanopie (Rouge-Vert)",
    filterDeuteranopia: "Deutéranopie (Vert-Rouge)",
    filterTritanopia: "Tritanopie (Bleu-Jaune)",
    reduceMotionLabel: "Réduire les animations",
    reduceMotionDesc: "Désactiver les transitions et effets de mouvement",
    largerTargetsLabel: "Zones tactiles agrandies",
    largerTargetsDesc: "Boutons plus hauts (52px+) pour toucher facilement au champ",
    speakScreenLabel: "Énoncer l’écran",
    speakScreenDesc: "Lire à voix haute le contenu affiché à l’écran",
    speakStartBtn: "Lire l’écran",
    speakStopBtn: "Arrêter la lecture",
    speakingStatus: "Lecture de l’écran en cours…",
    speechSpeedLabel: "Vitesse de lecture",
    speechUnavailable: "La synthèse vocale n’est pas disponible sur ce navigateur.",
    resetAllBtn: "Réinitialiser tout",
    resetDoneStatus: "Paramètres d’accessibilité réinitialisés.",
  },
  ar: {
    buttonLabel: "سهولة الوصول",
    buttonShort: "وصول",
    modalTitle: "سهولة الوصول",
    modalSubtitle: "إعدادات الشوف واللمس والقراية بالصوت كيما الآيفون باش تقرا بسهولة في الفيرمة",
    shortcutHint: "اختصار: Alt + A",
    skipToContent: "تعدى طول للمحتوى",
    closeLabel: "تم",
    sectionDisplay: "العرض وحجم الكتيبة",
    sectionColorFilters: "فلاتر الألوان",
    sectionMotionTouch: "الحركة واللمس",
    sectionSpoken: "قراية الشاشة بالصوت",
    largerTextLabel: "تكبير الكتيبة",
    largerTextDesc: "كبّر النص والبطاقات حتى 120% كيما الآيفون",
    textNormal: "عادي (A)",
    textLarge: "كبير (A+)",
    textXLarge: "كبير برشا (A++)",
    textPreviewSample: "بلل التربة وقوة المضخة الشمسية يقعدو واضحين حتى تحت الشمس.",
    boldTextLabel: "كتيبة غليظة",
    boldTextDesc: "غلّظ الكلمات والأرقام باش تبان خير في النهار",
    increaseContrastLabel: "تقوية التباين",
    increaseContrastDesc: "وضّح الألوان، الحواف متاع البطاقات وإطار التنقل",
    buttonShapesLabel: "إبراز الأزرار",
    buttonShapesDesc: "بيّن حدود الأزرار وسطّر الروابط بوضوح",
    colorFilterLabel: "فلاتر عمى الألوان",
    colorFilterDesc: "عدّل ألوان الشاشة لضعف تمييز الألوان أو تقليل اللمعان",
    filterNone: "عادي",
    filterGrayscale: "أبيض وأسود",
    filterProtanopia: "أحمر-أخضر (Protanopia)",
    filterDeuteranopia: "أخضر-أحمر (Deuteranopia)",
    filterTritanopia: "أزرق-أصفر (Tritanopia)",
    reduceMotionLabel: "تقليل الحركة",
    reduceMotionDesc: "وقّف النبض والحركات متاع الشاشة",
    largerTargetsLabel: "تكبير أزرار اللمس",
    largerTargetsDesc: "وسّع علو الأزرار (52px+) باش تنزل بسهولة حتى بالقفاز",
    speakScreenLabel: "قراية الشاشة",
    speakScreenDesc: "اسمع محتوى الصفحة الحالية بالصوت",
    speakStartBtn: "اقرا الشاشة",
    speakStopBtn: "وقّف القراية",
    speakingStatus: "قاعد يقرا في الصفحة توا…",
    speechSpeedLabel: "سرعة القراية",
    speechUnavailable: "القراية بالصوت موش متوفرة في هذا المتصفح.",
    resetAllBtn: "رجّع كل شي للأصل",
    resetDoneStatus: "رجعنا إعدادات سهولة الوصول للوضع العادي.",
  },
  ja: {
    buttonLabel: "アクセシビリティ",
    buttonShort: "支援機能",
    modalTitle: "アクセシビリティ",
    modalSubtitle: "屋外でも見やすく操作しやすいiPhone風の表示・操作・音声設定",
    shortcutHint: "ショートカット: Alt + A",
    skipToContent: "メインコンテンツへ移動",
    closeLabel: "完了",
    sectionDisplay: "画面表示とテキストサイズ",
    sectionColorFilters: "カラーフィルタ",
    sectionMotionTouch: "動作とタッチ操作",
    sectionSpoken: "読み上げコンテンツ",
    largerTextLabel: "さらに大きな文字",
    largerTextDesc: "文字とカードを最大120%まで拡大して読みやすくします",
    textNormal: "標準 (A)",
    textLarge: "大 (A+)",
    textXLarge: "特大 (A++)",
    textPreviewSample: "土壌水分や太陽光ポンプの状態が日差しの下でもくっきり読めます。",
    boldTextLabel: "文字を太くする",
    boldTextDesc: "ラベルと数値を太字にして屋外での視認性を高めます",
    increaseContrastLabel: "コントラストを上げる",
    increaseContrastDesc: "文字・カードの枠線・フォーカスリングをより鮮明にします",
    buttonShapesLabel: "ボタンの形",
    buttonShapesDesc: "ボタンの輪郭とリンクの下線をはっきり表示します",
    colorFilterLabel: "色覚サポートフィルタ",
    colorFilterDesc: "色覚特性や反射に合わせて画面の色合いを調整します",
    filterNone: "オフ",
    filterGrayscale: "グレイスケール",
    filterProtanopia: "1型2色覚（赤-緑）",
    filterDeuteranopia: "2型2色覚（緑-赤）",
    filterTritanopia: "3型2色覚（青-黄）",
    reduceMotionLabel: "視差効果を減らす",
    reduceMotionDesc: "点滅やアニメーション・切り替え動作を停止します",
    largerTargetsLabel: "タッチ領域を拡大",
    largerTargetsDesc: "ボタンの高さを52px以上に広げて手袋でも押しやすくします",
    speakScreenLabel: "画面の読み上げ",
    speakScreenDesc: "現在表示されている画面内容を音声で読み上げます",
    speakStartBtn: "画面を読み上げる",
    speakStopBtn: "読み上げを停止",
    speakingStatus: "現在のページを読み上げています…",
    speechSpeedLabel: "読み上げ速度",
    speechUnavailable: "このブラウザでは音声読み上げをご利用いただけません。",
    resetAllBtn: "すべての設定をリセット",
    resetDoneStatus: "アクセシビリティ設定を初期状態に戻しました。",
  },
};
