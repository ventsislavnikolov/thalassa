// jsdom lacks the pointer-capture, scrolling and resize APIs that Radix
// primitives (Select, Popover, Switch) call. Node-environment test files have
// no window, so they are left alone.
class ResizeObserverStub {
  readonly observed = new Set<Element>();

  disconnect() {
    this.observed.clear();
  }

  observe(target: Element) {
    this.observed.add(target);
  }

  unobserve(target: Element) {
    this.observed.delete(target);
  }
}

if (typeof window !== "undefined") {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => undefined;
  Element.prototype.scrollIntoView ??= () => undefined;
  globalThis.ResizeObserver ??=
    ResizeObserverStub as unknown as typeof ResizeObserver;
}
