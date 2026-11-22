"""
Generates voiceover MP3 files for the TerraPulse interactive tour using
Microsoft Edge Neural TTS across all 4 supported languages:
  - Tunisian Arabic (`ar-TN-HediNeural`) -> public/audio/tour/step-*.mp3
  - English (`en-US-AndrewNeural`)       -> public/audio/tour/en/step-*.mp3
  - French (`fr-FR-HenriNeural`)         -> public/audio/tour/fr/step-*.mp3
  - Japanese (`ja-JP-KeitaNeural`)       -> public/audio/tour/ja/step-*.mp3
"""

import asyncio
from pathlib import Path
import edge_tts

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "public" / "audio" / "tour"
RATE = "+0%"

VOICES = {
    "ar": ("ar-TN-HediNeural", OUTPUT_DIR),
    "en": ("en-US-AndrewNeural", OUTPUT_DIR / "en"),
    "fr": ("fr-FR-HenriNeural", OUTPUT_DIR / "fr"),
    "ja": ("ja-JP-KeitaNeural", OUTPUT_DIR / "ja"),
}

STEPS = [
    (
        "step-1-welcome.mp3",
        {
            "ar": "أهلا بيك في تيرا بالس! أنا دليلك التونسي، باش نعمل معاك دورة صغيرة نوريك كيفاش تستعمل السيت بسهولة.",
            "en": "Welcome to TerraPulse! I am your voice guide. Let us take a quick tour so you can use every tool on your farm with ease.",
            "fr": "Bienvenue sur TerraPulse ! Je suis votre guide vocal. Faisons un rapide tour pour découvrir facilement tous les outils de votre ferme.",
            "ja": "テラパルスへようこそ！音声ガイドです。農場の便利なツールをわかりやすく順番にご紹介します。",
        },
    ),
    (
        "step-2-sensor.mp3",
        {
            "ar": "لهنا تشوف شنوة قاعد يصير في حقلك مباشرة: رطوبة التربة، الحرارة، مستوى الخزان، والمضخة. تنجم تربط جهاز الحقل بالبلوتوث بضغطة وحدة.",
            "en": "Here you see live field readings in real time: soil moisture, temperature, water tank level, and pump status. You can pair your field sensor over Bluetooth in one tap.",
            "fr": "Ici vous voyez vos mesures du champ en direct : humidité du sol, température, niveau du réservoir et état de la pompe. Vous pouvez connecter le capteur en Bluetooth en un clic.",
            "ja": "ここでは土壌水分、気温と湿度、タンク残量、ポンプの稼働状況をリアルタイムで確認できます。Bluetoothセンサーもワンタップで接続できます。",
        },
    ),
    (
        "step-3-farmbrain.mp3",
        {
            "ar": "هذا قسم فارم براين الذكي! يحسبلك قداش تنجم توفر ماء، ضوء، وقت، وفلوس في العام من معطيات فيرمتك، ويعطيك توقعات التربة لسبعة أيام.",
            "en": "This is FarmBrain AI! It calculates how much water, electricity, field time, and money your farm can save each year, along with a 7-day soil moisture forecast.",
            "fr": "Voici FarmBrain IA ! Il calcule combien d'eau, d'électricité, de temps et d'argent votre ferme peut économiser par an, avec la prévision d'humidité sur sept jours.",
            "ja": "こちらはファームブレインAIです。年間の節水量・節電量・作業時間の削減と節約額を計算し、7日間の土壌水分予測を表示します。",
        },
    ),
    (
        "step-4-simulator.mp3",
        {
            "ar": "ولهنا المحاكي! تنجم تجرب أي تغيير قبل ما تصرف فلوسك: نقص الماء، تبديل النبتة، السخانة، ولا توسيع الفيرمة — من غير ما تمس المضخة الحقيقية.",
            "en": "And here is the safe Decision Simulator! Test any change before spending money: water shortage, switching crops, heatwaves, or expanding plots, without ever touching your real pump.",
            "fr": "Et voici le Simulateur de Décisions sûr ! Testez tout changement avant d'investir : manque d'eau, changement de culture, chaleur ou extension, sans toucher à la vraie pompe.",
            "ja": "こちらは安全な意思決定シミュレーターです。実際のポンプを動かさずに、水不足、作物の変更、猛暑、農地拡大などの影響を事前にテストできます。",
        },
    ),
    (
        "step-5-checks.mp3",
        {
            "ar": "من لهنا تراقب بسرعة حالة الماء، الطاقة الشمسية، والطقس متاع الأسبوع، وتعرف كان فما إنذار حرارة ولا مطر.",
            "en": "From here you quickly monitor water balance, solar power adequacy, and this week's weather forecast, including any heat or rain alerts.",
            "fr": "D'ici vous suivez d'un coup d'œil l'eau disponible, l'énergie solaire et la météo de la semaine, avec les alertes de chaleur ou de pluie.",
            "ja": "ここから水バランス、太陽光発電の充足度、今週の天気予報や高温・降雨のアラートをひと目で確認できます。",
        },
    ),
    (
        "step-6-assistant.mp3",
        {
            "ar": "تنجم تسأل المساعد الذكي أي سؤال بالصوت ولا بالكتابة، وتخرج تقرير كامل على مزرعتك.",
            "en": "You can ask the AI farm advisor any question by voice or text, and generate a complete printable farm feasibility report.",
            "fr": "Vous pouvez poser n'importe quelle question au conseiller agricole IA par la voix ou par écrit, et exporter un rapport complet de votre ferme.",
            "ja": "AI農業アドバイザーに音声やテキストで気軽に質問したり、農場の診断レポートPDFを作成・印刷したりできます。",
        },
    ),
    (
        "step-7-settings.mp3",
        {
            "ar": "وفي الآخر، من لهنا تبدّل اللغة بين العربية والفرنسية والإنجليزية، وتشعّل الوضع الليلي وقت تحب. بالتوفيق في فلاحتك!",
            "en": "Finally, switch languages between English, Arabic, and French anytime right here, or toggle Night Mode for comfortable reading. Wishing you a great harvest!",
            "fr": "Enfin, changez de langue entre le français, l'arabe et l'anglais à tout moment ici, ou activez le mode nuit pour plus de confort. Bonne récolte !",
            "ja": "最後に、ここからいつでも言語の切り替えやナイトモードの設定ができます。素晴らしい収穫になりますように！",
        },
    ),
]


async def synthesize_with_retry(text: str, voice: str, out_path: Path) -> None:
    if out_path.exists() and out_path.stat().st_size > 1024:
        size_kb = out_path.stat().st_size / 1024.0
        print(f"Skipping existing {out_path.name} ({size_kb:.1f} KB)")
        return

    tmp_path = out_path.with_suffix(".mp3.tmp")
    last_err: Exception | None = None
    for attempt in range(1, 5):
        try:
            if tmp_path.exists():
                tmp_path.unlink()
            communicate = edge_tts.Communicate(text=text, voice=voice, rate=RATE)
            await communicate.save(str(tmp_path))
            if tmp_path.stat().st_size > 1024:
                tmp_path.replace(out_path)
                return
            raise RuntimeError("Empty audio output received")
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            if tmp_path.exists():
                tmp_path.unlink()
            await asyncio.sleep(attempt * 2.0)

    raise RuntimeError(f"Failed generating {out_path.name}: {last_err}")


async def main() -> None:
    for lang, (voice, out_dir) in VOICES.items():
        out_dir.mkdir(parents=True, exist_ok=True)
        for filename, texts in STEPS:
            out_path = out_dir / filename
            await synthesize_with_retry(texts[lang], voice, out_path)
            size_kb = out_path.stat().st_size / 1024.0
            print(f"[{lang}] Ready {out_path.relative_to(OUTPUT_DIR)} ({size_kb:.1f} KB)")
            await asyncio.sleep(0.8)


if __name__ == "__main__":
    asyncio.run(main())
