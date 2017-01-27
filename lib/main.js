/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// perform setup
const {Cu} = require("chrome");
const tabs = require("sdk/tabs");
const data = require("sdk/self").data;
const buttons = require('sdk/ui/button/action');
const {Utils} = require("./secutils");
const self = require('sdk/self');
const {configManager} = require("./config");

const EVENT_CONFIG_CHANGED = "PnHConfigChanged";

const pnhCommands = require("./commands");
const serviceStub = require("./servicestub");

Utils.setupPrefs();

var isPrefsPageOpen = false;

/* Attaches the content script */
tabs.activeTab.on("ready" , function() {
  require("./config").setup();
});

/* Added a UI popop to our addon */
var button = buttons.ActionButton({
  id: "pnh-link",
  label: "Plug N Hack",
  icon: {
    "16": "./pnh.png",
    "32": "./pnh.png",
    "48": "./pnh.png",
  },
  onClick: function(state) {
    main();
  }
});

var main = function() {
  tabs.on('open', function() {
    isPrefsPageOpen = true;
  });
  tabs.on('close', function() {
    isPrefsPageOpen = false;
  });
  tabs.on('pageshow', function(tab) {
    console.log(tab.url + " is loaded");
    
    const prefs_js_url = data.url('prefs.js');

    worker = tabs.activeTab.attach({
      contentScriptFile: prefs_js_url
    });
    console.log("STarted")
    require("./config").setup();

    

    // Sending pnh commands
    pnhCommands.installCommands();


    // Refresh the lookups for tool and addon 
    // pnhCommands.refreshLookupData();

    // Executing GCLI commands and returning callback data
    worker.port.on("execute", function(data) {
      // For PnH commands
      // console.log("name of command:" , data.name);
      // If not a PnH command ~ execute Tool command
      data.name.trim().startsWith("pnh") ? pnhCommands.executeCommand(data.name, data.args) : serviceStub.executeCommand(data.name, data.args);
      // console.log("Callback ", callbackData);
    });
  });

  const prefs_html_url = data.url("prefs.html");
  !isPrefsPageOpen ? tabs.open(prefs_html_url): (function() {
    for(let tab of tabs) {
      if (tab.url === prefs_html_url) {
        tab.activate();
        break;
      }
    }
  })();
}


// Refresh the commands based config change
configManager.on(EVENT_CONFIG_CHANGED, function(config) {

tabs.activeTab.reload();
  require("./config").setup();
  pnhCommands.refreshLookupData();
});