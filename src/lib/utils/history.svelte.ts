export type HistoryOptions<T> = {
	// Replaces the current state with a snapshot.
	restore: (snapshot: T) => void;
	// Called with the snapshot of every new state.
	onChange?: (snapshot: T) => void;
	// Names the change between two states, so that successive
	// changes of the same name merge into one step.
	group?: (previous: T, next: T) => string | undefined;
};

const Limit = 100;

// Changes of the same group merge if they are closer than this.
const MergeDelay = 1000;

// Undo/redo stacks of snapshots, recorded on every change.
export class History<T> {
	past: T[] = $state.raw([]);
	future: T[] = $state.raw([]);
	#current?: T;
	#key = '';
	#group?: string;
	#time = 0;
	#options: HistoryOptions<T>;

	constructor(options: HistoryOptions<T>) {
		this.#options = options;
	}

	// Starts over from a snapshot, which is not a new state, so
	// it doesn't notify (e.g. opening a link doesn't overwrite
	// the palette stored from a previous session).
	reset(snapshot: T) {
		this.past = [];
		this.future = [];
		this.#group = undefined;
		this.#set(snapshot, false);
	}

	// Pushes a new state, or merges it into the current one when
	// it continues the same change (e.g. a slider drag).
	record(snapshot: T) {
		const key = JSON.stringify(snapshot);

		if (key === this.#key) {
			return;
		}

		const now = Date.now();
		const group =
			this.#current === undefined
				? undefined
				: this.#options.group?.(this.#current, snapshot);

		const merges =
			group !== undefined &&
			group === this.#group &&
			now - this.#time < MergeDelay;

		// The change went back to where the step started (e.g. a
		// slider dragged back), so the step is dropped.
		if (merges && key === JSON.stringify(this.past.at(-1))) {
			this.past = this.past.slice(0, -1);
			this.#group = undefined;
		} else {
			if (!merges && this.#current !== undefined) {
				this.past = [...this.past, this.#current].slice(
					-Limit
				);
			}

			this.#group = group;
		}

		this.#time = now;
		this.future = [];
		this.#set(snapshot);
	}

	undo() {
		const previous = this.past.at(-1);

		if (previous !== undefined) {
			this.past = this.past.slice(0, -1);
			this.future = [...this.future, this.#current!];
			this.#move(previous);
		}
	}

	redo() {
		const next = this.future.at(-1);

		if (next !== undefined) {
			this.future = this.future.slice(0, -1);
			this.past = [...this.past, this.#current!];
			this.#move(next);
		}
	}

	// Restored states start new steps, rather than merging with
	// the changes that follow.
	#move(snapshot: T) {
		this.#group = undefined;
		this.#set(snapshot);
		this.#options.restore(snapshot);
	}

	#set(snapshot: T, notify = true) {
		this.#current = snapshot;
		this.#key = JSON.stringify(snapshot);

		if (notify) {
			this.#options.onChange?.(snapshot);
		}
	}
}
