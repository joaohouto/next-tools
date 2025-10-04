import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QRCodeGenerator } from "./generator";
import { QRCodeReader } from "./reader";

export default function Page() {
  return (
    <div className="w-full min-h-screen p-4">
      <Tabs defaultValue="read" className="w-full md:w-[600px] mx-auto">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="read">Ler</TabsTrigger>
          <TabsTrigger value="create">Criar</TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <QRCodeGenerator />
        </TabsContent>
        <TabsContent value="read">
          <QRCodeReader />
        </TabsContent>
      </Tabs>
    </div>
  );
}
