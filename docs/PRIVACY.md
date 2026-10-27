# Privacy

What the privacy notice rests on, and what a fork or another host must change
before publishing the site. Read it before changing what the app stores or
contacts, or where it is hosted. Part of the architecture docs;
[ARCHITECTURE.md](ARCHITECTURE.md) is the overview.

Players in the EU are covered by the GDPR and the ePrivacy Directive. The
design keeps both light: the site never receives a player's data, so there is
almost nothing to declare.

- **No cookies, consent banner or tracking.** Nothing is read or stored on the
  device except what features the player uses need: setups (`ragnapax/v1`),
  interface choices such as theme and language, and the service worker's copy of the app for
  offline use, made only once the player first taps or presses a key, not on
  a visit alone. Storage that is strictly necessary for a service the user
  asked for is exempt from consent (ePrivacy Directive, Art. 5(3)), so a
  banner would be wrong, not just unnecessary. Adding analytics, ads, third-party
  embeds or fonts, or storage for anything else, would end that exemption.
- **Plans stay on the device.** Share links carry setups and guild names in
  the fragment, which browsers never send to the server (see
  [Share links](SHARING.md#share-links)); the player decides who receives them.
- **The host sees visitors.** GitHub Pages receives every visitor's IP address
  and user agent, and GitHub logs IP addresses for security
  ([GitHub Pages data collection](https://docs.github.com/pages/getting-started-with-github-pages/about-github-pages#data-collection)).
  GitHub gives no fixed retention period (its privacy statement keeps data
  as long as the purpose and the law require), so the notice says that and
  links to GitHub's "Security and Retention" section, as Art. 13(2)(a) asks.
  That is the only personal data processing, on the basis of legitimate
  interest (Art. 6(1)(f) GDPR); the transfer to the USA relies on GitHub's
  EU-US Data Privacy Framework certification.

The GDPR (Art. 13) asks for a notice saying who runs the site, what is
processed and why, and the visitor's rights. `src/ui/PrivacyNotice.svelte`
shows it, folded away in the footer and translated like any other text, with
a "Delete saved data" button (`PlannerState.forgetEverything`) that clears
the app's storage, its service worker and offline cache (only its own: other
sites can share the origin), and reloads without the link. Contact goes through the repository's
issues, linked when the build knows its source URL.

**Keep it true.** Update the notice (`privacy.*` in `src/i18n/en.ts`) in the
same change if the app starts storing something new, contacting anything but
its own origin, or is hosted somewhere other than GitHub Pages.

**Forks and other hosts.** Whoever publishes the site is responsible for it,
so a published fork must name its own operator, and a site published anywhere
but GitHub Pages must describe its own host. Before deploying, change:

- `OPERATOR` in `src/ui/PrivacyNotice.svelte`;
- `privacy.host`, `privacy.hostLogs`, `privacy.hostRetention` and
  `privacy.hostMore` (and the statements they link to) for another host: what it logs, for how long if
  known, where it is based, and how data reaches it from the EU;
- anything else the copy changes about storage or requests.

The contact link needs nothing: it follows `SOURCE_URL`, or the repository
the build ran in. The README, `AGENTS.md` and the deploy job in
`.github/workflows/ci.yml` repeat this, so forkers and their agents see it.

Not needed, for a free, non-commercial site with no accounts or user content:
a cookie banner, a German-style _Impressum_ (owed by commercial services), the
European Accessibility Act (which covers businesses' products and services),
or Digital Services Act duties (nothing is hosted for users).
