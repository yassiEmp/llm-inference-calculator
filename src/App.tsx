import { useState } from 'react';
import './App.css';

type MemoryMode = 'DISCRETE_GPU' | 'UNIFIED_MEMORY';

type Quantization =
  | 'FP32'
  | 'FP16'
  | 'INT8'
  | 'INT6'
  | 'INT4'
  | 'INT3'
  | 'INT2'
  | 'GPTQ'
  | 'AWQ';

/** Recommendation for final output. */
interface Recommendation {
  gpuType: string;         // e.g., 'Single 24GB GPU' or 'Unified memory...'
  vramNeeded: string;      // e.g., "32.5"
  fitsUnified: boolean;    // relevant if memoryMode = 'UNIFIED_MEMORY'
  systemRamNeeded: number; // in GB
  gpusRequired: number;    // discrete GPUs required (0 if doesn't fit)
}

function App() {
  // -----------------------------------
  // 1. STATE: Single-user inference
  // -----------------------------------
  const [params, setParams] = useState<number>(65); // Billions of parameters
  const [quantization, setQuantization] = useState<Quantization>('INT4');
  const [contextLength, setContextLength] = useState<number>(4096);
  const [useKvCache, setUseKvCache] = useState<boolean>(true);

  const [memoryMode, setMemoryMode] = useState<MemoryMode>('DISCRETE_GPU');
  const [systemMemory, setSystemMemory] = useState<number>(128); // in GB

  // -----------------------------------
  // 2. HELPER FUNCTIONS
  // -----------------------------------
  /** Bits per parameter ratio for VRAM usage in inference. */
  const getQuantizationFactor = (q: Quantization): number => {
    switch (q) {
      case 'FP32': return 4.0;   
      case 'FP16': return 2.0;   
      case 'INT8': return 1.0;   
      case 'INT6': return 0.75;  
      case 'INT4': return 0.5;   
      case 'INT3': return 0.375; 
      case 'INT2': return 0.25;  
      case 'GPTQ': return 0.4;   
      case 'AWQ':  return 0.35;  
      default:     return 1.0;   
    }
  };

  /**
   * Approximates the required VRAM (GB) for single-user inference (batch=1).
   *   baseVRAM = (params × quantFactor) × contextLength factor × KV Cache overhead
   */
  const calculateRequiredVram = (): number => {
    const quantFactor = getQuantizationFactor(quantization);
    const baseVram = params * quantFactor;

    // Increase memory usage with context length
    let contextScale = contextLength / 2048;
    if (contextScale < 1) contextScale = 1;

    // KV cache overhead
    const kvCacheFactor = useKvCache ? 1.2 : 1.0;

    // No explicit batch size here (it's effectively = 1)
    const totalVram = baseVram * contextScale * kvCacheFactor;
    return totalVram; // in GB
  };

  /** For unified memory, up to 75% of system RAM can be used as VRAM. */
  const getMaxUnifiedVram = (memGB: number): number => memGB * 0.75;

  /** Decide discrete GPU vs. unified memory usage. */
  const calculateHardwareRecommendation = (): Recommendation => {
    const requiredVram = calculateRequiredVram();
    const recSystemMemory = systemMemory;

    // A) Unified Memory
    if (memoryMode === 'UNIFIED_MEMORY') {
      const unifiedLimit = getMaxUnifiedVram(recSystemMemory);
      if (requiredVram <= unifiedLimit) {
        return {
          gpuType: 'Unified memory (ex: Apple silicon, AMD Ryzen™ Al Max+ 395)',
          vramNeeded: requiredVram.toFixed(1),
          fitsUnified: true,
          systemRamNeeded: recSystemMemory,
          gpusRequired: 1,
        };
      } else {
        return {
          gpuType: 'Unified memory (insufficient)',
          vramNeeded: requiredVram.toFixed(1),
          fitsUnified: false,
          systemRamNeeded: recSystemMemory,
          gpusRequired: 0,
        };
      }
    }

    // B) Discrete GPU
    // Assume single GPU has 24GB VRAM (e.g., RTX 3090/4090).
    const singleGpuVram = 24;
    if (requiredVram <= singleGpuVram) {
      return {
        gpuType: 'Single 24GB GPU',
        vramNeeded: requiredVram.toFixed(1),
        fitsUnified: false,
        systemRamNeeded: Math.max(recSystemMemory, requiredVram),
        gpusRequired: 1,
      };
    } else {
      // multiple GPUs needed
      const count = Math.ceil(requiredVram / singleGpuVram);
      return {
        gpuType: 'Discrete GPUs (24GB each)',
        vramNeeded: requiredVram.toFixed(1),
        fitsUnified: false,
        systemRamNeeded: Math.max(recSystemMemory, requiredVram),
        gpusRequired: count,
      };
    }
  };

  /** Estimate on-disk model size (GB). */
  const calculateOnDiskSize = (): number => {
    let bitsPerParam: number;
    switch (quantization) {
      case 'FP32': bitsPerParam = 32; break;
      case 'FP16': bitsPerParam = 16; break;
      case 'INT8': bitsPerParam = 8;  break;
      case 'INT6': bitsPerParam = 6;  break;
      case 'INT4': bitsPerParam = 4;  break;
      case 'INT3': bitsPerParam = 3;  break;
      case 'INT2': bitsPerParam = 2;  break;
      case 'GPTQ': bitsPerParam = 4;  break;
      case 'AWQ':  bitsPerParam = 4;  break;
      default:     bitsPerParam = 8;  break;
    }

    const totalBits = params * 1e9 * bitsPerParam;
    const bytes = totalBits / 8;
    const gigabytes = bytes / 1e9;
    const overheadFactor = 1.1; // ~10% overhead
    return gigabytes * overheadFactor;
  };

  // -----------------------------------
  // 3. CALCULATE & RENDER
  // -----------------------------------
  const recommendation = calculateHardwareRecommendation();
  const onDiskSize = calculateOnDiskSize();

  return (
    <div className="App">
      <h1>LLM Inference Hardware Calculator</h1>
      <p className="intro-text">
        Estimates VRAM & System RAM for single-user inference (Batch = 1).
      </p>

      <div className="layout">
        {/* Left Panel: Inputs */}
        <div className="input-panel">
          <h2 className="section-title">Model Configuration</h2>

          <label className="label-range">
            Number of Parameters (Billions): {params}
          </label>
          <input
            type="range"
            min={1}
            max={1000}
            value={params}
            onChange={(e) => setParams(Number(e.target.value))}
          />

          <label className="label-range">Quantization:</label>
          <select
            value={quantization}
            onChange={(e) => setQuantization(e.target.value as Quantization)}
          >
            <option value="FP32">FP32</option>
            <option value="FP16">FP16</option>
            <option value="INT8">INT8</option>
            <option value="INT6">INT6</option>
            <option value="INT4">INT4</option>
            <option value="INT3">INT3</option>
            <option value="INT2">INT2</option>
            <option value="GPTQ">GPTQ</option>
            <option value="AWQ">AWQ</option>
          </select>

          <label className="label-range">
            Context Length (Tokens): {contextLength}
          </label>
          <input
            type="range"
            min={128}
            max={32768}
            step={128}
            value={contextLength}
            onChange={(e) => setContextLength(Number(e.target.value))}
          />

          <div className="checkbox-row">
            <input
              type="checkbox"
              checked={useKvCache}
              onChange={() => setUseKvCache(!useKvCache)}
              id="kvCache"
            />
            <label htmlFor="kvCache">
              Enable KV Cache
            </label>
          </div>

          <hr style={{ margin: '1rem 0' }} />

          <h2 className="section-title">System Configuration</h2>

          <label className="label-range">System Type:</label>
          <select
            value={memoryMode}
            onChange={(e) => setMemoryMode(e.target.value as MemoryMode)}
          >
            <option value="DISCRETE_GPU">Discrete GPU</option>
            <option value="UNIFIED_MEMORY">
              Unified memory (ex: Apple silicon, AMD Ryzen™ Al Max+ 395)
            </option>
          </select>

          <label className="label-range">
            System Memory (GB): {systemMemory}
          </label>
          <input
            type="range"
            min={8}
            max={512}
            step={8}
            value={systemMemory}
            onChange={(e) => setSystemMemory(Number(e.target.value))}
          />
        </div>

        {/* Right Panel: Results */}
        <div className="results-panel">
          <h2 className="section-title">Hardware Requirements</h2>

          <p>
            <strong>VRAM Needed:</strong>{" "}
            <span className="result-highlight">{recommendation.vramNeeded} GB</span>
          </p>
          <p>
            <strong>On-Disk Size:</strong>{" "}
            <span className="result-highlight">{onDiskSize.toFixed(2)} GB</span>
          </p>
          <p>
            <strong>GPU Configuration:</strong> {recommendation.gpuType}
          </p>

          {recommendation.gpusRequired > 1 && (
            <p>
              <strong>Number of GPUs Required:</strong> {recommendation.gpusRequired}
            </p>
          )}
          {recommendation.gpusRequired === 1 && (
            <p>
              <strong>Number of GPUs Required:</strong> 1 (Fits on a single GPU)
            </p>
          )}

          <p>
            <strong>Minimum System RAM:</strong>{" "}
            {recommendation.systemRamNeeded.toFixed(1)} GB
          </p>

          {memoryMode === 'UNIFIED_MEMORY' && recommendation.fitsUnified && (
            <p style={{ color: 'green' }}>
              ✅ Fits in unified memory!
            </p>
          )}
          {memoryMode === 'UNIFIED_MEMORY' && !recommendation.fitsUnified && (
            <p style={{ color: 'red' }}>
              ⚠️ Exceeds unified memory. Increase system RAM or reduce model size.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;