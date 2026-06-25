<script>
  import classNames from 'classnames';
  import { resolve } from '$app/paths';
  import { afterNavigate } from '$app/navigation';
  import pkg from '$lib/../../package.json' with { type: 'json' };
  import {
    cameraTabState,
    uploadTabState,
    activateCameraTabState,
    activateUploadTabState
  } from '$lib/states/tabs.svelte';
  import { isMenuOpen, toggleMenu, closeMenu } from '$lib/states/menu.svelte';

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

<header class="py-3 flex justify-between items-center gap-2">
  <div class="flex-1 min-w-0">
    <h1 class="text-xl sm:text-2xl font-black tracking-tight truncate">
      <a href={resolve('/')}>L-Scan</a>
    </h1>
    <p class="text-[10px] sm:text-xs text-text-muted truncate">Minifigures Scanner</p>
  </div>

  {#if showTabs}
    <div class="flex shrink-0 p-1 bg-card-bg border border-border rounded-xl" role="tablist">
      <button
        role="tab"
        aria-selected={cameraTabState()}
        onclick={activateCameraTabState}
        class={classNames(
          'px-4 py-1.5 text-xs sm:text-sm font-black rounded-lg transition-all duration-150 active:scale-95 cursor-pointer',
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
          'px-4 py-1.5 text-xs sm:text-sm font-black rounded-lg transition-all duration-150 active:scale-95 cursor-pointer',
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

  <nav aria-label="Main Navigation" class="flex-1 flex justify-end">
    <button
      aria-expanded={isMenuOpen()}
      aria-controls="mobile-menu"
      aria-label="Toggle navigation menu"
      onclick={toggleMenu}
      class="relative z-50 w-8 h-8 cursor-pointer flex flex-col justify-center items-end gap-1.5 p-1"
    >
      <span
        class={classNames('block w-6 h-0.5 bg-text-main transition-transform duration-300', {
          'rotate-45 translate-y-2': isMenuOpen()
        })}
      ></span>
      <span
        class={classNames('block w-6 h-0.5 bg-text-main transition-opacity duration-300', {
          'opacity-0': isMenuOpen()
        })}
      ></span>
      <span
        class={classNames('block w-6 h-0.5 bg-text-main transition-transform duration-300', {
          '-rotate-45 -translate-y-2': isMenuOpen()
        })}
      ></span>
    </button>

    <div
      id="mobile-menu"
      class={classNames(
        'absolute top-0 left-0 w-full h-dvh z-40 bg-app-bg transition-transform duration-300 ease-out p-6 pt-[calc(var(--spacing-pwa-top)+4rem)] flex flex-col text-left overflow-y-auto overscroll-contain',
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
            class="flex items-center gap-2 py-2 text-text-muted hover:text-text-main transition-colors"
          >
            <i class="iconify mdi--data-matrix-scan size-8"></i>
            Scanner
          </a>
        </li>
        <li>
          <a
            href={resolve('/howto')}
            class="flex items-center gap-2 py-2 text-text-muted hover:text-text-main transition-colors"
          >
            <i class="iconify mdi--about-circle-outline size-8"></i>
            How to Use
          </a>
        </li>
        <li><hr class="border-border my-2" /></li>
        <li>
          <a
            href="https://github.com/le0pard/lego-scanner"
            target="_blank"
            rel="external noopener noreferrer"
            class="flex items-center gap-2 py-2 text-text-muted hover:text-text-main transition-colors"
          >
            <i class="iconify mdi--github size-8"></i>
            Source Code
          </a>
        </li>
        <li>
          <a
            href="https://github.com/le0pard/lego-scanner/discussions/new?category=missing-set"
            class="flex items-center gap-2 py-2 text-text-muted hover:text-text-main transition-colors"
            target="_blank"
            rel="external noopener noreferrer"
          >
            <i class="iconify mdi--lego size-8"></i>
            Report Missing Brick Set
          </a>
        </li>
      </ul>
      <div class="mt-auto text-xs text-text-muted border-t border-border pt-4">
        v{pkg.version}
      </div>
    </div>
  </nav>
</header>
