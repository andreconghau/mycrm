# Graph Report - ccc  (2026-11-06)

## Corpus Check
- 89 files · ~210,793 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 16 file(s) not represented in the graph (top: (none) 9, .toml 4, .cmd 1)

## Summary
- 1010 nodes · 2690 edges · 54 communities (41 shown, 13 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 78 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dbaa567f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- resumeSession
- setLiveState
- modern-screenshot.umd.js
- live-browser.js
- initPageChat
- R1RoutePage
- renderDesignVisual
- createLiveBrowserDomHelpers
- handleManualEditActivity
- scheduleAcceptCleanup
- captureElementToBlob
- initGlobalBar
- connectSSE
- createLiveBrowserSessionState
- compilerOptions
- documentRefForElement
- resolveLiveInjectionAnchor
- components.json
- devDependencies
- graph.sh
- postgres
- showBar
- market-context.tsx
- @types/node@26.6.6
- actOnAgentTarget
- next
- workspace-shell.tsx
- r1-route-data.ts
- restoreSessionWithoutWrapper
- mountSvelteComponentVariant
- openTunePopover
- package.json
- scripts
- interface
- syncEditBadgeHitProxies
- interface
- postcss@8.5.32
- live-browser-ignores.js
- utils.ts
- interface
- interface
- eslint
- vitest
- @playwright/test
- start.sh
- overrides
- stop.sh
- postcss.config.mjs
- prettier.config.mjs

## God Nodes (most connected - your core abstractions)
1. `R1RoutePage()` - 35 edges
2. `connectSSE()` - 34 edges
3. `resumeSession()` - 33 edges
4. `setLiveState()` - 33 edges
5. `showToast()` - 31 edges
6. `initGlobalBar()` - 30 edges
7. `el()` - 29 edges
8. `buildInsertConfigureRow()` - 28 edges
9. `cleanup()` - 27 edges
10. `handleKeyDown()` - 27 edges

## Surprising Connections (you probably didn't know these)
- `teardown()` --indirect_call--> `stopFocusOutIntoChrome()`  [INFERRED]
  .agents/skills/impeccable/scripts/live-browser.js → .agents/skills/impeccable/scripts/live-browser-dom.js
- `init()` --indirect_call--> `stopFocusOutIntoChrome()`  [INFERRED]
  .agents/skills/impeccable/scripts/live-browser.js → .agents/skills/impeccable/scripts/live-browser-dom.js
- `DashboardPage()` --calls--> `MarketDashboard()`  [EXTRACTED]
  src/app/[locale]/(workspace)/dashboard/page.tsx → src/modules/markets/market-dashboard.tsx
- `WorkspaceLayout()` --calls--> `WorkspaceShell()`  [EXTRACTED]
  src/app/[locale]/(workspace)/layout.tsx → src/components/layout/workspace-shell.tsx
- `WorkspaceShell()` --calls--> `MarketProvider()`  [EXTRACTED]
  src/components/layout/workspace-shell.tsx → src/modules/markets/market-context.tsx

## Import Cycles
- None detected.

## Communities (54 total, 13 thin omitted)

### Community 0 - "resumeSession"
Cohesion: 0.12
Nodes (34): applyPlaceholderDimensions(), checkpointPayload(), clearHandled(), commitAcceptedVariantToDom(), completeParameterGenerationIfReady(), completeParameterPublication(), completeSourceInjection(), ensureInsertPlaceholder() (+26 more)

### Community 1 - "setLiveState"
Cohesion: 0.07
Nodes (87): abandonForeignSession(), abandonSupersededGo(), abortSvelteComponentInjection(), applyEditing(), beginNewLiveConfiguration(), cancelEditing(), cancelEditingToPicking(), cancelInsertConfigure() (+79 more)

### Community 2 - "modern-screenshot.umd.js"
Cohesion: 0.09
Nodes (53): ae(), be(), bt(), Ce(), Ct(), de(), dt(), _e() (+45 more)

### Community 3 - "live-browser.js"
Cohesion: 0.05
Nodes (57): applyLiveBarPreference(), applyParamDefaults(), applyParamValue(), applyPlaceholderSizingStyles(), applySavedParamValues(), buildInsertPlaceholderSnapshotFromDom(), buildLocatorForLeaf(), buildPickedAnchorSnapshot() (+49 more)

### Community 4 - "initPageChat"
Cohesion: 0.08
Nodes (49): applyGlobalBarLabelState(), armPageChatForTyping(), attachSteerFocusDebug(), attachSteerFocusGuard(), clearSteerAwaitTimer(), clearSteerFocusRecoverTimer(), collapsePageChat(), expandPageChat() (+41 more)

### Community 5 - "R1RoutePage"
Cohesion: 0.10
Nodes (21): ModulePage(), ModulePage(), ModulePage(), ModulePage(), ModulePage(), ModulePage(), ModulePage(), ModulePage() (+13 more)

### Community 6 - "renderDesignVisual"
Cohesion: 0.07
Nodes (41): buildCollapsible(), buildColorModels(), buildDesignHeader(), buildListHtml(), buildRadiiModels(), buildTypographyModels(), copyToClipboard(), cssSafe() (+33 more)

### Community 7 - "createLiveBrowserDomHelpers"
Cohesion: 0.10
Nodes (24): collectEditableTextRows(), visit(), createLiveBrowserDomHelpers(), activeElementDeep(), cloneWithoutChrome(), copyTextViaSelection(), cssId(), liveUiRoot() (+16 more)

### Community 8 - "handleManualEditActivity"
Cohesion: 0.17
Nodes (26): clearStoredManualApplyState(), fetchPendingCount(), handleManualEditActivity(), hidePendingApplyDock(), manualApplyLoadingText(), manualApplyStateKey(), manualEditEventForCurrentPage(), numberOrNull() (+18 more)

### Community 9 - "scheduleAcceptCleanup"
Cohesion: 0.31
Nodes (11): acceptedDomAlreadyClean(), clearHandledWrapperReloadStamp(), deferredRecoverySuperseded(), ensureAcceptedDomClean(), findAcceptedRuntimeWrappers(), handledWrapperReloadKey(), reloadAfterMissingAcceptedDom(), restoreAcceptedDomFromSnapshot() (+3 more)

### Community 10 - "captureElementToBlob"
Cohesion: 0.08
Nodes (38): averageRgb01(), beginEditPin(), bufferToBase64(), buildAnnotationsForCapture(), buildPinElement(), cancelEditingPin(), captureChromeNodes(), captureElementFromRenderedAncestor() (+30 more)

### Community 11 - "initGlobalBar"
Cohesion: 0.05
Nodes (76): actionLabel(), agentHasWorkInFlight(), agentStatusText(), barPaletteForTheme(), bindConfigureCountPillTooltip(), bindConfigureInlineControlHover(), bindConfigureModifierPillHover(), brandMarkSvg() (+68 more)

### Community 12 - "connectSSE"
Cohesion: 0.17
Nodes (23): connectSSE(), findLiveElementForSvelteManifest(), handleAccept(), hideShaderOverlay(), injectSvelteComponentsFromManifest(), injectVariantsFromSource(), isFrameworkComponentPreviewMode(), isJsxSourceFile() (+15 more)

### Community 13 - "createLiveBrowserSessionState"
Cohesion: 0.19
Nodes (17): createLiveBrowserSessionState(), clearHandled(), clearScrollY(), clearSession(), isHandled(), loadSession(), markHandled(), nextCheckpointRevision() (+9 more)

### Community 14 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx, lib (+11 more)

### Community 15 - "documentRefForElement"
Cohesion: 0.09
Nodes (29): addManualContextText(), canRestoreManualEditElement(), collectManualContextPieces(), walk(), contextElementForManualEdit(), copyEditContainerContext(), copyEditLeafContext(), cssIdent() (+21 more)

### Community 16 - "resolveLiveInjectionAnchor"
Cohesion: 0.16
Nodes (19): buildSvelteExpressionTextMap(), buildSveltePropValuesFromLiveElement(), buildSveltePropValuesV2(), cloneWithoutElements(), collectTextNodes(), collectVisibleTexts(), cssEscapeIdent(), elementMatchesOriginalMarkup() (+11 more)

### Community 17 - "components.json"
Cohesion: 0.11
Nodes (18): aliases, components, hooks, lib, ui, utils, iconLibrary, packageManager (+10 more)

### Community 18 - "devDependencies"
Cohesion: 0.09
Nodes (22): devDependencies, jsdom@31.0.0, prettier@3.9.10, prettier-plugin-tailwindcss@0.8.1, tailwindcss@4.3.4, @tailwindcss/postcss@4.3.4, @testing-library/dom@10.4.2, @testing-library/jest-dom@7.0.1 (+14 more)

### Community 20 - "postgres"
Cohesion: 0.11
Nodes (17): path, required, interval, retries, start_period, test, timeout, env_file (+9 more)

### Community 21 - "showBar"
Cohesion: 0.16
Nodes (19): applyConfigureBarChrome(), buildCyclingRow(), buildDots(), buildGeneratingRow(), cycleVariant(), cyclingCounterText(), cyclingShownVariant(), ensureCyclingRenderable() (+11 more)

### Community 22 - "market-context.tsx"
Cohesion: 0.22
Nodes (10): react@19.3.1, react, MarketContext, MarketProvider(), selectMarket(), serverSnapshot(), snapshot(), subscribe() (+2 more)

### Community 24 - "actOnAgentTarget"
Cohesion: 0.29
Nodes (17): actOnAgentTarget(), agentTargetBusyReason(), agentTargetOverlayGone(), agentTargetTaken(), claimAgentTarget(), claimAndActOnAgentTarget(), declineAgentTargetBusy(), declineAgentTargetUnresolvable() (+9 more)

### Community 25 - "next"
Cohesion: 0.13
Nodes (4): nextConfig, next@16.4.5, next, metadata

### Community 26 - "workspace-shell.tsx"
Cohesion: 0.15
Nodes (10): WorkspaceLayout(), dict, Locale, Messages, NavLink(), navNames, WorkspaceContent(), WorkspaceShell() (+2 more)

### Community 27 - "r1-route-data.ts"
Cohesion: 0.09
Nodes (10): DashboardPage(), MarketDashboard(), customer(), market(), product(), R1Route, routeRows(), scoped() (+2 more)

### Community 28 - "restoreSessionWithoutWrapper"
Cohesion: 0.23
Nodes (13): applySavedSessionMeta(), clampVariantIndex(), findActiveSessionSummary(), findAdoptableServerSession(), isSessionHandled(), isTerminalSessionSummary(), loadSession(), normalizePagePath() (+5 more)

### Community 29 - "mountSvelteComponentVariant"
Cohesion: 0.29
Nodes (11): applyOriginalAttrsToSvelteAnchor(), commitAcceptedSvelteComponentToDom(), componentModuleCandidates(), describeMountFailure(), detectDevServerBase(), getMountedSvelteComponentAnchor(), importFirstReachable(), loadSvelteRuntime() (+3 more)

### Community 30 - "openTunePopover"
Cohesion: 0.28
Nodes (9): closedClipPath(), hideParamsPanel(), openTunePopover(), parseVariantParams(), popoverDirection(), positionParamsPanel(), setClipPath(), showParamsPanel() (+1 more)

### Community 31 - "package.json"
Cohesion: 0.16
Nodes (15): dependencies, class-variance-authority@0.7.1, lucide-react@1.69.0, react-dom@19.3.1, tw-animate-css@1.4.0, engines, node, name (+7 more)

### Community 32 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, dev, format, format:check, lint, start, test (+3 more)

### Community 33 - "interface"
Cohesion: 0.20
Nodes (9): interface, brand_color, default_prompt, display_name, icon_large, icon_small, short_description, policy (+1 more)

### Community 35 - "syncEditBadgeHitProxies"
Cohesion: 0.27
Nodes (10): bindEditBadgeProxy(), editBadgeProxyTargets(), initEditBadge(), initEditBadgeHitProxies(), positionEditBadge(), proxyMouseEvent(), setImportantStyle(), styleEditBadgeProxy() (+2 more)

### Community 36 - "interface"
Cohesion: 0.25
Nodes (7): interface, brand_color, default_prompt, display_name, short_description, policy, allow_implicit_invocation

### Community 38 - "live-browser-ignores.js"
Cohesion: 0.52
Nodes (6): globToRegex(), matchesScope(), normalizeIgnoreRule(), normalizeIgnoreValue(), pageCandidates(), resolveDetectIgnores()

### Community 39 - "utils.ts"
Cohesion: 0.33
Nodes (5): clsx@2.1.1, tailwind-merge@3.7.0, clsx, tailwind-merge, cn()

### Community 40 - "interface"
Cohesion: 0.33
Nodes (5): interface, display_name, short_description, policy, allow_implicit_invocation

### Community 43 - "interface"
Cohesion: 0.40
Nodes (4): interface, default_prompt, display_name, short_description

### Community 44 - "eslint"
Cohesion: 0.40
Nodes (4): eslint@9.39.5, eslint-config-next@16.4.5, eslint, eslint-config-next

### Community 45 - "vitest"
Cohesion: 0.40
Nodes (4): @vitejs/plugin-react@6.2.1, vitest@5.1.0, @vitejs/plugin-react, vitest

### Community 49 - "overrides"
Cohesion: 0.67
Nodes (3): overrides, @typescript-eslint/typescript-estree, minimatch

## Knowledge Gaps
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `workspace-shell.tsx`, `r1-route-data.ts`, `R1RoutePage`, `package.json`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Should `resumeSession` be split into smaller, more focused modules?**
  _Cohesion score 0.12477718360071301 - nodes in this community are weakly interconnected._
- **Why does `stopFocusOutIntoChrome()` connect `createLiveBrowserDomHelpers` to `setLiveState`, `initGlobalBar`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Should `setLiveState` be split into smaller, more focused modules?**
  _Cohesion score 0.06511746680286006 - nodes in this community are weakly interconnected._
- **Should `modern-screenshot.umd.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08583959899749373 - nodes in this community are weakly interconnected._
- **Should `live-browser.js` be split into smaller, more focused modules?**
  _Cohesion score 0.049667178699436765 - nodes in this community are weakly interconnected._
- **Should `initPageChat` be split into smaller, more focused modules?**
  _Cohesion score 0.07993197278911565 - nodes in this community are weakly interconnected._