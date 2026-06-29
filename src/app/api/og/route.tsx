import { ImageResponse } from "next/og";

async function loadGoogleFont(font: string, text: string) {
  const url = `https://fonts.googleapis.com/css2?family=${font}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const resource = css.match(/src: url\((.+)\) format\('(opentype|truetype)'\)/);
  if (resource) {
    const response = await fetch(resource[1]);
    if (response.status === 200) return await response.arrayBuffer();
  }
  throw new Error("failed to load font data");
}

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const title = searchParams.get("title")?.slice(0, 100) ?? "tools";

    return new ImageResponse(
      (
        <div
          style={{
            backgroundColor: "black",
            height: "100%",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <img
            alt="tools"
            height={96}
            width={96}
            src={`${origin}/icon.png`}
          />
          <div
            style={{
              fontSize: 60,
              fontFamily: '"Geist Mono"',
              fontStyle: "normal",
              letterSpacing: "-0.025em",
              color: "white",
              marginTop: 30,
              padding: "0 120px",
              lineHeight: 1.4,
              whiteSpace: "pre-wrap",
              textAlign: "center",
            }}
          >
            {title}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: "Geist Mono",
            data: await loadGoogleFont("Geist+Mono", title),
            style: "normal",
          },
        ],
      },
    );
  } catch (e: unknown) {
    console.error(e);
    return new Response("Failed to generate image", { status: 500 });
  }
}
