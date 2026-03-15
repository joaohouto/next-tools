import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QRCodeGenerator } from "./generator";
import { QRCodeReader } from "./reader";

export default function Page() {
  return (
    <div className="min-h-screen p-6 flex items-center justify-center">
      <div className="w-full max-w-sm pt-4">
        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
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
