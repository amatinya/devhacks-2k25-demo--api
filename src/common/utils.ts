export const isBufferLike = (value: unknown): value is Buffer | ArrayBuffer | Uint8Array => {
  return value instanceof Buffer || value instanceof ArrayBuffer || value instanceof Uint8Array;
};
