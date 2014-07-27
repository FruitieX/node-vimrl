#!/usr/bin/env node

var _vim_readline_init = function(prompt, promptWidth, lineCallback) {
    var initReadline = function() {
        var self = this;
        var jTimer = null;
        var num_re = /\d/;
        var infty = 9999999;
        self.prompt = prompt;
        self.promptWidth = promptWidth;

        self.line = "";
        self.cmdStack = "";
        self.insertMode = false;

        // position of cursor in self.line
        // does NOT represent actual position of terminal cursor
        self.cursorPos = 0;

        self.redraw = function() {
            promptClear();

            var fullLine = self.prompt + self.line;

            // left bound at cursor pos - half terminal width
            var lb = Math.floor((self.promptWidth + self.cursorPos) -
                                process.stdout.columns / 2);
            // is non negative
            lb = Math.max(0, lb);
            // is not further right than line length - terminal width
            lb = Math.min(lb, fullLine.length - process.stdout.columns);
            // is still non negative
            lb = Math.max(0, lb);

            // right bound
            var rb = lb + process.stdout.columns;

            var line = fullLine.substring(lb, rb);

            realCursorReset();
            process.stdout.write(line);
            realCursorToPos(self.promptWidth + self.cursorPos - lb);
            //console.log();
            //console.log(lb, rb, self.cursorPos, process.stdout.columns);
        };

        var cursorLeft = function(cnt) {
            // if we're at beginning of line, no point going further
            if(self.cursorPos === 0)
                return;

            // negative or zero numbers not accepted here
            cnt = Math.max(1, cnt);

            // dont go past beginning of line
            cnt = Math.min(self.cursorPos, cnt);
            //process.stdout.write('\033[' + cnt + 'D'); // move cursor left
            self.cursorPos = Math.max(0, self.cursorPos - cnt);

            self.redraw();
        };

        var cursorRight = function(cnt) {
            // if we're at end of line, no point going further
            if(self.cursorPos === self.line.length)
                return;

            // negative or zero numbers not accepted here
            cnt = Math.max(1, cnt);

            // don't go past end of line
            cnt = Math.min(cnt, self.line.length - self.cursorPos);
            //process.stdout.write('\033[' + cnt + 'C'); // move cursor right
            self.cursorPos = Math.min(self.line.length, self.cursorPos + cnt);

            self.redraw();
        };

        // resets terminal cursor to lower left
        // WARNING: does not change cursorPos
        var realCursorReset = function() {
            process.stdout.write('\033[' + process.stdout.rows + ';0f');
        };

        var realCursorToPos = function(pos) {
            realCursorReset();
            process.stdout.write('\033[' + pos + 'C'); // move real cursor right
        };

        var promptClear = function() {
            realCursorReset();
            process.stdout.write(Array(process.stdout.columns + 1 - self.promptWidth).join(' '));
        };

        var onquit = function() {
            process.exit();
        };

        var flushCmdStack = function() {
            self.cmdStack = "";
        };

        var charIdInString = function(s, c, numSkips) {
            for (var i = 0; i < s.length; i++) {
                if(s[i] === c) {
                    if(s[i+1] === c) // skip consequetive
                        continue;

                    if(!numSkips)
                        return i;
                    else
                        numSkips--;
                }
            }

            return infty;
        };

        var parseCmdStack = function() {
            var cnt = '';

            for(var i = 0; i < self.cmdStack.length; i++) {
                var chr = self.cmdStack[i];
                // quit
                if(chr === 'q') {
                    onquit();
                    flushCmdStack();
                    break;
                }

                // find
                else if (self.cmdStack[i-1] === 'f') {
                    var tempLine = self.line.substr(self.cursorPos);

                    var numChars = tempLine.indexOf(chr);

                    if (numChars > 0)
                        cursorRight(numChars);

                    flushCmdStack();
                }
                else if (self.cmdStack[i-1] === 'F') {
                    var tempLine = self.line.substr(0, self.cursorPos);
                    tempLine = tempLine.split("").reverse().join("");

                    var numChars = tempLine.indexOf(chr);

                    if (numChars > -1)
                        cursorLeft(numChars + 1);

                    flushCmdStack();
                }

                // replace char
                else if (self.cmdStack[i-1] === 'r') {
                    var start = self.line.substr(0, self.cursorPos);
                    var end = self.line.substr(self.cursorPos + 1);

                    self.line = start + chr + end;

                    flushCmdStack();
                    self.redraw();
                }

                // enter insert mode
                else if (chr === 'i') {
                    self.insertMode = true;
                    flushCmdStack();
                    break;
                }
                else if (chr === 'I') {
                    cursorLeft(infty);
                    self.insertMode = true;
                    flushCmdStack();
                    break;
                }
                else if (chr === 'a') {
                    cursorRight(1);
                    self.insertMode = true;
                    flushCmdStack();
                    break;
                }
                else if (chr === 'A') {
                    cursorRight(infty);
                    self.insertMode = true;
                    flushCmdStack();
                    break;
                }

                // movements
                else if (chr === 'h') {
                    cursorLeft(cnt || 1);
                    flushCmdStack();
                    break;
                }
                else if (chr === 'l') {
                    cursorRight(cnt || 1);
                    flushCmdStack();
                    break;
                }
                else if (chr === 'W' || chr === 'w') {
                    var tempLine = self.line.substr(self.cursorPos);

                    if(cnt)
                        cnt -= 1;

                    var numChars = charIdInString(tempLine, ' ', cnt) + 1;

                    if(numChars)
                        cursorRight(numChars);

                    flushCmdStack();
                    break;
                }
                else if (chr === 'B' || chr === 'b') {
                    var tempLine = self.line.substr(0, self.cursorPos - 1);
                    tempLine = tempLine.split("").reverse().join("");

                    var numChars = 0;

                    while(tempLine[0] === ' ') {
                        numChars++;
                        tempLine = tempLine.substr(1);
                    }

                    numChars += tempLine.indexOf(' ') + 1;

                    if(tempLine.indexOf(' ') === -1)
                        numChars = infty;

                    cursorLeft(numChars);

                    flushCmdStack();
                    break;
                }
                else if (chr === '$') {
                    cursorRight(infty);
                    flushCmdStack();
                    break;
                }
                else if (chr === '0' || chr === '^') {
                    cursorLeft(infty);
                    flushCmdStack();
                    break;
                }

                else if (num_re.exec(self.cmdStack)) {
                    cnt += num_re.exec(self.cmdStack)[0];
                }
            }
        };

        var normalMode = function() {
            self.insertMode = false;
            cursorLeft(1);
        };

        var insertAtCursorPos = function(input) {
            var start = self.line.substr(0, self.cursorPos);
            var end = self.line.substr(self.cursorPos);

            self.line = start + input[0] + end;
            cursorRight(1);
            self.redraw();
        };

        var parseInsertCmd = function(input) {
            // escape
            if (input === '1b') {
                normalMode();
                return false;
            }

            // backspace
            else if (input === '7f') {
                self.line = self.line.slice(0, self.cursorPos - 1) +
                            self.line.slice(self.cursorPos);
                cursorLeft(1);
                self.redraw();
                return false;
            }

            else if (input === '6a') {
                var curTime = new Date();

                if (jTimer) {
                    normalMode();
                    clearTimeout(jTimer);
                    jTimer = null;
                } else {
                    jTimer = setTimeout(function() {
                        insertAtCursorPos('j');
                        jTimer = null;
                    }, 500);
                }

                return false;
            }

            return true;
        };

        self.redraw();

        process.stdin.setRawMode(true);

        process.stdin.on('readable', function() {
            var input = process.stdin.read();
            //console.log(input.toString('hex'));

            if(input) {
                // return ("enter key")
                if(input.toString('hex') === '0d') {
                    lineCallback(self.line);

                    // reset state
                    self.line = "";
                    self.cursorPos = 0;
                    clearTimeout(jTimer);
                    jTimer = null;
                    flushCmdStack();

                    self.redraw();
                }

                else if(self.insertMode) {
                    if(parseInsertCmd(input.toString('hex'))) {
                        insertAtCursorPos(input.toString('utf8'));
                    }
                } else {
                    self.cmdStack += input.toString('utf8');
                    parseCmdStack();
                }
            }
        });
    }

    return new initReadline();
};

module.exports = _vim_readline_init;
