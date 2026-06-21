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
    toggleFlashState,
    setZoomSettings
  } from '$lib/states/camera.svelte';

  const { workerApi } = $props();

  const CAMERA_SETTINGS = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 12, max: 15 },
    pan: true,
    tilt: true,
    zoom: true,
    torch: true
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

  const updateFlashStatus = () => {
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

  const updateZoomStatus = () => {
    if (!stream) {
      return;
    }

    const activeTrack = stream.getVideoTracks()[0];
    const capabilities = activeTrack.getCapabilities();
    const settings = activeTrack.getSettings();

    if ('zoom' in capabilities) {
      setZoomSettings({
        min: capabilities.zoom.min,
        max: capabilities.zoom.max,
        step: capabilities.zoom.step || 0.1,
        value: settings.zoom || capabilities.zoom.min
      })
    }
  }

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
    videoElement.onloadedmetadata = () => {
      updateCameraList();
      updateFlashStatus();
      updateZoomStatus();
      cameraReasyState();
      requestAnimationFrame(processingLoop);
    };

    videoElement.play().catch((err) => console.warn('Video waiting on interaction context:', err));
  };

  const processingLoop = async () => {
    if (!cameraState.ready || !videoElement) return;

    if (videoElement.paused || videoElement.ended) {
      requestAnimationFrame(processingLoop);
      return;
    }

    if (!processingFrame && videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
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
    if (!stream || !cameraState.haveFlash) {
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

  const handleZoomChange = (e) => {
    if (!stream || !cameraState.haveZoom) {
      return;
    }

    const zoomValue = parseFloat(e.target.value);
    if (zoomValue < 0) {
      return
    }

    const activeTrack = stream.getVideoTracks()[0];
    activeTrack.applyConstraints({
      advanced:  [{ zoom: zoomValue }]
    });
  }

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
    class="flex flex-col w-full aspect-square relative overflow-hidden rounded-2xl bg-black border border-border shadow-lg"
  >
    <div class="flex justify-between gap-2 m-1 md:m-2">
      <div class="flex-1 justify-center items-center">
        <input type="range" min={cameraState.zoom.min} max={cameraState.zoom.max} step={cameraState.zoom.step} value={cameraState.zoom.value} oninput={handleZoomChange} class:hidden={!cameraState.haveZoom} />
      </div>
      <button
        onclick={handleTourchBtn}
        class="flex icoms-center bg-black/60 hover:bg-black/80 backdrop-blur-md p-2.5 rounded-xl transition-colors shadow-lg border border-white/10 z-10"
        aria-label="Toggle Camera Flash"
        aria-pressed={cameraState.isFlashOn}
        class:hidden={!cameraState.haveFlash}
      >
        <i
          class={classnames('iconify lucide--zap w-5 h-5 transition-all', {
            'text-primary drop-shadow-[0_0_8px_var(--color-primary)]': cameraState.isFlashOn,
            'text-neutral-400': !cameraState.isFlashOn
          })}
        ></i>
      </button>
    </div>

    <div class="viewport-box">
      <video bind:this={videoElement} autoplay playsinline muted></video>
      <div class="reticle"></div>
    </div>

    <div
      class="w-full relative bg-black/60 backdrop-blur-md rounded-xl border border-white/10 p-1 flex items-center gap-2"
    >
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
{:else}
  <div
    class="w-full aspect-square flex flex-col items-center justify-center border border-border bg-card-bg shadow-lg rounded-2xl p-6 text-center"
  >
    <div class="flex items-center justify-center p-4 bg-app-bg rounded-full border border-border mb-4">
      <i class="iconify lucide--camera size-8 text-text-muted"></i>
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
