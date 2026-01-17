if (typeof global !== 'undefined' && !global.fetch) {
  global.fetch = fetch;
}

export {};
