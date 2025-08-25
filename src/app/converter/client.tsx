"use client";

import FileDropzone from "@/components/file-dropzone";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { File, Trash } from "lucide-react";

export function Converter() {
  return (
    <main className="grid grid-cols-3 gap-6 p-6 h-screen">
      {/* Arquivos originais */}
      <Card className="flex flex-col p-4 gap-4">
        <FileDropzone onUpload={null} />

        {/* mock de arquivos */}
        <div className="p-2 flex items-center gap-2">
          <div className="size-10 rounded-xl flex items-center justify-center border">
            <File className="size-4" />
          </div>

          <div className="flex flex-col">
            <span className="text-sm">documento.pdf</span>
            <span className="text-muted-foreground text-xs">234kb</span>
          </div>

          <div className="flex ml-auto">
            <Button size="icon" variant="ghost">
              <Trash />
            </Button>
          </div>
        </div>
      </Card>

      {/* Escolha de formato */}
      <Card className="flex flex-col items-center justify-center">
        <CardHeader>
          <CardTitle>Converter para</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Select>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Escolha o formato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="docx">DOCX</SelectItem>
              <SelectItem value="xlsx">XLSX</SelectItem>
              <SelectItem value="png">PNG</SelectItem>
            </SelectContent>
          </Select>

          <Button>Converter</Button>
        </CardContent>
      </Card>

      {/* Arquivos convertidos */}
      <Card className="flex flex-col"></Card>
    </main>
  );
}
