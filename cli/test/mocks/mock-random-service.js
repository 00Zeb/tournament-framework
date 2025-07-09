class MockRandomService {
  constructor(seed = 0.5) {
    this.seed = seed;
    this.sequence = [];
    this.index = 0;
  }

  setSequence(sequence) {
    this.sequence = sequence;
    this.index = 0;
  }

  setSeed(seed) {
    this.seed = seed;
  }

  random() {
    if (this.sequence.length > 0) {
      const value = this.sequence[this.index % this.sequence.length];
      this.index++;
      return value;
    }
    return this.seed;
  }

  randomInt(min, max) {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  shuffle(array) {
    if (this.sequence.length > 0) {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
    return [...array];
  }

  pick(array) {
    if (array.length === 0) {
      return undefined;
    }
    return array[Math.floor(this.random() * array.length)];
  }

  pickWeighted(items, weights) {
    if (items.length !== weights.length) {
      throw new Error('Items and weights arrays must have the same length');
    }

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const randomValue = this.random() * totalWeight;
    
    let currentWeight = 0;
    for (let i = 0; i < items.length; i++) {
      currentWeight += weights[i];
      if (randomValue <= currentWeight) {
        return items[i];
      }
    }

    return items[items.length - 1];
  }

  chance(probability) {
    return this.random() < probability;
  }

  reset() {
    this.index = 0;
  }
}

module.exports = MockRandomService;