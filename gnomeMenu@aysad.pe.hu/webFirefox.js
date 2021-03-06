
try {
    var Gda = imports.gi.Gda;
} catch(e) {
    var Gda = null;
}

// External imports
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Shell = imports.gi.Shell;

// Gjs imports
const Lang = imports.lang;

// Internal imports
const Main = imports.ui.main;

const _appSystem = Shell.AppSystem.get_default();
//const _foundApps = _appSystem.initial_search(['firefox']);
const _foundApps = _appSystem.lookup_desktop_wmclass('firefox');
const _firefoxDir = GLib.build_filenamev([GLib.get_home_dir(), '.mozilla',
                                          'firefox']);

var _appInfo = null;
var _bookmarksFile = null;
var _bookmarksMonitor = null;
var _callbackId1 = null;
var _callbackId2 = null;
var _connection = null;
var _profileDir = null;
var _profilesFile = null;
var _profilesMonitor = null;
var bookmarks = [];

function _readBookmarks() {
    bookmarks = [];

    let result;

    if (! _connection) {
        try {
            _connection = Gda.Connection.open_from_string(
                'SQLite', 'DB_DIR=' + _profileDir + ';DB_NAME=places.sqlite',
                null, Gda.ConnectionOptions.READ_ONLY);
        } catch(e) {
            log("ERROR: " + e.message);
            return;
        }
    }

    try {
        result = _connection.execute_select_command(
            'SELECT moz_bookmarks.title, moz_places.url FROM moz_bookmarks ' +
            'INNER JOIN moz_places ON (moz_bookmarks.fk = moz_places.id) ' +
            'WHERE moz_bookmarks.fk NOT NULL AND moz_bookmarks.title NOT ' +
            'NULL AND moz_bookmarks.type = 1');
    } catch(e) {
        log("ERROR: " + e.message);
        return;
    }

    let nRows = result.get_n_rows();

    for (let row = 0; row < nRows; row++) {
        let name;
        let uri;

        try {
            name = result.get_value_at(0, row);
            uri = result.get_value_at(1, row);
        } catch(e) {
            log("ERROR: " + e.message);
            continue;
        }

        bookmarks.push({
            appInfo: _appInfo,
            name: name,
            score: 0,
            uri: uri
        });
    }
}

function _readProfiles() {
    let groups;
    let nGroups;

    let keyFile = new GLib.KeyFile();

    keyFile.load_from_file(_profilesFile.get_path(), GLib.KeyFileFlags.NONE);

    [groups, nGroups] = keyFile.get_groups();

    for (let i = 0; i < nGroups; i++) {
        let path;
        let profileName;
        let relative;

        try {
            profileName = keyFile.get_string(groups[i], 'Name');
            path = keyFile.get_string(groups[i], 'Path');
            relative = keyFile.get_boolean(groups[i], 'IsRelative');
        } catch(e) {
            continue;
        }

        if (profileName == 'default') {
            if (relative) {
                _profileDir = GLib.build_filenamev([_firefoxDir, path]);
            } else {
                _profileDir = path;
            }

            if (_bookmarksMonitor) {
                _bookmarksMonitor.cancel();
                _bookmarksMonitor = null;
            }

            if (_connection) {
                _connection.close();
                _connection = null;
            }

            _bookmarksFile = Gio.File.new_for_path(
                GLib.build_filenamev([_profileDir, 'places.sqlite']));

            if (_bookmarksFile.query_exists(null)) {
                _bookmarksMonitor = _bookmarksFile.monitor_file(
                    Gio.FileMonitorFlags.NONE, null);
                _callbackId2 = _bookmarksMonitor.connect(
                    'changed', Lang.bind(this, _readBookmarks));
                _readBookmarks();
                return;
            }
        }
    }

    // If we reached this line, no default profile was found.
    deinit();
}

function _reset() {
    if (_connection) {
        _connection.close();
    }

    _appInfo = null;
    _bookmarksFile = null;
    _bookmarksMonitor = null;
    _callbackId1 = null;
    _callbackId2 = null;
    _connection = null;
    _profileDir = null;
    _profilesFile = null;
    _profilesMonitor = null;
    bookmarks = [];
}

function init() {
    if (! Gda) {
        return;
    }

    if (_foundApps == null || _foundApps.length == 0) {
        return;
    }

    // _appInfo = _foundApps[0].get_app_info();
    _appInfo = _foundApps.get_app_info();

    _profilesFile = Gio.File.new_for_path(GLib.build_filenamev(
        [_firefoxDir, 'profiles.ini']));

    if (! _profilesFile.query_exists(null)) {
        _reset();
        return;
    }

    _profilesMonitor = _profilesFile.monitor_file(
        Gio.FileMonitorFlags.NONE, null);
    _callbackId1 = _profilesMonitor.connect(
        'changed', Lang.bind(this, _readProfiles));

    _readProfiles();
}

function deinit() {
    if (_bookmarksMonitor) {
        if (_callbackId2) {
            _bookmarksMonitor.disconnect(_callbackId2);
        }

        _bookmarksMonitor.cancel();
    }

    if (_profilesMonitor) {
        if (_callbackId1) {
            _profilesMonitor.disconnect(_callbackId1);
        }

        _profilesMonitor.cancel();
    }

    _reset();
}
