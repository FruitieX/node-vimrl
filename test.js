// normally you would require('vimrl'), but we won't mess around with npm here
var vimrl = require("./vimrl");

// prompts used for normal / insert modes
var normalPrompt = 'prompt > ';
var insertPrompt = 'prompt x ';

// optional: ANSI colors for the prompts: arrays containing ANSI color codes for
// each character in the prompt strings
var normalPromptColors = [];
var insertPromptColors = [];
for (var i = 0; i < normalPrompt.length; i++)
    normalPromptColors[i] = '\033[38;5;' + (i+1) + 'm';
for (var i = 0; i < insertPrompt.length; i++)
    insertPromptColors[i] = '\033[38;5;255m';

// initialize vimrl
var readline = vimrl({
    /* prompts */
    normalPrompt: normalPrompt,
    normalPromptColors: normalPromptColors,
    insertPrompt: insertPrompt,
    insertPromptColors: insertPromptColors
}, function(line) {
    // callback function, called when a line was entered
    console.log('\ngot line: ' + line);
});

// disable echoing input to terminal, vimrl will take care of echoing
process.stdin.setRawMode(true);

// vimrl won't bind to stdin in case you also want to process part of the
// input, or even want to redirect something else than stdin to it. That means
// you have to pass inputs on to vimrl yourself:
process.stdin.on('readable', function() {
    var input = process.stdin.read();
    readline.handleInput(input);
});
