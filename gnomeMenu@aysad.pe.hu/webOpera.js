
// External imports
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Shell = imports.gi.Shell;

// Gjs imports
const Lang = imports.lang;

// Internal imports
const Main = imports.ui.main;

const _appSystem = Shell.AppSystem.get_default();
//const _foundApps = _appSystem.initial_search(['opera']);
const _foundApps = _appSystem.lookup_desktop_wmclass('opera');

var _appInfo = null;
var _bookmarksFile = null;
var _bookmarksMonitor = null;
var _callbackId = null;
var bookmarks = [];

function _readBookmarks() {
    bookmarks = [];

    let content;
    let size;
    let success;

    try {
        [success, content, size] = _bookmarksFile.load_contents(null);
    } catch(e) {
        log("ERROR: " + e.message);
        return;
    }

    if (! success) {
        return;
    }

    let lines = String(content).split("\n");

    let isURL = false;
    let name = null;
    let url = null;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        if (line == "#URL") {
            isURL = true;
        } else {
            if (isURL) {
                if (line.indexOf("NAME=") == 0) {
                    name = line.split("NAME=")[1];
                } else if (line.indexOf("URL=") == 0) {
                    url = line.split("URL=")[1];
                } else if (line == "") {
                    bookmarks.push({
                        appInfo: _appInfo,
                        name: name,
                        score: 0,
                        uri: url
                    });

                    isURL = false;
                    name = null;
                    url = null;
                }
            }
        }
    }
}

function _reset() {
    _appInfo = null;
    _bookmarksFile = null;
    _bookmarksMonitor = null;
    _callbackId = null;
    bookmarks = [];
}

function init() {
    if (_foundApps == null || _foundApps.length == 0) {
        return;
    }

    //_appInfo = _foundApps[0].get_app_info();
    _appInfo = _foundApps.get_app_info();

    _bookmarksFile = Gio.File.new_for_path(GLib.build_filenamev(
        [GLib.get_home_dir(), '.opera', 'bookmarks.adr']));

    if (! _bookmarksFile.query_exists(null)) {
        _reset();
        return;
    }

    _bookmarksMonitor = _bookmarksFile.monitor_file(
        Gio.FileMonitorFlags.NONE, null);
    _callbackId = _bookmarksMonitor.connect(
        'changed', Lang.bind(this, _readBookmarks));

    _readBookmarks();
}

function deinit() {
    if (_bookmarksMonitor) {
        if (_callbackId) {
            _bookmarksMonitor.disconnect(_callbackId);
        }

        _bookmarksMonitor.cancel();
    }

    _reset();
}
