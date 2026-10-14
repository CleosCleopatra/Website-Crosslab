
const COUNTRY_CONTENT = {
    se: {
        HERO_INTRO:
            "Explore sustainable campus ideas with students at the University of Rwanda. Work from FUSE with your Chalmers team, share perspectives online, and build a prototype together. No international travel required.",

        PARTNER_UNIVERSITY: "University of Rwanda",
        LOCAL_UNIVERSITY: "Chalmers University of Technology",
        LOCAL_MAKERSPACE: "FUSE",
        PARTNER_MAKERSPACE: "UniPod",
        SESSION_TIME: "17:30–20:00",

        LOCAL_CONTEXT_PARAGRAPH:
            "Your experience at Chalmers is an important part of the project. Explore sustainability on your own campus, then compare ideas with students at the University of Rwanda. Together, discover new ways of looking at the same challenge.",

        THEME_PARAGRAPH:
            "What would make Chalmers a more sustainable campus? Explore the question from your own experience, then compare ideas with students at the University of Rwanda. Together, you will develop ideas and turn at least one into a prototype. Campus introduction videos are coming soon."
    },

    rw: {
        HERO_INTRO:
            "Explore sustainable campus ideas with students at Chalmers. Work from UniPod with your University of Rwanda team, share perspectives online, and build a prototype together. No international travel required.",

        PARTNER_UNIVERSITY: "Chalmers University of Technology",
        LOCAL_UNIVERSITY: "University of Rwanda",
        LOCAL_MAKERSPACE: "UniPod",
        PARTNER_MAKERSPACE: "FUSE",
        SESSION_TIME: "17:30–20:00",

        LOCAL_CONTEXT_PARAGRAPH:
            "Your experience at the University of Rwanda is an important part of the project. Explore sustainability on your own campus, then compare ideas with students at Chalmers. Together, discover new ways of looking at the same challenge.",

        THEME_PARAGRAPH:
            "What would make the University of Rwanda a more sustainable campus? Explore the question from your own experience, then compare ideas with students at Chalmers. Together, you will develop ideas and turn at least one into a prototype. Campus introduction videos are coming soon."
    }
};

const PREFERENCE_KEY = "crosslab-country-preference";
const AUTO_COUNTRY_KEY = "crosslab-auto-country";

function isValidCountry(country) {
    return country === "se" || country === "rw";
}

async function detectCountryFromIP() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    try {
        const response = await fetch("https://ipapi.co/json/", {
            headers: { Accept: "application/json" },
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error("Country lookup failed");
        }

        const data = await response.json();

        if (data.country_code === "SE") return "se";
        if (data.country_code === "RW") return "rw";

    } catch (error) {
        console.warn("Could not detect country. Using Sweden as fallback.");
    } finally {
        clearTimeout(timeout);
    }

    // Fallback if detection fails or the visitor is elsewhere.
    return "se";
}

function replaceCountryPlaceholders(country) {
    const replacements = COUNTRY_CONTENT[country];

    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT
    );

    while (walker.nextNode()) {
        const node = walker.currentNode;

        if (node.parentElement?.closest("script, style")) {
            continue;
        }

        node.nodeValue = node.nodeValue.replace(
            /\{\{([A-Z_]+)\}\}/g,
            (placeholder, key) => replacements[key] ?? placeholder
        );
    }
}

function updateCountrySwitcher(country) {
    function update() {
        const label = document.getElementById("country-current-label");

        // The shared header might not have loaded yet.
        if (!label) return false;

        label.textContent = country === "rw" ? "Rwanda" : "Sweden";

        document.querySelectorAll("[data-country-option]").forEach(link => {
            if (link.dataset.countryOption === country) {
                link.setAttribute("aria-current", "true");
            } else {
                link.removeAttribute("aria-current");
            }
        });

        return true;
    }

    if (update()) return;

    const header = document.getElementById("header");

    if (!header) return;

    const observer = new MutationObserver(() => {
        if (update()) observer.disconnect();
    });

    observer.observe(header, { childList: true, subtree: true });
}

async function initialiseCountry() {
    const params = new URLSearchParams(window.location.search);
    const requestedCountry = params.get("country")?.toLowerCase();

    let country;

    // A country in the URL takes priority.
    if (isValidCountry(requestedCountry)) {
        country = requestedCountry;

        // A country selected through the switcher becomes the preference.
        localStorage.setItem(PREFERENCE_KEY, country);
    } else {
        const savedPreference = localStorage.getItem(PREFERENCE_KEY);
        const sessionCountry = sessionStorage.getItem(AUTO_COUNTRY_KEY);

        if (isValidCountry(savedPreference)) {
            // Respect the visitor's manual choice.
            country = savedPreference;
        } else if (isValidCountry(sessionCountry)) {
            // Avoid another IP lookup on every page in the same session.
            country = sessionCountry;
        } else {
            country = await detectCountryFromIP();
            sessionStorage.setItem(AUTO_COUNTRY_KEY, country);
        }
    }

    replaceCountryPlaceholders(country);
    updateCountrySwitcher(country);

    // Reveal the page once its country-specific text is ready.
    document.body.classList.remove("country-loading");
}

// Restore automatic detection when the visitor requests it.
document.addEventListener("click", async event => {
    const button = event.target.closest("#country-auto-detect");

    if (!button) return;

    event.preventDefault();
    button.disabled = true;

    localStorage.removeItem(PREFERENCE_KEY);
    sessionStorage.removeItem(AUTO_COUNTRY_KEY);

    const country = await detectCountryFromIP();
    sessionStorage.setItem(AUTO_COUNTRY_KEY, country);

    const url = new URL(window.location.href);
    url.searchParams.delete("country");

    // Reload so all placeholders are filled consistently.
    window.location.replace(url.toString());
});

initialiseCountry();
