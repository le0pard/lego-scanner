<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { wrap, transfer } from 'comlink';
	import { tiks } from '@rexa-developer/tiks';

	// UI & Runtime States via Svelte 5 Runes
	let videoElement = $state(null);
	let stream = $state(null);
	let scanResult = $state(null);
	let isScanning = $state(false);
	let isCameraLoading = $state(false);
	let errorMessage = $state('');

	// Audio system tracking
	let isAudioUnlocked = $state(false);

	// Camera List & Selection States
	let cameras = $state([]);
	let selectedCameraId = $state('');

	// Permission Tracking: 'checking' | 'prompt' | 'granted' | 'denied' | 'no-camera'
	let permissionStatus = $state('checking');

	// Worker Context
	let worker = null;
	let workerApi = null;
	let processingFrame = false;

	onMount(async () => {
		if (!browser) return;

		try {
			const ScannerWorker = (await import('$lib/web-worker?worker')).default;
			worker = new ScannerWorker();
			workerApi = wrap(worker);
			await workerApi.init();

			// 1. Initialize tiks with maximum volume (1.0)
			tiks.init({ theme: 'soft', volume: 1.0 });

			// 2. Set up a global listener to break the browser's autoplay lock on first interaction
			const unlockAudio = () => {
				tiks.init({ theme: 'soft', volume: 1.0 });
				isAudioUnlocked = true;
				console.log('🔊 Web Audio API successfully unlocked via user interaction.');

				window.removeEventListener('click', unlockAudio);
				window.removeEventListener('touchstart', unlockAudio);
			};
			window.addEventListener('click', unlockAudio);
			window.addEventListener('touchstart', unlockAudio);

			await evaluateCameraPermissions();
		} catch (err) {
			errorMessage = 'Failed to boot scanner engine.';
			permissionStatus = 'denied';
		}
	});

	async function evaluateCameraPermissions() {
		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			const videoDevices = devices.filter((device) => device.kind === 'videoinput');

			if (videoDevices.length === 0) {
				permissionStatus = 'no-camera';
				errorMessage = 'No hardware camera detected on this system.';
				return;
			}

			const needsPermission = videoDevices.every((camera) => !camera.label);

			if (needsPermission) {
				permissionStatus = 'prompt';
			} else {
				permissionStatus = 'granted';
				// If this runs automatically, isAudioUnlocked stays false until they tap the screen
				startCamera();
			}
		} catch (e) {
			permissionStatus = 'prompt';
		}
	}

	async function updateCameraList() {
		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			cameras = devices.filter((device) => device.kind === 'videoinput');

			if (stream && !selectedCameraId) {
				const activeTrack = stream.getVideoTracks()[0];
				if (activeTrack) {
					const settings = activeTrack.getSettings();
					selectedCameraId = settings.deviceId || '';
				}
			}
		} catch (err) {
			console.error('Could not populate camera peripherals menu:', err);
		}
	}

	async function startCamera(explicitDeviceId = null) {
		errorMessage = '';
		isCameraLoading = true;

		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
			stream = null;
		}

		if (explicitDeviceId) {
			try {
				stream = await navigator.mediaDevices.getUserMedia({
					video: {
						deviceId: { exact: explicitDeviceId },
						width: { ideal: 1280 },
						height: { ideal: 720 },
						frameRate: { ideal: 12, max: 15 }
					},
					audio: false
				});
				selectedCameraId = explicitDeviceId;
			} catch (err) {
				errorMessage = 'Failed to open the selected camera channel. Reverting...';
				explicitDeviceId = null;
			}
		}

		if (!explicitDeviceId) {
			try {
				stream = await navigator.mediaDevices.getUserMedia({
					video: {
						facingMode: { exact: 'environment' },
						width: { ideal: 1280 },
						height: { ideal: 720 },
						frameRate: { ideal: 12, max: 15 }
					},
					audio: false
				});
			} catch (tier1Error) {
				try {
					stream = await navigator.mediaDevices.getUserMedia({
						video: {
							facingMode: 'environment',
							width: { ideal: 1280 },
							height: { ideal: 720 },
							frameRate: { ideal: 12, max: 15 }
						},
						audio: false
					});
				} catch (tier2Error) {
					try {
						stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
					} catch (tier3Error) {
						errorMessage = 'Camera access denied or hardware busy.';
						permissionStatus = 'denied';
						isCameraLoading = false;
						return;
					}
				}
			}
		}

		if (videoElement && stream) {
			videoElement.srcObject = stream;
			isScanning = true;
			permissionStatus = 'granted';

			await updateCameraList();

			videoElement
				.play()
				.catch((err) => console.warn('Video waiting on interaction context:', err));

			requestAnimationFrame(processingLoop);
		}
		isCameraLoading = false;
	}

	function handleCameraChange(event) {
		const targetId = event.target.value;
		if (targetId) {
			startCamera(targetId);
		}
	}

	async function processingLoop() {
		if (!isScanning || !videoElement) return;

		if (videoElement.paused || videoElement.ended) {
			requestAnimationFrame(processingLoop);
			return;
		}

		if (!processingFrame && videoElement.readyState >= 2) {
			processingFrame = true;
			try {
				const bitmap = await createImageBitmap(videoElement);
				const result = await workerApi.detect(transfer(bitmap, [bitmap]));

				if (result) {
					if (scanResult !== result) {
						scanResult = result;

						// Execute sound chime
						console.log('🎯 Match found! Triggering success audio clip:', result);
						tiks.success();
					}
				}
			} catch (err) {
				// Silent frame skip
			} finally {
				processingFrame = false;
			}
		}
		requestAnimationFrame(processingLoop);
	}

	onDestroy(() => {
		isScanning = false;
		if (stream) stream.getTracks().forEach((track) => track.stop());
		if (worker) worker.terminate();
	});
</script>

<main class="app-container">
	<header class="header">
		<h1>Lego Matrix Finder</h1>
		{#if permissionStatus === 'granted'}
			<span class="audio-badge {isAudioUnlocked ? 'audio-on' : 'audio-muted'}">
				{isAudioUnlocked ? '🔊 Sound Active' : '🔇 Tap Screen for Sound'}
			</span>
		{/if}
	</header>

	{#if permissionStatus === 'checking'}
		<div class="loader">Verifying camera hardware...</div>
	{:else}
		{#if permissionStatus === 'granted' && cameras.length > 1}
			<div class="control-panel">
				<label for="camera-select">Active Lens:</label>
				<select id="camera-select" value={selectedCameraId} onchange={handleCameraChange}>
					{#each cameras as camera, index}
						<option value={camera.deviceId}>
							{camera.label || `Camera ${index + 1}`}
						</option>
					{/each}
				</select>
			</div>
		{/if}

		<div class="viewport-box">
			{#if permissionStatus === 'prompt'}
				<div class="splash-overlay">
					<p>
						This application requires access to your camera to scan Data Matrix codes on Lego box
						sets.
					</p>
					<button class="action-btn" onclick={() => startCamera()} disabled={isCameraLoading}>
						{isCameraLoading ? 'Opening Lens...' : 'Enable Scanner Camera'}
					</button>
				</div>
			{/if}

			{#if permissionStatus === 'denied'}
				<div class="splash-overlay status-error">
					<p><strong>Camera Access Blocked</strong></p>
					<p>
						{errorMessage ||
							'Please clear the camera restriction icon in your browser URL box and reload.'}
					</p>
					<button class="secondary-btn" onclick={() => startCamera()}>Try Reconnecting</button>
				</div>
			{/if}

			<video
				bind:this={videoElement}
				autoplay
				playsinline
				muted
				class:hidden={permissionStatus !== 'granted'}
			></video>

			{#if permissionStatus === 'granted'}
				<div class="reticle"></div>
			{/if}
		</div>
	{/if}

	{#if scanResult}
		<div class="result-card">
			<p>Matrix Readout: <code>{scanResult}</code></p>
			<button class="clear-btn" onclick={() => (scanResult = null)}>Clear Selection</button>
		</div>
	{/if}
</main>

<style>
	.app-container {
		max-width: 460px;
		margin: 0 auto;
		padding: 1rem;
		font-family: sans-serif;
		background: #121212;
		color: #fff;
		min-height: 100vh;
	}
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}
	h1 {
		font-size: 1.3rem;
		margin: 0;
	}

	.audio-badge {
		padding: 0.3rem 0.6rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: bold;
	}
	.audio-muted {
		background: #3a2222;
		color: #ff8888;
		border: 1px solid #5a3333;
	}
	.audio-on {
		background: #1b3822;
		color: #88ff88;
		border: 1px solid #2d5a37;
	}

	.control-panel {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	select {
		background: #2a2a2a;
		color: #fff;
		border: 1px solid #444;
		padding: 0.6rem;
		border-radius: 6px;
		font-size: 1rem;
		width: 100%;
	}

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
	.hidden {
		display: none;
	}

	.splash-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 2rem;
		text-align: center;
		color: #ccc;
		background: #1a1a1a;
	}
	.status-error {
		color: #ff8888;
	}

	.action-btn {
		background: #e1b12c;
		color: #000;
		border: none;
		font-weight: bold;
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		cursor: pointer;
		margin-top: 1rem;
		width: 100%;
	}
	.action-btn:disabled {
		background: #555;
		cursor: not-allowed;
	}
	.secondary-btn {
		background: transparent;
		color: #fff;
		border: 1px solid #555;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
		margin-top: 1rem;
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
	.result-card {
		margin-top: 1rem;
		padding: 1rem;
		background: #2a2a2a;
		border-radius: 8px;
		border: 1px solid #444;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.clear-btn {
		background: #444;
		color: #fff;
		border: none;
		padding: 0.4rem 0.8rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
	}
	.clear-btn:hover {
		background: #555;
	}
	.loader {
		text-align: center;
		color: #888;
		padding: 2rem;
	}
</style>
