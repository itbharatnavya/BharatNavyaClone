"use client";

// BharatSource — lightweight i18n (EN + हिन्दी). No external deps: a flat key →
// per-language string dictionary, a LanguageProvider that persists the choice in
// localStorage.bs_lang, and a useT() hook returning t(key). Unknown keys fall
// back to the English string, then to the key itself, so pages never render blank.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Lang = "en" | "hi";

const STORAGE_KEY = "bs_lang";

// ~60 core UI strings. Keep keys stable; pages reference these.
const DICT: Record<string, { en: string; hi: string }> = {
  // ---- nav ----
  "nav.explore": { en: "Explore", hi: "एक्सप्लोर" },
  "nav.categories": { en: "Categories", hi: "श्रेणियाँ" },
  "nav.sell": { en: "Sell", hi: "बेचें" },
  "nav.advertise": { en: "Advertise", hi: "विज्ञापन दें" },
  "nav.pricing": { en: "Pricing", hi: "मूल्य निर्धारण" },
  "nav.blog": { en: "Blog", hi: "ब्लॉग" },
  "nav.features": { en: "Features", hi: "विशेषताएँ" },
  "nav.login": { en: "Login", hi: "लॉगिन" },
  "nav.register": { en: "Register", hi: "रजिस्टर" },
  "nav.joinUs": { en: "Join us", hi: "हमसे जुड़ें" },
  "nav.about": { en: "About us", hi: "हमारे बारे में" },
  "nav.dashboard": { en: "Dashboard", hi: "डैशबोर्ड" },
  "nav.goToDashboard": { en: "Go to dashboard", hi: "डैशबोर्ड पर जाएं" },
  "nav.myProfile": { en: "My Profile", hi: "मेरी प्रोफ़ाइल" },
  "nav.dashboardProfile": { en: "Profile", hi: "प्रोफ़ाइल" },
  "nav.recruitmentDashboard": { en: "Recruitment dashboard", hi: "रिक्रूटमेंट डैशबोर्ड" },
  "nav.admin": { en: "Admin", hi: "एडमिन" },
  "nav.myListings": { en: "My Listings", hi: "मेरी लिस्टिंग" },
  "nav.inbox": { en: "Inbox", hi: "इनबॉक्स" },
  "nav.account": { en: "Account", hi: "खाता" },
  "nav.logout": { en: "Log out", hi: "लॉग आउट" },

  // ---- hero / CTAs ----
  "hero.title": { en: "Find any vendor. Sell anything.", hi: "कोई भी विक्रेता खोजें। कुछ भी बेचें।" },
  "hero.subtitle": {
    en: "Describe what you need and let AI find the right vendor across India.",
    hi: "बताइए आपको क्या चाहिए और AI को पूरे भारत में सही विक्रेता खोजने दें।",
  },
  "cta.getStarted": { en: "Get started", hi: "शुरू करें" },
  "cta.postListing": { en: "Post a listing", hi: "लिस्टिंग डालें" },
  "cta.startSelling": { en: "Start selling", hi: "बेचना शुरू करें" },
  "cta.browseAll": { en: "Browse all", hi: "सभी देखें" },
  "cta.viewAll": { en: "View all", hi: "सभी देखें" },
  "cta.learnMore": { en: "Learn more", hi: "और जानें" },
  "cta.postRfq": { en: "Post a requirement", hi: "आवश्यकता पोस्ट करें" },

  // ---- common actions ----
  "common.search": { en: "Search", hi: "खोजें" },
  "common.searchPlaceholder": { en: "Search products, services, vendors…", hi: "उत्पाद, सेवाएँ, विक्रेता खोजें…" },
  "common.contact": { en: "Contact", hi: "संपर्क करें" },
  "common.chat": { en: "Chat", hi: "चैट" },
  "common.call": { en: "Call", hi: "कॉल करें" },
  "common.whatsapp": { en: "WhatsApp", hi: "व्हाट्सएप" },
  "common.follow": { en: "Follow", hi: "फ़ॉलो करें" },
  "common.following": { en: "Following", hi: "फ़ॉलो कर रहे हैं" },
  "common.share": { en: "Share", hi: "शेयर करें" },
  "common.report": { en: "Report", hi: "रिपोर्ट करें" },
  "common.save": { en: "Save", hi: "सेव करें" },
  "common.cancel": { en: "Cancel", hi: "रद्द करें" },
  "common.submit": { en: "Submit", hi: "सबमिट करें" },
  "common.edit": { en: "Edit", hi: "संपादित करें" },
  "common.delete": { en: "Delete", hi: "हटाएँ" },
  "common.close": { en: "Close", hi: "बंद करें" },
  "common.apply": { en: "Apply", hi: "लागू करें" },
  "common.clear": { en: "Clear", hi: "साफ़ करें" },
  "common.loading": { en: "Loading…", hi: "लोड हो रहा है…" },
  "common.noResults": { en: "No results found", hi: "कोई परिणाम नहीं मिला" },

  // ---- discovery / filters ----
  "common.filters": { en: "Filters", hi: "फ़िल्टर" },
  "common.sort": { en: "Sort", hi: "क्रमबद्ध करें" },
  "common.price": { en: "Price", hi: "मूल्य" },
  "common.rating": { en: "Rating", hi: "रेटिंग" },
  "common.category": { en: "Category", hi: "श्रेणी" },
  "common.location": { en: "Location", hi: "स्थान" },
  "common.nearMe": { en: "Near me", hi: "मेरे पास" },
  "common.verified": { en: "Verified", hi: "सत्यापित" },
  "common.sponsored": { en: "Sponsored", hi: "प्रायोजित" },
  "common.featured": { en: "Featured", hi: "फ़ीचर्ड" },
  "common.newest": { en: "Newest", hi: "सबसे नए" },
  "common.relevance": { en: "Relevance", hi: "प्रासंगिकता" },
  "common.distance": { en: "Distance", hi: "दूरी" },

  // ---- entities / trust ----
  "common.products": { en: "Products", hi: "उत्पाद" },
  "common.services": { en: "Services", hi: "सेवाएँ" },
  "common.sellers": { en: "Sellers", hi: "विक्रेता" },
  "common.reviews": { en: "Reviews", hi: "समीक्षाएँ" },
  "common.stories": { en: "Stories", hi: "स्टोरीज़" },
  "common.highlights": { en: "Highlights", hi: "हाइलाइट्स" },
  "common.trending": { en: "Trending near you", hi: "आपके पास ट्रेंडिंग" },
  "common.moq": { en: "Min. order", hi: "न्यूनतम ऑर्डर" },
  "common.askPrice": { en: "Ask price", hi: "मूल्य पूछें" },
  "common.markSold": { en: "Mark as sold", hi: "बिका हुआ चिह्नित करें" },
  "common.notifications": { en: "Notifications", hi: "सूचनाएँ" },
  "common.markAllRead": { en: "Mark all read", hi: "सभी पढ़ा हुआ चिह्नित करें" },
  "common.referral": { en: "Referral", hi: "रेफ़रल" },
  "common.howItWorks": { en: "How it works", hi: "यह कैसे काम करता है" },
  "common.searching": { en: "Searching…", hi: "खोज रहे हैं…" },

  // ---- home page ----
  "home.hero.title": { en: "Source anything across India", hi: "पूरे भारत में कुछ भी सोर्स करें" },
  "home.hero.subtitle": {
    en: "Products and services, one catalog. Find verified sellers, hire trusted professionals, and get quotes — all in one place.",
    hi: "उत्पाद और सेवाएँ, एक ही कैटलॉग। सत्यापित विक्रेता खोजें, भरोसेमंद पेशेवरों को नियुक्त करें और कोटेशन पाएँ — सब एक ही जगह।",
  },
  "home.hero.popular": { en: "Popular:", hi: "लोकप्रिय:" },
  "home.categories.eyebrow": { en: "Browse", hi: "ब्राउज़ करें" },
  "home.categories.title": { en: "Explore categories", hi: "श्रेणियाँ एक्सप्लोर करें" },
  "home.categories.subtitle": {
    en: "From raw materials to professional services — every industry.",
    hi: "कच्चे माल से लेकर पेशेवर सेवाओं तक — हर उद्योग।",
  },
  "home.trending.eyebrow": { en: "Fresh", hi: "नया" },
  "home.trending.title": { en: "Trending now", hi: "अभी ट्रेंडिंग" },
  "home.trending.subtitle": {
    en: "The newest listings from sellers across India.",
    hi: "पूरे भारत के विक्रेताओं की नवीनतम लिस्टिंग।",
  },
  "home.trending.action": { en: "View all", hi: "सभी देखें" },
  "home.sellers.eyebrow": { en: "Trusted", hi: "भरोसेमंद" },
  "home.sellers.title": { en: "Featured sellers", hi: "फ़ीचर्ड विक्रेता" },
  "home.sellers.subtitle": {
    en: "Verified businesses with strong ratings and fast response.",
    hi: "मज़बूत रेटिंग और तेज़ जवाब वाले सत्यापित व्यवसाय।",
  },
  "home.how.eyebrow": { en: "How it works", hi: "यह कैसे काम करता है" },
  "home.how.title": { en: "Sourcing made simple", hi: "सोर्सिंग को बनाया आसान" },
  "home.how.subtitle": {
    en: "No checkout, no middlemen taking a cut — just direct connections.",
    hi: "न कोई चेकआउट, न बिचौलिए का कमीशन — सिर्फ़ सीधा संपर्क।",
  },
  "home.how.step1.title": { en: "Search or ask the AI", hi: "खोजें या AI से पूछें" },
  "home.how.step1.body": {
    en: "Describe what you need in plain words. Our concierge finds the right products, services and vendors across India.",
    hi: "सीधे शब्दों में बताएँ कि आपको क्या चाहिए। हमारा कॉन्सियज पूरे भारत में सही उत्पाद, सेवाएँ और विक्रेता खोज देता है।",
  },
  "home.how.step2.title": { en: "Connect directly", hi: "सीधे जुड़ें" },
  "home.how.step2.body": {
    en: "Chat, call or WhatsApp verified sellers. Send an enquiry or an RFQ that fans out to matching providers.",
    hi: "सत्यापित विक्रेताओं से चैट, कॉल या व्हाट्सएप करें। एक पूछताछ या RFQ भेजें जो मिलते-जुलते प्रदाताओं तक पहुँचे।",
  },
  "home.how.step3.title": { en: "Compare & close", hi: "तुलना करें और सौदा तय करें" },
  "home.how.step3.body": {
    en: "See transparent pricing, trust badges and reviews. Pick the best offer and deal on your own terms.",
    hi: "पारदर्शी मूल्य, ट्रस्ट बैज और समीक्षाएँ देखें। सबसे अच्छा ऑफ़र चुनें और अपनी शर्तों पर सौदा करें।",
  },
  "home.sell.eyebrow": { en: "Grow your business", hi: "अपना व्यवसाय बढ़ाएँ" },
  "home.sell.title": {
    en: "Sell to buyers across India — free to start",
    hi: "पूरे भारत के ख़रीदारों को बेचें — शुरू करना मुफ़्त",
  },
  "home.sell.subtitle": {
    en: "List your products or services, get verified, and receive enquiries and leads. One account to buy and to sell.",
    hi: "अपने उत्पाद या सेवाएँ सूचीबद्ध करें, सत्यापित हों और पूछताछ व लीड पाएँ। ख़रीदने और बेचने के लिए एक ही खाता।",
  },
  "home.sell.cta": { en: "+ Start selling", hi: "+ बेचना शुरू करें" },
  "home.sell.secondary": { en: "See plans", hi: "प्लान देखें" },

  // ---- discovery / category / results ----
  "nav.home": { en: "Home", hi: "होम" },
  "nav.directoryCrumb": { en: "Directory", hi: "डायरेक्टरी" },
  "nav.consultationsCrumb": { en: "Consultations", hi: "परामर्श" },
  "category.notFound.title": { en: "We couldn't find that category", hi: "हमें वह श्रेणी नहीं मिली" },
  "category.notFound.message": {
    en: "The category may have moved or been renamed. Try searching or browse from the homepage.",
    hi: "श्रेणी हटाई या नाम बदली गई हो सकती है। खोजें या होमपेज से ब्राउज़ करें।",
  },
  "category.notFound.cta": { en: "Back to home", hi: "होम पर वापस जाएँ" },
  "category.empty.title": { en: "No listings here yet", hi: "यहाँ अभी कोई लिस्टिंग नहीं" },
  "category.empty.message": {
    en: "Be the first to list in this category, or adjust your filters to see more.",
    hi: "इस श्रेणी में सबसे पहले लिस्ट करें, या अधिक देखने के लिए फ़िल्टर बदलें।",
  },
  "sort.label": { en: "Sort", hi: "क्रमबद्ध करें" },
  "sort.relevance": { en: "Relevance", hi: "प्रासंगिकता" },
  "sort.newest": { en: "Newest", hi: "सबसे नए" },
  "sort.priceAsc": { en: "Price: Low to High", hi: "मूल्य: कम से अधिक" },
  "sort.priceDesc": { en: "Price: High to Low", hi: "मूल्य: अधिक से कम" },
  "sort.rating": { en: "Top Rated", hi: "टॉप रेटेड" },
  "sort.distance": { en: "Nearest", hi: "सबसे नज़दीक" },
  "results.one": { en: "result", hi: "परिणाम" },
  "results.many": { en: "results", hi: "परिणाम" },
  "results.errorTitle": { en: "Something went wrong", hi: "कुछ गड़बड़ हो गई" },
  "results.emptyTitle": { en: "No results found", hi: "कोई परिणाम नहीं मिला" },
  "results.emptyMessage": {
    en: "Try removing a filter or broadening your search. New sellers join every day.",
    hi: "कोई फ़िल्टर हटाकर या खोज को व्यापक करके देखें। हर दिन नए विक्रेता जुड़ते हैं।",
  },
  "view.list": { en: "List", hi: "सूची" },
  "view.map": { en: "Map", hi: "मानचित्र" },

  // ---- filters ----
  "filters.title": { en: "Filters", hi: "फ़िल्टर" },
  "filters.clearAll": { en: "Clear all", hi: "सभी साफ़ करें" },
  "filters.type": { en: "Type", hi: "प्रकार" },
  "filters.all": { en: "All", hi: "सभी" },
  "filters.category": { en: "Category", hi: "श्रेणी" },
  "filters.city": { en: "City", hi: "शहर" },
  "filters.allCities": { en: "All cities", hi: "सभी शहर" },
  "filters.price": { en: "Price", hi: "मूल्य" },
  "filters.under": { en: "Under", hi: "से कम" },
  "filters.verifiedOnly": { en: "Verified sellers only", hi: "केवल सत्यापित विक्रेता" },

  // ---- search page ----
  "search.eyebrow": { en: "Search", hi: "खोज" },
  "search.title": { en: "Browse services and products", hi: "सेवाएँ और उत्पाद खोजें" },
  "search.resultsFor": { en: "Results for", hi: "इसके परिणाम" },
  "search.empty.title": { en: "No matches found", hi: "कोई मिलान नहीं मिला" },
  "search.empty.message": {
    en: "Try different keywords, remove a filter, or describe what you need in the AI search above.",
    hi: "अलग कीवर्ड आज़माएँ, कोई फ़िल्टर हटाएँ, या ऊपर AI खोज में बताएँ कि आपको क्या चाहिए।",
  },

  // ---- listing detail ----
  "listing.condition": { en: "Condition", hi: "स्थिति" },
  "listing.specs": { en: "Specifications", hi: "विशेष विवरण" },
  "listing.description": { en: "Description", hi: "विवरण" },
  "listing.serviceDetails": { en: "Service details", hi: "सेवा विवरण" },
  "listing.similar": { en: "Similar listings", hi: "मिलती-जुलती लिस्टिंग" },
  "listing.serves": { en: "Serves:", hi: "सेवा क्षेत्र:" },
  "listing.badge.product": { en: "Product", hi: "उत्पाद" },
  "listing.badge.service": { en: "Service", hi: "सेवा" },
  "listing.badge.sold": { en: "Sold", hi: "बिक गया" },
  "listing.notFound.eyebrow": { en: "Listing not found", hi: "लिस्टिंग नहीं मिली" },
  "listing.notFound.title": { en: "This listing doesn't exist", hi: "यह लिस्टिंग मौजूद नहीं है" },
  "listing.notFound.message": {
    en: "It may have been removed or the link is incorrect.",
    hi: "इसे हटाया गया हो सकता है या लिंक ग़लत है।",
  },
  "listing.notFound.cta": { en: "Browse listings", hi: "लिस्टिंग ब्राउज़ करें" },

  // ---- seller contact card ----
  "contact.chat": { en: "Chat with seller", hi: "विक्रेता से चैट करें" },
  "contact.chatting": { en: "Starting chat…", hi: "चैट शुरू हो रही है…" },
  "contact.viewProfile": { en: "View seller profile", hi: "विक्रेता प्रोफ़ाइल देखें" },
  "contact.reportTitle": { en: "Report this listing", hi: "इस लिस्टिंग की रिपोर्ट करें" },
  "contact.shareTitle": { en: "Share this listing", hi: "इस लिस्टिंग को शेयर करें" },
  "contact.reason": { en: "Reason", hi: "कारण" },
  "contact.detailsOptional": { en: "Details (optional)", hi: "विवरण (वैकल्पिक)" },
  "contact.submitReport": { en: "Submit report", hi: "रिपोर्ट सबमिट करें" },
  "contact.submitting": { en: "Submitting…", hi: "सबमिट हो रहा है…" },
  "contact.shareWhatsApp": { en: "Share on WhatsApp", hi: "व्हाट्सएप पर शेयर करें" },
  "contact.copyLink": { en: "Copy link", hi: "लिंक कॉपी करें" },

  // ---- seller profile ----
  "seller.listings": { en: "Listings", hi: "लिस्टिंग" },
  "seller.reviews": { en: "Reviews", hi: "समीक्षाएँ" },
  "seller.blogs": { en: "Blogs", hi: "ब्लॉग" },
  "seller.highlights": { en: "Highlights", hi: "हाइलाइट्स" },
  "seller.about": { en: "About", hi: "परिचय" },
  "seller.details": { en: "Company details", hi: "कंपनी विवरण" },
  "seller.certifications": { en: "Certifications", hi: "प्रमाणपत्र" },
  "seller.crumbSellers": { en: "Sellers", hi: "विक्रेता" },
  "seller.notFound.eyebrow": { en: "Seller not found", hi: "विक्रेता नहीं मिला" },
  "seller.notFound.title": { en: "This seller doesn't exist", hi: "यह विक्रेता मौजूद नहीं है" },
  "seller.notFound.message": {
    en: "The profile may have been removed or the link is incorrect.",
    hi: "प्रोफ़ाइल हटाई गई हो सकती है या लिंक ग़लत है।",
  },
  "seller.notFound.cta": { en: "Back to home", hi: "होम पर वापस जाएँ" },
  "seller.noListings": {
    en: "This seller hasn't published any listings yet.",
    hi: "इस विक्रेता ने अभी कोई लिस्टिंग प्रकाशित नहीं की है।",
  },
  "seller.noBlogs": { en: "No blog posts yet.", hi: "अभी कोई ब्लॉग पोस्ट नहीं।" },
  "seller.responseRate": { en: "response rate", hi: "जवाब दर" },
  "seller.viewOnMap": { en: "View on map", hi: "मानचित्र पर देखें" },
  "seller.detail.gst": { en: "GST", hi: "जीएसटी" },
  "seller.detail.established": { en: "Established", hi: "स्थापना" },
  "seller.detail.employees": { en: "Employees", hi: "कर्मचारी" },
  "seller.detail.location": { en: "Location", hi: "स्थान" },
  "seller.detail.hours": { en: "Business hours", hi: "व्यावसायिक समय" },
  "seller.detail.website": { en: "Website", hi: "वेबसाइट" },
  "seller.detail.visit": { en: "Visit", hi: "देखें" },
  "badge.topRated": { en: "Top Rated", hi: "टॉप रेटेड" },
  "badge.fastResponder": { en: "Fast Responder", hi: "तेज़ जवाब देने वाला" },
  "badge.verified": { en: "Verified", hi: "सत्यापित" },
  "badge.trusted": { en: "Trusted", hi: "भरोसेमंद" },

  // ---- reviews / highlights ----
  "reviews.yourRating": { en: "Your rating", hi: "आपकी रेटिंग" },
  "reviews.titleOptional": { en: "Title (optional)", hi: "शीर्षक (वैकल्पिक)" },
  "reviews.yourReview": { en: "Your review", hi: "आपकी समीक्षा" },
  "reviews.submit": { en: "Submit review", hi: "समीक्षा सबमिट करें" },
  "reviews.submitting": { en: "Submitting…", hi: "सबमिट हो रहा है…" },
  "reviews.loginPrompt": { en: "Log in to leave a review.", hi: "समीक्षा देने के लिए लॉग इन करें।" },
  "reviews.empty": {
    en: "No reviews yet. Be the first to share your experience.",
    hi: "अभी कोई समीक्षा नहीं। अपना अनुभव साझा करने वाले पहले बनें।",
  },
  "highlights.empty": { en: "No highlights yet.", hi: "अभी कोई हाइलाइट नहीं।" },

  // ---- pricing ----
  "pricing.eyebrow": { en: "Pricing", hi: "मूल्य निर्धारण" },
  "pricing.title": { en: "More visibility. More business possibilities.", hi: "अधिक दृश्यता। व्यवसाय की अधिक संभावनाएँ।" },
  "pricing.subtitle": {
    en: "Build your business profile for free, then explore added visibility, premium placement, and promotional opportunities with an upgraded plan.",
    hi: "अपनी व्यवसाय प्रोफ़ाइल मुफ़्त बनाएँ, फिर अपग्रेडेड प्लान के साथ अधिक दृश्यता, प्रीमियम प्लेसमेंट और प्रचार के अवसर पाएँ।",
  },
  "pricing.explorePlans": { en: "Explore upgrade plans", hi: "अपग्रेड प्लान देखें" },
  "pricing.mostPopular": { en: "Most popular", hi: "सबसे लोकप्रिय" },
  "pricing.free": { en: "Free", hi: "मुफ़्त" },
  "pricing.startFree": { en: "Start free", hi: "मुफ़्त शुरू करें" },
  "pricing.choose": { en: "Choose", hi: "चुनें" },
  "pricing.compare": { en: "Compare capabilities", hi: "क्षमताओं की तुलना करें" },
  "pricing.capability": { en: "Capability", hi: "क्षमता" },
  "pricing.catalogSetup": { en: "Feature catalog is being set up.", hi: "फ़ीचर कैटलॉग तैयार किया जा रहा है।" },
  "pricing.readyToSell": { en: "Ready to sell?", hi: "बेचने के लिए तैयार हैं?" },
  "pricing.readySubtitle": {
    en: "List your first product or service in minutes.",
    hi: "मिनटों में अपना पहला उत्पाद या सेवा सूचीबद्ध करें।",
  },
  "pricing.exploreFeatures": { en: "Explore features", hi: "फ़ीचर एक्सप्लोर करें" },

  // ---- features page ----
  "features.eyebrow": { en: "Platform", hi: "प्लेटफ़ॉर्म" },
  "features.title": {
    en: "Everything you need to discover, represent and grow across India",
    hi: "पूरे भारत में खोजने, अपनी पहचान बनाने और आगे बढ़ने के लिए ज़रूरी साधन",
  },
  "features.subtitle": {
    en: "One catalog for products and services, AI-powered vendor search, secure chat, seller reach tools, and honest, transparent placement.",
    hi: "उत्पादों और सेवाओं के लिए एक कैटलॉग, AI-संचालित विक्रेता खोज, सुरक्षित चैट, विक्रेता पहुँच टूल और ईमानदार, पारदर्शी प्लेसमेंट।",
  },
  "features.getStartedFree": { en: "Get started free", hi: "मुफ़्त शुरू करें" },
  "features.seePricing": { en: "See pricing", hi: "मूल्य देखें" },
  "features.catalogSetup": { en: "Feature catalog is being set up.", hi: "फ़ीचर कैटलॉग तैयार किया जा रहा है।" },
  "features.putToWork": { en: "Put it to work", hi: "इसे काम पर लगाएँ" },
  "features.putSubtitle": {
    en: "Create your free account and list in minutes.",
    hi: "अपना मुफ़्त खाता बनाएँ और मिनटों में लिस्ट करें।",
  },
  "features.createAccount": { en: "Create account", hi: "खाता बनाएँ" },

  // ---- auth (login / register) ----
  "auth.login.welcome": { en: "Welcome back to Bharat Navya.", hi: "भारत नव्य में आपका फिर से स्वागत है।" },
  "auth.login.asideCopy": {
    en: "Companies, careers, and opportunities—all in one place.",
    hi: "कंपनियाँ, करियर और अवसर—सब एक ही जगह।",
  },
  "auth.login.title": { en: "Sign in", hi: "साइन इन करें" },
  "auth.login.subtitle": { en: "One account to access Directory and Recruitment.", hi: "डायरेक्टरी और भर्ती तक पहुँचने के लिए एक खाता।" },
  "auth.tab.otp": { en: "Mobile OTP", hi: "मोबाइल OTP" },
  "auth.tab.password": { en: "Email & password", hi: "ईमेल और पासवर्ड" },
  "auth.mobileLabel": { en: "Mobile number", hi: "मोबाइल नंबर" },
  "auth.sendOtp": { en: "Send OTP", hi: "OTP भेजें" },
  "auth.sending": { en: "Sending…", hi: "भेजा जा रहा है…" },
  "auth.otpSentTo": { en: "Enter the 6-digit OTP sent to", hi: "इस नंबर पर भेजा गया 6-अंकों का OTP दर्ज करें" },
  "auth.verify": { en: "Verify & sign in", hi: "सत्यापित करें और साइन इन करें" },
  "auth.verifying": { en: "Verifying…", hi: "सत्यापित हो रहा है…" },
  "auth.changeNumber": { en: "Change number", hi: "नंबर बदलें" },
  "auth.email": { en: "Email", hi: "ईमेल" },
  "auth.password": { en: "Password", hi: "पासवर्ड" },
  "auth.loggingIn": { en: "Signing in…", hi: "साइन इन हो रहा है…" },
  "auth.newHere": { en: "New to Bharat Navya?", hi: "भारत नव्य पर नए हैं?" },
  "auth.createAccountLink": { en: "Create an account", hi: "खाता बनाएँ" },
  "auth.register.asideTitle": { en: "Start building your place on Bharat Navya.", hi: "भारत नव्य पर अपनी जगह बनाना शुरू करें।" },
  "auth.register.asideCopy": {
    en: "Create one account to represent your business or professional profile, manage your activity, respond to enquiries, and access opportunities across the platform.",
    hi: "अपने व्यवसाय या पेशेवर प्रोफ़ाइल का प्रतिनिधित्व करने, अपनी गतिविधि संभालने, पूछताछ का जवाब देने और पूरे प्लेटफ़ॉर्म के अवसरों तक पहुँचने के लिए एक खाता बनाएँ।",
  },
  "auth.register.title": { en: "Create your account", hi: "अपना खाता बनाएँ" },
  "auth.register.subtitle": { en: "Create your account to access more of Bharat Navya.", hi: "भारत नव्य की अधिक सुविधाओं तक पहुँचने के लिए अपना खाता बनाएँ।" },
  "auth.creating": { en: "Creating…", hi: "बनाया जा रहा है…" },
  "auth.createAccount": { en: "Sign up", hi: "साइन अप करें" },
  "auth.haveAccount": { en: "Already have an account?", hi: "पहले से खाता है?" },
  "auth.login": { en: "Sign in", hi: "साइन इन करें" },
  "auth.fullName": { en: "Full name", hi: "पूरा नाम" },
  "auth.city": { en: "City", hi: "शहर" },
  "auth.state": { en: "State", hi: "राज्य" },
  "auth.referralCode": { en: "Referral code", hi: "रेफ़रल कोड" },
  "auth.haveReferral": { en: "+ Have a referral code?", hi: "+ रेफ़रल कोड है?" },

  // ---- blog ----
  "blog.eyebrow": { en: "Blog", hi: "ब्लॉग" },
  "blog.title": { en: "Insights from India's vendors", hi: "भारत के विक्रेताओं से जानकारियाँ" },
  "blog.subtitle": {
    en: "Guides, know-how and stories from the sellers and service providers on BharatSource.",
    hi: "BharatSource के विक्रेताओं और सेवा प्रदाताओं से गाइड, जानकारी और कहानियाँ।",
  },
  "blog.empty": { en: "No articles published yet. Check back soon.", hi: "अभी कोई लेख प्रकाशित नहीं। जल्द ही फिर देखें।" },
  "blog.notFound": { en: "Article not found", hi: "लेख नहीं मिला" },
  "blog.notFoundMessage": { en: "This article may have been unpublished.", hi: "यह लेख अप्रकाशित किया गया हो सकता है।" },
  "blog.backToBlog": { en: "Back to blog", hi: "ब्लॉग पर वापस जाएँ" },
  "blog.allArticles": { en: "All articles", hi: "सभी लेख" },
};

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggle: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function translate(lang: Lang, key: string): string {
  const entry = DICT[key];
  if (!entry) return key;
  return entry[lang] || entry.en || key;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Hydrate the persisted choice on mount (client-only).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "hi") setLangState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setLangState((prev) => {
      const next: Lang = prev === "en" ? "hi" : "en";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const t = useCallback((key: string) => translate(lang, key), [lang]);

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, setLang, toggle, t }),
    [lang, setLang, toggle, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// useT() returns the full language context (t plus lang/setLang/toggle) so a
// single hook covers both string lookup and the language switch.
export function useT(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Safe fallback: English-only, no persistence.
    return {
      lang: "en",
      setLang: () => {},
      toggle: () => {},
      t: (key: string) => translate("en", key),
    };
  }
  return ctx;
}
