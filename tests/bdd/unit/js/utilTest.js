/*
 * Uniter - JavaScript PHP interpreter
 * Copyright 2013 Dan Phillimore (asmblah)
 * http://asmblah.github.com/uniter/
 *
 * Released under the MIT license
 * https://github.com/asmblah/uniter/raw/master/MIT-LICENSE.txt
 */

/*global define, describe, expect, it */
define([
    'package/util',
    'require',
    'js/util'
], function (
    packageUtil,
    require,
    util
) {
    'use strict';

    describe('Util', function () {
        it('should inherit from package/util', function () {
            expect(Object.getPrototypeOf(util)).to.equal(packageUtil);
        });

        describe('getLineNumber()', function () {
            util.each({
                'the empty string': {
                    text: '',
                    offset: 0,
                    expectedLineNumber: 1
                },
                'a blank line followed by text on the next line': {
                    text: '\nabc',
                    offset: 0,
                    expectedLineNumber: 1
                },
                'a blank line also followed by text on the next line': {
                    text: '\ndef',
                    offset: 2,
                    expectedLineNumber: 2
                },
                'three blank lines followed by text on the next line': {
                    text: '\n\n\nmememe',
                    offset: 3,
                    expectedLineNumber: 4
                }
            }, function (scenario, description) {
                it('should return the correct line number for ' + description + ', offset ' + scenario.offset, function () {
                    expect(util.getLineNumber(scenario.text, scenario.offset)).to.equal(scenario.expectedLineNumber);
                });
            });
        });

        describe('heredoc()', function () {
            util.each([
                {
                    heredoc: util.heredoc(function (/*<<<EOS
Line 1
Line 2
EOS
*/) {}),
                    expectedString: 'Line 1\nLine 2'
                },
                {
                    heredoc: util.heredoc(function (/*<<<EOS
${person} walked up the stairs in ${person}'s flat.
EOS
*/) {}, {person: 'Fred'}),
                    expectedString: 'Fred walked up the stairs in Fred\'s flat.'
                },
                {
                    heredoc: util.heredoc(function (/*<<<EOS
The ladder is ${length}cm long.
EOS
*/) {}, {length: 12}),
                    expectedString: 'The ladder is 12cm long.'
                }
            ], function (scenario, index) {
                it('should return the correct string for heredoc #' + (index + 1), function () {
                    expect(scenario.heredoc).to.equal(scenario.expectedString);
                });
            });
        });

        describe('inherit()', function () {
            it('should set the .prototype of the To class to be an object that uses the From class\' .prototype as its prototype', function () {
                function From() {}
                function To() {}

                util.inherit(To).from(From);

                expect(Object.getPrototypeOf(To.prototype)).to.equal(From.prototype);
            });
        });

        // Should only return true for values of Boolean type
        describe('isBoolean()', function () {
            util.each([
                {
                    value: true,
                    expectedIsBoolean: true
                },
                {
                    value: false,
                    expectedIsBoolean: true
                },
                {
                    value: [],
                    expectedIsBoolean: false
                },
                {
                    value: {},
                    expectedIsBoolean: false
                },
                {
                    value: 0,
                    expectedIsBoolean: false
                },
                {
                    value: 1,
                    expectedIsBoolean: false
                }
            ], function (scenario) {
                describe('for ' + JSON.stringify(scenario.value), function () {
                    if (scenario.expectedIsBoolean) {
                        it('should return true', function () {
                            expect(util.isBoolean(scenario.value)).to.be.true;
                        });
                    } else {
                        it('should return false', function () {
                            expect(util.isBoolean(scenario.value)).to.be.false;
                        });
                    }
                });
            });
        });
    });
});
