/**
 * Minimal fully-connected neural network for DQN.
 * Pure TypeScript, no dependencies.
 *
 * Supports:
 *  - Arbitrary layer sizes (e.g. [138, 128, 64, 58])
 *  - ReLU hidden activations, linear output layer
 *  - Forward pass
 *  - Backward pass with Adam optimizer
 *  - Weight serialization / deserialization
 */

interface LayerState {
  weights: number[][]; // [inputSize][outputSize]
  biases: number[]; // [outputSize]
  // Adam optimizer state
  mW: number[][];
  vW: number[][];
  mB: number[];
  vB: number[];
}

export interface SerializedWeights {
  layers: Array<{
    weights: number[][];
    biases: number[];
  }>;
}

export class NeuralNetwork {
  private layers: LayerState[];
  private layerSizes: number[];
  private adamT: number; // timestep for Adam bias correction

  constructor(layerSizes: number[]) {
    this.layerSizes = layerSizes;
    this.layers = [];
    this.adamT = 0;

    for (let l = 0; l < layerSizes.length - 1; l++) {
      const inSize = layerSizes[l];
      const outSize = layerSizes[l + 1];
      // He initialization: scale = sqrt(2 / fan_in)
      const scale = Math.sqrt(2 / inSize);

      const weights: number[][] = [];
      const mW: number[][] = [];
      const vW: number[][] = [];
      for (let i = 0; i < inSize; i++) {
        const row: number[] = [];
        const mRow: number[] = [];
        const vRow: number[] = [];
        for (let j = 0; j < outSize; j++) {
          row.push((Math.random() * 2 - 1) * scale);
          mRow.push(0);
          vRow.push(0);
        }
        weights.push(row);
        mW.push(mRow);
        vW.push(vRow);
      }

      const biases = new Array(outSize).fill(0);
      const mB = new Array(outSize).fill(0);
      const vB = new Array(outSize).fill(0);

      this.layers.push({ weights, biases, mW, vW, mB, vB });
    }
  }

  /** Forward pass. Returns output values. */
  forward(input: number[]): number[] {
    let activation = input;
    for (let l = 0; l < this.layers.length; l++) {
      const layer = this.layers[l];
      const isOutput = l === this.layers.length - 1;
      const out = new Array(layer.biases.length);

      for (let j = 0; j < layer.biases.length; j++) {
        let sum = layer.biases[j];
        for (let i = 0; i < activation.length; i++) {
          sum += activation[i] * layer.weights[i][j];
        }
        out[j] = isOutput ? sum : Math.max(0, sum); // ReLU for hidden, linear for output
      }
      activation = out;
    }
    return activation;
  }

  /**
   * Train on a single sample using backward pass with Adam optimizer.
   * `targetMask` specifies which output indices to train on (sparse targets).
   * Returns the loss for the masked outputs.
   */
  trainStep(
    input: number[],
    targets: Map<number, number>, // actionSlot → target Q-value
    lr: number,
    beta1 = 0.9,
    beta2 = 0.999,
    epsilon = 1e-8,
  ): number {
    // --- Forward pass with caching ---
    const activations: number[][] = [input];
    const preActivations: number[][] = [];

    let a = input;
    for (let l = 0; l < this.layers.length; l++) {
      const layer = this.layers[l];
      const isOutput = l === this.layers.length - 1;
      const z = new Array(layer.biases.length);
      const out = new Array(layer.biases.length);

      for (let j = 0; j < layer.biases.length; j++) {
        let sum = layer.biases[j];
        for (let i = 0; i < a.length; i++) {
          sum += a[i] * layer.weights[i][j];
        }
        z[j] = sum;
        out[j] = isOutput ? sum : Math.max(0, sum);
      }
      preActivations.push(z);
      activations.push(out);
      a = out;
    }

    // --- Compute output gradient (only for specified target indices) ---
    const outputSize = this.layers[this.layers.length - 1].biases.length;
    const outputGrad = new Array(outputSize).fill(0);
    let loss = 0;
    const output = activations[activations.length - 1];

    for (const [idx, target] of targets) {
      const diff = output[idx] - target;
      outputGrad[idx] = diff; // dL/dz for MSE
      loss += diff * diff;
    }
    loss /= targets.size > 0 ? targets.size : 1;

    // --- Backward pass ---
    this.adamT++;
    let delta = outputGrad;

    for (let l = this.layers.length - 1; l >= 0; l--) {
      const layer = this.layers[l];
      const aIn = activations[l];
      const isOutput = l === this.layers.length - 1;

      // Apply ReLU derivative for hidden layers
      if (!isOutput) {
        const z = preActivations[l];
        for (let j = 0; j < delta.length; j++) {
          if (z[j] <= 0) delta[j] = 0;
        }
      }

      // Compute gradients and update with Adam
      const nextDelta = new Array(aIn.length).fill(0);

      for (let i = 0; i < aIn.length; i++) {
        for (let j = 0; j < delta.length; j++) {
          const grad = aIn[i] * delta[j];
          // Adam update for weight
          layer.mW[i][j] = beta1 * layer.mW[i][j] + (1 - beta1) * grad;
          layer.vW[i][j] = beta2 * layer.vW[i][j] + (1 - beta2) * grad * grad;
          const mHat = layer.mW[i][j] / (1 - Math.pow(beta1, this.adamT));
          const vHat = layer.vW[i][j] / (1 - Math.pow(beta2, this.adamT));
          layer.weights[i][j] -= lr * mHat / (Math.sqrt(vHat) + epsilon);

          nextDelta[i] += layer.weights[i][j] * delta[j];
        }
      }

      for (let j = 0; j < delta.length; j++) {
        const grad = delta[j];
        layer.mB[j] = beta1 * layer.mB[j] + (1 - beta1) * grad;
        layer.vB[j] = beta2 * layer.vB[j] + (1 - beta2) * grad * grad;
        const mHat = layer.mB[j] / (1 - Math.pow(beta1, this.adamT));
        const vHat = layer.vB[j] / (1 - Math.pow(beta2, this.adamT));
        layer.biases[j] -= lr * mHat / (Math.sqrt(vHat) + epsilon);
      }

      delta = nextDelta;
    }

    return loss;
  }

  /** Serialize weights (without optimizer state) for saving. */
  getWeights(): SerializedWeights {
    return {
      layers: this.layers.map((layer) => ({
        weights: layer.weights.map((row) => [...row]),
        biases: [...layer.biases],
      })),
    };
  }

  /** Load previously saved weights. */
  setWeights(data: SerializedWeights): void {
    for (let l = 0; l < data.layers.length; l++) {
      const src = data.layers[l];
      const dst = this.layers[l];
      for (let i = 0; i < src.weights.length; i++) {
        for (let j = 0; j < src.weights[i].length; j++) {
          dst.weights[i][j] = src.weights[i][j];
        }
      }
      for (let j = 0; j < src.biases.length; j++) {
        dst.biases[j] = src.biases[j];
      }
    }
  }

  /** Deep clone the network (for target network). */
  clone(): NeuralNetwork {
    const nn = new NeuralNetwork(this.layerSizes);
    nn.setWeights(this.getWeights());
    return nn;
  }
}
