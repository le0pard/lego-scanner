<script>
  import ReturnButton from '$lib/components/ReturnButton.svelte';
  import scannerCodeImg from '$lib/assets/howto/scanner-code.jpg?enhanced';
</script>

<svelte:head>
  <meta name="description" content="How to use L-Scan LEGO Collectible Minifigure Online Scanner" />
</svelte:head>

<div class="animate-in fade-in mt-4 flex w-full flex-1 flex-col gap-5 pb-6 text-left duration-300">
  <div>
    <h2 class="text-2xl font-black tracking-tight text-text-main">How to Scan Minifigures</h2>
    <p class="mt-0.5 text-sm text-text-muted">
      Quick setup guide and peripheral hardware requirements
    </p>
  </div>

  <section
    class="flex items-start gap-3.5 rounded-2xl border border-border bg-card-bg p-4 shadow-sm"
  >
    <div class="flex shrink-0 rounded-xl border border-primary/20 bg-primary/10 p-2.5 text-primary">
      <i class="iconify size-5 lucide--layers-3"></i>
    </div>
    <div class="flex flex-col gap-0.5">
      <h3 class="text-base font-bold text-text-main">Series Compatibility Notice</h3>
      <p class="text-sm leading-relaxed text-text-muted sm:text-sm">
        Data Matrix internal tracking codes are exclusively available on <strong
          >LEGO Collectible Minifigures Series 25 and newer</strong
        >. Earlier retail package configurations (Series 1 through 24) utilize historical box prints
        and require traditional manual identification protocols.
      </p>
    </div>
  </section>

  <article
    class="flex flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card-bg p-4"
  >
    <div
      class="flex aspect-video min-h-55 w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-black landscape:aspect-auto landscape:flex-1"
    >
      <enhanced:img
        src={scannerCodeImg}
        fetchpriority="high"
        alt="Lego Minifigure box bottom with Data Matrix highlighted"
        sizes="(orientation: landscape) 50vw, (min-width: 480px) 480px, 100vw"
        class="h-full w-full object-cover landscape:object-contain"
      />
    </div>
    <p class="mt-0.5 text-center text-xs text-text-muted italic">
      Locate the small square Data Matrix code right next to the barcode on the bottom flap.
    </p>
  </article>

  <div class="mt-1 flex flex-col gap-5 text-sm leading-relaxed text-text-muted">
    <section class="flex flex-col gap-1.5">
      <h3 class="flex items-center gap-2 text-base font-bold text-text-main">
        <i class="iconify size-5 text-primary lucide--box"></i> 1. Locate the Target Code
      </h3>
      <p>
        Look at the bottom flap of a blind Lego Minifigure mystery box. You will see a traditional
        linear barcode and a tiny square pixelated code next to it (known as a <strong
          >Data Matrix</strong
        > code).
      </p>
    </section>

    <section class="flex flex-col gap-1.5">
      <h3 class="flex items-center gap-2 text-base font-bold text-text-main">
        <i class="iconify size-5 text-primary lucide--layers"></i> 2. Select Input Method
      </h3>
      <p>Switch between your preferred scanning surfaces using the tabs in the interface:</p>
      <ul class="mt-1 flex list-disc flex-col gap-1 pl-5">
        <li>
          <strong>Camera:</strong> Grants peripheral access to your device camera to line up physical
          boxes in real time for automatic rapid detection.
        </li>
        <li>
          <strong>Upload:</strong> Perfect for dragging-and-dropping photo prints, pasting raw clipboard
          capture buffers, or selecting file attachments.
        </li>
      </ul>
    </section>

    <section class="flex flex-col gap-1.5 rounded-xl border border-border bg-card-bg/40 p-4">
      <h3 class="mb-1 flex items-center gap-2 text-base font-bold text-text-main">
        <i class="iconify size-5 text-primary lucide--sparkles"></i> Pro-Tips for Perfect Scanning
      </h3>
      <ul class="flex list-disc flex-col gap-2 pl-5">
        <li>
          <strong>Resolve Glare:</strong> Shiny plastic film reflections can block the detector
          module from running deep queries. Use the <strong>Flash Toggle (Zap Icon)</strong> on the camera
          overlay to break up reflections or change the physical angle of the packaging.
        </li>
        <li>
          <strong>Defective Box Prints:</strong> Factory ink print heads can occasionally suffer line
          dropouts. The application utilizes an automatic 4-phase background Morphological Vertical Stitching
          filter matrix to reconnect broken blocks inside the worker pipe.
        </li>
      </ul>
    </section>
  </div>

  <ReturnButton />
</div>
