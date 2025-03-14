import { useState } from 'react';
import './App.css';

/** Memory mode: discrete GPU or unified memory. */
type MemoryMode = 'DISCRETE_GPU' | 'UNIFIED_MEMORY';

/** Model quantization set: F32, F16, Q8, Q6, Q5, Q4, Q3, Q2, GPTQ, AWQ. */
type ModelQuantization =
  | 'F32'
  | 'F16'
  | 'Q8'
  | 'Q6'
  | 'Q5'
  | 'Q4'
  | 'Q3'
  | 'Q2'
  | 'GPTQ'
  | 'AWQ';

/** KV cache quantization: F32, F16, Q8, Q5, Q4. */
type KvCacheQuantization = 'F32' | 'F16' | 'Q8' | 'Q5' | 'Q4';

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
  // 1. STATE
  // -----------------------------------

  // Model config
  const [params, setParams] = useState<number>(65); // Billions of parameters
  const [modelQuant, setModelQuant] = useState<ModelQuantization>('Q4');

  // KV Cache
  const [useKvCache, setUseKvCache] = useState<boolean>(true);
  const [kvCacheQuant, setKvCacheQuant] = useState<KvCacheQuantization>('F16');

  // Misc
  const [contextLength, setContextLength] = useState<number>(4096);
  const [memoryMode, setMemoryMode] = useState<MemoryMode>('DISCRETE_GPU');
  const [systemMemory, setSystemMemory] = useState<number>(128); // in GB
  const [gpuVram, setGpuVram] = useState<number>(24); // in GB, default 24GB

  // -----------------------------------
  // 2. HELPER FUNCTIONS
  // -----------------------------------

  // (A) Bits-based multiplier for the main model
  const getModelQuantFactor = (q: ModelQuantization): number => {
    switch (q) {
      case 'F32': return 4.0;
      case 'F16': return 2.0;
      case 'Q8': return 1.0;
      case 'Q6': return 0.75;
      case 'Q5': return 0.625;
      case 'Q4': return 0.5;
      case 'Q3': return 0.375;
      case 'Q2': return 0.25;
      case 'GPTQ': return 0.4;
      case 'AWQ': return 0.35;
      default: return 1.0;   // fallback
    }
  };

  // (B) Bits-based multiplier for KV cache
  // F32, F16, Q8, Q5, Q4
  const getKvCacheQuantFactor = (k: KvCacheQuantization): number => {
    switch (k) {
      case 'F32': return 4.0;
      case 'F16': return 2.0;
      case 'Q8': return 1.0;
      case 'Q5': return 0.625;
      case 'Q4': return 0.5;
      default: return 1.0;   // fallback
    }
  };

  /**
   * (C) Calculate VRAM for single-user inference.
   * Split into Model Memory + KV Cache Memory.
   */
  const calculateRequiredVram = (): number => {
    // 1) Model memory
    const modelFactor = getModelQuantFactor(modelQuant);
    const baseModelMem = params * modelFactor; // GB if 1B params

    // 2) Context scaling (just as before)
    let contextScale = contextLength / 2048;
    if (contextScale < 1) contextScale = 1;
    const modelMem = baseModelMem * contextScale;

    // 3) KV cache memory (if enabled)
    let kvCacheMem = 0;
    if (useKvCache) {
      const kvFactor = getKvCacheQuantFactor(kvCacheQuant);
      const alpha = 0.2; // fraction representing typical KV overhead
      kvCacheMem = params * kvFactor * contextScale * alpha;
    }

    // 4) total
    return modelMem + kvCacheMem;
  };

  // For unified memory, up to 75% of system RAM can be used as VRAM
  const getMaxUnifiedVram = (memGB: number): number => memGB * 0.75;

  // Decide discrete GPU vs. unified memory usage
  const calculateHardwareRecommendation = (): Recommendation => {
    const requiredVram = calculateRequiredVram();
    const recSystemMemory = systemMemory;

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

    // Discrete GPU
    const singleGpuVram = gpuVram;
    if (requiredVram <= singleGpuVram) {
      return {
        gpuType: `Single ${singleGpuVram}GB GPU`,
        vramNeeded: requiredVram.toFixed(1),
        fitsUnified: false,
        systemRamNeeded: Math.max(recSystemMemory, requiredVram),
        gpusRequired: 1,
      };
    } else {
      // multiple GPUs
      const count = Math.ceil(requiredVram / singleGpuVram);
      return {
        gpuType: `Discrete GPUs (${singleGpuVram}GB each)`,
        vramNeeded: requiredVram.toFixed(1),
        fitsUnified: false,
        systemRamNeeded: Math.max(recSystemMemory, requiredVram),
        gpusRequired: count,
      };
    }
  };

  /** Estimate on-disk model size (GB). We do NOT factor in KV here. */
  const calculateOnDiskSize = (): number => {
    let bitsPerParam: number;
    switch (modelQuant) {
      case 'F32': bitsPerParam = 32; break;
      case 'F16': bitsPerParam = 16; break;
      case 'Q8': bitsPerParam = 8; break;
      case 'Q6': bitsPerParam = 6; break;
      case 'Q5': bitsPerParam = 5; break;
      case 'Q4': bitsPerParam = 4; break;
      case 'Q3': bitsPerParam = 3; break;
      case 'Q2': bitsPerParam = 2; break;
      case 'GPTQ': bitsPerParam = 4; break;
      case 'AWQ': bitsPerParam = 4; break;
      default: bitsPerParam = 8; break;
    }

    const totalBits = params * 1e9 * bitsPerParam;
    const bytes = totalBits / 8;
    const gigabytes = bytes / 1e9;
    const overheadFactor = 1.1; // ~10% overhead
    return gigabytes * overheadFactor;
  };

    const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<number>>
  ) => {
    const newValue = Number(event.target.value);
    if (!isNaN(newValue)) {
      setter(newValue);
    }
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
        Estimate VRAM & System RAM for single-user inference (Batch=1).
        <br />
        Model quant & KV cache quant are configured separately.
      </p>

      <div className="layout">
        {/* Left Panel: Inputs */}
        <div className="input-panel">
          <h2 className="section-title">Model Configuration</h2>

          <label className="label-range">
            Number of Parameters (Billions): 
            <input className="text-input-group"
              type="number"
              min={1}
              max={1000}
              value={params}
              onChange={(e) => handleInputChange(e, setParams)}
            />
          </label>
          <div className="slider-input-group">
            <input
              type="range"
              min={1}
              max={1000}
              value={params}
              onChange={(e) => setParams(Number(e.target.value))}
            />
            
          </div>
          <label className="label-range">Model Quantization:</label>
          <select
            value={modelQuant}
            onChange={(e) => setModelQuant(e.target.value as ModelQuantization)}
          >
            {/* F32, F16, Q8, Q6, Q5, Q4, Q3, Q2, GPTQ, AWQ */}
            <option value="F32">F32</option>
            <option value="F16">F16</option>
            <option value="Q8">Q8</option>
            <option value="Q6">Q6</option>
            <option value="Q5">Q5</option>
            <option value="Q4">Q4</option>
            <option value="Q3">Q3</option>
            <option value="Q2">Q2</option>
            <option value="GPTQ">GPTQ</option>
            <option value="AWQ">AWQ</option>
          </select>

          <label className="label-range">
            Context Length (Tokens):
            <input className="text-input-group"
              type="number"
              min={128}
              max={32768}
              step={128}
              value={contextLength}
              onChange={(e) => handleInputChange(e, setContextLength)}
            />
          </label>
          <div className="slider-input-group">
            <input
              type="range"
              min={128}
              max={32768}
              step={128}
              value={contextLength}
              onChange={(e) => setContextLength(Number(e.target.value))}
            />
           
          </div>

          {/* KV Cache Toggle */}
          <div className="checkbox-row">
            <input
              type="checkbox"
              checked={useKvCache}
              onChange={() => setUseKvCache(!useKvCache)}
              id="kvCache"
            />
            <label htmlFor="kvCache">Enable KV Cache</label>
          </div>

          {/* 
             (Animated) KV Cache Quant Section:
             We'll wrap it in a div that transitions "max-height"
             so the UI doesn't jump abruptly.
          */}
          <div className={`kvCacheAnimate ${useKvCache ? "open" : "closed"}`}>
            <label className="label-range">KV Cache Quantization:</label>
            <select
              value={kvCacheQuant}
              onChange={(e) => setKvCacheQuant(e.target.value as KvCacheQuantization)}
            >
              <option value="F32">F32</option>
              <option value="F16">F16</option>
              <option value="Q8">Q8</option>
              <option value="Q5">Q5</option>
              <option value="Q4">Q4</option>
            </select>
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

          {memoryMode === 'DISCRETE_GPU' && (
            <>
              <label className="label-range">GPU VRAM (GB):</label>
              <select
                value={gpuVram}
                onChange={(e) => setGpuVram(Number(e.target.value))}
              >
                <option value={8}>8</option>
                <option value={12}>12</option>
                <option value={16}>16</option>
                <option value={24}>24</option>
                <option value={32}>32</option>
                <option value={40}>40</option>
                <option value={48}>48</option>
                <option value={80}>80</option>
              </select>
            </>
          )}

          <label className="label-range">
            System Memory (GB): 
            <input className="text-input-group"
              type="number"
              min={8}
              max={512}
              step={8}
              value={systemMemory}
              onChange={(e) => handleInputChange(e, setSystemMemory)}
            />
          </label>
           <div className="slider-input-group">
            <input
              type="range"
              min={8}
              max={512}
              step={8}
              value={systemMemory}
              onChange={(e) => setSystemMemory(Number(e.target.value))}
            />
           
           </div>
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
            <strong>GPU Config:</strong> {recommendation.gpuType}
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
            <strong>System RAM:</strong>{" "}
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
