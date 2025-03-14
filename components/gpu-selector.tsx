"use client"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface GPUSelectorProps {
  value: string
  onValueChange: (value: string) => void
}

export function GPUSelector({ value, onValueChange }: GPUSelectorProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select GPU model" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>NVIDIA GeForce RTX</SelectLabel>
          <SelectItem value="rtx4090">RTX 4090 (24GB)</SelectItem>
          <SelectItem value="rtx3090">RTX 3090 (24GB)</SelectItem>
          <SelectItem value="rtx4080">RTX 4080 (16GB)</SelectItem>
          <SelectItem value="rtx3080">RTX 3080 (10GB)</SelectItem>
          <SelectItem value="rtx4070">RTX 4070 (12GB)</SelectItem>
          <SelectItem value="rtx3070">RTX 3070 (8GB)</SelectItem>
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>NVIDIA Data Center</SelectLabel>
          <SelectItem value="h100">H100 (80GB)</SelectItem>
          <SelectItem value="a100_80gb">A100 (80GB)</SelectItem>
          <SelectItem value="a100_40gb">A100 (40GB)</SelectItem>
          <SelectItem value="a40">A40 (48GB)</SelectItem>
          <SelectItem value="a30">A30 (24GB)</SelectItem>
          <SelectItem value="a10">A10 (24GB)</SelectItem>
          <SelectItem value="l4">L4 (24GB)</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

