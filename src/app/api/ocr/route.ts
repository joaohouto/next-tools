import { NextResponse } from "next/server";
import Tesseract from "tesseract.js";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("image") as File;

  if (!file) {
    return NextResponse.json(
      { error: "Nenhum arquivo de imagem foi fornecido." },
      { status: 400 }
    );
  }

  try {
    const imageBuffer = Buffer.from(await file.arrayBuffer());

    const {
      data: { text },
    } = await Tesseract.recognize(
      imageBuffer,
      "por", // Língua portuguesa
      {
        logger: (m) => console.log(m),
      }
    );

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Erro durante o processamento de OCR:", error);
    return NextResponse.json(
      { error: "Falha ao processar a imagem." },
      { status: 500 }
    );
  }
}
