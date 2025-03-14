"use client"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ModelPreset {
  name: string
  parameters: number
  defaultQuantization: string
  defaultContext: number
  description: string
}

interface ModelPresetsProps {
  onSelectPreset: (preset: ModelPreset) => void
}

export function ModelPresets({ onSelectPreset }: ModelPresetsProps) {
  const presets: ModelPreset[] = [
    {
      name: "Llama 3 8B",
      parameters: 8,
      defaultQuantization: "fp16",
      defaultContext: 8192,
      description: "Meta's 8B parameter model, good for general tasks",
    },
    {
      name: "Llama 3 70B",
      parameters: 70,
      defaultQuantization: "int8",
      defaultContext: 8192,
      description: "Meta's largest model, high performance but resource intensive",
    },
    {
      name: "Mistral 7B",
      parameters: 7,
      defaultQuantization: "fp16",
      defaultContext: 8192,
      description: "Efficient 7B model with strong performance",
    },
    {
      name: "Gemma 2B",
      parameters: 2,
      defaultQuantization: "fp16",
      defaultContext: 8192,
      description: "Google's lightweight model for resource-constrained environments",
    },
    {
      name: "Gemma 7B",
      parameters: 7,
      defaultQuantization: "fp16",
      defaultContext: 8192,
      description: "Google's mid-sized model with good performance",
    },
    {
      name: "Falcon 7B",
      parameters: 7,
      defaultQuantization: "fp16",
      defaultContext: 2048,
      description: "TII's 7B parameter model",
    },
    {
      name: "GPT-J 6B",
      parameters: 6,
      defaultQuantization: "fp16",
      defaultContext: 2048,
      description: "EleutherAI's 6B parameter model",
    },
    {
      name: "Mixtral 8x7B",
      parameters: 47, // Effective parameters for memory calculation
      defaultQuantization: "int8",
      defaultContext: 32768,
      description: "Mixture of experts model with 8 experts of 7B each",
    },
  ]

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Model Presets</label>
      <div className="flex flex-wrap gap-2">
        <TooltipProvider>
          {presets.map((preset) => (
            <Tooltip key={preset.name}>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => onSelectPreset(preset)}>
                  {preset.name}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{preset.description}</p>
                <p className="text-xs mt-1">
                  {preset.parameters}B params, {preset.defaultContext} context length
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
    </div>
  )
}

