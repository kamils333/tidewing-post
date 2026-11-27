// The people who send and receive the mail. Short lines, not a script: the dossier and the
// contract board quote them, but nothing here draws or decides anything. `line` greets a first
// delivery for that islander; `returnLine` is what they say once you have already flown one of
// their contracts (campaign.js's completedContracts decides which one shows). `portrait` is read
// only by render.js's drawPortrait: a colour and a simple hat shape, not a drawing itself.

export const NPCS = {
  cobb: {
    name: 'Old Cobb',
    role: 'Dockmaster, Saltmere Harbor',
    line: "Tide's turning. Load up and get clear of the harbour mouth before it does.",
    returnLine: "Back again, Captain. The harbour mouth doesn't get any kinder with practice.",
    portrait: { color: '#3d5a73', hat: 'cap' },
  },
  mirei: {
    name: 'Mirei Tolan',
    role: 'Fisherwoman, Driftwood Cay',
    line: "Nets are no good to anyone sitting on your dock, Captain.",
    returnLine: "You're getting to know this stretch of water better than I'd like, honestly.",
    portrait: { color: '#2f7a6b', hat: 'scarf' },
  },
  benno: {
    name: 'Benno Fitch',
    role: 'Kelp farmer, Kelp Hollow',
    line: 'Jars rattle. Fly it like the cargo is asleep and you want it to stay that way.',
    returnLine: "Still in one piece. You're learning how Kelp Hollow likes to be flown.",
    portrait: { color: '#6a8c3a', hat: 'none' },
  },
  wren: {
    name: 'Wren Fitch',
    role: "Benno's daughter, Kelp Hollow",
    line: "It's just a letter. It's not just a letter.",
    returnLine: "You remembered the way back. Dad says that means something out here.",
    portrait: { color: '#d4a73d', hat: 'none' },
  },
  sera: {
    name: 'Sera Quill',
    role: 'Lighthouse keeper, Thornback Shoal',
    line: 'Stay high over the reef until you can see the green water past it. Then, and only then, come down.',
    returnLine: "You held your altitude that time. The reef notices who respects it.",
    portrait: { color: '#9aa0ad', hat: 'scarf' },
  },
  dez: {
    name: 'Dez Okoye',
    role: 'Windmill mechanic, Windlass Point',
    line: 'This wind built the mill and it will try to take your wings the same way. Respect it.',
    returnLine: "You're flying this crosswind like you've met it before. Good.",
    portrait: { color: '#a85c32', hat: 'cap' },
  },
  nat: {
    name: 'Nat Varro',
    role: 'Ash miner, Ashfall Rock',
    line: "Can't see the dock in this haze. Trust the gauges, not the horizon.",
    returnLine: "Back through the ash again. The gauges did right by you, I take it.",
    portrait: { color: '#5c5a52', hat: 'cap' },
  },
  joss: {
    name: 'Joss Varden',
    role: 'Night-shift keeper, Nightfall Spit',
    line: "I keep the lamp lit past midnight for exactly one plane. Yours.",
    returnLine: "You know the beam now. Still, watch the shoal, not the light.",
    portrait: { color: '#2b3a5c', hat: 'hood' },
  },
  oskar: {
    name: 'Oskar Penn',
    role: 'Chandler, Farhaven Reach',
    line: "Long way out here. Mind the fuel on the way back, not just the way in.",
    returnLine: "You've got the measure of the relay stop now. Good habit to keep.",
    portrait: { color: '#7a5230', hat: 'cap' },
  },
  priya: {
    name: 'Priya Solenne',
    role: 'Atoll doctor, Last Light Atoll',
    line: "Out here, the mail plane is the only doctor's visit some of these islands get.",
    returnLine: "Every run you make out here is one less thing I have to worry about.",
    portrait: { color: '#c2c8d4', hat: 'none' },
  },
};

/** The result screen's one line from whoever sent for this delivery, reading the grade, not a script. */
export function clientReaction(npc, result) {
  if (!result.delivered) return `${npc.name} is still waiting on this one.`;
  if (result.cargoBroken) return `${npc.name}: "Well... most of it made it."`;
  if (result.grade === 'perfect') return `${npc.name}: "Didn't even feel you land. Beautiful flying."`;
  if (result.grade === 'smooth') return `${npc.name}: "Right on time, Captain. Thank you."`;
  return `${npc.name}: "A rough one, but it's here. That's what matters."`;
}
