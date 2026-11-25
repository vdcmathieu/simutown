# Simutown

A pixel-town toolkit for scripting small simulated scenes that explain ideas.

Simutown is to a little town what manim is to equations: you write a short script, and you get a deterministic animation of townspeople walking, talking and passing things on.
It is inspired by the Smallville sandbox of Park et al. (2023), "Generative Agents: Interactive Simulacra of Human Behavior".
There are no language models inside: the author, human or agent, decides what happens.

Status: early. See `AGENTS.md` for how the project is organised and `docs/` for the art direction and the scripting API.

```bash
pnpm install
pnpm check        # typecheck + tests
pnpm sheet all    # contact sheets of the art -> out/sheets/
pnpm still 4      # one frame of the fixture scene -> out/still.png
```

## Licence

MIT.
