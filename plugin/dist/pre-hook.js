import { createRequire } from "node:module";
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toESMCache_node;
var __toESMCache_esm;
var __toESM = (mod, isNodeMode, target) => {
  var canCache = mod != null && typeof mod === "object";
  if (canCache) {
    var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
    var cached = cache.get(mod);
    if (cached)
      return cached;
  }
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: __accessProp.bind(mod, key),
        enumerable: true
      });
  if (canCache)
    cache.set(mod, to);
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// node_modules/yaml/dist/nodes/identity.js
var require_identity = __commonJS((exports) => {
  var ALIAS = Symbol.for("yaml.alias");
  var DOC = Symbol.for("yaml.document");
  var MAP = Symbol.for("yaml.map");
  var PAIR = Symbol.for("yaml.pair");
  var SCALAR = Symbol.for("yaml.scalar");
  var SEQ = Symbol.for("yaml.seq");
  var NODE_TYPE = Symbol.for("yaml.node.type");
  var isAlias = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === ALIAS;
  var isDocument = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === DOC;
  var isMap = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === MAP;
  var isPair = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === PAIR;
  var isScalar = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SCALAR;
  var isSeq = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SEQ;
  function isCollection(node) {
    if (node && typeof node === "object")
      switch (node[NODE_TYPE]) {
        case MAP:
        case SEQ:
          return true;
      }
    return false;
  }
  function isNode(node) {
    if (node && typeof node === "object")
      switch (node[NODE_TYPE]) {
        case ALIAS:
        case MAP:
        case SCALAR:
        case SEQ:
          return true;
      }
    return false;
  }
  var hasAnchor = (node) => (isScalar(node) || isCollection(node)) && !!node.anchor;
  exports.ALIAS = ALIAS;
  exports.DOC = DOC;
  exports.MAP = MAP;
  exports.NODE_TYPE = NODE_TYPE;
  exports.PAIR = PAIR;
  exports.SCALAR = SCALAR;
  exports.SEQ = SEQ;
  exports.hasAnchor = hasAnchor;
  exports.isAlias = isAlias;
  exports.isCollection = isCollection;
  exports.isDocument = isDocument;
  exports.isMap = isMap;
  exports.isNode = isNode;
  exports.isPair = isPair;
  exports.isScalar = isScalar;
  exports.isSeq = isSeq;
});

// node_modules/yaml/dist/visit.js
var require_visit = __commonJS((exports) => {
  var identity = require_identity();
  var BREAK = Symbol("break visit");
  var SKIP = Symbol("skip children");
  var REMOVE = Symbol("remove node");
  function visit(node, visitor) {
    const visitor_ = initVisitor(visitor);
    if (identity.isDocument(node)) {
      const cd = visit_(null, node.contents, visitor_, Object.freeze([node]));
      if (cd === REMOVE)
        node.contents = null;
    } else
      visit_(null, node, visitor_, Object.freeze([]));
  }
  visit.BREAK = BREAK;
  visit.SKIP = SKIP;
  visit.REMOVE = REMOVE;
  function visit_(key, node, visitor, path) {
    const ctrl = callVisitor(key, node, visitor, path);
    if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
      replaceNode(key, path, ctrl);
      return visit_(key, ctrl, visitor, path);
    }
    if (typeof ctrl !== "symbol") {
      if (identity.isCollection(node)) {
        path = Object.freeze(path.concat(node));
        for (let i = 0;i < node.items.length; ++i) {
          const ci = visit_(i, node.items[i], visitor, path);
          if (typeof ci === "number")
            i = ci - 1;
          else if (ci === BREAK)
            return BREAK;
          else if (ci === REMOVE) {
            node.items.splice(i, 1);
            i -= 1;
          }
        }
      } else if (identity.isPair(node)) {
        path = Object.freeze(path.concat(node));
        const ck = visit_("key", node.key, visitor, path);
        if (ck === BREAK)
          return BREAK;
        else if (ck === REMOVE)
          node.key = null;
        const cv = visit_("value", node.value, visitor, path);
        if (cv === BREAK)
          return BREAK;
        else if (cv === REMOVE)
          node.value = null;
      }
    }
    return ctrl;
  }
  async function visitAsync(node, visitor) {
    const visitor_ = initVisitor(visitor);
    if (identity.isDocument(node)) {
      const cd = await visitAsync_(null, node.contents, visitor_, Object.freeze([node]));
      if (cd === REMOVE)
        node.contents = null;
    } else
      await visitAsync_(null, node, visitor_, Object.freeze([]));
  }
  visitAsync.BREAK = BREAK;
  visitAsync.SKIP = SKIP;
  visitAsync.REMOVE = REMOVE;
  async function visitAsync_(key, node, visitor, path) {
    const ctrl = await callVisitor(key, node, visitor, path);
    if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
      replaceNode(key, path, ctrl);
      return visitAsync_(key, ctrl, visitor, path);
    }
    if (typeof ctrl !== "symbol") {
      if (identity.isCollection(node)) {
        path = Object.freeze(path.concat(node));
        for (let i = 0;i < node.items.length; ++i) {
          const ci = await visitAsync_(i, node.items[i], visitor, path);
          if (typeof ci === "number")
            i = ci - 1;
          else if (ci === BREAK)
            return BREAK;
          else if (ci === REMOVE) {
            node.items.splice(i, 1);
            i -= 1;
          }
        }
      } else if (identity.isPair(node)) {
        path = Object.freeze(path.concat(node));
        const ck = await visitAsync_("key", node.key, visitor, path);
        if (ck === BREAK)
          return BREAK;
        else if (ck === REMOVE)
          node.key = null;
        const cv = await visitAsync_("value", node.value, visitor, path);
        if (cv === BREAK)
          return BREAK;
        else if (cv === REMOVE)
          node.value = null;
      }
    }
    return ctrl;
  }
  function initVisitor(visitor) {
    if (typeof visitor === "object" && (visitor.Collection || visitor.Node || visitor.Value)) {
      return Object.assign({
        Alias: visitor.Node,
        Map: visitor.Node,
        Scalar: visitor.Node,
        Seq: visitor.Node
      }, visitor.Value && {
        Map: visitor.Value,
        Scalar: visitor.Value,
        Seq: visitor.Value
      }, visitor.Collection && {
        Map: visitor.Collection,
        Seq: visitor.Collection
      }, visitor);
    }
    return visitor;
  }
  function callVisitor(key, node, visitor, path) {
    if (typeof visitor === "function")
      return visitor(key, node, path);
    if (identity.isMap(node))
      return visitor.Map?.(key, node, path);
    if (identity.isSeq(node))
      return visitor.Seq?.(key, node, path);
    if (identity.isPair(node))
      return visitor.Pair?.(key, node, path);
    if (identity.isScalar(node))
      return visitor.Scalar?.(key, node, path);
    if (identity.isAlias(node))
      return visitor.Alias?.(key, node, path);
    return;
  }
  function replaceNode(key, path, node) {
    const parent = path[path.length - 1];
    if (identity.isCollection(parent)) {
      parent.items[key] = node;
    } else if (identity.isPair(parent)) {
      if (key === "key")
        parent.key = node;
      else
        parent.value = node;
    } else if (identity.isDocument(parent)) {
      parent.contents = node;
    } else {
      const pt = identity.isAlias(parent) ? "alias" : "scalar";
      throw new Error(`Cannot replace node with ${pt} parent`);
    }
  }
  exports.visit = visit;
  exports.visitAsync = visitAsync;
});

// node_modules/yaml/dist/doc/directives.js
var require_directives = __commonJS((exports) => {
  var identity = require_identity();
  var visit = require_visit();
  var escapeChars = {
    "!": "%21",
    ",": "%2C",
    "[": "%5B",
    "]": "%5D",
    "{": "%7B",
    "}": "%7D"
  };
  var escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]);

  class Directives {
    constructor(yaml, tags) {
      this.docStart = null;
      this.docEnd = false;
      this.yaml = Object.assign({}, Directives.defaultYaml, yaml);
      this.tags = Object.assign({}, Directives.defaultTags, tags);
    }
    clone() {
      const copy = new Directives(this.yaml, this.tags);
      copy.docStart = this.docStart;
      return copy;
    }
    atDocument() {
      const res = new Directives(this.yaml, this.tags);
      switch (this.yaml.version) {
        case "1.1":
          this.atNextDocument = true;
          break;
        case "1.2":
          this.atNextDocument = false;
          this.yaml = {
            explicit: Directives.defaultYaml.explicit,
            version: "1.2"
          };
          this.tags = Object.assign({}, Directives.defaultTags);
          break;
      }
      return res;
    }
    add(line, onError) {
      if (this.atNextDocument) {
        this.yaml = { explicit: Directives.defaultYaml.explicit, version: "1.1" };
        this.tags = Object.assign({}, Directives.defaultTags);
        this.atNextDocument = false;
      }
      const parts = line.trim().split(/[ \t]+/);
      const name = parts.shift();
      switch (name) {
        case "%TAG": {
          if (parts.length !== 2) {
            onError(0, "%TAG directive should contain exactly two parts");
            if (parts.length < 2)
              return false;
          }
          const [handle, prefix] = parts;
          this.tags[handle] = prefix;
          return true;
        }
        case "%YAML": {
          this.yaml.explicit = true;
          if (parts.length !== 1) {
            onError(0, "%YAML directive should contain exactly one part");
            return false;
          }
          const [version] = parts;
          if (version === "1.1" || version === "1.2") {
            this.yaml.version = version;
            return true;
          } else {
            const isValid = /^\d+\.\d+$/.test(version);
            onError(6, `Unsupported YAML version ${version}`, isValid);
            return false;
          }
        }
        default:
          onError(0, `Unknown directive ${name}`, true);
          return false;
      }
    }
    tagName(source, onError) {
      if (source === "!")
        return "!";
      if (source[0] !== "!") {
        onError(`Not a valid tag: ${source}`);
        return null;
      }
      if (source[1] === "<") {
        const verbatim = source.slice(2, -1);
        if (verbatim === "!" || verbatim === "!!") {
          onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
          return null;
        }
        if (source[source.length - 1] !== ">")
          onError("Verbatim tags must end with a >");
        return verbatim;
      }
      const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
      if (!suffix)
        onError(`The ${source} tag has no suffix`);
      const prefix = this.tags[handle];
      if (prefix) {
        try {
          return prefix + decodeURIComponent(suffix);
        } catch (error) {
          onError(String(error));
          return null;
        }
      }
      if (handle === "!")
        return source;
      onError(`Could not resolve tag: ${source}`);
      return null;
    }
    tagString(tag) {
      for (const [handle, prefix] of Object.entries(this.tags)) {
        if (tag.startsWith(prefix))
          return handle + escapeTagName(tag.substring(prefix.length));
      }
      return tag[0] === "!" ? tag : `!<${tag}>`;
    }
    toString(doc) {
      const lines = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [];
      const tagEntries = Object.entries(this.tags);
      let tagNames;
      if (doc && tagEntries.length > 0 && identity.isNode(doc.contents)) {
        const tags = {};
        visit.visit(doc.contents, (_key, node) => {
          if (identity.isNode(node) && node.tag)
            tags[node.tag] = true;
        });
        tagNames = Object.keys(tags);
      } else
        tagNames = [];
      for (const [handle, prefix] of tagEntries) {
        if (handle === "!!" && prefix === "tag:yaml.org,2002:")
          continue;
        if (!doc || tagNames.some((tn) => tn.startsWith(prefix)))
          lines.push(`%TAG ${handle} ${prefix}`);
      }
      return lines.join(`
`);
    }
  }
  Directives.defaultYaml = { explicit: false, version: "1.2" };
  Directives.defaultTags = { "!!": "tag:yaml.org,2002:" };
  exports.Directives = Directives;
});

// node_modules/yaml/dist/doc/anchors.js
var require_anchors = __commonJS((exports) => {
  var identity = require_identity();
  var visit = require_visit();
  function anchorIsValid(anchor) {
    if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
      const sa = JSON.stringify(anchor);
      const msg = `Anchor must not contain whitespace or control characters: ${sa}`;
      throw new Error(msg);
    }
    return true;
  }
  function anchorNames(root) {
    const anchors = new Set;
    visit.visit(root, {
      Value(_key, node) {
        if (node.anchor)
          anchors.add(node.anchor);
      }
    });
    return anchors;
  }
  function findNewAnchor(prefix, exclude) {
    for (let i = 1;; ++i) {
      const name = `${prefix}${i}`;
      if (!exclude.has(name))
        return name;
    }
  }
  function createNodeAnchors(doc, prefix) {
    const aliasObjects = [];
    const sourceObjects = new Map;
    let prevAnchors = null;
    return {
      onAnchor: (source) => {
        aliasObjects.push(source);
        prevAnchors ?? (prevAnchors = anchorNames(doc));
        const anchor = findNewAnchor(prefix, prevAnchors);
        prevAnchors.add(anchor);
        return anchor;
      },
      setAnchors: () => {
        for (const source of aliasObjects) {
          const ref = sourceObjects.get(source);
          if (typeof ref === "object" && ref.anchor && (identity.isScalar(ref.node) || identity.isCollection(ref.node))) {
            ref.node.anchor = ref.anchor;
          } else {
            const error = new Error("Failed to resolve repeated object (this should not happen)");
            error.source = source;
            throw error;
          }
        }
      },
      sourceObjects
    };
  }
  exports.anchorIsValid = anchorIsValid;
  exports.anchorNames = anchorNames;
  exports.createNodeAnchors = createNodeAnchors;
  exports.findNewAnchor = findNewAnchor;
});

// node_modules/yaml/dist/doc/applyReviver.js
var require_applyReviver = __commonJS((exports) => {
  function applyReviver(reviver, obj, key, val) {
    if (val && typeof val === "object") {
      if (Array.isArray(val)) {
        for (let i = 0, len = val.length;i < len; ++i) {
          const v0 = val[i];
          const v1 = applyReviver(reviver, val, String(i), v0);
          if (v1 === undefined)
            delete val[i];
          else if (v1 !== v0)
            val[i] = v1;
        }
      } else if (val instanceof Map) {
        for (const k of Array.from(val.keys())) {
          const v0 = val.get(k);
          const v1 = applyReviver(reviver, val, k, v0);
          if (v1 === undefined)
            val.delete(k);
          else if (v1 !== v0)
            val.set(k, v1);
        }
      } else if (val instanceof Set) {
        for (const v0 of Array.from(val)) {
          const v1 = applyReviver(reviver, val, v0, v0);
          if (v1 === undefined)
            val.delete(v0);
          else if (v1 !== v0) {
            val.delete(v0);
            val.add(v1);
          }
        }
      } else {
        for (const [k, v0] of Object.entries(val)) {
          const v1 = applyReviver(reviver, val, k, v0);
          if (v1 === undefined)
            delete val[k];
          else if (v1 !== v0)
            val[k] = v1;
        }
      }
    }
    return reviver.call(obj, key, val);
  }
  exports.applyReviver = applyReviver;
});

// node_modules/yaml/dist/nodes/toJS.js
var require_toJS = __commonJS((exports) => {
  var identity = require_identity();
  function toJS(value, arg, ctx) {
    if (Array.isArray(value))
      return value.map((v, i) => toJS(v, String(i), ctx));
    if (value && typeof value.toJSON === "function") {
      if (!ctx || !identity.hasAnchor(value))
        return value.toJSON(arg, ctx);
      const data = { aliasCount: 0, count: 1, res: undefined };
      ctx.anchors.set(value, data);
      ctx.onCreate = (res2) => {
        data.res = res2;
        delete ctx.onCreate;
      };
      const res = value.toJSON(arg, ctx);
      if (ctx.onCreate)
        ctx.onCreate(res);
      return res;
    }
    if (typeof value === "bigint" && !ctx?.keep)
      return Number(value);
    return value;
  }
  exports.toJS = toJS;
});

// node_modules/yaml/dist/nodes/Node.js
var require_Node = __commonJS((exports) => {
  var applyReviver = require_applyReviver();
  var identity = require_identity();
  var toJS = require_toJS();

  class NodeBase {
    constructor(type) {
      Object.defineProperty(this, identity.NODE_TYPE, { value: type });
    }
    clone() {
      const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
      if (this.range)
        copy.range = this.range.slice();
      return copy;
    }
    toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
      if (!identity.isDocument(doc))
        throw new TypeError("A document argument is required");
      const ctx = {
        anchors: new Map,
        doc,
        keep: true,
        mapAsMap: mapAsMap === true,
        mapKeyWarned: false,
        maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
      };
      const res = toJS.toJS(this, "", ctx);
      if (typeof onAnchor === "function")
        for (const { count, res: res2 } of ctx.anchors.values())
          onAnchor(res2, count);
      return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
    }
  }
  exports.NodeBase = NodeBase;
});

// node_modules/yaml/dist/nodes/Alias.js
var require_Alias = __commonJS((exports) => {
  var anchors = require_anchors();
  var visit = require_visit();
  var identity = require_identity();
  var Node = require_Node();
  var toJS = require_toJS();

  class Alias extends Node.NodeBase {
    constructor(source) {
      super(identity.ALIAS);
      this.source = source;
      Object.defineProperty(this, "tag", {
        set() {
          throw new Error("Alias nodes cannot have tags");
        }
      });
    }
    resolve(doc, ctx) {
      let nodes;
      if (ctx?.aliasResolveCache) {
        nodes = ctx.aliasResolveCache;
      } else {
        nodes = [];
        visit.visit(doc, {
          Node: (_key, node) => {
            if (identity.isAlias(node) || identity.hasAnchor(node))
              nodes.push(node);
          }
        });
        if (ctx)
          ctx.aliasResolveCache = nodes;
      }
      let found = undefined;
      for (const node of nodes) {
        if (node === this)
          break;
        if (node.anchor === this.source)
          found = node;
      }
      return found;
    }
    toJSON(_arg, ctx) {
      if (!ctx)
        return { source: this.source };
      const { anchors: anchors2, doc, maxAliasCount } = ctx;
      const source = this.resolve(doc, ctx);
      if (!source) {
        const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
        throw new ReferenceError(msg);
      }
      let data = anchors2.get(source);
      if (!data) {
        toJS.toJS(source, null, ctx);
        data = anchors2.get(source);
      }
      if (data?.res === undefined) {
        const msg = "This should not happen: Alias anchor was not resolved?";
        throw new ReferenceError(msg);
      }
      if (maxAliasCount >= 0) {
        data.count += 1;
        if (data.aliasCount === 0)
          data.aliasCount = getAliasCount(doc, source, anchors2);
        if (data.count * data.aliasCount > maxAliasCount) {
          const msg = "Excessive alias count indicates a resource exhaustion attack";
          throw new ReferenceError(msg);
        }
      }
      return data.res;
    }
    toString(ctx, _onComment, _onChompKeep) {
      const src = `*${this.source}`;
      if (ctx) {
        anchors.anchorIsValid(this.source);
        if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
          const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
          throw new Error(msg);
        }
        if (ctx.implicitKey)
          return `${src} `;
      }
      return src;
    }
  }
  function getAliasCount(doc, node, anchors2) {
    if (identity.isAlias(node)) {
      const source = node.resolve(doc);
      const anchor = anchors2 && source && anchors2.get(source);
      return anchor ? anchor.count * anchor.aliasCount : 0;
    } else if (identity.isCollection(node)) {
      let count = 0;
      for (const item of node.items) {
        const c = getAliasCount(doc, item, anchors2);
        if (c > count)
          count = c;
      }
      return count;
    } else if (identity.isPair(node)) {
      const kc = getAliasCount(doc, node.key, anchors2);
      const vc = getAliasCount(doc, node.value, anchors2);
      return Math.max(kc, vc);
    }
    return 1;
  }
  exports.Alias = Alias;
});

// node_modules/yaml/dist/nodes/Scalar.js
var require_Scalar = __commonJS((exports) => {
  var identity = require_identity();
  var Node = require_Node();
  var toJS = require_toJS();
  var isScalarValue = (value) => !value || typeof value !== "function" && typeof value !== "object";

  class Scalar extends Node.NodeBase {
    constructor(value) {
      super(identity.SCALAR);
      this.value = value;
    }
    toJSON(arg, ctx) {
      return ctx?.keep ? this.value : toJS.toJS(this.value, arg, ctx);
    }
    toString() {
      return String(this.value);
    }
  }
  Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
  Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
  Scalar.PLAIN = "PLAIN";
  Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
  Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";
  exports.Scalar = Scalar;
  exports.isScalarValue = isScalarValue;
});

// node_modules/yaml/dist/doc/createNode.js
var require_createNode = __commonJS((exports) => {
  var Alias = require_Alias();
  var identity = require_identity();
  var Scalar = require_Scalar();
  var defaultTagPrefix = "tag:yaml.org,2002:";
  function findTagObject(value, tagName, tags) {
    if (tagName) {
      const match = tags.filter((t) => t.tag === tagName);
      const tagObj = match.find((t) => !t.format) ?? match[0];
      if (!tagObj)
        throw new Error(`Tag ${tagName} not found`);
      return tagObj;
    }
    return tags.find((t) => t.identify?.(value) && !t.format);
  }
  function createNode(value, tagName, ctx) {
    if (identity.isDocument(value))
      value = value.contents;
    if (identity.isNode(value))
      return value;
    if (identity.isPair(value)) {
      const map = ctx.schema[identity.MAP].createNode?.(ctx.schema, null, ctx);
      map.items.push(value);
      return map;
    }
    if (value instanceof String || value instanceof Number || value instanceof Boolean || typeof BigInt !== "undefined" && value instanceof BigInt) {
      value = value.valueOf();
    }
    const { aliasDuplicateObjects, onAnchor, onTagObj, schema, sourceObjects } = ctx;
    let ref = undefined;
    if (aliasDuplicateObjects && value && typeof value === "object") {
      ref = sourceObjects.get(value);
      if (ref) {
        ref.anchor ?? (ref.anchor = onAnchor(value));
        return new Alias.Alias(ref.anchor);
      } else {
        ref = { anchor: null, node: null };
        sourceObjects.set(value, ref);
      }
    }
    if (tagName?.startsWith("!!"))
      tagName = defaultTagPrefix + tagName.slice(2);
    let tagObj = findTagObject(value, tagName, schema.tags);
    if (!tagObj) {
      if (value && typeof value.toJSON === "function") {
        value = value.toJSON();
      }
      if (!value || typeof value !== "object") {
        const node2 = new Scalar.Scalar(value);
        if (ref)
          ref.node = node2;
        return node2;
      }
      tagObj = value instanceof Map ? schema[identity.MAP] : (Symbol.iterator in Object(value)) ? schema[identity.SEQ] : schema[identity.MAP];
    }
    if (onTagObj) {
      onTagObj(tagObj);
      delete ctx.onTagObj;
    }
    const node = tagObj?.createNode ? tagObj.createNode(ctx.schema, value, ctx) : typeof tagObj?.nodeClass?.from === "function" ? tagObj.nodeClass.from(ctx.schema, value, ctx) : new Scalar.Scalar(value);
    if (tagName)
      node.tag = tagName;
    else if (!tagObj.default)
      node.tag = tagObj.tag;
    if (ref)
      ref.node = node;
    return node;
  }
  exports.createNode = createNode;
});

// node_modules/yaml/dist/nodes/Collection.js
var require_Collection = __commonJS((exports) => {
  var createNode = require_createNode();
  var identity = require_identity();
  var Node = require_Node();
  function collectionFromPath(schema, path, value) {
    let v = value;
    for (let i = path.length - 1;i >= 0; --i) {
      const k = path[i];
      if (typeof k === "number" && Number.isInteger(k) && k >= 0) {
        const a = [];
        a[k] = v;
        v = a;
      } else {
        v = new Map([[k, v]]);
      }
    }
    return createNode.createNode(v, undefined, {
      aliasDuplicateObjects: false,
      keepUndefined: false,
      onAnchor: () => {
        throw new Error("This should not happen, please report a bug.");
      },
      schema,
      sourceObjects: new Map
    });
  }
  var isEmptyPath = (path) => path == null || typeof path === "object" && !!path[Symbol.iterator]().next().done;

  class Collection extends Node.NodeBase {
    constructor(type, schema) {
      super(type);
      Object.defineProperty(this, "schema", {
        value: schema,
        configurable: true,
        enumerable: false,
        writable: true
      });
    }
    clone(schema) {
      const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
      if (schema)
        copy.schema = schema;
      copy.items = copy.items.map((it) => identity.isNode(it) || identity.isPair(it) ? it.clone(schema) : it);
      if (this.range)
        copy.range = this.range.slice();
      return copy;
    }
    addIn(path, value) {
      if (isEmptyPath(path))
        this.add(value);
      else {
        const [key, ...rest] = path;
        const node = this.get(key, true);
        if (identity.isCollection(node))
          node.addIn(rest, value);
        else if (node === undefined && this.schema)
          this.set(key, collectionFromPath(this.schema, rest, value));
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
    }
    deleteIn(path) {
      const [key, ...rest] = path;
      if (rest.length === 0)
        return this.delete(key);
      const node = this.get(key, true);
      if (identity.isCollection(node))
        return node.deleteIn(rest);
      else
        throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
    }
    getIn(path, keepScalar) {
      const [key, ...rest] = path;
      const node = this.get(key, true);
      if (rest.length === 0)
        return !keepScalar && identity.isScalar(node) ? node.value : node;
      else
        return identity.isCollection(node) ? node.getIn(rest, keepScalar) : undefined;
    }
    hasAllNullValues(allowScalar) {
      return this.items.every((node) => {
        if (!identity.isPair(node))
          return false;
        const n = node.value;
        return n == null || allowScalar && identity.isScalar(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
      });
    }
    hasIn(path) {
      const [key, ...rest] = path;
      if (rest.length === 0)
        return this.has(key);
      const node = this.get(key, true);
      return identity.isCollection(node) ? node.hasIn(rest) : false;
    }
    setIn(path, value) {
      const [key, ...rest] = path;
      if (rest.length === 0) {
        this.set(key, value);
      } else {
        const node = this.get(key, true);
        if (identity.isCollection(node))
          node.setIn(rest, value);
        else if (node === undefined && this.schema)
          this.set(key, collectionFromPath(this.schema, rest, value));
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
    }
  }
  exports.Collection = Collection;
  exports.collectionFromPath = collectionFromPath;
  exports.isEmptyPath = isEmptyPath;
});

// node_modules/yaml/dist/stringify/stringifyComment.js
var require_stringifyComment = __commonJS((exports) => {
  var stringifyComment = (str) => str.replace(/^(?!$)(?: $)?/gm, "#");
  function indentComment(comment, indent) {
    if (/^\n+$/.test(comment))
      return comment.substring(1);
    return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
  }
  var lineComment = (str, indent, comment) => str.endsWith(`
`) ? indentComment(comment, indent) : comment.includes(`
`) ? `
` + indentComment(comment, indent) : (str.endsWith(" ") ? "" : " ") + comment;
  exports.indentComment = indentComment;
  exports.lineComment = lineComment;
  exports.stringifyComment = stringifyComment;
});

// node_modules/yaml/dist/stringify/foldFlowLines.js
var require_foldFlowLines = __commonJS((exports) => {
  var FOLD_FLOW = "flow";
  var FOLD_BLOCK = "block";
  var FOLD_QUOTED = "quoted";
  function foldFlowLines(text, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
    if (!lineWidth || lineWidth < 0)
      return text;
    if (lineWidth < minContentWidth)
      minContentWidth = 0;
    const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
    if (text.length <= endStep)
      return text;
    const folds = [];
    const escapedFolds = {};
    let end = lineWidth - indent.length;
    if (typeof indentAtStart === "number") {
      if (indentAtStart > lineWidth - Math.max(2, minContentWidth))
        folds.push(0);
      else
        end = lineWidth - indentAtStart;
    }
    let split = undefined;
    let prev = undefined;
    let overflow = false;
    let i = -1;
    let escStart = -1;
    let escEnd = -1;
    if (mode === FOLD_BLOCK) {
      i = consumeMoreIndentedLines(text, i, indent.length);
      if (i !== -1)
        end = i + endStep;
    }
    for (let ch;ch = text[i += 1]; ) {
      if (mode === FOLD_QUOTED && ch === "\\") {
        escStart = i;
        switch (text[i + 1]) {
          case "x":
            i += 3;
            break;
          case "u":
            i += 5;
            break;
          case "U":
            i += 9;
            break;
          default:
            i += 1;
        }
        escEnd = i;
      }
      if (ch === `
`) {
        if (mode === FOLD_BLOCK)
          i = consumeMoreIndentedLines(text, i, indent.length);
        end = i + indent.length + endStep;
        split = undefined;
      } else {
        if (ch === " " && prev && prev !== " " && prev !== `
` && prev !== "\t") {
          const next = text[i + 1];
          if (next && next !== " " && next !== `
` && next !== "\t")
            split = i;
        }
        if (i >= end) {
          if (split) {
            folds.push(split);
            end = split + endStep;
            split = undefined;
          } else if (mode === FOLD_QUOTED) {
            while (prev === " " || prev === "\t") {
              prev = ch;
              ch = text[i += 1];
              overflow = true;
            }
            const j = i > escEnd + 1 ? i - 2 : escStart - 1;
            if (escapedFolds[j])
              return text;
            folds.push(j);
            escapedFolds[j] = true;
            end = j + endStep;
            split = undefined;
          } else {
            overflow = true;
          }
        }
      }
      prev = ch;
    }
    if (overflow && onOverflow)
      onOverflow();
    if (folds.length === 0)
      return text;
    if (onFold)
      onFold();
    let res = text.slice(0, folds[0]);
    for (let i2 = 0;i2 < folds.length; ++i2) {
      const fold = folds[i2];
      const end2 = folds[i2 + 1] || text.length;
      if (fold === 0)
        res = `
${indent}${text.slice(0, end2)}`;
      else {
        if (mode === FOLD_QUOTED && escapedFolds[fold])
          res += `${text[fold]}\\`;
        res += `
${indent}${text.slice(fold + 1, end2)}`;
      }
    }
    return res;
  }
  function consumeMoreIndentedLines(text, i, indent) {
    let end = i;
    let start = i + 1;
    let ch = text[start];
    while (ch === " " || ch === "\t") {
      if (i < start + indent) {
        ch = text[++i];
      } else {
        do {
          ch = text[++i];
        } while (ch && ch !== `
`);
        end = i;
        start = i + 1;
        ch = text[start];
      }
    }
    return end;
  }
  exports.FOLD_BLOCK = FOLD_BLOCK;
  exports.FOLD_FLOW = FOLD_FLOW;
  exports.FOLD_QUOTED = FOLD_QUOTED;
  exports.foldFlowLines = foldFlowLines;
});

// node_modules/yaml/dist/stringify/stringifyString.js
var require_stringifyString = __commonJS((exports) => {
  var Scalar = require_Scalar();
  var foldFlowLines = require_foldFlowLines();
  var getFoldOptions = (ctx, isBlock) => ({
    indentAtStart: isBlock ? ctx.indent.length : ctx.indentAtStart,
    lineWidth: ctx.options.lineWidth,
    minContentWidth: ctx.options.minContentWidth
  });
  var containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
  function lineLengthOverLimit(str, lineWidth, indentLength) {
    if (!lineWidth || lineWidth < 0)
      return false;
    const limit = lineWidth - indentLength;
    const strLen = str.length;
    if (strLen <= limit)
      return false;
    for (let i = 0, start = 0;i < strLen; ++i) {
      if (str[i] === `
`) {
        if (i - start > limit)
          return true;
        start = i + 1;
        if (strLen - start <= limit)
          return false;
      }
    }
    return true;
  }
  function doubleQuotedString(value, ctx) {
    const json = JSON.stringify(value);
    if (ctx.options.doubleQuotedAsJSON)
      return json;
    const { implicitKey } = ctx;
    const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
    const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
    let str = "";
    let start = 0;
    for (let i = 0, ch = json[i];ch; ch = json[++i]) {
      if (ch === " " && json[i + 1] === "\\" && json[i + 2] === "n") {
        str += json.slice(start, i) + "\\ ";
        i += 1;
        start = i;
        ch = "\\";
      }
      if (ch === "\\")
        switch (json[i + 1]) {
          case "u":
            {
              str += json.slice(start, i);
              const code = json.substr(i + 2, 4);
              switch (code) {
                case "0000":
                  str += "\\0";
                  break;
                case "0007":
                  str += "\\a";
                  break;
                case "000b":
                  str += "\\v";
                  break;
                case "001b":
                  str += "\\e";
                  break;
                case "0085":
                  str += "\\N";
                  break;
                case "00a0":
                  str += "\\_";
                  break;
                case "2028":
                  str += "\\L";
                  break;
                case "2029":
                  str += "\\P";
                  break;
                default:
                  if (code.substr(0, 2) === "00")
                    str += "\\x" + code.substr(2);
                  else
                    str += json.substr(i, 6);
              }
              i += 5;
              start = i + 1;
            }
            break;
          case "n":
            if (implicitKey || json[i + 2] === '"' || json.length < minMultiLineLength) {
              i += 1;
            } else {
              str += json.slice(start, i) + `

`;
              while (json[i + 2] === "\\" && json[i + 3] === "n" && json[i + 4] !== '"') {
                str += `
`;
                i += 2;
              }
              str += indent;
              if (json[i + 2] === " ")
                str += "\\";
              i += 1;
              start = i + 1;
            }
            break;
          default:
            i += 1;
        }
    }
    str = start ? str + json.slice(start) : json;
    return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_QUOTED, getFoldOptions(ctx, false));
  }
  function singleQuotedString(value, ctx) {
    if (ctx.options.singleQuote === false || ctx.implicitKey && value.includes(`
`) || /[ \t]\n|\n[ \t]/.test(value))
      return doubleQuotedString(value, ctx);
    const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
    const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&
${indent}`) + "'";
    return ctx.implicitKey ? res : foldFlowLines.foldFlowLines(res, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
  }
  function quotedString(value, ctx) {
    const { singleQuote } = ctx.options;
    let qs;
    if (singleQuote === false)
      qs = doubleQuotedString;
    else {
      const hasDouble = value.includes('"');
      const hasSingle = value.includes("'");
      if (hasDouble && !hasSingle)
        qs = singleQuotedString;
      else if (hasSingle && !hasDouble)
        qs = doubleQuotedString;
      else
        qs = singleQuote ? singleQuotedString : doubleQuotedString;
    }
    return qs(value, ctx);
  }
  var blockEndNewlines;
  try {
    blockEndNewlines = new RegExp(`(^|(?<!
))
+(?!
|$)`, "g");
  } catch {
    blockEndNewlines = /\n+(?!\n|$)/g;
  }
  function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
    const { blockQuote, commentString, lineWidth } = ctx.options;
    if (!blockQuote || /\n[\t ]+$/.test(value)) {
      return quotedString(value, ctx);
    }
    const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? "  " : "");
    const literal = blockQuote === "literal" ? true : blockQuote === "folded" || type === Scalar.Scalar.BLOCK_FOLDED ? false : type === Scalar.Scalar.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, lineWidth, indent.length);
    if (!value)
      return literal ? `|
` : `>
`;
    let chomp;
    let endStart;
    for (endStart = value.length;endStart > 0; --endStart) {
      const ch = value[endStart - 1];
      if (ch !== `
` && ch !== "\t" && ch !== " ")
        break;
    }
    let end = value.substring(endStart);
    const endNlPos = end.indexOf(`
`);
    if (endNlPos === -1) {
      chomp = "-";
    } else if (value === end || endNlPos !== end.length - 1) {
      chomp = "+";
      if (onChompKeep)
        onChompKeep();
    } else {
      chomp = "";
    }
    if (end) {
      value = value.slice(0, -end.length);
      if (end[end.length - 1] === `
`)
        end = end.slice(0, -1);
      end = end.replace(blockEndNewlines, `$&${indent}`);
    }
    let startWithSpace = false;
    let startEnd;
    let startNlPos = -1;
    for (startEnd = 0;startEnd < value.length; ++startEnd) {
      const ch = value[startEnd];
      if (ch === " ")
        startWithSpace = true;
      else if (ch === `
`)
        startNlPos = startEnd;
      else
        break;
    }
    let start = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
    if (start) {
      value = value.substring(start.length);
      start = start.replace(/\n+/g, `$&${indent}`);
    }
    const indentSize = indent ? "2" : "1";
    let header = (startWithSpace ? indentSize : "") + chomp;
    if (comment) {
      header += " " + commentString(comment.replace(/ ?[\r\n]+/g, " "));
      if (onComment)
        onComment();
    }
    if (!literal) {
      const foldedValue = value.replace(/\n+/g, `
$&`).replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`);
      let literalFallback = false;
      const foldOptions = getFoldOptions(ctx, true);
      if (blockQuote !== "folded" && type !== Scalar.Scalar.BLOCK_FOLDED) {
        foldOptions.onOverflow = () => {
          literalFallback = true;
        };
      }
      const body = foldFlowLines.foldFlowLines(`${start}${foldedValue}${end}`, indent, foldFlowLines.FOLD_BLOCK, foldOptions);
      if (!literalFallback)
        return `>${header}
${indent}${body}`;
    }
    value = value.replace(/\n+/g, `$&${indent}`);
    return `|${header}
${indent}${start}${value}${end}`;
  }
  function plainString(item, ctx, onComment, onChompKeep) {
    const { type, value } = item;
    const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
    if (implicitKey && value.includes(`
`) || inFlow && /[[\]{},]/.test(value)) {
      return quotedString(value, ctx);
    }
    if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) {
      return implicitKey || inFlow || !value.includes(`
`) ? quotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
    }
    if (!implicitKey && !inFlow && type !== Scalar.Scalar.PLAIN && value.includes(`
`)) {
      return blockString(item, ctx, onComment, onChompKeep);
    }
    if (containsDocumentMarker(value)) {
      if (indent === "") {
        ctx.forceBlockIndent = true;
        return blockString(item, ctx, onComment, onChompKeep);
      } else if (implicitKey && indent === indentStep) {
        return quotedString(value, ctx);
      }
    }
    const str = value.replace(/\n+/g, `$&
${indent}`);
    if (actualString) {
      const test = (tag) => tag.default && tag.tag !== "tag:yaml.org,2002:str" && tag.test?.test(str);
      const { compat, tags } = ctx.doc.schema;
      if (tags.some(test) || compat?.some(test))
        return quotedString(value, ctx);
    }
    return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
  }
  function stringifyString(item, ctx, onComment, onChompKeep) {
    const { implicitKey, inFlow } = ctx;
    const ss = typeof item.value === "string" ? item : Object.assign({}, item, { value: String(item.value) });
    let { type } = item;
    if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
      if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value))
        type = Scalar.Scalar.QUOTE_DOUBLE;
    }
    const _stringify = (_type) => {
      switch (_type) {
        case Scalar.Scalar.BLOCK_FOLDED:
        case Scalar.Scalar.BLOCK_LITERAL:
          return implicitKey || inFlow ? quotedString(ss.value, ctx) : blockString(ss, ctx, onComment, onChompKeep);
        case Scalar.Scalar.QUOTE_DOUBLE:
          return doubleQuotedString(ss.value, ctx);
        case Scalar.Scalar.QUOTE_SINGLE:
          return singleQuotedString(ss.value, ctx);
        case Scalar.Scalar.PLAIN:
          return plainString(ss, ctx, onComment, onChompKeep);
        default:
          return null;
      }
    };
    let res = _stringify(type);
    if (res === null) {
      const { defaultKeyType, defaultStringType } = ctx.options;
      const t = implicitKey && defaultKeyType || defaultStringType;
      res = _stringify(t);
      if (res === null)
        throw new Error(`Unsupported default string type ${t}`);
    }
    return res;
  }
  exports.stringifyString = stringifyString;
});

// node_modules/yaml/dist/stringify/stringify.js
var require_stringify = __commonJS((exports) => {
  var anchors = require_anchors();
  var identity = require_identity();
  var stringifyComment = require_stringifyComment();
  var stringifyString = require_stringifyString();
  function createStringifyContext(doc, options) {
    const opt = Object.assign({
      blockQuote: true,
      commentString: stringifyComment.stringifyComment,
      defaultKeyType: null,
      defaultStringType: "PLAIN",
      directives: null,
      doubleQuotedAsJSON: false,
      doubleQuotedMinMultiLineLength: 40,
      falseStr: "false",
      flowCollectionPadding: true,
      indentSeq: true,
      lineWidth: 80,
      minContentWidth: 20,
      nullStr: "null",
      simpleKeys: false,
      singleQuote: null,
      trailingComma: false,
      trueStr: "true",
      verifyAliasOrder: true
    }, doc.schema.toStringOptions, options);
    let inFlow;
    switch (opt.collectionStyle) {
      case "block":
        inFlow = false;
        break;
      case "flow":
        inFlow = true;
        break;
      default:
        inFlow = null;
    }
    return {
      anchors: new Set,
      doc,
      flowCollectionPadding: opt.flowCollectionPadding ? " " : "",
      indent: "",
      indentStep: typeof opt.indent === "number" ? " ".repeat(opt.indent) : "  ",
      inFlow,
      options: opt
    };
  }
  function getTagObject(tags, item) {
    if (item.tag) {
      const match = tags.filter((t) => t.tag === item.tag);
      if (match.length > 0)
        return match.find((t) => t.format === item.format) ?? match[0];
    }
    let tagObj = undefined;
    let obj;
    if (identity.isScalar(item)) {
      obj = item.value;
      let match = tags.filter((t) => t.identify?.(obj));
      if (match.length > 1) {
        const testMatch = match.filter((t) => t.test);
        if (testMatch.length > 0)
          match = testMatch;
      }
      tagObj = match.find((t) => t.format === item.format) ?? match.find((t) => !t.format);
    } else {
      obj = item;
      tagObj = tags.find((t) => t.nodeClass && obj instanceof t.nodeClass);
    }
    if (!tagObj) {
      const name = obj?.constructor?.name ?? (obj === null ? "null" : typeof obj);
      throw new Error(`Tag not resolved for ${name} value`);
    }
    return tagObj;
  }
  function stringifyProps(node, tagObj, { anchors: anchors$1, doc }) {
    if (!doc.directives)
      return "";
    const props = [];
    const anchor = (identity.isScalar(node) || identity.isCollection(node)) && node.anchor;
    if (anchor && anchors.anchorIsValid(anchor)) {
      anchors$1.add(anchor);
      props.push(`&${anchor}`);
    }
    const tag = node.tag ?? (tagObj.default ? null : tagObj.tag);
    if (tag)
      props.push(doc.directives.tagString(tag));
    return props.join(" ");
  }
  function stringify(item, ctx, onComment, onChompKeep) {
    if (identity.isPair(item))
      return item.toString(ctx, onComment, onChompKeep);
    if (identity.isAlias(item)) {
      if (ctx.doc.directives)
        return item.toString(ctx);
      if (ctx.resolvedAliases?.has(item)) {
        throw new TypeError(`Cannot stringify circular structure without alias nodes`);
      } else {
        if (ctx.resolvedAliases)
          ctx.resolvedAliases.add(item);
        else
          ctx.resolvedAliases = new Set([item]);
        item = item.resolve(ctx.doc);
      }
    }
    let tagObj = undefined;
    const node = identity.isNode(item) ? item : ctx.doc.createNode(item, { onTagObj: (o) => tagObj = o });
    tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node));
    const props = stringifyProps(node, tagObj, ctx);
    if (props.length > 0)
      ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
    const str = typeof tagObj.stringify === "function" ? tagObj.stringify(node, ctx, onComment, onChompKeep) : identity.isScalar(node) ? stringifyString.stringifyString(node, ctx, onComment, onChompKeep) : node.toString(ctx, onComment, onChompKeep);
    if (!props)
      return str;
    return identity.isScalar(node) || str[0] === "{" || str[0] === "[" ? `${props} ${str}` : `${props}
${ctx.indent}${str}`;
  }
  exports.createStringifyContext = createStringifyContext;
  exports.stringify = stringify;
});

// node_modules/yaml/dist/stringify/stringifyPair.js
var require_stringifyPair = __commonJS((exports) => {
  var identity = require_identity();
  var Scalar = require_Scalar();
  var stringify = require_stringify();
  var stringifyComment = require_stringifyComment();
  function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
    const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
    let keyComment = identity.isNode(key) && key.comment || null;
    if (simpleKeys) {
      if (keyComment) {
        throw new Error("With simple keys, key nodes cannot have comments");
      }
      if (identity.isCollection(key) || !identity.isNode(key) && typeof key === "object") {
        const msg = "With simple keys, collection cannot be used as a key value";
        throw new Error(msg);
      }
    }
    let explicitKey = !simpleKeys && (!key || keyComment && value == null && !ctx.inFlow || identity.isCollection(key) || (identity.isScalar(key) ? key.type === Scalar.Scalar.BLOCK_FOLDED || key.type === Scalar.Scalar.BLOCK_LITERAL : typeof key === "object"));
    ctx = Object.assign({}, ctx, {
      allNullValues: false,
      implicitKey: !explicitKey && (simpleKeys || !allNullValues),
      indent: indent + indentStep
    });
    let keyCommentDone = false;
    let chompKeep = false;
    let str = stringify.stringify(key, ctx, () => keyCommentDone = true, () => chompKeep = true);
    if (!explicitKey && !ctx.inFlow && str.length > 1024) {
      if (simpleKeys)
        throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
      explicitKey = true;
    }
    if (ctx.inFlow) {
      if (allNullValues || value == null) {
        if (keyCommentDone && onComment)
          onComment();
        return str === "" ? "?" : explicitKey ? `? ${str}` : str;
      }
    } else if (allNullValues && !simpleKeys || value == null && explicitKey) {
      str = `? ${str}`;
      if (keyComment && !keyCommentDone) {
        str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
      } else if (chompKeep && onChompKeep)
        onChompKeep();
      return str;
    }
    if (keyCommentDone)
      keyComment = null;
    if (explicitKey) {
      if (keyComment)
        str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
      str = `? ${str}
${indent}:`;
    } else {
      str = `${str}:`;
      if (keyComment)
        str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
    }
    let vsb, vcb, valueComment;
    if (identity.isNode(value)) {
      vsb = !!value.spaceBefore;
      vcb = value.commentBefore;
      valueComment = value.comment;
    } else {
      vsb = false;
      vcb = null;
      valueComment = null;
      if (value && typeof value === "object")
        value = doc.createNode(value);
    }
    ctx.implicitKey = false;
    if (!explicitKey && !keyComment && identity.isScalar(value))
      ctx.indentAtStart = str.length + 1;
    chompKeep = false;
    if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && identity.isSeq(value) && !value.flow && !value.tag && !value.anchor) {
      ctx.indent = ctx.indent.substring(2);
    }
    let valueCommentDone = false;
    const valueStr = stringify.stringify(value, ctx, () => valueCommentDone = true, () => chompKeep = true);
    let ws = " ";
    if (keyComment || vsb || vcb) {
      ws = vsb ? `
` : "";
      if (vcb) {
        const cs = commentString(vcb);
        ws += `
${stringifyComment.indentComment(cs, ctx.indent)}`;
      }
      if (valueStr === "" && !ctx.inFlow) {
        if (ws === `
` && valueComment)
          ws = `

`;
      } else {
        ws += `
${ctx.indent}`;
      }
    } else if (!explicitKey && identity.isCollection(value)) {
      const vs0 = valueStr[0];
      const nl0 = valueStr.indexOf(`
`);
      const hasNewline = nl0 !== -1;
      const flow = ctx.inFlow ?? value.flow ?? value.items.length === 0;
      if (hasNewline || !flow) {
        let hasPropsLine = false;
        if (hasNewline && (vs0 === "&" || vs0 === "!")) {
          let sp0 = valueStr.indexOf(" ");
          if (vs0 === "&" && sp0 !== -1 && sp0 < nl0 && valueStr[sp0 + 1] === "!") {
            sp0 = valueStr.indexOf(" ", sp0 + 1);
          }
          if (sp0 === -1 || nl0 < sp0)
            hasPropsLine = true;
        }
        if (!hasPropsLine)
          ws = `
${ctx.indent}`;
      }
    } else if (valueStr === "" || valueStr[0] === `
`) {
      ws = "";
    }
    str += ws + valueStr;
    if (ctx.inFlow) {
      if (valueCommentDone && onComment)
        onComment();
    } else if (valueComment && !valueCommentDone) {
      str += stringifyComment.lineComment(str, ctx.indent, commentString(valueComment));
    } else if (chompKeep && onChompKeep) {
      onChompKeep();
    }
    return str;
  }
  exports.stringifyPair = stringifyPair;
});

// node_modules/yaml/dist/log.js
var require_log = __commonJS((exports) => {
  var node_process = __require("process");
  function debug(logLevel, ...messages) {
    if (logLevel === "debug")
      console.log(...messages);
  }
  function warn(logLevel, warning) {
    if (logLevel === "debug" || logLevel === "warn") {
      if (typeof node_process.emitWarning === "function")
        node_process.emitWarning(warning);
      else
        console.warn(warning);
    }
  }
  exports.debug = debug;
  exports.warn = warn;
});

// node_modules/yaml/dist/schema/yaml-1.1/merge.js
var require_merge = __commonJS((exports) => {
  var identity = require_identity();
  var Scalar = require_Scalar();
  var MERGE_KEY = "<<";
  var merge = {
    identify: (value) => value === MERGE_KEY || typeof value === "symbol" && value.description === MERGE_KEY,
    default: "key",
    tag: "tag:yaml.org,2002:merge",
    test: /^<<$/,
    resolve: () => Object.assign(new Scalar.Scalar(Symbol(MERGE_KEY)), {
      addToJSMap: addMergeToJSMap
    }),
    stringify: () => MERGE_KEY
  };
  var isMergeKey = (ctx, key) => (merge.identify(key) || identity.isScalar(key) && (!key.type || key.type === Scalar.Scalar.PLAIN) && merge.identify(key.value)) && ctx?.doc.schema.tags.some((tag) => tag.tag === merge.tag && tag.default);
  function addMergeToJSMap(ctx, map, value) {
    value = ctx && identity.isAlias(value) ? value.resolve(ctx.doc) : value;
    if (identity.isSeq(value))
      for (const it of value.items)
        mergeValue(ctx, map, it);
    else if (Array.isArray(value))
      for (const it of value)
        mergeValue(ctx, map, it);
    else
      mergeValue(ctx, map, value);
  }
  function mergeValue(ctx, map, value) {
    const source = ctx && identity.isAlias(value) ? value.resolve(ctx.doc) : value;
    if (!identity.isMap(source))
      throw new Error("Merge sources must be maps or map aliases");
    const srcMap = source.toJSON(null, ctx, Map);
    for (const [key, value2] of srcMap) {
      if (map instanceof Map) {
        if (!map.has(key))
          map.set(key, value2);
      } else if (map instanceof Set) {
        map.add(key);
      } else if (!Object.prototype.hasOwnProperty.call(map, key)) {
        Object.defineProperty(map, key, {
          value: value2,
          writable: true,
          enumerable: true,
          configurable: true
        });
      }
    }
    return map;
  }
  exports.addMergeToJSMap = addMergeToJSMap;
  exports.isMergeKey = isMergeKey;
  exports.merge = merge;
});

// node_modules/yaml/dist/nodes/addPairToJSMap.js
var require_addPairToJSMap = __commonJS((exports) => {
  var log = require_log();
  var merge = require_merge();
  var stringify = require_stringify();
  var identity = require_identity();
  var toJS = require_toJS();
  function addPairToJSMap(ctx, map, { key, value }) {
    if (identity.isNode(key) && key.addToJSMap)
      key.addToJSMap(ctx, map, value);
    else if (merge.isMergeKey(ctx, key))
      merge.addMergeToJSMap(ctx, map, value);
    else {
      const jsKey = toJS.toJS(key, "", ctx);
      if (map instanceof Map) {
        map.set(jsKey, toJS.toJS(value, jsKey, ctx));
      } else if (map instanceof Set) {
        map.add(jsKey);
      } else {
        const stringKey = stringifyKey(key, jsKey, ctx);
        const jsValue = toJS.toJS(value, stringKey, ctx);
        if (stringKey in map)
          Object.defineProperty(map, stringKey, {
            value: jsValue,
            writable: true,
            enumerable: true,
            configurable: true
          });
        else
          map[stringKey] = jsValue;
      }
    }
    return map;
  }
  function stringifyKey(key, jsKey, ctx) {
    if (jsKey === null)
      return "";
    if (typeof jsKey !== "object")
      return String(jsKey);
    if (identity.isNode(key) && ctx?.doc) {
      const strCtx = stringify.createStringifyContext(ctx.doc, {});
      strCtx.anchors = new Set;
      for (const node of ctx.anchors.keys())
        strCtx.anchors.add(node.anchor);
      strCtx.inFlow = true;
      strCtx.inStringifyKey = true;
      const strKey = key.toString(strCtx);
      if (!ctx.mapKeyWarned) {
        let jsonStr = JSON.stringify(strKey);
        if (jsonStr.length > 40)
          jsonStr = jsonStr.substring(0, 36) + '..."';
        log.warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
        ctx.mapKeyWarned = true;
      }
      return strKey;
    }
    return JSON.stringify(jsKey);
  }
  exports.addPairToJSMap = addPairToJSMap;
});

// node_modules/yaml/dist/nodes/Pair.js
var require_Pair = __commonJS((exports) => {
  var createNode = require_createNode();
  var stringifyPair = require_stringifyPair();
  var addPairToJSMap = require_addPairToJSMap();
  var identity = require_identity();
  function createPair(key, value, ctx) {
    const k = createNode.createNode(key, undefined, ctx);
    const v = createNode.createNode(value, undefined, ctx);
    return new Pair(k, v);
  }

  class Pair {
    constructor(key, value = null) {
      Object.defineProperty(this, identity.NODE_TYPE, { value: identity.PAIR });
      this.key = key;
      this.value = value;
    }
    clone(schema) {
      let { key, value } = this;
      if (identity.isNode(key))
        key = key.clone(schema);
      if (identity.isNode(value))
        value = value.clone(schema);
      return new Pair(key, value);
    }
    toJSON(_, ctx) {
      const pair = ctx?.mapAsMap ? new Map : {};
      return addPairToJSMap.addPairToJSMap(ctx, pair, this);
    }
    toString(ctx, onComment, onChompKeep) {
      return ctx?.doc ? stringifyPair.stringifyPair(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
    }
  }
  exports.Pair = Pair;
  exports.createPair = createPair;
});

// node_modules/yaml/dist/stringify/stringifyCollection.js
var require_stringifyCollection = __commonJS((exports) => {
  var identity = require_identity();
  var stringify = require_stringify();
  var stringifyComment = require_stringifyComment();
  function stringifyCollection(collection, ctx, options) {
    const flow = ctx.inFlow ?? collection.flow;
    const stringify2 = flow ? stringifyFlowCollection : stringifyBlockCollection;
    return stringify2(collection, ctx, options);
  }
  function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
    const { indent, options: { commentString } } = ctx;
    const itemCtx = Object.assign({}, ctx, { indent: itemIndent, type: null });
    let chompKeep = false;
    const lines = [];
    for (let i = 0;i < items.length; ++i) {
      const item = items[i];
      let comment2 = null;
      if (identity.isNode(item)) {
        if (!chompKeep && item.spaceBefore)
          lines.push("");
        addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
        if (item.comment)
          comment2 = item.comment;
      } else if (identity.isPair(item)) {
        const ik = identity.isNode(item.key) ? item.key : null;
        if (ik) {
          if (!chompKeep && ik.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
        }
      }
      chompKeep = false;
      let str2 = stringify.stringify(item, itemCtx, () => comment2 = null, () => chompKeep = true);
      if (comment2)
        str2 += stringifyComment.lineComment(str2, itemIndent, commentString(comment2));
      if (chompKeep && comment2)
        chompKeep = false;
      lines.push(blockItemPrefix + str2);
    }
    let str;
    if (lines.length === 0) {
      str = flowChars.start + flowChars.end;
    } else {
      str = lines[0];
      for (let i = 1;i < lines.length; ++i) {
        const line = lines[i];
        str += line ? `
${indent}${line}` : `
`;
      }
    }
    if (comment) {
      str += `
` + stringifyComment.indentComment(commentString(comment), indent);
      if (onComment)
        onComment();
    } else if (chompKeep && onChompKeep)
      onChompKeep();
    return str;
  }
  function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
    const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
    itemIndent += indentStep;
    const itemCtx = Object.assign({}, ctx, {
      indent: itemIndent,
      inFlow: true,
      type: null
    });
    let reqNewline = false;
    let linesAtValue = 0;
    const lines = [];
    for (let i = 0;i < items.length; ++i) {
      const item = items[i];
      let comment = null;
      if (identity.isNode(item)) {
        if (item.spaceBefore)
          lines.push("");
        addCommentBefore(ctx, lines, item.commentBefore, false);
        if (item.comment)
          comment = item.comment;
      } else if (identity.isPair(item)) {
        const ik = identity.isNode(item.key) ? item.key : null;
        if (ik) {
          if (ik.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, ik.commentBefore, false);
          if (ik.comment)
            reqNewline = true;
        }
        const iv = identity.isNode(item.value) ? item.value : null;
        if (iv) {
          if (iv.comment)
            comment = iv.comment;
          if (iv.commentBefore)
            reqNewline = true;
        } else if (item.value == null && ik?.comment) {
          comment = ik.comment;
        }
      }
      if (comment)
        reqNewline = true;
      let str = stringify.stringify(item, itemCtx, () => comment = null);
      reqNewline || (reqNewline = lines.length > linesAtValue || str.includes(`
`));
      if (i < items.length - 1) {
        str += ",";
      } else if (ctx.options.trailingComma) {
        if (ctx.options.lineWidth > 0) {
          reqNewline || (reqNewline = lines.reduce((sum, line) => sum + line.length + 2, 2) + (str.length + 2) > ctx.options.lineWidth);
        }
        if (reqNewline) {
          str += ",";
        }
      }
      if (comment)
        str += stringifyComment.lineComment(str, itemIndent, commentString(comment));
      lines.push(str);
      linesAtValue = lines.length;
    }
    const { start, end } = flowChars;
    if (lines.length === 0) {
      return start + end;
    } else {
      if (!reqNewline) {
        const len = lines.reduce((sum, line) => sum + line.length + 2, 2);
        reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
      }
      if (reqNewline) {
        let str = start;
        for (const line of lines)
          str += line ? `
${indentStep}${indent}${line}` : `
`;
        return `${str}
${indent}${end}`;
      } else {
        return `${start}${fcPadding}${lines.join(" ")}${fcPadding}${end}`;
      }
    }
  }
  function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
    if (comment && chompKeep)
      comment = comment.replace(/^\n+/, "");
    if (comment) {
      const ic = stringifyComment.indentComment(commentString(comment), indent);
      lines.push(ic.trimStart());
    }
  }
  exports.stringifyCollection = stringifyCollection;
});

// node_modules/yaml/dist/nodes/YAMLMap.js
var require_YAMLMap = __commonJS((exports) => {
  var stringifyCollection = require_stringifyCollection();
  var addPairToJSMap = require_addPairToJSMap();
  var Collection = require_Collection();
  var identity = require_identity();
  var Pair = require_Pair();
  var Scalar = require_Scalar();
  function findPair(items, key) {
    const k = identity.isScalar(key) ? key.value : key;
    for (const it of items) {
      if (identity.isPair(it)) {
        if (it.key === key || it.key === k)
          return it;
        if (identity.isScalar(it.key) && it.key.value === k)
          return it;
      }
    }
    return;
  }

  class YAMLMap extends Collection.Collection {
    static get tagName() {
      return "tag:yaml.org,2002:map";
    }
    constructor(schema) {
      super(identity.MAP, schema);
      this.items = [];
    }
    static from(schema, obj, ctx) {
      const { keepUndefined, replacer } = ctx;
      const map = new this(schema);
      const add = (key, value) => {
        if (typeof replacer === "function")
          value = replacer.call(obj, key, value);
        else if (Array.isArray(replacer) && !replacer.includes(key))
          return;
        if (value !== undefined || keepUndefined)
          map.items.push(Pair.createPair(key, value, ctx));
      };
      if (obj instanceof Map) {
        for (const [key, value] of obj)
          add(key, value);
      } else if (obj && typeof obj === "object") {
        for (const key of Object.keys(obj))
          add(key, obj[key]);
      }
      if (typeof schema.sortMapEntries === "function") {
        map.items.sort(schema.sortMapEntries);
      }
      return map;
    }
    add(pair, overwrite) {
      let _pair;
      if (identity.isPair(pair))
        _pair = pair;
      else if (!pair || typeof pair !== "object" || !("key" in pair)) {
        _pair = new Pair.Pair(pair, pair?.value);
      } else
        _pair = new Pair.Pair(pair.key, pair.value);
      const prev = findPair(this.items, _pair.key);
      const sortEntries = this.schema?.sortMapEntries;
      if (prev) {
        if (!overwrite)
          throw new Error(`Key ${_pair.key} already set`);
        if (identity.isScalar(prev.value) && Scalar.isScalarValue(_pair.value))
          prev.value.value = _pair.value;
        else
          prev.value = _pair.value;
      } else if (sortEntries) {
        const i = this.items.findIndex((item) => sortEntries(_pair, item) < 0);
        if (i === -1)
          this.items.push(_pair);
        else
          this.items.splice(i, 0, _pair);
      } else {
        this.items.push(_pair);
      }
    }
    delete(key) {
      const it = findPair(this.items, key);
      if (!it)
        return false;
      const del = this.items.splice(this.items.indexOf(it), 1);
      return del.length > 0;
    }
    get(key, keepScalar) {
      const it = findPair(this.items, key);
      const node = it?.value;
      return (!keepScalar && identity.isScalar(node) ? node.value : node) ?? undefined;
    }
    has(key) {
      return !!findPair(this.items, key);
    }
    set(key, value) {
      this.add(new Pair.Pair(key, value), true);
    }
    toJSON(_, ctx, Type) {
      const map = Type ? new Type : ctx?.mapAsMap ? new Map : {};
      if (ctx?.onCreate)
        ctx.onCreate(map);
      for (const item of this.items)
        addPairToJSMap.addPairToJSMap(ctx, map, item);
      return map;
    }
    toString(ctx, onComment, onChompKeep) {
      if (!ctx)
        return JSON.stringify(this);
      for (const item of this.items) {
        if (!identity.isPair(item))
          throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
      }
      if (!ctx.allNullValues && this.hasAllNullValues(false))
        ctx = Object.assign({}, ctx, { allNullValues: true });
      return stringifyCollection.stringifyCollection(this, ctx, {
        blockItemPrefix: "",
        flowChars: { start: "{", end: "}" },
        itemIndent: ctx.indent || "",
        onChompKeep,
        onComment
      });
    }
  }
  exports.YAMLMap = YAMLMap;
  exports.findPair = findPair;
});

// node_modules/yaml/dist/schema/common/map.js
var require_map = __commonJS((exports) => {
  var identity = require_identity();
  var YAMLMap = require_YAMLMap();
  var map = {
    collection: "map",
    default: true,
    nodeClass: YAMLMap.YAMLMap,
    tag: "tag:yaml.org,2002:map",
    resolve(map2, onError) {
      if (!identity.isMap(map2))
        onError("Expected a mapping for this tag");
      return map2;
    },
    createNode: (schema, obj, ctx) => YAMLMap.YAMLMap.from(schema, obj, ctx)
  };
  exports.map = map;
});

// node_modules/yaml/dist/nodes/YAMLSeq.js
var require_YAMLSeq = __commonJS((exports) => {
  var createNode = require_createNode();
  var stringifyCollection = require_stringifyCollection();
  var Collection = require_Collection();
  var identity = require_identity();
  var Scalar = require_Scalar();
  var toJS = require_toJS();

  class YAMLSeq extends Collection.Collection {
    static get tagName() {
      return "tag:yaml.org,2002:seq";
    }
    constructor(schema) {
      super(identity.SEQ, schema);
      this.items = [];
    }
    add(value) {
      this.items.push(value);
    }
    delete(key) {
      const idx = asItemIndex(key);
      if (typeof idx !== "number")
        return false;
      const del = this.items.splice(idx, 1);
      return del.length > 0;
    }
    get(key, keepScalar) {
      const idx = asItemIndex(key);
      if (typeof idx !== "number")
        return;
      const it = this.items[idx];
      return !keepScalar && identity.isScalar(it) ? it.value : it;
    }
    has(key) {
      const idx = asItemIndex(key);
      return typeof idx === "number" && idx < this.items.length;
    }
    set(key, value) {
      const idx = asItemIndex(key);
      if (typeof idx !== "number")
        throw new Error(`Expected a valid index, not ${key}.`);
      const prev = this.items[idx];
      if (identity.isScalar(prev) && Scalar.isScalarValue(value))
        prev.value = value;
      else
        this.items[idx] = value;
    }
    toJSON(_, ctx) {
      const seq = [];
      if (ctx?.onCreate)
        ctx.onCreate(seq);
      let i = 0;
      for (const item of this.items)
        seq.push(toJS.toJS(item, String(i++), ctx));
      return seq;
    }
    toString(ctx, onComment, onChompKeep) {
      if (!ctx)
        return JSON.stringify(this);
      return stringifyCollection.stringifyCollection(this, ctx, {
        blockItemPrefix: "- ",
        flowChars: { start: "[", end: "]" },
        itemIndent: (ctx.indent || "") + "  ",
        onChompKeep,
        onComment
      });
    }
    static from(schema, obj, ctx) {
      const { replacer } = ctx;
      const seq = new this(schema);
      if (obj && Symbol.iterator in Object(obj)) {
        let i = 0;
        for (let it of obj) {
          if (typeof replacer === "function") {
            const key = obj instanceof Set ? it : String(i++);
            it = replacer.call(obj, key, it);
          }
          seq.items.push(createNode.createNode(it, undefined, ctx));
        }
      }
      return seq;
    }
  }
  function asItemIndex(key) {
    let idx = identity.isScalar(key) ? key.value : key;
    if (idx && typeof idx === "string")
      idx = Number(idx);
    return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 ? idx : null;
  }
  exports.YAMLSeq = YAMLSeq;
});

// node_modules/yaml/dist/schema/common/seq.js
var require_seq = __commonJS((exports) => {
  var identity = require_identity();
  var YAMLSeq = require_YAMLSeq();
  var seq = {
    collection: "seq",
    default: true,
    nodeClass: YAMLSeq.YAMLSeq,
    tag: "tag:yaml.org,2002:seq",
    resolve(seq2, onError) {
      if (!identity.isSeq(seq2))
        onError("Expected a sequence for this tag");
      return seq2;
    },
    createNode: (schema, obj, ctx) => YAMLSeq.YAMLSeq.from(schema, obj, ctx)
  };
  exports.seq = seq;
});

// node_modules/yaml/dist/schema/common/string.js
var require_string = __commonJS((exports) => {
  var stringifyString = require_stringifyString();
  var string = {
    identify: (value) => typeof value === "string",
    default: true,
    tag: "tag:yaml.org,2002:str",
    resolve: (str) => str,
    stringify(item, ctx, onComment, onChompKeep) {
      ctx = Object.assign({ actualString: true }, ctx);
      return stringifyString.stringifyString(item, ctx, onComment, onChompKeep);
    }
  };
  exports.string = string;
});

// node_modules/yaml/dist/schema/common/null.js
var require_null = __commonJS((exports) => {
  var Scalar = require_Scalar();
  var nullTag = {
    identify: (value) => value == null,
    createNode: () => new Scalar.Scalar(null),
    default: true,
    tag: "tag:yaml.org,2002:null",
    test: /^(?:~|[Nn]ull|NULL)?$/,
    resolve: () => new Scalar.Scalar(null),
    stringify: ({ source }, ctx) => typeof source === "string" && nullTag.test.test(source) ? source : ctx.options.nullStr
  };
  exports.nullTag = nullTag;
});

// node_modules/yaml/dist/schema/core/bool.js
var require_bool = __commonJS((exports) => {
  var Scalar = require_Scalar();
  var boolTag = {
    identify: (value) => typeof value === "boolean",
    default: true,
    tag: "tag:yaml.org,2002:bool",
    test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
    resolve: (str) => new Scalar.Scalar(str[0] === "t" || str[0] === "T"),
    stringify({ source, value }, ctx) {
      if (source && boolTag.test.test(source)) {
        const sv = source[0] === "t" || source[0] === "T";
        if (value === sv)
          return source;
      }
      return value ? ctx.options.trueStr : ctx.options.falseStr;
    }
  };
  exports.boolTag = boolTag;
});

// node_modules/yaml/dist/stringify/stringifyNumber.js
var require_stringifyNumber = __commonJS((exports) => {
  function stringifyNumber({ format, minFractionDigits, tag, value }) {
    if (typeof value === "bigint")
      return String(value);
    const num = typeof value === "number" ? value : Number(value);
    if (!isFinite(num))
      return isNaN(num) ? ".nan" : num < 0 ? "-.inf" : ".inf";
    let n = Object.is(value, -0) ? "-0" : JSON.stringify(value);
    if (!format && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^\d/.test(n)) {
      let i = n.indexOf(".");
      if (i < 0) {
        i = n.length;
        n += ".";
      }
      let d = minFractionDigits - (n.length - i - 1);
      while (d-- > 0)
        n += "0";
    }
    return n;
  }
  exports.stringifyNumber = stringifyNumber;
});

// node_modules/yaml/dist/schema/core/float.js
var require_float = __commonJS((exports) => {
  var Scalar = require_Scalar();
  var stringifyNumber = require_stringifyNumber();
  var floatNaN = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
    resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
    stringify: stringifyNumber.stringifyNumber
  };
  var floatExp = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    format: "EXP",
    test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
    resolve: (str) => parseFloat(str),
    stringify(node) {
      const num = Number(node.value);
      return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
    }
  };
  var float = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
    resolve(str) {
      const node = new Scalar.Scalar(parseFloat(str));
      const dot = str.indexOf(".");
      if (dot !== -1 && str[str.length - 1] === "0")
        node.minFractionDigits = str.length - dot - 1;
      return node;
    },
    stringify: stringifyNumber.stringifyNumber
  };
  exports.float = float;
  exports.floatExp = floatExp;
  exports.floatNaN = floatNaN;
});

// node_modules/yaml/dist/schema/core/int.js
var require_int = __commonJS((exports) => {
  var stringifyNumber = require_stringifyNumber();
  var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
  var intResolve = (str, offset, radix, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str.substring(offset), radix);
  function intStringify(node, radix, prefix) {
    const { value } = node;
    if (intIdentify(value) && value >= 0)
      return prefix + value.toString(radix);
    return stringifyNumber.stringifyNumber(node);
  }
  var intOct = {
    identify: (value) => intIdentify(value) && value >= 0,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "OCT",
    test: /^0o[0-7]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 8, opt),
    stringify: (node) => intStringify(node, 8, "0o")
  };
  var int = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    test: /^[-+]?[0-9]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
    stringify: stringifyNumber.stringifyNumber
  };
  var intHex = {
    identify: (value) => intIdentify(value) && value >= 0,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "HEX",
    test: /^0x[0-9a-fA-F]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
    stringify: (node) => intStringify(node, 16, "0x")
  };
  exports.int = int;
  exports.intHex = intHex;
  exports.intOct = intOct;
});

// node_modules/yaml/dist/schema/core/schema.js
var require_schema = __commonJS((exports) => {
  var map = require_map();
  var _null = require_null();
  var seq = require_seq();
  var string = require_string();
  var bool = require_bool();
  var float = require_float();
  var int = require_int();
  var schema = [
    map.map,
    seq.seq,
    string.string,
    _null.nullTag,
    bool.boolTag,
    int.intOct,
    int.int,
    int.intHex,
    float.floatNaN,
    float.floatExp,
    float.float
  ];
  exports.schema = schema;
});

// node_modules/yaml/dist/schema/json/schema.js
var require_schema2 = __commonJS((exports) => {
  var Scalar = require_Scalar();
  var map = require_map();
  var seq = require_seq();
  function intIdentify(value) {
    return typeof value === "bigint" || Number.isInteger(value);
  }
  var stringifyJSON = ({ value }) => JSON.stringify(value);
  var jsonScalars = [
    {
      identify: (value) => typeof value === "string",
      default: true,
      tag: "tag:yaml.org,2002:str",
      resolve: (str) => str,
      stringify: stringifyJSON
    },
    {
      identify: (value) => value == null,
      createNode: () => new Scalar.Scalar(null),
      default: true,
      tag: "tag:yaml.org,2002:null",
      test: /^null$/,
      resolve: () => null,
      stringify: stringifyJSON
    },
    {
      identify: (value) => typeof value === "boolean",
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^true$|^false$/,
      resolve: (str) => str === "true",
      stringify: stringifyJSON
    },
    {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^-?(?:0|[1-9][0-9]*)$/,
      resolve: (str, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str, 10),
      stringify: ({ value }) => intIdentify(value) ? value.toString() : JSON.stringify(value)
    },
    {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
      resolve: (str) => parseFloat(str),
      stringify: stringifyJSON
    }
  ];
  var jsonError = {
    default: true,
    tag: "",
    test: /^/,
    resolve(str, onError) {
      onError(`Unresolved plain scalar ${JSON.stringify(str)}`);
      return str;
    }
  };
  var schema = [map.map, seq.seq].concat(jsonScalars, jsonError);
  exports.schema = schema;
});

// node_modules/yaml/dist/schema/yaml-1.1/binary.js
var require_binary = __commonJS((exports) => {
  var node_buffer = __require("buffer");
  var Scalar = require_Scalar();
  var stringifyString = require_stringifyString();
  var binary = {
    identify: (value) => value instanceof Uint8Array,
    default: false,
    tag: "tag:yaml.org,2002:binary",
    resolve(src, onError) {
      if (typeof node_buffer.Buffer === "function") {
        return node_buffer.Buffer.from(src, "base64");
      } else if (typeof atob === "function") {
        const str = atob(src.replace(/[\n\r]/g, ""));
        const buffer = new Uint8Array(str.length);
        for (let i = 0;i < str.length; ++i)
          buffer[i] = str.charCodeAt(i);
        return buffer;
      } else {
        onError("This environment does not support reading binary tags; either Buffer or atob is required");
        return src;
      }
    },
    stringify({ comment, type, value }, ctx, onComment, onChompKeep) {
      if (!value)
        return "";
      const buf = value;
      let str;
      if (typeof node_buffer.Buffer === "function") {
        str = buf instanceof node_buffer.Buffer ? buf.toString("base64") : node_buffer.Buffer.from(buf.buffer).toString("base64");
      } else if (typeof btoa === "function") {
        let s = "";
        for (let i = 0;i < buf.length; ++i)
          s += String.fromCharCode(buf[i]);
        str = btoa(s);
      } else {
        throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
      }
      type ?? (type = Scalar.Scalar.BLOCK_LITERAL);
      if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
        const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
        const n = Math.ceil(str.length / lineWidth);
        const lines = new Array(n);
        for (let i = 0, o = 0;i < n; ++i, o += lineWidth) {
          lines[i] = str.substr(o, lineWidth);
        }
        str = lines.join(type === Scalar.Scalar.BLOCK_LITERAL ? `
` : " ");
      }
      return stringifyString.stringifyString({ comment, type, value: str }, ctx, onComment, onChompKeep);
    }
  };
  exports.binary = binary;
});

// node_modules/yaml/dist/schema/yaml-1.1/pairs.js
var require_pairs = __commonJS((exports) => {
  var identity = require_identity();
  var Pair = require_Pair();
  var Scalar = require_Scalar();
  var YAMLSeq = require_YAMLSeq();
  function resolvePairs(seq, onError) {
    if (identity.isSeq(seq)) {
      for (let i = 0;i < seq.items.length; ++i) {
        let item = seq.items[i];
        if (identity.isPair(item))
          continue;
        else if (identity.isMap(item)) {
          if (item.items.length > 1)
            onError("Each pair must have its own sequence indicator");
          const pair = item.items[0] || new Pair.Pair(new Scalar.Scalar(null));
          if (item.commentBefore)
            pair.key.commentBefore = pair.key.commentBefore ? `${item.commentBefore}
${pair.key.commentBefore}` : item.commentBefore;
          if (item.comment) {
            const cn = pair.value ?? pair.key;
            cn.comment = cn.comment ? `${item.comment}
${cn.comment}` : item.comment;
          }
          item = pair;
        }
        seq.items[i] = identity.isPair(item) ? item : new Pair.Pair(item);
      }
    } else
      onError("Expected a sequence for this tag");
    return seq;
  }
  function createPairs(schema, iterable, ctx) {
    const { replacer } = ctx;
    const pairs2 = new YAMLSeq.YAMLSeq(schema);
    pairs2.tag = "tag:yaml.org,2002:pairs";
    let i = 0;
    if (iterable && Symbol.iterator in Object(iterable))
      for (let it of iterable) {
        if (typeof replacer === "function")
          it = replacer.call(iterable, String(i++), it);
        let key, value;
        if (Array.isArray(it)) {
          if (it.length === 2) {
            key = it[0];
            value = it[1];
          } else
            throw new TypeError(`Expected [key, value] tuple: ${it}`);
        } else if (it && it instanceof Object) {
          const keys = Object.keys(it);
          if (keys.length === 1) {
            key = keys[0];
            value = it[key];
          } else {
            throw new TypeError(`Expected tuple with one key, not ${keys.length} keys`);
          }
        } else {
          key = it;
        }
        pairs2.items.push(Pair.createPair(key, value, ctx));
      }
    return pairs2;
  }
  var pairs = {
    collection: "seq",
    default: false,
    tag: "tag:yaml.org,2002:pairs",
    resolve: resolvePairs,
    createNode: createPairs
  };
  exports.createPairs = createPairs;
  exports.pairs = pairs;
  exports.resolvePairs = resolvePairs;
});

// node_modules/yaml/dist/schema/yaml-1.1/omap.js
var require_omap = __commonJS((exports) => {
  var identity = require_identity();
  var toJS = require_toJS();
  var YAMLMap = require_YAMLMap();
  var YAMLSeq = require_YAMLSeq();
  var pairs = require_pairs();

  class YAMLOMap extends YAMLSeq.YAMLSeq {
    constructor() {
      super();
      this.add = YAMLMap.YAMLMap.prototype.add.bind(this);
      this.delete = YAMLMap.YAMLMap.prototype.delete.bind(this);
      this.get = YAMLMap.YAMLMap.prototype.get.bind(this);
      this.has = YAMLMap.YAMLMap.prototype.has.bind(this);
      this.set = YAMLMap.YAMLMap.prototype.set.bind(this);
      this.tag = YAMLOMap.tag;
    }
    toJSON(_, ctx) {
      if (!ctx)
        return super.toJSON(_);
      const map = new Map;
      if (ctx?.onCreate)
        ctx.onCreate(map);
      for (const pair of this.items) {
        let key, value;
        if (identity.isPair(pair)) {
          key = toJS.toJS(pair.key, "", ctx);
          value = toJS.toJS(pair.value, key, ctx);
        } else {
          key = toJS.toJS(pair, "", ctx);
        }
        if (map.has(key))
          throw new Error("Ordered maps must not include duplicate keys");
        map.set(key, value);
      }
      return map;
    }
    static from(schema, iterable, ctx) {
      const pairs$1 = pairs.createPairs(schema, iterable, ctx);
      const omap2 = new this;
      omap2.items = pairs$1.items;
      return omap2;
    }
  }
  YAMLOMap.tag = "tag:yaml.org,2002:omap";
  var omap = {
    collection: "seq",
    identify: (value) => value instanceof Map,
    nodeClass: YAMLOMap,
    default: false,
    tag: "tag:yaml.org,2002:omap",
    resolve(seq, onError) {
      const pairs$1 = pairs.resolvePairs(seq, onError);
      const seenKeys = [];
      for (const { key } of pairs$1.items) {
        if (identity.isScalar(key)) {
          if (seenKeys.includes(key.value)) {
            onError(`Ordered maps must not include duplicate keys: ${key.value}`);
          } else {
            seenKeys.push(key.value);
          }
        }
      }
      return Object.assign(new YAMLOMap, pairs$1);
    },
    createNode: (schema, iterable, ctx) => YAMLOMap.from(schema, iterable, ctx)
  };
  exports.YAMLOMap = YAMLOMap;
  exports.omap = omap;
});

// node_modules/yaml/dist/schema/yaml-1.1/bool.js
var require_bool2 = __commonJS((exports) => {
  var Scalar = require_Scalar();
  function boolStringify({ value, source }, ctx) {
    const boolObj = value ? trueTag : falseTag;
    if (source && boolObj.test.test(source))
      return source;
    return value ? ctx.options.trueStr : ctx.options.falseStr;
  }
  var trueTag = {
    identify: (value) => value === true,
    default: true,
    tag: "tag:yaml.org,2002:bool",
    test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
    resolve: () => new Scalar.Scalar(true),
    stringify: boolStringify
  };
  var falseTag = {
    identify: (value) => value === false,
    default: true,
    tag: "tag:yaml.org,2002:bool",
    test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
    resolve: () => new Scalar.Scalar(false),
    stringify: boolStringify
  };
  exports.falseTag = falseTag;
  exports.trueTag = trueTag;
});

// node_modules/yaml/dist/schema/yaml-1.1/float.js
var require_float2 = __commonJS((exports) => {
  var Scalar = require_Scalar();
  var stringifyNumber = require_stringifyNumber();
  var floatNaN = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
    resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
    stringify: stringifyNumber.stringifyNumber
  };
  var floatExp = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    format: "EXP",
    test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
    resolve: (str) => parseFloat(str.replace(/_/g, "")),
    stringify(node) {
      const num = Number(node.value);
      return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
    }
  };
  var float = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
    resolve(str) {
      const node = new Scalar.Scalar(parseFloat(str.replace(/_/g, "")));
      const dot = str.indexOf(".");
      if (dot !== -1) {
        const f = str.substring(dot + 1).replace(/_/g, "");
        if (f[f.length - 1] === "0")
          node.minFractionDigits = f.length;
      }
      return node;
    },
    stringify: stringifyNumber.stringifyNumber
  };
  exports.float = float;
  exports.floatExp = floatExp;
  exports.floatNaN = floatNaN;
});

// node_modules/yaml/dist/schema/yaml-1.1/int.js
var require_int2 = __commonJS((exports) => {
  var stringifyNumber = require_stringifyNumber();
  var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
  function intResolve(str, offset, radix, { intAsBigInt }) {
    const sign = str[0];
    if (sign === "-" || sign === "+")
      offset += 1;
    str = str.substring(offset).replace(/_/g, "");
    if (intAsBigInt) {
      switch (radix) {
        case 2:
          str = `0b${str}`;
          break;
        case 8:
          str = `0o${str}`;
          break;
        case 16:
          str = `0x${str}`;
          break;
      }
      const n2 = BigInt(str);
      return sign === "-" ? BigInt(-1) * n2 : n2;
    }
    const n = parseInt(str, radix);
    return sign === "-" ? -1 * n : n;
  }
  function intStringify(node, radix, prefix) {
    const { value } = node;
    if (intIdentify(value)) {
      const str = value.toString(radix);
      return value < 0 ? "-" + prefix + str.substr(1) : prefix + str;
    }
    return stringifyNumber.stringifyNumber(node);
  }
  var intBin = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "BIN",
    test: /^[-+]?0b[0-1_]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 2, opt),
    stringify: (node) => intStringify(node, 2, "0b")
  };
  var intOct = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "OCT",
    test: /^[-+]?0[0-7_]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 1, 8, opt),
    stringify: (node) => intStringify(node, 8, "0")
  };
  var int = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    test: /^[-+]?[0-9][0-9_]*$/,
    resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
    stringify: stringifyNumber.stringifyNumber
  };
  var intHex = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "HEX",
    test: /^[-+]?0x[0-9a-fA-F_]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
    stringify: (node) => intStringify(node, 16, "0x")
  };
  exports.int = int;
  exports.intBin = intBin;
  exports.intHex = intHex;
  exports.intOct = intOct;
});

// node_modules/yaml/dist/schema/yaml-1.1/set.js
var require_set = __commonJS((exports) => {
  var identity = require_identity();
  var Pair = require_Pair();
  var YAMLMap = require_YAMLMap();

  class YAMLSet extends YAMLMap.YAMLMap {
    constructor(schema) {
      super(schema);
      this.tag = YAMLSet.tag;
    }
    add(key) {
      let pair;
      if (identity.isPair(key))
        pair = key;
      else if (key && typeof key === "object" && "key" in key && "value" in key && key.value === null)
        pair = new Pair.Pair(key.key, null);
      else
        pair = new Pair.Pair(key, null);
      const prev = YAMLMap.findPair(this.items, pair.key);
      if (!prev)
        this.items.push(pair);
    }
    get(key, keepPair) {
      const pair = YAMLMap.findPair(this.items, key);
      return !keepPair && identity.isPair(pair) ? identity.isScalar(pair.key) ? pair.key.value : pair.key : pair;
    }
    set(key, value) {
      if (typeof value !== "boolean")
        throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
      const prev = YAMLMap.findPair(this.items, key);
      if (prev && !value) {
        this.items.splice(this.items.indexOf(prev), 1);
      } else if (!prev && value) {
        this.items.push(new Pair.Pair(key));
      }
    }
    toJSON(_, ctx) {
      return super.toJSON(_, ctx, Set);
    }
    toString(ctx, onComment, onChompKeep) {
      if (!ctx)
        return JSON.stringify(this);
      if (this.hasAllNullValues(true))
        return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
      else
        throw new Error("Set items must all have null values");
    }
    static from(schema, iterable, ctx) {
      const { replacer } = ctx;
      const set2 = new this(schema);
      if (iterable && Symbol.iterator in Object(iterable))
        for (let value of iterable) {
          if (typeof replacer === "function")
            value = replacer.call(iterable, value, value);
          set2.items.push(Pair.createPair(value, null, ctx));
        }
      return set2;
    }
  }
  YAMLSet.tag = "tag:yaml.org,2002:set";
  var set = {
    collection: "map",
    identify: (value) => value instanceof Set,
    nodeClass: YAMLSet,
    default: false,
    tag: "tag:yaml.org,2002:set",
    createNode: (schema, iterable, ctx) => YAMLSet.from(schema, iterable, ctx),
    resolve(map, onError) {
      if (identity.isMap(map)) {
        if (map.hasAllNullValues(true))
          return Object.assign(new YAMLSet, map);
        else
          onError("Set items must all have null values");
      } else
        onError("Expected a mapping for this tag");
      return map;
    }
  };
  exports.YAMLSet = YAMLSet;
  exports.set = set;
});

// node_modules/yaml/dist/schema/yaml-1.1/timestamp.js
var require_timestamp = __commonJS((exports) => {
  var stringifyNumber = require_stringifyNumber();
  function parseSexagesimal(str, asBigInt) {
    const sign = str[0];
    const parts = sign === "-" || sign === "+" ? str.substring(1) : str;
    const num = (n) => asBigInt ? BigInt(n) : Number(n);
    const res = parts.replace(/_/g, "").split(":").reduce((res2, p) => res2 * num(60) + num(p), num(0));
    return sign === "-" ? num(-1) * res : res;
  }
  function stringifySexagesimal(node) {
    let { value } = node;
    let num = (n) => n;
    if (typeof value === "bigint")
      num = (n) => BigInt(n);
    else if (isNaN(value) || !isFinite(value))
      return stringifyNumber.stringifyNumber(node);
    let sign = "";
    if (value < 0) {
      sign = "-";
      value *= num(-1);
    }
    const _60 = num(60);
    const parts = [value % _60];
    if (value < 60) {
      parts.unshift(0);
    } else {
      value = (value - parts[0]) / _60;
      parts.unshift(value % _60);
      if (value >= 60) {
        value = (value - parts[0]) / _60;
        parts.unshift(value);
      }
    }
    return sign + parts.map((n) => String(n).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
  }
  var intTime = {
    identify: (value) => typeof value === "bigint" || Number.isInteger(value),
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "TIME",
    test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
    resolve: (str, _onError, { intAsBigInt }) => parseSexagesimal(str, intAsBigInt),
    stringify: stringifySexagesimal
  };
  var floatTime = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    format: "TIME",
    test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
    resolve: (str) => parseSexagesimal(str, false),
    stringify: stringifySexagesimal
  };
  var timestamp = {
    identify: (value) => value instanceof Date,
    default: true,
    tag: "tag:yaml.org,2002:timestamp",
    test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})" + "(?:" + "(?:t|T|[ \\t]+)" + "([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)" + "(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?" + ")?$"),
    resolve(str) {
      const match = str.match(timestamp.test);
      if (!match)
        throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
      const [, year, month, day, hour, minute, second] = match.map(Number);
      const millisec = match[7] ? Number((match[7] + "00").substr(1, 3)) : 0;
      let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
      const tz = match[8];
      if (tz && tz !== "Z") {
        let d = parseSexagesimal(tz, false);
        if (Math.abs(d) < 30)
          d *= 60;
        date -= 60000 * d;
      }
      return new Date(date);
    },
    stringify: ({ value }) => value?.toISOString().replace(/(T00:00:00)?\.000Z$/, "") ?? ""
  };
  exports.floatTime = floatTime;
  exports.intTime = intTime;
  exports.timestamp = timestamp;
});

// node_modules/yaml/dist/schema/yaml-1.1/schema.js
var require_schema3 = __commonJS((exports) => {
  var map = require_map();
  var _null = require_null();
  var seq = require_seq();
  var string = require_string();
  var binary = require_binary();
  var bool = require_bool2();
  var float = require_float2();
  var int = require_int2();
  var merge = require_merge();
  var omap = require_omap();
  var pairs = require_pairs();
  var set = require_set();
  var timestamp = require_timestamp();
  var schema = [
    map.map,
    seq.seq,
    string.string,
    _null.nullTag,
    bool.trueTag,
    bool.falseTag,
    int.intBin,
    int.intOct,
    int.int,
    int.intHex,
    float.floatNaN,
    float.floatExp,
    float.float,
    binary.binary,
    merge.merge,
    omap.omap,
    pairs.pairs,
    set.set,
    timestamp.intTime,
    timestamp.floatTime,
    timestamp.timestamp
  ];
  exports.schema = schema;
});

// node_modules/yaml/dist/schema/tags.js
var require_tags = __commonJS((exports) => {
  var map = require_map();
  var _null = require_null();
  var seq = require_seq();
  var string = require_string();
  var bool = require_bool();
  var float = require_float();
  var int = require_int();
  var schema = require_schema();
  var schema$1 = require_schema2();
  var binary = require_binary();
  var merge = require_merge();
  var omap = require_omap();
  var pairs = require_pairs();
  var schema$2 = require_schema3();
  var set = require_set();
  var timestamp = require_timestamp();
  var schemas = new Map([
    ["core", schema.schema],
    ["failsafe", [map.map, seq.seq, string.string]],
    ["json", schema$1.schema],
    ["yaml11", schema$2.schema],
    ["yaml-1.1", schema$2.schema]
  ]);
  var tagsByName = {
    binary: binary.binary,
    bool: bool.boolTag,
    float: float.float,
    floatExp: float.floatExp,
    floatNaN: float.floatNaN,
    floatTime: timestamp.floatTime,
    int: int.int,
    intHex: int.intHex,
    intOct: int.intOct,
    intTime: timestamp.intTime,
    map: map.map,
    merge: merge.merge,
    null: _null.nullTag,
    omap: omap.omap,
    pairs: pairs.pairs,
    seq: seq.seq,
    set: set.set,
    timestamp: timestamp.timestamp
  };
  var coreKnownTags = {
    "tag:yaml.org,2002:binary": binary.binary,
    "tag:yaml.org,2002:merge": merge.merge,
    "tag:yaml.org,2002:omap": omap.omap,
    "tag:yaml.org,2002:pairs": pairs.pairs,
    "tag:yaml.org,2002:set": set.set,
    "tag:yaml.org,2002:timestamp": timestamp.timestamp
  };
  function getTags(customTags, schemaName, addMergeTag) {
    const schemaTags = schemas.get(schemaName);
    if (schemaTags && !customTags) {
      return addMergeTag && !schemaTags.includes(merge.merge) ? schemaTags.concat(merge.merge) : schemaTags.slice();
    }
    let tags = schemaTags;
    if (!tags) {
      if (Array.isArray(customTags))
        tags = [];
      else {
        const keys = Array.from(schemas.keys()).filter((key) => key !== "yaml11").map((key) => JSON.stringify(key)).join(", ");
        throw new Error(`Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`);
      }
    }
    if (Array.isArray(customTags)) {
      for (const tag of customTags)
        tags = tags.concat(tag);
    } else if (typeof customTags === "function") {
      tags = customTags(tags.slice());
    }
    if (addMergeTag)
      tags = tags.concat(merge.merge);
    return tags.reduce((tags2, tag) => {
      const tagObj = typeof tag === "string" ? tagsByName[tag] : tag;
      if (!tagObj) {
        const tagName = JSON.stringify(tag);
        const keys = Object.keys(tagsByName).map((key) => JSON.stringify(key)).join(", ");
        throw new Error(`Unknown custom tag ${tagName}; use one of ${keys}`);
      }
      if (!tags2.includes(tagObj))
        tags2.push(tagObj);
      return tags2;
    }, []);
  }
  exports.coreKnownTags = coreKnownTags;
  exports.getTags = getTags;
});

// node_modules/yaml/dist/schema/Schema.js
var require_Schema = __commonJS((exports) => {
  var identity = require_identity();
  var map = require_map();
  var seq = require_seq();
  var string = require_string();
  var tags = require_tags();
  var sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;

  class Schema {
    constructor({ compat, customTags, merge, resolveKnownTags, schema, sortMapEntries, toStringDefaults }) {
      this.compat = Array.isArray(compat) ? tags.getTags(compat, "compat") : compat ? tags.getTags(null, compat) : null;
      this.name = typeof schema === "string" && schema || "core";
      this.knownTags = resolveKnownTags ? tags.coreKnownTags : {};
      this.tags = tags.getTags(customTags, this.name, merge);
      this.toStringOptions = toStringDefaults ?? null;
      Object.defineProperty(this, identity.MAP, { value: map.map });
      Object.defineProperty(this, identity.SCALAR, { value: string.string });
      Object.defineProperty(this, identity.SEQ, { value: seq.seq });
      this.sortMapEntries = typeof sortMapEntries === "function" ? sortMapEntries : sortMapEntries === true ? sortMapEntriesByKey : null;
    }
    clone() {
      const copy = Object.create(Schema.prototype, Object.getOwnPropertyDescriptors(this));
      copy.tags = this.tags.slice();
      return copy;
    }
  }
  exports.Schema = Schema;
});

// node_modules/yaml/dist/stringify/stringifyDocument.js
var require_stringifyDocument = __commonJS((exports) => {
  var identity = require_identity();
  var stringify = require_stringify();
  var stringifyComment = require_stringifyComment();
  function stringifyDocument(doc, options) {
    const lines = [];
    let hasDirectives = options.directives === true;
    if (options.directives !== false && doc.directives) {
      const dir = doc.directives.toString(doc);
      if (dir) {
        lines.push(dir);
        hasDirectives = true;
      } else if (doc.directives.docStart)
        hasDirectives = true;
    }
    if (hasDirectives)
      lines.push("---");
    const ctx = stringify.createStringifyContext(doc, options);
    const { commentString } = ctx.options;
    if (doc.commentBefore) {
      if (lines.length !== 1)
        lines.unshift("");
      const cs = commentString(doc.commentBefore);
      lines.unshift(stringifyComment.indentComment(cs, ""));
    }
    let chompKeep = false;
    let contentComment = null;
    if (doc.contents) {
      if (identity.isNode(doc.contents)) {
        if (doc.contents.spaceBefore && hasDirectives)
          lines.push("");
        if (doc.contents.commentBefore) {
          const cs = commentString(doc.contents.commentBefore);
          lines.push(stringifyComment.indentComment(cs, ""));
        }
        ctx.forceBlockIndent = !!doc.comment;
        contentComment = doc.contents.comment;
      }
      const onChompKeep = contentComment ? undefined : () => chompKeep = true;
      let body = stringify.stringify(doc.contents, ctx, () => contentComment = null, onChompKeep);
      if (contentComment)
        body += stringifyComment.lineComment(body, "", commentString(contentComment));
      if ((body[0] === "|" || body[0] === ">") && lines[lines.length - 1] === "---") {
        lines[lines.length - 1] = `--- ${body}`;
      } else
        lines.push(body);
    } else {
      lines.push(stringify.stringify(doc.contents, ctx));
    }
    if (doc.directives?.docEnd) {
      if (doc.comment) {
        const cs = commentString(doc.comment);
        if (cs.includes(`
`)) {
          lines.push("...");
          lines.push(stringifyComment.indentComment(cs, ""));
        } else {
          lines.push(`... ${cs}`);
        }
      } else {
        lines.push("...");
      }
    } else {
      let dc = doc.comment;
      if (dc && chompKeep)
        dc = dc.replace(/^\n+/, "");
      if (dc) {
        if ((!chompKeep || contentComment) && lines[lines.length - 1] !== "")
          lines.push("");
        lines.push(stringifyComment.indentComment(commentString(dc), ""));
      }
    }
    return lines.join(`
`) + `
`;
  }
  exports.stringifyDocument = stringifyDocument;
});

// node_modules/yaml/dist/doc/Document.js
var require_Document = __commonJS((exports) => {
  var Alias = require_Alias();
  var Collection = require_Collection();
  var identity = require_identity();
  var Pair = require_Pair();
  var toJS = require_toJS();
  var Schema = require_Schema();
  var stringifyDocument = require_stringifyDocument();
  var anchors = require_anchors();
  var applyReviver = require_applyReviver();
  var createNode = require_createNode();
  var directives = require_directives();

  class Document {
    constructor(value, replacer, options) {
      this.commentBefore = null;
      this.comment = null;
      this.errors = [];
      this.warnings = [];
      Object.defineProperty(this, identity.NODE_TYPE, { value: identity.DOC });
      let _replacer = null;
      if (typeof replacer === "function" || Array.isArray(replacer)) {
        _replacer = replacer;
      } else if (options === undefined && replacer) {
        options = replacer;
        replacer = undefined;
      }
      const opt = Object.assign({
        intAsBigInt: false,
        keepSourceTokens: false,
        logLevel: "warn",
        prettyErrors: true,
        strict: true,
        stringKeys: false,
        uniqueKeys: true,
        version: "1.2"
      }, options);
      this.options = opt;
      let { version } = opt;
      if (options?._directives) {
        this.directives = options._directives.atDocument();
        if (this.directives.yaml.explicit)
          version = this.directives.yaml.version;
      } else
        this.directives = new directives.Directives({ version });
      this.setSchema(version, options);
      this.contents = value === undefined ? null : this.createNode(value, _replacer, options);
    }
    clone() {
      const copy = Object.create(Document.prototype, {
        [identity.NODE_TYPE]: { value: identity.DOC }
      });
      copy.commentBefore = this.commentBefore;
      copy.comment = this.comment;
      copy.errors = this.errors.slice();
      copy.warnings = this.warnings.slice();
      copy.options = Object.assign({}, this.options);
      if (this.directives)
        copy.directives = this.directives.clone();
      copy.schema = this.schema.clone();
      copy.contents = identity.isNode(this.contents) ? this.contents.clone(copy.schema) : this.contents;
      if (this.range)
        copy.range = this.range.slice();
      return copy;
    }
    add(value) {
      if (assertCollection(this.contents))
        this.contents.add(value);
    }
    addIn(path, value) {
      if (assertCollection(this.contents))
        this.contents.addIn(path, value);
    }
    createAlias(node, name) {
      if (!node.anchor) {
        const prev = anchors.anchorNames(this);
        node.anchor = !name || prev.has(name) ? anchors.findNewAnchor(name || "a", prev) : name;
      }
      return new Alias.Alias(node.anchor);
    }
    createNode(value, replacer, options) {
      let _replacer = undefined;
      if (typeof replacer === "function") {
        value = replacer.call({ "": value }, "", value);
        _replacer = replacer;
      } else if (Array.isArray(replacer)) {
        const keyToStr = (v) => typeof v === "number" || v instanceof String || v instanceof Number;
        const asStr = replacer.filter(keyToStr).map(String);
        if (asStr.length > 0)
          replacer = replacer.concat(asStr);
        _replacer = replacer;
      } else if (options === undefined && replacer) {
        options = replacer;
        replacer = undefined;
      }
      const { aliasDuplicateObjects, anchorPrefix, flow, keepUndefined, onTagObj, tag } = options ?? {};
      const { onAnchor, setAnchors, sourceObjects } = anchors.createNodeAnchors(this, anchorPrefix || "a");
      const ctx = {
        aliasDuplicateObjects: aliasDuplicateObjects ?? true,
        keepUndefined: keepUndefined ?? false,
        onAnchor,
        onTagObj,
        replacer: _replacer,
        schema: this.schema,
        sourceObjects
      };
      const node = createNode.createNode(value, tag, ctx);
      if (flow && identity.isCollection(node))
        node.flow = true;
      setAnchors();
      return node;
    }
    createPair(key, value, options = {}) {
      const k = this.createNode(key, null, options);
      const v = this.createNode(value, null, options);
      return new Pair.Pair(k, v);
    }
    delete(key) {
      return assertCollection(this.contents) ? this.contents.delete(key) : false;
    }
    deleteIn(path) {
      if (Collection.isEmptyPath(path)) {
        if (this.contents == null)
          return false;
        this.contents = null;
        return true;
      }
      return assertCollection(this.contents) ? this.contents.deleteIn(path) : false;
    }
    get(key, keepScalar) {
      return identity.isCollection(this.contents) ? this.contents.get(key, keepScalar) : undefined;
    }
    getIn(path, keepScalar) {
      if (Collection.isEmptyPath(path))
        return !keepScalar && identity.isScalar(this.contents) ? this.contents.value : this.contents;
      return identity.isCollection(this.contents) ? this.contents.getIn(path, keepScalar) : undefined;
    }
    has(key) {
      return identity.isCollection(this.contents) ? this.contents.has(key) : false;
    }
    hasIn(path) {
      if (Collection.isEmptyPath(path))
        return this.contents !== undefined;
      return identity.isCollection(this.contents) ? this.contents.hasIn(path) : false;
    }
    set(key, value) {
      if (this.contents == null) {
        this.contents = Collection.collectionFromPath(this.schema, [key], value);
      } else if (assertCollection(this.contents)) {
        this.contents.set(key, value);
      }
    }
    setIn(path, value) {
      if (Collection.isEmptyPath(path)) {
        this.contents = value;
      } else if (this.contents == null) {
        this.contents = Collection.collectionFromPath(this.schema, Array.from(path), value);
      } else if (assertCollection(this.contents)) {
        this.contents.setIn(path, value);
      }
    }
    setSchema(version, options = {}) {
      if (typeof version === "number")
        version = String(version);
      let opt;
      switch (version) {
        case "1.1":
          if (this.directives)
            this.directives.yaml.version = "1.1";
          else
            this.directives = new directives.Directives({ version: "1.1" });
          opt = { resolveKnownTags: false, schema: "yaml-1.1" };
          break;
        case "1.2":
        case "next":
          if (this.directives)
            this.directives.yaml.version = version;
          else
            this.directives = new directives.Directives({ version });
          opt = { resolveKnownTags: true, schema: "core" };
          break;
        case null:
          if (this.directives)
            delete this.directives;
          opt = null;
          break;
        default: {
          const sv = JSON.stringify(version);
          throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
        }
      }
      if (options.schema instanceof Object)
        this.schema = options.schema;
      else if (opt)
        this.schema = new Schema.Schema(Object.assign(opt, options));
      else
        throw new Error(`With a null YAML version, the { schema: Schema } option is required`);
    }
    toJS({ json, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
      const ctx = {
        anchors: new Map,
        doc: this,
        keep: !json,
        mapAsMap: mapAsMap === true,
        mapKeyWarned: false,
        maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
      };
      const res = toJS.toJS(this.contents, jsonArg ?? "", ctx);
      if (typeof onAnchor === "function")
        for (const { count, res: res2 } of ctx.anchors.values())
          onAnchor(res2, count);
      return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
    }
    toJSON(jsonArg, onAnchor) {
      return this.toJS({ json: true, jsonArg, mapAsMap: false, onAnchor });
    }
    toString(options = {}) {
      if (this.errors.length > 0)
        throw new Error("Document with errors cannot be stringified");
      if ("indent" in options && (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
        const s = JSON.stringify(options.indent);
        throw new Error(`"indent" option must be a positive integer, not ${s}`);
      }
      return stringifyDocument.stringifyDocument(this, options);
    }
  }
  function assertCollection(contents) {
    if (identity.isCollection(contents))
      return true;
    throw new Error("Expected a YAML collection as document contents");
  }
  exports.Document = Document;
});

// node_modules/yaml/dist/errors.js
var require_errors = __commonJS((exports) => {
  class YAMLError extends Error {
    constructor(name, pos, code, message) {
      super();
      this.name = name;
      this.code = code;
      this.message = message;
      this.pos = pos;
    }
  }

  class YAMLParseError extends YAMLError {
    constructor(pos, code, message) {
      super("YAMLParseError", pos, code, message);
    }
  }

  class YAMLWarning extends YAMLError {
    constructor(pos, code, message) {
      super("YAMLWarning", pos, code, message);
    }
  }
  var prettifyError = (src, lc) => (error) => {
    if (error.pos[0] === -1)
      return;
    error.linePos = error.pos.map((pos) => lc.linePos(pos));
    const { line, col } = error.linePos[0];
    error.message += ` at line ${line}, column ${col}`;
    let ci = col - 1;
    let lineStr = src.substring(lc.lineStarts[line - 1], lc.lineStarts[line]).replace(/[\n\r]+$/, "");
    if (ci >= 60 && lineStr.length > 80) {
      const trimStart = Math.min(ci - 39, lineStr.length - 79);
      lineStr = "…" + lineStr.substring(trimStart);
      ci -= trimStart - 1;
    }
    if (lineStr.length > 80)
      lineStr = lineStr.substring(0, 79) + "…";
    if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
      let prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
      if (prev.length > 80)
        prev = prev.substring(0, 79) + `…
`;
      lineStr = prev + lineStr;
    }
    if (/[^ ]/.test(lineStr)) {
      let count = 1;
      const end = error.linePos[1];
      if (end?.line === line && end.col > col) {
        count = Math.max(1, Math.min(end.col - col, 80 - ci));
      }
      const pointer = " ".repeat(ci) + "^".repeat(count);
      error.message += `:

${lineStr}
${pointer}
`;
    }
  };
  exports.YAMLError = YAMLError;
  exports.YAMLParseError = YAMLParseError;
  exports.YAMLWarning = YAMLWarning;
  exports.prettifyError = prettifyError;
});

// node_modules/yaml/dist/compose/resolve-props.js
var require_resolve_props = __commonJS((exports) => {
  function resolveProps(tokens, { flow, indicator, next, offset, onError, parentIndent, startOnNewline }) {
    let spaceBefore = false;
    let atNewline = startOnNewline;
    let hasSpace = startOnNewline;
    let comment = "";
    let commentSep = "";
    let hasNewline = false;
    let reqSpace = false;
    let tab = null;
    let anchor = null;
    let tag = null;
    let newlineAfterProp = null;
    let comma = null;
    let found = null;
    let start = null;
    for (const token of tokens) {
      if (reqSpace) {
        if (token.type !== "space" && token.type !== "newline" && token.type !== "comma")
          onError(token.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
        reqSpace = false;
      }
      if (tab) {
        if (atNewline && token.type !== "comment" && token.type !== "newline") {
          onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
        }
        tab = null;
      }
      switch (token.type) {
        case "space":
          if (!flow && (indicator !== "doc-start" || next?.type !== "flow-collection") && token.source.includes("\t")) {
            tab = token;
          }
          hasSpace = true;
          break;
        case "comment": {
          if (!hasSpace)
            onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
          const cb = token.source.substring(1) || " ";
          if (!comment)
            comment = cb;
          else
            comment += commentSep + cb;
          commentSep = "";
          atNewline = false;
          break;
        }
        case "newline":
          if (atNewline) {
            if (comment)
              comment += token.source;
            else if (!found || indicator !== "seq-item-ind")
              spaceBefore = true;
          } else
            commentSep += token.source;
          atNewline = true;
          hasNewline = true;
          if (anchor || tag)
            newlineAfterProp = token;
          hasSpace = true;
          break;
        case "anchor":
          if (anchor)
            onError(token, "MULTIPLE_ANCHORS", "A node can have at most one anchor");
          if (token.source.endsWith(":"))
            onError(token.offset + token.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", true);
          anchor = token;
          start ?? (start = token.offset);
          atNewline = false;
          hasSpace = false;
          reqSpace = true;
          break;
        case "tag": {
          if (tag)
            onError(token, "MULTIPLE_TAGS", "A node can have at most one tag");
          tag = token;
          start ?? (start = token.offset);
          atNewline = false;
          hasSpace = false;
          reqSpace = true;
          break;
        }
        case indicator:
          if (anchor || tag)
            onError(token, "BAD_PROP_ORDER", `Anchors and tags must be after the ${token.source} indicator`);
          if (found)
            onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.source} in ${flow ?? "collection"}`);
          found = token;
          atNewline = indicator === "seq-item-ind" || indicator === "explicit-key-ind";
          hasSpace = false;
          break;
        case "comma":
          if (flow) {
            if (comma)
              onError(token, "UNEXPECTED_TOKEN", `Unexpected , in ${flow}`);
            comma = token;
            atNewline = false;
            hasSpace = false;
            break;
          }
        default:
          onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.type} token`);
          atNewline = false;
          hasSpace = false;
      }
    }
    const last = tokens[tokens.length - 1];
    const end = last ? last.offset + last.source.length : offset;
    if (reqSpace && next && next.type !== "space" && next.type !== "newline" && next.type !== "comma" && (next.type !== "scalar" || next.source !== "")) {
      onError(next.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
    }
    if (tab && (atNewline && tab.indent <= parentIndent || next?.type === "block-map" || next?.type === "block-seq"))
      onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
    return {
      comma,
      found,
      spaceBefore,
      comment,
      hasNewline,
      anchor,
      tag,
      newlineAfterProp,
      end,
      start: start ?? end
    };
  }
  exports.resolveProps = resolveProps;
});

// node_modules/yaml/dist/compose/util-contains-newline.js
var require_util_contains_newline = __commonJS((exports) => {
  function containsNewline(key) {
    if (!key)
      return null;
    switch (key.type) {
      case "alias":
      case "scalar":
      case "double-quoted-scalar":
      case "single-quoted-scalar":
        if (key.source.includes(`
`))
          return true;
        if (key.end) {
          for (const st of key.end)
            if (st.type === "newline")
              return true;
        }
        return false;
      case "flow-collection":
        for (const it of key.items) {
          for (const st of it.start)
            if (st.type === "newline")
              return true;
          if (it.sep) {
            for (const st of it.sep)
              if (st.type === "newline")
                return true;
          }
          if (containsNewline(it.key) || containsNewline(it.value))
            return true;
        }
        return false;
      default:
        return true;
    }
  }
  exports.containsNewline = containsNewline;
});

// node_modules/yaml/dist/compose/util-flow-indent-check.js
var require_util_flow_indent_check = __commonJS((exports) => {
  var utilContainsNewline = require_util_contains_newline();
  function flowIndentCheck(indent, fc, onError) {
    if (fc?.type === "flow-collection") {
      const end = fc.end[0];
      if (end.indent === indent && (end.source === "]" || end.source === "}") && utilContainsNewline.containsNewline(fc)) {
        const msg = "Flow end indicator should be more indented than parent";
        onError(end, "BAD_INDENT", msg, true);
      }
    }
  }
  exports.flowIndentCheck = flowIndentCheck;
});

// node_modules/yaml/dist/compose/util-map-includes.js
var require_util_map_includes = __commonJS((exports) => {
  var identity = require_identity();
  function mapIncludes(ctx, items, search) {
    const { uniqueKeys } = ctx.options;
    if (uniqueKeys === false)
      return false;
    const isEqual = typeof uniqueKeys === "function" ? uniqueKeys : (a, b) => a === b || identity.isScalar(a) && identity.isScalar(b) && a.value === b.value;
    return items.some((pair) => isEqual(pair.key, search));
  }
  exports.mapIncludes = mapIncludes;
});

// node_modules/yaml/dist/compose/resolve-block-map.js
var require_resolve_block_map = __commonJS((exports) => {
  var Pair = require_Pair();
  var YAMLMap = require_YAMLMap();
  var resolveProps = require_resolve_props();
  var utilContainsNewline = require_util_contains_newline();
  var utilFlowIndentCheck = require_util_flow_indent_check();
  var utilMapIncludes = require_util_map_includes();
  var startColMsg = "All mapping items must start at the same column";
  function resolveBlockMap({ composeNode, composeEmptyNode }, ctx, bm, onError, tag) {
    const NodeClass = tag?.nodeClass ?? YAMLMap.YAMLMap;
    const map = new NodeClass(ctx.schema);
    if (ctx.atRoot)
      ctx.atRoot = false;
    let offset = bm.offset;
    let commentEnd = null;
    for (const collItem of bm.items) {
      const { start, key, sep, value } = collItem;
      const keyProps = resolveProps.resolveProps(start, {
        indicator: "explicit-key-ind",
        next: key ?? sep?.[0],
        offset,
        onError,
        parentIndent: bm.indent,
        startOnNewline: true
      });
      const implicitKey = !keyProps.found;
      if (implicitKey) {
        if (key) {
          if (key.type === "block-seq")
            onError(offset, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key");
          else if ("indent" in key && key.indent !== bm.indent)
            onError(offset, "BAD_INDENT", startColMsg);
        }
        if (!keyProps.anchor && !keyProps.tag && !sep) {
          commentEnd = keyProps.end;
          if (keyProps.comment) {
            if (map.comment)
              map.comment += `
` + keyProps.comment;
            else
              map.comment = keyProps.comment;
          }
          continue;
        }
        if (keyProps.newlineAfterProp || utilContainsNewline.containsNewline(key)) {
          onError(key ?? start[start.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
        }
      } else if (keyProps.found?.indent !== bm.indent) {
        onError(offset, "BAD_INDENT", startColMsg);
      }
      ctx.atKey = true;
      const keyStart = keyProps.end;
      const keyNode = key ? composeNode(ctx, key, keyProps, onError) : composeEmptyNode(ctx, keyStart, start, null, keyProps, onError);
      if (ctx.schema.compat)
        utilFlowIndentCheck.flowIndentCheck(bm.indent, key, onError);
      ctx.atKey = false;
      if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
        onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
      const valueProps = resolveProps.resolveProps(sep ?? [], {
        indicator: "map-value-ind",
        next: value,
        offset: keyNode.range[2],
        onError,
        parentIndent: bm.indent,
        startOnNewline: !key || key.type === "block-scalar"
      });
      offset = valueProps.end;
      if (valueProps.found) {
        if (implicitKey) {
          if (value?.type === "block-map" && !valueProps.hasNewline)
            onError(offset, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings");
          if (ctx.options.strict && keyProps.start < valueProps.found.offset - 1024)
            onError(keyNode.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key");
        }
        const valueNode = value ? composeNode(ctx, value, valueProps, onError) : composeEmptyNode(ctx, offset, sep, null, valueProps, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bm.indent, value, onError);
        offset = valueNode.range[2];
        const pair = new Pair.Pair(keyNode, valueNode);
        if (ctx.options.keepSourceTokens)
          pair.srcToken = collItem;
        map.items.push(pair);
      } else {
        if (implicitKey)
          onError(keyNode.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values");
        if (valueProps.comment) {
          if (keyNode.comment)
            keyNode.comment += `
` + valueProps.comment;
          else
            keyNode.comment = valueProps.comment;
        }
        const pair = new Pair.Pair(keyNode);
        if (ctx.options.keepSourceTokens)
          pair.srcToken = collItem;
        map.items.push(pair);
      }
    }
    if (commentEnd && commentEnd < offset)
      onError(commentEnd, "IMPOSSIBLE", "Map comment with trailing content");
    map.range = [bm.offset, offset, commentEnd ?? offset];
    return map;
  }
  exports.resolveBlockMap = resolveBlockMap;
});

// node_modules/yaml/dist/compose/resolve-block-seq.js
var require_resolve_block_seq = __commonJS((exports) => {
  var YAMLSeq = require_YAMLSeq();
  var resolveProps = require_resolve_props();
  var utilFlowIndentCheck = require_util_flow_indent_check();
  function resolveBlockSeq({ composeNode, composeEmptyNode }, ctx, bs, onError, tag) {
    const NodeClass = tag?.nodeClass ?? YAMLSeq.YAMLSeq;
    const seq = new NodeClass(ctx.schema);
    if (ctx.atRoot)
      ctx.atRoot = false;
    if (ctx.atKey)
      ctx.atKey = false;
    let offset = bs.offset;
    let commentEnd = null;
    for (const { start, value } of bs.items) {
      const props = resolveProps.resolveProps(start, {
        indicator: "seq-item-ind",
        next: value,
        offset,
        onError,
        parentIndent: bs.indent,
        startOnNewline: true
      });
      if (!props.found) {
        if (props.anchor || props.tag || value) {
          if (value?.type === "block-seq")
            onError(props.end, "BAD_INDENT", "All sequence items must start at the same column");
          else
            onError(offset, "MISSING_CHAR", "Sequence item without - indicator");
        } else {
          commentEnd = props.end;
          if (props.comment)
            seq.comment = props.comment;
          continue;
        }
      }
      const node = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start, null, props, onError);
      if (ctx.schema.compat)
        utilFlowIndentCheck.flowIndentCheck(bs.indent, value, onError);
      offset = node.range[2];
      seq.items.push(node);
    }
    seq.range = [bs.offset, offset, commentEnd ?? offset];
    return seq;
  }
  exports.resolveBlockSeq = resolveBlockSeq;
});

// node_modules/yaml/dist/compose/resolve-end.js
var require_resolve_end = __commonJS((exports) => {
  function resolveEnd(end, offset, reqSpace, onError) {
    let comment = "";
    if (end) {
      let hasSpace = false;
      let sep = "";
      for (const token of end) {
        const { source, type } = token;
        switch (type) {
          case "space":
            hasSpace = true;
            break;
          case "comment": {
            if (reqSpace && !hasSpace)
              onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
            const cb = source.substring(1) || " ";
            if (!comment)
              comment = cb;
            else
              comment += sep + cb;
            sep = "";
            break;
          }
          case "newline":
            if (comment)
              sep += source;
            hasSpace = true;
            break;
          default:
            onError(token, "UNEXPECTED_TOKEN", `Unexpected ${type} at node end`);
        }
        offset += source.length;
      }
    }
    return { comment, offset };
  }
  exports.resolveEnd = resolveEnd;
});

// node_modules/yaml/dist/compose/resolve-flow-collection.js
var require_resolve_flow_collection = __commonJS((exports) => {
  var identity = require_identity();
  var Pair = require_Pair();
  var YAMLMap = require_YAMLMap();
  var YAMLSeq = require_YAMLSeq();
  var resolveEnd = require_resolve_end();
  var resolveProps = require_resolve_props();
  var utilContainsNewline = require_util_contains_newline();
  var utilMapIncludes = require_util_map_includes();
  var blockMsg = "Block collections are not allowed within flow collections";
  var isBlock = (token) => token && (token.type === "block-map" || token.type === "block-seq");
  function resolveFlowCollection({ composeNode, composeEmptyNode }, ctx, fc, onError, tag) {
    const isMap = fc.start.source === "{";
    const fcName = isMap ? "flow map" : "flow sequence";
    const NodeClass = tag?.nodeClass ?? (isMap ? YAMLMap.YAMLMap : YAMLSeq.YAMLSeq);
    const coll = new NodeClass(ctx.schema);
    coll.flow = true;
    const atRoot = ctx.atRoot;
    if (atRoot)
      ctx.atRoot = false;
    if (ctx.atKey)
      ctx.atKey = false;
    let offset = fc.offset + fc.start.source.length;
    for (let i = 0;i < fc.items.length; ++i) {
      const collItem = fc.items[i];
      const { start, key, sep, value } = collItem;
      const props = resolveProps.resolveProps(start, {
        flow: fcName,
        indicator: "explicit-key-ind",
        next: key ?? sep?.[0],
        offset,
        onError,
        parentIndent: fc.indent,
        startOnNewline: false
      });
      if (!props.found) {
        if (!props.anchor && !props.tag && !sep && !value) {
          if (i === 0 && props.comma)
            onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
          else if (i < fc.items.length - 1)
            onError(props.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${fcName}`);
          if (props.comment) {
            if (coll.comment)
              coll.comment += `
` + props.comment;
            else
              coll.comment = props.comment;
          }
          offset = props.end;
          continue;
        }
        if (!isMap && ctx.options.strict && utilContainsNewline.containsNewline(key))
          onError(key, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
      }
      if (i === 0) {
        if (props.comma)
          onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
      } else {
        if (!props.comma)
          onError(props.start, "MISSING_CHAR", `Missing , between ${fcName} items`);
        if (props.comment) {
          let prevItemComment = "";
          loop:
            for (const st of start) {
              switch (st.type) {
                case "comma":
                case "space":
                  break;
                case "comment":
                  prevItemComment = st.source.substring(1);
                  break loop;
                default:
                  break loop;
              }
            }
          if (prevItemComment) {
            let prev = coll.items[coll.items.length - 1];
            if (identity.isPair(prev))
              prev = prev.value ?? prev.key;
            if (prev.comment)
              prev.comment += `
` + prevItemComment;
            else
              prev.comment = prevItemComment;
            props.comment = props.comment.substring(prevItemComment.length + 1);
          }
        }
      }
      if (!isMap && !sep && !props.found) {
        const valueNode = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, sep, null, props, onError);
        coll.items.push(valueNode);
        offset = valueNode.range[2];
        if (isBlock(value))
          onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
      } else {
        ctx.atKey = true;
        const keyStart = props.end;
        const keyNode = key ? composeNode(ctx, key, props, onError) : composeEmptyNode(ctx, keyStart, start, null, props, onError);
        if (isBlock(key))
          onError(keyNode.range, "BLOCK_IN_FLOW", blockMsg);
        ctx.atKey = false;
        const valueProps = resolveProps.resolveProps(sep ?? [], {
          flow: fcName,
          indicator: "map-value-ind",
          next: value,
          offset: keyNode.range[2],
          onError,
          parentIndent: fc.indent,
          startOnNewline: false
        });
        if (valueProps.found) {
          if (!isMap && !props.found && ctx.options.strict) {
            if (sep)
              for (const st of sep) {
                if (st === valueProps.found)
                  break;
                if (st.type === "newline") {
                  onError(st, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
                  break;
                }
              }
            if (props.start < valueProps.found.offset - 1024)
              onError(valueProps.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
          }
        } else if (value) {
          if ("source" in value && value.source?.[0] === ":")
            onError(value, "MISSING_CHAR", `Missing space after : in ${fcName}`);
          else
            onError(valueProps.start, "MISSING_CHAR", `Missing , or : between ${fcName} items`);
        }
        const valueNode = value ? composeNode(ctx, value, valueProps, onError) : valueProps.found ? composeEmptyNode(ctx, valueProps.end, sep, null, valueProps, onError) : null;
        if (valueNode) {
          if (isBlock(value))
            onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
        } else if (valueProps.comment) {
          if (keyNode.comment)
            keyNode.comment += `
` + valueProps.comment;
          else
            keyNode.comment = valueProps.comment;
        }
        const pair = new Pair.Pair(keyNode, valueNode);
        if (ctx.options.keepSourceTokens)
          pair.srcToken = collItem;
        if (isMap) {
          const map = coll;
          if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
            onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
          map.items.push(pair);
        } else {
          const map = new YAMLMap.YAMLMap(ctx.schema);
          map.flow = true;
          map.items.push(pair);
          const endRange = (valueNode ?? keyNode).range;
          map.range = [keyNode.range[0], endRange[1], endRange[2]];
          coll.items.push(map);
        }
        offset = valueNode ? valueNode.range[2] : valueProps.end;
      }
    }
    const expectedEnd = isMap ? "}" : "]";
    const [ce, ...ee] = fc.end;
    let cePos = offset;
    if (ce?.source === expectedEnd)
      cePos = ce.offset + ce.source.length;
    else {
      const name = fcName[0].toUpperCase() + fcName.substring(1);
      const msg = atRoot ? `${name} must end with a ${expectedEnd}` : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
      onError(offset, atRoot ? "MISSING_CHAR" : "BAD_INDENT", msg);
      if (ce && ce.source.length !== 1)
        ee.unshift(ce);
    }
    if (ee.length > 0) {
      const end = resolveEnd.resolveEnd(ee, cePos, ctx.options.strict, onError);
      if (end.comment) {
        if (coll.comment)
          coll.comment += `
` + end.comment;
        else
          coll.comment = end.comment;
      }
      coll.range = [fc.offset, cePos, end.offset];
    } else {
      coll.range = [fc.offset, cePos, cePos];
    }
    return coll;
  }
  exports.resolveFlowCollection = resolveFlowCollection;
});

// node_modules/yaml/dist/compose/compose-collection.js
var require_compose_collection = __commonJS((exports) => {
  var identity = require_identity();
  var Scalar = require_Scalar();
  var YAMLMap = require_YAMLMap();
  var YAMLSeq = require_YAMLSeq();
  var resolveBlockMap = require_resolve_block_map();
  var resolveBlockSeq = require_resolve_block_seq();
  var resolveFlowCollection = require_resolve_flow_collection();
  function resolveCollection(CN, ctx, token, onError, tagName, tag) {
    const coll = token.type === "block-map" ? resolveBlockMap.resolveBlockMap(CN, ctx, token, onError, tag) : token.type === "block-seq" ? resolveBlockSeq.resolveBlockSeq(CN, ctx, token, onError, tag) : resolveFlowCollection.resolveFlowCollection(CN, ctx, token, onError, tag);
    const Coll = coll.constructor;
    if (tagName === "!" || tagName === Coll.tagName) {
      coll.tag = Coll.tagName;
      return coll;
    }
    if (tagName)
      coll.tag = tagName;
    return coll;
  }
  function composeCollection(CN, ctx, token, props, onError) {
    const tagToken = props.tag;
    const tagName = !tagToken ? null : ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg));
    if (token.type === "block-seq") {
      const { anchor, newlineAfterProp: nl } = props;
      const lastProp = anchor && tagToken ? anchor.offset > tagToken.offset ? anchor : tagToken : anchor ?? tagToken;
      if (lastProp && (!nl || nl.offset < lastProp.offset)) {
        const message = "Missing newline after block sequence props";
        onError(lastProp, "MISSING_CHAR", message);
      }
    }
    const expType = token.type === "block-map" ? "map" : token.type === "block-seq" ? "seq" : token.start.source === "{" ? "map" : "seq";
    if (!tagToken || !tagName || tagName === "!" || tagName === YAMLMap.YAMLMap.tagName && expType === "map" || tagName === YAMLSeq.YAMLSeq.tagName && expType === "seq") {
      return resolveCollection(CN, ctx, token, onError, tagName);
    }
    let tag = ctx.schema.tags.find((t) => t.tag === tagName && t.collection === expType);
    if (!tag) {
      const kt = ctx.schema.knownTags[tagName];
      if (kt?.collection === expType) {
        ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
        tag = kt;
      } else {
        if (kt) {
          onError(tagToken, "BAD_COLLECTION_TYPE", `${kt.tag} used for ${expType} collection, but expects ${kt.collection ?? "scalar"}`, true);
        } else {
          onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, true);
        }
        return resolveCollection(CN, ctx, token, onError, tagName);
      }
    }
    const coll = resolveCollection(CN, ctx, token, onError, tagName, tag);
    const res = tag.resolve?.(coll, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg), ctx.options) ?? coll;
    const node = identity.isNode(res) ? res : new Scalar.Scalar(res);
    node.range = coll.range;
    node.tag = tagName;
    if (tag?.format)
      node.format = tag.format;
    return node;
  }
  exports.composeCollection = composeCollection;
});

// node_modules/yaml/dist/compose/resolve-block-scalar.js
var require_resolve_block_scalar = __commonJS((exports) => {
  var Scalar = require_Scalar();
  function resolveBlockScalar(ctx, scalar, onError) {
    const start = scalar.offset;
    const header = parseBlockScalarHeader(scalar, ctx.options.strict, onError);
    if (!header)
      return { value: "", type: null, comment: "", range: [start, start, start] };
    const type = header.mode === ">" ? Scalar.Scalar.BLOCK_FOLDED : Scalar.Scalar.BLOCK_LITERAL;
    const lines = scalar.source ? splitLines(scalar.source) : [];
    let chompStart = lines.length;
    for (let i = lines.length - 1;i >= 0; --i) {
      const content = lines[i][1];
      if (content === "" || content === "\r")
        chompStart = i;
      else
        break;
    }
    if (chompStart === 0) {
      const value2 = header.chomp === "+" && lines.length > 0 ? `
`.repeat(Math.max(1, lines.length - 1)) : "";
      let end2 = start + header.length;
      if (scalar.source)
        end2 += scalar.source.length;
      return { value: value2, type, comment: header.comment, range: [start, end2, end2] };
    }
    let trimIndent = scalar.indent + header.indent;
    let offset = scalar.offset + header.length;
    let contentStart = 0;
    for (let i = 0;i < chompStart; ++i) {
      const [indent, content] = lines[i];
      if (content === "" || content === "\r") {
        if (header.indent === 0 && indent.length > trimIndent)
          trimIndent = indent.length;
      } else {
        if (indent.length < trimIndent) {
          const message = "Block scalars with more-indented leading empty lines must use an explicit indentation indicator";
          onError(offset + indent.length, "MISSING_CHAR", message);
        }
        if (header.indent === 0)
          trimIndent = indent.length;
        contentStart = i;
        if (trimIndent === 0 && !ctx.atRoot) {
          const message = "Block scalar values in collections must be indented";
          onError(offset, "BAD_INDENT", message);
        }
        break;
      }
      offset += indent.length + content.length + 1;
    }
    for (let i = lines.length - 1;i >= chompStart; --i) {
      if (lines[i][0].length > trimIndent)
        chompStart = i + 1;
    }
    let value = "";
    let sep = "";
    let prevMoreIndented = false;
    for (let i = 0;i < contentStart; ++i)
      value += lines[i][0].slice(trimIndent) + `
`;
    for (let i = contentStart;i < chompStart; ++i) {
      let [indent, content] = lines[i];
      offset += indent.length + content.length + 1;
      const crlf = content[content.length - 1] === "\r";
      if (crlf)
        content = content.slice(0, -1);
      if (content && indent.length < trimIndent) {
        const src = header.indent ? "explicit indentation indicator" : "first line";
        const message = `Block scalar lines must not be less indented than their ${src}`;
        onError(offset - content.length - (crlf ? 2 : 1), "BAD_INDENT", message);
        indent = "";
      }
      if (type === Scalar.Scalar.BLOCK_LITERAL) {
        value += sep + indent.slice(trimIndent) + content;
        sep = `
`;
      } else if (indent.length > trimIndent || content[0] === "\t") {
        if (sep === " ")
          sep = `
`;
        else if (!prevMoreIndented && sep === `
`)
          sep = `

`;
        value += sep + indent.slice(trimIndent) + content;
        sep = `
`;
        prevMoreIndented = true;
      } else if (content === "") {
        if (sep === `
`)
          value += `
`;
        else
          sep = `
`;
      } else {
        value += sep + content;
        sep = " ";
        prevMoreIndented = false;
      }
    }
    switch (header.chomp) {
      case "-":
        break;
      case "+":
        for (let i = chompStart;i < lines.length; ++i)
          value += `
` + lines[i][0].slice(trimIndent);
        if (value[value.length - 1] !== `
`)
          value += `
`;
        break;
      default:
        value += `
`;
    }
    const end = start + header.length + scalar.source.length;
    return { value, type, comment: header.comment, range: [start, end, end] };
  }
  function parseBlockScalarHeader({ offset, props }, strict, onError) {
    if (props[0].type !== "block-scalar-header") {
      onError(props[0], "IMPOSSIBLE", "Block scalar header not found");
      return null;
    }
    const { source } = props[0];
    const mode = source[0];
    let indent = 0;
    let chomp = "";
    let error = -1;
    for (let i = 1;i < source.length; ++i) {
      const ch = source[i];
      if (!chomp && (ch === "-" || ch === "+"))
        chomp = ch;
      else {
        const n = Number(ch);
        if (!indent && n)
          indent = n;
        else if (error === -1)
          error = offset + i;
      }
    }
    if (error !== -1)
      onError(error, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${source}`);
    let hasSpace = false;
    let comment = "";
    let length = source.length;
    for (let i = 1;i < props.length; ++i) {
      const token = props[i];
      switch (token.type) {
        case "space":
          hasSpace = true;
        case "newline":
          length += token.source.length;
          break;
        case "comment":
          if (strict && !hasSpace) {
            const message = "Comments must be separated from other tokens by white space characters";
            onError(token, "MISSING_CHAR", message);
          }
          length += token.source.length;
          comment = token.source.substring(1);
          break;
        case "error":
          onError(token, "UNEXPECTED_TOKEN", token.message);
          length += token.source.length;
          break;
        default: {
          const message = `Unexpected token in block scalar header: ${token.type}`;
          onError(token, "UNEXPECTED_TOKEN", message);
          const ts = token.source;
          if (ts && typeof ts === "string")
            length += ts.length;
        }
      }
    }
    return { mode, indent, chomp, comment, length };
  }
  function splitLines(source) {
    const split = source.split(/\n( *)/);
    const first = split[0];
    const m = first.match(/^( *)/);
    const line0 = m?.[1] ? [m[1], first.slice(m[1].length)] : ["", first];
    const lines = [line0];
    for (let i = 1;i < split.length; i += 2)
      lines.push([split[i], split[i + 1]]);
    return lines;
  }
  exports.resolveBlockScalar = resolveBlockScalar;
});

// node_modules/yaml/dist/compose/resolve-flow-scalar.js
var require_resolve_flow_scalar = __commonJS((exports) => {
  var Scalar = require_Scalar();
  var resolveEnd = require_resolve_end();
  function resolveFlowScalar(scalar, strict, onError) {
    const { offset, type, source, end } = scalar;
    let _type;
    let value;
    const _onError = (rel, code, msg) => onError(offset + rel, code, msg);
    switch (type) {
      case "scalar":
        _type = Scalar.Scalar.PLAIN;
        value = plainValue(source, _onError);
        break;
      case "single-quoted-scalar":
        _type = Scalar.Scalar.QUOTE_SINGLE;
        value = singleQuotedValue(source, _onError);
        break;
      case "double-quoted-scalar":
        _type = Scalar.Scalar.QUOTE_DOUBLE;
        value = doubleQuotedValue(source, _onError);
        break;
      default:
        onError(scalar, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${type}`);
        return {
          value: "",
          type: null,
          comment: "",
          range: [offset, offset + source.length, offset + source.length]
        };
    }
    const valueEnd = offset + source.length;
    const re = resolveEnd.resolveEnd(end, valueEnd, strict, onError);
    return {
      value,
      type: _type,
      comment: re.comment,
      range: [offset, valueEnd, re.offset]
    };
  }
  function plainValue(source, onError) {
    let badChar = "";
    switch (source[0]) {
      case "\t":
        badChar = "a tab character";
        break;
      case ",":
        badChar = "flow indicator character ,";
        break;
      case "%":
        badChar = "directive indicator character %";
        break;
      case "|":
      case ">": {
        badChar = `block scalar indicator ${source[0]}`;
        break;
      }
      case "@":
      case "`": {
        badChar = `reserved character ${source[0]}`;
        break;
      }
    }
    if (badChar)
      onError(0, "BAD_SCALAR_START", `Plain value cannot start with ${badChar}`);
    return foldLines(source);
  }
  function singleQuotedValue(source, onError) {
    if (source[source.length - 1] !== "'" || source.length === 1)
      onError(source.length, "MISSING_CHAR", "Missing closing 'quote");
    return foldLines(source.slice(1, -1)).replace(/''/g, "'");
  }
  function foldLines(source) {
    let first, line;
    try {
      first = new RegExp(`(.*?)(?<![ 	])[ 	]*\r?
`, "sy");
      line = new RegExp(`[ 	]*(.*?)(?:(?<![ 	])[ 	]*)?\r?
`, "sy");
    } catch {
      first = /(.*?)[ \t]*\r?\n/sy;
      line = /[ \t]*(.*?)[ \t]*\r?\n/sy;
    }
    let match = first.exec(source);
    if (!match)
      return source;
    let res = match[1];
    let sep = " ";
    let pos = first.lastIndex;
    line.lastIndex = pos;
    while (match = line.exec(source)) {
      if (match[1] === "") {
        if (sep === `
`)
          res += sep;
        else
          sep = `
`;
      } else {
        res += sep + match[1];
        sep = " ";
      }
      pos = line.lastIndex;
    }
    const last = /[ \t]*(.*)/sy;
    last.lastIndex = pos;
    match = last.exec(source);
    return res + sep + (match?.[1] ?? "");
  }
  function doubleQuotedValue(source, onError) {
    let res = "";
    for (let i = 1;i < source.length - 1; ++i) {
      const ch = source[i];
      if (ch === "\r" && source[i + 1] === `
`)
        continue;
      if (ch === `
`) {
        const { fold, offset } = foldNewline(source, i);
        res += fold;
        i = offset;
      } else if (ch === "\\") {
        let next = source[++i];
        const cc = escapeCodes[next];
        if (cc)
          res += cc;
        else if (next === `
`) {
          next = source[i + 1];
          while (next === " " || next === "\t")
            next = source[++i + 1];
        } else if (next === "\r" && source[i + 1] === `
`) {
          next = source[++i + 1];
          while (next === " " || next === "\t")
            next = source[++i + 1];
        } else if (next === "x" || next === "u" || next === "U") {
          const length = { x: 2, u: 4, U: 8 }[next];
          res += parseCharCode(source, i + 1, length, onError);
          i += length;
        } else {
          const raw = source.substr(i - 1, 2);
          onError(i - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
          res += raw;
        }
      } else if (ch === " " || ch === "\t") {
        const wsStart = i;
        let next = source[i + 1];
        while (next === " " || next === "\t")
          next = source[++i + 1];
        if (next !== `
` && !(next === "\r" && source[i + 2] === `
`))
          res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
      } else {
        res += ch;
      }
    }
    if (source[source.length - 1] !== '"' || source.length === 1)
      onError(source.length, "MISSING_CHAR", 'Missing closing "quote');
    return res;
  }
  function foldNewline(source, offset) {
    let fold = "";
    let ch = source[offset + 1];
    while (ch === " " || ch === "\t" || ch === `
` || ch === "\r") {
      if (ch === "\r" && source[offset + 2] !== `
`)
        break;
      if (ch === `
`)
        fold += `
`;
      offset += 1;
      ch = source[offset + 1];
    }
    if (!fold)
      fold = " ";
    return { fold, offset };
  }
  var escapeCodes = {
    "0": "\x00",
    a: "\x07",
    b: "\b",
    e: "\x1B",
    f: "\f",
    n: `
`,
    r: "\r",
    t: "\t",
    v: "\v",
    N: "",
    _: " ",
    L: "\u2028",
    P: "\u2029",
    " ": " ",
    '"': '"',
    "/": "/",
    "\\": "\\",
    "\t": "\t"
  };
  function parseCharCode(source, offset, length, onError) {
    const cc = source.substr(offset, length);
    const ok = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
    const code = ok ? parseInt(cc, 16) : NaN;
    if (isNaN(code)) {
      const raw = source.substr(offset - 2, length + 2);
      onError(offset - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
      return raw;
    }
    return String.fromCodePoint(code);
  }
  exports.resolveFlowScalar = resolveFlowScalar;
});

// node_modules/yaml/dist/compose/compose-scalar.js
var require_compose_scalar = __commonJS((exports) => {
  var identity = require_identity();
  var Scalar = require_Scalar();
  var resolveBlockScalar = require_resolve_block_scalar();
  var resolveFlowScalar = require_resolve_flow_scalar();
  function composeScalar(ctx, token, tagToken, onError) {
    const { value, type, comment, range } = token.type === "block-scalar" ? resolveBlockScalar.resolveBlockScalar(ctx, token, onError) : resolveFlowScalar.resolveFlowScalar(token, ctx.options.strict, onError);
    const tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg)) : null;
    let tag;
    if (ctx.options.stringKeys && ctx.atKey) {
      tag = ctx.schema[identity.SCALAR];
    } else if (tagName)
      tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError);
    else if (token.type === "scalar")
      tag = findScalarTagByTest(ctx, value, token, onError);
    else
      tag = ctx.schema[identity.SCALAR];
    let scalar;
    try {
      const res = tag.resolve(value, (msg) => onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg), ctx.options);
      scalar = identity.isScalar(res) ? res : new Scalar.Scalar(res);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg);
      scalar = new Scalar.Scalar(value);
    }
    scalar.range = range;
    scalar.source = value;
    if (type)
      scalar.type = type;
    if (tagName)
      scalar.tag = tagName;
    if (tag.format)
      scalar.format = tag.format;
    if (comment)
      scalar.comment = comment;
    return scalar;
  }
  function findScalarTagByName(schema, value, tagName, tagToken, onError) {
    if (tagName === "!")
      return schema[identity.SCALAR];
    const matchWithTest = [];
    for (const tag of schema.tags) {
      if (!tag.collection && tag.tag === tagName) {
        if (tag.default && tag.test)
          matchWithTest.push(tag);
        else
          return tag;
      }
    }
    for (const tag of matchWithTest)
      if (tag.test?.test(value))
        return tag;
    const kt = schema.knownTags[tagName];
    if (kt && !kt.collection) {
      schema.tags.push(Object.assign({}, kt, { default: false, test: undefined }));
      return kt;
    }
    onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, tagName !== "tag:yaml.org,2002:str");
    return schema[identity.SCALAR];
  }
  function findScalarTagByTest({ atKey, directives, schema }, value, token, onError) {
    const tag = schema.tags.find((tag2) => (tag2.default === true || atKey && tag2.default === "key") && tag2.test?.test(value)) || schema[identity.SCALAR];
    if (schema.compat) {
      const compat = schema.compat.find((tag2) => tag2.default && tag2.test?.test(value)) ?? schema[identity.SCALAR];
      if (tag.tag !== compat.tag) {
        const ts = directives.tagString(tag.tag);
        const cs = directives.tagString(compat.tag);
        const msg = `Value may be parsed as either ${ts} or ${cs}`;
        onError(token, "TAG_RESOLVE_FAILED", msg, true);
      }
    }
    return tag;
  }
  exports.composeScalar = composeScalar;
});

// node_modules/yaml/dist/compose/util-empty-scalar-position.js
var require_util_empty_scalar_position = __commonJS((exports) => {
  function emptyScalarPosition(offset, before, pos) {
    if (before) {
      pos ?? (pos = before.length);
      for (let i = pos - 1;i >= 0; --i) {
        let st = before[i];
        switch (st.type) {
          case "space":
          case "comment":
          case "newline":
            offset -= st.source.length;
            continue;
        }
        st = before[++i];
        while (st?.type === "space") {
          offset += st.source.length;
          st = before[++i];
        }
        break;
      }
    }
    return offset;
  }
  exports.emptyScalarPosition = emptyScalarPosition;
});

// node_modules/yaml/dist/compose/compose-node.js
var require_compose_node = __commonJS((exports) => {
  var Alias = require_Alias();
  var identity = require_identity();
  var composeCollection = require_compose_collection();
  var composeScalar = require_compose_scalar();
  var resolveEnd = require_resolve_end();
  var utilEmptyScalarPosition = require_util_empty_scalar_position();
  var CN = { composeNode, composeEmptyNode };
  function composeNode(ctx, token, props, onError) {
    const atKey = ctx.atKey;
    const { spaceBefore, comment, anchor, tag } = props;
    let node;
    let isSrcToken = true;
    switch (token.type) {
      case "alias":
        node = composeAlias(ctx, token, onError);
        if (anchor || tag)
          onError(token, "ALIAS_PROPS", "An alias node must not specify any properties");
        break;
      case "scalar":
      case "single-quoted-scalar":
      case "double-quoted-scalar":
      case "block-scalar":
        node = composeScalar.composeScalar(ctx, token, tag, onError);
        if (anchor)
          node.anchor = anchor.source.substring(1);
        break;
      case "block-map":
      case "block-seq":
      case "flow-collection":
        try {
          node = composeCollection.composeCollection(CN, ctx, token, props, onError);
          if (anchor)
            node.anchor = anchor.source.substring(1);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          onError(token, "RESOURCE_EXHAUSTION", message);
        }
        break;
      default: {
        const message = token.type === "error" ? token.message : `Unsupported token (type: ${token.type})`;
        onError(token, "UNEXPECTED_TOKEN", message);
        isSrcToken = false;
      }
    }
    node ?? (node = composeEmptyNode(ctx, token.offset, undefined, null, props, onError));
    if (anchor && node.anchor === "")
      onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
    if (atKey && ctx.options.stringKeys && (!identity.isScalar(node) || typeof node.value !== "string" || node.tag && node.tag !== "tag:yaml.org,2002:str")) {
      const msg = "With stringKeys, all keys must be strings";
      onError(tag ?? token, "NON_STRING_KEY", msg);
    }
    if (spaceBefore)
      node.spaceBefore = true;
    if (comment) {
      if (token.type === "scalar" && token.source === "")
        node.comment = comment;
      else
        node.commentBefore = comment;
    }
    if (ctx.options.keepSourceTokens && isSrcToken)
      node.srcToken = token;
    return node;
  }
  function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError) {
    const token = {
      type: "scalar",
      offset: utilEmptyScalarPosition.emptyScalarPosition(offset, before, pos),
      indent: -1,
      source: ""
    };
    const node = composeScalar.composeScalar(ctx, token, tag, onError);
    if (anchor) {
      node.anchor = anchor.source.substring(1);
      if (node.anchor === "")
        onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
    }
    if (spaceBefore)
      node.spaceBefore = true;
    if (comment) {
      node.comment = comment;
      node.range[2] = end;
    }
    return node;
  }
  function composeAlias({ options }, { offset, source, end }, onError) {
    const alias = new Alias.Alias(source.substring(1));
    if (alias.source === "")
      onError(offset, "BAD_ALIAS", "Alias cannot be an empty string");
    if (alias.source.endsWith(":"))
      onError(offset + source.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", true);
    const valueEnd = offset + source.length;
    const re = resolveEnd.resolveEnd(end, valueEnd, options.strict, onError);
    alias.range = [offset, valueEnd, re.offset];
    if (re.comment)
      alias.comment = re.comment;
    return alias;
  }
  exports.composeEmptyNode = composeEmptyNode;
  exports.composeNode = composeNode;
});

// node_modules/yaml/dist/compose/compose-doc.js
var require_compose_doc = __commonJS((exports) => {
  var Document = require_Document();
  var composeNode = require_compose_node();
  var resolveEnd = require_resolve_end();
  var resolveProps = require_resolve_props();
  function composeDoc(options, directives, { offset, start, value, end }, onError) {
    const opts = Object.assign({ _directives: directives }, options);
    const doc = new Document.Document(undefined, opts);
    const ctx = {
      atKey: false,
      atRoot: true,
      directives: doc.directives,
      options: doc.options,
      schema: doc.schema
    };
    const props = resolveProps.resolveProps(start, {
      indicator: "doc-start",
      next: value ?? end?.[0],
      offset,
      onError,
      parentIndent: 0,
      startOnNewline: true
    });
    if (props.found) {
      doc.directives.docStart = true;
      if (value && (value.type === "block-map" || value.type === "block-seq") && !props.hasNewline)
        onError(props.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker");
    }
    doc.contents = value ? composeNode.composeNode(ctx, value, props, onError) : composeNode.composeEmptyNode(ctx, props.end, start, null, props, onError);
    const contentEnd = doc.contents.range[2];
    const re = resolveEnd.resolveEnd(end, contentEnd, false, onError);
    if (re.comment)
      doc.comment = re.comment;
    doc.range = [offset, contentEnd, re.offset];
    return doc;
  }
  exports.composeDoc = composeDoc;
});

// node_modules/yaml/dist/compose/composer.js
var require_composer = __commonJS((exports) => {
  var node_process = __require("process");
  var directives = require_directives();
  var Document = require_Document();
  var errors = require_errors();
  var identity = require_identity();
  var composeDoc = require_compose_doc();
  var resolveEnd = require_resolve_end();
  function getErrorPos(src) {
    if (typeof src === "number")
      return [src, src + 1];
    if (Array.isArray(src))
      return src.length === 2 ? src : [src[0], src[1]];
    const { offset, source } = src;
    return [offset, offset + (typeof source === "string" ? source.length : 1)];
  }
  function parsePrelude(prelude) {
    let comment = "";
    let atComment = false;
    let afterEmptyLine = false;
    for (let i = 0;i < prelude.length; ++i) {
      const source = prelude[i];
      switch (source[0]) {
        case "#":
          comment += (comment === "" ? "" : afterEmptyLine ? `

` : `
`) + (source.substring(1) || " ");
          atComment = true;
          afterEmptyLine = false;
          break;
        case "%":
          if (prelude[i + 1]?.[0] !== "#")
            i += 1;
          atComment = false;
          break;
        default:
          if (!atComment)
            afterEmptyLine = true;
          atComment = false;
      }
    }
    return { comment, afterEmptyLine };
  }

  class Composer {
    constructor(options = {}) {
      this.doc = null;
      this.atDirectives = false;
      this.prelude = [];
      this.errors = [];
      this.warnings = [];
      this.onError = (source, code, message, warning) => {
        const pos = getErrorPos(source);
        if (warning)
          this.warnings.push(new errors.YAMLWarning(pos, code, message));
        else
          this.errors.push(new errors.YAMLParseError(pos, code, message));
      };
      this.directives = new directives.Directives({ version: options.version || "1.2" });
      this.options = options;
    }
    decorate(doc, afterDoc) {
      const { comment, afterEmptyLine } = parsePrelude(this.prelude);
      if (comment) {
        const dc = doc.contents;
        if (afterDoc) {
          doc.comment = doc.comment ? `${doc.comment}
${comment}` : comment;
        } else if (afterEmptyLine || doc.directives.docStart || !dc) {
          doc.commentBefore = comment;
        } else if (identity.isCollection(dc) && !dc.flow && dc.items.length > 0) {
          let it = dc.items[0];
          if (identity.isPair(it))
            it = it.key;
          const cb = it.commentBefore;
          it.commentBefore = cb ? `${comment}
${cb}` : comment;
        } else {
          const cb = dc.commentBefore;
          dc.commentBefore = cb ? `${comment}
${cb}` : comment;
        }
      }
      if (afterDoc) {
        Array.prototype.push.apply(doc.errors, this.errors);
        Array.prototype.push.apply(doc.warnings, this.warnings);
      } else {
        doc.errors = this.errors;
        doc.warnings = this.warnings;
      }
      this.prelude = [];
      this.errors = [];
      this.warnings = [];
    }
    streamInfo() {
      return {
        comment: parsePrelude(this.prelude).comment,
        directives: this.directives,
        errors: this.errors,
        warnings: this.warnings
      };
    }
    *compose(tokens, forceDoc = false, endOffset = -1) {
      for (const token of tokens)
        yield* this.next(token);
      yield* this.end(forceDoc, endOffset);
    }
    *next(token) {
      if (node_process.env.LOG_STREAM)
        console.dir(token, { depth: null });
      switch (token.type) {
        case "directive":
          this.directives.add(token.source, (offset, message, warning) => {
            const pos = getErrorPos(token);
            pos[0] += offset;
            this.onError(pos, "BAD_DIRECTIVE", message, warning);
          });
          this.prelude.push(token.source);
          this.atDirectives = true;
          break;
        case "document": {
          const doc = composeDoc.composeDoc(this.options, this.directives, token, this.onError);
          if (this.atDirectives && !doc.directives.docStart)
            this.onError(token, "MISSING_CHAR", "Missing directives-end/doc-start indicator line");
          this.decorate(doc, false);
          if (this.doc)
            yield this.doc;
          this.doc = doc;
          this.atDirectives = false;
          break;
        }
        case "byte-order-mark":
        case "space":
          break;
        case "comment":
        case "newline":
          this.prelude.push(token.source);
          break;
        case "error": {
          const msg = token.source ? `${token.message}: ${JSON.stringify(token.source)}` : token.message;
          const error = new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg);
          if (this.atDirectives || !this.doc)
            this.errors.push(error);
          else
            this.doc.errors.push(error);
          break;
        }
        case "doc-end": {
          if (!this.doc) {
            const msg = "Unexpected doc-end without preceding document";
            this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg));
            break;
          }
          this.doc.directives.docEnd = true;
          const end = resolveEnd.resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
          this.decorate(this.doc, true);
          if (end.comment) {
            const dc = this.doc.comment;
            this.doc.comment = dc ? `${dc}
${end.comment}` : end.comment;
          }
          this.doc.range[2] = end.offset;
          break;
        }
        default:
          this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", `Unsupported token ${token.type}`));
      }
    }
    *end(forceDoc = false, endOffset = -1) {
      if (this.doc) {
        this.decorate(this.doc, true);
        yield this.doc;
        this.doc = null;
      } else if (forceDoc) {
        const opts = Object.assign({ _directives: this.directives }, this.options);
        const doc = new Document.Document(undefined, opts);
        if (this.atDirectives)
          this.onError(endOffset, "MISSING_CHAR", "Missing directives-end indicator line");
        doc.range = [0, endOffset, endOffset];
        this.decorate(doc, false);
        yield doc;
      }
    }
  }
  exports.Composer = Composer;
});

// node_modules/yaml/dist/parse/cst-scalar.js
var require_cst_scalar = __commonJS((exports) => {
  var resolveBlockScalar = require_resolve_block_scalar();
  var resolveFlowScalar = require_resolve_flow_scalar();
  var errors = require_errors();
  var stringifyString = require_stringifyString();
  function resolveAsScalar(token, strict = true, onError) {
    if (token) {
      const _onError = (pos, code, message) => {
        const offset = typeof pos === "number" ? pos : Array.isArray(pos) ? pos[0] : pos.offset;
        if (onError)
          onError(offset, code, message);
        else
          throw new errors.YAMLParseError([offset, offset + 1], code, message);
      };
      switch (token.type) {
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
          return resolveFlowScalar.resolveFlowScalar(token, strict, _onError);
        case "block-scalar":
          return resolveBlockScalar.resolveBlockScalar({ options: { strict } }, token, _onError);
      }
    }
    return null;
  }
  function createScalarToken(value, context) {
    const { implicitKey = false, indent, inFlow = false, offset = -1, type = "PLAIN" } = context;
    const source = stringifyString.stringifyString({ type, value }, {
      implicitKey,
      indent: indent > 0 ? " ".repeat(indent) : "",
      inFlow,
      options: { blockQuote: true, lineWidth: -1 }
    });
    const end = context.end ?? [
      { type: "newline", offset: -1, indent, source: `
` }
    ];
    switch (source[0]) {
      case "|":
      case ">": {
        const he = source.indexOf(`
`);
        const head = source.substring(0, he);
        const body = source.substring(he + 1) + `
`;
        const props = [
          { type: "block-scalar-header", offset, indent, source: head }
        ];
        if (!addEndtoBlockProps(props, end))
          props.push({ type: "newline", offset: -1, indent, source: `
` });
        return { type: "block-scalar", offset, indent, props, source: body };
      }
      case '"':
        return { type: "double-quoted-scalar", offset, indent, source, end };
      case "'":
        return { type: "single-quoted-scalar", offset, indent, source, end };
      default:
        return { type: "scalar", offset, indent, source, end };
    }
  }
  function setScalarValue(token, value, context = {}) {
    let { afterKey = false, implicitKey = false, inFlow = false, type } = context;
    let indent = "indent" in token ? token.indent : null;
    if (afterKey && typeof indent === "number")
      indent += 2;
    if (!type)
      switch (token.type) {
        case "single-quoted-scalar":
          type = "QUOTE_SINGLE";
          break;
        case "double-quoted-scalar":
          type = "QUOTE_DOUBLE";
          break;
        case "block-scalar": {
          const header = token.props[0];
          if (header.type !== "block-scalar-header")
            throw new Error("Invalid block scalar header");
          type = header.source[0] === ">" ? "BLOCK_FOLDED" : "BLOCK_LITERAL";
          break;
        }
        default:
          type = "PLAIN";
      }
    const source = stringifyString.stringifyString({ type, value }, {
      implicitKey: implicitKey || indent === null,
      indent: indent !== null && indent > 0 ? " ".repeat(indent) : "",
      inFlow,
      options: { blockQuote: true, lineWidth: -1 }
    });
    switch (source[0]) {
      case "|":
      case ">":
        setBlockScalarValue(token, source);
        break;
      case '"':
        setFlowScalarValue(token, source, "double-quoted-scalar");
        break;
      case "'":
        setFlowScalarValue(token, source, "single-quoted-scalar");
        break;
      default:
        setFlowScalarValue(token, source, "scalar");
    }
  }
  function setBlockScalarValue(token, source) {
    const he = source.indexOf(`
`);
    const head = source.substring(0, he);
    const body = source.substring(he + 1) + `
`;
    if (token.type === "block-scalar") {
      const header = token.props[0];
      if (header.type !== "block-scalar-header")
        throw new Error("Invalid block scalar header");
      header.source = head;
      token.source = body;
    } else {
      const { offset } = token;
      const indent = "indent" in token ? token.indent : -1;
      const props = [
        { type: "block-scalar-header", offset, indent, source: head }
      ];
      if (!addEndtoBlockProps(props, "end" in token ? token.end : undefined))
        props.push({ type: "newline", offset: -1, indent, source: `
` });
      for (const key of Object.keys(token))
        if (key !== "type" && key !== "offset")
          delete token[key];
      Object.assign(token, { type: "block-scalar", indent, props, source: body });
    }
  }
  function addEndtoBlockProps(props, end) {
    if (end)
      for (const st of end)
        switch (st.type) {
          case "space":
          case "comment":
            props.push(st);
            break;
          case "newline":
            props.push(st);
            return true;
        }
    return false;
  }
  function setFlowScalarValue(token, source, type) {
    switch (token.type) {
      case "scalar":
      case "double-quoted-scalar":
      case "single-quoted-scalar":
        token.type = type;
        token.source = source;
        break;
      case "block-scalar": {
        const end = token.props.slice(1);
        let oa = source.length;
        if (token.props[0].type === "block-scalar-header")
          oa -= token.props[0].source.length;
        for (const tok of end)
          tok.offset += oa;
        delete token.props;
        Object.assign(token, { type, source, end });
        break;
      }
      case "block-map":
      case "block-seq": {
        const offset = token.offset + source.length;
        const nl = { type: "newline", offset, indent: token.indent, source: `
` };
        delete token.items;
        Object.assign(token, { type, source, end: [nl] });
        break;
      }
      default: {
        const indent = "indent" in token ? token.indent : -1;
        const end = "end" in token && Array.isArray(token.end) ? token.end.filter((st) => st.type === "space" || st.type === "comment" || st.type === "newline") : [];
        for (const key of Object.keys(token))
          if (key !== "type" && key !== "offset")
            delete token[key];
        Object.assign(token, { type, indent, source, end });
      }
    }
  }
  exports.createScalarToken = createScalarToken;
  exports.resolveAsScalar = resolveAsScalar;
  exports.setScalarValue = setScalarValue;
});

// node_modules/yaml/dist/parse/cst-stringify.js
var require_cst_stringify = __commonJS((exports) => {
  var stringify = (cst) => ("type" in cst) ? stringifyToken(cst) : stringifyItem(cst);
  function stringifyToken(token) {
    switch (token.type) {
      case "block-scalar": {
        let res = "";
        for (const tok of token.props)
          res += stringifyToken(tok);
        return res + token.source;
      }
      case "block-map":
      case "block-seq": {
        let res = "";
        for (const item of token.items)
          res += stringifyItem(item);
        return res;
      }
      case "flow-collection": {
        let res = token.start.source;
        for (const item of token.items)
          res += stringifyItem(item);
        for (const st of token.end)
          res += st.source;
        return res;
      }
      case "document": {
        let res = stringifyItem(token);
        if (token.end)
          for (const st of token.end)
            res += st.source;
        return res;
      }
      default: {
        let res = token.source;
        if ("end" in token && token.end)
          for (const st of token.end)
            res += st.source;
        return res;
      }
    }
  }
  function stringifyItem({ start, key, sep, value }) {
    let res = "";
    for (const st of start)
      res += st.source;
    if (key)
      res += stringifyToken(key);
    if (sep)
      for (const st of sep)
        res += st.source;
    if (value)
      res += stringifyToken(value);
    return res;
  }
  exports.stringify = stringify;
});

// node_modules/yaml/dist/parse/cst-visit.js
var require_cst_visit = __commonJS((exports) => {
  var BREAK = Symbol("break visit");
  var SKIP = Symbol("skip children");
  var REMOVE = Symbol("remove item");
  function visit(cst, visitor) {
    if ("type" in cst && cst.type === "document")
      cst = { start: cst.start, value: cst.value };
    _visit(Object.freeze([]), cst, visitor);
  }
  visit.BREAK = BREAK;
  visit.SKIP = SKIP;
  visit.REMOVE = REMOVE;
  visit.itemAtPath = (cst, path) => {
    let item = cst;
    for (const [field, index] of path) {
      const tok = item?.[field];
      if (tok && "items" in tok) {
        item = tok.items[index];
      } else
        return;
    }
    return item;
  };
  visit.parentCollection = (cst, path) => {
    const parent = visit.itemAtPath(cst, path.slice(0, -1));
    const field = path[path.length - 1][0];
    const coll = parent?.[field];
    if (coll && "items" in coll)
      return coll;
    throw new Error("Parent collection not found");
  };
  function _visit(path, item, visitor) {
    let ctrl = visitor(item, path);
    if (typeof ctrl === "symbol")
      return ctrl;
    for (const field of ["key", "value"]) {
      const token = item[field];
      if (token && "items" in token) {
        for (let i = 0;i < token.items.length; ++i) {
          const ci = _visit(Object.freeze(path.concat([[field, i]])), token.items[i], visitor);
          if (typeof ci === "number")
            i = ci - 1;
          else if (ci === BREAK)
            return BREAK;
          else if (ci === REMOVE) {
            token.items.splice(i, 1);
            i -= 1;
          }
        }
        if (typeof ctrl === "function" && field === "key")
          ctrl = ctrl(item, path);
      }
    }
    return typeof ctrl === "function" ? ctrl(item, path) : ctrl;
  }
  exports.visit = visit;
});

// node_modules/yaml/dist/parse/cst.js
var require_cst = __commonJS((exports) => {
  var cstScalar = require_cst_scalar();
  var cstStringify = require_cst_stringify();
  var cstVisit = require_cst_visit();
  var BOM = "\uFEFF";
  var DOCUMENT = "\x02";
  var FLOW_END = "\x18";
  var SCALAR = "\x1F";
  var isCollection = (token) => !!token && ("items" in token);
  var isScalar = (token) => !!token && (token.type === "scalar" || token.type === "single-quoted-scalar" || token.type === "double-quoted-scalar" || token.type === "block-scalar");
  function prettyToken(token) {
    switch (token) {
      case BOM:
        return "<BOM>";
      case DOCUMENT:
        return "<DOC>";
      case FLOW_END:
        return "<FLOW_END>";
      case SCALAR:
        return "<SCALAR>";
      default:
        return JSON.stringify(token);
    }
  }
  function tokenType(source) {
    switch (source) {
      case BOM:
        return "byte-order-mark";
      case DOCUMENT:
        return "doc-mode";
      case FLOW_END:
        return "flow-error-end";
      case SCALAR:
        return "scalar";
      case "---":
        return "doc-start";
      case "...":
        return "doc-end";
      case "":
      case `
`:
      case `\r
`:
        return "newline";
      case "-":
        return "seq-item-ind";
      case "?":
        return "explicit-key-ind";
      case ":":
        return "map-value-ind";
      case "{":
        return "flow-map-start";
      case "}":
        return "flow-map-end";
      case "[":
        return "flow-seq-start";
      case "]":
        return "flow-seq-end";
      case ",":
        return "comma";
    }
    switch (source[0]) {
      case " ":
      case "\t":
        return "space";
      case "#":
        return "comment";
      case "%":
        return "directive-line";
      case "*":
        return "alias";
      case "&":
        return "anchor";
      case "!":
        return "tag";
      case "'":
        return "single-quoted-scalar";
      case '"':
        return "double-quoted-scalar";
      case "|":
      case ">":
        return "block-scalar-header";
    }
    return null;
  }
  exports.createScalarToken = cstScalar.createScalarToken;
  exports.resolveAsScalar = cstScalar.resolveAsScalar;
  exports.setScalarValue = cstScalar.setScalarValue;
  exports.stringify = cstStringify.stringify;
  exports.visit = cstVisit.visit;
  exports.BOM = BOM;
  exports.DOCUMENT = DOCUMENT;
  exports.FLOW_END = FLOW_END;
  exports.SCALAR = SCALAR;
  exports.isCollection = isCollection;
  exports.isScalar = isScalar;
  exports.prettyToken = prettyToken;
  exports.tokenType = tokenType;
});

// node_modules/yaml/dist/parse/lexer.js
var require_lexer = __commonJS((exports) => {
  var cst = require_cst();
  function isEmpty(ch) {
    switch (ch) {
      case undefined:
      case " ":
      case `
`:
      case "\r":
      case "\t":
        return true;
      default:
        return false;
    }
  }
  var hexDigits = new Set("0123456789ABCDEFabcdef");
  var tagChars = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
  var flowIndicatorChars = new Set(",[]{}");
  var invalidAnchorChars = new Set(` ,[]{}
\r	`);
  var isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch);

  class Lexer {
    constructor() {
      this.atEnd = false;
      this.blockScalarIndent = -1;
      this.blockScalarKeep = false;
      this.buffer = "";
      this.flowKey = false;
      this.flowLevel = 0;
      this.indentNext = 0;
      this.indentValue = 0;
      this.lineEndPos = null;
      this.next = null;
      this.pos = 0;
    }
    *lex(source, incomplete = false) {
      if (source) {
        if (typeof source !== "string")
          throw TypeError("source is not a string");
        this.buffer = this.buffer ? this.buffer + source : source;
        this.lineEndPos = null;
      }
      this.atEnd = !incomplete;
      let next = this.next ?? "stream";
      while (next && (incomplete || this.hasChars(1)))
        next = yield* this.parseNext(next);
    }
    atLineEnd() {
      let i = this.pos;
      let ch = this.buffer[i];
      while (ch === " " || ch === "\t")
        ch = this.buffer[++i];
      if (!ch || ch === "#" || ch === `
`)
        return true;
      if (ch === "\r")
        return this.buffer[i + 1] === `
`;
      return false;
    }
    charAt(n) {
      return this.buffer[this.pos + n];
    }
    continueScalar(offset) {
      let ch = this.buffer[offset];
      if (this.indentNext > 0) {
        let indent = 0;
        while (ch === " ")
          ch = this.buffer[++indent + offset];
        if (ch === "\r") {
          const next = this.buffer[indent + offset + 1];
          if (next === `
` || !next && !this.atEnd)
            return offset + indent + 1;
        }
        return ch === `
` || indent >= this.indentNext || !ch && !this.atEnd ? offset + indent : -1;
      }
      if (ch === "-" || ch === ".") {
        const dt = this.buffer.substr(offset, 3);
        if ((dt === "---" || dt === "...") && isEmpty(this.buffer[offset + 3]))
          return -1;
      }
      return offset;
    }
    getLine() {
      let end = this.lineEndPos;
      if (typeof end !== "number" || end !== -1 && end < this.pos) {
        end = this.buffer.indexOf(`
`, this.pos);
        this.lineEndPos = end;
      }
      if (end === -1)
        return this.atEnd ? this.buffer.substring(this.pos) : null;
      if (this.buffer[end - 1] === "\r")
        end -= 1;
      return this.buffer.substring(this.pos, end);
    }
    hasChars(n) {
      return this.pos + n <= this.buffer.length;
    }
    setNext(state) {
      this.buffer = this.buffer.substring(this.pos);
      this.pos = 0;
      this.lineEndPos = null;
      this.next = state;
      return null;
    }
    peek(n) {
      return this.buffer.substr(this.pos, n);
    }
    *parseNext(next) {
      switch (next) {
        case "stream":
          return yield* this.parseStream();
        case "line-start":
          return yield* this.parseLineStart();
        case "block-start":
          return yield* this.parseBlockStart();
        case "doc":
          return yield* this.parseDocument();
        case "flow":
          return yield* this.parseFlowCollection();
        case "quoted-scalar":
          return yield* this.parseQuotedScalar();
        case "block-scalar":
          return yield* this.parseBlockScalar();
        case "plain-scalar":
          return yield* this.parsePlainScalar();
      }
    }
    *parseStream() {
      let line = this.getLine();
      if (line === null)
        return this.setNext("stream");
      if (line[0] === cst.BOM) {
        yield* this.pushCount(1);
        line = line.substring(1);
      }
      if (line[0] === "%") {
        let dirEnd = line.length;
        let cs = line.indexOf("#");
        while (cs !== -1) {
          const ch = line[cs - 1];
          if (ch === " " || ch === "\t") {
            dirEnd = cs - 1;
            break;
          } else {
            cs = line.indexOf("#", cs + 1);
          }
        }
        while (true) {
          const ch = line[dirEnd - 1];
          if (ch === " " || ch === "\t")
            dirEnd -= 1;
          else
            break;
        }
        const n = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
        yield* this.pushCount(line.length - n);
        this.pushNewline();
        return "stream";
      }
      if (this.atLineEnd()) {
        const sp = yield* this.pushSpaces(true);
        yield* this.pushCount(line.length - sp);
        yield* this.pushNewline();
        return "stream";
      }
      yield cst.DOCUMENT;
      return yield* this.parseLineStart();
    }
    *parseLineStart() {
      const ch = this.charAt(0);
      if (!ch && !this.atEnd)
        return this.setNext("line-start");
      if (ch === "-" || ch === ".") {
        if (!this.atEnd && !this.hasChars(4))
          return this.setNext("line-start");
        const s = this.peek(3);
        if ((s === "---" || s === "...") && isEmpty(this.charAt(3))) {
          yield* this.pushCount(3);
          this.indentValue = 0;
          this.indentNext = 0;
          return s === "---" ? "doc" : "stream";
        }
      }
      this.indentValue = yield* this.pushSpaces(false);
      if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1)))
        this.indentNext = this.indentValue;
      return yield* this.parseBlockStart();
    }
    *parseBlockStart() {
      const [ch0, ch1] = this.peek(2);
      if (!ch1 && !this.atEnd)
        return this.setNext("block-start");
      if ((ch0 === "-" || ch0 === "?" || ch0 === ":") && isEmpty(ch1)) {
        const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
        this.indentNext = this.indentValue + 1;
        this.indentValue += n;
        return yield* this.parseBlockStart();
      }
      return "doc";
    }
    *parseDocument() {
      yield* this.pushSpaces(true);
      const line = this.getLine();
      if (line === null)
        return this.setNext("doc");
      let n = yield* this.pushIndicators();
      switch (line[n]) {
        case "#":
          yield* this.pushCount(line.length - n);
        case undefined:
          yield* this.pushNewline();
          return yield* this.parseLineStart();
        case "{":
        case "[":
          yield* this.pushCount(1);
          this.flowKey = false;
          this.flowLevel = 1;
          return "flow";
        case "}":
        case "]":
          yield* this.pushCount(1);
          return "doc";
        case "*":
          yield* this.pushUntil(isNotAnchorChar);
          return "doc";
        case '"':
        case "'":
          return yield* this.parseQuotedScalar();
        case "|":
        case ">":
          n += yield* this.parseBlockScalarHeader();
          n += yield* this.pushSpaces(true);
          yield* this.pushCount(line.length - n);
          yield* this.pushNewline();
          return yield* this.parseBlockScalar();
        default:
          return yield* this.parsePlainScalar();
      }
    }
    *parseFlowCollection() {
      let nl, sp;
      let indent = -1;
      do {
        nl = yield* this.pushNewline();
        if (nl > 0) {
          sp = yield* this.pushSpaces(false);
          this.indentValue = indent = sp;
        } else {
          sp = 0;
        }
        sp += yield* this.pushSpaces(true);
      } while (nl + sp > 0);
      const line = this.getLine();
      if (line === null)
        return this.setNext("flow");
      if (indent !== -1 && indent < this.indentNext && line[0] !== "#" || indent === 0 && (line.startsWith("---") || line.startsWith("...")) && isEmpty(line[3])) {
        const atFlowEndMarker = indent === this.indentNext - 1 && this.flowLevel === 1 && (line[0] === "]" || line[0] === "}");
        if (!atFlowEndMarker) {
          this.flowLevel = 0;
          yield cst.FLOW_END;
          return yield* this.parseLineStart();
        }
      }
      let n = 0;
      while (line[n] === ",") {
        n += yield* this.pushCount(1);
        n += yield* this.pushSpaces(true);
        this.flowKey = false;
      }
      n += yield* this.pushIndicators();
      switch (line[n]) {
        case undefined:
          return "flow";
        case "#":
          yield* this.pushCount(line.length - n);
          return "flow";
        case "{":
        case "[":
          yield* this.pushCount(1);
          this.flowKey = false;
          this.flowLevel += 1;
          return "flow";
        case "}":
        case "]":
          yield* this.pushCount(1);
          this.flowKey = true;
          this.flowLevel -= 1;
          return this.flowLevel ? "flow" : "doc";
        case "*":
          yield* this.pushUntil(isNotAnchorChar);
          return "flow";
        case '"':
        case "'":
          this.flowKey = true;
          return yield* this.parseQuotedScalar();
        case ":": {
          const next = this.charAt(1);
          if (this.flowKey || isEmpty(next) || next === ",") {
            this.flowKey = false;
            yield* this.pushCount(1);
            yield* this.pushSpaces(true);
            return "flow";
          }
        }
        default:
          this.flowKey = false;
          return yield* this.parsePlainScalar();
      }
    }
    *parseQuotedScalar() {
      const quote = this.charAt(0);
      let end = this.buffer.indexOf(quote, this.pos + 1);
      if (quote === "'") {
        while (end !== -1 && this.buffer[end + 1] === "'")
          end = this.buffer.indexOf("'", end + 2);
      } else {
        while (end !== -1) {
          let n = 0;
          while (this.buffer[end - 1 - n] === "\\")
            n += 1;
          if (n % 2 === 0)
            break;
          end = this.buffer.indexOf('"', end + 1);
        }
      }
      const qb = this.buffer.substring(0, end);
      let nl = qb.indexOf(`
`, this.pos);
      if (nl !== -1) {
        while (nl !== -1) {
          const cs = this.continueScalar(nl + 1);
          if (cs === -1)
            break;
          nl = qb.indexOf(`
`, cs);
        }
        if (nl !== -1) {
          end = nl - (qb[nl - 1] === "\r" ? 2 : 1);
        }
      }
      if (end === -1) {
        if (!this.atEnd)
          return this.setNext("quoted-scalar");
        end = this.buffer.length;
      }
      yield* this.pushToIndex(end + 1, false);
      return this.flowLevel ? "flow" : "doc";
    }
    *parseBlockScalarHeader() {
      this.blockScalarIndent = -1;
      this.blockScalarKeep = false;
      let i = this.pos;
      while (true) {
        const ch = this.buffer[++i];
        if (ch === "+")
          this.blockScalarKeep = true;
        else if (ch > "0" && ch <= "9")
          this.blockScalarIndent = Number(ch) - 1;
        else if (ch !== "-")
          break;
      }
      return yield* this.pushUntil((ch) => isEmpty(ch) || ch === "#");
    }
    *parseBlockScalar() {
      let nl = this.pos - 1;
      let indent = 0;
      let ch;
      loop:
        for (let i2 = this.pos;ch = this.buffer[i2]; ++i2) {
          switch (ch) {
            case " ":
              indent += 1;
              break;
            case `
`:
              nl = i2;
              indent = 0;
              break;
            case "\r": {
              const next = this.buffer[i2 + 1];
              if (!next && !this.atEnd)
                return this.setNext("block-scalar");
              if (next === `
`)
                break;
            }
            default:
              break loop;
          }
        }
      if (!ch && !this.atEnd)
        return this.setNext("block-scalar");
      if (indent >= this.indentNext) {
        if (this.blockScalarIndent === -1)
          this.indentNext = indent;
        else {
          this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
        }
        do {
          const cs = this.continueScalar(nl + 1);
          if (cs === -1)
            break;
          nl = this.buffer.indexOf(`
`, cs);
        } while (nl !== -1);
        if (nl === -1) {
          if (!this.atEnd)
            return this.setNext("block-scalar");
          nl = this.buffer.length;
        }
      }
      let i = nl + 1;
      ch = this.buffer[i];
      while (ch === " ")
        ch = this.buffer[++i];
      if (ch === "\t") {
        while (ch === "\t" || ch === " " || ch === "\r" || ch === `
`)
          ch = this.buffer[++i];
        nl = i - 1;
      } else if (!this.blockScalarKeep) {
        do {
          let i2 = nl - 1;
          let ch2 = this.buffer[i2];
          if (ch2 === "\r")
            ch2 = this.buffer[--i2];
          const lastChar = i2;
          while (ch2 === " ")
            ch2 = this.buffer[--i2];
          if (ch2 === `
` && i2 >= this.pos && i2 + 1 + indent > lastChar)
            nl = i2;
          else
            break;
        } while (true);
      }
      yield cst.SCALAR;
      yield* this.pushToIndex(nl + 1, true);
      return yield* this.parseLineStart();
    }
    *parsePlainScalar() {
      const inFlow = this.flowLevel > 0;
      let end = this.pos - 1;
      let i = this.pos - 1;
      let ch;
      while (ch = this.buffer[++i]) {
        if (ch === ":") {
          const next = this.buffer[i + 1];
          if (isEmpty(next) || inFlow && flowIndicatorChars.has(next))
            break;
          end = i;
        } else if (isEmpty(ch)) {
          let next = this.buffer[i + 1];
          if (ch === "\r") {
            if (next === `
`) {
              i += 1;
              ch = `
`;
              next = this.buffer[i + 1];
            } else
              end = i;
          }
          if (next === "#" || inFlow && flowIndicatorChars.has(next))
            break;
          if (ch === `
`) {
            const cs = this.continueScalar(i + 1);
            if (cs === -1)
              break;
            i = Math.max(i, cs - 2);
          }
        } else {
          if (inFlow && flowIndicatorChars.has(ch))
            break;
          end = i;
        }
      }
      if (!ch && !this.atEnd)
        return this.setNext("plain-scalar");
      yield cst.SCALAR;
      yield* this.pushToIndex(end + 1, true);
      return inFlow ? "flow" : "doc";
    }
    *pushCount(n) {
      if (n > 0) {
        yield this.buffer.substr(this.pos, n);
        this.pos += n;
        return n;
      }
      return 0;
    }
    *pushToIndex(i, allowEmpty) {
      const s = this.buffer.slice(this.pos, i);
      if (s) {
        yield s;
        this.pos += s.length;
        return s.length;
      } else if (allowEmpty)
        yield "";
      return 0;
    }
    *pushIndicators() {
      switch (this.charAt(0)) {
        case "!":
          return (yield* this.pushTag()) + (yield* this.pushSpaces(true)) + (yield* this.pushIndicators());
        case "&":
          return (yield* this.pushUntil(isNotAnchorChar)) + (yield* this.pushSpaces(true)) + (yield* this.pushIndicators());
        case "-":
        case "?":
        case ":": {
          const inFlow = this.flowLevel > 0;
          const ch1 = this.charAt(1);
          if (isEmpty(ch1) || inFlow && flowIndicatorChars.has(ch1)) {
            if (!inFlow)
              this.indentNext = this.indentValue + 1;
            else if (this.flowKey)
              this.flowKey = false;
            return (yield* this.pushCount(1)) + (yield* this.pushSpaces(true)) + (yield* this.pushIndicators());
          }
        }
      }
      return 0;
    }
    *pushTag() {
      if (this.charAt(1) === "<") {
        let i = this.pos + 2;
        let ch = this.buffer[i];
        while (!isEmpty(ch) && ch !== ">")
          ch = this.buffer[++i];
        return yield* this.pushToIndex(ch === ">" ? i + 1 : i, false);
      } else {
        let i = this.pos + 1;
        let ch = this.buffer[i];
        while (ch) {
          if (tagChars.has(ch))
            ch = this.buffer[++i];
          else if (ch === "%" && hexDigits.has(this.buffer[i + 1]) && hexDigits.has(this.buffer[i + 2])) {
            ch = this.buffer[i += 3];
          } else
            break;
        }
        return yield* this.pushToIndex(i, false);
      }
    }
    *pushNewline() {
      const ch = this.buffer[this.pos];
      if (ch === `
`)
        return yield* this.pushCount(1);
      else if (ch === "\r" && this.charAt(1) === `
`)
        return yield* this.pushCount(2);
      else
        return 0;
    }
    *pushSpaces(allowTabs) {
      let i = this.pos - 1;
      let ch;
      do {
        ch = this.buffer[++i];
      } while (ch === " " || allowTabs && ch === "\t");
      const n = i - this.pos;
      if (n > 0) {
        yield this.buffer.substr(this.pos, n);
        this.pos = i;
      }
      return n;
    }
    *pushUntil(test) {
      let i = this.pos;
      let ch = this.buffer[i];
      while (!test(ch))
        ch = this.buffer[++i];
      return yield* this.pushToIndex(i, false);
    }
  }
  exports.Lexer = Lexer;
});

// node_modules/yaml/dist/parse/line-counter.js
var require_line_counter = __commonJS((exports) => {
  class LineCounter {
    constructor() {
      this.lineStarts = [];
      this.addNewLine = (offset) => this.lineStarts.push(offset);
      this.linePos = (offset) => {
        let low = 0;
        let high = this.lineStarts.length;
        while (low < high) {
          const mid = low + high >> 1;
          if (this.lineStarts[mid] < offset)
            low = mid + 1;
          else
            high = mid;
        }
        if (this.lineStarts[low] === offset)
          return { line: low + 1, col: 1 };
        if (low === 0)
          return { line: 0, col: offset };
        const start = this.lineStarts[low - 1];
        return { line: low, col: offset - start + 1 };
      };
    }
  }
  exports.LineCounter = LineCounter;
});

// node_modules/yaml/dist/parse/parser.js
var require_parser = __commonJS((exports) => {
  var node_process = __require("process");
  var cst = require_cst();
  var lexer = require_lexer();
  function includesToken(list, type) {
    for (let i = 0;i < list.length; ++i)
      if (list[i].type === type)
        return true;
    return false;
  }
  function findNonEmptyIndex(list) {
    for (let i = 0;i < list.length; ++i) {
      switch (list[i].type) {
        case "space":
        case "comment":
        case "newline":
          break;
        default:
          return i;
      }
    }
    return -1;
  }
  function isFlowToken(token) {
    switch (token?.type) {
      case "alias":
      case "scalar":
      case "single-quoted-scalar":
      case "double-quoted-scalar":
      case "flow-collection":
        return true;
      default:
        return false;
    }
  }
  function getPrevProps(parent) {
    switch (parent.type) {
      case "document":
        return parent.start;
      case "block-map": {
        const it = parent.items[parent.items.length - 1];
        return it.sep ?? it.start;
      }
      case "block-seq":
        return parent.items[parent.items.length - 1].start;
      default:
        return [];
    }
  }
  function getFirstKeyStartProps(prev) {
    if (prev.length === 0)
      return [];
    let i = prev.length;
    loop:
      while (--i >= 0) {
        switch (prev[i].type) {
          case "doc-start":
          case "explicit-key-ind":
          case "map-value-ind":
          case "seq-item-ind":
          case "newline":
            break loop;
        }
      }
    while (prev[++i]?.type === "space") {}
    return prev.splice(i, prev.length);
  }
  function fixFlowSeqItems(fc) {
    if (fc.start.type === "flow-seq-start") {
      for (const it of fc.items) {
        if (it.sep && !it.value && !includesToken(it.start, "explicit-key-ind") && !includesToken(it.sep, "map-value-ind")) {
          if (it.key)
            it.value = it.key;
          delete it.key;
          if (isFlowToken(it.value)) {
            if (it.value.end)
              Array.prototype.push.apply(it.value.end, it.sep);
            else
              it.value.end = it.sep;
          } else
            Array.prototype.push.apply(it.start, it.sep);
          delete it.sep;
        }
      }
    }
  }

  class Parser {
    constructor(onNewLine) {
      this.atNewLine = true;
      this.atScalar = false;
      this.indent = 0;
      this.offset = 0;
      this.onKeyLine = false;
      this.stack = [];
      this.source = "";
      this.type = "";
      this.lexer = new lexer.Lexer;
      this.onNewLine = onNewLine;
    }
    *parse(source, incomplete = false) {
      if (this.onNewLine && this.offset === 0)
        this.onNewLine(0);
      for (const lexeme of this.lexer.lex(source, incomplete))
        yield* this.next(lexeme);
      if (!incomplete)
        yield* this.end();
    }
    *next(source) {
      this.source = source;
      if (node_process.env.LOG_TOKENS)
        console.log("|", cst.prettyToken(source));
      if (this.atScalar) {
        this.atScalar = false;
        yield* this.step();
        this.offset += source.length;
        return;
      }
      const type = cst.tokenType(source);
      if (!type) {
        const message = `Not a YAML token: ${source}`;
        yield* this.pop({ type: "error", offset: this.offset, message, source });
        this.offset += source.length;
      } else if (type === "scalar") {
        this.atNewLine = false;
        this.atScalar = true;
        this.type = "scalar";
      } else {
        this.type = type;
        yield* this.step();
        switch (type) {
          case "newline":
            this.atNewLine = true;
            this.indent = 0;
            if (this.onNewLine)
              this.onNewLine(this.offset + source.length);
            break;
          case "space":
            if (this.atNewLine && source[0] === " ")
              this.indent += source.length;
            break;
          case "explicit-key-ind":
          case "map-value-ind":
          case "seq-item-ind":
            if (this.atNewLine)
              this.indent += source.length;
            break;
          case "doc-mode":
          case "flow-error-end":
            return;
          default:
            this.atNewLine = false;
        }
        this.offset += source.length;
      }
    }
    *end() {
      while (this.stack.length > 0)
        yield* this.pop();
    }
    get sourceToken() {
      const st = {
        type: this.type,
        offset: this.offset,
        indent: this.indent,
        source: this.source
      };
      return st;
    }
    *step() {
      const top = this.peek(1);
      if (this.type === "doc-end" && top?.type !== "doc-end") {
        while (this.stack.length > 0)
          yield* this.pop();
        this.stack.push({
          type: "doc-end",
          offset: this.offset,
          source: this.source
        });
        return;
      }
      if (!top)
        return yield* this.stream();
      switch (top.type) {
        case "document":
          return yield* this.document(top);
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
          return yield* this.scalar(top);
        case "block-scalar":
          return yield* this.blockScalar(top);
        case "block-map":
          return yield* this.blockMap(top);
        case "block-seq":
          return yield* this.blockSequence(top);
        case "flow-collection":
          return yield* this.flowCollection(top);
        case "doc-end":
          return yield* this.documentEnd(top);
      }
      yield* this.pop();
    }
    peek(n) {
      return this.stack[this.stack.length - n];
    }
    *pop(error) {
      const token = error ?? this.stack.pop();
      if (!token) {
        const message = "Tried to pop an empty stack";
        yield { type: "error", offset: this.offset, source: "", message };
      } else if (this.stack.length === 0) {
        yield token;
      } else {
        const top = this.peek(1);
        if (token.type === "block-scalar") {
          token.indent = "indent" in top ? top.indent : 0;
        } else if (token.type === "flow-collection" && top.type === "document") {
          token.indent = 0;
        }
        if (token.type === "flow-collection")
          fixFlowSeqItems(token);
        switch (top.type) {
          case "document":
            top.value = token;
            break;
          case "block-scalar":
            top.props.push(token);
            break;
          case "block-map": {
            const it = top.items[top.items.length - 1];
            if (it.value) {
              top.items.push({ start: [], key: token, sep: [] });
              this.onKeyLine = true;
              return;
            } else if (it.sep) {
              it.value = token;
            } else {
              Object.assign(it, { key: token, sep: [] });
              this.onKeyLine = !it.explicitKey;
              return;
            }
            break;
          }
          case "block-seq": {
            const it = top.items[top.items.length - 1];
            if (it.value)
              top.items.push({ start: [], value: token });
            else
              it.value = token;
            break;
          }
          case "flow-collection": {
            const it = top.items[top.items.length - 1];
            if (!it || it.value)
              top.items.push({ start: [], key: token, sep: [] });
            else if (it.sep)
              it.value = token;
            else
              Object.assign(it, { key: token, sep: [] });
            return;
          }
          default:
            yield* this.pop();
            yield* this.pop(token);
        }
        if ((top.type === "document" || top.type === "block-map" || top.type === "block-seq") && (token.type === "block-map" || token.type === "block-seq")) {
          const last = token.items[token.items.length - 1];
          if (last && !last.sep && !last.value && last.start.length > 0 && findNonEmptyIndex(last.start) === -1 && (token.indent === 0 || last.start.every((st) => st.type !== "comment" || st.indent < token.indent))) {
            if (top.type === "document")
              top.end = last.start;
            else
              top.items.push({ start: last.start });
            token.items.splice(-1, 1);
          }
        }
      }
    }
    *stream() {
      switch (this.type) {
        case "directive-line":
          yield { type: "directive", offset: this.offset, source: this.source };
          return;
        case "byte-order-mark":
        case "space":
        case "comment":
        case "newline":
          yield this.sourceToken;
          return;
        case "doc-mode":
        case "doc-start": {
          const doc = {
            type: "document",
            offset: this.offset,
            start: []
          };
          if (this.type === "doc-start")
            doc.start.push(this.sourceToken);
          this.stack.push(doc);
          return;
        }
      }
      yield {
        type: "error",
        offset: this.offset,
        message: `Unexpected ${this.type} token in YAML stream`,
        source: this.source
      };
    }
    *document(doc) {
      if (doc.value)
        return yield* this.lineEnd(doc);
      switch (this.type) {
        case "doc-start": {
          if (findNonEmptyIndex(doc.start) !== -1) {
            yield* this.pop();
            yield* this.step();
          } else
            doc.start.push(this.sourceToken);
          return;
        }
        case "anchor":
        case "tag":
        case "space":
        case "comment":
        case "newline":
          doc.start.push(this.sourceToken);
          return;
      }
      const bv = this.startBlockValue(doc);
      if (bv)
        this.stack.push(bv);
      else {
        yield {
          type: "error",
          offset: this.offset,
          message: `Unexpected ${this.type} token in YAML document`,
          source: this.source
        };
      }
    }
    *scalar(scalar) {
      if (this.type === "map-value-ind") {
        const prev = getPrevProps(this.peek(2));
        const start = getFirstKeyStartProps(prev);
        let sep;
        if (scalar.end) {
          sep = scalar.end;
          sep.push(this.sourceToken);
          delete scalar.end;
        } else
          sep = [this.sourceToken];
        const map = {
          type: "block-map",
          offset: scalar.offset,
          indent: scalar.indent,
          items: [{ start, key: scalar, sep }]
        };
        this.onKeyLine = true;
        this.stack[this.stack.length - 1] = map;
      } else
        yield* this.lineEnd(scalar);
    }
    *blockScalar(scalar) {
      switch (this.type) {
        case "space":
        case "comment":
        case "newline":
          scalar.props.push(this.sourceToken);
          return;
        case "scalar":
          scalar.source = this.source;
          this.atNewLine = true;
          this.indent = 0;
          if (this.onNewLine) {
            let nl = this.source.indexOf(`
`) + 1;
            while (nl !== 0) {
              this.onNewLine(this.offset + nl);
              nl = this.source.indexOf(`
`, nl) + 1;
            }
          }
          yield* this.pop();
          break;
        default:
          yield* this.pop();
          yield* this.step();
      }
    }
    *blockMap(map) {
      const it = map.items[map.items.length - 1];
      switch (this.type) {
        case "newline":
          this.onKeyLine = false;
          if (it.value) {
            const end = "end" in it.value ? it.value.end : undefined;
            const last = Array.isArray(end) ? end[end.length - 1] : undefined;
            if (last?.type === "comment")
              end?.push(this.sourceToken);
            else
              map.items.push({ start: [this.sourceToken] });
          } else if (it.sep) {
            it.sep.push(this.sourceToken);
          } else {
            it.start.push(this.sourceToken);
          }
          return;
        case "space":
        case "comment":
          if (it.value) {
            map.items.push({ start: [this.sourceToken] });
          } else if (it.sep) {
            it.sep.push(this.sourceToken);
          } else {
            if (this.atIndentedComment(it.start, map.indent)) {
              const prev = map.items[map.items.length - 2];
              const end = prev?.value?.end;
              if (Array.isArray(end)) {
                Array.prototype.push.apply(end, it.start);
                end.push(this.sourceToken);
                map.items.pop();
                return;
              }
            }
            it.start.push(this.sourceToken);
          }
          return;
      }
      if (this.indent >= map.indent) {
        const atMapIndent = !this.onKeyLine && this.indent === map.indent;
        const atNextItem = atMapIndent && (it.sep || it.explicitKey) && this.type !== "seq-item-ind";
        let start = [];
        if (atNextItem && it.sep && !it.value) {
          const nl = [];
          for (let i = 0;i < it.sep.length; ++i) {
            const st = it.sep[i];
            switch (st.type) {
              case "newline":
                nl.push(i);
                break;
              case "space":
                break;
              case "comment":
                if (st.indent > map.indent)
                  nl.length = 0;
                break;
              default:
                nl.length = 0;
            }
          }
          if (nl.length >= 2)
            start = it.sep.splice(nl[1]);
        }
        switch (this.type) {
          case "anchor":
          case "tag":
            if (atNextItem || it.value) {
              start.push(this.sourceToken);
              map.items.push({ start });
              this.onKeyLine = true;
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              it.start.push(this.sourceToken);
            }
            return;
          case "explicit-key-ind":
            if (!it.sep && !it.explicitKey) {
              it.start.push(this.sourceToken);
              it.explicitKey = true;
            } else if (atNextItem || it.value) {
              start.push(this.sourceToken);
              map.items.push({ start, explicitKey: true });
            } else {
              this.stack.push({
                type: "block-map",
                offset: this.offset,
                indent: this.indent,
                items: [{ start: [this.sourceToken], explicitKey: true }]
              });
            }
            this.onKeyLine = true;
            return;
          case "map-value-ind":
            if (it.explicitKey) {
              if (!it.sep) {
                if (includesToken(it.start, "newline")) {
                  Object.assign(it, { key: null, sep: [this.sourceToken] });
                } else {
                  const start2 = getFirstKeyStartProps(it.start);
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: start2, key: null, sep: [this.sourceToken] }]
                  });
                }
              } else if (it.value) {
                map.items.push({ start: [], key: null, sep: [this.sourceToken] });
              } else if (includesToken(it.sep, "map-value-ind")) {
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start, key: null, sep: [this.sourceToken] }]
                });
              } else if (isFlowToken(it.key) && !includesToken(it.sep, "newline")) {
                const start2 = getFirstKeyStartProps(it.start);
                const key = it.key;
                const sep = it.sep;
                sep.push(this.sourceToken);
                delete it.key;
                delete it.sep;
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: start2, key, sep }]
                });
              } else if (start.length > 0) {
                it.sep = it.sep.concat(start, this.sourceToken);
              } else {
                it.sep.push(this.sourceToken);
              }
            } else {
              if (!it.sep) {
                Object.assign(it, { key: null, sep: [this.sourceToken] });
              } else if (it.value || atNextItem) {
                map.items.push({ start, key: null, sep: [this.sourceToken] });
              } else if (includesToken(it.sep, "map-value-ind")) {
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: [], key: null, sep: [this.sourceToken] }]
                });
              } else {
                it.sep.push(this.sourceToken);
              }
            }
            this.onKeyLine = true;
            return;
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar": {
            const fs = this.flowScalar(this.type);
            if (atNextItem || it.value) {
              map.items.push({ start, key: fs, sep: [] });
              this.onKeyLine = true;
            } else if (it.sep) {
              this.stack.push(fs);
            } else {
              Object.assign(it, { key: fs, sep: [] });
              this.onKeyLine = true;
            }
            return;
          }
          default: {
            const bv = this.startBlockValue(map);
            if (bv) {
              if (bv.type === "block-seq") {
                if (!it.explicitKey && it.sep && !includesToken(it.sep, "newline")) {
                  yield* this.pop({
                    type: "error",
                    offset: this.offset,
                    message: "Unexpected block-seq-ind on same line with key",
                    source: this.source
                  });
                  return;
                }
              } else if (atMapIndent) {
                map.items.push({ start });
              }
              this.stack.push(bv);
              return;
            }
          }
        }
      }
      yield* this.pop();
      yield* this.step();
    }
    *blockSequence(seq) {
      const it = seq.items[seq.items.length - 1];
      switch (this.type) {
        case "newline":
          if (it.value) {
            const end = "end" in it.value ? it.value.end : undefined;
            const last = Array.isArray(end) ? end[end.length - 1] : undefined;
            if (last?.type === "comment")
              end?.push(this.sourceToken);
            else
              seq.items.push({ start: [this.sourceToken] });
          } else
            it.start.push(this.sourceToken);
          return;
        case "space":
        case "comment":
          if (it.value)
            seq.items.push({ start: [this.sourceToken] });
          else {
            if (this.atIndentedComment(it.start, seq.indent)) {
              const prev = seq.items[seq.items.length - 2];
              const end = prev?.value?.end;
              if (Array.isArray(end)) {
                Array.prototype.push.apply(end, it.start);
                end.push(this.sourceToken);
                seq.items.pop();
                return;
              }
            }
            it.start.push(this.sourceToken);
          }
          return;
        case "anchor":
        case "tag":
          if (it.value || this.indent <= seq.indent)
            break;
          it.start.push(this.sourceToken);
          return;
        case "seq-item-ind":
          if (this.indent !== seq.indent)
            break;
          if (it.value || includesToken(it.start, "seq-item-ind"))
            seq.items.push({ start: [this.sourceToken] });
          else
            it.start.push(this.sourceToken);
          return;
      }
      if (this.indent > seq.indent) {
        const bv = this.startBlockValue(seq);
        if (bv) {
          this.stack.push(bv);
          return;
        }
      }
      yield* this.pop();
      yield* this.step();
    }
    *flowCollection(fc) {
      const it = fc.items[fc.items.length - 1];
      if (this.type === "flow-error-end") {
        let top;
        do {
          yield* this.pop();
          top = this.peek(1);
        } while (top?.type === "flow-collection");
      } else if (fc.end.length === 0) {
        switch (this.type) {
          case "comma":
          case "explicit-key-ind":
            if (!it || it.sep)
              fc.items.push({ start: [this.sourceToken] });
            else
              it.start.push(this.sourceToken);
            return;
          case "map-value-ind":
            if (!it || it.value)
              fc.items.push({ start: [], key: null, sep: [this.sourceToken] });
            else if (it.sep)
              it.sep.push(this.sourceToken);
            else
              Object.assign(it, { key: null, sep: [this.sourceToken] });
            return;
          case "space":
          case "comment":
          case "newline":
          case "anchor":
          case "tag":
            if (!it || it.value)
              fc.items.push({ start: [this.sourceToken] });
            else if (it.sep)
              it.sep.push(this.sourceToken);
            else
              it.start.push(this.sourceToken);
            return;
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar": {
            const fs = this.flowScalar(this.type);
            if (!it || it.value)
              fc.items.push({ start: [], key: fs, sep: [] });
            else if (it.sep)
              this.stack.push(fs);
            else
              Object.assign(it, { key: fs, sep: [] });
            return;
          }
          case "flow-map-end":
          case "flow-seq-end":
            fc.end.push(this.sourceToken);
            return;
        }
        const bv = this.startBlockValue(fc);
        if (bv)
          this.stack.push(bv);
        else {
          yield* this.pop();
          yield* this.step();
        }
      } else {
        const parent = this.peek(2);
        if (parent.type === "block-map" && (this.type === "map-value-ind" && parent.indent === fc.indent || this.type === "newline" && !parent.items[parent.items.length - 1].sep)) {
          yield* this.pop();
          yield* this.step();
        } else if (this.type === "map-value-ind" && parent.type !== "flow-collection") {
          const prev = getPrevProps(parent);
          const start = getFirstKeyStartProps(prev);
          fixFlowSeqItems(fc);
          const sep = fc.end.splice(1, fc.end.length);
          sep.push(this.sourceToken);
          const map = {
            type: "block-map",
            offset: fc.offset,
            indent: fc.indent,
            items: [{ start, key: fc, sep }]
          };
          this.onKeyLine = true;
          this.stack[this.stack.length - 1] = map;
        } else {
          yield* this.lineEnd(fc);
        }
      }
    }
    flowScalar(type) {
      if (this.onNewLine) {
        let nl = this.source.indexOf(`
`) + 1;
        while (nl !== 0) {
          this.onNewLine(this.offset + nl);
          nl = this.source.indexOf(`
`, nl) + 1;
        }
      }
      return {
        type,
        offset: this.offset,
        indent: this.indent,
        source: this.source
      };
    }
    startBlockValue(parent) {
      switch (this.type) {
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
          return this.flowScalar(this.type);
        case "block-scalar-header":
          return {
            type: "block-scalar",
            offset: this.offset,
            indent: this.indent,
            props: [this.sourceToken],
            source: ""
          };
        case "flow-map-start":
        case "flow-seq-start":
          return {
            type: "flow-collection",
            offset: this.offset,
            indent: this.indent,
            start: this.sourceToken,
            items: [],
            end: []
          };
        case "seq-item-ind":
          return {
            type: "block-seq",
            offset: this.offset,
            indent: this.indent,
            items: [{ start: [this.sourceToken] }]
          };
        case "explicit-key-ind": {
          this.onKeyLine = true;
          const prev = getPrevProps(parent);
          const start = getFirstKeyStartProps(prev);
          start.push(this.sourceToken);
          return {
            type: "block-map",
            offset: this.offset,
            indent: this.indent,
            items: [{ start, explicitKey: true }]
          };
        }
        case "map-value-ind": {
          this.onKeyLine = true;
          const prev = getPrevProps(parent);
          const start = getFirstKeyStartProps(prev);
          return {
            type: "block-map",
            offset: this.offset,
            indent: this.indent,
            items: [{ start, key: null, sep: [this.sourceToken] }]
          };
        }
      }
      return null;
    }
    atIndentedComment(start, indent) {
      if (this.type !== "comment")
        return false;
      if (this.indent <= indent)
        return false;
      return start.every((st) => st.type === "newline" || st.type === "space");
    }
    *documentEnd(docEnd) {
      if (this.type !== "doc-mode") {
        if (docEnd.end)
          docEnd.end.push(this.sourceToken);
        else
          docEnd.end = [this.sourceToken];
        if (this.type === "newline")
          yield* this.pop();
      }
    }
    *lineEnd(token) {
      switch (this.type) {
        case "comma":
        case "doc-start":
        case "doc-end":
        case "flow-seq-end":
        case "flow-map-end":
        case "map-value-ind":
          yield* this.pop();
          yield* this.step();
          break;
        case "newline":
          this.onKeyLine = false;
        case "space":
        case "comment":
        default:
          if (token.end)
            token.end.push(this.sourceToken);
          else
            token.end = [this.sourceToken];
          if (this.type === "newline")
            yield* this.pop();
      }
    }
  }
  exports.Parser = Parser;
});

// node_modules/yaml/dist/public-api.js
var require_public_api = __commonJS((exports) => {
  var composer = require_composer();
  var Document = require_Document();
  var errors = require_errors();
  var log = require_log();
  var identity = require_identity();
  var lineCounter = require_line_counter();
  var parser = require_parser();
  function parseOptions(options) {
    const prettyErrors = options.prettyErrors !== false;
    const lineCounter$1 = options.lineCounter || prettyErrors && new lineCounter.LineCounter || null;
    return { lineCounter: lineCounter$1, prettyErrors };
  }
  function parseAllDocuments(source, options = {}) {
    const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
    const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
    const composer$1 = new composer.Composer(options);
    const docs = Array.from(composer$1.compose(parser$1.parse(source)));
    if (prettyErrors && lineCounter2)
      for (const doc of docs) {
        doc.errors.forEach(errors.prettifyError(source, lineCounter2));
        doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
      }
    if (docs.length > 0)
      return docs;
    return Object.assign([], { empty: true }, composer$1.streamInfo());
  }
  function parseDocument(source, options = {}) {
    const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
    const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
    const composer$1 = new composer.Composer(options);
    let doc = null;
    for (const _doc of composer$1.compose(parser$1.parse(source), true, source.length)) {
      if (!doc)
        doc = _doc;
      else if (doc.options.logLevel !== "silent") {
        doc.errors.push(new errors.YAMLParseError(_doc.range.slice(0, 2), "MULTIPLE_DOCS", "Source contains multiple documents; please use YAML.parseAllDocuments()"));
        break;
      }
    }
    if (prettyErrors && lineCounter2) {
      doc.errors.forEach(errors.prettifyError(source, lineCounter2));
      doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
    }
    return doc;
  }
  function parse(src, reviver, options) {
    let _reviver = undefined;
    if (typeof reviver === "function") {
      _reviver = reviver;
    } else if (options === undefined && reviver && typeof reviver === "object") {
      options = reviver;
    }
    const doc = parseDocument(src, options);
    if (!doc)
      return null;
    doc.warnings.forEach((warning) => log.warn(doc.options.logLevel, warning));
    if (doc.errors.length > 0) {
      if (doc.options.logLevel !== "silent")
        throw doc.errors[0];
      else
        doc.errors = [];
    }
    return doc.toJS(Object.assign({ reviver: _reviver }, options));
  }
  function stringify(value, replacer, options) {
    let _replacer = null;
    if (typeof replacer === "function" || Array.isArray(replacer)) {
      _replacer = replacer;
    } else if (options === undefined && replacer) {
      options = replacer;
    }
    if (typeof options === "string")
      options = options.length;
    if (typeof options === "number") {
      const indent = Math.round(options);
      options = indent < 1 ? undefined : indent > 8 ? { indent: 8 } : { indent };
    }
    if (value === undefined) {
      const { keepUndefined } = options ?? replacer ?? {};
      if (!keepUndefined)
        return;
    }
    if (identity.isDocument(value) && !_replacer)
      return value.toString(options);
    return new Document.Document(value, _replacer, options).toString(options);
  }
  exports.parse = parse;
  exports.parseAllDocuments = parseAllDocuments;
  exports.parseDocument = parseDocument;
  exports.stringify = stringify;
});

// node_modules/picomatch/lib/constants.js
var require_constants = __commonJS((exports, module) => {
  var WIN_SLASH = "\\\\/";
  var WIN_NO_SLASH = `[^${WIN_SLASH}]`;
  var DEFAULT_MAX_EXTGLOB_RECURSION = 0;
  var DOT_LITERAL = "\\.";
  var PLUS_LITERAL = "\\+";
  var QMARK_LITERAL = "\\?";
  var SLASH_LITERAL = "\\/";
  var ONE_CHAR = "(?=.)";
  var QMARK = "[^/]";
  var END_ANCHOR = `(?:${SLASH_LITERAL}|$)`;
  var START_ANCHOR = `(?:^|${SLASH_LITERAL})`;
  var DOTS_SLASH = `${DOT_LITERAL}{1,2}${END_ANCHOR}`;
  var NO_DOT = `(?!${DOT_LITERAL})`;
  var NO_DOTS = `(?!${START_ANCHOR}${DOTS_SLASH})`;
  var NO_DOT_SLASH = `(?!${DOT_LITERAL}{0,1}${END_ANCHOR})`;
  var NO_DOTS_SLASH = `(?!${DOTS_SLASH})`;
  var QMARK_NO_DOT = `[^.${SLASH_LITERAL}]`;
  var STAR = `${QMARK}*?`;
  var SEP = "/";
  var POSIX_CHARS = {
    DOT_LITERAL,
    PLUS_LITERAL,
    QMARK_LITERAL,
    SLASH_LITERAL,
    ONE_CHAR,
    QMARK,
    END_ANCHOR,
    DOTS_SLASH,
    NO_DOT,
    NO_DOTS,
    NO_DOT_SLASH,
    NO_DOTS_SLASH,
    QMARK_NO_DOT,
    STAR,
    START_ANCHOR,
    SEP
  };
  var WINDOWS_CHARS = {
    ...POSIX_CHARS,
    SLASH_LITERAL: `[${WIN_SLASH}]`,
    QMARK: WIN_NO_SLASH,
    STAR: `${WIN_NO_SLASH}*?`,
    DOTS_SLASH: `${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$)`,
    NO_DOT: `(?!${DOT_LITERAL})`,
    NO_DOTS: `(?!(?:^|[${WIN_SLASH}])${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
    NO_DOT_SLASH: `(?!${DOT_LITERAL}{0,1}(?:[${WIN_SLASH}]|$))`,
    NO_DOTS_SLASH: `(?!${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
    QMARK_NO_DOT: `[^.${WIN_SLASH}]`,
    START_ANCHOR: `(?:^|[${WIN_SLASH}])`,
    END_ANCHOR: `(?:[${WIN_SLASH}]|$)`,
    SEP: "\\"
  };
  var POSIX_REGEX_SOURCE = {
    __proto__: null,
    alnum: "a-zA-Z0-9",
    alpha: "a-zA-Z",
    ascii: "\\x00-\\x7F",
    blank: " \\t",
    cntrl: "\\x00-\\x1F\\x7F",
    digit: "0-9",
    graph: "\\x21-\\x7E",
    lower: "a-z",
    print: "\\x20-\\x7E ",
    punct: "\\-!\"#$%&'()\\*+,./:;<=>?@[\\]^_`{|}~",
    space: " \\t\\r\\n\\v\\f",
    upper: "A-Z",
    word: "A-Za-z0-9_",
    xdigit: "A-Fa-f0-9"
  };
  module.exports = {
    DEFAULT_MAX_EXTGLOB_RECURSION,
    MAX_LENGTH: 1024 * 64,
    POSIX_REGEX_SOURCE,
    REGEX_BACKSLASH: /\\(?![*+?^${}(|)[\]])/g,
    REGEX_NON_SPECIAL_CHARS: /^[^@![\].,$*+?^{}()|\\/]+/,
    REGEX_SPECIAL_CHARS: /[-*+?.^${}(|)[\]]/,
    REGEX_SPECIAL_CHARS_BACKREF: /(\\?)((\W)(\3*))/g,
    REGEX_SPECIAL_CHARS_GLOBAL: /([-*+?.^${}(|)[\]])/g,
    REGEX_REMOVE_BACKSLASH: /(?:\[.*?[^\\]\]|\\(?=.))/g,
    REPLACEMENTS: {
      __proto__: null,
      "***": "*",
      "**/**": "**",
      "**/**/**": "**"
    },
    CHAR_0: 48,
    CHAR_9: 57,
    CHAR_UPPERCASE_A: 65,
    CHAR_LOWERCASE_A: 97,
    CHAR_UPPERCASE_Z: 90,
    CHAR_LOWERCASE_Z: 122,
    CHAR_LEFT_PARENTHESES: 40,
    CHAR_RIGHT_PARENTHESES: 41,
    CHAR_ASTERISK: 42,
    CHAR_AMPERSAND: 38,
    CHAR_AT: 64,
    CHAR_BACKWARD_SLASH: 92,
    CHAR_CARRIAGE_RETURN: 13,
    CHAR_CIRCUMFLEX_ACCENT: 94,
    CHAR_COLON: 58,
    CHAR_COMMA: 44,
    CHAR_DOT: 46,
    CHAR_DOUBLE_QUOTE: 34,
    CHAR_EQUAL: 61,
    CHAR_EXCLAMATION_MARK: 33,
    CHAR_FORM_FEED: 12,
    CHAR_FORWARD_SLASH: 47,
    CHAR_GRAVE_ACCENT: 96,
    CHAR_HASH: 35,
    CHAR_HYPHEN_MINUS: 45,
    CHAR_LEFT_ANGLE_BRACKET: 60,
    CHAR_LEFT_CURLY_BRACE: 123,
    CHAR_LEFT_SQUARE_BRACKET: 91,
    CHAR_LINE_FEED: 10,
    CHAR_NO_BREAK_SPACE: 160,
    CHAR_PERCENT: 37,
    CHAR_PLUS: 43,
    CHAR_QUESTION_MARK: 63,
    CHAR_RIGHT_ANGLE_BRACKET: 62,
    CHAR_RIGHT_CURLY_BRACE: 125,
    CHAR_RIGHT_SQUARE_BRACKET: 93,
    CHAR_SEMICOLON: 59,
    CHAR_SINGLE_QUOTE: 39,
    CHAR_SPACE: 32,
    CHAR_TAB: 9,
    CHAR_UNDERSCORE: 95,
    CHAR_VERTICAL_LINE: 124,
    CHAR_ZERO_WIDTH_NOBREAK_SPACE: 65279,
    extglobChars(chars) {
      return {
        "!": { type: "negate", open: "(?:(?!(?:", close: `))${chars.STAR})` },
        "?": { type: "qmark", open: "(?:", close: ")?" },
        "+": { type: "plus", open: "(?:", close: ")+" },
        "*": { type: "star", open: "(?:", close: ")*" },
        "@": { type: "at", open: "(?:", close: ")" }
      };
    },
    globChars(win32) {
      return win32 === true ? WINDOWS_CHARS : POSIX_CHARS;
    }
  };
});

// node_modules/picomatch/lib/utils.js
var require_utils = __commonJS((exports) => {
  var {
    REGEX_BACKSLASH,
    REGEX_REMOVE_BACKSLASH,
    REGEX_SPECIAL_CHARS,
    REGEX_SPECIAL_CHARS_GLOBAL
  } = require_constants();
  exports.isObject = (val) => val !== null && typeof val === "object" && !Array.isArray(val);
  exports.hasRegexChars = (str) => REGEX_SPECIAL_CHARS.test(str);
  exports.isRegexChar = (str) => str.length === 1 && exports.hasRegexChars(str);
  exports.escapeRegex = (str) => str.replace(REGEX_SPECIAL_CHARS_GLOBAL, "\\$1");
  exports.toPosixSlashes = (str) => str.replace(REGEX_BACKSLASH, "/");
  exports.isWindows = () => {
    if (typeof navigator !== "undefined" && navigator.platform) {
      const platform = navigator.platform.toLowerCase();
      return platform === "win32" || platform === "windows";
    }
    if (typeof process !== "undefined" && process.platform) {
      return process.platform === "win32";
    }
    return false;
  };
  exports.removeBackslashes = (str) => {
    return str.replace(REGEX_REMOVE_BACKSLASH, (match) => {
      return match === "\\" ? "" : match;
    });
  };
  exports.escapeLast = (input, char, lastIdx) => {
    const idx = input.lastIndexOf(char, lastIdx);
    if (idx === -1)
      return input;
    if (input[idx - 1] === "\\")
      return exports.escapeLast(input, char, idx - 1);
    return `${input.slice(0, idx)}\\${input.slice(idx)}`;
  };
  exports.removePrefix = (input, state = {}) => {
    let output = input;
    if (output.startsWith("./")) {
      output = output.slice(2);
      state.prefix = "./";
    }
    return output;
  };
  exports.wrapOutput = (input, state = {}, options = {}) => {
    const prepend = options.contains ? "" : "^";
    const append = options.contains ? "" : "$";
    let output = `${prepend}(?:${input})${append}`;
    if (state.negated === true) {
      output = `(?:^(?!${output}).*$)`;
    }
    return output;
  };
  exports.basename = (path, { windows } = {}) => {
    const segs = path.split(windows ? /[\\/]/ : "/");
    const last = segs[segs.length - 1];
    if (last === "") {
      return segs[segs.length - 2];
    }
    return last;
  };
});

// node_modules/picomatch/lib/scan.js
var require_scan = __commonJS((exports, module) => {
  var utils = require_utils();
  var {
    CHAR_ASTERISK,
    CHAR_AT,
    CHAR_BACKWARD_SLASH,
    CHAR_COMMA,
    CHAR_DOT,
    CHAR_EXCLAMATION_MARK,
    CHAR_FORWARD_SLASH,
    CHAR_LEFT_CURLY_BRACE,
    CHAR_LEFT_PARENTHESES,
    CHAR_LEFT_SQUARE_BRACKET,
    CHAR_PLUS,
    CHAR_QUESTION_MARK,
    CHAR_RIGHT_CURLY_BRACE,
    CHAR_RIGHT_PARENTHESES,
    CHAR_RIGHT_SQUARE_BRACKET
  } = require_constants();
  var isPathSeparator = (code) => {
    return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
  };
  var depth = (token) => {
    if (token.isPrefix !== true) {
      token.depth = token.isGlobstar ? Infinity : 1;
    }
  };
  var scan = (input, options) => {
    const opts = options || {};
    const length = input.length - 1;
    const scanToEnd = opts.parts === true || opts.scanToEnd === true;
    const slashes = [];
    const tokens = [];
    const parts = [];
    let str = input;
    let index = -1;
    let start = 0;
    let lastIndex = 0;
    let isBrace = false;
    let isBracket = false;
    let isGlob = false;
    let isExtglob = false;
    let isGlobstar = false;
    let braceEscaped = false;
    let backslashes = false;
    let negated = false;
    let negatedExtglob = false;
    let finished = false;
    let braces = 0;
    let prev;
    let code;
    let token = { value: "", depth: 0, isGlob: false };
    const eos = () => index >= length;
    const peek = () => str.charCodeAt(index + 1);
    const advance = () => {
      prev = code;
      return str.charCodeAt(++index);
    };
    while (index < length) {
      code = advance();
      let next;
      if (code === CHAR_BACKWARD_SLASH) {
        backslashes = token.backslashes = true;
        code = advance();
        if (code === CHAR_LEFT_CURLY_BRACE) {
          braceEscaped = true;
        }
        continue;
      }
      if (braceEscaped === true || code === CHAR_LEFT_CURLY_BRACE) {
        braces++;
        while (eos() !== true && (code = advance())) {
          if (code === CHAR_BACKWARD_SLASH) {
            backslashes = token.backslashes = true;
            advance();
            continue;
          }
          if (code === CHAR_LEFT_CURLY_BRACE) {
            braces++;
            continue;
          }
          if (braceEscaped !== true && code === CHAR_DOT && (code = advance()) === CHAR_DOT) {
            isBrace = token.isBrace = true;
            isGlob = token.isGlob = true;
            finished = true;
            if (scanToEnd === true) {
              continue;
            }
            break;
          }
          if (braceEscaped !== true && code === CHAR_COMMA) {
            isBrace = token.isBrace = true;
            isGlob = token.isGlob = true;
            finished = true;
            if (scanToEnd === true) {
              continue;
            }
            break;
          }
          if (code === CHAR_RIGHT_CURLY_BRACE) {
            braces--;
            if (braces === 0) {
              braceEscaped = false;
              isBrace = token.isBrace = true;
              finished = true;
              break;
            }
          }
        }
        if (scanToEnd === true) {
          continue;
        }
        break;
      }
      if (code === CHAR_FORWARD_SLASH) {
        slashes.push(index);
        tokens.push(token);
        token = { value: "", depth: 0, isGlob: false };
        if (finished === true)
          continue;
        if (prev === CHAR_DOT && index === start + 1) {
          start += 2;
          continue;
        }
        lastIndex = index + 1;
        continue;
      }
      if (opts.noext !== true) {
        const isExtglobChar = code === CHAR_PLUS || code === CHAR_AT || code === CHAR_ASTERISK || code === CHAR_QUESTION_MARK || code === CHAR_EXCLAMATION_MARK;
        if (isExtglobChar === true && peek() === CHAR_LEFT_PARENTHESES) {
          isGlob = token.isGlob = true;
          isExtglob = token.isExtglob = true;
          finished = true;
          if (code === CHAR_EXCLAMATION_MARK && index === start) {
            negatedExtglob = true;
          }
          if (scanToEnd === true) {
            while (eos() !== true && (code = advance())) {
              if (code === CHAR_BACKWARD_SLASH) {
                backslashes = token.backslashes = true;
                code = advance();
                continue;
              }
              if (code === CHAR_RIGHT_PARENTHESES) {
                isGlob = token.isGlob = true;
                finished = true;
                break;
              }
            }
            continue;
          }
          break;
        }
      }
      if (code === CHAR_ASTERISK) {
        if (prev === CHAR_ASTERISK)
          isGlobstar = token.isGlobstar = true;
        isGlob = token.isGlob = true;
        finished = true;
        if (scanToEnd === true) {
          continue;
        }
        break;
      }
      if (code === CHAR_QUESTION_MARK) {
        isGlob = token.isGlob = true;
        finished = true;
        if (scanToEnd === true) {
          continue;
        }
        break;
      }
      if (code === CHAR_LEFT_SQUARE_BRACKET) {
        while (eos() !== true && (next = advance())) {
          if (next === CHAR_BACKWARD_SLASH) {
            backslashes = token.backslashes = true;
            advance();
            continue;
          }
          if (next === CHAR_RIGHT_SQUARE_BRACKET) {
            isBracket = token.isBracket = true;
            isGlob = token.isGlob = true;
            finished = true;
            break;
          }
        }
        if (scanToEnd === true) {
          continue;
        }
        break;
      }
      if (opts.nonegate !== true && code === CHAR_EXCLAMATION_MARK && index === start) {
        negated = token.negated = true;
        start++;
        continue;
      }
      if (opts.noparen !== true && code === CHAR_LEFT_PARENTHESES) {
        isGlob = token.isGlob = true;
        if (scanToEnd === true) {
          while (eos() !== true && (code = advance())) {
            if (code === CHAR_LEFT_PARENTHESES) {
              backslashes = token.backslashes = true;
              code = advance();
              continue;
            }
            if (code === CHAR_RIGHT_PARENTHESES) {
              finished = true;
              break;
            }
          }
          continue;
        }
        break;
      }
      if (isGlob === true) {
        finished = true;
        if (scanToEnd === true) {
          continue;
        }
        break;
      }
    }
    if (opts.noext === true) {
      isExtglob = false;
      isGlob = false;
    }
    let base = str;
    let prefix = "";
    let glob = "";
    if (start > 0) {
      prefix = str.slice(0, start);
      str = str.slice(start);
      lastIndex -= start;
    }
    if (base && isGlob === true && lastIndex > 0) {
      base = str.slice(0, lastIndex);
      glob = str.slice(lastIndex);
    } else if (isGlob === true) {
      base = "";
      glob = str;
    } else {
      base = str;
    }
    if (base && base !== "" && base !== "/" && base !== str) {
      if (isPathSeparator(base.charCodeAt(base.length - 1))) {
        base = base.slice(0, -1);
      }
    }
    if (opts.unescape === true) {
      if (glob)
        glob = utils.removeBackslashes(glob);
      if (base && backslashes === true) {
        base = utils.removeBackslashes(base);
      }
    }
    const state = {
      prefix,
      input,
      start,
      base,
      glob,
      isBrace,
      isBracket,
      isGlob,
      isExtglob,
      isGlobstar,
      negated,
      negatedExtglob
    };
    if (opts.tokens === true) {
      state.maxDepth = 0;
      if (!isPathSeparator(code)) {
        tokens.push(token);
      }
      state.tokens = tokens;
    }
    if (opts.parts === true || opts.tokens === true) {
      let prevIndex;
      for (let idx = 0;idx < slashes.length; idx++) {
        const n = prevIndex ? prevIndex + 1 : start;
        const i = slashes[idx];
        const value = input.slice(n, i);
        if (opts.tokens) {
          if (idx === 0 && start !== 0) {
            tokens[idx].isPrefix = true;
            tokens[idx].value = prefix;
          } else {
            tokens[idx].value = value;
          }
          depth(tokens[idx]);
          state.maxDepth += tokens[idx].depth;
        }
        if (idx !== 0 || value !== "") {
          parts.push(value);
        }
        prevIndex = i;
      }
      if (prevIndex && prevIndex + 1 < input.length) {
        const value = input.slice(prevIndex + 1);
        parts.push(value);
        if (opts.tokens) {
          tokens[tokens.length - 1].value = value;
          depth(tokens[tokens.length - 1]);
          state.maxDepth += tokens[tokens.length - 1].depth;
        }
      }
      state.slashes = slashes;
      state.parts = parts;
    }
    return state;
  };
  module.exports = scan;
});

// node_modules/picomatch/lib/parse.js
var require_parse = __commonJS((exports, module) => {
  var constants = require_constants();
  var utils = require_utils();
  var {
    MAX_LENGTH,
    POSIX_REGEX_SOURCE,
    REGEX_NON_SPECIAL_CHARS,
    REGEX_SPECIAL_CHARS_BACKREF,
    REPLACEMENTS
  } = constants;
  var expandRange = (args, options) => {
    if (typeof options.expandRange === "function") {
      return options.expandRange(...args, options);
    }
    args.sort();
    const value = `[${args.join("-")}]`;
    try {
      new RegExp(value);
    } catch (ex) {
      return args.map((v) => utils.escapeRegex(v)).join("..");
    }
    return value;
  };
  var syntaxError = (type, char) => {
    return `Missing ${type}: "${char}" - use "\\\\${char}" to match literal characters`;
  };
  var splitTopLevel = (input) => {
    const parts = [];
    let bracket = 0;
    let paren = 0;
    let quote = 0;
    let value = "";
    let escaped = false;
    for (const ch of input) {
      if (escaped === true) {
        value += ch;
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        value += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        quote = quote === 1 ? 0 : 1;
        value += ch;
        continue;
      }
      if (quote === 0) {
        if (ch === "[") {
          bracket++;
        } else if (ch === "]" && bracket > 0) {
          bracket--;
        } else if (bracket === 0) {
          if (ch === "(") {
            paren++;
          } else if (ch === ")" && paren > 0) {
            paren--;
          } else if (ch === "|" && paren === 0) {
            parts.push(value);
            value = "";
            continue;
          }
        }
      }
      value += ch;
    }
    parts.push(value);
    return parts;
  };
  var isPlainBranch = (branch) => {
    let escaped = false;
    for (const ch of branch) {
      if (escaped === true) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (/[?*+@!()[\]{}]/.test(ch)) {
        return false;
      }
    }
    return true;
  };
  var normalizeSimpleBranch = (branch) => {
    let value = branch.trim();
    let changed = true;
    while (changed === true) {
      changed = false;
      if (/^@\([^\\()[\]{}|]+\)$/.test(value)) {
        value = value.slice(2, -1);
        changed = true;
      }
    }
    if (!isPlainBranch(value)) {
      return;
    }
    return value.replace(/\\(.)/g, "$1");
  };
  var hasRepeatedCharPrefixOverlap = (branches) => {
    const values = branches.map(normalizeSimpleBranch).filter(Boolean);
    for (let i = 0;i < values.length; i++) {
      for (let j = i + 1;j < values.length; j++) {
        const a = values[i];
        const b = values[j];
        const char = a[0];
        if (!char || a !== char.repeat(a.length) || b !== char.repeat(b.length)) {
          continue;
        }
        if (a === b || a.startsWith(b) || b.startsWith(a)) {
          return true;
        }
      }
    }
    return false;
  };
  var parseRepeatedExtglob = (pattern, requireEnd = true) => {
    if (pattern[0] !== "+" && pattern[0] !== "*" || pattern[1] !== "(") {
      return;
    }
    let bracket = 0;
    let paren = 0;
    let quote = 0;
    let escaped = false;
    for (let i = 1;i < pattern.length; i++) {
      const ch = pattern[i];
      if (escaped === true) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        quote = quote === 1 ? 0 : 1;
        continue;
      }
      if (quote === 1) {
        continue;
      }
      if (ch === "[") {
        bracket++;
        continue;
      }
      if (ch === "]" && bracket > 0) {
        bracket--;
        continue;
      }
      if (bracket > 0) {
        continue;
      }
      if (ch === "(") {
        paren++;
        continue;
      }
      if (ch === ")") {
        paren--;
        if (paren === 0) {
          if (requireEnd === true && i !== pattern.length - 1) {
            return;
          }
          return {
            type: pattern[0],
            body: pattern.slice(2, i),
            end: i
          };
        }
      }
    }
  };
  var getStarExtglobSequenceOutput = (pattern) => {
    let index = 0;
    const chars = [];
    while (index < pattern.length) {
      const match = parseRepeatedExtglob(pattern.slice(index), false);
      if (!match || match.type !== "*") {
        return;
      }
      const branches = splitTopLevel(match.body).map((branch2) => branch2.trim());
      if (branches.length !== 1) {
        return;
      }
      const branch = normalizeSimpleBranch(branches[0]);
      if (!branch || branch.length !== 1) {
        return;
      }
      chars.push(branch);
      index += match.end + 1;
    }
    if (chars.length < 1) {
      return;
    }
    const source = chars.length === 1 ? utils.escapeRegex(chars[0]) : `[${chars.map((ch) => utils.escapeRegex(ch)).join("")}]`;
    return `${source}*`;
  };
  var repeatedExtglobRecursion = (pattern) => {
    let depth = 0;
    let value = pattern.trim();
    let match = parseRepeatedExtglob(value);
    while (match) {
      depth++;
      value = match.body.trim();
      match = parseRepeatedExtglob(value);
    }
    return depth;
  };
  var analyzeRepeatedExtglob = (body, options) => {
    if (options.maxExtglobRecursion === false) {
      return { risky: false };
    }
    const max = typeof options.maxExtglobRecursion === "number" ? options.maxExtglobRecursion : constants.DEFAULT_MAX_EXTGLOB_RECURSION;
    const branches = splitTopLevel(body).map((branch) => branch.trim());
    if (branches.length > 1) {
      if (branches.some((branch) => branch === "") || branches.some((branch) => /^[*?]+$/.test(branch)) || hasRepeatedCharPrefixOverlap(branches)) {
        return { risky: true };
      }
    }
    for (const branch of branches) {
      const safeOutput = getStarExtglobSequenceOutput(branch);
      if (safeOutput) {
        return { risky: true, safeOutput };
      }
      if (repeatedExtglobRecursion(branch) > max) {
        return { risky: true };
      }
    }
    return { risky: false };
  };
  var parse = (input, options) => {
    if (typeof input !== "string") {
      throw new TypeError("Expected a string");
    }
    input = REPLACEMENTS[input] || input;
    const opts = { ...options };
    const max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
    let len = input.length;
    if (len > max) {
      throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
    }
    const bos = { type: "bos", value: "", output: opts.prepend || "" };
    const tokens = [bos];
    const capture = opts.capture ? "" : "?:";
    const PLATFORM_CHARS = constants.globChars(opts.windows);
    const EXTGLOB_CHARS = constants.extglobChars(PLATFORM_CHARS);
    const {
      DOT_LITERAL,
      PLUS_LITERAL,
      SLASH_LITERAL,
      ONE_CHAR,
      DOTS_SLASH,
      NO_DOT,
      NO_DOT_SLASH,
      NO_DOTS_SLASH,
      QMARK,
      QMARK_NO_DOT,
      STAR,
      START_ANCHOR
    } = PLATFORM_CHARS;
    const globstar = (opts2) => {
      return `(${capture}(?:(?!${START_ANCHOR}${opts2.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
    };
    const nodot = opts.dot ? "" : NO_DOT;
    const qmarkNoDot = opts.dot ? QMARK : QMARK_NO_DOT;
    let star = opts.bash === true ? globstar(opts) : STAR;
    if (opts.capture) {
      star = `(${star})`;
    }
    if (typeof opts.noext === "boolean") {
      opts.noextglob = opts.noext;
    }
    const state = {
      input,
      index: -1,
      start: 0,
      dot: opts.dot === true,
      consumed: "",
      output: "",
      prefix: "",
      backtrack: false,
      negated: false,
      brackets: 0,
      braces: 0,
      parens: 0,
      quotes: 0,
      globstar: false,
      tokens
    };
    input = utils.removePrefix(input, state);
    len = input.length;
    const extglobs = [];
    const braces = [];
    const stack = [];
    let prev = bos;
    let value;
    const eos = () => state.index === len - 1;
    const peek = state.peek = (n = 1) => input[state.index + n];
    const advance = state.advance = () => input[++state.index] || "";
    const remaining = () => input.slice(state.index + 1);
    const consume = (value2 = "", num = 0) => {
      state.consumed += value2;
      state.index += num;
    };
    const append = (token) => {
      state.output += token.output != null ? token.output : token.value;
      consume(token.value);
    };
    const negate = () => {
      let count = 1;
      while (peek() === "!" && (peek(2) !== "(" || peek(3) === "?")) {
        advance();
        state.start++;
        count++;
      }
      if (count % 2 === 0) {
        return false;
      }
      state.negated = true;
      state.start++;
      return true;
    };
    const increment = (type) => {
      state[type]++;
      stack.push(type);
    };
    const decrement = (type) => {
      state[type]--;
      stack.pop();
    };
    const push = (tok) => {
      if (prev.type === "globstar") {
        const isBrace = state.braces > 0 && (tok.type === "comma" || tok.type === "brace");
        const isExtglob = tok.extglob === true || extglobs.length && (tok.type === "pipe" || tok.type === "paren");
        if (tok.type !== "slash" && tok.type !== "paren" && !isBrace && !isExtglob) {
          state.output = state.output.slice(0, -prev.output.length);
          prev.type = "star";
          prev.value = "*";
          prev.output = star;
          state.output += prev.output;
        }
      }
      if (extglobs.length && tok.type !== "paren") {
        extglobs[extglobs.length - 1].inner += tok.value;
      }
      if (tok.value || tok.output)
        append(tok);
      if (prev && prev.type === "text" && tok.type === "text") {
        prev.output = (prev.output || prev.value) + tok.value;
        prev.value += tok.value;
        return;
      }
      tok.prev = prev;
      tokens.push(tok);
      prev = tok;
    };
    const extglobOpen = (type, value2) => {
      const token = { ...EXTGLOB_CHARS[value2], conditions: 1, inner: "" };
      token.prev = prev;
      token.parens = state.parens;
      token.output = state.output;
      token.startIndex = state.index;
      token.tokensIndex = tokens.length;
      const output = (opts.capture ? "(" : "") + token.open;
      increment("parens");
      push({ type, value: value2, output: state.output ? "" : ONE_CHAR });
      push({ type: "paren", extglob: true, value: advance(), output });
      extglobs.push(token);
    };
    const extglobClose = (token) => {
      const literal = input.slice(token.startIndex, state.index + 1);
      const body = input.slice(token.startIndex + 2, state.index);
      const analysis = analyzeRepeatedExtglob(body, opts);
      if ((token.type === "plus" || token.type === "star") && analysis.risky) {
        const safeOutput = analysis.safeOutput ? (token.output ? "" : ONE_CHAR) + (opts.capture ? `(${analysis.safeOutput})` : analysis.safeOutput) : undefined;
        const open = tokens[token.tokensIndex];
        open.type = "text";
        open.value = literal;
        open.output = safeOutput || utils.escapeRegex(literal);
        for (let i = token.tokensIndex + 1;i < tokens.length; i++) {
          tokens[i].value = "";
          tokens[i].output = "";
          delete tokens[i].suffix;
        }
        state.output = token.output + open.output;
        state.backtrack = true;
        push({ type: "paren", extglob: true, value, output: "" });
        decrement("parens");
        return;
      }
      let output = token.close + (opts.capture ? ")" : "");
      let rest;
      if (token.type === "negate") {
        let extglobStar = star;
        if (token.inner && token.inner.length > 1 && token.inner.includes("/")) {
          extglobStar = globstar(opts);
        }
        if (extglobStar !== star || eos() || /^\)+$/.test(remaining())) {
          output = token.close = `)$))${extglobStar}`;
        }
        if (token.inner.includes("*") && (rest = remaining()) && /^\.[^\\/.]+$/.test(rest)) {
          const expression = parse(rest, { ...options, fastpaths: false }).output;
          output = token.close = `)${expression})${extglobStar})`;
        }
        if (token.prev.type === "bos") {
          state.negatedExtglob = true;
        }
      }
      push({ type: "paren", extglob: true, value, output });
      decrement("parens");
    };
    if (opts.fastpaths !== false && !/(^[*!]|[/()[\]{}"])/.test(input)) {
      let backslashes = false;
      let output = input.replace(REGEX_SPECIAL_CHARS_BACKREF, (m, esc, chars, first, rest, index) => {
        if (first === "\\") {
          backslashes = true;
          return m;
        }
        if (first === "?") {
          if (esc) {
            return esc + first + (rest ? QMARK.repeat(rest.length) : "");
          }
          if (index === 0) {
            return qmarkNoDot + (rest ? QMARK.repeat(rest.length) : "");
          }
          return QMARK.repeat(chars.length);
        }
        if (first === ".") {
          return DOT_LITERAL.repeat(chars.length);
        }
        if (first === "*") {
          if (esc) {
            return esc + first + (rest ? star : "");
          }
          return star;
        }
        return esc ? m : `\\${m}`;
      });
      if (backslashes === true) {
        if (opts.unescape === true) {
          output = output.replace(/\\/g, "");
        } else {
          output = output.replace(/\\+/g, (m) => {
            return m.length % 2 === 0 ? "\\\\" : m ? "\\" : "";
          });
        }
      }
      if (output === input && opts.contains === true) {
        state.output = input;
        return state;
      }
      state.output = utils.wrapOutput(output, state, options);
      return state;
    }
    while (!eos()) {
      value = advance();
      if (value === "\x00") {
        continue;
      }
      if (value === "\\") {
        const next = peek();
        if (next === "/" && opts.bash !== true) {
          continue;
        }
        if (next === "." || next === ";") {
          continue;
        }
        if (!next) {
          value += "\\";
          push({ type: "text", value });
          continue;
        }
        const match = /^\\+/.exec(remaining());
        let slashes = 0;
        if (match && match[0].length > 2) {
          slashes = match[0].length;
          state.index += slashes;
          if (slashes % 2 !== 0) {
            value += "\\";
          }
        }
        if (opts.unescape === true) {
          value = advance();
        } else {
          value += advance();
        }
        if (state.brackets === 0) {
          push({ type: "text", value });
          continue;
        }
      }
      if (state.brackets > 0 && (value !== "]" || prev.value === "[" || prev.value === "[^")) {
        if (opts.posix !== false && value === ":") {
          const inner = prev.value.slice(1);
          if (inner.includes("[")) {
            prev.posix = true;
            if (inner.includes(":")) {
              const idx = prev.value.lastIndexOf("[");
              const pre = prev.value.slice(0, idx);
              const rest2 = prev.value.slice(idx + 2);
              const posix = POSIX_REGEX_SOURCE[rest2];
              if (posix) {
                prev.value = pre + posix;
                state.backtrack = true;
                advance();
                if (!bos.output && tokens.indexOf(prev) === 1) {
                  bos.output = ONE_CHAR;
                }
                continue;
              }
            }
          }
        }
        if (value === "[" && peek() !== ":" || value === "-" && peek() === "]") {
          value = `\\${value}`;
        }
        if (value === "]" && (prev.value === "[" || prev.value === "[^")) {
          value = `\\${value}`;
        }
        if (opts.posix === true && value === "!" && prev.value === "[") {
          value = "^";
        }
        prev.value += value;
        append({ value });
        continue;
      }
      if (state.quotes === 1 && value !== '"') {
        value = utils.escapeRegex(value);
        prev.value += value;
        append({ value });
        continue;
      }
      if (value === '"') {
        state.quotes = state.quotes === 1 ? 0 : 1;
        if (opts.keepQuotes === true) {
          push({ type: "text", value });
        }
        continue;
      }
      if (value === "(") {
        increment("parens");
        push({ type: "paren", value });
        continue;
      }
      if (value === ")") {
        if (state.parens === 0 && opts.strictBrackets === true) {
          throw new SyntaxError(syntaxError("opening", "("));
        }
        const extglob = extglobs[extglobs.length - 1];
        if (extglob && state.parens === extglob.parens + 1) {
          extglobClose(extglobs.pop());
          continue;
        }
        push({ type: "paren", value, output: state.parens ? ")" : "\\)" });
        decrement("parens");
        continue;
      }
      if (value === "[") {
        if (opts.nobracket === true || !remaining().includes("]")) {
          if (opts.nobracket !== true && opts.strictBrackets === true) {
            throw new SyntaxError(syntaxError("closing", "]"));
          }
          value = `\\${value}`;
        } else {
          increment("brackets");
        }
        push({ type: "bracket", value });
        continue;
      }
      if (value === "]") {
        if (opts.nobracket === true || prev && prev.type === "bracket" && prev.value.length === 1) {
          push({ type: "text", value, output: `\\${value}` });
          continue;
        }
        if (state.brackets === 0) {
          if (opts.strictBrackets === true) {
            throw new SyntaxError(syntaxError("opening", "["));
          }
          push({ type: "text", value, output: `\\${value}` });
          continue;
        }
        decrement("brackets");
        const prevValue = prev.value.slice(1);
        if (prev.posix !== true && prevValue[0] === "^" && !prevValue.includes("/")) {
          value = `/${value}`;
        }
        prev.value += value;
        append({ value });
        if (opts.literalBrackets === false || utils.hasRegexChars(prevValue)) {
          continue;
        }
        const escaped = utils.escapeRegex(prev.value);
        state.output = state.output.slice(0, -prev.value.length);
        if (opts.literalBrackets === true) {
          state.output += escaped;
          prev.value = escaped;
          continue;
        }
        prev.value = `(${capture}${escaped}|${prev.value})`;
        state.output += prev.value;
        continue;
      }
      if (value === "{" && opts.nobrace !== true) {
        increment("braces");
        const open = {
          type: "brace",
          value,
          output: "(",
          outputIndex: state.output.length,
          tokensIndex: state.tokens.length
        };
        braces.push(open);
        push(open);
        continue;
      }
      if (value === "}") {
        const brace = braces[braces.length - 1];
        if (opts.nobrace === true || !brace) {
          push({ type: "text", value, output: value });
          continue;
        }
        let output = ")";
        if (brace.dots === true) {
          const arr = tokens.slice();
          const range = [];
          for (let i = arr.length - 1;i >= 0; i--) {
            tokens.pop();
            if (arr[i].type === "brace") {
              break;
            }
            if (arr[i].type !== "dots") {
              range.unshift(arr[i].value);
            }
          }
          output = expandRange(range, opts);
          state.backtrack = true;
        }
        if (brace.comma !== true && brace.dots !== true) {
          const out = state.output.slice(0, brace.outputIndex);
          const toks = state.tokens.slice(brace.tokensIndex);
          brace.value = brace.output = "\\{";
          value = output = "\\}";
          state.output = out;
          for (const t of toks) {
            state.output += t.output || t.value;
          }
        }
        push({ type: "brace", value, output });
        decrement("braces");
        braces.pop();
        continue;
      }
      if (value === "|") {
        if (extglobs.length > 0) {
          extglobs[extglobs.length - 1].conditions++;
        }
        push({ type: "text", value });
        continue;
      }
      if (value === ",") {
        let output = value;
        const brace = braces[braces.length - 1];
        if (brace && stack[stack.length - 1] === "braces") {
          brace.comma = true;
          output = "|";
        }
        push({ type: "comma", value, output });
        continue;
      }
      if (value === "/") {
        if (prev.type === "dot" && state.index === state.start + 1) {
          state.start = state.index + 1;
          state.consumed = "";
          state.output = "";
          tokens.pop();
          prev = bos;
          continue;
        }
        push({ type: "slash", value, output: SLASH_LITERAL });
        continue;
      }
      if (value === ".") {
        if (state.braces > 0 && prev.type === "dot") {
          if (prev.value === ".")
            prev.output = DOT_LITERAL;
          const brace = braces[braces.length - 1];
          prev.type = "dots";
          prev.output += value;
          prev.value += value;
          brace.dots = true;
          continue;
        }
        if (state.braces + state.parens === 0 && prev.type !== "bos" && prev.type !== "slash") {
          push({ type: "text", value, output: DOT_LITERAL });
          continue;
        }
        push({ type: "dot", value, output: DOT_LITERAL });
        continue;
      }
      if (value === "?") {
        const isGroup = prev && prev.value === "(";
        if (!isGroup && opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
          extglobOpen("qmark", value);
          continue;
        }
        if (prev && prev.type === "paren") {
          const next = peek();
          let output = value;
          if (prev.value === "(" && !/[!=<:]/.test(next) || next === "<" && !/<([!=]|\w+>)/.test(remaining())) {
            output = `\\${value}`;
          }
          push({ type: "text", value, output });
          continue;
        }
        if (opts.dot !== true && (prev.type === "slash" || prev.type === "bos")) {
          push({ type: "qmark", value, output: QMARK_NO_DOT });
          continue;
        }
        push({ type: "qmark", value, output: QMARK });
        continue;
      }
      if (value === "!") {
        if (opts.noextglob !== true && peek() === "(") {
          if (peek(2) !== "?" || !/[!=<:]/.test(peek(3))) {
            extglobOpen("negate", value);
            continue;
          }
        }
        if (opts.nonegate !== true && state.index === 0) {
          negate();
          continue;
        }
      }
      if (value === "+") {
        if (opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
          extglobOpen("plus", value);
          continue;
        }
        if (prev && prev.value === "(" || opts.regex === false) {
          push({ type: "plus", value, output: PLUS_LITERAL });
          continue;
        }
        if (prev && (prev.type === "bracket" || prev.type === "paren" || prev.type === "brace") || state.parens > 0) {
          push({ type: "plus", value });
          continue;
        }
        push({ type: "plus", value: PLUS_LITERAL });
        continue;
      }
      if (value === "@") {
        if (opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
          push({ type: "at", extglob: true, value, output: "" });
          continue;
        }
        push({ type: "text", value });
        continue;
      }
      if (value !== "*") {
        if (value === "$" || value === "^") {
          value = `\\${value}`;
        }
        const match = REGEX_NON_SPECIAL_CHARS.exec(remaining());
        if (match) {
          value += match[0];
          state.index += match[0].length;
        }
        push({ type: "text", value });
        continue;
      }
      if (prev && (prev.type === "globstar" || prev.star === true)) {
        prev.type = "star";
        prev.star = true;
        prev.value += value;
        prev.output = star;
        state.backtrack = true;
        state.globstar = true;
        consume(value);
        continue;
      }
      let rest = remaining();
      if (opts.noextglob !== true && /^\([^?]/.test(rest)) {
        extglobOpen("star", value);
        continue;
      }
      if (prev.type === "star") {
        if (opts.noglobstar === true) {
          consume(value);
          continue;
        }
        const prior = prev.prev;
        const before = prior.prev;
        const isStart = prior.type === "slash" || prior.type === "bos";
        const afterStar = before && (before.type === "star" || before.type === "globstar");
        if (opts.bash === true && (!isStart || rest[0] && rest[0] !== "/")) {
          push({ type: "star", value, output: "" });
          continue;
        }
        const isBrace = state.braces > 0 && (prior.type === "comma" || prior.type === "brace");
        const isExtglob = extglobs.length && (prior.type === "pipe" || prior.type === "paren");
        if (!isStart && prior.type !== "paren" && !isBrace && !isExtglob) {
          push({ type: "star", value, output: "" });
          continue;
        }
        while (rest.slice(0, 3) === "/**") {
          const after = input[state.index + 4];
          if (after && after !== "/") {
            break;
          }
          rest = rest.slice(3);
          consume("/**", 3);
        }
        if (prior.type === "bos" && eos()) {
          prev.type = "globstar";
          prev.value += value;
          prev.output = globstar(opts);
          state.output = prev.output;
          state.globstar = true;
          consume(value);
          continue;
        }
        if (prior.type === "slash" && prior.prev.type !== "bos" && !afterStar && eos()) {
          state.output = state.output.slice(0, -(prior.output + prev.output).length);
          prior.output = `(?:${prior.output}`;
          prev.type = "globstar";
          prev.output = globstar(opts) + (opts.strictSlashes ? ")" : "|$)");
          prev.value += value;
          state.globstar = true;
          state.output += prior.output + prev.output;
          consume(value);
          continue;
        }
        if (prior.type === "slash" && prior.prev.type !== "bos" && rest[0] === "/") {
          const end = rest[1] !== undefined ? "|$" : "";
          state.output = state.output.slice(0, -(prior.output + prev.output).length);
          prior.output = `(?:${prior.output}`;
          prev.type = "globstar";
          prev.output = `${globstar(opts)}${SLASH_LITERAL}|${SLASH_LITERAL}${end})`;
          prev.value += value;
          state.output += prior.output + prev.output;
          state.globstar = true;
          consume(value + advance());
          push({ type: "slash", value: "/", output: "" });
          continue;
        }
        if (prior.type === "bos" && rest[0] === "/") {
          prev.type = "globstar";
          prev.value += value;
          prev.output = `(?:^|${SLASH_LITERAL}|${globstar(opts)}${SLASH_LITERAL})`;
          state.output = prev.output;
          state.globstar = true;
          consume(value + advance());
          push({ type: "slash", value: "/", output: "" });
          continue;
        }
        state.output = state.output.slice(0, -prev.output.length);
        prev.type = "globstar";
        prev.output = globstar(opts);
        prev.value += value;
        state.output += prev.output;
        state.globstar = true;
        consume(value);
        continue;
      }
      const token = { type: "star", value, output: star };
      if (opts.bash === true) {
        token.output = ".*?";
        if (prev.type === "bos" || prev.type === "slash") {
          token.output = nodot + token.output;
        }
        push(token);
        continue;
      }
      if (prev && (prev.type === "bracket" || prev.type === "paren") && opts.regex === true) {
        token.output = value;
        push(token);
        continue;
      }
      if (state.index === state.start || prev.type === "slash" || prev.type === "dot") {
        if (prev.type === "dot") {
          state.output += NO_DOT_SLASH;
          prev.output += NO_DOT_SLASH;
        } else if (opts.dot === true) {
          state.output += NO_DOTS_SLASH;
          prev.output += NO_DOTS_SLASH;
        } else {
          state.output += nodot;
          prev.output += nodot;
        }
        if (peek() !== "*") {
          state.output += ONE_CHAR;
          prev.output += ONE_CHAR;
        }
      }
      push(token);
    }
    while (state.brackets > 0) {
      if (opts.strictBrackets === true)
        throw new SyntaxError(syntaxError("closing", "]"));
      state.output = utils.escapeLast(state.output, "[");
      decrement("brackets");
    }
    while (state.parens > 0) {
      if (opts.strictBrackets === true)
        throw new SyntaxError(syntaxError("closing", ")"));
      state.output = utils.escapeLast(state.output, "(");
      decrement("parens");
    }
    while (state.braces > 0) {
      if (opts.strictBrackets === true)
        throw new SyntaxError(syntaxError("closing", "}"));
      state.output = utils.escapeLast(state.output, "{");
      decrement("braces");
    }
    if (opts.strictSlashes !== true && (prev.type === "star" || prev.type === "bracket")) {
      push({ type: "maybe_slash", value: "", output: `${SLASH_LITERAL}?` });
    }
    if (state.backtrack === true) {
      state.output = "";
      for (const token of state.tokens) {
        state.output += token.output != null ? token.output : token.value;
        if (token.suffix) {
          state.output += token.suffix;
        }
      }
    }
    return state;
  };
  parse.fastpaths = (input, options) => {
    const opts = { ...options };
    const max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
    const len = input.length;
    if (len > max) {
      throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
    }
    input = REPLACEMENTS[input] || input;
    const {
      DOT_LITERAL,
      SLASH_LITERAL,
      ONE_CHAR,
      DOTS_SLASH,
      NO_DOT,
      NO_DOTS,
      NO_DOTS_SLASH,
      STAR,
      START_ANCHOR
    } = constants.globChars(opts.windows);
    const nodot = opts.dot ? NO_DOTS : NO_DOT;
    const slashDot = opts.dot ? NO_DOTS_SLASH : NO_DOT;
    const capture = opts.capture ? "" : "?:";
    const state = { negated: false, prefix: "" };
    let star = opts.bash === true ? ".*?" : STAR;
    if (opts.capture) {
      star = `(${star})`;
    }
    const globstar = (opts2) => {
      if (opts2.noglobstar === true)
        return star;
      return `(${capture}(?:(?!${START_ANCHOR}${opts2.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
    };
    const create = (str) => {
      switch (str) {
        case "*":
          return `${nodot}${ONE_CHAR}${star}`;
        case ".*":
          return `${DOT_LITERAL}${ONE_CHAR}${star}`;
        case "*.*":
          return `${nodot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;
        case "*/*":
          return `${nodot}${star}${SLASH_LITERAL}${ONE_CHAR}${slashDot}${star}`;
        case "**":
          return nodot + globstar(opts);
        case "**/*":
          return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${ONE_CHAR}${star}`;
        case "**/*.*":
          return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;
        case "**/.*":
          return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${DOT_LITERAL}${ONE_CHAR}${star}`;
        default: {
          const match = /^(.*?)\.(\w+)$/.exec(str);
          if (!match)
            return;
          const source2 = create(match[1]);
          if (!source2)
            return;
          return source2 + DOT_LITERAL + match[2];
        }
      }
    };
    const output = utils.removePrefix(input, state);
    let source = create(output);
    if (source && opts.strictSlashes !== true) {
      source += `${SLASH_LITERAL}?`;
    }
    return source;
  };
  module.exports = parse;
});

// node_modules/picomatch/lib/picomatch.js
var require_picomatch = __commonJS((exports, module) => {
  var scan = require_scan();
  var parse = require_parse();
  var utils = require_utils();
  var constants = require_constants();
  var isObject = (val) => val && typeof val === "object" && !Array.isArray(val);
  var picomatch = (glob, options, returnState = false) => {
    if (Array.isArray(glob)) {
      const fns = glob.map((input) => picomatch(input, options, returnState));
      const arrayMatcher = (str) => {
        for (const isMatch of fns) {
          const state2 = isMatch(str);
          if (state2)
            return state2;
        }
        return false;
      };
      return arrayMatcher;
    }
    const isState = isObject(glob) && glob.tokens && glob.input;
    if (glob === "" || typeof glob !== "string" && !isState) {
      throw new TypeError("Expected pattern to be a non-empty string");
    }
    const opts = options || {};
    const posix = opts.windows;
    const regex = isState ? picomatch.compileRe(glob, options) : picomatch.makeRe(glob, options, false, true);
    const state = regex.state;
    delete regex.state;
    let isIgnored = () => false;
    if (opts.ignore) {
      const ignoreOpts = { ...options, ignore: null, onMatch: null, onResult: null };
      isIgnored = picomatch(opts.ignore, ignoreOpts, returnState);
    }
    const matcher = (input, returnObject = false) => {
      const { isMatch, match, output } = picomatch.test(input, regex, options, { glob, posix });
      const result = { glob, state, regex, posix, input, output, match, isMatch };
      if (typeof opts.onResult === "function") {
        opts.onResult(result);
      }
      if (isMatch === false) {
        result.isMatch = false;
        return returnObject ? result : false;
      }
      if (isIgnored(input)) {
        if (typeof opts.onIgnore === "function") {
          opts.onIgnore(result);
        }
        result.isMatch = false;
        return returnObject ? result : false;
      }
      if (typeof opts.onMatch === "function") {
        opts.onMatch(result);
      }
      return returnObject ? result : true;
    };
    if (returnState) {
      matcher.state = state;
    }
    return matcher;
  };
  picomatch.test = (input, regex, options, { glob, posix } = {}) => {
    if (typeof input !== "string") {
      throw new TypeError("Expected input to be a string");
    }
    if (input === "") {
      return { isMatch: false, output: "" };
    }
    const opts = options || {};
    const format = opts.format || (posix ? utils.toPosixSlashes : null);
    let match = input === glob;
    let output = match && format ? format(input) : input;
    if (match === false) {
      output = format ? format(input) : input;
      match = output === glob;
    }
    if (match === false || opts.capture === true) {
      if (opts.matchBase === true || opts.basename === true) {
        match = picomatch.matchBase(input, regex, options, posix);
      } else {
        match = regex.exec(output);
      }
    }
    return { isMatch: Boolean(match), match, output };
  };
  picomatch.matchBase = (input, glob, options) => {
    const regex = glob instanceof RegExp ? glob : picomatch.makeRe(glob, options);
    return regex.test(utils.basename(input));
  };
  picomatch.isMatch = (str, patterns, options) => picomatch(patterns, options)(str);
  picomatch.parse = (pattern, options) => {
    if (Array.isArray(pattern))
      return pattern.map((p) => picomatch.parse(p, options));
    return parse(pattern, { ...options, fastpaths: false });
  };
  picomatch.scan = (input, options) => scan(input, options);
  picomatch.compileRe = (state, options, returnOutput = false, returnState = false) => {
    if (returnOutput === true) {
      return state.output;
    }
    const opts = options || {};
    const prepend = opts.contains ? "" : "^";
    const append = opts.contains ? "" : "$";
    let source = `${prepend}(?:${state.output})${append}`;
    if (state && state.negated === true) {
      source = `^(?!${source}).*$`;
    }
    const regex = picomatch.toRegex(source, options);
    if (returnState === true) {
      regex.state = state;
    }
    return regex;
  };
  picomatch.makeRe = (input, options = {}, returnOutput = false, returnState = false) => {
    if (!input || typeof input !== "string") {
      throw new TypeError("Expected a non-empty string");
    }
    let parsed = { negated: false, fastpaths: true };
    if (options.fastpaths !== false && (input[0] === "." || input[0] === "*")) {
      parsed.output = parse.fastpaths(input, options);
    }
    if (!parsed.output) {
      parsed = parse(input, options);
    }
    return picomatch.compileRe(parsed, options, returnOutput, returnState);
  };
  picomatch.toRegex = (source, options) => {
    try {
      const opts = options || {};
      return new RegExp(source, opts.flags || (opts.nocase ? "i" : ""));
    } catch (err) {
      if (options && options.debug === true)
        throw err;
      return /$^/;
    }
  };
  picomatch.constants = constants;
  module.exports = picomatch;
});

// node_modules/picomatch/index.js
var require_picomatch2 = __commonJS((exports, module) => {
  var pico = require_picomatch();
  var utils = require_utils();
  function picomatch(glob, options, returnState = false) {
    if (options && (options.windows === null || options.windows === undefined)) {
      options = { ...options, windows: utils.isWindows() };
    }
    return pico(glob, options, returnState);
  }
  Object.assign(picomatch, pico);
  module.exports = picomatch;
});

// src/audit-log.ts
import { appendFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "fs";
import { access, mkdir, writeFile } from "fs/promises";
import { join } from "path";
function toLocalISOString(date) {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absOffset = Math.abs(offsetMinutes);
  const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, "0");
  const offsetMins = String(absOffset % 60).padStart(2, "0");
  const year = date.getFullYear().toString();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}${sign}${offsetHours}:${offsetMins}`;
}
function resolveLogBaseDir(projectDir) {
  return join(projectDir, ".claude", "permissions-log");
}
var logDirGitignoreContents = `*
!.gitignore
`;
async function ensureLogDirIgnored(logBaseDir) {
  const gitignorePath = join(logBaseDir, ".gitignore");
  try {
    await access(gitignorePath);
    return;
  } catch {}
  await mkdir(logBaseDir, { recursive: true });
  await writeFile(gitignorePath, logDirGitignoreContents);
}
function resolveJsonLogPath(baseDir, now) {
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  return join(baseDir, `${year}-${month}`, day, `${hour}.json`);
}
function resolveTextLogPath(baseDir, now) {
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  return join(baseDir, `${year}-${month}`, day, `${hour}.log`);
}
function formatTextEntry(entry) {
  const time = entry.timestamp.slice(11, 19);
  switch (entry.type) {
    case "tool_request": {
      let inputSummary;
      if (typeof entry.input["command"] === "string") {
        inputSummary = entry.input["command"];
      } else if (typeof entry.input["file_path"] === "string") {
        inputSummary = entry.input["file_path"];
      } else {
        inputSummary = JSON.stringify(entry.input);
      }
      return `${time}  ${"TOOL".padEnd(9)}${entry.tool.padEnd(10)}"${inputSummary}"`;
    }
    case "rule_match": {
      const reasonPart = entry.reason ? ` "${entry.reason}"` : "";
      let content;
      if (entry.cmd !== undefined && entry.ruleFile) {
        const linePart = entry.ruleLine !== undefined ? `:${entry.ruleLine}` : "";
        content = `"${entry.cmd}" → ${entry.ruleFile}${linePart} → ${entry.decision}${reasonPart}`;
      } else if (entry.cmd !== undefined) {
        content = `"${entry.cmd}" → ${entry.decision}${reasonPart}`;
      } else if (entry.ruleFile) {
        const linePart = entry.ruleLine !== undefined ? `:${entry.ruleLine}` : "";
        content = `${entry.ruleFile}${linePart} → ${entry.decision}${reasonPart}`;
      } else {
        content = `→ ${entry.decision}${reasonPart}`;
      }
      return `${time}  ${"RULE".padEnd(9)}${"".padEnd(10)}${content}`;
    }
    case "no_rule_match": {
      return `${time}  ${"NOMATCH".padEnd(9)}${entry.nodeType.padEnd(10)}"${entry.cmd}"`;
    }
    case "aggregation": {
      const reasonPart = entry.reason ? ` "${entry.reason}"` : "";
      return `${time}  ${"NODE".padEnd(9)}${"".padEnd(10)}"${entry.cmd}" → ${entry.decision}${reasonPart}`;
    }
    case "final_decision": {
      const cmdPart = entry.cmd !== undefined ? `"${entry.cmd}" → ` : "→ ";
      const reasonPart = entry.reason ? ` "${entry.reason}"` : "";
      return `${time}  ${"RESULT".padEnd(9)}${entry.tool.padEnd(10)}${cmdPart}${entry.decision.toUpperCase()}${reasonPart}`;
    }
    case "config_load": {
      const ruleWord = entry.ruleCount === 1 ? "rule" : "rules";
      return `${time}  ${"CONFIG".padEnd(9)}${"".padEnd(10)}LOADED ${entry.filePath} (${entry.ruleCount} ${ruleWord})`;
    }
    case "tool_execution": {
      let executeSummary;
      if (typeof entry.input["command"] === "string") {
        executeSummary = entry.input["command"];
      } else if (typeof entry.input["file_path"] === "string") {
        executeSummary = entry.input["file_path"];
      } else {
        executeSummary = JSON.stringify(entry.input);
      }
      const errorPart = entry.isError ? " [ERROR]" : "";
      return `${time}  ${"EXECUTE".padEnd(9)}${entry.tool.padEnd(10)}"${executeSummary}"${errorPart}`;
    }
  }
}
function cleanupOldMonths(baseDir, now) {
  if (!existsSync(baseDir)) {
    return;
  }
  const currentMonthKey = now.getFullYear() * 12 + now.getMonth();
  for (const entry of readdirSync(baseDir)) {
    const match = entry.match(/^(\d{4})-(\d{2})$/);
    if (!match) {
      continue;
    }
    const entryYear = parseInt(match[1], 10);
    const entryMonth = parseInt(match[2], 10) - 1;
    const entryMonthKey = entryYear * 12 + entryMonth;
    if (entryMonthKey < currentMonthKey - 2) {
      rmSync(join(baseDir, entry), { recursive: true, force: true });
    }
  }
}
class CapturingAuditLogger {
  _entries = [];
  log(entry) {
    this._entries.push(entry);
  }
  getEntries() {
    return [...this._entries];
  }
  reset() {
    this._entries = [];
  }
}

class FileAuditLogger {
  baseDir;
  now;
  constructor(baseDir, now) {
    this.baseDir = baseDir;
    this.now = now;
  }
  log(entry) {
    const jsonPath = resolveJsonLogPath(this.baseDir, this.now);
    mkdirSync(join(jsonPath, ".."), { recursive: true });
    appendFileSync(jsonPath, JSON.stringify(entry) + `
`);
    const textPath = resolveTextLogPath(this.baseDir, this.now);
    appendFileSync(textPath, formatTextEntry(entry) + `
`);
  }
}
function createFileAuditLogger(logBaseDir, now) {
  return new FileAuditLogger(logBaseDir, now);
}
function createLogger(projectDir, now) {
  const logBaseDir = resolveLogBaseDir(projectDir);
  cleanupOldMonths(logBaseDir, now);
  return createFileAuditLogger(logBaseDir, now);
}
function logConfigLoad(logger, displayPath, ruleCount) {
  logger.log({
    type: "config_load",
    timestamp: toLocalISOString(new Date),
    filePath: displayPath,
    ruleCount
  });
}

// src/decision.ts
async function decideNode(ast, rules, context, logger) {
  const evaluation = await ast.evaluate(rules.rules, context, logger);
  return evaluation.decision;
}
async function decide(ast, rules, context, logger) {
  return decideNode(ast, rules, context, logger);
}

// src/load.ts
import { readFile as readFile2, readdir, stat } from "fs/promises";
import { join as join2 } from "path";

// node_modules/yaml/dist/index.js
var composer = require_composer();
var Document = require_Document();
var Schema = require_Schema();
var errors = require_errors();
var Alias = require_Alias();
var identity = require_identity();
var Pair = require_Pair();
var Scalar = require_Scalar();
var YAMLMap = require_YAMLMap();
var YAMLSeq = require_YAMLSeq();
var cst = require_cst();
var lexer = require_lexer();
var lineCounter = require_line_counter();
var parser = require_parser();
var publicApi = require_public_api();
var visit = require_visit();
var $Composer = composer.Composer;
var $Document = Document.Document;
var $Schema = Schema.Schema;
var $YAMLError = errors.YAMLError;
var $YAMLParseError = errors.YAMLParseError;
var $YAMLWarning = errors.YAMLWarning;
var $Alias = Alias.Alias;
var $isAlias = identity.isAlias;
var $isCollection = identity.isCollection;
var $isDocument = identity.isDocument;
var $isMap = identity.isMap;
var $isNode = identity.isNode;
var $isPair = identity.isPair;
var $isScalar = identity.isScalar;
var $isSeq = identity.isSeq;
var $Pair = Pair.Pair;
var $Scalar = Scalar.Scalar;
var $YAMLMap = YAMLMap.YAMLMap;
var $YAMLSeq = YAMLSeq.YAMLSeq;
var $Lexer = lexer.Lexer;
var $LineCounter = lineCounter.LineCounter;
var $Parser = parser.Parser;
var $parse = publicApi.parse;
var $parseAllDocuments = publicApi.parseAllDocuments;
var $parseDocument = publicApi.parseDocument;
var $stringify = publicApi.stringify;
var $visit = visit.visit;
var $visitAsync = visit.visitAsync;

// src/yaml-source.ts
function lineOfOffset(source, offset) {
  let line = 1;
  for (let index = 0;index < offset; index++) {
    if (source[index] === `
`) {
      line++;
    }
  }
  return line;
}
function annotateLines(node, jsValue, source, displayFile) {
  if ($isMap(node) && jsValue !== null && typeof jsValue === "object" && !Array.isArray(jsValue)) {
    const jsObject = jsValue;
    if ("decide" in jsObject && node.range) {
      jsObject["sourceLocation"] = {
        file: displayFile,
        line: lineOfOffset(source, node.range[0])
      };
    }
    for (const pair of node.items) {
      if (!$isPair(pair) || !$isScalar(pair.key)) {
        continue;
      }
      const key = String(pair.key.value);
      if (key in jsObject) {
        annotateLines(pair.value, jsObject[key], source, displayFile);
      }
    }
  } else if ($isSeq(node) && Array.isArray(jsValue)) {
    for (let index = 0;index < node.items.length; index++) {
      annotateLines(node.items[index], jsValue[index], source, displayFile);
    }
  }
}
function parsePermissionsYaml(content, displayFile) {
  const doc = $parseDocument(content);
  if (doc.errors.length > 0) {
    throw doc.errors[0];
  }
  if (!doc.contents) {
    return {};
  }
  const config = doc.toJS();
  annotateLines(doc.contents, config, content, displayFile);
  return config;
}

// src/rules/bash-rule.ts
var import_picomatch = __toESM(require_picomatch2(), 1);
import { readFile } from "fs/promises";
import { resolve } from "path";

// src/ast-nodes/ast-node.ts
function decisionRank(action) {
  if (action === "deny") {
    return 3;
  }
  if (action === "ask") {
    return 2;
  }
  if (action === "allow") {
    return 1;
  }
  return 0;
}
function pickStrictest(decisions) {
  if (decisions.length === 0) {
    return;
  }
  let strictestRank = -1;
  for (const decision of decisions) {
    const rank = decisionRank(decision.action);
    if (rank > strictestRank) {
      strictestRank = rank;
    }
  }
  let strictestAction = "";
  const reasons = [];
  for (const decision of decisions) {
    if (decisionRank(decision.action) !== strictestRank) {
      continue;
    }
    strictestAction = decision.action;
    if (decision.reason && !reasons.includes(decision.reason)) {
      reasons.push(decision.reason);
    }
  }
  if (reasons.length === 0) {
    return { action: strictestAction };
  }
  return { action: strictestAction, reason: reasons.join("; ") };
}

class AstNode {
  type;
  source;
  children;
  constructor(type, source, children) {
    this.type = type;
    this.source = source;
    this.children = children;
  }
  async evaluate(rules, context, logger) {
    const childDecisions = [];
    const ownDecisions = [];
    let workingContext = context;
    if (this.children) {
      let childNodes;
      if ("_" in this.children) {
        const positionalChildren = this.children._;
        if (!Array.isArray(positionalChildren)) {
          throw new Error("AST children `_` must be an array of positional children");
        }
        if (Object.keys(this.children).length > 1) {
          throw new Error("AST children cannot combine `_` positional children with named children");
        }
        childNodes = positionalChildren;
      } else {
        childNodes = Object.values(this.children);
      }
      for (const childNode of childNodes) {
        const childResult = await childNode.evaluate(rules, workingContext, logger);
        workingContext = childResult.context;
        if (childResult.decision) {
          childDecisions.push(childResult.decision);
        }
      }
    }
    for (const rule of rules) {
      const evaluation = await rule.evaluate(this, workingContext);
      workingContext = evaluation.context;
      if (evaluation.decision) {
        ownDecisions.push(evaluation.decision);
        logger.log({
          type: "rule_match",
          timestamp: toLocalISOString(new Date),
          ruleFile: rule.sourceLocation?.file,
          ruleLine: rule.sourceLocation?.line,
          decision: evaluation.decision.action,
          reason: evaluation.decision.reason,
          cmd: this.source,
          cwd: workingContext.cwd,
          env: { ...workingContext.env }
        });
        if (evaluation.decision.action === "deny") {
          break;
        }
      }
    }
    if (!this.children) {
      const ownDecision = pickStrictest(ownDecisions);
      if (!ownDecision) {
        logger.log({
          type: "no_rule_match",
          timestamp: toLocalISOString(new Date),
          nodeType: this.type,
          cmd: this.source,
          cwd: workingContext.cwd,
          env: { ...workingContext.env }
        });
        return {
          decision: { action: "ask" },
          context: workingContext
        };
      }
      return {
        decision: ownDecision,
        context: workingContext
      };
    }
    const childDecision = pickStrictest(childDecisions);
    if (childDecision && childDecision.action === "deny") {
      logger.log({
        type: "aggregation",
        timestamp: toLocalISOString(new Date),
        cmd: this.source,
        decision: childDecision.action,
        reason: childDecision.reason
      });
      return { decision: childDecision, context: workingContext };
    }
    const combinedDecision = pickStrictest(ownDecisions) || childDecision;
    if (combinedDecision) {
      logger.log({
        type: "aggregation",
        timestamp: toLocalISOString(new Date),
        cmd: this.source,
        decision: combinedDecision.action,
        reason: combinedDecision.reason
      });
    }
    return {
      decision: combinedDecision,
      context: workingContext
    };
  }
}

// src/rules/bash-rule.ts
class BashRule {
  commandName;
  decision;
  reason;
  requiredEnv;
  requiredCwd;
  requiredCwdInPatterns;
  subcommandPath;
  requiredCmdPatterns;
  requiredCmdInPatterns;
  requiredOptions;
  requiredOptionsIn;
  requiredOptionPatterns;
  requiredFile;
  not;
  children;
  catchAll;
  sourceLocation;
  constructor(commandName, decision, reason, requiredEnv, requiredCwd, sourceLocation) {
    this.commandName = commandName;
    this.decision = decision;
    this.reason = reason;
    this.requiredEnv = requiredEnv;
    this.requiredCwd = requiredCwd;
    this.sourceLocation = sourceLocation;
  }
  evaluateCommand(ast) {
    if (ast.type !== "command") {
      return;
    }
    const commandNode = ast;
    if (this.commandName !== commandNode.commandName) {
      return;
    }
    return commandNode;
  }
  evaluateSubcommandPath(commandNode) {
    if (!this.subcommandPath) {
      return true;
    }
    if (commandNode.positionals.length < this.subcommandPath.length) {
      return false;
    }
    for (let pathIndex = 0;pathIndex < this.subcommandPath.length; pathIndex++) {
      if (commandNode.positionals[pathIndex] !== this.subcommandPath[pathIndex]) {
        return false;
      }
    }
    return true;
  }
  evaluateRequiredEnv(commandNode, context) {
    if (!this.requiredEnv) {
      return true;
    }
    for (const [varName, expectedValue] of Object.entries(this.requiredEnv)) {
      let actualValue = context.env[varName];
      if (commandNode.envPrefix[varName] !== undefined) {
        actualValue = commandNode.envPrefix[varName];
      }
      if (!actualValue) {
        return false;
      }
      let envMatched = false;
      if (expectedValue.length >= 2 && expectedValue.startsWith("/") && expectedValue.endsWith("/")) {
        envMatched = new RegExp(expectedValue.slice(1, -1)).test(actualValue);
      } else {
        envMatched = import_picomatch.default(expectedValue, { dot: true })(actualValue);
      }
      if (!envMatched) {
        return false;
      }
    }
    return true;
  }
  evaluateEnvVarMap(envVarMap, commandNode, context) {
    if (!envVarMap) {
      return true;
    }
    for (const [varName, expectedValue] of Object.entries(envVarMap)) {
      let actualValue = context.env[varName];
      if (commandNode.envPrefix[varName] !== undefined) {
        actualValue = commandNode.envPrefix[varName];
      }
      if (!actualValue) {
        return false;
      }
      let envMatched = false;
      if (expectedValue.length >= 2 && expectedValue.startsWith("/") && expectedValue.endsWith("/")) {
        envMatched = new RegExp(expectedValue.slice(1, -1)).test(actualValue);
      } else {
        envMatched = import_picomatch.default(expectedValue, { dot: true })(actualValue);
      }
      if (!envMatched) {
        return false;
      }
    }
    return true;
  }
  evaluateFileContains(content, containsPattern) {
    if (containsPattern.startsWith("/") && containsPattern.endsWith("/")) {
      return new RegExp(containsPattern.slice(1, -1)).test(content);
    }
    if (containsPattern.includes("*") || containsPattern.includes("?") || containsPattern.includes("{")) {
      return import_picomatch.default(containsPattern, { dot: true })(content);
    }
    return content.includes(containsPattern);
  }
  async evaluateFile(path, fileMatch, context, missingFileResult) {
    let filePath = path;
    if (filePath.startsWith("~/")) {
      const homeDir = process.env["HOME"];
      if (homeDir) {
        filePath = `${homeDir}/${filePath.slice(2)}`;
      }
    }
    if (!filePath.startsWith("/")) {
      const projectDir = process.env["CLAUDE_PROJECT_DIR"] ?? context.cwd;
      filePath = resolve(projectDir, filePath);
    }
    let content;
    try {
      content = await readFile(filePath, "utf8");
    } catch {
      return missingFileResult;
    }
    if (fileMatch === true) {
      return true;
    }
    const containsPattern = fileMatch.contains;
    if (containsPattern === undefined) {
      return true;
    }
    return this.evaluateFileContains(content, containsPattern);
  }
  async evaluateFiles(requiredFile, context, missingFileResult) {
    if (!requiredFile) {
      return true;
    }
    for (const [path, fileMatch] of Object.entries(requiredFile)) {
      if (!await this.evaluateFile(path, fileMatch, context, missingFileResult)) {
        return false;
      }
    }
    return true;
  }
  async evaluateNot(commandNode, context) {
    if (!this.not) {
      return false;
    }
    if (!await this.evaluateFiles(this.not.file, context, true)) {
      return false;
    }
    if (!this.evaluateEnvVarMap(this.not.env, commandNode, context)) {
      return false;
    }
    const notCmdInPatterns = this.not["cmd-in"];
    if (notCmdInPatterns && !this.evaluateCmdInPatterns(notCmdInPatterns, commandNode, context)) {
      return false;
    }
    const notOptions = this.not.options;
    if (notOptions) {
      for (const optionName of notOptions) {
        if (!this.evaluateFlagAliasPresent(optionName, commandNode)) {
          return false;
        }
      }
    }
    const notOptionsIn = this.not["options-in"];
    if (notOptionsIn) {
      let anyOptionPresent = false;
      for (const optionName of notOptionsIn) {
        if (this.evaluateFlagAliasPresent(optionName, commandNode)) {
          anyOptionPresent = true;
          break;
        }
      }
      if (!anyOptionPresent) {
        return false;
      }
    }
    return true;
  }
  evaluateCmdInPatterns(cmdInPatterns, commandNode, context) {
    for (const cmdInPattern of cmdInPatterns) {
      for (const positional of commandNode.positionals) {
        if (this.matchCmdInPattern(cmdInPattern, positional, context)) {
          return true;
        }
      }
    }
    return false;
  }
  matchCmdInPattern(cmdInPattern, positional, context) {
    if (cmdInPattern.length >= 2 && cmdInPattern.startsWith("/") && cmdInPattern.endsWith("/")) {
      return new RegExp(cmdInPattern.slice(1, -1)).test(positional);
    }
    let positionalArg = positional;
    let cmdGlob = cmdInPattern;
    if (cmdInPattern.startsWith("./") || cmdInPattern.startsWith("/")) {
      positionalArg = resolve(context.cwd, positional);
    }
    if (cmdInPattern.startsWith("./")) {
      cmdGlob = resolve(process.env["CLAUDE_PROJECT_DIR"] ?? context.cwd, cmdInPattern);
    }
    return import_picomatch.default(cmdGlob, { dot: true })(positionalArg);
  }
  evaluateRequiredCwd(context) {
    if (!this.requiredCwd) {
      return true;
    }
    if (context.cwdResolved === false) {
      return false;
    }
    return import_picomatch.default(this.requiredCwd, { dot: true })(resolve(context.cwd));
  }
  evaluateRequiredCwdInPatterns(context) {
    if (!this.requiredCwdInPatterns) {
      return true;
    }
    if (context.cwdResolved === false) {
      return false;
    }
    for (const cwdInPattern of this.requiredCwdInPatterns) {
      let cwdGlob = cwdInPattern;
      if (cwdInPattern.startsWith("./")) {
        cwdGlob = resolve(process.env["CLAUDE_PROJECT_DIR"] ?? context.cwd, cwdInPattern);
      }
      if (import_picomatch.default(cwdGlob, { dot: true })(resolve(context.cwd))) {
        return true;
      }
    }
    return false;
  }
  evaluateRequiredCmdPatterns(commandNode, context) {
    if (!this.requiredCmdPatterns) {
      return true;
    }
    const cmdOffset = this.subcommandPath ? this.subcommandPath.length : 0;
    for (let patternIndex = 0;patternIndex < this.requiredCmdPatterns.length; patternIndex++) {
      const positional = commandNode.positionals[cmdOffset + patternIndex];
      if (!positional) {
        return false;
      }
      const cmdPattern = this.requiredCmdPatterns[patternIndex];
      let positionalArg = positional;
      let cmdGlob = cmdPattern;
      if (!(cmdPattern.length >= 2 && cmdPattern.startsWith("/") && cmdPattern.endsWith("/")) && (cmdPattern.startsWith("./") || cmdPattern.startsWith("/"))) {
        positionalArg = resolve(context.cwd, positional);
      }
      if (cmdPattern.startsWith("./")) {
        cmdGlob = resolve(process.env["CLAUDE_PROJECT_DIR"] ?? context.cwd, cmdPattern);
      }
      let cmdMatched = false;
      if (cmdPattern.length >= 2 && cmdPattern.startsWith("/") && cmdPattern.endsWith("/")) {
        cmdMatched = new RegExp(cmdPattern.slice(1, -1)).test(positionalArg);
      } else {
        cmdMatched = import_picomatch.default(cmdGlob, { dot: true })(positionalArg);
      }
      if (!cmdMatched) {
        return false;
      }
    }
    return true;
  }
  expandEnvVarsInArg(arg, envPrefix, contextEnv) {
    return arg.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (fullMatch, bracedName, bareName) => {
      const variableName = bracedName !== undefined ? bracedName : bareName;
      let replacement = contextEnv[variableName];
      if (envPrefix[variableName] !== undefined) {
        replacement = envPrefix[variableName];
      }
      return replacement !== undefined ? replacement : fullMatch;
    });
  }
  expandEnvVarsInArgs(args, envPrefix, contextEnv) {
    return args.map((arg) => {
      return this.expandEnvVarsInArg(arg, envPrefix, contextEnv);
    });
  }
  evaluateRequiredCmdInPatterns(commandNode, context) {
    if (!this.requiredCmdInPatterns) {
      return true;
    }
    const cmdOffset = this.subcommandPath ? this.subcommandPath.length : 0;
    const positionals = this.expandEnvVarsInArgs(commandNode.positionals.slice(cmdOffset), commandNode.envPrefix, context.env);
    for (const cmdInPattern of this.requiredCmdInPatterns) {
      for (const positional of positionals) {
        if (this.matchCmdInPattern(cmdInPattern, positional, context)) {
          return true;
        }
      }
    }
    return false;
  }
  evaluateFlagAliasPresent(aliasExpr, commandNode) {
    for (const alias of aliasExpr.split("|")) {
      if (alias in commandNode.options) {
        return true;
      }
    }
    return false;
  }
  evaluateRequiredOptions(commandNode) {
    if (!this.requiredOptions) {
      return true;
    }
    for (const requiredOption of this.requiredOptions) {
      if (!this.evaluateFlagAliasPresent(requiredOption, commandNode)) {
        return false;
      }
    }
    return true;
  }
  evaluateRequiredOptionsIn(commandNode) {
    if (!this.requiredOptionsIn) {
      return true;
    }
    for (const requiredOption of this.requiredOptionsIn) {
      if (this.evaluateFlagAliasPresent(requiredOption, commandNode)) {
        return true;
      }
    }
    return false;
  }
  evaluateRequiredOptionPatterns(commandNode) {
    if (!this.requiredOptionPatterns) {
      return true;
    }
    for (const [flagName, pattern] of Object.entries(this.requiredOptionPatterns)) {
      const flagValue = commandNode.options[flagName];
      if (typeof flagValue !== "string") {
        return false;
      }
      let optionMatched = false;
      if (pattern.length >= 2 && pattern.startsWith("/") && pattern.endsWith("/")) {
        optionMatched = new RegExp(pattern.slice(1, -1)).test(flagValue);
      } else {
        optionMatched = import_picomatch.default(pattern, { dot: true })(flagValue);
      }
      if (!optionMatched) {
        return false;
      }
    }
    return true;
  }
  async evaluate(ast, context) {
    const commandNode = this.evaluateCommand(ast);
    if (!commandNode) {
      return { context };
    }
    if (!this.evaluateSubcommandPath(commandNode)) {
      return { context };
    }
    if (!this.evaluateRequiredEnv(commandNode, context)) {
      return { context };
    }
    if (!this.evaluateRequiredCwd(context)) {
      return { context };
    }
    if (!this.evaluateRequiredCwdInPatterns(context)) {
      return { context };
    }
    if (!this.evaluateRequiredCmdPatterns(commandNode, context)) {
      return { context };
    }
    if (!this.evaluateRequiredCmdInPatterns(commandNode, context)) {
      return { context };
    }
    if (!this.evaluateRequiredOptions(commandNode)) {
      return { context };
    }
    if (!this.evaluateRequiredOptionsIn(commandNode)) {
      return { context };
    }
    if (!this.evaluateRequiredOptionPatterns(commandNode)) {
      return { context };
    }
    if (!await this.evaluateFiles(this.requiredFile, context, false)) {
      return { context };
    }
    if (await this.evaluateNot(commandNode, context)) {
      return { context };
    }
    if (this.children || this.catchAll) {
      const childDecisions = [];
      let workingContext = context;
      if (this.children) {
        for (const child of this.children) {
          const childEvaluation = await child.evaluate(ast, workingContext);
          workingContext = childEvaluation.context;
          if (childEvaluation.decision) {
            childDecisions.push(childEvaluation.decision);
          }
        }
      }
      const childDecision = pickStrictest(childDecisions);
      if (childDecision) {
        return {
          decision: childDecision,
          context: workingContext
        };
      }
      if (this.catchAll) {
        return this.catchAll.evaluate(ast, workingContext);
      }
      return {
        context: workingContext
      };
    }
    return {
      decision: {
        action: this.decision,
        reason: this.reason
      },
      context
    };
  }
}

// src/rules/bash-rule-factory.ts
var COMMAND_RULE_FIELDS = new Set([
  "decide",
  "reason",
  "cwd",
  "cwd-in",
  "path",
  "env",
  "cmd",
  "cmd-in",
  "options",
  "options-in",
  "file",
  "sourceLocation",
  "not"
]);
var KNOWN_FIELDS = new Set([
  ...COMMAND_RULE_FIELDS,
  "rules"
]);
var NOT_KNOWN_FIELDS = new Set([
  "env",
  "file",
  "cmd-in",
  "options",
  "options-in"
]);

class BashRuleFactory {
  load(bashConfig) {
    if (!bashConfig || typeof bashConfig !== "object" || Array.isArray(bashConfig)) {
      throw new Error("permissions.yaml: bash must be an object");
    }
    const rules = [];
    for (const [commandName, value] of Object.entries(bashConfig)) {
      const entries = Array.isArray(value) ? value : [value];
      const children = [];
      let catchAll;
      let hasSubcommandEntry = false;
      for (let entryIndex = 0;entryIndex < entries.length; entryIndex++) {
        const entry = entries[entryIndex];
        if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
          throw new Error(`permissions.yaml: bash.${commandName} must contain only rule objects`);
        }
        const loadedRules = this.loadBashEntry(entry, commandName, []);
        const isLast = entryIndex === entries.length - 1;
        if (isLast && typeof entry.decide === "string" && hasSubcommandEntry) {
          catchAll = loadedRules[loadedRules.length - 1];
        } else {
          children.push(...loadedRules);
          if (typeof entry.decide !== "string") {
            hasSubcommandEntry = true;
          }
        }
      }
      if (!catchAll) {
        rules.push(...children);
      } else {
        const listRule = new BashRule(commandName, "", undefined, undefined, undefined, undefined);
        listRule.children = children;
        listRule.catchAll = catchAll;
        rules.push(listRule);
      }
    }
    return rules;
  }
  loadBashEntry(bashEntry, commandName, subcommandPath) {
    if (!bashEntry || typeof bashEntry !== "object" || Array.isArray(bashEntry)) {
      throw new Error(`permissions.yaml: bash.${commandName} must contain only rule objects`);
    }
    if (typeof bashEntry.decide === "string") {
      return [this.loadCommandRule(bashEntry, commandName, subcommandPath, bashEntry.decide)];
    }
    return this.loadSubcommandsOrRules(bashEntry, commandName, subcommandPath);
  }
  expandProjectDirToken(pattern) {
    let expanded = pattern;
    const projectDirToken = "${{PROJECT_DIR}}";
    if (expanded.includes(projectDirToken)) {
      const projectDir = process.env["CLAUDE_PROJECT_DIR"];
      if (projectDir) {
        expanded = expanded.split(projectDirToken).join(projectDir);
      }
    }
    const homeToken = "${{HOME}}";
    if (expanded.includes(homeToken)) {
      const homeDir = process.env["HOME"];
      if (homeDir) {
        expanded = expanded.split(homeToken).join(homeDir);
      }
    }
    return expanded;
  }
  expandTildePath(filePath) {
    if (!filePath.startsWith("~/")) {
      return filePath;
    }
    const homeDir = process.env["HOME"];
    if (!homeDir) {
      return filePath;
    }
    return `${homeDir}/${filePath.slice(2)}`;
  }
  loadCommandRule(bashEntry, commandName, subcommandPath, decide2) {
    for (const entryKey of Object.keys(bashEntry)) {
      if (!COMMAND_RULE_FIELDS.has(entryKey)) {
        throw new Error(`permissions.yaml: bash.${commandName} unknown field '${entryKey}'`);
      }
    }
    const reason = bashEntry.reason;
    if (reason && typeof reason !== "string") {
      throw new Error(`permissions.yaml: bash.${commandName} reason must be a string`);
    }
    const requiredEnv = this.loadRequiredEnv(commandName, bashEntry.env);
    const cwdField = bashEntry.cwd !== undefined ? bashEntry.cwd : bashEntry.path;
    let requiredCwd;
    if (cwdField) {
      if (typeof cwdField !== "string") {
        throw new Error(`permissions.yaml: bash.${commandName} cwd must be a string`);
      }
      requiredCwd = this.expandProjectDirToken(cwdField);
    }
    const cwdInField = bashEntry["cwd-in"];
    let requiredCwdInPatterns;
    if (cwdInField) {
      if (!Array.isArray(cwdInField)) {
        throw new Error(`permissions.yaml: bash.${commandName} cwd-in must be an array`);
      }
      requiredCwdInPatterns = [];
      for (const cwdInPattern of cwdInField) {
        if (typeof cwdInPattern !== "string") {
          throw new Error(`permissions.yaml: bash.${commandName} cwd-in must contain only strings`);
        }
        requiredCwdInPatterns.push(cwdInPattern);
      }
    }
    const cmdField = bashEntry.cmd;
    let requiredCmdPatterns;
    if (cmdField) {
      if (typeof cmdField === "string") {
        requiredCmdPatterns = cmdField.trim().split(/\s+/).map((cmdPattern) => this.expandProjectDirToken(cmdPattern));
      } else if (Array.isArray(cmdField)) {
        requiredCmdPatterns = [];
        for (const cmdPattern of cmdField) {
          if (typeof cmdPattern !== "string") {
            throw new Error(`permissions.yaml: bash.${commandName} cmd must contain only strings`);
          }
          requiredCmdPatterns.push(cmdPattern);
        }
      } else {
        throw new Error(`permissions.yaml: bash.${commandName} cmd must be a string or array`);
      }
    }
    const cmdInField = bashEntry["cmd-in"];
    let requiredCmdInPatterns;
    if (cmdInField) {
      if (!Array.isArray(cmdInField)) {
        throw new Error(`permissions.yaml: bash.${commandName} cmd-in must be an array`);
      }
      requiredCmdInPatterns = [];
      for (const cmdInPattern of cmdInField) {
        if (typeof cmdInPattern !== "string") {
          throw new Error(`permissions.yaml: bash.${commandName} cmd-in must contain only strings`);
        }
        requiredCmdInPatterns.push(this.expandProjectDirToken(cmdInPattern));
      }
    }
    const optionsField = bashEntry.options;
    let requiredOptions;
    let requiredOptionPatterns;
    if (optionsField) {
      if (Array.isArray(optionsField)) {
        requiredOptions = [];
        for (const optionName of optionsField) {
          if (typeof optionName !== "string") {
            throw new Error(`permissions.yaml: bash.${commandName} options must contain only strings`);
          }
          requiredOptions.push(optionName);
        }
      } else if (!optionsField || typeof optionsField !== "object") {
        throw new Error(`permissions.yaml: bash.${commandName} options must be an array or object`);
      } else {
        requiredOptionPatterns = {};
        for (const [flagName, pattern] of Object.entries(optionsField)) {
          if (typeof pattern === "boolean") {
            if (pattern) {
              if (!requiredOptions) {
                requiredOptions = [];
              }
              requiredOptions.push(flagName);
            } else {
              throw new Error(`permissions.yaml: bash.${commandName} options.${flagName} must be true when boolean`);
            }
          } else if (typeof pattern === "string") {
            if (!requiredOptionPatterns) {
              requiredOptionPatterns = {};
            }
            requiredOptionPatterns[flagName] = pattern;
          } else {
            throw new Error(`permissions.yaml: bash.${commandName} options.${flagName} must be a string or true`);
          }
        }
      }
    }
    const sourceLocation = bashEntry.sourceLocation;
    const rule = new BashRule(commandName, decide2, reason, requiredEnv, requiredCwd, sourceLocation);
    if (subcommandPath.length > 0) {
      rule.subcommandPath = subcommandPath;
    }
    if (requiredCwdInPatterns) {
      rule.requiredCwdInPatterns = requiredCwdInPatterns;
    }
    if (requiredCmdPatterns) {
      rule.requiredCmdPatterns = requiredCmdPatterns;
    }
    if (requiredCmdInPatterns) {
      rule.requiredCmdInPatterns = requiredCmdInPatterns;
    }
    if (requiredOptions) {
      rule.requiredOptions = requiredOptions;
    }
    if (requiredOptionPatterns) {
      rule.requiredOptionPatterns = requiredOptionPatterns;
    }
    const optionsInField = bashEntry["options-in"];
    let requiredOptionsIn;
    if (optionsInField) {
      if (!Array.isArray(optionsInField)) {
        throw new Error(`permissions.yaml: bash.${commandName} options-in must be an array`);
      }
      requiredOptionsIn = [];
      for (const optionName of optionsInField) {
        if (typeof optionName !== "string") {
          throw new Error(`permissions.yaml: bash.${commandName} options-in must contain only strings`);
        }
        requiredOptionsIn.push(optionName);
      }
    }
    if (requiredOptionsIn) {
      rule.requiredOptionsIn = requiredOptionsIn;
    }
    const requiredFile = this.loadFileField(commandName, bashEntry.file);
    if (requiredFile) {
      rule.requiredFile = requiredFile;
    }
    const notField = bashEntry.not;
    if (notField) {
      rule.not = this.loadNotFields(commandName, notField);
    }
    return rule;
  }
  loadSubcommandsOrRules(bashEntry, commandName, subcommandPath) {
    const loadedRules = [];
    const hasSubcommandKey = this.entryHasSubcommandKey(bashEntry);
    for (const [entryKey, entryValue] of Object.entries(bashEntry)) {
      if (this.isKnownRuleField(entryKey, entryValue)) {
        if (hasSubcommandKey) {
          throw new Error(`permissions.yaml: bash.${commandName} unknown field '${entryKey}'`);
        }
        if (entryKey === "rules") {
          loadedRules.push(...this.loadIntermediateRulesEntry(bashEntry, commandName, subcommandPath));
        }
        continue;
      }
      loadedRules.push(...this.loadNestedSubcommandEntry(commandName, subcommandPath, entryKey, entryValue));
    }
    return loadedRules;
  }
  entryHasSubcommandKey(bashEntry) {
    for (const [entryKey, entryValue] of Object.entries(bashEntry)) {
      if (this.isKnownRuleField(entryKey, entryValue)) {
        continue;
      }
      if (entryValue && typeof entryValue === "object") {
        return true;
      }
    }
    return false;
  }
  isKnownRuleField(entryKey, entryValue) {
    if (!KNOWN_FIELDS.has(entryKey)) {
      return false;
    }
    if (entryKey === "env") {
      return this.isEnvMatcherMap(entryValue);
    }
    if (entryKey === "options") {
      return this.isOptionsMatcher(entryValue);
    }
    return true;
  }
  isEnvMatcherMap(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return false;
    }
    if ("decide" in value || "rules" in value || "not" in value) {
      return false;
    }
    for (const envValue of Object.values(value)) {
      if (typeof envValue !== "string") {
        return false;
      }
    }
    return true;
  }
  isOptionsMatcher(value) {
    if (Array.isArray(value)) {
      return true;
    }
    if (!value || typeof value !== "object") {
      return false;
    }
    if ("decide" in value || "rules" in value || "not" in value) {
      return false;
    }
    for (const optionValue of Object.values(value)) {
      if (typeof optionValue !== "string") {
        return false;
      }
    }
    return true;
  }
  loadIntermediateRulesEntry(bashEntry, commandName, subcommandPath) {
    const rulesList = bashEntry.rules;
    if (!Array.isArray(rulesList)) {
      throw new Error(`permissions.yaml: bash.${commandName} rules must be an array`);
    }
    const guardEntry = {};
    for (const [entryKey, entryValue] of Object.entries(bashEntry)) {
      if (entryKey === "rules") {
        continue;
      }
      guardEntry[entryKey] = entryValue;
    }
    const branchRule = this.loadCommandRule(guardEntry, commandName, subcommandPath, "");
    const children = [];
    let catchAll;
    for (let entryIndex = 0;entryIndex < rulesList.length; entryIndex++) {
      const ruleEntry = rulesList[entryIndex];
      if (ruleEntry === null || typeof ruleEntry !== "object" || Array.isArray(ruleEntry)) {
        throw new Error(`permissions.yaml: bash.${commandName} rules must contain only rule objects`);
      }
      const loadedRules = this.loadBashEntry(ruleEntry, commandName, subcommandPath);
      const isLast = entryIndex === rulesList.length - 1;
      if (isLast && typeof ruleEntry.decide === "string" && children.length > 0) {
        catchAll = loadedRules[loadedRules.length - 1];
      } else {
        children.push(...loadedRules);
      }
    }
    branchRule.children = children;
    if (catchAll) {
      branchRule.catchAll = catchAll;
    }
    return [branchRule];
  }
  loadNestedSubcommandEntry(commandName, subcommandPath, subcommandKey, entryValue) {
    if (!entryValue || typeof entryValue !== "object") {
      throw new Error(`permissions.yaml: bash.${commandName} unknown field '${subcommandKey}'`);
    }
    const subEntries = Array.isArray(entryValue) ? entryValue : [entryValue];
    const loadedRules = [];
    for (const subEntry of subEntries) {
      if (typeof subEntry === "string") {
        throw new Error(`permissions.yaml: bash.${commandName} unknown field '${subcommandKey}'`);
      }
      loadedRules.push(...this.loadBashEntry(subEntry, commandName, subcommandPath.concat(subcommandKey)));
    }
    return loadedRules;
  }
  loadNotFields(commandName, notField) {
    if (!notField || typeof notField !== "object" || Array.isArray(notField)) {
      throw new Error(`permissions.yaml: bash.${commandName} not must be an object`);
    }
    for (const notKey of Object.keys(notField)) {
      if (!NOT_KNOWN_FIELDS.has(notKey)) {
        throw new Error(`permissions.yaml: bash.${commandName} not unknown field '${notKey}'`);
      }
    }
    const parsedNot = {};
    const env = this.loadRequiredEnv(commandName, notField.env);
    if (env) {
      parsedNot.env = env;
    }
    const file = this.loadFileField(commandName, notField.file);
    if (file) {
      parsedNot.file = file;
    }
    const cmdInField = notField["cmd-in"];
    if (cmdInField) {
      if (!Array.isArray(cmdInField)) {
        throw new Error(`permissions.yaml: bash.${commandName} not cmd-in must be an array`);
      }
      const cmdInPatterns = [];
      for (const cmdInPattern of cmdInField) {
        if (typeof cmdInPattern !== "string") {
          throw new Error(`permissions.yaml: bash.${commandName} not cmd-in must contain only strings`);
        }
        cmdInPatterns.push(this.expandProjectDirToken(cmdInPattern));
      }
      parsedNot["cmd-in"] = cmdInPatterns;
    }
    const optionsField = notField.options;
    if (optionsField) {
      if (!Array.isArray(optionsField)) {
        throw new Error(`permissions.yaml: bash.${commandName} not options must be an array`);
      }
      const optionNames = [];
      for (const optionName of optionsField) {
        if (typeof optionName !== "string") {
          throw new Error(`permissions.yaml: bash.${commandName} not options must contain only strings`);
        }
        optionNames.push(optionName);
      }
      parsedNot.options = optionNames;
    }
    const optionsInField = notField["options-in"];
    if (optionsInField) {
      if (!Array.isArray(optionsInField)) {
        throw new Error(`permissions.yaml: bash.${commandName} not options-in must be an array`);
      }
      const optionsInPatterns = [];
      for (const optionName of optionsInField) {
        if (typeof optionName !== "string") {
          throw new Error(`permissions.yaml: bash.${commandName} not options-in must contain only strings`);
        }
        optionsInPatterns.push(optionName);
      }
      parsedNot["options-in"] = optionsInPatterns;
    }
    return parsedNot;
  }
  loadRequiredEnv(commandName, envVarMap) {
    if (!envVarMap) {
      return;
    }
    if (!envVarMap || typeof envVarMap !== "object" || Array.isArray(envVarMap)) {
      throw new Error(`permissions.yaml: bash.${commandName} env must be an object`);
    }
    const parsedEnv = {};
    for (const [varName, envValue] of Object.entries(envVarMap)) {
      if (typeof envValue !== "string") {
        throw new Error(`permissions.yaml: bash.${commandName} env.${varName} must be a string`);
      }
      parsedEnv[varName] = envValue;
    }
    return parsedEnv;
  }
  loadFileField(commandName, fileField) {
    if (!fileField) {
      return;
    }
    if (!fileField || typeof fileField !== "object" || Array.isArray(fileField)) {
      throw new Error(`permissions.yaml: bash.${commandName} file must be an object`);
    }
    const parsedFile = {};
    for (const [filePath, fileMatch] of Object.entries(fileField)) {
      if (typeof filePath !== "string") {
        throw new Error(`permissions.yaml: bash.${commandName} file keys must be strings`);
      }
      const expandedPath = this.expandTildePath(this.expandProjectDirToken(filePath));
      if (fileMatch === true) {
        parsedFile[expandedPath] = {};
        continue;
      }
      if (!fileMatch || typeof fileMatch !== "object" || Array.isArray(fileMatch)) {
        throw new Error(`permissions.yaml: bash.${commandName} file.${filePath} must be an object or true`);
      }
      const containsValue = fileMatch.contains;
      if (containsValue !== undefined && typeof containsValue !== "string") {
        throw new Error(`permissions.yaml: bash.${commandName} file.${filePath}.contains must be a string`);
      }
      parsedFile[expandedPath] = containsValue !== undefined ? { contains: containsValue } : {};
    }
    return parsedFile;
  }
}

// src/rules/builtin/cd-rule.ts
import { resolve as resolve2 } from "path";

class CdRule {
  async evaluate(ast, context) {
    if (ast.type !== "command") {
      return { context };
    }
    const commandNode = ast;
    if (commandNode.commandName !== "cd") {
      return { context };
    }
    if (commandNode.positionals.length === 0) {
      return { context };
    }
    const target = commandNode.positionals[0];
    if (target.includes("$")) {
      return {
        context: {
          cwd: context.cwd,
          cwdResolved: false,
          env: context.env
        }
      };
    }
    const newCwd = resolve2(context.cwd, target);
    return {
      context: {
        cwd: newCwd,
        env: context.env
      }
    };
  }
}

// src/rules/builtin/empty-command-rule.ts
class EmptyCommandRule {
  async evaluate(ast, context) {
    if (ast.type !== "command") {
      return { context };
    }
    const commandNode = ast;
    if (commandNode.commandName !== "") {
      return { context };
    }
    if (Object.keys(commandNode.envPrefix).length === 0) {
      return { context };
    }
    return {
      decision: {
        action: "allow"
      },
      context: {
        cwd: context.cwd,
        env: { ...context.env, ...commandNode.envPrefix }
      }
    };
  }
}

// src/rules/builtin/export-rule.ts
class ExportRule {
  async evaluate(ast, context) {
    if (ast.type !== "command") {
      return { context };
    }
    const commandNode = ast;
    if (commandNode.commandName !== "export") {
      return { context };
    }
    let hasKeyValueToken = false;
    const updates = {};
    for (const token of commandNode.positionals) {
      const eqIndex = token.indexOf("=");
      if (eqIndex > 0) {
        hasKeyValueToken = true;
        updates[token.slice(0, eqIndex)] = token.slice(eqIndex + 1);
      }
    }
    if (!hasKeyValueToken) {
      return { context };
    }
    return {
      decision: {
        action: "allow",
        reason: "set environment variable"
      },
      context: {
        cwd: context.cwd,
        env: { ...context.env, ...updates }
      }
    };
  }
}

// src/rules/builtin/index.ts
var builtinRules = [
  new CdRule,
  new EmptyCommandRule,
  new ExportRule
];

// src/rules/file-tool-rule.ts
var import_picomatch2 = __toESM(require_picomatch2(), 1);
class FileToolRule {
  toolType;
  pathIn;
  decision;
  reason;
  requiredCwd;
  children;
  catchAll;
  sourceLocation;
  constructor(toolType, pathIn, decision, reason, sourceLocation) {
    this.toolType = toolType;
    this.pathIn = pathIn;
    this.decision = decision;
    this.reason = reason;
    this.sourceLocation = sourceLocation;
  }
  evaluateRequiredCwd(context) {
    if (!this.requiredCwd) {
      return true;
    }
    if (context.cwdResolved === false) {
      return false;
    }
    return import_picomatch2.default(this.requiredCwd, { dot: true })(context.cwd);
  }
  async evaluate(ast, context) {
    if (ast.type !== this.toolType) {
      return { context };
    }
    if (!this.evaluateRequiredCwd(context)) {
      return { context };
    }
    const fileNode = ast;
    if (this.pathIn.length > 0) {
      let matched = false;
      for (const pathEntry of this.pathIn) {
        if (import_picomatch2.default(pathEntry, { dot: true })(fileNode.file_path)) {
          matched = true;
          break;
        }
      }
      if (!matched) {
        return { context };
      }
    }
    if (this.children || this.catchAll) {
      const childDecisions = [];
      let workingContext = context;
      if (this.children) {
        for (const child of this.children) {
          const childEvaluation = await child.evaluate(ast, workingContext);
          workingContext = childEvaluation.context;
          if (childEvaluation.decision) {
            childDecisions.push(childEvaluation.decision);
          }
        }
      }
      const childDecision = pickStrictest(childDecisions);
      if (childDecision) {
        return {
          decision: childDecision,
          context: workingContext
        };
      }
      if (this.catchAll) {
        return this.catchAll.evaluate(ast, workingContext);
      }
      return {
        context: workingContext
      };
    }
    const decision = {
      action: this.decision
    };
    if (this.reason !== undefined) {
      decision.reason = this.reason;
    }
    return {
      decision,
      context
    };
  }
}

// src/rules/file-tool-rule-factory.ts
var FILE_TOOL_DECIDE_FIELDS = new Set([
  "decide",
  "reason",
  "path",
  "path-in",
  "cwd",
  "sourceLocation"
]);
var FILE_TOOL_KNOWN_FIELDS = new Set([
  ...FILE_TOOL_DECIDE_FIELDS,
  "rules"
]);

class FileToolRuleFactory {
  toolType;
  constructor(toolType) {
    this.toolType = toolType;
  }
  load(fileToolConfig) {
    if (!fileToolConfig || typeof fileToolConfig !== "object") {
      throw new Error(`permissions.yaml: ${this.toolType} must be an object or array`);
    }
    const entries = Array.isArray(fileToolConfig) ? fileToolConfig : [fileToolConfig];
    const children = [];
    let catchAll;
    let hasConstrainedEntry = false;
    for (let entryIndex = 0;entryIndex < entries.length; entryIndex++) {
      const entry = entries[entryIndex];
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        throw new Error(`permissions.yaml: ${this.toolType} must contain only rule objects`);
      }
      const loadedRules = this.loadFileToolEntry(entry, undefined);
      const isLast = entryIndex === entries.length - 1;
      if (isLast && typeof entry.decide === "string" && hasConstrainedEntry) {
        catchAll = loadedRules[loadedRules.length - 1];
      } else {
        children.push(...loadedRules);
        if (typeof entry.decide !== "string" || entry.path !== undefined || entry["path-in"] !== undefined) {
          hasConstrainedEntry = true;
        }
      }
    }
    if (!catchAll) {
      return children;
    }
    const listRule = new FileToolRule(this.toolType, [], "", undefined, undefined);
    listRule.children = children;
    listRule.catchAll = catchAll;
    return [listRule];
  }
  loadFileToolEntry(fileToolEntry, parentCwd) {
    if (typeof fileToolEntry.decide === "string") {
      return [this.loadDecideRule(fileToolEntry, parentCwd)];
    }
    if (fileToolEntry.rules) {
      return this.loadSubrules(fileToolEntry, parentCwd);
    }
    throw new Error(`permissions.yaml: ${this.toolType} entry must have decide or rules`);
  }
  loadSubrules(fileToolEntry, parentCwd) {
    const rulesList = fileToolEntry.rules;
    if (!Array.isArray(rulesList)) {
      throw new Error(`permissions.yaml: ${this.toolType} rules must be an array`);
    }
    for (const entryKey of Object.keys(fileToolEntry)) {
      if (!FILE_TOOL_KNOWN_FIELDS.has(entryKey)) {
        throw new Error(`permissions.yaml: ${this.toolType} unknown field '${entryKey}'`);
      }
    }
    const entryCwd = this.loadCwd(fileToolEntry.cwd);
    const effectiveCwd = entryCwd ? entryCwd : parentCwd;
    const children = [];
    let catchAll;
    for (let entryIndex = 0;entryIndex < rulesList.length; entryIndex++) {
      const ruleEntry = rulesList[entryIndex];
      if (!ruleEntry || typeof ruleEntry !== "object" || Array.isArray(ruleEntry)) {
        throw new Error(`permissions.yaml: ${this.toolType} rules must contain only rule objects`);
      }
      const loadedRules = this.loadFileToolEntry(ruleEntry, effectiveCwd);
      const isLast = entryIndex === rulesList.length - 1;
      if (isLast && typeof ruleEntry.decide === "string" && children.length > 0) {
        catchAll = loadedRules[loadedRules.length - 1];
      } else {
        children.push(...loadedRules);
      }
    }
    if (!catchAll && children.length <= 1) {
      return children;
    }
    const listRule = new FileToolRule(this.toolType, [], "", undefined, undefined);
    if (effectiveCwd) {
      listRule.requiredCwd = effectiveCwd;
    }
    listRule.children = children;
    if (catchAll) {
      listRule.catchAll = catchAll;
    }
    return [listRule];
  }
  loadDecideRule(fileToolEntry, parentCwd) {
    for (const entryKey of Object.keys(fileToolEntry)) {
      if (!FILE_TOOL_DECIDE_FIELDS.has(entryKey)) {
        throw new Error(`permissions.yaml: ${this.toolType} unknown field '${entryKey}'`);
      }
    }
    const decide2 = fileToolEntry.decide;
    if (typeof decide2 !== "string") {
      throw new Error(`permissions.yaml: ${this.toolType} must have a decide field`);
    }
    const reason = fileToolEntry.reason;
    if (reason !== undefined && typeof reason !== "string") {
      throw new Error(`permissions.yaml: ${this.toolType} reason must be a string`);
    }
    const path = fileToolEntry.path;
    const pathInValue = fileToolEntry["path-in"];
    let pathIn = [];
    if (path !== undefined && typeof path !== "string") {
      throw new Error(`permissions.yaml: ${this.toolType} path must be a string`);
    }
    if (pathInValue !== undefined) {
      if (!Array.isArray(pathInValue)) {
        throw new Error(`permissions.yaml: ${this.toolType} path-in must be an array`);
      }
      for (const pathEntry of pathInValue) {
        if (typeof pathEntry !== "string") {
          throw new Error(`permissions.yaml: ${this.toolType} path-in entries must be strings`);
        }
        pathIn.push(this.expandProjectDirToken(pathEntry));
      }
    } else if (typeof path === "string") {
      pathIn = [this.expandProjectDirToken(path)];
    }
    const sourceLocation = fileToolEntry.sourceLocation;
    const rule = new FileToolRule(this.toolType, pathIn, decide2, reason, sourceLocation);
    const entryCwd = this.loadCwd(fileToolEntry.cwd);
    const effectiveCwd = entryCwd ? entryCwd : parentCwd;
    if (effectiveCwd) {
      rule.requiredCwd = effectiveCwd;
    }
    return rule;
  }
  loadCwd(cwdField) {
    if (!cwdField) {
      return;
    }
    if (typeof cwdField !== "string") {
      throw new Error(`permissions.yaml: ${this.toolType} cwd must be a string`);
    }
    return this.expandProjectDirToken(cwdField);
  }
  expandProjectDirToken(pattern) {
    let expanded = pattern;
    const projectDirToken = "${{PROJECT_DIR}}";
    if (expanded.includes(projectDirToken)) {
      const projectDir = process.env["CLAUDE_PROJECT_DIR"];
      if (projectDir) {
        expanded = expanded.split(projectDirToken).join(projectDir);
      }
    }
    const homeToken = "${{HOME}}";
    if (expanded.includes(homeToken)) {
      const homeDir = process.env["HOME"];
      if (homeDir) {
        expanded = expanded.split(homeToken).join(homeDir);
      }
    }
    return expanded;
  }
}

// src/rules/generic-tool-rule.ts
var import_picomatch3 = __toESM(require_picomatch2(), 1);

class GenericToolRule {
  pattern;
  toolIn;
  decision;
  reason;
  sourceLocation;
  constructor(pattern, decision, reason, toolIn, sourceLocation) {
    if (pattern === undefined && toolIn === undefined) {
      throw new Error("GenericToolRule must have either pattern or toolIn");
    }
    this.decision = decision;
    this.pattern = pattern;
    this.reason = reason;
    this.toolIn = toolIn;
    this.sourceLocation = sourceLocation;
  }
  async evaluate(ast, context) {
    let matched = false;
    if (ast.type === "tool") {
      const toolNode = ast;
      if (this.toolIn !== undefined) {
        for (const entry of this.toolIn) {
          if (import_picomatch3.default(entry)(toolNode.tool_name)) {
            matched = true;
            break;
          }
        }
      } else if (this.pattern !== undefined) {
        matched = import_picomatch3.default(this.pattern)(toolNode.tool_name);
      }
    } else if (this.toolIn !== undefined) {
      for (const entry of this.toolIn) {
        if (entry.toLowerCase() === ast.type) {
          matched = true;
          break;
        }
      }
    } else if (this.pattern !== undefined) {
      matched = this.pattern.toLowerCase() === ast.type;
    }
    if (!matched) {
      return { context };
    }
    const decision = {
      action: this.decision
    };
    if (this.reason !== undefined) {
      decision.reason = this.reason;
    }
    return {
      decision,
      context
    };
  }
}

// src/rules/generic-tool-rule-factory.ts
class GenericToolRuleFactory {
  configKey;
  constructor(configKey) {
    this.configKey = configKey;
  }
  load(genericToolConfig) {
    if (!genericToolConfig || typeof genericToolConfig !== "object" || Array.isArray(genericToolConfig)) {
      throw new Error(`permissions.yaml: ${this.configKey} must be an object`);
    }
    const decide2 = genericToolConfig.decide;
    if (typeof decide2 !== "string") {
      throw new Error(`permissions.yaml: ${this.configKey} must have a decide field`);
    }
    const reason = genericToolConfig.reason;
    if (reason !== undefined && typeof reason !== "string") {
      throw new Error(`permissions.yaml: ${this.configKey} reason must be a string`);
    }
    const toolInField = genericToolConfig["tool-in"];
    const sourceLocation = genericToolConfig.sourceLocation;
    if (toolInField !== undefined) {
      if (!Array.isArray(toolInField)) {
        throw new Error(`permissions.yaml: ${this.configKey} tool-in must be an array`);
      }
      const toolIn = [];
      for (const item of toolInField) {
        if (typeof item !== "string") {
          throw new Error(`permissions.yaml: ${this.configKey} tool-in entries must be strings`);
        }
        toolIn.push(item);
      }
      return [new GenericToolRule(undefined, decide2, reason, toolIn, sourceLocation)];
    }
    const toolField = genericToolConfig.tool;
    let pattern = this.configKey;
    if (toolField !== undefined) {
      if (typeof toolField !== "string") {
        throw new Error(`permissions.yaml: ${this.configKey} tool must be a string`);
      }
      pattern = toolField;
    }
    return [new GenericToolRule(pattern, decide2, reason, undefined, sourceLocation)];
  }
}

// src/rules/grep-rule.ts
class GrepRule {
  decision;
  reason;
  sourceLocation;
  constructor(decision, reason, sourceLocation) {
    this.decision = decision;
    this.reason = reason;
    this.sourceLocation = sourceLocation;
  }
  async evaluate(ast, context) {
    if (ast.type !== "grep") {
      return { context };
    }
    const decision = {
      action: this.decision
    };
    if (this.reason !== undefined) {
      decision.reason = this.reason;
    }
    return {
      decision,
      context
    };
  }
}

// src/rules/grep-rule-factory.ts
class GrepRuleFactory {
  load(grepConfig) {
    if (!grepConfig || typeof grepConfig !== "object" || Array.isArray(grepConfig)) {
      throw new Error("permissions.yaml: Grep must be an object");
    }
    const decide2 = grepConfig.decide;
    if (typeof decide2 !== "string") {
      throw new Error("permissions.yaml: Grep must have a decide field");
    }
    const reason = grepConfig.reason;
    if (reason !== undefined && typeof reason !== "string") {
      throw new Error("permissions.yaml: Grep reason must be a string");
    }
    const sourceLocation = grepConfig.sourceLocation;
    return [new GrepRule(decide2, reason, sourceLocation)];
  }
}

// src/rules/redirect-rule.ts
var import_picomatch4 = __toESM(require_picomatch2(), 1);
import { resolve as resolve3 } from "path";
var REDIRECT_OUT_OPS = new Set([">", ">>", "2>", "&>"]);
var REDIRECT_IN_OPS = new Set(["<"]);
var REDIRECT_OUT_DECIDE_FIELDS = new Set([
  "decide",
  "reason",
  "path",
  "path-in",
  "sourceLocation"
]);

class RedirectOutOrderedRule {
  entries;
  sourceLocation;
  constructor(entries, sourceLocation) {
    this.entries = entries;
    this.sourceLocation = sourceLocation;
  }
  matchesEntry(redirectNode, entry, context) {
    if (!REDIRECT_OUT_OPS.has(redirectNode.op)) {
      return false;
    }
    if (entry.pathIn.length > 0) {
      let target = redirectNode.children.right.path;
      if (!target.startsWith("/")) {
        target = resolve3(context.cwd, target);
      }
      for (const pathPattern of entry.pathIn) {
        let pattern = pathPattern;
        if (pathPattern.startsWith("./")) {
          pattern = context.cwd + "/" + pathPattern.slice(2);
        }
        if (import_picomatch4.default(pattern, { dot: true })(target)) {
          return true;
        }
      }
      return false;
    }
    return true;
  }
  async evaluate(ast, context) {
    if (ast.type !== "redirect") {
      return { context };
    }
    const redirectNode = ast;
    for (const entry of this.entries) {
      if (!this.matchesEntry(redirectNode, entry, context)) {
        continue;
      }
      const decision = {
        action: entry.decision
      };
      if (entry.reason !== undefined) {
        decision.reason = entry.reason;
      }
      return {
        decision,
        context
      };
    }
    return { context };
  }
}
var REDIRECT_IN_DECIDE_FIELDS = new Set([
  "decide",
  "reason",
  "path",
  "path-in",
  "sourceLocation"
]);

class RedirectInOrderedRule {
  entries;
  sourceLocation;
  constructor(entries, sourceLocation) {
    this.entries = entries;
    this.sourceLocation = sourceLocation;
  }
  matchesEntry(redirectNode, entry, context) {
    if (!REDIRECT_IN_OPS.has(redirectNode.op)) {
      return false;
    }
    if (entry.pathIn.length > 0) {
      let target = redirectNode.children.right.path;
      if (!target.startsWith("/")) {
        target = resolve3(context.cwd, target);
      }
      for (const pathPattern of entry.pathIn) {
        let pattern = pathPattern;
        if (pathPattern.startsWith("./")) {
          pattern = context.cwd + "/" + pathPattern.slice(2);
        }
        if (import_picomatch4.default(pattern, { dot: true })(target)) {
          return true;
        }
      }
      return false;
    }
    return true;
  }
  async evaluate(ast, context) {
    if (ast.type !== "redirect") {
      return { context };
    }
    const redirectNode = ast;
    for (const entry of this.entries) {
      if (!this.matchesEntry(redirectNode, entry, context)) {
        continue;
      }
      const decision = {
        action: entry.decision
      };
      if (entry.reason !== undefined) {
        decision.reason = entry.reason;
      }
      return {
        decision,
        context
      };
    }
    return { context };
  }
}

class RedirectRuleFactory {
  load(redirectConfig) {
    if (!redirectConfig || typeof redirectConfig !== "object" || Array.isArray(redirectConfig)) {
      throw new Error("permissions.yaml: redirect must be an object");
    }
    const rules = [];
    if (redirectConfig.out !== undefined) {
      rules.push(this.loadRedirectOutOrderedRule(redirectConfig.out));
    }
    if (redirectConfig.in !== undefined) {
      rules.push(this.loadRedirectInOrderedRule(redirectConfig.in));
    }
    return rules;
  }
  loadRedirectOutOrderedRule(redirectOutConfig) {
    const entries = Array.isArray(redirectOutConfig) ? redirectOutConfig : [redirectOutConfig];
    const loadedEntries = [];
    for (const entry of entries) {
      loadedEntries.push(this.loadRedirectOutEntry(entry));
    }
    const sourceLocation = entries.length > 0 ? this.loadSourceLocation(entries[0]) : undefined;
    return new RedirectOutOrderedRule(loadedEntries, sourceLocation);
  }
  loadRedirectInOrderedRule(redirectInConfig) {
    const entries = Array.isArray(redirectInConfig) ? redirectInConfig : [redirectInConfig];
    const loadedEntries = [];
    for (const entry of entries) {
      loadedEntries.push(this.loadRedirectInEntry(entry));
    }
    const sourceLocation = entries.length > 0 ? this.loadSourceLocation(entries[0]) : undefined;
    return new RedirectInOrderedRule(loadedEntries, sourceLocation);
  }
  loadRedirectOutEntry(redirectEntry) {
    if (!redirectEntry || typeof redirectEntry !== "object" || Array.isArray(redirectEntry)) {
      throw new Error("permissions.yaml: redirect.out must contain only rule objects");
    }
    for (const entryKey of Object.keys(redirectEntry)) {
      if (!REDIRECT_OUT_DECIDE_FIELDS.has(entryKey)) {
        throw new Error(`permissions.yaml: redirect.out unknown field '${entryKey}'`);
      }
    }
    const decide2 = redirectEntry.decide;
    if (typeof decide2 !== "string") {
      throw new Error("permissions.yaml: redirect.out must have a decide field");
    }
    const reason = redirectEntry.reason;
    if (reason !== undefined && typeof reason !== "string") {
      throw new Error("permissions.yaml: redirect.out reason must be a string");
    }
    const path = redirectEntry.path;
    const pathInValue = redirectEntry["path-in"];
    let pathIn = [];
    if (path !== undefined && typeof path !== "string") {
      throw new Error("permissions.yaml: redirect.out path must be a string");
    }
    if (pathInValue !== undefined) {
      if (!Array.isArray(pathInValue)) {
        throw new Error("permissions.yaml: redirect.out path-in must be an array");
      }
      for (const pathEntry of pathInValue) {
        if (typeof pathEntry !== "string") {
          throw new Error("permissions.yaml: redirect.out path-in entries must be strings");
        }
      }
      pathIn = pathInValue;
    } else if (typeof path === "string") {
      pathIn = [path];
    }
    return {
      pathIn,
      decision: decide2,
      reason,
      sourceLocation: this.loadSourceLocation(redirectEntry)
    };
  }
  loadRedirectInEntry(redirectEntry) {
    if (!redirectEntry || typeof redirectEntry !== "object" || Array.isArray(redirectEntry)) {
      throw new Error("permissions.yaml: redirect.in must contain only rule objects");
    }
    for (const entryKey of Object.keys(redirectEntry)) {
      if (!REDIRECT_IN_DECIDE_FIELDS.has(entryKey)) {
        throw new Error(`permissions.yaml: redirect.in unknown field '${entryKey}'`);
      }
    }
    const decide2 = redirectEntry.decide;
    if (typeof decide2 !== "string") {
      throw new Error("permissions.yaml: redirect.in must have a decide field");
    }
    const reason = redirectEntry.reason;
    if (reason !== undefined && typeof reason !== "string") {
      throw new Error("permissions.yaml: redirect.in reason must be a string");
    }
    const path = redirectEntry.path;
    const pathInValue = redirectEntry["path-in"];
    let pathIn = [];
    if (path !== undefined && typeof path !== "string") {
      throw new Error("permissions.yaml: redirect.in path must be a string");
    }
    if (pathInValue !== undefined) {
      if (!Array.isArray(pathInValue)) {
        throw new Error("permissions.yaml: redirect.in path-in must be an array");
      }
      for (const pathEntry of pathInValue) {
        if (typeof pathEntry !== "string") {
          throw new Error("permissions.yaml: redirect.in path-in entries must be strings");
        }
      }
      pathIn = pathInValue;
    } else if (typeof path === "string") {
      pathIn = [path];
    }
    return {
      pathIn,
      decision: decide2,
      reason,
      sourceLocation: this.loadSourceLocation(redirectEntry)
    };
  }
  loadSourceLocation(entry) {
    return entry.sourceLocation;
  }
}

// src/rules/webfetch-rule.ts
class WebFetchRule {
  hostIn;
  decision;
  reason;
  sourceLocation;
  constructor(hostIn, decision, reason, sourceLocation) {
    this.hostIn = hostIn;
    this.decision = decision;
    this.reason = reason;
    this.sourceLocation = sourceLocation;
  }
  async evaluate(ast, context) {
    if (ast.type !== "webfetch") {
      return { context };
    }
    if (this.hostIn.length > 0) {
      const webfetchNode = ast;
      let hostname = "";
      try {
        hostname = new URL(webfetchNode.url).hostname;
      } catch {
        hostname = "";
      }
      let matched = false;
      for (const hostEntry of this.hostIn) {
        if (hostname === hostEntry) {
          matched = true;
          break;
        }
      }
      if (!matched) {
        return { context };
      }
    }
    const decision = {
      action: this.decision
    };
    if (this.reason !== undefined) {
      decision.reason = this.reason;
    }
    return {
      decision,
      context
    };
  }
}

// src/rules/webfetch-rule-factory.ts
class WebFetchRuleFactory {
  load(webFetchConfig) {
    if (!webFetchConfig || typeof webFetchConfig !== "object" || Array.isArray(webFetchConfig)) {
      throw new Error("permissions.yaml: webfetch must be an object");
    }
    const decide2 = webFetchConfig.decide;
    const host = webFetchConfig.host;
    const hostInValue = webFetchConfig["host-in"];
    if (typeof decide2 !== "string") {
      throw new Error("permissions.yaml: webfetch must have a decide field");
    }
    const reason = webFetchConfig.reason;
    if (reason !== undefined && typeof reason !== "string") {
      throw new Error("permissions.yaml: webfetch reason must be a string");
    }
    if (host !== undefined && typeof host !== "string") {
      throw new Error("permissions.yaml: webfetch host must be a string");
    }
    const sourceLocation = webFetchConfig.sourceLocation;
    if (hostInValue !== undefined) {
      if (!Array.isArray(hostInValue)) {
        throw new Error("permissions.yaml: webfetch host-in must be an array");
      }
      for (const hostEntry of hostInValue) {
        if (typeof hostEntry !== "string") {
          throw new Error("permissions.yaml: webfetch host-in entries must be strings");
        }
      }
      return [new WebFetchRule(hostInValue, decide2, reason, sourceLocation)];
    }
    if (typeof host === "string") {
      return [new WebFetchRule([host], decide2, reason, sourceLocation)];
    }
    return [new WebFetchRule([], decide2, reason, sourceLocation)];
  }
}

// src/load.ts
var sectionFactories = {
  bash: new BashRuleFactory,
  read: new FileToolRuleFactory("read"),
  write: new FileToolRuleFactory("write"),
  edit: new FileToolRuleFactory("edit"),
  multi_edit: new FileToolRuleFactory("multiedit"),
  webfetch: new WebFetchRuleFactory,
  grep: new GrepRuleFactory,
  redirect: new RedirectRuleFactory
};
function loadSection(permissionsConfig, sectionKey, factory) {
  const sectionConfig = permissionsConfig[sectionKey];
  if (!sectionConfig) {
    return [];
  }
  return factory.load(sectionConfig);
}
async function loadConfigFile(configPath) {
  let content;
  try {
    content = await readFile2(configPath, "utf-8");
  } catch (readError) {
    const errorCode = readError.code;
    if (errorCode === "ENOENT") {
      return [];
    }
    throw readError;
  }
  const permissionsConfig = parsePermissionsYaml(content, configPath);
  if (permissionsConfig === null || typeof permissionsConfig !== "object" || Array.isArray(permissionsConfig)) {
    throw new Error("permissions.yaml: root must be an object");
  }
  const configRules = [];
  for (const sectionKey of Object.keys(permissionsConfig)) {
    configRules.push(...loadSection(permissionsConfig, sectionKey, sectionFactories[sectionKey.toLowerCase()] || new GenericToolRuleFactory(sectionKey)));
  }
  return configRules;
}
async function loadPermissionsDir(permissionsDir, displayPrefix, logger) {
  const configFileNames = [];
  try {
    const dirEntries = await readdir(permissionsDir);
    for (const entryName of dirEntries) {
      if (entryName.startsWith(".")) {
        continue;
      }
      if (!entryName.endsWith(".yaml") && !entryName.endsWith(".yml")) {
        continue;
      }
      const entryPath = join2(permissionsDir, entryName);
      const entryStat = await stat(entryPath);
      if (entryStat.isFile()) {
        configFileNames.push(entryName);
      }
    }
  } catch (readError) {
    const errorCode = readError.code;
    if (errorCode !== "ENOENT") {
      throw readError;
    }
  }
  configFileNames.sort();
  const dirRules = [];
  for (const configFileName of configFileNames) {
    const configFileRules = await loadConfigFile(join2(permissionsDir, configFileName));
    logConfigLoad(logger, `${displayPrefix}/${configFileName}`, configFileRules.length);
    dirRules.push(...configFileRules);
  }
  return dirRules;
}
async function load(projectDir, homeDir, logger) {
  const rules = [...builtinRules];
  const homeMainRules = await loadConfigFile(join2(homeDir, ".claude", "permissions.yaml"));
  logConfigLoad(logger, "~/.claude/permissions.yaml", homeMainRules.length);
  rules.push(...homeMainRules);
  const homePermissionsDir = join2(homeDir, ".claude", "permissions.d");
  rules.push(...await loadPermissionsDir(homePermissionsDir, "~/.claude/permissions.d", logger));
  const projectMainRules = await loadConfigFile(join2(projectDir, ".claude", "permissions.yaml"));
  logConfigLoad(logger, ".claude/permissions.yaml", projectMainRules.length);
  rules.push(...projectMainRules);
  rules.push(...await loadPermissionsDir(join2(projectDir, ".claude", "permissions.d"), ".claude/permissions.d", logger));
  return { rules };
}

// src/load-commands.ts
import { readdir as readdir2, readFile as readFile3, stat as stat2 } from "fs/promises";
import { join as join3 } from "path";
function normaliseFlagDescriptor(raw) {
  return {
    arity: raw.arity ?? 0,
    kind: raw.kind ?? "string",
    description: raw.description ?? ""
  };
}
function normalisePositionalDescriptor(raw) {
  return {
    kind: raw.kind ?? "string",
    description: raw.description ?? "",
    variadic: raw.variadic ?? false
  };
}
function normaliseCommandDescriptor(raw) {
  const flags = {};
  if (raw.flags !== undefined) {
    for (const [aliasGroup, rawFlag] of Object.entries(raw.flags)) {
      flags[aliasGroup] = normaliseFlagDescriptor(rawFlag);
    }
  }
  const positionals = (raw.positionals ?? []).map(normalisePositionalDescriptor);
  const result = {
    description: raw.description ?? "",
    positionals,
    flags
  };
  if (raw.cmds !== undefined) {
    const cmds = {};
    for (const [subCommandName, rawSubCommand] of Object.entries(raw.cmds)) {
      cmds[subCommandName] = normaliseCommandDescriptor(rawSubCommand);
    }
    result.cmds = cmds;
  }
  return result;
}
async function isYamlFile(dirPath, entryName) {
  if (entryName.startsWith(".")) {
    return false;
  }
  if (!entryName.endsWith(".yaml") && !entryName.endsWith(".yml")) {
    return false;
  }
  const fileStat = await stat2(join3(dirPath, entryName));
  return fileStat.isFile();
}
async function mergeDescriptorsFromDir(dirPath, target) {
  let entries;
  try {
    entries = await readdir2(dirPath);
  } catch {
    return;
  }
  const yamlNames = [];
  for (const entryName of entries) {
    if (await isYamlFile(dirPath, entryName)) {
      yamlNames.push(entryName);
    }
  }
  yamlNames.sort();
  for (const yamlName of yamlNames) {
    const filePath = join3(dirPath, yamlName);
    const content = await readFile3(filePath, "utf-8");
    const parsed = $parse(content);
    if (parsed === null || typeof parsed !== "object") {
      continue;
    }
    for (const [commandName, rawDescriptor] of Object.entries(parsed)) {
      if (rawDescriptor === null || typeof rawDescriptor !== "object") {
        continue;
      }
      target.set(commandName, normaliseCommandDescriptor(rawDescriptor));
    }
  }
}
async function loadCommandDescriptors(homeDir, projectDir) {
  const descriptors = new Map;
  const homeCommandsDir = join3(homeDir, ".claude", "permissions.d", "commands");
  await mergeDescriptorsFromDir(homeCommandsDir, descriptors);
  const projectCommandsDir = join3(projectDir, ".claude", "permissions.d", "commands");
  await mergeDescriptorsFromDir(projectCommandsDir, descriptors);
  return descriptors;
}
function resolveFlagArity(descriptor, flagName) {
  for (const [aliasGroup, flagDescriptor] of Object.entries(descriptor.flags)) {
    const aliases = aliasGroup.split("|");
    if (aliases.includes(flagName)) {
      return flagDescriptor.arity;
    }
  }
  return 0;
}

// src/ast-nodes/command-ast-node.ts
class CommandAstNode extends AstNode {
  type = "command";
  commandName;
  options;
  positionals;
  envPrefix;
  constructor(commandName, options, positionals, envPrefix, source) {
    super("command", source);
    this.commandName = commandName;
    this.options = options;
    this.positionals = positionals;
    this.envPrefix = envPrefix;
  }
}

// src/ast-nodes/bash-ast-node.ts
class BashAstNode extends AstNode {
  children;
  constructor(children, source) {
    super("bash", source);
    this.children = children;
  }
}

// src/ast-nodes/binop-ast-node.ts
class BinopAstNode extends AstNode {
  op;
  children;
  constructor(op, children, source) {
    super("binop", source);
    this.op = op;
    this.children = children;
  }
}

// src/ast-nodes/redirect-ast-node.ts
class RedirectAstNode extends AstNode {
  type = "redirect";
  op;
  children;
  constructor(op, children, source) {
    super("redirect", source);
    this.op = op;
    this.children = children;
  }
}

// src/ast-nodes/heredoc-ast-node.ts
class HeredocAstNode extends AstNode {
  terminator;
  quoted;
  body;
  constructor(terminator, quoted, body, source) {
    super("heredoc", source);
    this.terminator = terminator;
    this.quoted = quoted;
    this.body = body;
  }
  async evaluate(rules, context, logger) {
    if (this.quoted) {
      return { context };
    }
    return super.evaluate(rules, context, logger);
  }
}

// src/ast-nodes/target-ast-node.ts
class TargetAstNode extends AstNode {
  type = "target";
  path;
  constructor(path, source) {
    super("target", source);
    this.path = path;
  }
  async evaluate(rules, context, logger) {
    return { context };
  }
}

// src/ast-nodes/brace-group-ast-node.ts
class BraceGroupAstNode extends AstNode {
  children;
  constructor(children, source) {
    super("brace_group", source);
    this.children = children;
  }
}

// src/ast-nodes/subshell-ast-node.ts
class SubshellAstNode extends AstNode {
  children;
  constructor(children, source) {
    super("subshell", source);
    this.children = children;
  }
  async evaluate(rules, context, logger) {
    const result = await super.evaluate(rules, {
      ...context,
      env: { ...context.env }
    }, logger);
    return {
      decision: result.decision,
      context
    };
  }
}

// src/ast-nodes/for-loop-ast-node.ts
class ForLoopAstNode extends AstNode {
  children;
  variable;
  items;
  constructor(type, children, variable, items, source) {
    super(type, source);
    this.children = children;
    this.variable = variable;
    this.items = items;
  }
  async evaluate(rules, context, logger) {
    const decisions = [];
    const body = this.children?.body;
    if (body) {
      for (const item of this.items) {
        const iterationContext = {
          ...context,
          env: {
            ...context.env,
            [this.variable]: item
          }
        };
        const iterationResult = await body.evaluate(rules, iterationContext, logger);
        if (iterationResult.decision) {
          decisions.push(iterationResult.decision);
        }
      }
    }
    const combinedDecision = pickStrictest(decisions);
    if (combinedDecision) {
      logger.log({
        type: "aggregation",
        timestamp: toLocalISOString(new Date),
        cmd: this.source,
        decision: combinedDecision.action,
        reason: combinedDecision.reason
      });
    }
    return {
      decision: combinedDecision,
      context
    };
  }
}

// src/ast-nodes/while-loop-ast-node.ts
class WhileLoopAstNode extends AstNode {
  until;
  children;
  constructor(until, children, source) {
    super("while_loop", source);
    this.until = until;
    this.children = children;
  }
}

// src/ast-nodes/if-statement-ast-node.ts
class IfStatementAstNode extends AstNode {
  children;
  constructor(children, source) {
    super("if_statement", source);
    this.children = children;
  }
}

// src/ast-nodes/case-statement-ast-node.ts
class CaseStatementAstNode extends AstNode {
  word;
  clauses;
  children;
  constructor(word, clauses, children, source) {
    super("case_statement", source);
    this.word = word;
    this.clauses = clauses;
    this.children = children;
  }
}

// src/ast-nodes/file-path-tool-ast-node.ts
class FilePathToolAstNode extends AstNode {
  file_path;
  constructor(type, file_path, source) {
    super(type, source);
    this.file_path = file_path;
  }
}

// src/ast-nodes/grep-ast-node.ts
class GrepAstNode extends AstNode {
  pattern;
  path;
  constructor(pattern, path, source) {
    super("grep", source);
    this.pattern = pattern;
    this.path = path;
  }
}

// src/ast-nodes/substitution-ast-node.ts
class SubstitutionAstNode extends AstNode {
  children;
  constructor(children, source) {
    super("substitution", source);
    this.children = children;
  }
}

// src/ast-nodes/webfetch-ast-node.ts
class WebFetchAstNode extends AstNode {
  type = "webfetch";
  url;
  constructor(url, source) {
    super("webfetch", source);
    this.url = url;
  }
}

// src/ast-nodes/agent-ast-node.ts
class AgentAstNode extends AstNode {
  description;
  prompt;
  constructor(description, prompt, source) {
    super("agent", source);
    this.description = description;
    this.prompt = prompt;
  }
}

// src/ast-nodes/tool-ast-node.ts
class ToolAstNode extends AstNode {
  type = "tool";
  tool_name;
  tool_input;
  constructor(tool_name, tool_input, source) {
    super("tool", source);
    this.tool_name = tool_name;
    this.tool_input = tool_input;
  }
}

// src/ast-nodes/xargs-ast-node.ts
class XargsAstNode extends AstNode {
  options;
  children;
  constructor(options, children, source) {
    super("xargs", source);
    this.options = options;
    this.children = children;
  }
}

// src/tokenizer.ts
var REDIRECT_OPERATORS = ["2>&", ">>", "&>", "2>", ">", "<<<", "<<", "<"];
var BASH_OPERATOR_KINDS = [
  "&&" /* And */,
  "||" /* Or */,
  ";" /* Semicolon */,
  "|" /* Pipe */,
  "(" /* OpenParen */,
  ")" /* CloseParen */,
  "{" /* OpenBrace */,
  "}" /* CloseBrace */
];
var SHELL_KEYWORD_KINDS = {
  for: "for" /* For */,
  in: "in" /* In */,
  do: "do" /* Do */,
  done: "done" /* Done */,
  while: "while" /* While */,
  until: "until" /* Until */,
  if: "if" /* If */,
  then: "then" /* Then */,
  elif: "elif" /* Elif */,
  else: "else" /* Else */,
  fi: "fi" /* Fi */,
  case: "case" /* Case */,
  esac: "esac" /* Esac */
};

class Tokenizer {
  tokens;
  position;
  constructor(input) {
    this.tokens = Tokenizer.lexInput(input);
    this.position = 0;
  }
  peek() {
    return this.tokens[this.position];
  }
  next() {
    if (this.tokens[this.position] !== undefined) {
      this.position++;
    }
  }
  peekNext() {
    return this.tokens[this.position + 1];
  }
  static classifyPlainWord(wordValue) {
    const keywordKind = SHELL_KEYWORD_KINDS[wordValue];
    if (keywordKind !== undefined) {
      return keywordKind;
    }
    return "word" /* Word */;
  }
  static readHeredocTerminator(tokens, operatorIndex) {
    let terminator = "";
    let wordEnd = undefined;
    for (let tokenIndex = operatorIndex + 1;tokenIndex < tokens.length; tokenIndex++) {
      const token = tokens[tokenIndex];
      if (wordEnd !== undefined && token.start !== wordEnd) {
        break;
      }
      if (token.kind === "word" /* Word */) {
        terminator += token.value;
      } else if (token.kind !== "'" /* SingleQuote */ && token.kind !== '"' /* DoubleQuote */) {
        break;
      }
      wordEnd = token.end;
    }
    return terminator;
  }
  static readHeredocBody(input, bodyStart, terminator) {
    const bodyLines = [];
    let pos = bodyStart;
    let bodyEnd = bodyStart;
    while (pos < input.length) {
      let lineEnd = input.indexOf(`
`, pos);
      if (lineEnd === -1) {
        lineEnd = input.length;
      }
      const line = input.slice(pos, lineEnd);
      if (line === terminator) {
        return { kind: "heredoc_body" /* HeredocBody */, value: bodyLines.join(`
`), start: bodyStart, end: lineEnd };
      }
      bodyLines.push(line);
      bodyEnd = lineEnd;
      pos = lineEnd + 1;
    }
    return { kind: "heredoc_body" /* HeredocBody */, value: bodyLines.join(`
`), start: bodyStart, end: bodyEnd };
  }
  static lexInput(input) {
    const tokens = [];
    let pos = 0;
    let atWordBoundary = true;
    let heredocOperatorIndex = undefined;
    while (pos < input.length) {
      if (input[pos] === `
` || input[pos] === "\r") {
        const separatorStart = pos;
        pos++;
        if (heredocOperatorIndex !== undefined) {
          const terminator = Tokenizer.readHeredocTerminator(tokens, heredocOperatorIndex);
          heredocOperatorIndex = undefined;
          const bodyToken = Tokenizer.readHeredocBody(input, pos, terminator);
          tokens.push(bodyToken);
          pos = bodyToken.end;
          atWordBoundary = true;
          continue;
        }
        tokens.push({ kind: ";" /* Semicolon */, value: ";" /* Semicolon */, start: separatorStart, end: pos });
        atWordBoundary = true;
        continue;
      }
      if (/\s/.test(input[pos])) {
        atWordBoundary = true;
        pos++;
        continue;
      }
      if (input[pos] === "#" && atWordBoundary) {
        while (pos < input.length && input[pos] !== `
` && input[pos] !== "\r") {
          pos++;
        }
        continue;
      }
      let matchedRedirect = undefined;
      for (const operator of REDIRECT_OPERATORS) {
        if (input.startsWith(operator, pos)) {
          matchedRedirect = operator;
          break;
        }
      }
      if (matchedRedirect !== undefined) {
        const redirectStart = pos;
        pos += matchedRedirect.length;
        if (matchedRedirect === "<<") {
          heredocOperatorIndex = tokens.length;
        }
        tokens.push({ kind: "redirect" /* Redirect */, value: matchedRedirect, start: redirectStart, end: pos });
        atWordBoundary = true;
        continue;
      }
      let matchedOperator = undefined;
      for (const kind of BASH_OPERATOR_KINDS) {
        if (input.startsWith(kind, pos)) {
          matchedOperator = kind;
          break;
        }
      }
      if (matchedOperator === undefined && input.startsWith("&", pos)) {
        matchedOperator = ";" /* Semicolon */;
      }
      if (matchedOperator !== undefined) {
        const operatorStart = pos;
        const operatorLength = matchedOperator === ";" /* Semicolon */ && input[operatorStart] === "&" ? 1 : matchedOperator.length;
        pos += operatorLength;
        tokens.push({ kind: matchedOperator, value: matchedOperator, start: operatorStart, end: pos });
        atWordBoundary = true;
        continue;
      }
      atWordBoundary = false;
      const wordStart = pos;
      let plainStart = pos;
      let plainValue = "";
      while (pos < input.length) {
        if (/\s/.test(input[pos])) {
          break;
        }
        let atRedirect = false;
        for (const operator of REDIRECT_OPERATORS) {
          if (input.startsWith(operator, pos)) {
            atRedirect = true;
            break;
          }
        }
        let atOperator = false;
        for (const kind of BASH_OPERATOR_KINDS) {
          if (input.startsWith(kind, pos)) {
            atOperator = true;
            break;
          }
        }
        if (!atOperator && input.startsWith("&", pos)) {
          atOperator = true;
        }
        if (atRedirect || atOperator) {
          break;
        }
        const isDelimiter = input[pos] === "'" || input[pos] === '"' || input[pos] === "`" || input[pos] === "$" && input[pos + 1] === "(";
        if (isDelimiter && plainValue.length > 0) {
          tokens.push({ kind: "word" /* Word */, value: plainValue, start: plainStart, end: pos });
          plainValue = "";
        }
        if (input[pos] === "'") {
          const openStart = pos;
          pos++;
          tokens.push({ kind: "'" /* SingleQuote */, value: "'", start: openStart, end: pos });
          const contentStart = pos;
          while (pos < input.length && input[pos] !== "'") {
            pos++;
          }
          if (pos > contentStart) {
            tokens.push({ kind: "word" /* Word */, value: input.slice(contentStart, pos), start: contentStart, end: pos });
          }
          if (pos < input.length) {
            tokens.push({ kind: "'" /* SingleQuote */, value: "'", start: pos, end: pos + 1 });
            pos++;
          }
          plainStart = pos;
          continue;
        }
        if (input[pos] === '"') {
          const openStart = pos;
          pos++;
          tokens.push({ kind: '"' /* DoubleQuote */, value: '"', start: openStart, end: pos });
          const contentStart = pos;
          let contentValue = "";
          while (pos < input.length && input[pos] !== '"') {
            if (input[pos] === "\\" && pos + 1 < input.length) {
              pos++;
              contentValue += input[pos++];
            } else {
              contentValue += input[pos++];
            }
          }
          if (pos > contentStart) {
            tokens.push({ kind: "word" /* Word */, value: contentValue, start: contentStart, end: pos });
          }
          if (pos < input.length) {
            tokens.push({ kind: '"' /* DoubleQuote */, value: '"', start: pos, end: pos + 1 });
            pos++;
          }
          plainStart = pos;
          continue;
        }
        if (input[pos] === "`") {
          const openStart = pos;
          pos++;
          tokens.push({ kind: "`" /* Backtick */, value: "`", start: openStart, end: pos });
          const contentStart = pos;
          while (pos < input.length && input[pos] !== "`") {
            pos++;
          }
          if (pos > contentStart) {
            tokens.push({ kind: "word" /* Word */, value: input.slice(contentStart, pos), start: contentStart, end: pos });
          }
          if (pos < input.length) {
            tokens.push({ kind: "`" /* Backtick */, value: "`", start: pos, end: pos + 1 });
            pos++;
          }
          plainStart = pos;
          continue;
        }
        if (input[pos] === "$" && pos + 1 < input.length && input[pos + 1] === "(") {
          const openStart = pos;
          pos += 2;
          tokens.push({ kind: "$(" /* SubstitutionOpen */, value: "$(", start: openStart, end: pos });
          const contentStart = pos;
          let depth = 1;
          while (pos < input.length && depth > 0) {
            if (input[pos] === "(") {
              depth++;
            } else if (input[pos] === ")") {
              depth--;
              if (depth === 0) {
                break;
              }
            }
            pos++;
          }
          if (pos > contentStart) {
            tokens.push({ kind: "word" /* Word */, value: input.slice(contentStart, pos), start: contentStart, end: pos });
          }
          if (pos < input.length) {
            tokens.push({ kind: ")" /* CloseParen */, value: ")", start: pos, end: pos + 1 });
            pos++;
          }
          plainStart = pos;
          continue;
        }
        if (input[pos] === "\\" && pos + 1 < input.length) {
          pos++;
          plainValue += input[pos++];
          continue;
        }
        plainValue += input[pos++];
      }
      if (plainValue.length > 0) {
        const tokenKind = plainStart === wordStart ? Tokenizer.classifyPlainWord(plainValue) : "word" /* Word */;
        tokens.push({ kind: tokenKind, value: plainValue, start: plainStart, end: pos });
      } else if (pos === wordStart) {
        pos++;
      }
    }
    return tokens;
  }
}

// src/parse.ts
function parseEqualsFlag(flagBody, followingTokens) {
  const equalsIndex = flagBody.indexOf("=");
  if (equalsIndex !== -1) {
    return {
      argument: {
        options: { [flagBody.slice(0, equalsIndex)]: flagBody.slice(equalsIndex + 1) },
        positionals: []
      },
      remainingTokens: followingTokens
    };
  }
  return {
    argument: {
      options: { [flagBody]: true },
      positionals: []
    },
    remainingTokens: followingTokens
  };
}
function parseLongFlag(flagBody, followingTokens, commandDef) {
  const equalsIndex = flagBody.indexOf("=");
  if (equalsIndex !== -1) {
    return parseEqualsFlag(flagBody, followingTokens);
  }
  const flagArity = commandDef !== undefined ? resolveFlagArity(commandDef, flagBody) : 0;
  if (flagArity === 1) {
    const nextToken = followingTokens[0];
    if (nextToken !== undefined) {
      return {
        argument: {
          options: { [flagBody]: nextToken },
          positionals: []
        },
        remainingTokens: followingTokens.slice(1)
      };
    }
  }
  return {
    argument: {
      options: { [flagBody]: true },
      positionals: []
    },
    remainingTokens: followingTokens
  };
}
function parseSingleShortFlag(flagChar, followingTokens, commandDef) {
  const flagArity = commandDef !== undefined ? resolveFlagArity(commandDef, flagChar) : 0;
  if (flagArity === 1) {
    const nextToken = followingTokens[0];
    if (nextToken !== undefined) {
      return {
        argument: {
          options: { [flagChar]: nextToken },
          positionals: []
        },
        remainingTokens: followingTokens.slice(1)
      };
    }
  }
  return {
    argument: {
      options: { [flagChar]: true },
      positionals: []
    },
    remainingTokens: followingTokens
  };
}
function parseShortFlag(rest, followingTokens, commandDef) {
  const equalsIndex = rest.indexOf("=");
  if (equalsIndex !== -1) {
    return parseEqualsFlag(rest, followingTokens);
  }
  if (rest.length === 1) {
    return parseSingleShortFlag(rest, followingTokens, commandDef);
  }
  const combinedOptions = {};
  for (const flagChar of rest) {
    combinedOptions[flagChar] = true;
  }
  return {
    argument: {
      options: combinedOptions,
      positionals: []
    },
    remainingTokens: followingTokens
  };
}
function tokenizeCommand(input) {
  const words = [];
  let pos = 0;
  let atWordBoundary = true;
  while (pos < input.length) {
    if (/\s/.test(input[pos])) {
      atWordBoundary = true;
      pos++;
      continue;
    }
    if (input[pos] === "#" && atWordBoundary) {
      return words;
    }
    atWordBoundary = false;
    const wordStart = pos;
    let wordValue = "";
    while (pos < input.length) {
      if (/\s/.test(input[pos])) {
        break;
      }
      if (input[pos] === "'") {
        pos++;
        while (pos < input.length && input[pos] !== "'") {
          wordValue += input[pos++];
        }
        if (pos < input.length) {
          pos++;
        }
        continue;
      }
      if (input[pos] === '"') {
        pos++;
        while (pos < input.length && input[pos] !== '"') {
          if (input[pos] === "\\" && pos + 1 < input.length) {
            pos++;
            wordValue += input[pos++];
          } else {
            wordValue += input[pos++];
          }
        }
        if (pos < input.length) {
          pos++;
        }
        continue;
      }
      if (input[pos] === "\\" && pos + 1 < input.length) {
        pos++;
        wordValue += input[pos++];
        continue;
      }
      wordValue += input[pos++];
    }
    if (wordValue.length > 0) {
      words.push(wordValue);
    } else if (pos === wordStart) {
      pos++;
    }
  }
  return words;
}
function parseArgument(tokens, commandDef) {
  const token = tokens[0];
  const remainingTokens = tokens.slice(1);
  if (token.startsWith("--")) {
    return parseLongFlag(token.slice(2), remainingTokens, commandDef);
  }
  if (token.startsWith("-")) {
    return parseShortFlag(token.slice(1), remainingTokens, commandDef);
  }
  return {
    argument: {
      options: {},
      positionals: [token]
    },
    remainingTokens
  };
}
function parseEnvPrefixToken(tokens) {
  const token = tokens[0];
  if (token === undefined || !/^[A-Za-z_][A-Za-z0-9_]*=/.test(token)) {
    return {
      envAssignment: undefined,
      remainingTokens: tokens
    };
  }
  const equalsIndex = token.indexOf("=");
  return {
    envAssignment: {
      key: token.slice(0, equalsIndex),
      value: token.slice(equalsIndex + 1)
    },
    remainingTokens: tokens.slice(1)
  };
}
function parseEnvPrefix(tokens) {
  const envPrefix = {};
  let remainingTokens = tokens;
  while (true) {
    const parseResult = parseEnvPrefixToken(remainingTokens);
    if (parseResult.envAssignment === undefined) {
      return {
        envPrefix,
        remainingTokens
      };
    }
    envPrefix[parseResult.envAssignment.key] = parseResult.envAssignment.value;
    remainingTokens = parseResult.remainingTokens;
  }
}
function parseArguments(tokens, commandDef) {
  let effectiveCommandDef = commandDef;
  if (commandDef?.cmds) {
    let scanTokens = tokens;
    let subCommandName;
    while (scanTokens.length > 0) {
      const scanResult = parseArgument(scanTokens, commandDef);
      if (scanResult.argument.positionals.length > 0) {
        subCommandName = scanResult.argument.positionals[0];
        break;
      }
      scanTokens = scanResult.remainingTokens;
    }
    if (subCommandName) {
      const subCommandDef = commandDef.cmds[subCommandName];
      if (subCommandDef) {
        effectiveCommandDef = {
          ...commandDef,
          flags: { ...commandDef.flags, ...subCommandDef.flags }
        };
      }
    }
  }
  const options = {};
  const positionals = [];
  let remainingTokens = tokens;
  while (remainingTokens.length > 0) {
    const parseResult = parseArgument(remainingTokens, effectiveCommandDef);
    Object.assign(options, parseResult.argument.options);
    positionals.push(...parseResult.argument.positionals);
    remainingTokens = parseResult.remainingTokens;
  }
  return {
    options,
    positionals
  };
}
function skipSemicolonSeparators(tokenizer) {
  while (tokenizer.peek()?.kind === ";" /* Semicolon */) {
    tokenizer.next();
  }
}
function isTerminatorKind(kind, terminators) {
  for (const terminator of terminators) {
    if (kind === terminator) {
      return true;
    }
  }
  return false;
}
function parseSequenceUntil(tokenizer, source, commandRegistry, terminators) {
  skipSemicolonSeparators(tokenizer);
  if (tokenizer.peek() === undefined) {
    return parseBashCommand("", commandRegistry);
  }
  const firstToken = tokenizer.peek();
  if (firstToken !== undefined && terminators.length > 0 && isTerminatorKind(firstToken.kind, terminators)) {
    return parseBashCommand("", commandRegistry);
  }
  let left = parseAndExpr(tokenizer, source, commandRegistry);
  while (tokenizer.peek()?.kind === ";" /* Semicolon */) {
    tokenizer.next();
    skipSemicolonSeparators(tokenizer);
    const nextToken = tokenizer.peek();
    if (nextToken === undefined || terminators.length > 0 && isTerminatorKind(nextToken.kind, terminators)) {
      break;
    }
    const right = parseAndExpr(tokenizer, source, commandRegistry);
    left = makeBinopNode(";" /* Semicolon */, left, right);
  }
  return left;
}
function parseForLoop(tokenizer, source, commandRegistry) {
  const forToken = tokenizer.peek();
  const loopStart = forToken?.start ?? source.length;
  tokenizer.next();
  let variable = "";
  const variableToken = tokenizer.peek();
  if (variableToken !== undefined && isWordTokenKind(variableToken.kind)) {
    variable = readShellWord(tokenizer, commandRegistry).value;
  }
  if (tokenizer.peek()?.kind === "in" /* In */) {
    tokenizer.next();
  }
  const items = [];
  while (true) {
    const token = tokenizer.peek();
    if (token === undefined) {
      break;
    }
    if (token.kind === "do" /* Do */) {
      break;
    }
    if (isWordTokenKind(token.kind)) {
      items.push(readShellWord(tokenizer, commandRegistry).value);
    } else if (token.kind === ";" /* Semicolon */) {
      tokenizer.next();
      skipSemicolonSeparators(tokenizer);
    } else {
      break;
    }
  }
  skipSemicolonSeparators(tokenizer);
  if (tokenizer.peek()?.kind === "do" /* Do */) {
    tokenizer.next();
  }
  const body = parseSequenceUntil(tokenizer, source, commandRegistry, ["done" /* Done */]);
  let loopEnd = source.length;
  const doneToken = tokenizer.peek();
  if (doneToken !== undefined && doneToken.kind === "done" /* Done */) {
    loopEnd = doneToken.end;
    tokenizer.next();
  }
  return new ForLoopAstNode("for_loop", { body }, variable, items, source.slice(loopStart, loopEnd));
}
function parseWhileLoop(tokenizer, source, commandRegistry) {
  const keywordToken = tokenizer.peek();
  const loopStart = keywordToken?.start ?? source.length;
  const isUntilLoop = keywordToken !== undefined && keywordToken.kind === "until" /* Until */;
  tokenizer.next();
  const condition = parseSequenceUntil(tokenizer, source, commandRegistry, ["do" /* Do */]);
  skipSemicolonSeparators(tokenizer);
  if (tokenizer.peek()?.kind === "do" /* Do */) {
    tokenizer.next();
  }
  const body = parseSequenceUntil(tokenizer, source, commandRegistry, ["done" /* Done */]);
  let loopEnd = source.length;
  const doneToken = tokenizer.peek();
  if (doneToken !== undefined && doneToken.kind === "done" /* Done */) {
    loopEnd = doneToken.end;
    tokenizer.next();
  }
  return new WhileLoopAstNode(isUntilLoop, { condition, body }, source.slice(loopStart, loopEnd));
}
function parseIfStatement(tokenizer, source, commandRegistry) {
  const ifToken = tokenizer.peek();
  const statementStart = ifToken?.start ?? source.length;
  tokenizer.next();
  const condition = parseSequenceUntil(tokenizer, source, commandRegistry, ["then" /* Then */]);
  skipSemicolonSeparators(tokenizer);
  if (tokenizer.peek()?.kind === "then" /* Then */) {
    tokenizer.next();
  }
  const thenBranch = parseSequenceUntil(tokenizer, source, commandRegistry, ["else" /* Else */, "fi" /* Fi */]);
  let elseBranch = undefined;
  const nextToken = tokenizer.peek();
  if (nextToken !== undefined && nextToken.kind === "else" /* Else */) {
    tokenizer.next();
    elseBranch = parseSequenceUntil(tokenizer, source, commandRegistry, ["fi" /* Fi */]);
  }
  let statementEnd = source.length;
  const fiToken = tokenizer.peek();
  if (fiToken !== undefined && fiToken.kind === "fi" /* Fi */) {
    statementEnd = fiToken.end;
    tokenizer.next();
  }
  const ifStatementNode = new IfStatementAstNode({ condition, thenBranch }, source.slice(statementStart, statementEnd));
  if (elseBranch !== undefined) {
    ifStatementNode.children.elseBranch = elseBranch;
  }
  return ifStatementNode;
}
function isCaseClauseTerminator(tokenizer) {
  const token = tokenizer.peek();
  if (token === undefined) {
    return true;
  }
  if (token.kind === "esac" /* Esac */) {
    return true;
  }
  if (token.kind === ";" /* Semicolon */) {
    const nextToken = tokenizer.peekNext();
    if (nextToken !== undefined && nextToken.kind === ";" /* Semicolon */) {
      return true;
    }
  }
  return false;
}
function parseSequenceUntilCaseClauseEnd(tokenizer, source, commandRegistry) {
  skipSemicolonSeparators(tokenizer);
  if (tokenizer.peek() === undefined) {
    return parseBashCommand("", commandRegistry);
  }
  if (isCaseClauseTerminator(tokenizer)) {
    return parseBashCommand("", commandRegistry);
  }
  let left = parseAndExpr(tokenizer, source, commandRegistry);
  while (tokenizer.peek()?.kind === ";" /* Semicolon */) {
    const nextToken = tokenizer.peekNext();
    if (nextToken !== undefined && nextToken.kind === ";" /* Semicolon */) {
      break;
    }
    if (nextToken !== undefined && nextToken.kind === "esac" /* Esac */) {
      break;
    }
    tokenizer.next();
    skipSemicolonSeparators(tokenizer);
    if (isCaseClauseTerminator(tokenizer)) {
      break;
    }
    const right = parseAndExpr(tokenizer, source, commandRegistry);
    left = makeBinopNode(";" /* Semicolon */, left, right);
  }
  return left;
}
function parseCaseStatement(tokenizer, source, commandRegistry) {
  const caseToken = tokenizer.peek();
  const statementStart = caseToken?.start ?? source.length;
  tokenizer.next();
  let word = "";
  const wordToken = tokenizer.peek();
  if (wordToken !== undefined && isWordTokenKind(wordToken.kind)) {
    word = readShellWord(tokenizer, commandRegistry).value;
  }
  if (tokenizer.peek()?.kind === "in" /* In */) {
    tokenizer.next();
  }
  skipSemicolonSeparators(tokenizer);
  const clauses = [];
  const bodies = [];
  while (true) {
    const clauseStartToken = tokenizer.peek();
    if (clauseStartToken === undefined) {
      break;
    }
    if (clauseStartToken.kind === "esac" /* Esac */) {
      break;
    }
    const clauseStart = clauseStartToken.start;
    if (tokenizer.peek()?.kind === "(" /* OpenParen */) {
      tokenizer.next();
    }
    const patterns = [];
    const firstPatternToken = tokenizer.peek();
    if (firstPatternToken !== undefined && isWordTokenKind(firstPatternToken.kind)) {
      patterns.push(readShellWord(tokenizer, commandRegistry).value);
    }
    while (tokenizer.peek()?.kind === "|" /* Pipe */) {
      tokenizer.next();
      const patternToken = tokenizer.peek();
      if (patternToken !== undefined && isWordTokenKind(patternToken.kind)) {
        patterns.push(readShellWord(tokenizer, commandRegistry).value);
      }
    }
    if (tokenizer.peek()?.kind === ")" /* CloseParen */) {
      tokenizer.next();
    }
    const body = parseSequenceUntilCaseClauseEnd(tokenizer, source, commandRegistry);
    clauses.push({ patterns });
    bodies.push(body);
    if (tokenizer.peek()?.kind === ";" /* Semicolon */) {
      tokenizer.next();
      if (tokenizer.peek()?.kind === ";" /* Semicolon */) {
        tokenizer.next();
      }
    }
    skipSemicolonSeparators(tokenizer);
    const afterClauseToken = tokenizer.peek();
    if (afterClauseToken !== undefined && afterClauseToken.start === clauseStart) {
      break;
    }
  }
  let statementEnd = source.length;
  const esacToken = tokenizer.peek();
  if (esacToken !== undefined && esacToken.kind === "esac" /* Esac */) {
    statementEnd = esacToken.end;
    tokenizer.next();
  }
  return new CaseStatementAstNode(word, clauses, { _: bodies }, source.slice(statementStart, statementEnd));
}
function parseSubshellGroup(tokenizer, source, commandRegistry) {
  const openToken = tokenizer.peek();
  const groupStart = openToken?.start ?? source.length;
  tokenizer.next();
  const body = parseSequenceUntil(tokenizer, source, commandRegistry, [")" /* CloseParen */]);
  let groupEnd = source.length;
  const closeToken = tokenizer.peek();
  if (closeToken !== undefined && closeToken.kind === ")" /* CloseParen */) {
    groupEnd = closeToken.end;
    tokenizer.next();
  }
  return new SubshellAstNode({ body }, source.slice(groupStart, groupEnd));
}
function parseBraceGroup(tokenizer, source, commandRegistry) {
  const openToken = tokenizer.peek();
  const groupStart = openToken?.start ?? source.length;
  tokenizer.next();
  const body = parseSequenceUntil(tokenizer, source, commandRegistry, ["}" /* CloseBrace */]);
  let groupEnd = source.length;
  const closeToken = tokenizer.peek();
  if (closeToken !== undefined && closeToken.kind === "}" /* CloseBrace */) {
    groupEnd = closeToken.end;
    tokenizer.next();
  }
  return new BraceGroupAstNode({ body }, source.slice(groupStart, groupEnd));
}
function parseXargsNode(remainingTokens, source, statementStart, statementEnd, atStatementEnd, commandRegistry) {
  let tokenIndex = 1;
  const xargsOptionTokens = [];
  while (tokenIndex < remainingTokens.length) {
    const token = remainingTokens[tokenIndex];
    if (token === "--") {
      tokenIndex++;
      break;
    }
    if (!token.startsWith("-")) {
      break;
    }
    xargsOptionTokens.push(token);
    tokenIndex++;
  }
  const xargsOptions = parseArguments(xargsOptionTokens, undefined).options;
  const subcommandTokens = remainingTokens.slice(tokenIndex);
  let child;
  if (subcommandTokens.length === 0) {
    child = new CommandAstNode("", {}, [], {}, "");
  } else {
    const subcommandEnvPrefix = parseEnvPrefix(subcommandTokens);
    const subcommandName = subcommandEnvPrefix.remainingTokens[0] ?? "";
    const subcommandDef = commandRegistry.get(subcommandName);
    const subcommandArguments = parseArguments(subcommandEnvPrefix.remainingTokens.slice(1), subcommandDef);
    child = new CommandAstNode(subcommandName, subcommandArguments.options, subcommandArguments.positionals, subcommandEnvPrefix.envPrefix, subcommandTokens.join(" "));
  }
  let xargsSource = source.slice(statementStart, statementEnd);
  if (atStatementEnd) {
    xargsSource = source.slice(statementStart);
  }
  return new XargsAstNode(xargsOptions, { child }, xargsSource);
}
function isWordTokenKind(kind) {
  return kind === "word" /* Word */ || kind === "'" /* SingleQuote */ || kind === '"' /* DoubleQuote */ || kind === "`" /* Backtick */ || kind === "$(" /* SubstitutionOpen */;
}
function parseSubstitution(tokenizer, commandRegistry) {
  const openToken = tokenizer.peek();
  const openValue = openToken?.value ?? "";
  const openEnd = openToken?.end;
  const openKind = openToken?.kind;
  tokenizer.next();
  let innerSource = "";
  let fullSource = openValue;
  const contentToken = tokenizer.peek();
  if (contentToken !== undefined && contentToken.kind === "word" /* Word */ && contentToken.start === openEnd) {
    innerSource = contentToken.value;
    fullSource += contentToken.value;
    tokenizer.next();
  }
  const expectedClose = openKind === "`" /* Backtick */ ? "`" /* Backtick */ : ")" /* CloseParen */;
  const closeToken = tokenizer.peek();
  if (closeToken !== undefined && closeToken.kind === expectedClose) {
    fullSource += closeToken.value;
    tokenizer.next();
  }
  return new SubstitutionAstNode({ command: parseBashExpression(innerSource, commandRegistry) }, fullSource);
}
function readShellWord(tokenizer, commandRegistry) {
  let value = "";
  let substitution = undefined;
  let prevEnd = undefined;
  while (true) {
    const token = tokenizer.peek();
    if (token === undefined || !isWordTokenKind(token.kind)) {
      break;
    }
    if (prevEnd !== undefined && token.start !== prevEnd) {
      break;
    }
    if (token.kind === "word" /* Word */) {
      value += token.value;
      prevEnd = token.end;
      tokenizer.next();
      continue;
    }
    if (token.kind === "'" /* SingleQuote */ || token.kind === '"' /* DoubleQuote */) {
      const openKind = token.kind;
      let segmentEnd = token.end;
      tokenizer.next();
      const contentToken = tokenizer.peek();
      if (contentToken !== undefined && contentToken.kind === "word" /* Word */ && contentToken.start === segmentEnd) {
        value += contentToken.value;
        segmentEnd = contentToken.end;
        tokenizer.next();
      }
      const closeToken = tokenizer.peek();
      if (closeToken !== undefined && closeToken.kind === openKind && closeToken.start === segmentEnd) {
        segmentEnd = closeToken.end;
        tokenizer.next();
      }
      prevEnd = segmentEnd;
      continue;
    }
    const substitutionStart = token.start;
    substitution = parseSubstitution(tokenizer, commandRegistry);
    prevEnd = substitutionStart + substitution.source.length;
  }
  return { value, substitution, endPos: prevEnd ?? 0 };
}
function parseHeredoc(tokenizer, source, operatorStart, terminatorEnd, terminator, quoted) {
  let body = "";
  let heredocEnd = terminatorEnd;
  const bodyToken = tokenizer.peek();
  if (bodyToken !== undefined && bodyToken.kind === "heredoc_body" /* HeredocBody */) {
    body = bodyToken.value;
    heredocEnd = bodyToken.end;
    tokenizer.next();
  }
  return new HeredocAstNode(terminator, quoted, body, source.slice(operatorStart, heredocEnd));
}
function parseStatement(tokenizer, source, commandRegistry) {
  const firstToken = tokenizer.peek();
  if (firstToken !== undefined && firstToken.kind === "for" /* For */) {
    return parseForLoop(tokenizer, source, commandRegistry);
  }
  if (firstToken !== undefined && (firstToken.kind === "while" /* While */ || firstToken.kind === "until" /* Until */)) {
    return parseWhileLoop(tokenizer, source, commandRegistry);
  }
  if (firstToken !== undefined && firstToken.kind === "if" /* If */) {
    return parseIfStatement(tokenizer, source, commandRegistry);
  }
  if (firstToken !== undefined && firstToken.kind === "case" /* Case */) {
    return parseCaseStatement(tokenizer, source, commandRegistry);
  }
  if (firstToken !== undefined && firstToken.kind === "(" /* OpenParen */) {
    return parseSubshellGroup(tokenizer, source, commandRegistry);
  }
  if (firstToken !== undefined && firstToken.kind === "{" /* OpenBrace */) {
    return parseBraceGroup(tokenizer, source, commandRegistry);
  }
  const statementStart = firstToken?.start ?? source.length;
  const wordValues = [];
  let statementEnd = statementStart;
  let substitution = undefined;
  while (isWordTokenKind(tokenizer.peek()?.kind)) {
    const wordResult = readShellWord(tokenizer, commandRegistry);
    statementEnd = wordResult.endPos;
    if (wordResult.substitution !== undefined) {
      substitution = wordResult.substitution;
    }
    if (wordResult.value.length > 0) {
      wordValues.push(wordResult.value);
    }
  }
  const envPrefixResult = parseEnvPrefix(wordValues);
  const commandName = envPrefixResult.remainingTokens[0] ?? "";
  if (commandName === "xargs") {
    const atStatementEnd = tokenizer.peek() === undefined;
    return parseXargsNode(envPrefixResult.remainingTokens, source, statementStart, statementEnd, atStatementEnd, commandRegistry);
  }
  const commandDef = commandRegistry.get(commandName);
  const parsedArguments = parseArguments(envPrefixResult.remainingTokens.slice(1), commandDef);
  let commandSource = source.slice(statementStart, statementEnd);
  if (tokenizer.peek() === undefined) {
    commandSource = source.slice(statementStart);
  }
  const commandNode = new CommandAstNode(commandName, parsedArguments.options, parsedArguments.positionals, envPrefixResult.envPrefix, commandSource);
  if (substitution !== undefined) {
    commandNode.children = { substitution };
  }
  let node = commandNode;
  let heredocSeen = false;
  while (tokenizer.peek()?.kind === "redirect" /* Redirect */) {
    const redirectToken = tokenizer.peek();
    if (redirectToken === undefined) {
      break;
    }
    tokenizer.next();
    statementEnd = redirectToken.end;
    let target = "";
    let targetStart = redirectToken.end;
    let quotedTarget = false;
    const targetToken = tokenizer.peek();
    if (targetToken !== undefined && isWordTokenKind(targetToken.kind)) {
      quotedTarget = targetToken.kind === "'" /* SingleQuote */ || targetToken.kind === '"' /* DoubleQuote */;
      targetStart = targetToken.start;
      const wordResult = readShellWord(tokenizer, commandRegistry);
      target = wordResult.value;
      statementEnd = wordResult.endPos;
    }
    if (redirectToken.value === "<<") {
      const heredoc = parseHeredoc(tokenizer, source, redirectToken.start, statementEnd, target, quotedTarget);
      statementEnd = redirectToken.start + heredoc.source.length;
      node = new RedirectAstNode(redirectToken.value, { left: node, right: heredoc }, source.slice(statementStart, statementEnd));
      heredocSeen = true;
      continue;
    }
    const targetNode = new TargetAstNode(target, source.slice(targetStart, statementEnd));
    const redirectNode = new RedirectAstNode(redirectToken.value, { left: node, right: targetNode }, source.slice(statementStart, statementEnd));
    node = redirectNode;
  }
  if (node !== commandNode && !heredocSeen) {
    let fullSource = source.slice(statementStart, statementEnd);
    if (tokenizer.peek() === undefined) {
      fullSource = source.slice(statementStart);
    }
    commandNode.source = fullSource;
  }
  return node;
}
function parsePipeExpr(tokenizer, source, commandRegistry) {
  let left = parseStatement(tokenizer, source, commandRegistry);
  while (tokenizer.peek()?.kind === "|" /* Pipe */) {
    tokenizer.next();
    const right = parseStatement(tokenizer, source, commandRegistry);
    left = makeBinopNode("|" /* Pipe */, left, right);
  }
  return left;
}
function parseOrExpr(tokenizer, source, commandRegistry) {
  let left = parsePipeExpr(tokenizer, source, commandRegistry);
  while (tokenizer.peek()?.kind === "||" /* Or */) {
    tokenizer.next();
    const right = parsePipeExpr(tokenizer, source, commandRegistry);
    left = makeBinopNode("||" /* Or */, left, right);
  }
  return left;
}
function parseAndExpr(tokenizer, source, commandRegistry) {
  let left = parseOrExpr(tokenizer, source, commandRegistry);
  while (tokenizer.peek()?.kind === "&&" /* And */) {
    tokenizer.next();
    const right = parseOrExpr(tokenizer, source, commandRegistry);
    left = makeBinopNode("&&" /* And */, left, right);
  }
  return left;
}
function parseSequence(tokenizer, source, commandRegistry) {
  skipSemicolonSeparators(tokenizer);
  if (tokenizer.peek() === undefined) {
    return parseBashCommand("", commandRegistry);
  }
  let left = parseAndExpr(tokenizer, source, commandRegistry);
  while (tokenizer.peek()?.kind === ";" /* Semicolon */) {
    tokenizer.next();
    skipSemicolonSeparators(tokenizer);
    if (tokenizer.peek() === undefined) {
      break;
    }
    const right = parseAndExpr(tokenizer, source, commandRegistry);
    left = makeBinopNode(";" /* Semicolon */, left, right);
  }
  return left;
}
function makeBinopNode(op, left, right) {
  return new BinopAstNode(op, { left, right }, `${left.source} ${op} ${right.source}`);
}
function parseBashExpression(command, commandRegistry) {
  const tokenizer = new Tokenizer(command);
  return parseSequence(tokenizer, command, commandRegistry);
}
function parseBashCommand(command, commandRegistry) {
  const tokens = tokenizeCommand(command);
  const envPrefixResult = parseEnvPrefix(tokens);
  const commandName = envPrefixResult.remainingTokens[0] ?? "";
  const commandDef = commandRegistry.get(commandName);
  const parsedArguments = parseArguments(envPrefixResult.remainingTokens.slice(1), commandDef);
  return new CommandAstNode(commandName, parsedArguments.options, parsedArguments.positionals, envPrefixResult.envPrefix, command);
}
function parseFilePathToolCall(call) {
  const filePath = call.tool_input["file_path"];
  return new FilePathToolAstNode(call.tool_name.toLowerCase(), filePath, `${call.tool_name} ${filePath}`);
}
function parseGrepToolCall(call) {
  const pattern = call.tool_input["pattern"];
  const path = call.tool_input["path"];
  return new GrepAstNode(pattern, path, `Grep ${pattern} ${path}`);
}
function parseWebFetchToolCall(call) {
  const url = call.tool_input["url"];
  return new WebFetchAstNode(url, `WebFetch ${url}`);
}
function parseAgentToolCall(call) {
  const description = call.tool_input["description"];
  const prompt = call.tool_input["prompt"];
  return new AgentAstNode(description, prompt, `Agent ${description}`);
}
function parseToolNode(call) {
  return new ToolAstNode(call.tool_name, call.tool_input, call.tool_name);
}
function parseBashToolCall(call, commandRegistry) {
  const command = call.tool_input["command"];
  return new BashAstNode({ command: parseBashExpression(command, commandRegistry) }, command);
}
function parse(call, commandRegistry) {
  if (call.tool_name === "Bash" || call.tool_name === "Shell") {
    return parseBashToolCall(call, commandRegistry);
  }
  if (call.tool_name === "Read" || call.tool_name === "Write" || call.tool_name === "Edit" || call.tool_name === "MultiEdit") {
    return parseFilePathToolCall(call);
  }
  if (call.tool_name === "Grep") {
    return parseGrepToolCall(call);
  }
  if (call.tool_name === "WebFetch") {
    return parseWebFetchToolCall(call);
  }
  if (call.tool_name === "Agent") {
    return parseAgentToolCall(call);
  }
  return parseToolNode(call);
}

// src/analyze.ts
async function parseToolCallToAst(call, homeDir, projectDir) {
  const newToolInput = {};
  for (const [key, value] of Object.entries(call.tool_input)) {
    if (typeof value === "string") {
      newToolInput[key] = value;
    }
  }
  const descriptors = await loadCommandDescriptors(homeDir, projectDir);
  return parse({
    tool_name: call.tool_name,
    tool_input: newToolInput,
    cwd: call.cwd
  }, descriptors);
}

// src/pending-prompt-log.ts
import { mkdir as mkdir2, readdir as readdir3, stat as stat3, unlink, writeFile as writeFile2 } from "fs/promises";
import { join as join4 } from "path";
var STALE_PENDING_PROMPT_MAX_AGE_DAYS = 1;
var PENDING_PROMPT_DESCRIPTION_MAX_LENGTH = 60;
function resolvePendingDir(projectDir) {
  return join4(projectDir, ".claude", "permissions-log", "pending");
}
function childNodes(node) {
  if (!node.children) {
    return [];
  }
  if ("_" in node.children) {
    const positionalChildren = node.children._;
    if (Array.isArray(positionalChildren)) {
      return positionalChildren;
    }
  }
  const namedChildren = [];
  for (const childValue of Object.values(node.children)) {
    if (childValue && !Array.isArray(childValue)) {
      namedChildren.push(childValue);
    }
  }
  return namedChildren;
}
function formatPendingPromptFileTimestamp(date) {
  const year = date.getFullYear().toString();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}-${hours}-${seconds}`;
}
function sanitizePendingPromptDescription(text) {
  let sanitized = text.toLowerCase();
  sanitized = sanitized.replace(/[^a-z0-9]+/g, "-");
  sanitized = sanitized.replace(/-+/g, "-");
  sanitized = sanitized.replace(/^-|-$/g, "");
  if (sanitized.length > PENDING_PROMPT_DESCRIPTION_MAX_LENGTH) {
    sanitized = sanitized.slice(0, PENDING_PROMPT_DESCRIPTION_MAX_LENGTH);
  }
  return sanitized;
}
function buildPendingPromptFileName(call, pendingSince) {
  const timestampPart = formatPendingPromptFileTimestamp(pendingSince);
  const commandSummary = summarizeToolInput(call);
  let descriptionPart = sanitizePendingPromptDescription(commandSummary);
  if (descriptionPart.length === 0) {
    descriptionPart = sanitizePendingPromptDescription(call.tool_name);
  }
  if (descriptionPart.length === 0) {
    descriptionPart = "tool";
  }
  return `${timestampPart}-${descriptionPart}.md`;
}
async function resolvePendingPromptFilePath(pendingDir, baseFileName) {
  const extensionIndex = baseFileName.lastIndexOf(".md");
  const baseName = baseFileName.slice(0, extensionIndex);
  let suffix = 0;
  while (true) {
    const fileName = suffix === 0 ? baseFileName : `${baseName}-${suffix}.md`;
    const filePath = join4(pendingDir, fileName);
    try {
      await stat3(filePath);
      suffix = suffix + 1;
    } catch {
      return filePath;
    }
  }
}
function summarizeToolInput(call) {
  if (typeof call.tool_input["command"] === "string") {
    return call.tool_input["command"];
  }
  if (typeof call.tool_input["file_path"] === "string") {
    return call.tool_input["file_path"];
  }
  return JSON.stringify(call.tool_input);
}
function formatLocalTimestamp(date) {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absOffset = Math.abs(offsetMinutes);
  const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, "0");
  const offsetMins = String(absOffset % 60).padStart(2, "0");
  const year = date.getFullYear().toString();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const millis = String(date.getMilliseconds()).padStart(3, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${millis}${sign}${offsetHours}:${offsetMins}`;
}
function buildCommandDecisionMap(evaluations) {
  const outcomeMap = new Map;
  for (const evaluation of evaluations) {
    outcomeMap.set(evaluation.cmd, {
      decision: evaluation.decision,
      ruleFile: evaluation.ruleFile,
      ruleLine: evaluation.ruleLine,
      reason: evaluation.reason,
      source: evaluation.source
    });
  }
  return outcomeMap;
}
function buildCommandContextMap(evaluations) {
  const commandContextMap = new Map;
  for (const evaluation of evaluations) {
    commandContextMap.set(evaluation.cmd, {
      cwd: evaluation.cwd,
      env: { ...evaluation.env }
    });
  }
  return commandContextMap;
}
function envMapsEqual(left, right) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }
  for (const key of leftKeys) {
    if (left[key] !== right[key]) {
      return false;
    }
  }
  return true;
}
function commandOutcomeFromMatches(buffer) {
  const decisions = [];
  for (const match of buffer.matches) {
    decisions.push({
      action: match.decision,
      reason: match.reason
    });
  }
  const picked = pickStrictest(decisions);
  if (!picked) {
    return {
      cmd: buffer.cmd,
      decision: "NOMATCH",
      source: "no-rule-match",
      cwd: buffer.cwd,
      env: { ...buffer.env }
    };
  }
  let chosen = buffer.matches.find((match) => {
    return match.decision === picked.action && match.reason === picked.reason;
  });
  if (!chosen) {
    chosen = buffer.matches.find((match) => match.decision === picked.action);
  }
  let source = "matched-rule";
  if (picked.action === "deny") {
    source = "deny-rule";
  }
  return {
    cmd: buffer.cmd,
    decision: picked.action.toUpperCase(),
    ruleFile: chosen?.ruleFile,
    ruleLine: chosen?.ruleLine,
    reason: picked.reason,
    source,
    cwd: buffer.cwd,
    env: { ...buffer.env }
  };
}
function commandOutcomesFromAuditEntries(entries) {
  const commandOutcomes = [];
  let pending;
  for (const entry of entries) {
    if (entry.type === "no_rule_match") {
      if (pending) {
        commandOutcomes.push(commandOutcomeFromMatches(pending));
        pending = undefined;
      }
      commandOutcomes.push({
        cmd: entry.cmd,
        decision: "NOMATCH",
        source: "no-rule-match",
        cwd: entry.cwd,
        env: { ...entry.env }
      });
      continue;
    }
    if (entry.type === "rule_match") {
      const cmd = entry.cmd ?? "";
      const cwd = entry.cwd ?? "";
      const env = entry.env ?? {};
      if (pending && (pending.cmd !== cmd || pending.cwd !== cwd || !envMapsEqual(pending.env, env))) {
        commandOutcomes.push(commandOutcomeFromMatches(pending));
        pending = undefined;
      }
      if (!pending) {
        pending = {
          cmd,
          cwd,
          env: { ...env },
          matches: []
        };
      }
      pending.matches.push(entry);
      continue;
    }
    if (entry.type === "aggregation") {
      if (pending) {
        commandOutcomes.push(commandOutcomeFromMatches(pending));
        pending = undefined;
      }
    }
  }
  if (pending) {
    commandOutcomes.push(commandOutcomeFromMatches(pending));
  }
  return commandOutcomes;
}
function flattenSequential(node) {
  if (node.type === "binop") {
    const binop = node;
    if (binop.op === "&&" || binop.op === ";") {
      return [
        ...flattenSequential(binop.children.left),
        ...flattenSequential(binop.children.right)
      ];
    }
  }
  if (node.type === "bash") {
    const bashNode = node;
    return flattenSequential(bashNode.children.command);
  }
  return [node];
}
function truncateLabel(label, maxLength) {
  if (label.length <= maxLength) {
    return label;
  }
  return label.slice(0, maxLength - 1) + "…";
}
function formatEnvSummary(env) {
  const envKeys = Object.keys(env).sort();
  const parts = [];
  for (const key of envKeys) {
    parts.push(`${key}=${env[key]}`);
  }
  return parts.join(", ");
}
function formatRuleLine(outcome) {
  if (outcome.source === "no-rule-match") {
    return;
  }
  if (outcome.reason === "set environment variable") {
    return;
  }
  if (outcome.ruleFile !== undefined) {
    if (outcome.ruleLine !== undefined) {
      return `rule: ${outcome.ruleFile}:${outcome.ruleLine}`;
    }
    return `rule: ${outcome.ruleFile}`;
  }
  return "rule: (builtin)";
}
function outcomeIndent(prefix, isLast) {
  if (isLast) {
    return `${prefix}      `;
  }
  return `${prefix}│     `;
}
function appendOutcomeLines(outcome, commandContext, hookCwd, prefix, isLast, lines) {
  lines.push(`${prefix}│`);
  const indent = outcomeIndent(prefix, isLast);
  if (commandContext !== undefined && commandContext.cwd !== hookCwd) {
    lines.push(`${indent}cwd: ${commandContext.cwd}`);
  }
  if (commandContext !== undefined && Object.keys(commandContext.env).length > 0) {
    lines.push(`${indent}env: ${formatEnvSummary(commandContext.env)}`);
  }
  if (outcome === undefined) {
    return;
  }
  lines.push(`${indent}decision: ${outcome.decision}`);
  const ruleLine = formatRuleLine(outcome);
  if (ruleLine !== undefined) {
    lines.push(`${indent}${ruleLine}`);
  }
  if (outcome.reason !== undefined && outcome.reason !== "") {
    lines.push(`${indent}reason: "${outcome.reason}"`);
  }
}
function appendTreeLines(node, prefix, isLast, commandDecisionMap, commandContextMap, hookCwd, lines) {
  const connector = isLast ? "└── " : "├── ";
  const childPrefix = isLast ? "    " : "│   ";
  if (node.type === "bash") {
    const bashNode = node;
    appendTreeLines(bashNode.children.command, prefix, isLast, commandDecisionMap, commandContextMap, hookCwd, lines);
    return;
  }
  if (node.type === "binop") {
    const binop = node;
    if (binop.op === "&&" || binop.op === ";") {
      const parts = flattenSequential(node);
      if (parts.length > 1) {
        lines.push(`${prefix}${connector}${truncateLabel(node.source, 80)}`);
        for (let index = 0;index < parts.length; index++) {
          appendTreeLines(parts[index], `${prefix}${childPrefix}`, index === parts.length - 1, commandDecisionMap, commandContextMap, hookCwd, lines);
        }
        if (!isLast) {
          lines.push(`${prefix}│`);
        }
        return;
      }
    }
  }
  if (!node.children) {
    lines.push(`${prefix}${connector}${truncateLabel(node.source, 80)}`);
    appendOutcomeLines(commandDecisionMap.get(node.source), commandContextMap.get(node.source), hookCwd, prefix, isLast, lines);
    if (!isLast) {
      lines.push(`${prefix}│`);
    }
    return;
  }
  lines.push(`${prefix}${connector}${truncateLabel(node.source, 80)}`);
  const children = childNodes(node);
  for (let index = 0;index < children.length; index++) {
    appendTreeLines(children[index], `${prefix}${childPrefix}`, index === children.length - 1, commandDecisionMap, commandContextMap, hookCwd, lines);
  }
  if (!isLast) {
    lines.push(`${prefix}│`);
  }
}
function formatPendingPromptTree(root, commandDecisionMap, commandContextMap, hookCwd) {
  const lines = [];
  lines.push(truncateLabel(root.source, 80));
  const displayRoot = root.type === "bash" ? root.children.command : root;
  if (displayRoot.type === "binop") {
    const binop = displayRoot;
    if (binop.op === "&&" || binop.op === ";") {
      const parts = flattenSequential(displayRoot);
      for (let index = 0;index < parts.length; index++) {
        appendTreeLines(parts[index], "", index === parts.length - 1, commandDecisionMap, commandContextMap, hookCwd, lines);
      }
      return lines.join(`
`);
    }
  }
  appendTreeLines(displayRoot, "", true, commandDecisionMap, commandContextMap, hookCwd, lines);
  return lines.join(`
`);
}
function decisionPriority(decision) {
  if (decision === "DENY") {
    return 3;
  }
  if (decision === "ASK" || decision === "NOMATCH") {
    return 2;
  }
  return 1;
}
function sourceLabelForOutcome(outcome) {
  if (outcome.source === "no-rule-match") {
    return "no rule matched";
  }
  if (outcome.source === "deny-rule") {
    return "deny rule";
  }
  return "matched rule";
}
function resolveVerdictTrigger(commandDecisionMap, commandContextMap, root, hookCwd, decisionReason) {
  let bestCmd = root.source;
  let bestOutcome = commandDecisionMap.get(bestCmd);
  let bestPriority = bestOutcome !== undefined ? decisionPriority(bestOutcome.decision) : 0;
  for (const [cmd, outcome] of commandDecisionMap.entries()) {
    const priority = decisionPriority(outcome.decision);
    if (priority > bestPriority) {
      bestPriority = priority;
      bestCmd = cmd;
      bestOutcome = outcome;
    }
  }
  let reason = decisionReason;
  if (bestOutcome !== undefined && bestOutcome.reason !== undefined) {
    reason = bestOutcome.reason;
  }
  const commandContext = commandContextMap.get(bestCmd);
  let cwd;
  if (commandContext !== undefined && commandContext.cwd !== hookCwd) {
    cwd = commandContext.cwd;
  }
  let env;
  if (commandContext !== undefined && Object.keys(commandContext.env).length > 0) {
    env = commandContext.env;
  }
  const sourceLabel = bestOutcome !== undefined ? sourceLabelForOutcome(bestOutcome) : "no rule matched";
  return {
    cmd: bestCmd,
    sourceLabel,
    reason,
    cwd,
    env,
    outcome: bestOutcome
  };
}
function formatContextBlock(call, context0) {
  const envKeys = Object.keys(context0.env).sort();
  if (envKeys.length === 0) {
    return call.cwd;
  }
  const lines = [call.cwd, ""];
  for (const key of envKeys) {
    lines.push(`${key}=${context0.env[key]}`);
  }
  return lines.join(`
`);
}
function appendVerdictOutcomeLines(lines, outcome) {
  if (outcome === undefined) {
    return;
  }
  lines.push(`decision: ${outcome.decision}`);
  const ruleLine = formatRuleLine(outcome);
  if (ruleLine !== undefined) {
    lines.push(ruleLine);
  }
  if (outcome.reason !== undefined && outcome.reason !== "") {
    lines.push(`reason: "${outcome.reason}"`);
  }
}
function formatVerdictBlock(trigger, decision, hookCwd) {
  const lines = [];
  lines.push(`decision: ${decision.toUpperCase()}`);
  lines.push(`source: ${trigger.sourceLabel}`);
  if (trigger.outcome !== undefined && trigger.outcome.source !== "no-rule-match") {
    const ruleLine = formatRuleLine(trigger.outcome);
    if (ruleLine !== undefined) {
      lines.push(ruleLine);
    }
  }
  if (trigger.reason !== undefined && trigger.reason !== "") {
    lines.push(`reason: "${trigger.reason}"`);
  }
  lines.push(`project directory: ${hookCwd}`);
  lines.push("");
  lines.push(`cmd: ${trigger.cmd}`);
  if (trigger.cwd !== undefined) {
    lines.push(`command directory: ${trigger.cwd}`);
  }
  if (trigger.env !== undefined) {
    lines.push(`env: ${formatEnvSummary(trigger.env)}`);
  }
  appendVerdictOutcomeLines(lines, trigger.outcome);
  return lines.join(`
`);
}
async function formatPendingPromptMarkdown(call, root, commandOutcomes, decision, reason, pendingSince) {
  const context0 = {
    cwd: call.cwd,
    cwdResolved: true,
    env: {}
  };
  const commandDecisionMap = buildCommandDecisionMap(commandOutcomes);
  const commandContextMap = buildCommandContextMap(commandOutcomes);
  const treeBlock = formatPendingPromptTree(root, commandDecisionMap, commandContextMap, call.cwd);
  const trigger = resolveVerdictTrigger(commandDecisionMap, commandContextMap, root, call.cwd, reason);
  const contextBlock = formatContextBlock(call, context0);
  const sections = [];
  sections.push(`# ${call.tool_name} — ${decision.toUpperCase()}`);
  sections.push("");
  sections.push(`Pending since ${formatLocalTimestamp(pendingSince)}`);
  sections.push("");
  sections.push("## Verdict");
  sections.push("");
  sections.push("```");
  sections.push(formatVerdictBlock(trigger, decision, call.cwd));
  sections.push("```");
  sections.push("");
  sections.push("## Command");
  sections.push("");
  sections.push("```");
  sections.push(summarizeToolInput(call));
  sections.push("```");
  sections.push("");
  sections.push("## Context");
  sections.push("");
  sections.push(contextBlock);
  sections.push("");
  sections.push("## Parsed command tree");
  sections.push("");
  sections.push("```");
  sections.push(treeBlock);
  sections.push("```");
  sections.push("");
  return sections.join(`
`);
}
async function writePendingPrompt(projectDir, call, root, commandOutcomes, decision, reason, pendingSince) {
  const pendingDir = resolvePendingDir(projectDir);
  await mkdir2(pendingDir, { recursive: true });
  const baseFileName = buildPendingPromptFileName(call, pendingSince);
  const filePath = await resolvePendingPromptFilePath(pendingDir, baseFileName);
  const content = await formatPendingPromptMarkdown(call, root, commandOutcomes, decision, reason, pendingSince);
  await writeFile2(filePath, content, "utf-8");
}
async function cleanupStalePendingPrompts(projectDir, now, maxAgeDays) {
  const pendingDir = resolvePendingDir(projectDir);
  let fileNames;
  try {
    fileNames = await readdir3(pendingDir);
  } catch {
    return;
  }
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  for (const fileName of fileNames) {
    if (!fileName.endsWith(".md")) {
      continue;
    }
    const filePath = join4(pendingDir, fileName);
    const fileStat = await stat3(filePath);
    const ageMs = now.getTime() - fileStat.mtimeMs;
    if (ageMs > maxAgeMs) {
      await unlink(filePath);
    }
  }
}

// src/pre-hook.ts
import { homedir } from "os";
var hookEventName = "PreToolUse";
function resolveHomeDir() {
  if (process.env["HOME"]) {
    return process.env["HOME"];
  }
  return homedir();
}
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}
async function runHook() {
  try {
    const rawStdin = await readStdin();
    const call = JSON.parse(rawStdin);
    const projectDir = process.env["CLAUDE_PROJECT_DIR"];
    if (!projectDir) {
      throw new Error("CLAUDE_PROJECT_DIR is not set");
    }
    const homeDir = resolveHomeDir();
    const logger = createLogger(projectDir, new Date);
    await ensureLogDirIgnored(resolveLogBaseDir(projectDir));
    await cleanupStalePendingPrompts(projectDir, new Date, STALE_PENDING_PROMPT_MAX_AGE_DAYS);
    logger.log({
      type: "tool_request",
      timestamp: toLocalISOString(new Date),
      tool: call.tool_name,
      input: call.tool_input,
      cwd: call.cwd
    });
    const ast = await parseToolCallToAst(call, homeDir, projectDir);
    const rules = await load(projectDir, homeDir, logger);
    const startingContext = { cwd: call.cwd, cwdResolved: true, env: {} };
    const capturingLogger = new CapturingAuditLogger;
    const decision = await decide(ast, rules, startingContext, capturingLogger);
    for (const entry of capturingLogger.getEntries()) {
      logger.log(entry);
    }
    const commandOutcomes = commandOutcomesFromAuditEntries(capturingLogger.getEntries());
    const permissionDecision = decision !== undefined ? decision.action : "ask";
    const permissionDecisionReason = decision !== undefined ? decision.reason : undefined;
    logger.log({
      type: "final_decision",
      timestamp: toLocalISOString(new Date),
      tool: call.tool_name,
      cmd: ast.source,
      decision: permissionDecision,
      reason: permissionDecisionReason
    });
    if (permissionDecision === "ask") {
      await writePendingPrompt(projectDir, call, ast, commandOutcomes, permissionDecision, permissionDecisionReason, new Date);
    }
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName,
        permissionDecision,
        permissionDecisionReason
      }
    }) + `
`);
    process.exit(0);
  } catch (hookError) {
    process.stderr.write(String(hookError) + `
`);
    process.exit(1);
  }
}
if (process.env["NODE_ENV"] !== "test") {
  runHook();
}
export {
  runHook,
  resolveHomeDir,
  readStdin
};
