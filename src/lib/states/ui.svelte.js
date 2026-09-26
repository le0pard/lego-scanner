class MysteryMode {
  active = $state(false);

  toggle() {
    this.active = !this.active;
  }
}

export const mysteryMode = new MysteryMode();
