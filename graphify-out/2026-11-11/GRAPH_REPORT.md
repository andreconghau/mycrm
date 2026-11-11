# Graph Report - ccc  (2026-11-11)

## Corpus Check
- 274 files · ~583,102 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 24 file(s) not represented in the graph (top: (none) 11, .toml 8, .cmd 2)

## Summary
- 2879 nodes · 7987 edges · 117 communities (101 shown, 16 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 208 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d769eade`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- nimbalyst-tracker-export/package.json
- package.json
- modern-screenshot.umd.js
- documentRefForElement
- syncPageChatFocus
- R1RoutePage
- .claude/skills/impeccable/scripts/live-browser.js
- createLiveBrowserDomHelpers
- showToast
- connectSSE
- AccessRepository
- el
- .agents/skills/impeccable/scripts/live-browser.js
- createLiveBrowserSessionState
- compilerOptions
- syncPageChatFocus
- .claude/skills/impeccable/scripts/modern-screenshot.umd.js
- components.json
- CustomerRepository
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
- customers/presentation/api.ts
- dependencies
- scripts
- AccessDeniedError
- captureElementToBlob
- requestCorrelationId
- live-browser-ignores.js
- captureElementToBlob
- interface
- interface
- product-service.ts
- interface
- authorization.ts
- swagger-docs.tsx
- auth-service.ts
- product-specifications/presentation/api.ts
- start.sh
- setLiveState
- stop.sh
- postcss.config.mjs
- prettier.config.mjs
- interface
- access-repository.ts
- .mcp.json
- SpecificationRepository
- Principal
- workspace-shell.tsx
- scheduleAcceptCleanup
- manifest.json
- [locale]/layout.tsx
- overrides
- showToast
- specification-service.ts
- initGlobalBar
- src/backup.ts
- RecordScope
- scheduleAcceptCleanup
- showToast
- access-control.ts
- handleManualEditActivity
- tracker_export.sh
- createLiveBrowserDomHelpers
- contact-create-drawer.tsx
- customer-detail.tsx
- migrate.ts
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
- products/presentation/api.ts
- interface
- interface
- backup-tracker-task.ts
- interface
- .claude/skills/impeccable/scripts/live-browser-ignores.js
- specification-measurements.ts
- interface
- product-create-drawer.tsx
- decimal.ts
- specification-snapshot.ts
- useMarket
- specification-repository.ts
- ProductRepository
- product-repository.integration.test.ts
- audit-safe-diff.ts
- next
- react
- onAnnotDown
- specification-lifecycle.ts
- specification-repository.integration.test.ts
- product-detail.tsx
- @playwright/test

## God Nodes (most connected - your core abstractions)
1. `Principal` - 116 edges
2. `EffectiveGrant` - 58 edges
3. `requestCorrelationId()` - 49 edges
4. `requireGrant()` - 49 edges
5. `AccessRepository` - 43 edges
6. `authErrorResponse()` - 40 edges
7. `AccessDeniedError` - 39 edges
8. `connectSSE()` - 34 edges
9. `connectSSE()` - 34 edges
10. `currentPrincipal()` - 33 edges

## Surprising Connections (you probably didn't know these)
- `globalSetup()` --calls--> `hashPassword()`  [EXTRACTED]
  e2e/global-setup.ts → src/modules/access-control/infrastructure/password.ts
- `bootstrapAdmin()` --calls--> `hashPassword()`  [EXTRACTED]
  scripts/access-control.ts → src/modules/access-control/infrastructure/password.ts
- `SpecificationWorkspace()` --calls--> `selectMarket()`  [EXTRACTED]
  src/modules/product-specifications/presentation/specification-workspace.tsx → src/modules/markets/market-context.tsx
- `SpecificationWorkspace()` --calls--> `useMarket()`  [EXTRACTED]
  src/modules/product-specifications/presentation/specification-workspace.tsx → src/modules/markets/market-context.tsx
- `POST()` --calls--> `AccessRepository`  [EXTRACTED]
  src/app/api/v1/admin/markets/[id]/memberships/route.ts → src/modules/access-control/infrastructure/access-repository.ts

## Import Cycles
- None detected.

## Communities (117 total, 16 thin omitted)

### Community 0 - "nimbalyst-tracker-export/package.json"
Cohesion: 0.13
Nodes (16): bin, nimbalyst-tracker-export, description, devDependencies, @types/node@26.6.6, typescript@5.9.3, exports, files (+8 more)

### Community 1 - "package.json"
Cohesion: 0.06
Nodes (44): devDependencies, eslint@9.39.5, eslint-config-next@16.4.5, jsdom@31.0.0, postcss@8.5.32, prettier@3.9.10, prettier-plugin-tailwindcss@0.8.1, tailwindcss@4.3.4 (+36 more)

### Community 2 - "modern-screenshot.umd.js"
Cohesion: 0.09
Nodes (53): ae(), be(), bt(), Ce(), Ct(), de(), dt(), _e() (+45 more)

### Community 3 - "documentRefForElement"
Cohesion: 0.06
Nodes (39): addManualContextText(), canRestoreManualEditElement(), collectEditableTextRows(), visit(), collectManualContextPieces(), walk(), contextElementForManualEdit(), copyEditContainerContext() (+31 more)

### Community 4 - "syncPageChatFocus"
Cohesion: 0.09
Nodes (49): armPageChatForTyping(), attachSteerFocusDebug(), attachSteerFocusGuard(), buildSteerProcessingDots(), buildSteerQueueHint(), clearSteerAwaitTimer(), clearSteerFocusRecoverTimer(), collapsePageChat() (+41 more)

### Community 5 - "R1RoutePage"
Cohesion: 0.18
Nodes (12): ModulePage(), ModulePage(), ModulePage(), ModulePage(), ModulePage(), ModulePage(), ModulePage(), SearchPage() (+4 more)

### Community 6 - ".claude/skills/impeccable/scripts/live-browser.js"
Cohesion: 0.03
Nodes (139): applyGlobalBarLabelState(), applyLiveBarPreference(), applyParamDefaults(), applyParamValue(), applyPlaceholderSizingStyles(), applySavedParamValues(), bindEditBadgeProxy(), bufferToBase64() (+131 more)

### Community 7 - "createLiveBrowserDomHelpers"
Cohesion: 0.16
Nodes (15): createLiveBrowserDomHelpers(), activeElementDeep(), cloneWithoutChrome(), copyTextViaSelection(), cssId(), liveUiRoot(), makeFrozenAnchor(), raiseHitModal() (+7 more)

### Community 8 - "showToast"
Cohesion: 0.19
Nodes (24): clearStoredManualApplyState(), fetchPendingCount(), handleManualEditActivity(), hidePendingApplyDock(), manualApplyLoadingText(), manualApplyStateKey(), manualEditEventForCurrentPage(), numberOrNull() (+16 more)

### Community 9 - "connectSSE"
Cohesion: 0.06
Nodes (83): applyPlaceholderDimensions(), applySavedSessionMeta(), buildParamsPanel(), checkpointPayload(), clampVariantIndex(), closedClipPath(), commitAcceptedVariantToDom(), completeParameterGenerationIfReady() (+75 more)

### Community 10 - "AccessRepository"
Cohesion: 0.07
Nodes (14): POST(), POST(), POST(), assignTeamMemberRequestSchema, disableUserRequestSchema, invitationAcceptanceRequestSchema, loginRequestSchema, marketMembershipRequestSchema (+6 more)

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
Cohesion: 0.09
Nodes (49): armPageChatForTyping(), attachSteerFocusDebug(), attachSteerFocusGuard(), buildSteerProcessingDots(), buildSteerQueueHint(), clearSteerAwaitTimer(), clearSteerFocusRecoverTimer(), collapsePageChat() (+41 more)

### Community 16 - ".claude/skills/impeccable/scripts/modern-screenshot.umd.js"
Cohesion: 0.09
Nodes (53): ae(), be(), bt(), Ce(), Ct(), de(), dt(), _e() (+45 more)

### Community 17 - "components.json"
Cohesion: 0.11
Nodes (18): aliases, components, hooks, lib, ui, utils, iconLibrary, packageManager (+10 more)

### Community 18 - "CustomerRepository"
Cohesion: 0.19
Nodes (6): normalizeIdentifier(), CustomerConflictError, CustomerNotFoundError, CustomerRepository, safeSearch(), scopeCondition()

### Community 20 - "postgres"
Cohesion: 0.11
Nodes (17): path, required, interval, retries, start_period, test, timeout, env_file (+9 more)

### Community 21 - "el"
Cohesion: 0.07
Nodes (57): actionLabel(), applyConfigureBarChrome(), bindConfigureCountPillTooltip(), bindConfigureInlineControlHover(), bindConfigureModifierPillHover(), buildConfigureActionControl(), buildConfigureCountControl(), buildConfigureRow() (+49 more)

### Community 22 - "market-context.tsx"
Cohesion: 0.27
Nodes (8): MarketContext, MarketProvider(), selectMarket(), serverSnapshot(), snapshot(), subscribe(), availableMarkets(), resolveMarket()

### Community 23 - "setLiveState"
Cohesion: 0.09
Nodes (67): abortSvelteComponentInjection(), applyEditing(), beginNewLiveConfiguration(), buildLocatorForLeaf(), cancelEditing(), cancelEditingToPicking(), cancelInsertConfigure(), cleanup() (+59 more)

### Community 24 - "openapi.ts"
Cohesion: 0.05
Nodes (52): recordScopes, childIdParameter, commonErrors, cookieSecurity, csrfParameter, errorSchema, idParameter, jsonBody() (+44 more)

### Community 25 - "contacts/presentation/api.ts"
Cohesion: 0.09
Nodes (36): POST(), PATCH(), GET(), POST(), POST(), PATCH(), GET(), POST() (+28 more)

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
Cohesion: 0.13
Nodes (24): agentHasWorkInFlight(), agentStatusText(), barPaletteForTheme(), brandMarkSvg(), detectPageTheme(), ensureAgentPollTooltip(), ensureSpinKeyframes(), hideAgentPollTooltip() (+16 more)

### Community 30 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, declaration, esModuleInterop, module, moduleResolution, outDir, rootDir, skipLibCheck (+3 more)

### Community 31 - "customers/presentation/api.ts"
Cohesion: 0.15
Nodes (19): POST(), POST(), POST(), GET(), PATCH(), GET(), POST(), archiveCustomer() (+11 more)

### Community 32 - "dependencies"
Cohesion: 0.10
Nodes (20): dependencies, class-variance-authority@0.7.1, clsx@2.1.1, drizzle-orm@0.45.4, jose@6.2.15, next@16.4.5, react@19.3.1, react-dom@19.3.1 (+12 more)

### Community 33 - "scripts"
Cohesion: 0.11
Nodes (19): scripts, access:operator, build, db:migrate, db:validate-migrations, dev, format, format:check (+11 more)

### Community 35 - "AccessDeniedError"
Cohesion: 0.07
Nodes (27): AccessDeniedError, actor, addressInput, archiveCustomerSchema, canTransitionCustomer(), countryCode, CreateCustomerInput, createCustomerSchema (+19 more)

### Community 36 - "captureElementToBlob"
Cohesion: 0.14
Nodes (19): averageRgb01(), captureAndEmit(), captureElementFromRenderedAncestor(), captureElementToBlob(), compileShader(), cssColorToRgb01(), dominantRgb01(), findBackdropAncestor() (+11 more)

### Community 37 - "requestCorrelationId"
Cohesion: 0.15
Nodes (16): nextConfig, next, POST(), POST(), POST(), POST(), POST(), createTeamRequestSchema (+8 more)

### Community 38 - "live-browser-ignores.js"
Cohesion: 0.52
Nodes (6): globToRegex(), matchesScope(), normalizeIgnoreRule(), normalizeIgnoreValue(), pageCandidates(), resolveDetectIgnores()

### Community 39 - "captureElementToBlob"
Cohesion: 0.14
Nodes (19): averageRgb01(), captureAndEmit(), captureElementFromRenderedAncestor(), captureElementToBlob(), compileShader(), cssColorToRgb01(), dominantRgb01(), findBackdropAncestor() (+11 more)

### Community 40 - "interface"
Cohesion: 0.20
Nodes (9): interface, brand_color, default_prompt, display_name, icon_large, icon_small, short_description, policy (+1 more)

### Community 41 - "interface"
Cohesion: 0.25
Nodes (7): interface, brand_color, default_prompt, display_name, short_description, policy, allow_implicit_invocation

### Community 42 - "product-service.ts"
Cohesion: 0.09
Nodes (24): aliasInput, canTransitionProduct(), CreateProductInput, createProductSchema, decodeProductCursor(), namesInput, positiveId, productFields (+16 more)

### Community 43 - "interface"
Cohesion: 0.40
Nodes (4): interface, default_prompt, display_name, short_description

### Community 44 - "authorization.ts"
Cohesion: 0.32
Nodes (6): canAccessRecord(), scopeStrength, strongestScope(), grants, principal, RecordAccessContext

### Community 45 - "swagger-docs.tsx"
Cohesion: 0.29
Nodes (8): ApiDocsPage(), csrfCookie(), prepareRequest(), SwaggerDocs(), SwaggerRequest, SwaggerUIFactory, unsafeMethods, Window

### Community 46 - "auth-service.ts"
Cohesion: 0.12
Nodes (21): globalSetup(), zod, AuthenticationError, AuthConfig, environmentSchema, getAuthConfig(), secret, createCsrfToken() (+13 more)

### Community 47 - "product-specifications/presentation/api.ts"
Cohesion: 0.09
Nodes (33): GET(), POST(), POST(), GET(), GET(), POST(), PATCH(), GET() (+25 more)

### Community 49 - "setLiveState"
Cohesion: 0.09
Nodes (67): abortSvelteComponentInjection(), applyEditing(), beginNewLiveConfiguration(), buildLocatorForLeaf(), cancelEditing(), cancelEditingToPicking(), cancelInsertConfigure(), cleanup() (+59 more)

### Community 56 - "interface"
Cohesion: 0.29
Nodes (6): interface, default_prompt, display_name, short_description, policy, allow_implicit_invocation

### Community 57 - "access-repository.ts"
Cohesion: 0.12
Nodes (34): drizzle-orm, ACCESS_GRANTS, DatabaseState, getDatabase(), globalState, poolSize(), auditEvents, authRateLimits (+26 more)

### Community 58 - ".mcp.json"
Cohesion: 0.25
Nodes (10): npx, chrome-devtools, context7, knowledge-graph-memory, playwright, postgres-mcp, @microsoft/postgres-mcp, @modelcontextprotocol/server-memory (+2 more)

### Community 59 - "SpecificationRepository"
Cohesion: 0.16
Nodes (7): measurementView(), ProductNotEligibleError, revisionContent(), SpecificationConflictError, SpecificationImmutableError, SpecificationNotFoundError, SpecificationRepository

### Community 60 - "Principal"
Cohesion: 0.14
Nodes (14): requireGrant(), EffectiveGrant, Principal, allowedFields(), ContactService, expectVersion(), omit(), projectContact() (+6 more)

### Community 61 - "workspace-shell.tsx"
Cohesion: 0.12
Nodes (13): LoginPage(), dict, Locale, Messages, NavLink(), navNames, WorkspaceContent(), LoginForm() (+5 more)

### Community 62 - "scheduleAcceptCleanup"
Cohesion: 0.31
Nodes (11): acceptedDomAlreadyClean(), clearHandledWrapperReloadStamp(), deferredRecoverySuperseded(), ensureAcceptedDomClean(), findAcceptedRuntimeWrappers(), handledWrapperReloadKey(), reloadAfterMissingAcceptedDom(), restoreAcceptedDomFromSnapshot() (+3 more)

### Community 63 - "manifest.json"
Cohesion: 0.29
Nodes (6): authority, conflict_policy, schema_version, source, sync_mode, tasks

### Community 65 - "overrides"
Cohesion: 0.67
Nodes (3): overrides, @typescript-eslint/typescript-estree, minimatch

### Community 66 - "showToast"
Cohesion: 0.09
Nodes (34): abandonForeignSession(), abandonSupersededGo(), applyOriginalAttrsToSvelteAnchor(), clearMountErrorCard(), commitAcceptedSvelteComponentToDom(), componentModuleCandidates(), describeMountFailure(), detectDevServerBase() (+26 more)

### Community 67 - "specification-service.ts"
Cohesion: 0.09
Nodes (26): ApproveRevisionInput, approveRevisionSchema, archiveSpecificationSchema, comparableRevisionFields, CreateRevisionInput, createRevisionSchema, CreateSpecificationInput, createSpecificationSchema (+18 more)

### Community 68 - "initGlobalBar"
Cohesion: 0.13
Nodes (24): agentHasWorkInFlight(), agentStatusText(), barPaletteForTheme(), brandMarkSvg(), detectPageTheme(), ensureAgentPollTooltip(), ensureSpinKeyframes(), hideAgentPollTooltip() (+16 more)

### Community 69 - "src/backup.ts"
Cohesion: 0.25
Nodes (13): atomicWrite(), BackupConflictError, BackupOptions, BackupResult, backupTracker(), exists(), hashBody(), normalizeBody() (+5 more)

### Community 70 - "RecordScope"
Cohesion: 0.19
Nodes (9): projectSafeAuditDiff(), RecordScope, encodeContactCursor(), normalizeChannelHandle(), ContactConflictError, ContactNotFoundError, ContactRepository, parentScope() (+1 more)

### Community 71 - "scheduleAcceptCleanup"
Cohesion: 0.31
Nodes (11): acceptedDomAlreadyClean(), clearHandledWrapperReloadStamp(), deferredRecoverySuperseded(), ensureAcceptedDomClean(), findAcceptedRuntimeWrappers(), handledWrapperReloadKey(), reloadAfterMissingAcceptedDom(), restoreAcceptedDomFromSnapshot() (+3 more)

### Community 72 - "showToast"
Cohesion: 0.09
Nodes (34): abandonForeignSession(), abandonSupersededGo(), applyOriginalAttrsToSvelteAnchor(), clearMountErrorCard(), commitAcceptedSvelteComponentToDom(), componentModuleCandidates(), describeMountFailure(), detectDevServerBase() (+26 more)

### Community 73 - "access-control.ts"
Cohesion: 0.08
Nodes (33): bootstrapAdmin(), customerGrantPolicy, customerReadFields, grantContacts(), grantCustomers(), grantProducts(), grants, grantSpecifications() (+25 more)

### Community 74 - "handleManualEditActivity"
Cohesion: 0.19
Nodes (24): clearStoredManualApplyState(), fetchPendingCount(), handleManualEditActivity(), hidePendingApplyDock(), manualApplyLoadingText(), manualApplyStateKey(), manualEditEventForCurrentPage(), numberOrNull() (+16 more)

### Community 76 - "createLiveBrowserDomHelpers"
Cohesion: 0.16
Nodes (15): createLiveBrowserDomHelpers(), activeElementDeep(), cloneWithoutChrome(), copyTextViaSelection(), cssId(), liveUiRoot(), makeFrozenAnchor(), raiseHitModal() (+7 more)

### Community 77 - "contact-create-drawer.tsx"
Cohesion: 0.13
Nodes (20): ModulePage(), ContactCreateDrawer(), create(), handleKeyDown(), handleSubmit(), requestClose(), resetAndClose(), ContactPayload (+12 more)

### Community 78 - "customer-detail.tsx"
Cohesion: 0.18
Nodes (13): react, AcceptInvitationPage(), AcceptInvitationForm(), CustomerContactsPanel(), PanelContact, csrfToken(), Customer, CustomerDetail() (+5 more)

### Community 79 - "migrate.ts"
Cohesion: 0.17
Nodes (12): postgres@4.1.0, postgres, baselinePath, hasTable(), main(), migrationDirectory, root, sha256() (+4 more)

### Community 81 - "contact-detail.tsx"
Cohesion: 0.23
Nodes (11): Channel, Contact, ContactDetail(), send(), DetailField(), DetailValue(), Preference, preferencePurposes (+3 more)

### Community 82 - "createLiveBrowserSessionState"
Cohesion: 0.19
Nodes (17): createLiveBrowserSessionState(), clearHandled(), clearScrollY(), clearSession(), isHandled(), loadSession(), markHandled(), nextCheckpointRevision() (+9 more)

### Community 83 - "actOnAgentTarget"
Cohesion: 0.29
Nodes (17): actOnAgentTarget(), agentTargetBusyReason(), agentTargetOverlayGone(), agentTargetTaken(), claimAgentTarget(), claimAndActOnAgentTarget(), declineAgentTargetBusy(), declineAgentTargetUnresolvable() (+9 more)

### Community 84 - "onAnnotDown"
Cohesion: 0.24
Nodes (15): beginEditPin(), buildAnnotationsForCapture(), buildPinElement(), cancelEditingPin(), finalizeEditingPin(), initAnnotOverlay(), localCoords(), onAnnotDown() (+7 more)

### Community 85 - "actOnAgentTarget"
Cohesion: 0.29
Nodes (17): actOnAgentTarget(), agentTargetBusyReason(), agentTargetOverlayGone(), agentTargetTaken(), claimAgentTarget(), claimAndActOnAgentTarget(), declineAgentTargetBusy(), declineAgentTargetUnresolvable() (+9 more)

### Community 88 - "customer-create-drawer.tsx"
Cohesion: 0.14
Nodes (18): ModulePage(), csrfToken(), CustomerCreateDrawer(), create(), finishClose(), handleKeyDown(), handleSubmit(), requestClose() (+10 more)

### Community 89 - "ref_node_fs"
Cohesion: 0.14
Nodes (5): root, assetDirectory, AssetName, assets, payload

### Community 90 - "index.ts"
Cohesion: 0.26
Nodes (12): ExportResult, ALLOWED_STATUSES, hashSnapshotBody(), isIsoDate(), parseScalar(), parseSnapshot(), REQUIRED_FIELDS, SnapshotFrontMatter (+4 more)

### Community 91 - "export.ts"
Cohesion: 0.25
Nodes (13): parseTrackerPayload(), TrackerPayload, help(), main(), value(), decodeBody(), execFileAsync, ExportOptions (+5 more)

### Community 92 - "contact-repository.integration.test.ts"
Cohesion: 0.18
Nodes (12): admin, ContactRepositoryType, createContact(), CustomerRepositoryType, foreignMarketSale, handover(), isolatedUrl, manager (+4 more)

### Community 93 - "products/presentation/api.ts"
Cohesion: 0.16
Nodes (19): POST(), POST(), POST(), GET(), PATCH(), GET(), POST(), approveProduct() (+11 more)

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

### Community 100 - "specification-measurements.ts"
Cohesion: 0.24
Nodes (16): fromInteger(), isPositive(), toString(), assertPlausibleMeasurements(), decimalField(), isMeasurementUnit(), isWeightUnit(), MeasurementFields (+8 more)

### Community 101 - "interface"
Cohesion: 0.40
Nodes (4): interface, default_prompt, display_name, short_description

### Community 102 - "product-create-drawer.tsx"
Cohesion: 0.16
Nodes (17): lucide-react@1.69.0, lucide-react, ModulePage(), csrfToken(), Field(), FormSection(), payloadFrom(), ProductCreateDrawer() (+9 more)

### Community 103 - "decimal.ts"
Cohesion: 0.26
Nodes (17): add(), align(), assertScale(), compare(), Decimal, DecimalFormatError, fromString(), isNegative() (+9 more)

### Community 104 - "specification-snapshot.ts"
Cohesion: 0.15
Nodes (15): buildSpecificationSnapshot(), compareRevisionFields(), DocumentInput, iso(), isoOrNull(), plainObject(), ProductInput, RevisionInput (+7 more)

### Community 105 - "useMarket"
Cohesion: 0.20
Nodes (8): DashboardPage(), useMarket(), MarketDashboard(), Metric(), R1ListScreen(), R1Route, scoped(), RecordsTable()

### Community 106 - "specification-repository.ts"
Cohesion: 0.11
Nodes (17): fileAttachments, productAliases, specifications, specificationVersions, CodeAllocationError, Database, Executor, isImmutabilityViolation() (+9 more)

### Community 107 - "ProductRepository"
Cohesion: 0.19
Nodes (8): products, AliasRow, namesFromAliases(), ProductConflictError, ProductNotFoundError, ProductRepository, safeSearch(), searchAliasesFromAliases()

### Community 108 - "product-repository.integration.test.ts"
Cohesion: 0.24
Nodes (8): actor, admin, createInput(), createProduct(), isolatedUrl, Principal, ProductRepositoryType, request()

### Community 109 - "audit-safe-diff.ts"
Cohesion: 0.11
Nodes (19): AuditCursor, AuditQuery, auditQuerySchema, dateTime, decodeAuditCursor(), encodeAuditCursor(), positiveId, booleanFields (+11 more)

### Community 110 - "next"
Cohesion: 0.13
Nodes (21): POST(), GET(), GET(), GET(), currentPrincipal, list, GET(), GET() (+13 more)

### Community 111 - "react"
Cohesion: 0.16
Nodes (12): ModulePage(), csrfToken(), Revision, SpecificationDetail(), mutate(), saveDraft(), csrfToken(), Customer (+4 more)

### Community 112 - "onAnnotDown"
Cohesion: 0.24
Nodes (15): beginEditPin(), buildAnnotationsForCapture(), buildPinElement(), cancelEditingPin(), finalizeEditingPin(), initAnnotOverlay(), localCoords(), onAnnotDown() (+7 more)

### Community 113 - "specification-lifecycle.ts"
Cohesion: 0.15
Nodes (13): vitest, ApprovalFieldsMissingError, ApprovalRequiredField, approvalRequiredFields, assertApprovable(), canTransitionSpecificationRevision(), isBlank(), isEditableRevisionStatus() (+5 more)

### Community 114 - "specification-repository.integration.test.ts"
Cohesion: 0.32
Nodes (7): admin, createSpecification(), isolatedUrl, Principal, Repository, request(), validRevision()

### Community 115 - "product-detail.tsx"
Cohesion: 0.39
Nodes (6): ProductDetailPage(), csrfToken(), DetailValue(), Product, ProductDetail(), transition()

## Knowledge Gaps
- **4 isolated node(s):** `@microsoft/postgres-mcp`, `@modelcontextprotocol/server-memory`, `@playwright/mcp`, `@upstash/context7-mcp`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 505 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `requestCorrelationId` to `dependencies`, `package.json`, `[locale]/layout.tsx`, `R1RoutePage`, `product-create-drawer.tsx`, `useMarket`, `swagger-docs.tsx`, `next`, `customer-detail.tsx`, `contact-create-drawer.tsx`, `contact-detail.tsx`, `product-detail.tsx`, `customer-create-drawer.tsx`, `workspace-shell.tsx`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `@microsoft/postgres-mcp`, `@modelcontextprotocol/server-memory`, `@playwright/mcp` to the rest of the system?**
  _4 weakly-connected nodes found - possible missing edges._
- **Should `nimbalyst-tracker-export/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1323529411764706 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `specification-lifecycle.ts` to `package.json`, `openapi.ts`, `r1-route-data.ts`, `dependencies`, `AccessDeniedError`, `requestCorrelationId`, `product-service.ts`, `authorization.ts`, `auth-service.ts`, `Principal`, `workspace-shell.tsx`, `contact-create-drawer.tsx`, `customer-create-drawer.tsx`, `ref_node_fs`, `contact-repository.integration.test.ts`, `specification-measurements.ts`, `decimal.ts`, `specification-snapshot.ts`, `product-repository.integration.test.ts`, `audit-safe-diff.ts`, `next`, `specification-repository.integration.test.ts`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.057624113475177305 - nodes in this community are weakly interconnected._
- **Why does `Principal` connect `Principal` to `AccessDeniedError`, `specification-service.ts`, `requestCorrelationId`, `RecordScope`, `AccessRepository`, `specification-repository.ts`, `authorization.ts`, `product-service.ts`, `auth-service.ts`, `product-specifications/presentation/api.ts`, `ProductRepository`, `CustomerRepository`, `openapi.ts`, `access-repository.ts`, `SpecificationRepository`, `products/presentation/api.ts`, `contacts/presentation/api.ts`, `customers/presentation/api.ts`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Should `modern-screenshot.umd.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08583959899749373 - nodes in this community are weakly interconnected._