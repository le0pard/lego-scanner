<script>
  import classnames from 'classnames';
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { transfer } from 'comlink';
  import { useTiks } from '@rexa-developer/tiks/svelte';
  import { scanResultState, setScanResult } from '$lib/states/scanResult.svelte';

  import {
    cameraState,
    noCameraPermission,
    needCameraPermission,
    grantedCameraPermission,
    deniedCameraPermission,
    cameraReasyState,
    cameraUnreadyState,
    cameraSetList,
    cameraSetDeviceId,
    cameraResetDeviceId,
    cameraResetState,
    supportFlashState,
    toggleFlashState
  } from '$lib/states/camera.svelte';

  const { workerApi } = $props();

  const CAMERA_SETTINGS = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 12, max: 15 }
  };

  let videoElement = $state(null);
  let stream = $state(null);
  let isCameraRequested = $state(false);

  let processingFrame = false;

  const { success: successTick, error: errorTick } = useTiks({ theme: 'crisp', volume: 1.0 });

  const evaluateCameraPermissions = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === 'videoinput');

      if (videoDevices.length === 0) {
        noCameraPermission('No hardware camera detected on this system.');
        return;
      }

      const needsPermission = videoDevices.every((camera) => !camera.label);

      if (needsPermission) {
        needCameraPermission();
      } else {
        grantedCameraPermission();
      }
    } catch {
      needCameraPermission();
    }
  };

  const updateCameraList = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      cameraSetList(devices.filter((device) => device.kind === 'videoinput'));

      if (stream && !cameraState.selectedCameraId) {
        const activeTrack = stream.getVideoTracks()[0];
        if (activeTrack) {
          const settings = activeTrack.getSettings();
          cameraSetDeviceId(settings.deviceId || null);
        }
      }
    } catch (err) {
      console.error('Could not populate camera peripherals menu:', err);
    }
  };

  const updateFlashStatus = async () => {
    if (!stream) {
      return;
    }

    const activeTrack = stream.getVideoTracks()[0];
    const settings = activeTrack.getSettings();

    if (!Object.hasOwn(settings, 'torch')) {
      return;
    }

    supportFlashState();
  };

  const startCamera = async (explicitDeviceId = null) => {
    isCameraRequested = true;

    streamTeardown();

    if (explicitDeviceId) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            ...CAMERA_SETTINGS,
            deviceId: { exact: explicitDeviceId }
          },
          audio: false
        });
        cameraSetDeviceId(explicitDeviceId);
      } catch {
        cameraResetDeviceId();
      }
    }

    if (!cameraState.selectedCameraId) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            ...CAMERA_SETTINGS,
            facingMode: { exact: 'environment' }
          },
          audio: false
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              ...CAMERA_SETTINGS,
              facingMode: 'environment'
            },
            audio: false
          });
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          } catch {
            cameraUnreadyState('Camera access denied or hardware busy.');
            return;
          }
        }
      }
    }

    if (videoElement && stream) {
      await startStreamInVideo();
    }
  };

  const startStreamInVideo = async () => {
    videoElement.srcObject = stream;
    cameraReasyState();

    await updateCameraList();
    updateFlashStatus();

    videoElement.play().catch((err) => console.warn('Video waiting on interaction context:', err));

    requestAnimationFrame(processingLoop);
  };

  const processingLoop = async () => {
    if (!cameraState.ready || !videoElement) return;

    if (videoElement.paused || videoElement.ended) {
      requestAnimationFrame(processingLoop);
      return;
    }

    if (!processingFrame && videoElement.readyState >= 2) {
      processingFrame = true;
      try {
        const bitmap = await createImageBitmap(videoElement);
        const result = await workerApi.detect(transfer(bitmap, [bitmap]));

        if (result && setScanResult(result)) {
          console.log('🎯 Match found! Triggering success audio clip:', scanResultState.result);
          successTick();
        }
      } catch (err) {
        // Silent frame skip
      } finally {
        processingFrame = false;
      }
    }
    requestAnimationFrame(processingLoop);
  };

  const streamTeardown = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
  };

  const handleCameraChange = (e) => {
    const targetId = e.currentTarget?.value;
    if (targetId) {
      startCamera(targetId);
    }
  };

  const handleCameraRequestBtn = (e) => {
    e.preventDefault();
    startCamera();
  };

  const handleTourchBtn = (e) => {
    e.preventDefault();
    if (!stream || !cameraState.isHaveFlash) {
      return;
    }

    toggleFlashState();

    const activeTrack = stream.getVideoTracks()[0];
    activeTrack.applyConstraints({
      advanced: [
        {
          torch: cameraState.isFlashOn
        }
      ]
    });
  };

  onMount(async () => {
    if (!browser) return;

    try {
      await evaluateCameraPermissions();
    } catch (err) {
      deniedCameraPermission(err.message || 'Failed to boot scanner engine.');
    }
  });

  onDestroy(() => {
    streamTeardown();
    cameraResetState();
  });
</script>

{#if isCameraRequested}
  <div
    id="workspace-camera"
    class="w-full aspect-square relative overflow-hidden rounded-2xl bg-black border border-border shadow-lg"
  >
    <div class="absolute inset-0 bg-neutral-900/10"></div>
    <div
      class="absolute inset-x-6 top-1/2 h-0.5 bg-scanner-line shadow-[0_0_15px_var(--color-scanner-line)] animate-pulse"
    ></div>

    <button
      onclick={handleTourchBtn}
      class="absolute top-4 right-4 bg-black/60 hover:bg-black/80 backdrop-blur-md p-2.5 rounded-xl transition-colors shadow-lg border border-white/10 z-10"
      aria-label="Toggle Camera Flash"
      aria-pressed={cameraState.isFlashOn}
      class:hidden={!cameraState.isHaveFlash}
    >
      <svg
        class={classnames('w-5 h-5 transition-all', {
          'fill-primary drop-shadow-[0_0_8px_var(--color-primary)]': cameraState.isFlashOn,
          'fill-neutral-400': !cameraState.isFlashOn
        })}
        viewBox="0 0 24 24"
      >
        <path d="M7 2v11h3v9l7-12h-4l4-8H7z" />
      </svg>
    </button>

    <div class="absolute bottom-4 inset-x-4 flex flex-col gap-2">
      <div class="text-center pointer-events-none">
        <span
          class="inline-block text-xs font-medium bg-black/70 text-white backdrop-blur-md px-3 py-1.5 rounded-lg"
          >Point camera at barcode</span
        >
      </div>

      <div class="viewport-box">
        <video bind:this={videoElement} autoplay playsinline muted></video>
        <div class="reticle"></div>
      </div>

      <div
        class="w-full relative bg-black/60 backdrop-blur-md rounded-xl border border-white/10 p-1 flex items-center gap-2"
      >
        <div class="pl-2 text-neutral-400 pointer-events-none">
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
            />
          </svg>
        </div>

        <select
          class="flex-1 bg-transparent text-xs text-neutral-200 font-semibold py-2 pl-1 pr-8 rounded-lg outline-none cursor-pointer border-0 focus:ring-0 appearance-none"
          value={cameraState.selectedCameraId}
          onchange={handleCameraChange}
        >
          {#each cameraState.cameras as camera, index}
            <option value={camera.deviceId}>
              {camera.label || `Camera ${index + 1}`}
            </option>
          {/each}
        </select>
      </div>
    </div>
  </div>
{:else}
  <div
    class="w-full aspect-square flex flex-col items-center justify-center border border-border bg-card-bg shadow-lg rounded-2xl p-6 text-center"
  >
    <div class="p-4 bg-app-bg rounded-full border border-border mb-4">
      <svg
        class="w-8 h-8 text-text-muted"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
        />
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
        />
      </svg>
    </div>
    <p class="text-sm font-bold text-text-main mb-1">Camera Access Required</p>
    <p class="text-xs text-text-muted mb-6">
      Tap below to allow device camera access for scanning.
    </p>

    <button
      onclick={handleCameraRequestBtn}
      class="bg-primary hover:bg-primary-hover text-black font-bold py-2.5 px-6 rounded-xl shadow-sm transition-colors cursor-pointer active:scale-[0.99]"
    >
      Start Camera
    </button>
  </div>
{/if}

<style>
  .viewport-box {
    position: relative;
    width: 100%;
    aspect-ratio: 4/3;
    background: #1a1a1a;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #333;
  }
  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .reticle {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 160px;
    height: 160px;
    border: 3px dashed #e1b12c;
    border-radius: 6px;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
    pointer-events: none;
  }
</style>
