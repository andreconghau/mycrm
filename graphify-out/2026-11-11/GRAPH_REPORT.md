# Graph Report - ccc  (2026-11-11)

## Corpus Check
- 221 files · ~543,184 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 23 file(s) not represented in the graph (top: (none) 10, .toml 8, .cmd 2)

## Summary
- 2486 nodes · 6950 edges · 103 communities (86 shown, 17 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 181 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f77d0068`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- nimbalyst-tracker-export/package.json
- package.json
- modern-screenshot.umd.js
- onAnnotDown
- initPageChat
- R1RoutePage
- .claude/skills/impeccable/scripts/live-browser.js
- createLiveBrowserDomHelpers
- showToast
- connectSSE
- authErrorResponse
- el
- .agents/skills/impeccable/scripts/live-browser.js
- createLiveBrowserSessionState
- compilerOptions
- syncPageChatFocus
- .claude/skills/impeccable/scripts/modern-screenshot.umd.js
- components.json
- Principal
- graph.sh
- postgres
- el
- market-context.tsx
- setLiveState
- openapi.ts
- contacts/presentation/api.ts
- documentRefForElement
- r1-route-data.ts
- connectSSE
- initGlobalBar
- compilerOptions
- api.ts
- dependencies
- scripts
- customer-service.ts
- access-repository.ts
- request-auth.ts
- live-browser-ignores.js
- vitest
- interface
- interface
- setLiveState
- interface
- eslint
- swagger-docs.tsx
- currentPrincipal
- start.sh
- useMarket
- stop.sh
- postcss.config.mjs
- prettier.config.mjs
- interface
- access-repository.ts
- audit-safe-diff.ts
- captureElementToBlob
- Principal
- workspace-shell.tsx
- scheduleAcceptCleanup
- .mcp.json
- [locale]/layout.tsx
- overrides
- mountSvelteComponentVariant
- renderDesignVisual
- initGlobalBar
- src/backup.ts
- RecordScope
- mountSvelteComponentVariant
- showToast
- access-control.ts
- handleManualEditActivity
- tracker_export.sh
- createLiveBrowserDomHelpers
- customer-workspace.tsx
- react
- migrate.ts
- manifest.json
- contact-detail.tsx
- createLiveBrowserSessionState
- actOnAgentTarget
- onAnnotDown
- actOnAgentTarget
- start_app.sh
- customer-create-drawer.tsx
- ref_node_fs
- index.ts
- export.ts
- contact-repository.integration.test.ts
- ref_node_crypto
- interface
- interface
- backup-tracker-task.ts
- interface
- .claude/skills/impeccable/scripts/live-browser-ignores.js
- login/page.tsx
- interface
- @playwright/test

## God Nodes (most connected - your core abstractions)
1. `Principal` - 71 edges
2. `AccessRepository` - 43 edges
3. `requestCorrelationId()` - 37 edges
4. `authErrorResponse()` - 36 edges
5. `connectSSE()` - 34 edges
6. `connectSSE()` - 34 edges
7. `EffectiveGrant` - 33 edges
8. `setLiveState()` - 33 edges
9. `resumeSession()` - 33 edges
10. `setLiveState()` - 33 edges

## Surprising Connections (you probably didn't know these)
- `bootstrapAdmin()` --calls--> `hashPassword()`  [EXTRACTED]
  scripts/access-control.ts → src/modules/access-control/infrastructure/password.ts
- `globalSetup()` --calls--> `hashPassword()`  [EXTRACTED]
  e2e/global-setup.ts → src/modules/access-control/infrastructure/password.ts
- `enableInlineEdit()` --indirect_call--> `own()`  [INFERRED]
  .claude/skills/impeccable/scripts/live-browser.js → .claude/skills/impeccable/scripts/live-browser-dom.js
- `layoutFlowChildren()` --indirect_call--> `pickable()`  [INFERRED]
  .claude/skills/impeccable/scripts/live-browser.js → .claude/skills/impeccable/scripts/live-browser-dom.js
- `GET()` --calls--> `AccessDeniedError`  [EXTRACTED]
  src/app/api/v1/audit-events/route.ts → src/modules/access-control/domain/types.ts

## Import Cycles
- None detected.

## Communities (103 total, 17 thin omitted)

### Community 0 - "nimbalyst-tracker-export/package.json"
Cohesion: 0.13
Nodes (16): bin, nimbalyst-tracker-export, description, devDependencies, @types/node@26.6.6, typescript@5.9.3, exports, files (+8 more)

### Community 1 - "package.json"
Cohesion: 0.07
Nodes (37): devDependencies, jsdom@31.0.0, postcss@8.5.32, prettier@3.9.10, prettier-plugin-tailwindcss@0.8.1, tailwindcss@4.3.4, @tailwindcss/postcss@4.3.4, @testing-library/dom@10.4.2 (+29 more)

### Community 2 - "modern-screenshot.umd.js"
Cohesion: 0.09
Nodes (53): ae(), be(), bt(), Ce(), Ct(), de(), dt(), _e() (+45 more)

### Community 3 - "onAnnotDown"
Cohesion: 0.24
Nodes (15): beginEditPin(), buildAnnotationsForCapture(), buildPinElement(), cancelEditingPin(), finalizeEditingPin(), initAnnotOverlay(), localCoords(), onAnnotDown() (+7 more)

### Community 4 - "initPageChat"
Cohesion: 0.09
Nodes (49): armPageChatForTyping(), attachSteerFocusDebug(), attachSteerFocusGuard(), buildSteerProcessingDots(), buildSteerQueueHint(), clearSteerAwaitTimer(), clearSteerFocusRecoverTimer(), collapsePageChat() (+41 more)

### Community 5 - "R1RoutePage"
Cohesion: 0.16
Nodes (13): ModulePage(), ModulePage(), ModulePage(), ModulePage(), ModulePage(), ModulePage(), ModulePage(), ModulePage() (+5 more)

### Community 6 - ".claude/skills/impeccable/scripts/live-browser.js"
Cohesion: 0.03
Nodes (130): addManualContextText(), applyGlobalBarLabelState(), applyParamDefaults(), applyParamValue(), applyPlaceholderSizingStyles(), applySavedParamValues(), averageRgb01(), bindEditBadgeProxy() (+122 more)

### Community 7 - "createLiveBrowserDomHelpers"
Cohesion: 0.16
Nodes (15): createLiveBrowserDomHelpers(), activeElementDeep(), cloneWithoutChrome(), copyTextViaSelection(), cssId(), liveUiRoot(), makeFrozenAnchor(), raiseHitModal() (+7 more)

### Community 8 - "showToast"
Cohesion: 0.19
Nodes (24): clearStoredManualApplyState(), fetchPendingCount(), handleManualEditActivity(), hidePendingApplyDock(), manualApplyLoadingText(), manualApplyStateKey(), manualEditEventForCurrentPage(), numberOrNull() (+16 more)

### Community 9 - "connectSSE"
Cohesion: 0.06
Nodes (88): abortSvelteComponentInjection(), applyPlaceholderDimensions(), applySavedSessionMeta(), checkpointPayload(), clampVariantIndex(), clearHandled(), clearSession(), closedClipPath() (+80 more)

### Community 10 - "authErrorResponse"
Cohesion: 0.21
Nodes (20): POST(), GET(), POST(), POST(), POST(), POST(), GET(), GET() (+12 more)

### Community 11 - "el"
Cohesion: 0.07
Nodes (57): actionLabel(), applyConfigureBarChrome(), bindConfigureCountPillTooltip(), bindConfigureInlineControlHover(), bindConfigureModifierPillHover(), buildConfigureActionControl(), buildConfigureCountControl(), buildConfigureRow() (+49 more)

### Community 12 - ".agents/skills/impeccable/scripts/live-browser.js"
Cohesion: 0.03
Nodes (139): applyGlobalBarLabelState(), applyLiveBarPreference(), applyParamDefaults(), applyParamValue(), applyPlaceholderSizingStyles(), applySavedParamValues(), bindEditBadgeProxy(), bufferToBase64() (+131 more)

### Community 13 - "createLiveBrowserSessionState"
Cohesion: 0.19
Nodes (17): createLiveBrowserSessionState(), clearHandled(), clearScrollY(), clearSession(), isHandled(), loadSession(), markHandled(), nextCheckpointRevision() (+9 more)

### Community 14 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx, lib (+11 more)

### Community 15 - "syncPageChatFocus"
Cohesion: 0.07
Nodes (57): agentHasWorkInFlight(), armPageChatForTyping(), attachSteerFocusDebug(), attachSteerFocusGuard(), buildSteerQueueHint(), clearSteerAwaitTimer(), clearSteerFocusRecoverTimer(), collapsePageChat() (+49 more)

### Community 16 - ".claude/skills/impeccable/scripts/modern-screenshot.umd.js"
Cohesion: 0.09
Nodes (53): ae(), be(), bt(), Ce(), Ct(), de(), dt(), _e() (+45 more)

### Community 17 - "components.json"
Cohesion: 0.11
Nodes (18): aliases, components, hooks, lib, ui, utils, iconLibrary, packageManager (+10 more)

### Community 18 - "Principal"
Cohesion: 0.17
Nodes (7): customers, normalizeIdentifier(), CustomerConflictError, CustomerNotFoundError, CustomerRepository, safeSearch(), scopeCondition()

### Community 20 - "postgres"
Cohesion: 0.11
Nodes (17): path, required, interval, retries, start_period, test, timeout, env_file (+9 more)

### Community 21 - "el"
Cohesion: 0.08
Nodes (53): actionLabel(), applyConfigureBarChrome(), bindConfigureCountPillTooltip(), bindConfigureInlineControlHover(), bindConfigureModifierPillHover(), buildConfigureActionControl(), buildConfigureCountControl(), buildConfigureRow() (+45 more)

### Community 22 - "market-context.tsx"
Cohesion: 0.27
Nodes (8): MarketContext, MarketProvider(), selectMarket(), serverSnapshot(), snapshot(), subscribe(), availableMarkets(), resolveMarket()

### Community 23 - "setLiveState"
Cohesion: 0.11
Nodes (52): applyEditing(), beginNewLiveConfiguration(), buildInsertPlaceholderSnapshotFromDom(), buildLocatorForLeaf(), buildPickedAnchorSnapshot(), cancelEditing(), cancelEditingToPicking(), cancelInsertConfigure() (+44 more)

### Community 24 - "openapi.ts"
Cohesion: 0.05
Nodes (53): childIdParameter, commonErrors, cookieSecurity, csrfParameter, errorSchema, idParameter, jsonBody(), marketParameter (+45 more)

### Community 25 - "contacts/presentation/api.ts"
Cohesion: 0.09
Nodes (35): POST(), PATCH(), GET(), POST(), POST(), PATCH(), GET(), POST() (+27 more)

### Community 26 - "documentRefForElement"
Cohesion: 0.06
Nodes (39): addManualContextText(), canRestoreManualEditElement(), collectEditableTextRows(), visit(), collectManualContextPieces(), walk(), contextElementForManualEdit(), copyEditContainerContext() (+31 more)

### Community 27 - "r1-route-data.ts"
Cohesion: 0.12
Nodes (6): customer(), market(), product(), routeRows(), searchableColumns, user()

### Community 28 - "connectSSE"
Cohesion: 0.06
Nodes (83): applyPlaceholderDimensions(), applySavedSessionMeta(), buildParamsPanel(), checkpointPayload(), clampVariantIndex(), closedClipPath(), commitAcceptedVariantToDom(), completeParameterGenerationIfReady() (+75 more)

### Community 29 - "initGlobalBar"
Cohesion: 0.09
Nodes (36): agentStatusText(), applyLiveBarPreference(), barPaletteForTheme(), brandMarkSvg(), buildParamsPanel(), cursorForInsertAxis(), detectPageTheme(), stopFocusOutIntoChrome() (+28 more)

### Community 30 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, declaration, esModuleInterop, module, moduleResolution, outDir, rootDir, skipLibCheck (+3 more)

### Community 31 - "api.ts"
Cohesion: 0.15
Nodes (19): POST(), POST(), POST(), GET(), PATCH(), GET(), POST(), archiveCustomer() (+11 more)

### Community 32 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, class-variance-authority@0.7.1, drizzle-orm@0.45.4, jose@6.2.15, next@16.4.5, react@19.3.1, react-dom@19.3.1, swagger-ui-dist@5.34.1 (+7 more)

### Community 33 - "scripts"
Cohesion: 0.11
Nodes (19): scripts, access:operator, build, db:migrate, db:validate-migrations, dev, format, format:check (+11 more)

### Community 35 - "customer-service.ts"
Cohesion: 0.13
Nodes (19): addressInput, archiveCustomerSchema, canTransitionCustomer(), countryCode, CreateCustomerInput, createCustomerSchema, currencyCode, customerFields (+11 more)

### Community 36 - "access-repository.ts"
Cohesion: 0.08
Nodes (10): AccessControlPage(), projectSafeAuditReason(), AccessDeniedError, recordScopes, RoleCode, roleCodes, ACCESS_GRANTS, AccessRepository (+2 more)

### Community 37 - "request-auth.ts"
Cohesion: 0.10
Nodes (29): nextConfig, next, zod, POST(), POST(), POST(), POST(), invitationAcceptanceRequestSchema (+21 more)

### Community 38 - "live-browser-ignores.js"
Cohesion: 0.52
Nodes (6): globToRegex(), matchesScope(), normalizeIgnoreRule(), normalizeIgnoreValue(), pageCandidates(), resolveDetectIgnores()

### Community 39 - "vitest"
Cohesion: 0.17
Nodes (9): clsx@2.1.1, tailwind-merge@3.7.0, @vitejs/plugin-react@6.2.1, vitest@5.1.0, clsx, tailwind-merge, @vitejs/plugin-react, vitest (+1 more)

### Community 40 - "interface"
Cohesion: 0.20
Nodes (9): interface, brand_color, default_prompt, display_name, icon_large, icon_small, short_description, policy (+1 more)

### Community 41 - "interface"
Cohesion: 0.25
Nodes (7): interface, brand_color, default_prompt, display_name, short_description, policy, allow_implicit_invocation

### Community 42 - "setLiveState"
Cohesion: 0.09
Nodes (67): abortSvelteComponentInjection(), applyEditing(), beginNewLiveConfiguration(), buildLocatorForLeaf(), cancelEditing(), cancelEditingToPicking(), cancelInsertConfigure(), cleanup() (+59 more)

### Community 43 - "interface"
Cohesion: 0.40
Nodes (4): interface, default_prompt, display_name, short_description

### Community 44 - "eslint"
Cohesion: 0.40
Nodes (4): eslint@9.39.5, eslint-config-next@16.4.5, eslint, eslint-config-next

### Community 45 - "swagger-docs.tsx"
Cohesion: 0.29
Nodes (8): ApiDocsPage(), csrfCookie(), prepareRequest(), SwaggerDocs(), SwaggerRequest, SwaggerUIFactory, unsafeMethods, Window

### Community 46 - "currentPrincipal"
Cohesion: 0.15
Nodes (13): GET(), currentPrincipal, list, GET(), GET(), AuditLogPage(), SearchParams, ContactDetailPage() (+5 more)

### Community 49 - "useMarket"
Cohesion: 0.20
Nodes (8): DashboardPage(), useMarket(), MarketDashboard(), Metric(), R1ListScreen(), R1Route, scoped(), RecordsTable()

### Community 56 - "interface"
Cohesion: 0.29
Nodes (6): interface, default_prompt, display_name, short_description, policy, allow_implicit_invocation

### Community 57 - "access-repository.ts"
Cohesion: 0.12
Nodes (31): drizzle-orm, DatabaseState, getDatabase(), globalState, poolSize(), authRateLimits, contactChannels, contactPreferences (+23 more)

### Community 58 - "audit-safe-diff.ts"
Cohesion: 0.13
Nodes (17): AuditCursor, AuditQuery, auditQuerySchema, dateTime, decodeAuditCursor(), encodeAuditCursor(), positiveId, booleanFields (+9 more)

### Community 59 - "captureElementToBlob"
Cohesion: 0.14
Nodes (19): averageRgb01(), captureAndEmit(), captureElementFromRenderedAncestor(), captureElementToBlob(), compileShader(), cssColorToRgb01(), dominantRgb01(), findBackdropAncestor() (+11 more)

### Community 60 - "Principal"
Cohesion: 0.11
Nodes (21): canAccessRecord(), requireGrant(), scopeStrength, strongestScope(), grants, principal, EffectiveGrant, Principal (+13 more)

### Community 61 - "workspace-shell.tsx"
Cohesion: 0.16
Nodes (12): dict, Locale, Messages, NavLink(), navNames, WorkspaceContent(), csrfToken(), LogoutButton() (+4 more)

### Community 62 - "scheduleAcceptCleanup"
Cohesion: 0.31
Nodes (11): acceptedDomAlreadyClean(), clearHandledWrapperReloadStamp(), deferredRecoverySuperseded(), ensureAcceptedDomClean(), findAcceptedRuntimeWrappers(), handledWrapperReloadKey(), reloadAfterMissingAcceptedDom(), restoreAcceptedDomFromSnapshot() (+3 more)

### Community 63 - ".mcp.json"
Cohesion: 0.31
Nodes (8): npx, chrome-devtools, context7, knowledge-graph-memory, playwright, @modelcontextprotocol/server-memory, @playwright/mcp, @upstash/context7-mcp

### Community 65 - "overrides"
Cohesion: 0.67
Nodes (3): overrides, @typescript-eslint/typescript-estree, minimatch

### Community 66 - "mountSvelteComponentVariant"
Cohesion: 0.09
Nodes (34): abandonForeignSession(), abandonSupersededGo(), applyOriginalAttrsToSvelteAnchor(), clearMountErrorCard(), commitAcceptedSvelteComponentToDom(), componentModuleCandidates(), describeMountFailure(), detectDevServerBase() (+26 more)

### Community 67 - "renderDesignVisual"
Cohesion: 0.08
Nodes (38): buildCollapsible(), buildDesignHeader(), buildListHtml(), buildRadiiModels(), copyToClipboard(), cssSafe(), designEmptyMessage(), designPanelCss() (+30 more)

### Community 68 - "initGlobalBar"
Cohesion: 0.13
Nodes (24): agentHasWorkInFlight(), agentStatusText(), barPaletteForTheme(), brandMarkSvg(), detectPageTheme(), ensureAgentPollTooltip(), ensureSpinKeyframes(), hideAgentPollTooltip() (+16 more)

### Community 69 - "src/backup.ts"
Cohesion: 0.25
Nodes (13): atomicWrite(), BackupConflictError, BackupOptions, BackupResult, backupTracker(), exists(), hashBody(), normalizeBody() (+5 more)

### Community 70 - "RecordScope"
Cohesion: 0.19
Nodes (8): projectSafeAuditDiff(), RecordScope, encodeContactCursor(), ContactConflictError, ContactNotFoundError, ContactRepository, parentScope(), safeSearch()

### Community 71 - "mountSvelteComponentVariant"
Cohesion: 0.10
Nodes (34): acceptedDomAlreadyClean(), applyOriginalAttrsToSvelteAnchor(), clearHandledWrapperReloadStamp(), commitAcceptedSvelteComponentToDom(), componentModuleCandidates(), cyclingCounterText(), cyclingShownVariant(), deferredRecoverySuperseded() (+26 more)

### Community 72 - "showToast"
Cohesion: 0.12
Nodes (27): abandonForeignSession(), abandonSupersededGo(), cleanup(), clearMountErrorCard(), clearScrollY(), discardedWrappers(), discardOrphanedSession(), discardStateStyleId() (+19 more)

### Community 73 - "access-control.ts"
Cohesion: 0.13
Nodes (21): bootstrapAdmin(), customerGrantPolicy, customerReadFields, grantContacts(), grantCustomers(), grants, invite(), main() (+13 more)

### Community 74 - "handleManualEditActivity"
Cohesion: 0.19
Nodes (24): clearStoredManualApplyState(), fetchPendingCount(), handleManualEditActivity(), hidePendingApplyDock(), manualApplyLoadingText(), manualApplyStateKey(), manualEditEventForCurrentPage(), numberOrNull() (+16 more)

### Community 76 - "createLiveBrowserDomHelpers"
Cohesion: 0.15
Nodes (17): createLiveBrowserDomHelpers(), activeElementDeep(), cloneWithoutChrome(), copyTextViaSelection(), cssId(), liveUiRoot(), makeFrozenAnchor(), own() (+9 more)

### Community 77 - "customer-workspace.tsx"
Cohesion: 0.32
Nodes (6): lucide-react@1.69.0, lucide-react, ModulePage(), AuthorizedMarket, Customer, CustomerWorkspace()

### Community 78 - "react"
Cohesion: 0.18
Nodes (13): react, AcceptInvitationPage(), AcceptInvitationForm(), CustomerContactsPanel(), PanelContact, csrfToken(), Customer, CustomerDetail() (+5 more)

### Community 79 - "migrate.ts"
Cohesion: 0.17
Nodes (12): postgres@4.1.0, postgres, baselinePath, hasTable(), main(), migrationDirectory, root, sha256() (+4 more)

### Community 80 - "manifest.json"
Cohesion: 0.29
Nodes (6): authority, conflict_policy, schema_version, source, sync_mode, tasks

### Community 81 - "contact-detail.tsx"
Cohesion: 0.14
Nodes (18): ModulePage(), Channel, Contact, ContactDetail(), send(), DetailField(), DetailValue(), Preference (+10 more)

### Community 82 - "createLiveBrowserSessionState"
Cohesion: 0.19
Nodes (17): createLiveBrowserSessionState(), clearHandled(), clearScrollY(), clearSession(), isHandled(), loadSession(), markHandled(), nextCheckpointRevision() (+9 more)

### Community 83 - "actOnAgentTarget"
Cohesion: 0.24
Nodes (19): actOnAgentTarget(), agentTargetBusyReason(), agentTargetOverlayGone(), agentTargetTaken(), claimAgentTarget(), claimAndActOnAgentTarget(), declineAgentTargetBusy(), declineAgentTargetUnresolvable() (+11 more)

### Community 84 - "onAnnotDown"
Cohesion: 0.18
Nodes (18): beginEditPin(), buildAnnotationsForCapture(), buildPinElement(), cancelEditingPin(), clampPlaceholderSize(), finalizeEditingPin(), initAnnotOverlay(), isImeKeydown() (+10 more)

### Community 85 - "actOnAgentTarget"
Cohesion: 0.29
Nodes (17): actOnAgentTarget(), agentTargetBusyReason(), agentTargetOverlayGone(), agentTargetTaken(), claimAgentTarget(), claimAndActOnAgentTarget(), declineAgentTargetBusy(), declineAgentTargetUnresolvable() (+9 more)

### Community 88 - "customer-create-drawer.tsx"
Cohesion: 0.19
Nodes (14): csrfToken(), CustomerCreateDrawer(), create(), finishClose(), handleKeyDown(), handleSubmit(), requestClose(), CustomerPayload (+6 more)

### Community 89 - "ref_node_fs"
Cohesion: 0.14
Nodes (5): root, assetDirectory, AssetName, assets, payload

### Community 90 - "index.ts"
Cohesion: 0.25
Nodes (13): TrackerPayload, ExportOptions, ALLOWED_STATUSES, hashSnapshotBody(), isIsoDate(), parseScalar(), parseSnapshot(), REQUIRED_FIELDS (+5 more)

### Community 91 - "export.ts"
Cohesion: 0.26
Nodes (12): parseTrackerPayload(), help(), main(), value(), decodeBody(), execFileAsync, ExportResult, exportWorkspace() (+4 more)

### Community 92 - "contact-repository.integration.test.ts"
Cohesion: 0.18
Nodes (12): admin, ContactRepositoryType, createContact(), CustomerRepositoryType, foreignMarketSale, handover(), isolatedUrl, manager (+4 more)

### Community 93 - "ref_node_crypto"
Cohesion: 0.38
Nodes (6): globalSetup(), getDummyPasswordHash(), hashPassword(), scrypt(), validatePassword(), verifyPassword()

### Community 94 - "interface"
Cohesion: 0.20
Nodes (9): interface, brand_color, default_prompt, display_name, icon_large, icon_small, short_description, policy (+1 more)

### Community 96 - "interface"
Cohesion: 0.25
Nodes (7): interface, brand_color, default_prompt, display_name, short_description, policy, allow_implicit_invocation

### Community 97 - "backup-tracker-task.ts"
Cohesion: 0.43
Nodes (5): execFileAsync, loadRootEnv(), main(), printHelp(), readInput()

### Community 98 - "interface"
Cohesion: 0.29
Nodes (6): interface, default_prompt, display_name, short_description, policy, allow_implicit_invocation

### Community 99 - ".claude/skills/impeccable/scripts/live-browser-ignores.js"
Cohesion: 0.52
Nodes (6): globToRegex(), matchesScope(), normalizeIgnoreRule(), normalizeIgnoreValue(), pageCandidates(), resolveDetectIgnores()

### Community 101 - "interface"
Cohesion: 0.40
Nodes (4): interface, default_prompt, display_name, short_description

## Knowledge Gaps
- **3 isolated node(s):** `@modelcontextprotocol/server-memory`, `@playwright/mcp`, `@upstash/context7-mcp`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 399 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `request-auth.ts` to `dependencies`, `package.json`, `[locale]/layout.tsx`, `login/page.tsx`, `R1RoutePage`, `swagger-docs.tsx`, `currentPrincipal`, `react`, `customer-workspace.tsx`, `contact-detail.tsx`, `useMarket`, `customer-create-drawer.tsx`, `workspace-shell.tsx`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `@modelcontextprotocol/server-memory`, `@playwright/mcp`, `@upstash/context7-mcp` to the rest of the system?**
  _3 weakly-connected nodes found - possible missing edges._
- **Should `nimbalyst-tracker-export/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1323529411764706 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `vitest` to `package.json`, `customer-service.ts`, `r1-route-data.ts`, `authErrorResponse`, `currentPrincipal`, `contact-repository.integration.test.ts`, `workspace-shell.tsx`, `openapi.ts`, `ref_node_fs`, `audit-safe-diff.ts`, `customer-create-drawer.tsx`, `Principal`, `ref_node_crypto`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07017543859649122 - nodes in this community are weakly interconnected._
- **Why does `Principal` connect `Principal` to `customer-service.ts`, `access-repository.ts`, `request-auth.ts`, `RecordScope`, `Principal`, `openapi.ts`, `access-repository.ts`, `contacts/presentation/api.ts`, `api.ts`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Should `modern-screenshot.umd.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08583959899749373 - nodes in this community are weakly interconnected._