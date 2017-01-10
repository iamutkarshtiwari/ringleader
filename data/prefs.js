/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

document.addEventListener('ready', function() {
    console.log('JS LOADED');
});

// Sends callback data back to GCLI return statement
window.addEventListener('message', function(event) {
    console.log("executing..");
    self.port.emit('execute', event.data);
}, false);

// Injects callback data to the document
self.port.on("callback", function(callbackData) {
  console.log("callback ", callbackData);
  document.querySelector('.sidebar-output').innerHTML += '<br> \> ' + callbackData.callbackData;
});

// Refreshes the commands' lookup lists
self.port.on("refresh-lookups", function(data) {
  var cloned = cloneInto(data.list, document.defaultView);
  var evt = document.createEvent('CustomEvent');
  evt.initCustomEvent(data.signal, true, true, cloned);
  document.documentElement.dispatchEvent(evt);
});

// Injects the commands to GCLI webpage
self.port.on('display', function(commands) {
  
  var actualCode = '(' + function(commands) {

    require([ 'gcli/index', 'demo/index' ], function(gcli) {
        for(idx in commands.commands.commands) {
          let command = commands.commands.commands;
          // console.log(command[idx]);
          if (command[idx].hasOwnProperty('exec')) {
            // Evaluate stringified command function
            eval("command[idx].exec = " + command[idx].exec);
          }
          if (command[idx].params && command[idx].params.length > 0) {
            for (var index = 0; index < command[idx].params.length; index++) {
              if (command[idx].params[index].type.name === 'selection') {
                eval("command[idx].params[index].type.data = " + command[idx].params[index].type.data);
                // command[idx].params[index].type.data = lookup(command[idx].name);
              }
            }
          }
          gcli.addCommand(commands.commands.commands[idx]);
        }
 
      gcli.createDisplay();
    });
  } + ')('+ JSON.stringify(commands) +');';
  var script = document.createElement('script');
  script.textContent = actualCode;
  (document.head || document.documentElement).appendChild(script);
});
