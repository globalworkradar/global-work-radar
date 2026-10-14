# GWR B2B publication readback — 2026-10-14

## Verified
- Canonical repository: `globalworkradar/global-work-radar`.
- PR #12 merged into `main` at `b7353cd19d92bab02560760c08d9ef215f66b4f1`.
- `main/index.html` includes `id="businessPilot"` and the GWR-specific mailto link.
- External page-content fetch on 2026-10-14 found the **7-Day Custom Labor Signal Pilot** section and indicative ¥29,800 offer at:
  https://global-work-radar.globalworkradar.workers.dev/
- The same fetch did **not** find the B2B section at the older Pages address:
  https://global-work-radar.pages.dev/
- The PR preview also contained the B2B section:
  https://fix-b2b-inquiry-on-current-main-20261014-global-work-radar.globalworkradar.workers.dev/

## Routing decision
Use the **Workers production URL** as the verified GWR B2B public destination in future GWR-specific sales collateral. Do not describe the Pages URL as updated. Do not change other brands' WordPress/SNS profiles.

## Limitations
- External text extraction establishes publicly retrievable page content, not browser click-through, email delivery, payment, or client-side jobs data correctness.
- The mailto link opens the visitor's email client; it does not submit an inquiry automatically.
- Indicative ¥29,800 is **not** a final tax-inclusive quote or executed contract.
- One outbound business email was previously sent from the GWR mailbox. No verified buyer reply, contract or payment as of the latest mailbox search.
- Do not infer live job counts from the static initial HTML's zero/loading placeholders.
- Pages/Workers deploy lineage and whether Pages is intentionally retained remain unverified.

## Next commercial gate
Verified human buyer inquiry -> written scope/quote -> explicit agreement -> approved payment channel -> confirmed payment -> delivery. Preserve evidence at each gate; do not manufacture conversions or launch a new schedule/site/product.
