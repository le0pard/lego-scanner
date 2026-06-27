// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  // Static compile-time global injected safely during the asset bundling phase
  const __APP_VERSION__: string;

  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
