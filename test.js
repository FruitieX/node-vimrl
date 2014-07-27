var vimrl = require('./vim-readline.js');

var prompt_s = 'prompt > ';
var prompt_s_ins = 'prompt x ';
vimrl({
    normalPrompt: prompt_s,
    normalPromptLen: prompt_s.length,
    insertPrompt: prompt_s_ins,
    insertPromptLen: prompt_s_ins.length
}, function(line) {
    console.log('\ngot line: ' + line);
});
