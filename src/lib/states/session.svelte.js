class SessionState {
  map = $state(new Map());
  #nextMysteryId = 1;

  registerScan(slug) {
    if (this.map.has(slug)) {
      return { isDuplicate: true, mysteryId: this.map.get(slug) };
    }

    const newId = this.#nextMysteryId++;
    this.map.set(slug, newId);
    return { isDuplicate: false, mysteryId: newId };
  }

  resetSession() {
    this.map.clear();
    this.#nextMysteryId = 1;
  }
}

export const sessionState = new SessionState();
