/*
 * Uniter - JavaScript PHP interpreter
 * Copyright 2013 Dan Phillimore (asmblah)
 * http://asmblah.github.com/uniter/
 *
 * Released under the MIT license
 * https://github.com/asmblah/uniter/raw/master/MIT-LICENSE.txt
 */

/*global define */
define([
    'js/util',
    './Class',
    './Error',
    './Error/Fatal'
], function (
    util,
    Class,
    PHPError,
    PHPFatalError
) {
    'use strict';

    var IS_STATIC = 'isStatic',
        MAGIC_AUTOLOAD_FUNCTION = '__autoload',
        hasOwn = {}.hasOwnProperty;

    function Namespace(callStack, valueFactory, parent, name) {
        this.callStack = callStack;
        this.children = {};
        this.classes = {};
        this.functions = {};
        this.name = name;
        this.parent = parent;
        this.valueFactory = valueFactory;
    }

    util.extend(Namespace.prototype, {
        defineClass: function (name, definition) {
            var classObject,
                constructorName = null,
                methodData = {},
                namespace = this;

            function InternalClass() {
                var instance = this;

                if (definition.superClass) {
                    definition.superClass.getInternalClass().call(this);
                }

                util.each(definition.properties, function (value, name) {
                    instance[name] = value;
                });
            }

            // Prevent native 'constructor' property from erroneously being detected as PHP class method
            delete InternalClass.prototype.constructor;

            if (definition.superClass) {
                InternalClass.prototype = Object.create(definition.superClass.getInternalClass().prototype);
            }

            util.each(definition.methods, function (data, methodName) {
                // PHP5-style __construct magic method takes precedence
                if (methodName === '__construct') {
                    if (constructorName) {
                        namespace.callStack.raiseError(PHPError.E_STRICT, 'Redefining already defined constructor for class ' + name);
                    }

                    constructorName = methodName;
                }

                if (!constructorName && methodName === name) {
                    constructorName = methodName;
                }

                data.method[IS_STATIC] = data[IS_STATIC];
                data.method.data = methodData;

                InternalClass.prototype[methodName] = data.method;
            });

            classObject = new Class(
                namespace.valueFactory,
                namespace.callStack,
                namespace.getPrefix() + name,
                constructorName,
                InternalClass,
                definition.staticProperties
            );

            methodData.classObject = classObject;

            namespace.classes[name.toLowerCase()] = classObject;

            return classObject;
        },

        defineFunction: function (name, func) {
            var namespace = this;

            if (namespace.name === '') {
                if (/__autoload/i.test(name) && func.length !== 1) {
                    throw new PHPFatalError(PHPFatalError.EXPECT_EXACTLY_1_ARG, {name: name.toLowerCase()});
                }
            }

            namespace.functions[name] = func;
        },

        getClass: function (name) {
            var globalNamespace,
                lowerName = name.toLowerCase(),
                namespace = this;

            if (!hasOwn.call(namespace.classes, lowerName)) {
                globalNamespace = namespace.getGlobal();

                if (hasOwn.call(globalNamespace.functions, MAGIC_AUTOLOAD_FUNCTION)) {
                    globalNamespace.functions[MAGIC_AUTOLOAD_FUNCTION](namespace.valueFactory.createString(namespace.getPrefix() + name));
                }

                if (!hasOwn.call(namespace.classes, lowerName)) {
                    throw new PHPFatalError(PHPFatalError.CLASS_NOT_FOUND, {name: namespace.getPrefix() + name});
                }
            }

            return namespace.classes[lowerName];
        },

        getDescendant: function (name) {
            var namespace = this;

            util.each(name.split('\\'), function (part) {
                if (!hasOwn.call(namespace.children, part)) {
                    namespace.children[part] = new Namespace(namespace.callStack, namespace.valueFactory, namespace, part);
                }

                namespace = namespace.children[part];
            });

            return namespace;
        },

        getFunction: function (name) {
            var namespace = this;

            if (util.isFunction(name)) {
                return name;
            }

            while (namespace && !hasOwn.call(namespace.functions, name)) {
                namespace = namespace.getParent();
            }

            if (!namespace) {
                throw new PHPFatalError(PHPFatalError.CALL_TO_UNDEFINED_FUNCTION, {name: name});
            }

            return namespace.functions[name];
        },

        getGlobal: function () {
            var namespace = this;

            return namespace.name === '' ? namespace : namespace.getParent().getGlobal();
        },

        getParent: function () {
            return this.parent;
        },

        getPrefix: function () {
            var namespace = this;

            if (namespace.name === '') {
                return '';
            }

            return (namespace.parent ? namespace.parent.getPrefix() : '') + namespace.name + '\\';
        }
    });

    return Namespace;
});
