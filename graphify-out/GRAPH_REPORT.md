# Graph Report - ccc  (2026-11-07)

## Corpus Check
- 139 files · ~346,224 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 16 file(s) not represented in the graph (top: (none) 8, .toml 4, .example 2)

## Summary
- 1264 nodes · 3328 edges · 68 communities (55 shown, 13 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 83 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6830d5ee`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- startVariantObserver
- package.json
- modern-screenshot.umd.js
- captureElementToBlob
- initPageChat
- R1RoutePage
- renderDesignVisual
- createLiveBrowserDomHelpers
- showToast
- cleanup
- onAnnotDown
- el
- live-browser.js
- createLiveBrowserSessionState
- compilerOptions
- applyEditing
- resolveLiveInjectionAnchor
- components.json
- @testing-library/dom
- graph.sh
- postgres
- showToast
- market-context.tsx
- access-control.ts
- openapi.ts
- request-auth.ts
- workspace-shell.tsx
- r1-route-data.ts
- resumeSession
- actOnAgentTarget
- refreshParamsPanel
- connectSSE
- dependencies
- scripts
- syncEditBadgeHitProxies
- AccessRepository
- auth-service.ts
- live-browser-ignores.js
- vitest
- interface
- interface
- connectSSE
- interface
- eslint
- swagger-docs.tsx
- @playwright/test
- start.sh
- market-dashboard.tsx
- stop.sh
- postcss.config.mjs
- prettier.config.mjs
- interface
- access-repository.ts
- scopeCssBlock
- enableInlineEdit
- types.ts
- react
- scheduleAcceptCleanup
- .mcp.json
- [locale]/layout.tsx
- package.json
- mountSvelteComponentVariant
- saveSession

## God Nodes (most connected - your core abstractions)
1. `AccessRepository` - 40 edges
2. `connectSSE()` - 34 edges
3. `resumeSession()` - 33 edges
4. `setLiveState()` - 33 edges
5. `R1RoutePage()` - 33 edges
6. `authErrorResponse()` - 31 edges
7. `showToast()` - 31 edges
8. `initGlobalBar()` - 30 edges
9. `el()` - 29 edges
10. `buildInsertConfigureRow()` - 28 edges

## Surprising Connections (you probably didn't know these)
- `globalSetup()` --calls--> `hashPassword()`  [EXTRACTED]
  e2e/global-setup.ts → src/modules/access-control/infrastructure/password.ts
- `bootstrapAdmin()` --calls--> `hashPassword()`  [EXTRACTED]
  scripts/access-control.ts → src/modules/access-control/infrastructure/password.ts
- `enableInlineEdit()` --indirect_call--> `own()`  [INFERRED]
  .agents/skills/impeccable/scripts/live-browser.js → .agents/skills/impeccable/scripts/live-browser-dom.js
- `POST()` --calls--> `requireCsrf()`  [EXTRACTED]
  src/app/api/v1/auth/logout/route.ts → src/modules/access-control/application/request-auth.ts
- `POST()` --calls--> `clearAuthCookies()`  [EXTRACTED]
  src/app/api/v1/auth/logout/route.ts → src/modules/access-control/infrastructure/auth-cookies.ts

## Import Cycles
- None detected.

## Communities (68 total, 13 thin omitted)

### Community 0 - "startVariantObserver"
Cohesion: 0.21
Nodes (21): commitAcceptedVariantToDom(), completeSourceInjection(), ensureInsertPlaceholder(), finalizeInsertSession(), findVariantsWrapper(), getVisibleVariantEl(), isInsertGeneratingSession(), pickVariantContent() (+13 more)

### Community 1 - "package.json"
Cohesion: 0.10
Nodes (21): devDependencies, jsdom@31.0.0, postcss@8.5.32, prettier@3.9.10, prettier-plugin-tailwindcss@0.8.1, tailwindcss@4.3.4, tsx@4.23.15, @types/node@26.6.6 (+13 more)

### Community 2 - "modern-screenshot.umd.js"
Cohesion: 0.09
Nodes (53): ae(), be(), bt(), Ce(), Ct(), de(), dt(), _e() (+45 more)

### Community 3 - "captureElementToBlob"
Cohesion: 0.11
Nodes (23): averageRgb01(), bufferToBase64(), captureChromeNodes(), captureElementFromRenderedAncestor(), captureElementToBlob(), collectFontCssText(), compileShader(), cssColorToRgb01() (+15 more)

### Community 4 - "initPageChat"
Cohesion: 0.08
Nodes (51): armPageChatForTyping(), attachSteerFocusDebug(), attachSteerFocusGuard(), buildSteerProcessingDots(), clearSteerAwaitTimer(), clearSteerFocusRecoverTimer(), collapsePageChat(), configureVoiceContext() (+43 more)

### Community 5 - "R1RoutePage"
Cohesion: 0.12
Nodes (19): ModulePage(), ModulePage(), ModulePage(), ModulePage(), ModulePage(), ModulePage(), ModulePage(), ModulePage() (+11 more)

### Community 6 - "renderDesignVisual"
Cohesion: 0.09
Nodes (35): buildCollapsible(), buildDesignHeader(), buildListHtml(), buildRadiiModels(), copyToClipboard(), cssSafe(), designEmptyMessage(), escapeHtml() (+27 more)

### Community 7 - "createLiveBrowserDomHelpers"
Cohesion: 0.14
Nodes (18): createLiveBrowserDomHelpers(), activeElementDeep(), cloneWithoutChrome(), copyTextViaSelection(), cssId(), liveUiRoot(), makeFrozenAnchor(), own() (+10 more)

### Community 8 - "showToast"
Cohesion: 0.19
Nodes (24): clearStoredManualApplyState(), fetchPendingCount(), handleManualEditActivity(), hidePendingApplyDock(), manualApplyLoadingText(), manualApplyStateKey(), manualEditEventForCurrentPage(), numberOrNull() (+16 more)

### Community 9 - "cleanup"
Cohesion: 0.23
Nodes (14): abortSvelteComponentInjection(), cleanup(), clearHandled(), clearScrollY(), clearSession(), handleServerLost(), hideShaderOverlay(), recoverEmptyCycling() (+6 more)

### Community 10 - "onAnnotDown"
Cohesion: 0.15
Nodes (21): applyPlaceholderDimensions(), beginEditPin(), buildAnnotationsForCapture(), buildPinElement(), cancelEditingPin(), clampPlaceholderSize(), finalizeEditingPin(), initAnnotOverlay() (+13 more)

### Community 11 - "el"
Cohesion: 0.08
Nodes (50): actionLabel(), applyConfigureBarChrome(), bindConfigureCountPillTooltip(), bindConfigureInlineControlHover(), bindConfigureModifierPillHover(), buildConfigureActionControl(), buildConfigureCountControl(), buildConfigureRow() (+42 more)

### Community 12 - "live-browser.js"
Cohesion: 0.06
Nodes (48): applyGlobalBarLabelState(), applyLiveBarPreference(), applyParamDefaults(), applyParamValue(), applyPlaceholderSizingStyles(), applySavedParamValues(), buildColorModels(), buildPlaceholderResizeHandles() (+40 more)

### Community 13 - "createLiveBrowserSessionState"
Cohesion: 0.19
Nodes (17): createLiveBrowserSessionState(), clearHandled(), clearScrollY(), clearSession(), isHandled(), loadSession(), markHandled(), nextCheckpointRevision() (+9 more)

### Community 14 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx, lib (+11 more)

### Community 15 - "applyEditing"
Cohesion: 0.09
Nodes (30): addManualContextText(), canRestoreManualEditElement(), collectManualContextPieces(), walk(), contextElementForManualEdit(), copyEditContainerContext(), copyEditLeafContext(), cssIdent() (+22 more)

### Community 16 - "resolveLiveInjectionAnchor"
Cohesion: 0.16
Nodes (19): buildSvelteExpressionTextMap(), buildSveltePropValuesFromLiveElement(), buildSveltePropValuesV2(), cloneWithoutElements(), collectTextNodes(), collectVisibleTexts(), cssEscapeIdent(), elementMatchesOriginalMarkup() (+11 more)

### Community 17 - "components.json"
Cohesion: 0.11
Nodes (18): aliases, components, hooks, lib, ui, utils, iconLibrary, packageManager (+10 more)

### Community 20 - "postgres"
Cohesion: 0.11
Nodes (17): path, required, interval, retries, start_period, test, timeout, env_file (+9 more)

### Community 21 - "showToast"
Cohesion: 0.13
Nodes (22): abandonForeignSession(), abandonSupersededGo(), buildCyclingRow(), cycleVariant(), cyclingCounterText(), cyclingShownVariant(), discardOrphanedSession(), handleAccept() (+14 more)

### Community 22 - "market-context.tsx"
Cohesion: 0.27
Nodes (8): MarketContext, MarketProvider(), selectMarket(), serverSnapshot(), snapshot(), subscribe(), availableMarkets(), resolveMarket()

### Community 23 - "access-control.ts"
Cohesion: 0.10
Nodes (25): globalSetup(), postgres@4.1.0, postgres, bootstrapAdmin(), grants, invite(), main(), option() (+17 more)

### Community 24 - "openapi.ts"
Cohesion: 0.08
Nodes (30): POST(), POST(), POST(), POST(), POST(), assignTeamMemberRequestSchema, createTeamRequestSchema, disableUserRequestSchema (+22 more)

### Community 25 - "request-auth.ts"
Cohesion: 0.16
Nodes (13): nextConfig, next, POST(), POST(), GET(), GET(), GET(), WorkspaceLayout() (+5 more)

### Community 26 - "workspace-shell.tsx"
Cohesion: 0.16
Nodes (12): dict, Locale, Messages, NavLink(), navNames, WorkspaceContent(), csrfToken(), LogoutButton() (+4 more)

### Community 27 - "r1-route-data.ts"
Cohesion: 0.11
Nodes (7): customer(), market(), product(), R1Route, routeRows(), searchableColumns, user()

### Community 28 - "resumeSession"
Cohesion: 0.18
Nodes (18): applySavedSessionMeta(), clampVariantIndex(), findActiveSessionSummary(), findAdoptableServerSession(), findAnyVariantsWrapper(), findInsertAnchorInDom(), isSessionHandled(), isTerminalSessionSummary() (+10 more)

### Community 29 - "actOnAgentTarget"
Cohesion: 0.24
Nodes (19): actOnAgentTarget(), agentTargetBusyReason(), agentTargetOverlayGone(), agentTargetTaken(), claimAgentTarget(), claimAndActOnAgentTarget(), declineAgentTargetBusy(), declineAgentTargetUnresolvable() (+11 more)

### Community 30 - "refreshParamsPanel"
Cohesion: 0.22
Nodes (14): buildParamsPanel(), closedClipPath(), completeParameterPublication(), formatRangeValue(), hideParamsPanel(), mountedParameterCount(), openTunePopover(), parseVariantParams() (+6 more)

### Community 31 - "connectSSE"
Cohesion: 0.26
Nodes (14): completeParameterGenerationIfReady(), connectSSE(), injectSvelteComponentsFromManifest(), injectVariantsFromSource(), isFrameworkComponentPreviewMode(), isJsxSourceFile(), isSvelteComponentManifestPath(), loadSvelteComponentParams() (+6 more)

### Community 32 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, class-variance-authority@0.7.1, drizzle-orm@0.45.4, jose@6.2.15, lucide-react@1.69.0, next@16.4.5, react@19.3.1, react-dom@19.3.1 (+9 more)

### Community 33 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, access:operator, build, db:migrate, db:validate-migrations, dev, format, format:check (+6 more)

### Community 35 - "syncEditBadgeHitProxies"
Cohesion: 0.27
Nodes (10): bindEditBadgeProxy(), editBadgeProxyTargets(), initEditBadge(), initEditBadgeHitProxies(), positionEditBadge(), proxyMouseEvent(), setImportantStyle(), styleEditBadgeProxy() (+2 more)

### Community 36 - "AccessRepository"
Cohesion: 0.08
Nodes (9): GET(), GET(), assetDirectory, AssetName, assets, GET(), AccessControlPage(), requirePermission() (+1 more)

### Community 37 - "auth-service.ts"
Cohesion: 0.14
Nodes (21): zod, POST(), POST(), AuthenticationError, AuthConfig, environmentSchema, getAuthConfig(), secret (+13 more)

### Community 38 - "live-browser-ignores.js"
Cohesion: 0.52
Nodes (6): globToRegex(), matchesScope(), normalizeIgnoreRule(), normalizeIgnoreValue(), pageCandidates(), resolveDetectIgnores()

### Community 39 - "vitest"
Cohesion: 0.18
Nodes (9): clsx@2.1.1, tailwind-merge@3.7.0, @vitejs/plugin-react@6.2.1, vitest@5.1.0, clsx, tailwind-merge, @vitejs/plugin-react, vitest (+1 more)

### Community 40 - "interface"
Cohesion: 0.20
Nodes (9): interface, brand_color, default_prompt, display_name, icon_large, icon_small, short_description, policy (+1 more)

### Community 41 - "interface"
Cohesion: 0.25
Nodes (7): interface, brand_color, default_prompt, display_name, short_description, policy, allow_implicit_invocation

### Community 42 - "connectSSE"
Cohesion: 0.05
Nodes (98): agentHasWorkInFlight(), agentStatusText(), applyEditing(), barPaletteForTheme(), beginNewLiveConfiguration(), brandMarkSvg(), buildInsertPlaceholderSnapshotFromDom(), buildLocatorForLeaf() (+90 more)

### Community 43 - "interface"
Cohesion: 0.40
Nodes (4): interface, default_prompt, display_name, short_description

### Community 44 - "eslint"
Cohesion: 0.40
Nodes (4): eslint@9.39.5, eslint-config-next@16.4.5, eslint, eslint-config-next

### Community 45 - "swagger-docs.tsx"
Cohesion: 0.29
Nodes (8): ApiDocsPage(), csrfCookie(), prepareRequest(), SwaggerDocs(), SwaggerRequest, SwaggerUIFactory, unsafeMethods, Window

### Community 49 - "market-dashboard.tsx"
Cohesion: 0.24
Nodes (4): DashboardPage(), MarketDashboard(), scoped(), RecordsTable()

### Community 56 - "interface"
Cohesion: 0.29
Nodes (6): interface, default_prompt, display_name, short_description, policy, allow_implicit_invocation

### Community 57 - "access-repository.ts"
Cohesion: 0.16
Nodes (17): drizzle-orm, ACCESS_GRANTS, DatabaseState, getDatabase(), globalState, poolSize(), auditEvents, authRateLimits (+9 more)

### Community 58 - "scopeCssBlock"
Cohesion: 0.33
Nodes (6): findMatchingCssBrace(), prefixCssSelectors(), scopeCssBlock(), shouldScopeNestedCssAtRule(), splitCssSelectorList(), unwrapSvelteGlobalSelector()

### Community 59 - "enableInlineEdit"
Cohesion: 0.40
Nodes (5): collectEditableTextRows(), visit(), enableInlineEdit(), onInlineInput(), wrapMixedContentTextNodes()

### Community 60 - "types.ts"
Cohesion: 0.17
Nodes (14): canAccessRecord(), requireGrant(), scopeStrength, strongestScope(), grants, principal, AccessDeniedError, EffectiveGrant (+6 more)

### Community 61 - "react"
Cohesion: 0.22
Nodes (5): react, AcceptInvitationPage(), LoginPage(), AcceptInvitationForm(), LoginForm()

### Community 62 - "scheduleAcceptCleanup"
Cohesion: 0.31
Nodes (11): acceptedDomAlreadyClean(), clearHandledWrapperReloadStamp(), deferredRecoverySuperseded(), ensureAcceptedDomClean(), findAcceptedRuntimeWrappers(), handledWrapperReloadKey(), reloadAfterMissingAcceptedDom(), restoreAcceptedDomFromSnapshot() (+3 more)

### Community 63 - ".mcp.json"
Cohesion: 0.31
Nodes (8): npx, chrome-devtools, context7, knowledge-graph-memory, playwright, @modelcontextprotocol/server-memory, @playwright/mcp, @upstash/context7-mcp

### Community 65 - "package.json"
Cohesion: 0.11
Nodes (17): @tailwindcss/postcss@4.3.4, @testing-library/jest-dom@7.0.1, @testing-library/react@16.3.3, engines, node, name, overrides, @typescript-eslint/typescript-estree (+9 more)

### Community 66 - "mountSvelteComponentVariant"
Cohesion: 0.20
Nodes (15): applyOriginalAttrsToSvelteAnchor(), commitAcceptedSvelteComponentToDom(), componentModuleCandidates(), describeMountFailure(), detectDevServerBase(), findLiveElementForSvelteManifest(), getMountedSvelteComponentAnchor(), importFirstReachable() (+7 more)

### Community 67 - "saveSession"
Cohesion: 0.38
Nodes (7): checkpointPayload(), enterRecoveryWaitingForAnchor(), noteParamEdited(), queueCheckpoint(), saveSession(), sendCheckpoint(), waitForVariantAnchorAndRetry()

## Knowledge Gaps
- **3 isolated node(s):** `@modelcontextprotocol/server-memory`, `@playwright/mcp`, `@upstash/context7-mcp`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 216 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `request-auth.ts` to `dependencies`, `package.json`, `[locale]/layout.tsx`, `auth-service.ts`, `R1RoutePage`, `swagger-docs.tsx`, `market-dashboard.tsx`, `workspace-shell.tsx`, `react`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **What connects `@modelcontextprotocol/server-memory`, `@playwright/mcp`, `@upstash/context7-mcp` to the rest of the system?**
  _3 weakly-connected nodes found - possible missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Why does `AccessRepository` connect `AccessRepository` to `openapi.ts`, `access-repository.ts`, `types.ts`, `auth-service.ts`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Should `modern-screenshot.umd.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08583959899749373 - nodes in this community are weakly interconnected._
- **Why does `createLiveBrowserDomHelpers()` connect `createLiveBrowserDomHelpers` to `connectSSE`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Should `captureElementToBlob` be split into smaller, more focused modules?**
  _Cohesion score 0.10507246376811594 - nodes in this community are weakly interconnected._