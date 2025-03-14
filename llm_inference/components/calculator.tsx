"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ResultsDisplay } from "@/components/results-display"
import { ModelPresets } from "@/components/model-presets"
import { GPUSelector } from "@/components/gpu-selector"
import { QuantizationComparison } from "@/components/quantization-comparison"
import { InferenceSpeedEstimator } from "@/components/inference-speed-estimator"

export function Calculator() {
  // Model parameters
  const [modelSize, setModelSize] = useState(7)
  const [contextLength, setContextLength] = useState(4096)
  const [quantizationMethod, setQuantizationMethod] = useState("fp16")
  const [enableKVCache, setEnableKVCache] = useState(true)
  const [batchSize, setBatchSize] = useState(1)

  // Hardware parameters
  const [gpuModel, setGpuModel] = useState("rtx4090")
  const [systemRAM, setSystemRAM] = useState(32)
  const [unifiedMemory, setUnifiedMemory] = useState(false)

  // Calculation results
  const [vramRequired, setVramRequired] = useState(0)
  const [systemRAMRequired, setSystemRAMRequired] = useState(0)
  const [diskSpace, setDiskSpace] = useState(0)
  const [gpusNeeded, setGpusNeeded] = useState(1)
  const [inferenceSpeed, setInferenceSpeed] = useState(0)

  // Calculate requirements whenever inputs change
  useEffect(() => {
    calculateRequirements()
  }, [modelSize, contextLength, quantizationMethod, enableKVCache, batchSize, gpuModel, systemRAM, unifiedMemory])

  // Apply model preset
  const applyModelPreset = (preset: {
    name: string
    parameters: number
    defaultQuantization: string
    defaultContext: number
  }) => {
    setModelSize(preset.parameters)
    setQuantizationMethod(preset.defaultQuantization)
    setContextLength(preset.defaultContext)
  }

  // Calculate hardware requirements
  const calculateRequirements = () => {
    // Get bytes per parameter based on quantization method
    const bytesPerParameter =
      {
        fp32: 4,
        fp16: 2,
        bf16: 2,
        int8: 1,
        int4: 0.5,
        gptq: 0.5, // Approximation
      }[quantizationMethod] || 2

    // Model size in bytes (parameters in billions)
    const modelSizeBytes = modelSize * 1000000000 * bytesPerParameter

    // KV cache size calculation
    let kvCacheSize = 0
    if (enableKVCache) {
      // KV cache size depends on context length, batch size, and model dimensions
      // This is a simplified approximation
      const headDim = 128 // Typical value
      const numHeads = Math.ceil((modelSize * 1000000000) / (4 * 768 * 768)) // Approximation
      kvCacheSize = 2 * numHeads * headDim * contextLength * batchSize * 2 // 2 for K and V, 2 bytes for fp16
    }

    // Total VRAM required
    const totalVramBytes = modelSizeBytes + kvCacheSize
    const totalVramGB = totalVramBytes / (1024 * 1024 * 1024)
    setVramRequired(totalVramGB)

    // System RAM required (typically 2-3x the model size for overhead)
    const ramRequired = totalVramGB * 1.5
    setSystemRAMRequired(ramRequired)

    // Disk space required (model size plus overhead)
    const diskSpaceGB = ((modelSize * 1000000000 * bytesPerParameter) / (1024 * 1024 * 1024)) * 1.1
    setDiskSpace(diskSpaceGB)

    // Number of GPUs needed
    const gpuVramSizes = {
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
    }

    const selectedGpuVram = gpuVramSizes[gpuModel as keyof typeof gpuVramSizes] || 24
    const gpusNeededCalc = unifiedMemory
      ? Math.ceil(totalVramGB / (systemRAM * 0.75))
      : Math.ceil(totalVramGB / selectedGpuVram)

    setGpusNeeded(gpusNeededCalc)

    // Inference speed estimation (tokens per second)
    // This is a very rough approximation based on model size and GPU
    const gpuSpeedFactors = {
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

    const quantizationSpeedFactor =
      {
        fp32: 0.5,
        fp16: 1.0,
        bf16: 1.0,
        int8: 1.5,
        int4: 2.0,
        gptq: 1.8,
      }[quantizationMethod] || 1.0

    const speedFactor = gpuSpeedFactors[gpuModel as keyof typeof gpuSpeedFactors] || 1.0
    const baseSpeed = 30 // Base tokens per second for a 7B model on RTX 3090 with FP16

    const modelSizeFactor = 7 / modelSize // Smaller models are faster
    const inferenceSpeedCalc = baseSpeed * speedFactor * quantizationSpeedFactor * modelSizeFactor * gpusNeededCalc
    setInferenceSpeed(inferenceSpeedCalc)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-4">Model Configuration</h2>

            <div className="space-y-6">
              <ModelPresets onSelectPreset={applyModelPreset} />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="model-size">Model Size (billions of parameters)</Label>
                  <span className="text-sm font-medium">{modelSize}B</span>
                </div>
                <div className="flex space-x-2">
                  <Slider
                    id="model-size"
                    min={0.1}
                    max={70}
                    step={0.1}
                    value={[modelSize]}
                    onValueChange={(value) => setModelSize(value[0])}
                  />
                  <Input
                    type="number"
                    value={modelSize}
                    onChange={(e) => setModelSize(Number(e.target.value))}
                    className="w-20"
                    min={0.1}
                    max={70}
                    step={0.1}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="context-length">Context Length (tokens)</Label>
                  <span className="text-sm font-medium">{contextLength}</span>
                </div>
                <div className="flex space-x-2">
                  <Slider
                    id="context-length"
                    min={1024}
                    max={128000}
                    step={1024}
                    value={[contextLength]}
                    onValueChange={(value) => setContextLength(value[0])}
                  />
                  <Input
                    type="number"
                    value={contextLength}
                    onChange={(e) => setContextLength(Number(e.target.value))}
                    className="w-24"
                    min={1024}
                    max={128000}
                    step={1024}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantization">Quantization Method</Label>
                <Select value={quantizationMethod} onValueChange={setQuantizationMethod}>
                  <SelectTrigger id="quantization">
                    <SelectValue placeholder="Select quantization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fp32">FP32 (32-bit float)</SelectItem>
                    <SelectItem value="fp16">FP16 (16-bit float)</SelectItem>
                    <SelectItem value="bf16">BF16 (16-bit brain float)</SelectItem>
                    <SelectItem value="int8">INT8 (8-bit integer)</SelectItem>
                    <SelectItem value="int4">INT4 (4-bit integer)</SelectItem>
                    <SelectItem value="gptq">GPTQ (optimized quantization)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="kv-cache" checked={enableKVCache} onCheckedChange={setEnableKVCache} />
                <Label htmlFor="kv-cache">Enable KV Cache</Label>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="batch-size">Batch Size</Label>
                  <span className="text-sm font-medium">{batchSize}</span>
                </div>
                <div className="flex space-x-2">
                  <Slider
                    id="batch-size"
                    min={1}
                    max={32}
                    step={1}
                    value={[batchSize]}
                    onValueChange={(value) => setBatchSize(value[0])}
                  />
                  <Input
                    type="number"
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    className="w-16"
                    min={1}
                    max={32}
                    step={1}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-4">Hardware Configuration</h2>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="gpu-model">GPU Model</Label>
                <GPUSelector value={gpuModel} onValueChange={setGpuModel} />
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="unified-memory" checked={unifiedMemory} onCheckedChange={setUnifiedMemory} />
                <Label htmlFor="unified-memory">Unified Memory System (Apple Silicon, etc.)</Label>
              </div>

              {unifiedMemory && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="system-ram">System RAM (GB)</Label>
                    <span className="text-sm font-medium">{systemRAM} GB</span>
                  </div>
                  <div className="flex space-x-2">
                    <Slider
                      id="system-ram"
                      min={8}
                      max={192}
                      step={4}
                      value={[systemRAM]}
                      onValueChange={(value) => setSystemRAM(value[0])}
                    />
                    <Input
                      type="number"
                      value={systemRAM}
                      onChange={(e) => setSystemRAM(Number(e.target.value))}
                      className="w-16"
                      min={8}
                      max={192}
                      step={4}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="results" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="comparison">Quantization Comparison</TabsTrigger>
          <TabsTrigger value="inference">Inference Speed</TabsTrigger>
        </TabsList>
        <TabsContent value="results">
          <ResultsDisplay
            vramRequired={vramRequired}
            systemRAMRequired={systemRAMRequired}
            diskSpace={diskSpace}
            gpusNeeded={gpusNeeded}
            inferenceSpeed={inferenceSpeed}
            gpuModel={gpuModel}
            unifiedMemory={unifiedMemory}
            systemRAM={systemRAM}
          />
        </TabsContent>
        <TabsContent value="comparison">
          <QuantizationComparison
            modelSize={modelSize}
            contextLength={contextLength}
            enableKVCache={enableKVCache}
            batchSize={batchSize}
          />
        </TabsContent>
        <TabsContent value="inference">
          <InferenceSpeedEstimator
            modelSize={modelSize}
            quantizationMethod={quantizationMethod}
            gpuModel={gpuModel}
            gpusNeeded={gpusNeeded}
            inferenceSpeed={inferenceSpeed}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

