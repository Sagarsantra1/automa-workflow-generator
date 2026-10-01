# Automa block package generator

This tool converts simple workflow input JSON into an Automa block package that you can paste into an existing workflow.

The input format contains only the blocks, their settings, and how they connect. The generator adds the node and edge metadata Automa's editor expects. It does not create a workflow export.

## 1. What an AI should generate

The AI should give the generator **only the simple input JSON**, not Automa's final `nodes`/`edges` package.

The root object is:

```json
{
  "blocks": [],
  "edges": [],
  "layout": {}
}
```

`blocks` is required. `edges` is optional, but should normally be supplied to describe the workflow order.

Each block should look like:

```json
{
  "id": "unique-id",
  "type": "event-click",
  "description": "Click login",
  "data": {
    "selector": "button.login"
  },
  "position": {
    "x": 100,
    "y": 100
  }
}
```

Only `id` and `type` are needed for a normal block. `description`, `data`, and `position` are optional.

### Important rules for AI

1. Use **unique block IDs**. Edge `from` and `to` values must exactly match those IDs.
2. Use the block names listed in this README. Friendly aliases are also accepted.
3. Put block-specific settings inside `data`.
4. Do not create Automa's final `drawflow` object or edge IDs. The generator creates them.
5. Add a concise description to each block. Keep each description to **14 characters or fewer**.
6. Do not add conditional fields unless their controlling option makes them applicable.
7. Preserve values such as CSS selectors, XPath expressions, URLs, JavaScript, variables, and Automa expressions exactly.
8. Use current Automa expressions such as `{{variables.name}}` when a value must be evaluated at runtime. Preserve the expression syntax from an existing workflow when editing it.
9. When a block has branches, use the correct `edge.branch` value described below.

## 2. Description behavior

The generator copies descriptions from the simplified input. If a description exceeds 14 characters, it shortens it at a word boundary when possible.
The AI should add a concise description to each block and keep it to 14 characters or fewer.

Use either:

```json
"description": "Login click"
```

or:

```json
"data": {
  "description": "Login click"
}
```

A top-level `description` takes precedence over `data.description`.

Correct:

```json
{
  "id": "click-login",
  "type": "event-click",
  "description": "Login click",
  "data": {
    "selector": "#login"
  }
}
```

If no description is supplied, the generated block keeps Automa's empty description.

## 3. Edges and branches

A normal connection is:

```json
{
  "from": "click",
  "to": "text"
}
```

For ordinary one-output blocks, `branch` may be omitted. It is treated as output `1`.

Branching blocks need a specific branch value.

### Conditions

Each condition path needs an ID:

```json
{
  "id": "check",
  "type": "conditions",
  "paths": [
    {
      "id": "found",
      "name": "Found",
      "conditions": []
    },
    {
      "id": "missing",
      "name": "Missing",
      "conditions": []
    }
  ]
}
```

Connect to a condition path with its path ID:

```json
{ "from": "check", "to": "handle-found", "branch": "found" }
{ "from": "check", "to": "handle-missing", "branch": "missing" }
```

The fallback output is:

```json
{ "from": "check", "to": "fallback-handler", "branch": "fallback" }
```

`paths[].conditions` must use Automa's condition-builder structure when actual conditions are needed. An empty array is valid as a structural placeholder.

### Element Exists

`element-exists` has two outputs.

Use:

```json
{ "from": "exists", "to": "found", "branch": "true" }
{ "from": "exists", "to": "missing", "branch": "false" }
```

The generator maps `true` to Automa output `1` and `false` to output `2`.

### While Loop

`while-loop` has a normal loop/body output and a fallback/exit output:

```json
{ "from": "while", "to": "loop-body", "branch": "1" }
{ "from": "while", "to": "after-loop", "branch": "fallback" }
```

### Loop Data and Loop Elements

A loop must have a stable `loopId` when it is paired with a `loop-breakpoint`.

Example:

```json
{
  "id": "rows",
  "type": "loop-data",
  "loopId": "row-loop",
  "data": {
    "loopThrough": "data-columns"
  }
}
```

and:

```json
{
  "id": "back",
  "type": "loop-breakpoint",
  "data": {
    "loopId": "row-loop"
  }
}
```

Connect the breakpoint back to the loop block to repeat the loop:

```json
{ "from": "back", "to": "rows" }
```

The generator creates a loop ID automatically when one is omitted, but an AI should normally provide one when a loop-breakpoint is used.

## 4. Selectors

These blocks use Automa's common selector editor:

- `event-click`
- `get-text`
- `forms`
- `loop-elements`
- `element-scroll`
- `attribute-value`
- `element-exists`
- `upload-file`

The selector mode is:

```json
"findBy": "cssSelector"
```

or:

```json
"findBy": "xpath"
```

Automa supports exactly those two values.

Example CSS:

```json
"findBy": "cssSelector",
"selector": "button.login"
```

Example XPath:

```json
"findBy": "xpath",
"selector": "//button[@id='login']"
```

### Selector wait options

`waitForSelector` controls whether `waitSelectorTimeout` is used:

```json
"waitForSelector": true,
"waitSelectorTimeout": 5000
```

Do not add `waitSelectorTimeout` when it is not needed.

`markEl` is relevant to CSS selector mode. It is not a separate selector type.

## 5. Block formats

The following are the supported simple-input block types.

### trigger

Starts the workflow.

```json
{
  "id": "start",
  "type": "trigger",
  "description": "Start",
  "data": {
    "type": "manual"
  }
}
```

The generator accepts Automa trigger data such as:

```json
{
  "type": "manual",
  "interval": 60,
  "delay": 5,
  "date": "",
  "time": "00:00",
  "url": "",
  "shortcut": "",
  "days": [],
  "contextMenuName": "",
  "contextTypes": [],
  "parameters": [],
  "preferParamsInTab": false,
  "observeElement": {}
}
```

For multiple trigger definitions, `data.triggers` may contain objects with these trigger types:

`interval`, `cron-job`, `context-menu`, `date`, `specific-day`, `on-startup`, `visit-web`, `keyboard-shortcut`.

### active-tab

No extra parameters are required.

```json
{
  "id": "active",
  "type": "active-tab"
}
```

### note

Use a Note block for instructions that should remain visible on the workflow canvas. It does not run and cannot connect to workflow edges.

Set `noteFor` to the ID of a block to center the note below it. This is useful for reminding the user which workflow-table column to select or correct.

```json
{
  "id": "title-column-note",
  "type": "note",
  "noteFor": "get-title",
  "data": {
    "note": "Table column: Title (Text). Select or fix the destination on Get Text.",
    "color": "white",
    "fontSize": "regular"
  }
}
```

The generator centers this note below the `get-title` block and shifts it down if it would overlap another block. Do not add an edge to or from a Note block.

### event-click

```json
{
  "id": "click",
  "type": "event-click",
  "data": {
    "findBy": "cssSelector",
    "selector": "button.submit",
    "waitForSelector": true,
    "waitSelectorTimeout": 5000,
    "markEl": false,
    "multiple": false
  }
}
```

### get-text

```json
{
  "id": "title",
  "type": "get-text",
  "data": {
    "findBy": "cssSelector",
    "selector": "h1",
    "regex": "",
    "regexExp": ["g"],
    "prefixText": "",
    "suffixText": "",
    "includeTags": false,
    "useTextContent": false,
    "saveData": true,
    "dataColumn": "Title",
    "assignVariable": true,
    "variableName": "title",
    "addExtraRow": false,
    "extraRowValue": "",
    "extraRowDataColumn": ""
  }
}
```

`regexExp` may contain `g`, `i`, and `m`.

### forms

`forms.type` controls which parameters are relevant.

Allowed `type` values:

- `text-field`
- `select`
- `checkbox`
- `radio`

#### text-field

```json
{
  "id": "name",
  "type": "forms",
  "data": {
    "findBy": "cssSelector",
    "selector": "#name",
    "type": "text-field",
    "value": "John",
    "clearValue": true,
    "delay": 0
  }
}
```

#### select

First choose `selectOptionBy`.

Allowed values:

- `value`
- `first-option`
- `last-option`
- `custom-position`

For `value`:

```json
{
  "type": "select",
  "selectOptionBy": "value",
  "value": "India",
  "clearValue": true
}
```

For first option:

```json
{
  "type": "select",
  "selectOptionBy": "first-option"
}
```

For last option:

```json
{
  "type": "select",
  "selectOptionBy": "last-option"
}
```

For a custom position:

```json
{
  "type": "select",
  "selectOptionBy": "custom-position",
  "optionPosition": "2"
}
```

`optionPosition` must be a non-negative integer encoded as a string.

#### checkbox / radio

```json
{
  "type": "checkbox",
  "selected": true
}
```

or:

```json
{
  "type": "radio",
  "selected": false
}
```

Do not use `type: "text"`. Automa uses `text-field`.

### conditions

Use `paths` at the block level because the generator converts them into `data.conditions`:

```json
{
  "id": "check",
  "type": "conditions",
  "description": "Check",
  "paths": [
    { "id": "yes", "name": "Yes", "conditions": [] },
    { "id": "no", "name": "No", "conditions": [] }
  ]
}
```

Optional retry settings are stored under `data`:

```json
"data": {
  "retryConditions": false,
  "retryCount": 10,
  "retryTimeout": 1000
}
```

### delay

```json
{
  "id": "wait",
  "type": "delay",
  "data": {
    "time": 1000
  }
}
```

Time is in milliseconds.

### javascript-code

```json
{
  "id": "js",
  "type": "javascript-code",
  "data": {
    "context": "website",
    "timeout": 20000,
    "code": "console.log('hello');\nautomaNextBlock();",
    "everyNewTab": false,
    "runBeforeLoad": false,
    "preloadScripts": []
  }
}
```

Allowed `context` values are `website` and `background` when the editor exposes the context setting.

### loop-elements

```json
{
  "id": "items",
  "type": "loop-elements",
  "loopId": "item-loop",
  "data": {
    "findBy": "cssSelector",
    "selector": ".item",
    "maxLoop": "0",
    "reverseLoop": false,
    "waitForSelector": false,
    "loadMoreAction": "none"
  }
}
```

Allowed `loadMoreAction` values:

- `none`
- `click-element`
- `click-link`
- `scroll`
- `scroll-up`

Conditional fields:

```json
"loadMoreAction": "click-element",
"actionElSelector": ".load-more",
"actionElMaxWaitTime": 5
```

```json
"loadMoreAction": "click-link",
"actionElSelector": "a.next",
"actionElMaxWaitTime": 5,
"actionPageMaxWaitTime": 10
```

```json
"loadMoreAction": "scroll",
"actionElMaxWaitTime": 5,
"scrollToBottom": true
```

### loop-data

Allowed `loopThrough` values:

- `data-columns`
- `numbers`
- `google-sheets`
- `variable`
- `custom-data`
- `elements`

Numbers:

```json
{
  "type": "loop-data",
  "data": {
    "loopThrough": "numbers",
    "fromNumber": 1,
    "toNumber": 10
  }
}
```

Google Sheets:

```json
{
  "loopThrough": "google-sheets",
  "referenceKey": "abc123"
}
```

Variable:

```json
{
  "loopThrough": "variable",
  "variableName": "items"
}
```

Custom data:

```json
{
  "loopThrough": "custom-data",
  "loopData": "[{\"name\":\"A\"},{\"name\":\"B\"}]"
}
```

Elements:

```json
{
  "loopThrough": "elements",
  "elementSelector": ".item",
  "waitForSelector": true,
  "waitSelectorTimeout": 5000
}
```

For non-number loops, `maxLoop`, `startIndex`, `resumeLastWorkflow`, and `reverseLoop` may be used.

### new-tab

```json
{
  "id": "tab",
  "type": "new-tab",
  "data": {
    "url": "https://example.com",
    "active": true,
    "waitTabLoaded": true,
    "updatePrevTab": false,
    "inGroup": false,
    "customUserAgent": false,
    "tabZoom": 1
  }
}
```

If `customUserAgent` is true, provide `userAgent`.

`tabZoom` must be between `0.25` and `4.5`.

### switch-tab

Allowed `findTabBy` values:

- `match-patterns`
- `tab-title`
- `next-tab`
- `prev-tab`
- `tab-index`

Match pattern:

```json
{
  "findTabBy": "match-patterns",
  "matchPattern": "https://example.com/*"
}
```

Tab title:

```json
{
  "findTabBy": "tab-title",
  "tabTitle": "Example"
}
```

Tab index:

```json
{
  "findTabBy": "tab-index",
  "tabIndex": 2
}
```

When `createIfNoMatch` is true with `match-patterns` or `tab-title`, provide `url` for the tab to create.

### data-mapping

`dataSource` is either `table` or `variable`.

Table mapping:

```json
{
  "id": "map",
  "type": "data-mapping",
  "data": {
    "dataSource": "table",
    "sources": [
      {
        "id": "s1",
        "name": "Title",
        "destinations": [
          { "id": "d1", "name": "title" }
        ]
      }
    ]
  }
}
```

Variable source:

```json
{
  "dataSource": "variable",
  "varSourceName": "items"
}
```

### insert-data

`dataList` is an array of data definitions. Keep the structure used by Automa for the intended data type.

Example:

```json
{
  "type": "insert-data",
  "data": {
    "dataList": [
      {
        "name": "Result",
        "type": "table",
        "value": "{{title}}"
      }
    ]
  }
}
```

### element-exists

```json
{
  "id": "exists",
  "type": "element-exists",
  "data": {
    "findBy": "cssSelector",
    "selector": ".result",
    "tryCount": 2,
    "timeout": 500,
    "throwError": false
  }
}
```

Outputs are `true` and `false` at the input level. The generator maps them to Automa outputs `1` and `2`.

### http-request

`http-request` is an alias for the Automa `webhook` task in this generator.

```json
{
  "id": "request",
  "type": "http-request",
  "data": {
    "method": "POST",
    "url": "https://example.com/hook",
    "contentType": "json",
    "timeout": 10000,
    "headers": [],
    "body": "{\"name\":\"{{title}}\"}",
    "responseType": "json"
  }
}
```

Allowed methods:

`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`

Allowed content types:

- `text`
- `json`
- `form-data`
- `form`

Allowed response types:

- `json`
- `text`
- `base64`

`dataPath` is relevant when `responseType` is `json`.

### while-loop

Use the same condition structure as `conditions`, but stored in `data.conditions` by this block.

```json
{
  "id": "while",
  "type": "while-loop",
  "data": {
    "conditions": [],
    "retryConditions": false,
    "retryCount": 10,
    "retryTimeout": 1000
  }
}
```

For named condition paths in the simple input, prefer:

```json
"paths": [
  { "id": "again", "name": "Again", "conditions": [] }
]
```

The normal output is `1`; exit is `fallback`.

### notification

```json
{
  "type": "notification",
  "data": {
    "title": "Done",
    "message": "Workflow complete",
    "iconUrl": "",
    "imageUrl": ""
  }
}
```

### execute-workflow

```json
{
  "type": "execute-workflow",
  "data": {
    "workflowId": "child-workflow",
    "executeId": "run1",
    "globalData": "",
    "insertAllVars": false,
    "insertAllGlobalData": false,
    "insertVars": ""
  }
}
```

### press-key

Allowed `action` values:

- `press-key`
- `multiple-keys`

Single key:

```json
{
  "type": "press-key",
  "data": {
    "selector": "input",
    "action": "press-key",
    "keys": "Enter",
    "pressTime": "0"
  }
}
```

Multiple keys:

```json
{
  "type": "press-key",
  "data": {
    "action": "multiple-keys",
    "keysToPress": "Control+A",
    "pressTime": "0"
  }
}
```

### element-scroll

```json
{
  "type": "element-scroll",
  "data": {
    "findBy": "cssSelector",
    "selector": "html",
    "scrollY": 500,
    "scrollX": 0,
    "incX": false,
    "incY": false,
    "smooth": false,
    "scrollIntoView": false
  }
}
```

### attribute-value

Allowed `action` values are `get` and `set`.

Get:

```json
{
  "type": "attribute-value",
  "data": {
    "findBy": "cssSelector",
    "selector": "a.next",
    "action": "get",
    "attributeName": "href",
    "assignVariable": true,
    "variableName": "nextUrl"
  }
}
```

Set:

```json
{
  "type": "attribute-value",
  "data": {
    "findBy": "cssSelector",
    "selector": "input",
    "action": "set",
    "attributeName": "value",
    "attributeValue": "hello"
  }
}
```

### new-window

Allowed `type` values:

`normal`, `popup`, `panel`

Allowed `windowState` values:

`normal`, `minimized`, `maximized`, `fullscreen`

Geometry fields apply when `windowState` is `normal`:

```json
{
  "type": "new-window",
  "data": {
    "type": "popup",
    "url": "https://example.com",
    "windowState": "normal",
    "top": 0,
    "left": 0,
    "width": 800,
    "height": 600,
    "incognito": false
  }
}
```

### upload-file

```json
{
  "type": "upload-file",
  "data": {
    "findBy": "cssSelector",
    "selector": "input[type=file]",
    "filePaths": [
      "C:/tmp/test.pdf"
    ]
  }
}
```

`filePaths` may contain paths, URLs, or base64 data depending on the Automa runtime and environment.

### handle-download

```json
{
  "type": "handle-download",
  "data": {
    "timeout": 20000,
    "downloadId": "",
    "waitForDownload": true,
    "filename": "result",
    "onConflict": "uniquify"
  }
}
```

Allowed `onConflict` values:

- `uniquify`
- `overwrite`
- `prompt`

If `downloadId` is non-empty, filename/conflict settings are not the active editor branch.

If `waitForDownload` is true, save/variable fields may be supplied:

```json
{
  "waitForDownload": true,
  "saveData": true,
  "dataColumn": "File",
  "assignVariable": true,
  "variableName": "filePath"
}
```

### take-screenshot

Allowed `type` values:

- `page`
- `fullpage`
- `element`

Example element screenshot:

```json
{
  "type": "take-screenshot",
  "data": {
    "type": "element",
    "selector": ".result",
    "saveToComputer": true,
    "fileName": "result",
    "ext": "png"
  }
}
```

For JPEG, `quality` is used:

```json
{
  "ext": "jpeg",
  "quality": 80
}
```

If `saveToColumn` is true, provide `dataColumn`.

If `assignVariable` is true, provide `variableName`.

### increase-variable

```json
{
  "type": "increase-variable",
  "data": {
    "variableName": "page",
    "increaseBy": 1
  }
}
```

### clipboard

Allowed `type` values:

- `get`
- `insert`

Get clipboard content:

```json
{
  "type": "clipboard",
  "data": {
    "type": "get",
    "assignVariable": true,
    "variableName": "clip",
    "saveData": false
  }
}
```

Insert content:

```json
{
  "type": "clipboard",
  "data": {
    "type": "insert",
    "dataToCopy": "{{title}}",
    "copySelectedText": false
  }
}
```

### loop-breakpoint

```json
{
  "type": "loop-breakpoint",
  "data": {
    "loopId": "row-loop",
    "clearLoop": false
  }
}
```

### go-back

```json
{ "id": "back", "type": "go-back" }
```

### forward-page

```json
{ "id": "forward", "type": "forward-page" }
```

### close-tab

Allowed `closeType` values are `tab` and `window`.

Close active tab:

```json
{
  "type": "close-tab",
  "data": {
    "closeType": "tab",
    "activeTab": true
  }
}
```

Close a tab by URL pattern:

```json
{
  "type": "close-tab",
  "data": {
    "closeType": "tab",
    "activeTab": false,
    "url": "https://example.com/*"
  }
}
```

Close windows:

```json
{
  "type": "close-tab",
  "data": {
    "closeType": "window",
    "allWindows": false
  }
}
```

### browser-event

```json
{
  "type": "browser-event",
  "data": {
    "eventName": "tab:loaded",
    "timeout": 10000,
    "setAsActiveTab": true,
    "activeTabLoaded": true,
    "tabLoadedUrl": "",
    "tabUrl": "",
    "fileQuery": ""
  }
}
```

### export-data

```json
{
  "type": "export-data",
  "data": {
    "name": "result",
    "refKey": "",
    "type": "json",
    "variableName": "",
    "csvDelimiter": ",",
    "addBOMHeader": true,
    "onConflict": "uniquify",
    "dataToExport": "data-columns"
  }
}
```

## 6. Automa block aliases

The generator accepts these common aliases:

```text
click            -> event-click
getText          -> get-text
javascript       -> javascript-code
http-request     -> webhook
webhook          -> webhook

The canonical names should still be preferred in AI-generated JSON.
```

## 7. Block package example

The bundled generator can print a large reference workflow that demonstrates the supported block formats:

```bash
node automa-workflow-generator.js --example
```

That command returns simple input JSON. Convert it into an Automa block package with:

```bash
node automa-workflow-generator.js --example > full-input.json
node automa-workflow-generator.js full-input.json full-output.json
```

The generated result uses Automa's `automa-blocks` clipboard package format. Copy the JSON, focus the existing workflow editor, and paste it there.

A copy of the simple input and generated package is included with this project as:

- `full-workflow-input.json`
- `full-block-package-output.json`

`example-input.json` and `example-output.json` adapt the supplied LOTM chapter scraper. The package reads chapter text from the active tab, saves it, then clicks the next chapter link. Its selectors depend on that site's page structure.

The `blocks-group` type preserves existing Automa block groups when an AI edits a workflow. It is a structural wrapper. Do not use it to add new actions.

## 8. AI schema from the JS tool

The JS generator contains machine-readable input and output guidance. `AI-BEST-PRACTICES.md` gives the AI the workflow rules and Automa references to use with the schema.

Run:

```bash
node automa-workflow-generator.js --schema
```

This prints `ai-input-schema.json` style information describing blocks, fields, conditional parameters, selector rules, aliases, and graph rules.

An AI generating workflow JSON should use this schema together with this README.

## 9. CLI

Generate a workflow:

```bash
node automa-workflow-generator.js input.json output.json
```

Print to stdout:

```bash
node automa-workflow-generator.js input.json
```

Show help:

```bash
node automa-workflow-generator.js --help
```

Print the machine-readable AI schema:

```bash
node automa-workflow-generator.js --schema
```

Print the complete reference input workflow:

```bash
node automa-workflow-generator.js --example
```

Print version:

```bash
node automa-workflow-generator.js --version
```

## 10. What the generator adds

The simple input JSON does not need Automa internal graph metadata.

The generator creates:

- Automa node IDs when an input ID is missing.
- Automatic node positions when `position` is not supplied.
- Automa node component types and required export fields.
- Vue Flow edge IDs and edge metadata, including branch handles.
- Default Automa block fields, then applies the user-supplied `data` values.
- The `automa-blocks` wrapper that Automa's editor uses for pasted blocks.

The generated object has this top-level shape:

```json
{
  "name": "automa-blocks",
  "data": {
    "nodes": [],
    "edges": []
  }
}
```

## 11. Do not manually build the block package

An AI should not manually construct the editor package:

```json
{
  "name": "automa-blocks",
  "data": {
    "nodes": [{ "id": "...", "handleBounds": "..." }],
    "edges": []
  }
}
```

It should output only the simple input:

```json
{
  "blocks": [
    { "id": "start", "type": "trigger" },
    { "id": "click", "type": "event-click", "data": { "selector": "button.login" } }
  ],
  "edges": [
    { "from": "start", "to": "click" }
  ]
}
```

Then run the generator.

## 12. Recommended AI generation process

When an AI receives a natural-language automation request:

1. Identify the actions in execution order and find any real repeated work.
2. Choose the smallest Automa block that performs each action.
3. Use one loop body for repeated records, pages, or elements. Do not copy the same steps for each item or add a loop when there is no repetition.
4. Give every block a unique short ID and a description of 14 characters or fewer.
5. Add only relevant settings and connect the blocks with edges.
6. Add `branch` for Conditions, Element Exists, and While Loop outputs.
7. Give related loop blocks the same `loopId` and place the breakpoint at the end of the repeated steps.
8. Validate enum values against this README or `--schema`.
9. Return the simple input JSON with `blocks`, `edges`, and optional `layout` in a code block. Follow it with one short instruction to save it as `input.json` and run `node scripts/automa-workflow-generator.js input.json output.json`.
10. Return the generated `automa-blocks` package unchanged only when the user asks for the paste package. It is for an existing workflow, not a standalone workflow export.

## 13. Validation behavior

The generator rejects invalid enum values and malformed references. Examples include:

- unsupported block type
- unknown edge node ID
- invalid selector mode
- invalid Forms type
- invalid Forms `selectOptionBy`
- invalid Loop Data `loopThrough`
- invalid Loop Elements `loadMoreAction`
- invalid Switch Tab `findTabBy`
- invalid Attribute Value action
- invalid Press Key action
- invalid Clipboard type
- invalid Screenshot type or extension
- invalid download conflict mode
- invalid New Window type/state
- invalid Webhook method/content/response type
- invalid tab zoom

Fix the simple JSON rather than editing the generated Automa JSON manually.

## 14. Current implementation boundary

This README documents the behavior implemented by `automa-workflow-generator.js`. The generator is designed around Automa's task/editor structures and the conditional fields used by the corresponding Automa editors.

When Automa changes its internal schema, compare this README and `--schema` output against the newer Automa source before relying on old input examples.
