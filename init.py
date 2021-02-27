import os
import platform
import subprocess
import json
from pathlib import Path

sPlatform = platform.system().lower()

sCliPrefix = "[ecosia-postloader] "
sConfPath = "./config/settings.json"


def initDarwinEnv():
    """
    Clones and injects a property list file containing the sys watch for the trigger process and call for starting the socket server  
    """
    sProjPlistPath = "./host/trigger/darwin.plist"
    sSysPlistPath = os.path.expanduser("~/Library/LaunchAgents/com.floriangoetzrath.ecosia-postloader.plist")

    if Path(sSysPlistPath).exists():
        print(sCliPrefix + "The app has already been configured and is watching.")
        sIn = input(sCliPrefix + "Do you want to unload it? [y/n]")

        if sIn.lower() in ["yes", "y"]:
            subprocess.run(["launchctl", "unload", sSysPlistPath])
            os.unlink(sSysPlistPath)

            print(sCliPrefix + "Successfully unloaded.")
        exit()

    # Create and load the plist file
    with open(sSysPlistPath, "w") as sysFile:
        with open(sProjPlistPath, "r") as projFile:
            with open(sConfPath, "r") as confFile:
                jsonConfContent = json.loads(confFile.read())

                sContent = projFile.read()
                sContent = sContent.replace("project_path", jsonConfContent["project_path"])
                sContent = sContent.replace("trigger_process_name", jsonConfContent["trigger_process_name"])

                sysFile.write(sContent)

    subprocess.run(["launchctl", "load", sSysPlistPath])

    print(sCliPrefix + "Successfully loaded.")
    

def initWin32Env():
    print("Windows is not supported yet")


def buildConfig():
    """
    Launches a shell dialog and builds the config
    """
    sConfTriggerName = "Brave Browser"
    sConfPlatform = sPlatform
    sConfProjectPath = str(Path().absolute())
    sConfAmntAdsToClick = "1"

    print(sCliPrefix + "Seems like there is no valid config file. Proceeding to build one...")
    sConfTriggerName = input(sCliPrefix + "Enter the name of the process used as a trigger to start the background services: (" + sConfTriggerName + ") ") or sConfTriggerName
    sConfPlatform = input(sCliPrefix + "Enter your platform: (" + sPlatform + ") ").lower() or sConfPlatform
    sConfProjectPath = input(sCliPrefix + "Enter the path to the project: (" + sConfProjectPath + ") ") or sConfProjectPath
    sConfAmntAdsToClick = input(sCliPrefix + "Enter the number of ads to click from the Ecosia served page: ( " + sConfAmntAdsToClick + " ) ") or sConfAmntAdsToClick

    sConfVals = json.dumps({ 
        'trigger_process_name': sConfTriggerName, 
        'platform': sConfPlatform, 
        'project_path': sConfProjectPath,
        'amnt_ads_to_click': int(sConfAmntAdsToClick)
    }, indent=4, sort_keys=True)

    with open(sConfPath, "w") as file:
        file.write(sConfVals)


if __name__ == '__main__':
    if not Path("./config/settings.json").exists():
        buildConfig()

    if sPlatform == "darwin":
        initDarwinEnv()
    elif sPlatform == "win32":
        initWin32Env()