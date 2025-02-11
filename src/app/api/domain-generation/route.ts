import { type NextRequest } from "next/server";

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.prompt) {
    return Response.json(
      {
        message: "Prompt inválido!",
      },
      {
        status: 401,
      }
    );
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    store: true,
    messages: [
      {
        role: "system",
        content:
          "Suggest domains that ends with '.com.br', '.app.br', '.blog.br', etc. Separate them with a comma.",
      },
      { role: "user", content: body.prompt },
    ],
  });

  const aiResponse = completion.choices[0].message.content;

  if (!aiResponse) {
    return Response.json(
      {
        message: "A IA está cansada!",
      },
      {
        status: 401,
      }
    );
  }

  // verify domains
  const domains = aiResponse.toLocaleLowerCase().replaceAll(" ", "").split(",");

  let validDomains = [];

  for (const domain of domains) {
    const res = await fetch(`https://rdap.registro.br/domain/${domain}`);

    if (!res.ok) {
      validDomains.push(domain);
      continue;
    }
  }

  return Response.json({ domains: validDomains });
}
