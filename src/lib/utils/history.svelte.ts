export type HistoryOptions<T> = {
	// Returns a plain snapshot of the current state.
	read: () => T;
	// Replaces the current state with a snapshot.
	restore: (snapshot: T) => void;
	// Called with the snapshot of every new state.
	onChange?: (snapshot: T) => void;
	limit?: number;
};

// Undo/redo stacks of snapshots, pushed at commit points.
export class History<T> {
	past: T[] = $state.raw([]);
	future: T[] = $state.raw([]);
	#current?: T;
	#key = '';
	#options: HistoryOptions<T>;

	constructor(options: HistoryOptions<T>) {
		this.#options = options;
	}

	// Starts over from the current state.
	reset() {
		this.past = [];
		this.future = [];
		this.#set(this.#options.read());
	}

	// Pushes the current state, unless it didn't change since
	// the last commit.
	commit() {
		const snapshot = this.#options.read();

		if (JSON.stringify(snapshot) === this.#key) {
			return false;
		}

		if (this.#current !== undefined) {
			this.past = [...this.past, this.#current].slice(
				-(this.#options.limit ?? 100)
			);
		}

		this.future = [];
		this.#set(snapshot);
		return true;
	}

	undo() {
		this.commit();
		const previous = this.past.at(-1);

		if (previous !== undefined) {
			this.past = this.past.slice(0, -1);
			this.future = [...this.future, this.#current!];
			this.#move(previous);
		}
	}

	redo() {
		this.commit();
		const next = this.future.at(-1);

		if (next !== undefined) {
			this.future = this.future.slice(0, -1);
			this.past = [...this.past, this.#current!];
			this.#move(next);
		}
	}

	#move(snapshot: T) {
		this.#options.restore(snapshot);
		this.#set(snapshot);
	}

	#set(snapshot: T) {
		this.#current = snapshot;
		this.#key = JSON.stringify(snapshot);
		this.#options.onChange?.(snapshot);
	}
}
