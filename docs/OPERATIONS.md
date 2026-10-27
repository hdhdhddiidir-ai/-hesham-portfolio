# Portfolio operations and smoke tests

## Automatic checks
The \`Validate Portfolio\` GitHub Actions workflow checks:
- all 16 service filters and their Arabic/English labels;
- mapping from the Telegram bot's service labels to portfolio filters;
- maintenance page and bot actions;
- the Telegram webhook secret guard;
- syntax of inline JavaScript in \`index.html\`.

## Required deployment secrets
Never commit secrets or paste them into chat. The deployed Supabase Edge Function needs these Supabase function secrets:
- \`TELEGRAM_BOT_TOKEN\`
- \`TELEGRAM_WEBHOOK_SECRET\` (use a random token made only of letters, numbers, underscores, and hyphens)
- \`SUPABASE_SERVICE_ROLE_KEY\`

The GitHub Actions deployment workflow also needs the repository Actions secret \`SUPABASE_ACCESS_TOKEN\`. Confirm these exist in the relevant secret settings; this repository cannot read secret values.

After configuring the Edge Function secrets, open the deployed function's GET endpoint once to register the Telegram webhook with the secret token. Do not expose the service-role key in browser code.

## Manual end-to-end smoke test
1. Open the live site in desktop and mobile widths. Confirm the active nav item follows the section being read and no heading is hidden under the sticky header.
2. In Projects, select each service filter, search for a project, switch language to English and back to Arabic, then reset filters. Projects with legacy/unknown categories should remain reachable through “Other categories / تصنيفات أخرى”.
3. In the Telegram bot, open “وضع الصيانة”, enable it, wait for the site to show “وضع الصيانة”, then disable it and confirm the regular site returns. Keep a separate browser tab open for this test.
4. Submit a test customer order using a test contact. Confirm it appears in the bot's new-orders list, then move it through accepted/in-progress/completed if those controls are exposed in the bot. Delete or clearly mark the test record afterward.
5. Submit a test review and confirm the bot receives it for moderation; approve it and verify it appears on the site, then remove the test review if appropriate.
6. Confirm the deployed Supabase function logs show successful Telegram webhook updates and no missing-secret/401 errors.

## Safety and deployment notes
- The webhook update endpoint now rejects requests without the configured Telegram secret header. If \`TELEGRAM_WEBHOOK_SECRET\` is missing or mismatched, the bot will not process updates until the secret is configured and the webhook is re-registered.
- Public website actions such as creating an order and uploading its attachments are separate routes; they are intentionally handled before the Telegram webhook guard.
- A successful Vercel deployment check verifies build/deployment health, not the full interactive tests above.
