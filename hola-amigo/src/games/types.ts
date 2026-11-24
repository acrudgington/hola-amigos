// Shared contracts between games and the activity screen.
export type OnWord = (es: string, en: string, ok: boolean, opts?: { quiet?: boolean }) => void;
export type OnDone = (correct: number, total: number) => void;
export interface GameProps { onDone: OnDone; onWord?: OnWord }
