"use client";

import { useEffect, useState } from "react";
import { useReward } from "react-rewards";
import { getMinutes, getSeconds } from "@/lib/time";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pause, Play } from "lucide-react";

const POMODORO = 25 * 60;
const SHORT_BREAK = 5 * 60;
const LONG_BREAK = 15 * 60;

const MODES = [
  { value: POMODORO, label: "Pomodoro" },
  { value: SHORT_BREAK, label: "Curto" },
  { value: LONG_BREAK, label: "Longo" },
];

const MODE_COLOR: Record<number, { stroke: string; text: string; ring: string }> = {
  [POMODORO]:    { stroke: "#f43f5e", text: "text-rose-500",    ring: "ring-rose-500/20" },
  [SHORT_BREAK]: { stroke: "#10b981", text: "text-emerald-500", ring: "ring-emerald-500/20" },
  [LONG_BREAK]:  { stroke: "#3b82f6", text: "text-blue-500",    ring: "ring-blue-500/20" },
};

const CIRCUMFERENCE = 2 * Math.PI * 40;

export default function Page() {
  const [secondsLeft, setSecondsLeft] = useState(POMODORO);
  const [timer, setTimer] = useState<ReturnType<typeof setInterval> | undefined>();
  const [isRunning, setIsRunning] = useState(false);
  const [current, setCurrent] = useState(POMODORO);
  const [pendingStep, setPendingStep] = useState<number | null>(null);

  const { reward } = useReward("rewardId", "confetti", {
    spread: 100,
    elementCount: 250,
    lifetime: 400,
    zIndex: 999,
  });

  const startPomodoro = () => {
    setIsRunning(true);
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    setTimer(t);
  };

  const stopPomodoro = () => {
    setIsRunning(false);
    clearInterval(timer);
  };

  const handleCountdownFinishes = () => {
    reward();
    new Notification("⏱ Timer finalizado!", { body: "Volte ao Pomodoro.", dir: "ltr" });
    if (current === POMODORO) {
      setCurrent(SHORT_BREAK);
      setSecondsLeft(SHORT_BREAK);
    } else if (current === SHORT_BREAK) {
      setCurrent(POMODORO);
      setSecondsLeft(POMODORO);
    }
  };

  const handleChangeStep = (newCurrent: number) => {
    if (current === newCurrent) return;
    if (isRunning) {
      setPendingStep(newCurrent);
      return;
    }
    applyStep(newCurrent);
  };

  const applyStep = (newCurrent: number) => {
    stopPomodoro();
    setCurrent(newCurrent);
    setSecondsLeft(newCurrent);
    setPendingStep(null);
  };

  useEffect(() => {
    if (secondsLeft === 0) {
      clearInterval(timer);
      setIsRunning(false);
      handleCountdownFinishes();
    }
  }, [secondsLeft, timer]);

  useEffect(() => () => clearInterval(timer), [timer]);
  useEffect(() => { Notification.requestPermission(); }, []);
  useEffect(() => {
    document.title = `${getMinutes(secondsLeft)}:${getSeconds(secondsLeft)} - Pomodoro`;
  }, [secondsLeft]);

  const progress = secondsLeft / current;
  const dashArray = `${progress * CIRCUMFERENCE} ${CIRCUMFERENCE}`;
  const colors = MODE_COLOR[current];

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-8 w-full max-w-xs">

        {/* Mode tabs */}
        <div className="flex gap-1 rounded-xl bg-muted/50 p-1 w-full">
          {MODES.map((mode) => (
            <button
              key={mode.value}
              onClick={() => handleChangeStep(mode.value)}
              className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-all ${
                current === mode.value
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Circle timer */}
        <div className={`relative rounded-full ring-8 ${colors.ring} transition-all duration-500`}>
          <svg className="w-64 h-64 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/40" />
            <circle
              cx="50" cy="50" r="40"
              fill="none"
              stroke={colors.stroke}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={dashArray}
              className="transition-[stroke-dasharray] duration-500 ease-in-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <span className={`text-4xl font-bold font-mono tabular-nums tracking-tight ${colors.text} transition-colors`}>
              {getMinutes(secondsLeft)}:{getSeconds(secondsLeft)}
            </span>
            <span className="text-xs text-muted-foreground uppercase tracking-widest">
              {MODES.find((m) => m.value === current)?.label}
            </span>
          </div>
        </div>

        {/* Play / Pause */}
        <Button size="lg" className="w-full h-12 text-base gap-2" onClick={isRunning ? stopPomodoro : startPomodoro}>
          {isRunning
            ? <><Pause className="size-5 fill-current" /> Pausar</>
            : <><Play className="size-5 fill-current" /> Iniciar</>
          }
        </Button>

        <span id="rewardId" />
      </div>

      {/* Confirmation dialog */}
      <AlertDialog open={pendingStep !== null} onOpenChange={(open) => !open && setPendingStep(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trocar modo</AlertDialogTitle>
            <AlertDialogDescription>
              O timer está rodando. Tem certeza que quer trocar para{" "}
              <strong>{MODES.find((m) => m.value === pendingStep)?.label}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingStep(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingStep !== null && applyStep(pendingStep)}>
              Trocar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
