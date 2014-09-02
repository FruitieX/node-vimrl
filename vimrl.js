module.exports = function(initPrompt, lineCallback) {
    var initReadline = function() {
        var self = this;
        var jTimer = null;
        var num_re = /\d/;
        var infty = 9999999;
        var prompts = initPrompt;
        var completions;

        self.line = "";
        self.cmdStack = "";
        self.insertMode = false;

        // position of cursor in self.line
        // does NOT represent actual position of terminal cursor
        self.cursorPos = 0;

        var getPromptLen = function() {
            if(self.insertMode) {
                return prompts.insertPrompt.length;
            } else {
                return prompts.normalPrompt.length;
            }
        };

        // get substring of prompt, lb/rb = bounds
        // handles ANSI colors if given for each character in 'prompts.*Colors' array
        var getPromptSubstring = function(lb, rb) {
            var retval = "";
            var i;
            if(self.insertMode) {
                if(!prompts.insertPromptColors)
                    return prompts.insertPrompt.substring(lb, rb);

                if(rb === 0)
                    return retval;

                // loop over characters until end of string or until rb if !!rb
                for (i = lb; i < getPromptLen() && (!rb || (rb && i < rb)); i++) {
                    retval += prompts.insertPromptColors[i] + prompts.insertPrompt[i];
                }
                return retval;
            } else {
                if(!prompts.normalPromptColors)
                    return prompts.normalPrompt.substring(lb, rb);

                if(rb === 0)
                    return retval;

                // loop over characters until end of string or until rb if !!rb
                for (i = lb; i < getPromptLen() && (!rb || (rb && i < rb)); i++) {
                    retval += prompts.normalPromptColors[i] + prompts.normalPrompt[i];
                }
                return retval;
            }
        };

        self.redraw = function() {
            promptClear();

            var fullLineLength = getPromptLen() + self.line.length;

            // left bound at cursor pos - half terminal width
            var lb = Math.floor((getPromptLen() + self.cursorPos) -
                                process.stdout.columns / 2);
            // is non negative
            lb = Math.max(0, lb);
            // is not further right than line length - terminal width
            lb = Math.min(lb, fullLineLength - process.stdout.columns);
            // is still non negative
            lb = Math.max(0, lb);

            // right bound
            var rb = lb + process.stdout.columns;

            var line = getPromptSubstring(lb, undefined) +
                       '\033[000m' + // reset colors
                       self.line.substring(lb - getPromptLen(),
                                           rb - getPromptLen());

            realCursorReset();
            process.stdout.write(line);
            realCursorToPos(getPromptLen() + self.cursorPos - lb);
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
            process.stdout.write(Array(process.stdout.columns + 1).join(' '));
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

        // returns false on error and true if motion is undecided,
        // movement otherwise (negative if cursor should move left)
        var getMovement = function(cmd) {
            // valid motion is: [cnt] motion [args]

            // zero is a bit tricky to parse
            if (cmd[0] === '0' || cmd[0] === '^') {
                return -infty;
            }
            // from now we assume that a digit represents a count

            // find first non-digit character
            var motionPos = cmd.search(/\D/);
            // no motion yet given
            if(motionPos === -1)
                return true;

            var cnt = cmd.substr(0, motionPos);
            var motion = cmd.substr(motionPos, 1);
            var args = cmd.substr(motionPos + 1);

            // no motion if we multiply everything by zero
            if(cnt === 0)
                return 0;

            else if (motion === 't' || motion === 'f') {
                // motion is valid, but we need args
                if(!args)
                    return true;

                var tempLine;
                if(motion === 't')
                    tempLine = self.line.substr(self.cursorPos + 2);
                else
                    tempLine = self.line.substr(self.cursorPos + 1);

                if(cnt)
                    cnt--;
                var numChars = charIdInString(tempLine, args, cnt) + 1;

                if (numChars > 0 && numChars !== infty)
                    return parseInt(numChars);
            }
            else if (motion === 'T' || motion === 'F') {
                // motion is valid, but we need args
                if(!args)
                    return true;

                // TODO: cnt
                var tempLine;
                if(motion === 'T')
                    tempLine = self.line.substr(0, self.cursorPos - 1);
                else
                    tempLine = self.line.substr(0, self.cursorPos);
                tempLine = tempLine.split("").reverse().join("");

                var numChars = tempLine.indexOf(args);

                if (numChars > -1)
                    return parseInt(-numChars - 1);
            }
            else if (motion === 'h') {
                return parseInt(-(cnt || 1));
            }
            else if (motion === 'l') {
                return parseInt(cnt || 1);
            }
            else if (motion === 'W' || motion === 'w') {
                var tempLine = self.line.substr(self.cursorPos);

                if(cnt)
                    cnt -= 1;

                var numChars = charIdInString(tempLine, ' ', cnt) + 1;

                if(numChars)
                    return parseInt(numChars);
            }
            else if (motion === 'B' || motion === 'b') {
                // TODO: cnt
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

                return parseInt(-numChars);
            }
            else if (motion === '$') {
                return infty;
            }

            // not a valid motion, let the cmd stack be cleared
            return false;
        };

        var parseCmdStack = function() {
            // find first non-digit character
            var cmdPos = self.cmdStack.search(/\D/);

            var cnt = parseInt(self.cmdStack.substr(0, cmdPos));
            var cmd = self.cmdStack[cmdPos];

            // quit
            if(cmd === 'q') {
                onquit();
                flushCmdStack();
            }

            // replace char
            else if (cmd === 'r') {
                var start = self.line.substr(0, self.cursorPos);
                var end = self.line.substr(self.cursorPos + 1);
                var chr = self.cmdStack[1];

                self.line = start + chr + end;

                flushCmdStack();
                self.redraw();
            }

            // enter insert mode
            else if (cmd === 'i') {
                self.gotoInsertMode();
                flushCmdStack();
            }
            else if (cmd === 'I') {
                cursorLeft(infty);
                self.gotoInsertMode();
                flushCmdStack();
            }
            else if (cmd === 'a') {
                cursorRight(1);
                self.gotoInsertMode();
                flushCmdStack();
            }
            else if (cmd === 'A') {
                cursorRight(infty);
                self.gotoInsertMode();
                flushCmdStack();
            }
            else if (cmd === 'x') {
                self.line = self.line.slice(0, self.cursorPos) +
                            self.line.slice(self.cursorPos + (cnt || 1));
                self.redraw();
                flushCmdStack();
            }
            else if (cmd === 'c') {
                if(self.cmdStack[cmdPos+1] === 'c') {
                    self.line = "";
                    self.cursorPos = 0;
                    self.gotoInsertMode();
                    flushCmdStack();
                }
                else {
                    var movement = getMovement(self.cmdStack.substr(cmdPos+1));
                    var motion = self.cmdStack[self.cmdStack.substr(cmdPos+1).search(/\D/) + cmdPos+1];

                    // HACK: increase size of movement by one in these commands
                    if((movement != true && movement != false) && (motion === 'f' || motion === 'F' || motion === 't' || motion === 'T')) {
                        movement += (movement / Math.abs(movement));
                    }

                    if(movement === false) {
                        // invalid motion, flush cmd stack
                        flushCmdStack();
                    } else if (movement === true) {
                        return;
                    } else {
                        if(movement > 0) {
                            self.line = self.line.slice(0, self.cursorPos) +
                                        self.line.slice(self.cursorPos + movement);
                        } else if (movement < 0) {
                            self.line = self.line.slice(0, self.cursorPos + movement) +
                                        self.line.slice(self.cursorPos);
                            cursorLeft(-movement);
                        }

                        self.gotoInsertMode();
                        flushCmdStack();
                    }
                }
            }
            else if (cmd === 'd') {
                if(self.cmdStack[1] === 'd') {
                    self.line = "";
                    self.cursorPos = 0;
                    self.redraw();
                    flushCmdStack();
                }
                else {
                    var movement = getMovement(self.cmdStack.substr(cmdPos+1));
                    var motion = self.cmdStack[self.cmdStack.substr(cmdPos+1).search(/\D/) + cmdPos+1];

                    // HACK: increase size of movement by one in these commands
                    if((movement != true && movement != false) && (motion === 'f' || motion === 'F' || motion === 't' || motion === 'T')) {
                        movement += (movement / Math.abs(movement));
                    }

                    if(movement === false) {
                        // invalid motion, flush cmd stack
                        flushCmdStack();
                    } else if (movement === true) {
                        return;
                    } else {
                        if(movement > 0) {
                            self.line = self.line.slice(0, self.cursorPos) +
                                        self.line.slice(self.cursorPos + movement);
                        } else if (movement < 0) {
                            self.line = self.line.slice(0, self.cursorPos + movement) +
                                        self.line.slice(self.cursorPos);
                            cursorLeft(-movement);
                        }

                        self.redraw();
                        flushCmdStack();
                    }
                }
            }

            // motion
            else {
                var movement = getMovement(self.cmdStack);

                if(movement === false) {
                    // invalid motion, flush cmd stack
                    flushCmdStack();
                } else if (movement === true) {
                    return;
                } else if(movement > 0) {
                    cursorRight(movement);
                    flushCmdStack();
                } else if(movement < 0) {
                    cursorLeft(-movement);
                    flushCmdStack();
                } else {
                    flushCmdStack();
                }
            }
        };

        self.gotoNormalMode = function() {
            self.insertMode = false;
            cursorLeft(1);

            self.redraw();
        };

        self.gotoInsertMode = function() {
            self.insertMode = true;

            self.redraw();
        };

        var insertAtCursorPos = function(input) {
            var start = self.line.substr(0, self.cursorPos);
            var end = self.line.substr(self.cursorPos);

            self.line = start + input + end;
            cursorRight(input.length);
            self.redraw();
        };

        var parseInsertCmd = function(input) {
            // escape
            if (input === '1b') {
                if (jTimer) {
                    clearTimeout(jTimer);
                    jTimer = null;
                    insertAtCursorPos('j');
                }
                self.gotoNormalMode();
                return false;
            }

            // backspace
            else if (input === '7f') {
                if (jTimer) {
                    clearTimeout(jTimer);
                    jTimer = null;
                } else {
                    self.line = self.line.slice(0, self.cursorPos - 1) +
                                self.line.slice(self.cursorPos);
                    cursorLeft(1);
                    self.redraw();
                }
                return false;
            }

            // j key - 'jj' works as escape
            else if (input === '6a') {
                var curTime = new Date();

                if (jTimer) {
                    self.gotoNormalMode();
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

            // tab
            else if (input === '09') {
                var word = self.line.slice(0, self.cursorPos);
                var lastNL = word.lastIndexOf(' ') + 1;
                word = word.substr(lastNL);

                for(var i = 0; i < completions.length; i++) {
                    if(completions[i].match(new RegExp('^' + word))) {
                        insertAtCursorPos(completions[i].substr(word.length));

                        break;
                    }
                }

                return false;
            }


            // jTimer active, that is a j has been recently input before the
            // input we are handling now. Insert j and current letter, clear
            // jTimer
            else if (jTimer) {
                clearTimeout(jTimer);
                jTimer = null;
                insertAtCursorPos('j');
            }

            // return ("enter key")
            if(input === '0d') {
                lineCallback(self.line);

                // reset state
                self.line = "";
                self.cursorPos = 0;
                clearTimeout(jTimer);
                jTimer = null;
                flushCmdStack();

                self.redraw();

                return false;
            }

            return true;
        };

        self.redraw();

        self.handleInput = function(input) {
            if(input) {
                //console.log(input.toString('hex'));

                if(self.insertMode) {
                    if(parseInsertCmd(input.toString('hex'))) {
                        insertAtCursorPos(input.toString('utf8'));
                    }
                } else {
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
                    } else {
                        self.cmdStack += input.toString('utf8');
                        parseCmdStack();
                    }
                }
            }
        };

        self.changePrompt = function(newPrompts) {
            prompts = newPrompts;

            self.redraw();
        };

        self.setCompletions = function(newCompletions) {
            completions = newCompletions;
        };
    }

    return new initReadline();
};
