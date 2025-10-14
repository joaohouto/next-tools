"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Download, Info, FlipHorizontal } from "lucide-react";

export default function WebcamPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const audioCanvasRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [showInfo, setShowInfo] = useState(true);
  const [isMirrored, setIsMirrored] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    const getDevicesAndPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        const availableDevices =
          await navigator.mediaDevices.enumerateDevices();
        const videoDevices = availableDevices.filter(
          (device) => device.kind === "videoinput"
        );
        setDevices(videoDevices);
        if (videoDevices.length > 0) {
          setSelectedDevice(videoDevices[0].deviceId);
        }

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
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: selectedDevice,
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: true,
          });

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }

          const videoTrack = stream.getVideoTracks()[0];
          const settings = videoTrack.getSettings();
          setDeviceInfo(settings);

          // Configurar análise de áudio
          const audioCtx = new (window.AudioContext ||
            window.webkitAudioContext)();
          const analyserNode = audioCtx.createAnalyser();
          analyserNode.fftSize = 256;

          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyserNode);

          setAudioContext(audioCtx);
          setAnalyser(analyserNode);
        } catch (err) {
          console.error("Error starting stream:", err);
        }
      };

      startStream();

      return () => {
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject;
          stream.getTracks().forEach((track) => track.stop());
        }
        if (audioContext) {
          audioContext.close();
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [selectedDevice]);

  useEffect(() => {
    if (analyser && audioCanvasRef.current && showInfo) {
      const canvas = audioCanvasRef.current;
      const ctx = canvas.getContext("2d");
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        animationFrameRef.current = requestAnimationFrame(draw);

        analyser.getByteFrequencyData(dataArray);

        ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;

          const gradient = ctx.createLinearGradient(
            0,
            canvas.height - barHeight,
            0,
            canvas.height
          );
          gradient.addColorStop(0, "#ffffff");
          gradient.addColorStop(1, "#eeeeee");

          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

          x += barWidth + 1;
        }
      };

      draw();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyser, showInfo]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");

      // Não aplicar espelhamento na foto capturada
      ctx.drawImage(video, 0, 0);

      const imageData = canvas.toDataURL("image/png");
      setCapturedImage(imageData);
    }
  };

  const downloadPhoto = () => {
    if (capturedImage) {
      const link = document.createElement("a");
      link.download = `webcam-${Date.now()}.png`;
      link.href = capturedImage;
      link.click();
    }
  };

  const closePreview = () => {
    setCapturedImage(null);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Video em tela cheia */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover transition-transform ${
          isMirrored ? "scale-x-[-1]" : ""
        }`}
      />

      {/* Canvas oculto para captura */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Overlay com informações e controles */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Header com informações da câmera */}
        {showInfo && deviceInfo && (
          <div className="absolute top-4 left-4 right-4 pointer-events-auto">
            <Card className="bg-black/60 backdrop-blur-sm border-white/20">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Informações da câmera */}
                  <div className="grid grid-cols-2 gap-4 text-white text-sm">
                    <div>
                      <div className="text-white/60 text-xs">Resolução</div>
                      <div className="font-medium">
                        {deviceInfo.width} x {deviceInfo.height}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/60 text-xs">Frame Rate</div>
                      <div className="font-medium">
                        {deviceInfo.frameRate} fps
                      </div>
                    </div>
                    <div>
                      <div className="text-white/60 text-xs">Aspect Ratio</div>
                      <div className="font-medium">
                        {deviceInfo.aspectRatio?.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/60 text-xs">Facing Mode</div>
                      <div className="font-medium">
                        {deviceInfo.facingMode || "user"}
                      </div>
                    </div>
                  </div>

                  {/* Espectro de áudio */}
                  <div>
                    <div className="text-white/60 text-xs mb-2">
                      Espectro de Áudio
                    </div>
                    <canvas
                      ref={audioCanvasRef}
                      width="300"
                      height="80"
                      className="w-full h-20 rounded bg-black/40"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Controles inferiores */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 pointer-events-auto">
          {/* Seletor de câmera */}
          {devices.length > 1 && (
            <Select onValueChange={setSelectedDevice} value={selectedDevice}>
              <SelectTrigger className="w-64 bg-black/60 backdrop-blur-sm border-white/20 text-white">
                <SelectValue placeholder="Selecione uma câmera" />
              </SelectTrigger>
              <SelectContent>
                {devices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `Câmera ${devices.indexOf(device) + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Botão de captura */}
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowInfo(!showInfo)}
              size="icon"
              variant="outline"
              className="bg-black/60 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 rounded-full"
            >
              <Info />
            </Button>

            <Button
              onClick={() => setIsMirrored(!isMirrored)}
              size="icon"
              variant="outline"
              className="bg-black/60 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 rounded-full"
            >
              <FlipHorizontal />
            </Button>

            <Button
              onClick={capturePhoto}
              size="lg"
              className="bg-white text-black hover:bg-white/90 px-8 h-14 rounded-full"
            >
              <Camera className="size-8" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de preview da foto capturada */}
      {capturedImage && (
        <div className="absolute inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
          <div className="max-w-5xl w-full space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button onClick={downloadPhoto} size="lg">
                  <Download />
                  Baixar
                </Button>
                <Button onClick={closePreview} size="lg" variant="outline">
                  Fechar
                </Button>
              </div>
            </div>

            <div className="relative w-full bg-black rounded-lg overflow-hidden">
              <img
                src={capturedImage}
                alt="Foto capturada"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
