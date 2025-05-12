import useSWR from "swr";

import {
  Sun,
  Cloud,
  CloudRain,
  Zap,
  CloudSun,
  CloudMoon,
  Moon,
  Snowflake,
} from "lucide-react";

export function getWeatherIcon(iconNumber: number, isDayTime: boolean) {
  if (!iconNumber) return isDayTime ? Sun : Moon;
  if (iconNumber === 1 || iconNumber === 2) return isDayTime ? Sun : Moon;
  if (iconNumber === 3 || iconNumber === 4)
    return isDayTime ? CloudSun : CloudMoon;
  if (iconNumber === 5 || iconNumber === 6) return Cloud;
  if (iconNumber >= 12 && iconNumber <= 14) return CloudRain;
  if (iconNumber >= 15 && iconNumber <= 17) return Zap;
  if (iconNumber >= 19 && iconNumber <= 22) return Snowflake;
  if (iconNumber === 33 || iconNumber === 34) return Moon;
  return Cloud;
}

const fetcher = (url: any) => fetch(url).then((res) => res.json());

export function WeatherWidget() {
  const { data, error } = useSWR("/api/weather", fetcher);

  if (!data || !data.temperature) return null;

  const WeatherIcon = getWeatherIcon(data.weatherIcon, data.isDayTime);

  return (
    <div className="flex gap-2 items-center">
      <span className="text-sm">{data.city}</span>
      <strong>{data.temperature}°C</strong>
      <WeatherIcon />
    </div>
  );
}
