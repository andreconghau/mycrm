# Graph Report - ccc  (2026-11-06)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1011 nodes · 2691 edges · 60 communities (47 shown, 13 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 78 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `936b0ea2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- handleAccept
- setLiveState
- modern-screenshot.umd.js
- live-browser.js
- initPageChat
- R1RoutePage
- renderDesignVisual
- createLiveBrowserDomHelpers
- showToast
- mountSvelteComponentVariant
- onAnnotDown
- el
- injectSvelteComponentsFromManifest
- createLiveBrowserSessionState
- compilerOptions
- applyEditing
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
- connectSSE
- captureElementToBlob
- refreshParamsPanel
- package.json
- scripts
- handleInsertCreate
- syncEditBadgeHitProxies
- resumeSession
- postcss@8.5.32
- live-browser-ignores.js
- utils.ts
- interface
- interface
- initDesignPanel
- interface
- eslint
- vitest
- @playwright/test
- start.sh
- overrides
- stop.sh
- postcss.config.mjs
- prettier.config.mjs
- interface
- buildColorModels
- documentRefSegment
- scopeCssBlock

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
- `WorkspaceShell()` --calls--> `MarketProvider()`  [EXTRACTED]
  src/components/layout/workspace-shell.tsx → src/modules/markets/market-context.tsx
- `WorkspaceContent()` --calls--> `selectMarket()`  [EXTRACTED]
  src/components/layout/workspace-shell.tsx → src/modules/markets/market-context.tsx
- `WorkspaceLayout()` --calls--> `WorkspaceShell()`  [EXTRACTED]
  src/app/[locale]/(workspace)/layout.tsx → src/components/layout/workspace-shell.tsx

## Import Cycles
- None detected.

## Communities (60 total, 13 thin omitted)

### Community 0 - "handleAccept"
Cohesion: 0.24
Nodes (14): commitAcceptedVariantToDom(), ensureInsertPlaceholder(), findVariantsWrapper(), getVisibleVariantEl(), handleAccept(), isInsertGeneratingSession(), isVariantShown(), positionBar() (+6 more)

### Community 1 - "setLiveState"
Cohesion: 0.08
Nodes (76): agentStatusText(), barPaletteForTheme(), beginNewLiveConfiguration(), brandMarkSvg(), cancelEditing(), cancelEditingToPicking(), cancelInsertConfigure(), cleanup() (+68 more)

### Community 2 - "modern-screenshot.umd.js"
Cohesion: 0.09
Nodes (53): ae(), be(), bt(), Ce(), Ct(), de(), dt(), _e() (+45 more)

### Community 3 - "live-browser.js"
Cohesion: 0.06
Nodes (49): applyGlobalBarLabelState(), applyLiveBarPreference(), applyPlaceholderSizingStyles(), bufferToBase64(), buildPickedAnchorSnapshot(), collectFontCssText(), computeInsertPosition(), createInsertPlaceholder() (+41 more)

### Community 4 - "initPageChat"
Cohesion: 0.08
Nodes (54): agentHasWorkInFlight(), armPageChatForTyping(), attachSteerFocusDebug(), attachSteerFocusGuard(), buildSteerProcessingDots(), buildSteerQueueHint(), clearSteerAwaitTimer(), clearSteerFocusRecoverTimer() (+46 more)

### Community 5 - "R1RoutePage"
Cohesion: 0.10
Nodes (21): ModulePage(), ModulePage(), ModulePage(), ModulePage(), ModulePage(), ModulePage(), ModulePage(), ModulePage() (+13 more)

### Community 6 - "renderDesignVisual"
Cohesion: 0.10
Nodes (30): buildCollapsible(), buildListHtml(), buildRadiiModels(), copyToClipboard(), cssSafe(), designEmptyMessage(), escapeHtml(), fontStack() (+22 more)

### Community 7 - "createLiveBrowserDomHelpers"
Cohesion: 0.11
Nodes (23): collectEditableTextRows(), visit(), createLiveBrowserDomHelpers(), activeElementDeep(), cloneWithoutChrome(), copyTextViaSelection(), cssId(), liveUiRoot() (+15 more)

### Community 8 - "showToast"
Cohesion: 0.11
Nodes (37): abandonForeignSession(), abandonSupersededGo(), clearStoredManualApplyState(), discardOrphanedSession(), dismissToast(), fetchPendingCount(), handleDiscard(), handleManualEditActivity() (+29 more)

### Community 9 - "mountSvelteComponentVariant"
Cohesion: 0.12
Nodes (26): acceptedDomAlreadyClean(), applyOriginalAttrsToSvelteAnchor(), clearHandledWrapperReloadStamp(), commitAcceptedSvelteComponentToDom(), componentModuleCandidates(), deferredRecoverySuperseded(), describeMountFailure(), detectDevServerBase() (+18 more)

### Community 10 - "onAnnotDown"
Cohesion: 0.15
Nodes (21): applyPlaceholderDimensions(), beginEditPin(), buildAnnotationsForCapture(), buildPinElement(), cancelEditingPin(), clampPlaceholderSize(), finalizeEditingPin(), initAnnotOverlay() (+13 more)

### Community 11 - "el"
Cohesion: 0.08
Nodes (49): actionLabel(), applyConfigureBarChrome(), bindConfigureCountPillTooltip(), bindConfigureInlineControlHover(), bindConfigureModifierPillHover(), buildConfigureActionControl(), buildConfigureCountControl(), buildConfigureRow() (+41 more)

### Community 12 - "injectSvelteComponentsFromManifest"
Cohesion: 0.29
Nodes (10): abortSvelteComponentInjection(), findInsertAnchorInDom(), findLiveElementForSvelteManifest(), hideShaderOverlay(), injectSvelteComponentsFromManifest(), loadSvelteComponentParams(), removeStrayShaderNode(), saveSession() (+2 more)

### Community 13 - "createLiveBrowserSessionState"
Cohesion: 0.19
Nodes (17): createLiveBrowserSessionState(), clearHandled(), clearScrollY(), clearSession(), isHandled(), loadSession(), markHandled(), nextCheckpointRevision() (+9 more)

### Community 14 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx, lib (+11 more)

### Community 15 - "applyEditing"
Cohesion: 0.11
Nodes (28): addManualContextText(), applyEditing(), buildLocatorForLeaf(), canRestoreManualEditElement(), collectManualContextPieces(), walk(), contextElementForManualEdit(), copyEditContainerContext() (+20 more)

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
Cohesion: 0.24
Nodes (12): buildCyclingRow(), cycleVariant(), cyclingCounterText(), cyclingShownVariant(), ensureCyclingRenderable(), navBtn(), recoverEmptyCycling(), scheduleCyclingBarSync() (+4 more)

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

### Community 28 - "connectSSE"
Cohesion: 0.16
Nodes (23): applySavedSessionMeta(), clampVariantIndex(), connectSSE(), findActiveSessionSummary(), findAdoptableServerSession(), injectVariantsFromSource(), isFrameworkComponentPreviewMode(), isJsxSourceFile() (+15 more)

### Community 29 - "captureElementToBlob"
Cohesion: 0.16
Nodes (17): averageRgb01(), captureChromeNodes(), captureElementFromRenderedAncestor(), captureElementToBlob(), cssColorToRgb01(), dominantRgb01(), findBackdropAncestor(), findShaderProxyCaptureRoot() (+9 more)

### Community 30 - "refreshParamsPanel"
Cohesion: 0.12
Nodes (26): applyParamDefaults(), applyParamValue(), applySavedParamValues(), buildParamsPanel(), closedClipPath(), completeParameterGenerationIfReady(), completeParameterPublication(), completeSourceInjection() (+18 more)

### Community 31 - "package.json"
Cohesion: 0.16
Nodes (15): dependencies, class-variance-authority@0.7.1, lucide-react@1.69.0, react-dom@19.3.1, tw-animate-css@1.4.0, engines, node, name (+7 more)

### Community 32 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, dev, format, format:check, lint, start, test (+3 more)

### Community 33 - "handleInsertCreate"
Cohesion: 0.15
Nodes (15): buildInsertPlaceholderSnapshotFromDom(), captureAndEmit(), checkpointPayload(), compileShader(), enterRecoveryWaitingForAnchor(), handleInsertCreate(), queueCheckpoint(), resolveScrollLockAnchorTop() (+7 more)

### Community 35 - "syncEditBadgeHitProxies"
Cohesion: 0.27
Nodes (10): bindEditBadgeProxy(), editBadgeProxyTargets(), initEditBadge(), initEditBadgeHitProxies(), positionEditBadge(), proxyMouseEvent(), setImportantStyle(), styleEditBadgeProxy() (+2 more)

### Community 36 - "resumeSession"
Cohesion: 0.27
Nodes (11): clearHandled(), disableInlineEdit(), finalizeInsertSession(), findAnyVariantsWrapper(), pickPopulatedVariantsWrapper(), pickVariantContent(), readScrollY(), removeInsertPlaceholderDom() (+3 more)

### Community 38 - "live-browser-ignores.js"
Cohesion: 0.52
Nodes (6): globToRegex(), matchesScope(), normalizeIgnoreRule(), normalizeIgnoreValue(), pageCandidates(), resolveDetectIgnores()

### Community 39 - "utils.ts"
Cohesion: 0.33
Nodes (5): clsx@2.1.1, tailwind-merge@3.7.0, clsx, tailwind-merge, cn()

### Community 40 - "interface"
Cohesion: 0.20
Nodes (9): interface, brand_color, default_prompt, display_name, icon_large, icon_small, short_description, policy (+1 more)

### Community 41 - "interface"
Cohesion: 0.25
Nodes (7): interface, brand_color, default_prompt, display_name, short_description, policy, allow_implicit_invocation

### Community 42 - "initDesignPanel"
Cohesion: 0.39
Nodes (8): buildDesignHeader(), designPanelCss(), fetchDesignSystem(), initDesignPanel(), loadDesignPrefs(), renderDesignChrome(), saveDesignPrefs(), toggleDesignPanel()

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

### Community 56 - "interface"
Cohesion: 0.29
Nodes (6): interface, default_prompt, display_name, short_description, policy, allow_implicit_invocation

### Community 57 - "buildColorModels"
Cohesion: 0.33
Nodes (6): buildColorModels(), buildTypographyModels(), findProseDescription(), humanizeKey(), normalizeCssColor(), splitFontFamily()

### Community 58 - "documentRefSegment"
Cohesion: 0.40
Nodes (6): documentRefClassSuffix(), documentRefIdSuffix(), documentRefSegment(), elementMatchesManualRefSegment(), indexAmongSameTag(), normalizeDocumentRefToken()

### Community 59 - "scopeCssBlock"
Cohesion: 0.33
Nodes (6): findMatchingCssBrace(), prefixCssSelectors(), scopeCssBlock(), shouldScopeNestedCssAtRule(), splitCssSelectorList(), unwrapSvelteGlobalSelector()

## Knowledge Gaps
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createLiveBrowserDomHelpers()` connect `createLiveBrowserDomHelpers` to `setLiveState`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Should `setLiveState` be split into smaller, more focused modules?**
  _Cohesion score 0.07792207792207792 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `workspace-shell.tsx`, `r1-route-data.ts`, `R1RoutePage`, `package.json`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Should `modern-screenshot.umd.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08583959899749373 - nodes in this community are weakly interconnected._
- **Why does `stopFocusOutIntoChrome()` connect `setLiveState` to `createLiveBrowserDomHelpers`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Should `live-browser.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05660377358490566 - nodes in this community are weakly interconnected._
- **Should `initPageChat` be split into smaller, more focused modules?**
  _Cohesion score 0.07686932215234102 - nodes in this community are weakly interconnected._