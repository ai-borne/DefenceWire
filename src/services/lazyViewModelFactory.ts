/**
 * Generic Lazy Loader for DefenceWire.in
 * Wraps a dynamic import + one-time construction (+ optional one-time
 * "ready" callback, e.g. subscribing a ViewModel) so heavy, rarely-used
 * modules (Archive/Programs/Suppliers ViewModels, and their view-render
 * function modules) stay out of the eagerly-loaded main bundle until first
 * actually needed. The returned accessor is a singleton: the first call
 * triggers the import, every subsequent call (including ones racing the
 * first) resolves to the same instance. `.peek()` exposes a synchronous
 * check for "already resolved" so a caller can skip an async placeholder
 * once the module is warm (see MainFeedRouter.ts's renderLazyRoute).
 * Hard limit: <= 300 LOC.
 */

export interface LazyAccessor<T> {
  (): Promise<T>;
  peek(): T | undefined;
}

export function createLazyViewModelLoader<TModule, TResult>(
  importModule: () => Promise<TModule>,
  construct: (module: TModule) => TResult,
  onReady?: (result: TResult) => void
): LazyAccessor<TResult> {
  let instance: TResult | undefined;
  let pending: Promise<TResult> | null = null;

  const ensure = (() => {
    if (instance) return Promise.resolve(instance);
    if (!pending) {
      pending = importModule().then((module) => {
        instance = construct(module);
        onReady?.(instance);
        return instance as TResult;
      });
    }
    return pending;
  }) as LazyAccessor<TResult>;

  ensure.peek = () => instance;
  return ensure;
}
