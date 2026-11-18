# Chrome Web Store first release

## Before submitting

1. Register in the [developer dashboard](https://chrome.google.com/webstore/devconsole).
   Finish the account and contact verification steps shown there. The developer
   registration fee is separate from the price of the extension.
2. From the repository root, run `node --test` and
   `node scripts/build-extension.mjs --store` (requires `zip`).
   Upload the resulting `dist/tidetab-<version>-store.zip` to a draft item.
   Keep test installs separate from the existing profile: the store item may
   get a different ID than the unpacked development build.
3. In a disposable Chrome profile, load `dist/store` as an unpacked extension.
   Check that the new tab opens, history populates the three columns, GitHub
   PR subpages collapse into one entry, and `/` and Enter work in search.
   Take at least one 1280×800 screenshot using only demo data. Do not include
   real company domains, issue keys, PRs, or page titles.
4. Publish [PRIVACY.md](../PRIVACY.md) at a public URL accessible without login
   and enter that URL under Privacy practices. Paste the fields below, review
   the data disclosures, and set distribution to free. Submit for review after
   checking the listing preview.

[Upload guide](https://developer.chrome.com/docs/webstore/publish) ·
[Image requirements](https://developer.chrome.com/docs/webstore/images) ·
[Privacy practices](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)

## Store listing

Use the [store listing draft](chrome-web-store-listing.md) for the description,
category, language, and required images.

## Privacy practices fields

| Field | Suggested text |
| --- | --- |
| Single purpose | Replace Chrome's new tab page with links ranked from local browsing history so users can return to the pages they use most. |
| `history` | Read visited URLs, titles, times, and navigation types to group and rank links shown on the new tab page. |
| `storage` | Save the ranked snapshot in local extension storage so the new tab page can display it without recomputing the ranking. |
| `alarms` | Refresh rankings once per day so old visits lose weight even during periods without new visits. |
| Remote code | No. The extension bundles all executable code. |

Disclose **Web history** in the data usage form and check the dashboard's
current category definitions for URL titles and other data the extension
handles. Local storage is not a reason to omit the disclosure. See Google's
[User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq).

## After submission

Use the review wait to draft the launch post and test the first-run flow. Share
the public store link once it works. GitHub Releases, CI publishing, and
optional promotional tiles do not block the first submission.
