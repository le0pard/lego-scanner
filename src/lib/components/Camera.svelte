<script>
  import { onMount, onDestroy } from 'svelte';
  import classNames from 'classnames';
  import { browser } from '$app/environment';
  import { transfer } from 'comlink';
  import { setScanResult, resetScanState } from '$lib/states/scanResult.svelte.js';
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
  } from '$lib/states/camera.svelte.js';

  const PROCESSING_THROTTLE_MS = 200;

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
  let isTrackMutating = false;
  let pendingConstraints = null;

  const streamActiveTrack = () => (stream ? stream.getVideoTracks()[0] : null);

  /**
   * High-Performance Hardware Task Coordinator
   * Serializes camera lens modifications to prevent overlapping race conditions
   * and intercepts errors to eliminate unhandled promise rejections safely.
   */
  const flushTrackConstraints = async () => {
    if (isTrackMutating) return;

    const activeTrack = streamActiveTrack();
    if (!activeTrack) {
      pendingConstraints = null;
      return;
    }

    if (!pendingConstraints) return;

    isTrackMutating = true;

    // Atomically detach the latest adjustments from the pending tracking buffer
    const batchToExecute = pendingConstraints;
    pendingConstraints = null;

    try {
      await activeTrack.applyConstraints({
        advanced: [batchToExecute]
      });
    } catch (err) {
      console.warn('Camera Hardware System: Constraint transaction rejected.', err);
    } finally {
      isTrackMutating = false;

      // If the user modified values while the hardware was processing, re-flush
      if (pendingConstraints) {
        requestAnimationFrame(flushTrackConstraints);
      }
    }
  };

  /**
   * Schedules a non-blocking hardware mutation batch payload
   */
  const scheduleTrackConstraint = (deltaBatch) => {
    pendingConstraints = { ...(pendingConstraints || {}), ...deltaBatch };
    flushTrackConstraints();
  };

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

  const applyZoomTrackConstraint = async (targetValue) => {
    if (!cameraState.haveZoom) return;

    // Defensively clamp value parameters inside hardware bounding boxes
    const clampedValue = Math.max(
      cameraState.zoom.min,
      Math.min(cameraState.zoom.max, targetValue)
    );

    // Prevent floating-point accuracy decay (e.g. 1.200000000004) during addition/subtraction
    const decimalsCount = (cameraState.zoom.step.toString().split('.')[1] || '').length || 1;
    const preciseValue = parseFloat(clampedValue.toFixed(decimalsCount));

    // Update UI tracking states immediately to keep the range element highly responsive
    cameraState.zoom.value = preciseValue;

    // Offload actual track mutation to the execution mutex channel
    scheduleTrackConstraint({ zoom: preciseValue });
  };

  const handleZoomChange = (e) => {
    applyZoomTrackConstraint(parseFloat(e.target.value));
  };

  const handleZoomStepClick = (mode) => {
    const currentVal = cameraState.zoom.value;
    const stepDelta = cameraState.zoom.step || 0.1;

    const calculationTarget = mode === 'in' ? currentVal + stepDelta : currentVal - stepDelta;
    applyZoomTrackConstraint(calculationTarget);
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

    // Deep Track Integration Layer
    try {
      const videoTrack = streamActiveTrack();
      if (videoTrack && videoTrack.getCapabilities) {
        const capabilities = videoTrack.getCapabilities();
        const advancedConstraints = {};

        // Force macro continuous autofocus if supported by hardware
        if (capabilities.focusMode?.includes('continuous')) {
          advancedConstraints.focusMode = 'continuous';
        }

        // Suppress rapid exposure adjustments when scanning light boxes
        if (capabilities.exposureMode?.includes('continuous')) {
          advancedConstraints.exposureMode = 'continuous';
        }

        if (Object.keys(advancedConstraints).length > 0) {
          await videoTrack.applyConstraints({ advanced: [advancedConstraints] });
        }
      }
    } catch (constraintsError) {
      console.warn(
        'Advanced hardware macro optimizations deferred on this device:',
        constraintsError
      );
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

    // Synchronously mutate reactive properties
    toggleFlashState();

    // Safely route the torch assignment through the protected constraint loop
    scheduleTrackConstraint({ torch: cameraState.isFlashOn });
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
    class="relative flex aspect-square w-full flex-col overflow-hidden rounded-2xl border border-border bg-black shadow-lg"
  >
    <div class="z-20 m-1 flex min-h-10 justify-between gap-2">
      <div
        class={classNames(
          'flex flex-1 items-center gap-3 rounded-xl border border-white/10 bg-black/60 px-4 py-2 shadow-lg backdrop-blur-md transition-opacity',
          {
            hidden: !cameraState.haveZoom
          }
        )}
      >
        <button
          type="button"
          onclick={() => handleZoomStepClick('out')}
          disabled={cameraState.zoom.value <= cameraState.zoom.min}
          class="flex shrink-0 cursor-pointer items-center justify-center p-1 text-neutral-400 transition-colors hover:text-white active:scale-90 disabled:cursor-not-allowed disabled:opacity-25"
          aria-label="Zoom Out"
        >
          <i class="iconify size-4 lucide--minus"></i>
        </button>
        <input
          type="range"
          min={cameraState.zoom.min}
          max={cameraState.zoom.max}
          step={cameraState.zoom.step}
          value={cameraState.zoom.value}
          oninput={handleZoomChange}
          class="h-1.5 w-full flex-1 cursor-pointer appearance-none rounded-lg bg-white/20 outline-none focus:ring-2 focus:ring-primary/50 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md"
        />
        <button
          type="button"
          onclick={() => handleZoomStepClick('in')}
          disabled={cameraState.zoom.value >= cameraState.zoom.max}
          class="flex shrink-0 cursor-pointer items-center justify-center p-1 text-neutral-400 transition-colors hover:text-white active:scale-90 disabled:cursor-not-allowed disabled:opacity-25"
          aria-label="Zoom In"
        >
          <i class="iconify size-4 lucide--plus"></i>
        </button>
      </div>

      <button
        onclick={handleTorchBtn}
        class={classNames(
          'flex shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/60 p-2.5 shadow-lg backdrop-blur-md transition-colors hover:bg-black/80',
          {
            hidden: !cameraState.haveFlash
          }
        )}
        aria-label="Toggle Camera Flash"
        aria-pressed={cameraState.isFlashOn}
      >
        <i
          class={classNames('iconify h-5 w-5 transition-all lucide--zap', {
            'text-primary drop-shadow-[0_0_8px_var(--color-primary)]': cameraState.isFlashOn,
            'text-neutral-400': !cameraState.isFlashOn
          })}
        ></i>
      </button>
    </div>

    <div
      class="absolute inset-0 flex h-full w-full items-center justify-center overflow-hidden bg-neutral-900"
    >
      <video bind:this={videoElement} autoplay playsinline muted class="h-full w-full object-cover"
      ></video>
      <div
        class="pointer-events-none absolute z-10 size-40 rounded-xl border-3 border-dashed border-primary shadow-[0_0_0_100vmax_rgba(0,0,0,0.5)]"
      ></div>
    </div>

    <div
      class="absolute bottom-1 left-1 z-20 flex w-[calc(100%-8px)] items-center gap-2 rounded-xl border border-white/10 bg-black/60 p-1 backdrop-blur-md"
    >
      <select
        class="flex-1 cursor-pointer rounded-lg border-0 bg-transparent py-2 pr-8 pl-1 text-xs font-semibold text-neutral-200 outline-none focus:ring-0"
        value={cameraState.selectedCameraId}
        onchange={handleCameraChange}
      >
        {#each cameraState.cameras as camera, index (camera.deviceId)}
          <option value={camera.deviceId} class="bg-neutral-900 text-white">
            {camera.label || `Camera ${index + 1}`}
          </option>
        {/each}
      </select>
    </div>
  </div>
{:else}
  <div
    class="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-card-bg p-6 text-center shadow-lg"
  >
    <div
      class="mb-3 flex items-center justify-center rounded-full border border-border bg-app-bg p-4"
    >
      <i class="iconify size-8 text-text-muted lucide--camera"></i>
    </div>
    <p class="text-base font-bold text-text-main">Camera Access Required</p>
    <p class="mb-5 max-w-60 text-sm text-text-muted">
      Tap below to allow device camera access for scanning.
    </p>

    <button
      onclick={handleCameraRequestBtn}
      class="cursor-pointer rounded-xl bg-primary px-6 py-2.5 font-bold text-black shadow-sm transition-colors hover:bg-primary-hover active:scale-[0.99]"
    >
      Start Camera
    </button>
  </div>
{/if}
