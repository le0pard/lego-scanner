<script>
  import { resolve } from '$app/paths';
  import Header from '$lib/components/Header.svelte';
  import scannerCodeImg from '$lib/assets/howto/scanner-code.jpg?enhanced';
</script>

<main
  class="max-w-md landscape:max-w-4xl mx-auto min-h-dvh px-4 pt-pwa-top pb-pwa-bottom flex flex-col sm:border-x sm:border-border sm:shadow-2xl sm:bg-app-bg relative overflow-x-hidden"
>
  <Header showTabs={false} />

  <div
    class="flex-1 w-full pb-6 mt-4 flex flex-col gap-5 animate-in fade-in duration-300 text-left"
  >
    <div>
      <h2 class="text-2xl font-black tracking-tight text-text-main">How to Scan Minifigures</h2>
      <p class="text-xs text-text-muted mt-0.5">
        Quick setup guide and peripheral hardware requirements
      </p>
    </div>

    <section
      class="p-4 bg-card-bg border border-border rounded-2xl flex gap-3.5 items-start shadow-sm"
    >
      <div
        class="bg-primary/10 text-primary flex p-2.5 rounded-xl shrink-0 border border-primary/20"
      >
        <i class="iconify lucide--layers-3 size-5"></i>
      </div>
      <div class="flex flex-col gap-0.5">
        <h3 class="font-bold text-text-main text-sm">Series Compatibility Notice</h3>
        <p class="text-text-muted text-xs sm:text-sm leading-relaxed">
          Data Matrix internal tracking codes are exclusively available on <strong
            >LEGO Collectible Minifigures Series 25 and newer</strong
          >. Earlier retail package configurations (Series 1 through 24) utilize historical box
          prints and require traditional manual identification protocols.
        </p>
      </div>
    </section>

    <article
      class="p-4 bg-card-bg border border-border rounded-2xl overflow-hidden flex flex-col gap-3"
    >
      <div
        class="w-full rounded-xl overflow-hidden border border-border bg-black aspect-video flex items-center justify-center"
      >
        <enhanced:img
          src={scannerCodeImg}
          alt="Lego Minifigure box bottom with Data Matrix highlighted"
          class="w-full h-full object-cover"
        />
      </div>
      <p class="text-xs text-text-muted text-center italic mt-0.5">
        Locate the small square Data Matrix code right next to the barcode on the bottom flap.
      </p>
    </article>

    <div class="flex flex-col gap-5 text-sm text-text-muted leading-relaxed mt-1">
      <section class="flex flex-col gap-1.5">
        <h3 class="font-bold text-text-main text-base flex items-center gap-2">
          <i class="iconify lucide--box size-5 text-primary"></i> 1. Locate the Target Code
        </h3>
        <p>
          Look at the bottom flap of a blind Lego Minifigure mystery box. You will see a traditional
          linear barcode and a tiny square pixelated code next to it (known as a <strong
            >Data Matrix</strong
          > code).
        </p>
      </section>

      <section class="flex flex-col gap-1.5">
        <h3 class="font-bold text-text-main text-base flex items-center gap-2">
          <i class="iconify lucide--layers size-5 text-primary"></i> 2. Select Input Method
        </h3>
        <p>Switch between your preferred scanning surfaces using the tabs in the interface:</p>
        <ul class="list-disc pl-5 flex flex-col gap-1 mt-1">
          <li>
            <strong>Camera View:</strong> Grants peripheral access to your device camera to line up physical
            boxes in real time for automatic rapid detection.
          </li>
          <li>
            <strong>Upload Dashboard:</strong> Perfect for dragging-and-dropping photo prints, pasting
            raw clipboard capture buffers, or selecting file attachments.
          </li>
        </ul>
      </section>

      <section class="flex flex-col gap-1.5 bg-card-bg/40 border border-border p-4 rounded-xl">
        <h3 class="font-bold text-text-main text-base flex items-center gap-2 mb-1">
          <i class="iconify lucide--sparkles size-5 text-primary"></i> Pro-Tips for Perfect Scanning
        </h3>
        <ul class="list-disc pl-5 flex flex-col gap-2">
          <li>
            <strong>Resolve Glare:</strong> Shiny plastic film reflections can block the detector
            module from running deep queries. Use the <strong>Flash Toggle (Zap Icon)</strong> on the
            camera overlay to break up reflections or change the physical angle of the packaging.
          </li>
          <li>
            <strong>Defective Box Prints:</strong> Factory ink print heads can occasionally suffer line
            dropouts. The application utilizes an automatic 4-phase background Morphological Vertical
            Stitching filter matrix to reconnect broken blocks inside the worker pipe.
          </li>
        </ul>
      </section>
    </div>

    <a
      href={resolve('/')}
      class="mt-4 w-full bg-primary hover:bg-primary-hover text-neutral-950 font-black py-3.5 px-4 rounded-xl text-center transition-all shadow-md active:scale-95 cursor-pointer"
    >
      Return to Scanner
    </a>
  </div>
</main>
