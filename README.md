# Automa workflow generator

An installable agent skill for creating and editing Automa browser automation workflows. It includes a Node.js generator that converts simple workflow JSON into the block package Automa accepts when you paste into an existing workflow.

## Install

Clone this repository into a project's .agents/skills/automa-workflow-generator folder:

```sh
git clone https://github.com/Sagarsantra1/automa-workflow-generator.git .agents/skills/automa-workflow-generator
```

For personal Codex use, clone it into ~/.codex/skills/automa-workflow-generator instead. Then invoke $automa-workflow-generator or ask your agent to create an Automa workflow.

Node.js is required to run the included generator. It uses only built-in Node modules.

## Use

The agent creates JSON with blocks and edges, runs scripts/automa-workflow-generator.js, then returns the generated automa-blocks package unchanged. See SKILL.md for workflow guidance and references/ai-input-schema.json for supported block fields and values.

```sh
node scripts/automa-workflow-generator.js input.json output.json
```

Print the schema or a complete sample input with --schema or --example.
