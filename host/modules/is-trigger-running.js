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

        case "windows":
            return [
                sTriggerName,
                sTriggerName.toLowerCase(),
                sTriggerName.split(" ")[0],
                sTriggerName.split(" ")[0].toLowerCase()
            ].map(s => {
                try {
                    return parseInt(
                        execSync(`(tasklist /FI "IMAGENAME eq ${s}.exe" 2>NUL | find /I /N "${s}.exe">NUL) && (if "%ERRORLEVEL%"=="0" echo 1)`) || false
                    );
                } catch(e) {
                    return false;
                }
            }).filter(Boolean).length > 0;
    }
}; // function isTriggerRunning()