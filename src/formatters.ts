'use strict';

import resolve = require('resolve-from');
import fs = require('fs');
import _ = require('lodash');

const formatters = {
    esformatter: esformatterFactory,
    prettydiff: prettydiffFactory,
    prettydiff2: prettydiff2Factory
}

export interface Formatter {
    (src : string, options : any) : string;
}

export function make(root : string, impl : string, langId : string) : Formatter {
    let f = formatters[impl];
    if (f) {
        return f(root, impl, langId);
    }
    return (src, opt) => src; // NullFormatter
}

function loadModue(path : string, impl : string, onFail : () => any) : any {
    // load workspace module
    if(path) {
        try {
            return require(path);
        } catch (e) {
            // suppress error
        }
    }
    // load bundled module
    return onFail();
}

function prettydiffFactory(path : string, impl : string, langId : string) : Formatter {
    const mod = loadModue(path, impl, () => require(impl));
    return (src, options) => {
        let output = mod.api(_.defaultsDeep({}, options, {
            insize: options.insize ? options.insize : options.tabSize,
            inchar: options.inchar ? options.inchar : options.insertSpaces
                ? " "
                : "\t",
            source: src,
            mode: 'beautify'
        }, languageOptions[langId]));
        return output[0];
    };
}

function prettydiff2Factory(path : string, impl : string, langId : string) : Formatter {
    const api = loadModue(path, impl, () => {});

    return (src, options) => {
        options.lang = langId === "css" ? "css" : options.lang;
        let output = api(_.defaultsDeep({}, options, {
            insize: options.insize ? options.insize : options.tabSize,
            inchar: options.inchar ? options.inchar : options.insertSpaces
                ? " "
                : "\t",
            source: src,
            mode: 'beautify'
        },languageOptions[langId]));
        return output;
    };
}

const languageOptions = {
    css: {
        lang: "css"
    },
      javascript: {
        lang: "javascript"
    },
    javascriptreact: {
        lang: "jsx",
        jsx: true
    },
    typescript: {
        lang: "typescript",
        typescript: true
    },
    typescriptreact: {
        lang: "jsx",
        typescript: true,
        jsx: true
    }
}

function esformatterFactory(root : string, impl : string, langId : string) : Formatter {
    if(langId.startsWith("typescript")) {
        throw "esformatter don't support typescript. use prettydiff.";
    }
    const mod = loadModue(root, impl, () => {
        let m = require(impl);
        m.register(require("esformatter-jsx"));
        return m;
    });
    return (src, options) => {
        return mod.format(src, _.defaultsDeep({}, options, {
            indent: {
                value: options.insertSpaces
                    ? _.repeat(" ", options.tabSize)
                    : "\t"
            }
        }));
    };
}
