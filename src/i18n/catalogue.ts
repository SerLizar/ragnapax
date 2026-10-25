// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

import type en from './en.ts';
import type {Message} from './format.ts';

/**
The English messages: the source text and the full list of keys.
*/
export type Messages = typeof en;

export type MessageKey = keyof Messages;

/**
A translation: messages by the same keys as English, any of them missing
while the work is in progress. Missing messages are shown in English.
*/
export type Translation = Readonly<Partial<Record<MessageKey, Message>>>;
