<script>
  import classNames from 'classnames';
  import { resolve } from '$app/paths';
  import { afterNavigate } from '$app/navigation';
  import {
    cameraTabState,
    uploadTabState,
    activateCameraTabState,
    activateUploadTabState
  } from '$lib/states/tabs.svelte.js';
  import { isMenuOpen, toggleMenu, closeMenu } from '$lib/states/menu.svelte.js';

  let { showTabs = true } = $props();

  $effect(() => {
    if (typeof document !== 'undefined' && document.body?.style) {
      document.body.style.overflow = isMenuOpen() ? 'hidden' : 'auto';

      return () => {
        document.body.style.overflow = 'auto';
      };
    }
  });

  afterNavigate(() => {
    closeMenu();
  });
</script>

<header class="flex items-center justify-between gap-2 py-3">
  <div class="min-w-0 flex-1">
    <h1 class="truncate text-xl font-black tracking-tight sm:text-2xl">
      <a href={resolve('/')}>L-Scan</a>
    </h1>
    <p class="truncate text-xs text-text-muted sm:text-xs">Lego Minifigures Scanner</p>
  </div>

  {#if showTabs}
    <div class="flex shrink-0 rounded-xl border border-border bg-card-bg p-1" role="tablist">
      <button
        role="tab"
        aria-selected={cameraTabState()}
        onclick={activateCameraTabState}
        class={classNames(
          'cursor-pointer rounded-lg px-4 py-1.5 text-xs font-black transition-all duration-150 active:scale-95 sm:text-sm',
          {
            'bg-primary text-neutral-950 shadow-sm': cameraTabState(),
            'text-text-muted hover:text-text-main': !cameraTabState()
          }
        )}
      >
        Camera
      </button>
      <button
        role="tab"
        aria-selected={uploadTabState()}
        onclick={activateUploadTabState}
        class={classNames(
          'cursor-pointer rounded-lg px-4 py-1.5 text-xs font-black transition-all duration-150 active:scale-95 sm:text-sm',
          {
            'bg-primary text-neutral-950 shadow-sm': uploadTabState(),
            'text-text-muted hover:text-text-main': !uploadTabState()
          }
        )}
      >
        Upload
      </button>
    </div>
  {/if}

  <nav aria-label="Main Navigation" class="flex flex-1 justify-end">
    <button
      aria-expanded={isMenuOpen()}
      aria-controls="mobile-menu"
      aria-label="Toggle navigation menu"
      onclick={toggleMenu}
      class="relative z-50 flex h-8 w-8 cursor-pointer flex-col items-end justify-center gap-1.5 p-1"
    >
      <span
        class={classNames('block h-0.5 w-6 bg-text-main transition-transform duration-300', {
          'translate-y-2 rotate-45': isMenuOpen()
        })}
      ></span>
      <span
        class={classNames('block h-0.5 w-6 bg-text-main transition-opacity duration-300', {
          'opacity-0': isMenuOpen()
        })}
      ></span>
      <span
        class={classNames('block h-0.5 w-6 bg-text-main transition-transform duration-300', {
          '-translate-y-2 -rotate-45': isMenuOpen()
        })}
      ></span>
    </button>

    <div
      id="mobile-menu"
      class={classNames(
        'absolute top-0 left-0 z-40 flex h-dvh w-full flex-col overflow-y-auto overscroll-contain bg-app-bg p-6 pt-[calc(var(--spacing-pwa-top)+4rem)] text-left transition-transform duration-300 ease-out',
        {
          'translate-x-0': isMenuOpen(),
          'translate-x-full': !isMenuOpen()
        }
      )}
    >
      <ul class="flex flex-col gap-4 text-lg font-bold">
        <li>
          <a
            href={resolve('/')}
            class="flex items-center gap-2 py-2 text-text-muted transition-colors hover:text-text-main"
          >
            <i class="iconify size-8 mdi--data-matrix-scan"></i>
            Scanner
          </a>
        </li>
        <li>
          <a
            href={resolve('/catalog')}
            class="flex items-center gap-2 py-2 text-text-muted transition-colors hover:text-text-main"
          >
            <i class="iconify size-8 mdi--view-grid"></i>
            Catalog
          </a>
        </li>
        <li>
          <a
            href={resolve('/howto')}
            class="flex items-center gap-2 py-2 text-text-muted transition-colors hover:text-text-main"
          >
            <i class="iconify size-8 mdi--about-circle-outline"></i>
            How to Use
          </a>
        </li>
        <li><hr class="my-2 border-border" /></li>
        <li>
          <a
            href="https://github.com/le0pard/lego-scanner"
            target="_blank"
            rel="external noopener noreferrer"
            class="flex items-center gap-2 py-2 text-text-muted transition-colors hover:text-text-main"
          >
            <i class="iconify size-8 mdi--github"></i>
            Source Code
          </a>
        </li>
        <li>
          <a
            href="https://github.com/le0pard/lego-scanner/discussions/new?category=missing-set"
            class="flex items-center gap-2 py-2 text-text-muted transition-colors hover:text-text-main"
            target="_blank"
            rel="external noopener noreferrer"
          >
            <i class="iconify size-8 mdi--lego"></i>
            Report Missing Brick Set
          </a>
        </li>
      </ul>
      <div class="mt-auto border-t border-border pt-4 text-xs text-text-muted">
        v{__APP_VERSION__}
      </div>
    </div>
  </nav>
</header>
