/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const {Cu} = require("chrome");
const tabs = require("sdk/tabs");
const {self, data} = require('sdk/self');
const buttons = require('sdk/ui/button/action');

const {Utils} = require("./secutils");
const {configManager} = require("./config");
const pnhCommands = require("./commands");
const serviceStub = require("./servicestub");

const EVENT_CONFIG_CHANGED = "PnHConfigChanged";
const ADDON_URL = "resource://jid1-cz1beofm9mmlzg-at-jetpack/data/prefs.html";

Utils.setupPrefs();

var isPrefsPageOpen = false;

/* Attaches the content script */
tabs.activeTab.on("ready" , function() {
  require("./config").setup();
});

/* Added a UI popop to our addon */
var button = buttons.ActionButton({
  id: "pnh-link",
  label: "Plug-n-Hack",
  icon: {
    "16": "./pnh.png",
    "32": "./pnh.png",
    "48": "./pnh.png",
  },
  onClick: function(state) {
    if (isPrefsPageOpen) {
      for(let tab of tabs) {
        if (tab.url === ADDON_URL) {
          tab.activate();
          break;
        }
      }
    }
    main();
  }
});

var main = function() {
  if (!isPrefsPageOpen) {
    tabs.open(ADDON_URL);    
    isPrefsPageOpen = true;
  }
  
  tabs.on('close', function(tab) {
    if (tab.url === ADDON_URL) {
      isPrefsPageOpen = false;
    }
  });

  tabs.on('pageshow', function(tab) {
    console.log(tab.url + " is loaded");
    if (tab.url !== ADDON_URL) {
      pnhCommands.refreshLookupData();
      serviceStub.refreshLookupData();      
      return;
    } else {
      worker = tabs.activeTab.attach({
        contentScriptFile: data.url('prefs.js')
      });
      console.log("PnH Started")
      require("./config").setup();

      // Install PnH commands
      pnhCommands.installCommands();

      // Executing GCLI commands and returning callback data
      worker.port.on("execute", function(data) {
        // Execute the command
        data.name.trim().startsWith("pnh") ? pnhCommands.executeCommand(data.name, data.args) : serviceStub.executeCommand(data.name, data.args);
        // Refresh lookup datas
        pnhCommands.refreshLookupData();
        serviceStub.refreshLookupData();      
      });
    }
  });
}

// Refresh the tool commands if config changed
configManager.on(EVENT_CONFIG_CHANGED, function(config) {
  require("./config").setup();
  pnhCommands.refreshLookupData();
  // Reloads the tabs to reflect changes
  tabs.activeTab.reload();
});