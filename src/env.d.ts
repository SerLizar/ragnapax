// SPDX-FileCopyrightText: 2026 SerLizar
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
Where visitors can get the source, as the AGPL asks; empty when unknown.
*/
// eslint-disable-next-line @typescript-eslint/naming-convention -- a build-time constant
declare const __SOURCE_URL__: string;

/**
The release, from package.json (see "Versioning" in docs/OPERATIONS.md).
*/
// eslint-disable-next-line @typescript-eslint/naming-convention -- a build-time constant
declare const __APP_VERSION__: string;
