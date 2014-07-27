var vimrl = require('./vim-readline.js');

var prompt_s = 'prompt > ';
vimrl(prompt_s, prompt_s.length, function(line) {
    console.log('\ngot line: ' + line);
});
