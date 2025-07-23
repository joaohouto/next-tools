"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PdfCompressor from "./compressor";
import PdfMerger from "./merger";
import PdfOcr from "./ocr";

export default function PdfPage() {
  return (
    <div className="p-8 w-full min-h-screen">
      <div className="w-full md:max-w-[680px] mx-auto flex flex-col content-center gap-4">
        <h1 className="text-2xl font-bold text-center">Ferramentas PDF</h1>

        <Tabs defaultValue="compress" className="w-full">
          <TabsList>
            <TabsTrigger value="compress">Comprimir</TabsTrigger>
            <TabsTrigger value="merge">Juntar</TabsTrigger>
            <TabsTrigger value="ocr">OCR</TabsTrigger>
          </TabsList>
          <TabsContent value="compress" className="mt-4">
            <PdfCompressor />
          </TabsContent>
          <TabsContent value="merge" className="mt-4">
            <PdfMerger />
          </TabsContent>
          <TabsContent value="ocr" className="mt-4">
            <PdfOcr />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
