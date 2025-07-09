const DependencyContainer = require('../../../src/utils/dependency-container');

describe('DependencyContainer', () => {
  let container;

  beforeEach(() => {
    container = new DependencyContainer();
  });

  describe('register and get', () => {
    it('should register and retrieve a service', () => {
      const service = { name: 'test-service' };
      container.register('testService', service);
      
      expect(container.get('testService')).toBe(service);
    });

    it('should register and retrieve using factory', () => {
      const factory = () => ({ name: 'factory-service' });
      container.register('factoryService', factory);
      
      const service = container.get('factoryService');
      expect(service.name).toBe('factory-service');
    });

    it('should create singleton from factory', () => {
      const factory = () => ({ name: 'singleton-service' });
      container.register('singletonService', factory);
      
      const service1 = container.get('singletonService');
      const service2 = container.get('singletonService');
      
      expect(service1).toBe(service2);
    });

    it('should throw error for unregistered service', () => {
      expect(() => {
        container.get('nonExistentService');
      }).toThrow("Service 'nonExistentService' not found in container");
    });
  });

  describe('has', () => {
    it('should return true for registered service', () => {
      container.register('testService', {});
      expect(container.has('testService')).toBe(true);
    });

    it('should return true for registered factory', () => {
      container.register('factoryService', () => ({}));
      expect(container.has('factoryService')).toBe(true);
    });

    it('should return false for unregistered service', () => {
      expect(container.has('nonExistentService')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all services and factories', () => {
      container.register('service1', {});
      container.register('service2', () => ({}));
      
      container.clear();
      
      expect(container.has('service1')).toBe(false);
      expect(container.has('service2')).toBe(false);
    });
  });

  describe('factory with container injection', () => {
    it('should inject container into factory', () => {
      container.register('dependency', { value: 42 });
      container.register('service', (container) => {
        return {
          dependency: container.get('dependency')
        };
      });
      
      const service = container.get('service');
      expect(service.dependency.value).toBe(42);
    });
  });

  describe('createDefault', () => {
    it('should create container with default services', () => {
      const defaultContainer = DependencyContainer.createDefault();
      
      expect(defaultContainer.has('randomService')).toBe(true);
      expect(defaultContainer.has('fileService')).toBe(true);
      expect(defaultContainer.has('cardService')).toBe(true);
    });

    it('should create services that depend on each other', () => {
      const defaultContainer = DependencyContainer.createDefault();
      
      const cardService = defaultContainer.get('cardService');
      expect(cardService).toBeDefined();
      
      const randomService = defaultContainer.get('randomService');
      expect(randomService).toBeDefined();
    });
  });

  describe('createTest', () => {
    it('should create container with mock services', () => {
      const testContainer = DependencyContainer.createTest();
      
      expect(testContainer.has('randomService')).toBe(true);
      expect(testContainer.has('fileService')).toBe(true);
      expect(testContainer.has('cardService')).toBe(true);
    });
  });
});