import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calculator } from "@/components/calculator"
import { ThemeToggle } from "@/components/theme-toggle"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <h1 className="text-2xl font-bold">LLM Inference Hardware Calculator</h1>
          <ThemeToggle />
        </div>
      </header>
      <main className="container py-6">
        <p className="mb-6 text-muted-foreground">
          Estimate hardware requirements for running Large Language Models (LLMs) in inference mode. This tool helps you
          determine the VRAM and system RAM needed for different LLM configurations.
        </p>

        <Tabs defaultValue="calculator" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="calculator">Calculator</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>
          <TabsContent value="calculator">
            <Calculator />
          </TabsContent>
          <TabsContent value="about">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">About This Calculator</h2>
              <p>
                This calculator provides estimates for hardware requirements when running LLMs in inference mode. The
                calculations are approximations and may vary based on specific implementations.
              </p>

              <h3 className="text-lg font-medium">Calculation Methodology</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>VRAM estimates include overhead for KV cache when enabled</li>
                <li>Unified memory calculations assume up to 75% of system RAM can be used as VRAM</li>
                <li>Discrete GPU calculations are based on the selected GPU model</li>
                <li>Model size on disk varies based on quantization method</li>
              </ul>

              <h3 className="text-lg font-medium">Technical Notes</h3>
              <p>Different quantization methods significantly impact memory requirements:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>FP32:</strong> Full precision (4 bytes per parameter)
                </li>
                <li>
                  <strong>FP16/BF16:</strong> Half precision (2 bytes per parameter)
                </li>
                <li>
                  <strong>INT8:</strong> 8-bit quantization (1 byte per parameter)
                </li>
                <li>
                  <strong>INT4:</strong> 4-bit quantization (0.5 bytes per parameter)
                </li>
                <li>
                  <strong>GPTQ:</strong> Optimized quantization with varying precision
                </li>
              </ul>

              <p className="mt-4">This project is open source and available under the MIT license.</p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

