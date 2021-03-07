import os
import sys
import platform
import subprocess
import json
import glob
from pathlib import Path

sPlatform = platform.system().lower()
lInstalledPackages = []

sCliPrefix = "[ecosia-postloader] "
sConfPath = "./config/settings.json"


def unloadApp(sWatchFilePath):
    """
    Removes the injected file on user confirmation
    """
    print(sCliPrefix + "The app has already been configured and is watching.")
    sIn = input(sCliPrefix + "Do you want to unload it? [y/n]")

    if sIn.lower() in ["yes", "y"]:
        if sPlatform == "darwin":
            subprocess.run(["launchctl", "unload", sWatchFilePath])
       
        os.unlink(sWatchFilePath)

        print(sCliPrefix + "Successfully unloaded.")


def initEnv():
    """
    For MacOS an AppleScript starting the Node.js sever is called directly on trigger launch, event-driven by sytem events
    ---
    For Windows the Node.js server is started on os startup and will listen for trigger launch to start the WebSocket server afterwards 
    """
    # Clone and inject the file for watching the trigger launch
    if sPlatform == "darwin":
        sProjWatchFilePath = "./host/trigger/darwin/sysevt.plist"
        sSysInjectPath = os.path.expanduser("~/Library/LaunchAgents/com.floriangoetzrath.ecosia-postloader.plist")
    elif sPlatform == "windows":
        sProjWatchFilePath = "./host/trigger/win/startup.bat"
        sSysInjectPath = os.getenv("APPDATA") + "/Microsoft/Windows/Start Menu/Programs/Startup/ecosia-postloader.bat"

    # If the watcher is already injected, prompt the user and terminate
    lExistingSysFilePath = glob.glob(sSysInjectPath.split(".")[0] + ".*")

    if lExistingSysFilePath:
        unloadApp(lExistingSysFilePath[0])
        exit()

    # Create the watcher
    with open(sSysInjectPath, "w") as sysFile:
        with open(sProjWatchFilePath, "r") as projFile:
            with open(sConfPath, "r") as confFile:
                jsonConfContent = json.loads(confFile.read())

                sContent = projFile.read()
                sContent = sContent.replace("project_path", jsonConfContent["project_path"])
                sContent = sContent.replace("trigger_process_name", jsonConfContent["trigger_process_name"])

                sysFile.write(sContent)

    # Register the new system event
    if sPlatform == "darwin":
        subprocess.run(["launchctl", "load", sSysInjectPath])

    # Create the .exe for sys startup
    if sPlatform == "windows" and "pyinstaller" in lInstalledPackages:
        import PyInstaller.__main__

        sProjWatchFilePath = os.path.join(os.path.abspath(sProjWatchFilePath.replace("bat", "py")))
        sProjWatchPath = sProjWatchFilePath.replace("startup.py", "")

        with open(sProjWatchFilePath, "r") as projPyFile:
            with open(sProjWatchPath + "/startup_tmp.py", "w") as projTmpPyFile:
                with open(sConfPath, "r") as confFile:
                    jsonConfContent = json.loads(confFile.read())

                    sProjFileContent = projPyFile.read()
                    sProjFileContent = sProjFileContent.replace("project_path", jsonConfContent["project_path"])

                    projTmpPyFile.write(sProjFileContent)

        PyInstaller.__main__.run([
            sProjWatchPath + "/startup_tmp.py",
            "--onefile",
            "--nowindow",
            "--distpath=" + sProjWatchPath + "/dist",
            "--workpath=" + sProjWatchPath + "/build",
            "--specpath=" + sProjWatchPath
        ])

        with open(sSysInjectPath.replace(".bat", ".exe"), "bx") as sysFile:
            with open(sProjWatchPath + "/dist/startup_tmp.exe", "br") as projFile:
                sysFile.write(projFile.read())


        # Delete redundant tmp and batch file
        os.unlink(sProjWatchPath + "/startup_tmp.py")
        os.unlink(sSysInjectPath)

    print(sCliPrefix + "Successfully loaded.")


def buildConfig():
    """
    Launches a shell dialog and builds the config
    """
    sConfTriggerName = "Brave Browser"
    sConfPlatform = sPlatform
    sConfProjectPath = str(Path().absolute()).replace("\\", "/")
    sConfAmntAdsToClick = "1"

    print(sCliPrefix + "Seems like there is no valid config file. Proceeding to build one...")
    sConfTriggerName = input(sCliPrefix + "Enter the name of the process used as a trigger to start the background services: (" + sConfTriggerName + ") ") or sConfTriggerName
    sConfPlatform = input(sCliPrefix + "Enter your platform: (" + sPlatform + ") ").lower() or sConfPlatform
    sConfProjectPath = input(sCliPrefix + "Enter the path to the project: (" + sConfProjectPath + ") ") or sConfProjectPath
    sConfAmntAdsToClick = input(sCliPrefix + "Enter the number of ads to click from the Ecosia served page: (" + sConfAmntAdsToClick + ") ") or sConfAmntAdsToClick

    sConfVals = json.dumps({ 
        'trigger_process_name': sConfTriggerName, 
        'platform': sConfPlatform, 
        'project_path': sConfProjectPath,
        'amnt_ads_to_click': int(sConfAmntAdsToClick)
    }, indent=4, sort_keys=True)

    with open(sConfPath, "w") as file:
        file.write(sConfVals)


if __name__ == '__main__':
    """
    ecosia-postloader > init.py
    """
    if not Path("./config/settings.json").exists():
        buildConfig()

    # If on Windows offer to create a .exe startup file to bypass the command line window
    if sPlatform == "windows":
        res = subprocess.check_output([sys.executable, '-m', 'pip', 'freeze'])
        lInstalledPackages = [r.decode().split('==')[0] for r in res.split()]

        if not "pyinstaller" in lInstalledPackages:
            print(sCliPrefix + "The following package is not installed on your system: pyinstaller")
            print(sCliPrefix + "If installed there will be no command prompt associated with this application when you power on your machine.")
            sIn = input(sCliPrefix + "Would you like to install it? [y/n]")

            if sIn.lower() in ["yes", "y"]:
                subprocess.run(["pip", "install", "pyinstaller"])

    initEnv()