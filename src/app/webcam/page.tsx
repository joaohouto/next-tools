"use client";

import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Button } from "@/components/ui/button";

export default function WebcamPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

  useEffect(() => {
    const getDevicesAndPermissions = async () => {
      try {
        // 1. Solicitar permissão primeiro
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });

        // 2. Agora, listar os dispositivos
        const availableDevices =
          await navigator.mediaDevices.enumerateDevices();
        const videoDevices = availableDevices.filter(
          (device) => device.kind === "videoinput"
        );
        setDevices(videoDevices);
        if (videoDevices.length > 0) {
          setSelectedDevice(videoDevices[0].deviceId);
        }

        // 3. Parar o stream inicial, pois o próximo useEffect cuidará de iniciar o stream correto
        stream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.error("Error accessing media devices.", err);
      }
    };

    getDevicesAndPermissions();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      const startStream = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: selectedDevice },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        setDeviceInfo(settings);
      };

      startStream();
    }
  }, [selectedDevice]);

  console.log(devices);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Webcam</CardTitle>
          <CardDescription>
            Teste sua webcam e veja informações.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <Select onValueChange={setSelectedDevice} value={selectedDevice}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um dispositivo" />
              </SelectTrigger>
              <SelectContent>
                {devices?.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative w-full pt-[56.25%]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="absolute top-0 left-0 w-full h-full"
              />
            </div>
            {deviceInfo && (
              <div className="p-4 mt-4 border rounded-md bg-muted">
                <h3 className="font-bold">Device Information</h3>
                <pre className="overflow-x-auto text-sm">
                  {JSON.stringify(deviceInfo, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
