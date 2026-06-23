<script>
  import { onMount, onDestroy } from 'svelte';
  import classNames from 'classnames';
  import { browser } from '$app/environment';
  import { transfer } from 'comlink';
  import { setScanResult, resetScanState } from '$lib/states/scanResult.svelte';
  import {
    cameraState,
    noCameraPermission,
    needCameraPermission,
    grantedCameraPermission,
    deniedCameraPermission,
    cameraReadyState,
    cameraUnreadyState,
    cameraSetList,
    cameraSetDeviceId,
    cameraResetDeviceId,
    resetCameraCapabilities,
    resetCameraState,
    supportFlashState,
    toggleFlashState,
    setZoomSettings
  } from '$lib/states/camera.svelte';

  const { getScanner } = $props();

  const CAMERA_SETTINGS = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 }
  };

  let videoElement = $state(null);
  let stream = $state(null);
  let isCameraRequested = $state(false);
  let processingFrame = false;

  let lastProcessedTimestamp = 0;
  const PROCESSING_THROTTLE_MS = 200;

  const streamActiveTrack = () => (stream ? stream.getVideoTracks()[0] : null);

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
        const activeTrack = streamActiveTrack();
        if (activeTrack) {
          const settings = activeTrack.getSettings();
          cameraSetDeviceId(settings.deviceId || null);
        }
      }
    } catch (err) {
      console.error('Could not populate camera peripherals menu:', err);
    }
  };

  const updateFlashStatus = () => {
    const activeTrack = streamActiveTrack();
    if (!activeTrack) return;
    const settings = activeTrack.getSettings();
    if (!Object.hasOwn(settings, 'torch')) return;
    supportFlashState();
  };

  const updateZoomStatus = () => {
    const activeTrack = streamActiveTrack();
    if (!activeTrack) return;

    const capabilities = activeTrack.getCapabilities();
    if (!Object.hasOwn(capabilities, 'zoom')) return;

    const settings = activeTrack.getSettings();
    setZoomSettings({
      min: capabilities.zoom.min,
      max: capabilities.zoom.max,
      step: capabilities.zoom.step || 0.1,
      value: settings.zoom || capabilities.zoom.min
    });
  };

  const startCamera = async (explicitDeviceId = null) => {
    isCameraRequested = true;
    streamTeardown();
    resetCameraCapabilities();

    if (explicitDeviceId) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { ...CAMERA_SETTINGS, deviceId: { exact: explicitDeviceId } },
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
          video: { ...CAMERA_SETTINGS, facingMode: { exact: 'environment' } },
          audio: false
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { ...CAMERA_SETTINGS, facingMode: 'environment' },
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
  };

  $effect(() => {
    if (videoElement && stream) {
      videoElement.srcObject = stream;
      videoElement.onloadedmetadata = () => {
        initCameraCapabilities();
        cameraReadyState();
        requestAnimationFrame(processingLoop);
      };
      videoElement.play().catch((err) => console.warn('Video interaction context deferred:', err));
    }
  });

  const initCameraCapabilities = () => {
    updateCameraList();
    updateFlashStatus();
    updateZoomStatus();
  };

  const processingLoop = async () => {
    if (!cameraState.ready || !videoElement) return;
    if (videoElement.paused || videoElement.ended) {
      requestAnimationFrame(processingLoop);
      return;
    }

    const now = performance.now();

    if (
      !processingFrame &&
      now - lastProcessedTimestamp >= PROCESSING_THROTTLE_MS &&
      videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      processingFrame = true;
      lastProcessedTimestamp = now;

      try {
        const bitmap = await createImageBitmap(videoElement);
        const result = await getScanner().detect(transfer(bitmap, [bitmap]));
        if (result) {
          setScanResult(result);
        }
      } catch {
        // Drop standard frame processing errors silently
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
    if (targetId) startCamera(targetId);
  };

  const handleCameraRequestBtn = (e) => {
    e.preventDefault();
    startCamera();
  };

  const handleTorchBtn = (e) => {
    e.preventDefault();
    if (!cameraState.haveFlash) return;

    const activeTrack = streamActiveTrack();
    if (!activeTrack) return;

    toggleFlashState();
    activeTrack.applyConstraints({
      advanced: [{ torch: cameraState.isFlashOn }]
    });
  };

  const handleZoomChange = (e) => {
    if (!cameraState.haveZoom) return;
    const activeTrack = streamActiveTrack();
    if (!activeTrack) return;

    const zoomValue = parseFloat(e.target.value);
    if (zoomValue < 0) return;

    cameraState.zoom.value = zoomValue;
    activeTrack.applyConstraints({
      advanced: [{ zoom: zoomValue }]
    });
  };

  onMount(async () => {
    if (!browser) return;
    try {
      await evaluateCameraPermissions();
    } catch (err) {
      deniedCameraPermission(err.message || 'Failed to initialize permission sub-layer.');
    }
  });

  onDestroy(() => {
    resetCameraState();
    resetScanState();
    streamTeardown();
  });
</script>

{#if isCameraRequested}
  <div
    id="workspace-camera"
    class="flex flex-col w-full aspect-square relative overflow-hidden rounded-2xl bg-black border border-border shadow-lg"
  >
    <div class="flex justify-between gap-2 m-1 min-h-10 z-20">
      <div
        class={classNames(
          'flex-1 flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-lg transition-opacity',
          {
            hidden: !cameraState.haveZoom
          }
        )}
      >
        <i class="iconify lucide--minus size-4 text-neutral-400 shrink-0"></i>
        <input
          type="range"
          min={cameraState.zoom.min}
          max={cameraState.zoom.max}
          step={cameraState.zoom.step}
          value={cameraState.zoom.value}
          oninput={handleZoomChange}
          class="flex-1 w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-primary/50 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
        />
        <i class="iconify lucide--plus size-4 text-neutral-400 shrink-0"></i>
      </div>

      <button
        onclick={handleTorchBtn}
        class={classNames(
          'flex items-center justify-center bg-black/60 hover:bg-black/80 backdrop-blur-md p-2.5 rounded-xl transition-colors shadow-lg border border-white/10 shrink-0',
          {
            hidden: !cameraState.haveFlash
          }
        )}
        aria-label="Toggle Camera Flash"
        aria-pressed={cameraState.isFlashOn}
      >
        <i
          class={classNames('iconify lucide--zap w-5 h-5 transition-all', {
            'text-primary drop-shadow-[0_0_8px_var(--color-primary)]': cameraState.isFlashOn,
            'text-neutral-400': !cameraState.isFlashOn
          })}
        ></i>
      </button>
    </div>

    <div
      class="absolute inset-0 w-full h-full bg-neutral-900 flex items-center justify-center overflow-hidden"
    >
      <video bind:this={videoElement} autoplay playsinline muted class="w-full h-full object-cover"
      ></video>
      <div
        class="absolute size-40 border-3 border-dashed border-primary rounded-xl pointer-events-none z-10 shadow-[0_0_0_100vmax_rgba(0,0,0,0.5)]"
      ></div>
    </div>

    <div
      class="w-[calc(100%-8px)] absolute bottom-1 left-1 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 p-1 flex items-center gap-2 z-20"
    >
      <select
        class="flex-1 bg-transparent text-xs text-neutral-200 font-semibold py-2 pl-1 pr-8 rounded-lg outline-none cursor-pointer border-0 focus:ring-0"
        value={cameraState.selectedCameraId}
        onchange={handleCameraChange}
      >
        {#each cameraState.cameras as camera, index}
          <option value={camera.deviceId} class="bg-neutral-900 text-white">
            {camera.label || `Camera ${index + 1}`}
          </option>
        {/each}
      </select>
    </div>
  </div>
{:else}
  <div
    class="w-full aspect-square flex flex-col items-center justify-center border border-border bg-card-bg shadow-lg rounded-2xl p-6 text-center gap-1"
  >
    <div
      class="flex items-center justify-center p-4 bg-app-bg rounded-full border border-border mb-3"
    >
      <i class="iconify lucide--camera size-8 text-text-muted"></i>
    </div>
    <p class="text-sm font-bold text-text-main">Camera Access Required</p>
    <p class="text-xs text-text-muted mb-5 max-w-60">
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
