/**
 * The Simutown resources (the guides, the townsfolk, the towns) and the "scene" prompt
 * an MCP client can offer. Node only.
 */
import { townsfolk } from '../art/characters';
import { GUIDES, type GuideTopic, TOWNS, readGuide, townText } from './tools';
import type { PromptDef, ResourceDef } from './types';

/** Every resource: `simutown://docs/<topic>`, `simutown://townsfolk` and `simutown://towns/<name>`. */
export function simutownResources(): ResourceDef[] {
  const docs: ResourceDef[] = (Object.keys(GUIDES) as GuideTopic[]).map((topic) => ({
    uri: `simutown://docs/${topic}`,
    name: `docs/${topic}`,
    title: GUIDES[topic].file,
    description: GUIDES[topic].title,
    mimeType: 'text/markdown',
    read: async () => readGuide(topic),
  }));
  const people: ResourceDef = {
    uri: 'simutown://townsfolk',
    name: 'townsfolk',
    title: 'Townsfolk',
    description: 'The built-in characters as JSON: id (what s.actor() takes), name, role and how they look.',
    mimeType: 'application/json',
    read: async () => JSON.stringify(townsfolk, null, 2),
  };
  const towns: ResourceDef[] = Object.entries(TOWNS).map(([name, town]) => ({
    uri: `simutown://towns/${name}`,
    name: `towns/${name}`,
    title: town.name,
    description: `${town.name} (import { ${name} } from 'simutown'): map, props and place names.`,
    mimeType: 'text/plain',
    read: async () => townText(name, town),
  }));
  return [...docs, people, ...towns];
}

/** The authoring loop, in terms of the MCP tools, for a scene about `idea` that lasts about `seconds`. */
export function scenePrompt(idea: string, seconds: number): string {
  return `Make a Simutown scene of about ${seconds} seconds that shows this idea: ${idea}

Simutown scripts small pixel-town animations: you write a TypeScript scene file, and the engine turns it into a deterministic film. Nothing in the town is smart; you decide everything that happens. Use the simutown tools for every step.

1. Read the guide: read_guide { topic: "authoring" } (and "scene-api" when you need the exact calls).
2. Plan the beats. Write down the one idea the scene shows in one sentence, then four to eight beats of 3 to 8 seconds: a title or fade in, a set-up, the event one line at a time, the point in a caption, a fade out. Fit about ${seconds} seconds.
3. List the places: describe_town. Use the place names it prints as targets. Props are not places: to reach the bakery, walk to "bakery.door".
4. Cast by role: list_townsfolk. Use only the ids it lists (the baker is bo, the children kofi and lin).
5. Pick the hour: plain daylight 9 to 16; golden late afternoon 17 to 18 (lamps light at 17:30); sunset 19; blue evening 19.5 to 21; night after 21.5.
6. Write the scene with write_scene { name: "<kebab-name>", source }. It default-exports scene({ title, town, timeOfDay }, (s) => { ... }), importing from 'simutown'. (new_scene writes a commented starter to begin from.) write_scene builds it and returns the timeline or the error: errors list the valid names, so fix and call again until it builds.
7. Check the timing with scene_info: each call starts when the previous one ends, s.together runs calls at once, speech times itself, and a caption takes no time (give it { hold } or action after it). Walking is 2.5 tiles a second. Use zoom 1 to set the scene and zoom 2 for dialogue; cut between places, pan within one, and keep the camera still while someone speaks. To hit the length, adjust an s.wait(...) before the final fade.
8. Look: still { scene, every_beat: true }, and look at every image. Check that the people who matter are in frame and visible, that bubbles and labels do not overlap, and that each caption is up while its beat needs it. Fix with write_scene and look again until every beat reads.
9. Render: render { scene } for the MP4 (format "gif" for a GIF).

The scene is done when it builds, its length is close to ${seconds} seconds, you have looked at a still of every beat, and the film is rendered. Report the scene file, the film's path, its duration, and the stills you checked.`;
}

/** The prompts: "scene", which expands to the whole authoring loop for one idea. */
export function simutownPrompts(): PromptDef[] {
  return [
    {
      name: 'scene',
      title: 'Make a Simutown scene',
      description: 'Plan, write, check and render a short pixel-town scene that explains one idea.',
      arguments: [
        { name: 'idea', description: 'What the scene shows, e.g. "a child asks the baker for bread".', required: true },
        { name: 'seconds', description: 'About how long the scene lasts, in seconds. Default 20.' },
      ],
      render: async (args) => {
        const n = Number(args.seconds);
        const seconds = args.seconds !== undefined && args.seconds.trim() !== '' && Number.isFinite(n) && n > 0 ? n : 20;
        return scenePrompt(args.idea ?? '', seconds);
      },
    },
  ];
}
