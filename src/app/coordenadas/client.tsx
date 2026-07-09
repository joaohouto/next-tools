"use client";

import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ShareBar } from "./share-bar";
import type { Coordinate } from "./types";
import { DistanceView } from "./views/distance-view";
import { LocationView } from "./views/location-view";

export default function CoordenadasClient() {
  const [coordinate, setCoordinate] = useState<Coordinate | null>(null);

  return (
    <div className="min-h-screen p-6 flex items-center justify-center isolate">
      <div className="w-full max-w-2xl pt-4 flex flex-col gap-6">
        <Tabs defaultValue="location" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="location">Localização</TabsTrigger>
            <TabsTrigger value="distance">Distância</TabsTrigger>
          </TabsList>

          <TabsContent value="location" className="mt-4">
            <LocationView coordinate={coordinate} onChange={setCoordinate} />
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
