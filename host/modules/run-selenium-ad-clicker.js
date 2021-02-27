const fs_resolve  = require('path').resolve;
const fs = require('fs');

const { Builder, By, Key, until, Browser } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const UserAgent = require('user-agents');

const isValidUrl = require('../validation/is-valid-url');

module.exports = async function runSeleniumAdClicker(sQuery) {
    return await new Promise(resolve => {
        if(!isValidUrl(sQuery)) return;

        let aClickedHrefs = [];

        const oConfVal = JSON.parse(fs.readFileSync(fs_resolve('./../config/settings.json')));
        const nAmntAds = parseInt(oConfVal.amnt_ads_to_click);

        // Create the webdriver
        const oOptions = new chrome.Options();
        oOptions.addArguments('headless');
        oOptions.addArguments('disable-extensions');
        oOptions.addArguments(`user-agent="${(new UserAgent()).toString()}"`);
        oOptions.setUserPreferences({ credential_enable_service: false });
        
        const oDriver = new Builder()
            .setChromeOptions(oOptions)
            .forBrowser('chrome')
            .build();

        const sAdAnchorSelector = 'body .results-ads a[href^="http://"], body .results-ads a[href^="https://"]';

        try {
            oDriver.get(sQuery);
            oDriver.wait(until.elementLocated(By.css(sAdAnchorSelector)), 15000, 'Looking for element');

            oDriver.findElements(By.css(sAdAnchorSelector))
                .then(oWebEls => oWebEls.every(oWebEl => { 
                    oWebEl.getAttribute("href").then(sHref => {
                        // If link is a duplicate, skip it
                        const sDomain = sHref.match(/[^.]*\.[^.]{2,3}(?:\.[^.]{2,3})?$/mg);

                        if(aClickedHrefs.filter(s => s.includes(sDomain)).length > 0) return;

                        // Save the promise-resolved link of the anchor element
                        aClickedHrefs.push(sHref);

                        // Open the site in a new tab and stay on it for 2 seconds before opening the next one to make sure the ad network registers its visit
                        oDriver.executeScript(`setTimeout(() => window.open('${sHref}', '_blank'), ${aClickedHrefs.length * 2}000);`);

                        // If there are no more links available on the site or no additional ones are requested by the user
                        if(oWebEls.length === aClickedHrefs.length || aClickedHrefs.length === nAmntAds) {
                            resolve(aClickedHrefs);

                            // Kill the driver instance and short-circuit the rest of the iterations
                            setTimeout(() => oDriver.quit(), (aClickedHrefs.length * 6) * 1000);
                            
                            return false;
                        }
                    });
                }));
        } catch(e) { 
            // e.g. no ad links found
            return [];
        }
    });
}; // function runSeleniumAdClicker()