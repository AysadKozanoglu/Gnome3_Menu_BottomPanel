
// External imports
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Shell = imports.gi.Shell;

// Gjs imports
const Lang = imports.lang;

// Internal imports
const Main = imports.ui.main;

const _appSystem = Shell.AppSystem.get_default();
//const _foundApps = _appSystem.initial_search(['chromium']);
const _foundApps = _appSystem.lookup_desktop_wmclass('chromium');

var _appInfo = null;
var _bookmarksFile = null;
var _bookmarksMonitor = null;
var _callbackId = null;
var bookmarks = [];

function _readBookmarks() {
    bookmarks = [];

    let content;
    let jsonResult;
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

    try {
        jsonResult = JSON.parse(content);
    } catch(e) {
        log("ERROR: " + e.message);
        return;
    }

    if (! jsonResult.hasOwnProperty('roots')) {
        return;
    }

    for (let bookmarkLocation in jsonResult.roots) {
        let children = jsonResult.roots[bookmarkLocation].children;

        for (let idx in children) {
            if (children[idx].type == 'url') {
                bookmarks.push({
                    appInfo: _appInfo,
                    name: children[idx].name,
                    score: 0,
                    uri: children[idx].url
                });
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

    // _appInfo = _foundApps[0].get_app_info();
    _appInfo = _foundApps.get_app_info();

    _bookmarksFile = Gio.File.new_for_path(GLib.build_filenamev(
        [GLib.get_user_config_dir(), 'chromium', 'Default', 'Bookmarks']));

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
