var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub3) => {
      this.issues = [...this.issues, sub3];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub3 of this.issues) {
      if (sub3.path.length > 0) {
        const firstEl = sub3.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub3));
      } else {
        formErrors.push(mapper(sub3));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

// node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: (arg) => ZodString.create({ ...arg, coerce: true }),
  number: (arg) => ZodNumber.create({ ...arg, coerce: true }),
  boolean: (arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  }),
  bigint: (arg) => ZodBigInt.create({ ...arg, coerce: true }),
  date: (arg) => ZodDate.create({ ...arg, coerce: true })
};
var NEVER = INVALID;

// api/_lib/kernel/planSchema.ts
var PointName = external_exports.string().regex(/^[A-Z]\d*'?$/, `Point names must be an uppercase letter, optional digits, optional trailing prime, e.g. "A", "A1", "A'"`);
var TriangleDimsSchema = external_exports.discriminatedUnion("triangleType", [
  external_exports.object({ triangleType: external_exports.literal("equilateral"), edge: external_exports.number().positive() }),
  external_exports.object({ triangleType: external_exports.literal("right"), leg1: external_exports.number().positive(), leg2: external_exports.number().positive() }),
  external_exports.object({ triangleType: external_exports.literal("isosceles"), base: external_exports.number().positive(), legLength: external_exports.number().positive() }),
  external_exports.object({
    triangleType: external_exports.literal("sss"),
    p1p2: external_exports.number().positive(),
    p1p3: external_exports.number().positive(),
    p2p3: external_exports.number().positive()
  })
]);
var SquareDims = external_exports.object({ edge: external_exports.number().positive() }).strict();
var RectangleDims = external_exports.object({ width: external_exports.number().positive(), height: external_exports.number().positive() }).strict();
var RhombusDims = external_exports.object({ diag1: external_exports.number().positive(), diag2: external_exports.number().positive() }).strict();
var RegPolygonDims = external_exports.object({ n: external_exports.number().int().min(3).max(24), edge: external_exports.number().positive() }).strict();
var BaseOpSchema = external_exports.object({
  op: external_exports.literal("base"),
  shape: external_exports.enum(["square", "rectangle", "triangle", "reg_polygon", "rhombus"]),
  vertices: external_exports.array(PointName).min(3),
  dims: external_exports.union([SquareDims, RectangleDims, RhombusDims, RegPolygonDims, TriangleDimsSchema])
}).superRefine((val, ctx) => {
  const fixedCount = { square: 4, rectangle: 4, rhombus: 4, triangle: 3 };
  const expected = val.shape === "reg_polygon" ? val.dims.n : fixedCount[val.shape];
  if (typeof expected === "number" && val.vertices.length !== expected) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: `shape "${val.shape}" requires exactly ${expected} vertices, got ${val.vertices.length}`,
      path: ["vertices"]
    });
  }
  const has = (key) => Object.prototype.hasOwnProperty.call(val.dims, key);
  const shapeMatchesDims = {
    square: has("edge") && !has("n") && !has("width"),
    rectangle: has("width") && has("height"),
    rhombus: has("diag1") && has("diag2"),
    reg_polygon: has("n") && has("edge"),
    triangle: has("triangleType")
  };
  if (!shapeMatchesDims[val.shape]) {
    ctx.addIssue({ code: external_exports.ZodIssueCode.custom, message: `dims do not match shape "${val.shape}"`, path: ["dims"] });
  }
});
var PrismOpSchema = external_exports.object({
  op: external_exports.literal("prism"),
  base: external_exports.array(PointName).min(3),
  top: external_exports.array(PointName).min(3),
  height: external_exports.number().positive()
}).superRefine((val, ctx) => {
  if (val.base.length !== val.top.length) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: `prism "base" has ${val.base.length} vertices but "top" has ${val.top.length}; they must match`,
      path: ["top"]
    });
  }
});
var PyramidOpSchema = external_exports.object({
  op: external_exports.literal("pyramid"),
  base: external_exports.array(PointName).min(3),
  apex: PointName,
  height: external_exports.number().positive()
});
var PointOpSchema = external_exports.object({
  op: external_exports.literal("point"),
  name: PointName,
  def: external_exports.discriminatedUnion("kind", [
    external_exports.object({ kind: external_exports.literal("midpoint"), of: external_exports.tuple([PointName, PointName]) }),
    external_exports.object({ kind: external_exports.literal("centroid"), of: external_exports.array(PointName).min(2) }),
    external_exports.object({ kind: external_exports.literal("ratio"), from: PointName, to: PointName, t: external_exports.number() }),
    external_exports.object({ kind: external_exports.literal("reflect"), point: PointName, about: PointName })
  ])
});
var PerpPointOpSchema = external_exports.object({
  op: external_exports.literal("perp_point"),
  name: PointName,
  from: PointName,
  to: external_exports.literal("plane"),
  target: external_exports.string().min(1),
  length: external_exports.number().positive()
});
var FootOpSchema = external_exports.object({
  op: external_exports.literal("foot"),
  name: PointName,
  from: PointName,
  onto: external_exports.enum(["plane", "line"]),
  target: external_exports.string().min(1)
});
var IntersectOpSchema = external_exports.object({
  op: external_exports.literal("intersect"),
  name: PointName,
  a: external_exports.string().min(1),
  b: external_exports.string().min(1)
});
var EdgeOpSchema = external_exports.object({
  op: external_exports.literal("edge"),
  from: PointName,
  to: PointName
});
var ConstructionOpSchema = external_exports.union([
  BaseOpSchema,
  PrismOpSchema,
  PyramidOpSchema,
  PointOpSchema,
  PerpPointOpSchema,
  FootOpSchema,
  IntersectOpSchema,
  EdgeOpSchema
]);
var AssertOpSchema = external_exports.object({
  relation: external_exports.enum(["perp", "parallel", "coplanar", "on", "dist", "angle"]),
  args: external_exports.array(external_exports.string().min(1)).min(1),
  value: external_exports.number().optional(),
  tolerance: external_exports.number().positive().optional()
}).superRefine((val, ctx) => {
  const needsExactly2 = ["perp", "parallel", "on", "dist", "angle"];
  if (needsExactly2.includes(val.relation) && val.args.length !== 2) {
    ctx.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: `relation "${val.relation}" requires exactly 2 args, got ${val.args.length}`,
      path: ["args"]
    });
  }
  if (val.relation === "coplanar" && val.args.length < 4) {
    ctx.addIssue({ code: external_exports.ZodIssueCode.custom, message: 'relation "coplanar" requires at least 4 args', path: ["args"] });
  }
  if ((val.relation === "dist" || val.relation === "angle") && val.value === void 0) {
    ctx.addIssue({ code: external_exports.ZodIssueCode.custom, message: `relation "${val.relation}" requires a "value"`, path: ["value"] });
  }
});
var QuerySchema = external_exports.discriminatedUnion("kind", [
  external_exports.object({ kind: external_exports.literal("distance"), a: external_exports.string().min(1), b: external_exports.string().min(1) }),
  external_exports.object({ kind: external_exports.literal("angle"), a: external_exports.string().min(1), b: external_exports.string().min(1) }),
  external_exports.object({ kind: external_exports.literal("volume"), target: external_exports.string().min(1) }),
  external_exports.object({ kind: external_exports.literal("area"), target: external_exports.string().min(1) })
]);
var PlanSchema = external_exports.object({
  solidName: external_exports.string().min(1),
  ops: external_exports.array(ConstructionOpSchema).min(1),
  asserts: external_exports.array(AssertOpSchema).default([]),
  query: QuerySchema.optional()
});

// api/_lib/kernel/resolve.ts
var PAREN_RE = /^\((.+)\)$/;
function tokenizePointNames(raw, known) {
  const names = Array.from(known).sort((a, b) => b.length - a.length);
  const tokens = [];
  let rest = raw;
  while (rest.length > 0) {
    const match = names.find((n) => rest.startsWith(n));
    if (!match) return null;
    tokens.push(match);
    rest = rest.slice(match.length);
  }
  return tokens;
}
function requirePoint(symtab, name) {
  const p = symtab.points.get(name);
  if (!p) throw new Error(`Unknown point "${name}"`);
  return p;
}
function resolveEntity(token, symtab) {
  const parenMatch = token.match(PAREN_RE);
  const inner = parenMatch ? parenMatch[1] : token;
  if (symtab.points.has(inner)) {
    return { type: "point", name: inner, pos: requirePoint(symtab, inner) };
  }
  if (symtab.namedPlanes.has(inner)) {
    const names = symtab.namedPlanes.get(inner);
    return { type: "plane", points: names, positions: names.map((n) => requirePoint(symtab, n)) };
  }
  const known = new Set(symtab.points.keys());
  const tokens = tokenizePointNames(inner, known);
  if (!tokens) {
    throw new Error(
      `Cannot resolve entity "${token}": it is not a known point, a registered named plane, or a compound of known point names`
    );
  }
  if (tokens.length === 1) {
    return { type: "point", name: tokens[0], pos: requirePoint(symtab, tokens[0]) };
  }
  if (tokens.length === 2) {
    return {
      type: "line",
      a: tokens[0],
      b: tokens[1],
      posA: requirePoint(symtab, tokens[0]),
      posB: requirePoint(symtab, tokens[1])
    };
  }
  return { type: "plane", points: tokens, positions: tokens.map((n) => requirePoint(symtab, n)) };
}

// api/_lib/kernel/vecMath.ts
var EPS = 1e-6;
function vec3(x, y, z) {
  return { x, y, z };
}
function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}
function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
function scale(a, s) {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}
function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}
function length(a) {
  return Math.sqrt(dot(a, a));
}
function normalize(a) {
  const len = length(a);
  if (len < EPS) throw new Error("Cannot normalize a zero-length vector");
  return { x: a.x / len, y: a.y / len, z: a.z / len };
}
function centroidOf(points) {
  if (points.length === 0) throw new Error("Cannot compute centroid of an empty point list");
  const sum = points.reduce((acc, p) => add(acc, p), vec3(0, 0, 0));
  return scale(sum, 1 / points.length);
}
function distance(a, b) {
  return length(sub(a, b));
}
function planeNormal(p1, p2, p3) {
  const n = cross(sub(p2, p1), sub(p3, p1));
  const len = length(n);
  if (len < EPS) throw new Error("Cannot compute a plane normal: the three points are collinear");
  let unit = scale(n, 1 / len);
  if (unit.z < -EPS) unit = scale(unit, -1);
  return unit;
}
function distancePointToPlane(p, planePoint, normal) {
  return Math.abs(dot(sub(p, planePoint), normal));
}
function projectPointOntoPlane(p, planePoint, normal) {
  const d = dot(sub(p, planePoint), normal);
  return sub(p, scale(normal, d));
}
function distancePointToLine(p, a, b) {
  const d = normalize(sub(b, a));
  const ap = sub(p, a);
  const proj = scale(d, dot(ap, d));
  return length(sub(ap, proj));
}
function projectPointOntoLine(p, a, b) {
  const d = normalize(sub(b, a));
  const t = dot(sub(p, a), d);
  return add(a, scale(d, t));
}
function angleBetween(a, b) {
  const la = length(a);
  const lb = length(b);
  if (la < EPS || lb < EPS) {
    throw new Error("Cannot measure an angle with a zero-length (degenerate) vector");
  }
  const cosT = dot(a, b) / (la * lb);
  const clamped = Math.max(-1, Math.min(1, cosT));
  return Math.acos(clamped) * 180 / Math.PI;
}
function scalarTriple(a, b, c) {
  return dot(a, cross(b, c));
}
function areCollinear(a, b, c, eps = EPS) {
  const u = sub(b, a);
  const v = sub(c, a);
  const lu = length(u);
  const lv = length(v);
  if (lu < EPS || lv < EPS) return true;
  return length(cross(u, v)) / (lu * lv) < eps;
}
function arePointsCoplanar(points, eps = EPS) {
  if (points.length <= 3) return true;
  const p0 = points[0];
  let normal = null;
  for (let i = 1; i < points.length - 1 && !normal; i++) {
    for (let j = i + 1; j < points.length; j++) {
      try {
        normal = planeNormal(p0, points[i], points[j]);
        break;
      } catch {
      }
    }
  }
  if (!normal) return true;
  return points.every((p) => distancePointToPlane(p, p0, normal) < eps);
}
function tetrahedronVolume(a, b, c, d) {
  return Math.abs(scalarTriple(sub(b, a), sub(c, a), sub(d, a))) / 6;
}

// api/_lib/kernel/ops/shapes.ts
function buildSquare(edge) {
  const h = edge / 2;
  return [vec3(-h, -h, 0), vec3(h, -h, 0), vec3(h, h, 0), vec3(-h, h, 0)];
}
function buildRectangle(width, height) {
  const hw = width / 2;
  const hh = height / 2;
  return [vec3(-hw, -hh, 0), vec3(hw, -hh, 0), vec3(hw, hh, 0), vec3(-hw, hh, 0)];
}
function buildRhombus(diag1, diag2) {
  const h1 = diag1 / 2;
  const h2 = diag2 / 2;
  return [vec3(-h1, 0, 0), vec3(0, -h2, 0), vec3(h1, 0, 0), vec3(0, h2, 0)];
}
function buildRegPolygon(n, edge) {
  if (n < 3) throw new Error(`reg_polygon requires n >= 3, got ${n}`);
  const R = edge / (2 * Math.sin(Math.PI / n));
  const pts = [];
  for (let k = 0; k < n; k++) {
    const theta = 2 * Math.PI * k / n;
    pts.push(vec3(R * Math.cos(theta), R * Math.sin(theta), 0));
  }
  return pts;
}
function buildTriangle(dims) {
  switch (dims.triangleType) {
    case "equilateral": {
      const a = dims.edge;
      return [vec3(0, a * Math.sqrt(3) / 2, 0), vec3(-a / 2, 0, 0), vec3(a / 2, 0, 0)];
    }
    case "right": {
      const { leg1, leg2 } = dims;
      return [vec3(0, 0, 0), vec3(leg1, 0, 0), vec3(0, leg2, 0)];
    }
    case "isosceles": {
      const { base, legLength } = dims;
      const half = base / 2;
      const hSq = legLength * legLength - half * half;
      if (hSq <= 0) {
        throw new Error(`Invalid isosceles triangle: legLength (${legLength}) too short for base (${base})`);
      }
      const h = Math.sqrt(hSq);
      return [vec3(0, h, 0), vec3(-half, 0, 0), vec3(half, 0, 0)];
    }
    case "sss": {
      const { p1p2, p1p3, p2p3 } = dims;
      if (p1p2 + p1p3 <= p2p3 || p1p2 + p2p3 <= p1p3 || p1p3 + p2p3 <= p1p2) {
        throw new Error(`Invalid triangle sides (${p1p2}, ${p1p3}, ${p2p3}): violate the triangle inequality`);
      }
      const p1 = vec3(0, 0, 0);
      const p2 = vec3(p1p2, 0, 0);
      const cosAngle = (p1p2 * p1p2 + p1p3 * p1p3 - p2p3 * p2p3) / (2 * p1p2 * p1p3);
      const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
      const p3 = vec3(p1p3 * Math.cos(angle), p1p3 * Math.sin(angle), 0);
      return [p1, p2, p3];
    }
  }
}

// api/_lib/kernel/ops/extrude.ts
function extrudePrism(basePositions, height) {
  return basePositions.map((p) => add(p, vec3(0, 0, height)));
}
function extrudePyramidApex(basePositions, height) {
  const c = centroidOf(basePositions);
  const n = planeNormal(basePositions[0], basePositions[1], basePositions[2]);
  return add(c, scale(n, height));
}

// api/_lib/kernel/ops/points.ts
function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}
function centroidPoint(points) {
  const sum = points.reduce((acc, p) => add(acc, p), { x: 0, y: 0, z: 0 });
  return scale(sum, 1 / points.length);
}
function ratioPoint(from, to, t) {
  return add(from, scale(sub(to, from), t));
}
function reflectPoint(point, about) {
  return sub(scale(about, 2), point);
}
function perpPointFromPlane(fromPos, planePositions, length_) {
  const [p1, p2, p3] = planePositions;
  const n = planeNormal(p1, p2, p3);
  return add(fromPos, scale(n, length_));
}
function footOnPlane(fromPos, planePositions) {
  const [p1, p2, p3] = planePositions;
  const n = planeNormal(p1, p2, p3);
  return projectPointOntoPlane(fromPos, p1, n);
}
function footOnLine(fromPos, a, b) {
  return projectPointOntoLine(fromPos, a, b);
}
function intersectLineLine(a1, a2, b1, b2) {
  const d1 = sub(a2, a1);
  const d2 = sub(b2, b1);
  const r = sub(b1, a1);
  const l1 = length(d1);
  const l2 = length(d2);
  if (l1 < EPS || l2 < EPS) {
    throw new Error("Degenerate line: a direction is zero-length (its two points coincide)");
  }
  const cross12 = cross(d1, d2);
  const denom = dot(cross12, cross12);
  if (length(cross12) / (l1 * l2) < EPS) {
    throw new Error("Lines are parallel; no unique intersection point exists");
  }
  const rlen = length(r);
  if (rlen > EPS && Math.abs(dot(r, cross12)) / (rlen * l1 * l2) > EPS) {
    throw new Error("Lines are skew (not coplanar); no intersection point exists");
  }
  const t = dot(cross(r, d2), cross12) / denom;
  return add(a1, scale(d1, t));
}
function intersectLinePlane(a, b, planePositions) {
  const [p1, p2, p3] = planePositions;
  const n = planeNormal(p1, p2, p3);
  const d = sub(b, a);
  const dlen = length(d);
  if (dlen < EPS) {
    throw new Error("Degenerate line: its two points coincide (zero-length direction)");
  }
  const denom = dot(n, d);
  if (Math.abs(denom) / dlen < EPS) {
    throw new Error("Line is parallel to the plane; no unique intersection point exists");
  }
  const t = dot(n, sub(p1, a)) / denom;
  return add(a, scale(d, t));
}

// api/_lib/kernel/execute.ts
function createEmptySymbolTable() {
  return { points: /* @__PURE__ */ new Map(), namedPlanes: /* @__PURE__ */ new Map(), edges: /* @__PURE__ */ new Set(), derivedPoints: /* @__PURE__ */ new Set() };
}
function requirePoint2(symtab, name) {
  const p = symtab.points.get(name);
  if (!p) throw new Error(`Unknown point "${name}" referenced before it was defined`);
  return p;
}
function setPoint(symtab, name, pos) {
  if (symtab.points.has(name)) {
    throw new Error(`Point "${name}" is already defined`);
  }
  symtab.points.set(name, pos);
}
function setDerivedPoint(symtab, name, pos) {
  setPoint(symtab, name, pos);
  (symtab.derivedPoints ??= /* @__PURE__ */ new Set()).add(name);
}
function edgeKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
function addEdge(symtab, a, b) {
  symtab.edges.add(edgeKey(a, b));
}
function addCyclicEdges(symtab, verts) {
  for (let i = 0; i < verts.length; i++) {
    addEdge(symtab, verts[i], verts[(i + 1) % verts.length]);
  }
}
function executeOp(op, symtab) {
  switch (op.op) {
    case "base": {
      let positions;
      switch (op.shape) {
        case "square":
          positions = buildSquare(op.dims.edge);
          break;
        case "rectangle": {
          const d = op.dims;
          positions = buildRectangle(d.width, d.height);
          break;
        }
        case "rhombus": {
          const d = op.dims;
          positions = buildRhombus(d.diag1, d.diag2);
          break;
        }
        case "reg_polygon": {
          const d = op.dims;
          positions = buildRegPolygon(d.n, d.edge);
          break;
        }
        case "triangle":
          positions = buildTriangle(op.dims);
          break;
      }
      op.vertices.forEach((name, i) => setPoint(symtab, name, positions[i]));
      symtab.namedPlanes.set(op.vertices.join(""), op.vertices);
      addCyclicEdges(symtab, op.vertices);
      break;
    }
    case "prism": {
      const basePositions = op.base.map((n) => requirePoint2(symtab, n));
      const topPositions = extrudePrism(basePositions, op.height);
      op.top.forEach((name, i) => setPoint(symtab, name, topPositions[i]));
      symtab.namedPlanes.set(op.top.join(""), op.top);
      addCyclicEdges(symtab, op.top);
      op.base.forEach((baseName, i) => addEdge(symtab, baseName, op.top[i]));
      break;
    }
    case "pyramid": {
      const basePositions = op.base.map((n) => requirePoint2(symtab, n));
      const apexPos = extrudePyramidApex(basePositions, op.height);
      setPoint(symtab, op.apex, apexPos);
      op.base.forEach((baseName) => addEdge(symtab, op.apex, baseName));
      break;
    }
    case "point": {
      let pos;
      switch (op.def.kind) {
        case "midpoint":
          pos = midpoint(requirePoint2(symtab, op.def.of[0]), requirePoint2(symtab, op.def.of[1]));
          break;
        case "centroid":
          pos = centroidPoint(op.def.of.map((n) => requirePoint2(symtab, n)));
          break;
        case "ratio":
          pos = ratioPoint(requirePoint2(symtab, op.def.from), requirePoint2(symtab, op.def.to), op.def.t);
          break;
        case "reflect":
          pos = reflectPoint(requirePoint2(symtab, op.def.point), requirePoint2(symtab, op.def.about));
          break;
      }
      setDerivedPoint(symtab, op.name, pos);
      break;
    }
    case "perp_point": {
      const fromPos = requirePoint2(symtab, op.from);
      const plane = resolveEntity(op.target, symtab);
      if (plane.type !== "plane") {
        throw new Error(`perp_point target "${op.target}" must resolve to a plane, got "${plane.type}"`);
      }
      setDerivedPoint(symtab, op.name, perpPointFromPlane(fromPos, plane.positions.slice(0, 3), op.length));
      break;
    }
    case "foot": {
      const fromPos = requirePoint2(symtab, op.from);
      const target = resolveEntity(op.target, symtab);
      let pos;
      if (op.onto === "plane") {
        if (target.type !== "plane") throw new Error(`foot onto plane: "${op.target}" must resolve to a plane`);
        pos = footOnPlane(fromPos, target.positions.slice(0, 3));
      } else {
        if (target.type !== "line") throw new Error(`foot onto line: "${op.target}" must resolve to a line`);
        pos = footOnLine(fromPos, target.posA, target.posB);
      }
      setDerivedPoint(symtab, op.name, pos);
      break;
    }
    case "intersect": {
      const a = resolveEntity(op.a, symtab);
      const b = resolveEntity(op.b, symtab);
      let pos;
      if (a.type === "line" && b.type === "line") {
        pos = intersectLineLine(a.posA, a.posB, b.posA, b.posB);
      } else if (a.type === "line" && b.type === "plane") {
        pos = intersectLinePlane(a.posA, a.posB, b.positions.slice(0, 3));
      } else if (a.type === "plane" && b.type === "line") {
        pos = intersectLinePlane(b.posA, b.posB, a.positions.slice(0, 3));
      } else {
        throw new Error(
          `intersect: unsupported combination "${a.type}" x "${b.type}" (plane-plane intersection is out of scope for Phase 1)`
        );
      }
      setDerivedPoint(symtab, op.name, pos);
      break;
    }
    case "edge": {
      requirePoint2(symtab, op.from);
      requirePoint2(symtab, op.to);
      addEdge(symtab, op.from, op.to);
      break;
    }
  }
}
function executePlan(plan) {
  const symtab = createEmptySymbolTable();
  for (const op of plan.ops) {
    executeOp(op, symtab);
  }
  return symtab;
}

// api/_lib/kernel/verify.ts
var DEFAULT_DIST_TOLERANCE = 1e-6;
var DEFAULT_ANGLE_TOLERANCE_DEG = 1e-3;
function directionOf(entity) {
  if (entity.type === "line") return sub(entity.posB, entity.posA);
  if (entity.type === "plane") return planeNormal(entity.positions[0], entity.positions[1], entity.positions[2]);
  throw new Error(`Cannot get a direction/normal for entity of type "${entity.type}"`);
}
function verifyAssert(assertOp, symtab) {
  const tol = assertOp.tolerance ?? DEFAULT_DIST_TOLERANCE;
  const angleTol = assertOp.tolerance ?? DEFAULT_ANGLE_TOLERANCE_DEG;
  const [argA, argB] = assertOp.args;
  switch (assertOp.relation) {
    case "perp": {
      const a = resolveEntity(argA, symtab);
      const b = resolveEntity(argB, symtab);
      const rawDot = Math.abs(dot(normalize(directionOf(a)), normalize(directionOf(b))));
      const isLinePlane = a.type === "line" && b.type === "plane" || a.type === "plane" && b.type === "line";
      const actual = isLinePlane ? 1 - rawDot : rawDot;
      if (actual < tol) return null;
      return {
        kind: "assert_failed",
        relation: "perp",
        args: assertOp.args,
        expected: 0,
        actual,
        message: `Expected ${argA} \u22A5 ${argB}, but |cos angle| = ${rawDot.toFixed(6)}`
      };
    }
    case "parallel": {
      const a = resolveEntity(argA, symtab);
      const b = resolveEntity(argB, symtab);
      const da = normalize(directionOf(a));
      const db = normalize(directionOf(b));
      const isLinePlane = a.type === "line" && b.type === "plane" || a.type === "plane" && b.type === "line";
      const actual = isLinePlane ? Math.abs(dot(da, db)) : length(cross(da, db));
      if (actual < tol) return null;
      return {
        kind: "assert_failed",
        relation: "parallel",
        args: assertOp.args,
        expected: 0,
        actual,
        message: isLinePlane ? `Expected ${argA} \u2225 ${argB}, but |cos angle to plane normal| = ${actual.toFixed(6)}` : `Expected ${argA} \u2225 ${argB}, but |cross product| = ${actual.toFixed(6)}`
      };
    }
    case "coplanar": {
      const positions = assertOp.args.map((tok) => {
        const e = resolveEntity(tok, symtab);
        if (e.type !== "point") throw new Error(`coplanar assert requires point args, got "${e.type}" for "${tok}"`);
        return e.pos;
      });
      if (arePointsCoplanar(positions, tol)) return null;
      return {
        kind: "assert_failed",
        relation: "coplanar",
        args: assertOp.args,
        message: `Points ${assertOp.args.join(", ")} are not coplanar`
      };
    }
    case "on": {
      const [pointTok, entityTok] = assertOp.args;
      const p = resolveEntity(pointTok, symtab);
      const e = resolveEntity(entityTok, symtab);
      if (p.type !== "point") throw new Error(`"on" assert requires first arg to be a point, got "${p.type}"`);
      let actual;
      if (e.type === "line") actual = distancePointToLine(p.pos, e.posA, e.posB);
      else if (e.type === "plane") actual = distancePointToPlane(p.pos, e.positions[0], planeNormal(e.positions[0], e.positions[1], e.positions[2]));
      else throw new Error(`"on" assert requires second arg to be a line or plane, got "${e.type}"`);
      if (actual < tol) return null;
      return {
        kind: "assert_failed",
        relation: "on",
        args: assertOp.args,
        expected: 0,
        actual,
        message: `Expected ${pointTok} on ${entityTok}, but distance = ${actual.toFixed(6)}`
      };
    }
    case "dist": {
      const a = resolveEntity(argA, symtab);
      const b = resolveEntity(argB, symtab);
      const expected = assertOp.value;
      let actual;
      if (a.type === "point" && b.type === "point") actual = distance(a.pos, b.pos);
      else if (a.type === "point" && b.type === "line") actual = distancePointToLine(a.pos, b.posA, b.posB);
      else if (a.type === "line" && b.type === "point") actual = distancePointToLine(b.pos, a.posA, a.posB);
      else if (a.type === "point" && b.type === "plane") actual = distancePointToPlane(a.pos, b.positions[0], planeNormal(b.positions[0], b.positions[1], b.positions[2]));
      else if (a.type === "plane" && b.type === "point") actual = distancePointToPlane(b.pos, a.positions[0], planeNormal(a.positions[0], a.positions[1], a.positions[2]));
      else throw new Error(`Unsupported dist combination: "${a.type}" x "${b.type}"`);
      if (Math.abs(actual - expected) < tol) return null;
      return {
        kind: "assert_failed",
        relation: "dist",
        args: assertOp.args,
        expected,
        actual,
        message: `Expected dist(${argA}, ${argB}) = ${expected}, got ${actual.toFixed(6)}`
      };
    }
    case "angle": {
      const a = resolveEntity(argA, symtab);
      const b = resolveEntity(argB, symtab);
      const expected = assertOp.value;
      let actual = angleBetween(directionOf(a), directionOf(b));
      const isLinePlane = a.type === "line" && b.type === "plane" || a.type === "plane" && b.type === "line";
      if (isLinePlane) {
        if (actual > 90) actual = 180 - actual;
        actual = 90 - actual;
      } else if (actual > 90) {
        actual = 180 - actual;
      }
      if (Math.abs(actual - expected) < angleTol) return null;
      return {
        kind: "assert_failed",
        relation: "angle",
        args: assertOp.args,
        expected,
        actual,
        message: `Expected angle(${argA}, ${argB}) = ${expected}\xB0, got ${actual.toFixed(4)}\xB0`
      };
    }
  }
}
function checkDegeneracy(symtab) {
  const violations = [];
  const names = Array.from(symtab.points.keys());
  const derived = symtab.derivedPoints ?? /* @__PURE__ */ new Set();
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      if (derived.has(names[i]) || derived.has(names[j])) continue;
      const pi = symtab.points.get(names[i]);
      const pj = symtab.points.get(names[j]);
      const d = distance(pi, pj);
      if (d < EPS) {
        violations.push({
          kind: "degenerate",
          message: `Points "${names[i]}" and "${names[j]}" coincide (distance ${d.toExponential(2)})`
        });
      }
    }
  }
  for (const [key, verts] of symtab.namedPlanes.entries()) {
    if (verts.length < 3) continue;
    const positions = verts.map((n) => symtab.points.get(n));
    const [p0, p1, p2] = positions;
    if (areCollinear(p0, p1, p2)) {
      violations.push({ kind: "degenerate", message: `Face "${key}" (${verts.join(",")}) is degenerate: first three vertices are collinear` });
    } else if (!arePointsCoplanar(positions)) {
      violations.push({ kind: "degenerate", message: `Face "${key}" (${verts.join(",")}) is not planar` });
    }
  }
  return violations;
}
function verifyPlan(plan, symtab) {
  const violations = [];
  for (const assertOp of plan.asserts) {
    const v = verifyAssert(assertOp, symtab);
    if (v) violations.push(v);
  }
  violations.push(...checkDegeneracy(symtab));
  return { ok: violations.length === 0, violations };
}

// api/_lib/kernel/toGeometryData.ts
function toGeometryData(symtab, name) {
  const points = Array.from(symtab.points.entries()).map(([label, pos]) => ({
    id: label,
    label,
    x: pos.x,
    y: pos.y,
    z: pos.z
  }));
  const lines = Array.from(symtab.edges).map((key) => {
    const [from, to] = key.split("|");
    return { id: `${from}${to}`, from, to, style: "solid" };
  });
  return { name, points, lines };
}

// api/_lib/kernel/trace.ts
var Trace = class {
  events = [];
  log(stage, message, data) {
    this.events.push({ stage, message, data });
  }
  summary() {
    return {
      totalEvents: this.events.length,
      byStage: this.events.reduce((acc, e) => {
        acc[e.stage] = (acc[e.stage] || 0) + 1;
        return acc;
      }, {})
    };
  }
};

// api/_lib/kernel/exactForm.ts
var EPS2 = 1e-4;
var SQUAREFREE_RADICANDS = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15, 17, 19, 21, 22, 23, 26, 29, 30];
var MAX_DENOM = 12;
var MAX_NUMER = 60;
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}
function toExactForm(value, eps = EPS2) {
  if (Math.abs(value) < eps) return { text: "0", isExact: true, value };
  const sign = value < 0 ? -1 : 1;
  const v = Math.abs(value);
  if (Math.abs(v - Math.round(v)) < eps) {
    const p = Math.round(v);
    return { text: sign < 0 ? `-${p}` : `${p}`, isExact: true, value };
  }
  for (let q = 2; q <= MAX_DENOM; q++) {
    const p = Math.round(v * q);
    if (p > 0 && p <= MAX_NUMER * MAX_DENOM && Math.abs(v - p / q) < eps) {
      const g = gcd(p, q);
      const pp = p / g;
      const qq = q / g;
      const text = qq === 1 ? `${pp}` : `${pp}/${qq}`;
      return { text: sign < 0 ? `-${text}` : text, isExact: true, value };
    }
  }
  let best = null;
  for (const n of SQUAREFREE_RADICANDS) {
    const sq = Math.sqrt(n);
    for (let q = 1; q <= MAX_DENOM; q++) {
      const p = Math.round(v * q / sq);
      if (p <= 0 || p > MAX_NUMER) continue;
      const candidate = p * sq / q;
      if (Math.abs(candidate - v) < eps) {
        if (!best || q < best.q || q === best.q && n < best.n) {
          const g = gcd(p, q);
          best = { p: p / g, q: q / g, n };
        }
      }
    }
  }
  if (best) {
    const sqrtPart = `\u221A${best.n}`;
    const numer = best.p === 1 ? sqrtPart : `${best.p}${sqrtPart}`;
    const text = best.q === 1 ? numer : `${numer}/${best.q}`;
    return { text: sign < 0 ? `-${text}` : text, isExact: true, value };
  }
  return { text: (sign * v).toFixed(4), isExact: false, value };
}

// api/_lib/kernel/repair.ts
var REPAIR_MAX_RELATIVE_ERROR = 0.01;
var REPAIR_MAX_PERP_ERROR = 1e-3;
function referenceScale(symtab) {
  const positions = Array.from(symtab.points.values());
  let maxDist = 0;
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      maxDist = Math.max(maxDist, length(sub(positions[i], positions[j])));
    }
  }
  return maxDist || 1;
}
function attemptDeterministicRepair(violation, symtab) {
  if (violation.kind !== "assert_failed") {
    return { repaired: false, reason: "Only assert_failed violations are eligible for deterministic repair" };
  }
  if (violation.relation !== "on" && violation.relation !== "perp") {
    return { repaired: false, reason: `Deterministic repair is not implemented for relation "${violation.relation}"` };
  }
  if (!violation.args || violation.args.length !== 2) {
    return { repaired: false, reason: "Expected exactly 2 args for on/perp repair" };
  }
  if (violation.actual !== void 0) {
    if (violation.relation === "on") {
      const scale_ = referenceScale(symtab);
      if (violation.actual / scale_ > REPAIR_MAX_RELATIVE_ERROR) {
        return { repaired: false, reason: "Error exceeds the deterministic-repair threshold; likely a semantic mistake, not numeric noise" };
      }
    } else if (violation.actual > REPAIR_MAX_PERP_ERROR) {
      return { repaired: false, reason: "Angular error exceeds the deterministic-repair threshold; likely a semantic mistake, not numeric noise" };
    }
  }
  if (violation.relation === "on") {
    const [pointTok, entityTok] = violation.args;
    const point = resolveEntity(pointTok, symtab);
    const entity = resolveEntity(entityTok, symtab);
    if (point.type !== "point") return { repaired: false, reason: `"${pointTok}" is not a point` };
    if (entity.type === "plane") {
      const n = planeNormal(entity.positions[0], entity.positions[1], entity.positions[2]);
      symtab.points.set(point.name, projectPointOntoPlane(point.pos, entity.positions[0], n));
      return { repaired: true };
    }
    if (entity.type === "line") {
      symtab.points.set(point.name, projectPointOntoLine(point.pos, entity.posA, entity.posB));
      return { repaired: true };
    }
    return { repaired: false, reason: `Cannot project onto entity of type "${entity.type}"` };
  }
  const [lineTok, otherTok] = violation.args;
  const lineEntity = resolveEntity(lineTok, symtab);
  const otherEntity = resolveEntity(otherTok, symtab);
  if (lineEntity.type !== "line") {
    return { repaired: false, reason: `Deterministic perp-repair requires the first arg to be a line, got "${lineEntity.type}"` };
  }
  if (otherEntity.type !== "plane") {
    return { repaired: false, reason: "Deterministic perp-repair for line-vs-line is not implemented in Phase 1" };
  }
  const normal = planeNormal(otherEntity.positions[0], otherEntity.positions[1], otherEntity.positions[2]);
  const planePoint = otherEntity.positions[0];
  const distA = distancePointToPlane(lineEntity.posA, planePoint, normal);
  const distB = distancePointToPlane(lineEntity.posB, planePoint, normal);
  const anchor = distA <= distB ? { name: lineEntity.a, pos: lineEntity.posA } : { name: lineEntity.b, pos: lineEntity.posB };
  const moved = distA <= distB ? { name: lineEntity.b, pos: lineEntity.posB } : { name: lineEntity.a, pos: lineEntity.posA };
  const segLen = length(sub(moved.pos, anchor.pos));
  const side = dot(sub(moved.pos, anchor.pos), normal) >= 0 ? 1 : -1;
  const newMoved = add(anchor.pos, scale(normal, side * segLen));
  symtab.points.set(moved.name, newMoved);
  return { repaired: true };
}

// api/_lib/kernel/scalar.ts
var MAX_SAFE_RADICAND = 1e12;
function bgcd(a, b) {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1n;
}
function extractSquare(r) {
  if (!Number.isInteger(r) || r < 1) {
    throw new Error(`radicand must be a positive integer, got ${r}`);
  }
  let rad = r;
  let factor = 1n;
  for (let f = 2; f * f <= rad; f++) {
    while (rad % (f * f) === 0) {
      rad /= f * f;
      factor *= BigInt(f);
    }
  }
  return { rad, factor };
}
function makeExact(num2, den, radicand = 1) {
  if (den === 0n) throw new Error("Exact denominator cannot be zero");
  if (num2 === 0n) return { num: 0n, den: 1n, radicand: 1 };
  if (den < 0n) {
    num2 = -num2;
    den = -den;
  }
  const { rad, factor } = extractSquare(radicand);
  num2 *= factor;
  const g = bgcd(num2, den);
  return { num: num2 / g, den: den / g, radicand: rad };
}
function exactToApprox(e) {
  return Number(e.num) / Number(e.den) * Math.sqrt(e.radicand);
}
function displayExact(e) {
  const sign = e.num < 0n ? "-" : "";
  const n = e.num < 0n ? -e.num : e.num;
  if (e.radicand === 1) {
    return e.den === 1n ? `${sign}${n}` : `${sign}${n}/${e.den}`;
  }
  const radStr = `\u221A${e.radicand}`;
  const numer = n === 1n ? radStr : `${n}${radStr}`;
  return e.den === 1n ? `${sign}${numer}` : `${sign}${numer}/${e.den}`;
}
function negExact(a) {
  return { num: -a.num, den: a.den, radicand: a.radicand };
}
function addExact(a, b) {
  if (a.num === 0n) return b;
  if (b.num === 0n) return a;
  if (a.radicand !== b.radicand) return null;
  const num2 = a.num * b.den + b.num * a.den;
  const den = a.den * b.den;
  return makeExact(num2, den, a.radicand);
}
function subExact(a, b) {
  return addExact(a, negExact(b));
}
function mulExact(a, b) {
  const radicand = a.radicand * b.radicand;
  if (radicand > MAX_SAFE_RADICAND) return null;
  return makeExact(a.num * b.num, a.den * b.den, radicand);
}
function divExact(a, b) {
  if (b.num === 0n) throw new Error("Exact division by zero");
  const radicand = a.radicand * b.radicand;
  if (radicand > MAX_SAFE_RADICAND) return null;
  const num2 = a.num * b.den;
  const den = a.den * b.num * BigInt(b.radicand);
  return makeExact(num2, den, radicand);
}
function sqrtExact(a) {
  if (a.radicand !== 1) return null;
  if (a.num < 0n) return null;
  if (a.num === 0n) return makeExact(0n, 1n, 1);
  const radicand = Number(a.num * a.den);
  if (!Number.isSafeInteger(radicand) || radicand > MAX_SAFE_RADICAND) return null;
  return makeExact(1n, a.den, radicand);
}
function num(n) {
  return { approx: n, exact: null };
}
function fromExact(e) {
  return { approx: exactToApprox(e), exact: e };
}
function rat(n, d = 1n) {
  return fromExact(makeExact(n, d, 1));
}
function add2(a, b) {
  const exact = a.exact && b.exact ? addExact(a.exact, b.exact) : null;
  return { approx: a.approx + b.approx, exact };
}
function sub2(a, b) {
  const exact = a.exact && b.exact ? subExact(a.exact, b.exact) : null;
  return { approx: a.approx - b.approx, exact };
}
function mul(a, b) {
  const exact = a.exact && b.exact ? mulExact(a.exact, b.exact) : null;
  return { approx: a.approx * b.approx, exact };
}
function div(a, b) {
  const exact = a.exact && b.exact && b.exact.num !== 0n ? divExact(a.exact, b.exact) : null;
  return { approx: a.approx / b.approx, exact };
}
function neg(a) {
  return { approx: -a.approx, exact: a.exact ? negExact(a.exact) : null };
}
function sqrt(a) {
  const exact = a.exact ? sqrtExact(a.exact) : null;
  return { approx: Math.sqrt(a.approx), exact };
}
function displayScalar(s) {
  return s.exact ? displayExact(s.exact) : s.approx.toFixed(4);
}

// api/_lib/kernel/vec3s.ts
function vec3s(x, y, z) {
  return { x, y, z };
}
function ratVec(x, y, z) {
  return { x: rat(x), y: rat(y), z: rat(z) };
}
function addV(a, b) {
  return { x: add2(a.x, b.x), y: add2(a.y, b.y), z: add2(a.z, b.z) };
}
function subV(a, b) {
  return { x: sub2(a.x, b.x), y: sub2(a.y, b.y), z: sub2(a.z, b.z) };
}
function scaleV(a, s) {
  return { x: mul(a.x, s), y: mul(a.y, s), z: mul(a.z, s) };
}
function dotV(a, b) {
  return add2(add2(mul(a.x, b.x), mul(a.y, b.y)), mul(a.z, b.z));
}
function crossV(a, b) {
  return {
    x: sub2(mul(a.y, b.z), mul(a.z, b.y)),
    y: sub2(mul(a.z, b.x), mul(a.x, b.z)),
    z: sub2(mul(a.x, b.y), mul(a.y, b.x))
  };
}
function lenSqV(a) {
  return dotV(a, a);
}
function toApproxVec(a) {
  return { x: a.x.approx, y: a.y.approx, z: a.z.approx };
}

// api/_lib/kernel/entities.ts
function pointFromCoords(p) {
  return { kind: "point", p };
}
function lineFromTwoPoints(a, b) {
  return { kind: "line", p: a, dir: subV(b, a) };
}
function lineFromPointDir(p, dir) {
  return { kind: "line", p, dir };
}
function planeFromThreePoints(a, b, c) {
  const n = crossV(subV(b, a), subV(c, a));
  const d = neg(dotV(n, a));
  return { kind: "plane", n, d };
}
function planeFromPointNormal(point, n) {
  return { kind: "plane", n, d: neg(dotV(n, point)) };
}
function planeFromCoeffs(a, b, c, d) {
  return { kind: "plane", n: { x: a, y: b, z: c }, d };
}
function sphereFromCenterRadius2(center, r2) {
  return { kind: "sphere", center, r2 };
}
function sphereFromCenterPoint(center, onSphere) {
  return { kind: "sphere", center, r2: lenSqV(subV(onSphere, center)) };
}
function sphereFromEquation(a, b, c, d) {
  const half = rat(1n, 2n);
  const cx = neg(mul(a, half));
  const cy = neg(mul(b, half));
  const cz = neg(mul(c, half));
  const center = { x: cx, y: cy, z: cz };
  const r2 = sub2(add2(add2(mul(cx, cx), mul(cy, cy)), mul(cz, cz)), d);
  return { kind: "sphere", center, r2 };
}
function det3(u, v, w) {
  return dotV(u, crossV(v, w));
}
function sphereFromFourPoints(p0, p1, p2, p3) {
  const half = rat(1n, 2n);
  const a1 = subV(p1, p0), a2 = subV(p2, p0), a3 = subV(p3, p0);
  const q0 = dotV(p0, p0);
  const b1 = mul(sub2(dotV(p1, p1), q0), half);
  const b2 = mul(sub2(dotV(p2, p2), q0), half);
  const b3 = mul(sub2(dotV(p3, p3), q0), half);
  const c0 = vec3s(a1.x, a2.x, a3.x);
  const c1 = vec3s(a1.y, a2.y, a3.y);
  const c2 = vec3s(a1.z, a2.z, a3.z);
  const bVec = vec3s(b1, b2, b3);
  const detM = det3(c0, c1, c2);
  if (detM.approx === 0 || detM.exact !== null && detM.exact.num === 0n) {
    throw new Error("The four points are coplanar; no unique circumscribing sphere");
  }
  const center = vec3s(
    div(det3(bVec, c1, c2), detM),
    div(det3(c0, bVec, c2), detM),
    div(det3(c0, c1, bVec), detM)
  );
  return { kind: "sphere", center, r2: lenSqV(subV(center, p0)) };
}

// api/_lib/kernel/entityTable.ts
function createEmptyEntityTable() {
  return {
    points: /* @__PURE__ */ new Map(),
    lines: /* @__PURE__ */ new Map(),
    planes: /* @__PURE__ */ new Map(),
    spheres: /* @__PURE__ */ new Map(),
    faces: /* @__PURE__ */ new Map(),
    edges: /* @__PURE__ */ new Set(),
    derivedPoints: /* @__PURE__ */ new Set()
  };
}

// api/_lib/kernel/dialects/oxyzInput.ts
function decimalToExact(s) {
  const neg2 = s.startsWith("-");
  const body = neg2 ? s.slice(1) : s;
  if (!/^\d*\.?\d+$/.test(body) && !/^\d+\.?\d*$/.test(body)) {
    throw new Error(`Cannot parse rational from "${s}" (use "p/q" for fractions)`);
  }
  const dot2 = body.indexOf(".");
  if (dot2 === -1) {
    const v = BigInt(body);
    return makeExact(neg2 ? -v : v, 1n, 1);
  }
  const intPart = body.slice(0, dot2) || "0";
  const fracPart = body.slice(dot2 + 1) || "0";
  const den = 10n ** BigInt(fracPart.length);
  const numAbs = BigInt(intPart) * den + BigInt(fracPart);
  return makeExact(neg2 ? -numAbs : numAbs, den, 1);
}
var INT_RE = /^[+-]?\d+$/;
function parseSurd(raw) {
  const s = raw.replace(/√\s*\(?\s*(\d+)\s*\)?/g, "sqrt($1)").replace(/\s+/g, "");
  const m = s.match(/^([+-]?)(?:(\d+)(?:\/(\d+))?\*?)?sqrt\((\d+)\)(?:\/(\d+))?$/i);
  if (!m) return null;
  const sign = m[1] === "-" ? -1n : 1n;
  const cnum = m[2] ? BigInt(m[2]) : 1n;
  const cden = m[3] ? BigInt(m[3]) : 1n;
  const rad = Number(m[4]);
  const den = m[5] ? BigInt(m[5]) : 1n;
  return makeExact(sign * cnum, cden * den, rad);
}
function parseRational(input) {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) throw new Error("Rational input must be finite");
    if (Number.isInteger(input)) {
      if (!Number.isSafeInteger(input)) {
        throw new Error(`Integer ${input} exceeds the safe range; pass it as a string instead`);
      }
      return makeExact(BigInt(input), 1n, 1);
    }
    const s2 = input.toString();
    if (s2.includes("e") || s2.includes("E")) {
      throw new Error(`Number "${s2}" is in exponent form; pass it as a string fraction instead`);
    }
    return decimalToExact(s2);
  }
  const s = input.trim();
  if (/sqrt|√/i.test(s)) {
    const surd = parseSurd(s);
    if (!surd) throw new Error(`Cannot parse surd from "${input}" (d\xF9ng "sqrt(3)", "sqrt(3)/2", "2*sqrt(3)")`);
    return surd;
  }
  if (s.includes("/")) {
    const parts = s.split("/");
    const a = parts[0]?.trim();
    const b = parts[1]?.trim();
    if (parts.length !== 2 || !INT_RE.test(a) || !INT_RE.test(b)) {
      throw new Error(`Cannot parse rational from "${input}" (expected "p/q" with integer p, q)`);
    }
    return makeExact(BigInt(a), BigInt(b), 1);
  }
  return decimalToExact(s);
}
function parseScalar(input) {
  return fromExact(parseRational(input));
}
function parseVec3S(c) {
  return vec3s(parseScalar(c[0]), parseScalar(c[1]), parseScalar(c[2]));
}

// api/_lib/kernel/constructions.ts
function det32(u, v, w) {
  return dotV(u, crossV(v, w));
}
function normZeroS(s) {
  return s.approx === 0 ? { approx: 0, exact: s.exact } : s;
}
function solve3(r1, r2, r3, b) {
  const c0 = vec3s(r1.x, r2.x, r3.x);
  const c1 = vec3s(r1.y, r2.y, r3.y);
  const c2 = vec3s(r1.z, r2.z, r3.z);
  const detM = det32(c0, c1, c2);
  if (detM.approx === 0 || detM.exact !== null && detM.exact.num === 0n) {
    throw new Error("Degenerate construction: linear system has no unique solution");
  }
  return vec3s(
    normZeroS(div(det32(b, c1, c2), detM)),
    normZeroS(div(det32(c0, b, c2), detM)),
    normZeroS(div(det32(c0, c1, b), detM))
  );
}
function footOnPlaneE(p, pl) {
  const t = div(add2(dotV(pl.n, p), pl.d), lenSqV(pl.n));
  return subV(p, scaleV(pl.n, t));
}
function footOnLineE(p, l) {
  const t = div(dotV(subV(p, l.p), l.dir), lenSqV(l.dir));
  return addV(l.p, scaleV(l.dir, t));
}
function reflectAcrossPlaneE(p, pl) {
  return subV(scaleV(footOnPlaneE(p, pl), rat(2n)), p);
}
function reflectAcrossLineE(p, l) {
  return subV(scaleV(footOnLineE(p, l), rat(2n)), p);
}
function orthocenterE(a, b, c) {
  const n = crossV(subV(b, a), subV(c, a));
  const r1 = subV(c, b);
  const r2 = subV(c, a);
  return solve3(r1, r2, n, vec3s(dotV(a, r1), dotV(b, r2), dotV(a, n)));
}
function circumcenterE(a, b, c) {
  const n = crossV(subV(b, a), subV(c, a));
  const half = rat(1n, 2n);
  const r1 = subV(b, a);
  const r2 = subV(c, a);
  const b1 = mul(sub2(lenSqV(b), lenSqV(a)), half);
  const b2 = mul(sub2(lenSqV(c), lenSqV(a)), half);
  return solve3(r1, r2, n, vec3s(b1, b2, dotV(a, n)));
}

// api/_lib/kernel/compute/answer.ts
var EPS3 = 1e-9;
function firstDegenerate(entities) {
  for (const e of entities) {
    if (e.kind === "plane" && lenSqV(e.n).approx < EPS3) return "Degenerate plane (zero normal vector)";
    if (e.kind === "line" && lenSqV(e.dir).approx < EPS3) return "Degenerate line (zero direction vector)";
    if (e.kind === "sphere" && e.r2.approx <= EPS3) return "Degenerate sphere (radius squared <= 0)";
  }
  return null;
}
function certifyDistance(s, floatRef) {
  const tol = 1e-6 * Math.max(1, Math.abs(floatRef));
  if (s.exact !== null && Math.abs(exactToApprox(s.exact) - floatRef) <= tol) {
    return { kind: "distance", exact: s.exact, approx: exactToApprox(s.exact), text: displayScalar(s), approximate: false };
  }
  return { kind: "distance", exact: null, approx: floatRef, text: floatRef.toFixed(4), approximate: true };
}
var NICE_ABSCOS = [
  { phi: 0, m: makeExact(1n, 1n, 1) },
  { phi: 30, m: makeExact(1n, 2n, 3) },
  { phi: 45, m: makeExact(1n, 2n, 2) },
  { phi: 60, m: makeExact(1n, 2n, 1) },
  { phi: 90, m: makeExact(0n, 1n, 1) }
];
var exactEq = (a, b) => a.num === b.num && a.den === b.den && a.radicand === b.radicand;
function certifyAngle(metric, floatMetric, complement) {
  let exactM = metric.exact;
  if (exactM !== null && Math.abs(exactToApprox(exactM) - floatMetric) > 1e-6) exactM = null;
  const phi = Math.acos(Math.min(1, Math.abs(floatMetric))) * 180 / Math.PI;
  const angleValue = complement ? 90 - phi : phi;
  let niceDeg = null;
  if (exactM !== null) {
    const hit = NICE_ABSCOS.find((e) => exactEq(exactM, e.m));
    if (hit) niceDeg = complement ? 90 - hit.phi : hit.phi;
  }
  return {
    kind: "angle",
    exactDegrees: niceDeg,
    degrees: niceDeg !== null ? niceDeg : angleValue,
    exactCos: exactM,
    text: niceDeg !== null ? `${niceDeg}\xB0` : `\u2248 ${angleValue.toFixed(2)}\xB0`,
    approximate: niceDeg === null
  };
}
function coplanarityProblem(pts, what, tol = EPS3) {
  if (pts.length <= 3) return null;
  const p0 = pts[0];
  let normal = null;
  for (let i = 1; i < pts.length && normal === null; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const n = crossV(subV(pts[i], p0), subV(pts[j], p0));
      if (!isZeroS(lenSqV(n))) {
        normal = n;
        break;
      }
    }
  }
  if (normal === null) return null;
  const nLen = Math.sqrt(lenSqV(normal).approx);
  for (const p of pts) {
    const tp = dotV(subV(p, p0), normal);
    const off = tp.exact !== null && tp.exact.num === 0n ? 0 : Math.abs(tp.approx) / nLen;
    if (off > tol) return `${what} vertices are not coplanar`;
  }
  return null;
}
function certifyScalar(kind, s, floatRef) {
  const tol = 1e-6 * Math.max(1, Math.abs(floatRef));
  if (s.exact !== null && Math.abs(exactToApprox(s.exact) - floatRef) <= tol) {
    return { kind, exact: s.exact, approx: exactToApprox(s.exact), text: displayScalar(s), approximate: false };
  }
  return { kind, exact: null, approx: floatRef, text: floatRef.toFixed(4), approximate: true };
}
function isZeroS(s) {
  return s.exact !== null ? s.exact.num === 0n : Math.abs(s.approx) < EPS3;
}
function cmpScalar(a, b) {
  if (a.exact !== null && b.exact !== null && a.exact.radicand === b.exact.radicand) {
    const lhs = a.exact.num * b.exact.den;
    const rhs = b.exact.num * a.exact.den;
    return lhs < rhs ? -1 : lhs > rhs ? 1 : 0;
  }
  const d = a.approx - b.approx;
  return Math.abs(d) < EPS3 ? 0 : d < 0 ? -1 : 1;
}

// api/_lib/kernel/compute/intersect.ts
function planeSigned(pl, p) {
  return add2(dotV(pl.n, p), pl.d);
}
function pointOnPlane(pl) {
  return scaleV(pl.n, div(neg(pl.d), lenSqV(pl.n)));
}
function iLinePlane(l, pl) {
  const dn = dotV(l.dir, pl.n);
  if (isZeroS(dn)) {
    return isZeroS(planeSigned(pl, l.p)) ? { kind: "intersection", result: "coincident" } : { kind: "intersection", result: "parallel" };
  }
  const t = neg(div(planeSigned(pl, l.p), dn));
  return { kind: "intersection", result: "point", point: pointFromCoords(addV(l.p, scaleV(l.dir, t))) };
}
function iPlanePlane(p1, p2) {
  const u = crossV(p1.n, p2.n);
  if (isZeroS(lenSqV(u))) {
    return isZeroS(planeSigned(p2, pointOnPlane(p1))) ? { kind: "intersection", result: "coincident" } : { kind: "intersection", result: "parallel" };
  }
  const n1n1 = lenSqV(p1.n), n2n2 = lenSqV(p2.n), n1n2 = dotV(p1.n, p2.n), det = lenSqV(u);
  const alpha = div(add2(neg(mul(p1.d, n2n2)), mul(p2.d, n1n2)), det);
  const beta = div(add2(neg(mul(p2.d, n1n1)), mul(p1.d, n1n2)), det);
  const p = addV(scaleV(p1.n, alpha), scaleV(p2.n, beta));
  return { kind: "intersection", result: "line", line: { kind: "line", p, dir: u } };
}
function iSpherePlane(s, pl) {
  const signed = planeSigned(pl, s.center);
  const dSq = div(mul(signed, signed), lenSqV(pl.n));
  const c = cmpScalar(dSq, s.r2);
  if (c > 0) return { kind: "intersection", result: "none" };
  const foot = subV(s.center, scaleV(pl.n, div(signed, lenSqV(pl.n))));
  if (c === 0) return { kind: "intersection", result: "tangent-point", point: pointFromCoords(foot) };
  return { kind: "intersection", result: "circle", circle: { center: pointFromCoords(foot), r2: sub2(s.r2, dSq) } };
}
function iLineSphere(l, s) {
  const w = subV(l.p, s.center);
  const a = lenSqV(l.dir);
  const b = mul(rat(2n), dotV(w, l.dir));
  const c = sub2(lenSqV(w), s.r2);
  const disc = sub2(mul(b, b), mul(mul(rat(4n), a), c));
  const cmp = cmpScalar(disc, rat(0n));
  if (cmp < 0) return { kind: "intersection", result: "none" };
  const twoA = mul(rat(2n), a);
  if (cmp === 0) {
    const t = neg(div(b, twoA));
    return { kind: "intersection", result: "tangent-point", point: pointFromCoords(addV(l.p, scaleV(l.dir, t))) };
  }
  const sq = sqrt(disc);
  const t1 = div(sub2(neg(b), sq), twoA);
  const t2 = div(add2(neg(b), sq), twoA);
  return {
    kind: "intersection",
    result: "segment",
    point: pointFromCoords(addV(l.p, scaleV(l.dir, t1))),
    point2: pointFromCoords(addV(l.p, scaleV(l.dir, t2))),
    chord: sqrt(div(disc, a))
  };
}
function computeIntersection(a, b) {
  const deg = firstDegenerate([a, b]);
  if (deg) return { ok: false, problem: deg };
  const key = `${a.kind}-${b.kind}`;
  switch (key) {
    case "line-plane":
      return { ok: true, answer: iLinePlane(a, b) };
    case "plane-line":
      return { ok: true, answer: iLinePlane(b, a) };
    case "plane-plane":
      return { ok: true, answer: iPlanePlane(a, b) };
    case "sphere-plane":
      return { ok: true, answer: iSpherePlane(a, b) };
    case "plane-sphere":
      return { ok: true, answer: iSpherePlane(b, a) };
    case "line-sphere":
      return { ok: true, answer: iLineSphere(a, b) };
    case "sphere-line":
      return { ok: true, answer: iLineSphere(b, a) };
    default:
      return { ok: false, problem: `intersection not supported for ${key}` };
  }
}

// api/_lib/kernel/resolveE.ts
function tokenizePointNames2(raw, known) {
  const names = Array.from(known).sort((a, b) => b.length - a.length);
  const tokens = [];
  let rest = raw;
  while (rest.length > 0) {
    const match = names.find((n) => rest.startsWith(n));
    if (!match) return null;
    tokens.push(match);
    rest = rest.slice(match.length);
  }
  return tokens;
}
function resolveEntityE(token, et) {
  const paren = token.match(/^\((.+)\)$/);
  const inner = paren ? paren[1] : token;
  const p = et.points.get(inner);
  if (p) return p;
  const l = et.lines.get(inner);
  if (l) return l;
  const pl = et.planes.get(inner);
  if (pl) return pl;
  const s = et.spheres.get(inner);
  if (s) return s;
  const tokens = tokenizePointNames2(inner, new Set(et.points.keys()));
  if (!tokens) {
    throw new Error(`Cannot resolve entity "${token}": not a named entity or a compound of known points`);
  }
  if (tokens.length === 1) return et.points.get(tokens[0]);
  if (tokens.length === 2) {
    return lineFromTwoPoints(et.points.get(tokens[0]).p, et.points.get(tokens[1]).p);
  }
  const positions = tokens.map((n) => et.points.get(n).p);
  if (tokens.length > 3) {
    const cp = coplanarityProblem(positions, `compound plane "${inner}"`);
    if (cp) throw new Error(cp);
  }
  return planeFromThreePoints(positions[0], positions[1], positions[2]);
}

// api/_lib/kernel/dialects/oxyz.ts
var RInput = external_exports.union([external_exports.number(), external_exports.string().min(1)]);
var Coord3 = external_exports.tuple([RInput, RInput, RInput]);
var Name = external_exports.string().min(1);
var PointNameStrict = external_exports.string().regex(/^[A-Z]\d*'?$/);
var OxyzPointSchema = external_exports.object({ op: external_exports.literal("oxyz_point"), name: PointNameStrict, at: Coord3 });
var OxyzLineSchema = external_exports.object({
  op: external_exports.literal("oxyz_line"),
  name: Name,
  by: external_exports.discriminatedUnion("form", [
    external_exports.object({ form: external_exports.literal("two_points"), a: Name, b: Name }),
    external_exports.object({ form: external_exports.literal("point_dir"), base: Coord3, dir: Coord3 })
  ])
});
var OxyzPlaneSchema = external_exports.object({
  op: external_exports.literal("oxyz_plane"),
  name: Name,
  by: external_exports.discriminatedUnion("form", [
    external_exports.object({ form: external_exports.literal("three_points"), a: Name, b: Name, c: Name }),
    external_exports.object({ form: external_exports.literal("point_normal"), point: Name, normal: Coord3 }),
    external_exports.object({ form: external_exports.literal("coeffs"), a: RInput, b: RInput, c: RInput, d: RInput })
  ])
});
var OxyzSphereSchema = external_exports.object({
  op: external_exports.literal("oxyz_sphere"),
  name: Name,
  by: external_exports.discriminatedUnion("form", [
    external_exports.object({ form: external_exports.literal("center_radius"), center: Name, radius: RInput }),
    external_exports.object({ form: external_exports.literal("center_point"), center: Name, through: Name }),
    external_exports.object({ form: external_exports.literal("equation"), a: RInput, b: RInput, c: RInput, d: RInput }),
    external_exports.object({ form: external_exports.literal("four_points"), a: Name, b: Name, c: Name, d: Name })
  ])
});
var PointName2 = external_exports.string().regex(/^[A-Z]\d*'?$/);
var OxyzMidpointSchema = external_exports.object({ op: external_exports.literal("oxyz_midpoint"), name: PointName2, a: Name, b: Name });
var OxyzRatioSchema = external_exports.object({ op: external_exports.literal("oxyz_ratio"), name: PointName2, a: Name, b: Name, t: RInput });
var OxyzCentroidSchema = external_exports.object({ op: external_exports.literal("oxyz_centroid"), name: PointName2, of: external_exports.array(Name).min(2) });
var OxyzReflectSchema = external_exports.object({ op: external_exports.literal("oxyz_reflect"), name: PointName2, point: Name, about: Name });
var OxyzFootSchema = external_exports.object({ op: external_exports.literal("oxyz_foot"), name: PointName2, from: Name, onto: external_exports.enum(["line", "plane"]), target: Name });
var OxyzReflectAcrossSchema = external_exports.object({ op: external_exports.literal("oxyz_reflect_across"), name: PointName2, point: Name, across: external_exports.enum(["line", "plane"]), target: Name });
var OxyzOrthocenterSchema = external_exports.object({ op: external_exports.literal("oxyz_orthocenter"), name: PointName2, of: external_exports.tuple([Name, Name, Name]) });
var OxyzCircumcenterSchema = external_exports.object({ op: external_exports.literal("oxyz_circumcenter"), name: PointName2, of: external_exports.tuple([Name, Name, Name]) });
var OxyzIntersectSchema = external_exports.object({ op: external_exports.literal("oxyz_intersect"), name: PointName2, a: Name, b: Name });
var OxyzCircumsphereOffsetSchema = external_exports.object({
  op: external_exports.literal("oxyz_circumsphere_offset"),
  name: PointName2,
  // dùng grammar tên chặt như các op dựng khác
  of: external_exports.tuple([Name, Name, Name]),
  t: RInput
  // số (đã thay tham số) — khoảng cách CÓ DẤU dọc pháp tuyến ĐƠN VỊ của mặt (ABC)
});
var OxyzOpSchema = external_exports.union([
  OxyzPointSchema,
  OxyzLineSchema,
  OxyzPlaneSchema,
  OxyzSphereSchema,
  OxyzMidpointSchema,
  OxyzRatioSchema,
  OxyzCentroidSchema,
  OxyzReflectSchema,
  OxyzFootSchema,
  OxyzReflectAcrossSchema,
  OxyzOrthocenterSchema,
  OxyzCircumcenterSchema,
  OxyzIntersectSchema,
  OxyzCircumsphereOffsetSchema
]);
function requirePointE(et, name) {
  const p = et.points.get(name);
  if (!p) throw new Error(`Oxyz: point "${name}" is referenced before it is defined`);
  return p;
}
function ensureNameFree(et, name, kind) {
  if (et.points.has(name) || et.lines.has(name) || et.planes.has(name) || et.spheres.has(name)) {
    throw new Error(`Oxyz: name "${name}" is already used; cannot define ${kind} "${name}"`);
  }
}
function setPointE(et, name, p, derived = false) {
  ensureNameFree(et, name, "point");
  et.points.set(name, pointFromCoords(p));
  if (derived) (et.derivedPoints ??= /* @__PURE__ */ new Set()).add(name);
}
function setLineE(et, name, l) {
  ensureNameFree(et, name, "line");
  et.lines.set(name, l);
}
function setPlaneE(et, name, pl) {
  ensureNameFree(et, name, "plane");
  et.planes.set(name, pl);
}
function setSphereE(et, name, s) {
  ensureNameFree(et, name, "sphere");
  et.spheres.set(name, s);
}
function executeOxyzOp(op, et) {
  switch (op.op) {
    case "oxyz_point":
      setPointE(et, op.name, parseVec3S(op.at));
      break;
    case "oxyz_line": {
      if (op.by.form === "two_points") {
        const a = requirePointE(et, op.by.a);
        const b = requirePointE(et, op.by.b);
        setLineE(et, op.name, lineFromTwoPoints(a.p, b.p));
      } else {
        setLineE(et, op.name, lineFromPointDir(parseVec3S(op.by.base), parseVec3S(op.by.dir)));
      }
      break;
    }
    case "oxyz_plane": {
      if (op.by.form === "three_points") {
        const a = requirePointE(et, op.by.a);
        const b = requirePointE(et, op.by.b);
        const c = requirePointE(et, op.by.c);
        setPlaneE(et, op.name, planeFromThreePoints(a.p, b.p, c.p));
      } else if (op.by.form === "point_normal") {
        const point = requirePointE(et, op.by.point);
        setPlaneE(et, op.name, planeFromPointNormal(point.p, parseVec3S(op.by.normal)));
      } else {
        setPlaneE(et, op.name, planeFromCoeffs(
          parseScalar(op.by.a),
          parseScalar(op.by.b),
          parseScalar(op.by.c),
          parseScalar(op.by.d)
        ));
      }
      break;
    }
    case "oxyz_sphere": {
      if (op.by.form === "center_radius") {
        const center = requirePointE(et, op.by.center);
        const r = parseScalar(op.by.radius);
        setSphereE(et, op.name, sphereFromCenterRadius2(center.p, mul(r, r)));
      } else if (op.by.form === "center_point") {
        const center = requirePointE(et, op.by.center);
        const through = requirePointE(et, op.by.through);
        setSphereE(et, op.name, sphereFromCenterPoint(center.p, through.p));
      } else if (op.by.form === "four_points") {
        const a = requirePointE(et, op.by.a);
        const b = requirePointE(et, op.by.b);
        const c = requirePointE(et, op.by.c);
        const d = requirePointE(et, op.by.d);
        setSphereE(et, op.name, sphereFromFourPoints(a.p, b.p, c.p, d.p));
      } else {
        setSphereE(et, op.name, sphereFromEquation(
          parseScalar(op.by.a),
          parseScalar(op.by.b),
          parseScalar(op.by.c),
          parseScalar(op.by.d)
        ));
      }
      break;
    }
    case "oxyz_midpoint": {
      const a = requirePointE(et, op.a);
      const b = requirePointE(et, op.b);
      setPointE(et, op.name, scaleV(addV(a.p, b.p), rat(1n, 2n)), true);
      break;
    }
    case "oxyz_ratio": {
      const a = requirePointE(et, op.a);
      const b = requirePointE(et, op.b);
      const t = parseScalar(op.t);
      setPointE(et, op.name, addV(a.p, scaleV(subV(b.p, a.p), t)), true);
      break;
    }
    case "oxyz_centroid": {
      const pts = op.of.map((n) => requirePointE(et, n).p);
      let sum = pts[0];
      for (let i = 1; i < pts.length; i++) sum = addV(sum, pts[i]);
      setPointE(et, op.name, scaleV(sum, rat(1n, BigInt(pts.length))), true);
      break;
    }
    case "oxyz_reflect": {
      const point = requirePointE(et, op.point);
      const about = requirePointE(et, op.about);
      setPointE(et, op.name, subV(scaleV(about.p, rat(2n)), point.p), true);
      break;
    }
    case "oxyz_foot": {
      const from = requirePointE(et, op.from);
      const target = resolveEntityE(op.target, et);
      if (op.onto === "plane") {
        if (target.kind !== "plane") throw new Error(`oxyz_foot onto plane: "${op.target}" is not a plane`);
        setPointE(et, op.name, footOnPlaneE(from.p, target), true);
      } else {
        if (target.kind !== "line") throw new Error(`oxyz_foot onto line: "${op.target}" is not a line`);
        setPointE(et, op.name, footOnLineE(from.p, target), true);
      }
      break;
    }
    case "oxyz_reflect_across": {
      const pt2 = requirePointE(et, op.point);
      const target = resolveEntityE(op.target, et);
      if (op.across === "plane") {
        if (target.kind !== "plane") throw new Error(`oxyz_reflect_across plane: "${op.target}" is not a plane`);
        setPointE(et, op.name, reflectAcrossPlaneE(pt2.p, target), true);
      } else {
        if (target.kind !== "line") throw new Error(`oxyz_reflect_across line: "${op.target}" is not a line`);
        setPointE(et, op.name, reflectAcrossLineE(pt2.p, target), true);
      }
      break;
    }
    case "oxyz_orthocenter": {
      const [a, b, c] = op.of.map((n) => requirePointE(et, n).p);
      setPointE(et, op.name, orthocenterE(a, b, c), true);
      break;
    }
    case "oxyz_circumcenter": {
      const [a, b, c] = op.of.map((n) => requirePointE(et, n).p);
      setPointE(et, op.name, circumcenterE(a, b, c), true);
      break;
    }
    case "oxyz_intersect": {
      const r = computeIntersection(resolveEntityE(op.a, et), resolveEntityE(op.b, et));
      if (!r.ok) throw new Error(r.problem);
      const pt2 = r.answer.result === "point" ? r.answer.point : r.answer.result === "tangent-point" ? r.answer.point : null;
      if (!pt2) throw new Error(`oxyz_intersect: ${op.a} \u2229 ${op.b} is not a single point (${r.answer.result})`);
      setPointE(et, op.name, pt2.p, true);
      break;
    }
    case "oxyz_circumsphere_offset": {
      const a = requirePointE(et, op.of[0]).p;
      const b = requirePointE(et, op.of[1]).p;
      const c = requirePointE(et, op.of[2]).p;
      const Q = circumcenterE(a, b, c);
      const normal = crossV(subV(b, a), subV(c, a));
      const nlen = Math.sqrt(lenSqV(normal).approx);
      const tv = parseScalar(op.t).approx;
      const center = addV(Q, scaleV(normal, num(tv / nlen)));
      const r2 = lenSqV(subV(center, a));
      setSphereE(et, op.name, sphereFromCenterRadius2(center, r2));
      break;
    }
  }
}

// api/_lib/kernel/unifiedPlan.ts
var OXYZ_OPS = /* @__PURE__ */ new Set([
  "oxyz_point",
  "oxyz_line",
  "oxyz_plane",
  "oxyz_sphere",
  "oxyz_midpoint",
  "oxyz_ratio",
  "oxyz_centroid",
  "oxyz_reflect",
  "oxyz_foot",
  "oxyz_reflect_across",
  "oxyz_orthocenter",
  "oxyz_circumcenter",
  "oxyz_intersect",
  "oxyz_circumsphere_offset"
]);
var OXYZ_POINT_OPS = /* @__PURE__ */ new Set([
  "oxyz_point",
  "oxyz_midpoint",
  "oxyz_ratio",
  "oxyz_centroid",
  "oxyz_reflect",
  "oxyz_foot",
  "oxyz_reflect_across",
  "oxyz_orthocenter",
  "oxyz_circumcenter",
  "oxyz_intersect"
]);
var UnifiedOpSchema = external_exports.union([ConstructionOpSchema, OxyzOpSchema]);
var UnifiedPlanSchema = external_exports.object({
  solidName: external_exports.string().min(1),
  ops: external_exports.array(UnifiedOpSchema).min(1)
});
function floatVecToVec3S(v) {
  return { x: num(v.x), y: num(v.y), z: num(v.z) };
}
function syncSymtabToEntities(symtab, et, oxyzPointNames) {
  for (const [name, pos] of symtab.points) {
    if (oxyzPointNames.has(name)) continue;
    if (!et.points.has(name)) et.points.set(name, pointFromCoords(floatVecToVec3S(pos)));
  }
  for (const [key, verts] of symtab.namedPlanes) {
    et.faces.set(key, verts);
    if (verts.length >= 3 && !et.planes.has(key)) {
      const [a, b, c] = verts.map((n) => floatVecToVec3S(symtab.points.get(n)));
      et.planes.set(key, planeFromThreePoints(a, b, c));
    }
  }
  for (const e of symtab.edges) et.edges.add(e);
  if (symtab.derivedPoints) for (const d of symtab.derivedPoints) et.derivedPoints.add(d);
}
function executeUnifiedPlan(plan) {
  const symtab = createEmptySymbolTable();
  const et = createEmptyEntityTable();
  const oxyzPointNames = /* @__PURE__ */ new Set();
  for (const op of plan.ops) {
    const kind = op.op;
    if (OXYZ_OPS.has(kind)) {
      executeOxyzOp(op, et);
      if (OXYZ_POINT_OPS.has(kind)) {
        const name = op.name;
        oxyzPointNames.add(name);
        const pe = et.points.get(name);
        if (pe) symtab.points.set(name, { x: pe.p.x.approx, y: pe.p.y.approx, z: pe.p.z.approx });
      }
    } else {
      executeOp(op, symtab);
      syncSymtabToEntities(symtab, et, oxyzPointNames);
    }
  }
  return et;
}

// api/_lib/kernel/compute/distance.ts
var av = toApproxVec;
function pt(p) {
  return { kind: "point", p };
}
function sqPointPoint(a, b) {
  return lenSqV(subV(a, b));
}
function sqPointLine(p, l) {
  return div(lenSqV(crossV(subV(p, l.p), l.dir)), lenSqV(l.dir));
}
function sqPointPlane(p, pl) {
  const signed = add2(dotV(pl.n, p), pl.d);
  return div(mul(signed, signed), lenSqV(pl.n));
}
function fPointPoint(a, b) {
  return length(sub(a, b));
}
function fPointLine(p, a, dir) {
  return length(cross(sub(p, a), dir)) / length(dir);
}
function fPointPlane(p, n, d) {
  return Math.abs(dot(n, p) + d) / length(n);
}
function fLineLine(a1, d1, a2, d2) {
  const cr = cross(d1, d2);
  const cl = length(cr);
  if (cl < EPS3) return fPointLine(a2, a1, d1);
  return Math.abs(dot(sub(a2, a1), cr)) / cl;
}
function dPointPoint(a, b) {
  return certifyDistance(sqrt(sqPointPoint(a.p, b.p)), fPointPoint(av(a.p), av(b.p)));
}
function dPointLine(a, l) {
  return certifyDistance(sqrt(sqPointLine(a.p, l)), fPointLine(av(a.p), av(l.p), av(l.dir)));
}
function dPointPlane(a, pl) {
  return certifyDistance(sqrt(sqPointPlane(a.p, pl)), fPointPlane(av(a.p), av(pl.n), pl.d.approx));
}
function dLineLine(l1, l2) {
  const cr = crossV(l1.dir, l2.dir);
  if (isZeroS(lenSqV(cr))) return dPointLine(pt(l1.p), l2);
  const r = subV(l2.p, l1.p);
  const triple = dotV(r, cr);
  const distSq = div(mul(triple, triple), lenSqV(cr));
  return certifyDistance(sqrt(distSq), fLineLine(av(l1.p), av(l1.dir), av(l2.p), av(l2.dir)));
}
function dLinePlane(l, pl) {
  if (!isZeroS(dotV(l.dir, pl.n))) return certifyDistance(rat(0n), 0);
  return dPointPlane(pt(l.p), pl);
}
function dPlanePlane(p1, p2) {
  if (!isZeroS(lenSqV(crossV(p1.n, p2.n)))) return certifyDistance(rat(0n), 0);
  const pointOnP1 = scaleV(p1.n, div(neg(p1.d), lenSqV(p1.n)));
  return dPointPlane(pt(pointOnP1), p2);
}
function dPointSphere(p, s) {
  const pc = Math.sqrt(lenSqV(subV(p.p, s.center)).approx);
  const R = Math.sqrt(s.r2.approx);
  const d = Math.abs(pc - R);
  return certifyDistance(num(d), d);
}
function computeDistance(a, b) {
  const deg = firstDegenerate([a, b]);
  if (deg) return { ok: false, problem: deg };
  const key = `${a.kind}-${b.kind}`;
  switch (key) {
    case "point-point":
      return { ok: true, answer: dPointPoint(a, b) };
    case "point-line":
      return { ok: true, answer: dPointLine(a, b) };
    case "line-point":
      return { ok: true, answer: dPointLine(b, a) };
    case "point-plane":
      return { ok: true, answer: dPointPlane(a, b) };
    case "plane-point":
      return { ok: true, answer: dPointPlane(b, a) };
    case "line-line":
      return { ok: true, answer: dLineLine(a, b) };
    case "line-plane":
      return { ok: true, answer: dLinePlane(a, b) };
    case "plane-line":
      return { ok: true, answer: dLinePlane(b, a) };
    case "plane-plane":
      return { ok: true, answer: dPlanePlane(a, b) };
    case "point-sphere":
      return { ok: true, answer: dPointSphere(a, b) };
    case "sphere-point":
      return { ok: true, answer: dPointSphere(b, a) };
    default:
      return { ok: false, problem: `distance not supported for ${key}` };
  }
}

// api/_lib/kernel/compute/angle.ts
var av2 = toApproxVec;
function absCosOf(u, v) {
  const d = dotV(u, v);
  return sqrt(div(mul(d, d), mul(lenSqV(u), lenSqV(v))));
}
function fAbsCos(u, v) {
  return Math.abs(dot(u, v)) / (length(u) * length(v));
}
function aLineLine(l1, l2) {
  return certifyAngle(absCosOf(l1.dir, l2.dir), fAbsCos(av2(l1.dir), av2(l2.dir)), false);
}
function aPlanePlane(p1, p2) {
  return certifyAngle(absCosOf(p1.n, p2.n), fAbsCos(av2(p1.n), av2(p2.n)), false);
}
function aLinePlane(l, pl) {
  return certifyAngle(absCosOf(l.dir, pl.n), fAbsCos(av2(l.dir), av2(pl.n)), true);
}
function computeAngle(a, b) {
  const deg = firstDegenerate([a, b]);
  if (deg) return { ok: false, problem: deg };
  const key = `${a.kind}-${b.kind}`;
  switch (key) {
    case "line-line":
      return { ok: true, answer: aLineLine(a, b) };
    case "plane-plane":
      return { ok: true, answer: aPlanePlane(a, b) };
    case "line-plane":
      return { ok: true, answer: aLinePlane(a, b) };
    case "plane-line":
      return { ok: true, answer: aLinePlane(b, a) };
    default:
      return { ok: false, problem: `angle not supported for ${key}` };
  }
}

// api/_lib/kernel/compute/volume.ts
var av3 = toApproxVec;
function tripleScalar(a, b, c, d) {
  return dotV(subV(b, a), crossV(subV(c, a), subV(d, a)));
}
function absS(s) {
  return s.exact !== null ? s.exact.num < 0n ? neg(s) : s : s.approx < 0 ? neg(s) : s;
}
function tetraVolumeScalar(a, b, c, d) {
  return div(absS(tripleScalar(a.p, b.p, c.p, d.p)), rat(6n));
}
function pyramidVolumeScalar(base, apex) {
  let sum = rat(0n);
  for (let i = 1; i < base.length - 1; i++) {
    sum = add2(sum, tripleScalar(base[0].p, base[i].p, base[i + 1].p, apex.p));
  }
  return div(absS(sum), rat(6n));
}
function fPyramid(base, apex) {
  let s = 0;
  for (let i = 1; i < base.length - 1; i++) {
    s += scalarTriple(sub(base[i], base[0]), sub(base[i + 1], base[0]), sub(apex, base[0]));
  }
  return Math.abs(s) / 6;
}
function computeTetraVolume(a, b, c, d) {
  const floatRef = tetrahedronVolume(av3(a.p), av3(b.p), av3(c.p), av3(d.p));
  return { ok: true, answer: certifyScalar("volume", tetraVolumeScalar(a, b, c, d), floatRef) };
}
function computePyramidVolume(base, apex) {
  if (base.length < 3) return { ok: false, problem: "pyramid base needs at least 3 vertices" };
  const cp = coplanarityProblem(base.map((p) => p.p), "pyramid base");
  if (cp) return { ok: false, problem: cp };
  const floatRef = fPyramid(base.map((p) => av3(p.p)), av3(apex.p));
  return { ok: true, answer: certifyScalar("volume", pyramidVolumeScalar(base, apex), floatRef) };
}
function computeSphereVolume(s) {
  const R = Math.sqrt(s.r2.approx);
  const approx = 4 / 3 * Math.PI * R * R * R;
  return { kind: "volume", exact: null, approx, text: `${approx.toFixed(4)}`, approximate: true };
}
function volumeRatio(a, b) {
  if (isZeroS(b)) return { ok: false, problem: "volume ratio: denominator volume is zero" };
  return { ok: true, answer: certifyScalar("ratio", div(a, b), a.approx / b.approx) };
}

// api/_lib/kernel/compute/area.ts
var av4 = toApproxVec;
function triangleAreaScalar(a, b, c) {
  const cr = crossV(subV(b.p, a.p), subV(c.p, a.p));
  return sqrt(mul(rat(1n, 4n), lenSqV(cr)));
}
function polygonAreaScalar(pts) {
  const n = pts.length;
  let sum = ratVec(0n, 0n, 0n);
  for (let i = 0; i < n; i++) sum = addV(sum, crossV(pts[i].p, pts[(i + 1) % n].p));
  return sqrt(mul(rat(1n, 4n), lenSqV(sum)));
}
function fTriangle(a, b, c) {
  return length(cross(sub(b, a), sub(c, a))) / 2;
}
function fPolygon(pts) {
  const n = pts.length;
  let sx = 0, sy = 0, sz = 0;
  for (let i = 0; i < n; i++) {
    const cr = cross(pts[i], pts[(i + 1) % n]);
    sx += cr.x;
    sy += cr.y;
    sz += cr.z;
  }
  return length({ x: sx, y: sy, z: sz }) / 2;
}
function computeTriangleArea(a, b, c) {
  return { ok: true, answer: certifyScalar("area", triangleAreaScalar(a, b, c), fTriangle(av4(a.p), av4(b.p), av4(c.p))) };
}
function computePolygonArea(pts) {
  if (pts.length < 3) return { ok: false, problem: "polygon needs at least 3 vertices" };
  const cp = coplanarityProblem(pts.map((p) => p.p), "polygon");
  if (cp) return { ok: false, problem: cp };
  return { ok: true, answer: certifyScalar("area", polygonAreaScalar(pts), fPolygon(pts.map((p) => av4(p.p)))) };
}
function computeSphereArea(s) {
  const r2 = s.r2.approx;
  const approx = 4 * Math.PI * r2;
  const text = s.r2.exact ? `4\u03C0\xB7${displayScalar(s.r2)}` : `${approx.toFixed(4)}`;
  return { kind: "area", exact: null, approx, text, approximate: true };
}

// api/_lib/kernel/compute/relative.ts
var rel = (relation) => ({ kind: "relative_position", relation });
var isZeroVec = (v) => isZeroS(lenSqV(v));
function planeSigned2(pl, p) {
  return add2(dotV(pl.n, p), pl.d);
}
function pointOnPlane2(pl) {
  return scaleV(pl.n, div(neg(pl.d), lenSqV(pl.n)));
}
function relLineLine(l1, l2) {
  const cr = crossV(l1.dir, l2.dir);
  if (isZeroVec(cr)) {
    return isZeroVec(crossV(subV(l2.p, l1.p), l1.dir)) ? rel("tr\xF9ng nhau") : rel("song song");
  }
  return isZeroS(dotV(subV(l2.p, l1.p), cr)) ? rel("c\u1EAFt nhau") : rel("ch\xE9o nhau");
}
function relLinePlane(l, pl) {
  if (!isZeroS(dotV(l.dir, pl.n))) return rel("c\u1EAFt nhau");
  return isZeroS(planeSigned2(pl, l.p)) ? rel("\u0111\u01B0\u1EDDng n\u1EB1m tr\xEAn m\u1EB7t") : rel("song song");
}
function relPlanePlane(p1, p2) {
  if (!isZeroVec(crossV(p1.n, p2.n))) return rel("c\u1EAFt nhau");
  return isZeroS(planeSigned2(p2, pointOnPlane2(p1))) ? rel("tr\xF9ng nhau") : rel("song song");
}
function relSpherePlane(s, pl) {
  const signed = planeSigned2(pl, s.center);
  const dSq = div(mul(signed, signed), lenSqV(pl.n));
  const c = cmpScalar(dSq, s.r2);
  return rel(c < 0 ? "c\u1EAFt theo \u0111\u01B0\u1EDDng tr\xF2n" : c === 0 ? "ti\u1EBFp x\xFAc" : "r\u1EDDi nhau");
}
function relPointSphere(pt2, s) {
  const c = cmpScalar(lenSqV(subV(pt2.p, s.center)), s.r2);
  return rel(c < 0 ? "\u0111i\u1EC3m n\u1EB1m trong" : c === 0 ? "\u0111i\u1EC3m n\u1EB1m tr\xEAn" : "\u0111i\u1EC3m n\u1EB1m ngo\xE0i");
}
function relSphereLine(s, l) {
  const cr = crossV(subV(s.center, l.p), l.dir);
  const dSq = div(lenSqV(cr), lenSqV(l.dir));
  const c = cmpScalar(dSq, s.r2);
  return rel(c < 0 ? "c\u1EAFt nhau" : c === 0 ? "ti\u1EBFp x\xFAc" : "r\u1EDDi nhau");
}
function computeRelativePosition(a, b) {
  const deg = firstDegenerate([a, b]);
  if (deg) return { ok: false, problem: deg };
  const key = `${a.kind}-${b.kind}`;
  switch (key) {
    case "line-line":
      return { ok: true, answer: relLineLine(a, b) };
    case "line-plane":
      return { ok: true, answer: relLinePlane(a, b) };
    case "plane-line":
      return { ok: true, answer: relLinePlane(b, a) };
    case "plane-plane":
      return { ok: true, answer: relPlanePlane(a, b) };
    case "sphere-plane":
      return { ok: true, answer: relSpherePlane(a, b) };
    case "plane-sphere":
      return { ok: true, answer: relSpherePlane(b, a) };
    case "point-sphere":
      return { ok: true, answer: relPointSphere(a, b) };
    case "sphere-point":
      return { ok: true, answer: relPointSphere(b, a) };
    case "sphere-line":
      return { ok: true, answer: relSphereLine(a, b) };
    case "line-sphere":
      return { ok: true, answer: relSphereLine(b, a) };
    default:
      return { ok: false, problem: `relative position not supported for ${key}` };
  }
}

// api/_lib/kernel/compute/equation.ts
function bgcd2(a, b) {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a;
}
function blcm(a, b) {
  return a / bgcd2(a, b) * b;
}
function rationalCoeffs(scalars) {
  const out = [];
  for (const s of scalars) {
    if (s.exact === null || s.exact.radicand !== 1) return null;
    out.push({ num: s.exact.num, den: s.exact.den });
  }
  return out;
}
function formatLinear(a, b, c, d) {
  let out = "";
  const term = (k, v) => {
    if (k === 0n) return;
    const neg2 = k < 0n;
    const abs = neg2 ? -k : k;
    const mag = v !== "" && abs === 1n ? "" : `${abs}`;
    if (out === "") out += `${neg2 ? "-" : ""}${mag}${v}`;
    else out += ` ${neg2 ? "-" : "+"} ${mag}${v}`;
  };
  term(a, "x");
  term(b, "y");
  term(c, "z");
  term(d, "");
  if (out === "") out = "0";
  return `${out} = 0`;
}
function fmtNum(n) {
  return Number.isInteger(n) ? `${n}` : n.toFixed(4);
}
function formatLinearApprox(a, b, c, d) {
  let out = "";
  const term = (k, v) => {
    if (Math.abs(k) < 1e-12) return;
    const neg2 = k < 0;
    const abs = Math.abs(k);
    const mag = v !== "" && Math.abs(abs - 1) < 1e-12 ? "" : fmtNum(abs);
    if (out === "") out += `${neg2 ? "-" : ""}${mag}${v}`;
    else out += ` ${neg2 ? "-" : "+"} ${mag}${v}`;
  };
  term(a, "x");
  term(b, "y");
  term(c, "z");
  term(d, "");
  if (out === "") out = "0";
  return `${out} = 0`;
}
function planeEquationText(pl) {
  const rats = rationalCoeffs([pl.n.x, pl.n.y, pl.n.z, pl.d]);
  if (!rats) {
    return formatLinearApprox(pl.n.x.approx, pl.n.y.approx, pl.n.z.approx, pl.d.approx);
  }
  let D = 1n;
  for (const r of rats) D = blcm(D, r.den);
  const ints = rats.map((r) => r.num * (D / r.den));
  let g = 0n;
  for (const k of ints) g = bgcd2(g, k);
  if (g === 0n) g = 1n;
  let [a, b, c, d] = ints.map((k) => k / g);
  const lead = [a, b, c].find((k) => k !== 0n);
  if (lead !== void 0 && lead < 0n) {
    a = -a;
    b = -b;
    c = -c;
    d = -d;
  }
  return formatLinear(a, b, c, d);
}
function sphereEquationText(s) {
  const parts = [s.center.x, s.center.y, s.center.z];
  if (parts.some((c) => c.exact === null || c.exact.radicand !== 1) || s.r2.exact === null) {
    return `t\xE2m \u2248 (${parts.map((c) => fmtNum(c.approx)).join(", ")}), R\xB2 \u2248 ${fmtNum(s.r2.approx)}`;
  }
  const varPart = (c, v) => {
    const e = c.exact;
    if (e.num === 0n) return `${v}\xB2`;
    const neg2 = e.num < 0n;
    const mag = displayExact({ num: neg2 ? -e.num : e.num, den: e.den, radicand: 1 });
    return `(${v} ${neg2 ? "+" : "-"} ${mag})\xB2`;
  };
  return `${varPart(s.center.x, "x")} + ${varPart(s.center.y, "y")} + ${varPart(s.center.z, "z")} = ${displayExact(s.r2.exact)}`;
}
function lineEquationText(l) {
  const comp = (p0, d, v) => {
    const dNeg = d.approx < 0;
    const dMag = displayScalar(dNeg ? neg(d) : d);
    return `${v} = ${displayScalar(p0)} ${dNeg ? "-" : "+"} ${dMag}t`;
  };
  return [
    comp(l.p.x, l.dir.x, "x"),
    comp(l.p.y, l.dir.y, "y"),
    comp(l.p.z, l.dir.z, "z")
  ].join(", ");
}

// api/_lib/kernel/compute/query.ts
var Tok = external_exports.string().min(1);
var SolidSpec = external_exports.object({ solid: external_exports.enum(["tetrahedron", "pyramid"]), points: external_exports.array(Tok).min(3), apex: Tok.optional() });
var QueryESchema = external_exports.union([
  external_exports.object({ kind: external_exports.literal("distance"), a: Tok, b: Tok }),
  external_exports.object({ kind: external_exports.literal("angle"), a: Tok, b: Tok }),
  external_exports.object({ kind: external_exports.literal("relative_position"), a: Tok, b: Tok }),
  external_exports.object({ kind: external_exports.literal("intersection"), a: Tok, b: Tok }),
  external_exports.object({ kind: external_exports.literal("equation"), target: Tok }),
  external_exports.object({ kind: external_exports.literal("volume"), solid: external_exports.literal("sphere"), target: Tok }),
  external_exports.object({ kind: external_exports.literal("volume"), solid: external_exports.enum(["tetrahedron", "pyramid"]), points: external_exports.array(Tok).min(3), apex: Tok.optional() }),
  external_exports.object({ kind: external_exports.literal("volume_ratio"), a: SolidSpec, b: SolidSpec }),
  external_exports.object({ kind: external_exports.literal("area"), shape: external_exports.literal("sphere"), target: Tok }),
  external_exports.object({ kind: external_exports.literal("area"), shape: external_exports.enum(["triangle", "polygon"]), points: external_exports.array(Tok).min(3) }),
  external_exports.object({ kind: external_exports.literal("sphere_metric"), target: Tok, what: external_exports.enum(["radius", "top_z", "bottom_z"]) }),
  external_exports.object({ kind: external_exports.literal("point_coord"), target: Tok, axis: external_exports.enum(["x", "y", "z"]) })
]);
function asPoints(tokens, et) {
  return tokens.map((t) => {
    const e = resolveEntityE(t, et);
    if (e.kind !== "point") throw new Error(`"${t}" must be a point`);
    return e;
  });
}
function entityIsApprox(e) {
  const anyNull = (ss) => ss.some((s) => s.exact === null);
  if (e.kind === "plane") return anyNull([e.n.x, e.n.y, e.n.z, e.d]);
  if (e.kind === "sphere") return anyNull([e.center.x, e.center.y, e.center.z, e.r2]);
  if (e.kind === "line") return anyNull([e.p.x, e.p.y, e.p.z, e.dir.x, e.dir.y, e.dir.z]);
  return false;
}
function solidVolumeScalar(spec, et) {
  const pts = asPoints(spec.points, et);
  let r;
  if (spec.solid === "tetrahedron") {
    if (pts.length !== 4) throw new Error("tetrahedron needs exactly 4 points");
    r = computeTetraVolume(pts[0], pts[1], pts[2], pts[3]);
  } else {
    if (!spec.apex) throw new Error("pyramid needs an apex");
    r = computePyramidVolume(pts, asPoints([spec.apex], et)[0]);
  }
  if (!r.ok) throw new Error(r.problem);
  return { approx: r.answer.approx, exact: r.answer.exact };
}
function computeQuery(query, et) {
  try {
    switch (query.kind) {
      case "distance":
        return computeDistance(resolveEntityE(query.a, et), resolveEntityE(query.b, et));
      case "angle":
        return computeAngle(resolveEntityE(query.a, et), resolveEntityE(query.b, et));
      case "relative_position":
        return computeRelativePosition(resolveEntityE(query.a, et), resolveEntityE(query.b, et));
      case "intersection":
        return computeIntersection(resolveEntityE(query.a, et), resolveEntityE(query.b, et));
      case "equation": {
        const e = resolveEntityE(query.target, et);
        const text = e.kind === "plane" ? planeEquationText(e) : e.kind === "sphere" ? sphereEquationText(e) : e.kind === "line" ? lineEquationText(e) : null;
        if (text === null) return { ok: false, problem: `no equation for a ${e.kind}` };
        return { ok: true, answer: { kind: "equation", text, approximate: entityIsApprox(e) } };
      }
      case "volume": {
        if (query.solid === "sphere") {
          const e = resolveEntityE(query.target, et);
          if (e.kind !== "sphere") return { ok: false, problem: "volume(sphere) needs a sphere" };
          return { ok: true, answer: computeSphereVolume(e) };
        }
        const pts = asPoints(query.points, et);
        if (query.solid === "tetrahedron") {
          if (pts.length !== 4) return { ok: false, problem: "tetrahedron needs exactly 4 points" };
          return computeTetraVolume(pts[0], pts[1], pts[2], pts[3]);
        }
        if (!query.apex) return { ok: false, problem: "pyramid needs an apex" };
        return computePyramidVolume(pts, asPoints([query.apex], et)[0]);
      }
      case "volume_ratio":
        return volumeRatio(solidVolumeScalar(query.a, et), solidVolumeScalar(query.b, et));
      case "area": {
        if (query.shape === "sphere") {
          const e = resolveEntityE(query.target, et);
          if (e.kind !== "sphere") return { ok: false, problem: "area(sphere) needs a sphere" };
          return { ok: true, answer: computeSphereArea(e) };
        }
        const pts = asPoints(query.points, et);
        if (query.shape === "triangle") {
          if (pts.length !== 3) return { ok: false, problem: "triangle area needs exactly 3 points" };
          return computeTriangleArea(pts[0], pts[1], pts[2]);
        }
        return computePolygonArea(pts);
      }
      case "sphere_metric": {
        const e = resolveEntityE(query.target, et);
        if (e.kind !== "sphere") return { ok: false, problem: "sphere_metric needs a sphere" };
        const R = Math.sqrt(e.r2.approx);
        const val = query.what === "radius" ? R : query.what === "top_z" ? e.center.z.approx + R : e.center.z.approx - R;
        return { ok: true, answer: { kind: "sphere_metric", exact: null, approx: val, text: val.toFixed(4), approximate: true } };
      }
      case "point_coord": {
        const e = resolveEntityE(query.target, et);
        if (e.kind !== "point") return { ok: false, problem: "point_coord needs a point" };
        const s = query.axis === "x" ? e.p.x : query.axis === "y" ? e.p.y : e.p.z;
        return { ok: true, answer: certifyScalar("point_coord", s, s.approx) };
      }
    }
  } catch (e) {
    return { ok: false, problem: e.message };
  }
}

// api/_lib/kernel/verifyE.ts
var DIST_TOL = 1e-6;
var ANGLE_TOL = 1e-3;
function fail(relation, args, message) {
  return { kind: "assert_failed", relation, args, message };
}
function mustOk(r) {
  if (!r.ok) throw new Error(r.problem);
  return r.answer;
}
function verifyAssertE(assert, et) {
  const args = assert.args;
  switch (assert.relation) {
    case "on": {
      const a = resolveEntityE(args[0], et);
      const b = resolveEntityE(args[1], et);
      if (a.kind === "point") {
        const ans = mustOk(computeDistance(a, b));
        const tol = assert.tolerance ?? DIST_TOL;
        return ans.approx < tol ? null : fail("on", args, `${args[0]} not on ${args[1]} (distance ${ans.approx.toFixed(6)})`);
      }
      const rel2 = mustOk(computeRelativePosition(a, b)).relation;
      const contained = rel2 === "\u0111\u01B0\u1EDDng n\u1EB1m tr\xEAn m\u1EB7t" || rel2 === "tr\xF9ng nhau";
      return contained ? null : fail("on", args, `${args[0]} not contained in ${args[1]} (${rel2})`);
    }
    case "dist": {
      const ans = mustOk(computeDistance(resolveEntityE(args[0], et), resolveEntityE(args[1], et)));
      const tol = assert.tolerance ?? DIST_TOL;
      return Math.abs(ans.approx - assert.value) < tol ? null : fail("dist", args, `dist(${args[0]},${args[1]})=${ans.approx.toFixed(6)}, expected ${assert.value}`);
    }
    case "perp": {
      const ans = mustOk(computeAngle(resolveEntityE(args[0], et), resolveEntityE(args[1], et)));
      const tol = assert.tolerance ?? ANGLE_TOL;
      return Math.abs(ans.degrees - 90) < tol ? null : fail("perp", args, `${args[0]} not perpendicular to ${args[1]} (angle ${ans.degrees.toFixed(4)}\xB0)`);
    }
    case "parallel": {
      const ans = mustOk(computeAngle(resolveEntityE(args[0], et), resolveEntityE(args[1], et)));
      const tol = assert.tolerance ?? ANGLE_TOL;
      return Math.abs(ans.degrees) < tol ? null : fail("parallel", args, `${args[0]} not parallel to ${args[1]} (angle ${ans.degrees.toFixed(4)}\xB0)`);
    }
    case "angle": {
      const ans = mustOk(computeAngle(resolveEntityE(args[0], et), resolveEntityE(args[1], et)));
      const tol = assert.tolerance ?? ANGLE_TOL;
      return Math.abs(ans.degrees - assert.value) < tol ? null : fail("angle", args, `angle(${args[0]},${args[1]})=${ans.degrees.toFixed(4)}\xB0, expected ${assert.value}\xB0`);
    }
    case "coplanar": {
      const pts = args.map((t) => resolveEntityE(t, et));
      if (pts.some((p) => p.kind !== "point")) throw new Error("coplanar requires point arguments");
      const cp = coplanarityProblem(pts.map((p) => p.p), "points", assert.tolerance ?? EPS3);
      return cp ? fail("coplanar", args, cp) : null;
    }
  }
}

// api/_lib/kernel/run.ts
var RunPlanSchema = external_exports.object({
  solidName: external_exports.string().min(1),
  ops: external_exports.array(UnifiedOpSchema).min(1),
  asserts: external_exports.array(AssertOpSchema).default([]),
  queries: external_exports.array(QueryESchema).default([])
});
function run(rawPlan) {
  const trace = [];
  const errors = [];
  const violations = [];
  const answers = [];
  const parsed = RunPlanSchema.safeParse(rawPlan);
  if (!parsed.success) {
    return { ok: false, entities: createEmptyEntityTable(), answers, violations, errors: [{ message: `Invalid plan: ${parsed.error.issues[0]?.message ?? "schema error"}` }], trace };
  }
  const plan = parsed.data;
  let entities;
  try {
    entities = executeUnifiedPlan(plan);
    trace.push(`executed ${plan.ops.length} ops, ${entities.points.size} points`);
  } catch (e) {
    return { ok: false, entities: createEmptyEntityTable(), answers, violations, errors: [{ message: e.message }], trace };
  }
  for (const assert of plan.asserts) {
    try {
      const v = verifyAssertE(assert, entities);
      if (v) violations.push(v);
    } catch (e) {
      errors.push({ message: `assert ${assert.relation}(${assert.args.join(",")}): ${e.message}` });
    }
  }
  trace.push(`verified ${plan.asserts.length} asserts, ${violations.length} violation(s)`);
  for (const query of plan.queries) {
    const r = computeQuery(query, entities);
    if (r.ok) answers.push(r.answer);
    else errors.push({ message: `query ${query.kind}: ${r.problem}` });
  }
  trace.push(`computed ${answers.length}/${plan.queries.length} queries`);
  return { ok: violations.length === 0 && errors.length === 0, entities, answers, violations, errors, trace };
}

// api/_lib/kernel/entityToGeometry.ts
function entityTableToGeometryData(et, name) {
  const points = Array.from(et.points.entries()).map(([label, pe]) => ({
    id: label,
    label,
    x: pe.p.x.approx,
    y: pe.p.y.approx,
    z: pe.p.z.approx
  }));
  const lines = Array.from(et.edges).map((key) => {
    const [from, to] = key.split("|");
    return { id: `${from}${to}`, from, to, style: "solid" };
  });
  const spheres = Array.from(et.spheres.entries()).map(([label, s]) => ({
    id: label,
    label,
    center: { x: s.center.x.approx, y: s.center.y.approx, z: s.center.z.approx },
    radius: Math.sqrt(Math.max(0, s.r2.approx))
  }));
  const planes = Array.from(et.faces.entries()).filter(([, verts]) => verts.length >= 3).map(([key, verts]) => ({
    id: key,
    label: key,
    points: verts.map((n) => {
      const p = et.points.get(n);
      return { x: p.p.x.approx, y: p.p.y.approx, z: p.p.z.approx };
    })
  }));
  return { name, points, lines, spheres, planes };
}

// api/_lib/kernel/analysis/expr.ts
function tokenize(s) {
  const toks = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === " " || c === "	") {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      toks.push({ t: "num", v: s.slice(i, j) });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-zA-Z0-9_]/.test(s[j])) j++;
      toks.push({ t: "name", v: s.slice(i, j) });
      i = j;
      continue;
    }
    if ("+-*/^".includes(c)) {
      toks.push({ t: "op", v: c });
      i++;
      continue;
    }
    if (c === "(") {
      toks.push({ t: "(", v: c });
      i++;
      continue;
    }
    if (c === ")") {
      toks.push({ t: ")", v: c });
      i++;
      continue;
    }
    throw new Error(`K\xFD t\u1EF1 l\u1EA1 trong bi\u1EC3u th\u1EE9c: '${c}'`);
  }
  return toks;
}
var FUNCS = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sqrt: Math.sqrt,
  abs: Math.abs
};
var CONSTS = { pi: Math.PI, e: Math.E };
var own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
function parseExpr(src) {
  const toks = tokenize(src);
  let pos = 0;
  const peek = () => toks[pos];
  const eat = () => toks[pos++];
  function parseE() {
    let left = parseT();
    while (peek() && peek().t === "op" && (peek().v === "+" || peek().v === "-")) {
      const op = eat().v;
      const right = parseT();
      const l = left;
      left = (env, fs) => op === "+" ? l(env, fs) + right(env, fs) : l(env, fs) - right(env, fs);
    }
    return left;
  }
  function parseT() {
    let left = parseU();
    while (peek() && peek().t === "op" && (peek().v === "*" || peek().v === "/")) {
      const op = eat().v;
      const right = parseU();
      const l = left;
      left = (env, fs) => op === "*" ? l(env, fs) * right(env, fs) : l(env, fs) / right(env, fs);
    }
    return left;
  }
  function parseU() {
    const tk = peek();
    if (tk && tk.t === "op" && tk.v === "-") {
      eat();
      const u = parseU();
      return (env, fs) => -u(env, fs);
    }
    if (tk && tk.t === "op" && tk.v === "+") {
      eat();
      return parseU();
    }
    return parseF();
  }
  function parseF() {
    const base = parseB();
    if (peek() && peek().t === "op" && peek().v === "^") {
      eat();
      const exp = parseU();
      return (env, fs) => Math.pow(base(env, fs), exp(env, fs));
    }
    return base;
  }
  function parseB() {
    const tk = peek();
    if (!tk) throw new Error("Bi\u1EC3u th\u1EE9c c\u1EE5t");
    if (tk.t === "num") {
      eat();
      const val = parseFloat(tk.v);
      return () => val;
    }
    if (tk.t === "(") {
      eat();
      const e = parseE();
      if (!peek() || peek().t !== ")") throw new Error("Thi\u1EBFu )");
      eat();
      return e;
    }
    if (tk.t === "name") {
      eat();
      if (peek() && peek().t === "(") {
        const fname = tk.v;
        eat();
        const arg = parseE();
        if (!peek() || peek().t !== ")") throw new Error("Thi\u1EBFu )");
        eat();
        return (env, fs) => {
          const fn2 = own(FUNCS, fname) ? FUNCS[fname] : own(fs, fname) ? fs[fname] : void 0;
          if (!fn2) throw new Error(`H\xE0m l\u1EA1: ${fname}`);
          return fn2(arg(env, fs));
        };
      }
      if (own(CONSTS, tk.v)) {
        const cv = CONSTS[tk.v];
        return () => cv;
      }
      const name = tk.v;
      return (env) => {
        if (!own(env, name)) throw new Error(`Bi\u1EBFn ch\u01B0a g\xE1n: ${name}`);
        return env[name];
      };
    }
    throw new Error(`Token l\u1EA1: ${tk.v}`);
  }
  const fn = parseE();
  if (pos !== toks.length) throw new Error("Bi\u1EC3u th\u1EE9c d\u01B0 token");
  return (env = {}, funcs = {}) => fn(env, funcs);
}
function evalExpr(src, env = {}, funcs = {}) {
  return parseExpr(src)(env, funcs);
}

// api/_lib/kernel/analysis/quadrature.ts
function simpson(f, a, b, n) {
  const m = n % 2 === 0 ? n : n + 1;
  const h = (b - a) / m;
  let s = f(a) + f(b);
  for (let i = 1; i < m; i++) s += (i % 2 ? 4 : 2) * f(a + i * h);
  return s * h / 3;
}
function integrate(f, a, b, tol = 1e-9, maxN = 1 << 18) {
  let n = 8;
  let prev = simpson(f, a, b, n);
  for (; ; ) {
    n *= 2;
    const cur = simpson(f, a, b, n);
    const err = Math.abs(cur - prev) / 15;
    if (err <= tol * Math.max(1, Math.abs(cur)) || n >= maxN) return { value: cur, estimatedError: err };
    prev = cur;
  }
}

// api/_lib/kernel/analysis/paramsolve.ts
function optimizeParam(f, lo, hi, sense, grid = 400) {
  const sign = sense === "max" ? 1 : -1;
  let bx = lo, bv = sign * f(lo);
  for (let i = 1; i <= grid; i++) {
    const x2 = lo + (hi - lo) * i / grid;
    const v = sign * f(x2);
    if (v > bv) {
      bv = v;
      bx = x2;
    }
  }
  const h = (hi - lo) / grid;
  let a = Math.max(lo, bx - h), b = Math.min(hi, bx + h);
  const gr = (Math.sqrt(5) - 1) / 2;
  let c = b - gr * (b - a), d = a + gr * (b - a);
  for (let k = 0; k < 200; k++) {
    if (sign * f(c) > sign * f(d)) b = d;
    else a = c;
    c = b - gr * (b - a);
    d = a + gr * (b - a);
    if (b - a < 1e-12) break;
  }
  const x = (a + b) / 2;
  return { x, value: f(x) };
}
function solveAllParam(f, target, lo, hi, grid = 800) {
  const g = (x) => f(x) - target;
  const roots = [];
  const push = (x) => {
    if (roots.length === 0 || Math.abs(x - roots[roots.length - 1]) > 1e-9) roots.push(x);
  };
  let x0 = lo, g0 = g(lo);
  if (g0 === 0) push(lo);
  for (let i = 1; i <= grid; i++) {
    const x1 = lo + (hi - lo) * i / grid;
    const g1 = g(x1);
    if (g1 === 0) {
      push(x1);
      x0 = x1;
      g0 = g1;
      continue;
    }
    if (g0 * g1 < 0) {
      let a = x0, b = x1, ga = g0;
      for (let k = 0; k < 200; k++) {
        const m = (a + b) / 2, gm = g(m);
        if (ga * gm <= 0) b = m;
        else {
          a = m;
          ga = gm;
        }
        if (b - a < 1e-13) break;
      }
      push((a + b) / 2);
    }
    x0 = x1;
    g0 = g1;
  }
  return roots;
}
function solveParam(f, target, lo, hi, grid = 800) {
  const roots = solveAllParam(f, target, lo, hi, grid);
  if (roots.length === 0) return null;
  const x = roots[0];
  return { x, residual: Math.abs(f(x) - target) };
}
function optimizeMulti(f, los, his, sense, gridPerDim = 40, rounds = 60, restarts = 5) {
  const n = los.length;
  const sign = sense === "max" ? 1 : -1;
  const gr = (Math.sqrt(5) - 1) / 2;
  const cells = [];
  const total = Math.pow(gridPerDim + 1, n);
  for (let t = 0; t < total; t++) {
    let rem = t;
    const xs = [];
    for (let d = 0; d < n; d++) {
      const i = rem % (gridPerDim + 1);
      rem = Math.floor(rem / (gridPerDim + 1));
      xs.push(los[d] + (his[d] - los[d]) * i / gridPerDim);
    }
    cells.push({ xs, v: sign * f(xs) });
  }
  cells.sort((A, B) => B.v - A.v);
  const starts = cells.slice(0, Math.max(1, restarts));
  const refine = (start) => {
    const xs = start.slice();
    for (let r = 0; r < rounds; r++) {
      for (let d = 0; d < n; d++) {
        const h = (his[d] - los[d]) / gridPerDim;
        let a = Math.max(los[d], xs[d] - h);
        let b = Math.min(his[d], xs[d] + h);
        let c = b - gr * (b - a);
        let e = a + gr * (b - a);
        for (let k = 0; k < 80; k++) {
          const xc = xs.slice();
          xc[d] = c;
          const xe = xs.slice();
          xe[d] = e;
          if (sign * f(xc) > sign * f(xe)) b = e;
          else a = c;
          c = b - gr * (b - a);
          e = a + gr * (b - a);
          if (b - a < 1e-13) break;
        }
        xs[d] = (a + b) / 2;
      }
    }
    return { xs, value: f(xs) };
  };
  let best = refine(starts[0].xs);
  for (let s = 1; s < starts.length; s++) {
    const cand = refine(starts[s].xs);
    if (sign * cand.value > sign * best.value) best = cand;
  }
  return best;
}

// api/_lib/kernel/analysis/recognize.ts
var EPS4 = 1e-10;
function isSquareFree(n) {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) {
    if (n % (d * d) === 0) return false;
  }
  return true;
}
function squareFreeUpTo(n) {
  const out = [];
  for (let k = 2; k <= n; k++) if (isSquareFree(k)) out.push(k);
  return out;
}
var SQUAREFREE = squareFreeUpTo(400);
var MAX_DEN = 200;
function gcd2(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}
function asRational(x, maxDen) {
  for (let q = 1; q <= maxDen; q++) {
    const p = Math.round(x * q);
    if (Math.abs(x - p / q) < EPS4) {
      const g = gcd2(p, q);
      return { p: p / g, q: q / g };
    }
  }
  return null;
}
function fmtRational(p, q) {
  return q === 1 ? `${p}` : `${p}/${q}`;
}
function fmtSurdTerm(num2, den, rad) {
  const coeff = num2 === 1 ? `\u221A${rad}` : `${num2}\u221A${rad}`;
  return den === 1 ? coeff : `${coeff}/${den}`;
}
function fmtPiTerm(num2, den) {
  const coeff = num2 === 1 ? "\u03C0" : `${num2}\u03C0`;
  return den === 1 ? coeff : `${coeff}/${den}`;
}
function recognizeConstant(x) {
  const q0 = asRational(x, MAX_DEN);
  if (q0) return { text: fmtRational(q0.p, q0.q), value: q0.p / q0.q };
  for (const b of SQUAREFREE) {
    const s = x / Math.sqrt(b);
    const r = asRational(s, MAX_DEN);
    if (r && r.p !== 0) {
      const val = r.p / r.q * Math.sqrt(b);
      if (Math.abs(val - x) < EPS4) {
        const sign = r.p < 0 ? "-" : "";
        return { text: sign + fmtSurdTerm(Math.abs(r.p), r.q, b), value: val };
      }
    }
  }
  for (const r of SQUAREFREE) {
    const root = Math.sqrt(r);
    for (let qd = 1; qd <= 8; qd++) {
      for (let qn = -8; qn <= 8; qn++) {
        if (qn === 0) continue;
        const qv = qn / qd;
        const p = asRational(x - qv * root, 16);
        if (!p) continue;
        const val = p.p / p.q + qv * root;
        if (Math.abs(val - x) < EPS4) {
          const qAbsNum = Math.abs(qn);
          const g = gcd2(qAbsNum, qd);
          const surd = fmtSurdTerm(qAbsNum / g, qd / g, r);
          const op = qn < 0 ? "-" : "+";
          return { text: `${fmtRational(p.p, p.q)} ${op} ${surd}`, value: val };
        }
      }
    }
  }
  const rp = asRational(x / Math.PI, 64);
  if (rp && rp.p !== 0) {
    const val = rp.p / rp.q * Math.PI;
    if (Math.abs(val - x) < EPS4) {
      const sign = rp.p < 0 ? "-" : "";
      return { text: sign + fmtPiTerm(Math.abs(rp.p), rp.q), value: val };
    }
  }
  for (let qd = 1; qd <= 8; qd++) {
    for (let qn = -8; qn <= 8; qn++) {
      if (qn === 0) continue;
      const qv = qn / qd;
      const p = asRational(x - qv * Math.PI, 16);
      if (!p || p.p === 0) continue;
      const val = p.p / p.q + qv * Math.PI;
      if (Math.abs(val - x) < EPS4) {
        const qAbsNum = Math.abs(qn);
        const g = gcd2(qAbsNum, qd);
        const piTerm = fmtPiTerm(qAbsNum / g, qd / g);
        const op = qn < 0 ? "-" : "+";
        return { text: `${fmtRational(p.p, p.q)} ${op} ${piTerm}`, value: val };
      }
    }
  }
  return null;
}

// api/_lib/kernel/analysis/polyfit.ts
function solveLinear(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-12) throw new Error("Kh\u1EDBp \u0111a th\u1EE9c: h\u1EC7 suy bi\u1EBFn (\u0111i\u1EC3m tr\xF9ng/kh\xF4ng x\xE1c \u0111\u1ECBnh)");
    [M[col], M[piv]] = [M[piv], M[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}
function fitPoly(degree, through, leading, slopeAt = []) {
  const nUnknown = leading === void 0 ? degree + 1 : degree;
  const nGiven = through.length + slopeAt.length;
  if (nGiven !== nUnknown) {
    throw new Error(`fitPoly: c\u1EA7n ${nUnknown} r\xE0ng bu\u1ED9c cho b\u1EADc ${degree}${leading === void 0 ? "" : " (\u0111\xE3 ghim h\u1EC7 s\u1ED1 \u0111\u1EA7u)"}, nh\u1EADn ${nGiven}`);
  }
  const A = [];
  const b = [];
  for (const [x, y] of through) {
    const row = [];
    for (let k = 0; k < nUnknown; k++) row.push(Math.pow(x, k));
    A.push(row);
    b.push(leading === void 0 ? y : y - leading * Math.pow(x, degree));
  }
  for (const [x, s] of slopeAt) {
    const row = [];
    for (let k = 0; k < nUnknown; k++) row.push(k === 0 ? 0 : k * Math.pow(x, k - 1));
    A.push(row);
    b.push(leading === void 0 ? s : s - degree * leading * Math.pow(x, degree - 1));
  }
  const sol = solveLinear(A, b);
  return leading === void 0 ? sol : [...sol, leading];
}
function evalPoly(c, x) {
  let s = 0;
  for (let k = c.length - 1; k >= 0; k--) s = s * x + c[k];
  return s;
}
function derivPoly(c) {
  const d = [];
  for (let k = 1; k < c.length; k++) d.push(k * c[k]);
  return d.length ? d : [0];
}
function extremumOfPoly(c, lo, hi, sense) {
  const d1 = derivPoly(c);
  const d2 = derivPoly(d1);
  const extrema = solveAllParam((x) => evalPoly(d1, x), 0, lo, hi).map((x) => ({ x, y: evalPoly(c, x), curv: evalPoly(d2, x) })).filter((e) => Math.abs(e.curv) > 1e-9);
  const pick = sense === "max" ? extrema.filter((e) => e.curv < 0) : sense === "min" ? extrema.filter((e) => e.curv > 0) : extrema;
  if (pick.length === 0) return null;
  return { x: pick[0].x, y: pick[0].y };
}

// api/_lib/kernel/analysis/solids.ts
function zRange(s) {
  if (s.kind === "cylinder") return [Math.min(s.from, s.to), Math.max(s.from, s.to)];
  return [Math.min(s.baseZ, s.apexZ), Math.max(s.baseZ, s.apexZ)];
}
function diskAt(s, z) {
  const [lo, hi] = zRange(s);
  if (z < lo || z > hi) return { cx: 0, cy: 0, r: 0 };
  if (s.kind === "cylinder") return { cx: s.cx, cy: s.cy, r: s.radius };
  const t = (s.apexZ - z) / (s.apexZ - s.baseZ);
  return { cx: s.cx, cy: s.cy, r: s.baseRadius * Math.max(0, t) };
}
function lensArea(r1, r2, d) {
  if (r1 <= 0 || r2 <= 0) return 0;
  if (d >= r1 + r2) return 0;
  if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
  const clamp1 = (v) => v < -1 ? -1 : v > 1 ? 1 : v;
  const a1 = r1 * r1 * Math.acos(clamp1((d * d + r1 * r1 - r2 * r2) / (2 * d * r1)));
  const a2 = r2 * r2 * Math.acos(clamp1((d * d + r2 * r2 - r1 * r1) / (2 * d * r2)));
  const tri = 0.5 * Math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2));
  return a1 + a2 - tri;
}
function intersectionVolume(a, b) {
  const [aLo, aHi] = zRange(a);
  const [bLo, bHi] = zRange(b);
  const lo = Math.max(aLo, bLo);
  const hi = Math.min(aHi, bHi);
  if (hi <= lo) return { value: 0, estimatedError: 0 };
  const f = (z) => {
    const d1 = diskAt(a, z);
    const d2 = diskAt(b, z);
    return lensArea(d1.r, d2.r, Math.hypot(d1.cx - d2.cx, d1.cy - d2.cy));
  };
  return integrate(f, lo, hi);
}

// api/_lib/kernel/analysis/analysisFigure.ts
var RING = 16;
var CURVE_SAMPLES = 24;
function effectiveDegree(coeffs) {
  let deg = coeffs.length - 1;
  while (deg > 0 && Math.abs(coeffs[deg]) < 1e-12) deg--;
  return deg;
}
function polyCurve(id, coeffs, xMin, xMax) {
  const deg = effectiveDegree(coeffs);
  const c = (k) => coeffs[k] ?? 0;
  if (deg <= 2) {
    return { id, type: "parabola", params: { a: c(2), b: c(1), c: c(0), xMin, xMax } };
  }
  if (deg === 3) {
    return { id, type: "cubic", params: { a: c(3), b: c(2), c: c(1), d: c(0), xMin, xMax } };
  }
  return { id, type: "poly", params: { coeffs: [...coeffs], xMin, xMax } };
}
function buildAnalysisFigure(name, inp) {
  const points = [];
  const lines = [];
  const curves = [];
  for (const p of inp.points) {
    points.push({ id: p.id, label: p.id, x: p.x, y: p.y, z: p.z });
  }
  for (const [fnName, coeffs] of Object.entries(inp.polys)) {
    const [xMin, xMax] = inp.polyDomains[fnName] ?? [0, 10];
    curves.push(polyCurve(`curve_${fnName}`, coeffs, xMin, xMax));
    for (let k = 0; k <= CURVE_SAMPLES; k++) {
      const x = xMin + (xMax - xMin) * k / CURVE_SAMPLES;
      const y = evalPoly(coeffs, x);
      const id = `${fnName}_s${k}`;
      points.push({ id, label: "", x, y, z: 0 });
    }
  }
  for (const [solidName, s] of Object.entries(inp.solids)) {
    const ringPoints = (cx, cy, r, z, tag) => {
      const ids = [];
      for (let k = 0; k < RING; k++) {
        const theta = 2 * Math.PI * k / RING;
        const id = `${solidName}_${tag}${k}`;
        points.push({ id, label: "", x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta), z });
        ids.push(id);
      }
      for (let k = 0; k < RING; k++) {
        lines.push({ id: `${solidName}_${tag}L${k}`, from: ids[k], to: ids[(k + 1) % RING], style: "solid" });
      }
      return ids;
    };
    if (s.kind === "cylinder") {
      const bottom = ringPoints(s.cx, s.cy, s.radius, Math.min(s.from, s.to), "b");
      const top = ringPoints(s.cx, s.cy, s.radius, Math.max(s.from, s.to), "t");
      for (let k = 0; k < RING; k += 4) {
        lines.push({ id: `${solidName}_g${k}`, from: bottom[k], to: top[k], style: "solid" });
      }
    } else {
      const base = ringPoints(s.cx, s.cy, s.baseRadius, s.baseZ, "b");
      const apexId = `${solidName}_apex`;
      points.push({ id: apexId, label: apexId, x: s.cx, y: s.cy, z: s.apexZ });
      for (let k = 0; k < RING; k += 4) {
        lines.push({ id: `${solidName}_e${k}`, from: base[k], to: apexId, style: "solid" });
      }
    }
  }
  return { name, points, lines, curves, spheres: [], planes: [] };
}

// api/_lib/kernel/analysis/runAnalysis.ts
var NumOrExpr = external_exports.union([external_exports.number(), external_exports.string()]);
var SolidDeclSchema = external_exports.union([
  external_exports.object({ name: external_exports.string(), kind: external_exports.literal("cylinder"), center: external_exports.tuple([NumOrExpr, NumOrExpr]), radius: NumOrExpr, from: NumOrExpr, to: NumOrExpr }),
  external_exports.object({ name: external_exports.string(), kind: external_exports.literal("cone"), center: external_exports.tuple([NumOrExpr, NumOrExpr]), baseRadius: NumOrExpr, baseZ: NumOrExpr, apexZ: NumOrExpr })
]);
var ScalarSource = external_exports.union([
  QueryESchema,
  external_exports.object({ kind: external_exports.literal("expr"), expr: external_exports.string() }),
  external_exports.object({ kind: external_exports.literal("solid_volume"), of: external_exports.tuple([external_exports.string(), external_exports.string()]), mode: external_exports.literal("intersection") })
]);
var AnalyzeSchema = external_exports.union([
  external_exports.object({ kind: external_exports.literal("optimize"), parameter: external_exports.string(), sense: external_exports.enum(["max", "min"]), objective: ScalarSource }),
  external_exports.object({
    kind: external_exports.literal("solve"),
    parameter: external_exports.string(),
    constraint: external_exports.object({ of: ScalarSource, equals: NumOrExpr }),
    report: ScalarSource
  }),
  external_exports.object({ kind: external_exports.literal("integrate"), variable: external_exports.string(), from: NumOrExpr, to: NumOrExpr, integrand: external_exports.string() }),
  external_exports.object({ kind: external_exports.literal("eval"), of: ScalarSource }),
  external_exports.object({ kind: external_exports.literal("optimize_multi"), parameters: external_exports.array(external_exports.string()).min(2), sense: external_exports.enum(["max", "min"]), objective: ScalarSource })
]);
var FunctionOpSchema = external_exports.union([
  external_exports.object({ op: external_exports.literal("curve_point"), name: external_exports.string(), f: external_exports.string(), x: NumOrExpr }),
  external_exports.object({ op: external_exports.literal("tangent_line"), name: external_exports.string(), f: external_exports.string(), x: NumOrExpr }),
  external_exports.object({ op: external_exports.literal("curve_extremum"), name: external_exports.string(), f: external_exports.string(), domain: external_exports.tuple([NumOrExpr, NumOrExpr]) })
]);
var AnalysisPlanSchema = RunPlanSchema.extend({
  ops: external_exports.array(external_exports.union([FunctionOpSchema, UnifiedOpSchema])).default([]),
  parameters: external_exports.array(external_exports.object({ name: external_exports.string(), domain: external_exports.tuple([NumOrExpr, NumOrExpr]) })).default([]),
  functions: external_exports.array(external_exports.object({
    name: external_exports.string(),
    form: external_exports.literal("poly"),
    degree: external_exports.number().int().min(1),
    through: external_exports.array(external_exports.tuple([NumOrExpr, NumOrExpr])),
    leading: external_exports.string().optional(),
    // tên tham số dùng làm hệ số bậc cao nhất (để trống ⇒ khớp đủ điểm)
    slopeAt: external_exports.array(external_exports.tuple([NumOrExpr, NumOrExpr])).default([])
  })).default([]),
  solids: external_exports.array(SolidDeclSchema).default([]),
  analyze: AnalyzeSchema
});
function numify(c, env, params) {
  if (typeof c === "string" && params.some((p) => new RegExp(`\\b${p}\\b`).test(c))) return evalExpr(c, env);
  return c;
}
function scalarOf(a) {
  const o = a;
  if (o && typeof o.approx === "number") return o.approx;
  if (o && typeof o.degrees === "number") return o.degrees;
  throw new Error("Truy v\u1EA5n m\u1EE5c ti\xEAu/\u0111i\u1EC1u ki\u1EC7n kh\xF4ng tr\u1EA3 s\u1ED1");
}
function fail2(name, msg) {
  return { ok: false, parameter: { name, value: NaN }, answer: { approx: NaN, text: "(l\u1ED7i)", approximate: true }, violations: [], errors: [{ message: msg }] };
}
function runAnalysis(raw) {
  const parsed = AnalysisPlanSchema.safeParse(raw);
  if (!parsed.success) return fail2("?", `Invalid analysis plan: ${parsed.error.issues[0]?.message ?? "schema"}`);
  const plan = parsed.data;
  const paramNames = plan.parameters.map((p) => p.name);
  const fitAt = (env) => {
    const coeffs = {};
    const funcs = {};
    for (const fd of plan.functions) {
      const pts = fd.through.map(([px, py]) => [evalExpr(String(px), env), evalExpr(String(py), env)]);
      const lead = fd.leading !== void 0 ? evalExpr(fd.leading, env) : void 0;
      const slopes = fd.slopeAt.map(([sx, ss]) => [evalExpr(String(sx), env), evalExpr(String(ss), env)]);
      const c = fitPoly(fd.degree, pts, lead, slopes);
      coeffs[fd.name] = c;
      funcs[fd.name] = (x) => evalPoly(c, x);
    }
    return { coeffs, funcs };
  };
  const buildSolids = (env) => {
    const out = {};
    for (const sd of plan.solids) {
      const n = (v) => evalExpr(String(v), env);
      out[sd.name] = sd.kind === "cylinder" ? { kind: "cylinder", cx: n(sd.center[0]), cy: n(sd.center[1]), radius: n(sd.radius), from: n(sd.from), to: n(sd.to) } : { kind: "cone", cx: n(sd.center[0]), cy: n(sd.center[1]), baseRadius: n(sd.baseRadius), baseZ: n(sd.baseZ), apexZ: n(sd.apexZ) };
    }
    return out;
  };
  const buildFigureInput = (env) => {
    const polys = fitAt(env).coeffs;
    const polyDomains = {};
    for (const fd of plan.functions) {
      const xs = fd.through.map(([px]) => evalExpr(String(px), env));
      if (xs.length > 0) polyDomains[fd.name] = [Math.min(...xs), Math.max(...xs)];
    }
    const points = [];
    for (const op of plan.ops) {
      const o = op;
      if (o.op === "oxyz_point" && Array.isArray(o.at)) {
        const at = o.at.map((c) => evalExpr(String(c), env));
        points.push({ id: String(o.name), x: at[0], y: at[1], z: at[2] ?? 0 });
      }
    }
    return { polys, polyDomains, points, solids: buildSolids(env) };
  };
  const isExprSrc = (s) => !!s && typeof s === "object" && s.kind === "expr";
  const isSolidVolSrc = (s) => !!s && typeof s === "object" && s.kind === "solid_volume";
  const solidVolumeAt = (env, src) => {
    const built = buildSolids(env);
    const a = built[src.of[0]], b = built[src.of[1]];
    if (!a) throw new Error(`Kh\u1ED1i "${src.of[0]}" ch\u01B0a khai b\xE1o trong solids`);
    if (!b) throw new Error(`Kh\u1ED1i "${src.of[1]}" ch\u01B0a khai b\xE1o trong solids`);
    return intersectionVolume(a, b).value;
  };
  if (plan.analyze.kind === "integrate") {
    const az = plan.analyze;
    try {
      const { funcs } = fitAt({});
      const from = evalExpr(String(az.from), {}, funcs);
      const to = evalExpr(String(az.to), {}, funcs);
      const r = integrate((x) => evalExpr(az.integrand, { [az.variable]: x }, funcs), from, to);
      const nice = recognizeConstant(r.value);
      return {
        ok: true,
        parameter: { name: az.variable, value: NaN },
        answer: { approx: r.value, text: nice ? nice.text : r.value.toFixed(4), approximate: !nice },
        violations: [],
        errors: [],
        geometry: buildAnalysisFigure(az.variable, buildFigureInput({}))
      };
    } catch (e) {
      return fail2(az.variable, e.message);
    }
  }
  if (plan.analyze.kind === "eval") {
    const src = plan.analyze.of;
    try {
      let val;
      if (isSolidVolSrc(src)) val = solidVolumeAt({}, src);
      else if (isExprSrc(src)) val = evalExpr(src.expr, {}, fitAt({}).funcs);
      else return fail2("-", 'analyze.eval ch\u1EC9 nh\u1EADn ngu\u1ED3n "expr" ho\u1EB7c "solid_volume"');
      const nice = recognizeConstant(val);
      return {
        ok: Number.isFinite(val),
        parameter: { name: "-", value: NaN },
        answer: { approx: val, text: nice ? nice.text : val.toFixed(4), approximate: !nice },
        violations: [],
        errors: [],
        geometry: buildAnalysisFigure(plan.solidName || "figure", buildFigureInput({}))
      };
    } catch (e) {
      return fail2("-", e.message);
    }
  }
  if (plan.analyze.kind === "optimize_multi") {
    const az = plan.analyze;
    const src = az.objective;
    if (!isExprSrc(src)) return fail2(az.parameters.join(","), 'optimize_multi ch\u1EC9 nh\u1EADn objective d\u1EA1ng "expr"');
    const decls = az.parameters.map((nm) => plan.parameters.find((p) => p.name === nm));
    const missing = az.parameters.find((nm, i) => !decls[i]);
    if (missing) return fail2(az.parameters.join(","), `parameter "${missing}" ch\u01B0a khai b\xE1o`);
    try {
      const los = decls.map((d) => evalExpr(String(d.domain[0]), {}));
      const his = decls.map((d) => evalExpr(String(d.domain[1]), {}));
      const objective = (xs) => {
        const env = {};
        az.parameters.forEach((nm, i) => {
          env[nm] = xs[i];
        });
        return evalExpr(src.expr, env, fitAt(env).funcs);
      };
      const best = optimizeMulti(objective, los, his, az.sense);
      const nice = recognizeConstant(best.value);
      const envBest = {};
      az.parameters.forEach((nm, i) => {
        envBest[nm] = best.xs[i];
      });
      return {
        ok: Number.isFinite(best.value),
        parameter: { name: az.parameters.join(","), value: NaN },
        answer: { approx: best.value, text: nice ? nice.text : best.value.toFixed(4), approximate: !nice },
        violations: [],
        errors: [],
        geometry: buildAnalysisFigure(az.parameters.join(","), buildFigureInput(envBest))
      };
    } catch (e) {
      return fail2(az.parameters.join(","), e.message);
    }
  }
  const pname = plan.analyze.parameter;
  const decl = plan.parameters.find((p) => p.name === pname);
  if (!decl) return fail2(pname, `parameter "${pname}" ch\u01B0a khai b\xE1o`);
  const lo = evalExpr(String(decl.domain[0]), {});
  const hi = evalExpr(String(decl.domain[1]), {});
  const concreteOps = (value) => {
    const env = { [pname]: value };
    const fitted = fitAt(env).coeffs;
    const needFn = (name) => {
      const c = fitted[name];
      if (!c) throw new Error(`H\xE0m "${name}" ch\u01B0a khai b\xE1o trong functions`);
      return c;
    };
    return plan.ops.map((op) => {
      const o = op;
      if (o.op === "curve_point") {
        const c = needFn(o.f);
        const x = evalExpr(String(o.x), env);
        return { op: "oxyz_point", name: o.name, at: [x, evalPoly(c, x), 0] };
      }
      if (o.op === "tangent_line") {
        const c = needFn(o.f);
        const x = evalExpr(String(o.x), env);
        const slope = evalPoly(derivPoly(c), x);
        return { op: "oxyz_line", name: o.name, by: { form: "point_dir", base: [x, evalPoly(c, x), 0], dir: [1, slope, 0] } };
      }
      if (o.op === "curve_extremum") {
        const c = needFn(o.f);
        const dom = o.domain;
        const ex = extremumOfPoly(c, evalExpr(String(dom[0]), env), evalExpr(String(dom[1]), env));
        if (!ex) throw new Error(`curve_extremum: h\xE0m "${o.f}" kh\xF4ng c\xF3 c\u1EF1c tr\u1ECB trong mi\u1EC1n`);
        return { op: "oxyz_point", name: o.name, at: [ex.x, ex.y, 0] };
      }
      if (o.op === "oxyz_point" && Array.isArray(o.at)) return { ...o, at: o.at.map((c) => numify(c, env, paramNames)) };
      if (o.op === "oxyz_circumsphere_offset") return { ...o, t: numify(o.t, env, paramNames) };
      return op;
    });
  };
  const evalQuery = (value, src) => {
    const env = { [pname]: value };
    if (isExprSrc(src)) {
      try {
        return evalExpr(src.expr, env, fitAt(env).funcs);
      } catch {
        return null;
      }
    }
    if (isSolidVolSrc(src)) {
      try {
        return solidVolumeAt(env, src);
      } catch {
        return null;
      }
    }
    let ops;
    try {
      ops = concreteOps(value);
    } catch {
      return null;
    }
    const res = run({ solidName: plan.solidName, ops, asserts: [], queries: [src] });
    if (!res.ok || res.answers.length === 0) return null;
    try {
      return scalarOf(res.answers[0]);
    } catch {
      return null;
    }
  };
  const finalize = (value, src) => {
    const env = { [pname]: value };
    let violations = [];
    let errors = [];
    let val = NaN;
    let geometry = null;
    if (isExprSrc(src) || isSolidVolSrc(src)) {
      try {
        val = isSolidVolSrc(src) ? solidVolumeAt(env, src) : evalExpr(src.expr, env, fitAt(env).funcs);
      } catch (e) {
        return fail2(pname, e.message);
      }
      if (plan.ops.length > 0) {
        try {
          const res = run({ solidName: plan.solidName, ops: concreteOps(value), asserts: plan.asserts, queries: [] });
          violations = res.violations;
          errors = res.errors.map((e) => ({ message: e.message }));
          if (res.entities.points.size > 0) geometry = entityTableToGeometryData(res.entities, plan.solidName || "figure");
        } catch (e) {
          errors = [{ message: e.message }];
        }
      }
    } else {
      let ops;
      try {
        ops = concreteOps(value);
      } catch (e) {
        return fail2(pname, e.message);
      }
      const res = run({ solidName: plan.solidName, ops, asserts: plan.asserts, queries: [src] });
      try {
        if (res.answers.length > 0) val = scalarOf(res.answers[0]);
      } catch {
      }
      violations = res.violations;
      errors = res.errors.map((e) => ({ message: e.message }));
      if (res.entities.points.size > 0) geometry = entityTableToGeometryData(res.entities, plan.solidName || "figure");
    }
    const nice = Number.isFinite(val) ? recognizeConstant(val) : null;
    return {
      ok: violations.length === 0 && errors.length === 0 && Number.isFinite(val),
      parameter: { name: pname, value },
      answer: { approx: val, text: nice ? nice.text : Number.isFinite(val) ? val.toFixed(4) : "(l\u1ED7i)", approximate: !nice },
      violations,
      errors,
      geometry
    };
  };
  if (plan.analyze.kind === "optimize") {
    const obj = plan.analyze.objective;
    const f = (x) => {
      const v = evalQuery(x, obj);
      if (v === null) throw new Error("objective l\u1ED7i t\u1EA1i tham s\u1ED1");
      return v;
    };
    let best;
    try {
      best = optimizeParam(f, lo, hi, plan.analyze.sense);
    } catch (e) {
      return fail2(pname, e.message);
    }
    return finalize(best.x, obj);
  }
  const target = evalExpr(String(plan.analyze.constraint.equals), {});
  const cof = plan.analyze.constraint.of;
  const g = (x) => {
    const v = evalQuery(x, cof);
    if (v === null) throw new Error("constraint l\u1ED7i t\u1EA1i tham s\u1ED1");
    return v;
  };
  let sol;
  try {
    sol = solveParam(g, target, lo, hi);
  } catch (e) {
    return fail2(pname, e.message);
  }
  if (!sol) return fail2(pname, "kh\xF4ng t\xECm \u0111\u01B0\u1EE3c nghi\u1EC7m tham s\u1ED1 trong mi\u1EC1n");
  return finalize(sol.x, plan.analyze.report);
}
function runAny(raw) {
  if (raw && typeof raw === "object" && "analyze" in raw) return runAnalysis(raw);
  return run(raw);
}

// api/_lib/kernel/index.ts
function runPlan(rawPlan) {
  const trace = new Trace();
  const plan = PlanSchema.parse(rawPlan);
  trace.log("execute", `Executing plan "${plan.solidName}" with ${plan.ops.length} ops`);
  const symtab = executePlan(plan);
  trace.log("execute", `Executed successfully: ${symtab.points.size} points defined`);
  const verify = verifyPlan(plan, symtab);
  trace.log("verify", `Verification ${verify.ok ? "passed" : "failed"}: ${verify.violations.length} violation(s)`);
  const geometry = toGeometryData(symtab, plan.solidName);
  return { plan, symtab, geometry, verify, trace };
}
export {
  AnalysisPlanSchema,
  AssertOpSchema,
  BaseOpSchema,
  ConstructionOpSchema,
  EdgeOpSchema,
  FootOpSchema,
  IntersectOpSchema,
  PerpPointOpSchema,
  PlanSchema,
  PointOpSchema,
  PrismOpSchema,
  PyramidOpSchema,
  QuerySchema,
  REPAIR_MAX_PERP_ERROR,
  REPAIR_MAX_RELATIVE_ERROR,
  RunPlanSchema,
  Trace,
  TriangleDimsSchema,
  attemptDeterministicRepair,
  checkDegeneracy,
  createEmptySymbolTable,
  entityTableToGeometryData,
  executeOp,
  executePlan,
  resolveEntity,
  run,
  runAnalysis,
  runAny,
  runPlan,
  toExactForm,
  toGeometryData,
  verifyAssert,
  verifyPlan
};
