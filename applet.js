const Applet = imports.ui.applet;
const GLib = imports.gi.GLib;
const PopupMenu = imports.ui.popupMenu;

class ThermalApplet extends Applet.TextApplet {
  constructor(orientation, panelHeight, instanceId) {
    super(orientation, panelHeight, instanceId);

    this.labelBase = "🌡️";

    this.menuManager = new PopupMenu.PopupMenuManager(this);
    this.menu = new Applet.AppletPopupMenu(this, orientation);
    this.menuManager.addMenu(this.menu);

    this.menuItems = {};
    for (const mode of this.getAvailableModes()) {
      this.menuItems[mode] = new PopupMenu.PopupMenuItem(mode);
      this.menuItems[mode].connect("activate", () => {
        GLib.spawn_command_line_sync(
          "sudo smbios-thermal-ctl --set-thermal-mode=" + mode
        );
        this.updateActiveMode();
      });
      this.menu.addMenuItem(this.menuItems[mode]);
    }

    this.updateActiveMode();
  }

  on_applet_clicked() {
    this.menu.toggle();
  }

  getActiveMode() {
    try {
      const [result, stdout, stderr] = GLib.spawn_command_line_sync(
        "sudo smbios-thermal-ctl -g"
      );

      if (stdout !== null) {
        let capture = false;

        for (const line of stdout.toString().split("\n")) {
          if (capture) {
            return line.trim();
          }

          if (line.indexOf("Current Thermal Modes") != -1) {
            capture = true;
          }
        }
      }
    } catch (e) {
      global.logError(e);
    }
  }

  getAvailableModes() {
    try {
      const [result, stdout, stderr] = GLib.spawn_command_line_sync(
        "sudo smbios-thermal-ctl -i"
      );

      if (stdout !== null) {
        let capture = false;
        let modes = [];

        for (const line of stdout.toString().split("\n")) {
          if (capture) {
            if (line.trim().length == 0) {
              return modes;
            }

            modes.push(line.trim());
          }

          if (line.indexOf("Supported Thermal Modes") != -1) {
            capture = true;
          }
        }
      }
    } catch (e) {
      global.logError(e);
    }
  }

  updateActiveMode() {
    const mode = this.getActiveMode();

    // Remove all dots.
    Object.values(this.menuItems).forEach(item => item.setShowDot(false));

    // If we can find the active mode, set the dot on that item.
    if (mode in this.menuItems) {
      this.menuItems[mode].setShowDot(true);
      this.set_applet_label(this.labelBase + mode);
    } else {
      this.set_applet_label(this.labelBase + "??");
    }
  }
}

function main(metadata, orientation, panelHeight, instanceId) {
  return new ThermalApplet(orientation, panelHeight, instanceId);
}
