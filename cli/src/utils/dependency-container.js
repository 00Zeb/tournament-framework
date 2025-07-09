class DependencyContainer {
  constructor() {
    this.services = new Map();
    this.factories = new Map();
  }

  register(name, serviceOrFactory, options = {}) {
    if (typeof serviceOrFactory === 'function' && !options.singleton) {
      this.factories.set(name, serviceOrFactory);
    } else {
      this.services.set(name, serviceOrFactory);
    }
  }

  get(name) {
    if (this.services.has(name)) {
      return this.services.get(name);
    }

    if (this.factories.has(name)) {
      const factory = this.factories.get(name);
      const instance = factory(this);
      this.services.set(name, instance);
      return instance;
    }

    throw new Error(`Service '${name}' not found in container`);
  }

  has(name) {
    return this.services.has(name) || this.factories.has(name);
  }

  clear() {
    this.services.clear();
    this.factories.clear();
  }

  static createDefault() {
    const container = new DependencyContainer();
    
    container.register('randomService', () => {
      const RandomService = require('../services/random-service');
      return new RandomService();
    });

    container.register('fileService', () => {
      const FileService = require('../services/file-service');
      return new FileService();
    });

    container.register('cardService', (container) => {
      const CardService = require('../services/card-service');
      return new CardService(container.get('randomService'));
    });

    return container;
  }

  static createTest() {
    const container = new DependencyContainer();
    
    container.register('randomService', () => {
      const MockRandomService = require('../../test/mocks/mock-random-service');
      return new MockRandomService();
    });

    container.register('fileService', () => {
      const MockFileService = require('../../test/mocks/mock-file-service');
      return new MockFileService();
    });

    container.register('cardService', (container) => {
      const CardService = require('../services/card-service');
      return new CardService(container.get('randomService'));
    });

    return container;
  }
}

module.exports = DependencyContainer;