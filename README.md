node-vim-readline
=================
vim-like readline implemented entirely in javascript.

Usage
-----
```
var vimrl = require("vimrl");

var prompt_s = 'prompt > ';
var prompt_s_ins = 'prompt x ';
var readline = vimrl({
    normalPrompt: prompt_s,
    normalPromptLen: prompt_s.length,
    insertPrompt: prompt_s_ins,
    insertPromptLen: prompt_s_ins.length
}, function(line) {
    console.log('\ngot line: ' + line);
});

// input has to be handled by your app and/or passed on to vimrl
process.stdin.setRawMode(true);
process.stdin.on('readable', function() {
    var input = process.stdin.read();
    readline.handleInput(input);
});
```
