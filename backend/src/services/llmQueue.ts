/** Xếp hàng tuần tự các request LLM để tránh 429 trên tier free. */
let chain: Promise<unknown> = Promise.resolve();

export function withLlmQueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
