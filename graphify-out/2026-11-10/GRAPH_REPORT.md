# Graph Report - ccc  (2026-11-10)

## Corpus Check
- 181 files · ~373,468 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 17 file(s) not represented in the graph (top: (none) 9, .toml 4, .example 2)

## Summary
- 1528 nodes · 4018 edges · 78 communities (62 shown, 16 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 91 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3163648a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- nimbalyst-tracker-export/package.json
- devDependencies
- modern-screenshot.umd.js
- captureElementToBlob
- initPageChat
- R1RoutePage
- renderDesignVisual
- createLiveBrowserDomHelpers
- showToast
- next
- authErrorResponse
- el
- live-browser.js
- createLiveBrowserSessionState
- compilerOptions
- showToast
- resolveLiveInjectionAnchor
- components.json
- Principal
- graph.sh
- postgres
- showBar
- market-context.tsx
- showAnnotOverlay
- openapi.ts
- scopeCssBlock
- react
- r1-route-data.ts
- startVariantObserver
- @vitejs/plugin-react
- compilerOptions
- api.ts
- dependencies
- scripts
- customer-service.ts
- types.ts
- auth-service.ts
- live-browser-ignores.js
- vitest
- interface
- interface
- setLiveState
- interface
- eslint
- swagger-docs.tsx
- [file]/route.ts
- start.sh
- useMarket
- stop.sh
- postcss.config.mjs
- prettier.config.mjs
- interface
- access-repository.ts
- projectSafeAuditDiff
- connectSSE
- Principal
- workspace-shell.tsx
- scheduleAcceptCleanup
- .mcp.json
- [locale]/layout.tsx
- package.json
- mountSvelteComponentVariant
- initGlobalBar
- src/backup.ts
- @testing-library/dom
- scheduleSteerFocusRecover
- tracker_export.sh
- customer-workspace.tsx
- customer-detail.tsx
- access-control.ts
- manifest.json
- start_app.sh

## God Nodes (most connected - your core abstractions)
1. `AccessRepository` - 43 edges
2. `authErrorResponse()` - 38 edges
3. `connectSSE()` - 34 edges
4. `setLiveState()` - 33 edges
5. `resumeSession()` - 33 edges
6. `Principal` - 32 edges
7. `showToast()` - 31 edges
8. `initGlobalBar()` - 30 edges
9. `requirePermission()` - 29 edges
10. `el()` - 29 edges

## Surprising Connections (you probably didn't know these)
- `globalSetup()` --calls--> `hashPassword()`  [EXTRACTED]
  e2e/global-setup.ts → src/modules/access-control/infrastructure/password.ts
- `enableInlineEdit()` --indirect_call--> `own()`  [INFERRED]
  .agents/skills/impeccable/scripts/live-browser.js → .agents/skills/impeccable/scripts/live-browser-dom.js
- `layoutFlowChildren()` --indirect_call--> `pickable()`  [INFERRED]
  .agents/skills/impeccable/scripts/live-browser.js → .agents/skills/impeccable/scripts/live-browser-dom.js
- `teardown()` --indirect_call--> `stopFocusOutIntoChrome()`  [INFERRED]
  .agents/skills/impeccable/scripts/live-browser.js → .agents/skills/impeccable/scripts/live-browser-dom.js
- `init()` --indirect_call--> `stopFocusOutIntoChrome()`  [INFERRED]
  .agents/skills/impeccable/scripts/live-browser.js → .agents/skills/impeccable/scripts/live-browser-dom.js

## Import Cycles
- None detected.

## Communities (78 total, 16 thin omitted)

### Community 0 - "nimbalyst-tracker-export/package.json"
Cohesion: 0.13
Nodes (16): bin, nimbalyst-tracker-export, description, devDependencies, @types/node@26.6.6, typescript@5.9.3, exports, files (+8 more)

### Community 1 - "devDependencies"
Cohesion: 0.08
Nodes (22): devDependencies, @playwright/test@1.65.0, postcss@8.5.32, prettier@3.9.10, prettier-plugin-tailwindcss@0.8.1, tailwindcss@4.3.4, @tailwindcss/postcss@4.3.4, @testing-library/jest-dom@7.0.1 (+14 more)

### Community 2 - "modern-screenshot.umd.js"
Cohesion: 0.09
Nodes (53): ae(), be(), bt(), Ce(), Ct(), de(), dt(), _e() (+45 more)

### Community 3 - "captureElementToBlob"
Cohesion: 0.07
Nodes (39): averageRgb01(), beginEditPin(), bufferToBase64(), buildAnnotationsForCapture(), buildPinElement(), cancelEditingPin(), captureChromeNodes(), captureElementFromRenderedAncestor() (+31 more)

### Community 4 - "initPageChat"
Cohesion: 0.09
Nodes (44): agentHasWorkInFlight(), applyGlobalBarLabelState(), armPageChatForTyping(), attachSteerFocusDebug(), buildSteerProcessingDots(), buildSteerQueueHint(), clearSteerAwaitTimer(), collapsePageChat() (+36 more)

### Community 5 - "R1RoutePage"
Cohesion: 0.15
Nodes (14): ModulePage(), ModulePage(), ModulePage(), ModulePage(), ModulePage(), ModulePage(), ModulePage(), ModulePage() (+6 more)

### Community 6 - "renderDesignVisual"
Cohesion: 0.07
Nodes (40): buildCollapsible(), buildColorModels(), buildDesignHeader(), buildListHtml(), buildRadiiModels(), buildTypographyModels(), cssSafe(), designEmptyMessage() (+32 more)

### Community 7 - "createLiveBrowserDomHelpers"
Cohesion: 0.14
Nodes (18): createLiveBrowserDomHelpers(), activeElementDeep(), cloneWithoutChrome(), copyTextViaSelection(), cssId(), liveUiRoot(), makeFrozenAnchor(), own() (+10 more)

### Community 8 - "showToast"
Cohesion: 0.12
Nodes (33): agentTargetBusyReason(), agentTargetOverlayGone(), agentTargetTaken(), claimAgentTarget(), claimAndActOnAgentTarget(), declineAgentTargetBusy(), declineAgentTargetUnresolvable(), fetchPendingCount() (+25 more)

### Community 9 - "next"
Cohesion: 0.24
Nodes (7): nextConfig, next, POST(), base(), clearAuthCookies(), cookieNames(), setAuthCookies()

### Community 10 - "authErrorResponse"
Cohesion: 0.13
Nodes (21): POST(), GET(), POST(), POST(), POST(), POST(), GET(), POST() (+13 more)

### Community 11 - "el"
Cohesion: 0.09
Nodes (44): actionLabel(), bindConfigureCountPillTooltip(), bindConfigureInlineControlHover(), bindConfigureModifierPillHover(), buildConfigureActionControl(), buildConfigureCountControl(), buildConfigureRow(), buildConfigureSubmitButton() (+36 more)

### Community 12 - "live-browser.js"
Cohesion: 0.05
Nodes (84): addManualContextText(), applyEditing(), bindEditBadgeProxy(), buildInsertPlaceholderSnapshotFromDom(), buildLocatorForLeaf(), buildPickedAnchorSnapshot(), canRestoreManualEditElement(), collectEditableTextRows() (+76 more)

### Community 13 - "createLiveBrowserSessionState"
Cohesion: 0.19
Nodes (17): createLiveBrowserSessionState(), clearHandled(), clearScrollY(), clearSession(), isHandled(), loadSession(), markHandled(), nextCheckpointRevision() (+9 more)

### Community 14 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx, lib (+11 more)

### Community 15 - "showToast"
Cohesion: 0.14
Nodes (22): abandonForeignSession(), abandonSupersededGo(), captureAndEmit(), checkpointPayload(), copyToClipboard(), discardOrphanedSession(), enterRecoveryWaitingForAnchor(), handleDiscard() (+14 more)

### Community 16 - "resolveLiveInjectionAnchor"
Cohesion: 0.16
Nodes (19): buildSvelteExpressionTextMap(), buildSveltePropValuesFromLiveElement(), buildSveltePropValuesV2(), cloneWithoutElements(), collectTextNodes(), collectVisibleTexts(), cssEscapeIdent(), elementMatchesOriginalMarkup() (+11 more)

### Community 17 - "components.json"
Cohesion: 0.11
Nodes (18): aliases, components, hooks, lib, ui, utils, iconLibrary, packageManager (+10 more)

### Community 18 - "Principal"
Cohesion: 0.18
Nodes (9): Principal, RecordScope, isRoleCode(), normalizeIdentifier(), CustomerConflictError, CustomerNotFoundError, CustomerRepository, safeSearch() (+1 more)

### Community 20 - "postgres"
Cohesion: 0.11
Nodes (17): path, required, interval, retries, start_period, test, timeout, env_file (+9 more)

### Community 21 - "showBar"
Cohesion: 0.28
Nodes (9): applyConfigureBarChrome(), buildConfirmedRow(), buildSavingRow(), dismissToast(), ensureCyclingRenderable(), ensureSpinKeyframes(), restorePickerBarChrome(), showBar() (+1 more)

### Community 22 - "market-context.tsx"
Cohesion: 0.24
Nodes (8): MarketContext, MarketProvider(), selectMarket(), serverSnapshot(), snapshot(), subscribe(), availableMarkets(), resolveMarket()

### Community 23 - "showAnnotOverlay"
Cohesion: 0.18
Nodes (12): applyPlaceholderSizingStyles(), buildPlaceholderResizeHandles(), createInsertPlaceholder(), cursorForPlaceholderEdge(), detectInsertAxis(), detectInsertAxisFromStyle(), finalizeInsertSession(), placeholderSizing() (+4 more)

### Community 24 - "openapi.ts"
Cohesion: 0.09
Nodes (23): assignTeamMemberRequestSchema, createTeamRequestSchema, disableUserRequestSchema, invitationAcceptanceRequestSchema, loginRequestSchema, marketMembershipRequestSchema, roleAssignmentRequestSchema, selfProfileRequestSchema (+15 more)

### Community 25 - "scopeCssBlock"
Cohesion: 0.33
Nodes (6): findMatchingCssBrace(), prefixCssSelectors(), scopeCssBlock(), shouldScopeNestedCssAtRule(), splitCssSelectorList(), unwrapSvelteGlobalSelector()

### Community 26 - "react"
Cohesion: 0.24
Nodes (7): react, AcceptInvitationPage(), AcceptInvitationForm(), csrfToken(), LogoutButton(), logout(), router

### Community 27 - "r1-route-data.ts"
Cohesion: 0.10
Nodes (9): DashboardPage(), MarketDashboard(), customer(), market(), product(), routeRows(), scoped(), searchableColumns (+1 more)

### Community 28 - "startVariantObserver"
Cohesion: 0.08
Nodes (56): applyParamDefaults(), applyParamValue(), applyPlaceholderDimensions(), applySavedParamValues(), buildCyclingRow(), buildParamsPanel(), closedClipPath(), closeTunePopover() (+48 more)

### Community 30 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, declaration, esModuleInterop, module, moduleResolution, outDir, rootDir, skipLibCheck (+3 more)

### Community 31 - "api.ts"
Cohesion: 0.15
Nodes (19): POST(), POST(), POST(), GET(), PATCH(), GET(), POST(), archiveCustomer() (+11 more)

### Community 32 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, class-variance-authority@0.7.1, drizzle-orm@0.45.4, jose@6.2.15, lucide-react@1.69.0, next@16.4.5, react@19.3.1, react-dom@19.3.1 (+9 more)

### Community 33 - "scripts"
Cohesion: 0.11
Nodes (18): scripts, access:operator, build, db:migrate, db:validate-migrations, dev, format, format:check (+10 more)

### Community 35 - "customer-service.ts"
Cohesion: 0.13
Nodes (19): addressInput, archiveCustomerSchema, canTransitionCustomer(), countryCode, CreateCustomerInput, createCustomerSchema, currencyCode, customerFields (+11 more)

### Community 36 - "types.ts"
Cohesion: 0.25
Nodes (7): booleanFields, customerAuditFields, customerStatuses, integerFields, stringFields, RecordAccessContext, roleCodes

### Community 37 - "auth-service.ts"
Cohesion: 0.14
Nodes (19): zod, POST(), POST(), AuthService, AuthenticationError, AuthConfig, environmentSchema, getAuthConfig() (+11 more)

### Community 38 - "live-browser-ignores.js"
Cohesion: 0.52
Nodes (6): globToRegex(), matchesScope(), normalizeIgnoreRule(), normalizeIgnoreValue(), pageCandidates(), resolveDetectIgnores()

### Community 39 - "vitest"
Cohesion: 0.33
Nodes (5): clsx@2.1.1, tailwind-merge@3.7.0, clsx, tailwind-merge, cn()

### Community 40 - "interface"
Cohesion: 0.20
Nodes (9): interface, brand_color, default_prompt, display_name, icon_large, icon_small, short_description, policy (+1 more)

### Community 41 - "interface"
Cohesion: 0.25
Nodes (7): interface, brand_color, default_prompt, display_name, short_description, policy, allow_implicit_invocation

### Community 42 - "setLiveState"
Cohesion: 0.13
Nodes (51): abortSvelteComponentInjection(), actOnAgentTarget(), beginNewLiveConfiguration(), cancelEditing(), cancelEditingToPicking(), cancelInsertConfigure(), cleanup(), cleanupAcceptedSession() (+43 more)

### Community 43 - "interface"
Cohesion: 0.40
Nodes (4): interface, default_prompt, display_name, short_description

### Community 44 - "eslint"
Cohesion: 0.40
Nodes (4): eslint@9.39.5, eslint-config-next@16.4.5, eslint, eslint-config-next

### Community 45 - "swagger-docs.tsx"
Cohesion: 0.29
Nodes (8): ApiDocsPage(), csrfCookie(), prepareRequest(), SwaggerDocs(), SwaggerRequest, SwaggerUIFactory, unsafeMethods, Window

### Community 46 - "[file]/route.ts"
Cohesion: 0.40
Nodes (4): assetDirectory, AssetName, assets, GET()

### Community 49 - "useMarket"
Cohesion: 0.48
Nodes (5): useMarket(), Metric(), R1ListScreen(), R1Route, RecordsTable()

### Community 56 - "interface"
Cohesion: 0.29
Nodes (6): interface, default_prompt, display_name, short_description, policy, allow_implicit_invocation

### Community 57 - "access-repository.ts"
Cohesion: 0.14
Nodes (25): drizzle-orm, ACCESS_GRANTS, DatabaseState, getDatabase(), globalState, poolSize(), auditEvents, authRateLimits (+17 more)

### Community 58 - "projectSafeAuditDiff"
Cohesion: 0.09
Nodes (17): GET(), currentPrincipal, list, AuditLogPage(), SearchParams, AuditCursor, AuditQuery, auditQuerySchema (+9 more)

### Community 59 - "connectSSE"
Cohesion: 0.09
Nodes (34): applySavedSessionMeta(), clampVariantIndex(), clearHandled(), compileShader(), connectSSE(), findActiveSessionSummary(), findAdoptableServerSession(), findAnyVariantsWrapper() (+26 more)

### Community 60 - "Principal"
Cohesion: 0.16
Nodes (15): vitest, canAccessRecord(), requireGrant(), scopeStrength, strongestScope(), grants, principal, AccessDeniedError (+7 more)

### Community 61 - "workspace-shell.tsx"
Cohesion: 0.14
Nodes (12): LoginPage(), WorkspaceLayout(), dict, Locale, Messages, NavLink(), navNames, WorkspaceContent() (+4 more)

### Community 62 - "scheduleAcceptCleanup"
Cohesion: 0.31
Nodes (11): acceptedDomAlreadyClean(), clearHandledWrapperReloadStamp(), deferredRecoverySuperseded(), ensureAcceptedDomClean(), findAcceptedRuntimeWrappers(), handledWrapperReloadKey(), reloadAfterMissingAcceptedDom(), restoreAcceptedDomFromSnapshot() (+3 more)

### Community 63 - ".mcp.json"
Cohesion: 0.31
Nodes (8): npx, chrome-devtools, context7, knowledge-graph-memory, playwright, @modelcontextprotocol/server-memory, @playwright/mcp, @upstash/context7-mcp

### Community 65 - "package.json"
Cohesion: 0.10
Nodes (19): jsdom@31.0.0, tsx@4.23.15, @types/react-dom@19.3.0, typescript@5.9.3, engines, node, typescript, name (+11 more)

### Community 66 - "mountSvelteComponentVariant"
Cohesion: 0.13
Nodes (23): applyOriginalAttrsToSvelteAnchor(), commitAcceptedSvelteComponentToDom(), componentModuleCandidates(), describeMountFailure(), detectDevServerBase(), findInsertAnchorInDom(), findLiveElementForSvelteManifest(), getMountedSvelteComponentAnchor() (+15 more)

### Community 68 - "initGlobalBar"
Cohesion: 0.08
Nodes (38): agentStatusText(), applyLiveBarPreference(), barPaletteForTheme(), brandMarkSvg(), clearStoredManualApplyState(), cursorForInsertAxis(), designPanelCss(), detectPageTheme() (+30 more)

### Community 69 - "src/backup.ts"
Cohesion: 0.07
Nodes (45): atomicWrite(), BackupConflictError, BackupOptions, BackupResult, backupTracker(), exists(), hashBody(), normalizeBody() (+37 more)

### Community 73 - "scheduleSteerFocusRecover"
Cohesion: 0.27
Nodes (10): attachSteerFocusGuard(), clearSteerFocusRecoverTimer(), isInlineEditActive(), isPageEditableActive(), isPageEditableElement(), notePagePointerDown(), pageHasHostTextSelection(), scheduleSteerFocusRecover() (+2 more)

### Community 77 - "customer-workspace.tsx"
Cohesion: 0.33
Nodes (7): ModulePage(), AuthorizedMarket, csrfToken(), Customer, CustomerWorkspace(), createCustomer(), Field()

### Community 78 - "customer-detail.tsx"
Cohesion: 0.31
Nodes (9): CustomerDetailPage(), csrfToken(), Customer, CustomerDetail(), archive(), reassign(), update(), DetailField() (+1 more)

### Community 79 - "access-control.ts"
Cohesion: 0.09
Nodes (32): globalSetup(), postgres@4.1.0, postgres, bootstrapAdmin(), customerGrantPolicy, customerReadFields, grantCustomers(), grants (+24 more)

### Community 80 - "manifest.json"
Cohesion: 0.29
Nodes (6): authority, conflict_policy, schema_version, source, sync_mode, tasks

## Knowledge Gaps
- **3 isolated node(s):** `@modelcontextprotocol/server-memory`, `@playwright/mcp`, `@upstash/context7-mcp`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 289 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `dependencies`, `package.json`, `[locale]/layout.tsx`, `react`, `R1RoutePage`, `authErrorResponse`, `swagger-docs.tsx`, `customer-detail.tsx`, `customer-workspace.tsx`, `projectSafeAuditDiff`, `r1-route-data.ts`, `workspace-shell.tsx`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **What connects `@modelcontextprotocol/server-memory`, `@playwright/mcp`, `@upstash/context7-mcp` to the rest of the system?**
  _3 weakly-connected nodes found - possible missing edges._
- **Should `nimbalyst-tracker-export/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1323529411764706 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `Principal` to `package.json`, `devDependencies`, `react`, `customer-service.ts`, `src/backup.ts`, `vitest`, `authErrorResponse`, `access-control.ts`, `openapi.ts`, `projectSafeAuditDiff`, `r1-route-data.ts`, `@vitejs/plugin-react`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Why does `zod` connect `auth-service.ts` to `dependencies`, `package.json`, `customer-service.ts`, `authErrorResponse`, `openapi.ts`, `projectSafeAuditDiff`, `api.ts`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Should `modern-screenshot.umd.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08583959899749373 - nodes in this community are weakly interconnected._