export const runtime = "nodejs";

export async function GET() {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  const res = await fetch(
    `https://api.unsplash.com/photos/random?query=landscape&orientation=landscape&client_id=${accessKey}`
  );
  const data = await res.json();

  return new Response(
    JSON.stringify({
      imageUrl: data.urls.full,
      author: data.user.name,
      link: data.links.html,
    }),
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
        "Content-Type": "application/json",
      },
    }
  );
}
