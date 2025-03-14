"use client";

import { Card, CardContent } from "@/components/ui/card";
import { BarChart } from "@/components/ui/chart";

interface QuantizationComparisonProps {
  modelSize: number;
  contextLength: number;
  enableKVCache: boolean;
  batchSize: number;
}

export function QuantizationComparison({
  modelSize,
  contextLength,
  enableKVCache,
  batchSize,
}: QuantizationComparisonProps) {
  // Calculate VRAM requirements for different quantization methods
  const calculateVram = (bytesPerParameter: number) => {
    // Model size in bytes (parameters in billions)
    const modelSizeBytes = modelSize * 1000000000 * bytesPerParameter;

    // KV cache size calculation
    let kvCacheSize = 0;
    if (enableKVCache) {
      // KV cache size depends on context length, batch size, and model dimensions
      // This is a simplified approximation
      const headDim = 128; // Typical value
      const numHeads = Math.ceil((modelSize * 1000000000) / (4 * 768 * 768)); // Approximation
      kvCacheSize = 2 * numHeads * headDim * contextLength * batchSize * 2; // 2 for K and V, 2 bytes for fp16
    }

    // Total VRAM required
    const totalVramBytes = modelSizeBytes + kvCacheSize;
    return totalVramBytes / (1024 * 1024 * 1024); // Convert to GB
  };

  const quantizationMethods = [
    { name: "FP32", bytesPerParameter: 4 },
    { name: "FP16/BF16", bytesPerParameter: 2 },
    { name: "INT8", bytesPerParameter: 1 },
    { name: "INT4", bytesPerParameter: 0.5 },
    { name: "GPTQ", bytesPerParameter: 0.5 },
  ];

  const chartData = quantizationMethods.map((method) => ({
    name: method.name,
    VRAM: Number.parseFloat(calculateVram(method.bytesPerParameter).toFixed(2)),
  }));

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="text-lg font-semibold mb-4">
          Quantization Method Comparison
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          This chart shows the estimated VRAM requirements for different
          quantization methods with your current model configuration (
          {modelSize}B parameters, {contextLength} context length).
        </p>

        <div className="h-80">
          <BarChart
            data={chartData}
            index="name"
            categories={["VRAM"]}
            colors={["blue"]}
            valueFormatter={(value) => `${value} GB`}
            yAxisWidth={48}
          />
        </div>

        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium">
            Quantization Method Comparison
          </h4>
          <ul className="text-sm space-y-1">
            <li>
              <strong>FP32:</strong> Full precision (4 bytes per parameter) -
              Highest accuracy, highest memory usage
            </li>
            <li>
              <strong>FP16/BF16:</strong> Half precision (2 bytes per parameter)
              - Good balance of accuracy and memory
            </li>
            <li>
              <strong>INT8:</strong> 8-bit quantization (1 byte per parameter) -
              Reduced accuracy, significant memory savings
            </li>
            <li>
              <strong>INT4:</strong> 4-bit quantization (0.5 bytes per
              parameter) - Further reduced accuracy, maximum memory savings
            </li>
            <li>
              <strong>GPTQ:</strong> Optimized quantization with varying
              precision - Good accuracy with memory savings similar to INT4
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
