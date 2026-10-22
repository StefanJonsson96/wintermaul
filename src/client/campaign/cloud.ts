// Campaign saves in the artifact host's private per-player store, when the game runs as a
// claude.ai artifact. Browser storage stays the instant local copy; this one survives a cleared
// browser and follows the player to their other devices. Anywhere else it does nothing.

interface Snapshot {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}
interface DocRef {
  get(): Promise<Snapshot>;
  set(data: Record<string, unknown>): Promise<void>;
}
interface Host {
  use(name: string): Promise<unknown>;
}

/** Errors after which this visit stops trying to write. */
const FINAL = new Set(['invalid_argument', 'revoked', 'not_granted', 'capability_disabled', 'capability_removed', 'quota_exceeded', 'transform_error']);

export class CloudSave {
  private ref: DocRef | null = null;
  private queued: string | null = null;
  private written = '';
  private retried = '';
  private busy = false;

  /** Connects in the background and hands over the stored save, if there is one. */
  async connect(onRemote: (json: string) => void): Promise<void> {
    const host = (globalThis as { claude?: Host }).claude;
    if (typeof host?.use !== 'function') return;
    try {
      const [db, user] = (await Promise.all([host.use('db'), host.use('user')])) as [{ doc(path: string): DocRef } | null, { id(): Promise<string | null> } | null];
      if (!db || !user) return;
      const id = await user.id();
      if (!id) return;
      const ref = db.doc(`data/users/${id}/campaign`);
      const snap = await ref.get();
      this.ref = ref;
      const json = snap.exists ? snap.data()?.save : undefined;
      if (typeof json === 'string') {
        this.written = json;
        onRemote(json);
      }
      void this.flush();
    } catch {
      this.ref = null;
    }
  }

  /** Keeps a save; rapid saves collapse into one write, one write at a time. */
  store(json: string): void {
    this.queued = json;
    void this.flush();
  }

  private async flush(): Promise<void> {
    if (this.busy || !this.ref) return;
    this.busy = true;
    try {
      while (this.ref && this.queued !== null) {
        const json = this.queued;
        this.queued = null;
        if (json === this.written) continue;
        try {
          await this.ref.set({ save: json });
          this.written = json;
        } catch (e) {
          const code = (e as { code?: string })?.code ?? '';
          if (FINAL.has(code)) this.ref = null;
          else if (this.queued === null && this.retried !== json) {
            // transient: try once more shortly; after that, the next save tries again
            this.retried = json;
            this.queued = json;
            await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1500));
          }
        }
      }
    } finally {
      this.busy = false;
    }
  }
}
