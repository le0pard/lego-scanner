<script>
  import classnames from 'classnames';
  import {
    cameraTabState,
    uploadTabState,
    activateCameraTabState,
    activateUploadTabState
  } from '$lib/states/tabs.svelte';
  import { isMenuOpen, toggleMenu } from '$lib/states/menu.svelte';
</script>

<header class="py-3 flex justify-between items-center gap-2">
  <div class="flex-1 min-w-0">
    <h1 class="text-xl sm:text-2xl font-black tracking-tight truncate">L-Scan</h1>
    <p class="text-[10px] sm:text-xs text-text-muted truncate">Barcode & Minifig</p>
  </div>

  <div class="flex shrink-0 p-1 bg-card-bg/50 border border-border rounded-lg" role="tablist">
    <button
      role="tab"
      aria-selected={cameraTabState()}
      onclick={activateCameraTabState}
      class={classnames(
        'px-4 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all active:scale-98',
        {
          'bg-app-bg text-primary shadow-sm border border-border/50': cameraTabState(),
          'text-text-muted border border-transparent hover:text-text-main': !cameraTabState()
        }
      )}
    >
      Camera
    </button>
    <button
      role="tab"
      aria-selected={uploadTabState()}
      onclick={activateUploadTabState}
      class={classnames(
        'px-4 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all active:scale-98',
        {
          'bg-app-bg text-primary shadow-sm border border-border/50': uploadTabState(),
          'text-text-muted border border-transparent hover:text-text-main': !uploadTabState()
        }
      )}
    >
      Upload
    </button>
  </div>

  <nav aria-label="Main Navigation" class="flex-1 flex justify-end">
    <button
      aria-expanded={isMenuOpen()}
      aria-controls="mobile-menu"
      aria-label="Toggle navigation menu"
      onclick={toggleMenu}
      class="relative z-50 w-8 h-8 cursor-pointer flex flex-col justify-center items-end space-y-1.5 p-1"
    >
      <span
        class={classnames('block w-6 h-0.5 bg-text-main transition-transform duration-300', {
          'rotate-45 translate-y-2': isMenuOpen()
        })}
      ></span>
      <span
        class={classnames('block w-6 h-0.5 bg-text-main transition-opacity duration-300', {
          'opacity-0': isMenuOpen()
        })}
      ></span>
      <span
        class={classnames('block w-6 h-0.5 bg-text-main transition-transform duration-300', {
          '-rotate-45 -translate-y-2': isMenuOpen()
        })}
      ></span>
    </button>

    <div
      id="mobile-menu"
      class={classnames(
        'absolute inset-0 z-40 bg-app-bg transition-transform duration-300 ease-out p-6 pt-[calc(var(--spacing-pwa-top)+4rem)] flex flex-col justify-between text-left',
        {
          'translate-x-0': isMenuOpen(),
          '-translate-x-full': !isMenuOpen()
        }
      )}
    >
      <ul class="space-y-4 text-lg font-bold">
        <li>
          <a href="/" class="block py-2 text-text-main hover:text-primary transition-colors"
            >Scanner Dashboard</a
          >
        </li>
        <li><hr class="border-border my-2" /></li>
        <li>
          <a
            href="https://github.com/le0pard/lego-scanner"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-2 py-2 text-text-muted hover:text-text-main transition-colors"
          >
            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.061.069-.061 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            Source Code
          </a>
        </li>
        <li>
          <a
            href="https://github.com/le0pard/lego-scanner/discussions/new?category=missing-set-figure"
            class="block py-2 text-sm text-text-muted hover:text-text-main transition-colors"
            target="_blank"
            rel="noopener noreferrer">Report Missing Brick Set</a
          >
        </li>
      </ul>
      <div class="text-xs text-text-muted border-t border-border pt-4">
        v1.4.0-BETA • PWA Sandbox
      </div>
    </div>
  </nav>
</header>
