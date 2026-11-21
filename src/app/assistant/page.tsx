"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Mic, MicOff, Send, Volume2, VolumeX } from "lucide-react";
import { FarmerPageHeader } from "@/components/farmer/FarmerUI";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useFarmAnalysis, useFarms } from "@/hooks/useFarms";
import { selectFarmerMetrics } from "@/lib/services/farmer-metrics";
import type { AIChatMessageRecord } from "@/types/agri";
import { cn } from "@/lib/utils";

interface ParsedAssistantReply {
  headline: string;
  bodyParagraphs: string[];
  howWeKnow: string | null;
}

function parseReplySections(raw: string): ParsedAssistantReply {
  const cleaned = raw.replace(/^>\s*\*\*Note\*\*:[^\n]*\n+/i, "").trim();
  const blocks = cleaned
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return { headline: raw, bodyParagraphs: [], howWeKnow: null };
  }

  const first = blocks[0].replace(/^\*\*(.+)\*\*$/, "$1").replace(/^#+\s*/, "");
  let howWeKnow: string | null = null;
  const bodyParagraphs: string[] = [];

  for (const block of blocks.slice(1)) {
    if (/^how do we know this:/i.test(block) || /^_?how do we know/i.test(block)) {
      howWeKnow = block.replace(/^_?how do we know this:\s*/i, "").replace(/_$/, "");
    } else {
      bodyParagraphs.push(block.replace(/\*\*/g, ""));
    }
  }

  return { headline: first, bodyParagraphs, howWeKnow };
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export default function AskPage() {
  const { lang, t, fmt, cropLabel } = useLanguage();
  const { activeFarm } = useFarms();
  const { data: analysis } = useFarmAnalysis(activeFarm);

  const [messages, setMessages] = React.useState<AIChatMessageRecord[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const [speakingId, setSpeakingId] = React.useState<string | null>(null);
  const [micNote, setMicNote] = React.useState<string | null>(null);
  const recognitionRef = React.useRef<SpeechRecognitionInstance | null>(null);

  const m = activeFarm ? selectFarmerMetrics(activeFarm, analysis) : null;

  const stopSpeech = React.useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingId(null);
  }, []);

  React.useEffect(() => {
    return () => {
      stopSpeech();
      recognitionRef.current?.stop();
    };
  }, [stopSpeech]);

  const sendMessage = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || loading) return;

    stopSpeech();
    setMicNote(null);

    const userMsg: AIChatMessageRecord = {
      id: `user_${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId: activeFarm?.id,
          message: trimmed,
          history: messages.slice(-6).map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      });
      if (!res.ok) throw new Error("Unable to answer right now.");
      const json = (await res.json()) as { message: AIChatMessageRecord };
      setMessages((prev) => [...prev, json.message]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          content:
            "**I could not reach the farm advisor right now.**\n\nCheck your connection or tap Water, Sun power, and Weather on the home screen — your farm numbers remain available offline.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSpeech = (msg: AIChatMessageRecord) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speakingId === msg.id) {
      stopSpeech();
      return;
    }
    stopSpeech();
    const parsed = parseReplySections(msg.content);
    const spoken = [parsed.headline, ...parsed.bodyParagraphs].join(" ");
    const utterance = new SpeechSynthesisUtterance(spoken);
    utterance.lang = lang === "ar" ? "ar-TN" : lang === "fr" ? "fr-FR" : "en-US";
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    setSpeakingId(msg.id);
    window.speechSynthesis.speak(utterance);
  };

  const handleMicToggle = () => {
    if (typeof window === "undefined") return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      setMicNote("Voice input is not supported in this browser. You can type your question.");
      return;
    }

    const rec = new SpeechRec();
    rec.lang = lang === "ar" ? "ar-TN" : lang === "fr" ? "fr-FR" : "en-US";
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setInput(transcript);
        sendMessage(transcript);
      }
    };
    rec.onerror = () => {
      setListening(false);
      setMicNote("Could not hear microphone clearly. Please try again or type.");
    };
    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    setMicNote(null);
    setListening(true);
    rec.start();
  };

  const sampleQuestions = [t.sampleQ1, t.sampleQ2, t.sampleQ3, t.sampleQ4];

  return (
    <div className="flex flex-col gap-5">
      <div className="lg:hidden">
        <FarmerPageHeader
          mobileLabel={t.askTitle}
          title={t.askTitle}
          subtitle={t.askSubtitle}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Conversation Column matching DeskAsk.dc.html */}
        <section className="flex-[3_1_520px] min-w-0 w-full flex flex-col gap-4">
          <header className="hidden lg:flex flex-col gap-1">
            <h1 className="m-0 text-[34px] font-bold text-[#17251C] leading-[1.15]">
              {t.askTitle}
            </h1>
            <span className="text-[17px] text-[#4A5A4F]">{t.askSubtitle}</span>
          </header>

          {/* Messages */}
          <div className="flex flex-col gap-3.5 min-h-[240px]">
            {messages.length === 0 && activeFarm && m && (
              <div className="bg-white border-[1.5px] border-[#E4DFD2] rounded-[20px] p-5 flex flex-col gap-2">
                <p className="m-0 text-[20px] font-bold text-[#17251C]">
                  {m.isWaterShort && m.peakDailyDemandM3 !== null
                    ? fmt(t.waterWillBeShortInMonth, { month: m.peakMonthName })
                    : t.waterFineTitle}
                </p>
                <p className="m-0 text-[16px] text-[#4A5A4F] leading-[1.45]">
                  Ask anything about water, pumps, solar panels, crops, or weather for{" "}
                  <b className="text-[#17251C]">{activeFarm.name}</b>. Tap a question or tap the green microphone to speak.
                </p>
              </div>
            )}

            {messages.map((msg) => {
              if (msg.role === "user") {
                return (
                  <div
                    key={msg.id}
                    className="self-end max-w-[85%] lg:max-w-[70%] bg-[#17251C] text-white rounded-[20px] rounded-ee-[6px] px-4 py-3 text-[17px] lg:text-[18px] leading-[1.4]"
                  >
                    {msg.content}
                  </div>
                );
              }

              const parsed = parseReplySections(msg.content);
              const mentionsSolar =
                msg.content.toLowerCase().includes("panel") ||
                msg.content.toLowerCase().includes("sun") ||
                msg.content.toLowerCase().includes("kwh");
              const isSpeaking = speakingId === msg.id;

              return (
                <div
                  key={msg.id}
                  className="self-start max-w-[96%] lg:max-w-[88%] bg-white border-[1.5px] border-[#E4DFD2] rounded-[20px] rounded-es-[6px] px-5 py-4 flex flex-col gap-2.5"
                >
                  <p className="m-0 text-[20px] lg:text-[22px] font-bold leading-[1.3] text-[#17251C]">
                    {parsed.headline}
                  </p>

                  {parsed.bodyParagraphs.map((para, i) => (
                    <p
                      key={i}
                      className="m-0 text-[16px] lg:text-[17px] leading-[1.5] text-[#17251C]"
                    >
                      {para}
                    </p>
                  ))}

                  {parsed.howWeKnow && (
                    <details className="text-[15px] lg:text-[16px] text-[#4A5A4F]">
                      <summary className="min-h-[44px] flex items-center cursor-pointer font-bold text-[#1D4F91]">
                        {t.howDoWeKnowTitle}
                      </summary>
                      <span className="leading-[1.5] block pb-1">{parsed.howWeKnow}</span>
                    </details>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleToggleSpeech(msg)}
                      aria-label={isSpeaking ? t.stopListeningBtn : "Read the answer out loud"}
                      className={cn(
                        "min-h-[44px] px-4 rounded-full border-[1.5px] border-[#C9C3B3] text-[15px] font-bold inline-flex items-center gap-2 transition-colors",
                        isSpeaking
                          ? "bg-[#E3EFE2] text-[#1F4D28] border-[#2E6B3A]"
                          : "bg-white text-[#17251C]"
                      )}
                    >
                      {isSpeaking ? (
                        <VolumeX className="w-5 h-5" aria-hidden="true" />
                      ) : (
                        <Volume2 className="w-5 h-5" aria-hidden="true" />
                      )}
                      <span>{isSpeaking ? t.stopListeningBtn : t.listenBtn}</span>
                    </button>

                    <Link
                      href={mentionsSolar ? "/solar" : "/water"}
                      className="min-h-[44px] px-4 rounded-full border-[1.5px] border-[#C9C3B3] bg-white text-[15px] font-bold text-[#17251C] no-underline inline-flex items-center"
                    >
                      {mentionsSolar ? t.seeSunPowerLink : t.seeWaterLink}
                    </Link>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="self-start bg-white border-[1.5px] border-[#E4DFD2] rounded-[20px] px-5 py-4 flex items-center gap-3 text-[16px] text-[#4A5A4F]">
                <Loader2 className="w-5 h-5 animate-spin text-[#2E6B3A]" />
                <span>Checking your farm numbers…</span>
              </div>
            )}
          </div>

          {/* Mobile Quick Prompts right above composer */}
          <div className="lg:hidden flex flex-col gap-2">
            <span className="text-[15px] text-[#4A5A4F]">{t.otherFarmersAsk}:</span>
            <div className="flex flex-wrap gap-2">
              {sampleQuestions.slice(0, 3).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendMessage(q)}
                  className="min-h-[44px] px-3.5 rounded-full border-[1.5px] border-[#C9C3B3] bg-white text-[15px] text-[#17251C]"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {micNote && (
            <p className="m-0 text-[15px] text-[#8A4B00] bg-[#FCEFD9] border border-[#E2B66B] rounded-[12px] px-4 py-2">
              {micNote}
            </p>
          )}

          {/* Composer Bar: Text input + Send (if text entered) + 60x60px Green Mic button */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex gap-2.5 items-center bg-white border-[1.5px] border-[#E4DFD2] rounded-[34px] p-2 ps-5"
          >
            <label htmlFor="farmer-question" className="sr-only">
              {t.typeYourQuestion}
            </label>
            <input
              id="farmer-question"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={listening ? "Listening…" : t.typeYourQuestion}
              className="flex-1 min-w-0 min-h-[52px] border-none bg-transparent text-[17px] lg:text-[18px] text-[#17251C] placeholder:text-[#4A5A4F] focus:outline-none"
            />

            {input.trim().length > 0 && (
              <button
                type="submit"
                disabled={loading}
                aria-label="Send question"
                className="w-12 h-12 rounded-full bg-[#17251C] text-white flex items-center justify-center shrink-0"
              >
                <Send className="w-5 h-5" aria-hidden="true" />
              </button>
            )}

            <button
              type="button"
              onClick={handleMicToggle}
              aria-label={t.speakYourQuestion}
              className={cn(
                "w-[60px] h-[60px] rounded-full flex items-center justify-center shrink-0 transition-colors",
                listening
                  ? "bg-[#8A4B00] animate-pulse"
                  : "bg-[#2E6B3A] hover:bg-[#23542d]"
              )}
            >
              {listening ? (
                <MicOff className="w-7 h-7 text-white" aria-hidden="true" />
              ) : (
                <Mic className="w-7 h-7 text-white" aria-hidden="true" />
              )}
            </button>
          </form>
        </section>

        {/* Right Aside Panel matching DeskAsk.dc.html */}
        <aside className="flex-[1_1_280px] min-w-0 w-full flex flex-col gap-4">
          {activeFarm && m && (
            <section className="bg-white border-[1.5px] border-[#E4DFD2] rounded-[20px] px-5 py-4.5 flex flex-col gap-2.5">
              <h2 className="m-0 text-[19px] font-bold text-[#17251C]">
                {t.whatIKnowAboutFarm}
              </h2>
              <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-2 text-[15px]">
                <dt className="text-[#4A5A4F]">Land</dt>
                <dd className="m-0 font-bold">
                  {Number(activeFarm.areaHectares.toFixed(1))} {t.hectaresShort},{" "}
                  {cropLabel(m.cropName, m.cropCode).toLowerCase()}
                </dd>

                <dt className="text-[#4A5A4F]">Watering</dt>
                <dd className="m-0 font-bold capitalize">
                  {activeFarm.irrigationConfig.irrigationMethod.toLowerCase().replace("_", " ")}
                </dd>

                <dt className="text-[#4A5A4F]">Pump</dt>
                <dd className="m-0 font-bold">
                  {m.pumpFlowM3Hr} m³/hour, {m.pumpHoursDay} hours a day
                </dd>

                <dt className="text-[#4A5A4F]">Panels</dt>
                <dd className="m-0 font-bold">
                  {m.solarKwp} kW (about {m.solarPanelCount500W})
                </dd>

                <dt className="text-[#4A5A4F]">Water</dt>
                <dd className="m-0 font-bold">
                  {m.nearestSourceDistanceM !== null
                    ? `Nearest point ${m.nearestSourceDistanceM} m`
                    : "None nearby on map"}
                </dd>
              </dl>
              <Link
                href="/farms"
                className="text-[15px] font-bold text-[#1D4F91] hover:text-[#123766] min-h-[44px] inline-flex items-center"
              >
                {t.somethingWrongFixIt}
              </Link>
            </section>
          )}

          <section className="hidden lg:flex flex-col gap-2.5">
            <h2 className="m-0 text-[19px] font-bold text-[#17251C]">
              {t.otherFarmersAsk}
            </h2>
            {sampleQuestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendMessage(q)}
                className="min-h-[48px] px-4 rounded-[14px] border-[1.5px] border-[#C9C3B3] bg-white text-[16px] text-[#17251C] text-start hover:bg-[#F6F4EE]"
              >
                {q}
              </button>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}
