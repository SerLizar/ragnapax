// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
Where focus was when it was lost: the card it was in, if any, and whatever
`snapshot` returned when the control took focus.
*/
export type LostFocus<T> = {
	readonly card: Element | undefined;
	readonly snapshot: T;
};

type Options<T> = {
	/**
	State to remember while a control has focus, to tell later what changed.
	*/
	snapshot: () => T;
	/**
	Where focus should go instead; undefined to leave it where the browser put it.
	*/
	pick: (lost: LostFocus<T>) => HTMLElement | undefined;
};

const isDisabled = (element: Element) => element.matches(':disabled');

const FALLBACK = 'data-focus-fallback';
const SOLVE_CONTROL = 'data-solve-control';

/**
Marks a control as where focus goes in its card when the focused control
there goes away; see `fallbackIn`. A Svelte attachment (`@attach`) rather
than attributes to spread, which would bring a large part of Svelte into
the first download.
*/
export const focusFallback = (isOn = true) => (element: Element) => {
	element.toggleAttribute(FALLBACK, isOn);
	return () => {
		element.removeAttribute(FALLBACK);
	};
};

/**
Marks the control that stops a solve, which takes focus from the button
that started it. A Svelte attachment, like `focusFallback`.
*/
export function solveControl(element: Element): void {
	element.setAttribute(SOLVE_CONTROL, '');
}

export const SOLVE_CONTROL_SELECTOR = `[${SOLVE_CONTROL}]`;

/**
Ids of the card headings focus goes to when a card it was in goes away.
*/
export const SETUP_TITLE = 'setup-title';
export const RESULT_TITLE = 'result-title';

/**
A control's card: a `.card` section, titled by its heading.
*/
const cardOf = (element: Element) => element.closest('section.card') ?? undefined;

/**
Where focus goes in `card` when the focused control there goes away: the
first enabled control marked with `focusFallback`, such as the button that
starts the action just cancelled, or else the card's heading.
*/
export function fallbackIn(card: Element): HTMLElement | undefined {
	const candidates = card.querySelectorAll<HTMLElement>(`[${CSS.escape(FALLBACK)}]`);
	return (
		[...candidates].find(element => !isDisabled(element))
		?? card.querySelector<HTMLElement>('h2[tabindex]')
		?? undefined
	);
}

/**
Keeps keyboard focus in place when the focused control disappears or is
disabled, as when a button gives way to the progress it started. Browsers
send focus back to the top of the page then, so keyboard and screen reader
players would lose their place (WCAG 2.4.3). Focus the player moved
elsewhere is left alone. Returns a stop function.
*/
export function keepFocus<T>(root: HTMLElement, {snapshot, pick}: Options<T>): () => void {
	let focused: {element: Element; card: Element | undefined; snapshot: T} | undefined;

	const track = (event: FocusEvent) => {
		const element = event.target as Element;
		focused = {element, card: cardOf(element), snapshot: snapshot()};
	};

	// A tap on the page's background lets go of focus on purpose.
	const release = (event: FocusEvent) => {
		const element = event.target as Element;
		queueMicrotask(() => {
			if (element.isConnected && focused?.element === element && !isDisabled(element)) {
				focused = undefined;
			}
		});
	};

	// Changes to the page arrive together once an update is done, so the
	// controls that replace the lost one are already there.
	const observer = new MutationObserver(() => {
		if (!focused) {
			return;
		}

		const {element, card, snapshot: before} = focused;
		if (element.isConnected && !isDisabled(element)) {
			return;
		}

		const active = document.activeElement;
		if (active !== element && active !== null && active !== document.body) {
			return;
		}

		focused = undefined;
		pick({card: card?.isConnected ? card : undefined, snapshot: before})?.focus();
	});

	root.addEventListener('focusin', track);
	root.addEventListener('focusout', release);
	observer.observe(root, {
		subtree: true,
		childList: true,
		attributes: true,
		attributeFilter: ['disabled'],
	});
	return () => {
		root.removeEventListener('focusin', track);
		root.removeEventListener('focusout', release);
		observer.disconnect();
	};
}
