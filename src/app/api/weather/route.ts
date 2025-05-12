import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const apiKey = process.env.ACCUWEATHER_API_KEY;

  const city = "Aquidauana";

  /*  const locRes = await fetch(
    `https://dataservice.accuweather.com/locations/v1/cities/search?apikey=${apiKey}&q=${city}`
  );
  const locData = await locRes.json(); */
  const locationKey = "38802"; //locData[0]?.Key;

  if (!locationKey)
    return Response.json({ error: "Local não encontrado" }, { status: 200 });

  const weatherRes = await fetch(
    `https://dataservice.accuweather.com/currentconditions/v1/${locationKey}?apikey=${apiKey}`
  );
  const weatherData = await weatherRes.json();

  return new Response(
    JSON.stringify({
      city,
      temperature: weatherData[0]?.Temperature?.Metric?.Value,
      weatherIcon: weatherData[0]?.WeatherIcon,
      isDayTime: weatherData[0]?.IsDayTime,
    }),
    { status: 200 }
  );
}
