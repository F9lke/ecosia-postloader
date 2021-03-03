/**
 * Retrievs a value from the browser storage and resolvs it as a promise
 * 
 * @param {String} sValName The name of the stored value to read
 */
const getStorageVal = async sValName => {
    return new Promise(resolve => {
        chrome.storage.sync.get(
            [sValName], 
            result => resolve(result[sValName])
        ); 
    });
}; // async inline function getStorageVal()

/**
 * Main background page entry
 */
chrome.runtime.onInstalled.addListener(() => {
     /* Handle the ws connection */
    const socket = io.connect('http://localhost:3009');

    socket.on("connect_error", () => {
        setTimeout(() => {
            socket.connect();
        }, 1000);
    });

    socket.on("disconnect", reason => {
        chrome.storage.sync.set({ con_marker_markup: "&#128308;" });

        // The disconnection was initiated by the server, reconnect manually
        if (reason === "io server disconnect") socket.connect();
        // else the socket will automatically try to reconnect
    });

    /* If the connection has been established */
    socket.once('connect', () => {
        chrome.storage.sync.set({ con_marker_markup: "&#128994;"});

        // Listen for update on clicked ads on pass them to the content script
        socket.on("clickedHrefs", res => {
            chrome.storage.sync.get("clicked_ads_log", sClickedAds => {
                if(sClickedAds === undefined || typeof sClickedAds === "object") sClickedAds = "[]";

                const sNewVal = JSON.stringify(JSON.parse(sClickedAds).concat({
                    date: new Date(),
                    links: JSON.parse(res)
                }));

                chrome.storage.sync.set({ clicked_ads_log: sNewVal });
            });
        });

        // Listen for google searches
        chrome.webNavigation.onCompleted.addListener(tab => {
            chrome.tabs.query({ active: true, lastFocusedWindow: true }, async tabs => {
                if(tab.frameId !== 0) return; // Exclude subframes
                if(!Array.isArray(tabs) || tabs.length === 0) return;
                if(typeof tabs[0].url === "undefined") return;

                // Get storage vals
                const isBatteryModeEnabled = !!(await getStorageVal("battery_mode_enabled"));
                const sRateLimitedSince = await getStorageVal("rate_limited_since");

                // If a day has passed since the rate limited was issued, lift the limited state
                if(![0, null, undefined].includes(sRateLimitedSince))
                    if(Math.floor((Date.now() - parseInt(sRateLimitedSince)) / 1000) >= 86400) 
                        chrome.storage.sync.set({ rate_limited_since: 0 });

                const isBeingRateLimited = ![0, null, undefined].includes(await getStorageVal("rate_limited_since"));

                // Build the query
                let url = tabs[0].url;
                let urlParts = url.split("/").filter(Boolean);

                if(urlParts.length < 3) return;
                if(!urlParts[1].includes("www.google.") && !urlParts[2].includes("search?")) return;

                let query = "https://www.ecosia.org/search?q=" + (url.split("?q=")[1] || url.split("&q=")[1]).split("&")[0];

                // Pass the query to the server via the websocket connection
                if(!isBatteryModeEnabled || !isBeingRateLimited) socket.emit("issueQuery", query);

                // Issue a request to Ecosia to immediately retrieve the tree count
                if(!isBeingRateLimited)
                    fetch(query, {
                        method  : 'GET', 
                        headers : new Headers({
                            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                            "accept-encoding": "gzip, deflate, br",
                            "accept-language": navigator.languages.join(","),
                            "sec-fetch-dest": "document",
                            "sec-fetch-mode": "navigate",
                            "sec-fetch-site": "none",
                            "User-Agent": navigator.userAgent
                        }) 
                    })
                        .then(r => r.text()).then(result => {
                            let tmp_page = document.querySelector(".tmp-page");
                            let tree_counter_label;
                            
                            if(!tmp_page) {
                                tmp_page = document.createElement("div");
                                tmp_page.classList.add("tmp-page");
                                document.body.insertAdjacentElement("afterbegin", tmp_page);
                            }

                            tmp_page.innerHTML = result;

                            if(tree_counter_label = tmp_page.querySelector(".tree-counter > button > label")) {
                                chrome.storage.sync.set({ progress_markup: tree_counter_label.outerHTML });
                            } else {
                                chrome.storage.sync.set({ rate_limited_since: Date.now().toString() });
                            }
                    
                            document.querySelector(".tmp-page").innerHTML = "";
                        });
            });
        });
    });
}); // chrome.runtime.onInstalled
