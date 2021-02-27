# ecosia-postloader
Chrome extension to issue Ecosia search queries after Google ones were submitted.

# Way of Working
Wenn Google Anfrage:
0. Lokaler Server muss durch nativen Host gestartet werden, wenn Browser geöffnet wird @see https://superuser.com/questions/507917/osx-launch-a-program-when-another-program-opens
1. Ecosia Anfrage über Erweiterung um Treecounter abzufragen
2. Msg an nativen Host entweder über Chrome App Native Messaging (Deprecated) oder per Request an lokalen Server
3. Lokaler Server baut Selenium Verbindung mit Ecosia Suchseite auf und klickt auf Werbebanner
4. Nativer Host muss Server schließen, wenn Browser geschlossen wird

Ratenlimitierung erkennen und fetch() in background script in diesem Fall deaktivieren