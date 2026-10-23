# Verification log

Every rule in the guide was checked against the live Redbelly DAO governance platform and Redbelly's public pages on **22 October 2026**. Nothing was taken from Snapshot, from Constitution v1.2 or from older guides. This file lists each check and how to repeat it.

Platform: <https://redbelly-governance.vercel.app/>
Redbelly Access: <https://access.redbelly.network/>
Redbelly access contract (mainnet, chain ID 151): `0xcb385cD90ca6b219798F57B4a7958897e91A9163`

## 1. Rules and where they were checked

| Rule in the guide | Where it was checked |
|---|---|
| Voting is a signed message, not a transaction. No gas. | Platform: Wallet safety page, and the "How voting works here" panel on each proposal. The signed `Vote` structure has fields from, space, proposal, choice, reason and timestamp, with domain "Redbelly Governance", version 1, chain ID 151. |
| Every proposal published today is open to verified wallets only. | Platform: New proposal page shows "Verified wallets only" as a fixed setting on mainnet. `/api/proposals` returns `require_verified: true` for every proposal published since 1 September 2026. |
| The snapshot is the latest Redbelly block when a proposal is published, and voting opens at the same time. | `/api/proposals`: the Proposal Resubmission Policy (`f832b2b9`) has `snapshot_block` 3208192 and `start_at` 2026-09-30 06:49:45 UTC. Block 3208192 has timestamp 2026-09-30 06:47:23 UTC (`eth_getBlockByNumber` on `https://governors.mainnet.redbelly.network`). The New proposal form has no start date: voting starts when the proposal is signed and published. |
| Eligibility is fixed at the snapshot. | Platform text: "Eligibility is based on the proposal snapshot. Changes after that snapshot do not add voting power." and "Voting eligibility is determined at each proposal's snapshot, so completing KYC now may not qualify you for a vote already in progress." Confirmed by the test in section 2. |
| One vote per verified address on "One verified address, one vote" and Strategy `verified-identity` proposals. | Platform text: "Every identity-verified address gets exactly one vote regardless of holdings." `/api/power` returns `power: 1` for verified wallets on such proposals. |
| Other strategies: `native-balance` (RBNT at the snapshot block) and `erc20-balance` (token balance at the snapshot block). | Platform: New proposal page, Voting power options "RBNT balance" and "Token balance". |
| The three most recent proposals (2 and 30 September 2026) used one vote per verified address. | `/api/proposals`: `3ef19ec6`, `2a9b3ed6` and `f832b2b9` all have `strategy: verified-identity`. |
| A second ballot from the same wallet replaces the first. Only the latest counts. | Platform text: "Voting again before the deadline replaces this ballot." The results code keeps the latest signed ballot per address. |
| Several wallets under one verification each count separately. | Platform text: "Identity voting gives each eligible verified address one vote. Multiple addresses may belong to the same person, so this does not establish one vote per unique person." and "Verified addresses are not necessarily unique people." The verified voter count is the number of distinct addresses. |
| Up to 10 wallets per verified identity, added with "Add another account" or "Link another wallet". | Redbelly Access account screen: at 10 linked accounts it shows "Account allocation exhausted." and hides "Add another account". The platform's New proposal page also says one credential enables up to about 10 addresses. |
| Each linked wallet is enabled separately. | Redbelly Access shows "Account status: Not enabled" or "Enabled" and an "Enable account" button per account. |
| MetaMask and Coinbase Wallet, Averer as issuer, fees covered by the issuer. | Redbelly Access FAQ on the start screen. |
| Passport and biometric check. | Redbelly Developer Portal, User access: <https://vine.redbelly.network/identity/user-access/> |
| Identity quorum is a floor on addresses, not proof of separate people. | Platform: New proposal page, Identity quorum help text. |
| A proposal cannot be edited once open. | Platform: New proposal page, "a proposal cannot be edited once it is open". |
| Ballots are public and kept by the platform. | Platform: each proposal lists voter, choice, power and reason. `/api/proposals` shows `anchor_tx: null` for every proposal: results are not written on chain. IPFS receipts are linked per ballot. |
| Older proposals came from Snapshot and are marked as imported. | `/api/proposals`: every proposal before 28 August 2026 has `source: snapshot`. The list marks them "imported". |
| Messages in the "Why can't I vote?" table. | Platform: exact wording from the Cast your vote panel, the wallet connect dialog and the KYC notice. |

## 2. Test: a wallet enabled after the snapshot cannot vote

Question: does the platform really read eligibility at the snapshot block, or at the time you vote?

Method:

1. Take a closed proposal with an old snapshot. The Proposal Resubmission Policy has id `f832b2b9-18fd-4d65-967d-0a85b89a500e` and snapshot block 3208192 (30 September 2026).
2. Open the transaction list of the Redbelly access contract on Routescan: <https://redbelly.routescan.io/address/0xcb385cD90ca6b219798F57B4a7958897e91A9163>. Pick wallets whose enable transaction is dated after 30 September 2026.
3. For each wallet, ask the platform for its verified status today and its voting power on that proposal:

   ```bash
   curl "https://redbelly-governance.vercel.app/api/identity?address=<WALLET>"
   curl "https://redbelly-governance.vercel.app/api/power?proposal=f832b2b9-18fd-4d65-967d-0a85b89a500e&voter=<WALLET>"
   ```

4. Ask the access contract whether the wallet was enabled at the snapshot block. `0xbabcc539` is `isAllowed(address)`, and `0x30F400` is block 3208192:

   ```bash
   curl -X POST https://governors.mainnet.redbelly.network -H 'content-type: application/json' \
     --data '{"jsonrpc":"2.0","id":1,"method":"eth_call","params":[{"to":"0xcb385cD90ca6b219798F57B4a7958897e91A9163","data":"0xbabcc539000000000000000000000000<WALLET WITHOUT 0x>"},"0x30F400"]}'
   ```

Result on 22 October 2026, for four wallets enabled between 17 and 21 October 2026:

| Check | Result for all four |
|---|---|
| `/api/identity` today | `{"verified":true,"chainId":151}` |
| `/api/power` on `f832b2b9` | `{"power":0,"blocked":true,...}` with the message that the address does not hold a Receptor credential |
| `isAllowed` at block 3208192 | `false` |
| `isAllowed` at the latest block | `true` |

Control: wallets that voted on that proposal return `{"power":1,"strategy":"verified-identity","snapshotBlock":3208192}`, and `isAllowed` at block 3208192 is `true`.

Conclusion: the platform reads the access contract at the snapshot block. A wallet enabled after that block gets 0 voting power on that proposal, even though it shows as verified today.

Wallet addresses are left out of this file on purpose. Any wallet from the Routescan list that was enabled after 30 September 2026 gives the same result.

## 3. Diagrams

Each diagram carries a "Last verified 22 Oct 2026" line in the artwork, as the Task Board brand kit asks for graphics with facts that can expire. The figures repeat only rules from section 1.

## 4. Automated checks

`npm run check` in `tools/` fails the build if any page, document or diagram contains an en or em dash, an emoji, a personal credit, a broken local link, or a diagram without its last verified line. See `tools/check.mjs`.
