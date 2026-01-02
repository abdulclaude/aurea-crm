var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AureaSDK: () => AureaSDK,
  getAurea: () => getAurea,
  identifyUser: () => identifyUser,
  initAurea: () => initAurea,
  trackConversion: () => trackConversion,
  trackEvent: () => trackEvent,
  trackPage: () => trackPage
});
module.exports = __toCommonJS(index_exports);
var import_ua_parser_js = require("ua-parser-js");
var import_web_vitals = require("web-vitals");
var AureaSDK = class {
  constructor(config) {
    this.eventQueue = [];
    this.initialized = false;
    this.sessionStartTime = Date.now();
    this.pageStartTime = Date.now();
    this.activeTime = 0;
    this.lastActiveTimestamp = Date.now();
    this.isPageVisible = true;
    this.webVitalsCollected = {
      lcp: false,
      inp: false,
      cls: false,
      fcp: false,
      ttfb: false
    };
    // NEW: Funnel tracking
    this.currentStage = "awareness";
    this.stageHistory = [];
    this.microConversions = [];
    this.isInCheckout = false;
    // NEW: Event categorization tracking
    this.eventCategoryStats = /* @__PURE__ */ new Map();
    // NEW: Track which events have been fired (for trackOnce behavior)
    this.trackedOnceEvents = /* @__PURE__ */ new Set();
    // GDPR: Consent tracking
    this.consentGiven = false;
    this.consentVersion = "1.0";
    this.config = {
      apiUrl: "http://localhost:3000/api",
      debug: false,
      autoTrack: {
        pageViews: true,
        forms: true,
        clicks: false,
        scrollDepth: false
      },
      respectDoNotTrack: true,
      anonymizeIp: true,
      batchSize: 10,
      batchInterval: 2e3,
      ...config
    };
    this.sessionId = this.getOrCreateSessionId();
    this.anonymousId = this.getOrCreateAnonymousId();
    if (typeof window !== "undefined") {
      const savedUserId = localStorage.getItem("aurea_user_id");
      if (savedUserId) {
        this.userId = savedUserId;
      }
      const savedConsent = localStorage.getItem("aurea_consent");
      const savedConsentVersion = localStorage.getItem("aurea_consent_version");
      if (savedConsent === "granted" && savedConsentVersion) {
        this.consentGiven = true;
        this.consentVersion = savedConsentVersion;
      }
    }
  }
  /**
   * Initialize the SDK
   */
  async init() {
    if (this.initialized) {
      console.warn("[Aurea SDK] Already initialized");
      return;
    }
    if (this.config.respectDoNotTrack && typeof navigator !== "undefined" && (navigator.doNotTrack === "1" || navigator.msDoNotTrack === "1" || navigator.globalPrivacyControl === true)) {
      if (this.config.debug) {
        console.log("[Aurea SDK] Do Not Track or Global Privacy Control enabled, skipping initialization");
      }
      return;
    }
    if (this.config.gdprConsent?.required) {
      if (!this.consentGiven) {
        if (this.config.debug) {
          console.log("[Aurea SDK] GDPR consent required but not given");
        }
        if (this.config.gdprConsent.onConsentRequired) {
          const consentGranted = await this.config.gdprConsent.onConsentRequired();
          if (consentGranted) {
            this.grantConsent(this.config.gdprConsent.consentVersion || "1.0");
          } else {
            if (this.config.debug) {
              console.log("[Aurea SDK] Consent not granted, tracking disabled");
            }
            return;
          }
        } else {
          if (this.config.debug) {
            console.log("[Aurea SDK] Waiting for manual consent via grantConsent()");
          }
          return;
        }
      }
    }
    this.initialized = true;
    if (this.config.autoTrack?.pageViews) {
      this.trackPageLoad();
      this.trackPageChanges();
    }
    if (this.config.autoTrack?.forms) {
      this.trackForms();
    }
    if (this.config.autoTrack?.scrollDepth) {
      this.trackScrollDepth();
    }
    this.startBatchTimer();
    this.startPurchasePolling();
    this.trackWebVitals();
    this.trackSessionTiming();
    this.initializeFunnelTracking();
    if (this.config.debug) {
      console.log("[Aurea SDK] Initialized", {
        sessionId: this.sessionId,
        anonymousId: this.anonymousId,
        userId: this.userId,
        currentStage: this.currentStage
      });
    }
  }
  /**
   * Track a custom event
   */
  track(eventName, properties) {
    const event = {
      eventId: this.generateEventId(),
      eventName,
      properties: properties || {},
      context: this.buildContext(),
      timestamp: Date.now()
    };
    this.enqueueEvent(event);
    if (this.config.debug) {
      console.log("[Aurea SDK] Event tracked:", eventName, properties);
    }
  }
  /**
   * Grant GDPR consent
   * Call this when user accepts your privacy policy/cookie banner
   */
  grantConsent(version = "1.0") {
    this.consentGiven = true;
    this.consentVersion = version;
    if (typeof window !== "undefined") {
      localStorage.setItem("aurea_consent", "granted");
      localStorage.setItem("aurea_consent_version", version);
      localStorage.setItem("aurea_consent_timestamp", (/* @__PURE__ */ new Date()).toISOString());
    }
    this.track("consent_granted", {
      consentVersion: version,
      timestamp: Date.now()
    });
    if (!this.initialized) {
      this.init();
    }
    if (this.config.debug) {
      console.log("[Aurea SDK] Consent granted:", version);
    }
  }
  /**
   * Revoke GDPR consent
   * Call this when user revokes consent (e.g., via cookie settings)
   */
  revokeConsent() {
    this.consentGiven = false;
    if (typeof window !== "undefined") {
      localStorage.removeItem("aurea_consent");
      localStorage.removeItem("aurea_consent_version");
      localStorage.removeItem("aurea_consent_timestamp");
    }
    this.track("consent_revoked", {
      timestamp: Date.now()
    });
    this.initialized = false;
    if (this.config.debug) {
      console.log("[Aurea SDK] Consent revoked, tracking stopped");
    }
  }
  /**
   * Check if consent has been given
   */
  hasConsent() {
    return this.consentGiven;
  }
  /**
   * Request data deletion (Right to be Forgotten)
   */
  async requestDataDeletion() {
    try {
      await fetch(`${this.config.apiUrl}/track/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Aurea-API-Key": this.config.apiKey,
          "X-Aurea-Funnel-ID": this.config.funnelId
        },
        body: JSON.stringify({
          anonymousId: this.anonymousId,
          userId: this.userId
        })
      });
      if (typeof window !== "undefined") {
        localStorage.removeItem("aurea_anonymous_id");
        localStorage.removeItem("aurea_user_id");
        localStorage.removeItem("aurea_consent");
        localStorage.removeItem("aurea_consent_version");
        localStorage.removeItem("aurea_consent_timestamp");
        sessionStorage.removeItem("aurea_session_id");
      }
      if (this.config.debug) {
        console.log("[Aurea SDK] Data deletion requested");
      }
    } catch (error) {
      console.error("[Aurea SDK] Failed to request data deletion:", error);
      throw error;
    }
  }
  /**
   * Identify a user (links anonymous user to known user)
   */
  identify(userId, traits) {
    const previousUserId = this.userId;
    this.userId = userId;
    if (typeof window !== "undefined") {
      localStorage.setItem("aurea_user_id", userId);
      if (traits) {
        localStorage.setItem("aurea_user_traits", JSON.stringify(traits));
      }
    }
    this.track("user_identified", {
      userId,
      anonymousId: this.anonymousId,
      previousUserId,
      traits: traits || {},
      timestamp: Date.now()
    });
    if (this.config.debug) {
      console.log("[Aurea SDK] User identified:", {
        userId,
        anonymousId: this.anonymousId,
        traits
      });
    }
  }
  /**
   * Track a page view
   */
  page(name, properties) {
    this.track("page_view", {
      pageName: name || (typeof document !== "undefined" ? document.title : ""),
      pageUrl: typeof window !== "undefined" ? window.location.href : "",
      pagePath: typeof window !== "undefined" ? window.location.pathname : "",
      pageSearch: typeof window !== "undefined" ? window.location.search : "",
      referrer: typeof document !== "undefined" ? document.referrer : "",
      ...properties
    });
  }
  /**
   * Track a conversion event
   */
  conversion(data) {
    this.track("conversion", {
      conversionType: data.type,
      revenue: data.revenue,
      currency: data.currency || "USD",
      orderId: data.orderId,
      ...data.properties
    });
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("aurea_converted", "true");
    }
    if (this.config.debug) {
      console.log("[Aurea SDK] Conversion tracked:", data);
    }
  }
  /**
   * Register custom event categories
   * Allows users to define their own event categorization and auto-stage progression
   * 
   * @example
   * aurea.registerEventCategories({
   *   'video_started': { 
   *     category: 'engagement', 
   *     advanceTo: 'interest',
   *     value: 30,
   *     description: 'User started watching sales video'
   *   },
   *   'pricing_viewed': { 
   *     category: 'intent', 
   *     advanceTo: 'desire',
   *     value: 60
   *   },
   *   'buy_button_clicked': {
   *     category: 'conversion',
   *     value: 90
   *   }
   * })
   */
  registerEventCategories(categories) {
    if (!this.config.eventCategories) {
      this.config.eventCategories = {};
    }
    this.config.eventCategories = {
      ...this.config.eventCategories,
      ...categories
    };
    if (this.config.debug) {
      console.log("[Aurea SDK] Event categories registered:", categories);
    }
  }
  /**
   * Track a categorized event with automatic stage progression
   * This is the recommended way to track events - user defines their own event names
   * 
   * @param eventName - User-defined event name (e.g., 'video_started', 'pricing_clicked')
   * @param properties - Additional event properties
   * @param options - Override category/value/stage for this specific event
   * 
   * @example
   * // Using pre-registered category
   * aurea.trackEvent('video_started', { duration: 120 })
   * 
   * // One-off event with inline category
   * aurea.trackEvent('custom_action', { foo: 'bar' }, {
   *   category: 'engagement',
   *   value: 40,
   *   advanceTo: 'interest'
   * })
   */
  trackEvent(eventName, properties, options) {
    const categoryConfig = this.config.eventCategories?.[eventName];
    const category = options?.category || categoryConfig?.category || "custom";
    const value = options?.value ?? categoryConfig?.value ?? 50;
    const advanceTo = options?.advanceTo || categoryConfig?.advanceTo;
    const description = options?.description || categoryConfig?.description;
    const color = options?.color || categoryConfig?.color;
    const trackOnce = categoryConfig?.trackOnce ?? false;
    if (trackOnce) {
      if (this.trackedOnceEvents.has(eventName)) {
        if (this.config.debug) {
          console.log(`[Aurea SDK] Event skipped (already tracked once): ${eventName}`);
        }
        return;
      }
      this.trackedOnceEvents.add(eventName);
    }
    this.eventCategoryStats.set(
      category,
      (this.eventCategoryStats.get(category) || 0) + 1
    );
    const autoAdvance = this.config.autoAdvanceStages !== false;
    if (autoAdvance && advanceTo && advanceTo !== this.currentStage) {
      this.enterStage(advanceTo);
    }
    this.track(eventName, {
      ...properties,
      // Add categorization metadata
      _category: category,
      _value: value,
      _description: description,
      _color: color,
      // Custom color (e.g., 'fuchsia' or full Tailwind classes)
      _currentStage: this.currentStage,
      _categoryStats: Object.fromEntries(this.eventCategoryStats),
      _trackedOnce: trackOnce
      // Include for backend reference
    });
    if (this.config.debug) {
      console.log(`[Aurea SDK] Event tracked: ${eventName} [${category}] (value: ${value}, stage: ${this.currentStage}${trackOnce ? ", once-only" : ""})`);
    }
  }
  /**
   * Get current event category statistics
   */
  getCategoryStats() {
    return Object.fromEntries(this.eventCategoryStats);
  }
  /**
   * Get anonymous ID
   * Returns the persistent identifier for this user across sessions
   */
  getAnonymousId() {
    return this.anonymousId;
  }
  /**
   * Get session ID
   * Returns the unique identifier for this browsing session
   */
  getSessionId() {
    return this.sessionId;
  }
  /**
   * Get user ID
   * Returns the identified user ID if user has been identified
   */
  getUserId() {
    return this.userId;
  }
  /**
   * Get current funnel stage
   */
  getCurrentStage() {
    return this.currentStage;
  }
  /**
   * Get stage history
   */
  getStageHistory() {
    return this.stageHistory.map((entry, index) => {
      const nextEntry = this.stageHistory[index + 1];
      const durationMs = nextEntry ? nextEntry.enteredAt - entry.enteredAt : Date.now() - entry.enteredAt;
      return {
        stage: entry.stage,
        enteredAt: entry.enteredAt,
        durationMs
      };
    });
  }
  /**
   * Enter a new funnel stage
   */
  enterStage(stage) {
    const previousStage = this.currentStage;
    this.currentStage = stage;
    this.stageHistory.push({
      stage,
      enteredAt: Date.now()
    });
    this.track("funnel_stage_entered", {
      stage,
      previousStage,
      stageHistory: this.stageHistory,
      timeInPreviousStage: this.getTimeInCurrentStage(previousStage)
    });
    if (this.config.debug) {
      console.log(`[Aurea SDK] Entered funnel stage: ${previousStage} \u2192 ${stage}`);
    }
  }
  /**
   * Track micro-conversion (engagement signals)
   * 
   * @deprecated Use trackEvent() instead for more flexibility
   * This method is kept for backward compatibility
   * 
   * @param type - Type of micro-conversion (e.g., 'video_played', 'faq_opened')
   * @param value - Impact score 0-100 (how strong this signal is)
   * @param properties - Additional metadata
   * @param autoAdvanceStage - Whether to automatically advance funnel stage (default: true)
   */
  trackMicroConversion(type, value = 50, properties, autoAdvanceStage = true) {
    const microConversion = {
      type,
      value,
      properties
    };
    this.microConversions.push(microConversion);
    const categoryConfig = this.config.eventCategories?.[type];
    if (autoAdvanceStage) {
      if (categoryConfig?.advanceTo && categoryConfig.advanceTo !== this.currentStage) {
        this.enterStage(categoryConfig.advanceTo);
      } else {
        const suggestedStage = this.getSuggestedStageFromMicroConversion(type, value);
        if (suggestedStage && suggestedStage !== this.currentStage) {
          this.enterStage(suggestedStage);
        }
      }
    }
    this.track("micro_conversion", {
      microConversionType: type,
      value,
      category: categoryConfig?.category || "custom",
      currentStage: this.currentStage,
      totalMicroConversions: this.microConversions.length,
      ...properties
    });
    if (this.config.debug) {
      console.log(`[Aurea SDK] Micro-conversion: ${type} (value: ${value}, stage: ${this.currentStage})`);
    }
  }
  /**
   * Determine suggested funnel stage based on micro-conversion type
   * This uses common patterns to automatically progress users through the funnel
   */
  getSuggestedStageFromMicroConversion(type, value) {
    const currentStageIndex = this.getFunnelStageOrder().indexOf(this.currentStage);
    const interestSignals = [
      "video_played",
      "video_started",
      "video_25_percent",
      "video_50_percent",
      "scroll_depth_25",
      "scroll_depth_50",
      "page_section_viewed",
      "testimonial_viewed",
      "feature_section_viewed"
    ];
    const desireSignals = [
      "video_75_percent",
      "video_completed",
      "faq_opened",
      "pricing_viewed",
      "cta_section_viewed",
      "scroll_depth_75",
      "comparison_table_viewed",
      "guarantee_section_viewed",
      "bonus_section_viewed"
    ];
    const checkoutIntentSignals = [
      "buy_button_hovered",
      "checkout_button_clicked",
      "add_to_cart",
      "pricing_tier_selected"
    ];
    if (interestSignals.includes(type) && currentStageIndex < 1) {
      return "interest";
    }
    if (desireSignals.includes(type) && currentStageIndex < 2) {
      return "desire";
    }
    if (checkoutIntentSignals.includes(type) && currentStageIndex < 3) {
      if (this.config.debug) {
        console.log(`[Aurea SDK] High checkout intent detected: ${type}`);
      }
    }
    if (value >= 80 && currentStageIndex < 2) {
      return "desire";
    }
    return null;
  }
  /**
   * Get funnel stage order for comparison
   */
  getFunnelStageOrder() {
    return ["awareness", "interest", "desire", "checkout", "purchase", "abandoned"];
  }
  /**
   * Track checkout started (user clicked buy button)
   * This DOES NOT end the session - preserves context for when user returns
   */
  checkoutStarted(product) {
    this.isInCheckout = true;
    this.checkoutStartedAt = Date.now();
    this.enterStage("checkout");
    const checkoutContext = {
      originalSessionId: this.sessionId,
      anonymousId: this.anonymousId,
      checkoutStartedAt: this.checkoutStartedAt,
      product,
      currentStage: this.currentStage,
      priorStages: this.stageHistory.map((h) => h.stage),
      utmSource: this.getUTMParam("utm_source"),
      utmCampaign: this.getUTMParam("utm_campaign"),
      utmMedium: this.getUTMParam("utm_medium")
    };
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("aurea_checkout_context", JSON.stringify(checkoutContext));
    }
    this.track("checkout_started", {
      productId: product.productId,
      productName: product.productName,
      price: product.price,
      currency: product.currency || "USD",
      quantity: product.quantity || 1,
      variant: product.variant,
      sessionDurationSoFar: Math.floor((Date.now() - this.sessionStartTime) / 1e3),
      microConversionsCount: this.microConversions.length,
      priorStages: this.stageHistory.map((h) => h.stage)
    });
    if (this.config.debug) {
      console.log("[Aurea SDK] Checkout started:", product);
      console.log("[Aurea SDK] Session context preserved for return journey");
    }
  }
  /**
   * Track checkout completed (purchase successful)
   * Links back to original session if user returned from external checkout
   */
  checkoutCompleted(data) {
    let checkoutContext = null;
    let checkoutDuration;
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem("aurea_checkout_context");
      if (stored) {
        try {
          checkoutContext = JSON.parse(stored);
          checkoutDuration = Math.floor((Date.now() - checkoutContext.checkoutStartedAt) / 1e3);
          localStorage.removeItem("aurea_checkout_context");
        } catch (e) {
          console.error("[Aurea SDK] Failed to parse checkout context:", e);
        }
      }
    }
    this.enterStage("purchase");
    this.track("checkout_completed", {
      orderId: data.orderId,
      revenue: data.revenue,
      currency: data.currency || "USD",
      paymentMethod: data.paymentMethod,
      products: data.products,
      // Link to original session if available
      originalSessionId: checkoutContext?.originalSessionId,
      checkoutDuration,
      totalSessionDuration: Math.floor((Date.now() - this.sessionStartTime) / 1e3),
      // Attribution data from original session
      originalUtmSource: checkoutContext?.utmSource,
      originalUtmCampaign: checkoutContext?.utmCampaign,
      originalUtmMedium: checkoutContext?.utmMedium,
      priorStages: checkoutContext?.priorStages || this.stageHistory.map((h) => h.stage),
      // Engagement data
      microConversionsCount: this.microConversions.length,
      microConversions: this.microConversions
    });
    this.conversion({
      type: "purchase",
      revenue: data.revenue,
      currency: data.currency,
      orderId: data.orderId
    });
    if (this.config.debug) {
      console.log("[Aurea SDK] Checkout completed:", data);
      if (checkoutContext) {
        console.log("[Aurea SDK] Session bridged - linked to original session:", checkoutContext.originalSessionId);
      }
    }
  }
  /**
   * Track checkout abandoned (user left without completing)
   */
  checkoutAbandoned(reason) {
    if (!this.isInCheckout) {
      return;
    }
    const checkoutDuration = this.checkoutStartedAt ? Math.floor((Date.now() - this.checkoutStartedAt) / 1e3) : void 0;
    this.enterStage("abandoned");
    this.track("checkout_abandoned", {
      reason: reason || "unknown",
      checkoutDuration,
      sessionDuration: Math.floor((Date.now() - this.sessionStartTime) / 1e3),
      microConversionsCount: this.microConversions.length,
      priorStages: this.stageHistory.map((h) => h.stage)
    });
    this.isInCheckout = false;
    if (this.config.debug) {
      console.log("[Aurea SDK] Checkout abandoned:", reason);
    }
  }
  /**
   * Manually end the current session
   * Useful before page navigation (e.g., checkout redirect)
   * Sends session_end event with active/idle time metrics
   */
  async endSession() {
    if (typeof window === "undefined") return;
    const now = Date.now();
    if (this.isPageVisible) {
      this.activeTime += now - this.lastActiveTimestamp;
    }
    const totalDuration = Math.floor((now - this.sessionStartTime) / 1e3);
    const activeTimeSeconds = Math.floor(this.activeTime / 1e3);
    const idleTimeSeconds = totalDuration - activeTimeSeconds;
    const engagementRate = totalDuration > 0 ? activeTimeSeconds / totalDuration * 100 : 0;
    await this.trackEvent("session_end", {
      duration: totalDuration,
      activeTime: activeTimeSeconds,
      idleTime: idleTimeSeconds,
      engagementRate
    });
    await this.flushEvents();
    if (this.config.debug) {
      console.log("[Aurea SDK] Session manually ended", {
        duration: totalDuration,
        activeTime: activeTimeSeconds,
        idleTime: idleTimeSeconds,
        engagementRate: `${engagementRate.toFixed(1)}%`
      });
    }
  }
  /**
   * Get time spent in a specific stage (in seconds)
   */
  getTimeInCurrentStage(stage) {
    const stageEntries = this.stageHistory.filter((h) => h.stage === stage);
    if (stageEntries.length === 0) return 0;
    const lastEntry = stageEntries[stageEntries.length - 1];
    const nextEntry = this.stageHistory.find((h) => h.enteredAt > lastEntry.enteredAt);
    const endTime = nextEntry ? nextEntry.enteredAt : Date.now();
    return Math.floor((endTime - lastEntry.enteredAt) / 1e3);
  }
  /**
   * Get UTM parameter from current URL
   */
  getUTMParam(param) {
    if (typeof window === "undefined") return void 0;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param) || void 0;
  }
  /**
   * Get or create session ID
   */
  getOrCreateSessionId() {
    if (typeof sessionStorage === "undefined") {
      return this.generateId();
    }
    let sessionId = sessionStorage.getItem("aurea_session_id");
    if (!sessionId) {
      sessionId = this.generateId();
      sessionStorage.setItem("aurea_session_id", sessionId);
    }
    return sessionId;
  }
  /**
   * Get or create anonymous ID
   */
  getOrCreateAnonymousId() {
    if (typeof localStorage === "undefined") {
      return this.generateId();
    }
    let anonymousId = localStorage.getItem("aurea_anonymous_id");
    if (!anonymousId) {
      anonymousId = this.generateId();
      localStorage.setItem("aurea_anonymous_id", anonymousId);
    }
    return anonymousId;
  }
  /**
   * Parse device information from user agent
   */
  parseDeviceInfo() {
    if (typeof navigator === "undefined") return void 0;
    const parser = new import_ua_parser_js.UAParser(navigator.userAgent);
    const result = parser.getResult();
    const screenWidth = window.screen?.width || 0;
    const screenHeight = window.screen?.height || 0;
    let deviceType = "Desktop";
    if (result.device.type) {
      const type = result.device.type.toLowerCase();
      if (type === "mobile") {
        deviceType = "Mobile";
      } else if (type === "tablet") {
        deviceType = "Tablet";
      } else if (type === "smarttv") {
        deviceType = "Smart TV";
      } else if (type === "wearable") {
        deviceType = "Wearable";
      } else if (type === "console") {
        deviceType = "Console";
      }
    } else {
      const aspectRatio = screenWidth / screenHeight;
      const userAgent = navigator.userAgent.toLowerCase();
      const isMac = userAgent.includes("macintosh") || userAgent.includes("mac os x");
      const isWindowsLaptop = userAgent.includes("windows") && userAgent.includes("touch");
      const isChromebook = userAgent.includes("chromebook") || userAgent.includes("cros");
      const hasLaptopKeyword = userAgent.includes("laptop");
      if (screenWidth >= 2560 || aspectRatio >= 2.2) {
        deviceType = "Ultrawide";
      } else if (screenWidth <= 1920) {
        deviceType = "Laptop";
      } else if (screenWidth <= 2048 && (isWindowsLaptop || isChromebook || hasLaptopKeyword)) {
        deviceType = "Laptop";
      } else {
        deviceType = "Desktop";
      }
    }
    return {
      userAgent: navigator.userAgent,
      deviceType,
      browserName: result.browser.name || "Unknown",
      browserVersion: result.browser.version || "Unknown",
      osName: result.os.name || "Unknown",
      osVersion: result.os.version || "Unknown",
      screenWidth,
      screenHeight,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }
  /**
   * Build event context
   */
  buildContext() {
    const url = typeof window !== "undefined" ? new URL(window.location.href) : new URL("http://localhost");
    return {
      page: typeof window !== "undefined" ? {
        url: window.location.href,
        path: window.location.pathname,
        title: document.title,
        referrer: document.referrer
      } : void 0,
      utm: (() => {
        const utm = {
          source: url.searchParams.get("utm_source") || void 0,
          medium: url.searchParams.get("utm_medium") || void 0,
          campaign: url.searchParams.get("utm_campaign") || void 0,
          term: url.searchParams.get("utm_term") || void 0,
          content: url.searchParams.get("utm_content") || void 0
        };
        if (this.config.debug && (utm.source || utm.medium || utm.campaign)) {
          console.log("[Aurea SDK] UTM params extracted from URL:", utm, "URL:", url.href);
        }
        return utm;
      })(),
      // Ad Platform Click IDs (for attribution)
      clickIds: (() => {
        const clickIds = {
          // Meta/Facebook
          fbclid: url.searchParams.get("fbclid") || void 0,
          fbadid: url.searchParams.get("fbadid") || void 0,
          // Google Ads
          gclid: url.searchParams.get("gclid") || void 0,
          gbraid: url.searchParams.get("gbraid") || void 0,
          wbraid: url.searchParams.get("wbraid") || void 0,
          dclid: url.searchParams.get("dclid") || void 0,
          // TikTok
          ttclid: url.searchParams.get("ttclid") || void 0,
          tt_content: url.searchParams.get("tt_content") || void 0,
          // Microsoft/Bing
          msclkid: url.searchParams.get("msclkid") || void 0,
          // Twitter/X
          twclid: url.searchParams.get("twclid") || void 0,
          // LinkedIn
          li_fat_id: url.searchParams.get("li_fat_id") || void 0,
          // Snapchat
          ScCid: url.searchParams.get("ScCid") || void 0,
          // Pinterest
          epik: url.searchParams.get("epik") || void 0,
          // Reddit
          rdt_cid: url.searchParams.get("rdt_cid") || void 0
        };
        if (Object.values(clickIds).some((v) => v)) {
          this.storeClickIds(clickIds);
        }
        const stored = this.getStoredClickIds();
        const merged = { ...stored, ...clickIds };
        if (this.config.debug && Object.values(merged).some((v) => v)) {
          console.log("[Aurea SDK] Click IDs extracted:", merged);
        }
        return merged;
      })(),
      // First-party cookies (for Conversion APIs)
      cookies: (() => {
        const cookies = {
          fbp: this.getCookie("_fbp"),
          fbc: this.getCookie("_fbc"),
          ttp: this.getCookie("_ttp")
        };
        if (this.config.debug && Object.values(cookies).some((v) => v)) {
          console.log("[Aurea SDK] First-party cookies extracted:", cookies);
        }
        return cookies;
      })(),
      user: {
        userId: this.userId,
        anonymousId: this.anonymousId
      },
      session: {
        sessionId: this.sessionId
      },
      gdpr: {
        consentGiven: this.consentGiven,
        consentVersion: this.consentVersion,
        consentTimestamp: typeof window !== "undefined" ? localStorage.getItem("aurea_consent_timestamp") || void 0 : void 0
      },
      device: typeof navigator !== "undefined" ? this.parseDeviceInfo() : void 0
    };
  }
  /**
   * Track initial page load
   */
  trackPageLoad() {
    if (typeof window !== "undefined") {
      const justPurchased = localStorage.getItem("aurea_just_purchased");
      const isThankYouPage = window.location.pathname.includes("/thank-you");
      if (justPurchased === "true" && !isThankYouPage) {
        console.log("[Aurea SDK] Purchase detected, redirecting to thank-you page...");
        localStorage.removeItem("aurea_just_purchased");
        window.location.href = "/thank-you?from_checkout=true";
        return;
      }
      const referrer = document.referrer;
      const urlParams = new URLSearchParams(window.location.search);
      const fromCheckout = urlParams.get("from_checkout") === "true";
      const whopReferrer = referrer.includes("whop.com");
      if ((fromCheckout || whopReferrer || justPurchased === "true") && isThankYouPage) {
        localStorage.removeItem("aurea_just_purchased");
        this.track("checkout_return", {
          referrer,
          returnUrl: window.location.href,
          fromWhop: whopReferrer,
          landingPage: "/thank-you"
        });
      }
      this.page();
    }
  }
  /**
   * Track page changes (for SPAs)
   */
  trackPageChanges() {
    if (typeof window === "undefined") return;
    let lastPath = window.location.pathname;
    const observer = new MutationObserver(() => {
      if (window.location.pathname !== lastPath) {
        lastPath = window.location.pathname;
        this.page();
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    window.addEventListener("popstate", () => {
      this.page();
    });
  }
  /**
   * Track form submissions
   */
  trackForms() {
    if (typeof document === "undefined") return;
    document.addEventListener("submit", (e) => {
      const form = e.target;
      const formId = form.id || form.name || "unknown";
      this.track("form_submit", {
        formId,
        formAction: form.action,
        formMethod: form.method
      });
    });
  }
  /**
   * Track scroll depth
   */
  trackScrollDepth() {
    if (typeof window === "undefined") return;
    const depths = [25, 50, 75, 100];
    const tracked = /* @__PURE__ */ new Set();
    const checkScroll = () => {
      const scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100;
      for (const depth of depths) {
        if (scrollPercent >= depth && !tracked.has(depth)) {
          tracked.add(depth);
          this.track("scroll_depth", { depth });
        }
      }
    };
    window.addEventListener("scroll", checkScroll, { passive: true });
  }
  /**
   * Enqueue event for batching
   */
  enqueueEvent(event) {
    this.eventQueue.push(event);
    if (this.eventQueue.length >= (this.config.batchSize || 10)) {
      this.flushEvents();
    }
  }
  /**
   * Send events to API
   */
  async sendEvents(events) {
    if (events.length === 0) return;
    if (this.config.debug) {
      events.forEach((evt) => {
        if (evt.eventName === "page_view") {
          console.log("[Aurea SDK] Sending page_view with UTM:", {
            source: evt.context.utm?.source,
            medium: evt.context.utm?.medium,
            campaign: evt.context.utm?.campaign,
            url: evt.context.page?.url
          });
        }
      });
    }
    try {
      const response = await fetch(`${this.config.apiUrl}/track/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Aurea-API-Key": this.config.apiKey,
          "X-Aurea-Funnel-ID": this.config.funnelId
        },
        body: JSON.stringify({
          events,
          batch: true
        }),
        keepalive: true
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      if (this.config.debug) {
        console.log("[Aurea SDK] Events sent successfully:", events.length);
      }
    } catch (error) {
      console.error("[Aurea SDK] Failed to send events:", error);
      if (typeof localStorage !== "undefined") {
        const failedEvents = JSON.parse(localStorage.getItem("aurea_failed_events") || "[]") || [];
        failedEvents.push(...events);
        localStorage.setItem("aurea_failed_events", JSON.stringify(failedEvents));
      }
    }
  }
  /**
   * Flush queued events
   */
  flushEvents() {
    if (this.eventQueue.length === 0) return;
    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];
    this.sendEvents(eventsToSend);
  }
  /**
   * Start batch timer
   */
  startBatchTimer() {
    if (typeof window === "undefined") return;
    this.batchTimer = setInterval(() => {
      this.flushEvents();
    }, this.config.batchInterval || 2e3);
    window.addEventListener("beforeunload", () => {
      this.flushEvents();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.flushEvents();
      }
    });
  }
  /**
   * Poll for purchase completion
   * Checks every 3 seconds if user has made a purchase
   */
  startPurchasePolling() {
    if (typeof window === "undefined") return;
    this.checkForPurchase();
    setInterval(() => {
      this.checkForPurchase();
    }, 3e3);
  }
  /**
   * Check if user has completed a purchase
   */
  async checkForPurchase() {
    try {
      const checkUrl = `${window.location.origin}/api/check-purchase?anonymousId=${this.anonymousId}`;
      const response = await fetch(checkUrl);
      const data = await response.json();
      if (data.hasPurchased) {
        console.log("[Aurea SDK] Purchase detected! Redirecting to thank-you page...");
        localStorage.setItem("aurea_just_purchased", "true");
        window.location.href = "/thank-you?from_checkout=true";
      }
    } catch (error) {
      if (this.config.debug) {
        console.log("[Aurea SDK] Purchase check failed:", error);
      }
    }
  }
  /**
   * Send Web Vital to dedicated endpoint
   */
  async sendWebVital(metric, name, rating) {
    try {
      const deviceInfo = this.parseDeviceInfo();
      await fetch(`${this.config.apiUrl}/track/web-vitals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Aurea-API-Key": this.config.apiKey,
          "X-Aurea-Funnel-ID": this.config.funnelId
        },
        body: JSON.stringify({
          funnelId: this.config.funnelId,
          sessionId: this.sessionId,
          anonymousId: this.anonymousId,
          pageUrl: window.location.href,
          pagePath: window.location.pathname,
          pageTitle: document.title,
          metric: name.toUpperCase(),
          value: metric.value,
          rating: rating.toUpperCase().replace("-", "_"),
          delta: metric.delta,
          id_metric: metric.id,
          deviceType: deviceInfo?.deviceType,
          browserName: deviceInfo?.browserName,
          browserVersion: deviceInfo?.browserVersion,
          osName: deviceInfo?.osName,
          osVersion: deviceInfo?.osVersion,
          screenWidth: deviceInfo?.screenWidth,
          screenHeight: deviceInfo?.screenHeight,
          timestamp: /* @__PURE__ */ new Date()
        }),
        keepalive: true
      });
      if (this.config.debug) {
        console.log(`[Aurea SDK] Web Vital sent: ${name}`, metric.value, rating);
      }
    } catch (error) {
      console.error(`[Aurea SDK] Failed to send ${name}:`, error);
    }
  }
  /**
   * Track Core Web Vitals
   */
  trackWebVitals() {
    if (typeof window === "undefined") return;
    const getVitalRating = (name, value) => {
      const thresholds = {
        LCP: [2500, 4e3],
        INP: [200, 500],
        CLS: [0.1, 0.25],
        FCP: [1800, 3e3],
        TTFB: [800, 1800]
      };
      const [good, needsImprovement] = thresholds[name] || [0, 0];
      if (value <= good) return "good";
      if (value <= needsImprovement) return "needs-improvement";
      return "poor";
    };
    (0, import_web_vitals.onLCP)((metric) => {
      if (!this.webVitalsCollected.lcp) {
        this.webVitalsCollected.lcp = true;
        const rating = getVitalRating("LCP", metric.value);
        this.sendWebVital(metric, "lcp", rating);
      }
    });
    (0, import_web_vitals.onINP)((metric) => {
      if (!this.webVitalsCollected.inp) {
        this.webVitalsCollected.inp = true;
        const rating = getVitalRating("INP", metric.value);
        this.sendWebVital(metric, "inp", rating);
      }
    });
    (0, import_web_vitals.onCLS)((metric) => {
      if (!this.webVitalsCollected.cls) {
        this.webVitalsCollected.cls = true;
        const rating = getVitalRating("CLS", metric.value);
        this.sendWebVital(metric, "cls", rating);
      }
    });
    (0, import_web_vitals.onFCP)((metric) => {
      if (!this.webVitalsCollected.fcp) {
        this.webVitalsCollected.fcp = true;
        const rating = getVitalRating("FCP", metric.value);
        this.sendWebVital(metric, "fcp", rating);
      }
    });
    (0, import_web_vitals.onTTFB)((metric) => {
      if (!this.webVitalsCollected.ttfb) {
        this.webVitalsCollected.ttfb = true;
        const rating = getVitalRating("TTFB", metric.value);
        this.sendWebVital(metric, "ttfb", rating);
      }
    });
    if (this.config.debug) {
      console.log("[Aurea SDK] Core Web Vitals tracking enabled");
    }
  }
  /**
   * Track session timing (active time, duration)
   */
  trackSessionTiming() {
    if (typeof window === "undefined") return;
    document.addEventListener("visibilitychange", () => {
      const now = Date.now();
      if (document.hidden) {
        if (this.isPageVisible) {
          this.activeTime += now - this.lastActiveTimestamp;
          this.isPageVisible = false;
        }
      } else {
        this.isPageVisible = true;
        this.lastActiveTimestamp = now;
      }
    });
    let interactionTimeout;
    const resetInactivityTimer = () => {
      const now = Date.now();
      if (!this.isPageVisible) {
        this.isPageVisible = true;
        this.lastActiveTimestamp = now;
      }
      clearTimeout(interactionTimeout);
      interactionTimeout = setTimeout(() => {
        if (this.isPageVisible) {
          this.activeTime += Date.now() - this.lastActiveTimestamp;
          this.isPageVisible = false;
        }
      }, 3e4);
    };
    window.addEventListener("mousemove", resetInactivityTimer, { passive: true });
    window.addEventListener("keydown", resetInactivityTimer, { passive: true });
    window.addEventListener("scroll", resetInactivityTimer, { passive: true });
    window.addEventListener("click", resetInactivityTimer, { passive: true });
    window.addEventListener("touchstart", resetInactivityTimer, { passive: true });
    window.addEventListener("beforeunload", () => {
      const now = Date.now();
      if (this.isPageVisible) {
        this.activeTime += now - this.lastActiveTimestamp;
      }
      const totalDuration = Math.floor((now - this.sessionStartTime) / 1e3);
      const activeTimeSeconds = Math.floor(this.activeTime / 1e3);
      const sessionEndEvent = {
        eventId: this.generateEventId(),
        eventName: "session_end",
        properties: {
          duration: totalDuration,
          activeTime: activeTimeSeconds,
          idleTime: totalDuration - activeTimeSeconds,
          engagementRate: totalDuration > 0 ? activeTimeSeconds / totalDuration * 100 : 0
        },
        context: this.buildContext(),
        timestamp: Date.now()
      };
      const url = `${this.config.apiUrl}/track/events`;
      const payload = JSON.stringify({
        events: [sessionEndEvent],
        batch: false
      });
      try {
        fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Aurea-API-Key": this.config.apiKey,
            "X-Aurea-Funnel-ID": this.config.funnelId
          },
          body: payload,
          keepalive: true
          // Critical: ensures request completes even if page unloads
        }).catch(() => {
        });
        if (this.config.debug) {
          console.log("[Aurea SDK] Session end sent with keepalive");
        }
      } catch (error) {
      }
      this.flushEvents();
    });
    if (this.config.debug) {
      console.log("[Aurea SDK] Session timing tracking enabled");
    }
  }
  /**
   * Initialize funnel tracking
   * Checks for returning checkout users and sets initial stage
   */
  initializeFunnelTracking() {
    if (typeof window === "undefined") return;
    if (typeof localStorage !== "undefined") {
      const checkoutContext = localStorage.getItem("aurea_checkout_context");
      if (checkoutContext) {
        try {
          const context = JSON.parse(checkoutContext);
          const urlParams = new URLSearchParams(window.location.search);
          const purchased = urlParams.get("purchased") === "true";
          if (purchased) {
            if (this.config.debug) {
              console.log(
                "[Aurea SDK] Returning from successful checkout - awaiting checkoutCompleted() call"
              );
            }
          } else {
            const timeSinceCheckout = Date.now() - context.checkoutStartedAt;
            const fifteenMinutes = 15 * 60 * 1e3;
            if (timeSinceCheckout > fifteenMinutes) {
              if (this.config.debug) {
                console.log(
                  "[Aurea SDK] Checkout abandoned (15+ min elapsed)"
                );
              }
            }
          }
        } catch (err) {
          console.error(
            "[Aurea SDK] Failed to parse checkout context:",
            err
          );
          localStorage.removeItem("aurea_checkout_context");
        }
      }
    }
    this.stageHistory.push({
      stage: "awareness",
      enteredAt: Date.now()
    });
    if (this.config.debug) {
      console.log("[Aurea SDK] Funnel tracking initialized - Stage: awareness");
    }
  }
  /**
   * Generate unique ID
   */
  generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  /**
   * Generate event ID
   */
  generateEventId() {
    return `evt_${this.generateId()}`;
  }
  /**
   * Get cookie value by name
   */
  getCookie(name) {
    if (typeof document === "undefined") return void 0;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(";").shift();
    }
    return void 0;
  }
  /**
   * Store click IDs in localStorage with attribution windows
   */
  storeClickIds(clickIds) {
    if (typeof localStorage === "undefined") return;
    const stored = localStorage.getItem("aurea_click_ids");
    const storedData = stored ? JSON.parse(stored) : {};
    const now = Date.now();
    Object.entries(clickIds).forEach(([platform, id]) => {
      if (id) {
        storedData[platform] = {
          id,
          timestamp: now,
          expiresAt: now + this.getAttributionWindow(platform)
        };
      }
    });
    localStorage.setItem("aurea_click_ids", JSON.stringify(storedData));
  }
  /**
   * Get stored click IDs from localStorage (within attribution window)
   * Returns only the ID strings (not the full storage object)
   */
  getStoredClickIds() {
    if (typeof localStorage === "undefined") return {};
    const stored = localStorage.getItem("aurea_click_ids");
    if (!stored) return {};
    try {
      const clickIds = JSON.parse(stored);
      const now = Date.now();
      const active = {};
      for (const [platform, data] of Object.entries(clickIds)) {
        if (now < data.expiresAt) {
          active[platform] = data.id;
        }
      }
      return active;
    } catch (error) {
      console.error("[Aurea SDK] Failed to parse stored click IDs:", error);
      return {};
    }
  }
  /**
   * Get attribution window for a platform (in milliseconds)
   */
  getAttributionWindow(platform) {
    const windows = {
      fbclid: 28 * 24 * 60 * 60 * 1e3,
      // Facebook: 28 days
      gclid: 90 * 24 * 60 * 60 * 1e3,
      // Google: 90 days
      gbraid: 90 * 24 * 60 * 60 * 1e3,
      // Google iOS: 90 days
      wbraid: 90 * 24 * 60 * 60 * 1e3,
      // Google iOS: 90 days
      ttclid: 28 * 24 * 60 * 60 * 1e3,
      // TikTok: 28 days
      msclkid: 90 * 24 * 60 * 60 * 1e3,
      // Microsoft: 90 days
      twclid: 30 * 24 * 60 * 60 * 1e3,
      // Twitter: 30 days
      li_fat_id: 90 * 24 * 60 * 60 * 1e3,
      // LinkedIn: 90 days
      ScCid: 28 * 24 * 60 * 60 * 1e3,
      // Snapchat: 28 days
      epik: 30 * 24 * 60 * 60 * 1e3,
      // Pinterest: 30 days
      rdt_cid: 28 * 24 * 60 * 60 * 1e3
      // Reddit: 28 days
    };
    return windows[platform] || 30 * 24 * 60 * 60 * 1e3;
  }
};
var sdkInstance = null;
function initAurea(config) {
  if (sdkInstance) {
    console.warn("[Aurea SDK] SDK already initialized");
    return sdkInstance;
  }
  sdkInstance = new AureaSDK(config);
  sdkInstance.init();
  if (typeof window !== "undefined") {
    window.aurea = sdkInstance;
  }
  return sdkInstance;
}
function getAurea() {
  return sdkInstance;
}
function trackEvent(name, properties) {
  const aurea = getAurea();
  if (aurea) {
    aurea.track(name, properties);
  } else {
    console.warn("[Aurea SDK] SDK not initialized. Call initAurea() first.");
  }
}
function identifyUser(userId, traits) {
  const aurea = getAurea();
  if (aurea) {
    aurea.identify(userId, traits);
  } else {
    console.warn("[Aurea SDK] SDK not initialized. Call initAurea() first.");
  }
}
function trackConversion(data) {
  const aurea = getAurea();
  if (aurea) {
    aurea.conversion(data);
  } else {
    console.warn("[Aurea SDK] SDK not initialized. Call initAurea() first.");
  }
}
function trackPage(name, properties) {
  const aurea = getAurea();
  if (aurea) {
    aurea.page(name, properties);
  } else {
    console.warn("[Aurea SDK] SDK not initialized. Call initAurea() first.");
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AureaSDK,
  getAurea,
  identifyUser,
  initAurea,
  trackConversion,
  trackEvent,
  trackPage
});
