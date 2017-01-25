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
const events = require("sdk/system/events");
// const promise = require('sdk/core/promise');

Utils.setupPrefs();

var isPrefsPageOpen = false;

/* Attaches the content script */
tabs.activeTab.on("open" , function() {
  tabs.activeTab.attach({
    contentScriptFile: "content_script.js"
  });
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
    tabs.on('open', function() {
      isPrefsPageOpen = true;
    });
    tabs.on('close', function() {
      isPrefsPageOpen = false;
    });
    tabs.on('pageshow', function(tab) {
      require("./config").setup();
      const prefs_js_url = data.url('prefs.js');

      worker = tabs.activeTab.attach({
        contentScriptFile: prefs_js_url
      });

      // Sending pnh commands
      pnhCommands = commands = require("./commands");
      worker.port.emit("display", commands);

      serviceStub = require("./servicestub");

      // Refresh the lookups for tool and addon 
      worker.port.on("refresh-lookups", function(data) {
        commands.refreshLookupData();
        serviceStub.refreshLookupData();
      });

      // Send back the refreshed lookups for tool
      events.on("tool-lookup-refreshed", function(data) {
        worker.port.emit("refresh-lookups", {signal: 'refresh-tool-lookup', list: JSON.parse(data.data)});
      })

      // Executing GCLI commands and returning callback data
      worker.port.on("execute", function(data) {
        // For PnH commands
        callbackData = pnhCommands.executeCommand(data.name, data.args);
        if (callbackData != "") {
          worker.port.emit("callback", {callbackData});
        } else {
            // For Tool commands
            serviceStub.executeCommand(data.name, data.args);
        }
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
});