"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { BarChart } from "@/components/ui/chart";

interface ResultsDisplayProps {
  vramRequired: number;
  systemRAMRequired: number;
  diskSpace: number;
  gpusNeeded: number;
  inferenceSpeed: number;
  gpuModel: string;
  unifiedMemory: boolean;
  systemRAM: number;
}

export function ResultsDisplay({
  vramRequired,
  systemRAMRequired,
  diskSpace,
  gpusNeeded,
  inferenceSpeed,
  gpuModel,
  unifiedMemory,
  systemRAM,
}: ResultsDisplayProps) {
  // GPU VRAM sizes for reference
  const gpuVramSizes: Record<string, number> = {
    rtx3090: 24,
    rtx4090: 24,
    a100_40gb: 40,
    a100_80gb: 80,
    h100: 80,
    rtx3080: 10,
    rtx4080: 16,
    rtx3070: 8,
    rtx4070: 12,
    a10: 24,
    l4: 24,
    a30: 24,
    a40: 48,
  };

  const selectedGpuVram = gpuVramSizes[gpuModel] || 24;
  const vramPercentage = unifiedMemory
    ? (vramRequired / (systemRAM * 0.75)) * 100
    : (vramRequired / selectedGpuVram) * 100;

  const isVramSufficient = unifiedMemory
    ? vramRequired <= systemRAM * 0.75
    : vramRequired <= selectedGpuVram;

  const gpuModelNames: Record<string, string> = {
    rtx3090: "NVIDIA RTX 3090",
    rtx4090: "NVIDIA RTX 4090",
    a100_40gb: "NVIDIA A100 (40GB)",
    a100_80gb: "NVIDIA A100 (80GB)",
    h100: "NVIDIA H100",
    rtx3080: "NVIDIA RTX 3080",
    rtx4080: "NVIDIA RTX 4080",
    rtx3070: "NVIDIA RTX 3070",
    rtx4070: "NVIDIA RTX 4070",
    a10: "NVIDIA A10",
    l4: "NVIDIA L4",
    a30: "NVIDIA A30",
    a40: "NVIDIA A40",
  };

  const selectedGpuName = gpuModelNames[gpuModel] || gpuModel;

  // Chart data for memory requirements
  const chartData = [
    {
      name: "VRAM",
      value: Number.parseFloat(vramRequired.toFixed(2)),
    },
    {
      name: "System RAM",
      value: Number.parseFloat(systemRAMRequired.toFixed(2)),
    },
    {
      name: "Disk Space",
      value: Number.parseFloat(diskSpace.toFixed(2)),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">
              Hardware Requirements
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">VRAM Required:</span>
                  <span className="text-sm font-medium">
                    {vramRequired.toFixed(2)} GB
                  </span>
                </div>
                <Progress
                  value={Math.min(vramPercentage, 100)}
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0 GB</span>
                  <span>
                    {unifiedMemory
                      ? `${(systemRAM * 0.75).toFixed(1)} GB (75% of RAM)`
                      : `${selectedGpuVram} GB (${selectedGpuName})`}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm">System RAM Required:</span>
                  <span className="text-sm font-medium">
                    {systemRAMRequired.toFixed(2)} GB
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm">Disk Space Required:</span>
                  <span className="text-sm font-medium">
                    {diskSpace.toFixed(2)} GB
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm">GPUs Needed:</span>
                  <span className="text-sm font-medium">{gpusNeeded}</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm">Estimated Inference Speed:</span>
                  <span className="text-sm font-medium">
                    {inferenceSpeed.toFixed(1)} tokens/sec
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">
              Memory Requirements (GB)
            </h3>
            <div className=" min-h-fit h-80 overflow-visible">
              <BarChart
                data={chartData}
                index="name"
                categories={["value"]}
                colors={["blue"]}
                valueFormatter={(value) => `${value} GB`}
                yAxisWidth={40}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert variant={isVramSufficient ? "default" : "destructive"}>
        {isVramSufficient ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <AlertCircle className="h-4 w-4" />
        )}
        <AlertTitle>
          {isVramSufficient ? "Configuration is viable" : "Insufficient memory"}
        </AlertTitle>
        <AlertDescription>
          {isVramSufficient
            ? `Your selected configuration should run on ${gpusNeeded} ${selectedGpuName} GPU(s).`
            : `This model requires ${vramRequired.toFixed(2)} GB of VRAM, but ${
                unifiedMemory
                  ? `you only have ${(systemRAM * 0.75).toFixed(
                      1
                    )} GB available (75% of ${systemRAM} GB RAM)`
                  : `a ${selectedGpuName} only has ${selectedGpuVram} GB`
              }. Consider using ${gpusNeeded} GPUs, reducing model size, or using a more efficient quantization method.`}
        </AlertDescription>
      </Alert>
    </div>
  );
}
