const fs = require('fs');
const { resolve } = require('path');
const { execSync } = require('child_process');

module.exports = function isTriggerRunning() {
    const oConfVal = JSON.parse(fs.readFileSync(resolve('./../config/settings.json')));
    const sPlatform = oConfVal.platform;
    const sTriggerName = oConfVal.trigger_process_name;

    switch(sPlatform) {
        case "darwin":
            const nProcesses = parseInt(
                execSync(`ps aux | grep -v grep | grep -ci "${sTriggerName}"`).toString()
            );

            return !!(nProcesses > 0);

        case "win32":
            // TODO
            break;
    }
}; // function isTriggerRunning()