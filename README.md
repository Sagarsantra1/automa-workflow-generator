# Automa workflow generator

An installable agent skill for creating and editing Automa browser automation workflows. It includes a Node.js generator that converts simple workflow JSON into the block package Automa accepts when pasted into an existing workflow.

## Install

Clone this repository into a project's `.agents/skills/automa-workflow-generator` folder:

```sh
git clone https://github.com/Sagarsantra1/automa-workflow-generator.git .agents/skills/automa-workflow-generator
```

For personal Codex use, clone it into `~/.codex/skills/automa-workflow-generator` instead. Then invoke `$automa-workflow-generator` or ask your agent to create an Automa workflow.

Node.js is required to run the included generator. It uses only built-in Node modules. A Node JavaScript tool can load the exported `compile(input)` function from `scripts/automa-workflow-generator.js`.

## Included files

- `SKILL.md` gives agent instructions and routes agents to the right references.
- `scripts/automa-workflow-generator.js` builds the Automa block package.
- `references/AI-BEST-PRACTICES.md` covers workflow design, selectors, branches, variables, tables, and JavaScript blocks.
- `references/README-automa-workflow-generator.md` documents supported block types, fields, CLI use, and package structure.
- `references/ai-input-schema.json` lists supported fields and values.
- `examples/` contains simple and full workflow inputs with their generated outputs.
- `agents/openai.yaml` provides Codex skill list metadata.

## Use

By default, the agent returns simple input JSON with `blocks`, `edges`, and optional `layout`, followed by one short conversion instruction. To convert that input to the package that Automa accepts when pasted into an existing workflow, save it as `input.json` and run:

```sh
node scripts/automa-workflow-generator.js input.json output.json
```

The generated `output.json` is an editor block package, not a standalone workflow export. The generator also exports `compile(input)` for Node-based JavaScript tools.

Print the schema or a complete sample input with `--schema` or `--example`.
