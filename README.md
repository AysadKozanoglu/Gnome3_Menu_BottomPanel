Author: Aysad Kozanoglu

##### description
bottom panel with menu button, disabled sidepanel Dock 

#### Howto install


##### disable sidepanel Dock
```
apt remove gnome-shell-extension-ubuntu-dock -y --yes
```

##### Install bottomPanel and Menu extension
```
git clone https://github.com/AysadKozanoglu/Gnome3_Menu_BottomPanel.git
cp -R bottompanel gnomeMenu@aysad.pe.hu ~/.local/share/gnome-shell/extensions/ 
```
info: create the path if not exists ``` mkdir -p ~/.local/share/gnome-shell/extensions/ ```

##### enable bottompanel and gnomeMenu  extensions
```
gnome-shell-extension-tool -e bottompanel
gnome-shell-extension-tool -e gnomeMenu
```

Logout and login to your Desktop. finished

Screenshot
![bottom panel with menu button](http://10.10.10.221:8080/Lebenswege/LW_Menu_TopBarToBottom/raw/master/screenshot.png)
