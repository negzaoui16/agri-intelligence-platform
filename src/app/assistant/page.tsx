"use client";

import * as React from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
} from "@/components/ui/primitives";
import { useFarms } from "@/hooks/useFarms";
import { useAppStore } from "@/lib/store/app-store";
import { formatTimestamp } from "@/lib/utils";
import type { AIChatMessageRecord } from "@/types/agri";
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Send,
  Settings2,
  Sparkles,
  Wrench,
} from "lucide-react";

const QUICK_PROMPTS = [
  "Is this land suitable for agriculture?",
  "Is there water near my farm and what is the elevation difference?",
  "Can I install a solar-powered irrigation pump?",
  "How many solar panels do I need for this pump?",
  "What crops would you recommend for this climate?",
  "What are the main environmental risks?",
  "Generate an agricultural feasibility report.",
];

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={idx}
          className="px-1 py-0.5 rounded bg-card border border-border font-mono text-[11px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function FormattedMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let tableRows: string[][] = [];
  let listItems: string[] = [];

  const flushList = (keyPrefix: string) => {
    if (listItems.length === 0) return;
    elements.push(
      <ul key={`${keyPrefix}_list`} className="list-disc pl-4 space-y-1">
        {listItems.map((item, i) => (
          <li key={i}>{renderInlineMarkdown(item)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  const flushTable = (keyPrefix: string) => {
    if (tableRows.length === 0) return;
    const [header, ...rest] = tableRows;
    const bodyRows = rest.filter((r) => !r.every((c) => /^[-:\s]+$/.test(c)));
    elements.push(
      <div key={`${keyPrefix}_tbl`} className="overflow-x-auto my-2">
        <table className="w-full text-[11px] border border-border rounded">
          <thead>
            <tr className="bg-card border-b border-border">
              {header.map((cell, i) => (
                <th key={i} className="px-2 py-1 text-left font-semibold">
                  {renderInlineMarkdown(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((row, rIdx) => (
              <tr key={rIdx} className="border-b border-border/50">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-2 py-1">
                    {renderInlineMarkdown(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (line.startsWith("|") && line.endsWith("|")) {
      flushList(`l_${idx}`);
      const cells = line
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      tableRows.push(cells);
      return;
    }
    flushTable(`t_${idx}`);

    if (line.startsWith("- ") || line.startsWith("* ")) {
      listItems.push(line.slice(2));
      return;
    }
    flushList(`l_${idx}`);

    if (!line) return;
    if (line.startsWith("### ")) {
      elements.push(
        <h4 key={idx} className="font-bold text-sm pt-1">
          {renderInlineMarkdown(line.slice(4))}
        </h4>
      );
    } else if (line.startsWith("#### ")) {
      elements.push(
        <h5 key={idx} className="font-semibold text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 pt-1">
          {renderInlineMarkdown(line.slice(5))}
        </h5>
      );
    } else if (line.startsWith("> ")) {
      elements.push(
        <blockquote
          key={idx}
          className="border-l-2 border-amber-500 pl-2.5 text-muted-foreground italic"
        >
          {renderInlineMarkdown(line.slice(2))}
        </blockquote>
      );
    } else {
      elements.push(
        <p key={idx} className="leading-relaxed">
          {renderInlineMarkdown(line)}
        </p>
      );
    }
  });

  flushList("end");
  flushTable("end");

  return <div className="space-y-1.5">{elements}</div>;
}

export default function AssistantPage() {
  const { farms, activeFarm } = useFarms();
  const isOnline = useAppStore((s) => s.isOnline);

  const [messages, setMessages] = React.useState<AIChatMessageRecord[]>([]);
  const [input, setInput] = React.useState("");
  const [compareFarmId, setCompareFarmId] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [groqKey, setGroqKey] = React.useState("");
  const [groqModel, setGroqModel] = React.useState("");
  const [expandedTools, setExpandedTools] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (!activeFarm?.id) return;
    fetch(`/api/ai/chat?farmId=${encodeURIComponent(activeFarm.id)}`)
      .then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((j) => {
        if (Array.isArray(j.messages)) setMessages(j.messages);
      })
      .catch(() => undefined);
  }, [activeFarm?.id]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: AIChatMessageRecord = {
      id: `local_u_${Date.now()}`,
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
          compareFarmId: compareFarmId || undefined,
          message: trimmed,
          history: messages.slice(-8).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          groqApiKeyOverride: groqKey || undefined,
          groqModelOverride: groqModel || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Assistant request failed");
      }
      const json = (await res.json()) as { message: AIChatMessageRecord };
      setMessages((prev) => [...prev, json.message]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          content: `Unable to execute live tool call (${err instanceof Error ? err.message : "offline"}). Please reconnect to query external scientific engines or check the cached Feasibility Reports tab.`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-6 w-6 text-[#14532d] dark:text-emerald-400" />
            AI Agricultural & Engineering Assistant
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Tool-calling assistant grounded in Open-Meteo, PVGIS, HydroSHEDS, OpenStreetMap, WaPOR & FAO-56.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={compareFarmId}
            onChange={(e) => setCompareFarmId(e.target.value)}
            className="h-9 text-xs w-48"
            aria-label="Compare with another farm"
          >
            <option value="">No comparison farm</option>
            {farms
              .filter((f) => f.id !== activeFarm?.id)
              .map((f) => (
                <option key={f.id} value={f.id}>
                  Compare: {f.name}
                </option>
              ))}
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSettings((v) => !v)}
          >
            <Settings2 className="h-3.5 w-3.5" />
            LLM Config
          </Button>
        </div>
      </div>

      {showSettings && (
        <Card>
          <CardContent className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-medium">Optional Groq API Key (Session Override)</label>
              <Input
                type="password"
                placeholder="Uses server GROQ_API_KEY env by default"
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>
            <div>
              <label className="font-medium">Optional Groq Model Name</label>
              <Input
                placeholder="e.g., llama-3.3-70b-versatile (uses GROQ_MODEL env)"
                value={groqModel}
                onChange={(e) => setGroqModel(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Prompts */}
      <div className="flex flex-wrap gap-1.5">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => sendMessage(prompt)}
            disabled={loading}
            className="text-[11px] px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted transition-colors cursor-pointer text-left"
          >
            <Sparkles className="h-3 w-3 inline mr-1 text-amber-600" />
            {prompt}
          </button>
        ))}
        {compareFarmId && (
          <button
            onClick={() => sendMessage("Compare these two agricultural locations.")}
            disabled={loading}
            className="text-[11px] px-3 py-1.5 rounded-full border border-[#14532d] bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 cursor-pointer"
          >
            Compare these two locations
          </button>
        )}
      </div>

      {/* Conversation Thread */}
      <Card className="min-h-[380px] flex flex-col">
        <CardHeader className="border-b border-border py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>
              Property Context: {activeFarm?.name ?? "Default Coordinates"}
            </span>
            <Badge variant={isOnline ? "green" : "amber"}>
              {isOnline ? "Live Tool Calling Ready" : "Offline"}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 p-4 space-y-4 max-h-[520px] overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center py-12 space-y-2 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">
                Ask any agricultural, water, pump hydraulic, or solar feasibility question.
              </p>
              <p>
                The assistant runs real tools (Open-Meteo, PVGIS, Overpass, HydroSHEDS, Elevation, WaPOR, FAO-56) and separates observed measurements from modeled estimates.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[92%] sm:max-w-[82%] rounded-2xl px-4 py-3 text-xs sm:text-sm space-y-2.5 ${
                    msg.role === "user"
                      ? "bg-[#14532d] text-white"
                      : "bg-muted border border-border"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <FormattedMarkdown content={msg.content} />
                  ) : (
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                  )}

                  {/* Tool Execution Trace */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="pt-2 border-t border-border/60 space-y-1.5">
                      <button
                        onClick={() =>
                          setExpandedTools((prev) => ({
                            ...prev,
                            [msg.id]: !prev[msg.id],
                          }))
                        }
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 cursor-pointer"
                      >
                        <Wrench className="h-3 w-3" />
                        <span>
                          {msg.toolCalls.length} analytical tool(s) executed
                        </span>
                        {expandedTools[msg.id] ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>

                      {expandedTools[msg.id] && (
                        <div className="space-y-1.5 pt-1">
                          {msg.toolCalls.map((tc) => (
                            <div
                              key={tc.id}
                              className="p-2 rounded-lg bg-card border border-border text-[11px]"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono font-semibold">{tc.toolName}</span>
                                <Badge variant={tc.provenance === "OBSERVED" ? "blue" : "amber"}>
                                  {tc.provenance}
                                </Badge>
                              </div>
                              <p className="text-muted-foreground mt-0.5">{tc.resultSummary}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Data Source Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {msg.citations.map((c) => (
                        <Badge key={c.id} variant="neutral" className="text-[10px]">
                          {c.name} ({formatTimestamp(c.retrievedAt)})
                        </Badge>
                      ))}
                    </div>
                  )}

                  {msg.modelUsed && (
                    <p className="text-[10px] opacity-70">{msg.modelUsed}</p>
                  )}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="text-xs text-muted-foreground italic">
              Executing scientific tools & synthesizing verified results...
            </div>
          )}
        </CardContent>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="p-3 border-t border-border flex gap-2"
        >
          <Input
            placeholder="Ask about crop suitability, nearby water, pump kW, or solar coverage..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <Button type="submit" variant="primary" disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </form>
      </Card>
    </div>
  );
}
