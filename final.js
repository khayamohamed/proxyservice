function goTo(pageClass) {
  if (pageClass === "page25" && hasValidatedProviderSession()) {
    pageClass = "page8";
  }
  if (pageClass === "page8") {
    const activeClientAccount = getActiveClientAccount();
    const activeClientEmail = String((activeClientAccount && activeClientAccount.email) || "").trim().toLowerCase();
    const activeClientStatus = normalizeStatus(
      (activeClientAccount && activeClientAccount.statutVerification) || "en_attente"
    );
    if (activeClientEmail && !canClientContinueAfterAdminApproval(activeClientStatus, activeClientAccount)) {
      savePendingVerification("client", activeClientEmail);
      showSubmissionWaitingPage("client", activeClientStatus || "en_attente");
      return;
    }
  }
  if (pageClass === "page33" && !ORDER_CHAT_ENABLED) {
    pageClass = resolveActiveProfileTypeForChat() === "prestataire" ? "page10" : "page19";
  }
  if (pageClass === "page19" && resolveActiveProfileTypeForChat() === "prestataire") {
    pageClass = "page10";
  }
  if (pageClass !== "page16") {
    activeSupportParticipantContext = null;
  }

  stopSupportChatPolling();
  closePage8Overlay();
  closePage8NotifOverlay();
  closePage14Overlay();
  closePage14NotifOverlay();
  closePage15Overlay();
  closePage15NotifOverlay();
  closePage18AddressOverlay();
  closeLogoutConfirmOverlay();
  closeProviderApprovedPopup();
  closeOrderChatModal();
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("active");
  });

  const target = document.querySelector("." + pageClass);
  if (target) {
    target.classList.add("active");
    window.scrollTo(0, 0);
    fitScreen(target);
    const activeRoleForSession = resolveActiveProfileTypeForChat();
    if (activeRoleForSession === "client" || activeRoleForSession === "prestataire") {
      setActiveProfileRole(activeRoleForSession);
      lastResolvedProfileType = activeRoleForSession;
      saveLastVisitedPageForRole(activeRoleForSession, pageClass);
    }
    if (pageClass === "page18") {
      applyCurrentOrderDemandSummary();
      applyCurrentOrderTrackingSummary();
      renderPage18ProviderCoverageMapWithFallback().catch(() => {
        setPage18ProviderMapPlaceholder("Carte du prestataire indisponible pour le moment.", "error");
      });
    }
    if (pageClass === "page20") {
      applyCurrentOrderTrackingSummary();
      syncPage20ChatFabState();
      syncChatUnreadBadges().catch(() => {
        return;
      });
      renderPage20GoogleMapWithFallback().catch(() => {
        setPage20MapPlaceholder("Carte indisponible pour le moment.", "error");
      });
    }
    if (pageClass === "page19") {
      applyPage19RequestDateTime();
      syncPage19ChatFabState();
      syncChatUnreadBadges().catch(() => {
        return;
      });
    }
    if (pageClass === "page31") {
      syncProviderIdentityProviderName();
      resetProviderIdentityStepUi();
    }
    if (pageClass === "page32") {
      syncClientInterventionProviderName();
      resetClientInterventionReviewStepUi();
    }
    if (pageClass === "page10") {
      syncRequestHistoryTabsVisibility();
      syncOngoingRequestsFromBackendForActiveParticipant()
        .then(() => {
          renderPage10OngoingRequests();
        })
        .catch(() => {
          return;
        });
      renderPage10OngoingRequests();
    }
    if (pageClass === "page8") {
      syncPage8ChatFabState();
    }
    if (isProviderDirectoryPage(pageClass)) {
      syncVerifiedProviderDirectoryIfVisible(true);
    }
    if (pageClass === "page16") {
      refreshSupportChatMessages().catch(() => {
        return;
      });
      startSupportChatPolling();
    }
    if (pageClass === "page22") {
      syncRequestHistoryTabsVisibility();
      renderPage22FinishedRequests();
    }
    if (pageClass === "page23") {
      syncRequestHistoryTabsVisibility();
      renderPage23CancelledRequests();
    }
    if (pageClass === "page7") {
      resetProviderFingerprintStepUi();
    }
    if (pageClass === "page30") {
      prepareProviderCoverageManualOnlyUi();
      applyProviderCoverageStepUi(null, { preserveFeedback: false });
    }
  }
}

function fitScreen(screen) {
  if (!screen) return;
  const content = screen.firstElementChild;
  if (!content) return;

  if (screen.classList.contains("no-scale")) {
    content.style.transform = "none";
    return;
  }

  content.style.transform = "scale(1)";
  const availableHeight = screen.clientHeight;
  const availableWidth = screen.clientWidth;
  const contentHeight = content.scrollHeight;
  const contentWidth = content.scrollWidth;

  if (!availableHeight || !availableWidth || !contentHeight || !contentWidth) return;

  const scaleByHeight = availableHeight / contentHeight;
  const scale = Math.min(1, scaleByHeight);

  content.style.transform = `scale(${scale})`;
}

function fitActiveScreen() {
  const activeScreen = document.querySelector(".screen.active");
  if (activeScreen) {
    fitScreen(activeScreen);
  }
}

function getPageClassFromElement(element) {
  if (!element) return null;
  return Array.from(element.classList).find((className) => /^page\d+$/.test(className)) || null;
}

let previousPageClass = "page8";

const toFrame2Btn = document.getElementById("to-frame-2-btn");
const toFrame3Btn = document.getElementById("to-frame-3-btn");
const toFrame4Btn = document.getElementById("to-frame-4-btn");
const loginBtn = document.getElementById("login-btn");
const loginEmailInput = document.getElementById("login-email");
const loginPasswordInput = document.getElementById("login-password");
const loginPasswordToggleBtn = document.getElementById("login-password-toggle-btn");
const loginFeedback = document.getElementById("login-feedback");
const toFrame5Btn = document.getElementById("to-frame-5-btn");
const backTo4Btn = document.getElementById("back-to-4-btn");
const signupSubmitBtn = document.getElementById("signup-submit-btn");
const signupNameInput = document.getElementById("signup-name-input");
const signupPasswordInput = document.getElementById("signup-password-input");
const signupPasswordToggleBtn = document.getElementById("signup-password-toggle-btn");
const signupEmailInput = document.getElementById("signup-email-input");
const signupPhoneInput = document.getElementById("signup-phone-input");
const signupBirthInput = document.getElementById("signup-birth-input");
const signupCinUpload = document.getElementById("signup-cin-upload");
const signupPhotoUpload = document.getElementById("signup-photo-upload");
const signupFeedback = document.getElementById("signup-feedback");
const backTo5Btn = document.getElementById("back-to-5-btn");
const toFrame7Btn = document.getElementById("to-frame-7-btn");
const backTo6Btn = document.getElementById("back-to-6-btn");
const backTo6FromProviderSignupBtn = document.getElementById("back-to-6-from-provider-signup-btn");
const providerSignupLastNameInput = document.getElementById("provider-signup-lastname-input");
const providerSignupFirstNameInput = document.getElementById("provider-signup-firstname-input");
const providerSignupEmailInput = document.getElementById("provider-signup-email-input");
const providerSignupPhoneInput = document.getElementById("provider-signup-phone-input");
const providerSignupPasswordInput = document.getElementById("provider-signup-password-input");
const providerSignupPasswordToggleBtn = document.getElementById("provider-signup-password-toggle-btn");
const providerSignupPhotoUpload = document.getElementById("provider-signup-photo-upload");
const providerSignupDomainInput = document.getElementById("provider-signup-domain-input");
const providerSignupExperienceInput = document.getElementById("provider-signup-experience-input");
const providerSignupCinUpload = document.getElementById("provider-signup-cin-upload");
const providerSignupCasierUpload = document.getElementById("provider-signup-casier-upload");
const providerSignupFeedback = document.getElementById("provider-signup-feedback");
const providerSignupSubmitBtn = document.getElementById("provider-signup-submit-btn");
const fingerprintCaptureBtn = document.getElementById("fingerprint-capture-btn");
const fingerprintContinueBtn = document.getElementById("fingerprint-continue-btn");
const fingerprintFeedback = document.getElementById("fingerprint-feedback");
const backTo29From30Btn = document.getElementById("back-to-29-from-30-btn");
const providerCoverageStatus = document.getElementById("provider-coverage-status");
const providerCoverageLocation = document.getElementById("provider-coverage-location");
const providerCoveragePriceIndicator = document.getElementById("provider-coverage-price-indicator");
const providerCoverageFeedback = document.getElementById("provider-coverage-feedback");
const providerCoverageReadyIndicator = document.getElementById("provider-coverage-ready-indicator");
const providerCoverageEnableBtn = document.getElementById("provider-coverage-enable-btn");
const providerCoverageManualBtn = document.getElementById("provider-coverage-manual-btn");
const providerCoverageManualForm = document.getElementById("provider-coverage-manual-form");
const providerCoverageLatInput = document.getElementById("provider-coverage-lat-input");
const providerCoverageLngInput = document.getElementById("provider-coverage-lng-input");
const providerCoverageManualApplyBtn = document.getElementById("provider-coverage-manual-apply-btn");
const providerCoverageContinueBtn = document.getElementById("provider-coverage-continue-btn");
const providerCoverageMapWrap = document.getElementById("provider-coverage-map-wrap");
const providerCoverageMapFrame = document.getElementById("provider-coverage-map");
const backTo7From25Btn = document.getElementById("back-to-7-from-25-btn");
const openPage26Btn = document.getElementById("open-page26-btn");
const openPage27Btn = document.getElementById("open-page27-btn");
const backTo25From26Btn = document.getElementById("back-to-25-from-26-btn");
const backTo25From27Btn = document.getElementById("back-to-25-from-27-btn");
const providerLastNameInput = document.getElementById("provider-lastname-input");
const providerFirstNameInput = document.getElementById("provider-firstname-input");
const providerEmailInput = document.getElementById("provider-email-input");
const providerPhoneInput = document.getElementById("provider-phone-input");
const providerCategoryInput = document.getElementById("provider-category-input");
const providerBirthdateInput = document.getElementById("provider-birthdate-input");
const providerRecordUpload = document.getElementById("provider-record-upload");
const providerIdUpload = document.getElementById("provider-id-upload");
const providerVerificationFeedback = document.getElementById("provider-verification-feedback");
const submitProviderVerificationBtn = document.getElementById("submit-provider-verification-btn");
const commerceDescriptionInput = document.getElementById("commerce-description-input");
const commercePhotosUpload = document.getElementById("commerce-photos-upload");
const submitCommerceVerificationBtn = document.getElementById("submit-commerce-verification-btn");
const toFrame8Btn = document.getElementById("to-frame-8-btn");
const openPage8OverlayBtn = document.getElementById("open-page8-overlay-btn");
const closePage8OverlayBtn = document.getElementById("close-page8-overlay-btn");
const closePage8OverlayArrowBtn = document.getElementById("close-page8-overlay-arrow-btn");
const openPage8NotifOverlayBtn = document.getElementById("open-page8-notif-overlay-btn");
const closePage8NotifOverlayBtn = document.getElementById("close-page8-notif-overlay-btn");
const closePage8NotifHeaderBtn = document.getElementById("close-page8-notif-header-btn");
const openPage9Btn = document.getElementById("open-page9-btn");
const backTo8From9Btn = document.getElementById("back-to-8-from-9-btn");
const openPage10Btn = document.getElementById("open-page10-btn");
const openPage10HomeBottomBtn = document.getElementById("open-page10-home-bottom-btn");
const backTo8From10Btn = document.getElementById("back-to-8-from-10-btn");
const openPage14Btn = document.getElementById("open-page14-btn");
const openPage14LabelBtn = document.getElementById("open-page14-label-btn");
const openPage15From14Btn = document.getElementById("open-page15-from-14-btn");
const openPage14From15Btn = document.getElementById("open-page14-from-15-btn");
const openPage14ElectricianBtn = document.getElementById("open-page14-electrician-btn");
const openPage14MechanicBtn = document.getElementById("open-page14-mechanic-btn");
const openPage14LocksmithBtn = document.getElementById("open-page14-locksmith-btn");
const openPage14CarpenterBtn = document.getElementById("open-page14-carpenter-btn");
const openPage15PlumberBtn = document.getElementById("open-page15-plumber-btn");
const openPage15MechanicBtn = document.getElementById("open-page15-mechanic-btn");
const openPage15LocksmithBtn = document.getElementById("open-page15-locksmith-btn");
const openPage15CarpenterBtn = document.getElementById("open-page15-carpenter-btn");
const openPage15Btn = document.getElementById("open-page15-btn");
const openPage15LabelBtn = document.getElementById("open-page15-label-btn");
const openPage8MechanicBtn = document.getElementById("open-page8-mechanic-btn");
const openPage8MechanicLabelBtn = document.getElementById("open-page8-mechanic-label-btn");
const openPage8LocksmithBtn = document.getElementById("open-page8-locksmith-btn");
const openPage8LocksmithLabelBtn = document.getElementById("open-page8-locksmith-label-btn");
const openPage8CarpenterBtn = document.getElementById("open-page8-carpenter-btn");
const openPage8CarpenterLabelBtn = document.getElementById("open-page8-carpenter-label-btn");
const backToPreviousFrom15Btn = document.getElementById("back-to-previous-from-15-btn");
const openPage15OverlayBtn = document.getElementById("open-page15-overlay-btn");
const closePage15OverlayBtn = document.getElementById("close-page15-overlay-btn");
const openPage15NotifOverlayBtn = document.getElementById("open-page15-notif-overlay-btn");
const closePage15NotifOverlayBtn = document.getElementById("close-page15-notif-overlay-btn");
const openPage14OverlayBtn = document.getElementById("open-page14-overlay-btn");
const closePage14OverlayBtn = document.getElementById("close-page14-overlay-btn");
const closePage14OverlayArrowBtn = document.getElementById("close-page14-overlay-arrow-btn");
const openPage14NotifOverlayBtn = document.getElementById("open-page14-notif-overlay-btn");
const closePage14NotifOverlayBtn = document.getElementById("close-page14-notif-overlay-btn");
const closePage14NotifHeaderBtn = document.getElementById("close-page14-notif-header-btn");
const page14OpenPage9Btn = document.getElementById("page14-open-page9-btn");
const page14OpenPage10Btn = document.getElementById("page14-open-page10-btn");
const openPage10From14BottomBtn = document.getElementById("open-page10-from-14-bottom-btn");
const openPage17Btn = document.getElementById("open-page17-btn");
const openPage17NameBtn = document.getElementById("open-page17-name-btn");
const openProviderProfileBtns = document.querySelectorAll(".open-provider-profile-btn");
const backTo14From17Btn = document.getElementById("back-to-14-from-17-btn");
const providerProfileName = document.getElementById("provider-profile-name");
const providerProfileRating = document.getElementById("provider-profile-rating");
const providerProfileImage = document.getElementById("provider-profile-image");
const providerProfilePrice = document.getElementById("provider-profile-price");
const providerProfileDomain = document.getElementById("provider-profile-domain");
const providerProfileDescription = document.getElementById("provider-profile-description");
const providerPaymentOptionButtons = document.querySelectorAll(".payment-method-option");
const selectedPaymentMethodLabel = document.getElementById("selected-payment-method-label");
const selectedPaymentMethodDetail = document.getElementById("selected-payment-method-detail");
const selectedPaymentMethodDetailText = document.getElementById("selected-payment-method-detail-text");
const selectedPaymentMethodIcon = document.getElementById("selected-payment-method-icon");
const openPage18Btn = document.getElementById("open-page18-btn");
const backTo17From18Btn = document.getElementById("back-to-17-from-18-btn");
const openPage19Btn = document.getElementById("open-page19-btn");
const backTo18From34Btn = document.getElementById("back-to-18-from-34-btn");
const openPage19From34Btn = document.getElementById("open-page19-from-34-btn");
const backTo18From19Btn = document.getElementById("back-to-18-from-19-btn");
const openPage20Btn = document.getElementById("open-page20-btn");
const openPage33ChatBtn = document.getElementById("open-page33-chat-btn");
const openPage20ChatBtn = document.getElementById("open-page20-chat-btn");
const openPage8ChatBtn = document.getElementById("open-page8-chat-btn");
const backTo19From33Btn = document.getElementById("back-to-19-from-33-btn");
const backTo19From20Btn = document.getElementById("back-to-19-from-20-btn");
const openPage31Btn = document.getElementById("open-page31-btn");
const backTo20From31Btn = document.getElementById("back-to-20-from-31-btn");
const providerIdentityCaptureBtn = document.getElementById("provider-identity-capture-btn");
const providerIdentityContinueBtn = document.getElementById("provider-identity-continue-btn");
const providerIdentityFeedback = document.getElementById("provider-identity-feedback");
const providerIdentityProviderName = document.getElementById("provider-identity-provider-name");
const backTo31From32Btn = document.getElementById("back-to-31-from-32-btn");
const clientInterventionProviderName = document.getElementById("page32-provider-name");
const clientInterventionWorkChoiceBtns = document.querySelectorAll(".page32-work-choice-btn");
const clientInterventionPhotosInput = document.getElementById("page32-photos-input");
const clientInterventionPhotosMeta = document.getElementById("page32-photos-meta");
const clientInterventionRatingStarBtns = document.querySelectorAll(".page32-rating-star-btn");
const clientInterventionRatingMeta = document.getElementById("page32-rating-meta");
const clientInterventionFinishBtn = document.getElementById("page32-finish-btn");
const clientInterventionFeedback = document.getElementById("page32-feedback");
const page18AddressValue = document.getElementById("page18-address-value");
const page18EtaValue = document.getElementById("page18-eta-value");
const page18RequestProviderName = document.getElementById("page18-request-provider-name");
const page18RequestProviderDomain = document.getElementById("page18-request-provider-domain");
const page18RequestProviderPrice = document.getElementById("page18-request-provider-price");
const page18ProviderZoneCard = document.getElementById("page18-provider-zone-card");
const page18ProviderFieldValue = document.getElementById("page18-provider-field-value");
const page18ProviderZoneNote = document.getElementById("page18-provider-zone-note");
const page18ProviderMapElement = document.getElementById("page18-provider-map");
const page19RequestDatetime = document.getElementById("page19-request-datetime");
const page20AddressValue = document.getElementById("page20-address-value");
const page20EtaValue = document.getElementById("page20-eta-value");
const page20StepAcceptedMin = document.getElementById("page20-step-accepted-min");
const page20StepEnrouteMin = document.getElementById("page20-step-enroute-min");
const page20StepArrivedMin = document.getElementById("page20-step-arrived-min");
const openPage18AddressOverlayBtn = document.getElementById("open-page18-address-overlay-btn");
const page18AddressOverlay = document.getElementById("page18-address-overlay");
const closePage18AddressOverlayBtn = document.getElementById("close-page18-address-overlay-btn");
const cancelPage18AddressBtn = document.getElementById("cancel-page18-address-btn");
const savePage18AddressBtn = document.getElementById("save-page18-address-btn");
const page18AddressInput = document.getElementById("page18-address-input");
const page18AddressGeolocBtn = document.getElementById("page18-address-geoloc-btn");
const page18AddressFeedback = document.getElementById("page18-address-feedback");
const page18ConfirmAddressBtn = document.getElementById("page18-confirm-address-btn");
const page20GoogleMapElement = document.getElementById("page20-google-map");
const openPage22Btn = document.getElementById("open-page22-btn");
const openPage23Btn = document.getElementById("open-page23-btn");
const backTo10From22Btn = document.getElementById("back-to-10-from-22-btn");
const backTo10TabBtn = document.getElementById("back-to-10-tab-btn");
const openPage23From22Btn = document.getElementById("open-page23-from-22-btn");
const backTo10From23Btn = document.getElementById("back-to-10-from-23-btn");
const backTo10From23TabBtn = document.getElementById("back-to-10-from-23-tab-btn");
const openPage22From23Btn = document.getElementById("open-page22-from-23-btn");
const openPage21Btns = document.querySelectorAll(".open-page21-btn");
const backTo22From21Btn = document.getElementById("back-to-22-from-21-btn");
const cancelPage21Btn = document.getElementById("cancel-page21-btn");
const submitPage21Btn = document.getElementById("submit-page21-btn");
const openPage24Btn = document.getElementById("open-page24-btn");
const backTo10From24Btn = document.getElementById("back-to-10-from-24-btn");
const submitPage24Btn = document.getElementById("submit-page24-btn");
const cancelReasonInput = document.querySelector(".cancel-reason-input");
const page10OngoingRequestsList = document.getElementById("page10-ongoing-requests-list");
const page22FinishedRequestsList = document.getElementById("page22-finished-requests-list");
const page23CancelledRequestsList = document.getElementById("page23-cancelled-requests-list");
const orderChatOverlay = document.getElementById("order-chat-overlay");
const orderChatCloseBackdropBtn = document.getElementById("order-chat-close-backdrop-btn");
const orderChatCloseBtn = document.getElementById("order-chat-close-btn");
const orderChatMessages = document.getElementById("order-chat-messages");
const orderChatForm = document.getElementById("order-chat-form");
const orderChatInput = document.getElementById("order-chat-input");
const orderChatSendBtn = document.getElementById("order-chat-send-btn");
const orderChatFeedback = document.getElementById("order-chat-feedback");
const page33ChatMessages = document.getElementById("page33-chat-messages");
const page33ChatForm = document.getElementById("page33-chat-form");
const page33ChatInput = document.getElementById("page33-chat-input");
const page33ChatSendBtn = document.getElementById("page33-chat-send-btn");
const page33ChatFeedback = document.getElementById("page33-chat-feedback");
const page33ChatAvatar = document.getElementById("page33-chat-avatar");
const page33ChatSubtitle = document.getElementById("page33-chat-subtitle");
const page8Overlay = document.getElementById("page8-overlay");
const page8NotifOverlay = document.getElementById("page8-notif-overlay");
const notificationsListPage8 = document.getElementById("notifications-list-page8");
const page14Overlay = document.getElementById("page14-overlay");
const page14NotifOverlay = document.getElementById("page14-notif-overlay");
const notificationsListPage14 = document.getElementById("notifications-list-page14");
const page15Overlay = document.getElementById("page15-overlay");
const page15NotifOverlay = document.getElementById("page15-notif-overlay");
const notificationsListPage15 = document.getElementById("notifications-list-page15");
const openLogoutConfirmBtns = document.querySelectorAll(".open-logout-confirm-btn");
const logoutConfirmOverlay = document.getElementById("logout-confirm-overlay");
const closeLogoutConfirmBtn = document.getElementById("close-logout-confirm-btn");
const cancelLogoutBtn = document.getElementById("cancel-logout-btn");
const confirmLogoutBtn = document.getElementById("confirm-logout-btn");
const waitingProfileType = document.getElementById("waiting-profile-type");
const waitingStatusMessage = document.getElementById("waiting-status-message");
const waitingContactMessage = document.getElementById("waiting-contact-message");
const waitingGoLoginBtn = document.getElementById("waiting-go-login-btn");
const providerApprovedPopup = document.getElementById("provider-approved-popup");
const closeProviderApprovedPopupBtn = document.getElementById("close-provider-approved-popup-btn");
const providerApprovedPopupContinueBtn = document.getElementById("provider-approved-popup-continue-btn");
const profileNameInput = document.getElementById("profile-name-input");
const profileBirthInput = document.getElementById("profile-birth-input");
const profileEmailInput = document.getElementById("profile-email-input");
const profilePhoneInput = document.getElementById("profile-phone-input");
const profilePhotoMain = document.getElementById("profile-photo-main");
const profilePhotoChangeBtn = document.getElementById("profile-photo-change-btn");
const profilePhotoUploadInput = document.getElementById("profile-photo-upload-input");
const menuAvatarSmallPage8 = document.getElementById("menu-avatar-small-page8");
const menuAvatarMainPage8 = document.getElementById("menu-avatar-main-page8");
const menuAvatarSmallPage14 = document.getElementById("menu-avatar-small-page14");
const menuAvatarMainPage14 = document.getElementById("menu-avatar-main-page14");
const menuAvatarSmallPage15 = document.getElementById("menu-avatar-small-page15");
const menuAvatarMainPage15 = document.getElementById("menu-avatar-main-page15");
const menuUserNamePage8 = document.getElementById("menu-user-name-page8");
const menuUserNamePage14 = document.getElementById("menu-user-name-page14");
const menuUserNamePage15 = document.getElementById("menu-user-name-page15");
const menuUserEmailPage8 = document.getElementById("menu-user-email-page8");
const menuUserEmailPage14 = document.getElementById("menu-user-email-page14");
const menuUserEmailPage15 = document.getElementById("menu-user-email-page15");
const page15OpenPage9Btn = document.getElementById("page15-open-page9-btn");
const page15OpenPage10Btn = document.getElementById("page15-open-page10-btn");
const openPage10From15BottomBtn = document.getElementById("open-page10-from-15-bottom-btn");
const openPage10From17BottomBtn = document.getElementById("open-page10-from-17-bottom-btn");
const openPage10From18BottomBtn = document.getElementById("open-page10-from-18-bottom-btn");
const openPage10From34BottomBtn = document.getElementById("open-page10-from-34-bottom-btn");
const openPage10From19BottomBtn = document.getElementById("open-page10-from-19-bottom-btn");
const openPage10From20BottomBtn = document.getElementById("open-page10-from-20-bottom-btn");
const backFrom16Btn = document.getElementById("back-from-16-btn");
const openPage16Btns = document.querySelectorAll(".open-page16-btn");
const supportChatMessages = document.getElementById("support-chat-messages");
const supportChatInput = document.getElementById("support-chat-input");
const supportChatSendBtn = document.getElementById("support-chat-send-btn");
const supportChatForm = document.getElementById("support-chat-form");
const supportChatFeedback = document.getElementById("support-chat-feedback");
const openHomeBtns = document.querySelectorAll(".open-home-btn");
const providerCategoryTriggers = document.querySelectorAll("[data-category-target]");
const homeCategoryItems = document.querySelectorAll(".page8 .category-item[data-home-category]");
const page8CategoryIndicator = document.getElementById("page8-category-indicator");
const page8CategoryIndicatorDashes = page8CategoryIndicator
  ? Array.from(page8CategoryIndicator.querySelectorAll("[data-category-indicator-index]"))
  : [];
const PAGE8_CATEGORY_INDICATOR_ORDER = ["electricien", "plombier", "mecanicien", "serrurier", "menuisier"];
let currentProviderCategoryFilter = "";
const RENDER_FALLBACK_API_BASE = "https://proxyservice-x4n7.onrender.com";
const API_BASE_STORAGE_KEYS = ["proxyservices_admin_api_base", "proxy_api_base_url", "proxyservices_api_base_url"];
function buildLocalApiBaseCandidates(startPort = 5000, endPort = 5002) {
  const values = [];
  for (let port = startPort; port <= endPort; port += 1) {
    values.push(
      `http://localhost:${port}`,
      `http://127.0.0.1:${port}`,
      `https://localhost:${port}`,
      `https://127.0.0.1:${port}`
    );
  }
  return values;
}

const DEFAULT_PROVIDER_API_BASES = buildLocalApiBaseCandidates();
const API_REQUEST_TIMEOUT_MS = 70000;
const PROVIDER_DIRECTORY_SYNC_INTERVAL_MS = 3500;
const PENDING_VERIFICATION_STORAGE_KEY = "proxyservices_pending_verification";
const PENDING_VERIFICATION_STATUSES = ["en_attente"];
const ADMIN_SESSION_STORAGE_KEY = "proxyservices_admin_session";
const MODERATOR_IDENTIFIERS = ["admin1", "admin2", "admin3", "admin4", "admin5"];
const ADMIN_CREDENTIALS = {
  admin123: "admin123",
  admin1: "admin1",
  admin2: "admin2",
  admin3: "admin3",
  admin4: "admin4",
  admin5: "admin5"
};
const CLIENT_ACCOUNT_STORAGE_KEY = "proxyservices_client_accounts";
const PROVIDER_ACCOUNT_STORAGE_KEY = "proxyservices_provider_accounts";
const ACTIVE_CLIENT_ACCOUNT_STORAGE_KEY = "proxyservices_active_client_account";
const ACTIVE_PROVIDER_ACCOUNT_STORAGE_KEY = "proxyservices_active_provider_account";
const ACTIVE_PROFILE_ROLE_STORAGE_KEY = "proxyservices_active_profile_role";
const LAST_CLIENT_PAGE_STORAGE_KEY = "proxyservices_last_client_page";
const LAST_PROVIDER_PAGE_STORAGE_KEY = "proxyservices_last_provider_page";
const PROVIDER_CONTEXT_PAGES = new Set(["page10", "page14", "page15", "page17", "page30"]);
const CLIENT_CONTEXT_PAGES = new Set(["page8", "page9", "page18", "page19", "page20", "page22", "page23", "page24", "page34"]);
const VERIFIED_PROVIDER_DIRECTORY_STORAGE_KEY = "proxyservices_verified_provider_directory";
const WEBAUTHN_CREDENTIALS_STORAGE_KEY = "proxyservices_webauthn_credentials";
const CLIENT_ONGOING_REQUESTS_STORAGE_KEY = "proxyservices_client_ongoing_requests";
const ORDER_CHAT_LOCAL_STORAGE_KEY = "proxyservices_order_chat_messages";
const ORDER_CHAT_LAST_SEEN_STORAGE_KEY = "proxyservices_order_chat_last_seen";
const SUPPORT_CHAT_LOCAL_STORAGE_KEY = "proxyservices_support_chat_messages";
const CLIENT_NOTIFICATIONS_STORAGE_KEY = "proxyservices_client_notifications";
const PROVIDER_NOTIFICATIONS_STORAGE_KEY = "proxyservices_provider_notifications";
const DEFAULT_PROVIDER_CARD_IMAGE = "./avatar-placeholder.svg";
const DEFAULT_PROVIDER_PAYMENT_METHOD = "carte_bancaire";
const DEFAULT_ORDER_ADDRESS_LABEL = "Nahda";
const DEFAULT_ORDER_SERVICE_COORDINATES = {
  latitude: 27.14928,
  longitude: -13.19527
};
const ORDER_CHAT_ENABLED = true;
const DEFAULT_ORDER_ETA_MINUTES = 25;
const AVERAGE_PROVIDER_SPEED_KMH = 50;
const ETA_EXTRA_BUFFER_MINUTES = 8;
const DISTANCE_PRICE_BASE_DH = 250;
const DISTANCE_PRICE_PER_KM_DH = 20;
const NOTIFICATION_ICON_REQUEST_CREATED =
  "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/9Iw2Ao5NX1/3qx3b351_expires_30_days.png";
const NOTIFICATION_ICON_REQUEST_CANCELLED =
  "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/9Iw2Ao5NX1/rwnfeaud_expires_30_days.png";
const NOTIFICATION_ICON_PROVIDER_RATING =
  "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/9Iw2Ao5NX1/vctk6xy5_expires_30_days.png";
const FINISHED_REQUEST_STATUS_ICON =
  "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/9Iw2Ao5NX1/kx2esbf3_expires_30_days.png";
let lastResolvedVerificationStatus = "";
let lastResolvedProfileType = "";
let selectedOngoingRequestId = "";
let providerCoverageLocationData = null;
let pendingProviderFingerprintCapture = null;
let pendingProviderIdentityCapture = null;
let selectedClientInterventionWorkDone = "";
let selectedClientInterventionRating = 0;
let activeOrderChatRequestId = "";
let activeOrderChatPollTimer = null;
let chatBadgePollTimer = null;
let providerDirectoryPollTimer = null;
let activeOrderChatParticipant = null;
let activeOrderChatReturnPage = "page19";
let lastPaidRequestTimestamp = "";
let pendingOrderSubmissionInProgress = false;
let supportChatPollTimer = null;
let supportChatLastRenderedAt = 0;
let supportChatCachedMessages = [];
let activeSupportParticipantContext = null;
const DEFAULT_USER_AVATAR_URL = "./avatar-placeholder.svg";
const LEGACY_SEED_PROFILE_PHOTOS = new Set([
  "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/9Iw2Ao5NX1/svps67bm_expires_30_days.png",
  "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/9Iw2Ao5NX1/mdpghlrl_expires_30_days.png"
]);
let currentOrderProviderProfile = null;
let selectedProviderPaymentMethod = DEFAULT_PROVIDER_PAYMENT_METHOD;
let currentOrderTracking = buildDefaultOrderTrackingState();
let page20MapInstance = null;
let page20MapProviderMarker = null;
let page20MapArrivedMarker = null;
let page20MapInnerZoneCircle = null;
let page20MapOuterZoneCircle = null;
let page20MapRouteLine = null;
let page20MapGeoAttempted = false;
let page18ProviderMapInstance = null;
let page18ProviderMapMarker = null;
let page18ServiceAddressMarker = null;
let page18ServiceLinkLine = null;
let page18ProviderInnerZoneCircle = null;
let page18ProviderOuterZoneCircle = null;
let page18ProviderMapClickHandler = null;
let providerCoverageMapInstance = null;
let providerCoverageMapMarker = null;
let providerCoverageInnerZoneCircle = null;
let providerCoverageOuterZoneCircle = null;
let providerCoverageLeafletMap = null;
let providerCoverageLeafletMarker = null;
let providerCoverageLeafletInnerZoneCircle = null;
let providerCoverageLeafletOuterZoneCircle = null;
let providerCoverageLeafletClickHandler = null;
let providerCoverageUsingLeaflet = false;
let leafletApiLoadPromise = null;
let providerCoverageMapClickListener = null;
let providerCoverageManualPickMode = false;
let providerCoverageGoogleMapUnavailable = false;
const DEFAULT_PROVIDER_COVERAGE_CENTER = {
  latitude: 27.14867,
  longitude: -13.19321,
  accuracy: null,
  locationLabel: "manual_default"
};

function isValidPageClass(value) {
  const page = String(value || "").trim();
  if (!/^page\d+$/.test(page)) {
    return false;
  }
  return Boolean(document.querySelector(`.screen.${page}`));
}

function getLastVisitedPageForRole(role) {
  const normalizedRole = String(role || "").trim().toLowerCase();
  const storageKey =
    normalizedRole === "client"
      ? LAST_CLIENT_PAGE_STORAGE_KEY
      : normalizedRole === "prestataire"
        ? LAST_PROVIDER_PAGE_STORAGE_KEY
        : "";
  if (!storageKey) {
    return "";
  }

  try {
    const value = localStorage.getItem(storageKey);
    return isValidPageClass(value) ? String(value).trim() : "";
  } catch (error) {
    return "";
  }
}

function saveLastVisitedPageForRole(role, pageClass) {
  const normalizedRole = String(role || "").trim().toLowerCase();
  const normalizedPage = String(pageClass || "").trim();
  if (!isValidPageClass(normalizedPage)) {
    return;
  }

  const isOnboardingOrAuth = /^page([1-7]|25|26|27|28|29)$/.test(normalizedPage);
  if (isOnboardingOrAuth) {
    return;
  }
  if (normalizedRole === "prestataire" && normalizedPage === "page19") {
    return;
  }

  const storageKey =
    normalizedRole === "client"
      ? LAST_CLIENT_PAGE_STORAGE_KEY
      : normalizedRole === "prestataire"
        ? LAST_PROVIDER_PAGE_STORAGE_KEY
        : "";
  if (!storageKey) {
    return;
  }

  try {
    localStorage.setItem(storageKey, normalizedPage);
  } catch (error) {
    return;
  }
}

function setActiveProfileRole(role) {
  const normalizedRole = String(role || "").trim().toLowerCase();
  if (normalizedRole !== "client" && normalizedRole !== "prestataire") {
    return;
  }
  try {
    localStorage.setItem(ACTIVE_PROFILE_ROLE_STORAGE_KEY, normalizedRole);
  } catch (error) {
    return;
  }
}

function getActiveProfileRole() {
  try {
    const raw = String(localStorage.getItem(ACTIVE_PROFILE_ROLE_STORAGE_KEY) || "")
      .trim()
      .toLowerCase();
    if (raw === "client" || raw === "prestataire") {
      return raw;
    }
  } catch (error) {
    return "";
  }
  return "";
}

function resolveProfileRoleFromPageClass(pageClass) {
  const normalizedPage = String(pageClass || "").trim();
  if (!normalizedPage) {
    return "";
  }
  if (PROVIDER_CONTEXT_PAGES.has(normalizedPage)) {
    return "prestataire";
  }
  if (CLIENT_CONTEXT_PAGES.has(normalizedPage)) {
    return "client";
  }
  return "";
}

function normalizeAdminIdentifier(value) {
  return String(value || "").trim().toLowerCase();
}

function isModeratorIdentifier(identifier) {
  const normalized = normalizeAdminIdentifier(identifier);
  return MODERATOR_IDENTIFIERS.includes(normalized);
}

function isAdminCredentials(identifier, password) {
  const normalized = normalizeAdminIdentifier(identifier);
  if (!normalized) {
    return false;
  }
  return String(ADMIN_CREDENTIALS[normalized] || "") === String(password || "");
}

function buildAdminDashboardUrl(identifier = "") {
  const normalized = normalizeAdminIdentifier(identifier);
  const isModerator = isModeratorIdentifier(normalized);
  const path = isModerator ? `/moderator-dashboard-${normalized}.html` : "/admin-dashboard.html";

  if (!window.location || window.location.protocol === "file:" || !window.location.host) {
    return isModerator ? `./moderator-dashboard-${normalized}.html` : "./admin-dashboard.html";
  }

  return `${window.location.protocol}//${window.location.host}${path}`;
}

function saveAdminSession(identifier, secret = "") {
  const normalizedIdentifier = normalizeAdminIdentifier(identifier);
  const normalizedSecret = String(secret || "").trim() || normalizedIdentifier;
  const nowMs = Date.now();
  const payload = {
    email: normalizedIdentifier,
    authSecret: normalizedSecret,
    role: isModeratorIdentifier(normalizedIdentifier) ? "moderateur" : "admin",
    issuedAt: nowMs,
    expiresAt: nowMs + 12 * 60 * 60 * 1000
  };

  try {
    localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    // noop
  }
}

function normalizeApiBase(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

function getStoredApiBase() {
  for (const key of API_BASE_STORAGE_KEYS) {
    try {
      const value = normalizeApiBase(localStorage.getItem(key));
      if (value) {
        return value;
      }
    } catch (error) {
      return "";
    }
  }

  return "";
}

function saveApiBase(baseUrl) {
  const normalized = normalizeApiBase(baseUrl);
  if (!normalized) return;

  for (const key of API_BASE_STORAGE_KEYS) {
    try {
      localStorage.setItem(key, normalized);
    } catch (error) {
      return;
    }
  }
}

function isLocalhostApiBase(value) {
  const normalized = normalizeApiBase(value);
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalized);
}

function getProviderApiCandidates() {
  const localCandidates = [...DEFAULT_PROVIDER_API_BASES];
  const currentOriginCandidate =
    window.location && window.location.protocol !== "file:" && window.location.host
      ? normalizeApiBase(`${window.location.protocol}//${window.location.host}`)
      : "";
  const configuredCandidates = [
    normalizeApiBase(window.PROXY_API_BASE_URL),
    currentOriginCandidate,
    normalizeApiBase(RENDER_FALLBACK_API_BASE),
    getStoredApiBase()
  ];
  const candidates = [...configuredCandidates, ...localCandidates];
  const uniqueCandidates = candidates.filter((value, index) => value && candidates.indexOf(value) === index);
  const remoteCandidates = uniqueCandidates.filter((candidate) => !isLocalhostApiBase(candidate));
  const localhostCandidates = uniqueCandidates.filter((candidate) => isLocalhostApiBase(candidate));

  return [...remoteCandidates, ...localhostCandidates];
}

function getApiCandidates() {
  return getProviderApiCandidates();
}

function isProviderDirectoryPage(pageClass) {
  const normalizedPage = String(pageClass || "").trim();
  return normalizedPage === "page8" || normalizedPage === "page14" || normalizedPage === "page15";
}

function getActivePageClass() {
  return getPageClassFromElement(document.querySelector(".screen.active")) || "";
}

async function fetchWithTimeout(url, options = {}, timeoutMs = API_REQUEST_TIMEOUT_MS) {
  if (typeof AbortController !== "function") {
    return fetch(url, options);
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, { ...(options || {}), signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function isNetworkError(error) {
  const message = String((error && error.message) || "");
  const name = String((error && error.name) || "");
  return (
    error instanceof TypeError ||
    name === "AbortError" ||
    /failed to fetch|networkerror|load failed|timeout|timed out|abort/i.test(message)
  );
}

function isRetryableApiCandidateResponse(response, payload = null) {
  const status = Number((response && response.status) || 0);
  if (!status) {
    return false;
  }

  if (status === 404 || status === 405 || status === 501 || status === 502 || status === 503 || status === 504) {
    return true;
  }

  const message = String((payload && payload.message) || "")
    .trim()
    .toLowerCase();
  if (!message) {
    return false;
  }

  return message === "route not found." || message === "not found";
}

function arrayBufferToBase64Url(buffer) {
  if (!buffer) {
    return "";
  }

  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToUint8Array(value) {
  const input = String(value || "").trim();
  if (!input) {
    return new Uint8Array();
  }

  const padded = input + "=".repeat((4 - (input.length % 4)) % 4);
  const normalized = padded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function getWebAuthnCredentialStore() {
  try {
    const raw = localStorage.getItem(WEBAUTHN_CREDENTIALS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function saveWebAuthnCredentialStore(store) {
  try {
    localStorage.setItem(WEBAUTHN_CREDENTIALS_STORAGE_KEY, JSON.stringify(store || {}));
  } catch (error) {
    return;
  }
}

function getStoredWebAuthnCredentialId(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return "";
  }

  const store = getWebAuthnCredentialStore();
  return String(store[normalizedEmail] || "").trim();
}

function setStoredWebAuthnCredentialId(email, credentialId) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedCredentialId = String(credentialId || "").trim();
  if (!normalizedEmail || !normalizedCredentialId) {
    return;
  }

  const store = getWebAuthnCredentialStore();
  store[normalizedEmail] = normalizedCredentialId;
  saveWebAuthnCredentialStore(store);
}

function buildWebAuthnUserId(email) {
  const normalized = String(email || "provider@proxyservices.local").trim().toLowerCase() || "provider";
  const bytes = new TextEncoder().encode(normalized);
  return bytes.length <= 64 ? bytes : bytes.slice(0, 64);
}

async function getWebAuthnSupportDetails() {
  if (!window.PublicKeyCredential || !navigator.credentials) {
    return { supported: false, reason: "unsupported_browser" };
  }

  if (!window.isSecureContext) {
    return { supported: false, reason: "insecure_context" };
  }

  if (
    typeof navigator.credentials.create !== "function" ||
    typeof navigator.credentials.get !== "function"
  ) {
    return { supported: false, reason: "unsupported_browser" };
  }

  return { supported: true, reason: "" };
}

async function captureWebAuthnAssertionHash(email, credentialId = "") {
  const challenge = window.crypto.getRandomValues(new Uint8Array(32));
  const allowCredentials = [];
  const normalizedCredentialId = String(credentialId || "").trim();

  if (normalizedCredentialId) {
    allowCredentials.push({
      type: "public-key",
      id: base64UrlToUint8Array(normalizedCredentialId)
    });
  }

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: allowCredentials.length ? allowCredentials : undefined,
      userVerification: "required",
      timeout: 60000
    }
  });

  if (!assertion || assertion.type !== "public-key") {
    return null;
  }

  const response = assertion.response || {};
  const rawId = arrayBufferToBase64Url(assertion.rawId);
  const authenticatorData = arrayBufferToBase64Url(response.authenticatorData);
  const clientData = arrayBufferToBase64Url(response.clientDataJSON);
  const signature = arrayBufferToBase64Url(response.signature);
  const userHandle = arrayBufferToBase64Url(response.userHandle);
  const fingerprintSource = [
    email,
    rawId,
    authenticatorData,
    clientData,
    signature,
    userHandle,
    navigator.userAgent || "",
    Intl.DateTimeFormat().resolvedOptions().timeZone || ""
  ].join("|");

  return {
    hash: await sha256Hex(fingerprintSource),
    credentialId: rawId,
    mode: "biometric",
    webauthnStep: "assertion"
  };
}

async function captureWebAuthnRegistrationHash(account, email) {
  const challenge = window.crypto.getRandomValues(new Uint8Array(32));
  const displayName = `${(account && account.prenom) || ""} ${(account && account.nom) || ""}`.trim() || "Prestataire";

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "ProxyServices" },
      user: {
        id: buildWebAuthnUserId(email),
        name: email || "provider@proxyservices.local",
        displayName
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 }
      ],
      authenticatorSelection: {
        userVerification: "required",
        residentKey: "preferred"
      },
      timeout: 60000,
      attestation: "none"
    }
  });

  if (!credential || credential.type !== "public-key") {
    return null;
  }

  const response = credential.response || {};
  const rawId = arrayBufferToBase64Url(credential.rawId);
  const clientData = arrayBufferToBase64Url(response.clientDataJSON);
  const attestation = arrayBufferToBase64Url(response.attestationObject);
  const fingerprintSource = [
    email,
    rawId,
    clientData,
    attestation,
    navigator.userAgent || "",
    Intl.DateTimeFormat().resolvedOptions().timeZone || ""
  ].join("|");

  return {
    hash: await sha256Hex(fingerprintSource),
    credentialId: rawId,
    mode: "biometric",
    webauthnStep: "registration"
  };
}

async function sha256Hex(value) {
  const source = String(value || "");
  if (!source) {
    return "";
  }

  if (window.crypto && window.crypto.subtle) {
    try {
      const data = new TextEncoder().encode(source);
      const digest = await window.crypto.subtle.digest("SHA-256", data);
      const bytes = new Uint8Array(digest);
      return Array.from(bytes)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    } catch (error) {
      // Continue with deterministic JS hash fallback below.
    }
  }

  let h1 = 0xdeadbeef ^ source.length;
  let h2 = 0x41c6ce57 ^ source.length;
  for (let i = 0; i < source.length; i += 1) {
    const code = source.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return `${(h2 >>> 0).toString(16).padStart(8, "0")}${(h1 >>> 0)
    .toString(16)
    .padStart(8, "0")}`;
}

async function captureWebAuthnFingerprint(account) {
  const email = String((account && account.email) || "").trim().toLowerCase();
  if (!email) {
    return null;
  }

  const storedCredentialId = getStoredWebAuthnCredentialId(email);
  if (storedCredentialId) {
    try {
      const assertionResult = await captureWebAuthnAssertionHash(email, storedCredentialId);
      if (assertionResult && assertionResult.credentialId) {
        setStoredWebAuthnCredentialId(email, assertionResult.credentialId);
      }
      if (assertionResult && assertionResult.hash) {
        return assertionResult;
      }
    } catch (error) {
      const errorName = String((error && error.name) || "");
      if (errorName === "AbortError") {
        throw error;
      }
    }
  }

  try {
    const discoverableAssertion = await captureWebAuthnAssertionHash(email, "");
    if (discoverableAssertion && discoverableAssertion.credentialId) {
      setStoredWebAuthnCredentialId(email, discoverableAssertion.credentialId);
    }
    if (discoverableAssertion && discoverableAssertion.hash) {
      return discoverableAssertion;
    }
  } catch (error) {
    const errorName = String((error && error.name) || "");
    if (errorName === "AbortError") {
      throw error;
    }
  }

  try {
    const registrationResult = await captureWebAuthnRegistrationHash(account, email);
    if (registrationResult && registrationResult.credentialId) {
      setStoredWebAuthnCredentialId(email, registrationResult.credentialId);
    }
    if (registrationResult && registrationResult.hash) {
      return registrationResult;
    }
  } catch (error) {
    const errorName = String((error && error.name) || "");
    if (errorName === "InvalidStateError") {
      const assertionFallback = await captureWebAuthnAssertionHash(email, "");
      if (assertionFallback && assertionFallback.credentialId) {
        setStoredWebAuthnCredentialId(email, assertionFallback.credentialId);
      }
      return assertionFallback;
    }
    throw error;
  }

  return null;
}

async function captureFallbackFingerprintHash(account) {
  const email = String((account && account.email) || "").trim().toLowerCase();
  const deviceSource = [
    email,
    navigator.userAgent || "",
    navigator.language || "",
    navigator.platform || "",
    String(navigator.hardwareConcurrency || ""),
    String(navigator.deviceMemory || ""),
    `${window.screen ? window.screen.width : ""}x${window.screen ? window.screen.height : ""}`,
    `${window.screen ? window.screen.colorDepth : ""}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone || ""
  ].join("|");

  return sha256Hex(deviceSource);
}

function getFingerprintFallbackReasonText(reason) {
  switch (String(reason || "").toLowerCase()) {
    case "insecure_context":
      return "Face ID / Touch ID indisponible ici (HTTPS requis sur mobile). Utilisation d'une vérification appareil de secours.";
    case "unsupported_browser":
      return "Navigateur sans support Face ID / Touch ID (passkey). Utilisation d'une vérification appareil de secours.";
    case "webauthn_not_allowed":
      return "Validation Face ID / empreinte non confirmée. Utilisation d'une vérification appareil de secours.";
    case "webauthn_runtime_error":
      return "Biométrie indisponible temporairement. Utilisation d'une vérification appareil de secours.";
    default:
      return "Utilisation d'une vérification appareil de secours.";
  }
}

async function captureDeviceFingerprint(account) {
  const support = await getWebAuthnSupportDetails();
  let runtimeFallbackReason = "webauthn_runtime_error";

  if (support.supported) {
    try {
      const webAuthnCapture = await captureWebAuthnFingerprint(account);
      if (webAuthnCapture && webAuthnCapture.hash) {
        return {
          hash: webAuthnCapture.hash,
          mode: "biometric",
          credentialId: webAuthnCapture.credentialId || "",
          webauthnStep: webAuthnCapture.webauthnStep || "assertion",
          reason: ""
        };
      }
    } catch (error) {
      const errorName = String((error && error.name) || "");
      if (errorName === "AbortError") {
        throw new Error("Validation biométrique annulée. Réessayez puis confirmez Face ID ou empreinte.");
      }
      if (errorName === "NotAllowedError") {
        runtimeFallbackReason = "webauthn_not_allowed";
      }
    }
  }

  try {
    const fallbackHash = await captureFallbackFingerprintHash(account);
    return {
      hash: fallbackHash,
      mode: "fallback",
      credentialId: "",
      webauthnStep: "",
      reason: support.supported ? runtimeFallbackReason : support.reason || "unsupported_browser"
    };
  } catch (error) {
    return { hash: "", mode: "fallback", credentialId: "", webauthnStep: "", reason: "fallback_failed" };
  }
}

function captureCurrentLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        latitude: null,
        longitude: null,
        accuracy: null,
        locationLabel: null,
        errorMessage: "Géolocalisation non disponible."
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: Number(position.coords.latitude),
          longitude: Number(position.coords.longitude),
          accuracy: Number(position.coords.accuracy),
          locationLabel: "gps_device",
          errorMessage: ""
        });
      },
      (error) => {
        const code = Number((error && error.code) || 0);
        const isInsecureContext = !window.isSecureContext;
        let errorMessage = error && error.message ? String(error.message) : "Géolocalisation refusée.";

        if (isInsecureContext) {
          errorMessage =
            "Géolocalisation bloquée : iPhone/Safari exige HTTPS. Utilisez le bouton de position manuelle.";
        } else if (code === 1) {
          errorMessage = "Géolocalisation refusée. Autorisez la localisation dans les réglages du navigateur.";
        } else if (code === 2) {
          errorMessage = "Position indisponible. Vérifiez le signal GPS puis réessayez.";
        } else if (code === 3) {
          errorMessage = "Géolocalisation trop lente. Réessayez ou utilisez la position manuelle.";
        }
       alert(errorMessage);
        resolve({
          latitude: null,
          longitude: null,
          accuracy: null,
          locationLabel: null,
          errorMessage
        });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
}

function isNullIslandCoordinate(latitude, longitude) {
  return Math.abs(Number(latitude)) < 0.000001 && Math.abs(Number(longitude)) < 0.000001;
}

function hasProviderCoverageLocation(locationData) {
  const latitude = Number(locationData && locationData.latitude);
  const longitude = Number(locationData && locationData.longitude);
  return Boolean(
    locationData &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180 &&
      !isNullIslandCoordinate(latitude, longitude)
  );
}

function resolveProviderCoverageLocationFromAccount(account) {
  const source = account && typeof account === "object" ? account : getActiveProviderAccount();
  if (!source) {
    return null;
  }

  const sourceCoordinates =
    source.location && Array.isArray(source.location.coordinates) ? source.location.coordinates : null;
  const sourceLongitudeFromGeoJson =
    sourceCoordinates && sourceCoordinates.length >= 2 ? Number(sourceCoordinates[0]) : null;
  const sourceLatitudeFromGeoJson =
    sourceCoordinates && sourceCoordinates.length >= 2 ? Number(sourceCoordinates[1]) : null;

  const latitude = Number(
    source.coverageLatitude != null
      ? source.coverageLatitude
      : source.latitude != null
        ? source.latitude
        : sourceLatitudeFromGeoJson
  );
  const longitude = Number(
    source.coverageLongitude != null
      ? source.coverageLongitude
      : source.longitude != null
        ? source.longitude
        : sourceLongitudeFromGeoJson
  );
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const accuracy = Number(
    source.coverageAccuracy != null
      ? source.coverageAccuracy
      : source.locationAccuracy != null
        ? source.locationAccuracy
        : source.accuracy
  );
  return {
    latitude,
    longitude,
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
    locationLabel: String(source.coverageLocationLabel || source.locationLabel || "gps_device").trim()
  };
}

function isProviderCoverageReady(account = null) {
  const coverage = resolveProviderCoverageLocationFromAccount(account);
  return hasProviderCoverageLocation(coverage);
}

function isProviderCoverageManualLocation(locationData) {
  const label = String((locationData && locationData.locationLabel) || "")
    .trim()
    .toLowerCase();
  return label.startsWith("manual");
}

function isProviderCoverageManualReady(account = null) {
  const coverage = resolveProviderCoverageLocationFromAccount(account);
  return hasProviderCoverageLocation(coverage) && isProviderCoverageManualLocation(coverage);
}

function getProviderCoverageMapCenterLocation() {
  if (hasProviderCoverageLocation(providerCoverageLocationData)) {
    return providerCoverageLocationData;
  }

  const accountCoverage = resolveProviderCoverageLocationFromAccount();
  if (hasProviderCoverageLocation(accountCoverage)) {
    return accountCoverage;
  }

  return { ...DEFAULT_PROVIDER_COVERAGE_CENTER };
}

function clearProviderCoverageMapClickListener() {
  if (providerCoverageMapClickListener && typeof providerCoverageMapClickListener.remove === "function") {
    providerCoverageMapClickListener.remove();
  }
  providerCoverageMapClickListener = null;

  if (
    providerCoverageLeafletMap &&
    providerCoverageLeafletClickHandler &&
    typeof providerCoverageLeafletMap.off === "function"
  ) {
    providerCoverageLeafletMap.off("click", providerCoverageLeafletClickHandler);
  }
  providerCoverageLeafletClickHandler = null;
}

function resetProviderCoverageLeafletMapState() {
  clearProviderCoverageMapClickListener();
  if (providerCoverageLeafletMap && typeof providerCoverageLeafletMap.remove === "function") {
    providerCoverageLeafletMap.remove();
  }
  providerCoverageLeafletMap = null;
  providerCoverageLeafletMarker = null;
  providerCoverageLeafletInnerZoneCircle = null;
  providerCoverageLeafletOuterZoneCircle = null;
  providerCoverageUsingLeaflet = false;
}

function setProviderCoverageManualFormVisibility(isVisible) {
  if (!providerCoverageManualForm) {
    return;
  }
  providerCoverageManualForm.hidden = !isVisible;
}

function prepareProviderCoverageManualOnlyUi() {
  providerCoverageManualPickMode = true;
  clearProviderCoverageMapClickListener();
  setProviderCoverageManualFormVisibility(Boolean(providerCoverageGoogleMapUnavailable));

  if (providerCoverageEnableBtn) {
    providerCoverageEnableBtn.hidden = true;
    providerCoverageEnableBtn.disabled = true;
    providerCoverageEnableBtn.setAttribute("aria-hidden", "true");
  }

  if (providerCoverageManualBtn) {
    providerCoverageManualBtn.hidden = false;
    providerCoverageManualBtn.disabled = false;
    providerCoverageManualBtn.textContent = "Indiquer ma position manuellement";
  }
}

function setProviderCoverageManualInputsFromLocation(locationData) {
  if (!providerCoverageLatInput || !providerCoverageLngInput || !hasProviderCoverageLocation(locationData)) {
    return;
  }
  providerCoverageLatInput.value = Number(locationData.latitude).toFixed(5);
  providerCoverageLngInput.value = Number(locationData.longitude).toFixed(5);
}

function parseProviderCoverageManualCoordinate(rawValue) {
  const normalized = String(rawValue || "")
    .trim()
    .replace(",", ".");
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function setProviderCoverageFeedback(message, type = "neutral") {
  if (!providerCoverageFeedback) return;
  providerCoverageFeedback.textContent = String(message || "").trim();
  providerCoverageFeedback.classList.remove("success", "error");

  if (type === "success") {
    providerCoverageFeedback.classList.add("success");
  } else if (type === "error") {
    providerCoverageFeedback.classList.add("error");
  }
}

function syncProviderCoverageContinueButton(isReady) {
  if (!providerCoverageContinueBtn) return;
  providerCoverageContinueBtn.disabled = !isReady;
  providerCoverageContinueBtn.setAttribute("aria-disabled", String(!isReady));
  providerCoverageContinueBtn.classList.toggle("is-ready", isReady);
}

function syncProviderCoverageReadyIndicator(isReady, isManualLocation = false, hasDetectedLocation = false) {
  if (!providerCoverageReadyIndicator) {
    return;
  }

  if (isReady) {
    providerCoverageReadyIndicator.textContent = "Position manuelle validée. Vous pouvez continuer.";
  } else if (hasDetectedLocation && !isManualLocation) {
    providerCoverageReadyIndicator.textContent = "Position détectée, mais validation manuelle obligatoire.";
  } else {
    providerCoverageReadyIndicator.textContent = "Position manuelle non validée";
  }
  providerCoverageReadyIndicator.classList.toggle("is-ready", Boolean(isReady));
}

function formatProviderCoverageLocationLabel(locationData) {
  if (!hasProviderCoverageLocation(locationData)) {
    return "-";
  }

  const latitude = Number(locationData.latitude).toFixed(5);
  const longitude = Number(locationData.longitude).toFixed(5);
  return `${latitude}, ${longitude}`;
}

function setProviderCoverageMapPlaceholder(message, variant = "placeholder") {
  if (!providerCoverageMapFrame) {
    return;
  }

  const safeMessage = String(message || "").trim() || "Carte indisponible.";
  providerCoverageMapFrame.classList.remove("is-placeholder", "is-error");
  providerCoverageMapFrame.classList.add(variant === "error" ? "is-error" : "is-placeholder");
  providerCoverageMapFrame.textContent = safeMessage;
}

function clearProviderCoverageMapPlaceholder() {
  if (!providerCoverageMapFrame) {
    return;
  }

  providerCoverageMapFrame.classList.remove("is-placeholder", "is-error");
  providerCoverageMapFrame.textContent = "";
}

function loadLeafletApi() {
  if (window.L && typeof window.L.map === "function") {
    return Promise.resolve(window.L);
  }

  if (leafletApiLoadPromise) {
    return leafletApiLoadPromise;
  }

  leafletApiLoadPromise = new Promise((resolve, reject) => {
    const cssSources = [
      "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
      "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css"
    ];
    const scriptSources = [
      "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
      "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"
    ];

    const existingCss = document.getElementById("leaflet-sdk-css");
    if (!existingCss) {
      const css = document.createElement("link");
      css.id = "leaflet-sdk-css";
      css.rel = "stylesheet";
      css.href = cssSources[0];
      css.addEventListener("error", () => {
        if (css.href !== cssSources[1]) {
          css.href = cssSources[1];
        }
      });
      document.head.appendChild(css);
    }

    const finishLoad = () => {
      if (window.L && typeof window.L.map === "function") {
        resolve(window.L);
        return;
      }
      reject(new Error("Leaflet indisponible apres chargement."));
    };

    const existingScript = document.getElementById("leaflet-sdk");
    if (existingScript) {
      existingScript.addEventListener("load", finishLoad, { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Chargement Leaflet impossible.")), {
        once: true
      });
      return;
    }

    const tryLoadScript = (sourceIndex = 0) => {
      const script = document.createElement("script");
      script.id = "leaflet-sdk";
      script.async = true;
      script.defer = true;
      script.src = scriptSources[sourceIndex];
      script.addEventListener("load", finishLoad);
      script.addEventListener("error", () => {
        script.remove();
        if (sourceIndex + 1 < scriptSources.length) {
          tryLoadScript(sourceIndex + 1);
          return;
        }
        reject(new Error("Chargement Leaflet impossible."));
      });
      document.head.appendChild(script);
    };

    tryLoadScript(0);
  }).catch((error) => {
    leafletApiLoadPromise = null;
    throw error;
  });

  return leafletApiLoadPromise;
}

function renderProviderCoverageLeafletMap(position, preserveViewport) {
  if (!window.L || !providerCoverageMapFrame) {
    return;
  }

  if (!providerCoverageLeafletMap) {
    clearProviderCoverageMapPlaceholder();
    providerCoverageMapFrame.innerHTML = "";
    providerCoverageLeafletMap = window.L.map(providerCoverageMapFrame, {
      zoomControl: true
    });
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(providerCoverageLeafletMap);
  }

  if (!preserveViewport || !providerCoverageLeafletMarker) {
    providerCoverageLeafletMap.setView([position.lat, position.lng], 13);
  } else {
    providerCoverageLeafletMap.invalidateSize();
  }

  if (!providerCoverageLeafletMarker) {
    providerCoverageLeafletMarker = window.L.marker([position.lat, position.lng]).addTo(providerCoverageLeafletMap);
  } else {
    providerCoverageLeafletMarker.setLatLng([position.lat, position.lng]);
  }

  if (!providerCoverageLeafletOuterZoneCircle) {
    providerCoverageLeafletOuterZoneCircle = window.L.circle([position.lat, position.lng], {
      radius: 5000,
      color: "#e95322",
      weight: 2,
      fillColor: "#e95322",
      fillOpacity: 0.14
    }).addTo(providerCoverageLeafletMap);
  } else {
    providerCoverageLeafletOuterZoneCircle.setLatLng([position.lat, position.lng]);
  }

  if (!providerCoverageLeafletInnerZoneCircle) {
    providerCoverageLeafletInnerZoneCircle = window.L.circle([position.lat, position.lng], {
      radius: 2000,
      color: "#1f8f45",
      weight: 2,
      fillColor: "#2ebf5f",
      fillOpacity: 0.24
    }).addTo(providerCoverageLeafletMap);
  } else {
    providerCoverageLeafletInnerZoneCircle.setLatLng([position.lat, position.lng]);
  }

  if (!preserveViewport && providerCoverageLeafletOuterZoneCircle) {
    providerCoverageLeafletMap.fitBounds(providerCoverageLeafletOuterZoneCircle.getBounds(), {
      padding: [26, 26]
    });
  }

  setTimeout(() => {
    if (providerCoverageLeafletMap && typeof providerCoverageLeafletMap.invalidateSize === "function") {
      providerCoverageLeafletMap.invalidateSize();
    }
  }, 0);
}

async function renderProviderCoverageMap(locationData, options = {}) {
  if (!providerCoverageMapFrame) {
    return;
  }

  const { allowWithoutLocation = false, centerLocation = null, preserveViewport = false } = options;
  const resolvedLocation = hasProviderCoverageLocation(locationData)
    ? locationData
    : allowWithoutLocation && hasProviderCoverageLocation(centerLocation)
      ? centerLocation
      : null;
  if (!hasProviderCoverageLocation(resolvedLocation)) {
    return;
  }

  const position = {
    lat: Number(resolvedLocation.latitude),
    lng: Number(resolvedLocation.longitude)
  };

  try {
    await loadLeafletApi();
  } catch (error) {
    providerCoverageGoogleMapUnavailable = true;
    providerCoverageUsingLeaflet = false;
    setProviderCoverageMapPlaceholder("Impossible de charger la carte correctement.", "error");
    return;
  }

  providerCoverageGoogleMapUnavailable = false;
  providerCoverageUsingLeaflet = true;
  providerCoverageMapInstance = null;
  providerCoverageMapMarker = null;
  providerCoverageInnerZoneCircle = null;
  providerCoverageOuterZoneCircle = null;
  renderProviderCoverageLeafletMap(position, preserveViewport);
}

function syncProviderCoverageMap(locationData) {
  if (!providerCoverageMapWrap || !providerCoverageMapFrame) {
    return;
  }

  const hasLocation = hasProviderCoverageLocation(locationData);
  if (!hasLocation && !providerCoverageManualPickMode) {
    providerCoverageMapWrap.hidden = true;
    clearProviderCoverageMapClickListener();
    setProviderCoverageManualFormVisibility(false);
    setProviderCoverageMapPlaceholder(
      "Choisissez votre position manuellement pour afficher la carte."
    );
    return;
  }

  providerCoverageMapWrap.hidden = false;
  const centerLocation = getProviderCoverageMapCenterLocation();
  renderProviderCoverageMap(locationData, {
    allowWithoutLocation: !hasLocation,
    centerLocation,
    preserveViewport: hasLocation && providerCoverageManualPickMode
  })
    .then(() => {
      setProviderCoverageManualFormVisibility(Boolean(providerCoverageManualPickMode && providerCoverageGoogleMapUnavailable));
      if (providerCoverageGoogleMapUnavailable) {
        setProviderCoverageManualInputsFromLocation(centerLocation);
      }

      if (!providerCoverageManualPickMode) {
        clearProviderCoverageMapClickListener();
        return;
      }

      if (!providerCoverageLeafletMap || !window.L) {
        clearProviderCoverageMapClickListener();
        return;
      }

      clearProviderCoverageMapClickListener();
      providerCoverageLeafletClickHandler = (event) => {
        if (!event || !event.latlng) {
          return;
        }

        const manualLocation = {
          latitude: Number(event.latlng.lat),
          longitude: Number(event.latlng.lng),
          accuracy: null,
          locationLabel: "manual_map"
        };
        saveProviderCoverageFromLocation(manualLocation);
        applyProviderCoverageStepUi(manualLocation, { preserveFeedback: true });
        setProviderCoverageFeedback("Position manuelle enregistrée. Vous pouvez continuer.", "success");
        setProviderCoverageManualInputsFromLocation(manualLocation);
      };
      providerCoverageLeafletMap.on("click", providerCoverageLeafletClickHandler);
    })
    .catch(() => {
      providerCoverageGoogleMapUnavailable = true;
      setProviderCoverageMapPlaceholder("Impossible de charger la carte correctement.", "error");
      setProviderCoverageManualFormVisibility(Boolean(providerCoverageManualPickMode));
      setProviderCoverageManualInputsFromLocation(centerLocation);
    });
}

function applyProviderCoverageStepUi(locationData = null, options = {}) {
  const { preserveFeedback = false } = options;
  const coverage = hasProviderCoverageLocation(locationData)
    ? locationData
    : resolveProviderCoverageLocationFromAccount();
  providerCoverageLocationData = hasProviderCoverageLocation(coverage) ? coverage : null;
  const hasLocation = hasProviderCoverageLocation(providerCoverageLocationData);
  const isManualLocation = hasLocation && isProviderCoverageManualLocation(providerCoverageLocationData);
  const canContinueWithManual = hasLocation && isManualLocation;

  if (providerCoverageStatus) {
    providerCoverageStatus.textContent = hasLocation
      ? isManualLocation
        ? "Validee (manuel)"
        : "Position détectée (GPS)"
      : "Non validée";
  }

  if (providerCoverageLocation) {
    providerCoverageLocation.textContent = formatProviderCoverageLocationLabel(providerCoverageLocationData);
  }

  if (hasLocation) {
    setProviderCoverageManualInputsFromLocation(providerCoverageLocationData);
  }

  if (providerCoveragePriceIndicator) {
    providerCoveragePriceIndicator.textContent = hasLocation
      ? "Rayon 5 km actif. Indicateur prix: 0-2 km (prix normal), 2-5 km (prix majore)."
      : "Indiquez manuellement votre position pour activer l'indicateur de prix sur 5 km.";
  }

  syncProviderCoverageReadyIndicator(canContinueWithManual, isManualLocation, hasLocation);
  syncProviderCoverageMap(providerCoverageLocationData);
  syncProviderCoverageContinueButton(canContinueWithManual);

  if (!preserveFeedback) {
    if (canContinueWithManual) {
      setProviderCoverageFeedback(
        "Position manuelle validée. Vous pouvez continuer.",
        "success"
      );
    } else if (hasLocation) {
      setProviderCoverageFeedback(
        "Position détectée. Sélection manuelle obligatoire avant de continuer.",
        "neutral"
      );
    } else {
      setProviderCoverageFeedback(
        "Indiquez votre position manuellement sur la carte pour continuer.",
        "neutral"
      );
    }
  }
}

function saveProviderCoverageFromLocation(locationData) {
  if (!hasProviderCoverageLocation(locationData)) {
    return null;
  }

  let account = resolveProviderForFingerprintAccessFromLocalState();
  if (!account || !account.email) {
    account = getActiveProviderAccount();
  }
  if (!account || !account.email) {
    return null;
  }

  const nextAccount = {
    ...account,
    serviceRadiusKm: 5,
    coverageGeoEnabled: true,
    coverageLatitude: Number(locationData.latitude),
    coverageLongitude: Number(locationData.longitude),
    coverageAccuracy: Number.isFinite(Number(locationData.accuracy)) ? Number(locationData.accuracy) : null,
    coverageLocationLabel: String(locationData.locationLabel || "gps_device").trim() || "gps_device",
    coverageCapturedAt: new Date().toISOString()
  };

  upsertProviderAccount(nextAccount);
  setActiveProviderAccount(nextAccount);
  return nextAccount;
}

async function saveProviderCoverageToBackend(locationData, account = null) {
  if (!hasProviderCoverageLocation(locationData)) {
    return null;
  }

  const scopedAccount = account && account.email ? account : resolveProviderForFingerprintAccessFromLocalState() || getActiveProviderAccount();
  const email = String((scopedAccount && scopedAccount.email) || "").trim().toLowerCase();
  if (!email) {
    throw new Error("Email prestataire manquant pour enregistrer la géolocalisation.");
  }

  const payloadBody = {
    email,
    latitude: Number(locationData.latitude),
    longitude: Number(locationData.longitude),
    serviceRadiusKm: 5
  };

  if (Number.isFinite(Number(locationData.accuracy))) {
    payloadBody.locationAccuracy = Number(locationData.accuracy);
  }

  if (locationData && locationData.locationLabel) {
    payloadBody.locationLabel = String(locationData.locationLabel).trim();
  }

  let lastNetworkError = null;
  const endpointPaths = ["/prestataires/coverage", "/prestataires/location"];

  for (const apiBase of getApiCandidates()) {
    for (const endpointPath of endpointPaths) {
      try {
        const response = await fetchWithTimeout(`${apiBase}${endpointPath}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadBody)
        });
        const payload = await response.json().catch(() => ({}));
        const message = String((payload && payload.message) || "").toLowerCase();

        if (!response.ok) {
          if (
            response.status === 404 &&
            message.includes("route not found") &&
            endpointPath !== endpointPaths[endpointPaths.length - 1]
          ) {
            continue;
          }

          throw new Error(payload.message || "Impossible de sauvegarder la géolocalisation prestataire.");
        }

        saveApiBase(apiBase);
        const remoteCoverage =
          payload && payload.prestataire ? resolveProviderCoverageLocationFromAccount(payload.prestataire) : null;
        if (hasProviderCoverageLocation(remoteCoverage)) {
          saveProviderCoverageFromLocation(remoteCoverage);
        }
        return payload;
      } catch (error) {
        if (isNetworkError(error)) {
          lastNetworkError = error;
          break;
        }

        throw error;
      }
    }
  }

  if (lastNetworkError) {
    throw lastNetworkError;
  }

  throw new Error("Serveur backend inaccessible.");
}

function setFingerprintFeedback(message) {
  if (!fingerprintFeedback) {
    return;
  }
  fingerprintFeedback.textContent = String(message || "").trim();
}

function syncFingerprintContinueButton(isReady) {
  if (!fingerprintContinueBtn) {
    return;
  }

  fingerprintContinueBtn.disabled = !isReady;
  fingerprintContinueBtn.setAttribute("aria-disabled", String(!isReady));
  fingerprintContinueBtn.classList.toggle("is-ready", Boolean(isReady));
}

function resetProviderFingerprintStepUi() {
  pendingProviderFingerprintCapture = null;
  syncFingerprintContinueButton(false);
  if (fingerprintCaptureBtn) {
    fingerprintCaptureBtn.disabled = false;
    fingerprintCaptureBtn.textContent = "Valider Face ID / empreinte";
  }
  setFingerprintFeedback(
    "Validez Face ID ou empreinte pour activer Continuer. Vos donnees sont chiffrees pour proteger les clients."
  );
}

async function submitPrestataireFingerprintCapture(account, deviceFingerprintHash, locationData = null, options = {}) {
  const captureMode = String((options && options.captureMode) || "").trim().toLowerCase();
  const fingerprintCredentialId = String((options && options.fingerprintCredentialId) || "").trim();
  const email = String((account && account.email) || "").trim().toLowerCase();
  if (!email) {
    throw new Error("Email prestataire manquant.");
  }

  const payloadBody = {
    email,
    deviceFingerprintHash
  };

  if (captureMode) {
    payloadBody.captureMode = captureMode;
  }

  if (fingerprintCredentialId) {
    payloadBody.fingerprintCredentialId = fingerprintCredentialId;
  }

  if (locationData && Number.isFinite(locationData.latitude) && Number.isFinite(locationData.longitude)) {
    payloadBody.latitude = locationData.latitude;
    payloadBody.longitude = locationData.longitude;
  }

  if (locationData && Number.isFinite(locationData.accuracy)) {
    payloadBody.locationAccuracy = locationData.accuracy;
  }

  if (locationData && locationData.locationLabel) {
    payloadBody.locationLabel = locationData.locationLabel;
  }

  let lastNetworkError = null;
  const endpointPaths = ["/fingerprint/submit", "/prestataires/fingerprint"];

  for (const apiBase of getApiCandidates()) {
    for (const endpointPath of endpointPaths) {
      try {
        const response = await fetchWithTimeout(`${apiBase}${endpointPath}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadBody)
        });

        const payload = await response.json().catch(() => ({}));
        const message = String((payload && payload.message) || "").toLowerCase();

        if (!response.ok) {
          if (
            response.status === 404 &&
            message.includes("route not found") &&
            endpointPath !== endpointPaths[endpointPaths.length - 1]
          ) {
            continue;
          }

          throw new Error(payload.message || "Capture empreinte impossible.");
        }

        saveApiBase(apiBase);
        return payload;
      } catch (error) {
        if (isNetworkError(error)) {
          lastNetworkError = error;
          break;
        }

        throw error;
      }
    }
  }

  if (lastNetworkError) {
    throw lastNetworkError;
  }

  throw new Error("Serveur backend inaccessible.");
}

function getPendingVerification() {
  try {
    const raw = localStorage.getItem(PENDING_VERIFICATION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.profileType || !parsed.email) {
      return null;
    }

    return parsed;
  } catch (error) {
    return null;
  }
}

function savePendingVerification(profileType, email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedType = String(profileType || "").trim().toLowerCase();
  if (!normalizedEmail || !normalizedType) {
    return;
  }

  try {
    localStorage.setItem(
      PENDING_VERIFICATION_STORAGE_KEY,
      JSON.stringify({
        profileType: normalizedType,
        email: normalizedEmail,
        createdAt: new Date().toISOString()
      })
    );
  } catch (error) {
    return;
  }
}

function clearPendingVerification() {
  try {
    localStorage.removeItem(PENDING_VERIFICATION_STORAGE_KEY);
  } catch (error) {
    return;
  }
}

function getStatusRouteCandidates(profileType, email) {
  const normalizedType = String(profileType || "").trim().toLowerCase();
  if (normalizedType === "prestataire") {
    const encodedEmail = encodeURIComponent(email);
    return [`/fingerprint?email=${encodedEmail}`, `/prestataires/statut?email=${encodedEmail}`];
  }

  return [`/clients/statut?email=${encodeURIComponent(email)}`];
}

function normalizeStatus(status) {
  return String(status || "").trim().toLowerCase();
}

function shouldOpenProviderFingerprintStep(profileType, status, statusPayload = null) {
  if (String(profileType || "").trim().toLowerCase() !== "prestataire") {
    return false;
  }

  if (statusPayload && typeof statusPayload.shouldOpenFingerprintPage === "boolean") {
    return statusPayload.shouldOpenFingerprintPage;
  }

  const normalizedStatus = normalizeStatus(
    status || (statusPayload && statusPayload.statutVerification) || ""
  );

  if (normalizedStatus === "entretien_valide") {
    return true;
  }

  if (normalizedStatus !== "valide") {
    return false;
  }

  const payloadEmail = String((statusPayload && statusPayload.email) || "").trim().toLowerCase();
  const localAccount = payloadEmail ? findProviderAccountByEmail(payloadEmail) : null;
  const activeAccount = getActiveProviderAccount();
  const activeEmail = String((activeAccount && activeAccount.email) || "").trim().toLowerCase();
  const scopedActiveAccount =
    payloadEmail && activeEmail && activeEmail !== payloadEmail ? null : activeAccount;
  const fingerprintSources = [statusPayload, localAccount, scopedActiveAccount].filter(Boolean);
  const explicitFingerprintSource = fingerprintSources.find(
    (candidate) => typeof (candidate && candidate.fingerprintCaptured) === "boolean"
  );

  if (explicitFingerprintSource) {
    return !explicitFingerprintSource.fingerprintCaptured;
  }

  return true;
}

function canProviderContinueAfterAdminApproval(status, statusPayload = null) {
  const normalizedStatus = normalizeStatus(
    status || (statusPayload && statusPayload.statutVerification) || ""
  );

  if (normalizedStatus === "valide") {
    return true;
  }

  return shouldOpenProviderFingerprintStep("prestataire", normalizedStatus, statusPayload);
}

function canClientContinueAfterAdminApproval(status, statusPayload = null) {
  const normalizedStatus = normalizeStatus(
    status || (statusPayload && statusPayload.statutVerification) || ""
  );
  return normalizedStatus === "valide";
}

function shouldOpenProviderCoverageStep(profileType, status, statusPayload = null) {
  if (String(profileType || "").trim().toLowerCase() !== "prestataire") {
    return false;
  }

  if (!canProviderContinueAfterAdminApproval(status, statusPayload)) {
    return false;
  }

  const payloadEmail = String((statusPayload && statusPayload.email) || "").trim().toLowerCase();
  const localAccount = payloadEmail ? findProviderAccountByEmail(payloadEmail) : null;
  const activeAccount = getActiveProviderAccount();
  const activeEmail = String((activeAccount && activeAccount.email) || "").trim().toLowerCase();
  const scopedActiveAccount =
    payloadEmail && activeEmail && activeEmail !== payloadEmail ? null : activeAccount;
  const coverageSources = [statusPayload, localAccount, scopedActiveAccount].filter(Boolean);

  if (!coverageSources.length) {
    return true;
  }

  return !coverageSources.some((candidate) => isProviderCoverageManualReady(candidate));
}

async function fetchVerificationStatusByType(profileType, email, options = {}) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  const { allowNotFound = false } = options;
  const routeCandidates = getStatusRouteCandidates(profileType, normalizedEmail);
  let lastNetworkError = null;
  let sawNotFound = false;

  for (const apiBase of getApiCandidates()) {
    for (const route of routeCandidates) {
      try {
        const response = await fetchWithTimeout(`${apiBase}${route}`);
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (response.status === 404) {
            const hasFallbackRoute = route !== routeCandidates[routeCandidates.length - 1];
            if (hasFallbackRoute) {
              continue;
            }

            if (allowNotFound) {
              return null;
            }

            sawNotFound = true;
            continue;
          }

          throw new Error(payload.message || "Verification status unavailable.");
        }

        saveApiBase(apiBase);
        return payload;
      } catch (error) {
        if (isNetworkError(error)) {
          lastNetworkError = error;
          break;
        }

        throw error;
      }
    }
  }

  if (lastNetworkError) {
    throw lastNetworkError;
  }

  if (allowNotFound) {
    return null;
  }

  if (sawNotFound) {
    return { statutVerification: "en_attente" };
  }

  return null;
}

async function fetchVerificationStatus(pending, options = {}) {
  if (!pending || !pending.profileType || !pending.email) {
    return null;
  }

  return fetchVerificationStatusByType(pending.profileType, pending.email, options);
}

function isPendingStatus(status) {
  return PENDING_VERIFICATION_STATUSES.includes(String(status || "").toLowerCase());
}

async function enforcePendingVerificationLock() {
  const pending = getPendingVerification();
  if (!pending) {
    return false;
  }

  let status = "en_attente";
  let statusPayload = null;

  try {
    statusPayload = await fetchVerificationStatus(pending);
    if (statusPayload && statusPayload.statutVerification) {
      status = statusPayload.statutVerification;
    }
  } catch (error) {
    status = "en_attente";
  }

  const profileType = String(pending.profileType || "").toLowerCase();
  const normalizedStatus = String(status || "en_attente").toLowerCase();

  if (profileType === "client") {
    if (normalizedStatus === "valide") {
      activateProfileSession("client", pending.email, statusPayload || { statutVerification: normalizedStatus });
      clearPendingVerification();
      previousPageClass = "page29";
      goTo("page8");
      return true;
    }

    if (isPendingStatus(normalizedStatus)) {
      showSubmissionWaitingPage("client", normalizedStatus);
      return true;
    }

    clearPendingVerification();
    showSubmissionWaitingPage("client", normalizedStatus);
    return true;
  }

  if (profileType === "prestataire") {
    if (normalizedStatus === "valide") {
      activateProfileSession("prestataire", pending.email, statusPayload || { statutVerification: normalizedStatus });
      clearPendingVerification();
      showSubmissionWaitingPage("prestataire", "valide");
      return true;
    }

    if (
      shouldOpenProviderFingerprintStep("prestataire", normalizedStatus, statusPayload) ||
      shouldOpenProviderCoverageStep("prestataire", normalizedStatus, statusPayload)
    ) {
      activateProfileSession("prestataire", pending.email, statusPayload || { statutVerification: normalizedStatus });
      clearPendingVerification();
      previousPageClass = "page29";
      goTo("page30");
      return true;
    }

    if (isPendingStatus(normalizedStatus)) {
      showSubmissionWaitingPage("prestataire", normalizedStatus);
      return true;
    }

    clearPendingVerification();
    showSubmissionWaitingPage("prestataire", normalizedStatus);
    return true;
  }

  if (isPendingStatus(normalizedStatus)) {
    showSubmissionWaitingPage(pending.profileType, normalizedStatus);
    return true;
  }

  clearPendingVerification();
  return false;
}

function openPage8Overlay() {
  if (!page8Overlay) return;
  closePage8NotifOverlay();
  page8Overlay.hidden = false;
}

function closePage8Overlay() {
  if (!page8Overlay) return;
  page8Overlay.hidden = true;
}

function openPage8NotifOverlay() {
  if (!page8NotifOverlay) return;
  closePage8Overlay();
  renderClientNotifications();
  page8NotifOverlay.hidden = false;
}

function closePage8NotifOverlay() {
  if (!page8NotifOverlay) return;
  page8NotifOverlay.hidden = true;
}

function openPage14Overlay() {
  if (!page14Overlay) return;
  closePage14NotifOverlay();
  page14Overlay.hidden = false;
}

function closePage14Overlay() {
  if (!page14Overlay) return;
  page14Overlay.hidden = true;
}

function openPage14NotifOverlay() {
  if (!page14NotifOverlay) return;
  closePage14Overlay();
  renderClientNotifications();
  page14NotifOverlay.hidden = false;
}

function closePage14NotifOverlay() {
  if (!page14NotifOverlay) return;
  page14NotifOverlay.hidden = true;
}

function openPage15Overlay() {
  if (!page15Overlay) return;
  closePage15NotifOverlay();
  page15Overlay.hidden = false;
}

function closePage15Overlay() {
  if (!page15Overlay) return;
  page15Overlay.hidden = true;
}

function openPage15NotifOverlay() {
  if (!page15NotifOverlay) return;
  closePage15Overlay();
  renderClientNotifications();
  page15NotifOverlay.hidden = false;
}

function closePage15NotifOverlay() {
  if (!page15NotifOverlay) return;
  page15NotifOverlay.hidden = true;
}

function openLogoutConfirmOverlay() {
  if (!logoutConfirmOverlay) return;
  closePage8Overlay();
  closePage8NotifOverlay();
  closePage14Overlay();
  closePage14NotifOverlay();
  closePage15Overlay();
  closePage15NotifOverlay();
  logoutConfirmOverlay.hidden = false;
}

function closeLogoutConfirmOverlay() {
  if (!logoutConfirmOverlay) return;
  logoutConfirmOverlay.hidden = true;
}

function openProviderApprovedPopup() {
  if (!providerApprovedPopup) return;
  providerApprovedPopup.hidden = false;
}

function closeProviderApprovedPopup() {
  if (!providerApprovedPopup) return;
  providerApprovedPopup.hidden = true;
}

function continueFromProviderApprovedPopup() {
  closeProviderApprovedPopup();
  previousPageClass = "page29";
  goTo("page30");

  const activePageClass = getPageClassFromElement(document.querySelector(".screen.active"));
  if (activePageClass === "page30") {
    return;
  }

  const page30Screen = document.querySelector(".page30");
  if (!page30Screen) {
    return;
  }

  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("active");
  });
  page30Screen.classList.add("active");
  window.scrollTo(0, 0);
  fitScreen(page30Screen);
  prepareProviderCoverageManualOnlyUi();
  applyProviderCoverageStepUi(null, { preserveFeedback: false });
}

function performLogoutAndReturnToStart() {
  try {
    localStorage.removeItem(ACTIVE_CLIENT_ACCOUNT_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_PROVIDER_ACCOUNT_STORAGE_KEY);
    localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  } catch (error) {
    // noop
  }

  closeLogoutConfirmOverlay();
  applyActiveUserProfile();
  previousPageClass = "page1";
  goTo("page1");
}

function setPage18AddressFeedback(message, type = "neutral") {
  if (!page18AddressFeedback) return;
  page18AddressFeedback.textContent = String(message || "").trim();
  page18AddressFeedback.classList.remove("success", "error");

  if (type === "success") {
    page18AddressFeedback.classList.add("success");
  } else if (type === "error") {
    page18AddressFeedback.classList.add("error");
  }
}

function hasPage18ManualMapAddressSelected() {
  const source = String((currentOrderTracking && currentOrderTracking.addressSource) || "")
    .trim()
    .toLowerCase();
  return source === "manual_map" && hasCurrentOrderTrackingGeo();
}

function hasPage18ManualMapAddressConfirmed() {
  return hasPage18ManualMapAddressSelected() && Boolean(currentOrderTracking && currentOrderTracking.addressConfirmed);
}

function scrollPage18ToProviderMap() {
  if (!page18ProviderMapElement || typeof page18ProviderMapElement.scrollIntoView !== "function") {
    return;
  }

  page18ProviderMapElement.scrollIntoView({ behavior: "smooth", block: "center" });
}

function requestManualMapAddressSelection() {
  const message =
    "Adresse de prestation obligatoire: cliquez sur la carte puis appuyez sur Confirmer l'adresse.";
  setPage18AddressFeedback(message, "error");
  scrollPage18ToProviderMap();
  window.alert(message);
}

function syncPage18ConfirmAddressButtonState() {
  if (!page18ConfirmAddressBtn) {
    return;
  }

  const hasSelected = hasPage18ManualMapAddressSelected();
  const isConfirmed = hasPage18ManualMapAddressConfirmed();
  page18ConfirmAddressBtn.disabled = !hasSelected || isConfirmed;
  page18ConfirmAddressBtn.classList.toggle("is-confirmed", isConfirmed);
  page18ConfirmAddressBtn.textContent = isConfirmed ? "Adresse confirmée" : "Confirmer l'adresse";
}

function syncPage18PaymentButtonState() {
  if (!openPage19Btn) {
    return;
  }

  const isReady = hasPage18ManualMapAddressConfirmed();
  openPage19Btn.disabled = !isReady;
  openPage19Btn.setAttribute("aria-disabled", String(!isReady));
  openPage19Btn.classList.toggle("is-disabled", !isReady);
}

function openPage18AddressOverlay() {
  if (currentOrderTracking) {
    currentOrderTracking.addressLabel = DEFAULT_ORDER_ADDRESS_LABEL;
    currentOrderTracking.distanceKm = null;
    currentOrderTracking.calculatedPriceDh = null;
    currentOrderTracking.latitude = Number(DEFAULT_ORDER_SERVICE_COORDINATES.latitude);
    currentOrderTracking.longitude = Number(DEFAULT_ORDER_SERVICE_COORDINATES.longitude);
    currentOrderTracking.addressSource = "manual_map";
    currentOrderTracking.addressConfirmed = false;
  }
  applyCurrentOrderTrackingSummary();
  syncPage18ConfirmAddressButtonState();
  syncPage18PaymentButtonState();
  if (!hasPage18ManualMapAddressSelected()) {
    requestManualMapAddressSelection();
  }
}

function closePage18AddressOverlay() {
  if (!page18AddressOverlay) return;
  page18AddressOverlay.hidden = true;
  setPage18AddressFeedback("", "neutral");
}

function refreshPage18ProviderMapIfActive() {
  const activeScreen = document.querySelector(".screen.active");
  if (!activeScreen || !activeScreen.classList.contains("page18")) {
    return;
  }

  renderPage18ProviderCoverageMapWithFallback().catch(() => {
    setPage18ProviderMapPlaceholder("Carte du prestataire indisponible pour le moment.", "error");
  });
}

function applyManualOrderAddress(rawAddress) {
  const normalizedAddress = String(rawAddress || "").trim();
  if (!normalizedAddress) {
    return false;
  }

  const hasManualMapPoint =
    String((currentOrderTracking && currentOrderTracking.addressSource) || "")
      .trim()
      .toLowerCase() === "manual_map" &&
    hasCurrentOrderTrackingGeo();
  currentOrderTracking.addressLabel = normalizedAddress;
  currentOrderTracking.addressSource = hasManualMapPoint ? "manual_map" : "manual";
  currentOrderTracking.addressConfirmed = false;
  currentOrderTracking.distanceKm = null;
  currentOrderTracking.calculatedPriceDh = null;
  if (!hasManualMapPoint) {
    currentOrderTracking.latitude = null;
    currentOrderTracking.longitude = null;
  }
  applyCurrentOrderTrackingSummary();
  refreshPage18ProviderMapIfActive();
  return true;
}

async function applyGpsOrderAddressFromDevice() {
  const locationData = await captureCurrentLocation();
  if (!isValidOrderGeoLocation(locationData)) {
    throw new Error(
      String(locationData && locationData.errorMessage).trim() || "Impossible de récupérer votre position GPS."
    );
  }

  syncCurrentOrderTrackingGeo(locationData);
  applyCurrentOrderTrackingSummary();
  refreshPage18ProviderMapIfActive();
  return true;
}

function setProviderFeedback(message, type = "neutral") {
  if (!providerVerificationFeedback) return;
  providerVerificationFeedback.textContent = message || "";
  providerVerificationFeedback.classList.remove("success", "error");

  if (type === "success") {
    providerVerificationFeedback.classList.add("success");
  }

  if (type === "error") {
    providerVerificationFeedback.classList.add("error");
  }
}

function setProviderIdentityFeedback(message, type = "neutral") {
  if (!providerIdentityFeedback) {
    return;
  }

  providerIdentityFeedback.textContent = String(message || "").trim();
  providerIdentityFeedback.classList.remove("success", "error");
  if (type === "success") {
    providerIdentityFeedback.classList.add("success");
  } else if (type === "error") {
    providerIdentityFeedback.classList.add("error");
  }
}

function syncProviderIdentityContinueButton(isReady) {
  if (!providerIdentityContinueBtn) {
    return;
  }

  providerIdentityContinueBtn.disabled = !isReady;
  providerIdentityContinueBtn.setAttribute("aria-disabled", String(!isReady));
  providerIdentityContinueBtn.classList.toggle("is-ready", Boolean(isReady));
}

function syncProviderIdentityProviderName() {
  if (!providerIdentityProviderName) {
    return;
  }

  const providerProfile = getCurrentOrderProviderProfile();
  const label = String((providerProfile && providerProfile.name) || "").trim() || "Prestataire";
  providerIdentityProviderName.textContent = label;
}

function resetProviderIdentityStepUi() {
  pendingProviderIdentityCapture = null;
  syncProviderIdentityContinueButton(false);
  if (providerIdentityCaptureBtn) {
    providerIdentityCaptureBtn.disabled = false;
    providerIdentityCaptureBtn.textContent = "Scanner Face ID / empreinte du prestataire";
  }
  setProviderIdentityFeedback(
    "Demandez au prestataire de valider sa biométrie pour confirmer son identité.",
    "neutral"
  );
}

function setClientInterventionFeedback(message, type = "neutral") {
  if (!clientInterventionFeedback) {
    return;
  }

  clientInterventionFeedback.textContent = String(message || "").trim();
  clientInterventionFeedback.classList.remove("success", "error");
  if (type === "success") {
    clientInterventionFeedback.classList.add("success");
  } else if (type === "error") {
    clientInterventionFeedback.classList.add("error");
  }
}

function syncClientInterventionProviderName() {
  if (!clientInterventionProviderName) {
    return;
  }

  const selectedRequest = getClientOngoingRequestById(selectedOngoingRequestId);
  if (selectedRequest && selectedRequest.providerName) {
    clientInterventionProviderName.textContent = String(selectedRequest.providerName || "").trim() || "Prestataire";
    return;
  }

  const providerProfile = getCurrentOrderProviderProfile();
  const label = String((providerProfile && providerProfile.name) || "").trim() || "Prestataire";
  clientInterventionProviderName.textContent = label;
}

function syncClientInterventionPhotosMeta() {
  if (!clientInterventionPhotosMeta) {
    return;
  }

  const files =
    clientInterventionPhotosInput && clientInterventionPhotosInput.files
      ? Array.from(clientInterventionPhotosInput.files)
      : [];
  if (!files.length) {
    clientInterventionPhotosMeta.textContent = "Aucune photo ajoutée.";
    return;
  }

  const suffix = files.length > 1 ? "s" : "";
  clientInterventionPhotosMeta.textContent = `${files.length} photo${suffix} ajoutée${suffix}.`;
}

function syncClientInterventionRatingMeta() {
  if (!clientInterventionRatingMeta) {
    return;
  }

  if (!selectedClientInterventionRating) {
    clientInterventionRatingMeta.textContent = "Choisissez une note entre 1 et 5.";
    return;
  }

  clientInterventionRatingMeta.textContent = `Note selectionnee: ${selectedClientInterventionRating}/5`;
}

function syncClientInterventionFinishButtonState() {
  if (!clientInterventionFinishBtn) {
    return;
  }

  const hasWorkChoice = selectedClientInterventionWorkDone === "yes" || selectedClientInterventionWorkDone === "no";
  const hasRating = Number.isFinite(Number(selectedClientInterventionRating)) && Number(selectedClientInterventionRating) >= 1;
  const hasPhotos =
    clientInterventionPhotosInput &&
    clientInterventionPhotosInput.files &&
    clientInterventionPhotosInput.files.length > 0;
  const isReady = Boolean(hasWorkChoice && hasRating && hasPhotos);
  clientInterventionFinishBtn.disabled = !isReady;
  clientInterventionFinishBtn.setAttribute("aria-disabled", String(!isReady));
  clientInterventionFinishBtn.classList.toggle("is-ready", isReady);
}

function syncClientInterventionWorkChoiceButtons() {
  if (!clientInterventionWorkChoiceBtns || !clientInterventionWorkChoiceBtns.length) {
    return;
  }

  clientInterventionWorkChoiceBtns.forEach((button) => {
    const value = String((button && button.dataset && button.dataset.workDone) || "").trim().toLowerCase();
    const isSelected = value && value === selectedClientInterventionWorkDone;
    button.classList.toggle("is-selected", Boolean(isSelected));
    button.setAttribute("aria-pressed", isSelected ? "true" : "false");
  });
}

function syncClientInterventionRatingButtons() {
  if (!clientInterventionRatingStarBtns || !clientInterventionRatingStarBtns.length) {
    return;
  }

  clientInterventionRatingStarBtns.forEach((button) => {
    const value = Number((button && button.dataset && button.dataset.ratingValue) || 0);
    const isSelected = Number.isFinite(value) && value <= Number(selectedClientInterventionRating || 0);
    button.classList.toggle("is-selected", Boolean(isSelected));
    button.setAttribute("aria-pressed", isSelected ? "true" : "false");
  });
}

function resetClientInterventionReviewStepUi() {
  selectedClientInterventionWorkDone = "";
  selectedClientInterventionRating = 0;
  if (clientInterventionPhotosInput) {
    clientInterventionPhotosInput.value = "";
  }
  syncClientInterventionProviderName();
  syncClientInterventionWorkChoiceButtons();
  syncClientInterventionRatingButtons();
  syncClientInterventionPhotosMeta();
  syncClientInterventionRatingMeta();
  syncClientInterventionFinishButtonState();
  setClientInterventionFeedback(
    "Ajoutez les preuves de l'intervention puis terminez la prestation pour la voir dans la section Termine.",
    "neutral"
  );
}

function resolveActiveClientInterventionRequestId() {
  const activeClientEmail = getActiveClientEmail();
  if (!activeClientEmail) {
    return "";
  }

  const selectedRequest = getClientOngoingRequestById(selectedOngoingRequestId);
  if (selectedRequest && selectedRequest.id) {
    return String(selectedRequest.id || "").trim();
  }

  const ongoingRequests = getClientOngoingRequestsForEmail(activeClientEmail);
  if (!ongoingRequests.length) {
    return "";
  }

  const providerProfile = getCurrentOrderProviderProfile();
  const providerEmail = String((providerProfile && providerProfile.email) || "").trim().toLowerCase();
  if (providerEmail) {
    const matchedByEmail = ongoingRequests.find(
      (entry) => String((entry && entry.providerEmail) || "").trim().toLowerCase() === providerEmail
    );
    if (matchedByEmail && matchedByEmail.id) {
      return String(matchedByEmail.id || "").trim();
    }
  }

  return String((ongoingRequests[0] && ongoingRequests[0].id) || "").trim();
}

function setCurrentOrderProviderEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return;
  }

  const providerProfile = getCurrentOrderProviderProfile();
  currentOrderProviderProfile = {
    ...(providerProfile && typeof providerProfile === "object" ? providerProfile : {}),
    email: normalizedEmail
  };
}

function resolveProviderEmailFromCurrentRequestContext() {
  const activeClientEmail = getActiveClientEmail();
  const selectedRequestId = String(selectedOngoingRequestId || "").trim();
  const tryResolveFromEntry = (entry) => {
    if (!entry || typeof entry !== "object") {
      return "";
    }
    return resolveProviderEmailForRequest({
      providerEmail: entry.providerEmail,
      providerName: entry.providerName,
      providerDomain: entry.providerDomain
    });
  };

  if (activeClientEmail && selectedRequestId) {
    const selectedEntry = getClientRequestByIdAnyStatus(selectedRequestId, activeClientEmail);
    const selectedEntryEmail = tryResolveFromEntry(selectedEntry);
    if (selectedEntryEmail) {
      setCurrentOrderProviderEmail(selectedEntryEmail);
      return selectedEntryEmail;
    }
  }

  if (activeClientEmail) {
    const latestEntry = getLatestClientRequestForWaitingFlow(activeClientEmail);
    const latestEntryEmail = tryResolveFromEntry(latestEntry);
    if (latestEntryEmail) {
      if (latestEntry && latestEntry.id) {
        selectedOngoingRequestId = String(latestEntry.id || "").trim();
      }
      setCurrentOrderProviderEmail(latestEntryEmail);
      return latestEntryEmail;
    }
  }

  return "";
}

async function resolveProviderEmailForClientIdentityVerification() {
  const providerProfile = getCurrentOrderProviderProfile();
  const directEmail = String((providerProfile && providerProfile.email) || "").trim().toLowerCase();
  if (directEmail) {
    return directEmail;
  }

  const localRequestEmail = resolveProviderEmailFromCurrentRequestContext();
  if (localRequestEmail) {
    return localRequestEmail;
  }

  try {
    await syncOngoingRequestsFromBackendForActiveParticipant();
  } catch (error) {
    // keep local fallback when backend is temporarily unreachable
  }

  const syncedRequestEmail = resolveProviderEmailFromCurrentRequestContext();
  if (syncedRequestEmail) {
    return syncedRequestEmail;
  }

  const fallbackByName = resolveProviderEmailForRequest({
    providerName: providerProfile && providerProfile.name,
    providerDomain: providerProfile && providerProfile.domain
  });
  if (fallbackByName) {
    setCurrentOrderProviderEmail(fallbackByName);
    return fallbackByName;
  }

  return "";
}

async function resolveProviderForClientIdentityVerification() {
  const providerProfile = getCurrentOrderProviderProfile();
  const email = await resolveProviderEmailForClientIdentityVerification();
  if (!email) {
    throw new Error("Email du prestataire introuvable pour la vérification.");
  }

  const localAccount = findProviderAccountByEmail(email);
  let remoteStatus = null;
  try {
    remoteStatus = await fetchVerificationStatusByType("prestataire", email, { allowNotFound: true });
  } catch (error) {
    remoteStatus = null;
  }

  const source = (remoteStatus && typeof remoteStatus === "object" ? remoteStatus : null) || localAccount || providerProfile;
  const fingerprintCaptured =
    typeof source.fingerprintCaptured === "boolean"
      ? source.fingerprintCaptured
      : Boolean((localAccount && localAccount.fingerprintCaptured) || false);
  const fingerprintCaptureMode = String(
    source.fingerprintCaptureMode || (localAccount && localAccount.fingerprintCaptureMode) || ""
  )
    .trim()
    .toLowerCase();

  return {
    ...source,
    email,
    fingerprintCaptured,
    fingerprintCaptureMode
  };
}

function setSignupFeedback(message, type = "neutral") {
  if (!signupFeedback) return;
  signupFeedback.textContent = message || "";
  signupFeedback.classList.remove("success", "error");

  if (type === "success") {
    signupFeedback.classList.add("success");
  }

  if (type === "error") {
    signupFeedback.classList.add("error");
  }
}

function setProviderSignupFeedback(message, type = "neutral") {
  if (!providerSignupFeedback) return;
  providerSignupFeedback.textContent = message || "";
  providerSignupFeedback.classList.remove("success", "error");

  if (type === "success") {
    providerSignupFeedback.classList.add("success");
  }

  if (type === "error") {
    providerSignupFeedback.classList.add("error");
  }
}

function setLoginFeedback(message, type = "neutral") {
  if (!loginFeedback) return;
  loginFeedback.textContent = message || "";
  loginFeedback.classList.remove("success", "error");

  if (type === "success") {
    loginFeedback.classList.add("success");
  }

  if (type === "error") {
    loginFeedback.classList.add("error");
  }
}

function normalizeProfilePhotoValue(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) {
    return "";
  }

  if (LEGACY_SEED_PROFILE_PHOTOS.has(value.toLowerCase())) {
    return "";
  }

  return value;
}

function getClientAccounts() {
  try {
    const raw = localStorage.getItem(CLIENT_ACCOUNT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveClientAccounts(accounts) {
  try {
    localStorage.setItem(CLIENT_ACCOUNT_STORAGE_KEY, JSON.stringify(accounts));
  } catch (error) {
    return;
  }
}

function upsertClientAccount(account) {
  if (!account || !account.email) {
    return;
  }

  const email = String(account.email).trim().toLowerCase();
  if (!email) {
    return;
  }

  const accounts = getClientAccounts();
  const hasPassword = Object.prototype.hasOwnProperty.call(account, "password");
  const next = {
    email,
    nom: String(account.nom || "").trim(),
    prenom: String(account.prenom || "").trim(),
    telephone: String(account.telephone || "").trim(),
    dateDeNaissance: String(account.dateDeNaissance || "").trim(),
    age: Number.isFinite(Number(account.age)) ? Number(account.age) : null,
    cinImage: String(account.cinImage || "").trim(),
    photoProfil: normalizeProfilePhotoValue(account.photoProfil || account.photo || account.avatarUrl || ""),
    statutVerification: String(account.statutVerification || "en_attente").trim().toLowerCase(),
    updatedAt: new Date().toISOString()
  };
  if (hasPassword) {
    next.password = String(account.password || "");
  }
  const index = accounts.findIndex((item) => String(item.email || "").toLowerCase() === email);

  if (index >= 0) {
    accounts[index] = { ...accounts[index], ...next };
  } else {
    accounts.push(next);
  }

  saveClientAccounts(accounts);
}

function findClientAccountByEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  return getClientAccounts().find((item) => String(item.email || "").toLowerCase() === normalizedEmail) || null;
}

function setActiveClientAccount(account, options = {}) {
  if (!account || !account.email) {
    return;
  }

  const shouldClearOtherRole = options && options.clearOtherRole === false ? false : true;
  if (shouldClearOtherRole) {
    try {
      localStorage.removeItem(ACTIVE_PROVIDER_ACCOUNT_STORAGE_KEY);
    } catch (error) {
      // noop
    }
  }

  try {
    localStorage.setItem(
      ACTIVE_CLIENT_ACCOUNT_STORAGE_KEY,
      JSON.stringify({
        ...account,
        photoProfil: normalizeProfilePhotoValue(account.photoProfil || account.photo || account.avatarUrl || "")
      })
    );
  } catch (error) {
    return;
  }

  if (options.persistRole !== false) {
    setActiveProfileRole("client");
  }
}

function getActiveClientAccount() {
  try {
    const raw = localStorage.getItem(ACTIVE_CLIENT_ACCOUNT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return {
      ...parsed,
      photoProfil: normalizeProfilePhotoValue(parsed.photoProfil || parsed.photo || parsed.avatarUrl || "")
    };
  } catch (error) {
    return null;
  }
}

function applyActiveClientProfile() {
  const account = getActiveClientAccount();
  if (!account) {
    return;
  }

  const displayName = String(account.nom || "").trim() || String(account.prenom || "").trim();
  if (profileNameInput && displayName) {
    profileNameInput.value = displayName;
  }

  if (profileEmailInput && account.email) {
    profileEmailInput.value = account.email;
  }

  if (profilePhoneInput && account.telephone) {
    profilePhoneInput.value = account.telephone;
  }

  if (profileBirthInput && account.dateDeNaissance) {
    const birthDate = new Date(account.dateDeNaissance);
    if (!Number.isNaN(birthDate.getTime())) {
      const dd = String(birthDate.getDate()).padStart(2, "0");
      const mm = String(birthDate.getMonth() + 1).padStart(2, "0");
      const yyyy = String(birthDate.getFullYear());
      profileBirthInput.value = `${dd} / ${mm} / ${yyyy}`;
    }
  }
}

function applyMenuUserName(fullName) {
  const name = String(fullName || "").trim() || "Profil";
  if (menuUserNamePage8) menuUserNamePage8.textContent = name;
  if (menuUserNamePage14) menuUserNamePage14.textContent = name;
  if (menuUserNamePage15) menuUserNamePage15.textContent = name;
}

function applyMenuUserEmail(email) {
  const safeEmail = String(email || "").trim();
  if (menuUserEmailPage8) menuUserEmailPage8.textContent = safeEmail;
  if (menuUserEmailPage14) menuUserEmailPage14.textContent = safeEmail;
  if (menuUserEmailPage15) menuUserEmailPage15.textContent = safeEmail;
}

function isClientProfilePhotoEditAllowed() {
  const client = getActiveClientAccount();
  const provider = getActiveProviderAccount();
  return Boolean(client && client.email && !provider);
}

function syncProfilePhotoEditAccess() {
  if (!profilePhotoChangeBtn) return;
  const allowed = isClientProfilePhotoEditAllowed();
  profilePhotoChangeBtn.disabled = !allowed;
  profilePhotoChangeBtn.setAttribute("aria-disabled", String(!allowed));
  profilePhotoChangeBtn.title = allowed
    ? "Modifier photo"
    : "Disponible uniquement avec un compte client connecte";
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Lecture du fichier image impossible."));
    reader.readAsDataURL(file);
  });
}

function resolveAccountPhotoSrc(rawPhoto) {
  const photo = String(rawPhoto || "").trim().replace(/\\/g, "/");
  const normalizedPhoto = photo.toLowerCase();
  if (LEGACY_SEED_PROFILE_PHOTOS.has(normalizedPhoto)) {
    return DEFAULT_USER_AVATAR_URL;
  }
  if (!photo) {
    return DEFAULT_USER_AVATAR_URL;
  }

  if (/^(https?:|data:|blob:|file:)/i.test(photo)) {
    try {
      const parsed = new URL(
        photo,
        window.location && window.location.href ? window.location.href : "https://localhost"
      );
      const pathname = String(parsed.pathname || "").trim();
      const search = String(parsed.search || "").trim();
      const isUploadPath = /^\/uploads\//i.test(pathname);
      const isFrontendHost =
        window.location && window.location.host
          ? String(parsed.host || "").toLowerCase() === String(window.location.host || "").toLowerCase()
          : false;

      // Legacy/stale URLs pointing to frontend host cannot serve backend uploads.
      if (isUploadPath && isFrontendHost) {
        const apiBase =
          getStoredApiBase() ||
          getApiCandidates().find((candidate) => /^https?:\/\//i.test(String(candidate || ""))) ||
          "http://localhost:5000";
        return `${apiBase}${pathname}${search}`;
      }

      // Keep backend upload URLs as-is to avoid forcing HTTPS on a local HTTP API.
      if (isUploadPath) {
        return photo;
      }
    } catch (error) {
      // Ignore URL parsing issues and continue with fallback logic.
    }

    if (
      /^http:\/\//i.test(photo) &&
      window.location &&
      window.location.protocol === "https:" &&
      /localhost|127\.0\.0\.1/i.test(photo)
    ) {
      return photo.replace(/^http:/i, "https:");
    }
    return photo;
  }

  const normalizedPath = photo.startsWith("/") ? photo : `/${photo}`;
  const looksLikeUploadPath = /^\/?(uploads)\//i.test(photo);
  if (looksLikeUploadPath) {
    const apiBase =
      getStoredApiBase() ||
      getApiCandidates().find((candidate) => /^https?:\/\//i.test(String(candidate || ""))) ||
      "http://localhost:5000";
    return `${apiBase}${normalizedPath}`;
  }

  if (photo.startsWith("/")) {
    if (window.location && window.location.protocol !== "file:" && window.location.host) {
      return `${window.location.protocol}//${window.location.host}${normalizedPath}`;
    }

    const apiBase = getStoredApiBase() || getApiCandidates()[0] || "http://localhost:5000";
    return `${apiBase}${normalizedPath}`;
  }

  return photo;
}

function applyUserAvatar(rawPhoto) {
  const src = resolveAccountPhotoSrc(rawPhoto);
  const avatars = [
    profilePhotoMain,
    menuAvatarSmallPage8,
    menuAvatarMainPage8,
    menuAvatarSmallPage14,
    menuAvatarMainPage14,
    menuAvatarSmallPage15,
    menuAvatarMainPage15
  ];

  avatars.forEach((img) => {
    if (img) {
      img.onerror = () => {
        img.onerror = null;
        img.src = DEFAULT_USER_AVATAR_URL;
      };
      img.src = src;
    }
  });
}

function getProviderAccounts() {
  try {
    const raw = localStorage.getItem(PROVIDER_ACCOUNT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveProviderAccounts(accounts) {
  try {
    localStorage.setItem(PROVIDER_ACCOUNT_STORAGE_KEY, JSON.stringify(accounts));
  } catch (error) {
    return;
  }
}

function sanitizeLegacyProfilePhotosInLocalStorage() {
  const normalizeEntryPhoto = (entry) => {
    if (!entry || typeof entry !== "object") {
      return entry;
    }

    const nextPhoto = normalizeProfilePhotoValue(entry.photoProfil || entry.photo || entry.avatarUrl || "");
    return {
      ...entry,
      photoProfil: nextPhoto
    };
  };

  const clients = getClientAccounts().map((entry) => normalizeEntryPhoto(entry));
  saveClientAccounts(clients);

  const providers = getProviderAccounts().map((entry) => normalizeEntryPhoto(entry));
  saveProviderAccounts(providers);

  const activeClient = getActiveClientAccount();
  if (activeClient && activeClient.email) {
    setActiveClientAccount(activeClient, { persistRole: false, clearOtherRole: false });
  }

  const activeProvider = getActiveProviderAccount();
  if (activeProvider && activeProvider.email) {
    setActiveProviderAccount(activeProvider, { persistRole: false, clearOtherRole: false });
  }

  const nextRequests = getAllClientOngoingRequests().map((entry) => {
    if (!entry || typeof entry !== "object") {
      return entry;
    }
    const providerImage = String(entry.providerImage || "").trim();
    if (LEGACY_SEED_PROFILE_PHOTOS.has(providerImage.toLowerCase())) {
      return {
        ...entry,
        providerImage: DEFAULT_PROVIDER_CARD_IMAGE
      };
    }
    return entry;
  });
  saveAllClientOngoingRequests(nextRequests);
}

function enforceExclusiveActiveSession() {
  const activeClient = getActiveClientAccount();
  const activeProvider = getActiveProviderAccount();

  if (activeClient && !activeProvider) {
    setActiveProfileRole("client");
    return;
  }
  if (activeProvider && !activeClient) {
    setActiveProfileRole("prestataire");
    return;
  }
  if (!activeClient || !activeProvider) {
    return;
  }

  const explicitRole = getActiveProfileRole();
  let roleToKeep = explicitRole === "client" || explicitRole === "prestataire" ? explicitRole : "";
  if (!roleToKeep) {
    const clientStamp =
      Date.parse(String(activeClient.updatedAt || activeClient.createdAt || activeClient.lastLoginAt || "")) || 0;
    const providerStamp =
      Date.parse(String(activeProvider.updatedAt || activeProvider.createdAt || activeProvider.lastLoginAt || "")) || 0;
    roleToKeep = providerStamp > clientStamp ? "prestataire" : "client";
  }

  try {
    if (roleToKeep === "client") {
      localStorage.removeItem(ACTIVE_PROVIDER_ACCOUNT_STORAGE_KEY);
    } else {
      localStorage.removeItem(ACTIVE_CLIENT_ACCOUNT_STORAGE_KEY);
    }
  } catch (error) {
    // noop
  }

  setActiveProfileRole(roleToKeep);
}

function upsertProviderAccount(account) {
  if (!account || !account.email) {
    return;
  }

  const email = String(account.email).trim().toLowerCase();
  if (!email) {
    return;
  }

  const accounts = getProviderAccounts();
  const hasPassword = Object.prototype.hasOwnProperty.call(account, "password");
  const next = {
    email,
    nom: String(account.nom || "").trim(),
    prenom: String(account.prenom || "").trim(),
    telephone: String(account.telephone || "").trim(),
    categorie: String(account.categorie || account.domaine || "").trim(),
    domaine: String(account.domaine || account.categorie || "").trim(),
    experience: String(account.experience || "").trim(),
    photoProfil: normalizeProfilePhotoValue(account.photoProfil || account.photo || account.avatarUrl || ""),
    statutVerification: String(account.statutVerification || "en_attente").trim().toLowerCase(),
    fingerprintCaptured:
      typeof account.fingerprintCaptured === "boolean"
        ? account.fingerprintCaptured
        : Boolean(account.fingerprintCaptureMode),
    fingerprintCaptureMode: String(account.fingerprintCaptureMode || "").trim().toLowerCase(),
    updatedAt: new Date().toISOString()
  };
  const coverageLatitude = Number(account.coverageLatitude);
  const coverageLongitude = Number(account.coverageLongitude);
  const coverageAccuracy = Number(account.coverageAccuracy);
  const hasCoverageCoordinates = Number.isFinite(coverageLatitude) && Number.isFinite(coverageLongitude);
  if (hasCoverageCoordinates) {
    next.coverageGeoEnabled = true;
    next.coverageLatitude = coverageLatitude;
    next.coverageLongitude = coverageLongitude;
    next.coverageAccuracy = Number.isFinite(coverageAccuracy) ? coverageAccuracy : null;
    next.coverageLocationLabel = String(account.coverageLocationLabel || "gps_device").trim() || "gps_device";
    next.coverageCapturedAt = String(account.coverageCapturedAt || "").trim() || new Date().toISOString();
    const serviceRadiusKm = Number(account.serviceRadiusKm);
    next.serviceRadiusKm = Number.isFinite(serviceRadiusKm) && serviceRadiusKm > 0 ? serviceRadiusKm : 5;
  } else {
    if (typeof account.coverageGeoEnabled === "boolean") {
      next.coverageGeoEnabled = account.coverageGeoEnabled;
    }
    if (Number.isFinite(coverageAccuracy)) {
      next.coverageAccuracy = coverageAccuracy;
    }
    if (Number.isFinite(Number(account.serviceRadiusKm)) && Number(account.serviceRadiusKm) > 0) {
      next.serviceRadiusKm = Number(account.serviceRadiusKm);
    }
    if (account.coverageLocationLabel != null) {
      next.coverageLocationLabel = String(account.coverageLocationLabel || "").trim();
    }
    if (account.coverageCapturedAt != null) {
      next.coverageCapturedAt = String(account.coverageCapturedAt || "").trim();
    }
  }
  if (hasPassword) {
    next.password = String(account.password || "");
  }
  const index = accounts.findIndex((item) => String(item.email || "").toLowerCase() === email);

  if (index >= 0) {
    accounts[index] = { ...accounts[index], ...next };
  } else {
    accounts.push(next);
  }

  saveProviderAccounts(accounts);
}

function findProviderAccountByEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  return getProviderAccounts().find((item) => String(item.email || "").toLowerCase() === normalizedEmail) || null;
}

function setActiveProviderAccount(account, options = {}) {
  if (!account || !account.email) {
    return;
  }

  const shouldClearOtherRole = options && options.clearOtherRole === false ? false : true;
  if (shouldClearOtherRole) {
    try {
      localStorage.removeItem(ACTIVE_CLIENT_ACCOUNT_STORAGE_KEY);
    } catch (error) {
      // noop
    }
  }

  try {
    localStorage.setItem(
      ACTIVE_PROVIDER_ACCOUNT_STORAGE_KEY,
      JSON.stringify({
        ...account,
        photoProfil: normalizeProfilePhotoValue(account.photoProfil || account.photo || account.avatarUrl || "")
      })
    );
  } catch (error) {
    return;
  }

  if (options.persistRole !== false) {
    setActiveProfileRole("prestataire");
  }
}

function getActiveProviderAccount() {
  try {
    const raw = localStorage.getItem(ACTIVE_PROVIDER_ACCOUNT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return {
      ...parsed,
      photoProfil: normalizeProfilePhotoValue(parsed.photoProfil || parsed.photo || parsed.avatarUrl || "")
    };
  } catch (error) {
    return null;
  }
}

function hasValidatedProviderSession() {
  const account = getActiveProviderAccount();
  if (!account) {
    return false;
  }

  return String(account.statutVerification || "").toLowerCase() === "valide";
}

function applyActiveProviderProfile() {
  const account = getActiveProviderAccount();
  if (!account) {
    return false;
  }

  const displayName = String(account.nom || "").trim() || String(account.prenom || "").trim();
  if (profileNameInput && displayName) {
    profileNameInput.value = displayName;
  }

  if (profileEmailInput && account.email) {
    profileEmailInput.value = account.email;
  }

  if (profilePhoneInput && account.telephone) {
    profilePhoneInput.value = account.telephone;
  }

  applyMenuUserName(displayName);
  applyMenuUserEmail(account.email || "");
  applyUserAvatar(account.photoProfil || account.photo || account.avatarUrl || "");

  return true;
}

function applyActiveUserProfile() {
  if (!applyActiveProviderProfile()) {
    applyActiveClientProfile();
    const client = getActiveClientAccount();
    const fullName = client ? `${client.prenom || ""} ${client.nom || ""}`.trim() : "";
    applyMenuUserName(fullName);
    applyMenuUserEmail(client ? client.email || "" : "");
    applyUserAvatar(client ? client.photoProfil || client.photo || client.avatarUrl || "" : "");
  }

  syncProfilePhotoEditAccess();
  syncPage8ChatFabState();
  renderPage10OngoingRequests();
  renderPage23CancelledRequests();
  renderClientNotifications();
}

if (profilePhotoChangeBtn && profilePhotoUploadInput) {
  profilePhotoChangeBtn.addEventListener("click", () => {
    if (!isClientProfilePhotoEditAllowed()) {
      alert("Vous pouvez changer la photo uniquement avec un compte client connecte.");
      return;
    }

    profilePhotoUploadInput.click();
  });

  profilePhotoUploadInput.addEventListener("change", async () => {
    const selectedFile =
      profilePhotoUploadInput.files && profilePhotoUploadInput.files.length
        ? profilePhotoUploadInput.files[0]
        : null;
    if (!selectedFile) {
      return;
    }

    if (!isClientProfilePhotoEditAllowed()) {
      profilePhotoUploadInput.value = "";
      alert("Action reservee aux comptes clients connectes.");
      return;
    }

    if (!String(selectedFile.type || "").toLowerCase().startsWith("image/")) {
      profilePhotoUploadInput.value = "";
      alert("Veuillez choisir une image valide.");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(selectedFile);
      const client = getActiveClientAccount();
      if (!client || !client.email) {
        throw new Error("Aucun compte client actif.");
      }

      const nextClient = {
        ...client,
        photoProfil: dataUrl
      };
      setActiveClientAccount(nextClient);
      upsertClientAccount(nextClient);
      applyActiveUserProfile();
    } catch (error) {
      alert((error && error.message) || "Impossible de mettre à jour la photo.");
    } finally {
      profilePhotoUploadInput.value = "";
    }
  });
}

function activateProfileSession(profileType, email, statusPayload = null) {
  const normalizedType = String(profileType || "").trim().toLowerCase();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedType || !normalizedEmail) {
    return;
  }

  if (normalizedType === "client") {
    const existing = findClientAccountByEmail(normalizedEmail) || {};
    const nextClient = {
      ...existing,
      email: normalizedEmail,
      nom: String((statusPayload && statusPayload.nom) || existing.nom || "").trim(),
      prenom: String((statusPayload && statusPayload.prenom) || existing.prenom || "").trim(),
      telephone: String((statusPayload && statusPayload.telephone) || existing.telephone || "").trim(),
      dateDeNaissance: String((statusPayload && statusPayload.dateDeNaissance) || existing.dateDeNaissance || "").trim(),
      age: Number.isFinite(Number((statusPayload && statusPayload.age) || existing.age))
        ? Number((statusPayload && statusPayload.age) || existing.age)
        : null,
      cinImage: String((statusPayload && statusPayload.cinImage) || existing.cinImage || "").trim(),
      photoProfil: String((statusPayload && statusPayload.photoProfil) || existing.photoProfil || "").trim(),
      statutVerification: String(
        (statusPayload && statusPayload.statutVerification) || existing.statutVerification || "en_attente"
      ).toLowerCase()
    };
    upsertClientAccount(nextClient);
    try {
      localStorage.removeItem(ACTIVE_PROVIDER_ACCOUNT_STORAGE_KEY);
    } catch (error) {
      // noop
    }
    setActiveClientAccount(nextClient);
    applyActiveUserProfile();
    return;
  }

  if (normalizedType === "prestataire") {
    const existing = findProviderAccountByEmail(normalizedEmail) || {};
    const nextProvider = {
      ...existing,
      email: normalizedEmail,
      nom: String((statusPayload && statusPayload.nom) || existing.nom || "").trim(),
      prenom: String((statusPayload && statusPayload.prenom) || existing.prenom || "").trim(),
      telephone: String((statusPayload && statusPayload.telephone) || existing.telephone || "").trim(),
      categorie: String(
        (statusPayload && (statusPayload.categorie || statusPayload.domaine)) ||
          existing.categorie ||
          existing.domaine ||
          ""
      ).trim(),
      domaine: String(
        (statusPayload && (statusPayload.domaine || statusPayload.categorie)) ||
          existing.domaine ||
          existing.categorie ||
          ""
      ).trim(),
      experience: String((statusPayload && statusPayload.experience) || existing.experience || "").trim(),
      photoProfil: String((statusPayload && statusPayload.photoProfil) || existing.photoProfil || "").trim(),
      statutVerification: String(
        (statusPayload && statusPayload.statutVerification) || existing.statutVerification || "en_attente"
      ).toLowerCase(),
      fingerprintCaptured:
        statusPayload && typeof statusPayload.fingerprintCaptured === "boolean"
          ? statusPayload.fingerprintCaptured
          : Boolean(existing.fingerprintCaptured),
      fingerprintCaptureMode: String(
        (statusPayload && statusPayload.fingerprintCaptureMode) || existing.fingerprintCaptureMode || ""
      )
        .trim()
        .toLowerCase()
    };

    upsertProviderAccount(nextProvider);
    try {
      localStorage.removeItem(ACTIVE_CLIENT_ACCOUNT_STORAGE_KEY);
    } catch (error) {
      // noop
    }
    setActiveProviderAccount(nextProvider);
    if (canDisplayProviderInDirectory(nextProvider)) {
      upsertVerifiedProviderDirectory(nextProvider);
    } else {
      removeVerifiedProviderFromDirectoryByEmail(nextProvider.email || "");
    }
    renderDynamicProviderDirectory();
    applyActiveUserProfile();
  }
}

function normalizeProviderCategory(value) {
  const text = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!text) {
    return "";
  }

  if (text.includes("plomb")) {
    return "plombier";
  }

  if (text.includes("elect")) {
    return "electricien";
  }

  if (text.includes("mecan")) {
    return "mecanicien";
  }

  if (text.includes("serrur")) {
    return "serrurier";
  }

  if (text.includes("menuis")) {
    return "menuisier";
  }

  return text.replace(/\s+/g, "_");
}

function getProviderDirectoryKey(provider) {
  if (!provider) {
    return "";
  }

  const email = String(provider.email || "").trim().toLowerCase();
  if (email) {
    return `email:${email}`;
  }

  const name = String(provider.name || "").trim().toLowerCase();
  const domain = normalizeProviderCategory(provider.domain || "");
  const description = String(provider.description || "").trim().toLowerCase();
  if (!name) {
    return "";
  }

  return `fallback:${name}|${domain}|${description}`;
}

function getProviderSignature(provider) {
  const name = String(provider && provider.name ? provider.name : "")
    .trim()
    .toLowerCase();
  const domain = normalizeProviderCategory(provider && provider.domain ? provider.domain : "");
  const image = String(provider && provider.image ? provider.image : "")
    .trim()
    .toLowerCase();

  if (!name) {
    return "";
  }

  return `${name}|${domain}|${image}`;
}

function getProviderCategoryPluralLabel(categoryKey) {
  switch (normalizeProviderCategory(categoryKey)) {
    case "electricien":
      return "electriciens";
    case "plombier":
      return "plombiers";
    case "mecanicien":
      return "mecaniciens";
    case "serrurier":
      return "serruriers";
    case "menuisier":
      return "menuisiers";
    default: {
      const raw = String(categoryKey || "")
        .trim()
        .replace(/_/g, " ")
        .toLowerCase();
      return raw || "prestataires";
    }
  }
}

function formatProviderDisplayName(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  if (raw.includes("@")) {
    return raw;
  }

  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(" ");
}

function formatProviderFirstName(value) {
  const normalized = formatProviderDisplayName(value);
  if (!normalized) {
    return "";
  }

  const raw = String(normalized || "").trim();
  if (!raw) {
    return "";
  }

  if (raw.includes("@")) {
    const localPart = raw.split("@")[0] || "";
    const firstChunk = localPart
      .split(/[._-]+/)
      .map((chunk) => String(chunk || "").trim())
      .filter(Boolean)[0];
    const candidate = firstChunk || localPart;
    return formatProviderDisplayName(candidate) || candidate;
  }

  const firstName = raw
    .split(/\s+/)
    .map((chunk) => String(chunk || "").trim())
    .filter(Boolean)[0];

  return firstName || raw;
}

function normalizeProviderIdentityEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeProviderIdentityName(value) {
  return formatProviderDisplayName(value)
    .trim()
    .toLowerCase();
}

function getProviderRatingStatsFromCompletedRequests(providerLike) {
  const providerEmail = normalizeProviderIdentityEmail(providerLike && providerLike.email);
  const providerName = normalizeProviderIdentityName(providerLike && providerLike.name);
  const providerDomain = normalizeProviderCategory(
    (providerLike && (providerLike.domain || providerLike.providerDomain)) || ""
  );

  let ratingSum = 0;
  let ratingCount = 0;
  getAllClientOngoingRequests().forEach((entry) => {
    const status = String((entry && entry.status) || "")
      .trim()
      .toLowerCase();
    if (status !== "termine") {
      return;
    }

    const rawRating = Number(entry && entry.completionRating);
    if (!Number.isFinite(rawRating) || rawRating < 1 || rawRating > 5) {
      return;
    }

    const entryEmail = normalizeProviderIdentityEmail(entry && entry.providerEmail);
    const entryName = normalizeProviderIdentityName(entry && entry.providerName);
    const entryDomain = normalizeProviderCategory((entry && entry.providerDomain) || "");

    let isMatch = false;
    if (providerEmail && entryEmail) {
      isMatch = providerEmail === entryEmail;
    } else if (providerName && entryName && providerName === entryName) {
      if (providerDomain && entryDomain) {
        isMatch = providerDomain === entryDomain;
      } else {
        isMatch = true;
      }
    }

    if (!isMatch) {
      return;
    }

    ratingSum += rawRating;
    ratingCount += 1;
  });

  if (!ratingCount) {
    return {
      average: null,
      count: 0
    };
  }

  return {
    average: ratingSum / ratingCount,
    count: ratingCount
  };
}

function getProviderAverageRatingLabel(providerLike) {
  const stats = getProviderRatingStatsFromCompletedRequests(providerLike);
  if (stats.count > 0 && Number.isFinite(Number(stats.average))) {
    return Number(stats.average).toFixed(1);
  }

  return "N.N";
}

function resolveProviderEmailForRequest(requestEntry) {
  const directEmail = normalizeProviderIdentityEmail(requestEntry && requestEntry.providerEmail);
  if (directEmail) {
    return directEmail;
  }

  const requestName = normalizeProviderIdentityName(requestEntry && requestEntry.providerName);
  const requestFirstName = normalizeProviderIdentityName(
    formatProviderFirstName(requestEntry && requestEntry.providerName)
  );
  if (!requestName && !requestFirstName) {
    return "";
  }
  const requestDomain = normalizeProviderCategory((requestEntry && requestEntry.providerDomain) || "");
  const matchedAccount = getProviderAccounts().find((account) => {
    const accountEmail = normalizeProviderIdentityEmail(account && account.email);
    if (!accountEmail) {
      return false;
    }

    const accountName = normalizeProviderIdentityName(
      `${(account && account.prenom) || ""} ${(account && account.nom) || ""}`.trim() ||
      String((account && account.name) || "").trim()
    );
    const accountFirstName = normalizeProviderIdentityName(formatProviderFirstName(accountName));
    const hasExactNameMatch = Boolean(requestName && accountName && accountName === requestName);
    const hasFirstNameMatch = Boolean(
      requestFirstName &&
      accountFirstName &&
      accountFirstName === requestFirstName
    );
    if (!hasExactNameMatch && !hasFirstNameMatch) {
      return false;
    }

    if (!requestDomain) {
      return true;
    }

    const accountDomain = normalizeProviderCategory((account && (account.domaine || account.categorie)) || "");
    return !accountDomain || accountDomain === requestDomain;
  });

  return matchedAccount ? normalizeProviderIdentityEmail(matchedAccount.email) : "";
}

function parseOptionalNumberValue(value) {
  const normalized = String(value == null ? "" : value).trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeProviderServiceRadiusKm(value, fallbackValue = 5) {
  const parsed = parseOptionalNumberValue(value);
  if (!Number.isFinite(parsed) || Number(parsed) <= 0) {
    return Number(fallbackValue) > 0 ? Number(fallbackValue) : 5;
  }

  return Number(parsed);
}

function resolveProviderDirectoryImage(providerAccount = {}) {
  const normalizedEmail = String((providerAccount && providerAccount.email) || "").trim().toLowerCase();
  const localProviderAccount = normalizedEmail ? findProviderAccountByEmail(normalizedEmail) : null;
  const localPhoto = normalizeProfilePhotoValue(
    localProviderAccount &&
      (localProviderAccount.photoProfil || localProviderAccount.photo || localProviderAccount.avatarUrl || "")
  );
  const sourcePhoto = normalizeProfilePhotoValue(
    localPhoto ||
      providerAccount.photoProfil ||
      providerAccount.photo ||
      providerAccount.avatarUrl ||
      providerAccount.image ||
      ""
  );

  return sourcePhoto ? resolveAccountPhotoSrc(sourcePhoto) : DEFAULT_PROVIDER_CARD_IMAGE;
}

function buildVerifiedProviderDirectoryItem(providerAccount = {}) {
  const email = String(providerAccount.email || "").trim().toLowerCase();
  const normalizedCategory = normalizeProviderCategory(
    providerAccount.categorie || providerAccount.domaine || providerAccount.domain
  );
  const providerCoordinates =
    providerAccount.location && Array.isArray(providerAccount.location.coordinates)
      ? providerAccount.location.coordinates
      : null;
  const geoLongitude =
    providerCoordinates && providerCoordinates.length >= 2 ? parseOptionalNumberValue(providerCoordinates[0]) : null;
  const geoLatitude =
    providerCoordinates && providerCoordinates.length >= 2 ? parseOptionalNumberValue(providerCoordinates[1]) : null;
  const coverageLatitude = parseOptionalNumberValue(
    providerAccount.coverageLatitude != null
      ? providerAccount.coverageLatitude
      : providerAccount.latitude != null
        ? providerAccount.latitude
        : geoLatitude
  );
  const coverageLongitude = parseOptionalNumberValue(
    providerAccount.coverageLongitude != null
      ? providerAccount.coverageLongitude
      : providerAccount.longitude != null
        ? providerAccount.longitude
        : geoLongitude
  );
  const coverageAccuracy = parseOptionalNumberValue(
    providerAccount.coverageAccuracy != null
      ? providerAccount.coverageAccuracy
      : providerAccount.locationAccuracy != null
        ? providerAccount.locationAccuracy
        : providerAccount.accuracy
  );
  const hasCoverageCoordinates =
    Number.isFinite(Number(coverageLatitude)) && Number.isFinite(Number(coverageLongitude));
  const serviceRadiusKm = normalizeProviderServiceRadiusKm(
    providerAccount.serviceRadiusKm != null ? providerAccount.serviceRadiusKm : providerAccount.coverageRadiusKm,
    5
  );
  const normalizedFingerprintMode = String(providerAccount.fingerprintCaptureMode || "").trim().toLowerCase();
  let fingerprintCaptured = null;
  if (typeof providerAccount.fingerprintCaptured === "boolean") {
    fingerprintCaptured = providerAccount.fingerprintCaptured;
  } else if (normalizedFingerprintMode) {
    fingerprintCaptured = true;
  }
  const fullName = formatProviderDisplayName(
    `${providerAccount.prenom || ""} ${providerAccount.nom || ""}`.trim() ||
    String(providerAccount.name || "").trim() ||
    email ||
    "Prestataire"
  );
  const rawPhoto = normalizeProfilePhotoValue(
    providerAccount.photoProfil ||
      providerAccount.photo ||
      providerAccount.avatarUrl ||
      providerAccount.image ||
      ""
  );

  return {
    email,
    name: fullName,
    rating: String(providerAccount.rating || "4.7").trim() || "4.7",
    price: String(providerAccount.price || "200DH").trim() || "200DH",
    domain: normalizedCategory || "",
    statutVerification: String(providerAccount.statutVerification || "").trim().toLowerCase(),
    fingerprintCaptured,
    coverageLatitude: hasCoverageCoordinates ? Number(coverageLatitude) : null,
    coverageLongitude: hasCoverageCoordinates ? Number(coverageLongitude) : null,
    coverageAccuracy: Number.isFinite(Number(coverageAccuracy)) ? Number(coverageAccuracy) : null,
    coverageLocationLabel: String(
      providerAccount.coverageLocationLabel || providerAccount.locationLabel || ""
    ).trim(),
    serviceRadiusKm,
    description: String(
      providerAccount.experience || providerAccount.description || "Prestataire verifie sur la plateforme."
    ).trim(),
    photoProfil: rawPhoto,
    image: resolveProviderDirectoryImage({ ...providerAccount, email, photoProfil: rawPhoto })
  };
}

function removeVerifiedProviderFromDirectoryByEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return;
  }

  const nextItems = getVerifiedProviderDirectory().filter(
    (entry) => String((entry && entry.email) || "").trim().toLowerCase() !== normalizedEmail
  );
  saveVerifiedProviderDirectory(dedupeVerifiedProviderDirectory(nextItems));
}

function canDisplayProviderInDirectory(providerData) {
  if (!providerData) {
    return false;
  }

  const email = String((providerData && providerData.email) || "").trim().toLowerCase();
  const localAccount = email ? findProviderAccountByEmail(email) : null;
  const source = localAccount || providerData;
  const statusCandidate = String(
    (source && source.statutVerification) || (providerData && providerData.statutVerification) || ""
  )
    .trim()
    .toLowerCase();
  const hasStatusInfo = Boolean(statusCandidate);
  const isApproved = hasStatusInfo ? statusCandidate === "valide" : true;
  if (!isApproved) {
    return false;
  }

  if (typeof (source && source.fingerprintCaptured) === "boolean") {
    return Boolean(source.fingerprintCaptured);
  }
  if (typeof (providerData && providerData.fingerprintCaptured) === "boolean") {
    return Boolean(providerData.fingerprintCaptured);
  }

  return !localAccount;
}

function getVerifiedProviderDirectory() {
  try {
    const raw = localStorage.getItem(VERIFIED_PROVIDER_DIRECTORY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveVerifiedProviderDirectory(items) {
  try {
    localStorage.setItem(VERIFIED_PROVIDER_DIRECTORY_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    return;
  }
}

function dedupeVerifiedProviderDirectory(items) {
  const list = Array.isArray(items) ? items : [];
  const byEmail = new Map();
  const emailBySignature = new Map();
  const noEmailBySignature = new Map();

  list.forEach((entry) => {
    const normalized = buildVerifiedProviderDirectoryItem(entry);
    const email = String(normalized.email || "").trim().toLowerCase();
    const signature = getProviderSignature(normalized);

    if (email) {
      const previous = byEmail.get(email) || {};
      const merged = { ...previous, ...normalized };
      byEmail.set(email, merged);

      if (signature) {
        emailBySignature.set(signature, email);
      }
      return;
    }

    if (!signature) {
      return;
    }

    if (!emailBySignature.has(signature) && !noEmailBySignature.has(signature)) {
      noEmailBySignature.set(signature, normalized);
    }
  });

  return [...byEmail.values(), ...noEmailBySignature.values()];
}

function mergeVerifiedProviderDirectory(items) {
  const currentItems = getVerifiedProviderDirectory();
  const merged = [...currentItems, ...(Array.isArray(items) ? items : [])];
  saveVerifiedProviderDirectory(dedupeVerifiedProviderDirectory(merged));
}

async function fetchVerifiedProvidersFromBackend() {
  let lastNetworkError = null;

  for (const apiBase of getApiCandidates()) {
    try {
      const response = await fetchWithTimeout(`${apiBase}/prestataires?ts=${Date.now()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
        cache: "no-store"
      });
      const payload = await response.json().catch(() => ({}));
      const message = String((payload && payload.message) || "").toLowerCase();

      if (!response.ok) {
        if (response.status === 404 && message.includes("route not found")) {
          continue;
        }

        throw new Error(payload.message || "Liste des prestataires indisponible.");
      }

      saveApiBase(apiBase);
      const providers = Array.isArray(payload.prestataires) ? payload.prestataires : [];

      return providers.map((provider) =>
        buildVerifiedProviderDirectoryItem({
          email: provider.email || "",
          nom: provider.nom || "",
          prenom: provider.prenom || "",
          categorie: provider.categorie || provider.domaine || "",
          domaine: provider.domaine || provider.categorie || "",
          experience: provider.experience || "",
          photoProfil: provider.photoProfil || "",
          statutVerification: provider.statutVerification || "",
          fingerprintCaptured:
            typeof provider.fingerprintCaptured === "boolean"
              ? provider.fingerprintCaptured
              : undefined,
          coverageLatitude:
            provider.coverageLatitude != null
              ? provider.coverageLatitude
              : provider.latitude != null
                ? provider.latitude
                : provider.location &&
                    Array.isArray(provider.location.coordinates) &&
                    provider.location.coordinates.length >= 2
                  ? provider.location.coordinates[1]
                  : null,
          coverageLongitude:
            provider.coverageLongitude != null
              ? provider.coverageLongitude
              : provider.longitude != null
                ? provider.longitude
                : provider.location &&
                    Array.isArray(provider.location.coordinates) &&
                    provider.location.coordinates.length >= 2
                  ? provider.location.coordinates[0]
                : null,
          coverageAccuracy:
            provider.coverageAccuracy != null
              ? provider.coverageAccuracy
              : provider.locationAccuracy != null
                ? provider.locationAccuracy
                : provider.accuracy != null
                  ? provider.accuracy
                  : null,
          coverageLocationLabel: provider.coverageLocationLabel || provider.locationLabel || "",
          location: provider.location || null,
          serviceRadiusKm:
            provider.serviceRadiusKm != null
              ? provider.serviceRadiusKm
              : provider.coverageRadiusKm != null
                ? provider.coverageRadiusKm
                : 5
        })
      );
    } catch (error) {
      if (isNetworkError(error)) {
        lastNetworkError = error;
        continue;
      }

      throw error;
    }
  }

  if (lastNetworkError) {
    throw lastNetworkError;
  }

  return [];
}

let isSyncingVerifiedProviderDirectory = false;

async function syncVerifiedProviderDirectoryFromBackend() {
  if (isSyncingVerifiedProviderDirectory) {
    return;
  }

  isSyncingVerifiedProviderDirectory = true;
  try {
    const remoteItems = await fetchVerifiedProvidersFromBackend();
    saveVerifiedProviderDirectory(dedupeVerifiedProviderDirectory(remoteItems));
  } catch (error) {
    return;
  } finally {
    isSyncingVerifiedProviderDirectory = false;
    renderDynamicProviderDirectory();
  }
}

function syncVerifiedProviderDirectoryIfVisible(force = false) {
  const activePage = getActivePageClass();
  if (!force && !isProviderDirectoryPage(activePage)) {
    return;
  }
  syncVerifiedProviderDirectoryFromBackend().catch(() => {
    return;
  });
}

function ensureProviderDirectoryPolling() {
  if (providerDirectoryPollTimer) {
    return;
  }

  providerDirectoryPollTimer = window.setInterval(() => {
    if (document.hidden) {
      return;
    }
    syncVerifiedProviderDirectoryIfVisible(false);
  }, PROVIDER_DIRECTORY_SYNC_INTERVAL_MS);
}

function upsertVerifiedProviderDirectory(providerAccount) {
  if (!providerAccount) {
    return;
  }

  const normalizedEmail = String((providerAccount && providerAccount.email) || "").trim().toLowerCase();
  if (!canDisplayProviderInDirectory(providerAccount)) {
    if (normalizedEmail) {
      removeVerifiedProviderFromDirectoryByEmail(normalizedEmail);
    }
    return;
  }

  mergeVerifiedProviderDirectory([buildVerifiedProviderDirectoryItem(providerAccount)]);
}

function renderDynamicProviderDirectory() {
  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const allowedCategories = new Set(["electricien", "plombier", "mecanicien", "serrurier", "menuisier"]);
  const allProviders = getVerifiedProviderDirectory()
    .map((entry) => buildVerifiedProviderDirectoryItem(entry))
    .filter((provider) => canDisplayProviderInDirectory(provider));
  const groupedProviders = new Map();

  allProviders.forEach((provider) => {
    const category = normalizeProviderCategory(provider.domain);
    if (!category || !allowedCategories.has(category)) {
      return;
    }

    if (!groupedProviders.has(category)) {
      groupedProviders.set(category, []);
    }

    groupedProviders.get(category).push(provider);
  });

  const buildCommonData = (provider) => {
    const safeName = escapeHtml(formatProviderFirstName(provider.name || "Prestataire") || "Prestataire");
    const safeDomain = escapeHtml(String(provider.domain || "prestataire").replace(/_/g, " "));
    const safeDescription = escapeHtml(provider.description || "Prestataire verifie sur la plateforme.");
    const safeImage = escapeHtml(resolveProviderDirectoryImage(provider));
    const safeRating = escapeHtml(getProviderAverageRatingLabel(provider));
    const safePrice = escapeHtml(provider.price || "200DH");
    const safeEmail = escapeHtml(provider.email || "");
    const safeCoverageLatitude = escapeHtml(
      Number.isFinite(Number(provider.coverageLatitude)) ? String(Number(provider.coverageLatitude)) : ""
    );
    const safeCoverageLongitude = escapeHtml(
      Number.isFinite(Number(provider.coverageLongitude)) ? String(Number(provider.coverageLongitude)) : ""
    );
    const safeCoverageAccuracy = escapeHtml(
      Number.isFinite(Number(provider.coverageAccuracy)) ? String(Number(provider.coverageAccuracy)) : ""
    );
    const safeCoverageLocationLabel = escapeHtml(String(provider.coverageLocationLabel || "").trim());
    const safeServiceRadiusKm = escapeHtml(String(normalizeProviderServiceRadiusKm(provider.serviceRadiusKm, 5)));

    return {
      safeName,
      safeDomain,
      safeDescription,
      safeImage,
      safeRating,
      safePrice,
      safeEmail,
      safeCoverageLatitude,
      safeCoverageLongitude,
      safeCoverageAccuracy,
      safeCoverageLocationLabel,
      safeServiceRadiusKm,
      commonData: `
        data-provider-name="${safeName}"
        data-provider-rating="${safeRating}"
        data-provider-price="${safePrice}"
        data-provider-domain="${safeDomain}"
        data-provider-description="${safeDescription}"
        data-provider-image="${safeImage}"
        data-provider-email="${safeEmail}"
        data-provider-coverage-latitude="${safeCoverageLatitude}"
        data-provider-coverage-longitude="${safeCoverageLongitude}"
        data-provider-coverage-accuracy="${safeCoverageAccuracy}"
        data-provider-coverage-location-label="${safeCoverageLocationLabel}"
        data-provider-service-radius-km="${safeServiceRadiusKm}"
      `
    };
  };

  const removeDirectChildren = (parent, selectors) => {
    if (!parent || !Array.isArray(selectors) || !selectors.length) {
      return;
    }

    const selector = selectors.join(", ");
    Array.from(parent.children).forEach((child) => {
      if (child && typeof child.matches === "function" && child.matches(selector)) {
        child.remove();
      }
    });
  };

  const getCurrentPage14Category = (preferredOrder) => {
    const normalized = normalizeProviderCategory(currentProviderCategoryFilter);
    if (preferredOrder.includes(normalized)) {
      return normalized;
    }

    return preferredOrder[0];
  };

  const renderPage14Directory = () => {
    const column = document.querySelector(".page14 .scroll-view .column");
    if (!column) {
      return;
    }

    removeDirectChildren(column, [
      "#open-page17-btn",
      ".page14-nabil-btn",
      ".row-view5",
      ".row-view7",
      ".text10",
      ".text12",
      ".box2"
    ]);

    const preferredOrder = ["electricien", "plombier", "mecanicien", "serrurier", "menuisier"];

    let container = column.querySelector("#dynamic-provider-directory-page14");
    if (!container) {
      container = document.createElement("div");
      container.id = "dynamic-provider-directory-page14";
      container.className = "dynamic-provider-list dynamic-provider-directory";
      container.style.marginTop = "0";
      const anchor = Array.from(column.children).find(
        (child) => child && child.classList && child.classList.contains("row-view4")
      );
      if (anchor && anchor.parentElement === column) {
        anchor.insertAdjacentElement("afterend", container);
      } else {
        column.appendChild(container);
      }
    }

    const currentCategory = getCurrentPage14Category(preferredOrder);
    setActiveProviderCategoryTrigger(currentCategory);
    const keysToRender = [currentCategory];

    const sectionsMarkup = keysToRender
      .map((categoryKey) => {
        const providers = groupedProviders.get(categoryKey) || [];
        const safeCategory = escapeHtml(categoryKey);
        const categoryTitle = escapeHtml(`Nouveaux ${getProviderCategoryPluralLabel(categoryKey)} verifies`);
        const cardsMarkup = providers.length
          ? providers
              .map((provider) => {
                const { safeName, safeImage, safeRating, safePrice, commonData, safeDescription } =
                  buildCommonData(provider);

                return `
                  <button
                    class="page14-nabil-btn open-provider-profile-btn dynamic-provider-profile-btn"
                    type="button"
                    aria-label="Ouvrir le profil de ${safeName}"
                    ${commonData}
                  >
                    <img src="${safeImage}" alt="Profil ${safeName}" class="image6">
                  </button>
                  <div class="row-view5">
                    <button
                      class="page14-nabil-name-btn text7 open-provider-profile-btn dynamic-provider-profile-btn"
                      type="button"
                      ${commonData}
                    >
                      ${safeName}
                    </button>
                    <div class="row-view6">
                      <span class="text8">${safeRating}</span>
                      <img src="https://storage.googleapis.com/tagjs-prod.appspot.com/v1/9Iw2Ao5NX1/vctk6xy5_expires_30_days.png" alt="Etoile" class="image7">
                    </div>
                    <div class="box"></div>
                    <span class="text9">${safePrice}</span>
                  </div>
                  <span class="text10">${safeDescription}</span>
                  <div class="box2"></div>
                `;
              })
              .join("")
          : `<div class="page8-verified-empty">Aucun ${escapeHtml(
              getProviderCategoryPluralLabel(categoryKey)
            )} vérifié pour le moment.</div>`;

        return `
          <section class="dynamic-provider-section" data-provider-category="${safeCategory}">
            <h3 class="dynamic-provider-section-title">${categoryTitle}</h3>
            ${cardsMarkup}
          </section>
        `;
      })
      .join("");

    container.innerHTML = sectionsMarkup;
  };

  const renderPage15Plombiers = () => {
    const column = document.querySelector(".page15 .scroll-view .column");
    if (!column) {
      return;
    }

    removeDirectChildren(column, [
      ".provider-card-image-btn",
      ".row-view5",
      ".row-view7",
      ".text11",
      ".text12",
      ".box2"
    ]);

    const plumbers = groupedProviders.get("plombier") || [];
    let container = column.querySelector("#dynamic-provider-list-plombier");
    if (!container) {
      container = document.createElement("div");
      container.id = "dynamic-provider-list-plombier";
      container.className = "dynamic-provider-list";
      container.style.marginTop = "0";
      const anchor = Array.from(column.children).find(
        (child) => child && child.classList && child.classList.contains("row-view4")
      );
      if (anchor && anchor.parentElement === column) {
        anchor.insertAdjacentElement("afterend", container);
      } else {
        column.appendChild(container);
      }
    }

    if (!plumbers.length) {
      container.innerHTML = '<div class="page8-verified-empty">Aucun plombier vérifié pour le moment.</div>';
      return;
    }

    const cardsMarkup = plumbers
      .map((provider) => {
        const { safeName, safeRating, safePrice, safeDescription, safeImage, commonData } = buildCommonData(provider);

        return `
          <div class="box2"></div>
          <button
            class="provider-card-image-btn open-provider-profile-btn dynamic-provider-profile-btn"
            type="button"
            aria-label="Ouvrir le profil de ${safeName}"
            ${commonData}
          >
            <img src="${safeImage}" alt="Profil ${safeName}" class="image7">
          </button>
          <div class="row-view7">
            <button
              class="provider-card-name-btn text8 open-provider-profile-btn dynamic-provider-profile-btn"
              type="button"
              ${commonData}
            >
              ${safeName}
            </button>
            <div class="row-view8">
              <span class="text9">${safeRating}</span>
              <img src="https://storage.googleapis.com/tagjs-prod.appspot.com/v1/9Iw2Ao5NX1/ucxomxp8_expires_30_days.png" alt="Etoile" class="image6">
            </div>
            <span class="text10">${safePrice}</span>
          </div>
          <span class="text12">${safeDescription}</span>
        `;
      })
      .join("");

    container.innerHTML = cardsMarkup;
  };

  const renderPage8VerifiedProviders = () => {
    const column = document.querySelector(".page8 .scroll-view .column");
    if (!column) {
      return;
    }

    let container = column.querySelector("#page8-verified-providers");
    if (!container) {
      container = document.createElement("div");
      container.id = "page8-verified-providers";
      container.className = "page8-verified-list dynamic-provider-list";
      const title = column.querySelector(".text6");
      if (title && title.parentElement === column) {
        title.insertAdjacentElement("afterend", container);
      } else {
        column.appendChild(container);
      }
    }

    const normalizedFilter = normalizeProviderCategory(currentProviderCategoryFilter);
    const providersToRender = normalizedFilter
      ? allProviders.filter((provider) => normalizeProviderCategory(provider.domain) === normalizedFilter)
      : allProviders;

    if (!providersToRender.length) {
      if (normalizedFilter) {
        container.innerHTML = `<div class="page8-verified-empty">Aucun ${escapeHtml(
          getProviderCategoryPluralLabel(normalizedFilter)
        )} vérifié pour le moment.</div>`;
      } else {
        container.innerHTML = '<div class="page8-verified-empty">Aucun prestataire vérifié pour le moment.</div>';
      }
      return;
    }

    const cardsMarkup = providersToRender
      .map((provider) => {
        const { safeName, safeRating, safePrice, safeDescription, safeImage, commonData } = buildCommonData(provider);
        return `
          <article class="home-provider-card">
            <button
              class="home-provider-photo-btn open-provider-profile-btn dynamic-provider-profile-btn"
              type="button"
              aria-label="Ouvrir le profil de ${safeName}"
              ${commonData}
            >
              <img src="${safeImage}" alt="Profil ${safeName}" class="home-provider-photo">
            </button>
            <div class="home-provider-meta">
              <button
                class="home-provider-name open-provider-profile-btn dynamic-provider-profile-btn"
                type="button"
                ${commonData}
              >
                ${safeName}
              </button>
              <div class="home-provider-rating">
                <span class="home-provider-rating-text">${safeRating}</span>
                <img src="https://storage.googleapis.com/tagjs-prod.appspot.com/v1/9Iw2Ao5NX1/vctk6xy5_expires_30_days.png" alt="Etoile" class="home-provider-star">
              </div>
              <span class="home-provider-price">${safePrice}</span>
            </div>
            <span class="home-provider-description">${safeDescription}</span>
            <div class="home-provider-divider"></div>
          </article>
        `;
      })
      .join("");

    container.innerHTML = cardsMarkup;
  };

  renderPage14Directory();
  renderPage15Plombiers();
  renderPage8VerifiedProviders();
}

function setActiveProviderCategoryTrigger(rawCategory) {
  const normalizedCategory = normalizeProviderCategory(rawCategory);
  providerCategoryTriggers.forEach((trigger) => {
    const triggerCategory = normalizeProviderCategory(
      trigger && trigger.dataset ? trigger.dataset.categoryTarget : ""
    );
    const isActive = Boolean(normalizedCategory) && triggerCategory === normalizedCategory;
    trigger.classList.toggle("is-active", isActive);
  });
}

function setPage8CategoryIndicator(rawCategory, shouldShow = true) {
  if (!page8CategoryIndicator || !page8CategoryIndicatorDashes.length) {
    return;
  }

  const normalizedCategory = normalizeProviderCategory(rawCategory);
  const activeIndex = PAGE8_CATEGORY_INDICATOR_ORDER.indexOf(normalizedCategory);

  page8CategoryIndicatorDashes.forEach((dash, index) => {
    dash.classList.toggle("is-active", index === activeIndex);
  });

  page8CategoryIndicator.hidden = !(shouldShow && activeIndex >= 0);
}

function setHomeCategoryActive(rawCategory) {
  const normalizedCategory = normalizeProviderCategory(rawCategory);
  homeCategoryItems.forEach((item) => {
    const itemCategory = normalizeProviderCategory(item && item.dataset ? item.dataset.homeCategory : "");
    item.classList.toggle("is-active", Boolean(normalizedCategory) && itemCategory === normalizedCategory);
  });
}

function clearHomeProviderCategoryFilter() {
  currentProviderCategoryFilter = "";
  setHomeCategoryActive("");
  setPage8CategoryIndicator("", false);
  renderDynamicProviderDirectory();
}

function scrollToProviderCategorySection(rawCategory) {
  const normalizedCategory = normalizeProviderCategory(rawCategory);
  if (!normalizedCategory) {
    return false;
  }

  const column = document.querySelector(".page14 .scroll-view .column");
  if (!column) {
    return false;
  }

  const section = column.querySelector(
    `#dynamic-provider-directory-page14 [data-provider-category="${normalizedCategory}"]`
  );
  if (!section) {
    return false;
  }

  const nextTop = Math.max(0, section.offsetTop - 6);
  column.scrollTo({ top: nextTop, behavior: "smooth" });
  return true;
}

async function focusProviderCategory(rawCategory) {
  const normalizedCategory = normalizeProviderCategory(rawCategory);
  if (!normalizedCategory) {
    return;
  }

  currentProviderCategoryFilter = normalizedCategory;
  setHomeCategoryActive(normalizedCategory);
  setPage8CategoryIndicator(normalizedCategory);

  const activeScreen = document.querySelector(".screen.active");
  if (!activeScreen || !activeScreen.classList.contains("page8")) {
    previousPageClass = getPageClassFromElement(activeScreen) || previousPageClass;
    goTo("page8");
  }

  setActiveProviderCategoryTrigger(normalizedCategory);
  renderDynamicProviderDirectory();
  await syncVerifiedProviderDirectoryFromBackend();
}

function bindProviderCategoryTriggers() {
  providerCategoryTriggers.forEach((trigger) => {
    if (!trigger) {
      return;
    }

    if (trigger.id === "open-page15-from-14-btn" || trigger.id === "open-page14-from-15-btn") {
      return;
    }

    const category = trigger && trigger.dataset ? trigger.dataset.categoryTarget : "";
    if (!category) {
      return;
    }

    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      focusProviderCategory(category);
    });

    trigger.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      focusProviderCategory(category);
    });
  });
}

function resolveProviderForFingerprintAccessFromLocalState() {
  const pending = getPendingVerification();
  const pendingEmail =
    pending && String(pending.profileType || "").toLowerCase() === "prestataire"
      ? String(pending.email || "").trim().toLowerCase()
      : "";
  const activeProvider = getActiveProviderAccount();
  const activeEmail = activeProvider ? String(activeProvider.email || "").trim().toLowerCase() : "";
  const accounts = getProviderAccounts().slice().sort((a, b) => {
    const right = Date.parse(String(b.updatedAt || "")) || 0;
    const left = Date.parse(String(a.updatedAt || "")) || 0;
    return right - left;
  });

  const fallbackEmail = accounts.length ? String(accounts[0].email || "").trim().toLowerCase() : "";
  const email = pendingEmail || activeEmail || fallbackEmail;
  if (!email) {
    return null;
  }

  const account = findProviderAccountByEmail(email) || activeProvider || { email };
  const resolvedCoverage =
    resolveProviderCoverageLocationFromAccount(account) ||
    (hasProviderCoverageLocation(providerCoverageLocationData) ? providerCoverageLocationData : null);
  return {
    ...account,
    email,
    nom: String((account && account.nom) || "").trim(),
    prenom: String((account && account.prenom) || "").trim(),
    telephone: String((account && account.telephone) || "").trim(),
    categorie: String((account && (account.categorie || account.domaine)) || "").trim(),
    domaine: String((account && (account.domaine || account.categorie)) || "").trim(),
    experience: String((account && account.experience) || "").trim(),
    photoProfil: String((account && account.photoProfil) || "").trim(),
    statutVerification: String((account && account.statutVerification) || "en_attente").toLowerCase(),
    fingerprintCaptured: Boolean((account && account.fingerprintCaptured) || false),
    fingerprintCaptureMode: String((account && account.fingerprintCaptureMode) || "").trim().toLowerCase(),
    coverageGeoEnabled:
      typeof (account && account.coverageGeoEnabled) === "boolean"
        ? Boolean(account.coverageGeoEnabled)
        : hasProviderCoverageLocation(resolvedCoverage),
    coverageLatitude: hasProviderCoverageLocation(resolvedCoverage)
      ? Number(resolvedCoverage.latitude)
      : Number.isFinite(Number(account && account.coverageLatitude))
        ? Number(account.coverageLatitude)
        : null,
    coverageLongitude: hasProviderCoverageLocation(resolvedCoverage)
      ? Number(resolvedCoverage.longitude)
      : Number.isFinite(Number(account && account.coverageLongitude))
        ? Number(account.coverageLongitude)
        : null,
    coverageAccuracy: hasProviderCoverageLocation(resolvedCoverage)
      ? Number.isFinite(Number(resolvedCoverage.accuracy))
        ? Number(resolvedCoverage.accuracy)
        : null
      : Number.isFinite(Number(account && account.coverageAccuracy))
        ? Number(account.coverageAccuracy)
        : null,
    coverageLocationLabel: hasProviderCoverageLocation(resolvedCoverage)
      ? String(resolvedCoverage.locationLabel || "gps_device").trim() || "gps_device"
      : String((account && account.coverageLocationLabel) || "").trim(),
    serviceRadiusKm: Number.isFinite(Number(account && account.serviceRadiusKm))
      ? Number(account.serviceRadiusKm)
      : 5,
    coverageCapturedAt: String((account && account.coverageCapturedAt) || "").trim()
  };
}

async function resolveProviderForFingerprintAccess() {
  let account = resolveProviderForFingerprintAccessFromLocalState();
  if (!account) {
    return null;
  }
  const email = String(account.email || "").trim().toLowerCase();

  try {
    const statusPayload = await fetchVerificationStatusByType("prestataire", email, { allowNotFound: true });
    if (statusPayload) {
      account = {
        ...(account || {}),
        email,
        nom: String(statusPayload.nom || (account && account.nom) || "").trim(),
        prenom: String(statusPayload.prenom || (account && account.prenom) || "").trim(),
        telephone: String(statusPayload.telephone || (account && account.telephone) || "").trim(),
        categorie: String(statusPayload.categorie || statusPayload.domaine || (account && account.categorie) || "").trim(),
        domaine: String(statusPayload.domaine || statusPayload.categorie || (account && account.domaine) || "").trim(),
        experience: String(statusPayload.experience || (account && account.experience) || "").trim(),
        photoProfil: String(statusPayload.photoProfil || (account && account.photoProfil) || "").trim(),
        statutVerification: String(statusPayload.statutVerification || (account && account.statutVerification) || "valide").toLowerCase(),
        fingerprintCaptured:
          typeof statusPayload.fingerprintCaptured === "boolean"
            ? statusPayload.fingerprintCaptured
            : Boolean((account && account.fingerprintCaptured) || false),
        fingerprintCaptureMode: String(
          statusPayload.fingerprintCaptureMode || (account && account.fingerprintCaptureMode) || ""
        )
          .trim()
          .toLowerCase()
      };
    }
  } catch (error) {
    account = account || null;
  }

  if (!account) {
    return null;
  }

  account.email = email;
  account.updatedAt = new Date().toISOString();
  upsertProviderAccount(account);
  return account;
}

function splitClientName(fullName) {
  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return { nom: "", prenom: "" };
  }

  if (parts.length === 1) {
    return { nom: parts[0], prenom: parts[0] };
  }

  const prenom = parts[0];
  const nom = parts.slice(1).join(" ");
  return { nom, prenom };
}

function getProviderProfileFromDataset(button) {
  if (!button || !button.dataset) return null;

  const name = (button.dataset.providerName || "").trim();
  if (!name) return null;
  const domain = (button.dataset.providerDomain || "").trim();
  const resolvedEmail = resolveProviderEmailForRequest({
    providerEmail: (button.dataset.providerEmail || "").trim().toLowerCase(),
    providerName: name,
    providerDomain: domain
  });
  const coverageLatitude = parseOptionalNumberValue(button.dataset.providerCoverageLatitude);
  const coverageLongitude = parseOptionalNumberValue(button.dataset.providerCoverageLongitude);
  const coverageAccuracy = parseOptionalNumberValue(button.dataset.providerCoverageAccuracy);

  return {
    name,
    rating: (button.dataset.providerRating || "4.7").trim(),
    price: (button.dataset.providerPrice || "200DH").trim(),
    domain,
    description: (button.dataset.providerDescription || "").trim(),
    image: (button.dataset.providerImage || "").trim(),
    email: resolvedEmail,
    coverageLatitude: Number.isFinite(Number(coverageLatitude)) ? Number(coverageLatitude) : null,
    coverageLongitude: Number.isFinite(Number(coverageLongitude)) ? Number(coverageLongitude) : null,
    coverageAccuracy: Number.isFinite(Number(coverageAccuracy)) ? Number(coverageAccuracy) : null,
    coverageLocationLabel: String(button.dataset.providerCoverageLocationLabel || "").trim(),
    serviceRadiusKm: normalizeProviderServiceRadiusKm(button.dataset.providerServiceRadiusKm, 5)
  };
}

function applyProviderProfile(profile) {
  if (!profile) return;

  if (providerProfileName) providerProfileName.textContent = profile.name || "-";
  const providerRatingLabel = getProviderAverageRatingLabel(profile);
  if (providerProfileRating) providerProfileRating.textContent = providerRatingLabel || "-";
  if (providerProfilePrice) providerProfilePrice.textContent = profile.price || "-";
  if (providerProfileDomain) providerProfileDomain.textContent = profile.domain || "-";
  if (providerProfileDescription) {
    providerProfileDescription.textContent = profile.description || "Description indisponible.";
  }

  profile.rating = providerRatingLabel;

  if (providerProfileImage) {
    const normalizedImage = String((profile && profile.image) || "").trim();
    providerProfileImage.src = normalizedImage || DEFAULT_PROVIDER_CARD_IMAGE;
    providerProfileImage.alt = `Profil ${profile.name || "prestataire"}`;
  }
}

function openProviderProfileFromButton(button) {
  const profile = getProviderProfileFromDataset(button);
  if (profile) {
    currentOrderProviderProfile = { ...profile };
    applyProviderProfile(profile);
  } else {
    currentOrderProviderProfile = null;
  }

  resetCurrentOrderTracking();
  applyCurrentOrderDemandSummary();
  applyProviderPaymentMethod(selectedProviderPaymentMethod);
  const activeScreen = document.querySelector(".screen.active");
  previousPageClass = getPageClassFromElement(activeScreen) || "page14";
  goTo("page17");
}

function getCurrentOrderProviderProfile() {
  if (currentOrderProviderProfile && currentOrderProviderProfile.name) {
    return { ...currentOrderProviderProfile };
  }

  return {
    name: providerProfileName ? String(providerProfileName.textContent || "").trim() : "",
    rating: providerProfileRating ? String(providerProfileRating.textContent || "").trim() : "",
    price: providerProfilePrice ? String(providerProfilePrice.textContent || "").trim() : "",
    domain: providerProfileDomain ? String(providerProfileDomain.textContent || "").trim() : "",
    description: providerProfileDescription ? String(providerProfileDescription.textContent || "").trim() : "",
    image: providerProfileImage ? String(providerProfileImage.getAttribute("src") || "").trim() : "",
    email: "",
    coverageLatitude: null,
    coverageLongitude: null,
    coverageAccuracy: null,
    coverageLocationLabel: "",
    serviceRadiusKm: 5
  };
}

function normalizeProviderPaymentMethod(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "cash" ? "cash" : "carte_bancaire";
}

function getProviderPaymentMethodLabel(value) {
  return normalizeProviderPaymentMethod(value) === "cash" ? "cash" : "carte bancaire";
}

function applyProviderPaymentMethod(value) {
  const normalizedMethod = normalizeProviderPaymentMethod(value);
  selectedProviderPaymentMethod = normalizedMethod;

  providerPaymentOptionButtons.forEach((button) => {
    const buttonMethod = normalizeProviderPaymentMethod(button && button.dataset ? button.dataset.paymentMethod : "");
    const isSelected = buttonMethod === normalizedMethod;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-checked", isSelected ? "true" : "false");
  });

  if (selectedPaymentMethodLabel) {
    selectedPaymentMethodLabel.textContent = getProviderPaymentMethodLabel(normalizedMethod);
  }

  if (selectedPaymentMethodDetailText) {
    selectedPaymentMethodDetailText.textContent =
      normalizedMethod === "cash" ? "Paiement en espece a la fin de l'intervention" : "*** *** *** 43 /00 /000";
  }

  if (selectedPaymentMethodDetail) {
    selectedPaymentMethodDetail.hidden = normalizedMethod === "cash";
  }

  if (selectedPaymentMethodIcon) {
    selectedPaymentMethodIcon.style.display = normalizedMethod === "cash" ? "none" : "block";
  }
}

function isValidOrderGeoLocation(locationData) {
  const latitude = Number(locationData && locationData.latitude);
  const longitude = Number(locationData && locationData.longitude);
  return isValidLatLngCoordinates(latitude, longitude);
}

function isValidLatLngCoordinates(latitude, longitude) {
  const resolvedLat = Number(latitude);
  const resolvedLng = Number(longitude);
  return (
    Number.isFinite(resolvedLat) &&
    Number.isFinite(resolvedLng) &&
    resolvedLat >= -90 &&
    resolvedLat <= 90 &&
    resolvedLng >= -180 &&
    resolvedLng <= 180 &&
    !isNullIslandCoordinate(resolvedLat, resolvedLng)
  );
}

function formatOrderAddressLabel(locationData) {
  if (!isValidOrderGeoLocation(locationData)) {
    return DEFAULT_ORDER_ADDRESS_LABEL;
  }

  const latitude = Number(locationData.latitude);
  const longitude = Number(locationData.longitude);
  return `GPS ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

function estimateOrderEtaMinutes(distanceKm) {
  const fallbackEtaMinutes = Math.max(
    1,
    Math.round(Number(DEFAULT_ORDER_ETA_MINUTES) + Number(ETA_EXTRA_BUFFER_MINUTES))
  );
  if (!Number.isFinite(Number(distanceKm))) {
    return fallbackEtaMinutes;
  }

  const hours = Number(distanceKm) / Number(AVERAGE_PROVIDER_SPEED_KMH);
  const minutes = hours * 60;
  if (!Number.isFinite(minutes)) {
    return fallbackEtaMinutes;
  }

  return Math.max(1, Math.ceil(minutes) + Number(ETA_EXTRA_BUFFER_MINUTES));
}

function computePage20DeliveryStepMinutes(totalEtaMinutes) {
  const total = Number.isFinite(Number(totalEtaMinutes))
    ? Math.max(1, Math.round(Number(totalEtaMinutes)))
    : DEFAULT_ORDER_ETA_MINUTES;

  if (total <= 2) {
    return {
      accepted: 1,
      enRoute: total,
      arrived: total
    };
  }

  const accepted = Math.max(1, Math.round(total * 0.15));
  const enRouteCandidate = Math.max(accepted + 1, Math.round(total * 0.5));
  const enRoute = Math.min(enRouteCandidate, total - 1);

  return {
    accepted,
    enRoute,
    arrived: total
  };
}

function syncPage20DeliveryStepTimeline(totalEtaMinutes) {
  const steps = computePage20DeliveryStepMinutes(totalEtaMinutes);

  if (page20StepAcceptedMin) {
    page20StepAcceptedMin.textContent = `${steps.accepted} min`;
  }

  if (page20StepEnrouteMin) {
    page20StepEnrouteMin.textContent = `${steps.enRoute} min`;
  }

  if (page20StepArrivedMin) {
    page20StepArrivedMin.textContent = `${steps.arrived} min`;
  }
}

function calculateHaversineDistanceKm(fromLat, fromLng, toLat, toLng) {
  if (!isValidLatLngCoordinates(fromLat, fromLng) || !isValidLatLngCoordinates(toLat, toLng)) {
    return null;
  }

  const toRad = (deg) => (Number(deg) * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(Number(toLat) - Number(fromLat));
  const dLng = toRad(Number(toLng) - Number(fromLng));
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = earthRadiusKm * c;
  if (!Number.isFinite(distanceKm)) {
    return null;
  }

  return Number(distanceKm.toFixed(2));
}

function calculateDistanceBasedPriceDh(distanceKm) {
  if (!Number.isFinite(Number(distanceKm))) {
    return DISTANCE_PRICE_BASE_DH;
  }

  const computed = Number(DISTANCE_PRICE_BASE_DH) + Number(distanceKm) * Number(DISTANCE_PRICE_PER_KM_DH);
  return Math.round(computed);
}

function resolveCurrentOrderDistancePricingFromMap() {
  if (!hasCurrentOrderTrackingGeo()) {
    return null;
  }

  const coverageState = resolvePage18ProviderCoverageState();
  if (!coverageState || !hasProviderCoverageLocation(coverageState.locationData)) {
    return null;
  }

  const providerLat = Number(coverageState.locationData.latitude);
  const providerLng = Number(coverageState.locationData.longitude);
  const serviceLat = Number(currentOrderTracking.latitude);
  const serviceLng = Number(currentOrderTracking.longitude);
  const distanceKm = calculateHaversineDistanceKm(providerLat, providerLng, serviceLat, serviceLng);
  if (!Number.isFinite(Number(distanceKm))) {
    return null;
  }

  return {
    distanceKm: Number(distanceKm),
    totalPriceDh: calculateDistanceBasedPriceDh(distanceKm)
  };
}

function hasCurrentOrderTrackingGeo() {
  return isValidLatLngCoordinates(
    currentOrderTracking && currentOrderTracking.latitude,
    currentOrderTracking && currentOrderTracking.longitude
  );
}

function syncCurrentOrderTrackingGeo(locationData) {
  if (!isValidOrderGeoLocation(locationData)) {
    return false;
  }

  currentOrderTracking.latitude = Number(locationData.latitude);
  currentOrderTracking.longitude = Number(locationData.longitude);
  currentOrderTracking.addressLabel = formatOrderAddressLabel(locationData);
  currentOrderTracking.addressSource = "gps";
  currentOrderTracking.addressConfirmed = false;
  currentOrderTracking.distanceKm = null;
  currentOrderTracking.calculatedPriceDh = null;
  return true;
}

function setPage20MapPlaceholder(message, variant = "placeholder") {
  if (!page20GoogleMapElement) {
    return;
  }

  if (page20MapInstance && typeof page20MapInstance.remove === "function") {
    page20MapInstance.remove();
  }
  page20MapInstance = null;
  page20MapProviderMarker = null;
  page20MapArrivedMarker = null;
  page20MapInnerZoneCircle = null;
  page20MapOuterZoneCircle = null;
  page20MapRouteLine = null;

  const safeMessage = String(message || "").trim() || "Position indisponible.";
  page20GoogleMapElement.classList.remove("is-placeholder", "is-error");
  page20GoogleMapElement.classList.add(variant === "error" ? "is-error" : "is-placeholder");
  page20GoogleMapElement.textContent = safeMessage;
}

function clearPage20MapPlaceholder() {
  if (!page20GoogleMapElement) {
    return;
  }

  page20GoogleMapElement.classList.remove("is-placeholder", "is-error");
  page20GoogleMapElement.textContent = "";
}

async function renderPage20GoogleMap() {
  if (!page20GoogleMapElement) {
    return;
  }

  const providerCoverageState = resolvePage18ProviderCoverageState();
  const hasProviderLiveLocation = hasProviderCoverageLocation(providerCoverageState.locationData);
  const providerMapLocation = hasProviderLiveLocation
    ? providerCoverageState.locationData
    : { ...DEFAULT_PROVIDER_COVERAGE_CENTER };
  const providerLat = Number(providerMapLocation.latitude);
  const providerLng = Number(providerMapLocation.longitude);
  const hasServiceAddress = hasCurrentOrderTrackingGeo();
  const serviceLat = hasServiceAddress ? Number(currentOrderTracking.latitude) : null;
  const serviceLng = hasServiceAddress ? Number(currentOrderTracking.longitude) : null;
  const serviceRadiusMeters =
    Math.max(2000, normalizeProviderServiceRadiusKm(providerCoverageState.serviceRadiusKm, 5) * 1000);
  const innerRadiusMeters = Math.min(2000, serviceRadiusMeters);

  try {
    await loadLeafletApi();
  } catch (error) {
    setPage20MapPlaceholder("Carte indisponible pour le moment.", "error");
    return;
  }

  clearPage20MapPlaceholder();
  if (page20MapInstance && typeof page20MapInstance.remove === "function") {
    page20MapInstance.remove();
  }
  page20MapInstance = null;
  page20MapProviderMarker = null;
  page20MapArrivedMarker = null;
  page20MapInnerZoneCircle = null;
  page20MapOuterZoneCircle = null;
  page20MapRouteLine = null;

  page20GoogleMapElement.innerHTML = "";
  page20MapInstance = window.L.map(page20GoogleMapElement, {
    zoomControl: true
  });
  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(page20MapInstance);

  const providerLatLng = [providerLat, providerLng];
  const providerMarkerTitle = hasProviderLiveLocation
    ? "Position du prestataire"
    : "Position du prestataire (par defaut)";
  page20MapProviderMarker = window.L.marker(providerLatLng, {
    title: providerMarkerTitle
  }).addTo(page20MapInstance);
  page20MapProviderMarker.bindPopup(providerMarkerTitle);

  page20MapOuterZoneCircle = window.L.circle(providerLatLng, {
    radius: serviceRadiusMeters,
    color: "#e95322",
    weight: 2,
    fillColor: "#e95322",
    fillOpacity: 0.14
  }).addTo(page20MapInstance);

  page20MapInnerZoneCircle = window.L.circle(providerLatLng, {
    radius: innerRadiusMeters,
    color: "#1f8f45",
    weight: 2,
    fillColor: "#2ebf5f",
    fillOpacity: 0.24
  }).addTo(page20MapInstance);

  const serviceAddressLabel = getPage18ServiceAddressLabel();
  const addressChipControl = window.L.control({ position: "topright" });
  addressChipControl.onAdd = () => {
    const chip = window.L.DomUtil.create("div", "page20-map-address-chip");
    chip.textContent = `Adresse: ${serviceAddressLabel}`;
    return chip;
  };
  addressChipControl.addTo(page20MapInstance);

  const autoBounds = window.L.latLng(providerLat, providerLng).toBounds(Math.max(serviceRadiusMeters * 2, 3000));
  if (hasServiceAddress && isValidLatLngCoordinates(serviceLat, serviceLng)) {
    const serviceLatLng = [serviceLat, serviceLng];
    page20MapArrivedMarker = window.L.circleMarker(serviceLatLng, {
      radius: 8,
      color: "#1f8f45",
      weight: 2,
      fillColor: "#73de98",
      fillOpacity: 0.9
    }).addTo(page20MapInstance);
    page20MapArrivedMarker.bindTooltip("Prestataire arrivé", {
      permanent: true,
      direction: "top",
      className: "page20-arrived-tooltip"
    });
    page20MapArrivedMarker.bindPopup("Prestataire arrivé à l'adresse de prestation.");

    page20MapRouteLine = window.L.polyline([providerLatLng, serviceLatLng], {
      color: "#1f78d1",
      weight: 2,
      opacity: 0.85,
      dashArray: "5 5"
    }).addTo(page20MapInstance);
    autoBounds.extend(window.L.latLng(serviceLat, serviceLng));
  }

  page20MapInstance.fitBounds(autoBounds, {
    padding: [26, 26]
  });

  window.setTimeout(() => {
    if (page20MapInstance && typeof page20MapInstance.invalidateSize === "function") {
      page20MapInstance.invalidateSize();
    }
  }, 0);
}

async function renderPage20GoogleMapWithFallback() {
  const providerCoverageState = resolvePage18ProviderCoverageState();
  if (!hasProviderCoverageLocation(providerCoverageState.locationData) && !page20MapGeoAttempted) {
    page20MapGeoAttempted = true;
    await syncCurrentOrderProviderCoverageFromBackend();
    applyCurrentOrderDemandSummary();
  }

  await renderPage20GoogleMap();
}

function setPage18ProviderMapPlaceholder(message, variant = "placeholder") {
  if (!page18ProviderMapElement) {
    return;
  }

  if (
    page18ProviderMapInstance &&
    page18ProviderMapClickHandler &&
    typeof page18ProviderMapInstance.off === "function"
  ) {
    page18ProviderMapInstance.off("click", page18ProviderMapClickHandler);
  }
  if (page18ProviderMapInstance && typeof page18ProviderMapInstance.remove === "function") {
    page18ProviderMapInstance.remove();
  }
  page18ProviderMapInstance = null;
  page18ProviderMapMarker = null;
  page18ServiceAddressMarker = null;
  page18ServiceLinkLine = null;
  page18ProviderInnerZoneCircle = null;
  page18ProviderOuterZoneCircle = null;
  page18ProviderMapClickHandler = null;
  const safeMessage = String(message || "").trim() || "Position du prestataire indisponible.";
  page18ProviderMapElement.classList.remove("is-placeholder", "is-error", "is-local-fallback");
  page18ProviderMapElement.classList.add(variant === "error" ? "is-error" : "is-placeholder");
  page18ProviderMapElement.textContent = safeMessage;
}

function clearPage18ProviderMapPlaceholder() {
  if (!page18ProviderMapElement) {
    return;
  }

  page18ProviderMapElement.classList.remove("is-placeholder", "is-error", "is-local-fallback");
  page18ProviderMapElement.textContent = "";
}

function escapeHtmlText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getPage18ServiceAddressLabel() {
  const activeAddress = String((currentOrderTracking && currentOrderTracking.addressLabel) || "").trim();
  return activeAddress || DEFAULT_ORDER_ADDRESS_LABEL;
}

function getPage18ServiceAddressMapPosition() {
  if (!hasCurrentOrderTrackingGeo()) {
    return null;
  }

  return {
    lat: Number(currentOrderTracking.latitude),
    lng: Number(currentOrderTracking.longitude)
  };
}

function renderPage18ProviderLocalFallbackMap(locationData, serviceRadiusKm, reason = "") {
  if (!page18ProviderMapElement) {
    return false;
  }

  if (
    page18ProviderMapInstance &&
    page18ProviderMapClickHandler &&
    typeof page18ProviderMapInstance.off === "function"
  ) {
    page18ProviderMapInstance.off("click", page18ProviderMapClickHandler);
  }
  if (page18ProviderMapInstance && typeof page18ProviderMapInstance.remove === "function") {
    page18ProviderMapInstance.remove();
  }
  page18ProviderMapInstance = null;
  page18ProviderMapMarker = null;
  page18ServiceAddressMarker = null;
  page18ServiceLinkLine = null;
  page18ProviderInnerZoneCircle = null;
  page18ProviderOuterZoneCircle = null;
  page18ProviderMapClickHandler = null;

  const mapLocation = hasProviderCoverageLocation(locationData) ? locationData : { ...DEFAULT_PROVIDER_COVERAGE_CENTER };
  const latitude = Number(mapLocation && mapLocation.latitude);
  const longitude = Number(mapLocation && mapLocation.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return false;
  }

  const normalizedRadiusKm = normalizeProviderServiceRadiusKm(serviceRadiusKm, 5);
  const pricingUpperBound = Math.max(2, Math.round(normalizedRadiusKm));
  const zoneLabel =
    pricingUpperBound > 2 ? `Zone: 0-2 km / 2-${pricingUpperBound} km` : "Zone: 0-2 km (prix normal)";
  const sourceLabel = hasProviderCoverageLocation(locationData) ? "Position prestataire détectée" : "Position par défaut";
  const serviceAddressLabel = getPage18ServiceAddressLabel();
  const servicePosition = getPage18ServiceAddressMapPosition();
  const servicePositionLabel = servicePosition
    ? `${servicePosition.lat.toFixed(5)}, ${servicePosition.lng.toFixed(5)}`
    : "Aucun point manuel";
  const trimmedReason = String(reason || "").trim();
  const escapedReason = escapeHtmlText(trimmedReason);
  const escapedAddressLabel = escapeHtmlText(serviceAddressLabel);
  const escapedServicePositionLabel = escapeHtmlText(servicePositionLabel);

  page18ProviderMapElement.classList.remove("is-placeholder", "is-error");
  page18ProviderMapElement.classList.add("is-local-fallback");
  page18ProviderMapElement.innerHTML = `
    <div class="page18-provider-local-map">
      <div class="page18-provider-local-grid"></div>
      <div class="page18-provider-local-outer-ring" aria-hidden="true"></div>
      <div class="page18-provider-local-inner-ring" aria-hidden="true"></div>
      <div class="page18-provider-local-pin" aria-hidden="true"></div>
      <div class="page18-provider-local-badge page18-provider-local-badge-coords">
        ${latitude.toFixed(5)}, ${longitude.toFixed(5)}
      </div>
      <div class="page18-provider-local-badge page18-provider-local-badge-address">
        Adresse prestation: ${escapedAddressLabel}
      </div>
      <div class="page18-provider-local-badge page18-provider-local-badge-address-point">
        Point adresse: ${escapedServicePositionLabel}
      </div>
      <div class="page18-provider-local-badge page18-provider-local-badge-radius">
        ${zoneLabel}
      </div>
      <div class="page18-provider-local-badge page18-provider-local-badge-status">
        ${sourceLabel}
      </div>
      ${
        escapedReason
          ? `<div class="page18-provider-local-badge page18-provider-local-badge-warning">${escapedReason}</div>`
          : ""
      }
    </div>
  `;
  return true;
}

function resolvePage18ProviderCoverageState(profile = null) {
  const providerProfile = profile || getCurrentOrderProviderProfile();
  const profileRadiusKm = normalizeProviderServiceRadiusKm(
    providerProfile && (providerProfile.serviceRadiusKm != null ? providerProfile.serviceRadiusKm : 5),
    5
  );
  const candidates = [];

  if (providerProfile && typeof providerProfile === "object") {
    candidates.push(providerProfile);
  }

  const email = String((providerProfile && providerProfile.email) || "").trim().toLowerCase();
  if (email) {
    const localProvider = findProviderAccountByEmail(email);
    if (localProvider) {
      candidates.push(localProvider);
    }
  }

  for (const candidate of candidates) {
    const locationData = resolveProviderCoverageLocationFromAccount(candidate);
    if (hasProviderCoverageLocation(locationData)) {
      return {
        locationData,
        serviceRadiusKm: normalizeProviderServiceRadiusKm(
          candidate && (candidate.serviceRadiusKm != null ? candidate.serviceRadiusKm : candidate.coverageRadiusKm),
          profileRadiusKm
        )
      };
    }
  }

  return { locationData: null, serviceRadiusKm: profileRadiusKm };
}

function applyPage18ProviderCoverageSummary(serviceRadiusKm) {
  const normalizedRadiusKm = normalizeProviderServiceRadiusKm(serviceRadiusKm, 5);
  const pricingUpperBound = Math.max(2, Math.round(normalizedRadiusKm));
  if (page18ProviderFieldValue) {
    page18ProviderFieldValue.textContent = `Champ: ${pricingUpperBound} km`;
  }
  if (page18ProviderZoneNote) {
    page18ProviderZoneNote.textContent =
      pricingUpperBound > 2
        ? `Prix indicatif: 0-2 km (prix normal), 2-${pricingUpperBound} km (prix majore).`
        : "Prix indicatif: 0-2 km (prix normal).";
  }
}

async function syncCurrentOrderProviderCoverageFromBackend() {
  const providerProfile = getCurrentOrderProviderProfile();
  const email = String((providerProfile && providerProfile.email) || "").trim().toLowerCase();
  if (!email) {
    return false;
  }

  try {
    const statusPayload = await fetchVerificationStatusByType("prestataire", email, { allowNotFound: true });
    if (!statusPayload) {
      return false;
    }

    const remoteLocation = resolveProviderCoverageLocationFromAccount(statusPayload);
    if (!hasProviderCoverageLocation(remoteLocation)) {
      return false;
    }

    const serviceRadiusKm = normalizeProviderServiceRadiusKm(
      statusPayload.serviceRadiusKm != null ? statusPayload.serviceRadiusKm : statusPayload.coverageRadiusKm,
      providerProfile && providerProfile.serviceRadiusKm != null ? providerProfile.serviceRadiusKm : 5
    );
    const nextCoverage = {
      coverageLatitude: Number(remoteLocation.latitude),
      coverageLongitude: Number(remoteLocation.longitude),
      coverageAccuracy: Number.isFinite(Number(remoteLocation.accuracy)) ? Number(remoteLocation.accuracy) : null,
      coverageLocationLabel: String(remoteLocation.locationLabel || "gps_device").trim() || "gps_device",
      serviceRadiusKm
    };

    currentOrderProviderProfile = {
      ...(currentOrderProviderProfile || {}),
      ...providerProfile,
      email,
      ...nextCoverage
    };

    const localProvider = findProviderAccountByEmail(email);
    if (localProvider) {
      upsertProviderAccount({
        ...localProvider,
        ...nextCoverage,
        coverageGeoEnabled: true,
        coverageCapturedAt: String(localProvider.coverageCapturedAt || "").trim() || new Date().toISOString()
      });
    }

    return true;
  } catch (error) {
    return false;
  }
}

async function renderPage18ProviderCoverageMap() {
  if (!page18ProviderMapElement) {
    return;
  }

  if (page18ProviderZoneCard) {
    page18ProviderZoneCard.hidden = false;
  }

  let fallbackLocationData = null;
  let fallbackServiceRadiusKm = 5;
  try {
    const { locationData, serviceRadiusKm } = resolvePage18ProviderCoverageState();
    fallbackLocationData = locationData;
    fallbackServiceRadiusKm = serviceRadiusKm;
    applyPage18ProviderCoverageSummary(serviceRadiusKm);
    await loadLeafletApi();
    clearPage18ProviderMapPlaceholder();

    const mapLocation = hasProviderCoverageLocation(locationData)
      ? locationData
      : { ...DEFAULT_PROVIDER_COVERAGE_CENTER };
    const position = { lat: Number(mapLocation.latitude), lng: Number(mapLocation.longitude) };
    const outerRadiusMeters = Math.max(2000, normalizeProviderServiceRadiusKm(serviceRadiusKm, 5) * 1000);
    const innerRadiusMeters = Math.min(2000, outerRadiusMeters);

    if (
      page18ProviderMapInstance &&
      page18ProviderMapClickHandler &&
      typeof page18ProviderMapInstance.off === "function"
    ) {
      page18ProviderMapInstance.off("click", page18ProviderMapClickHandler);
    }
    if (page18ProviderMapInstance && typeof page18ProviderMapInstance.remove === "function") {
      page18ProviderMapInstance.remove();
    }
    page18ProviderMapInstance = null;
    page18ProviderMapMarker = null;
    page18ServiceAddressMarker = null;
    page18ServiceLinkLine = null;
    page18ProviderInnerZoneCircle = null;
    page18ProviderOuterZoneCircle = null;
    page18ProviderMapClickHandler = null;

    page18ProviderMapElement.innerHTML = "";
    page18ProviderMapInstance = window.L.map(page18ProviderMapElement, {
      zoomControl: true
    });
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(page18ProviderMapInstance);

    const providerLatLng = [position.lat, position.lng];
    page18ProviderMapMarker = window.L.marker(providerLatLng, {
      title: "Position du prestataire"
    }).addTo(page18ProviderMapInstance);
    page18ProviderMapMarker.bindPopup("Position du prestataire");

    page18ProviderOuterZoneCircle = window.L.circle(providerLatLng, {
      radius: outerRadiusMeters,
      color: "#e95322",
      weight: 2,
      fillColor: "#e95322",
      fillOpacity: 0.14
    }).addTo(page18ProviderMapInstance);

    page18ProviderInnerZoneCircle = window.L.circle(providerLatLng, {
      radius: innerRadiusMeters,
      color: "#1f8f45",
      weight: 2,
      fillColor: "#2ebf5f",
      fillOpacity: 0.24
    }).addTo(page18ProviderMapInstance);

    const serviceAddressLabel = getPage18ServiceAddressLabel();
    const serviceAddressPosition = getPage18ServiceAddressMapPosition();
    const addressChipControl = window.L.control({ position: "topright" });
    addressChipControl.onAdd = () => {
      const chip = window.L.DomUtil.create("div", "page18-map-address-chip");
      chip.textContent = `Adresse: ${serviceAddressLabel}`;
      return chip;
    };
    addressChipControl.addTo(page18ProviderMapInstance);

    if (
      serviceAddressPosition &&
      isValidLatLngCoordinates(serviceAddressPosition.lat, serviceAddressPosition.lng)
    ) {
      const serviceLatLng = [serviceAddressPosition.lat, serviceAddressPosition.lng];
      page18ServiceAddressMarker = window.L.circleMarker(serviceLatLng, {
        radius: 7,
        color: "#1f78d1",
        weight: 2,
        fillColor: "#7fc7ff",
        fillOpacity: 0.85
      }).addTo(page18ProviderMapInstance);
      page18ServiceAddressMarker.bindTooltip("Adresse prestation", {
        permanent: true,
        direction: "top",
        className: "page18-service-tooltip"
      });
      page18ServiceAddressMarker.bindPopup(`Adresse prestation: ${escapeHtmlText(serviceAddressLabel)}`);
      page18ServiceLinkLine = window.L.polyline([providerLatLng, serviceLatLng], {
        color: "#1f78d1",
        weight: 2,
        opacity: 0.85,
        dashArray: "5 5"
      }).addTo(page18ProviderMapInstance);
    }

    const autoBounds = window.L.latLng(position.lat, position.lng).toBounds(Math.max(outerRadiusMeters * 2, 3000));
    if (
      serviceAddressPosition &&
      isValidLatLngCoordinates(serviceAddressPosition.lat, serviceAddressPosition.lng)
    ) {
      autoBounds.extend(window.L.latLng(serviceAddressPosition.lat, serviceAddressPosition.lng));
    }
    page18ProviderMapInstance.fitBounds(autoBounds, {
      padding: [26, 26]
    });

    page18ProviderMapClickHandler = (event) => {
      if (!event || !event.latlng) {
        return;
      }

      const clickedLat = Number(event.latlng.lat);
      const clickedLng = Number(event.latlng.lng);
      if (!isValidLatLngCoordinates(clickedLat, clickedLng)) {
        return;
      }

      currentOrderTracking.latitude = clickedLat;
      currentOrderTracking.longitude = clickedLng;
      currentOrderTracking.distanceKm = null;
      currentOrderTracking.calculatedPriceDh = null;
      currentOrderTracking.addressLabel = `Point manuel ${clickedLat.toFixed(5)}, ${clickedLng.toFixed(5)}`;
      currentOrderTracking.addressSource = "manual_map";
      currentOrderTracking.addressConfirmed = false;
      applyCurrentOrderTrackingSummary();

      window.setTimeout(() => {
        renderPage18ProviderCoverageMap().catch(() => {
          setPage18ProviderMapPlaceholder("Carte du prestataire indisponible pour le moment.", "error");
        });
      }, 0);
    };
    page18ProviderMapInstance.on("click", page18ProviderMapClickHandler);

    window.setTimeout(() => {
      if (page18ProviderMapInstance && typeof page18ProviderMapInstance.invalidateSize === "function") {
        page18ProviderMapInstance.invalidateSize();
      }
    }, 0);
  } catch (error) {
    const reason = "Mode simplifié actif (carte indisponible).";
    const renderedFallback = renderPage18ProviderLocalFallbackMap(
      fallbackLocationData,
      fallbackServiceRadiusKm,
      reason
    );
    if (!renderedFallback) {
      setPage18ProviderMapPlaceholder("Carte du prestataire indisponible pour le moment.", "error");
    }
  }
}

async function renderPage18ProviderCoverageMapWithFallback() {
  await renderPage18ProviderCoverageMap();
  const currentState = resolvePage18ProviderCoverageState();
  if (hasProviderCoverageLocation(currentState.locationData)) {
    return;
  }

  const wasHydrated = await syncCurrentOrderProviderCoverageFromBackend();
  if (!wasHydrated) {
    return;
  }

  applyCurrentOrderDemandSummary();
  await renderPage18ProviderCoverageMap();
}

function formatOrderProviderDomainLabel(rawDomain) {
  const normalizedDomain = normalizeProviderCategory(rawDomain);
  if (!normalizedDomain) {
    return "service";
  }

  return normalizedDomain.replace(/_/g, " ");
}

function applyCurrentOrderDemandSummary() {
  const providerProfile = getCurrentOrderProviderProfile();
  const providerName = String((providerProfile && providerProfile.name) || "").trim() || "Prestataire";
  const providerDomain = formatOrderProviderDomainLabel(providerProfile && providerProfile.domain);
  const defaultProviderPrice = normalizeOngoingRequestPrice(DISTANCE_PRICE_BASE_DH, `${DISTANCE_PRICE_BASE_DH}DH`);
  const dynamicPriceDh = Number(currentOrderTracking && currentOrderTracking.calculatedPriceDh);
  const providerPrice = Number.isFinite(dynamicPriceDh)
    ? normalizeOngoingRequestPrice(dynamicPriceDh, `${DISTANCE_PRICE_BASE_DH}DH`)
    : defaultProviderPrice;

  if (page18RequestProviderName) {
    page18RequestProviderName.textContent = providerName;
  }

  if (page18RequestProviderDomain) {
    page18RequestProviderDomain.textContent = providerDomain;
  }

  if (page18RequestProviderPrice) {
    page18RequestProviderPrice.textContent = providerPrice;
  }

  const providerCoverageState = resolvePage18ProviderCoverageState(providerProfile);
  applyPage18ProviderCoverageSummary(providerCoverageState.serviceRadiusKm);
}

function applyCurrentOrderTrackingSummary() {
  const addressLabel =
    currentOrderTracking && String(currentOrderTracking.addressLabel || "").trim()
      ? String(currentOrderTracking.addressLabel || "").trim()
      : DEFAULT_ORDER_ADDRESS_LABEL;
  const etaMinutes = estimateOrderEtaMinutes(
    currentOrderTracking && Number.isFinite(Number(currentOrderTracking.distanceKm))
      ? Number(currentOrderTracking.distanceKm)
      : null
  );
  const etaLabel = `${etaMinutes} mins`;

  if (page18AddressValue) {
    page18AddressValue.textContent = addressLabel;
  }

  if (page20AddressValue) {
    page20AddressValue.textContent = addressLabel;
  }

  if (page18EtaValue) {
    page18EtaValue.textContent = etaLabel;
  }

  if (page20EtaValue) {
    page20EtaValue.textContent = etaLabel;
  }
  syncPage20DeliveryStepTimeline(etaMinutes);

  applyCurrentOrderDemandSummary();
  syncPage18ConfirmAddressButtonState();
  syncPage18PaymentButtonState();
}

function buildDefaultOrderTrackingState() {
  return {
    addressLabel: DEFAULT_ORDER_ADDRESS_LABEL,
    distanceKm: null,
    calculatedPriceDh: null,
    latitude: Number(DEFAULT_ORDER_SERVICE_COORDINATES.latitude),
    longitude: Number(DEFAULT_ORDER_SERVICE_COORDINATES.longitude),
    addressSource: "manual_map",
    addressConfirmed: false
  };
}

function resetCurrentOrderTracking() {
  currentOrderTracking = buildDefaultOrderTrackingState();
  page20MapGeoAttempted = false;
  applyCurrentOrderTrackingSummary();
}

function getActiveClientEmail() {
  const clientAccount = getActiveClientAccount();
  return String((clientAccount && clientAccount.email) || "")
    .trim()
    .toLowerCase();
}

function getActiveProviderEmail() {
  const providerAccount = getActiveProviderAccount();
  return String((providerAccount && providerAccount.email) || "")
    .trim()
    .toLowerCase();
}

function resolveActiveProfileTypeForChat() {
  const hasClient = Boolean(getActiveClientEmail());
  const hasProvider = Boolean(getActiveProviderEmail());

  if (hasClient && !hasProvider) {
    return "client";
  }
  if (hasProvider && !hasClient) {
    return "prestataire";
  }
  if (!hasClient && !hasProvider) {
    return "";
  }

  const activeScreen = document.querySelector(".screen.active");
  const activePage = getPageClassFromElement(activeScreen) || String(activeOrderChatReturnPage || "").trim();
  const roleFromActivePage = resolveProfileRoleFromPageClass(activePage);
  if (roleFromActivePage) {
    return roleFromActivePage;
  }

  if (activePage === "page16" || activePage === "page33") {
    const sourcePage = String(activeOrderChatReturnPage || previousPageClass || "").trim();
    const roleFromSourcePage = resolveProfileRoleFromPageClass(sourcePage);
    if (roleFromSourcePage) {
      return roleFromSourcePage;
    }
  }

  if (activeOrderChatParticipant && activeOrderChatParticipant.senderType) {
    const senderType = String(activeOrderChatParticipant.senderType || "").trim().toLowerCase();
    if (senderType === "client" || senderType === "prestataire") {
      return senderType;
    }
  }

  const explicitRole = getActiveProfileRole();
  if (explicitRole === "client" || explicitRole === "prestataire") {
    return explicitRole;
  }

  if (lastResolvedProfileType === "prestataire" || lastResolvedProfileType === "client") {
    return lastResolvedProfileType;
  }

  return hasProvider ? "prestataire" : "client";
}

function isProviderRequestSessionActive() {
  const activeClientEmail = getActiveClientEmail();
  const activeProviderEmail = getActiveProviderEmail();
  const explicitRole = getActiveProfileRole();
  const activeRole = resolveActiveProfileTypeForChat();
  return (
    explicitRole === "prestataire" ||
    (explicitRole !== "client" &&
      (activeRole === "prestataire" || (!activeClientEmail && Boolean(activeProviderEmail))))
  );
}

function syncRequestHistoryTabsVisibility() {
  const hideCancelled = false;
  const toggleHidden = (node) => {
    if (!node) {
      return;
    }
    node.hidden = hideCancelled;
    node.disabled = hideCancelled;
    node.setAttribute("aria-disabled", String(hideCancelled));
  };

  toggleHidden(openPage23Btn);
  toggleHidden(openPage23From22Btn);
  toggleHidden(openPage22From23Btn);
}

function getActiveChatParticipant() {
  const activeProfileType = resolveActiveProfileTypeForChat();

  if (activeProfileType === "client") {
    const client = getActiveClientAccount();
    const clientEmail = getActiveClientEmail();
    if (!clientEmail) {
      return null;
    }
    return {
      senderType: "client",
      id: clientEmail,
      email: clientEmail,
      name: buildParticipantDisplayName(client && client.prenom, client && client.nom, clientEmail)
    };
  }

  if (activeProfileType === "prestataire") {
    const provider = getActiveProviderAccount();
    const providerEmail = getActiveProviderEmail();
    if (!providerEmail) {
      return null;
    }
    return {
      senderType: "prestataire",
      id: providerEmail,
      email: providerEmail,
      name: buildParticipantDisplayName(provider && provider.prenom, provider && provider.nom, providerEmail)
    };
  }

  return null;
}

function buildParticipantDisplayName(prenom, nom, fallback = "") {
  const safePrenom = String(prenom || "").trim();
  const safeNom = String(nom || "").trim();
  if (safePrenom && safeNom) {
    if (safePrenom.toLowerCase() === safeNom.toLowerCase()) {
      return safePrenom;
    }
    return `${safePrenom} ${safeNom}`.trim();
  }
  return safePrenom || safeNom || String(fallback || "").trim();
}

function getActiveSupportParticipant() {
  if (activeSupportParticipantContext && typeof activeSupportParticipantContext === "object") {
    const email = String(activeSupportParticipantContext.participantEmail || "").trim().toLowerCase();
    const type = String(activeSupportParticipantContext.participantType || "").trim().toLowerCase();
    if (email && (type === "client" || type === "prestataire")) {
      return {
        participantType: type,
        participantEmail: email,
        participantName: String(activeSupportParticipantContext.participantName || "").trim() || email
      };
    }
  }

  const activeProfileType = resolveActiveProfileTypeForChat();

  if (activeProfileType === "client") {
    const client = getActiveClientAccount();
    const clientEmail = getActiveClientEmail();
    if (!clientEmail) {
      return null;
    }
    return {
      participantType: "client",
      participantEmail: clientEmail,
      participantName: buildParticipantDisplayName(client && client.prenom, client && client.nom, clientEmail)
    };
  }

  if (activeProfileType === "prestataire") {
    const provider = getActiveProviderAccount();
    const providerEmail = getActiveProviderEmail();
    if (!providerEmail) {
      return null;
    }
    return {
      participantType: "prestataire",
      participantEmail: providerEmail,
      participantName: buildParticipantDisplayName(provider && provider.prenom, provider && provider.nom, providerEmail)
    };
  }

  return null;
}

function setSupportChatFeedback(message = "", tone = "neutral") {
  if (!supportChatFeedback) {
    return;
  }

  supportChatFeedback.textContent = String(message || "");
  supportChatFeedback.classList.remove("is-error", "is-success");
  if (tone === "error") {
    supportChatFeedback.classList.add("is-error");
  } else if (tone === "success") {
    supportChatFeedback.classList.add("is-success");
  }
}

function stopSupportChatPolling() {
  if (supportChatPollTimer) {
    window.clearInterval(supportChatPollTimer);
    supportChatPollTimer = null;
  }
}

function formatSupportChatDate(value) {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function renderSupportChatMessages(messages = [], currentParticipantType = "") {
  if (!supportChatMessages) {
    return;
  }

  const rows = Array.isArray(messages) ? messages : [];
  if (!rows.length) {
    supportChatMessages.innerHTML = "";
    return;
  }

  supportChatMessages.innerHTML = rows
    .map((entry) => {
      const senderType = String((entry && entry.participantType) || "").trim().toLowerCase();
      const currentType = String(currentParticipantType || "").trim().toLowerCase();
      const isMine = Boolean(currentType) && senderType === currentType;
      const senderNameRaw = String((entry && entry.participantName) || "").trim();
      const senderName = senderNameRaw || (senderType === "moderateur" ? "Support" : "Vous");
      const rowClass = isMine ? "support-chat-item is-me" : "support-chat-item is-support";
      const messageText = escapeHtmlForChat(String((entry && entry.message) || "").trim());
      const meta = escapeHtmlForChat(`${senderName} • ${formatSupportChatDate(entry && entry.createdAt)}`);
      return `
        <div class="${rowClass}">
          <span class="support-chat-meta">${meta}</span>
          <div class="support-chat-bubble">${messageText}</div>
        </div>
      `;
    })
    .join("");

  supportChatMessages.scrollTop = supportChatMessages.scrollHeight;
}

function getAllSupportLocalMessages() {
  try {
    const raw = localStorage.getItem(SUPPORT_CHAT_LOCAL_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveAllSupportLocalMessages(items) {
  try {
    localStorage.setItem(SUPPORT_CHAT_LOCAL_STORAGE_KEY, JSON.stringify(Array.isArray(items) ? items : []));
  } catch (error) {
    return;
  }
}

function getSupportLocalMessagesByParticipant(participantEmail) {
  const normalizedEmail = String(participantEmail || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return [];
  }
  return getAllSupportLocalMessages()
    .filter((entry) => String((entry && entry.participantEmail) || "").trim().toLowerCase() === normalizedEmail)
    .sort((left, right) => {
      const leftDate = Date.parse(String((left && left.createdAt) || "")) || 0;
      const rightDate = Date.parse(String((right && right.createdAt) || "")) || 0;
      return leftDate - rightDate;
    });
}

function upsertSupportLocalMessagesForParticipant(participantEmail, messages = []) {
  const normalizedEmail = String(participantEmail || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return;
  }

  const untouched = getAllSupportLocalMessages().filter(
    (entry) => String((entry && entry.participantEmail) || "").trim().toLowerCase() !== normalizedEmail
  );

  const normalizedMessages = (Array.isArray(messages) ? messages : [])
    .map((entry) => ({
      participantEmail: normalizedEmail,
      participantType: String((entry && entry.participantType) || "").trim().toLowerCase(),
      participantName: String((entry && entry.participantName) || "").trim(),
      moderatorId: String((entry && entry.moderatorId) || "").trim().toLowerCase(),
      message: String((entry && entry.message) || "").trim(),
      createdAt: String((entry && entry.createdAt) || new Date().toISOString())
    }))
    .filter((entry) => entry.message);

  saveAllSupportLocalMessages([...untouched, ...normalizedMessages].slice(-800));
}

function pushSupportLocalMessage(entry) {
  const normalized = entry && typeof entry === "object" ? { ...entry } : null;
  if (!normalized) {
    return;
  }
  const messageText = String(normalized.message || "").trim();
  const participantEmail = String(normalized.participantEmail || "").trim().toLowerCase();
  if (!participantEmail || !messageText) {
    return;
  }
  normalized.participantEmail = participantEmail;
  normalized.message = messageText;
  normalized.participantType = String(normalized.participantType || "").trim().toLowerCase();
  normalized.participantName = String(normalized.participantName || "").trim();
  normalized.createdAt = String(normalized.createdAt || new Date().toISOString());
  const next = [...getAllSupportLocalMessages(), normalized].slice(-800);
  saveAllSupportLocalMessages(next);
}

async function fetchSupportMessagesForParticipant(participantEmail) {
  const normalizedEmail = String(participantEmail || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return [];
  }

  let lastNetworkError = null;

  for (const apiBase of getApiCandidates()) {
    try {
      const response = await fetchWithTimeout(
        `${apiBase}/support/messages?participantEmail=${encodeURIComponent(normalizedEmail)}&t=${Date.now()}`,
        { method: "GET", headers: { "Content-Type": "application/json" }, cache: "no-store" }
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.message || "Lecture du support impossible.");
      }

      saveApiBase(apiBase);
      return Array.isArray(payload.messages) ? payload.messages : [];
    } catch (error) {
      if (isNetworkError(error)) {
        lastNetworkError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastNetworkError || new Error("Serveur backend inaccessible.");
}

async function sendSupportMessageForParticipant(participant, message) {
  const normalizedMessage = String(message || "").trim();
  if (!participant || !participant.participantEmail || !participant.participantType || !normalizedMessage) {
    throw new Error("Message support invalide.");
  }

  let lastNetworkError = null;

  for (const apiBase of getApiCandidates()) {
    try {
      const response = await fetchWithTimeout(`${apiBase}/support/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantEmail: participant.participantEmail,
          participantType: participant.participantType,
          participantName: participant.participantName,
          message: normalizedMessage
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Envoi du message support impossible.");
      }

      saveApiBase(apiBase);
      return payload;
    } catch (error) {
      if (isNetworkError(error)) {
        lastNetworkError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastNetworkError || new Error("Serveur backend inaccessible.");
}

async function refreshSupportChatMessages(options = {}) {
  const participant = getActiveSupportParticipant();
  if (!participant) {
    if (supportChatMessages) {
      supportChatMessages.innerHTML =
        '<div class="support-chat-empty">Le chat support est disponible apres connexion.</div>';
    }
    setSupportChatFeedback("Connectez-vous pour parler au support.", "error");
    stopSupportChatPolling();
    return;
  }

  const localMessages = getSupportLocalMessagesByParticipant(participant.participantEmail);

  try {
    const messages = await fetchSupportMessagesForParticipant(participant.participantEmail);
    const nextMessages = Array.isArray(messages) ? messages : [];
    if (nextMessages.length > 0) {
      supportChatCachedMessages = nextMessages;
      upsertSupportLocalMessagesForParticipant(participant.participantEmail, nextMessages);
      renderSupportChatMessages(nextMessages, participant.participantType);
    } else if (localMessages.length > 0) {
      supportChatCachedMessages = localMessages;
      renderSupportChatMessages(localMessages, participant.participantType);
    } else if (supportChatCachedMessages.length > 0) {
      renderSupportChatMessages(supportChatCachedMessages, participant.participantType);
    } else {
      renderSupportChatMessages([], participant.participantType);
    }
    const latestTimestamp = messages.reduce((maxValue, row) => {
      const stamp = Date.parse(String((row && row.createdAt) || "")) || 0;
      return stamp > maxValue ? stamp : maxValue;
    }, 0);
    if (latestTimestamp > supportChatLastRenderedAt) {
      supportChatLastRenderedAt = latestTimestamp;
    }
    if (!options.keepFeedback) {
      setSupportChatFeedback("");
    }
  } catch (error) {
    if (!options.silent) {
      setSupportChatFeedback(error.message || "Chargement du support impossible.", "error");
    }
  }
}

function startSupportChatPolling() {
  stopSupportChatPolling();
  supportChatPollTimer = setInterval(() => {
    const activeScreen = document.querySelector(".screen.active");
    const isSupportOpen = Boolean(activeScreen && activeScreen.classList.contains("page16"));
    if (!isSupportOpen) {
      stopSupportChatPolling();
      return;
    }
    refreshSupportChatMessages({ silent: true, keepFeedback: true }).catch(() => {
      return;
    });
  }, 900);
}

async function openSupportChatPage() {
  const participantBeforeNavigation = getActiveSupportParticipant();
  goTo("page16");
  supportChatCachedMessages = [];
  supportChatLastRenderedAt = 0;
  activeSupportParticipantContext = participantBeforeNavigation;
  const participant = getActiveSupportParticipant();
  if (!participant) {
    setSupportChatFeedback("Connectez-vous pour parler au support.", "error");
    return;
  }
  const localMessages = getSupportLocalMessagesByParticipant(participant.participantEmail);
  if (localMessages.length > 0) {
    supportChatCachedMessages = localMessages;
    renderSupportChatMessages(localMessages, participant.participantType);
  }
  setSupportChatFeedback("Chargement...", "neutral");
  await refreshSupportChatMessages();
  startSupportChatPolling();
}

function getAllOrderChatLocalMessages() {
  try {
    const raw = localStorage.getItem(ORDER_CHAT_LOCAL_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveAllOrderChatLocalMessages(items) {
  try {
    localStorage.setItem(ORDER_CHAT_LOCAL_STORAGE_KEY, JSON.stringify(Array.isArray(items) ? items : []));
  } catch (error) {
    return;
  }
}

function getOrderChatLastSeenMap() {
  try {
    const raw = localStorage.getItem(ORDER_CHAT_LAST_SEEN_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function saveOrderChatLastSeenMap(map) {
  try {
    localStorage.setItem(
      ORDER_CHAT_LAST_SEEN_STORAGE_KEY,
      JSON.stringify(map && typeof map === "object" ? map : {})
    );
  } catch (error) {
    return;
  }
}

function markOrderChatSeen(requestId, seenAt = Date.now()) {
  const normalizedRequestId = String(requestId || "").trim();
  if (!normalizedRequestId) {
    return;
  }
  const timestamp = Number.isFinite(Number(seenAt)) ? Number(seenAt) : Date.now();
  const map = getOrderChatLastSeenMap();
  map[normalizedRequestId] = timestamp;
  saveOrderChatLastSeenMap(map);
}

function getOrderChatLastSeen(requestId) {
  const normalizedRequestId = String(requestId || "").trim();
  if (!normalizedRequestId) {
    return 0;
  }
  const map = getOrderChatLastSeenMap();
  const value = Number(map[normalizedRequestId]);
  return Number.isFinite(value) ? value : 0;
}

function getOrderChatLocalMessagesByRequestId(requestId) {
  const normalizedRequestId = String(requestId || "").trim();
  if (!normalizedRequestId) {
    return [];
  }

  return getAllOrderChatLocalMessages()
    .filter((entry) => String((entry && entry.commandeId) || "").trim() === normalizedRequestId)
    .sort((left, right) => {
      const leftDate = Date.parse(String((left && left.createdAt) || "")) || 0;
      const rightDate = Date.parse(String((right && right.createdAt) || "")) || 0;
      return leftDate - rightDate;
    });
}

function hasParticipantAccessToRequestIdLocally(requestId, participantEmail) {
  const normalizedRequestId = String(requestId || "").trim();
  const normalizedParticipantEmail = String(participantEmail || "").trim().toLowerCase();
  if (!normalizedRequestId || !normalizedParticipantEmail) {
    return false;
  }

  const matchingRequests = getAllClientOngoingRequests().filter(
    (entry) => String((entry && entry.id) || "").trim() === normalizedRequestId
  );
  if (!matchingRequests.length) {
    return false;
  }

  return matchingRequests.some((entry) => {
    const clientEmail = String((entry && entry.clientEmail) || "").trim().toLowerCase();
    const providerEmail = String((entry && entry.providerEmail) || "").trim().toLowerCase();
    return normalizedParticipantEmail === clientEmail || normalizedParticipantEmail === providerEmail;
  });
}

function getLocalRequestById(requestId) {
  const normalizedRequestId = String(requestId || "").trim();
  if (!normalizedRequestId) {
    return null;
  }
  return (
    getAllClientOngoingRequests().find(
      (entry) => String((entry && entry.id) || "").trim() === normalizedRequestId
    ) || null
  );
}

function canOpenOrderChatForRequestEntry(entry) {
  if (!entry) {
    return false;
  }

  const status = normalizeRequestLifecycleStatus(entry && entry.status, "");
  return status === "en_cours" || status === "en_attente_prestataire";
}

function resolveSelectedChatEligibleRequestId() {
  const selectedRequestId = String(selectedOngoingRequestId || "").trim();
  if (selectedRequestId) {
    const selectedEntry = getLocalRequestById(selectedRequestId);
    if (selectedEntry && canOpenOrderChatForRequestEntry(selectedEntry)) {
      return selectedRequestId;
    }
  }

  const fallbackEntry = getCurrentParticipantOngoingRequests().find((entry) =>
    canOpenOrderChatForRequestEntry(entry)
  );
  if (!fallbackEntry) {
    return "";
  }

  const fallbackRequestId = String((fallbackEntry && fallbackEntry.id) || "").trim();
  if (!fallbackRequestId) {
    return "";
  }

  selectedOngoingRequestId = fallbackRequestId;
  return fallbackRequestId;
}

function pushOrderChatLocalMessage(entry) {
  const normalizedEntry = entry && typeof entry === "object" ? entry : null;
  if (!normalizedEntry) {
    return null;
  }

  const nextItems = [normalizedEntry, ...getAllOrderChatLocalMessages()].slice(0, 500);
  saveAllOrderChatLocalMessages(nextItems);
  return normalizedEntry;
}

function removeOrderChatLocalMessagesByRequestId(requestId) {
  const normalizedRequestId = String(requestId || "").trim();
  if (!normalizedRequestId) {
    return;
  }

  const nextItems = getAllOrderChatLocalMessages().filter(
    (entry) => String((entry && entry.commandeId) || "").trim() !== normalizedRequestId
  );
  saveAllOrderChatLocalMessages(nextItems);
}

async function updateCommandeStatusForActiveParticipant(requestId, statut) {
  const normalizedRequestId = String(requestId || "").trim();
  const normalizedStatus = String(statut || "").trim().toLowerCase();
  const participant = getActiveChatParticipant();
  if (!normalizedRequestId || !participant || !participant.email || !normalizedStatus) {
    return false;
  }

  for (const apiBase of getApiCandidates()) {
    try {
      const response = await fetchWithTimeout(`${apiBase}/commandes/${encodeURIComponent(normalizedRequestId)}/statut`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantEmail: participant.email,
          statut: normalizedStatus
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Mise a jour statut commande impossible.");
      }

      saveApiBase(apiBase);
      return true;
    } catch (error) {
      if (isNetworkError(error)) {
        continue;
      }
      return false;
    }
  }

  return false;
}

function mapCommandeStatusToLocalStatus(statut) {
  return normalizeRequestLifecycleStatus(statut, "en_cours");
}

async function syncOngoingRequestsFromBackendForActiveParticipant() {
  const activeRole = resolveActiveProfileTypeForChat();
  const clientEmail = getActiveClientEmail();
  const providerEmail = getActiveProviderEmail();
  const useProviderQuery =
    activeRole === "prestataire" || (activeRole !== "client" && !clientEmail && Boolean(providerEmail));
  const participantEmail = useProviderQuery ? providerEmail : clientEmail || providerEmail;
  if (!participantEmail) {
    return;
  }

  const query = useProviderQuery
    ? `prestataireEmail=${encodeURIComponent(providerEmail)}`
    : `clientEmail=${encodeURIComponent(clientEmail)}`;

  let fetchedCommandes = [];
  for (const apiBase of getApiCandidates()) {
    try {
      const response = await fetchWithTimeout(`${apiBase}/commandes?${query}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Chargement des commandes impossible.");
      }

      fetchedCommandes = Array.isArray(payload.commandes) ? payload.commandes : [];
      saveApiBase(apiBase);
      break;
    } catch (error) {
      if (isNetworkError(error)) {
        continue;
      }
      break;
    }
  }

  if (!fetchedCommandes.length) {
    return;
  }

  const existing = getAllClientOngoingRequests();
  const upserted = [...existing];

  fetchedCommandes.forEach((commande) => {
    const commandeId = String((commande && (commande._id || commande.id)) || "").trim();
    if (!commandeId) {
      return;
    }

    const client = commande && commande.clientId ? commande.clientId : {};
    const provider = commande && commande.prestataireId ? commande.prestataireId : {};
    const localStatus = mapCommandeStatusToLocalStatus(commande && commande.statut);
    const providerName =
      `${String((provider && provider.prenom) || "").trim()} ${String((provider && provider.nom) || "").trim()}`.trim() ||
      String((provider && provider.email) || "Prestataire").trim();
    const clientName =
      `${String((client && client.prenom) || "").trim()} ${String((client && client.nom) || "").trim()}`.trim() ||
      String((client && client.email) || "Client").trim();
    const clientEmail = String((client && client.email) || "").trim().toLowerCase();
    const localClientAccount = clientEmail ? findClientAccountByEmail(clientEmail) : null;
    const providerCoordinates =
      provider && provider.location && Array.isArray(provider.location.coordinates)
        ? provider.location.coordinates
        : null;
    const providerGeoLongitude =
      providerCoordinates && providerCoordinates.length >= 2 ? parseOptionalNumberValue(providerCoordinates[0]) : null;
    const providerGeoLatitude =
      providerCoordinates && providerCoordinates.length >= 2 ? parseOptionalNumberValue(providerCoordinates[1]) : null;
    const providerCoverageLatitude = parseOptionalNumberValue(
      provider && provider.coverageLatitude != null
        ? provider.coverageLatitude
        : provider && provider.latitude != null
          ? provider.latitude
          : providerGeoLatitude
    );
    const providerCoverageLongitude = parseOptionalNumberValue(
      provider && provider.coverageLongitude != null
        ? provider.coverageLongitude
        : provider && provider.longitude != null
          ? provider.longitude
          : providerGeoLongitude
    );
    const providerCoverageAccuracy = parseOptionalNumberValue(
      provider && provider.coverageAccuracy != null
        ? provider.coverageAccuracy
        : provider && provider.locationAccuracy != null
          ? provider.locationAccuracy
          : provider && provider.accuracy != null
            ? provider.accuracy
            : null
    );
    const providerCoverageLocationLabel = String(
      (provider && (provider.coverageLocationLabel || provider.locationLabel)) || ""
    ).trim();

    const nextEntry = {
      id: commandeId,
      clientEmail,
      clientName,
      clientImage: String(
        (client && (client.photoProfil || client.photo || client.avatarUrl)) ||
          (localClientAccount &&
            (localClientAccount.photoProfil || localClientAccount.photo || localClientAccount.avatarUrl)) ||
          ""
      ).trim(),
      providerEmail: String((provider && provider.email) || "").trim().toLowerCase(),
      providerName,
      providerDomain: String((provider && (provider.domaine || provider.categorie)) || "").trim(),
      providerImage: String((provider && provider.photoProfil) || "").trim() || DEFAULT_PROVIDER_CARD_IMAGE,
      providerCoverageLatitude: Number.isFinite(Number(providerCoverageLatitude))
        ? Number(providerCoverageLatitude)
        : null,
      providerCoverageLongitude: Number.isFinite(Number(providerCoverageLongitude))
        ? Number(providerCoverageLongitude)
        : null,
      providerCoverageAccuracy: Number.isFinite(Number(providerCoverageAccuracy))
        ? Number(providerCoverageAccuracy)
        : null,
      providerCoverageLocationLabel,
      providerPrice: normalizeOngoingRequestPrice(commande && commande.distancePricingDh, `${DISTANCE_PRICE_BASE_DH}DH`),
      createdAt: String((commande && commande.createdAt) || new Date().toISOString()),
      status: localStatus
    };

    const existingIndex = upserted.findIndex((item) => String((item && item.id) || "").trim() === commandeId);
    if (existingIndex >= 0) {
      upserted[existingIndex] = {
        ...upserted[existingIndex],
        ...nextEntry
      };
    } else {
      upserted.push(nextEntry);
    }
  });

  saveAllClientOngoingRequests(upserted.slice(-250));
}

function getAllClientOngoingRequests() {
  try {
    const raw = localStorage.getItem(CLIENT_ONGOING_REQUESTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveAllClientOngoingRequests(items) {
  try {
    localStorage.setItem(CLIENT_ONGOING_REQUESTS_STORAGE_KEY, JSON.stringify(Array.isArray(items) ? items : []));
  } catch (error) {
    return;
  }
}

function getAllClientNotifications() {
  try {
    const raw = localStorage.getItem(CLIENT_NOTIFICATIONS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function getAllProviderNotifications() {
  try {
    const raw = localStorage.getItem(PROVIDER_NOTIFICATIONS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveAllClientNotifications(items) {
  try {
    localStorage.setItem(CLIENT_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(Array.isArray(items) ? items : []));
  } catch (error) {
    return;
  }
}

function saveAllProviderNotifications(items) {
  try {
    localStorage.setItem(PROVIDER_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(Array.isArray(items) ? items : []));
  } catch (error) {
    return;
  }
}

function formatNotificationDateLabel(rawDate) {
  const date = new Date(String(rawDate || ""));
  if (Number.isNaN(date.getTime())) {
    return "A l'instant";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function resolveNotificationIcon(type) {
  if (type === "provider_rating_received") {
    return NOTIFICATION_ICON_PROVIDER_RATING;
  }

  if (type === "provider_work_completed") {
    return NOTIFICATION_ICON_REQUEST_CREATED;
  }

  return type === "request_cancelled"
    ? NOTIFICATION_ICON_REQUEST_CANCELLED
    : NOTIFICATION_ICON_REQUEST_CREATED;
}

function getClientNotificationsForEmail(email) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (!normalizedEmail) {
    return [];
  }

  return getAllClientNotifications()
    .filter((entry) => String((entry && entry.clientEmail) || "").trim().toLowerCase() === normalizedEmail)
    .sort((left, right) => {
      const rightDate = Date.parse(String((right && right.createdAt) || "")) || 0;
      const leftDate = Date.parse(String((left && left.createdAt) || "")) || 0;
      return rightDate - leftDate;
    });
}

function getProviderNotificationsForEmail(email) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (!normalizedEmail) {
    return [];
  }

  return getAllProviderNotifications()
    .filter((entry) => String((entry && entry.providerEmail) || "").trim().toLowerCase() === normalizedEmail)
    .sort((left, right) => {
      const rightDate = Date.parse(String((right && right.createdAt) || "")) || 0;
      const leftDate = Date.parse(String((left && left.createdAt) || "")) || 0;
      return rightDate - leftDate;
    });
}

function renderClientNotifications() {
  const targets = [notificationsListPage8, notificationsListPage14, notificationsListPage15].filter(Boolean);
  if (!targets.length) {
    return;
  }

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const activeProviderAccount = getActiveProviderAccount();
  const activeProviderEmail = String((activeProviderAccount && activeProviderAccount.email) || "")
    .trim()
    .toLowerCase();
  const activeClientEmail = getActiveClientEmail();
  const isProviderSession = Boolean(activeProviderEmail);
  const notifications = isProviderSession
    ? getProviderNotificationsForEmail(activeProviderEmail).slice(0, 30)
    : getClientNotificationsForEmail(activeClientEmail).slice(0, 30);
  let markup = '<div class="p8n-empty">Aucune notification pour le moment.</div>';

  if ((activeClientEmail || activeProviderEmail) && notifications.length) {
    markup = notifications
      .map((entry, index) => {
        const message = escapeHtml(entry.message || "");
        const dateLabel = escapeHtml(formatNotificationDateLabel(entry.createdAt));
        const iconUrl = escapeHtml(resolveNotificationIcon(String(entry.type || "").trim().toLowerCase()));
        const separator = index < notifications.length - 1 ? '<div class="p8n-sep"></div>' : "";

        return `
          <div class="p8n-item">
            <button class="p8n-icon-btn" type="button" disabled aria-hidden="true" tabindex="-1">
              <img src="${iconUrl}" alt="">
            </button>
            <div class="p8n-item-content">
              <span class="p8n-text">${message}</span>
              <span class="p8n-meta">${dateLabel}</span>
            </div>
          </div>
          ${separator}
        `;
      })
      .join("");
  }

  targets.forEach((target) => {
    target.innerHTML = markup;
  });
}

function pushClientNotification(type, message, options = {}) {
  const resolvedEmail = String((options && options.clientEmail) || getActiveClientEmail() || "")
    .trim()
    .toLowerCase();
  const text = String(message || "").trim();
  if (!resolvedEmail || !text) {
    return null;
  }

  const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const nextEntry = {
    id,
    clientEmail: resolvedEmail,
    type: String(type || "request_created").trim().toLowerCase() || "request_created",
    message: text,
    requestId: String((options && options.requestId) || "").trim(),
    createdAt: new Date().toISOString()
  };

  const nextItems = [nextEntry, ...getAllClientNotifications()].slice(0, 150);
  saveAllClientNotifications(nextItems);
  renderClientNotifications();
  return nextEntry;
}

function pushProviderNotification(type, message, options = {}) {
  const resolvedEmail = String((options && options.providerEmail) || "").trim().toLowerCase();
  const text = String(message || "").trim();
  if (!resolvedEmail || !text) {
    return null;
  }

  const id = `provider-notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const nextEntry = {
    id,
    providerEmail: resolvedEmail,
    type: String(type || "provider_work_completed").trim().toLowerCase() || "provider_work_completed",
    message: text,
    requestId: String((options && options.requestId) || "").trim(),
    createdAt: new Date().toISOString()
  };

  const nextItems = [nextEntry, ...getAllProviderNotifications()].slice(0, 200);
  saveAllProviderNotifications(nextItems);
  renderClientNotifications();
  return nextEntry;
}

function normalizeRequestLifecycleStatus(value, fallbackStatus = "en_cours") {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return String(fallbackStatus || "en_cours").trim().toLowerCase() || "en_cours";
  }

  if (normalized === "en_attente" || normalized === "en_attente_prestataire" || normalized === "pending") {
    return "en_attente_prestataire";
  }
  if (normalized === "acceptee" || normalized === "accepted" || normalized === "en_cours") {
    return "en_cours";
  }
  if (normalized === "annule" || normalized === "annulee" || normalized === "refuse" || normalized === "refuse_prestataire") {
    return "annule";
  }
  if (normalized === "termine" || normalized === "terminee") {
    return "termine";
  }

  return normalized;
}

function getClientOngoingRequestsForEmail(email) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (!normalizedEmail) {
    return [];
  }

  return getAllClientOngoingRequests()
    .filter((entry) => String((entry && entry.clientEmail) || "").trim().toLowerCase() === normalizedEmail)
    .filter((entry) => normalizeRequestLifecycleStatus(entry && entry.status, "en_cours") === "en_cours")
    .sort((left, right) => {
      const rightDate = Date.parse(String((right && right.createdAt) || "")) || 0;
      const leftDate = Date.parse(String((left && left.createdAt) || "")) || 0;
      return rightDate - leftDate;
    });
}

function getProviderOngoingRequestsForEmail(email) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (!normalizedEmail) {
    return [];
  }

  return getAllClientOngoingRequests()
    .filter((entry) => String((entry && entry.providerEmail) || "").trim().toLowerCase() === normalizedEmail)
    .filter((entry) => {
      const status = normalizeRequestLifecycleStatus(entry && entry.status, "en_cours");
      return status === "en_cours" || status === "en_attente_prestataire";
    })
    .sort((left, right) => {
      const rightDate = Date.parse(String((right && right.createdAt) || "")) || 0;
      const leftDate = Date.parse(String((left && left.createdAt) || "")) || 0;
      return rightDate - leftDate;
    });
}

function getClientOngoingRequestById(requestId, email = getActiveClientEmail()) {
  const normalizedRequestId = String(requestId || "").trim();
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (!normalizedEmail || !normalizedRequestId) {
    return null;
  }

  return (
    getAllClientOngoingRequests().find((entry) => {
      const entryEmail = String((entry && entry.clientEmail) || "")
        .trim()
        .toLowerCase();
      const entryId = String((entry && entry.id) || "").trim();
      const entryStatus = normalizeRequestLifecycleStatus(entry && entry.status, "en_cours");
      return entryEmail === normalizedEmail && entryId === normalizedRequestId && entryStatus === "en_cours";
    }) || null
  );
}

function getClientRequestByIdAnyStatus(requestId, email = getActiveClientEmail()) {
  const normalizedRequestId = String(requestId || "").trim();
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (!normalizedEmail || !normalizedRequestId) {
    return null;
  }

  return (
    getAllClientOngoingRequests().find((entry) => {
      const entryEmail = String((entry && entry.clientEmail) || "")
        .trim()
        .toLowerCase();
      const entryId = String((entry && entry.id) || "").trim();
      return entryEmail === normalizedEmail && entryId === normalizedRequestId;
    }) || null
  );
}

function getLatestClientRequestForWaitingFlow(email = getActiveClientEmail()) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  return (
    getAllClientOngoingRequests()
      .filter((entry) => String((entry && entry.clientEmail) || "").trim().toLowerCase() === normalizedEmail)
      .sort((left, right) => {
        const rightDate = Date.parse(
          String((right && (right.updatedAt || right.cancelledAt || right.completedAt || right.createdAt)) || "")
        ) || 0;
        const leftDate = Date.parse(
          String((left && (left.updatedAt || left.cancelledAt || left.completedAt || left.createdAt)) || "")
        ) || 0;
        return rightDate - leftDate;
      })[0] || null
  );
}

function getClientFinishedRequestsForEmail(email) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (!normalizedEmail) {
    return [];
  }

  return getAllClientOngoingRequests()
    .filter((entry) => String((entry && entry.clientEmail) || "").trim().toLowerCase() === normalizedEmail)
    .filter((entry) => String((entry && entry.status) || "").trim().toLowerCase() === "termine")
    .sort((left, right) => {
      const rightDate =
        Date.parse(String((right && right.completedAt) || "")) ||
        Date.parse(String((right && right.createdAt) || "")) ||
        0;
      const leftDate =
        Date.parse(String((left && left.completedAt) || "")) ||
        Date.parse(String((left && left.createdAt) || "")) ||
        0;
      return rightDate - leftDate;
    });
}

function getProviderFinishedRequestsForEmail(email) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (!normalizedEmail) {
    return [];
  }

  return getAllClientOngoingRequests()
    .filter((entry) => String((entry && entry.providerEmail) || "").trim().toLowerCase() === normalizedEmail)
    .filter((entry) => normalizeRequestLifecycleStatus(entry && entry.status, "") === "termine")
    .sort((left, right) => {
      const rightDate =
        Date.parse(String((right && right.completedAt) || "")) ||
        Date.parse(String((right && right.createdAt) || "")) ||
        0;
      const leftDate =
        Date.parse(String((left && left.completedAt) || "")) ||
        Date.parse(String((left && left.createdAt) || "")) ||
        0;
      return rightDate - leftDate;
    });
}

function getClientCancelledRequestsForEmail(email) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (!normalizedEmail) {
    return [];
  }

  return getAllClientOngoingRequests()
    .filter((entry) => String((entry && entry.clientEmail) || "").trim().toLowerCase() === normalizedEmail)
    .filter((entry) => String((entry && entry.status) || "").trim().toLowerCase() === "annule")
    .sort((left, right) => {
      const rightDate =
        Date.parse(String((right && right.cancelledAt) || "")) ||
        Date.parse(String((right && right.createdAt) || "")) ||
        0;
      const leftDate =
        Date.parse(String((left && left.cancelledAt) || "")) ||
        Date.parse(String((left && left.createdAt) || "")) ||
        0;
      return rightDate - leftDate;
    });
}

function wasRequestCancelledByClient(entry) {
  const actor = String(
    (entry && (entry.cancellationActor || entry.cancelledBy || entry.cancellationSource || "")) || ""
  )
    .trim()
    .toLowerCase();
  if (actor) {
    return actor === "client";
  }

  const providerDecision = String((entry && entry.providerDecision) || "")
    .trim()
    .toLowerCase();
  if (providerDecision === "refuse") {
    return false;
  }

  const cancellationReason = String((entry && entry.cancellationReason) || "")
    .trim()
    .toLowerCase();
  if (cancellationReason.includes("prestataire n'est pas en mesure d'accepter")) {
    return false;
  }

  return normalizeRequestLifecycleStatus(entry && entry.status, "") === "annule";
}

function getProviderCancelledRequestsByClientForEmail(email) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (!normalizedEmail) {
    return [];
  }

  return getAllClientOngoingRequests()
    .filter((entry) => String((entry && entry.providerEmail) || "").trim().toLowerCase() === normalizedEmail)
    .filter((entry) => normalizeRequestLifecycleStatus(entry && entry.status, "") === "annule")
    .filter((entry) => wasRequestCancelledByClient(entry))
    .sort((left, right) => {
      const rightDate =
        Date.parse(String((right && right.cancelledAt) || "")) ||
        Date.parse(String((right && right.createdAt) || "")) ||
        0;
      const leftDate =
        Date.parse(String((left && left.cancelledAt) || "")) ||
        Date.parse(String((left && left.createdAt) || "")) ||
        0;
      return rightDate - leftDate;
    });
}

function renderPage22FinishedRequests() {
  if (!page22FinishedRequestsList) {
    return;
  }
  syncRequestHistoryTabsVisibility();

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const fallbackCardImage = escapeHtml(resolveAccountPhotoSrc(DEFAULT_PROVIDER_CARD_IMAGE));
  const isProviderSession = isProviderRequestSessionActive();
  const activeEmail = isProviderSession ? getActiveProviderEmail() : getActiveClientEmail();
  const finishedRequests = isProviderSession
    ? getProviderFinishedRequestsForEmail(activeEmail)
    : getClientFinishedRequestsForEmail(activeEmail);
  if (!activeEmail || !finishedRequests.length) {
    page22FinishedRequestsList.innerHTML =
      '<div class="page22-finished-empty">Aucune demande terminée pour le moment.</div>';
    return;
  }

  const rowsMarkup = finishedRequests
    .map((entry, index) => {
      const providerDate = escapeHtml(formatOngoingRequestDateLabel(entry.completedAt || entry.createdAt));
      const providerPrice = escapeHtml(normalizeOngoingRequestPrice(entry.providerPrice, "200DH"));
      const ratingValue = Number(entry && entry.completionRating);
      const ratingLabel = Number.isFinite(ratingValue) && ratingValue >= 1 ? `${Math.round(ratingValue)}/5` : "-";
      const separator = index < finishedRequests.length - 1 ? '<div class="box4"></div>' : '<div class="box5"></div>';

      if (isProviderSession) {
        const clientEmail = String((entry && entry.clientEmail) || "").trim().toLowerCase();
        const clientAccount = findClientAccountByEmail(clientEmail);
        const clientDisplayName = escapeHtml(
          String((entry && (entry.clientName || entry.clientEmail)) || "Client").trim() || "Client"
        );
        const clientImage = escapeHtml(
          resolveAccountPhotoSrc(
            (clientAccount && (clientAccount.photoProfil || clientAccount.photo || clientAccount.avatarUrl)) ||
              entry.clientImage ||
              DEFAULT_USER_AVATAR_URL
          )
        );
        const completionMeta = escapeHtml(`Note: ${ratingLabel}`);

        return `
          <div class="row-view3">
            <img
              src="${clientImage}"
              alt="Profil ${clientDisplayName}"
              class="image2"
              onerror="this.onerror=null;this.src='${fallbackCardImage}'"
            >
            <div class="column">
              <span class="text4">${clientDisplayName}</span>
              <span class="text5">${providerDate}</span>
              <div class="row-view4">
                <img src="${FINISHED_REQUEST_STATUS_ICON}" alt="" class="image3">
                <span class="text6">intervention terminee</span>
              </div>
              <span class="page22-finished-meta">${completionMeta}</span>
            </div>
            <div class="box3"></div>
            <div class="column2">
              <span class="text8">${providerPrice}</span>
              <span class="text9">Client</span>
            </div>
          </div>
          ${separator}
        `;
      }

      const requestDomain = escapeHtml(formatOrderProviderDomainLabel(entry.providerDomain || entry.providerName));
      const providerImage = escapeHtml(resolveAccountPhotoSrc(entry.providerImage || DEFAULT_PROVIDER_CARD_IMAGE));
      const providerName = escapeHtml(formatProviderFirstName(entry.providerName || "Prestataire") || "Prestataire");
      const workDone = String((entry && entry.completionWorkDone) || "").trim().toLowerCase();
      const isNotValidated = workDone === "no" || workDone === "false";
      const statusText = isNotValidated ? "travail non valide" : "service effectue";
      const photoCountCandidate = Number(entry && entry.completionPhotoCount);
      const photoCountFromNames = Array.isArray(entry && entry.completionPhotoNames)
        ? entry.completionPhotoNames.length
        : 0;
      const photoCount = Number.isFinite(photoCountCandidate) ? Math.max(0, Math.round(photoCountCandidate)) : photoCountFromNames;
      const photoSuffix = photoCount > 1 ? "s" : "";
      const completionMeta = escapeHtml(`Note: ${ratingLabel} | Preuves: ${photoCount} photo${photoSuffix}`);
      const statusClass = isNotValidated ? "page22-service-not-validated" : "";

      return `
        <div class="row-view3">
          <img
            src="${providerImage}"
            alt="Service ${requestDomain}"
            class="image2"
            onerror="this.onerror=null;this.src='${fallbackCardImage}'"
          >
          <div class="column">
            <span class="text4">${requestDomain}</span>
            <span class="text5">${providerDate}</span>
            <div class="row-view4">
              <img src="${FINISHED_REQUEST_STATUS_ICON}" alt="" class="image3">
              <span class="text6 ${statusClass}">${statusText}</span>
            </div>
            <span class="page22-finished-meta">${completionMeta}</span>
          </div>
          <div class="box3"></div>
          <div class="column2">
            <span class="text8">${providerPrice}</span>
            <span class="text9">${providerName}</span>
          </div>
        </div>
        ${separator}
      `;
    })
    .join("");

  page22FinishedRequestsList.innerHTML = rowsMarkup;
}

function renderPage23CancelledRequests() {
  if (!page23CancelledRequestsList) {
    return;
  }
  syncRequestHistoryTabsVisibility();

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const fallbackCardImage = escapeHtml(resolveAccountPhotoSrc(DEFAULT_PROVIDER_CARD_IMAGE));

  const isProviderSession = isProviderRequestSessionActive();
  const activeEmail = isProviderSession ? getActiveProviderEmail() : getActiveClientEmail();
  const cancelledRequests = isProviderSession
    ? getProviderCancelledRequestsByClientForEmail(activeEmail)
    : getClientCancelledRequestsForEmail(activeEmail);

  if (!activeEmail || !cancelledRequests.length) {
    page23CancelledRequestsList.innerHTML =
      isProviderSession
        ? '<div class="page23-cancelled-empty">Aucune demande annulée par les clients pour le moment.</div>'
        : '<div class="page23-cancelled-empty">Aucune demande annulée pour le moment.</div>';
    return;
  }

  const rowsMarkup = cancelledRequests
    .map((entry, index) => {
      const requestDomain = escapeHtml(formatOrderProviderDomainLabel(entry.providerDomain || entry.providerName));
      const cancelledDate = escapeHtml(formatOngoingRequestDateLabel(entry.cancelledAt || entry.createdAt));
      const requestPrice = escapeHtml(normalizeOngoingRequestPrice(entry.providerPrice, "200DH"));
      const clientNameRaw = String((entry && (entry.clientName || entry.clientEmail)) || "Client").trim();
      const providerNameRaw = String((entry && entry.providerName) || "Prestataire").trim();
      const counterpartName = escapeHtml(isProviderSession ? clientNameRaw : providerNameRaw);
      const counterpartImage = escapeHtml(
        resolveAccountPhotoSrc(
          isProviderSession
            ? String((entry && (entry.clientImage || entry.clientPhoto)) || "").trim() || DEFAULT_PROVIDER_CARD_IMAGE
            : String((entry && entry.providerImage) || "").trim() || DEFAULT_PROVIDER_CARD_IMAGE
        )
      );
      const rightLabel = escapeHtml(isProviderSession ? requestDomain : counterpartName);
      const cancelledStatusText = isProviderSession ? "annule par client" : "service annule";
      const separator = index < cancelledRequests.length - 1 ? '<div class="box4"></div>' : '<div class="box5"></div>';

      return `
        <div class="row-view3">
          <img
            src="${counterpartImage}"
            alt="Profil ${counterpartName}"
            class="image2"
            onerror="this.onerror=null;this.src='${fallbackCardImage}'"
          >
          <div class="column">
            <span class="text4">${isProviderSession ? counterpartName : requestDomain}</span>
            <span class="text5">${cancelledDate}</span>
            <div class="row-view4">
              <img src="${NOTIFICATION_ICON_REQUEST_CANCELLED}" alt="" class="image3">
              <span class="text6 page23-service-cancelled">${cancelledStatusText}</span>
            </div>
          </div>
          <div class="box3"></div>
          <div class="column2">
            <span class="text8">${requestPrice}</span>
            <span class="text9">${rightLabel}</span>
          </div>
        </div>
        ${separator}
      `;
    })
    .join("");

  page23CancelledRequestsList.innerHTML = rowsMarkup;
}

function applyProviderDecisionToRequestById(requestId, decision = "") {
  const normalizedRequestId = String(requestId || "").trim();
  const normalizedDecision = String(decision || "").trim().toLowerCase();
  const activeProviderEmail = getActiveProviderEmail();
  if (!activeProviderEmail || !normalizedRequestId) {
    return null;
  }
  if (normalizedDecision !== "accept" && normalizedDecision !== "reject") {
    return null;
  }

  let updatedEntry = null;
  const nowIso = new Date().toISOString();
  const nextItems = getAllClientOngoingRequests().map((entry) => {
    const entryId = String((entry && entry.id) || "").trim();
    const entryProviderEmail = String((entry && entry.providerEmail) || "")
      .trim()
      .toLowerCase();
    const entryStatus = normalizeRequestLifecycleStatus(entry && entry.status, "en_cours");

    if (
      !updatedEntry &&
      entryId === normalizedRequestId &&
      entryProviderEmail === activeProviderEmail &&
      (entryStatus === "en_attente_prestataire" || entryStatus === "en_cours")
    ) {
      if (normalizedDecision === "accept") {
        updatedEntry = {
          ...entry,
          status: "en_cours",
          providerDecision: "accepte",
          providerDecisionAt: nowIso,
          acceptedAt: nowIso,
          updatedAt: nowIso
        };
        return updatedEntry;
      }

      updatedEntry = {
        ...entry,
        status: "annule",
        providerDecision: "refuse",
        providerDecisionAt: nowIso,
        cancellationActor: "prestataire",
        cancelledAt: nowIso,
        cancellationReason: "Le prestataire n'est pas en mesure d'accepter la demande.",
        updatedAt: nowIso
      };
      return updatedEntry;
    }

    return entry;
  });

  if (!updatedEntry) {
    return null;
  }

  saveAllClientOngoingRequests(nextItems);
  renderPage10OngoingRequests();
  renderPage23CancelledRequests();
  return updatedEntry;
}

function cancelClientOngoingRequestById(requestId, cancellationReason = "") {
  const normalizedRequestId = String(requestId || "").trim();
  const activeClientEmail = getActiveClientEmail();
  if (!activeClientEmail || !normalizedRequestId) {
    return null;
  }

  const reason = String(cancellationReason || "").trim();
  let cancelledEntry = null;
  const nextItems = getAllClientOngoingRequests().map((entry) => {
    const entryEmail = String((entry && entry.clientEmail) || "")
      .trim()
      .toLowerCase();
    const entryId = String((entry && entry.id) || "").trim();
    const entryStatus = String((entry && entry.status) || "en_cours")
      .trim()
      .toLowerCase();

    if (
      !cancelledEntry &&
      entryEmail === activeClientEmail &&
      entryId === normalizedRequestId &&
      entryStatus === "en_cours"
    ) {
      cancelledEntry = {
        ...entry,
        status: "annule",
        cancellationActor: "client",
        cancelledAt: new Date().toISOString(),
        cancellationReason: reason
      };
      return cancelledEntry;
    }

    return entry;
  });

  if (!cancelledEntry) {
    return null;
  }

  saveAllClientOngoingRequests(nextItems);
  renderPage10OngoingRequests();
  renderPage23CancelledRequests();
  return cancelledEntry;
}

function hydrateCurrentOrderContextFromOngoingRequest(entry) {
  if (!entry || typeof entry !== "object") {
    return;
  }

  const existingProfile = currentOrderProviderProfile && typeof currentOrderProviderProfile === "object"
    ? currentOrderProviderProfile
    : {};
  const nextCoverageLatitude = Number(entry.providerCoverageLatitude);
  const nextCoverageLongitude = Number(entry.providerCoverageLongitude);
  const nextCoverageAccuracy = Number(entry.providerCoverageAccuracy);

  currentOrderProviderProfile = {
    ...existingProfile,
    name: String(entry.providerName || existingProfile.name || "Prestataire").trim() || "Prestataire",
    rating: String(existingProfile.rating || "4.7").trim() || "4.7",
    price: normalizeOngoingRequestPrice(entry.providerPrice, `${DISTANCE_PRICE_BASE_DH}DH`),
    domain: String(entry.providerDomain || existingProfile.domain || "").trim(),
    description: String(existingProfile.description || "").trim(),
    image: String(entry.providerImage || existingProfile.image || DEFAULT_PROVIDER_CARD_IMAGE).trim() || DEFAULT_PROVIDER_CARD_IMAGE,
    email: String(entry.providerEmail || existingProfile.email || "").trim().toLowerCase(),
    coverageLatitude: Number.isFinite(nextCoverageLatitude)
      ? nextCoverageLatitude
      : Number.isFinite(Number(existingProfile.coverageLatitude))
        ? Number(existingProfile.coverageLatitude)
        : null,
    coverageLongitude: Number.isFinite(nextCoverageLongitude)
      ? nextCoverageLongitude
      : Number.isFinite(Number(existingProfile.coverageLongitude))
        ? Number(existingProfile.coverageLongitude)
        : null,
    coverageAccuracy: Number.isFinite(nextCoverageAccuracy)
      ? nextCoverageAccuracy
      : Number.isFinite(Number(existingProfile.coverageAccuracy))
        ? Number(existingProfile.coverageAccuracy)
        : null,
    coverageLocationLabel: String(entry.providerCoverageLocationLabel || existingProfile.coverageLocationLabel || "").trim(),
    serviceRadiusKm: normalizeProviderServiceRadiusKm(
      entry.providerServiceRadiusKm != null ? entry.providerServiceRadiusKm : existingProfile.serviceRadiusKm,
      5
    )
  };

  const addressLabel = String(entry.serviceAddressLabel || entry.addressLabel || "").trim();
  const serviceDistanceKm = Number(entry.serviceDistanceKm);
  const servicePriceDh = Number(entry.serviceCalculatedPriceDh);
  const serviceLatitude = Number(entry.serviceLatitude);
  const serviceLongitude = Number(entry.serviceLongitude);
  const hasServiceCoordinates = isValidLatLngCoordinates(serviceLatitude, serviceLongitude);

  if (addressLabel) {
    currentOrderTracking.addressLabel = addressLabel;
  }
  currentOrderTracking.distanceKm = Number.isFinite(serviceDistanceKm) ? serviceDistanceKm : null;
  currentOrderTracking.calculatedPriceDh = Number.isFinite(servicePriceDh) ? servicePriceDh : null;
  currentOrderTracking.latitude = hasServiceCoordinates ? serviceLatitude : null;
  currentOrderTracking.longitude = hasServiceCoordinates ? serviceLongitude : null;
  currentOrderTracking.addressSource = hasServiceCoordinates ? "manual_map" : "manual";
  currentOrderTracking.addressConfirmed =
    hasServiceCoordinates &&
    Number.isFinite(serviceDistanceKm) &&
    Number.isFinite(servicePriceDh);

  applyCurrentOrderDemandSummary();
  applyCurrentOrderTrackingSummary();
}

function completeClientOngoingRequestById(requestId, completionPayload = {}) {
  const normalizedRequestId = String(requestId || "").trim();
  const activeClientEmail = getActiveClientEmail();
  if (!activeClientEmail || !normalizedRequestId) {
    return null;
  }

  const rawWorkDone = String((completionPayload && completionPayload.workDone) || "")
    .trim()
    .toLowerCase();
  const normalizedWorkDone =
    rawWorkDone === "yes" || rawWorkDone === "true" ? "yes" : rawWorkDone === "no" || rawWorkDone === "false" ? "no" : "";
  const rawRating = Number(completionPayload && completionPayload.rating);
  const normalizedRating = Number.isFinite(rawRating)
    ? Math.max(1, Math.min(5, Math.round(rawRating)))
    : null;
  const photoNames = Array.isArray(completionPayload && completionPayload.photoNames)
    ? completionPayload.photoNames
        .map((value) => String(value || "").trim())
        .filter((value) => Boolean(value))
        .slice(0, 20)
    : [];

  let completedEntry = null;
  const nextItems = getAllClientOngoingRequests().map((entry) => {
    const entryEmail = String((entry && entry.clientEmail) || "")
      .trim()
      .toLowerCase();
    const entryId = String((entry && entry.id) || "").trim();
    const entryStatus = String((entry && entry.status) || "en_cours")
      .trim()
      .toLowerCase();

    if (
      !completedEntry &&
      entryEmail === activeClientEmail &&
      entryId === normalizedRequestId &&
      entryStatus === "en_cours"
    ) {
      completedEntry = {
        ...entry,
        status: "termine",
        completedAt: new Date().toISOString(),
        completionWorkDone: normalizedWorkDone || "yes",
        completionRating: normalizedRating,
        completionPhotoCount: photoNames.length,
        completionPhotoNames: photoNames
      };
      return completedEntry;
    }

    return entry;
  });

  if (!completedEntry) {
    return null;
  }

  saveAllClientOngoingRequests(nextItems);
  renderPage10OngoingRequests();
  renderPage22FinishedRequests();
  return completedEntry;
}

function buildOngoingRequestId(payload) {
  const payloadCommande =
    payload && payload.commande && typeof payload.commande === "object" ? payload.commande : null;
  const candidate =
    (payload && (payload.commandeId || payload.id || payload._id)) ||
    (payloadCommande && (payloadCommande.id || payloadCommande._id || payloadCommande.numero));
  const normalizedCandidate = String(candidate || "").trim();

  if (normalizedCandidate) {
    return normalizedCandidate;
  }

  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeOngoingRequestPrice(rawPrice, fallbackPrice = "200DH") {
  const fallbackLabel = String(fallbackPrice || "").trim() || "200DH";
  if (Number.isFinite(Number(rawPrice))) {
    return `${Math.round(Number(rawPrice))}DH`;
  }

  const asText = String(rawPrice || "").trim();
  if (!asText) {
    return fallbackLabel;
  }

  if (/dh/i.test(asText)) {
    return asText.replace(/\s+/g, "").toUpperCase();
  }

  const numberMatch = asText.replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  if (numberMatch && numberMatch[0]) {
    return `${Math.round(Number(numberMatch[0]))}DH`;
  }

  return asText;
}

function formatOngoingRequestDateLabel(rawDate) {
  const date = new Date(String(rawDate || ""));
  if (Number.isNaN(date.getTime())) {
    return "Maintenant";
  }

  const monthNames = [
    "Janvier",
    "Fevrier",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Aout",
    "Septembre",
    "Octobre",
    "Novembre",
    "Decembre"
  ];
  const day = String(date.getDate());
  const month = monthNames[date.getMonth()] || "";
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${day} ${month} , ${hour}:${minute}`;
}

function formatPage19RequestDateTime(rawDate) {
  const date = new Date(String(rawDate || ""));
  if (Number.isNaN(date.getTime())) {
    return "Demande enregistree aujourd'hui";
  }

  const weekday = new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(date);
  const day = new Intl.DateTimeFormat("fr-FR", { day: "2-digit" }).format(date);
  const hour = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", hour12: false }).format(date);
  const minute = new Intl.DateTimeFormat("fr-FR", { minute: "2-digit" }).format(date);
  return `Demande le ${weekday}, ${day}, ${hour}H${minute}`;
}

function applyPage19RequestDateTime(rawDate = "") {
  if (!page19RequestDatetime) {
    return;
  }

  const resolvedDate = String(rawDate || lastPaidRequestTimestamp || "").trim();
  page19RequestDatetime.textContent = formatPage19RequestDateTime(resolvedDate);
}

function saveCurrentOrderToOngoingRequests(payload = null) {
  const clientEmail = getActiveClientEmail();
  const clientAccount = getActiveClientAccount();
  if (!clientEmail) {
    return;
  }

  const providerProfile = getCurrentOrderProviderProfile();
  if (!providerProfile || !providerProfile.name) {
    return;
  }

  const pricing = payload && payload.pricing && typeof payload.pricing === "object" ? payload.pricing : null;
  const payloadPrice =
    (pricing && (pricing.totalDh || pricing.total || pricing.amountDh || pricing.priceDh || pricing.price)) ||
    (payload && (payload.totalDh || payload.montantDh || payload.montant || payload.priceDh || payload.price));
  const trackedPriceDh = Number(currentOrderTracking && currentOrderTracking.calculatedPriceDh);
  const effectivePrice = Number.isFinite(trackedPriceDh) ? trackedPriceDh : payloadPrice;
  const serviceDistanceKm = Number(currentOrderTracking && currentOrderTracking.distanceKm);
  const serviceLatitude = Number(currentOrderTracking && currentOrderTracking.latitude);
  const serviceLongitude = Number(currentOrderTracking && currentOrderTracking.longitude);
  const providerCoverageLatitude = Number(providerProfile && providerProfile.coverageLatitude);
  const providerCoverageLongitude = Number(providerProfile && providerProfile.coverageLongitude);
  const providerCoverageAccuracy = Number(providerProfile && providerProfile.coverageAccuracy);
  const payloadCommande =
    payload && payload.commande && typeof payload.commande === "object" ? payload.commande : null;
  const initialRequestStatus = mapCommandeStatusToLocalStatus(
    (payloadCommande && payloadCommande.statut) || (payload && payload.statut) || "en_attente"
  );
  const resolvedProviderEmail = resolveProviderEmailForRequest({
    providerEmail: providerProfile && providerProfile.email,
    providerName: providerProfile && providerProfile.name,
    providerDomain: providerProfile && providerProfile.domain
  });
  const requestId = buildOngoingRequestId(payload);
  const newEntry = {
    id: requestId,
    clientEmail,
    clientName:
      `${String((clientAccount && clientAccount.prenom) || "").trim()} ${String((clientAccount && clientAccount.nom) || "").trim()}`.trim() ||
      clientEmail,
    clientImage: String(
      (clientAccount && (clientAccount.photoProfil || clientAccount.photo || clientAccount.avatarUrl)) || ""
    ).trim(),
    providerName: String(providerProfile.name || "Technicien").trim() || "Technicien",
    providerImage: String(providerProfile.image || DEFAULT_PROVIDER_CARD_IMAGE).trim() || DEFAULT_PROVIDER_CARD_IMAGE,
    providerPrice: normalizeOngoingRequestPrice(effectivePrice, `${DISTANCE_PRICE_BASE_DH}DH`),
    providerEmail: resolvedProviderEmail,
    providerDomain: String(providerProfile.domain || "").trim(),
    providerCoverageLatitude: Number.isFinite(providerCoverageLatitude) ? providerCoverageLatitude : null,
    providerCoverageLongitude: Number.isFinite(providerCoverageLongitude) ? providerCoverageLongitude : null,
    providerCoverageAccuracy: Number.isFinite(providerCoverageAccuracy) ? providerCoverageAccuracy : null,
    providerCoverageLocationLabel: String((providerProfile && providerProfile.coverageLocationLabel) || "").trim(),
    providerServiceRadiusKm: normalizeProviderServiceRadiusKm(providerProfile && providerProfile.serviceRadiusKm, 5),
    serviceAddressLabel: String((currentOrderTracking && currentOrderTracking.addressLabel) || DEFAULT_ORDER_ADDRESS_LABEL).trim(),
    serviceDistanceKm: Number.isFinite(serviceDistanceKm) ? serviceDistanceKm : null,
    serviceCalculatedPriceDh: Number.isFinite(trackedPriceDh) ? trackedPriceDh : null,
    serviceLatitude: isValidLatLngCoordinates(serviceLatitude, serviceLongitude) ? serviceLatitude : null,
    serviceLongitude: isValidLatLngCoordinates(serviceLatitude, serviceLongitude) ? serviceLongitude : null,
    createdAt: new Date().toISOString(),
    status: initialRequestStatus || "en_attente_prestataire",
    providerDecision: initialRequestStatus === "en_cours" ? "accepte" : "en_attente"
  };

  const deduped = [
    newEntry,
    ...getAllClientOngoingRequests().filter(
      (entry) =>
        !(
          String((entry && entry.clientEmail) || "")
            .trim()
            .toLowerCase() === clientEmail && String((entry && entry.id) || "").trim() === requestId
        )
    )
  ];
  saveAllClientOngoingRequests(deduped.slice(0, 80));
  renderPage10OngoingRequests();
  return newEntry;
}

function escapeHtmlForChat(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatOrderChatDate(rawDate) {
  const date = new Date(String(rawDate || ""));
  if (Number.isNaN(date.getTime())) {
    return "A l'instant";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function setOrderChatFeedback(message = "", type = "neutral") {
  const targets = [orderChatFeedback, page33ChatFeedback].filter(Boolean);
  if (!targets.length) {
    return;
  }

  targets.forEach((target) => {
    const baseClass = target === page33ChatFeedback ? "page33-chat-feedback" : "order-chat-feedback";
    target.className = baseClass;
    if (type === "error") {
      target.classList.add("error");
    } else if (type === "success") {
      target.classList.add("success");
    }
    target.textContent = String(message || "").trim();
  });
}

function renderOrderChatMessages(messages = [], currentUser = null) {
  const containers = [orderChatMessages, page33ChatMessages].filter(Boolean);
  if (!containers.length) {
    return;
  }

  const normalizedCurrentUserId = String((currentUser && (currentUser.id || currentUser.email)) || "")
    .trim()
    .toLowerCase();
  const normalizedCurrentUserEmail = String((currentUser && currentUser.email) || "")
    .trim()
    .toLowerCase();
  const normalizedCurrentSenderType = String((currentUser && currentUser.senderType) || "")
    .trim()
    .toLowerCase();
  const requestId = String(activeOrderChatRequestId || "").trim();
  const requestEntry =
    getCurrentParticipantRequestById(requestId) ||
    getAllClientOngoingRequests().find((entry) => String((entry && entry.id) || "").trim() === requestId) ||
    null;
  const dedupeName = (rawValue) => {
    const value = String(rawValue || "").trim();
    if (!value) {
      return "";
    }
    const tokens = value.split(/\s+/).filter(Boolean);
    if (tokens.length === 2 && tokens[0].toLowerCase() === tokens[1].toLowerCase()) {
      return tokens[0];
    }
    return value;
  };
  const requestClientEmail = String((requestEntry && requestEntry.clientEmail) || "")
    .trim()
    .toLowerCase();
  const requestProviderEmail = String((requestEntry && requestEntry.providerEmail) || "")
    .trim()
    .toLowerCase();
  const activeClientEmail = getActiveClientEmail();
  const activeProviderEmail = getActiveProviderEmail();
  const activeClientAccount = getActiveClientAccount();
  const activeProviderAccount = getActiveProviderAccount();
  const activeClientName = buildParticipantDisplayName(
    activeClientAccount && activeClientAccount.prenom,
    activeClientAccount && activeClientAccount.nom,
    activeClientEmail
  );
  const activeProviderName = buildParticipantDisplayName(
    activeProviderAccount && activeProviderAccount.prenom,
    activeProviderAccount && activeProviderAccount.nom,
    activeProviderEmail
  );
  const requestClientName = dedupeName(String((requestEntry && requestEntry.clientName) || "").trim()) || activeClientName;
  const requestProviderName =
    dedupeName(String((requestEntry && requestEntry.providerName) || "").trim()) || activeProviderName;

  const resolveNameFromStoredAccounts = (senderType, senderEmail) => {
    const normalizedType = String(senderType || "").trim().toLowerCase();
    const normalizedEmail = String(senderEmail || "").trim().toLowerCase();
    if (!normalizedEmail) {
      return "";
    }
    if (normalizedType === "client") {
      const account = findClientAccountByEmail(normalizedEmail);
      return buildParticipantDisplayName(account && account.prenom, account && account.nom, normalizedEmail);
    }
    if (normalizedType === "prestataire") {
      const account = findProviderAccountByEmail(normalizedEmail);
      return buildParticipantDisplayName(account && account.prenom, account && account.nom, normalizedEmail);
    }
    return "";
  };

  const inferSenderType = (senderEmail, senderType) => {
    const normalizedType = String(senderType || "").trim().toLowerCase();
    if (normalizedType === "client" || normalizedType === "prestataire") {
      return normalizedType;
    }
    const normalizedEmail = String(senderEmail || "").trim().toLowerCase();
    if (!normalizedEmail) {
      return "";
    }
    if (requestClientEmail && normalizedEmail === requestClientEmail) {
      return "client";
    }
    if (requestProviderEmail && normalizedEmail === requestProviderEmail) {
      return "prestataire";
    }
    if (activeClientEmail && normalizedEmail === activeClientEmail && activeClientEmail !== activeProviderEmail) {
      return "client";
    }
    if (activeProviderEmail && normalizedEmail === activeProviderEmail && activeClientEmail !== activeProviderEmail) {
      return "prestataire";
    }
    return "";
  };

  const resolveDisplayName = (entry, senderEmail, senderType) => {
    const normalizedType = String(senderType || "").trim().toLowerCase();
    const normalizedEmail = String(senderEmail || "").trim().toLowerCase();
    const rawSenderName = dedupeName(String((entry && entry.senderName) || "").trim());
    const accountName = dedupeName(resolveNameFromStoredAccounts(normalizedType, normalizedEmail));

    if (normalizedType === "client") {
      if (requestClientEmail && normalizedEmail === requestClientEmail && requestClientName) {
        return requestClientName;
      }
      if (normalizedEmail && normalizedEmail === activeClientEmail && activeClientName) {
        return dedupeName(activeClientName);
      }
      return accountName || requestClientName || rawSenderName || normalizedEmail || "Client";
    }
    if (normalizedType === "prestataire") {
      if (requestProviderEmail && normalizedEmail === requestProviderEmail && requestProviderName) {
        return requestProviderName;
      }
      if (normalizedEmail && normalizedEmail === activeProviderEmail && activeProviderName) {
        return dedupeName(activeProviderName);
      }
      return accountName || requestProviderName || rawSenderName || normalizedEmail || "Prestataire";
    }
    return rawSenderName || normalizedEmail || "Utilisateur";
  };
  const rows = Array.isArray(messages) ? messages : [];
  const sanitizedRows = rows.filter((entry) => String((entry && entry.message) || "").trim().length > 0);
  if (!sanitizedRows.length) {
    containers.forEach((container) => {
      container.innerHTML = '<div class="order-chat-empty">Aucun message pour cette commande.</div>';
    });
    return;
  }

  const markup = sanitizedRows
    .map((entry) => {
      const senderEmail = String((entry && entry.senderEmail) || "").trim().toLowerCase();
      const senderId = String((entry && (entry.senderId || entry.senderEmail)) || "").trim().toLowerCase();
      const senderTypeRaw = String((entry && entry.senderType) || "").trim().toLowerCase();
      const senderType = inferSenderType(senderEmail, senderTypeRaw);
      const senderName = escapeHtmlForChat(resolveDisplayName(entry, senderEmail, senderType));
      const messageText = escapeHtmlForChat(entry && entry.message ? entry.message : "");
      const dateLabel = escapeHtmlForChat(formatOrderChatDate(entry && entry.createdAt));
      const identityCandidates = new Set();
      if (normalizedCurrentUserId) {
        identityCandidates.add(normalizedCurrentUserId);
      }
      if (normalizedCurrentUserEmail) {
        identityCandidates.add(normalizedCurrentUserEmail);
      }
      if (normalizedCurrentSenderType === "client" && activeClientEmail) {
        identityCandidates.add(activeClientEmail);
      }
      if (normalizedCurrentSenderType === "prestataire" && activeProviderEmail) {
        identityCandidates.add(activeProviderEmail);
      }
      const isMe = Array.from(identityCandidates).some(
        (identity) => Boolean(identity) && (senderId === identity || senderEmail === identity)
      );
      const rowClass = isMe ? "order-chat-item is-me" : "order-chat-item";
      return `
        <div class="${rowClass}">
          <span class="order-chat-meta">${senderName} • ${dateLabel}</span>
          <div class="order-chat-bubble">${messageText}</div>
        </div>
      `;
    })
    .join("");

  containers.forEach((container) => {
    container.innerHTML = markup;
    container.scrollTop = container.scrollHeight;
  });
}

async function fetchOrderChatMessages(requestId, participant) {
  const normalizedRequestId = String(requestId || "").trim();
  if (!normalizedRequestId || !participant || !participant.email) {
    return [];
  }

  const localRequest = getLocalRequestById(normalizedRequestId);
  if (localRequest && !canOpenOrderChatForRequestEntry(localRequest)) {
    removeOrderChatLocalMessagesByRequestId(normalizedRequestId);
    return [];
  }

  const canReadLocalFallback = hasParticipantAccessToRequestIdLocally(normalizedRequestId, participant.email);
  const fallback = canReadLocalFallback ? getOrderChatLocalMessagesByRequestId(normalizedRequestId) : [];

  for (const apiBase of getApiCandidates()) {
    try {
      const response = await fetchWithTimeout(
        `${apiBase}/commandes/${encodeURIComponent(normalizedRequestId)}/chat/messages?participantEmail=${encodeURIComponent(
          participant.email
        )}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        }
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return [];
        }
        const closedMessage = String((payload && payload.message) || "").trim().toLowerCase();
        if (response.status === 410 || closedMessage.includes("chat closed")) {
          removeOrderChatLocalMessagesByRequestId(normalizedRequestId);
          return [];
        }
        throw new Error(payload.message || "Lecture du chat impossible.");
      }

      const messages = Array.isArray(payload.messages) ? payload.messages : [];
      messages.forEach((message) => {
        pushOrderChatLocalMessage({
          commandeId: normalizedRequestId,
          senderType: String((message && message.senderType) || "").trim().toLowerCase(),
          senderId: String((message && (message.senderId || message.senderEmail)) || "").trim().toLowerCase(),
          senderEmail: String((message && message.senderEmail) || "").trim().toLowerCase(),
          senderName: String((message && message.senderName) || "").trim(),
          message: String((message && message.message) || "").trim(),
          createdAt: String((message && message.createdAt) || new Date().toISOString())
        });
      });
      saveApiBase(apiBase);
      return messages.length ? messages : fallback;
    } catch (error) {
      if (isNetworkError(error)) {
        continue;
      }
      return fallback;
    }
  }

  return fallback;
}

async function sendOrderChatMessage(requestId, participant, rawMessage) {
  const normalizedRequestId = String(requestId || "").trim();
  const message = String(rawMessage || "").trim();
  if (!normalizedRequestId || !participant || !participant.email || !message) {
    throw new Error("Message invalide.");
  }

  const localRequest = getLocalRequestById(normalizedRequestId);
  if (localRequest && !canOpenOrderChatForRequestEntry(localRequest)) {
    removeOrderChatLocalMessagesByRequestId(normalizedRequestId);
    throw new Error("Conversation fermee: intervention terminee.");
  }

  const localEntry = {
    commandeId: normalizedRequestId,
    senderType: participant.senderType,
    senderId: String(participant.id || participant.email || "").trim().toLowerCase(),
    senderEmail: participant.email,
    senderName: participant.name,
    message,
    createdAt: new Date().toISOString()
  };

  for (const apiBase of getApiCandidates()) {
    try {
      const response = await fetchWithTimeout(`${apiBase}/commandes/${encodeURIComponent(normalizedRequestId)}/chat/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantEmail: participant.email,
          senderType: participant.senderType,
          senderId: String(participant.id || participant.email || "").trim().toLowerCase(),
          senderName: participant.name,
          message
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const closedMessage = String((payload && payload.message) || "").trim().toLowerCase();
        if (response.status === 410 || closedMessage.includes("chat closed")) {
          removeOrderChatLocalMessagesByRequestId(normalizedRequestId);
          throw new Error("Conversation fermee: intervention terminee.");
        }
        throw new Error(payload.message || "Envoi du message impossible.");
      }

      const saved = payload && payload.chatMessage ? payload.chatMessage : null;
      pushOrderChatLocalMessage({
        commandeId: normalizedRequestId,
        senderType: String((saved && saved.senderType) || participant.senderType).trim().toLowerCase(),
        senderId: String((saved && (saved.senderId || saved.senderEmail)) || participant.id || participant.email)
          .trim()
          .toLowerCase(),
        senderEmail: String((saved && saved.senderEmail) || participant.email).trim().toLowerCase(),
        senderName: String((saved && saved.senderName) || participant.name).trim(),
        message: String((saved && saved.message) || message).trim(),
        createdAt: String((saved && saved.createdAt) || new Date().toISOString())
      });
      saveApiBase(apiBase);
      return true;
    } catch (error) {
      if (isNetworkError(error)) {
        continue;
      }
      throw error;
    }
  }

  pushOrderChatLocalMessage(localEntry);
  return false;
}

function stopOrderChatPolling() {
  if (activeOrderChatPollTimer) {
    clearInterval(activeOrderChatPollTimer);
    activeOrderChatPollTimer = null;
  }
}

function closeOrderChatModal() {
  stopOrderChatPolling();
  activeOrderChatRequestId = "";
  activeOrderChatParticipant = null;
  activeOrderChatReturnPage = "page19";
  if (orderChatOverlay) {
    orderChatOverlay.hidden = true;
  }
  [orderChatMessages, page33ChatMessages].filter(Boolean).forEach((target) => {
    target.innerHTML = "";
  });
  [orderChatInput, page33ChatInput].filter(Boolean).forEach((target) => {
    target.value = "";
  });
  applyPage33ChatHeader("");
  setOrderChatFeedback("");
}

async function refreshOrderChatMessages() {
  if (!activeOrderChatRequestId || !activeOrderChatParticipant) {
    return;
  }

  try {
    await syncOngoingRequestsFromBackendForActiveParticipant();
  } catch (error) {
    // keep local fallback when backend is temporarily unreachable
  }

  const requestEntry = getLocalRequestById(activeOrderChatRequestId);
  if (requestEntry && !canOpenOrderChatForRequestEntry(requestEntry)) {
    removeOrderChatLocalMessagesByRequestId(activeOrderChatRequestId);
    stopOrderChatPolling();
    const activeRoleForChat = resolveActiveProfileTypeForChat();
    let targetPage = activeOrderChatReturnPage || (activeRoleForChat === "prestataire" ? "page10" : "page19");
    if (activeRoleForChat === "prestataire" && targetPage === "page19") {
      targetPage = "page10";
    }
    closeOrderChatModal();
    goTo(targetPage);
    window.alert("Le chat est ferme: prestation terminee et notee.");
    return;
  }

  const messages = await fetchOrderChatMessages(activeOrderChatRequestId, activeOrderChatParticipant);
  renderOrderChatMessages(messages, activeOrderChatParticipant);
  markOrderChatSeen(activeOrderChatRequestId, getLatestOrderMessageTimestamp(messages) || Date.now());
  syncChatUnreadBadges().catch(() => {
    return;
  });
}

async function openOrderChatModalByRequestId(requestId) {
  if (!ORDER_CHAT_ENABLED) {
    return;
  }

  const normalizedRequestId = String(requestId || "").trim();
  if (!normalizedRequestId) {
    return;
  }

  const activeScreen = document.querySelector(".screen.active");
  const sourcePageForChat = getPageClassFromElement(activeScreen) || String(activeOrderChatReturnPage || "").trim();
  const inferredRole = resolveProfileRoleFromPageClass(sourcePageForChat);
  if (inferredRole) {
    setActiveProfileRole(inferredRole);
    lastResolvedProfileType = inferredRole;
  }

  const participant = getActiveChatParticipant();
  if (!participant) {
    setOrderChatFeedback("Connectez-vous pour utiliser le chat.", "error");
    return;
  }

  try {
    await syncOngoingRequestsFromBackendForActiveParticipant();
  } catch (error) {
    // keep local fallback when backend is temporarily unreachable
  }

  let hasAccess = hasParticipantAccessToRequestIdLocally(normalizedRequestId, participant.email);
  if (!hasAccess) {
    hasAccess = hasParticipantAccessToRequestIdLocally(normalizedRequestId, participant.email);
  }
  if (!hasAccess) {
    setOrderChatFeedback("Acces refuse: cette discussion n'est pas liee a votre compte.", "error");
    return;
  }

  const localRequest = getLocalRequestById(normalizedRequestId);
  if (localRequest && !canOpenOrderChatForRequestEntry(localRequest)) {
    removeOrderChatLocalMessagesByRequestId(normalizedRequestId);
    setOrderChatFeedback("Le chat est ferme pour cette demande.", "error");
    return;
  }

  const activeRoleForChat = inferredRole || resolveActiveProfileTypeForChat();
  const defaultReturnPage = activeRoleForChat === "prestataire" ? "page10" : "page19";
  activeOrderChatReturnPage = getPageClassFromElement(activeScreen) || defaultReturnPage;
  if (activeRoleForChat === "prestataire" && activeOrderChatReturnPage === "page19") {
    activeOrderChatReturnPage = "page10";
  }
  goTo("page33");
  activeOrderChatRequestId = normalizedRequestId;
  activeOrderChatParticipant = participant;
  applyPage33ChatHeader(normalizedRequestId);
  setOrderChatFeedback("Chargement des messages...");
  const messages = await fetchOrderChatMessages(normalizedRequestId, participant);
  renderOrderChatMessages(messages, participant);
  markOrderChatSeen(normalizedRequestId, getLatestOrderMessageTimestamp(messages) || Date.now());
  syncChatUnreadBadges().catch(() => {
    return;
  });
  setOrderChatFeedback("");

  stopOrderChatPolling();
  activeOrderChatPollTimer = setInterval(() => {
    refreshOrderChatMessages().catch(() => {
      return;
    });
  }, 1200);
}

function getCurrentParticipantOngoingRequests() {
  const activeRole = resolveActiveProfileTypeForChat();
  const activeClientEmail = getActiveClientEmail();
  const activeProviderEmail = getActiveProviderEmail();

  if (activeRole === "client" && activeClientEmail) {
    return getClientOngoingRequestsForEmail(activeClientEmail);
  }
  if (activeRole === "prestataire" && activeProviderEmail) {
    return getProviderOngoingRequestsForEmail(activeProviderEmail);
  }
  if (activeClientEmail && !activeProviderEmail) {
    return getClientOngoingRequestsForEmail(activeClientEmail);
  }
  if (activeProviderEmail && !activeClientEmail) {
    return getProviderOngoingRequestsForEmail(activeProviderEmail);
  }

  return [];
}

function resolveDefaultOrderChatRequestId() {
  return resolveSelectedChatEligibleRequestId();
}

function getCurrentParticipantRequestById(requestId) {
  const normalizedRequestId = String(requestId || "").trim();
  if (!normalizedRequestId) {
    return null;
  }
  return (
    getCurrentParticipantOngoingRequests().find(
      (entry) => String((entry && entry.id) || "").trim() === normalizedRequestId
    ) || null
  );
}

function applyPage33ChatHeader(requestId) {
  const dedupeName = (rawName, fallback) => {
    const value = String(rawName || "").trim();
    if (!value) {
      return String(fallback || "").trim();
    }
    const tokens = value.split(/\s+/).filter(Boolean);
    if (tokens.length === 2 && tokens[0].toLowerCase() === tokens[1].toLowerCase()) {
      return tokens[0];
    }
    return value;
  };
  if (page33ChatAvatar) {
    page33ChatAvatar.src = DEFAULT_USER_AVATAR_URL;
    page33ChatAvatar.alt = "Photo profil";
  }
  if (page33ChatSubtitle) {
    page33ChatSubtitle.textContent = "Discussion client/prestataire";
  }

  const participant = getActiveChatParticipant();
  const requestEntry = getCurrentParticipantRequestById(requestId);
  if (!participant || !requestEntry) {
    return;
  }

  const participantType = String(participant.senderType || "").trim().toLowerCase();
  const defaultName = participantType === "client" ? "Prestataire" : "Client";
  let counterpartName = defaultName;
  let counterpartPhoto = "";

  if (participantType === "client") {
    counterpartName = dedupeName(requestEntry && requestEntry.providerName, defaultName);
    counterpartPhoto = String((requestEntry && requestEntry.providerImage) || "").trim();
  } else {
    counterpartName = dedupeName(
      requestEntry && (requestEntry.clientName || requestEntry.clientEmail),
      defaultName
    );
    const clientEmail = String((requestEntry && requestEntry.clientEmail) || "").trim().toLowerCase();
    const clientAccount = findClientAccountByEmail(clientEmail);
    counterpartPhoto = String(
      (clientAccount && (clientAccount.photoProfil || clientAccount.photo || clientAccount.avatarUrl)) || ""
    ).trim();
  }

  if (page33ChatSubtitle) {
    page33ChatSubtitle.textContent = counterpartName || defaultName;
  }
  if (page33ChatAvatar) {
    page33ChatAvatar.src = resolveAccountPhotoSrc(counterpartPhoto);
    page33ChatAvatar.alt = `Photo ${counterpartName || defaultName}`;
  }
}

function getLatestOrderMessageTimestamp(messages = []) {
  const rows = Array.isArray(messages) ? messages : [];
  let latest = 0;
  rows.forEach((entry) => {
    const stamp = Date.parse(String((entry && entry.createdAt) || "")) || 0;
    if (stamp > latest) {
      latest = stamp;
    }
  });
  return latest;
}

async function syncChatUnreadBadges() {
  const participant = getActiveChatParticipant();
  if (!participant || !participant.email) {
    if (openPage8ChatBtn) {
      openPage8ChatBtn.classList.remove("has-unread");
    }
    if (openPage33ChatBtn) {
      openPage33ChatBtn.classList.remove("has-unread");
    }
    if (openPage20ChatBtn) {
      openPage20ChatBtn.classList.remove("has-unread");
    }
    return;
  }

  const requests = getCurrentParticipantOngoingRequests()
    .filter((entry) => canOpenOrderChatForRequestEntry(entry))
    .slice(0, 10);
  if (!requests.length) {
    if (openPage8ChatBtn) {
      openPage8ChatBtn.classList.remove("has-unread");
    }
    if (openPage33ChatBtn) {
      openPage33ChatBtn.classList.remove("has-unread");
    }
    if (openPage20ChatBtn) {
      openPage20ChatBtn.classList.remove("has-unread");
    }
    return;
  }

  let hasUnread = false;
  for (const request of requests) {
    const requestId = String((request && request.id) || "").trim();
    if (!requestId) {
      continue;
    }
    const messages = await fetchOrderChatMessages(requestId, participant);
    const latestMessageTs = getLatestOrderMessageTimestamp(messages);
    if (!latestMessageTs) {
      continue;
    }
    const seenTs = getOrderChatLastSeen(requestId);
    if (latestMessageTs > seenTs) {
      hasUnread = true;
      break;
    }
  }

  if (openPage8ChatBtn) {
    openPage8ChatBtn.classList.toggle("has-unread", hasUnread);
  }
  if (openPage33ChatBtn) {
    openPage33ChatBtn.classList.toggle("has-unread", hasUnread);
  }
  if (openPage20ChatBtn) {
    openPage20ChatBtn.classList.toggle("has-unread", hasUnread);
  }
}

function ensureChatBadgePolling() {
  if (chatBadgePollTimer) {
    return;
  }
  chatBadgePollTimer = setInterval(() => {
    syncChatUnreadBadges().catch(() => {
      return;
    });
  }, 2500);
}

function syncPage8ChatFabState() {
  if (!openPage8ChatBtn) {
    return;
  }

  openPage8ChatBtn.hidden = true;
  openPage8ChatBtn.disabled = true;
  openPage8ChatBtn.setAttribute("aria-disabled", "true");
  openPage8ChatBtn.classList.remove("has-unread");
  if (openPage33ChatBtn) {
    openPage33ChatBtn.classList.remove("has-unread");
  }
  if (openPage20ChatBtn) {
    openPage20ChatBtn.classList.remove("has-unread");
  }
}

function syncPage19ChatFabState() {
  if (!openPage33ChatBtn) {
    return;
  }
  const requestId = resolveSelectedChatEligibleRequestId();
  const shouldEnable = Boolean(ORDER_CHAT_ENABLED && requestId);
  openPage33ChatBtn.hidden = !shouldEnable;
  openPage33ChatBtn.disabled = !shouldEnable;
  openPage33ChatBtn.setAttribute("aria-disabled", String(!shouldEnable));
  if (!shouldEnable) {
    openPage33ChatBtn.classList.remove("has-unread");
  }
}

function syncPage20ChatFabState() {
  if (!openPage20ChatBtn) {
    return;
  }
  const requestId = resolveSelectedChatEligibleRequestId();
  const shouldEnable = Boolean(ORDER_CHAT_ENABLED && requestId);
  openPage20ChatBtn.hidden = !shouldEnable;
  openPage20ChatBtn.disabled = !shouldEnable;
  openPage20ChatBtn.setAttribute("aria-disabled", String(!shouldEnable));
  if (!shouldEnable) {
    openPage20ChatBtn.classList.remove("has-unread");
  }
}

async function openDefaultOrderChatConversation() {
  if (!ORDER_CHAT_ENABLED) {
    return;
  }

  try {
    await syncOngoingRequestsFromBackendForActiveParticipant();
  } catch (error) {
    // fallback to local state if backend is temporarily unavailable
  }
  const requestId = String(resolveDefaultOrderChatRequestId() || "").trim();
  if (!requestId) {
    setOrderChatFeedback("Aucune commande active pour ouvrir le chat.", "error");
    return;
  }
  await openOrderChatModalByRequestId(requestId);
}

function renderPage10OngoingRequests() {
  if (!page10OngoingRequestsList) {
    return;
  }
  syncPage8ChatFabState();
  syncPage19ChatFabState();

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const fallbackCardImage = escapeHtml(resolveAccountPhotoSrc(DEFAULT_PROVIDER_CARD_IMAGE));

  const activeClientEmail = getActiveClientEmail();
  const activeProviderEmail = getActiveProviderEmail();
  const isProviderSession = isProviderRequestSessionActive();
  const isClientSession = !isProviderSession;
  const sessionEmail = isProviderSession ? activeProviderEmail : activeClientEmail;
  const ongoingRequests = isProviderSession
    ? getProviderOngoingRequestsForEmail(activeProviderEmail)
    : getClientOngoingRequestsForEmail(activeClientEmail);

  if (!sessionEmail || !ongoingRequests.length) {
    page10OngoingRequestsList.innerHTML =
      '<div class="page10-ongoing-empty">Aucune demande en cours pour le moment.</div>';
    return;
  }

  const cardsMarkup = ongoingRequests
    .map((entry) => {
      const requestStatus = normalizeRequestLifecycleStatus(entry && entry.status, "en_cours");
      const counterpartName = isClientSession
        ? String((entry && entry.providerName) || "Prestataire")
        : String((entry && (entry.clientName || entry.clientEmail)) || "Client");
      const providerName = escapeHtml(counterpartName || "Interlocuteur");
      const providerDate = escapeHtml(formatOngoingRequestDateLabel(entry.createdAt));
      const providerPrice = escapeHtml(normalizeOngoingRequestPrice(entry.providerPrice, "200DH"));
      const clientEmail = String((entry && entry.clientEmail) || "").trim().toLowerCase();
      const clientAccount = isProviderSession ? findClientAccountByEmail(clientEmail) : null;
      const counterpartImageSource = isProviderSession
        ? String(
            (entry && (entry.clientImage || entry.clientPhoto)) ||
              (clientAccount && (clientAccount.photoProfil || clientAccount.photo || clientAccount.avatarUrl)) ||
              ""
          ).trim()
        : String((entry && entry.providerImage) || "").trim();
      const providerImage = escapeHtml(
        resolveAccountPhotoSrc(counterpartImageSource || DEFAULT_PROVIDER_CARD_IMAGE)
      );
      const requestId = escapeHtml(entry.id || "");
      const canOpenChatForRequest = canOpenOrderChatForRequestEntry(entry);
      const providerChatButtonMarkup =
        isProviderSession && canOpenChatForRequest
          ? `
            <button
              class="page10-request-chat-btn"
              type="button"
              data-request-id="${requestId}"
              aria-label="Ouvrir le chat avec ce client"
              title="Ouvrir le chat"
            >
              <span aria-hidden="true">&#128172;</span>
            </button>
          `
          : "";
      const cancelButtonMarkup = isClientSession
        ? `<button class="button4 page10-request-cancel-btn" type="button" data-request-id="${requestId}">
              <span class="text6">Annuler</span>
            </button>`
        : "";
      const providerDecisionButtonsMarkup =
        isProviderSession && requestStatus === "en_attente_prestataire"
          ? `
            <button class="button4 page10-request-reject-btn" type="button" data-request-id="${requestId}">
              <span class="text6">Refuser</span>
            </button>
            <button class="button5 page10-request-accept-btn" type="button" data-request-id="${requestId}">
              <span class="text8">Accepter</span>
            </button>
          `
          : "";
      const continueButtonMarkup = isClientSession
        ? `
            <button class="button5 page10-request-continue-btn" type="button" data-request-id="${requestId}">
              <span class="text8">Continuer</span>
            </button>
          `
        : "";
      const providerPendingLabelMarkup =
        isProviderSession && requestStatus === "en_attente_prestataire"
          ? '<span class="text5">En attente de votre reponse</span>'
          : "";

      return `
        <div class="row-view3">
          <img
            src="${providerImage}"
            alt="Service ${providerName}"
            class="image2"
            onerror="this.onerror=null;this.src='${fallbackCardImage}'"
          >
          <div class="column">
            <div class="page10-request-head-row">
              <span class="text4">${providerName}</span>
              ${providerChatButtonMarkup}
            </div>
            <span class="text5">${providerDate}</span>
            ${providerPendingLabelMarkup}
            ${cancelButtonMarkup}
          </div>
          <div class="column2">
            <div class="view2">
              <span class="text7">${providerPrice}</span>
            </div>
            ${providerDecisionButtonsMarkup}
            ${continueButtonMarkup}
          </div>
        </div>
        <div class="box3"></div>
      `;
    })
    .join("");

  page10OngoingRequestsList.innerHTML = cardsMarkup;
}

function buildCommandeServiceLabel(profile) {
  const rawDomain = String((profile && profile.domain) || "").trim();
  return rawDomain || "service";
}

function normalizeProviderLookupToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function doesOrderProviderMatchCandidate(profile, candidate) {
  if (!profile || !candidate) {
    return false;
  }

  const profileName = normalizeProviderLookupToken(profile.name);
  const candidateName = normalizeProviderLookupToken(
    candidate.name || `${String(candidate.prenom || "").trim()} ${String(candidate.nom || "").trim()}`
  );
  const candidateEmail = String((candidate && candidate.email) || "").trim().toLowerCase();
  if (!profileName || !candidateName || !candidateEmail) {
    return false;
  }

  const profileDomain = normalizeProviderCategory(profile.domain || "");
  const candidateDomain = normalizeProviderCategory(
    String((candidate && (candidate.domain || candidate.domaine || candidate.categorie)) || "").trim()
  );
  if (profileDomain && candidateDomain && profileDomain !== candidateDomain) {
    return false;
  }

  if (profileName === candidateName || profileName.includes(candidateName) || candidateName.includes(profileName)) {
    return true;
  }

  const profileTokens = profileName.split(" ").filter(Boolean);
  const candidateTokens = candidateName.split(" ").filter(Boolean);
  if (!profileTokens.length || !candidateTokens.length) {
    return false;
  }

  const firstProfileToken = profileTokens[0];
  return Boolean(firstProfileToken && candidateTokens.includes(firstProfileToken));
}

function resolveProviderEmailForOrder(profile) {
  const directEmail = String((profile && profile.email) || "").trim().toLowerCase();
  if (directEmail) {
    return directEmail;
  }

  const localMatch = getProviderAccounts().find((account) =>
    doesOrderProviderMatchCandidate(profile, account)
  );
  if (localMatch && localMatch.email) {
    return String(localMatch.email || "").trim().toLowerCase();
  }

  const directoryMatch = getVerifiedProviderDirectory()
    .map((entry) => buildVerifiedProviderDirectoryItem(entry))
    .find((entry) => doesOrderProviderMatchCandidate(profile, entry));
  if (directoryMatch && directoryMatch.email) {
    return String(directoryMatch.email || "").trim().toLowerCase();
  }

  return "";
}

async function submitCommandeFromCurrentContext(locationData = null) {
  const clientAccount = getActiveClientAccount();
  if (!clientAccount || !clientAccount.email) {
    throw new Error("Connectez-vous avec un compte client pour passer une commande.");
  }

  const providerProfile = getCurrentOrderProviderProfile();
  if (!providerProfile || !providerProfile.name) {
    throw new Error("Prestataire introuvable. Ouvrez un profil puis réessayez.");
  }
  const resolvedProviderEmail = resolveProviderEmailForOrder(providerProfile);
  if (resolvedProviderEmail) {
    currentOrderProviderProfile = {
      ...(currentOrderProviderProfile || {}),
      ...providerProfile,
      email: resolvedProviderEmail
    };
  }

  const payloadBody = {
    clientEmail: String(clientAccount.email || "").trim().toLowerCase(),
    clientName: `${String(clientAccount.prenom || "").trim()} ${String(clientAccount.nom || "").trim()}`.trim(),
    clientPrenom: String(clientAccount.prenom || "").trim(),
    clientNom: String(clientAccount.nom || "").trim(),
    clientTelephone: String(clientAccount.telephone || "").trim(),
    prestataireEmail: resolvedProviderEmail,
    prestataireNom: String(providerProfile.name || "").trim(),
    domaine: String(providerProfile.domain || "").trim(),
    service: buildCommandeServiceLabel(providerProfile),
    statut: "en_attente",
    paymentMethod: normalizeProviderPaymentMethod(selectedProviderPaymentMethod)
  };

  if (isValidOrderGeoLocation(locationData)) {
    payloadBody.clientLatitude = Number(locationData.latitude);
    payloadBody.clientLongitude = Number(locationData.longitude);
  }

  if (locationData && Number.isFinite(Number(locationData.accuracy))) {
    payloadBody.clientLocationAccuracy = Number(locationData.accuracy);
  }

  if (locationData) {
    const locationLabel = String(locationData.locationLabel || "").trim();
    if (locationLabel) {
      payloadBody.clientLocationLabel = locationLabel;
    }
  }

  let lastNetworkError = null;

  for (const apiBase of getApiCandidates()) {
    try {
      const response = await fetchWithTimeout(`${apiBase}/commandes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBody)
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Création commande impossible.");
      }

      saveApiBase(apiBase);
      return payload;
    } catch (error) {
      if (isNetworkError(error)) {
        lastNetworkError = error;
        continue;
      }

      throw error;
    }
  }

  if (lastNetworkError) {
    throw new Error("Connexion backend impossible. Vérifie ta connexion internet puis réessaie.");
  }

  throw new Error("Serveur backend inaccessible.");
}

function showSubmissionWaitingPage(profileType, currentStatus = "en_attente") {
  const normalizedType = String(profileType || "").toLowerCase();
  const isProvider = normalizedType === "prestataire";
  const normalizedStatus = String(currentStatus || "").toLowerCase();
  lastResolvedVerificationStatus = normalizedStatus;
  lastResolvedProfileType = normalizedType;

  if (waitingProfileType) {
    waitingProfileType.textContent = isProvider ? "Dossier prestataire" : "Dossier client";
  }

  if (shouldOpenProviderFingerprintStep(normalizedType, normalizedStatus)) {
    previousPageClass = getPageClassFromElement(document.querySelector(".screen.active")) || "page29";
    goTo("page30");
    return;
  }

  if (isPendingStatus(normalizedStatus)) {
    if (waitingStatusMessage) {
      waitingStatusMessage.textContent = isProvider
        ? "Votre dossier prestataire est en cours de traitement par notre équipe."
        : "Votre dossier client est en cours de traitement par notre équipe.";
    }

    if (waitingContactMessage) {
      waitingContactMessage.textContent = isProvider
        ? "Vous ne pourrez continuer qu'apres approbation de votre profil par l'administrateur."
        : "Vous serez contacté(e) par téléphone après traitement de votre profil. Le statut final sera approuvé ou rejeté.";
    }

    if (waitingGoLoginBtn) {
      waitingGoLoginBtn.textContent = isProvider ? "Actualiser mon statut" : "Continuer";
      waitingGoLoginBtn.disabled = false;
      waitingGoLoginBtn.setAttribute("aria-disabled", "false");
    }
  } else if (normalizedStatus === "valide") {
    if (waitingStatusMessage) {
      waitingStatusMessage.textContent = "Votre profil a été approuvé par l'administrateur.";
    }

    if (waitingContactMessage) {
      waitingContactMessage.textContent =
        "Cliquez sur Continuer pour finaliser votre inscription (position manuelle obligatoire et champ de prestation 5 km).";
    }

    if (waitingGoLoginBtn) {
      waitingGoLoginBtn.textContent = "Continuer";
      waitingGoLoginBtn.disabled = false;
      waitingGoLoginBtn.setAttribute("aria-disabled", "false");
    }
  } else {
    if (waitingStatusMessage) {
      waitingStatusMessage.textContent = "Votre profil a été rejeté par l'administrateur.";
    }

    if (waitingContactMessage) {
      waitingContactMessage.textContent = "Notre équipe vous contactera par téléphone pour les prochaines étapes.";
    }

    if (waitingGoLoginBtn) {
      waitingGoLoginBtn.textContent = "Retourner a la connexion";
      waitingGoLoginBtn.disabled = false;
      waitingGoLoginBtn.setAttribute("aria-disabled", "false");
    }
  }

  previousPageClass = getPageClassFromElement(document.querySelector(".screen.active")) || "page4";
  goTo("page29");
}

bindProviderCategoryTriggers();

if (toFrame2Btn) {
  toFrame2Btn.addEventListener("click", () => {
    previousPageClass = "page1";
    goTo("page2");
  });
}

if (toFrame3Btn) {
  toFrame3Btn.addEventListener("click", () => {
    previousPageClass = "page2";
    goTo("page3");
  });
}

if (toFrame4Btn) {
  toFrame4Btn.addEventListener("click", () => {
    previousPageClass = "page3";
    goTo("page4");
  });
}

if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = loginEmailInput ? loginEmailInput.value.trim().toLowerCase() : "";
    const password = loginPasswordInput ? loginPasswordInput.value : "";

    if (!email || !password) {
      setLoginFeedback("Entre ton email et ton mot de passe.", "error");
      return;
    }

    if (isAdminCredentials(email, password)) {
      clearPendingVerification();
      try {
        localStorage.removeItem(ACTIVE_CLIENT_ACCOUNT_STORAGE_KEY);
        localStorage.removeItem(ACTIVE_PROVIDER_ACCOUNT_STORAGE_KEY);
      } catch (error) {
        // noop
      }
      saveAdminSession(email, password);
      setLoginFeedback("Connexion admin reussie. Redirection...", "success");
      window.setTimeout(() => {
        window.location.href = buildAdminDashboardUrl(email);
      }, 180);
      return;
    }

    const localClientAccount = findClientAccountByEmail(email);
    const localProviderAccount = findProviderAccountByEmail(email);

    const localClientPasswordMismatch =
      Boolean(localClientAccount && localClientAccount.password) && localClientAccount.password !== password;
    const localProviderPasswordMismatch =
      Boolean(localProviderAccount && localProviderAccount.password) && localProviderAccount.password !== password;

    const completeLogin = (profileType, payload = null, options = {}) => {
      const shouldOpenFingerprint = Boolean(options.shouldOpenFingerprint);
      const normalizedProfileType = String(profileType || "").trim().toLowerCase();
      clearPendingVerification();
      activateProfileSession(profileType, email, payload);
      setLoginFeedback("Connexion reussie.", "success");
      previousPageClass = "page4";
      if (shouldOpenFingerprint) {
        goTo("page30");
        return;
      }
      goTo(normalizedProfileType === "prestataire" ? "page10" : "page8");
    };

    const openClientWaitingAccess = (clientPayload = null) => {
      const nextClientPayload = {
        ...(clientPayload || {}),
        email
      };
      const clientStatus = normalizeStatus(
        (nextClientPayload && nextClientPayload.statutVerification) || "en_attente"
      );
      activateProfileSession("client", email, nextClientPayload);
      savePendingVerification("client", email);
      setLoginFeedback(
        clientStatus === "refuse"
          ? "Votre profil client a ete refuse par l'administrateur."
          : "Votre dossier client est en attente de validation admin.",
        "error"
      );
      showSubmissionWaitingPage("client", clientStatus || "en_attente");
    };

    const resolveClientLoginPayload = async (fallbackPayload = null) => {
      const basePayload = fallbackPayload && typeof fallbackPayload === "object" ? { ...fallbackPayload } : null;

      try {
        const remotePayload = await fetchVerificationStatusByType("client", email, { allowNotFound: true });
        if (remotePayload) {
          return {
            ...(basePayload || {}),
            ...remotePayload,
            email
          };
        }
      } catch (error) {
        if (!basePayload || !isNetworkError(error)) {
          throw error;
        }
      }

      if (basePayload) {
        return {
          ...basePayload,
          email
        };
      }

      return null;
    };

    const resolveProviderLoginPayload = async (fallbackPayload = null) => {
      const basePayload = fallbackPayload && typeof fallbackPayload === "object" ? { ...fallbackPayload } : null;

      try {
        const remotePayload = await fetchVerificationStatusByType("prestataire", email, { allowNotFound: true });
        if (remotePayload) {
          return {
            ...(basePayload || {}),
            ...remotePayload,
            email
          };
        }
      } catch (error) {
        if (!basePayload || !isNetworkError(error)) {
          throw error;
        }
      }

      if (basePayload) {
        return {
          ...basePayload,
          email
        };
      }

      return null;
    };

    setLoginFeedback("Connexion en cours...", "neutral");

    try {
      if (localClientAccount && !localClientPasswordMismatch) {
        const clientPayload = await resolveClientLoginPayload(localClientAccount);
        if (!canClientContinueAfterAdminApproval(clientPayload && clientPayload.statutVerification, clientPayload)) {
          openClientWaitingAccess(clientPayload || localClientAccount);
          return;
        }
        completeLogin("client", clientPayload || localClientAccount);
        return;
      }

      if (localProviderAccount && !localProviderPasswordMismatch) {
        const providerPayload = await resolveProviderLoginPayload(localProviderAccount);
        const shouldOpenCoverageStep = shouldOpenProviderCoverageStep(
          "prestataire",
          providerPayload && providerPayload.statutVerification,
          providerPayload || localProviderAccount
        );
        const shouldOpenFingerprint = shouldOpenProviderFingerprintStep(
          "prestataire",
          providerPayload && providerPayload.statutVerification,
          providerPayload
        ) || shouldOpenCoverageStep;
        completeLogin("prestataire", providerPayload || localProviderAccount, { shouldOpenFingerprint });
        return;
      }

      const clientPayload = await fetchVerificationStatusByType("client", email, { allowNotFound: true });
      if (clientPayload) {
        const nextClientPayload = {
          ...clientPayload,
          email,
          password
        };
        if (!canClientContinueAfterAdminApproval(nextClientPayload.statutVerification, nextClientPayload)) {
          openClientWaitingAccess(nextClientPayload);
          return;
        }
        completeLogin("client", nextClientPayload);
        return;
      }

      const providerPayload = await fetchVerificationStatusByType("prestataire", email, { allowNotFound: true });
      if (providerPayload) {
        const resolvedProviderPayload = await resolveProviderLoginPayload(providerPayload);
        const shouldOpenCoverageStep = shouldOpenProviderCoverageStep(
          "prestataire",
          resolvedProviderPayload && resolvedProviderPayload.statutVerification,
          resolvedProviderPayload || providerPayload
        );
        const shouldOpenFingerprint = shouldOpenProviderFingerprintStep(
          "prestataire",
          resolvedProviderPayload && resolvedProviderPayload.statutVerification,
          resolvedProviderPayload
        ) || shouldOpenCoverageStep;
        completeLogin("prestataire", {
          ...(resolvedProviderPayload || providerPayload),
          email
        }, { shouldOpenFingerprint });
        return;
      }

      if (localClientPasswordMismatch || localProviderPasswordMismatch) {
        setLoginFeedback("Mot de passe incorrect.", "error");
        return;
      }

      setLoginFeedback("Aucun compte client ou prestataire trouvé avec cet email.", "error");
    } catch (error) {
      if (isNetworkError(error)) {
        setLoginFeedback("Connexion backend impossible. Vérifie ta connexion internet puis réessaie.", "error");
      } else {
        setLoginFeedback(error.message || "Connexion impossible.", "error");
      }
    }
  });
}

if (toFrame5Btn) {
  toFrame5Btn.addEventListener("click", () => {
    clearPendingVerification();
    try {
      localStorage.removeItem(ACTIVE_CLIENT_ACCOUNT_STORAGE_KEY);
      localStorage.removeItem(ACTIVE_PROVIDER_ACCOUNT_STORAGE_KEY);
    } catch (error) {
      // noop
    }
    applyActiveUserProfile();
    previousPageClass = "page4";
    goTo("page6");
  });
}

if (backTo4Btn) {
  backTo4Btn.addEventListener("click", () => {
    const targetPage = previousPageClass && previousPageClass !== "page5" ? previousPageClass : "page4";
    goTo(targetPage);
  });
}

function setLoginPasswordVisibility(isVisible) {
  if (!loginPasswordInput || !loginPasswordToggleBtn) return;
  loginPasswordInput.type = isVisible ? "text" : "password";
  loginPasswordToggleBtn.classList.toggle("is-visible", isVisible);
  loginPasswordToggleBtn.setAttribute("aria-pressed", String(isVisible));
  loginPasswordToggleBtn.setAttribute(
    "aria-label",
    isVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"
  );
}

if (loginPasswordInput && loginPasswordToggleBtn) {
  setLoginPasswordVisibility(false);

  loginPasswordToggleBtn.addEventListener("click", () => {
    const isVisible = loginPasswordInput.type === "text";
    setLoginPasswordVisibility(!isVisible);
    loginPasswordInput.focus();
  });
}

function setSignupPasswordVisibility(isVisible) {
  if (!signupPasswordInput || !signupPasswordToggleBtn) return;
  signupPasswordInput.type = isVisible ? "text" : "password";
  signupPasswordToggleBtn.classList.toggle("is-visible", isVisible);
  signupPasswordToggleBtn.setAttribute("aria-pressed", String(isVisible));
  signupPasswordToggleBtn.setAttribute(
    "aria-label",
    isVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"
  );
}

if (signupPasswordInput && signupPasswordToggleBtn) {
  setSignupPasswordVisibility(false);

  signupPasswordToggleBtn.addEventListener("click", () => {
    const isVisible = signupPasswordInput.type === "text";
    setSignupPasswordVisibility(!isVisible);
    signupPasswordInput.focus();
  });
}

function setProviderSignupPasswordVisibility(isVisible) {
  if (!providerSignupPasswordInput || !providerSignupPasswordToggleBtn) return;
  providerSignupPasswordInput.type = isVisible ? "text" : "password";
  providerSignupPasswordToggleBtn.classList.toggle("is-visible", isVisible);
  providerSignupPasswordToggleBtn.setAttribute("aria-pressed", String(isVisible));
  providerSignupPasswordToggleBtn.setAttribute(
    "aria-label",
    isVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"
  );
}

if (providerSignupPasswordInput && providerSignupPasswordToggleBtn) {
  setProviderSignupPasswordVisibility(false);

  providerSignupPasswordToggleBtn.addEventListener("click", () => {
    const isVisible = providerSignupPasswordInput.type === "text";
    setProviderSignupPasswordVisibility(!isVisible);
    providerSignupPasswordInput.focus();
  });
}

function isClientSignupReady() {
  const fullName = signupNameInput ? signupNameInput.value.trim() : "";
  const password = signupPasswordInput ? signupPasswordInput.value.trim() : "";
  const email = signupEmailInput ? signupEmailInput.value.trim() : "";
  const telephone = signupPhoneInput ? signupPhoneInput.value.trim() : "";
  const dateDeNaissance = signupBirthInput ? signupBirthInput.value.trim() : "";
  const cinFile = signupCinUpload && signupCinUpload.files ? signupCinUpload.files[0] : null;
  return Boolean(fullName && password && email && telephone && dateDeNaissance && cinFile);
}

function syncClientSignupSubmitState() {
  if (!signupSubmitBtn) return;
  signupSubmitBtn.disabled = !isClientSignupReady();
}

if (signupSubmitBtn) {
  const signupRequiredTextFields = [
    signupNameInput,
    signupPasswordInput,
    signupEmailInput,
    signupPhoneInput,
    signupBirthInput
  ].filter(Boolean);

  for (const field of signupRequiredTextFields) {
    field.addEventListener("input", syncClientSignupSubmitState);
  }

  if (signupCinUpload) {
    signupCinUpload.addEventListener("change", syncClientSignupSubmitState);
  }

  syncClientSignupSubmitState();

  signupSubmitBtn.addEventListener("click", async () => {
    const fullName = signupNameInput ? signupNameInput.value.trim() : "";
    const password = signupPasswordInput ? signupPasswordInput.value.trim() : "";
    const email = signupEmailInput ? signupEmailInput.value.trim().toLowerCase() : "";
    const telephone = signupPhoneInput ? signupPhoneInput.value.trim() : "";
    const dateDeNaissance = signupBirthInput ? signupBirthInput.value.trim() : "";
    const cinFile = signupCinUpload && signupCinUpload.files ? signupCinUpload.files[0] : null;
    const profileFile = signupPhotoUpload && signupPhotoUpload.files ? signupPhotoUpload.files[0] : null;
    let profilePreviewDataUrl = "";
    const { nom, prenom } = splitClientName(fullName);

    if (!fullName || !password || !email || !telephone || !dateDeNaissance || !cinFile) {
      setSignupFeedback("Remplis tous les champs (date de naissance incluse) et charge ton image CIN.", "error");
      return;
    }

    if (!nom || !prenom) {
      setSignupFeedback("Nom et prenom invalides.", "error");
      return;
    }

    signupSubmitBtn.disabled = true;
    setSignupFeedback("Inscription client en cours...", "neutral");
    clearPendingVerification();
    try {
      localStorage.removeItem(ACTIVE_CLIENT_ACCOUNT_STORAGE_KEY);
      localStorage.removeItem(ACTIVE_PROVIDER_ACCOUNT_STORAGE_KEY);
    } catch (error) {
      // noop
    }

    try {
      if (profileFile) {
        try {
          profilePreviewDataUrl = await readFileAsDataUrl(profileFile);
        } catch (error) {
          profilePreviewDataUrl = "";
        }
      }

      let result = null;
      let lastNetworkError = null;

      const buildPayload = () => {
        const payload = new FormData();
        payload.append("nom", nom);
        payload.append("prenom", prenom);
        payload.append("email", email);
        payload.append("telephone", telephone);
        payload.append("password", password);
        payload.append("dateDeNaissance", dateDeNaissance);
        payload.append("cinImage", cinFile);
        if (profileFile) {
          payload.append("photoProfil", profileFile);
        }
        return payload;
      };

      for (const apiBase of getApiCandidates()) {
        try {
          const response = await fetchWithTimeout(`${apiBase}/clients/inscription`, {
            method: "POST",
            body: buildPayload()
          });

          const payloadResult = await response.json().catch(() => ({}));
          if (!response.ok) {
            if (isRetryableApiCandidateResponse(response, payloadResult)) {
              lastNetworkError = new Error("API candidate incompatible pour l'inscription client.");
              continue;
            }
            throw new Error(payloadResult.message || "Inscription client impossible pour le moment.");
          }

          result = payloadResult;
          saveApiBase(apiBase);
          break;
        } catch (error) {
          if (isNetworkError(error)) {
            lastNetworkError = error;
            continue;
          }

          throw error;
        }
      }

      if (!result) {
        throw lastNetworkError || new Error("Serveur backend inaccessible.");
      }

      const savedClient = (result && result.client) || {};
      const nextClientAccount = {
        email,
        password,
        nom,
        prenom,
        telephone,
        dateDeNaissance: String(savedClient.dateDeNaissance || dateDeNaissance || ""),
        age: Number.isFinite(Number(savedClient.age)) ? Number(savedClient.age) : null,
        cinImage: String(savedClient.cinImage || ""),
        photoProfil: String(savedClient.photoProfil || profilePreviewDataUrl || ""),
        statutVerification: String(savedClient.statutVerification || "en_attente").toLowerCase()
      };
      upsertClientAccount(nextClientAccount);
      setActiveClientAccount(nextClientAccount);
      applyActiveUserProfile();
      savePendingVerification("client", email);
      setSignupFeedback("Compte client cree avec succes.", "success");

      if (signupNameInput) signupNameInput.value = "";
      if (signupPasswordInput) signupPasswordInput.value = "";
      if (signupEmailInput) signupEmailInput.value = "";
      if (signupPhoneInput) signupPhoneInput.value = "";
      if (signupBirthInput) signupBirthInput.value = "";
      if (signupCinUpload) signupCinUpload.value = "";
      if (signupPhotoUpload) signupPhotoUpload.value = "";

      previousPageClass = "page5";
      showSubmissionWaitingPage("client");
    } catch (error) {
      if (isNetworkError(error)) {
        setSignupFeedback("Connexion backend impossible. Vérifie ta connexion internet puis réessaie.", "error");
      } else {
        setSignupFeedback(error.message || "Erreur serveur.", "error");
      }
    } finally {
      syncClientSignupSubmitState();
    }
  });
}

if (providerSignupSubmitBtn) {
  providerSignupSubmitBtn.addEventListener("click", async () => {
    const nom = providerSignupLastNameInput ? providerSignupLastNameInput.value.trim() : "";
    const prenom = providerSignupFirstNameInput ? providerSignupFirstNameInput.value.trim() : "";
    const email = providerSignupEmailInput ? providerSignupEmailInput.value.trim().toLowerCase() : "";
    const telephone = providerSignupPhoneInput ? providerSignupPhoneInput.value.trim() : "";
    const password = providerSignupPasswordInput ? providerSignupPasswordInput.value.trim() : "";
    const domaine = providerSignupDomainInput ? providerSignupDomainInput.value.trim() : "";
    const experience = providerSignupExperienceInput ? providerSignupExperienceInput.value.trim() : "";
    const profileFile = providerSignupPhotoUpload && providerSignupPhotoUpload.files ? providerSignupPhotoUpload.files[0] : null;
    let profilePreviewDataUrl = "";
    const cinFile = providerSignupCinUpload && providerSignupCinUpload.files ? providerSignupCinUpload.files[0] : null;
    const casierFile = providerSignupCasierUpload && providerSignupCasierUpload.files ? providerSignupCasierUpload.files[0] : null;

    if (!nom || !prenom || !email || !telephone || !password || !domaine || !experience || !cinFile || !casierFile) {
      setProviderSignupFeedback(
        "Remplis tous les champs obligatoires (mot de passe inclus) et charge CIN + casier judiciaire.",
        "error"
      );
      return;
    }

    providerSignupSubmitBtn.disabled = true;
    setProviderSignupFeedback("Envoi du dossier prestataire en cours...", "neutral");
    clearPendingVerification();
    try {
      localStorage.removeItem(ACTIVE_CLIENT_ACCOUNT_STORAGE_KEY);
      localStorage.removeItem(ACTIVE_PROVIDER_ACCOUNT_STORAGE_KEY);
    } catch (error) {
      // noop
    }

    try {
      if (profileFile) {
        try {
          profilePreviewDataUrl = await readFileAsDataUrl(profileFile);
        } catch (error) {
          profilePreviewDataUrl = "";
        }
      }

      let result = null;
      let lastNetworkError = null;

      const buildPayload = () => {
        const payload = new FormData();
        payload.append("nom", nom);
        payload.append("prenom", prenom);
        payload.append("email", email);
        payload.append("telephone", telephone);
        payload.append("password", password);
        payload.append("categorie", domaine);
        payload.append("domaine", domaine);
        payload.append("experience", experience);
        payload.append("cinImage", cinFile);
        payload.append("casierImage", casierFile);
        if (profileFile) {
          payload.append("photoProfil", profileFile);
        }
        return payload;
      };

      for (const apiBase of getApiCandidates()) {
        try {
          const response = await fetchWithTimeout(`${apiBase}/prestataires/inscription`, {
            method: "POST",
            body: buildPayload()
          });

          const payloadResult = await response.json().catch(() => ({}));
          if (!response.ok) {
            if (isRetryableApiCandidateResponse(response, payloadResult)) {
              lastNetworkError = new Error("API candidate incompatible pour l'inscription prestataire.");
              continue;
            }
            throw new Error(payloadResult.message || "Inscription prestataire impossible pour le moment.");
          }

          result = payloadResult;
          saveApiBase(apiBase);
          break;
        } catch (error) {
          if (isNetworkError(error)) {
            lastNetworkError = error;
            continue;
          }

          throw error;
        }
      }

      if (!result) {
        throw lastNetworkError || new Error("Serveur backend inaccessible.");
      }

      const nextProviderAccount = {
        email,
        nom,
        prenom,
        password,
        telephone,
        categorie: domaine,
        domaine,
        experience,
        photoProfil:
          result && result.prestataire
            ? String(result.prestataire.photoProfil || profilePreviewDataUrl || "")
            : profilePreviewDataUrl,
        statutVerification: "en_attente"
      };
      upsertProviderAccount(nextProviderAccount);
      setActiveProviderAccount(nextProviderAccount);
      applyActiveUserProfile();
      savePendingVerification("prestataire", email);
      setProviderSignupFeedback("Dossier envoyé. Statut : en attente de vérification admin.", "success");

      if (providerSignupLastNameInput) providerSignupLastNameInput.value = "";
      if (providerSignupFirstNameInput) providerSignupFirstNameInput.value = "";
      if (providerSignupEmailInput) providerSignupEmailInput.value = "";
      if (providerSignupPhoneInput) providerSignupPhoneInput.value = "";
      if (providerSignupPasswordInput) providerSignupPasswordInput.value = "";
      if (providerSignupDomainInput) providerSignupDomainInput.value = "";
      if (providerSignupExperienceInput) providerSignupExperienceInput.value = "";
      if (providerSignupPhotoUpload) providerSignupPhotoUpload.value = "";
      if (providerSignupCinUpload) providerSignupCinUpload.value = "";
      if (providerSignupCasierUpload) providerSignupCasierUpload.value = "";

      previousPageClass = "page28";
      showSubmissionWaitingPage("prestataire");
    } catch (error) {
      if (isNetworkError(error)) {
        setProviderSignupFeedback("Connexion backend impossible. Vérifie ta connexion internet puis réessaie.", "error");
      } else {
        setProviderSignupFeedback(error.message || "Erreur serveur.", "error");
      }
    } finally {
      providerSignupSubmitBtn.disabled = false;
    }
  });
}

if (backTo5Btn) {
  backTo5Btn.addEventListener("click", () => {
    const targetPage = previousPageClass && previousPageClass !== "page6" ? previousPageClass : "page4";
    goTo(targetPage);
  });
}

if (toFrame8Btn) {
  toFrame8Btn.addEventListener("click", () => {
    previousPageClass = "page6";
    setSignupFeedback("", "neutral");
    goTo("page5");
  });
}

if (openPage8OverlayBtn) {
  openPage8OverlayBtn.addEventListener("click", () => {
    openPage8Overlay();
  });
}

if (closePage8OverlayBtn) {
  closePage8OverlayBtn.addEventListener("click", () => {
    closePage8Overlay();
  });
}

if (closePage8OverlayArrowBtn) {
  closePage8OverlayArrowBtn.addEventListener("click", () => {
    closePage8Overlay();
  });
}

if (openPage8NotifOverlayBtn) {
  openPage8NotifOverlayBtn.addEventListener("click", () => {
    openPage8NotifOverlay();
  });
}

if (closePage8NotifOverlayBtn) {
  closePage8NotifOverlayBtn.addEventListener("click", () => {
    closePage8NotifOverlay();
  });
}

if (closePage8NotifHeaderBtn) {
  closePage8NotifHeaderBtn.addEventListener("click", () => {
    closePage8NotifOverlay();
  });
}

if (openPage9Btn) {
  openPage9Btn.addEventListener("click", () => {
    previousPageClass = "page8";
    applyActiveUserProfile();
    goTo("page9");
  });
}

if (backTo8From9Btn) {
  backTo8From9Btn.addEventListener("click", () => {
    previousPageClass = "page9";
    clearHomeProviderCategoryFilter();
    goTo("page8");
  });
}

if (openPage10Btn) {
  openPage10Btn.addEventListener("click", () => {
    previousPageClass = "page8";
    goTo("page10");
  });
}

if (openPage10HomeBottomBtn) {
  openPage10HomeBottomBtn.addEventListener("click", () => {
    previousPageClass = "page8";
    goTo("page10");
  });
}

if (backTo8From10Btn) {
  backTo8From10Btn.addEventListener("click", () => {
    previousPageClass = "page10";
    clearHomeProviderCategoryFilter();
    goTo("page8");
  });
}

if (openPage14Btn) {
  openPage14Btn.addEventListener("click", () => {
    previousPageClass = "page8";
    focusProviderCategory("electricien");
  });
}

if (openPage14LabelBtn) {
  openPage14LabelBtn.addEventListener("click", () => {
    previousPageClass = "page8";
    focusProviderCategory("electricien");
  });
}

if (openPage15Btn) {
  openPage15Btn.addEventListener("click", () => {
    previousPageClass = "page8";
    focusProviderCategory("plombier");
  });
}

if (openPage15LabelBtn) {
  openPage15LabelBtn.addEventListener("click", () => {
    previousPageClass = "page8";
    focusProviderCategory("plombier");
  });
}

if (openPage8MechanicBtn) {
  openPage8MechanicBtn.addEventListener("click", () => {
    previousPageClass = "page8";
    focusProviderCategory("mecanicien");
  });
}

if (openPage8MechanicLabelBtn) {
  openPage8MechanicLabelBtn.addEventListener("click", () => {
    previousPageClass = "page8";
    focusProviderCategory("mecanicien");
  });
}

if (openPage8LocksmithBtn) {
  openPage8LocksmithBtn.addEventListener("click", () => {
    previousPageClass = "page8";
    focusProviderCategory("serrurier");
  });
}

if (openPage8LocksmithLabelBtn) {
  openPage8LocksmithLabelBtn.addEventListener("click", () => {
    previousPageClass = "page8";
    focusProviderCategory("serrurier");
  });
}

if (openPage8CarpenterBtn) {
  openPage8CarpenterBtn.addEventListener("click", () => {
    previousPageClass = "page8";
    focusProviderCategory("menuisier");
  });
}

if (openPage8CarpenterLabelBtn) {
  openPage8CarpenterLabelBtn.addEventListener("click", () => {
    previousPageClass = "page8";
    focusProviderCategory("menuisier");
  });
}

if (backToPreviousFrom15Btn) {
  backToPreviousFrom15Btn.addEventListener("click", () => {
    const targetPage = previousPageClass && previousPageClass !== "page15" ? previousPageClass : "page8";
    goTo(targetPage);
  });
}

if (openPage15From14Btn) {
  openPage15From14Btn.addEventListener("click", (event) => {
    event.preventDefault();
    focusProviderCategory("plombier");
  });
}

if (openPage14From15Btn) {
  openPage14From15Btn.addEventListener("click", (event) => {
    event.preventDefault();
    focusProviderCategory("electricien");
  });
}

if (openPage14ElectricianBtn) {
  openPage14ElectricianBtn.addEventListener("click", (event) => {
    event.preventDefault();
    focusProviderCategory("electricien");
  });
}

if (openPage14MechanicBtn) {
  openPage14MechanicBtn.addEventListener("click", (event) => {
    event.preventDefault();
    focusProviderCategory("mecanicien");
  });
}

if (openPage14LocksmithBtn) {
  openPage14LocksmithBtn.addEventListener("click", (event) => {
    event.preventDefault();
    focusProviderCategory("serrurier");
  });
}

if (openPage14CarpenterBtn) {
  openPage14CarpenterBtn.addEventListener("click", (event) => {
    event.preventDefault();
    focusProviderCategory("menuisier");
  });
}

if (openPage15PlumberBtn) {
  openPage15PlumberBtn.addEventListener("click", (event) => {
    event.preventDefault();
    focusProviderCategory("plombier");
  });
}

if (openPage15MechanicBtn) {
  openPage15MechanicBtn.addEventListener("click", (event) => {
    event.preventDefault();
    focusProviderCategory("mecanicien");
  });
}

if (openPage15LocksmithBtn) {
  openPage15LocksmithBtn.addEventListener("click", (event) => {
    event.preventDefault();
    focusProviderCategory("serrurier");
  });
}

if (openPage15CarpenterBtn) {
  openPage15CarpenterBtn.addEventListener("click", (event) => {
    event.preventDefault();
    focusProviderCategory("menuisier");
  });
}

if (openPage15OverlayBtn) {
  openPage15OverlayBtn.addEventListener("click", () => {
    openPage15Overlay();
  });
}

if (closePage15OverlayBtn) {
  closePage15OverlayBtn.addEventListener("click", () => {
    closePage15Overlay();
  });
}

if (openPage15NotifOverlayBtn) {
  openPage15NotifOverlayBtn.addEventListener("click", () => {
    openPage15NotifOverlay();
  });
}

if (closePage15NotifOverlayBtn) {
  closePage15NotifOverlayBtn.addEventListener("click", () => {
    closePage15NotifOverlay();
  });
}

if (openLogoutConfirmBtns.length > 0) {
  openLogoutConfirmBtns.forEach((button) => {
    button.addEventListener("click", () => {
      openLogoutConfirmOverlay();
    });
  });
}

if (closeLogoutConfirmBtn) {
  closeLogoutConfirmBtn.addEventListener("click", () => {
    closeLogoutConfirmOverlay();
  });
}

if (cancelLogoutBtn) {
  cancelLogoutBtn.addEventListener("click", () => {
    closeLogoutConfirmOverlay();
  });
}

if (confirmLogoutBtn) {
  confirmLogoutBtn.addEventListener("click", () => {
    performLogoutAndReturnToStart();
  });
}

if (closeProviderApprovedPopupBtn) {
  closeProviderApprovedPopupBtn.addEventListener("click", () => {
    closeProviderApprovedPopup();
  });
}

if (providerApprovedPopupContinueBtn) {
  const handleProviderApprovedContinue = (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    continueFromProviderApprovedPopup();
  };

  providerApprovedPopupContinueBtn.addEventListener("click", handleProviderApprovedContinue);
  providerApprovedPopupContinueBtn.addEventListener("touchend", handleProviderApprovedContinue, { passive: false });
}

if (openPage14OverlayBtn) {
  openPage14OverlayBtn.addEventListener("click", () => {
    openPage14Overlay();
  });
}

if (closePage14OverlayBtn) {
  closePage14OverlayBtn.addEventListener("click", () => {
    closePage14Overlay();
  });
}

if (closePage14OverlayArrowBtn) {
  closePage14OverlayArrowBtn.addEventListener("click", () => {
    closePage14Overlay();
  });
}

if (openPage14NotifOverlayBtn) {
  openPage14NotifOverlayBtn.addEventListener("click", () => {
    openPage14NotifOverlay();
  });
}

if (closePage14NotifOverlayBtn) {
  closePage14NotifOverlayBtn.addEventListener("click", () => {
    closePage14NotifOverlay();
  });
}

if (closePage14NotifHeaderBtn) {
  closePage14NotifHeaderBtn.addEventListener("click", () => {
    closePage14NotifOverlay();
  });
}

if (page14OpenPage9Btn) {
  page14OpenPage9Btn.addEventListener("click", () => {
    previousPageClass = "page14";
    applyActiveUserProfile();
    goTo("page9");
  });
}

if (page14OpenPage10Btn) {
  page14OpenPage10Btn.addEventListener("click", () => {
    previousPageClass = "page14";
    goTo("page10");
  });
}

if (openPage10From14BottomBtn) {
  openPage10From14BottomBtn.addEventListener("click", () => {
    previousPageClass = "page14";
    goTo("page10");
  });
}

if (page15OpenPage9Btn) {
  page15OpenPage9Btn.addEventListener("click", () => {
    previousPageClass = "page15";
    applyActiveUserProfile();
    goTo("page9");
  });
}

if (page15OpenPage10Btn) {
  page15OpenPage10Btn.addEventListener("click", () => {
    previousPageClass = "page15";
    goTo("page10");
  });
}

if (openPage10From15BottomBtn) {
  openPage10From15BottomBtn.addEventListener("click", () => {
    previousPageClass = "page15";
    goTo("page10");
  });
}

if (openPage10From17BottomBtn) {
  openPage10From17BottomBtn.addEventListener("click", () => {
    previousPageClass = "page17";
    goTo("page10");
  });
}

if (openPage10From18BottomBtn) {
  openPage10From18BottomBtn.addEventListener("click", () => {
    previousPageClass = "page18";
    goTo("page10");
  });
}

if (openPage10From34BottomBtn) {
  openPage10From34BottomBtn.addEventListener("click", () => {
    previousPageClass = "page34";
    goTo("page10");
  });
}

if (openPage10From19BottomBtn) {
  openPage10From19BottomBtn.addEventListener("click", () => {
    previousPageClass = "page19";
    goTo("page10");
  });
}

if (openPage10From20BottomBtn) {
  openPage10From20BottomBtn.addEventListener("click", () => {
    previousPageClass = "page20";
    goTo("page10");
  });
}

if (openProviderProfileBtns.length > 0) {
  openProviderProfileBtns.forEach((button) => {
    button.addEventListener("click", () => {
      openProviderProfileFromButton(button);
    });
  });
}

document.addEventListener("click", (event) => {
  const dynamicButton = event.target.closest(".dynamic-provider-profile-btn");
  if (!dynamicButton) {
    return;
  }

  openProviderProfileFromButton(dynamicButton);
});

document.addEventListener("click", async (event) => {
  const openRequestChatButton = event.target.closest(".page10-request-chat-btn");
  if (openRequestChatButton) {
    const requestId = String((openRequestChatButton.dataset && openRequestChatButton.dataset.requestId) || "").trim();
    if (!requestId) {
      return;
    }
    selectedOngoingRequestId = requestId;
    await openOrderChatModalByRequestId(requestId);
    return;
  }

  const acceptRequestButton = event.target.closest(".page10-request-accept-btn");
  if (acceptRequestButton) {
    const requestId = String((acceptRequestButton.dataset && acceptRequestButton.dataset.requestId) || "").trim();
    if (!requestId) {
      return;
    }

    const acceptedRequest = applyProviderDecisionToRequestById(requestId, "accept");
    if (!acceptedRequest) {
      return;
    }

    await updateCommandeStatusForActiveParticipant(acceptedRequest.id, "en_cours");
    pushClientNotification(
      "request_created",
      `Votre demande a ete acceptee par ${String(acceptedRequest.providerName || "le prestataire").trim()}.`,
      { clientEmail: acceptedRequest.clientEmail, requestId: acceptedRequest.id }
    );
    renderPage10OngoingRequests();
    return;
  }

  const rejectRequestButton = event.target.closest(".page10-request-reject-btn");
  if (rejectRequestButton) {
    const requestId = String((rejectRequestButton.dataset && rejectRequestButton.dataset.requestId) || "").trim();
    if (!requestId) {
      return;
    }

    const rejectedRequest = applyProviderDecisionToRequestById(requestId, "reject");
    if (!rejectedRequest) {
      return;
    }

    await updateCommandeStatusForActiveParticipant(rejectedRequest.id, "annulee");
    pushClientNotification(
      "request_cancelled",
      "Le prestataire n'est pas en mesure d'accepter votre demande.",
      { clientEmail: rejectedRequest.clientEmail, requestId: rejectedRequest.id }
    );
    renderPage10OngoingRequests();
    return;
  }

  const cancelRequestButton = event.target.closest(".page10-request-cancel-btn");
  if (cancelRequestButton) {
    selectedOngoingRequestId = String(
      (cancelRequestButton.dataset && cancelRequestButton.dataset.requestId) || ""
    ).trim();
    if (!selectedOngoingRequestId) {
      return;
    }
    if (cancelReasonInput) {
      cancelReasonInput.value = "";
    }
    previousPageClass = "page10";
    goTo("page24");
    return;
  }

  const continueRequestButton = event.target.closest(".page10-request-continue-btn");
  if (continueRequestButton) {
    selectedOngoingRequestId = String(
      (continueRequestButton.dataset && continueRequestButton.dataset.requestId) || ""
    ).trim();
    const activeClientEmail = getActiveClientEmail();
    if (!activeClientEmail) {
      return;
    }
    const selectedRequest = getClientOngoingRequestById(selectedOngoingRequestId);
    if (!selectedRequest) {
      const anyStatusRequest = getClientRequestByIdAnyStatus(selectedOngoingRequestId, activeClientEmail);
      const requestStatus = normalizeRequestLifecycleStatus(anyStatusRequest && anyStatusRequest.status, "en_cours");
      if (requestStatus === "en_attente_prestataire") {
        window.alert("Le prestataire n'a pas encore repondu. Merci de patienter.");
        return;
      }
      if (requestStatus === "annule") {
        window.alert("Le prestataire n'est pas en mesure d'accepter la demande.");
        previousPageClass = "page10";
        goTo("page8");
        return;
      }
    }
    if (selectedRequest) {
      hydrateCurrentOrderContextFromOngoingRequest(selectedRequest);
      applyPage19RequestDateTime(selectedRequest.createdAt);
    }
    previousPageClass = "page10";
    goTo("page19");
    return;
  }
});

if (backTo14From17Btn) {
  backTo14From17Btn.addEventListener("click", () => {
    const targetPage =
      previousPageClass && previousPageClass !== "page17" ? previousPageClass : "page14";
    goTo(targetPage);
  });
}

if (providerPaymentOptionButtons.length > 0) {
  providerPaymentOptionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const method = button && button.dataset ? button.dataset.paymentMethod : "";
      applyProviderPaymentMethod(method);
    });
  });
}

applyProviderPaymentMethod(selectedProviderPaymentMethod);
applyCurrentOrderTrackingSummary();

if (openPage18Btn) {
  openPage18Btn.addEventListener("click", () => {
    applyProviderPaymentMethod(selectedProviderPaymentMethod);
    applyCurrentOrderDemandSummary();
    applyCurrentOrderTrackingSummary();
    previousPageClass = "page17";
    goTo("page18");
  });
}

if (openPage18AddressOverlayBtn) {
  openPage18AddressOverlayBtn.addEventListener("click", () => {
    openPage18AddressOverlay();
  });
}

if (page18ConfirmAddressBtn) {
  page18ConfirmAddressBtn.addEventListener("click", () => {
    if (!hasPage18ManualMapAddressSelected()) {
      requestManualMapAddressSelection();
      syncPage18ConfirmAddressButtonState();
      syncPage18PaymentButtonState();
      return;
    }

    const distancePricing = resolveCurrentOrderDistancePricingFromMap();
    if (!distancePricing) {
      setPage18AddressFeedback(
        "Impossible de calculer la distance avec le prestataire. Vérifiez les positions puis réessayez.",
        "error"
      );
      return;
    }

    currentOrderTracking.distanceKm = Number(distancePricing.distanceKm);
    currentOrderTracking.calculatedPriceDh = Number(distancePricing.totalPriceDh);
    currentOrderTracking.addressConfirmed = true;
    setPage18AddressFeedback(
      `Adresse confirmée. Distance: ${Number(distancePricing.distanceKm).toFixed(2)} km, prix: ${Math.round(
        Number(distancePricing.totalPriceDh)
      )}DH.`,
      "success"
    );
    applyCurrentOrderTrackingSummary();
  });
}

if (closePage18AddressOverlayBtn) {
  closePage18AddressOverlayBtn.addEventListener("click", () => {
    closePage18AddressOverlay();
  });
}

if (cancelPage18AddressBtn) {
  cancelPage18AddressBtn.addEventListener("click", () => {
    closePage18AddressOverlay();
  });
}

if (savePage18AddressBtn) {
  savePage18AddressBtn.addEventListener("click", () => {
    const manualAddress = page18AddressInput ? page18AddressInput.value : "";
    if (!applyManualOrderAddress(manualAddress)) {
      setPage18AddressFeedback("Merci d'entrer une adresse valide.", "error");
      return;
    }

    closePage18AddressOverlay();
  });
}

if (page18AddressGeolocBtn) {
  page18AddressGeolocBtn.addEventListener("click", async () => {
    const previousLabel = page18AddressGeolocBtn.textContent;
    page18AddressGeolocBtn.disabled = true;
    page18AddressGeolocBtn.textContent = "Localisation...";
    setPage18AddressFeedback("Détection de votre position en cours...", "neutral");

    try {
      await applyGpsOrderAddressFromDevice();
      if (page18AddressInput) {
        page18AddressInput.value = String(currentOrderTracking.addressLabel || "");
      }
      setPage18AddressFeedback("Adresse GPS appliquee.", "success");
      window.setTimeout(() => {
        closePage18AddressOverlay();
      }, 250);
    } catch (error) {
      setPage18AddressFeedback(
        (error && error.message) || "Géolocalisation indisponible. Entrez votre adresse manuellement.",
        "error"
      );
    } finally {
      page18AddressGeolocBtn.disabled = false;
      page18AddressGeolocBtn.textContent = previousLabel;
    }
  });
}

if (backTo17From18Btn) {
  backTo17From18Btn.addEventListener("click", () => {
    previousPageClass = "page18";
    goTo("page17");
  });
}

if (openPage19Btn) {
  openPage19Btn.addEventListener("click", async () => {
    if (openPage19Btn.disabled) {
      return;
    }
    if (!hasPage18ManualMapAddressConfirmed()) {
      requestManualMapAddressSelection();
      syncPage18ConfirmAddressButtonState();
      syncPage18PaymentButtonState();
      return;
    }

    const labelNode = openPage19Btn.querySelector("span") || openPage19Btn;
    const previousLabel = labelNode.textContent;
    openPage19Btn.disabled = true;
    labelNode.textContent = "Validation...";
    pendingOrderSubmissionInProgress = true;
    previousPageClass = "page18";
    goTo("page34");

    try {
      const activeAddress = String((currentOrderTracking && currentOrderTracking.addressLabel) || "").trim();
      const normalizedAddressSource = String((currentOrderTracking && currentOrderTracking.addressSource) || "")
        .trim()
        .toLowerCase();
      const hasManualMapPoint =
        normalizedAddressSource === "manual_map" && hasCurrentOrderTrackingGeo();
      if (!hasManualMapPoint) {
        throw new Error("Adresse manuelle sur la carte obligatoire avant paiement.");
      }
      const confirmedDistanceKm = Number(currentOrderTracking && currentOrderTracking.distanceKm);
      const confirmedPriceDh = Number(currentOrderTracking && currentOrderTracking.calculatedPriceDh);

      const locationForOrder = {
        latitude: Number(currentOrderTracking.latitude),
        longitude: Number(currentOrderTracking.longitude),
        accuracy: null,
        locationLabel: activeAddress || "manual_map"
      };
      labelNode.textContent = "Traitement...";
      const payload = await submitCommandeFromCurrentContext(locationForOrder);
      const pricing = payload && payload.pricing ? payload.pricing : null;
      const resolvedDistanceKm =
        pricing && Number.isFinite(Number(pricing.distanceKm))
          ? Number(pricing.distanceKm)
          : Number.isFinite(confirmedDistanceKm)
            ? confirmedDistanceKm
            : null;
      const resolvedPriceDh = Number.isFinite(confirmedPriceDh)
        ? Math.round(confirmedPriceDh)
        : Number.isFinite(Number(resolvedDistanceKm))
          ? calculateDistanceBasedPriceDh(resolvedDistanceKm)
          : null;
      const hasManualAddress = Boolean(activeAddress);

      currentOrderTracking = {
        addressLabel: hasManualAddress ? activeAddress : formatOrderAddressLabel(locationForOrder),
        distanceKm: resolvedDistanceKm,
        calculatedPriceDh: Number.isFinite(Number(resolvedPriceDh)) ? Number(resolvedPriceDh) : null,
        latitude: Number(locationForOrder.latitude),
        longitude: Number(locationForOrder.longitude),
        addressSource: "manual_map",
        addressConfirmed: true
      };
      page20MapGeoAttempted = true;
      applyCurrentOrderTrackingSummary();
      const createdRequest = saveCurrentOrderToOngoingRequests(payload);
      if (createdRequest) {
        selectedOngoingRequestId = String(createdRequest.id || "").trim();
        lastPaidRequestTimestamp = String(createdRequest.createdAt || new Date().toISOString());
        applyPage19RequestDateTime(lastPaidRequestTimestamp);
        pushClientNotification(
          "request_created",
          `Demande envoyée à ${createdRequest.providerName || "votre prestataire"}.`,
          { requestId: createdRequest.id }
        );
        const providerNotifEmail = resolveProviderEmailForRequest(createdRequest);
        if (providerNotifEmail) {
          const clientLabel =
            String((createdRequest && createdRequest.clientName) || "").trim() || "un client";
          pushProviderNotification(
            "provider_request_received",
            `Nouvelle demande recue de ${clientLabel}.`,
            { providerEmail: providerNotifEmail, requestId: createdRequest.id }
          );
        }
      } else {
        lastPaidRequestTimestamp = new Date().toISOString();
        applyPage19RequestDateTime(lastPaidRequestTimestamp);
      }
    } catch (error) {
      previousPageClass = "page34";
      goTo("page18");
      window.alert(error && error.message ? error.message : "Commande non enregistrée.");
    } finally {
      pendingOrderSubmissionInProgress = false;
      openPage19Btn.disabled = false;
      labelNode.textContent = previousLabel;
      syncPage18PaymentButtonState();
    }
  });
}

if (openPage20Btn) {
  openPage20Btn.addEventListener("click", async () => {
    const activeClientEmail = getActiveClientEmail();
    if (!activeClientEmail) {
      previousPageClass = "page19";
      goTo("page4");
      return;
    }

    try {
      await syncOngoingRequestsFromBackendForActiveParticipant();
    } catch (error) {
      // keep local fallback when backend is temporarily unreachable
    }

    const requestIdFromState = String(selectedOngoingRequestId || "").trim();
    const requestFromState = requestIdFromState
      ? getClientRequestByIdAnyStatus(requestIdFromState, activeClientEmail)
      : null;
    const activeRequest = requestFromState || getLatestClientRequestForWaitingFlow(activeClientEmail);

    if (!activeRequest) {
      window.alert("Aucune demande active trouvee.");
      previousPageClass = "page19";
      goTo("page10");
      return;
    }

    const requestStatus = normalizeRequestLifecycleStatus(activeRequest.status, "en_attente_prestataire");
    if (requestStatus === "annule") {
      window.alert("Le prestataire n'est pas en mesure d'accepter la demande.");
      previousPageClass = "page19";
      goTo("page8");
      return;
    }

    if (requestStatus !== "en_cours") {
      window.alert("Le prestataire n'a pas encore repondu. Merci de patienter.");
      previousPageClass = "page19";
      goTo("page34");
      return;
    }

    selectedOngoingRequestId = String(activeRequest.id || "").trim();
    hydrateCurrentOrderContextFromOngoingRequest(activeRequest);
    applyCurrentOrderTrackingSummary();
    previousPageClass = "page19";
    goTo("page20");
  });
}

if (openPage19From34Btn) {
  openPage19From34Btn.addEventListener("click", async () => {
    if (pendingOrderSubmissionInProgress) {
      window.alert("Traitement de la demande en cours...");
      return;
    }

    const activeClientEmail = getActiveClientEmail();
    if (!activeClientEmail) {
      previousPageClass = "page34";
      goTo("page4");
      return;
    }

    try {
      await syncOngoingRequestsFromBackendForActiveParticipant();
    } catch (error) {
      // keep local fallback when backend is temporarily unreachable
    }

    const requestIdFromState = String(selectedOngoingRequestId || "").trim();
    const requestFromState = requestIdFromState
      ? getClientRequestByIdAnyStatus(requestIdFromState, activeClientEmail)
      : null;
    const activeRequest = requestFromState || getLatestClientRequestForWaitingFlow(activeClientEmail);
    if (!activeRequest) {
      window.alert("Aucune demande active trouvee.");
      previousPageClass = "page34";
      goTo("page8");
      return;
    }

    selectedOngoingRequestId = String(activeRequest.id || "").trim();
    const requestStatus = normalizeRequestLifecycleStatus(activeRequest.status, "en_attente_prestataire");
    if (requestStatus === "annule") {
      window.alert("Le prestataire n'est pas en mesure d'accepter la demande.");
      previousPageClass = "page34";
      goTo("page8");
      return;
    }
    if (requestStatus === "en_attente_prestataire") {
      window.alert("Le prestataire n'a pas encore repondu. Merci de patienter.");
      return;
    }

    hydrateCurrentOrderContextFromOngoingRequest(activeRequest);
    applyPage19RequestDateTime(activeRequest.createdAt);
    previousPageClass = "page34";
    goTo("page19");
  });
}

if (openPage31Btn) {
  openPage31Btn.addEventListener("click", () => {
    const activeClientEmail = getActiveClientEmail();
    if (activeClientEmail) {
      const selectedRequest =
        getClientRequestByIdAnyStatus(selectedOngoingRequestId, activeClientEmail) ||
        getLatestClientRequestForWaitingFlow(activeClientEmail);
      if (selectedRequest) {
        if (selectedRequest.id) {
          selectedOngoingRequestId = String(selectedRequest.id || "").trim();
        }
        hydrateCurrentOrderContextFromOngoingRequest(selectedRequest);
      }
    }
    previousPageClass = "page20";
    goTo("page31");
  });
}

if (backTo18From19Btn) {
  backTo18From19Btn.addEventListener("click", () => {
    previousPageClass = "page19";
    goTo("page18");
  });
}

if (backTo18From34Btn) {
  backTo18From34Btn.addEventListener("click", () => {
    previousPageClass = "page34";
    goTo("page18");
  });
}

if (backTo19From20Btn) {
  backTo19From20Btn.addEventListener("click", () => {
    previousPageClass = "page20";
    goTo("page19");
  });
}

if (backTo20From31Btn) {
  backTo20From31Btn.addEventListener("click", () => {
    previousPageClass = "page31";
    goTo("page20");
  });
}

if (backTo31From32Btn) {
  backTo31From32Btn.addEventListener("click", () => {
    previousPageClass = "page32";
    goTo("page31");
  });
}

if (clientInterventionWorkChoiceBtns.length > 0) {
  clientInterventionWorkChoiceBtns.forEach((button) => {
    button.addEventListener("click", () => {
      const choice = String((button && button.dataset && button.dataset.workDone) || "")
        .trim()
        .toLowerCase();
      if (choice !== "yes" && choice !== "no") {
        return;
      }

      selectedClientInterventionWorkDone = choice;
      syncClientInterventionWorkChoiceButtons();
      syncClientInterventionFinishButtonState();
      if (clientInterventionFeedback && clientInterventionFeedback.classList.contains("error")) {
        setClientInterventionFeedback("", "neutral");
      }
    });
  });
}

if (clientInterventionRatingStarBtns.length > 0) {
  clientInterventionRatingStarBtns.forEach((button) => {
    button.addEventListener("click", () => {
      const nextRating = Number((button && button.dataset && button.dataset.ratingValue) || 0);
      if (!Number.isFinite(nextRating) || nextRating < 1 || nextRating > 5) {
        return;
      }

      selectedClientInterventionRating = nextRating;
      syncClientInterventionRatingButtons();
      syncClientInterventionRatingMeta();
      syncClientInterventionFinishButtonState();
      if (clientInterventionFeedback && clientInterventionFeedback.classList.contains("error")) {
        setClientInterventionFeedback("", "neutral");
      }
    });
  });
}

if (clientInterventionPhotosInput) {
  clientInterventionPhotosInput.addEventListener("change", () => {
    syncClientInterventionPhotosMeta();
    syncClientInterventionFinishButtonState();
    if (clientInterventionFeedback && clientInterventionFeedback.classList.contains("error")) {
      setClientInterventionFeedback("", "neutral");
    }
  });
}

if (clientInterventionFinishBtn) {
  clientInterventionFinishBtn.addEventListener("click", async () => {
    if (clientInterventionFinishBtn.disabled) {
      return;
    }

    if (!pendingProviderIdentityCapture || !pendingProviderIdentityCapture.hash) {
      setClientInterventionFeedback("Vérification biométrique manquante. Revenez à l'étape précédente.", "error");
      return;
    }

    const resolvedRequestId = resolveActiveClientInterventionRequestId();
    if (!resolvedRequestId) {
      setClientInterventionFeedback("Aucune demande en cours a finaliser.", "error");
      return;
    }

    const selectedFiles =
      clientInterventionPhotosInput && clientInterventionPhotosInput.files
        ? Array.from(clientInterventionPhotosInput.files)
        : [];
    const photoNames = selectedFiles
      .map((file) => String((file && file.name) || "").trim())
      .filter((value) => Boolean(value));
    if (!photoNames.length) {
      setClientInterventionFeedback("Ajoutez au moins une photo de la prestation.", "error");
      return;
    }

    const completedRequest = completeClientOngoingRequestById(resolvedRequestId, {
      workDone: selectedClientInterventionWorkDone,
      rating: selectedClientInterventionRating,
      photoNames
    });
    if (!completedRequest) {
      setClientInterventionFeedback("Impossible de finaliser cette demande.", "error");
      return;
    }

    await updateCommandeStatusForActiveParticipant(completedRequest.id, "terminee");
    removeOrderChatLocalMessagesByRequestId(completedRequest.id);

    pushClientNotification(
      "request_created",
      `Prestation terminée avec ${String(completedRequest.providerName || "le prestataire").trim()}.`,
      { requestId: completedRequest.id }
    );
    const providerNotifEmail = resolveProviderEmailForRequest(completedRequest);
    if (providerNotifEmail) {
      const providerLabel = formatProviderFirstName(completedRequest.providerName || "prestataire") || "prestataire";
      pushProviderNotification(
        "provider_work_completed",
        `Intervention terminée. Confirmation client pour ${providerLabel}.`,
        { providerEmail: providerNotifEmail, requestId: completedRequest.id }
      );
      const receivedRating = Number(completedRequest && completedRequest.completionRating);
      if (Number.isFinite(receivedRating) && receivedRating >= 1) {
        pushProviderNotification(
          "provider_rating_received",
          `Nouvelle note recue: ${Math.round(receivedRating)}/5.`,
          { providerEmail: providerNotifEmail, requestId: completedRequest.id }
        );
      }
    }
    renderDynamicProviderDirectory();
    selectedOngoingRequestId = "";
    pendingProviderIdentityCapture = null;
    setClientInterventionFeedback("Prestation finalisee avec succes.", "success");
    previousPageClass = "page32";
    goTo("page22");
  });
}

if (providerIdentityCaptureBtn) {
  providerIdentityCaptureBtn.addEventListener("click", async () => {
    if (providerIdentityCaptureBtn.disabled) {
      return;
    }

    const previousLabel = providerIdentityCaptureBtn.textContent;
    pendingProviderIdentityCapture = null;
    syncProviderIdentityContinueButton(false);
    providerIdentityCaptureBtn.disabled = true;
    providerIdentityCaptureBtn.textContent = "Scan biométrie...";
    setProviderIdentityFeedback("Vérification biométrique du prestataire en cours...", "neutral");

    try {
      const providerAccount = await resolveProviderForClientIdentityVerification();
      if (!providerAccount || !providerAccount.email) {
        throw new Error("Informations du prestataire introuvables.");
      }

      if (!providerAccount.fingerprintCaptured) {
        throw new Error("Ce prestataire n'a pas encore d'empreinte/Face ID enregistrée.");
      }

      const fingerprintCapture = await captureDeviceFingerprint(providerAccount);
      if (!fingerprintCapture || !fingerprintCapture.hash) {
        throw new Error("Impossible de scanner la biométrie du prestataire.");
      }

      const captureMode = String(fingerprintCapture.mode || "").trim().toLowerCase();
      const expectedMode = String(providerAccount.fingerprintCaptureMode || "").trim().toLowerCase();
      if (expectedMode === "biometric" && captureMode !== "biometric") {
        throw new Error("Verification refusee: Face ID / empreinte du prestataire est obligatoire.");
      }

      const storedCredentialId = getStoredWebAuthnCredentialId(providerAccount.email);
      const capturedCredentialId = String(fingerprintCapture.credentialId || "").trim();
      if (
        expectedMode === "biometric" &&
        storedCredentialId &&
        capturedCredentialId &&
        storedCredentialId !== capturedCredentialId
      ) {
        throw new Error("Identifiant biométrique non reconnu pour ce prestataire.");
      }

      pendingProviderIdentityCapture = {
        providerEmail: providerAccount.email,
        hash: String(fingerprintCapture.hash || "").trim(),
        mode: captureMode || "fallback",
        credentialId: capturedCredentialId,
        reason: String(fingerprintCapture.reason || "").trim()
      };

      if (pendingProviderIdentityCapture.mode === "biometric") {
        setProviderIdentityFeedback(
          "Identite du prestataire verifiee par Face ID / empreinte. Cliquez sur Confirmer intervention.",
          "success"
        );
      } else {
        setProviderIdentityFeedback(
          "Vérification effectuée en mode simplifié. Cliquez sur Confirmer intervention pour finaliser.",
          "success"
        );
      }
      syncProviderIdentityContinueButton(true);
    } catch (error) {
      setProviderIdentityFeedback((error && error.message) || "Verification du prestataire impossible.", "error");
    } finally {
      providerIdentityCaptureBtn.disabled = false;
      providerIdentityCaptureBtn.textContent = previousLabel;
    }
  });
}

if (providerIdentityContinueBtn) {
  providerIdentityContinueBtn.addEventListener("click", () => {
    if (providerIdentityContinueBtn.disabled) {
      return;
    }

    if (!pendingProviderIdentityCapture || !pendingProviderIdentityCapture.hash) {
      syncProviderIdentityContinueButton(false);
      setProviderIdentityFeedback("Scannez d'abord la biométrie du prestataire.", "error");
      return;
    }

    const resolvedRequestId = resolveActiveClientInterventionRequestId();
    if (resolvedRequestId) {
      selectedOngoingRequestId = resolvedRequestId;
      const selectedRequest = getClientOngoingRequestById(resolvedRequestId);
      if (selectedRequest) {
        hydrateCurrentOrderContextFromOngoingRequest(selectedRequest);
      }
    }

    setProviderIdentityFeedback("Prestataire confirme. Passez a la finalisation de l'intervention.", "success");
    previousPageClass = "page31";
    goTo("page32");
  });
}

if (openPage22Btn) {
  openPage22Btn.addEventListener("click", () => {
    previousPageClass = "page10";
    goTo("page22");
  });
}

if (openPage23Btn) {
  openPage23Btn.addEventListener("click", () => {
    previousPageClass = "page10";
    goTo("page23");
  });
}

if (backTo10From22Btn) {
  backTo10From22Btn.addEventListener("click", () => {
    previousPageClass = "page22";
    goTo("page10");
  });
}

if (backTo10TabBtn) {
  backTo10TabBtn.addEventListener("click", () => {
    previousPageClass = "page22";
    goTo("page10");
  });
}

if (openPage23From22Btn) {
  openPage23From22Btn.addEventListener("click", () => {
    previousPageClass = "page22";
    goTo("page23");
  });
}

if (backTo10From23Btn) {
  backTo10From23Btn.addEventListener("click", () => {
    previousPageClass = "page23";
    goTo("page10");
  });
}

if (backTo10From23TabBtn) {
  backTo10From23TabBtn.addEventListener("click", () => {
    previousPageClass = "page23";
    goTo("page10");
  });
}

if (openPage22From23Btn) {
  openPage22From23Btn.addEventListener("click", () => {
    previousPageClass = "page23";
    goTo("page22");
  });
}

if (openPage21Btns.length > 0) {
  openPage21Btns.forEach((button) => {
    button.addEventListener("click", () => {
      previousPageClass = "page22";
      goTo("page21");
    });
  });
}

if (backTo22From21Btn) {
  backTo22From21Btn.addEventListener("click", () => {
    previousPageClass = "page21";
    goTo("page22");
  });
}

if (cancelPage21Btn) {
  cancelPage21Btn.addEventListener("click", () => {
    previousPageClass = "page21";
    goTo("page22");
  });
}

if (submitPage21Btn) {
  submitPage21Btn.addEventListener("click", () => {
    previousPageClass = "page21";
    goTo("page22");
  });
}

if (openPage24Btn) {
  openPage24Btn.addEventListener("click", () => {
    selectedOngoingRequestId = "";
    if (cancelReasonInput) {
      cancelReasonInput.value = "";
    }
    previousPageClass = "page10";
    goTo("page24");
  });
}

if (backTo10From24Btn) {
  backTo10From24Btn.addEventListener("click", () => {
    selectedOngoingRequestId = "";
    if (cancelReasonInput) {
      cancelReasonInput.value = "";
    }
    previousPageClass = "page24";
    goTo("page10");
  });
}

if (submitPage24Btn) {
  submitPage24Btn.addEventListener("click", () => {
    const cancellationReason = cancelReasonInput ? cancelReasonInput.value.trim() : "";
    const cancelledRequest = cancelClientOngoingRequestById(selectedOngoingRequestId, cancellationReason);

    if (cancelledRequest) {
      pushClientNotification(
        "request_cancelled",
        `Demande annulée avec ${String(cancelledRequest.providerName || "le prestataire").trim()}.`,
        { requestId: cancelledRequest.id }
      );
    }

    selectedOngoingRequestId = "";
    if (cancelReasonInput) {
      cancelReasonInput.value = "";
    }
    previousPageClass = "page24";
    goTo("page23");
  });
}

if (toFrame7Btn) {
  toFrame7Btn.addEventListener("click", () => {
    previousPageClass = "page6";
    setProviderSignupFeedback("", "neutral");
    goTo("page28");
  });
}

if (backTo6Btn) {
  backTo6Btn.addEventListener("click", () => {
    const targetPage = previousPageClass && previousPageClass !== "page7" ? previousPageClass : "page6";
    previousPageClass = "page7";
    goTo(targetPage);
  });
}

if (backTo6FromProviderSignupBtn) {
  backTo6FromProviderSignupBtn.addEventListener("click", () => {
    previousPageClass = "page28";
    goTo("page6");
  });
}

if (openPage16Btns.length > 0) {
  openPage16Btns.forEach((button) => {
    button.addEventListener("click", async () => {
      const activeScreen = document.querySelector(".screen.active");
      const sourcePage = getPageClassFromElement(activeScreen) || "page8";
      previousPageClass = sourcePage;
      const sourceRole = resolveProfileRoleFromPageClass(sourcePage);
      if (sourceRole) {
        setActiveProfileRole(sourceRole);
        lastResolvedProfileType = sourceRole;
      }
      await openSupportChatPage();
    });
  });
}

if (openHomeBtns.length > 0) {
  openHomeBtns.forEach((button) => {
    button.addEventListener("click", () => {
      previousPageClass = getPageClassFromElement(document.querySelector(".screen.active")) || "page8";
      clearHomeProviderCategoryFilter();
      goTo("page8");
    });
  });
}

if (backFrom16Btn) {
  backFrom16Btn.addEventListener("click", () => {
    stopSupportChatPolling();
    goTo(previousPageClass || "page8");
  });
}

if (supportChatForm) {
  supportChatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const participant = getActiveSupportParticipant();
    if (!participant) {
      setSupportChatFeedback("Connectez-vous pour parler au support.", "error");
      return;
    }

    const message = supportChatInput ? supportChatInput.value.trim() : "";
    if (!message) {
      setSupportChatFeedback("Ecrivez un message avant l'envoi.", "error");
      return;
    }

    if (supportChatSendBtn) {
      supportChatSendBtn.disabled = true;
    }
    setSupportChatFeedback("Envoi en cours...");

    try {
      const optimisticMessage = {
        participantEmail: participant.participantEmail,
        participantType: participant.participantType,
        participantName: participant.participantName,
        message,
        createdAt: new Date().toISOString()
      };
      pushSupportLocalMessage(optimisticMessage);
      supportChatCachedMessages = getSupportLocalMessagesByParticipant(participant.participantEmail);
      renderSupportChatMessages(supportChatCachedMessages, participant.participantType);

      const payload = await sendSupportMessageForParticipant(participant, message);
      const saved = payload && payload.supportMessage ? payload.supportMessage : null;
      if (supportChatInput) {
        supportChatInput.value = "";
      }
      if (saved && typeof saved === "object") {
        const remoteRows = getSupportLocalMessagesByParticipant(participant.participantEmail);
        upsertSupportLocalMessagesForParticipant(participant.participantEmail, [...remoteRows, saved]);
        supportChatCachedMessages = getSupportLocalMessagesByParticipant(participant.participantEmail);
        renderSupportChatMessages(supportChatCachedMessages, participant.participantType);
      }
      await refreshSupportChatMessages({ keepFeedback: true, silent: true });
      setSupportChatFeedback("Message envoye.", "success");
    } catch (error) {
      setSupportChatFeedback(error.message || "Envoi impossible.", "error");
    } finally {
      if (supportChatSendBtn) {
        supportChatSendBtn.disabled = false;
      }
    }
  });
}

if (orderChatCloseBackdropBtn) {
  orderChatCloseBackdropBtn.addEventListener("click", () => {
    closeOrderChatModal();
  });
}

if (orderChatCloseBtn) {
  orderChatCloseBtn.addEventListener("click", () => {
    closeOrderChatModal();
  });
}

if (orderChatForm) {
  orderChatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!activeOrderChatRequestId || !activeOrderChatParticipant) {
      setOrderChatFeedback("Aucune conversation active.", "error");
      return;
    }

    const message = String((orderChatInput && orderChatInput.value) || "").trim();
    if (!message) {
      setOrderChatFeedback("Entrez un message.", "error");
      return;
    }

    if (orderChatSendBtn) {
      orderChatSendBtn.disabled = true;
    }
    setOrderChatFeedback("Envoi du message...");

    try {
      const sentToBackend = await sendOrderChatMessage(activeOrderChatRequestId, activeOrderChatParticipant, message);
      if (orderChatInput) {
        orderChatInput.value = "";
      }
      await refreshOrderChatMessages();
      setOrderChatFeedback(
        sentToBackend
          ? "Message envoyé."
          : "Message enregistré localement (backend indisponible).",
        sentToBackend ? "success" : "error"
      );
    } catch (error) {
      setOrderChatFeedback((error && error.message) || "Envoi impossible.", "error");
    } finally {
      if (orderChatSendBtn) {
        orderChatSendBtn.disabled = false;
      }
    }
  });
}

if (page33ChatForm) {
  page33ChatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!activeOrderChatRequestId || !activeOrderChatParticipant) {
      setOrderChatFeedback("Aucune conversation active.", "error");
      return;
    }

    const message = String((page33ChatInput && page33ChatInput.value) || "").trim();
    if (!message) {
      setOrderChatFeedback("Entrez un message.", "error");
      return;
    }

    if (page33ChatSendBtn) {
      page33ChatSendBtn.disabled = true;
    }
    setOrderChatFeedback("Envoi du message...");

    try {
      const sentToBackend = await sendOrderChatMessage(activeOrderChatRequestId, activeOrderChatParticipant, message);
      if (page33ChatInput) {
        page33ChatInput.value = "";
      }
      await refreshOrderChatMessages();
      setOrderChatFeedback(
        sentToBackend
          ? "Message envoyé."
          : "Message enregistré localement (backend indisponible).",
        sentToBackend ? "success" : "error"
      );
    } catch (error) {
      setOrderChatFeedback((error && error.message) || "Envoi impossible.", "error");
    } finally {
      if (page33ChatSendBtn) {
        page33ChatSendBtn.disabled = false;
      }
    }
  });
}

if (openPage33ChatBtn) {
  openPage33ChatBtn.addEventListener("click", () => {
    openDefaultOrderChatConversation().catch(() => {
      setOrderChatFeedback("Impossible d'ouvrir le chat.", "error");
    });
  });
}

if (openPage20ChatBtn) {
  openPage20ChatBtn.addEventListener("click", () => {
    openDefaultOrderChatConversation().catch(() => {
      setOrderChatFeedback("Impossible d'ouvrir le chat.", "error");
    });
  });
}

if (openPage8ChatBtn) {
  openPage8ChatBtn.addEventListener("click", () => {
    openDefaultOrderChatConversation().catch(() => {
      setOrderChatFeedback("Impossible d'ouvrir le chat.", "error");
    });
  });
}

if (backTo19From33Btn) {
  backTo19From33Btn.addEventListener("click", () => {
    const activeRoleForChat = resolveActiveProfileTypeForChat();
    let targetPage = activeOrderChatReturnPage || (activeRoleForChat === "prestataire" ? "page10" : "page19");
    if (activeRoleForChat === "prestataire" && targetPage === "page19") {
      targetPage = "page10";
    }
    goTo(targetPage);
  });
}

if (waitingGoLoginBtn) {
  waitingGoLoginBtn.addEventListener("click", async () => {
    if (waitingGoLoginBtn.disabled) {
      return;
    }

    const pending = getPendingVerification();
    const waitingTypeContextLabel = String((waitingProfileType && waitingProfileType.textContent) || "")
      .trim()
      .toLowerCase();
    const isProviderWaitingContext =
      (pending && String(pending.profileType || "").trim().toLowerCase() === "prestataire") ||
      waitingTypeContextLabel.includes("prestataire") ||
      lastResolvedProfileType === "prestataire";

    if (isProviderWaitingContext) {
      const pendingProviderEmail =
        pending && String(pending.profileType || "").trim().toLowerCase() === "prestataire"
          ? String(pending.email || "").trim().toLowerCase()
          : "";
      const activeProviderEmail = getActiveProviderEmail();
      const providerEmail = pendingProviderEmail || activeProviderEmail;
      if (!providerEmail) {
        showSubmissionWaitingPage("prestataire", normalizeStatus(lastResolvedVerificationStatus || "en_attente"));
        return;
      }

      const localProviderPayload = findProviderAccountByEmail(providerEmail) || null;
      let remoteProviderPayload = null;
      try {
        remoteProviderPayload = await fetchVerificationStatusByType("prestataire", providerEmail, {
          allowNotFound: true
        });
      } catch (error) {
        // keep local payload fallback when backend is temporarily unreachable
      }

      const nextProviderPayload = {
        ...(localProviderPayload || {}),
        ...(remoteProviderPayload || {}),
        email: providerEmail
      };
      const nextProviderStatus = normalizeStatus(
        nextProviderPayload.statutVerification || lastResolvedVerificationStatus || "en_attente"
      );

      if (nextProviderStatus === "refuse") {
        clearPendingVerification();
        previousPageClass = "page29";
        goTo("page4");
        return;
      }

      if (!canProviderContinueAfterAdminApproval(nextProviderStatus, nextProviderPayload)) {
        showSubmissionWaitingPage("prestataire", nextProviderStatus || "en_attente");
        return;
      }

      activateProfileSession("prestataire", providerEmail, nextProviderPayload);
      clearPendingVerification();

      if (nextProviderStatus === "valide") {
        openProviderApprovedPopup();
        return;
      }

      const shouldOpenProviderSetupStep =
        shouldOpenProviderFingerprintStep("prestataire", nextProviderStatus, nextProviderPayload) ||
        shouldOpenProviderCoverageStep("prestataire", nextProviderStatus, nextProviderPayload);

      if (shouldOpenProviderSetupStep) {
        previousPageClass = "page29";
        goTo("page30");
        return;
      }

      showSubmissionWaitingPage("prestataire", nextProviderStatus || "en_attente");
      return;
    }

    const pendingClientEmail =
      pending && String(pending.profileType || "").trim().toLowerCase() === "client"
        ? String(pending.email || "").trim().toLowerCase()
        : "";
    const activeClientEmail = getActiveClientEmail();
    const clientEmail = pendingClientEmail || activeClientEmail;
    if (clientEmail) {
      const localClientPayload = findClientAccountByEmail(clientEmail) || null;
      let remoteClientPayload = null;
      try {
        remoteClientPayload = await fetchVerificationStatusByType("client", clientEmail, {
          allowNotFound: true
        });
      } catch (error) {
        // keep local payload fallback when backend is temporarily unreachable
      }

      const nextClientPayload = {
        ...(localClientPayload || {}),
        ...(remoteClientPayload || {}),
        email: clientEmail
      };
      const nextClientStatus = normalizeStatus(
        nextClientPayload.statutVerification || lastResolvedVerificationStatus || "en_attente"
      );

      if (nextClientStatus === "refuse") {
        clearPendingVerification();
        previousPageClass = "page29";
        goTo("page4");
        return;
      }

      if (!canClientContinueAfterAdminApproval(nextClientStatus, nextClientPayload)) {
        activateProfileSession("client", clientEmail, nextClientPayload);
        savePendingVerification("client", clientEmail);
        showSubmissionWaitingPage("client", nextClientStatus || "en_attente");
        return;
      }

      activateProfileSession("client", clientEmail, nextClientPayload);
      clearPendingVerification();
      previousPageClass = "page29";
      goTo("page8");
      return;
    }

    let nextProfileType = "";
    let nextPayload = null;
    let nextStatus = "";

    if (pending && pending.profileType && pending.email) {
      const profileType = String(pending.profileType || "").trim().toLowerCase();
      const email = String(pending.email || "").trim().toLowerCase();
      const localPayload =
        profileType === "prestataire" ? findProviderAccountByEmail(email) : findClientAccountByEmail(email);
      nextPayload = localPayload || null;
      nextStatus = normalizeStatus((nextPayload && nextPayload.statutVerification) || "en_attente");

      if (profileType === "prestataire") {
        try {
          const remotePayload = await fetchVerificationStatusByType("prestataire", email, { allowNotFound: true });
          if (remotePayload) {
            nextPayload = {
              ...(nextPayload || {}),
              ...remotePayload,
              email
            };
            nextStatus = normalizeStatus(remotePayload.statutVerification || nextStatus || "en_attente");
          }
        } catch (error) {
          // keep local payload fallback when backend is temporarily unreachable
        }

        if (!canProviderContinueAfterAdminApproval(nextStatus, nextPayload)) {
          if (nextStatus === "refuse") {
            clearPendingVerification();
            previousPageClass = "page29";
            goTo("page4");
            return;
          }

          showSubmissionWaitingPage("prestataire", nextStatus || "en_attente");
          return;
        }
      }

      activateProfileSession(profileType, email, nextPayload || null);
      clearPendingVerification();
      nextProfileType = profileType;
    }

    previousPageClass = "page29";
    const nextProviderStatus = normalizeStatus(nextStatus || (nextPayload && nextPayload.statutVerification) || "");
    if (nextProfileType === "prestataire") {
      if (nextProviderStatus === "valide") {
        openProviderApprovedPopup();
        return;
      }

      const shouldOpenProviderSetupStep =
        shouldOpenProviderFingerprintStep("prestataire", nextProviderStatus, nextPayload) ||
        shouldOpenProviderCoverageStep("prestataire", nextProviderStatus, nextPayload);
      if (shouldOpenProviderSetupStep) {
        goTo("page30");
        return;
      }
    }

    if (!nextProfileType && lastResolvedProfileType === "prestataire") {
      const resolvedStatus = normalizeStatus(lastResolvedVerificationStatus || "en_attente");
      if (resolvedStatus === "valide") {
        openProviderApprovedPopup();
        return;
      }

      const shouldOpenResolvedProviderSetupStep =
        shouldOpenProviderFingerprintStep("prestataire", resolvedStatus) ||
        shouldOpenProviderCoverageStep("prestataire", resolvedStatus);
      if (shouldOpenResolvedProviderSetupStep) {
        goTo("page30");
        return;
      }

      if (!canProviderContinueAfterAdminApproval(resolvedStatus)) {
        if (resolvedStatus === "refuse") {
          previousPageClass = "page29";
          goTo("page4");
          return;
        }

        showSubmissionWaitingPage("prestataire", resolvedStatus || "en_attente");
        return;
      }
    }

    const waitingTypeLabel = String((waitingProfileType && waitingProfileType.textContent) || "")
      .trim()
      .toLowerCase();
    const waitingStatusLabel = String((waitingStatusMessage && waitingStatusMessage.textContent) || "")
      .trim()
      .toLowerCase();
    if (waitingTypeLabel.includes("prestataire") && waitingStatusLabel.includes("approuv")) {
      openProviderApprovedPopup();
      return;
    }

    goTo("page4");
  });
}

if (backTo29From30Btn) {
  backTo29From30Btn.addEventListener("click", () => {
    const targetPage = previousPageClass && previousPageClass !== "page30" ? previousPageClass : "page29";
    previousPageClass = "page30";
    goTo(targetPage);
  });
}

function openProviderCoverageManualSelection() {
  providerCoverageManualPickMode = true;
  const centerLocation = getProviderCoverageMapCenterLocation();
  setProviderCoverageManualInputsFromLocation(centerLocation);
  setProviderCoverageManualFormVisibility(Boolean(providerCoverageGoogleMapUnavailable));
  syncProviderCoverageMap(providerCoverageLocationData);
  if (providerCoverageGoogleMapUnavailable) {
    setProviderCoverageFeedback(
      "Carte indisponible. Entrez latitude et longitude puis validez la position manuelle.",
      "error"
    );
  } else if (!hasProviderCoverageLocation(providerCoverageLocationData)) {
    setProviderCoverageFeedback("Position manuelle obligatoire: touchez la carte pour choisir votre position.", "neutral");
  } else if (!isProviderCoverageManualLocation(providerCoverageLocationData)) {
      setProviderCoverageFeedback("Position détectée. Sélection manuelle obligatoire avant de continuer.", "neutral");
  } else {
    setProviderCoverageFeedback("Mode manuel actif : déplacez la carte puis touchez pour ajuster votre position.", "neutral");
  }
}

if (providerCoverageEnableBtn) {
  providerCoverageEnableBtn.addEventListener("click", () => {
    openProviderCoverageManualSelection();
  });
}

if (providerCoverageManualBtn) {
  providerCoverageManualBtn.addEventListener("click", () => {
    openProviderCoverageManualSelection();
  });
}

if (providerCoverageManualApplyBtn) {
  providerCoverageManualApplyBtn.addEventListener("click", async () => {
    const latitude = parseProviderCoverageManualCoordinate(
      providerCoverageLatInput ? providerCoverageLatInput.value : ""
    );
    const longitude = parseProviderCoverageManualCoordinate(
      providerCoverageLngInput ? providerCoverageLngInput.value : ""
    );

    if (latitude == null || longitude == null) {
      setProviderCoverageFeedback("Entrez une latitude et une longitude valides.", "error");
      return;
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      setProviderCoverageFeedback("Coordonnées invalides. Latitude -90..90, Longitude -180..180.", "error");
      return;
    }
    if (isNullIslandCoordinate(latitude, longitude)) {
      setProviderCoverageFeedback(
        "Coordonnées 0,0 non autorisées. Utilisez 27.14867, -13.19321 ou votre position réelle.",
        "error"
      );
      return;
    }

    providerCoverageManualPickMode = true;
    const manualLocation = {
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracy: null,
      locationLabel: "manual_coordinates"
    };

    const previousLabel = providerCoverageManualApplyBtn.textContent;
    providerCoverageManualApplyBtn.disabled = true;
    providerCoverageManualApplyBtn.textContent = "Sauvegarde...";
    const savedAccount = saveProviderCoverageFromLocation(manualLocation);
    let backendSaved = false;
    let backendErrorMessage = "";
    try {
      await saveProviderCoverageToBackend(manualLocation, savedAccount);
      backendSaved = true;
    } catch (error) {
      backendSaved = false;
      backendErrorMessage = String((error && error.message) || "").trim();
    }
    applyProviderCoverageStepUi(manualLocation, { preserveFeedback: true });
    if (backendSaved) {
      setProviderCoverageFeedback("Position manuelle enregistrée et sauvegardée en base.", "success");
    } else {
      setProviderCoverageFeedback(
        backendErrorMessage
          ? `Position manuelle enregistrée localement, mais sauvegarde serveur impossible (${backendErrorMessage}). Réessayez avant de continuer.`
          : "Position manuelle enregistrée localement, mais sauvegarde serveur impossible. Réessayez avant de continuer.",
        "error"
      );
    }
    providerCoverageManualApplyBtn.disabled = false;
    providerCoverageManualApplyBtn.textContent = previousLabel;
  });
}

if (providerCoverageContinueBtn) {
  providerCoverageContinueBtn.addEventListener("click", async () => {
    if (providerCoverageContinueBtn.disabled) {
      return;
    }

    let account = resolveProviderForFingerprintAccessFromLocalState() || getActiveProviderAccount();
    const hasUiCoverageLocation = hasProviderCoverageLocation(providerCoverageLocationData);
    const hasUiManualCoverage = hasUiCoverageLocation && isProviderCoverageManualLocation(providerCoverageLocationData);
    if (!isProviderCoverageManualReady(account) && hasUiManualCoverage) {
      const savedAccount = saveProviderCoverageFromLocation(providerCoverageLocationData);
      if (savedAccount) {
        account = savedAccount;
      }
    }

    const canContinueWithCoverage = isProviderCoverageManualReady(account) || hasUiManualCoverage;
    if (!canContinueWithCoverage) {
      syncProviderCoverageContinueButton(false);
      setProviderCoverageFeedback("Position manuelle obligatoire avant de continuer.", "error");
      return;
    }

    const locationToPersist = hasUiManualCoverage
      ? providerCoverageLocationData
      : resolveProviderCoverageLocationFromAccount(account);
    if (!hasProviderCoverageLocation(locationToPersist) || !isProviderCoverageManualLocation(locationToPersist)) {
      setProviderCoverageFeedback("Coordonnées manuelles manquantes. Choisissez votre position sur la carte.", "error");
      return;
    }

    const previousLabel = providerCoverageContinueBtn.textContent;
    providerCoverageContinueBtn.disabled = true;
    providerCoverageContinueBtn.textContent = "Sauvegarde...";
    try {
      await saveProviderCoverageToBackend(locationToPersist, account);
    } catch (error) {
      providerCoverageContinueBtn.disabled = false;
      providerCoverageContinueBtn.textContent = previousLabel;
      setProviderCoverageFeedback(
        (error && error.message) ||
          "Impossible de sauvegarder votre géolocalisation en base. Vérifiez le serveur puis réessayez.",
        "error"
      );
      return;
    }

    const isManualCoverage = isProviderCoverageManualLocation(providerCoverageLocationData);
    setProviderCoverageFeedback(
      isManualCoverage
        ? "Position manuelle validée. Redirection vers la vérification biométrique..."
        : "Position manuelle validée. Redirection vers la vérification biométrique...",
      "success"
    );
    providerCoverageContinueBtn.textContent = previousLabel;
    providerCoverageContinueBtn.disabled = false;
    previousPageClass = "page30";
    goTo("page7");
  });
}

if (fingerprintCaptureBtn) {
  fingerprintCaptureBtn.addEventListener("click", async () => {
    if (fingerprintCaptureBtn.disabled) {
      return;
    }

    const previousLabel = fingerprintCaptureBtn.textContent;
    pendingProviderFingerprintCapture = null;
    syncFingerprintContinueButton(false);
    fingerprintCaptureBtn.disabled = true;
    fingerprintCaptureBtn.textContent = "Lecture biométrique...";
    setFingerprintFeedback("Vérification biométrique en cours...");

    try {
      let account = resolveProviderForFingerprintAccessFromLocalState();
      if (!account) {
        account = await resolveProviderForFingerprintAccess();
      }
      if (!account) {
        throw new Error("Aucun compte prestataire trouvé. Reprenez l'inscription.");
      }

      const providerStatus = normalizeStatus(account.statutVerification || "");
      if (!canProviderContinueAfterAdminApproval(providerStatus, account)) {
        throw new Error("Votre profil prestataire doit être approuvé par l'administrateur avant de continuer.");
      }

      if (!isProviderCoverageManualReady(account)) {
        setFingerprintFeedback(
          "Position manuelle obligatoire : validez votre champ de prestation avant la vérification biométrique."
        );
        previousPageClass = "page7";
        goTo("page30");
        return;
      }

      const fingerprintCapture = await captureDeviceFingerprint(account);
      if (!fingerprintCapture || !fingerprintCapture.hash) {
        throw new Error("Impossible de générer la vérification biométrique (Face ID / empreinte).");
      }

      pendingProviderFingerprintCapture = {
        hash: String(fingerprintCapture.hash || "").trim(),
        mode: String(fingerprintCapture.mode || "").trim().toLowerCase(),
        credentialId: String(fingerprintCapture.credentialId || "").trim(),
        reason: String(fingerprintCapture.reason || "").trim()
      };

      if (pendingProviderFingerprintCapture.mode === "biometric") {
        setFingerprintFeedback(
          "Biométrie détectée (Face ID / empreinte). Données chiffrées et protégées. Cliquez sur Continuer pour finaliser."
        );
      } else {
        const fallbackReason = getFingerprintFallbackReasonText(pendingProviderFingerprintCapture.reason);
        setFingerprintFeedback(`${fallbackReason} Cliquez sur Continuer pour finaliser.`);
      }

      syncFingerprintContinueButton(true);
    } catch (error) {
      setFingerprintFeedback((error && error.message) || "Impossible de vérifier votre biométrie.");
    } finally {
      fingerprintCaptureBtn.disabled = false;
      fingerprintCaptureBtn.textContent = previousLabel;
    }
  });
}

if (fingerprintContinueBtn) {
  fingerprintContinueBtn.addEventListener("click", async () => {
    if (fingerprintContinueBtn.disabled) {
      return;
    }

    if (!pendingProviderFingerprintCapture || !pendingProviderFingerprintCapture.hash) {
      syncFingerprintContinueButton(false);
      setFingerprintFeedback("Validez d'abord Face ID ou empreinte.");
      return;
    }

    fingerprintContinueBtn.disabled = true;
    if (fingerprintCaptureBtn) {
      fingerprintCaptureBtn.disabled = true;
    }
    setFingerprintFeedback("Validation finale biométrique en cours...");

    try {
      let account = resolveProviderForFingerprintAccessFromLocalState();
      if (!account) {
        account = await resolveProviderForFingerprintAccess();
      }
      if (!account) {
        throw new Error("Aucun compte prestataire trouvé. Reprenez l'inscription.");
      }

      const providerStatus = normalizeStatus(account.statutVerification || "");
      if (!canProviderContinueAfterAdminApproval(providerStatus, account)) {
        throw new Error("Votre profil prestataire doit être approuvé par l'administrateur avant de continuer.");
      }

      if (!isProviderCoverageManualReady(account)) {
        setFingerprintFeedback(
          "Position manuelle obligatoire : validez votre champ de prestation avant la vérification biométrique."
        );
        previousPageClass = "page7";
        goTo("page30");
        return;
      }

      let locationData = resolveProviderCoverageLocationFromAccount(account);
      if (!hasProviderCoverageLocation(locationData) || !isProviderCoverageManualLocation(locationData)) {
        throw new Error("Position manuelle introuvable. Retournez à l'étape précédente pour la définir.");
      }

      setFingerprintFeedback("Empreinte validée. Enregistrement sécurisé en cours...");

      const payload = await submitPrestataireFingerprintCapture(
        account,
        pendingProviderFingerprintCapture.hash,
        locationData,
        {
          captureMode: pendingProviderFingerprintCapture.mode || "fallback",
          fingerprintCredentialId: pendingProviderFingerprintCapture.credentialId || ""
        }
      );
      const saved = payload && payload.prestataire ? payload.prestataire : null;
      const backendNextPage = String((payload && payload.nextPage) || "").trim().toLowerCase();
      const targetAppPage = backendNextPage === "page7" ? "page7" : "page8";
      const nextAccount = {
        ...account,
        email: String((saved && saved.email) || account.email || "").trim().toLowerCase(),
        nom: String((saved && saved.nom) || account.nom || "").trim(),
        prenom: String((saved && saved.prenom) || account.prenom || "").trim(),
        telephone: String((saved && saved.telephone) || account.telephone || "").trim(),
        categorie: String((saved && (saved.categorie || saved.domaine)) || account.categorie || account.domaine || "").trim(),
        domaine: String((saved && (saved.domaine || saved.categorie)) || account.domaine || account.categorie || "").trim(),
        experience: String((saved && saved.experience) || account.experience || "").trim(),
        photoProfil: String((saved && saved.photoProfil) || account.photoProfil || "").trim(),
        statutVerification: String((saved && saved.statutVerification) || "valide").toLowerCase(),
        fingerprintCaptured: true,
        fingerprintCaptureMode: String(
          (saved && saved.fingerprintCaptureMode) || pendingProviderFingerprintCapture.mode || "fallback"
        )
          .trim()
          .toLowerCase()
      };

      upsertProviderAccount(nextAccount);
      setActiveProviderAccount(nextAccount);
      applyActiveUserProfile();
      upsertVerifiedProviderDirectory(nextAccount);
      await syncVerifiedProviderDirectoryFromBackend();
      clearPendingVerification();

      pendingProviderFingerprintCapture = null;
      syncFingerprintContinueButton(false);
      setFingerprintFeedback("Empreinte enregistrée de manière sécurisée. Redirection vers l'application...");

      previousPageClass = "page7";
      goTo(targetAppPage);
    } catch (error) {
      setFingerprintFeedback((error && error.message) || "Impossible de confirmer le fingerprint pour le moment.");
      syncFingerprintContinueButton(Boolean(pendingProviderFingerprintCapture && pendingProviderFingerprintCapture.hash));
    } finally {
      if (fingerprintCaptureBtn) {
        fingerprintCaptureBtn.disabled = false;
      }
    }
  });
}

if (backTo7From25Btn) {
  backTo7From25Btn.addEventListener("click", () => {
    previousPageClass = "page25";
    goTo("page7");
  });
}

if (openPage26Btn) {
  openPage26Btn.addEventListener("click", () => {
    previousPageClass = "page25";
    goTo("page26");
  });
}

if (openPage27Btn) {
  openPage27Btn.addEventListener("click", () => {
    previousPageClass = "page25";
    goTo("page27");
  });
}

if (backTo25From26Btn) {
  backTo25From26Btn.addEventListener("click", () => {
    previousPageClass = "page26";
    goTo("page25");
  });
}

if (backTo25From27Btn) {
  backTo25From27Btn.addEventListener("click", () => {
    previousPageClass = "page27";
    goTo("page25");
  });
}

if (submitProviderVerificationBtn) {
  submitProviderVerificationBtn.addEventListener("click", async () => {
    const nom = providerLastNameInput ? providerLastNameInput.value.trim() : "";
    const prenom = providerFirstNameInput ? providerFirstNameInput.value.trim() : "";
    const email = providerEmailInput ? providerEmailInput.value.trim() : "";
    const telephone = providerPhoneInput ? providerPhoneInput.value.trim() : "";
    const categorie = providerCategoryInput ? providerCategoryInput.value.trim() : "";
    const dateDeNaissance = providerBirthdateInput ? providerBirthdateInput.value.trim() : "";
    const casierFile = providerRecordUpload && providerRecordUpload.files ? providerRecordUpload.files[0] : null;
    const cinFile = providerIdUpload && providerIdUpload.files ? providerIdUpload.files[0] : null;

    if (!nom || !prenom || !email || !telephone || !categorie || !dateDeNaissance || !casierFile || !cinFile) {
      setProviderFeedback("Veuillez remplir tous les champs et charger les deux images obligatoires.", "error");
      return;
    }

    submitProviderVerificationBtn.disabled = true;
    setProviderFeedback("Soumission en cours...", "neutral");

    try {
      let result = null;
      let lastNetworkError = null;

      const buildPayload = () => {
        const payload = new FormData();
        payload.append("nom", nom);
        payload.append("prenom", prenom);
        payload.append("email", email);
        payload.append("telephone", telephone);
        payload.append("categorie", categorie);
        payload.append("domaine", categorie);
        payload.append("experience", categorie);
        payload.append("dateDeNaissance", dateDeNaissance);
        payload.append("cinImage", cinFile);
        payload.append("casierImage", casierFile);
        return payload;
      };

      for (const apiBase of getProviderApiCandidates()) {
        try {
          const response = await fetchWithTimeout(`${apiBase}/prestataires/inscription`, {
            method: "POST",
            body: buildPayload()
          });

          const payloadResult = await response.json().catch(() => ({}));
          if (!response.ok) {
            if (isRetryableApiCandidateResponse(response, payloadResult)) {
              lastNetworkError = new Error("API candidate incompatible pour l'inscription prestataire.");
              continue;
            }
            throw new Error(payloadResult.message || "Inscription impossible pour le moment.");
          }

          result = payloadResult;
          saveApiBase(apiBase);
          break;
        } catch (error) {
          if (isNetworkError(error)) {
            lastNetworkError = error;
            continue;
          }

          throw error;
        }
      }

      if (!result) {
        throw lastNetworkError || new Error("Serveur backend inaccessible.");
      }

      upsertProviderAccount({
        email,
        nom,
        prenom,
        telephone,
        categorie,
        domaine: categorie,
        experience: categorie,
        photoProfil: result && result.prestataire ? result.prestataire.photoProfil : "",
        statutVerification: "en_attente"
      });
      savePendingVerification("prestataire", email);
      setProviderFeedback("Votre dossier est envoyé. Statut : en attente de vérification admin.", "success");

      if (providerLastNameInput) providerLastNameInput.value = "";
      if (providerFirstNameInput) providerFirstNameInput.value = "";
      if (providerEmailInput) providerEmailInput.value = "";
      if (providerPhoneInput) providerPhoneInput.value = "";
      if (providerCategoryInput) providerCategoryInput.value = "";
      if (providerBirthdateInput) providerBirthdateInput.value = "";
      if (providerRecordUpload) providerRecordUpload.value = "";
      if (providerIdUpload) providerIdUpload.value = "";

      previousPageClass = "page26";
      showSubmissionWaitingPage("prestataire");
    } catch (error) {
      if (isNetworkError(error)) {
        setProviderFeedback("Connexion backend impossible. Vérifie ta connexion internet puis réessaie.", "error");
      } else {
        setProviderFeedback(error.message || "Erreur serveur.", "error");
      }
    } finally {
      submitProviderVerificationBtn.disabled = false;
    }
  });
}

if (submitCommerceVerificationBtn) {
  submitCommerceVerificationBtn.addEventListener("click", () => {
    const hasDescription = commerceDescriptionInput && commerceDescriptionInput.value.trim().length > 0;
    const hasPhotos = commercePhotosUpload && commercePhotosUpload.files && commercePhotosUpload.files.length > 0;

    if (!hasDescription || !hasPhotos) {
      alert("Veuillez ajouter la description de votre commerce et au moins une photo.");
      return;
    }

    previousPageClass = "page27";
    showSubmissionWaitingPage("prestataire");
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closePage8Overlay();
    closePage8NotifOverlay();
    closePage14Overlay();
    closePage14NotifOverlay();
    closePage15Overlay();
    closePage15NotifOverlay();
    closePage18AddressOverlay();
    closeLogoutConfirmOverlay();
    closeOrderChatModal();
  }
});

window.addEventListener("load", () => {
  fitActiveScreen();
  sanitizeLegacyProfilePhotosInLocalStorage();
  enforceExclusiveActiveSession();
  applyActiveUserProfile();
  const explicitRole = getActiveProfileRole();
  if (!explicitRole) {
    const hasClient = Boolean(getActiveClientEmail());
    const hasProvider = Boolean(getActiveProviderEmail());
    if (hasProvider && !hasClient) {
      setActiveProfileRole("prestataire");
    } else if (hasClient && !hasProvider) {
      setActiveProfileRole("client");
    } else if (lastResolvedProfileType === "prestataire" || lastResolvedProfileType === "client") {
      setActiveProfileRole(lastResolvedProfileType);
    }
  }
  const activeRoleForSession = resolveActiveProfileTypeForChat();
  let shouldRestoreLastPage = true;
  if (activeRoleForSession === "client") {
    const activeClientAccount = getActiveClientAccount();
    const activeClientEmail = String((activeClientAccount && activeClientAccount.email) || "").trim().toLowerCase();
    const activeClientStatus = normalizeStatus(
      (activeClientAccount && activeClientAccount.statutVerification) || "en_attente"
    );
    if (activeClientEmail && !canClientContinueAfterAdminApproval(activeClientStatus, activeClientAccount)) {
      savePendingVerification("client", activeClientEmail);
      showSubmissionWaitingPage("client", activeClientStatus || "en_attente");
      shouldRestoreLastPage = false;
    }
  }
  if (shouldRestoreLastPage && (activeRoleForSession === "client" || activeRoleForSession === "prestataire")) {
    const fallbackPage = activeRoleForSession === "prestataire" ? "page10" : "page8";
    const storedPageRaw = getLastVisitedPageForRole(activeRoleForSession);
    const storedPage =
      activeRoleForSession === "prestataire" && storedPageRaw === "page19" ? "" : storedPageRaw;
    const targetPage = storedPage || fallbackPage;
    if (isValidPageClass(targetPage)) {
      goTo(targetPage);
    }
  }
  renderPage10OngoingRequests();
  syncPage19ChatFabState();
  syncChatUnreadBadges().catch(() => {
    return;
  });
  ensureChatBadgePolling();
  ensureProviderDirectoryPolling();
  syncVerifiedProviderDirectoryIfVisible(true);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    return;
  }
  syncVerifiedProviderDirectoryIfVisible(false);
});

window.addEventListener("focus", () => {
  syncVerifiedProviderDirectoryIfVisible(false);
});

window.addEventListener("storage", (event) => {
  if (!event) {
    return;
  }
  if (event.key === VERIFIED_PROVIDER_DIRECTORY_STORAGE_KEY) {
    renderDynamicProviderDirectory();
  }
});
window.addEventListener("resize", fitActiveScreen);




