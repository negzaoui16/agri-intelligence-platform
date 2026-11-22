"""
Generates Tunisian Derja voiceover MP3 files for the TerraPulse interactive tour
using Microsoft Edge Neural TTS (`ar-TN-HediNeural` - Tunisian Arabic male voice).
"""

import asyncio
from pathlib import Path
import edge_tts

VOICE = "ar-TN-HediNeural"
RATE = "+0%"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "public" / "audio" / "tour"

CLIPS = [
    (
        "step-1-welcome.mp3",
        "أهلا بيك في تيرا بالس! أنا دليلك التونسي، باش نعمل معاك دورة صغيرة نوريك كيفاش تستعمل السيت بسهولة.",
    ),
    (
        "step-2-sensor.mp3",
        "لهنا تشوف شنوة قاعد يصير في حقلك مباشرة: رطوبة التربة، الحرارة، مستوى الخزان، والمضخة. تنجم تربط جهاز الحقل بالبلوتوث بضغطة وحدة.",
    ),
    (
        "step-3-farmbrain.mp3",
        "هذا قسم فارم براين الذكي! يحسبلك قداش تنجم توفر ماء، ضوء، وقت، وفلوس في العام من معطيات فيرمتك، ويعطيك توقعات التربة لسبعة أيام.",
    ),
    (
        "step-4-simulator.mp3",
        "ولهنا المحاكي! تنجم تجرب أي تغيير قبل ما تصرف فلوسك: نقص الماء، تبديل النبتة، السخانة، ولا توسيع الفيرمة — من غير ما تمس المضخة الحقيقية.",
    ),
    (
        "step-5-checks.mp3",
        "من لهنا تراقب بسرعة حالة الماء، الطاقة الشمسية، والطقس متاع الأسبوع، وتعرف كان فما إنذار حرارة ولا مطر.",
    ),
    (
        "step-6-assistant.mp3",
        "تنجم تسأل المساعد الذكي أي سؤال بالصوت ولا بالكتابة، وتخرج تقرير كامل على مزرعتك.",
    ),
    (
        "step-7-settings.mp3",
        "وفي الآخر، من لهنا تبدّل اللغة بين العربية والفرنسية والإنجليزية، وتشعّل الوضع الليلي وقت تحب. بالتوفيق في فلاحتك!",
    ),
]


async def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for filename, text in CLIPS:
        out_path = OUTPUT_DIR / filename
        communicate = edge_tts.Communicate(text=text, voice=VOICE, rate=RATE)
        await communicate.save(str(out_path))
        size_kb = out_path.stat().st_size / 1024.0
        print(f"Generated {filename} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    asyncio.run(main())
