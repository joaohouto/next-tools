"use client";

import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ShareBar } from "./share-bar";
import type { Coordinate } from "./types";
import { ConverterView } from "./views/converter-view";
import { DistanceView } from "./views/distance-view";
import { MapView } from "./views/map-view";

export default function CoordenadasClient() {
  const [coordinate, setCoordinate] = useState<Coordinate | null>(null);

  return (
    <div className="min-h-screen p-6 flex items-center justify-center">
      <div className="w-full max-w-2xl pt-4 flex flex-col gap-6">
        <Tabs defaultValue="map" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="map">Mapa</TabsTrigger>
            <TabsTrigger value="convert">Converter</TabsTrigger>
            <TabsTrigger value="distance">Distância</TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="mt-4">
            <MapView coordinate={coordinate} onChange={setCoordinate} />
          </TabsContent>
          <TabsContent value="convert" className="mt-4">
            <ConverterView coordinate={coordinate} onChange={setCoordinate} />
          </TabsContent>
          <TabsContent value="distance" className="mt-4">
            <DistanceView origin={coordinate} />
          </TabsContent>
        </Tabs>

        <ShareBar coordinate={coordinate} />
      </div>
    </div>
  );
}
