"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Eye, RotateCcw } from "lucide-react";
import { recordHotkeyAnswer } from "@/lib/actions/student";
import { comboFromEvent, isBrowserReserved, normalizeCombo } from "@/lib/hotkeys";
import { Button } from "@/components/ui/button";
import { KeyCombo, Panel } from "@/components/ui/misc";
import { ProgressBar } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface TrainerHotkey {
  id: string;
  action: string;
  keys: string;
  macKeys: string | null;
  software: string;
}

type Feedback = { kind: "correct" | "wrong" | "revealed"; pressed?: string } | null;

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function HotkeyTrainer({ hotkeys, title }: { hotkeys: TrainerHotkey[]; title: string }) {
  const [queue, setQueue] = useState<TrainerHotkey[]>(hotkeys);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [isMac, setIsMac] = useState(false);
  const [touchOnly, setTouchOnly] = useState(false);

  useEffect(() => {
    setQueue(shuffle(hotkeys));
    setIndex(0);
    setScore({ correct: 0, total: 0 });
    setFeedback(null);
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
    setTouchOnly(window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(pointer: fine)").matches);
  }, [hotkeys]);

  const current = queue[index];
  const finished = index >= queue.length;
  // Phones have no physical keyboard; reserved combos never reach the page.
  const choiceMode = current ? touchOnly || isBrowserReserved(current.keys) : false;
  const display = (h: TrainerHotkey) => (isMac && h.macKeys ? h.macKeys : h.keys);

  const answer = useCallback(
    (pressed: string) => {
      if (!current || feedback) return;
      const ok = normalizeCombo(pressed) === normalizeCombo(current.keys);
      setFeedback({ kind: ok ? "correct" : "wrong", pressed });
      setScore((s) => ({ correct: s.correct + (ok ? 1 : 0), total: s.total + 1 }));
      void recordHotkeyAnswer(current.id, ok);
    },
    [current, feedback],
  );

  const next = useCallback(() => {
    setFeedback(null);
    setIndex((i) => i + 1);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (finished) return;
      if (feedback) {
        if (e.key === "Enter" || e.code === "Space") {
          e.preventDefault();
          next();
        }
        return;
      }
      if (choiceMode) return;
      const combo = comboFromEvent(e);
      if (!combo) return;
      if (combo === "Tab" || combo === "Shift+Tab") return; // keep keyboard navigation
      e.preventDefault();
      e.stopPropagation();
      answer(combo);
    }
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [answer, next, feedback, finished, choiceMode]);

  const options = useMemo(() => {
    if (!current || !choiceMode) return [];
    const others = shuffle(hotkeys.filter((h) => normalizeCombo(h.keys) !== normalizeCombo(current.keys)))
      .map((h) => h.keys)
      .filter((k, i, a) => a.indexOf(k) === i)
      .slice(0, 3);
    return shuffle([current.keys, ...others]);
  }, [current, choiceMode, hotkeys]);

  const percent = score.total ? Math.round((score.correct / score.total) * 100) : 0;

  if (hotkeys.length === 0) return null;

  return (
    <Panel className="overflow-hidden shadow">
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3 text-sm">
        <span className="truncate font-medium">{title}</span>
        <div className="flex shrink-0 items-center gap-4 font-mono text-xs text-fg-2 tnum">
          <span>
            {Math.min(index + (feedback ? 1 : 0), queue.length)}/{queue.length}
          </span>
          <span className={cn(score.total > 0 && (percent >= 80 ? "text-success" : "text-fg"))}>{percent}%</span>
        </div>
      </div>
      <ProgressBar value={(Math.min(index + (feedback ? 1 : 0), queue.length) / queue.length) * 100} className="rounded-none" />

      {finished ? (
        <div className="px-5 py-12 text-center">
          <p className="font-mono text-2xl font-medium tnum">{percent}%</p>
          <p className="mt-1 text-fg-2">
            {score.correct} из {score.total} верно
          </p>
          <Button
            variant="primary"
            size="lg"
            className="mt-6"
            onClick={() => {
              setQueue(shuffle(hotkeys));
              setIndex(0);
              setScore({ correct: 0, total: 0 });
            }}
          >
            <RotateCcw className="size-4" />
            Ещё раз
          </Button>
        </div>
      ) : (
        current && (
          <div className="px-5 py-10 text-center sm:py-14">
            <p className="text-xs tracking-wide text-fg-3 uppercase">{choiceMode ? "Выберите сочетание" : "Нажмите сочетание клавиш"}</p>
            <p className="mx-auto mt-3 max-w-md text-xl font-semibold tracking-display text-balance">{current.action}</p>

            <div className="mt-8 flex min-h-12 items-center justify-center">
              {feedback ? (
                <div className="flex flex-col items-center gap-3">
                  <KeyCombo combo={display(current)} size="lg" />
                  <p
                    className={cn(
                      "text-sm font-medium",
                      feedback.kind === "correct" && "text-success",
                      feedback.kind === "wrong" && "text-danger",
                      feedback.kind === "revealed" && "text-fg-2",
                    )}
                  >
                    {feedback.kind === "correct" && "✓ Правильно"}
                    {feedback.kind === "wrong" && <>✗ Неправильно{feedback.pressed && <span className="font-normal text-fg-3"> — вы нажали {feedback.pressed}</span>}</>}
                    {feedback.kind === "revealed" && "Запомните это сочетание"}
                  </p>
                </div>
              ) : choiceMode ? (
                <div className="grid w-full max-w-md grid-cols-2 gap-2">
                  {options.map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => answer(o)}
                      className="flex h-12 items-center justify-center rounded-lg border border-border transition-colors hover:border-border-strong hover:bg-muted"
                    >
                      <KeyCombo combo={o} />
                    </button>
                  ))}
                </div>
              ) : (
                <span className="inline-flex h-10 items-center gap-2 rounded-md border border-dashed border-border-strong px-4 font-mono text-sm text-fg-3">
                  <span className="size-1.5 animate-pulse rounded-full bg-accent" />
                  ожидание нажатия…
                </span>
              )}
            </div>

            {choiceMode && !feedback && (
              <p className="mx-auto mt-4 max-w-sm text-xs text-fg-3">
                {touchOnly ? "На телефоне — выберите вариант. С клавиатурой тренажёр ждёт реального нажатия." : "Браузер не передаёт это сочетание странице, поэтому выберите вариант."}
              </p>
            )}

            <div className="mt-8 flex items-center justify-center gap-2">
              {feedback ? (
                <Button variant="primary" size="lg" onClick={next} autoFocus>
                  Дальше
                  <ArrowRight className="size-4" />
                  <span className="ml-1 hidden font-mono text-xs opacity-70 sm:inline">Enter</span>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setFeedback({ kind: "revealed" });
                    setScore((s) => ({ ...s, total: s.total + 1 }));
                    void recordHotkeyAnswer(current.id, false);
                  }}
                >
                  <Eye className="size-3.5" />
                  Показать ответ
                </Button>
              )}
            </div>
          </div>
        )
      )}
    </Panel>
  );
}
