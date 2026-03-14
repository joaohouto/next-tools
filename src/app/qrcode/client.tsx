"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QRCodeGenerator } from "./generator";
import { QRCodeReader } from "./reader";
import { QrCode } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export default function Page() {
  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900 p-6 flex flex-col items-center">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <PageHeader
          title="QRCode"
          description="Crie e leia QR Codes."
          icon={<QrCode className="w-5 h-5" />}
        />
        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-2">
            <TabsTrigger value="create">Criar</TabsTrigger>
            <TabsTrigger value="read">Ler</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <QRCodeGenerator />
          </TabsContent>
          <TabsContent value="read">
            <QRCodeReader />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
