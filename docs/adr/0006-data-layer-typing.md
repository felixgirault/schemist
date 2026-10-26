# 6. Typing and layering of the data layer

- Status: accepted
- Date: 2026-10-26

## Context

The data layer works: the `Node` tree is the only mutable source,
everything else is derived from it, and history and persistence
work on immutable snapshots (ADR 2). But its types promise more
than the runtime guarantees, and domain code lives in the state
layer, which makes the model harder to read than it should be.

### Data flow

1. On mount, `getRootNode` reads the `preset` URL parameter, else
   `localStorage`, else picks a random color. The string is
   unpacked to a `PresetNode`, then `parseTree` builds the `Node`
   tree, set as `palette.root`.
2. Components mutate nodes directly: `bind:value` on
   `node.args[name]`, `token`, `isHidden`, `setType`, `addChild`,
   `destroy`, `expandPreset`.
3. Each node derives its `input` from its parent's `output`, its
   `output` from its definition, and the colors of a preset from
   `evaluateTree`.
4. `palette.outputs` walks the whole tree on every change, and is
   debounced into `palette.debouncedOutputs`, which feeds
   `rootColor`, combinations and exports.
5. An effect serializes the tree on every change and records it
   in history, which persists it to the URL and `localStorage`
   after 300 ms. Undo and redo rebuild the whole tree with
   `parseTree`.

### Current state

| Concern                        | State                                                                    | Impact                                                                         |
| ------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `defs` registry                | Typed `Record<string, NodeDef>` to avoid a circular type                 | `keyof typeof defs` is `string`: a typo in a preset's `build` compiles         |
| `Args`                         | `{[name: string]: any}`                                                  | Params and `apply` arguments are unrelated, `apply` reads `any`                |
| `PresetNode`                   | One type for templates, unpacked permalinks and snapshots                | Ids are optional everywhere, so `evaluateTree` asserts them with `id!`         |
| `palette.root`                 | `$state<Node>(undefined!)`                                               | Typed as always set, while every reader checks it                              |
| Unpacking (`packing/v1.ts`)    | Casts (`as IntermediatePresetNode`, `as number`), no check of types/args | Unknown types throw by accident, unknown args become `undefined` values        |
| `nodes.svelte.ts`              | Domain types, pure evaluation and the reactive `Node` class              | Definitions import their types from `#lib/stores/`                             |
| `collectOutputs`               | Same visibility rules as `evaluateTree`, on the `Node` tree              | Two implementations of the same rules, which can drift apart                   |
| `Node.children`, `Node.parent` | Public and writable                                                      | The two-way link only holds if callers go through the methods                  |
| Presets without children       | Enforced by `parseTree` and the interface                                | `addChild` on a preset is accepted, and its outputs are silently lost          |
| Store effects                  | `$effect.root` at module level in `palette` and `history`                | Importing a store starts persistence, which hides the wiring and hinders tests |
| `NodeOutput`                   | `[color, name]` tuple                                                    | Read as `output[0]` and `output[1]`, remapped to `{color, name}` by `Entry`    |
| `Entry`                        | Defined in `combinations`, used by exports                               | A palette color is defined by one of its consumers                             |
| Combinations                   | Nested ternaries pick simulation and contrast functions, `grade: string` | Not exhaustive, `'none'` allowed among simulated contrasts                     |

### Naming

"Preset" means two things: `PresetNode`, the serialized format of
any tree, and `PresetDef`, a parametric preset (ADR 4). Both meet
in the same files, as in `isPresetDef` next to
`parseTree(preset: PresetNode)`.

## Decision

### Node types

Type codes are persistent ids, as they end up in permalinks. They
are listed as a union, which breaks the circular type, and the
registry is checked against it both ways:

```ts
export type NodeType = 'anl' | 'cmp' | … | 'lsc' | 'hrm' | …;

const defs: {[T in NodeType]: NodeDef & {type: T}} = {…};
```

`PresetNode.type`, `createNode` and `setType` take a `NodeType`,
and `serializeTree` no longer casts.

### Arguments

Definitions are generic over their params, so that `apply` and
`build` receive typed arguments:

```ts
type ParamValue<P> = P extends RangeParam
	? number
	: P extends BooleanParam
		? boolean
		: SchemistColor;

type ArgsOf<P extends readonly Param[]> = {
	[K in P[number] as K['name']]: ParamValue<K>;
};

type NodeDef<P extends readonly Param[] = readonly Param[]> = {
	params: P;
	// Method syntax, so that any definition fits the registry.
	apply(color: SchemistColor, args: ArgsOf<P>): SchemistColor;
	…
};

export const defineNode = <const P extends readonly Param[]>(
	def: NodeDef<P>
) => def;
```

Definitions use `defineNode` (and `definePreset`) instead of
`satisfies`. Outside of definitions, arguments are
`Record<string, ParamValue>` instead of `any`, and fields bound
to them narrow on the param type.

### Tree data

- `PresetNode` becomes `NodeData`, and `presets.ts` becomes
  `tree.ts`. "Preset" only refers to parametric presets.
- `withIds` and `serializeTree` return nodes whose ids are set,
  recursively, so `evaluateTree` needs no assertion.
- Unpacking validates what it gets, as it is the only way in from
  URLs and storage: unknown types throw, and only args of known
  params with valid values are kept. Trees built in code are
  checked by the compiler instead.
- `palette.root` is typed `Node | undefined`.

### Layers

- Domain types and pure functions (`Param`, `NodeDef`,
  `NodeData`, `evaluateTree`, `withIds`, `remapArgs`,
  `generateName`, `changedArg`) move to `#lib/model/`, without
  runes. Definitions import from there.
- `#lib/stores/` only holds reactive state: the `Node` class,
  with the conversions between nodes and `NodeData` as they
  create nodes, and the stores.
- `startHistory` sets up the history effect and returns its
  cleanup, instead of a module-level `$effect.root`.
- `debouncedOutputs` becomes `settledOutputs`, which says why it
  differs from `outputs`.

### Invariants

- `Node.children` and `Node.parent` are private, with getters,
  and only change through the tree methods.
- `addChild` refuses presets, and `setType` refuses to make a
  preset of a node that has children.
- A test checks that `collectOutputs` on a tree and
  `evaluateTree` on its serialization give the same outputs.

### Values

- `NodeOutput` becomes `{color, name}`.
- `Entry` becomes `PaletteColor`, and moves to the `palette`
  store along with `colorEntries`.
- Combinations pick their functions from records keyed by
  `ContrastType` and by simulated blindness type
  (`Exclude<BlindnessType, 'none'>`), and grades are unions.
- `exportSettings` is typed by an `ExportSettings` type instead
  of casts.

### Implementation steps

1. `NodeType` and the typed registry.
2. Typed arguments, starting with a prototype of `defineNode` on
   two definitions to check that the registry accepts them.
3. Ids typed after `withIds` and `serializeTree`, validation of
   unpacked trees, and an optional `palette.root`.
4. Rename `PresetNode` and `presets.ts`.
5. Move domain code to `#lib/model/`, and the history effect to
   `startHistory`.
6. Private links and invariants of `Node`, with the parity test.
7. `NodeOutput`, `PaletteColor`, combinations and export
   settings.
8. Update `SPEC.md` (§3 for the layout, §5 for the node tree, §6
   for definitions, §8 for application state).

Each step stands on its own and can be merged separately.

## Consequences

- Most mistakes in definitions and presets (unknown types, wrong
  argument names or kinds) are caught at compile time.
- Permalinks and storage are validated where they enter the
  application, rather than failing by accident.
- The model reads without knowing Svelte, and can be tested
  without the stores.
- Every definition file changes, mechanically, and
  `NodeOptions.svelte` needs a narrowing per param type.
- The permalink format doesn't change, as type codes and arg
  names stay the same.
- ADR 2 plans to replace the `Node` class with a plain definition
  (step 4). This ADR keeps the class, but moving the domain code
  to `#lib/model/` and typing `NodeData` is the groundwork for
  it.
