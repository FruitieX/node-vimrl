node-vim-readline
=================
vim-like readline implemented entirely in javascript.

Features:
* Fast, minimal. No external dependencies!
* Stays on one line, unlike default node readline which wraps around.
* Does not bind stdin. You have to do that manually, and thus have the freedom
  to process any inputs before passing them on to vimrl.
* Prints output to last terminal row. This behaviour should be fairly simple to
  change. vimrl shouldn't break even if you move the cursor around yourself.
* Separate insert/normal mode prompts. Supports ANSI colors in the prompts.
* Supports the following vim-like motions, prefixable by counts:
    * h, l, j, k: directional movement
    * w/b, W/B: word forward/back
    * t/f, T/F: to/find character forward/back
    * 0, ^, $: beginning/end of line
* Supports the following vim-like commands, prefixable by above motions:
    * r: replace character
    * i, I, a, A: enter insert mode, some move the cursor just like in vim
    * x: delete character under cursor
    * c: change motion
    * d: delete motion
    * q: quit
    * escape: go to normal mode
    * jj: two j characters in quick succession function as esc

TODO
----
* w/b should only move to a separator, not always whitespace as W/B
* more motions and commands
* emacs mode for blasphemers?

Example usage
-------------
See `test.js` for more detailed example.

```
var vimrl = require("vimrl");

var normalPrompt = 'prompt > ';
var insertPrompt = 'prompt x ';
var readline = vimrl({
    normalPrompt: normalPrompt,
    insertPrompt: insertPrompt
}, function(line) {
    console.log('\ngot line: ' + line);
});

// you have to pass inputs to vimrl manually
process.stdin.setRawMode(true);
process.stdin.on('readable', function() {
    var input = process.stdin.read();
    readline.handleInput(input);
});
```
