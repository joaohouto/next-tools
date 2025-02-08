"use client";

import { useEffect, useState } from "react";

import { useReward } from "react-rewards";
import { getMinutes, getSeconds } from "@/lib/time";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Pause, Play } from "lucide-react";

const POMODORO = 25 * 60;
const SHORT_BREAK = 5 * 60;
const LONG_BREAK = 15 * 60;

export default function Page() {
  const [secondsLeft, setSecondsLeft] = useState(POMODORO);
  const [timer, setTimer] = useState<any>();
  const [isRunning, setIsRunning] = useState(false);
  const [current, setCurrent] = useState(POMODORO);

  const { reward } = useReward("rewardId", "confetti", {
    spread: 100,
    elementCount: 250,
    lifetime: 400,
    zIndex: 999,
  });

  const startPomodoro = () => {
    setIsRunning(true);

    const timer = setInterval(() => {
      setSecondsLeft((secondsLeft) => secondsLeft - 1);
      if (secondsLeft === 0) {
        clearInterval(timer);
        handleCountdownFinishes();
      }
    }, 1000);

    setTimer(timer);
  };

  const stopPomodoro = () => {
    setIsRunning(false);
    clearInterval(timer);
  };

  const handleCountdownFinishes = () => {
    reward();

    new Notification("⏱ Timer finalizado!", {
      body: "Volte ao Pomodoro.",
      dir: "ltr",
    });

    if (current === POMODORO) {
      setCurrent(SHORT_BREAK);
      setSecondsLeft(SHORT_BREAK);
    } else if (current === SHORT_BREAK) {
      setCurrent(POMODORO);
      setSecondsLeft(POMODORO);
    }
  };

  const handleChangeStep = (newCurrent: any) => {
    if (
      isRunning &&
      !window.confirm("O relógio está correndo. Tem certeza de que quer mudar?")
    ) {
      return;
    }

    if (current === newCurrent) return;

    stopPomodoro();
    setCurrent(newCurrent);
    setSecondsLeft(newCurrent);
  };

  useEffect(() => {
    if (secondsLeft === 0) {
      clearInterval(timer);
      setIsRunning(false);
      handleCountdownFinishes();
    }
  }, [secondsLeft, timer]);

  useEffect(() => {
    return () => clearInterval(timer);
  }, [timer]);

  useEffect(() => {
    Notification.requestPermission();
  }, []);

  return (
    <div className="max-w-[400px] min-h-screen mx-auto p-8 gap-4 flex flex-col items-center justify-center">
      <div>
        <svg className="w-[300px] h-[300px]" viewBox="0 0 100 100">
          <path
            className="stroke-primary transition-[stroke-dasharray] duration-500 ease-in-out group-hover:stroke-dasharray-[10_5]"
            fill="none"
            strokeLinecap="round"
            strokeWidth="3"
            strokeDasharray={`${(secondsLeft / current) * 250.6},250.6`}
            d="M50 10
                  a 40 40 0 0 1 0 80
                  a 40 40 0 0 1 0 -80"
          />
          <text
            className="font-monospace font-semibold fill-primary"
            x="50"
            y="50"
            textAnchor="middle"
            dy="7"
            fontSize="16"
          >
            {getMinutes(secondsLeft)}:{getSeconds(secondsLeft)}
          </text>
        </svg>
      </div>

      <ToggleGroup
        type="single"
        size="lg"
        defaultValue={POMODORO.toString()}
        onValueChange={(value) => handleChangeStep(parseInt(value))}
      >
        <ToggleGroupItem value={POMODORO.toString()} aria-label="Pomodoro">
          Pomodoro
        </ToggleGroupItem>
        <ToggleGroupItem
          value={SHORT_BREAK.toString()}
          aria-label="Intervalo curto"
        >
          Intervalo curto
        </ToggleGroupItem>
        <ToggleGroupItem
          value={LONG_BREAK.toString()}
          aria-label="Intervalo longo"
        >
          Intervalo longo
        </ToggleGroupItem>
      </ToggleGroup>

      {!isRunning ? (
        <Button className="w-full" onClick={startPomodoro}>
          <Play fill="primary" size={24} />
        </Button>
      ) : (
        <Button className="w-full" onClick={stopPomodoro}>
          <Pause fill="primary" size={24} />
        </Button>
      )}

      <span id="rewardId" style={{ marginTop: -28 }} />
    </div>
  );
}
