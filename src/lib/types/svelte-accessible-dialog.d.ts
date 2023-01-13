declare module 'svelte-accessible-dialog' {
	import {SvelteComponentTyped} from 'svelte';
	import {type HTMLAttributes} from 'svelte/elements';

	export class DialogOverlay extends SvelteComponentTyped<
		HTMLAttributes<HTMLDivElement> & {
			isOpen: boolean;
			onDismiss: () => void;
		}
	> {}

	export class DialogContent extends SvelteComponentTyped<
		HTMLAttributes<HTMLDivElement>
	> {}
}
