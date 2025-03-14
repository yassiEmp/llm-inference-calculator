"use client"

import { Card, CardContent } from "@/components/ui/card"
import { LineChart } from "@/components/ui/chart"

interface InferenceSpeedEstimatorProps {
  modelSize: number
  quantizationMethod: string
  gpuModel: string
  gpusNeeded: number
  inferenceSpeed: number
}

export function InferenceSpeedEstimator({
  modelSize,
  quantizationMethod,
  gpuModel,
  gpusNeeded,
  inferenceSpeed,
}: InferenceSpeedEstimatorProps) {
  // GPU speed factors for reference
  const gpuSpeedFactors: Record<string, number> = {
    rtx3090: 1.0,
    rtx4090: 1.8,
    a100_40gb: 1.5,
    a100_80gb: 1.6,
    h100: 2.5,
    rtx3080: 0.7,
    rtx4080: 1.2,
    rtx3070: 0.5,
    rtx4070: 0.8,
    a10: 0.9,
    l4: 0.9,
    a30: 1.1,
    a40: 1.3,
  }

  // Quantization speed factors
  const quantizationSpeedFactors: Record<string, number> = {
    fp32: 0.5,
    fp16: 1.0,
    bf16: 1.0,
    int8: 1.5,
    int4: 2.0,
    gptq: 1.8,
  }

  // GPU model names for display
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
  }

  const selectedGpuName = gpuModelNames[gpuModel] || gpuModel

  // Generate data for different batch sizes
  const batchSizes = [1, 2, 4, 8, 16, 32]
  const chartData = batchSizes.map((batchSize) => {
    // Base calculation similar to the one in the main calculator
    const speedFactor = gpuSpeedFactors[gpuModel] || 1.0
    const quantFactor = quantizationSpeedFactors[quantizationMethod] || 1.0
    const baseSpeed = 30 // Base tokens per second for a 7B model on RTX 3090 with FP16
    const modelSizeFactor = 7 / modelSize // Smaller models are faster

    // Batch size doesn't scale linearly with performance
    // There's usually diminishing returns
    const batchSizeFactor = Math.log2(batchSize) / Math.log2(4) + 0.5

    const speed = baseSpeed * speedFactor * quantFactor * modelSizeFactor * gpusNeeded * batchSizeFactor

    return {
      batchSize: batchSize.toString(),
      speed: Number.parseFloat(speed.toFixed(1)),
    }
  })

  // Calculate time to generate 1000 tokens
  const timeFor1000Tokens = 1000 / inferenceSpeed

  // Calculate tokens per minute
  const tokensPerMinute = inferenceSpeed * 60

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="text-lg font-semibold mb-4">Inference Speed Estimation</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Estimated inference speed with your current configuration:
            </p>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Tokens per second:</span>
                <span className="text-lg font-medium">{inferenceSpeed.toFixed(1)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm">Tokens per minute:</span>
                <span className="text-lg font-medium">{tokensPerMinute.toFixed(0)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm">Time to generate 1000 tokens:</span>
                <span className="text-lg font-medium">{timeFor1000Tokens.toFixed(1)} seconds</span>
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-medium mb-2">Performance Factors</h4>
                <ul className="text-sm space-y-1">
                  <li>
                    <strong>GPU:</strong> {selectedGpuName} (Speed factor:{" "}
                    {gpuSpeedFactors[gpuModel]?.toFixed(1) || "1.0"}x)
                  </li>
                  <li>
                    <strong>Quantization:</strong> {quantizationMethod.toUpperCase()} (Speed factor:{" "}
                    {quantizationSpeedFactors[quantizationMethod]?.toFixed(1) || "1.0"}x)
                  </li>
                  <li>
                    <strong>Model Size:</strong> {modelSize}B parameters (Smaller models are faster)
                  </li>
                  <li>
                    <strong>GPUs:</strong> {gpusNeeded} (Performance scales with multiple GPUs)
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-4">Estimated performance with different batch sizes:</p>

            <div className="h-64">
              <LineChart
                data={chartData}
                index="batchSize"
                categories={["speed"]}
                colors={["blue"]}
                valueFormatter={(value) => `${value} tokens/sec`}
                yAxisWidth={48}
              />
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Note: These are approximations based on typical performance patterns. Actual performance may vary based on
              specific hardware, drivers, and implementation details.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

