// RandomSourcePort adapter backed by the Web Crypto API.
export function createRandomSource() {
  return {
    nextInt(max) {
      const range = 0x100000000;
      const limit = range - (range % max);
      const buf = new Uint32Array(1);
      let x;
      do {
        crypto.getRandomValues(buf);
        x = buf[0];
      } while (x >= limit);
      return 1 + (x % max);
    },
  };
}
