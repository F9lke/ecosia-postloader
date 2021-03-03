window.onload = async () => {

    const oBattery = 'getBattery' in navigator ? await navigator.getBattery() : false;
    const changeBatteryMode = () => chrome.storage.sync.set({ battery_mode_enabled: !oBattery.charging });

    const battery_mode_switch = document.querySelector(".battery_mode_switch input[type='checkbox']");
    const progress_marker = document.querySelector(".ecosia-progress-marker");
    const con_marker = document.querySelector(".host-connection-marker");
    const log_area = document.querySelector("code");

    const log_showhide = document.querySelector(".ad-log-showhide");

    // Set initial values for ui elements
    chrome.storage.sync.get(null, result => {
        // Checked status for the battery mode
        if(oBattery) {
            battery_mode_switch.checked = oBattery.charging;
            changeBatteryMode();
        } else battery_mode_switch.closest("section").remove();

        // Tree counter
        progress_marker.innerHTML = result['progress_markup'] || 0;

        // Symbol for the connection marker
        con_marker.innerHTML = result['con_marker_markup'] || "&#128308;";

        // Clicked ads log
        if(result["clicked_ads_log"]) writeAdsClickedLog(result["clicked_ads_log"]);
    });

    // Update elements respectively on change
    chrome.storage.sync.onChanged.addListener(changes => {
        if(changes.hasOwnProperty('battery_mode_enabled'))
            con_marker.innerHTML = !!changes['battery_mode_enabled'].newValue || false;

        if(changes.hasOwnProperty('con_marker_markup'))
            con_marker.innerHTML = changes['con_marker_markup'].newValue || "&#128308;";

        if(changes.hasOwnProperty('progress_markup'))
            progress_marker.innerHTML = changes['progress_markup'].newValue || 0;

        if(changes.hasOwnProperty("clicked_ads_log"))
            writeAdsClickedLog(changes["clicked_ads_log"].newValue);
    });

    // Listen for battery mode state changes and manipulate store accordingly
    if(oBattery) {
        oBattery.addEventListener("chargingchange", changeBatteryMode);
        battery_mode_switch.addEventListener("click", changeBatteryMode);
    }

    // Clicked ads log show/hide toggle
    log_showhide.onclick = () => {
        log_showhide.innerHTML = log_showhide.innerHTML.includes("Show")
            ? log_showhide.innerHTML.replace("Show", "Hide")
            : log_showhide.innerHTML.replace("Hide", "Show");

        log_area.parentElement.classList.toggle("expanded");
    };

    /**
     * Formats and writes the ads clicked log
     * 
     * @param {JSON} jsonContent The contents of clicked_ads_log in chrome storage
     */
    const writeAdsClickedLog = jsonContent => {
        log_area.innerHTML = "";

        JSON.parse(jsonContent).forEach(oSearchRes => {
            oSearchRes.links.forEach(link => {
                log_area.innerHTML += `[${oSearchRes.date.split(".")[0].replace("T", " ")}] ${link} ˜\n`;
            });
        });

        log_area.innerHTML += "˜\n";
    }; // inline function writeAdsClickedLog()

};