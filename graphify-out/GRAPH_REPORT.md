# Graph Report - ccc  (2026-11-11)

## Corpus Check
- 301 files · ~606,356 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 24 file(s) not represented in the graph (top: (none) 11, .toml 8, .cmd 2)

## Summary
- 3070 nodes · 8540 edges · 121 communities (105 shown, 16 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 224 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `37a15b7c`
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
- price-lists/presentation/api.ts
- live-browser-ignores.js
- captureElementToBlob
- interface
- interface
- product-service.ts
- interface
- vitest
- swagger-docs.tsx
- next
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
- cli.ts
- contact-repository.integration.test.ts
- request-auth.ts
- interface
- interface
- price-list-service.ts
- interface
- .claude/skills/impeccable/scripts/live-browser-ignores.js
- specification-measurements.ts
- interface
- product-create-drawer.tsx
- decimal.ts
- specification-snapshot.ts
- price-list-workspace.tsx
- specification-repository.ts
- ProductRepository
- product-repository.integration.test.ts
- audit-safe-diff.ts
- PriceListRepository
- react
- onAnnotDown
- specification-lifecycle.ts
- specification-repository.integration.test.ts
- product-detail.tsx
- ref_node_crypto
- fromString
- price-list-selection.ts
- contact-create-drawer.test.tsx
- ProductNotFoundError

## God Nodes (most connected - your core abstractions)
1. `Principal` - 146 edges
2. `EffectiveGrant` - 71 edges
3. `requireGrant()` - 61 edges
4. `requestCorrelationId()` - 57 edges
5. `AccessDeniedError` - 45 edges
6. `AccessRepository` - 43 edges
7. `authErrorResponse()` - 42 edges
8. `vitest` - 36 edges
9. `currentPrincipal()` - 35 edges
10. `connectSSE()` - 34 edges

## Surprising Connections (you probably didn't know these)
- `globalSetup()` --calls--> `hashPassword()`  [EXTRACTED]
  e2e/global-setup.ts → src/modules/access-control/infrastructure/password.ts
- `bootstrapAdmin()` --calls--> `hashPassword()`  [EXTRACTED]
  scripts/access-control.ts → src/modules/access-control/infrastructure/password.ts
- `ModulePage()` --calls--> `currentPrincipal()`  [EXTRACTED]
  src/app/[locale]/(workspace)/price-lists/page.tsx → src/modules/access-control/application/request-auth.ts
- `POST()` --calls--> `approvePriceList()`  [EXTRACTED]
  src/app/api/v1/price-lists/[id]/approve/route.ts → src/modules/price-lists/presentation/api.ts
- `POST()` --calls--> `archivePriceList()`  [EXTRACTED]
  src/app/api/v1/price-lists/[id]/archive/route.ts → src/modules/price-lists/presentation/api.ts

## Import Cycles
- None detected.

## Communities (121 total, 16 thin omitted)

### Community 0 - "nimbalyst-tracker-export/package.json"
Cohesion: 0.13
Nodes (16): bin, nimbalyst-tracker-export, description, devDependencies, @types/node@26.6.6, typescript@5.9.3, exports, files (+8 more)

### Community 1 - "package.json"
Cohesion: 0.06
Nodes (42): devDependencies, eslint@9.39.5, eslint-config-next@16.4.5, jsdom@31.0.0, postcss@8.5.32, prettier@3.9.10, prettier-plugin-tailwindcss@0.8.1, tailwindcss@4.3.4 (+34 more)

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
Cohesion: 0.20
Nodes (10): ModulePage(), ModulePage(), ModulePage(), ModulePage(), ModulePage(), ModulePage(), SearchPage(), ModulePage() (+2 more)

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
Cohesion: 0.10
Nodes (5): projectSafeAuditDiff(), RoleCode, AccessRepository, isRecordScope(), isRoleCode()

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
Cohesion: 0.08
Nodes (37): ContactVersionRequiredError, expectVersion(), projectableFields, writableFields, ChannelInput, channelInputSchema, ContactChannelKind, contactChannelKinds (+29 more)

### Community 25 - "contacts/presentation/api.ts"
Cohesion: 0.09
Nodes (36): POST(), PATCH(), GET(), POST(), POST(), PATCH(), GET(), POST() (+28 more)

### Community 26 - "documentRefForElement"
Cohesion: 0.06
Nodes (39): addManualContextText(), canRestoreManualEditElement(), collectEditableTextRows(), visit(), collectManualContextPieces(), walk(), contextElementForManualEdit(), copyEditContainerContext() (+31 more)

### Community 27 - "r1-route-data.ts"
Cohesion: 0.09
Nodes (15): DashboardPage(), useMarket(), MarketDashboard(), Metric(), R1ListScreen(), customer(), market(), product() (+7 more)

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
Cohesion: 0.14
Nodes (20): POST(), POST(), POST(), GET(), PATCH(), GET(), POST(), customerMarketCodeSchema (+12 more)

### Community 32 - "dependencies"
Cohesion: 0.09
Nodes (21): dependencies, class-variance-authority@0.7.1, clsx@2.1.1, drizzle-orm@0.45.4, jose@6.2.15, lucide-react@1.69.0, next@16.4.5, react@19.3.1 (+13 more)

### Community 33 - "scripts"
Cohesion: 0.11
Nodes (19): scripts, access:operator, build, db:migrate, db:validate-migrations, dev, format, format:check (+11 more)

### Community 35 - "AccessDeniedError"
Cohesion: 0.08
Nodes (25): AccessDeniedError, addressInput, archiveCustomerSchema, canTransitionCustomer(), countryCode, CreateCustomerInput, createCustomerSchema, currencyCode (+17 more)

### Community 36 - "captureElementToBlob"
Cohesion: 0.14
Nodes (19): averageRgb01(), captureAndEmit(), captureElementFromRenderedAncestor(), captureElementToBlob(), compileShader(), cssColorToRgb01(), dominantRgb01(), findBackdropAncestor() (+11 more)

### Community 37 - "price-lists/presentation/api.ts"
Cohesion: 0.12
Nodes (29): GET(), POST(), POST(), PATCH(), GET(), POST(), GET(), PATCH() (+21 more)

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

### Community 44 - "vitest"
Cohesion: 0.13
Nodes (10): vitest, canAccessRecord(), scopeStrength, strongestScope(), grants, principal, RecordAccessContext, actor (+2 more)

### Community 45 - "swagger-docs.tsx"
Cohesion: 0.29
Nodes (8): ApiDocsPage(), csrfCookie(), prepareRequest(), SwaggerDocs(), SwaggerRequest, SwaggerUIFactory, unsafeMethods, Window

### Community 46 - "next"
Cohesion: 0.10
Nodes (28): nextConfig, next, zod, POST(), POST(), POST(), POST(), GET() (+20 more)

### Community 47 - "product-specifications/presentation/api.ts"
Cohesion: 0.10
Nodes (32): GET(), POST(), POST(), GET(), GET(), POST(), PATCH(), GET() (+24 more)

### Community 49 - "setLiveState"
Cohesion: 0.09
Nodes (67): abortSvelteComponentInjection(), applyEditing(), beginNewLiveConfiguration(), buildLocatorForLeaf(), cancelEditing(), cancelEditingToPicking(), cancelInsertConfigure(), cleanup() (+59 more)

### Community 56 - "interface"
Cohesion: 0.29
Nodes (6): interface, default_prompt, display_name, short_description, policy, allow_implicit_invocation

### Community 57 - "access-repository.ts"
Cohesion: 0.10
Nodes (41): drizzle-orm, ACCESS_GRANTS, DatabaseState, getDatabase(), globalState, poolSize(), auditEvents, authRateLimits (+33 more)

### Community 58 - ".mcp.json"
Cohesion: 0.25
Nodes (10): npx, chrome-devtools, context7, knowledge-graph-memory, playwright, postgres-mcp, @microsoft/postgres-mcp, @modelcontextprotocol/server-memory (+2 more)

### Community 59 - "SpecificationRepository"
Cohesion: 0.16
Nodes (7): measurementView(), ProductNotEligibleError, revisionContent(), SpecificationConflictError, SpecificationImmutableError, SpecificationNotFoundError, SpecificationRepository

### Community 60 - "Principal"
Cohesion: 0.12
Nodes (14): requireGrant(), EffectiveGrant, Principal, allowedFields(), ContactService, omit(), projectContact(), assertAllowedFields() (+6 more)

### Community 61 - "workspace-shell.tsx"
Cohesion: 0.10
Nodes (16): react, AcceptInvitationPage(), LoginPage(), dict, Locale, Messages, NavLink(), navNames (+8 more)

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
Cohesion: 0.05
Nodes (45): recordScopes, childIdParameter, commonErrors, cookieSecurity, csrfParameter, errorSchema, idParameter, jsonBody() (+37 more)

### Community 68 - "initGlobalBar"
Cohesion: 0.13
Nodes (24): agentHasWorkInFlight(), agentStatusText(), barPaletteForTheme(), brandMarkSvg(), detectPageTheme(), ensureAgentPollTooltip(), ensureSpinKeyframes(), hideAgentPollTooltip() (+16 more)

### Community 69 - "src/backup.ts"
Cohesion: 0.17
Nodes (24): atomicWrite(), BackupConflictError, BackupOptions, BackupResult, backupTracker(), exists(), hashBody(), normalizeBody() (+16 more)

### Community 70 - "RecordScope"
Cohesion: 0.19
Nodes (8): RecordScope, encodeContactCursor(), normalizeChannelHandle(), ContactConflictError, ContactNotFoundError, ContactRepository, parentScope(), safeSearch()

### Community 71 - "scheduleAcceptCleanup"
Cohesion: 0.31
Nodes (11): acceptedDomAlreadyClean(), clearHandledWrapperReloadStamp(), deferredRecoverySuperseded(), ensureAcceptedDomClean(), findAcceptedRuntimeWrappers(), handledWrapperReloadKey(), reloadAfterMissingAcceptedDom(), restoreAcceptedDomFromSnapshot() (+3 more)

### Community 72 - "showToast"
Cohesion: 0.09
Nodes (34): abandonForeignSession(), abandonSupersededGo(), applyOriginalAttrsToSvelteAnchor(), clearMountErrorCard(), commitAcceptedSvelteComponentToDom(), componentModuleCandidates(), describeMountFailure(), detectDevServerBase() (+26 more)

### Community 73 - "access-control.ts"
Cohesion: 0.07
Nodes (38): bootstrapAdmin(), customerGrantPolicy, customerReadFields, grantContacts(), grantCustomers(), grantPriceLists(), grantProducts(), grants (+30 more)

### Community 74 - "handleManualEditActivity"
Cohesion: 0.19
Nodes (24): clearStoredManualApplyState(), fetchPendingCount(), handleManualEditActivity(), hidePendingApplyDock(), manualApplyLoadingText(), manualApplyStateKey(), manualEditEventForCurrentPage(), numberOrNull() (+16 more)

### Community 76 - "createLiveBrowserDomHelpers"
Cohesion: 0.16
Nodes (15): createLiveBrowserDomHelpers(), activeElementDeep(), cloneWithoutChrome(), copyTextViaSelection(), cssId(), liveUiRoot(), makeFrozenAnchor(), raiseHitModal() (+7 more)

### Community 77 - "contact-create-drawer.tsx"
Cohesion: 0.16
Nodes (18): ModulePage(), ContactCreateDrawer(), create(), handleKeyDown(), handleSubmit(), requestClose(), resetAndClose(), ContactPayload (+10 more)

### Community 78 - "customer-detail.tsx"
Cohesion: 0.24
Nodes (11): CustomerDetailPage(), CustomerContactsPanel(), PanelContact, csrfToken(), Customer, CustomerDetail(), archive(), reassign() (+3 more)

### Community 79 - "migrate.ts"
Cohesion: 0.13
Nodes (17): postgres@4.1.0, postgres, baselinePath, hasTable(), main(), migrationDirectory, root, sha256() (+9 more)

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
Nodes (19): lucide-react, ModulePage(), csrfToken(), CustomerCreateDrawer(), create(), finishClose(), handleKeyDown(), handleSubmit() (+11 more)

### Community 89 - "ref_node_fs"
Cohesion: 0.13
Nodes (10): execFileAsync, loadRootEnv(), main(), printHelp(), readInput(), root, assetDirectory, AssetName (+2 more)

### Community 90 - "index.ts"
Cohesion: 0.20
Nodes (11): ALLOWED_STATUSES, hashSnapshotBody(), isIsoDate(), parseScalar(), parseSnapshot(), REQUIRED_FIELDS, SnapshotFrontMatter, SnapshotValidationResult (+3 more)

### Community 91 - "cli.ts"
Cohesion: 0.83
Nodes (3): help(), main(), value()

### Community 92 - "contact-repository.integration.test.ts"
Cohesion: 0.18
Nodes (12): admin, ContactRepositoryType, createContact(), CustomerRepositoryType, foreignMarketSale, handover(), isolatedUrl, manager (+4 more)

### Community 93 - "request-auth.ts"
Cohesion: 0.09
Nodes (42): POST(), GET(), POST(), POST(), POST(), POST(), GET(), GET() (+34 more)

### Community 94 - "interface"
Cohesion: 0.20
Nodes (9): interface, brand_color, default_prompt, display_name, icon_large, icon_small, short_description, policy (+1 more)

### Community 96 - "interface"
Cohesion: 0.25
Nodes (7): interface, brand_color, default_prompt, display_name, short_description, policy, allow_implicit_invocation

### Community 97 - "price-list-service.ts"
Cohesion: 0.09
Nodes (28): approvePriceListSchema, archivePriceListSchema, createPriceListSchema, createSelectionSchema, currency, cursorPattern(), decimal, decodePriceListCursor() (+20 more)

### Community 98 - "interface"
Cohesion: 0.29
Nodes (6): interface, default_prompt, display_name, short_description, policy, allow_implicit_invocation

### Community 99 - ".claude/skills/impeccable/scripts/live-browser-ignores.js"
Cohesion: 0.52
Nodes (6): globToRegex(), matchesScope(), normalizeIgnoreRule(), normalizeIgnoreValue(), pageCandidates(), resolveDetectIgnores()

### Community 100 - "specification-measurements.ts"
Cohesion: 0.21
Nodes (18): fromInteger(), isPositive(), multiply(), toString(), assertPlausibleMeasurements(), decimalField(), isMeasurementUnit(), isWeightUnit() (+10 more)

### Community 101 - "interface"
Cohesion: 0.40
Nodes (4): interface, default_prompt, display_name, short_description

### Community 102 - "product-create-drawer.tsx"
Cohesion: 0.18
Nodes (15): ModulePage(), csrfToken(), Field(), FormSection(), payloadFrom(), ProductCreateDrawer(), finishClose(), handleKeyDown() (+7 more)

### Community 103 - "decimal.ts"
Cohesion: 0.28
Nodes (14): add(), align(), assertScale(), Decimal, DecimalFormatError, isNegative(), isZero(), multiplyByInteger() (+6 more)

### Community 104 - "specification-snapshot.ts"
Cohesion: 0.17
Nodes (14): buildSpecificationSnapshot(), compareRevisionFields(), DocumentInput, iso(), isoOrNull(), plainObject(), ProductInput, RevisionInput (+6 more)

### Community 105 - "price-list-workspace.tsx"
Cohesion: 0.09
Nodes (22): ModulePage(), amountsMatch(), csrfToken(), Customer, EligiblePricesPanel(), record(), Option, Product (+14 more)

### Community 106 - "specification-repository.ts"
Cohesion: 0.12
Nodes (15): fileAttachments, specifications, CodeAllocationError, Database, Executor, isImmutabilityViolation(), isUniqueViolation(), postgresErrorCode() (+7 more)

### Community 107 - "ProductRepository"
Cohesion: 0.24
Nodes (7): productAliases, products, AliasRow, namesFromAliases(), ProductRepository, safeSearch(), searchAliasesFromAliases()

### Community 108 - "product-repository.integration.test.ts"
Cohesion: 0.24
Nodes (8): actor, admin, createInput(), createProduct(), isolatedUrl, Principal, ProductRepositoryType, request()

### Community 109 - "audit-safe-diff.ts"
Cohesion: 0.09
Nodes (28): GET(), currentPrincipal, list, AuditLogPage(), SearchParams, ContactDetailPage(), WorkspaceLayout(), WorkspaceShell() (+20 more)

### Community 110 - "PriceListRepository"
Cohesion: 0.24
Nodes (8): cursorFor(), PriceListBusinessRuleError, PriceListConflictError, PriceListImmutableError, PriceListNotFoundError, PriceListRepository, timestampValues(), validateItemCombination()

### Community 111 - "react"
Cohesion: 0.16
Nodes (12): ModulePage(), csrfToken(), Revision, SpecificationDetail(), mutate(), saveDraft(), csrfToken(), Customer (+4 more)

### Community 112 - "onAnnotDown"
Cohesion: 0.24
Nodes (15): beginEditPin(), buildAnnotationsForCapture(), buildPinElement(), cancelEditingPin(), finalizeEditingPin(), initAnnotOverlay(), localCoords(), onAnnotDown() (+7 more)

### Community 113 - "specification-lifecycle.ts"
Cohesion: 0.17
Nodes (12): ApprovalFieldsMissingError, ApprovalRequiredField, approvalRequiredFields, assertApprovable(), canTransitionSpecificationRevision(), isBlank(), isEditableRevisionStatus(), missingApprovalFields() (+4 more)

### Community 114 - "specification-repository.integration.test.ts"
Cohesion: 0.32
Nodes (7): admin, createSpecification(), isolatedUrl, Principal, Repository, request(), validRevision()

### Community 115 - "product-detail.tsx"
Cohesion: 0.39
Nodes (6): ProductDetailPage(), csrfToken(), DetailValue(), Product, ProductDetail(), transition()

### Community 116 - "ref_node_crypto"
Cohesion: 0.20
Nodes (8): globalSetup(), @playwright/test@1.65.0, @playwright/test, getDummyPasswordHash(), hashPassword(), scrypt(), validatePassword(), verifyPassword()

### Community 117 - "fromString"
Cohesion: 0.21
Nodes (15): compare(), fromString(), createPriceListItemSchema, positiveDecimal, updatePriceListItemSchema, compareTierWidth(), EligibilityCriteria, EligibleCandidate (+7 more)

### Community 118 - "price-list-selection.ts"
Cohesion: 0.29
Nodes (6): classifyPriceSelection(), PriceSelectionBusinessRuleError, PriceSelectionReasonError, SelectionClassification, SelectionRequest, eligible

### Community 119 - "contact-create-drawer.test.tsx"
Cohesion: 0.33
Nodes (4): @testing-library/react@16.3.3, @testing-library/react, buyerResponse, router

## Knowledge Gaps
- **4 isolated node(s):** `@microsoft/postgres-mcp`, `@modelcontextprotocol/server-memory`, `@playwright/mcp`, `@upstash/context7-mcp`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 548 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `dependencies`, `package.json`, `[locale]/layout.tsx`, `R1RoutePage`, `product-create-drawer.tsx`, `audit-safe-diff.ts`, `customer-detail.tsx`, `swagger-docs.tsx`, `contact-create-drawer.tsx`, `contact-detail.tsx`, `product-detail.tsx`, `request-auth.ts`, `customer-create-drawer.tsx`, `r1-route-data.ts`, `workspace-shell.tsx`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `@microsoft/postgres-mcp`, `@modelcontextprotocol/server-memory`, `@playwright/mcp` to the rest of the system?**
  _4 weakly-connected nodes found - possible missing edges._
- **Should `nimbalyst-tracker-export/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1323529411764706 - nodes in this community are weakly interconnected._
- **Why does `Principal` connect `Principal` to `AccessRepository`, `CustomerRepository`, `openapi.ts`, `contacts/presentation/api.ts`, `customers/presentation/api.ts`, `AccessDeniedError`, `price-lists/presentation/api.ts`, `product-service.ts`, `vitest`, `next`, `product-specifications/presentation/api.ts`, `access-repository.ts`, `SpecificationRepository`, `specification-service.ts`, `RecordScope`, `request-auth.ts`, `price-list-service.ts`, `specification-repository.ts`, `ProductRepository`, `audit-safe-diff.ts`, `PriceListRepository`, `ProductNotFoundError`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05990338164251208 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `vitest` to `package.json`, `openapi.ts`, `contacts/presentation/api.ts`, `r1-route-data.ts`, `dependencies`, `AccessDeniedError`, `product-service.ts`, `workspace-shell.tsx`, `specification-service.ts`, `migrate.ts`, `customer-create-drawer.tsx`, `ref_node_fs`, `index.ts`, `contact-repository.integration.test.ts`, `price-list-service.ts`, `specification-measurements.ts`, `decimal.ts`, `product-repository.integration.test.ts`, `audit-safe-diff.ts`, `specification-lifecycle.ts`, `specification-repository.integration.test.ts`, `ref_node_crypto`, `fromString`, `price-list-selection.ts`, `contact-create-drawer.test.tsx`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Should `modern-screenshot.umd.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08583959899749373 - nodes in this community are weakly interconnected._