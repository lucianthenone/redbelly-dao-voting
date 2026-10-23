// Editable source for the three guide diagrams.
// Every shape, label and coordinate lives here. Change it, then run
// `npm run diagrams` in tools/ to rebuild the SVG, PNG and draw.io files.
// Coordinates are in SVG user units. Each diagram is 720 units wide.

export const LAST_VERIFIED = '22 OCT 2026';

const COL = [28, 260, 492]; // three box columns, 200 wide, 32 apart
const BOX_W = 200;
const BOX_H = 128;

const box = (id, x, y, num, title, lines, variant = 'card') =>
  ({ type: 'box', id, x, y, w: BOX_W, h: BOX_H, num, title, lines, variant });

export const diagrams = [
  {
    id: '01-verification-to-vote',
    title: 'From verification to a recorded vote',
    alt: 'Flow chart. Once, at Redbelly Access: 1 connect a wallet, 2 verify your identity with Averer, 3 enable the account. This must happen before a proposal is published. Then for each proposal on the governance platform: 4 the proposal is published, which records the snapshot block and opens voting, 5 connect your wallet, 6 the platform checks whether the wallet was enabled at the snapshot block. If yes: 7 choose and sign, which costs no gas, then 8 the vote is recorded with an IPFS receipt and can be changed until voting closes. If no: the wallet cannot vote on this proposal and has 0 voting power, but it can vote on proposals published later.',
    width: 720,
    height: 712,
    elements: [
      { type: 'heading', x: 28, y: 38, caps: 'From verification to a recorded vote', sub: 'Steps 1 to 3 happen once. Steps 4 to 8 happen for every proposal.' },

      { type: 'zone', x: 12, y: 86, w: 696, h: 182, label: 'Once, at Redbelly Access', note: 'access.redbelly.network' },
      box('s1', COL[0], 124, '01', 'Connect wallet', ['MetaMask or', 'Coinbase Wallet']),
      box('s2', COL[1], 124, '02', 'Verify identity', ['Passport and biometric', 'check with Averer']),
      box('s3', COL[2], 124, '03', 'Enable account', ['Sign in your wallet.', 'Status shows Enabled']),
      { type: 'arrow', points: [[228, 188], [258, 188]] },
      { type: 'arrow', points: [[460, 188], [490, 188]] },

      { type: 'arrow', points: [[592, 252], [592, 292], [128, 292], [128, 344]], tone: 'brand',
        label: { x: 360, y: 297, text: 'Enable before a proposal is published' } },

      { type: 'zone', x: 12, y: 310, w: 696, h: 356, label: 'For each proposal, on the platform', note: 'redbelly-governance.vercel.app', labelX: 148 },
      box('s4', COL[0], 346, '04', 'Proposal published', ['Snapshot block is', 'recorded. Voting', 'opens at once']),
      box('s5', COL[1], 346, '05', 'Connect wallet', ['Browser wallet or', 'WalletConnect on', 'Redbelly Network']),
      box('s6', COL[2], 346, '06', 'Eligibility check', ['Was this wallet', 'enabled at the', 'snapshot block?'], 'brand'),
      { type: 'arrow', points: [[228, 410], [258, 410]] },
      { type: 'arrow', points: [[460, 410], [490, 410]] },

      { type: 'arrow', points: [[592, 474], [592, 498], [128, 498], [128, 520]], tone: 'ok',
        label: { x: 140, y: 488, text: 'Yes', anchor: 'start', tone: 'ok', bg: false } },
      { type: 'arrow', points: [[592, 498], [592, 520]], tone: 'no',
        label: { x: 604, y: 514, text: 'No', anchor: 'start', tone: 'no', bg: false } },
      box('s7', COL[0], 522, '07', 'Choose and sign', ['A signature, not a', 'transaction. No gas']),
      box('s8', COL[1], 522, '08', 'Vote recorded', ['IPFS receipt follows.', 'Vote again to change', 'it before close'], 'ok'),
      box('s9', COL[2], 522, 'NO', 'Not this proposal', ['Voting power is 0.', 'The wallet can vote', 'on later proposals'], 'no'),
      { type: 'arrow', points: [[228, 586], [258, 586]] },

      { type: 'footer', y: 694 },
    ],
  },

  {
    id: '02-snapshot-timeline',
    title: 'When eligibility is checked',
    alt: 'Timeline. The snapshot is taken at the moment a proposal is published, and voting opens at the same moment. Wallet A was enabled before the snapshot, so it can vote. Wallet B was enabled after the snapshot, while voting was open, so it cannot vote on this proposal. Wallet B can vote on proposals published after it was enabled.',
    width: 720,
    height: 484,
    elements: [
      { type: 'heading', x: 28, y: 38, caps: 'When eligibility is checked', sub: 'The snapshot is taken the moment a proposal is published.' },

      { type: 'band', x: 300, y: 112, w: 220, h: 218, label: 'Voting open' },
      { type: 'vline', x: 300, y1: 96, y2: 330, tone: 'brand' },
      { type: 'text', x: 300, y: 90, text: 'Proposal published', anchor: 'middle', cls: 'ink', weight: 600, size: 15 },
      { type: 'vline', x: 520, y1: 112, y2: 330, tone: 'muted' },
      { type: 'text', x: 520, y: 106, text: 'Voting closes', anchor: 'middle', cls: 'muted', size: 13 },

      { type: 'arrow', points: [[150, 160], [560, 160]], tone: 'muted' },
      { type: 'text', x: 560, y: 150, text: 'time', anchor: 'end', cls: 'muted', size: 12, mono: true },
      { type: 'pill', x: 300, y: 160, text: 'SNAPSHOT BLOCK' },

      { type: 'text', x: 28, y: 226, text: 'Wallet A', cls: 'ink', weight: 600, size: 16 },
      { type: 'text', x: 28, y: 248, text: 'enabled before', cls: 'dim', size: 14 },
      { type: 'track', x1: 210, x2: 560, y: 232, tone: 'ok', dotLabel: 'Enabled' },
      { type: 'status', x: 584, y: 236, tone: 'ok', text: 'CAN VOTE' },

      { type: 'text', x: 28, y: 292, text: 'Wallet B', cls: 'ink', weight: 600, size: 16 },
      { type: 'text', x: 28, y: 314, text: 'enabled after', cls: 'dim', size: 14 },
      { type: 'track', x1: 400, x2: 560, y: 298, tone: 'no', dotLabel: 'Enabled' },
      { type: 'status', x: 584, y: 302, tone: 'no', text: 'CANNOT VOTE', sub: 'on this proposal' },

      { type: 'note', x: 28, y: 366, lines: [
        'The platform reads each wallet as it was at the snapshot block.',
        'Enabling a wallet later does not change that. Wallet B can vote on',
        'any proposal published after it was enabled.',
      ] },
      { type: 'footer', y: 466 },
    ],
  },

  {
    id: '03-wallets-and-votes',
    title: 'One verification, several wallets',
    alt: 'Diagram. One verified identity at Redbelly Access can link up to 10 wallets. On a proposal that gives one vote per verified address, each wallet is counted on its own. Wallet 1 and wallet 2 were enabled before the snapshot, so each has 1 vote. Wallet 3 was enabled after the snapshot, so it has 0 votes on this proposal. Wallet 4 is linked but not enabled, so it has 0 votes. In total these wallets can cast 2 votes on this proposal. The platform does not group wallets by person.',
    width: 720,
    height: 548,
    elements: [
      { type: 'heading', x: 28, y: 38, caps: 'One verification, several wallets', sub: 'Example: one proposal that gives one vote per verified address.' },

      { type: 'box', id: 'id', x: 28, y: 176, w: 196, h: 132, num: 'REDBELLY ACCESS', titleLines: ['One verified', 'identity'], lines: ['Up to 10 wallets', 'can be linked'], variant: 'steel' },

      { type: 'wallet', x: 284, y: 96, title: 'Wallet 1', sub: 'Enabled before snapshot', tone: 'ok', result: '1 VOTE' },
      { type: 'wallet', x: 284, y: 180, title: 'Wallet 2', sub: 'Enabled before snapshot', tone: 'ok', result: '1 VOTE' },
      { type: 'wallet', x: 284, y: 264, title: 'Wallet 3', sub: 'Enabled after snapshot', tone: 'no', result: '0 VOTES' },
      { type: 'wallet', x: 284, y: 348, title: 'Wallet 4', sub: 'Linked, not enabled', tone: 'no', result: '0 VOTES' },
      { type: 'fan', from: [224, 242], to: [[284, 130], [284, 214], [284, 298], [284, 382]] },

      { type: 'total', x: 28, y: 432, w: 664, text: 'Total on this proposal: 2 votes, one from each eligible wallet.', sub: 'The platform counts wallets. It does not group them by person.' },
      { type: 'footer', y: 532 },
    ],
  },
];
