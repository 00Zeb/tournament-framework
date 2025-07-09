const RandomService = require('../../../src/services/random-service');

describe('RandomService', () => {
  let randomService;

  beforeEach(() => {
    randomService = new RandomService();
  });

  describe('random', () => {
    it('should return a number between 0 and 1', () => {
      const result = randomService.random();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(1);
    });
  });

  describe('randomInt', () => {
    it('should return integer within specified range', () => {
      const min = 1;
      const max = 10;
      const result = randomService.randomInt(min, max);
      
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(min);
      expect(result).toBeLessThanOrEqual(max);
    });

    it('should handle single value range', () => {
      const result = randomService.randomInt(5, 5);
      expect(result).toBe(5);
    });
  });

  describe('shuffle', () => {
    it('should return array with same length', () => {
      const input = [1, 2, 3, 4, 5];
      const result = randomService.shuffle(input);
      
      expect(result.length).toBe(input.length);
      expect(result).not.toBe(input);
    });

    it('should contain all original elements', () => {
      const input = [1, 2, 3, 4, 5];
      const result = randomService.shuffle(input);
      
      input.forEach(item => {
        expect(result).toContain(item);
      });
    });

    it('should handle empty array', () => {
      const result = randomService.shuffle([]);
      expect(result).toEqual([]);
    });
  });

  describe('pick', () => {
    it('should return element from array', () => {
      const input = [1, 2, 3, 4, 5];
      const result = randomService.pick(input);
      
      expect(input).toContain(result);
    });

    it('should return undefined for empty array', () => {
      const result = randomService.pick([]);
      expect(result).toBeUndefined();
    });
  });

  describe('pickWeighted', () => {
    it('should return item from items array', () => {
      const items = ['a', 'b', 'c'];
      const weights = [1, 2, 3];
      const result = randomService.pickWeighted(items, weights);
      
      expect(items).toContain(result);
    });

    it('should throw error for mismatched array lengths', () => {
      expect(() => {
        randomService.pickWeighted(['a', 'b'], [1, 2, 3]);
      }).toThrow('Items and weights arrays must have the same length');
    });
  });

  describe('chance', () => {
    it('should return boolean', () => {
      const result = randomService.chance(0.5);
      expect(typeof result).toBe('boolean');
    });

    it('should return true for probability 1', () => {
      const result = randomService.chance(1);
      expect(result).toBe(true);
    });

    it('should return false for probability 0', () => {
      const result = randomService.chance(0);
      expect(result).toBe(false);
    });
  });
});