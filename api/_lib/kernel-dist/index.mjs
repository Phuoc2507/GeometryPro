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
    this.addIssue = (sub6) => {
      this.issues = [...this.issues, sub6];
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
    for (const sub6 of this.issues) {
      if (sub6.path.length > 0) {
        const firstEl = sub6.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub6));
      } else {
        formErrors.push(mapper(sub6));
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
    for (const pair2 of pairs) {
      const key = await pair2.key;
      const value = await pair2.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair2 of pairs) {
      const { key, value } = pair2;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair2.alwaysSet)) {
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
        for (const pair2 of pairs) {
          const key = await pair2.key;
          const value = await pair2.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair2.alwaysSet
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
        for (const pair2 of pairs) {
          const key = await pair2.key;
          const value = await pair2.value;
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
      for (const pair2 of pairs) {
        const key = pair2.key;
        const value = pair2.value;
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
  size(size2, message) {
    return this.min(size2, message).max(size2, message);
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
  const p2 = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p22 = typeof p2 === "string" ? { message: p2 } : p2;
  return p22;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r2 = check(data);
      if (r2 instanceof Promise) {
        return r2.then((r3) => {
          if (!r3) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r2) {
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
  // Số HOẶC biểu thức căn ("sqrt(3)", "2*sqrt(3)/3"): LLM khai chính xác, engine eval khi kiểm —
  // tránh bắt LLM tự tính số thập phân thô (mất căn đẹp + rủi ro ảo giác). verifyE.ts resolve.
  value: external_exports.union([external_exports.number(), external_exports.string()]).optional(),
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
  const p2 = symtab.points.get(name);
  if (!p2) throw new Error(`Unknown point "${name}"`);
  return p2;
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
  const sum = points.reduce((acc, p2) => add(acc, p2), vec3(0, 0, 0));
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
function distancePointToPlane(p2, planePoint, normal) {
  return Math.abs(dot(sub(p2, planePoint), normal));
}
function projectPointOntoPlane(p2, planePoint, normal) {
  const d = dot(sub(p2, planePoint), normal);
  return sub(p2, scale(normal, d));
}
function distancePointToLine(p2, a, b) {
  const d = normalize(sub(b, a));
  const ap = sub(p2, a);
  const proj = scale(d, dot(ap, d));
  return length(sub(ap, proj));
}
function projectPointOntoLine(p2, a, b) {
  const d = normalize(sub(b, a));
  const t = dot(sub(p2, a), d);
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
  return points.every((p2) => distancePointToPlane(p2, p0, normal) < eps);
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
  return basePositions.map((p2) => add(p2, vec3(0, 0, height)));
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
  const sum = points.reduce((acc, p2) => add(acc, p2), { x: 0, y: 0, z: 0 });
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
  const r2 = sub(b1, a1);
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
  const rlen = length(r2);
  if (rlen > EPS && Math.abs(dot(r2, cross12)) / (rlen * l1 * l2) > EPS) {
    throw new Error("Lines are skew (not coplanar); no intersection point exists");
  }
  const t = dot(cross(r2, d2), cross12) / denom;
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
  const p2 = symtab.points.get(name);
  if (!p2) throw new Error(`Unknown point "${name}" referenced before it was defined`);
  return p2;
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
      const p2 = resolveEntity(pointTok, symtab);
      const e = resolveEntity(entityTok, symtab);
      if (p2.type !== "point") throw new Error(`"on" assert requires first arg to be a point, got "${p2.type}"`);
      let actual;
      if (e.type === "line") actual = distancePointToLine(p2.pos, e.posA, e.posB);
      else if (e.type === "plane") actual = distancePointToPlane(p2.pos, e.positions[0], planeNormal(e.positions[0], e.positions[1], e.positions[2]));
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
    const p2 = Math.round(v);
    return { text: sign < 0 ? `-${p2}` : `${p2}`, isExact: true, value };
  }
  for (let q = 2; q <= MAX_DENOM; q++) {
    const p2 = Math.round(v * q);
    if (p2 > 0 && p2 <= MAX_NUMER * MAX_DENOM && Math.abs(v - p2 / q) < eps) {
      const g = gcd(p2, q);
      const pp = p2 / g;
      const qq = q / g;
      const text = qq === 1 ? `${pp}` : `${pp}/${qq}`;
      return { text: sign < 0 ? `-${text}` : text, isExact: true, value };
    }
  }
  let best = null;
  for (const n of SQUAREFREE_RADICANDS) {
    const sq = Math.sqrt(n);
    for (let q = 1; q <= MAX_DENOM; q++) {
      const p2 = Math.round(v * q / sq);
      if (p2 <= 0 || p2 > MAX_NUMER) continue;
      const candidate = p2 * sq / q;
      if (Math.abs(candidate - v) < eps) {
        if (!best || q < best.q || q === best.q && n < best.n) {
          const g = gcd(p2, q);
          best = { p: p2 / g, q: q / g, n };
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
function extractSquare(r2) {
  if (!Number.isInteger(r2) || r2 < 1) {
    throw new Error(`radicand must be a positive integer, got ${r2}`);
  }
  let rad = r2;
  let factor = 1n;
  for (let f = 2; f * f <= rad; f++) {
    while (rad % (f * f) === 0) {
      rad /= f * f;
      factor *= BigInt(f);
    }
  }
  return { rad, factor };
}
function makeExact(num3, den, radicand = 1) {
  if (den === 0n) throw new Error("Exact denominator cannot be zero");
  if (num3 === 0n) return { num: 0n, den: 1n, radicand: 1 };
  if (den < 0n) {
    num3 = -num3;
    den = -den;
  }
  const { rad, factor } = extractSquare(radicand);
  num3 *= factor;
  const g = bgcd(num3, den);
  return { num: num3 / g, den: den / g, radicand: rad };
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
  const num3 = a.num * b.den + b.num * a.den;
  const den = a.den * b.den;
  return makeExact(num3, den, a.radicand);
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
  const num3 = a.num * b.den;
  const den = a.den * b.num * BigInt(b.radicand);
  return makeExact(num3, den, radicand);
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
function pointFromCoords(p2) {
  return { kind: "point", p: p2 };
}
function lineFromTwoPoints(a, b) {
  return { kind: "line", p: a, dir: subV(b, a) };
}
function lineFromPointDir(p2, dir) {
  return { kind: "line", p: p2, dir };
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
  const dot3 = body.indexOf(".");
  if (dot3 === -1) {
    const v = BigInt(body);
    return makeExact(neg2 ? -v : v, 1n, 1);
  }
  const intPart = body.slice(0, dot3) || "0";
  const fracPart = body.slice(dot3 + 1) || "0";
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
function footOnPlaneE(p2, pl) {
  const t = div(add2(dotV(pl.n, p2), pl.d), lenSqV(pl.n));
  return subV(p2, scaleV(pl.n, t));
}
function footOnLineE(p2, l) {
  const t = div(dotV(subV(p2, l.p), l.dir), lenSqV(l.dir));
  return addV(l.p, scaleV(l.dir, t));
}
function reflectAcrossPlaneE(p2, pl) {
  return subV(scaleV(footOnPlaneE(p2, pl), rat(2n)), p2);
}
function reflectAcrossLineE(p2, l) {
  return subV(scaleV(footOnLineE(p2, l), rat(2n)), p2);
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
  for (const p2 of pts) {
    const tp = dotV(subV(p2, p0), normal);
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
    const rhs2 = b.exact.num * a.exact.den;
    return lhs < rhs2 ? -1 : lhs > rhs2 ? 1 : 0;
  }
  const d = a.approx - b.approx;
  return Math.abs(d) < EPS3 ? 0 : d < 0 ? -1 : 1;
}

// api/_lib/kernel/compute/intersect.ts
function planeSigned(pl, p2) {
  return add2(dotV(pl.n, p2), pl.d);
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
  const p3 = addV(scaleV(p1.n, alpha), scaleV(p2.n, beta));
  return { kind: "intersection", result: "line", line: { kind: "line", p: p3, dir: u } };
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
function iLineLine(l1, l2) {
  const cross3 = crossV(l1.dir, l2.dir);
  const w = subV(l2.p, l1.p);
  if (isZeroS(lenSqV(cross3))) {
    return isZeroS(lenSqV(crossV(w, l1.dir))) ? { kind: "intersection", result: "coincident" } : { kind: "intersection", result: "parallel" };
  }
  if (!isZeroS(dotV(w, cross3))) return { kind: "intersection", result: "none" };
  const t = div(dotV(crossV(w, l2.dir), cross3), lenSqV(cross3));
  return { kind: "intersection", result: "point", point: pointFromCoords(addV(l1.p, scaleV(l1.dir, t))) };
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
    case "line-line":
      return { ok: true, answer: iLineLine(a, b) };
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
  const p2 = et.points.get(inner);
  if (p2) return p2;
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
  const p2 = et.points.get(name);
  if (!p2) throw new Error(`Oxyz: point "${name}" is referenced before it is defined`);
  return p2;
}
function ensureNameFree(et, name, kind) {
  if (et.points.has(name) || et.lines.has(name) || et.planes.has(name) || et.spheres.has(name)) {
    throw new Error(`Oxyz: name "${name}" is already used; cannot define ${kind} "${name}"`);
  }
}
function setPointE(et, name, p2, derived = false) {
  ensureNameFree(et, name, "point");
  et.points.set(name, pointFromCoords(p2));
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
        const r2 = parseScalar(op.by.radius);
        setSphereE(et, op.name, sphereFromCenterRadius2(center.p, mul(r2, r2)));
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
      const r2 = computeIntersection(resolveEntityE(op.a, et), resolveEntityE(op.b, et));
      if (!r2.ok) throw new Error(r2.problem);
      const res = r2.answer.result;
      if (res === "point" || res === "tangent-point") {
        setPointE(et, op.name, r2.answer.point.p, true);
        break;
      }
      const why = res === "parallel" ? "hai \u0111\u1ED1i t\u01B0\u1EE3ng song song \u2014 kh\xF4ng c\xF3 giao \u0111i\u1EC3m" : res === "coincident" ? "hai \u0111\u1ED1i t\u01B0\u1EE3ng tr\xF9ng nhau \u2014 v\xF4 s\u1ED1 giao \u0111i\u1EC3m, kh\xF4ng x\xE1c \u0111\u1ECBnh m\u1ED9t \u0111i\u1EC3m" : res === "none" ? "hai \u0111\u1ED1i t\u01B0\u1EE3ng kh\xF4ng c\u1EAFt nhau (ch\xE9o nhau) \u2014 kh\xF4ng c\xF3 giao \u0111i\u1EC3m" : res === "line" ? "giao l\xE0 m\u1ED9t \u0110\u01AF\u1EDCNG (m\u1EB7t\xD7m\u1EB7t) \u2014 d\xF9ng query intersection, kh\xF4ng ph\u1EA3i op oxyz_intersect" : `kh\xF4ng ph\u1EA3i m\u1ED9t \u0111i\u1EC3m (${res})`;
      throw new Error(`oxyz_intersect: ${op.a} \u2229 ${op.b} \u2014 ${why}`);
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
function pt(p2) {
  return { kind: "point", p: p2 };
}
function sqPointPoint(a, b) {
  return lenSqV(subV(a, b));
}
function sqPointLine(p2, l) {
  return div(lenSqV(crossV(subV(p2, l.p), l.dir)), lenSqV(l.dir));
}
function sqPointPlane(p2, pl) {
  const signed = add2(dotV(pl.n, p2), pl.d);
  return div(mul(signed, signed), lenSqV(pl.n));
}
function fPointPoint(a, b) {
  return length(sub(a, b));
}
function fPointLine(p2, a, dir) {
  return length(cross(sub(p2, a), dir)) / length(dir);
}
function fPointPlane(p2, n, d) {
  return Math.abs(dot(n, p2) + d) / length(n);
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
  const r2 = subV(l2.p, l1.p);
  const triple = dotV(r2, cr);
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
function dPointSphere(p2, s) {
  const pc = Math.sqrt(lenSqV(subV(p2.p, s.center)).approx);
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
  const cp = coplanarityProblem(base.map((p2) => p2.p), "pyramid base");
  if (cp) return { ok: false, problem: cp };
  const floatRef = fPyramid(base.map((p2) => av3(p2.p)), av3(apex.p));
  return { ok: true, answer: certifyScalar("volume", pyramidVolumeScalar(base, apex), floatRef) };
}
function prismVolumeScalar(base, top) {
  let sum = rat(0n);
  for (let i = 1; i < base.length - 1; i++) {
    const b0 = base[0].p, bi = base[i].p, bj = base[i + 1].p;
    const t0 = top[0].p, ti = top[i].p, tj = top[i + 1].p;
    sum = add2(sum, tripleScalar(b0, bi, bj, t0));
    sum = add2(sum, tripleScalar(bi, bj, t0, ti));
    sum = add2(sum, tripleScalar(bj, t0, ti, tj));
  }
  return div(absS(sum), rat(6n));
}
function fPrism(base, top) {
  let s = 0;
  for (let i = 1; i < base.length - 1; i++) {
    s += scalarTriple(sub(base[i], base[0]), sub(base[i + 1], base[0]), sub(top[0], base[0]));
    s += scalarTriple(sub(base[i + 1], base[i]), sub(top[0], base[i]), sub(top[i], base[i]));
    s += scalarTriple(sub(top[0], base[i + 1]), sub(top[i], base[i + 1]), sub(top[i + 1], base[i + 1]));
  }
  return Math.abs(s) / 6;
}
function translationMismatch(base, top) {
  const v0 = subV(top[0].p, base[0].p);
  for (let i = 1; i < base.length; i++) {
    const d = subV(subV(top[i].p, base[i].p), v0);
    if (!(isZeroS(d.x) && isZeroS(d.y) && isZeroS(d.z)))
      return "prism: top face is not a parallel translate of the base (not a prism)";
  }
  return null;
}
function computePrismVolume(base, top) {
  if (base.length < 3) return { ok: false, problem: "prism base needs at least 3 vertices" };
  if (top.length !== base.length) return { ok: false, problem: "prism: base and top must have the same number of vertices" };
  const cpB = coplanarityProblem(base.map((p2) => p2.p), "prism base");
  if (cpB) return { ok: false, problem: cpB };
  const cpT = coplanarityProblem(top.map((p2) => p2.p), "prism top");
  if (cpT) return { ok: false, problem: cpT };
  const mism = translationMismatch(base, top);
  if (mism) return { ok: false, problem: mism };
  const floatRef = fPrism(base.map((p2) => av3(p2.p)), top.map((p2) => av3(p2.p)));
  return { ok: true, answer: certifyScalar("volume", prismVolumeScalar(base, top), floatRef) };
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
  const cp = coplanarityProblem(pts.map((p2) => p2.p), "polygon");
  if (cp) return { ok: false, problem: cp };
  return { ok: true, answer: certifyScalar("area", polygonAreaScalar(pts), fPolygon(pts.map((p2) => av4(p2.p)))) };
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
function planeSigned2(pl, p2) {
  return add2(dotV(pl.n, p2), pl.d);
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
  for (const r2 of rats) D = blcm(D, r2.den);
  const ints = rats.map((r2) => r2.num * (D / r2.den));
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
  external_exports.object({ kind: external_exports.literal("volume"), solid: external_exports.literal("prism"), base: external_exports.array(Tok).min(3), top: external_exports.array(Tok).min(3) }),
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
  let r2;
  if (spec.solid === "tetrahedron") {
    if (pts.length !== 4) throw new Error("tetrahedron needs exactly 4 points");
    r2 = computeTetraVolume(pts[0], pts[1], pts[2], pts[3]);
  } else {
    if (!spec.apex) throw new Error("pyramid needs an apex");
    r2 = computePyramidVolume(pts, asPoints([spec.apex], et)[0]);
  }
  if (!r2.ok) throw new Error(r2.problem);
  return { approx: r2.answer.approx, exact: r2.answer.exact };
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
        if (query.solid === "prism") {
          return computePrismVolume(asPoints(query.base, et), asPoints(query.top, et));
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
function assertValueNum(v) {
  return typeof v === "number" ? v : parseScalar(v).approx;
}
function fail(relation, args, message) {
  return { kind: "assert_failed", relation, args, message };
}
function mustOk(r2) {
  if (!r2.ok) throw new Error(r2.problem);
  return r2.answer;
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
      return Math.abs(ans.approx - assertValueNum(assert.value)) < tol ? null : fail("dist", args, `dist(${args[0]},${args[1]})=${ans.approx.toFixed(6)}, expected ${assert.value}`);
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
      return Math.abs(ans.degrees - assertValueNum(assert.value)) < tol ? null : fail("angle", args, `angle(${args[0]},${args[1]})=${ans.degrees.toFixed(4)}\xB0, expected ${assert.value}\xB0`);
    }
    case "coplanar": {
      const pts = args.map((t) => resolveEntityE(t, et));
      if (pts.some((p2) => p2.kind !== "point")) throw new Error("coplanar requires point arguments");
      const cp = coplanarityProblem(pts.map((p2) => p2.p), "points", assert.tolerance ?? EPS3);
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
    const r2 = computeQuery(query, entities);
    if (r2.ok) answers.push(r2.answer);
    else errors.push({ message: `query ${query.kind}: ${r2.problem}` });
  }
  trace.push(`computed ${answers.length}/${plan.queries.length} queries`);
  return { ok: violations.length === 0 && errors.length === 0, entities, answers, violations, errors, trace };
}

// api/_lib/kernel/entityToGeometry.ts
function segmentForLine(le, points) {
  const p0 = { x: le.p.x.approx, y: le.p.y.approx, z: le.p.z.approx };
  const d = { x: le.dir.x.approx, y: le.dir.y.approx, z: le.dir.z.approx };
  const dd = d.x * d.x + d.y * d.y + d.z * d.z;
  if (!(dd > 0)) return null;
  const onLine = [];
  for (const [label, pe] of points) {
    const v = { x: pe.p.x.approx - p0.x, y: pe.p.y.approx - p0.y, z: pe.p.z.approx - p0.z };
    const vv = v.x * v.x + v.y * v.y + v.z * v.z;
    const vd = v.x * d.x + v.y * d.y + v.z * d.z;
    const perp2 = vv - vd * vd / dd;
    const scale4 = Math.max(1, Math.abs(p0.x), Math.abs(p0.y), Math.abs(p0.z), Math.sqrt(vv));
    const tol2 = (1e-6 * scale4) ** 2;
    if (perp2 <= tol2) onLine.push({ label, t: vd / dd });
  }
  if (onLine.length < 2) return null;
  onLine.sort((a, b) => a.t - b.t);
  const from = onLine[0].label;
  const to = onLine[onLine.length - 1].label;
  return from === to ? null : { from, to };
}
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
  const seenPairs = new Set(
    lines.map((l) => l.from < l.to ? `${l.from}|${l.to}` : `${l.to}|${l.from}`)
  );
  for (const le of et.lines.values()) {
    const seg = segmentForLine(le, et.points);
    if (!seg) continue;
    const key = seg.from < seg.to ? `${seg.from}|${seg.to}` : `${seg.to}|${seg.from}`;
    if (seenPairs.has(key)) continue;
    seenPairs.add(key);
    lines.push({ id: `${seg.from}${seg.to}`, from: seg.from, to: seg.to, style: "solid" });
  }
  const spheres = Array.from(et.spheres.entries()).map(([label, s]) => ({
    id: label,
    label,
    center: { x: s.center.x.approx, y: s.center.y.approx, z: s.center.z.approx },
    radius: Math.sqrt(Math.max(0, s.r2.approx))
  }));
  const planes = Array.from(et.faces.entries()).filter(([, verts]) => verts.length >= 3).map(([key, verts]) => ({
    id: key,
    label: key,
    pointIds: [...verts],
    points: verts.map((n) => {
      const p2 = et.points.get(n);
      return { x: p2.p.x.approx, y: p2.p.y.approx, z: p2.p.z.approx };
    })
  }));
  const EQ_PLANE_COLORS = ["#9ca3af", "#4ade80", "#60a5fa", "#f59e0b"];
  const onPlaneCount = (n, d) => {
    const len = Math.hypot(n.x, n.y, n.z) || 1;
    let cnt = 0;
    for (const p2 of points) {
      if (Math.abs(n.x * p2.x + n.y * p2.y + n.z * p2.z + d) / len <= 1e-6 * Math.max(1, Math.abs(p2.x), Math.abs(p2.y), Math.abs(p2.z))) cnt++;
    }
    return cnt;
  };
  const eqPlanes = Array.from(et.planes.entries()).filter(
    ([key, pe]) => !et.faces.has(key) && onPlaneCount({ x: pe.n.x.approx, y: pe.n.y.approx, z: pe.n.z.approx }, pe.d.approx) < 3
  );
  if (eqPlanes.length > 0) {
    let cx = 0, cy = 0, cz = 0;
    for (const p2 of points) {
      cx += p2.x;
      cy += p2.y;
      cz += p2.z;
    }
    const nP = Math.max(1, points.length);
    const center = { x: cx / nP, y: cy / nP, z: cz / nP };
    let radius = 4;
    for (const p2 of points) {
      radius = Math.max(radius, Math.hypot(p2.x - center.x, p2.y - center.y, p2.z - center.z));
    }
    const half = radius * 1.3;
    eqPlanes.forEach(([key, pe], idx) => {
      const n = { x: pe.n.x.approx, y: pe.n.y.approx, z: pe.n.z.approx };
      const d = pe.d.approx;
      const nn = n.x * n.x + n.y * n.y + n.z * n.z;
      if (!(nn > 0)) return;
      const t = (n.x * center.x + n.y * center.y + n.z * center.z + d) / nn;
      const c = { x: center.x - n.x * t, y: center.y - n.y * t, z: center.z - n.z * t };
      const axis = Math.abs(n.x) < Math.abs(n.z) ? { x: 1, y: 0, z: 0 } : { x: 0, y: 0, z: 1 };
      const u0 = { x: n.y * axis.z - n.z * axis.y, y: n.z * axis.x - n.x * axis.z, z: n.x * axis.y - n.y * axis.x };
      const ul = Math.hypot(u0.x, u0.y, u0.z) || 1;
      const u = { x: u0.x / ul, y: u0.y / ul, z: u0.z / ul };
      const v0 = { x: n.y * u.z - n.z * u.y, y: n.z * u.x - n.x * u.z, z: n.x * u.y - n.y * u.x };
      const vl = Math.hypot(v0.x, v0.y, v0.z) || 1;
      const v = { x: v0.x / vl, y: v0.y / vl, z: v0.z / vl };
      const signs = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
      const corners = signs.map(([su, sv]) => ({
        x: c.x + u.x * half * su + v.x * half * sv,
        y: c.y + u.y * half * su + v.y * half * sv,
        z: c.z + u.z * half * su + v.z * half * sv
      }));
      const ids = corners.map((_, i) => `${key}${i + 1}`);
      corners.forEach((pt2, i) => points.push({ id: ids[i], label: ids[i], x: pt2.x, y: pt2.y, z: pt2.z }));
      for (let i = 0; i < 4; i++) {
        const a = ids[i], b = ids[(i + 1) % 4];
        lines.push({ id: `${a}${b}`, from: a, to: b, style: "solid" });
      }
      planes.push({
        id: key,
        label: `(${key})`,
        pointIds: ids,
        points: corners,
        color: EQ_PLANE_COLORS[idx % EQ_PLANE_COLORS.length],
        opacity: 0.12
      });
    });
  }
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
  abs: Math.abs,
  exp: Math.exp,
  ln: Math.log,
  log: Math.log
  // ln = log = log tự nhiên (chuẩn giải tích VN)
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
function nearestRoot(h, x0, w) {
  const N = 80;
  const lo = x0 - w, hi = x0 + w;
  let best = null;
  let bestDist = Infinity;
  const consider = (root) => {
    const d = Math.abs(root - x0);
    if (d < bestDist) {
      bestDist = d;
      best = root;
    }
  };
  let px = lo, py = h(lo);
  for (let i = 1; i <= N; i++) {
    const x = lo + (hi - lo) * i / N;
    const y = h(x);
    if (Number.isFinite(py) && py === 0) consider(px);
    if (Number.isFinite(py) && Number.isFinite(y) && py * y < 0) {
      let a1 = px, b1 = x, fa = py;
      for (let k = 0; k < 60; k++) {
        const m = (a1 + b1) / 2;
        const fm = h(m);
        if (!Number.isFinite(fm)) break;
        if (fa * fm <= 0) b1 = m;
        else {
          a1 = m;
          fa = fm;
        }
      }
      consider((a1 + b1) / 2);
    }
    px = x;
    py = y;
  }
  if (Number.isFinite(py) && py === 0) consider(px);
  return best;
}
function refineBounds(h, domain) {
  const [a, b] = domain;
  const span = b - a;
  if (!(span > 1e-12) || !Number.isFinite(span)) return [a, b];
  const w = 0.25 * span;
  const na = nearestRoot(h, a, w);
  const nb = nearestRoot(h, b, w);
  const ra = na != null ? na : a;
  const rb = nb != null ? nb : b;
  if (!(rb > ra) || !Number.isFinite(ra) || !Number.isFinite(rb)) return [a, b];
  return [ra, rb];
}
function fmtBound(n) {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 1e3) / 1e3);
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
function nelderMead(g, x0, los, his, step, maxIter, overDeadline) {
  const n = x0.length;
  const clamp = (xs) => xs.map((x, d) => Math.max(los[d], Math.min(his[d], x)));
  const ev = (xs) => g(clamp(xs));
  const simplex = [];
  const p0 = clamp(x0.slice());
  simplex.push({ xs: p0, v: ev(p0) });
  for (let d = 0; d < n; d++) {
    const p2 = p0.slice();
    p2[d] += step[d] || 1e-3;
    const pc = clamp(p2);
    simplex.push({ xs: pc, v: ev(pc) });
  }
  const alpha = 1, gamma = 2, rho = 0.5, sigma = 0.5;
  for (let it = 0; it < maxIter; it++) {
    if (overDeadline()) break;
    simplex.sort((A, B) => A.v - B.v);
    let dia = 0;
    for (let d = 0; d < n; d++) {
      let mn = Infinity, mx = -Infinity;
      for (const s of simplex) {
        mn = Math.min(mn, s.xs[d]);
        mx = Math.max(mx, s.xs[d]);
      }
      dia = Math.max(dia, mx - mn);
    }
    if (dia < 1e-10) break;
    const worst = simplex[n];
    const cen = new Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let d = 0; d < n; d++) cen[d] += simplex[i].xs[d] / n;
    const reflect = cen.map((c, d) => c + alpha * (c - worst.xs[d]));
    const vr = ev(reflect);
    if (vr < simplex[0].v) {
      const expand = cen.map((c, d) => c + gamma * (c - worst.xs[d]));
      const ve = ev(expand);
      simplex[n] = ve < vr ? { xs: clamp(expand), v: ve } : { xs: clamp(reflect), v: vr };
    } else if (vr < simplex[n - 1].v) {
      simplex[n] = { xs: clamp(reflect), v: vr };
    } else {
      const contract = cen.map((c, d) => c + rho * (worst.xs[d] - c));
      const vc = ev(contract);
      if (vc < worst.v) {
        simplex[n] = { xs: clamp(contract), v: vc };
      } else {
        for (let i = 1; i <= n; i++) {
          const xs = clamp(simplex[0].xs.map((b, d) => b + sigma * (simplex[i].xs[d] - b)));
          simplex[i] = { xs, v: ev(xs) };
        }
      }
    }
  }
  simplex.sort((A, B) => A.v - B.v);
  return simplex[0].xs;
}
function optimizeMulti(f, los, his, sense, gridPerDim = 40, rounds = 60, restarts = 5, deadlineMs) {
  const n = los.length;
  const sign = sense === "max" ? 1 : -1;
  const gr = (Math.sqrt(5) - 1) / 2;
  const overDeadline = () => deadlineMs !== void 0 && Date.now() > deadlineMs;
  const cells = [];
  const total = Math.pow(gridPerDim + 1, n);
  for (let t = 0; t < total; t++) {
    if (overDeadline()) break;
    let rem = t;
    const xs = [];
    for (let d = 0; d < n; d++) {
      const i = rem % (gridPerDim + 1);
      rem = Math.floor(rem / (gridPerDim + 1));
      xs.push(los[d] + (his[d] - los[d]) * i / gridPerDim);
    }
    cells.push({ xs, v: sign * f(xs) });
  }
  if (cells.length === 0) {
    const xs = los.slice();
    return { xs, value: f(xs) };
  }
  cells.sort((A, B) => B.v - A.v);
  const starts = cells.slice(0, Math.max(1, restarts));
  const refine = (start) => {
    const xs = start.slice();
    for (let r2 = 0; r2 < rounds; r2++) {
      if (overDeadline()) break;
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
          if (b - a < 1e-9) break;
        }
        xs[d] = (a + b) / 2;
      }
    }
    return { xs, value: f(xs) };
  };
  let best = refine(starts[0].xs);
  for (let s = 1; s < starts.length; s++) {
    if (overDeadline()) break;
    const cand = refine(starts[s].xs);
    if (sign * cand.value > sign * best.value) best = cand;
  }
  const g = (xs) => -sign * f(xs);
  const nmStep = los.map((lo, d) => (his[d] - lo) / gridPerDim);
  const nmStarts = [best.xs, ...starts.slice(0, 3).map((s) => s.xs)];
  for (const st of nmStarts) {
    if (overDeadline()) break;
    const nmXs = nelderMead(g, st, los, his, nmStep, 200, overDeadline);
    const fv = f(nmXs);
    if (sign * fv > sign * best.value) best = { xs: nmXs, value: fv };
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
    const p2 = Math.round(x * q);
    if (Math.abs(x - p2 / q) < EPS4) {
      const g = gcd2(p2, q);
      return { p: p2 / g, q: q / g };
    }
  }
  return null;
}
function fmtRational(p2, q) {
  return q === 1 ? `${p2}` : `${p2}/${q}`;
}
function fmtSurdTerm(num3, den, rad) {
  const coeff = num3 === 1 ? `\u221A${rad}` : `${num3}\u221A${rad}`;
  return den === 1 ? coeff : `${coeff}/${den}`;
}
function fmtPiTerm(num3, den) {
  const coeff = num3 === 1 ? "\u03C0" : `${num3}\u03C0`;
  return den === 1 ? coeff : `${coeff}/${den}`;
}
function recognizeConstant(x) {
  const q0 = asRational(x, MAX_DEN);
  if (q0) return { text: fmtRational(q0.p, q0.q), value: q0.p / q0.q };
  for (const b of SQUAREFREE) {
    const s = x / Math.sqrt(b);
    const r2 = asRational(s, MAX_DEN);
    if (r2 && r2.p !== 0) {
      const val = r2.p / r2.q * Math.sqrt(b);
      if (Math.abs(val - x) < EPS4) {
        const sign = r2.p < 0 ? "-" : "";
        return { text: sign + fmtSurdTerm(Math.abs(r2.p), r2.q, b), value: val };
      }
    }
  }
  for (const r2 of SQUAREFREE) {
    const root = Math.sqrt(r2);
    for (let qd = 1; qd <= 8; qd++) {
      for (let qn = -8; qn <= 8; qn++) {
        if (qn === 0) continue;
        const qv = qn / qd;
        const p2 = asRational(x - qv * root, 16);
        if (!p2) continue;
        const val = p2.p / p2.q + qv * root;
        if (Math.abs(val - x) < EPS4) {
          const qAbsNum = Math.abs(qn);
          const g = gcd2(qAbsNum, qd);
          const surd = fmtSurdTerm(qAbsNum / g, qd / g, r2);
          const op = qn < 0 ? "-" : "+";
          return { text: `${fmtRational(p2.p, p2.q)} ${op} ${surd}`, value: val };
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
      const p2 = asRational(x - qv * Math.PI, 16);
      if (!p2 || p2.p === 0) continue;
      const val = p2.p / p2.q + qv * Math.PI;
      if (Math.abs(val - x) < EPS4) {
        const qAbsNum = Math.abs(qn);
        const g = gcd2(qAbsNum, qd);
        const piTerm = fmtPiTerm(qAbsNum / g, qd / g);
        const op = qn < 0 ? "-" : "+";
        return { text: `${fmtRational(p2.p, p2.q)} ${op} ${piTerm}`, value: val };
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
    for (let r2 = col + 1; r2 < n; r2++) if (Math.abs(M[r2][col]) > Math.abs(M[piv][col])) piv = r2;
    if (Math.abs(M[piv][col]) < 1e-12) throw new Error("Kh\u1EDBp \u0111a th\u1EE9c: h\u1EC7 suy bi\u1EBFn (\u0111i\u1EC3m tr\xF9ng/kh\xF4ng x\xE1c \u0111\u1ECBnh)");
    [M[col], M[piv]] = [M[piv], M[col]];
    for (let r2 = 0; r2 < n; r2++) {
      if (r2 === col) continue;
      const f = M[r2][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r2][c] -= f * M[col][c];
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
function functionCurves(inp) {
  const curves = [];
  for (const [fnName, coeffs] of Object.entries(inp.polys)) {
    const [xMin, xMax] = inp.polyDomains[fnName] ?? [0, 10];
    curves.push(polyCurve(`curve_${fnName}`, coeffs, xMin, xMax));
  }
  return curves;
}
function buildAnalysisFigure(name, inp) {
  const points = [];
  const lines = [];
  const curves = functionCurves(inp);
  for (const p2 of inp.points) {
    points.push({ id: p2.id, label: p2.id, x: p2.x, y: p2.y, z: p2.z });
  }
  for (const [fnName, coeffs] of Object.entries(inp.polys)) {
    const [xMin, xMax] = inp.polyDomains[fnName] ?? [0, 10];
    for (let k = 0; k <= CURVE_SAMPLES; k++) {
      const x = xMin + (xMax - xMin) * k / CURVE_SAMPLES;
      const y = evalPoly(coeffs, x);
      const id = `${fnName}_s${k}`;
      points.push({ id, label: "", x, y, z: 0 });
    }
  }
  for (const [solidName, s] of Object.entries(inp.solids)) {
    const ringPoints = (cx, cy, r2, z, tag) => {
      const ids = [];
      for (let k = 0; k < RING; k++) {
        const theta = 2 * Math.PI * k / RING;
        const id = `${solidName}_${tag}${k}`;
        points.push({ id, label: "", x: cx + r2 * Math.cos(theta), y: cy + r2 * Math.sin(theta), z });
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
  external_exports.object({ kind: external_exports.literal("optimize_multi"), parameters: external_exports.array(external_exports.string()).min(2), sense: external_exports.enum(["max", "min"]), objective: ScalarSource }),
  external_exports.object({
    kind: external_exports.literal("solve_multi"),
    parameters: external_exports.array(external_exports.string()).min(2),
    constraints: external_exports.array(external_exports.object({ of: ScalarSource, equals: NumOrExpr })).min(1),
    report: ScalarSource
  })
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
  // Vật CHUYỂN ĐỘNG (kinematic): M(t)=from+t·(to−from). Chỉ khai báo — engine tự tiêm oxyz_ratio để
  // optimize/solve tính (không bắt LLM tính toạ độ M). Các trường agentId/label/color/radius/durationSec
  // dành cho lớp trình bày/timeline (Task sau), không ảnh hưởng phép tính.
  mover: external_exports.object({
    point: external_exports.string(),
    from: external_exports.string(),
    to: external_exports.string(),
    agentId: external_exports.string().optional(),
    label: external_exports.string().optional(),
    color: external_exports.string().optional(),
    radius: external_exports.number().optional(),
    durationSec: external_exports.number().optional()
  }).optional(),
  analyze: AnalyzeSchema,
  // ĐƠN VỊ HIỂN THỊ (tuỳ chọn): engine tính theo đơn vị gốc của đề (vd cm³); nếu đề hỏi đáp theo đơn vị
  // khác (vd "lít"), LLM khai answerScale (hệ số nhân, vd 0.001 cho cm³→lít) + answerUnit ("lít") để đáp
  // hiện đúng đơn vị. Bỏ trống ⇒ hiện số trần. KHÔNG ảnh hưởng phép tính, chỉ khâu hiển thị cuối.
  answerScale: NumOrExpr.optional(),
  answerUnit: external_exports.string().optional()
});
function numify(c, env, params) {
  if (typeof c === "string" && params.some((p2) => new RegExp(`\\b${p2}\\b`).test(c))) return evalExpr(c, env);
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
function fmtNum2(x) {
  if (!Number.isFinite(x)) return "(l\u1ED7i)";
  const digits = Math.abs(x) >= 1e3 ? 2 : 4;
  return parseFloat(x.toFixed(digits)).toString();
}
function runAnalysis(raw) {
  const parsed = AnalysisPlanSchema.safeParse(raw);
  if (!parsed.success) return fail2("?", `Invalid analysis plan: ${parsed.error.issues[0]?.message ?? "schema"}`);
  const plan = parsed.data;
  if (plan.mover && "parameter" in plan.analyze) {
    const mv = plan.mover;
    const exists = plan.ops.some((o) => o.name === mv.point);
    if (!exists) {
      plan.ops = [...plan.ops, { op: "oxyz_ratio", name: mv.point, a: mv.from, b: mv.to, t: plan.analyze.parameter }];
    }
  }
  const paramNames = plan.parameters.map((p2) => p2.name);
  const attachMoverAnimation = (geo, mv, et) => {
    const coord = (name) => {
      const p2 = et.points.get(name);
      if (!p2) return null;
      return [p2.p.x.approx, p2.p.y.approx, p2.p.z.approx];
    };
    const from = coord(mv.from), to = coord(mv.to);
    if (!geo || !from || !to) return geo;
    const dur = mv.durationSec ?? 10;
    const id = mv.agentId ?? mv.point;
    const fmt3 = (n) => parseFloat(n.toFixed(6)).toString();
    const v = [(to[0] - from[0]) / dur, (to[1] - from[1]) / dur, (to[2] - from[2]) / dur];
    const axis = (i, name) => `${name}(t) = ${fmt3(from[i])} + ${fmt3(v[i])}*t`;
    const path = `${axis(0, "x")}, ${axis(1, "y")}, ${axis(2, "z")}`;
    return {
      ...geo,
      agents: [{ id, label: mv.label ?? id, initialPosition: from, color: mv.color ?? "#FFA500", radius: mv.radius ?? 0.1 }],
      timeline: { duration: dur, tracks: [{ id: "mv", start: 0, end: dur, type: "parametric_path", targetId: id, params: { path } }] }
    };
  };
  const answerScale = plan.answerScale != null ? evalExpr(String(plan.answerScale), {}) : 1;
  const answerUnit = plan.answerUnit ? ` ${plan.answerUnit}` : "";
  const mkAnswer2 = (val) => {
    const display = Number.isFinite(val) ? val * answerScale : val;
    const nice = Number.isFinite(display) ? recognizeConstant(display) : null;
    const num3 = nice ? nice.text : fmtNum2(display);
    return { approx: display, text: num3 + answerUnit, approximate: !nice };
  };
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
  const withFunctionCurves = (geo, env) => {
    if (plan.functions.length === 0) return geo;
    if (!geo) {
      const fig = buildAnalysisFigure(plan.solidName || "figure", buildFigureInput(env));
      return fig.curves && fig.curves.length > 0 ? fig : geo;
    }
    const curves = functionCurves(buildFigureInput(env));
    if (curves.length === 0) return geo;
    const g2 = geo;
    return { ...g2, curves: [...g2.curves ?? [], ...curves] };
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
  const concreteOpsEnv = (env) => {
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
      if (o.op === "oxyz_plane" && o.by?.form === "coeffs") {
        const by = o.by;
        return { ...o, by: { ...by, a: numify(by.a, env, paramNames), b: numify(by.b, env, paramNames), c: numify(by.c, env, paramNames), d: numify(by.d, env, paramNames) } };
      }
      if (o.op === "oxyz_ratio") return { ...o, t: numify(o.t, env, paramNames) };
      if (o.op === "oxyz_line" && o.by?.form === "point_dir") {
        const by = o.by;
        return { ...o, by: { ...by, base: by.base.map((c) => numify(c, env, paramNames)), dir: by.dir.map((c) => numify(c, env, paramNames)) } };
      }
      return op;
    });
  };
  const evalQueryEnv = (env, src) => {
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
      ops = concreteOpsEnv(env);
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
  const evalQueriesEnv = (env, sources) => {
    const values = new Array(sources.length).fill(null);
    const geometric = [];
    sources.forEach((source, index) => {
      if (isExprSrc(source)) {
        try {
          values[index] = evalExpr(source.expr, env, fitAt(env).funcs);
        } catch {
          values[index] = null;
        }
      } else if (isSolidVolSrc(source)) {
        try {
          values[index] = solidVolumeAt(env, source);
        } catch {
          values[index] = null;
        }
      } else {
        geometric.push({ index, source });
      }
    });
    if (geometric.length === 0) return values;
    let ops;
    try {
      ops = concreteOpsEnv(env);
    } catch {
      return values;
    }
    const result = run({
      solidName: plan.solidName,
      ops,
      asserts: [],
      queries: geometric.map(({ source }) => source)
    });
    if (!result.ok || result.answers.length !== geometric.length) return values;
    geometric.forEach(({ index }, answerIndex) => {
      try {
        values[index] = scalarOf(result.answers[answerIndex]);
      } catch {
        values[index] = null;
      }
    });
    return values;
  };
  if (plan.analyze.kind === "integrate") {
    const az = plan.analyze;
    try {
      const { funcs } = fitAt({});
      const from = evalExpr(String(az.from), {}, funcs);
      const to = evalExpr(String(az.to), {}, funcs);
      const r2 = integrate((x) => evalExpr(az.integrand, { [az.variable]: x }, funcs), from, to);
      return {
        ok: true,
        parameter: { name: az.variable, value: NaN },
        answer: mkAnswer2(r2.value),
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
      return {
        ok: Number.isFinite(val),
        parameter: { name: "-", value: NaN },
        answer: mkAnswer2(val),
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
    const decls = az.parameters.map((nm) => plan.parameters.find((p2) => p2.name === nm));
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
      const envBest = {};
      az.parameters.forEach((nm, i) => {
        envBest[nm] = best.xs[i];
      });
      return {
        ok: Number.isFinite(best.value),
        parameter: { name: az.parameters.join(","), value: NaN },
        answer: mkAnswer2(best.value),
        violations: [],
        errors: [],
        geometry: buildAnalysisFigure(az.parameters.join(","), buildFigureInput(envBest))
      };
    } catch (e) {
      return fail2(az.parameters.join(","), e.message);
    }
  }
  if (plan.analyze.kind === "solve_multi") {
    const az = plan.analyze;
    const decls = az.parameters.map((nm) => plan.parameters.find((p2) => p2.name === nm));
    const missing = az.parameters.find((nm, i) => !decls[i]);
    if (missing) return fail2(az.parameters.join(","), `parameter "${missing}" ch\u01B0a khai b\xE1o`);
    try {
      const los = decls.map((d) => evalExpr(String(d.domain[0]), {}));
      const his = decls.map((d) => evalExpr(String(d.domain[1]), {}));
      const envOf = (xs) => {
        const env = {};
        az.parameters.forEach((nm, i) => {
          env[nm] = xs[i];
        });
        return env;
      };
      const residualsOf = (env) => {
        const queryValues = evalQueriesEnv(env, az.constraints.map((constraint) => constraint.of));
        return az.constraints.map((constraint, index) => {
          const value = queryValues[index];
          if (value === null || !Number.isFinite(value)) return null;
          return value - evalExpr(String(constraint.equals), env);
        });
      };
      const objective = (xs) => {
        const env = envOf(xs);
        let sum = 0;
        for (const residual of residualsOf(env)) {
          if (residual === null) return Number.POSITIVE_INFINITY;
          sum += residual * residual;
        }
        return sum;
      };
      const SOLVE_MULTI_BUDGET_MS = 2e4;
      const best = optimizeMulti(objective, los, his, "min", 8, 0, 4, Date.now() + SOLVE_MULTI_BUDGET_MS);
      const envBest = envOf(best.xs);
      const RESID_TOL = 1e-4;
      let maxResid = 0;
      for (const residual of residualsOf(envBest)) {
        if (residual === null) return fail2(az.parameters.join(","), "r\xE0ng bu\u1ED9c kh\xF4ng \u0111\xE1nh gi\xE1 \u0111\u01B0\u1EE3c t\u1EA1i nghi\u1EC7m");
        maxResid = Math.max(maxResid, Math.abs(residual));
      }
      if (maxResid > RESID_TOL) return fail2(az.parameters.join(","), `kh\xF4ng gi\u1EA3i \u0111\u01B0\u1EE3c (residual ${maxResid.toExponential(2)})`);
      let violations = [], errors = [], geometry = null;
      try {
        const res = run({ solidName: plan.solidName, ops: concreteOpsEnv(envBest), asserts: plan.asserts, queries: [] });
        violations = res.violations;
        errors = res.errors.map((e) => ({ message: e.message }));
        if (res.entities.points.size > 0) geometry = entityTableToGeometryData(res.entities, plan.solidName || "figure");
      } catch (e) {
        errors = [{ message: e.message }];
      }
      const rep = evalQueryEnv(envBest, az.report);
      const val = rep === null ? NaN : rep;
      return {
        ok: violations.length === 0 && errors.length === 0 && Number.isFinite(val),
        parameter: { name: az.parameters.join(","), value: NaN },
        answer: mkAnswer2(val),
        violations,
        errors,
        geometry: geometry ? withFunctionCurves(geometry, envBest) : buildAnalysisFigure(az.parameters.join(","), buildFigureInput(envBest))
      };
    } catch (e) {
      return fail2(az.parameters.join(","), e.message);
    }
  }
  const pname = plan.analyze.parameter;
  const decl = plan.parameters.find((p2) => p2.name === pname);
  if (!decl) return fail2(pname, `parameter "${pname}" ch\u01B0a khai b\xE1o`);
  const lo = evalExpr(String(decl.domain[0]), {});
  const hi = evalExpr(String(decl.domain[1]), {});
  const concreteOps = (value) => concreteOpsEnv({ [pname]: value });
  const evalQuery = (value, src) => evalQueryEnv({ [pname]: value }, src);
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
      if (plan.mover && geometry) geometry = attachMoverAnimation(geometry, plan.mover, res.entities);
    }
    return {
      ok: violations.length === 0 && errors.length === 0 && Number.isFinite(val),
      parameter: { name: pname, value },
      answer: mkAnswer2(val),
      violations,
      errors,
      geometry: withFunctionCurves(geometry, env)
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

// api/_lib/kernel/analysis/revolution.ts
function compileProfile(f) {
  switch (f.kind) {
    case "poly":
      return (x) => f.coeffs.reduce((acc, c, i) => acc + c * x ** i, 0);
    case "sqrt":
      return (x) => f.a * Math.sqrt(x) + f.b;
    case "const":
      return () => f.c;
    case "expr": {
      const g = parseExpr(f.expr);
      return (x) => g({ x, y: x });
    }
    case "piecewise": {
      const segs = f.segments;
      return (x) => {
        for (let i = 0; i < segs.length; i++) {
          const s = segs[i];
          if (x < s.x0 || x > s.x1) continue;
          if (s.type === "cylinder") return s.r;
          if (s.type === "frustum") {
            const w = s.x1 - s.x0;
            const t = w === 0 ? 0 : (x - s.x0) / w;
            return s.r0 + (s.r1 - s.r0) * t;
          }
          const d = s.R * s.R - (x - s.c) * (x - s.c);
          return d > 0 ? Math.sqrt(d) : 0;
        }
        return 0;
      };
    }
  }
}
function evalProfile(f, x) {
  return compileProfile(f)(x);
}
function refineProfileBounds(outer, inner, domain, baseline = 0) {
  const go = compileProfile(outer);
  const gi = inner ? compileProfile(inner) : null;
  const h = (x) => go(x) - (gi ? gi(x) : baseline);
  return refineBounds(h, domain);
}
function sampleProfile(outer, domain, n = 64) {
  const [a, b] = domain;
  const g = compileProfile(outer);
  const out = [];
  for (let i = 0; i <= n; i++) {
    const x = a + (b - a) * i / n;
    const r2 = g(x);
    out.push({ x, r: Number.isFinite(r2) ? Math.max(0, r2) : 0 });
  }
  return out;
}
function revolutionVolumeDisk(outer, domain, inner, axisY = 0) {
  const [a, b] = domain;
  const go = compileProfile(outer);
  const gi = inner ? compileProfile(inner) : null;
  const f = (x) => {
    const ro = go(x) - axisY;
    const ri = gi ? gi(x) - axisY : 0;
    return Math.PI * Math.abs(ro * ro - ri * ri);
  };
  return integrate(f, a, b);
}
function buildRevolutionSolidOx(id, outer, domain, color, inner, axisY = 0) {
  const dom = refineProfileBounds(outer, inner, domain, axisY);
  const { value, estimatedError } = revolutionVolumeDisk(outer, dom, inner, axisY);
  const verified = estimatedError <= 1e-6 * Math.max(1, Math.abs(value));
  const rad = (name) => axisY === 0 ? `\\left[${name}\\right]` : `\\left(${name}${axisY < 0 ? "+" : "-"}${Math.abs(axisY)}\\right)`;
  const latex = inner ? `V=\\pi\\int_{${fmtBound(dom[0])}}^{${fmtBound(dom[1])}}\\left(${rad("r_{ng}(x)")}^2-${rad("r_{tr}(x)")}^2\\right)\\,dx` : `V=\\pi\\int_{${fmtBound(dom[0])}}^{${fmtBound(dom[1])}}${rad("r(x)")}^2\\,dx`;
  const volume = { value, latex, verified, estimatedError };
  return {
    id,
    outer,
    axis: "Ox",
    domain: dom,
    method: inner ? "washer" : "disk",
    color,
    volume,
    ...inner ? { inner } : {},
    ...axisY ? { axisY } : {},
    samples: sampleProfile(outer, dom),
    ...inner ? { innerSamples: sampleProfile(inner, dom) } : {}
  };
}
function revolutionVolumeShellOy(outer, domain, inner) {
  const [a, b] = domain;
  const go = compileProfile(outer);
  const gi = inner ? compileProfile(inner) : null;
  const f = (x) => {
    const h = gi ? Math.abs(go(x) - gi(x)) : go(x);
    return 2 * Math.PI * x * h;
  };
  return integrate(f, a, b);
}
function buildRevolutionSolidOy(id, outer, domain, color, inner) {
  const dom = refineProfileBounds(outer, inner, domain);
  const { value, estimatedError } = revolutionVolumeShellOy(outer, dom, inner);
  const verified = estimatedError <= 1e-6 * Math.max(1, Math.abs(value));
  const latex = inner ? `V=2\\pi\\int_{${fmtBound(dom[0])}}^{${fmtBound(dom[1])}} x\\left(r_{ng}(x)-r_{tr}(x)\\right)\\,dx` : `V=2\\pi\\int_{${fmtBound(dom[0])}}^{${fmtBound(dom[1])}} x\\,r(x)\\,dx`;
  const volume = { value, latex, verified, estimatedError };
  return {
    id,
    outer,
    axis: "Oy",
    domain: dom,
    method: "shell",
    color,
    volume,
    ...inner ? { inner } : {},
    samples: sampleProfile(outer, dom),
    ...inner ? { innerSamples: sampleProfile(inner, dom) } : {}
  };
}
function buildRevolutionSolidOyDisk(id, outer, domain, color, inner) {
  const dom = refineProfileBounds(outer, inner, domain);
  const { value, estimatedError } = revolutionVolumeDisk(outer, dom, inner);
  const verified = estimatedError <= 1e-6 * Math.max(1, Math.abs(value));
  const latex = inner ? `V=\\pi\\int_{${fmtBound(dom[0])}}^{${fmtBound(dom[1])}}\\left(\\left[x_{ng}(y)\\right]^2-\\left[x_{tr}(y)\\right]^2\\right)\\,dy` : `V=\\pi\\int_{${fmtBound(dom[0])}}^{${fmtBound(dom[1])}}\\left[x(y)\\right]^2\\,dy`;
  const volume = { value, latex, verified, estimatedError };
  return {
    id,
    outer,
    axis: "Oy",
    domain: dom,
    method: inner ? "washer" : "disk",
    color,
    volume,
    ...inner ? { inner } : {},
    samples: sampleProfile(outer, dom),
    ...inner ? { innerSamples: sampleProfile(inner, dom) } : {}
  };
}

// api/_lib/kernel/analysis/sliceVolume.ts
function sectionK(section, ratio = 1) {
  switch (section) {
    case "square":
      return 1;
    case "equilateral":
      return Math.sqrt(3) / 4;
    case "semicircle":
      return Math.PI / 8;
    case "rect":
      return ratio;
  }
}
var LATEX_S = {
  square: "s^2",
  equilateral: "\\tfrac{\\sqrt3}{4}s^2",
  semicircle: "\\tfrac{\\pi}{8}s^2",
  rect: "k\\,s^2"
};
function compileSide(outer, inner) {
  const go = compileProfile(outer);
  const gi = inner ? compileProfile(inner) : null;
  return (t) => Math.abs(go(t) - (gi ? gi(t) : 0));
}
function sliceStackVolume(section, outer, domain, inner, ratio = 1) {
  const [a, b] = domain;
  const side = compileSide(outer, inner);
  const k = sectionK(section, ratio);
  return integrate((t) => k * side(t) * side(t), a, b);
}
function sampleSide(outer, domain, inner, n = 64) {
  const [a, b] = domain;
  const side = compileSide(outer, inner);
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = a + (b - a) * i / n;
    const s = side(t);
    out.push({ t, side: Number.isFinite(s) ? Math.max(0, s) : 0 });
  }
  return out;
}
function buildSliceStack(id, section, outer, domain, color, inner, ratio, axis = "Ox") {
  const r2 = section === "rect" ? ratio && ratio > 0 ? ratio : 1 : void 0;
  const dom = refineProfileBounds(outer, inner, domain);
  const { value, estimatedError } = sliceStackVolume(section, outer, dom, inner, r2 ?? 1);
  const verified = estimatedError <= 1e-6 * Math.max(1, Math.abs(value));
  const latex = `V=\\int_{${fmtBound(dom[0])}}^{${fmtBound(dom[1])}} ${LATEX_S[section]}\\,d${axis === "Oy" ? "y" : "x"}`;
  const volume = { value, latex, verified, estimatedError };
  return {
    id,
    axis,
    domain: dom,
    outer,
    section,
    volume,
    color,
    ...inner ? { inner } : {},
    ...r2 !== void 0 ? { ratio: r2 } : {},
    samples: sampleSide(outer, dom, inner)
  };
}
function planarArea(outer, inner, domain) {
  const [a, b] = domain;
  const gf = compileProfile(outer);
  const gg = compileProfile(inner);
  return integrate((x) => Math.abs(gf(x) - gg(x)), a, b);
}
function sampleArea(outer, inner, domain, n = 64) {
  const [a, b] = domain;
  const gf = compileProfile(outer);
  const gg = compileProfile(inner);
  const out = [];
  for (let i = 0; i <= n; i++) {
    const x = a + (b - a) * i / n;
    const f = gf(x), g = gg(x);
    out.push({ x, top: Math.max(f, g), bot: Math.min(f, g) });
  }
  return out;
}
function buildAreaRegion(id, outer, domain, inner, color, slabDepth = 0.15) {
  const inr = inner ?? { kind: "const", c: 0 };
  const dom = refineProfileBounds(outer, inr, domain);
  const { value, estimatedError } = planarArea(outer, inr, dom);
  const verified = estimatedError <= 1e-6 * Math.max(1, Math.abs(value));
  const latex = `S=\\int_{${fmtBound(dom[0])}}^{${fmtBound(dom[1])}} |f(x)-g(x)|\\,dx`;
  const area = { value, latex, verified, estimatedError };
  return { id, outer, inner: inr, domain: dom, area, color, slabDepth, samples: sampleArea(outer, inr, dom) };
}

// api/_lib/kernel/analysis/vessel.ts
function vesselSegmentVolume(s) {
  const h = s.x1 - s.x0;
  switch (s.type) {
    case "cylinder":
      return Math.PI * s.r * s.r * h;
    case "frustum":
      return Math.PI * h / 3 * (s.r0 * s.r0 + s.r0 * s.r1 + s.r1 * s.r1);
    case "sphereZone": {
      const u1 = s.x1 - s.c;
      const u0 = s.x0 - s.c;
      return Math.PI * (s.R * s.R * h - (u1 * u1 * u1 - u0 * u0 * u0) / 3);
    }
  }
}
function vesselSegmentRadius(s, x) {
  if (s.type === "cylinder") return Math.max(0, s.r);
  if (s.type === "frustum") {
    const w = s.x1 - s.x0;
    const t = w === 0 ? 0 : (x - s.x0) / w;
    return Math.max(0, s.r0 + (s.r1 - s.r0) * t);
  }
  const d = s.R * s.R - (x - s.c) * (x - s.c);
  return d > 0 ? Math.sqrt(d) : 0;
}
function validateVesselSegments(segs) {
  if (!Array.isArray(segs) || segs.length === 0) return { ok: false, reason: "kh\xF4ng c\xF3 kh\xFAc n\xE0o" };
  const EPS6 = 1e-6;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (!Number.isFinite(s.x0) || !Number.isFinite(s.x1)) return { ok: false, reason: `kh\xFAc ${i}: to\u1EA1 \u0111\u1ED9 tr\u1EE5c kh\xF4ng h\u1EE3p l\u1EC7` };
    if (s.x1 - s.x0 <= EPS6) return { ok: false, reason: `kh\xFAc ${i}: x1 ph\u1EA3i l\u1EDBn h\u01A1n x0` };
    if (s.type === "cylinder") {
      if (!(s.r >= 0)) return { ok: false, reason: `kh\xFAc ${i}: b\xE1n k\xEDnh \xE2m` };
    } else if (s.type === "frustum") {
      if (!(s.r0 >= 0) || !(s.r1 >= 0)) return { ok: false, reason: `kh\xFAc ${i}: b\xE1n k\xEDnh \xE2m` };
    } else {
      if (!(s.R > 0)) return { ok: false, reason: `kh\xFAc ${i}: b\xE1n k\xEDnh c\u1EA7u R ph\u1EA3i > 0` };
      if (Math.abs(s.x0 - s.c) > s.R + EPS6 || Math.abs(s.x1 - s.c) > s.R + EPS6) {
        return { ok: false, reason: `kh\xFAc ${i}: \u0111o\u1EA1n [x0,x1] v\u01B0\u1EE3t ra ngo\xE0i m\u1EB7t c\u1EA7u` };
      }
    }
    if (i > 0 && Math.abs(segs[i - 1].x1 - s.x0) > 1e-4) {
      return { ok: false, reason: `kh\xFAc ${i}: kh\xF4ng ti\u1EBFp gi\xE1p kh\xFAc tr\u01B0\u1EDBc (h\u1EDF/ch\u1ED3ng d\u1ECDc tr\u1EE5c)` };
    }
  }
  return { ok: true };
}
function vesselProfile(segs) {
  return { kind: "piecewise", segments: segs };
}
function vesselSegmentsFromMeasures(measures) {
  if (!Array.isArray(measures) || measures.length === 0) return [];
  const segs = [];
  let x = 0;
  for (const m of measures) {
    const h = Number(m?.h);
    if (!Number.isFinite(h) || h <= 0) return [];
    const x0 = x;
    const x1 = x + h;
    if (m.type === "cylinder") {
      segs.push({ type: "cylinder", x0, x1, r: Number(m.r) });
    } else if (m.type === "frustum") {
      segs.push({ type: "frustum", x0, x1, r0: Number(m.rBottom), r1: Number(m.rTop) });
    } else if (m.type === "sphereZone") {
      const rB = Number(m.rBottom);
      const rT = Number(m.rTop);
      if (!Number.isFinite(rB) || !Number.isFinite(rT)) return [];
      const a = (rB * rB - rT * rT - h * h) / (2 * h);
      const R = Math.sqrt(rB * rB + a * a);
      const c = x0 - a;
      segs.push({ type: "sphereZone", x0, x1, R, c });
    } else {
      return [];
    }
    x = x1;
  }
  return segs;
}
function sampleVesselProfile(segs) {
  const out = [];
  for (const s of segs) {
    const n = s.type === "sphereZone" ? 24 : 1;
    for (let i = 0; i <= n; i++) {
      const x = s.x0 + (s.x1 - s.x0) * i / n;
      const pt2 = { x, r: vesselSegmentRadius(s, x) };
      const prev = out[out.length - 1];
      if (prev && Math.abs(prev.x - x) < 1e-9 && Math.abs(prev.r - pt2.r) < 1e-9) continue;
      out.push(pt2);
    }
  }
  return out;
}
function fmtNum3(v) {
  const r2 = Math.round(v * 1e6) / 1e6;
  return String(r2);
}
function vesselVolume(segs) {
  const valid = validateVesselSegments(segs);
  const closed = segs.reduce((acc, s) => acc + vesselSegmentVolume(s), 0);
  const domain = [segs[0]?.x0 ?? 0, segs[segs.length - 1]?.x1 ?? 0];
  const num3 = revolutionVolumeDisk(vesselProfile(segs), domain);
  const gap = Math.abs(closed - num3.value);
  const agree = gap <= 1e-5 * Math.max(1, Math.abs(closed));
  return { value: closed, numeric: num3.value, gap, verified: valid.ok && agree, reason: valid.ok ? void 0 : valid.reason };
}
function buildVesselSolid(id, segs, opts = {}) {
  const { value, gap, verified } = vesselVolume(segs);
  const domain = [segs[0]?.x0 ?? 0, segs[segs.length - 1]?.x1 ?? 0];
  const latex = `V=${fmtNum3(value)}`;
  const volume = { value, latex, verified, estimatedError: gap };
  return {
    id,
    outer: vesselProfile(segs),
    axis: opts.axis ?? "Oy",
    domain,
    method: "disk",
    color: opts.color,
    volume,
    samples: sampleVesselProfile(segs)
  };
}

// api/_lib/kernel/analysis/sectionCut.ts
var sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
var add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
var scale2 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
var dot2 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
var cross2 = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
];
var norm = (a) => Math.sqrt(dot2(a, a));
function ring(names) {
  return names.map((n, i) => [n, names[(i + 1) % names.length]]);
}
function buildPolyhedron(kind, dims) {
  const a = dims.a ?? 1;
  if (kind === "cube" || kind === "box") {
    const bx = kind === "cube" ? a : dims.b ?? a;
    const cz = kind === "cube" ? a : dims.c ?? a;
    const vertices2 = {
      A: [0, 0, 0],
      B: [a, 0, 0],
      C: [a, bx, 0],
      D: [0, bx, 0],
      "A'": [0, 0, cz],
      "B'": [a, 0, cz],
      "C'": [a, bx, cz],
      "D'": [0, bx, cz]
    };
    const bottom2 = ["A", "B", "C", "D"];
    const top2 = ["A'", "B'", "C'", "D'"];
    const edges2 = [
      ...ring(bottom2),
      ...ring(top2),
      ["A", "A'"],
      ["B", "B'"],
      ["C", "C'"],
      ["D", "D'"]
    ];
    const faces2 = [
      bottom2,
      top2,
      ["A", "B", "B'", "A'"],
      ["B", "C", "C'", "B'"],
      ["C", "D", "D'", "C'"],
      ["D", "A", "A'", "D'"]
    ];
    return { vertices: vertices2, edges: edges2, faces: faces2 };
  }
  if (kind === "pyramid-quad") {
    const bx = dims.b ?? a;
    const h2 = dims.h ?? a;
    const baseV = {
      A: [0, 0, 0],
      B: [a, 0, 0],
      C: [a, bx, 0],
      D: [0, bx, 0]
    };
    const foot = dims.apexOver && baseV[dims.apexOver] ? baseV[dims.apexOver] : [a / 2, bx / 2, 0];
    const vertices2 = {
      ...baseV,
      S: [foot[0], foot[1], h2]
    };
    const base = ["A", "B", "C", "D"];
    const edges2 = [
      ...ring(base),
      ["S", "A"],
      ["S", "B"],
      ["S", "C"],
      ["S", "D"]
    ];
    const faces2 = [base, ["A", "B", "S"], ["B", "C", "S"], ["C", "D", "S"], ["D", "A", "S"]];
    return { vertices: vertices2, edges: edges2, faces: faces2 };
  }
  const h = dims.h ?? a;
  const cy = Math.sqrt(3) / 2 * a;
  const vertices = {
    A: [0, 0, 0],
    B: [a, 0, 0],
    C: [a / 2, cy, 0],
    "A'": [0, 0, h],
    "B'": [a, 0, h],
    "C'": [a / 2, cy, h]
  };
  const bottom = ["A", "B", "C"];
  const top = ["A'", "B'", "C'"];
  const edges = [
    ...ring(bottom),
    ...ring(top),
    ["A", "A'"],
    ["B", "B'"],
    ["C", "C'"]
  ];
  const faces = [
    bottom,
    top,
    ["A", "B", "B'", "A'"],
    ["B", "C", "C'", "B'"],
    ["C", "A", "A'", "C'"]
  ];
  return { vertices, edges, faces };
}
function resolveSectionPoint(poly, spec) {
  if ("vertex" in spec) {
    const v = poly.vertices[spec.vertex];
    if (!v) throw new Error(`\u0110\u1EC9nh kh\xF4ng t\u1ED3n t\u1EA1i: ${spec.vertex}`);
    return v;
  }
  const [n1, n2] = spec.onEdge;
  const v1 = poly.vertices[n1];
  const v2 = poly.vertices[n2];
  if (!v1 || !v2) throw new Error(`C\u1EA1nh kh\xF4ng h\u1EE3p l\u1EC7: ${n1}${n2}`);
  return add3(v1, scale2(sub3(v2, v1), spec.t));
}
function planeFrom3(p2) {
  if (p2.length < 3) return null;
  const n = cross2(sub3(p2[1], p2[0]), sub3(p2[2], p2[0]));
  const len = norm(n);
  if (len < 1e-9) return null;
  return { point: p2[0], normal: scale2(n, 1 / len) };
}
var EPS5 = 1e-7;
var roundKey = (v) => v.map((x) => (Math.abs(x) < 1e-9 ? 0 : x).toFixed(6)).join(",");
function orderRing(pts, normal) {
  if (pts.length < 3) return pts;
  const c = scale2(pts.reduce((s, p2) => add3(s, p2), [0, 0, 0]), 1 / pts.length);
  const u0 = sub3(pts[0], c);
  const uLen = norm(u0);
  const u = uLen < EPS5 ? [1, 0, 0] : scale2(u0, 1 / uLen);
  const v = cross2(normal, u);
  return [...pts].sort((p2, q) => {
    const ap = Math.atan2(dot2(sub3(p2, c), v), dot2(sub3(p2, c), u));
    const aq = Math.atan2(dot2(sub3(q, c), v), dot2(sub3(q, c), u));
    return ap - aq;
  });
}
function sliceConvexPolyhedron(poly, point, normal) {
  const d = (v) => dot2(sub3(v, point), normal);
  const seen = /* @__PURE__ */ new Set();
  const pts = [];
  const push = (v) => {
    const k = roundKey(v);
    if (!seen.has(k)) {
      seen.add(k);
      pts.push(v);
    }
  };
  for (const [n1, n2] of poly.edges) {
    const v1 = poly.vertices[n1];
    const v2 = poly.vertices[n2];
    const d1 = d(v1);
    const d2 = d(v2);
    if (Math.abs(d1) < EPS5) push(v1);
    if (Math.abs(d2) < EPS5) push(v2);
    if (d1 * d2 < -EPS5 * EPS5) {
      const t = d1 / (d1 - d2);
      push(add3(v1, scale2(sub3(v2, v1), t)));
    }
  }
  if (pts.length < 3) return [];
  return orderRing(pts, normal);
}
function polygonArea3D(pts) {
  if (pts.length < 3) return 0;
  let n = [0, 0, 0];
  for (let i = 0; i < pts.length; i++) n = add3(n, cross2(pts[i], pts[(i + 1) % pts.length]));
  return norm(n) / 2;
}
function fanArea(pts) {
  let s = 0;
  for (let i = 1; i < pts.length - 1; i++) s += norm(cross2(sub3(pts[i], pts[0]), sub3(pts[i + 1], pts[0]))) / 2;
  return s;
}
function buildSectionCut(id, kind, dims, specs, color = "#f59e0b") {
  if (!specs || specs.length < 3) return null;
  const poly = buildPolyhedron(kind, dims);
  let resolved;
  try {
    resolved = specs.slice(0, 3).map((s) => resolveSectionPoint(poly, s));
  } catch {
    return null;
  }
  const pl = planeFrom3(resolved);
  if (!pl) return null;
  const polygon = sliceConvexPolyhedron(poly, pl.point, pl.normal);
  if (polygon.length < 3) return null;
  const aNewell = polygonArea3D(polygon);
  const aFan = fanArea(polygon);
  const verified = Math.abs(aNewell - aFan) <= 1e-9 * Math.max(1, aNewell) && aNewell > EPS5;
  const latex = `S_{\\text{thi\u1EBFt di\u1EC7n}}=${aNewell.toFixed(4)}`;
  const area = { value: aNewell, latex, verified, estimatedError: Math.abs(aNewell - aFan) };
  return {
    sectionCut: {
      id,
      targetKind: kind,
      polygon,
      plane: { point: pl.point, normal: pl.normal },
      area,
      color
    },
    poly
  };
}

// api/_lib/kernel/physics/planSchema.ts
var Num = external_exports.number().finite();
var Obj = external_exports.string().min(1);
var VelUnit = external_exports.enum(["m/s", "km/h"]);
var LenUnit = external_exports.enum(["m", "km"]);
var TimeUnit = external_exports.enum(["s", "min", "h"]);
var Mover1dOp = external_exports.object({
  op: external_exports.literal("mover1d"),
  name: Obj,
  x0: Num,
  // toạ độ đầu trên trục chuyển động
  xUnit: LenUnit.optional(),
  // đơn vị của x0 (vắng = units.length)
  v0: Num,
  // vận tốc đầu, ĐẠI SỐ: âm = ngược chiều dương
  v0Unit: VelUnit.optional(),
  // đơn vị của v0 (vắng = units.length/units.time) — bài "54 km/h, a=3 m/s²" khai đây
  a: Num.default(0),
  // gia tốc (0 = thẳng đều) — LUÔN theo hệ nền (đề có a hầu như luôn SI; aUnit → v1)
  startAt: Num.default(0),
  // thời điểm xuất phát t0 — "xe B đi sau 30 phút" ⇒ startAt: 30, tUnit: 'min'
  tUnit: TimeUnit.optional(),
  // đơn vị của startAt (vắng = units.time)
  axis: external_exports.enum(["x", "y"]).default("x")
  // 'y' = chuyển động thẳng đứng (thang máy…)
});
var FreeFallOp = external_exports.object({
  op: external_exports.literal("free_fall"),
  name: Obj,
  h0: Num.positive(),
  // độ cao thả
  xUnit: LenUnit.optional(),
  // đơn vị của h0 VÀ x0 (một unit cho cả hai — đề không trộn m/km trong một vật)
  g: Num.positive(),
  // BẮT BUỘC — LLM truyền 9.8 hoặc 10 THEO ĐỀ, theo hệ nền (m/s²). Engine KHÔNG hard-code g.
  x0: Num.default(0)
});
var ProjectileOp = external_exports.object({
  op: external_exports.literal("projectile"),
  name: Obj,
  x0: Num.default(0),
  h0: Num.min(0),
  // 0 = ném từ mặt đất
  xUnit: LenUnit.optional(),
  // đơn vị của x0/h0
  v0: Num.positive(),
  // ĐỘ LỚN (>0) — chiều nằm ở angleDeg
  v0Unit: VelUnit.optional(),
  // LUÔN là ĐỘ. 0 = ném ngang; 90 = thẳng đứng LÊN; −90 = thẳng đứng XUỐNG (F11). Độ→radian là việc
  // NỘI BỘ engine. THẤP(6): chặn |angleDeg| > 90 — "ném ngược chiều trục x" (vd 180°) không phải bài
  // projectile lớp 10; mô tả bằng mover1d (v0 âm) hoặc đổi chiều dương của trục.
  angleDeg: Num.min(-90, "angleDeg ph\u1EA3i trong [\u221290, 90] \u2014 n\xE9m ng\u01B0\u1EE3c chi\u1EC1u tr\u1EE5c x h\xE3y m\xF4 t\u1EA3 b\u1EB1ng mover1d (v0 \xE2m) ho\u1EB7c \u0111\u1ED5i chi\u1EC1u d\u01B0\u01A1ng c\u1EE7a tr\u1EE5c").max(90, "angleDeg ph\u1EA3i trong [\u221290, 90] \u2014 n\xE9m ng\u01B0\u1EE3c chi\u1EC1u tr\u1EE5c x h\xE3y m\xF4 t\u1EA3 b\u1EB1ng mover1d (v0 \xE2m) ho\u1EB7c \u0111\u1ED5i chi\u1EC1u d\u01B0\u01A1ng c\u1EE7a tr\u1EE5c"),
  g: Num.positive()
  // BẮT BUỘC, như free_fall
});
var PhysicsOpSchema = external_exports.discriminatedUnion("op", [Mover1dOp, FreeFallOp, ProjectileOp]);
var PhysicsQuerySchema = external_exports.discriminatedUnion("kind", [
  external_exports.object({ kind: external_exports.literal("position_at"), of: Obj, t: Num, tUnit: TimeUnit.optional(), axis: external_exports.enum(["x", "y"]).optional(), label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("velocity_at"), of: Obj, t: Num, tUnit: TimeUnit.optional(), component: external_exports.enum(["x", "y", "speed"]).default("speed"), label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("time_to_ground"), of: Obj, label: external_exports.string().optional() }),
  // min t>t0: y(t)=0
  external_exports.object({ kind: external_exports.literal("range"), of: Obj, label: external_exports.string().optional() }),
  // x(t_đất) − x(t0) — tầm xa
  external_exports.object({ kind: external_exports.literal("max_height"), of: Obj, label: external_exports.string().optional() }),
  // y tại đỉnh v_y=0
  external_exports.object({ kind: external_exports.literal("impact_velocity"), of: Obj, component: external_exports.enum(["x", "y", "speed"]).default("speed"), label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("meet_time"), a: Obj, b: Obj, label: external_exports.string().optional() }),
  // min t≥max(t0a,t0b): pos_a=pos_b
  external_exports.object({ kind: external_exports.literal("meet_position"), a: Obj, b: Obj, label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("distance_between_at"), a: Obj, b: Obj, t: Num, tUnit: TimeUnit.optional(), label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("time_when"), of: Obj, position: Num, xUnit: LenUnit.optional(), axis: external_exports.enum(["x", "y"]).optional(), label: external_exports.string().optional() }),
  // min t≥t0: coord=position
  // F3 (phản biện phiên 1): cặp query cho lớp bài "hãm phanh/dừng lại/đạt vận tốc cho trước".
  // v(t) TUYẾN TÍNH ⇒ nghiệm exact. `value` là giá trị ĐẠI SỐ theo component (dừng lại: value 0).
  // Tách-một-số như meet_time/meet_position (triết lý §14.4): time_… trả t, position_… trả toạ độ tại t đó.
  external_exports.object({ kind: external_exports.literal("time_when_velocity"), of: Obj, value: Num, vUnit: VelUnit.optional(), component: external_exports.enum(["x", "y"]).optional(), label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("position_when_velocity"), of: Obj, value: Num, vUnit: VelUnit.optional(), component: external_exports.enum(["x", "y"]).optional(), label: external_exports.string().optional() })
]);
var PhysicsPlanSchema = external_exports.object({
  problemName: external_exports.string().min(1),
  // Hệ đơn vị NHẤT QUÁN của cả plan — chỉ để GẮN NHÃN đáp + scale timeline, KHÔNG đổi công thức
  // (công thức động học bất biến theo hệ đơn vị nhất quán: km + h + km/h chạy y hệt m + s + m/s).
  units: external_exports.object({ length: external_exports.string().default("m"), time: external_exports.string().default("s") }).default({}),
  ops: external_exports.array(PhysicsOpSchema).min(1),
  queries: external_exports.array(PhysicsQuerySchema).min(1),
  // Assert = DỮ KIỆN DƯ của đề dùng đối chiếu mô hình (vd đề cho sẵn "sau 2 s vật đi được 30 m").
  // KHÔNG phải nơi LLM nộp đáp số. tol mặc định TOL_ASSERT (xem §7).
  asserts: external_exports.array(external_exports.object({ query: PhysicsQuerySchema, equals: Num, tol: Num.positive().optional() })).default([]),
  charts: external_exports.array(external_exports.object({ kind: external_exports.enum(["x_t", "v_t"]), of: external_exports.array(Obj).min(1) })).default([]),
  scene: external_exports.object({
    durationSec: Num.positive().optional(),
    // ép thời lượng playback; bỏ trống = quy tắc §8.2
    labels: external_exports.record(external_exports.string(), external_exports.string()).optional()
    // name → nhãn hiển thị ("Xe A", "Quả bóng"…)
  }).default({})
});

// api/_lib/kernel/analysis/solver1d.ts
function solveQuadratic(a, b, c) {
  if (isZeroS(a)) {
    if (isZeroS(b)) return [];
    return [neg(div(c, b))];
  }
  const disc = sub2(mul(b, b), mul(mul(rat(4n), a), c));
  const cmp = cmpScalar(disc, rat(0n));
  if (cmp < 0) return [];
  const twoA = mul(rat(2n), a);
  if (cmp === 0) return [neg(div(b, twoA))];
  const sq = sqrt(disc);
  return [div(sub2(neg(b), sq), twoA), div(add2(neg(b), sq), twoA)];
}

// api/_lib/kernel/physics/kinematics.ts
function scalarFromNumber(x) {
  if (!Number.isFinite(x)) return num(x);
  const SCALE = 1e9;
  const n = Math.round(x * SCALE);
  if (Math.abs(x * SCALE - n) < 1e-3 && Math.abs(n) <= Number.MAX_SAFE_INTEGER) {
    return fromExact(makeExact(BigInt(n), BigInt(SCALE)));
  }
  return num(x);
}
var LEN_TO_SI = { m: rat(1n), km: rat(1000n) };
var TIME_TO_SI = { s: rat(1n), min: rat(60n), h: rat(3600n) };
var VEL_TO_SI = { "m/s": rat(1n), "km/h": rat(5n, 18n) };
function convertQty(value, unit, baseUnit, table, dim) {
  const v = scalarFromNumber(value);
  if (unit === void 0 || unit === baseUnit) return v;
  const fu = table[unit];
  if (!fu) throw new Error(`\u0111\u01A1n v\u1ECB ${dim} "${unit}" ngo\xE0i b\u1EA3ng \u0111\u1ED5i (${Object.keys(table).join(", ")})`);
  const fb = table[baseUnit];
  if (!fb) {
    throw new Error(
      `h\u1EC7 n\u1EC1n ${dim} "${baseUnit}" ngo\xE0i b\u1EA3ng \u0111\u1ED5i (${Object.keys(table).join(", ")}) \u2014 kh\xF4ng \u0111\u1ED5i \u0111\u01B0\u1EE3c "${unit}"`
    );
  }
  return mul(v, div(fu, fb));
}
var qtyLength = (value, unit, base) => convertQty(value, unit, base.length, LEN_TO_SI, "\u0111\u1ED9 d\xE0i");
var qtyTime = (value, unit, base) => convertQty(value, unit, base.time, TIME_TO_SI, "th\u1EDDi gian");
var qtyVelocity = (value, unit, base) => convertQty(value, unit, `${base.length}/${base.time}`, VEL_TO_SI, "v\u1EADn t\u1ED1c");
var EXACT_TRIG = {
  0: { cos: rat(1n), sin: rat(0n) },
  30: { cos: fromExact(makeExact(1n, 2n, 3)), sin: rat(1n, 2n) },
  45: { cos: fromExact(makeExact(1n, 2n, 2)), sin: fromExact(makeExact(1n, 2n, 2)) },
  60: { cos: rat(1n, 2n), sin: fromExact(makeExact(1n, 2n, 3)) },
  90: { cos: rat(0n), sin: rat(1n) }
};
function trigOf(angleDeg) {
  const hit = EXACT_TRIG[Math.abs(angleDeg)];
  if (hit) return angleDeg < 0 ? { cos: hit.cos, sin: neg(hit.sin) } : hit;
  const r2 = angleDeg * Math.PI / 180;
  return { cos: num(Math.cos(r2)), sin: num(Math.sin(r2)) };
}
var ZERO = () => ({ k0: rat(0n), k1: rat(0n), k2: rat(0n) });
var HALF = rat(1n, 2n);
var SI = { length: "m", time: "s" };
function motionOf(op, base = SI) {
  const S = scalarFromNumber;
  if (op.op === "mover1d") {
    const q = {
      k0: qtyLength(op.x0, op.xUnit, base),
      k1: qtyVelocity(op.v0, op.v0Unit, base),
      k2: mul(HALF, S(op.a))
    };
    const t0 = qtyTime(op.startAt, op.tUnit, base);
    return op.axis === "y" ? { name: op.name, t0, x: ZERO(), y: q, op } : { name: op.name, t0, x: q, y: ZERO(), op };
  }
  if (op.op === "free_fall") {
    return {
      name: op.name,
      t0: rat(0n),
      x: { k0: qtyLength(op.x0, op.xUnit, base), k1: rat(0n), k2: rat(0n) },
      y: { k0: qtyLength(op.h0, op.xUnit, base), k1: rat(0n), k2: neg(mul(HALF, S(op.g))) },
      op
    };
  }
  const { cos, sin } = trigOf(op.angleDeg);
  const v0 = qtyVelocity(op.v0, op.v0Unit, base);
  return {
    name: op.name,
    t0: rat(0n),
    x: { k0: qtyLength(op.x0, op.xUnit, base), k1: mul(v0, cos), k2: rat(0n) },
    y: { k0: qtyLength(op.h0, op.xUnit, base), k1: mul(v0, sin), k2: neg(mul(HALF, S(op.g))) },
    op
  };
}
var mainAxis = (m) => m.op.op === "mover1d" ? m.op.axis : m.op.op === "free_fall" ? "y" : "x";
function evalQuadS(q, tau) {
  return add2(q.k0, add2(mul(q.k1, tau), mul(q.k2, mul(tau, tau))));
}
function evalQuadN(q, tau) {
  return q.k0.approx + q.k1.approx * tau + q.k2.approx * tau * tau;
}
function derivQuad(q) {
  return { k0: q.k1, k1: mul(rat(2n), q.k2), k2: rat(0n) };
}
function expandAbs(q, t0) {
  const k0 = add2(sub2(q.k0, mul(q.k1, t0)), mul(q.k2, mul(t0, t0)));
  const k1 = sub2(q.k1, mul(rat(2n), mul(q.k2, t0)));
  return { k0, k1, k2: q.k2 };
}
function subQuad(a, b) {
  return { k0: sub2(a.k0, b.k0), k1: sub2(a.k1, b.k1), k2: sub2(a.k2, b.k2) };
}
function rootsFor(q, value) {
  return solveQuadratic(q.k2, q.k1, sub2(q.k0, value)).sort((p2, r2) => p2.approx - r2.approx);
}

// api/_lib/kernel/physics/compute.ts
var EPS_SELF = 1e-6;
var EPS_T = 1e-9;
var unitOf = (kind, u) => kind === "velocity_at" || kind === "impact_velocity" ? `${u.length}/${u.time}` : kind === "time_to_ground" || kind === "meet_time" || kind === "time_when" || kind === "time_when_velocity" ? u.time : u.length;
function fmtNum4(x) {
  if (!Number.isFinite(x)) return "(l\u1ED7i)";
  if (x !== 0 && Math.abs(x) < 1e-3) return parseFloat(x.toPrecision(4)).toString();
  const digits = Math.abs(x) >= 1e3 ? 2 : 4;
  return parseFloat(x.toFixed(digits)).toString();
}
function displayPhys(s) {
  const e = s.exact;
  if (e && e.radicand === 1 && e.den > 100n) {
    let d = e.den, a = 0, b = 0;
    while (d % 2n === 0n) {
      d /= 2n;
      a++;
    }
    while (d % 5n === 0n) {
      d /= 5n;
      b++;
    }
    if (d === 1n) {
      const digits = Math.max(a, b);
      const n = e.num < 0n ? -e.num : e.num;
      const scaled = n * 10n ** BigInt(digits) / e.den;
      const str = scaled.toString().padStart(digits + 1, "0");
      return `${e.num < 0n ? "-" : ""}${str.slice(0, str.length - digits)}.${str.slice(str.length - digits)}`;
    }
  }
  return displayScalar(s);
}
function mkAnswer(kind, s, floatRef, unit, label) {
  const tol = 1e-6 * Math.max(1, Math.abs(floatRef));
  if (s.exact !== null && Math.abs(exactToApprox(s.exact) - floatRef) <= tol) {
    return { label, kind, text: unit ? `${displayPhys(s)} ${unit}` : displayPhys(s), approx: exactToApprox(s.exact), unit, approximate: false };
  }
  const nice = Number.isFinite(floatRef) ? recognizeConstant(floatRef) : null;
  const numTxt = nice ? nice.text : fmtNum4(floatRef);
  return { label, kind, text: unit ? `${numTxt} ${unit}` : numTxt, approx: floatRef, unit, approximate: !nice };
}
var quadOf = (m, axis) => axis === "x" ? m.x : m.y;
var scaleOf = (q) => Math.max(1, Math.abs(q.k0.approx), Math.abs(q.k1.approx), Math.abs(q.k2.approx));
function floatRootsFor(q, value) {
  const a = q.k2.approx, b = q.k1.approx, c = q.k0.approx - value;
  if (Math.abs(a) < 1e-15) return Math.abs(b) < 1e-15 ? [] : [-c / b];
  const d = b * b - 4 * a * c;
  if (d < 0) return [];
  const s = Math.sqrt(d);
  return [(-b - s) / (2 * a), (-b + s) / (2 * a)].sort((x, y) => x - y);
}
function pickMin(roots, min, exclusive) {
  for (const r2 of roots) if (exclusive ? r2.approx > min + EPS_T : r2.approx >= min - EPS_T) return r2;
  return null;
}
var backsub = (kind, detail, residual, scale4) => ({ kind, detail, residual, pass: Math.abs(residual) <= EPS_SELF * scale4 });
var info = (detail) => ({ kind: "info", detail, residual: 0, pass: true, severity: "info" });
function trustBound(m) {
  if (m.op.op === "mover1d") {
    const q = quadOf(m, mainAxis(m));
    if (Math.abs(q.k2.approx) < 1e-15) return null;
    const tauStop = -q.k1.approx / (2 * q.k2.approx);
    if (tauStop <= EPS_T) return null;
    return { tEnd: m.t0.approx + tauStop, moc: "d\u1EEBng" };
  }
  const g = groundTau(m);
  if ("problem" in g) return null;
  return { tEnd: m.t0.approx + g.tauN, moc: "ch\u1EA1m \u0111\u1EA5t" };
}
function warnBeyond(ms, t) {
  const out = [];
  for (const m of ms) {
    const b = trustBound(m);
    if (b && t > b.tEnd + EPS_T) {
      out.push({
        kind: "warn",
        severity: "warn",
        pass: false,
        residual: 0,
        detail: `t=${fmtNum4(t)} v\u01B0\u1EE3t th\u1EDDi \u0111i\u1EC3m ${b.moc} t=${fmtNum4(b.tEnd)} c\u1EE7a "${m.name}" \u2014 m\xF4 h\xECnh kh\xF4ng c\xF2n m\xF4 t\u1EA3 chuy\u1EC3n \u0111\u1ED9ng th\u1EF1c`
      });
    }
  }
  return out;
}
function groundTau(m) {
  if (m.op.op === "mover1d") return { problem: `"${m.name}" l\xE0 mover1d \u2014 time_to_ground/range/impact ch\u1EC9 d\xE0nh cho free_fall/projectile` };
  const tau = pickMin(rootsFor(m.y, rat(0n)), 0, true);
  const tauN = floatRootsFor(m.y, 0).filter((t) => t > EPS_T)[0];
  if (!tau || tauN === void 0) return { problem: `"${m.name}" kh\xF4ng ch\u1EA1m \u0111\u1EA5t (y(\u03C4)=0 v\xF4 nghi\u1EC7m d\u01B0\u01A1ng)` };
  return { tau, tauN };
}
var posClamped = (m, axis, tS) => {
  const q = quadOf(m, axis);
  if (tS.approx <= m.t0.approx + EPS_T) return { s: evalQuadS(q, rat(0n)), n: evalQuadN(q, 0) };
  const tau = sub2(tS, m.t0);
  return { s: evalQuadS(q, tau), n: evalQuadN(q, tau.approx) };
};
function computePhysicsQuery(motions, query, units) {
  const need2 = (name) => {
    const m = motions.get(name);
    if (!m) throw new Error(`V\u1EADt "${name}" ch\u01B0a khai b\xE1o trong ops`);
    return m;
  };
  const unit = unitOf(query.kind, units);
  try {
    switch (query.kind) {
      case "position_at": {
        const m = need2(query.of);
        const tS = qtyTime(query.t, query.tUnit, units);
        if (tS.approx < m.t0.approx - EPS_T) {
          const q0 = quadOf(m, query.axis ?? mainAxis(m));
          const checks = [info(`t=${query.t} tr\u01B0\u1EDBc l\xFAc xu\u1EA5t ph\xE1t t\u2080=${fmtNum4(m.t0.approx)} c\u1EE7a "${m.name}" \u2014 theo quy \u01B0\u1EDBc \xA76.2 v\u1EADt \u0111\u1EE9ng y\xEAn t\u1EA1i v\u1ECB tr\xED \u0111\u1EA7u`)];
          return { ok: true, answer: mkAnswer(query.kind, evalQuadS(q0, rat(0n)), evalQuadN(q0, 0), unit, query.label), checks };
        }
        const q = quadOf(m, query.axis ?? mainAxis(m));
        const tau = sub2(tS, m.t0);
        return { ok: true, answer: mkAnswer(query.kind, evalQuadS(q, tau), evalQuadN(q, tau.approx), unit, query.label), checks: warnBeyond([m], tS.approx) };
      }
      case "velocity_at":
      case "impact_velocity": {
        const m = need2(query.of);
        const checks = [];
        let tau, tauN;
        if (query.kind === "impact_velocity") {
          const g = groundTau(m);
          if ("problem" in g) return { ok: false, problem: g.problem };
          tau = g.tau;
          tauN = g.tauN;
          checks.push(backsub("backsub", `y(t_\u0111\u1EA5t)=0 c\u1EE7a "${m.name}"`, evalQuadN(m.y, tauN), scaleOf(m.y)));
        } else {
          const tS = qtyTime(query.t, query.tUnit, units);
          if (tS.approx < m.t0.approx - EPS_T) {
            checks.push(info(`t=${query.t} tr\u01B0\u1EDBc l\xFAc xu\u1EA5t ph\xE1t t\u2080=${fmtNum4(m.t0.approx)} c\u1EE7a "${m.name}" \u2014 theo quy \u01B0\u1EDBc \xA76.2 v\u1EADt \u0111\u1EE9ng y\xEAn (v=0)`));
            return { ok: true, answer: mkAnswer(query.kind, rat(0n), 0, unit, query.label), checks };
          }
          tau = sub2(tS, m.t0);
          tauN = tau.approx;
          checks.push(...warnBeyond([m], tS.approx));
        }
        const dx = derivQuad(m.x), dy = derivQuad(m.y);
        if (query.component === "x") return { ok: true, answer: mkAnswer(query.kind, evalQuadS(dx, tau), evalQuadN(dx, tauN), unit, query.label), checks };
        if (query.component === "y") return { ok: true, answer: mkAnswer(query.kind, evalQuadS(dy, tau), evalQuadN(dy, tauN), unit, query.label), checks };
        const vx = evalQuadS(dx, tau), vy = evalQuadS(dy, tau);
        const speed = sqrt(add2(mul(vx, vx), mul(vy, vy)));
        const speedN = Math.hypot(evalQuadN(dx, tauN), evalQuadN(dy, tauN));
        return { ok: true, answer: mkAnswer(query.kind, speed, speedN, unit, query.label), checks };
      }
      case "time_to_ground": {
        const m = need2(query.of);
        const g = groundTau(m);
        if ("problem" in g) return { ok: false, problem: g.problem };
        const checks = [backsub("backsub", `y(t_\u0111\u1EA5t)=0 c\u1EE7a "${m.name}"`, evalQuadN(m.y, g.tauN), scaleOf(m.y))];
        return { ok: true, answer: mkAnswer(query.kind, add2(m.t0, g.tau), m.t0.approx + g.tauN, unit, query.label), checks, tSolved: m.t0.approx + g.tauN };
      }
      case "range": {
        const m = need2(query.of);
        const g = groundTau(m);
        if ("problem" in g) return { ok: false, problem: g.problem };
        const r2 = sub2(evalQuadS(m.x, g.tau), evalQuadS(m.x, rat(0n)));
        const rN = evalQuadN(m.x, g.tauN) - evalQuadN(m.x, 0);
        const checks = [backsub("backsub", `y(t_\u0111\u1EA5t)=0 c\u1EE7a "${m.name}"`, evalQuadN(m.y, g.tauN), scaleOf(m.y))];
        return { ok: true, answer: mkAnswer(query.kind, r2, rN, unit, query.label), checks, tSolved: m.t0.approx + g.tauN };
      }
      case "max_height": {
        const m = need2(query.of);
        if (m.y.k2.approx >= -EPS_T) return { ok: false, problem: `max_height: "${m.name}" kh\xF4ng c\xF3 \u0111\u1EC9nh (y kh\xF4ng ph\u1EA3i parabol m\u1EDF xu\u1ED1ng)` };
        const tauStar = neg(div(m.y.k1, mul(rat(2n), m.y.k2)));
        if (tauStar.approx < -EPS_T) return { ok: false, problem: "max_height: \u0111\u1EC9nh tr\u01B0\u1EDBc l\xFAc xu\u1EA5t ph\xE1t (v\u1EADt kh\xF4ng \u0111i l\xEAn)" };
        const H = evalQuadS(m.y, tauStar);
        const HN = evalQuadN(m.y, tauStar.approx);
        const dy = derivQuad(m.y);
        const h = Math.max(1e-3, Math.abs(tauStar.approx) * 1e-3);
        const isPeak = HN >= evalQuadN(m.y, tauStar.approx - h) && HN >= evalQuadN(m.y, tauStar.approx + h);
        const checks = [
          backsub("vertex", `v_y(\u03C4*)=0 c\u1EE7a "${m.name}"`, evalQuadN(dy, tauStar.approx), scaleOf(dy)),
          { kind: "peak", detail: "y(\u03C4*) \u2265 y(\u03C4*\xB1h)", residual: isPeak ? 0 : 1, pass: isPeak }
        ];
        return { ok: true, answer: mkAnswer(query.kind, H, HN, unit, query.label), checks, tSolved: m.t0.approx + tauStar.approx };
      }
      case "meet_time":
      case "meet_position": {
        const ma = need2(query.a), mb = need2(query.b);
        const aX = expandAbs(ma.x, ma.t0), bX = expandAbs(mb.x, mb.t0);
        const aY = expandAbs(ma.y, ma.t0), bY = expandAbs(mb.y, mb.t0);
        const dX = subQuad(aX, bX), dY = subQuad(aY, bY);
        const hasMotion = (q) => Math.abs(q.k1.approx) + Math.abs(q.k2.approx) > 1e-15;
        const tMin = Math.max(ma.t0.approx, mb.t0.approx);
        const tMinS = ma.t0.approx >= mb.t0.approx ? ma.t0 : mb.t0;
        const scale4 = Math.max(scaleOf(aX), scaleOf(bX), scaleOf(aY), scaleOf(bY));
        let axis;
        if (hasMotion(dX)) axis = "x";
        else if (hasMotion(dY)) axis = "y";
        else {
          if (Math.abs(dX.k0.approx) <= EPS_SELF * scale4 && Math.abs(dY.k0.approx) <= EPS_SELF * scale4) {
            const checks2 = [info(`hai v\u1EADt chuy\u1EC3n \u0111\u1ED9ng tr\xF9ng nhau ho\xE0n to\xE0n \u2014 tr\u1EA3 th\u1EDDi \u0111i\u1EC3m s\u1EDBm nh\u1EA5t c\u1EA3 hai c\xF9ng xu\u1EA5t ph\xE1t t = ${fmtNum4(tMin)} ${units.time} (meet_time inclusive t=t\u2080)`)];
            if (query.kind === "meet_time") return { ok: true, answer: mkAnswer(query.kind, tMinS, tMin, unit, query.label), checks: checks2, tSolved: tMin };
            return { ok: true, answer: mkAnswer(query.kind, evalQuadS(aX, tMinS), evalQuadN(aX, tMin), unit, query.label), checks: checks2, tSolved: tMin };
          }
          return { ok: false, problem: `"${query.a}" v\xE0 "${query.b}" kh\xF4ng g\u1EB7p nhau (kho\u1EA3ng c\xE1ch kh\xF4ng \u0111\u1ED5i theo th\u1EDDi gian)` };
        }
        const dPrim = axis === "x" ? dX : dY;
        const dOther = axis === "x" ? dY : dX;
        const qa = axis === "x" ? aX : aY;
        const rootsN = floatRootsFor(dPrim, 0).filter((r2) => r2 >= tMin - EPS_T);
        const t = pickMin(rootsFor(dPrim, rat(0n)), tMin, false);
        const tN = rootsN[0];
        if (!t || tN === void 0) return { ok: false, problem: `"${query.a}" v\xE0 "${query.b}" kh\xF4ng g\u1EB7p nhau sau khi c\u1EA3 hai xu\u1EA5t ph\xE1t` };
        const residOther = evalQuadN(dOther, tN);
        if (Math.abs(residOther) > EPS_SELF * scale4) {
          return { ok: false, problem: `"${query.a}" v\xE0 "${query.b}" kh\xF4ng th\u1EF1c s\u1EF1 g\u1EB7p nhau (l\u1EC7ch nhau ${fmtNum4(Math.abs(residOther))} ${units.length} tr\xEAn tr\u1EE5c c\xF2n l\u1EA1i t\u1EA1i t=${fmtNum4(tN)})` };
        }
        const resid = Math.hypot(evalQuadN(dPrim, tN), residOther);
        const checks = [backsub("backsub", `pos_${query.a}(t_g\u1EB7p) = pos_${query.b}(t_g\u1EB7p)`, resid, scale4)];
        if (rootsN.length > 1 && rootsN[1] > tN + EPS_T) checks.push(info(`c\xF2n nghi\u1EC7m g\u1EB7p l\u1EA7n 2: t\u2082 = ${fmtNum4(rootsN[1])} ${units.time} (tr\u1EA3 nghi\u1EC7m \u0111\u1EA7u)`));
        if (tN <= tMin + EPS_T) checks.push(info(`g\u1EB7p ngay t\u1EA1i th\u1EDDi \u0111i\u1EC3m xu\u1EA5t ph\xE1t t = t\u2080 = ${fmtNum4(tMin)} ${units.time}: hai v\u1EADt \u1EDF c\xF9ng v\u1ECB tr\xED ngay l\xFAc b\u1EAFt \u0111\u1EA7u (quy \u01B0\u1EDBc meet_time inclusive t=t\u2080)`));
        if (query.kind === "meet_time") return { ok: true, answer: mkAnswer(query.kind, t, tN, unit, query.label), checks, tSolved: tN };
        return { ok: true, answer: mkAnswer(query.kind, evalQuadS(qa, t), evalQuadN(qa, tN), unit, query.label), checks, tSolved: tN };
      }
      case "distance_between_at": {
        const ma = need2(query.a), mb = need2(query.b);
        const tS = qtyTime(query.t, query.tUnit, units);
        const ax = posClamped(ma, "x", tS), bx = posClamped(mb, "x", tS);
        const ay = posClamped(ma, "y", tS), by = posClamped(mb, "y", tS);
        const dxS = sub2(ax.s, bx.s), dyS = sub2(ay.s, by.s);
        const dist = sqrt(add2(mul(dxS, dxS), mul(dyS, dyS)));
        return { ok: true, answer: mkAnswer(query.kind, dist, Math.hypot(ax.n - bx.n, ay.n - by.n), unit, query.label), checks: warnBeyond([ma, mb], tS.approx) };
      }
      case "time_when": {
        const m = need2(query.of);
        const q = quadOf(m, query.axis ?? mainAxis(m));
        const posS = qtyLength(query.position, query.xUnit, units);
        if (Math.abs(q.k1.approx) < 1e-15 && Math.abs(q.k2.approx) < 1e-15) {
          if (Math.abs(q.k0.approx - posS.approx) <= EPS_SELF * Math.max(scaleOf(q), Math.abs(posS.approx))) {
            const checks2 = [info(`"${m.name}" \u0111\u1EE9ng y\xEAn v\xE0 LU\xD4N \u1EDF v\u1ECB tr\xED ${query.position} \u2014 tr\u1EA3 th\u1EDDi \u0111i\u1EC3m s\u1EDBm nh\u1EA5t t = t\u2080`)];
            return { ok: true, answer: mkAnswer(query.kind, m.t0, m.t0.approx, unit, query.label), checks: checks2, tSolved: m.t0.approx };
          }
          return { ok: false, problem: `time_when: "${m.name}" \u0111\u1EE9ng y\xEAn t\u1EA1i ${fmtNum4(q.k0.approx)} ${units.length} \u2014 kh\xF4ng bao gi\u1EDD t\u1EDBi v\u1ECB tr\xED ${query.position}` };
        }
        const tau = pickMin(rootsFor(q, posS), 0, false);
        const tauN = floatRootsFor(q, posS.approx).filter((r2) => r2 >= -EPS_T)[0];
        if (!tau || tauN === void 0) return { ok: false, problem: `time_when: "${m.name}" kh\xF4ng bao gi\u1EDD t\u1EDBi v\u1ECB tr\xED ${query.position}` };
        const checks = [backsub("backsub", `coord(t) = ${query.position} c\u1EE7a "${m.name}"`, evalQuadN(q, tauN) - posS.approx, scaleOf(q))];
        checks.push(...warnBeyond([m], m.t0.approx + tauN));
        return { ok: true, answer: mkAnswer(query.kind, add2(m.t0, tau), m.t0.approx + tauN, unit, query.label), checks, tSolved: m.t0.approx + tauN };
      }
      case "time_when_velocity":
      case "position_when_velocity": {
        const m = need2(query.of);
        const axis = query.component ?? mainAxis(m);
        const q = quadOf(m, axis);
        const dq = derivQuad(q);
        const valueS = qtyVelocity(query.value, query.vUnit, units);
        if (Math.abs(dq.k1.approx) < 1e-15) {
          if (Math.abs(dq.k0.approx - valueS.approx) <= EPS_T * scaleOf(dq)) {
            const checks2 = [info(`v_${axis} kh\xF4ng \u0111\u1ED5i v\xE0 \u0110\xDANG B\u1EB0NG ${query.value} \u2014 \u0111\u1EA1t ngay t\u1EEB l\xFAc xu\u1EA5t ph\xE1t t = t\u2080`)];
            if (query.kind === "time_when_velocity") return { ok: true, answer: mkAnswer(query.kind, m.t0, m.t0.approx, unit, query.label), checks: checks2, tSolved: m.t0.approx };
            return { ok: true, answer: mkAnswer(query.kind, evalQuadS(q, rat(0n)), evalQuadN(q, 0), unit, query.label), checks: checks2, tSolved: m.t0.approx };
          }
          return { ok: false, problem: `${query.kind}: "${m.name}" c\xF3 v_${axis} kh\xF4ng \u0111\u1ED5i (a=0) \u2014 kh\xF4ng bao gi\u1EDD \u0111\u1EA1t v=${query.value}` };
        }
        const tau = pickMin(rootsFor(dq, valueS), 0, false);
        const tauN = floatRootsFor(dq, valueS.approx).filter((r2) => r2 >= -EPS_T)[0];
        if (!tau || tauN === void 0) return { ok: false, problem: `${query.kind}: "${m.name}" \u0111\u1EA1t v=${query.value} TR\u01AF\u1EDAC l\xFAc xu\u1EA5t ph\xE1t (sai chi\u1EC1u gia t\u1ED1c) \u2014 kh\xF4ng c\xF3 nghi\u1EC7m t \u2265 t\u2080` };
        const checks = [backsub("backsub", `v_${axis}(t) = ${query.value} c\u1EE7a "${m.name}"`, evalQuadN(dq, tauN) - valueS.approx, scaleOf(dq))];
        checks.push(...warnBeyond([m], m.t0.approx + tauN));
        if (query.kind === "time_when_velocity") {
          return { ok: true, answer: mkAnswer(query.kind, add2(m.t0, tau), m.t0.approx + tauN, unit, query.label), checks, tSolved: m.t0.approx + tauN };
        }
        return { ok: true, answer: mkAnswer(query.kind, evalQuadS(q, tau), evalQuadN(q, tauN), unit, query.label), checks, tSolved: m.t0.approx + tauN };
      }
      default: {
        query;
        return { ok: false, problem: `query kind kh\xF4ng h\u1ED7 tr\u1EE3: ${query.kind}` };
      }
    }
  } catch (e) {
    return { ok: false, problem: e.message };
  }
}

// api/_lib/kernel/physics/scene.ts
var COLORS = ["#FFA500", "#38BDF8", "#F472B6", "#4ADE80"];
var fmt = (n) => parseFloat(n.toFixed(6)).toString();
function playbackOf(plan, tPhys) {
  if (plan.scene.durationSec) return { durationSec: plan.scene.durationSec, timeScale: tPhys / plan.scene.durationSec };
  if (plan.units.time === "s" && tPhys >= 3 && tPhys <= 15) return { durationSec: tPhys, timeScale: 1 };
  return { durationSec: 10, timeScale: tPhys / 10 };
}
function buildScene(plan, motions, tPhys) {
  const playback = playbackOf(plan, tPhys);
  if (motions.size === 0) return { geometry: null, playback };
  const k = playback.timeScale;
  const items = [];
  motions.forEach((m) => {
    const g = m.op.op === "mover1d" ? null : groundTau(m);
    const falling = g !== null && !("problem" in g);
    const tauEnd = falling ? g.tauN : Math.max(0, tPhys - m.t0.approx);
    items.push({
      m,
      falling,
      tEnd: m.t0.approx + tauEnd,
      x0: evalQuadN(m.x, 0),
      y0: evalQuadN(m.y, 0),
      xEnd: evalQuadN(m.x, tauEnd),
      yEnd: evalQuadN(m.y, tauEnd)
    });
  });
  let xMin = Infinity, xMax = -Infinity, yTop = 0;
  for (const it of items) {
    xMin = Math.min(xMin, it.x0, it.xEnd);
    xMax = Math.max(xMax, it.x0, it.xEnd);
    yTop = Math.max(yTop, it.y0, it.yEnd);
    if (it.m.y.k2.approx < 0) {
      const tauStar = -it.m.y.k1.approx / (2 * it.m.y.k2.approx);
      if (tauStar > 0 && it.m.t0.approx + tauStar <= it.tEnd + 1e-9) yTop = Math.max(yTop, evalQuadN(it.m.y, tauStar));
    }
  }
  const span = Math.max(1, xMax - xMin, yTop);
  const margin = Math.max(0.5, 0.05 * span);
  const radius = Math.max(0.12, 0.02 * span);
  const points = [
    { id: "__G0", label: "", x: xMin - margin, y: 0, z: 0 },
    { id: "__G1", label: "", x: xMax + margin, y: 0, z: 0 }
  ];
  const lines = [{ id: "ground", from: "__G0", to: "__G1", style: "solid", color: "#8B8B8B" }];
  const curves = [];
  const agents = [];
  const tracks = [];
  let ci = 0;
  for (const it of items) {
    const { m } = it;
    const color = COLORS[ci++ % COLORS.length];
    const label = plan.scene.labels?.[m.name] ?? m.name;
    points.push({ id: `${m.name}0`, label: `${label} (xu\u1EA5t ph\xE1t)`, x: it.x0, y: 0, z: it.y0 });
    if (it.falling) {
      points.push({ id: `${m.name}_dat`, label: "Ch\u1EA1m \u0111\u1EA5t", x: it.xEnd, y: 0, z: 0 });
      const N = 32, tauEnd = it.tEnd - m.t0.approx;
      const samples = [];
      for (let i = 0; i <= N; i++) {
        const tau = tauEnd * i / N;
        samples.push({ x: evalQuadN(m.x, tau), y: evalQuadN(m.y, tau) });
      }
      curves.push({ id: `traj_${m.name}`, type: "expr", plane: "xz", style: "dashed", color, params: {}, samples });
    }
    agents.push({ id: m.name, label, initialPosition: [it.x0, 0, it.y0], color, radius });
    const rhs2 = (q) => {
      const c0 = q.k0.approx, c1 = q.k1.approx * k, c2 = q.k2.approx * k * k;
      let s = fmt(c0);
      if (c1 !== 0) s += ` + ${fmt(c1)}*t`;
      if (c2 !== 0) s += ` + ${fmt(c2)}*t*t`;
      return s;
    };
    tracks.push({
      id: `mv_${m.name}`,
      start: m.t0.approx / k,
      end: it.tEnd / k,
      type: "parametric_path",
      targetId: m.name,
      params: {
        // AnimatedAgent ưu tiên equations (không qua bước split dấu phẩy); path giữ làm dự phòng + debug
        // (format module kinematic đã chứng minh render). equations chỉ chứa VẾ PHẢI.
        equations: { x: rhs2(m.x), y: "0", z: rhs2(m.y) },
        path: `x(t) = ${rhs2(m.x)}, y(t) = 0, z(t) = ${rhs2(m.y)}`,
        landing_point: [it.xEnd, 0, it.yEnd],
        // BẮT BUỘC: thiếu là agent nhảy về vị trí đầu sau track.end
        timeScale: k
      }
    });
  }
  const geometry = {
    name: plan.problemName,
    axisUnit: plan.units.length,
    tags: ["physics", `timeScale:${fmt(k)}`],
    points,
    lines,
    curves,
    agents,
    timeline: { duration: playback.durationSec, tracks }
  };
  return { geometry, playback };
}
function buildCharts(plan, motions, tPhys, events) {
  const out = [];
  for (const ch of plan.charts) {
    const series = [];
    for (const name of ch.of) {
      const m = motions.get(name);
      if (!m) continue;
      const base = mainAxis(m) === "y" ? m.y : m.x;
      const q = ch.kind === "x_t" ? base : derivQuad(base);
      const t0 = m.t0.approx;
      if (tPhys <= t0 + EPS_T) continue;
      const N = Math.abs(q.k2.approx) < 1e-15 ? 1 : 64;
      const samples = [];
      for (let i = 0; i <= N; i++) {
        const t = t0 + (tPhys - t0) * i / N;
        samples.push([t, evalQuadN(q, t - t0)]);
      }
      series.push({ name, samples });
    }
    out.push({
      kind: ch.kind,
      tUnit: plan.units.time,
      vUnit: ch.kind === "x_t" ? plan.units.length : `${plan.units.length}/${plan.units.time}`,
      series,
      events
    });
  }
  return out;
}

// api/_lib/kernel/physics/runPhysics.ts
var TOL_ASSERT = 1e-3;
function runPhysics(raw) {
  const parsed = PhysicsPlanSchema.safeParse(raw);
  if (!parsed.success) {
    const iss = parsed.error.issues[0];
    const detail = iss ? `${iss.path.length ? `${iss.path.join(".")}: ` : ""}${iss.message}` : "schema";
    return {
      ok: false,
      answers: [],
      checks: [],
      violations: [],
      errors: [{ message: `Invalid physics plan: ${detail}` }],
      // THẤP(9): timeScale mặc định 1 (không phát 0 — phía dùng chia cho timeScale sẽ chia-0).
      geometry: null,
      charts: [],
      meta: { tPhys: 0, playback: { durationSec: 0, timeScale: 1 }, units: { length: "m", time: "s" } }
    };
  }
  const plan = parsed.data;
  const units = { length: plan.units.length ?? "m", time: plan.units.time ?? "s" };
  const errors = [];
  const motions = /* @__PURE__ */ new Map();
  for (const op of plan.ops) {
    if (motions.has(op.name)) {
      errors.push({ message: `V\u1EADt "${op.name}" khai b\xE1o 2 l\u1EA7n` });
      continue;
    }
    try {
      motions.set(op.name, motionOf(op, units));
    } catch (e) {
      errors.push({ message: `op "${op.name}": ${e.message}` });
    }
  }
  const answers = [];
  const checks = [];
  const events = [];
  for (const [qi, q] of plan.queries.entries()) {
    const r2 = computePhysicsQuery(motions, q, units);
    if (r2.ok === false) {
      errors.push({ message: `query ${q.kind}: ${r2.problem}` });
      continue;
    }
    answers.push({ ...r2.answer, queryIndex: qi });
    checks.push(...r2.checks);
    if (r2.tSolved !== void 0) {
      const ev = { t: r2.tSolved, label: "label" in q && q.label || q.kind };
      if (Number.isFinite(r2.answer.approx)) ev.value = r2.answer.approx;
      events.push(ev);
    }
    for (const c of r2.checks) if (!c.pass && c.severity !== "warn") errors.push({ message: `t\u1EF1 ki\u1EC3m FAIL: ${c.detail} (residual ${c.residual.toExponential(2)})` });
  }
  const violations = [];
  for (const a of plan.asserts) {
    const r2 = computePhysicsQuery(motions, a.query, units);
    if (r2.ok === false) {
      errors.push({ message: `assert ${a.query.kind}: ${r2.problem}` });
      continue;
    }
    for (const c of r2.checks) if (!c.pass && c.severity !== "warn") errors.push({ message: `assert ${a.query.kind} t\u1EF1 ki\u1EC3m FAIL: ${c.detail} (residual ${c.residual.toExponential(2)})` });
    const tol = (a.tol ?? TOL_ASSERT) * Math.max(1, Math.abs(a.equals));
    const delta = Math.abs(r2.answer.approx - a.equals);
    if (delta > tol) violations.push({ assert: a.query.kind, expected: a.equals, got: r2.answer.approx, delta });
  }
  let tPhys = 1;
  for (const q of plan.queries) {
    if ("t" in q && typeof q.t === "number") {
      let tq = q.t;
      const tu = q.tUnit;
      if (tu) {
        try {
          tq = qtyTime(tq, tu, units).approx;
        } catch {
        }
      }
      tPhys = Math.max(tPhys, tq);
    }
  }
  for (const e of events) tPhys = Math.max(tPhys, e.t);
  motions.forEach((m) => {
    if (m.op.op !== "mover1d") {
      const g = groundTau(m);
      if (!("problem" in g)) tPhys = Math.max(tPhys, m.t0.approx + g.tauN);
    }
  });
  const { geometry, playback } = buildScene(plan, motions, tPhys);
  const charts = buildCharts(plan, motions, tPhys, events);
  const ok = violations.length === 0 && errors.length === 0 && answers.length === plan.queries.length && answers.every((a) => Number.isFinite(a.approx));
  return { ok, answers, checks, violations, errors, geometry, charts, meta: { tPhys, playback, units } };
}

// api/_lib/kernel/physics/circuitSchema.ts
var Num2 = external_exports.number().finite();
var Name2 = external_exports.string().min(1).regex(/^[A-Za-z0-9_]+$/);
var ResistorLeaf = external_exports.object({
  kind: external_exports.literal("resistor"),
  name: Name2,
  ohms: Num2.positive(),
  unit: external_exports.enum(["ohm", "kohm"]).default("ohm")
  // per-quantity (F2): kohm → engine ×1000 exact
});
var LampLeaf = external_exports.object({
  kind: external_exports.literal("lamp"),
  name: Name2,
  ratedVolts: Num2.positive(),
  // U_đm (V)
  ratedWatts: Num2.positive()
  // P_đm (W) — engine tự suy R = U_đm²/P_đm (coi hằng, ghi assumption)
});
var UnknownLeaf = external_exports.object({
  kind: external_exports.literal("unknown_resistor"),
  name: Name2
  // biến trở CẦN TÌM (bài nghịch) — KHÔNG có ohms
});
var CircuitNodeSchema = external_exports.lazy(
  () => external_exports.discriminatedUnion("kind", [
    ResistorLeaf,
    LampLeaf,
    UnknownLeaf,
    external_exports.object({ kind: external_exports.literal("series"), name: Name2.optional(), items: external_exports.array(CircuitNodeSchema).min(2) }),
    external_exports.object({ kind: external_exports.literal("parallel"), name: Name2.optional(), items: external_exports.array(CircuitNodeSchema).min(2) })
  ])
  // Cast: z.lazy + discriminatedUnion dưới strictNullChecks:false suy ra kiểu output "lỏng" (mọi field
  // optional) không khớp CircuitNode tự khai (kind bắt buộc ở nhóm). z.infer vẫn = CircuitNode nhờ annotation.
);
var CircuitQuerySchema = external_exports.discriminatedUnion("kind", [
  // resistance (ĐỔI TÊN từ total_resistance — phán quyết §15.2): bỏ of = R_tđ mạch ngoài;
  // of = tên lá/khối = R (tương đương) của phần tử đó (vd R đèn suy từ định mức).
  external_exports.object({ kind: external_exports.literal("resistance"), of: Name2.optional(), label: external_exports.string().optional() }),
  // current: bỏ of = I mạch chính (qua nguồn); of = I qua lá/khối.
  external_exports.object({ kind: external_exports.literal("current"), of: Name2.optional(), label: external_exports.string().optional() }),
  // voltage: bỏ of = U mạch ngoài = U hai cực nguồn; of = U hai đầu lá/khối.
  external_exports.object({ kind: external_exports.literal("voltage"), of: Name2.optional(), label: external_exports.string().optional() }),
  // power: P tiêu thụ của lá/khối = U·I.
  external_exports.object({ kind: external_exports.literal("power"), of: Name2, label: external_exports.string().optional() }),
  // power_source: total = E·I | internal = I²r | external = U_N·I.
  external_exports.object({
    kind: external_exports.literal("power_source"),
    part: external_exports.enum(["total", "internal", "external"]).default("total"),
    label: external_exports.string().optional()
  }),
  // energy A = P·t của lá/khối (bỏ of = mạch ngoài); tUnit/unit engine đổi exact (§6.4).
  external_exports.object({
    kind: external_exports.literal("energy"),
    of: Name2.optional(),
    t: Num2.positive(),
    tUnit: external_exports.enum(["s", "min", "h"]).default("s"),
    unit: external_exports.enum(["J", "kJ", "Wh", "kWh"]).default("J"),
    label: external_exports.string().optional()
  }),
  // energy_source: công của nguồn A_ng = E·I·t.
  external_exports.object({
    kind: external_exports.literal("energy_source"),
    t: Num2.positive(),
    tUnit: external_exports.enum(["s", "min", "h"]).default("s"),
    unit: external_exports.enum(["J", "kJ", "Wh", "kWh"]).default("J"),
    label: external_exports.string().optional()
  }),
  // efficiency H = U_N/E, trả PHẦN TRĂM (unit '%').
  external_exports.object({ kind: external_exports.literal("efficiency"), label: external_exports.string().optional() }),
  // lamp_check: of PHẢI là lamp; ratio = I_thực/I_đm + verdict cấu trúc (§8.1).
  external_exports.object({ kind: external_exports.literal("lamp_check"), of: Name2, label: external_exports.string().optional() }),
  // solve_resistance: of PHẢI là unknown_resistor; tìm R để I MẠCH CHÍNH = targetCurrent (§7.5).
  external_exports.object({
    kind: external_exports.literal("solve_resistance"),
    of: Name2,
    targetCurrent: Num2.positive(),
    targetCurrentUnit: external_exports.enum(["A", "mA"]).default("A"),
    label: external_exports.string().optional()
  })
]);
var CircuitPlanSchema = external_exports.object({
  problemName: external_exports.string().min(1),
  source: external_exports.object({
    emf: Num2.positive(),
    // E (V) — "mắc vào U không đổi" ⇒ emf = U, r = 0
    r: Num2.min(0).default(0)
    // điện trở trong (Ω)
  }),
  circuit: CircuitNodeSchema,
  // mạch ngoài; MỘT lá đơn cũng hợp lệ (bếp điện, một đèn)
  queries: external_exports.array(CircuitQuerySchema).min(1),
  asserts: external_exports.array(external_exports.object({ query: CircuitQuerySchema, equals: Num2, tol: Num2.positive().optional() })).default([])
}).superRefine((plan, ctx) => {
  const names = [];
  const leafKinds = /* @__PURE__ */ new Map();
  let leafCount = 0;
  let maxDepth = 0;
  const RESERVED = /* @__PURE__ */ new Set(["_ngoai", "_nguon"]);
  const walk = (node, depth) => {
    if (node.kind === "series" || node.kind === "parallel") {
      maxDepth = Math.max(maxDepth, depth);
      if (node.name) names.push(node.name);
      for (const it of node.items) walk(it, depth + 1);
      return;
    }
    leafCount++;
    names.push(node.name);
    leafKinds.set(node.name, node.kind);
  };
  walk(plan.circuit, 1);
  const seen = /* @__PURE__ */ new Set();
  for (const nm of names) {
    if (seen.has(nm)) ctx.addIssue({ code: external_exports.ZodIssueCode.custom, message: `t\xEAn "${nm}" tr\xF9ng \u2014 m\u1ECDi t\xEAn (l\xE1 + nh\xF3m) ph\u1EA3i duy nh\u1EA5t` });
    seen.add(nm);
    if (RESERVED.has(nm)) ctx.addIssue({ code: external_exports.ZodIssueCode.custom, message: `t\xEAn "${nm}" l\xE0 t\u1EEB kh\xF3a hi\u1EC3n th\u1ECB n\u1ED9i b\u1ED9, kh\xF4ng \u0111\u01B0\u1EE3c d\xF9ng` });
  }
  const nameSet = seen;
  if (leafCount > 8) ctx.addIssue({ code: external_exports.ZodIssueCode.custom, message: `m\u1EA1ch c\xF3 ${leafCount} l\xE1, v\u01B0\u1EE3t tr\u1EA7n 8 (v1)` });
  if (maxDepth > 4) ctx.addIssue({ code: external_exports.ZodIssueCode.custom, message: `nh\xF3m s\xE2u ${maxDepth} t\u1EA7ng, v\u01B0\u1EE3t tr\u1EA7n 4 (v1)` });
  const unknowns = [...leafKinds.entries()].filter(([, k]) => k === "unknown_resistor").map(([n]) => n);
  if (unknowns.length > 1) ctx.addIssue({ code: external_exports.ZodIssueCode.custom, message: `c\xF3 ${unknowns.length} unknown_resistor, t\u1ED1i \u0111a 1 (v1)` });
  const solveQs = plan.queries.filter((q) => q.kind === "solve_resistance");
  if (unknowns.length === 1 && solveQs.length !== 1)
    ctx.addIssue({ code: external_exports.ZodIssueCode.custom, message: `c\xF3 \u1EA9n "${unknowns[0]}" nh\u01B0ng ${solveQs.length} query solve_resistance (c\u1EA7n \u0111\xFAng 1)` });
  if (unknowns.length === 0 && solveQs.length > 0)
    ctx.addIssue({ code: external_exports.ZodIssueCode.custom, message: `c\xF3 solve_resistance nh\u01B0ng kh\xF4ng c\xF3 unknown_resistor n\xE0o` });
  for (const sq of solveQs) {
    if (sq.of && leafKinds.get(sq.of) !== "unknown_resistor")
      ctx.addIssue({ code: external_exports.ZodIssueCode.custom, message: `solve_resistance.of "${sq.of}" kh\xF4ng tr\u1ECF t\u1EDBi unknown_resistor` });
  }
  for (const q of plan.queries) {
    if (q.kind === "lamp_check" && leafKinds.get(q.of) !== "lamp")
      ctx.addIssue({ code: external_exports.ZodIssueCode.custom, message: `lamp_check.of "${q.of}" kh\xF4ng tr\u1ECF t\u1EDBi l\xE1 lamp` });
  }
  const checkRef = (of, where) => {
    if (of !== void 0 && !nameSet.has(of))
      ctx.addIssue({ code: external_exports.ZodIssueCode.custom, message: `${where} tr\u1ECF t\u1EDBi t\xEAn "${of}" kh\xF4ng t\u1ED3n t\u1EA1i trong c\xE2y` });
  };
  for (const q of plan.queries) if ("of" in q) checkRef(q.of, `query ${q.kind}`);
  for (const a of plan.asserts) if ("of" in a.query) checkRef(a.query.of, `assert ${a.query.kind}`);
});

// api/_lib/kernel/physics/circuit.ts
var EPS_SELF2 = 1e-6;
var ONE = rat(1n);
var ZERO2 = rat(0n);
function leafR(node, sub6) {
  if (node.kind === "resistor") {
    const base = scalarFromNumber(node.ohms);
    return node.unit === "kohm" ? mul(base, rat(1000n)) : base;
  }
  if (node.kind === "lamp") {
    const U = scalarFromNumber(node.ratedVolts);
    return div(mul(U, U), scalarFromNumber(node.ratedWatts));
  }
  if (sub6 && sub6.name === node.name) return sub6.R;
  throw new Error(`unknown_resistor "${node.name}" ch\u01B0a c\xF3 gi\xE1 tr\u1ECB \u2014 ch\u1EC9 h\u1EE3p l\u1EC7 tr\xEAn \u0111\u01B0\u1EDDng M\xF6bius (\xA77.5)`);
}
function leafRN(node, sub6) {
  if (node.kind === "resistor") return node.ohms * (node.unit === "kohm" ? 1e3 : 1);
  if (node.kind === "lamp") return node.ratedVolts * node.ratedVolts / node.ratedWatts;
  if (sub6 && sub6.name === node.name) return sub6.Rn;
  throw new Error(`unknown_resistor "${node.name}" ch\u01B0a c\xF3 gi\xE1 tr\u1ECB`);
}
function reduceR(node, sub6) {
  if (node.kind === "series") return node.items.map((i) => reduceR(i, sub6)).reduce((a, b) => add2(a, b), ZERO2);
  if (node.kind === "parallel") {
    const invSum = node.items.map((i) => div(ONE, reduceR(i, sub6))).reduce((a, b) => add2(a, b), ZERO2);
    return div(ONE, invSum);
  }
  return leafR(node, sub6);
}
function reduceRN(node, sub6) {
  if (node.kind === "series") return node.items.reduce((s, i) => s + reduceRN(i, sub6), 0);
  if (node.kind === "parallel") return 1 / node.items.reduce((s, i) => s + 1 / reduceRN(i, sub6), 0);
  return leafRN(node, sub6);
}
function distribute(node, drive, sub6, vals, byName, lampInfo) {
  const R = reduceR(node, sub6), Rn = reduceRN(node, sub6);
  let I, U, In, Un;
  if (drive.mode === "I") {
    I = drive.valS;
    In = drive.valN;
    U = mul(I, R);
    Un = In * Rn;
  } else {
    U = drive.valS;
    Un = drive.valN;
    I = div(U, R);
    In = Un / Rn;
  }
  const kind = node.kind === "series" ? "group_series" : node.kind === "parallel" ? "group_parallel" : node.kind;
  vals.set(node, { kind, R, I, U, P: mul(U, I), Rn, In, Un, Pn: Un * In });
  if (node.kind === "series") {
    if (node.name) byName.set(node.name, node);
    for (const it of node.items) distribute(it, { mode: "I", valS: I, valN: In }, sub6, vals, byName, lampInfo);
  } else if (node.kind === "parallel") {
    if (node.name) byName.set(node.name, node);
    for (const it of node.items) distribute(it, { mode: "U", valS: U, valN: Un }, sub6, vals, byName, lampInfo);
  } else {
    byName.set(node.name, node);
    if (node.kind === "lamp") {
      const iRated = div(scalarFromNumber(node.ratedWatts), scalarFromNumber(node.ratedVolts));
      lampInfo.set(node.name, { iRated, iRatedN: node.ratedWatts / node.ratedVolts });
    }
  }
}
function solveCircuit(source, root, sub6) {
  const emfN = source.emf, rN = source.r ?? 0;
  const emf = scalarFromNumber(emfN), r2 = scalarFromNumber(rN);
  const rTotal = reduceR(root, sub6), rTotalN = reduceRN(root, sub6);
  const iMain = div(emf, add2(rTotal, r2)), iMainN = emfN / (rTotalN + rN);
  const uExternal = mul(iMain, rTotal), uExternalN = iMainN * rTotalN;
  const vals = /* @__PURE__ */ new Map();
  const byName = /* @__PURE__ */ new Map();
  const lampInfo = /* @__PURE__ */ new Map();
  distribute(root, { mode: "I", valS: iMain, valN: iMainN }, sub6, vals, byName, lampInfo);
  return { emf, r: r2, emfN, rN, rTotal, rTotalN, iMain, iMainN, uExternal, uExternalN, root, vals, byName, lampInfo };
}
function rowOf(solved, of) {
  if (of === void 0) return solved.vals.get(solved.root);
  const node = solved.byName.get(of);
  if (!node) throw new Error(`kh\xF4ng c\xF3 ph\u1EA7n t\u1EED t\xEAn "${of}" trong b\u1EA3ng`);
  return solved.vals.get(node);
}
function containsUnknown(node) {
  if (node.kind === "unknown_resistor") return true;
  if (node.kind === "series" || node.kind === "parallel") return node.items.some(containsUnknown);
  return false;
}
function mobius(node) {
  if (node.kind === "unknown_resistor") return { a: ONE, b: ZERO2, c: ZERO2, d: ONE };
  if (node.kind === "resistor" || node.kind === "lamp") return { a: ZERO2, b: leafR(node), c: ZERO2, d: ONE };
  const withX = node.items.filter(containsUnknown);
  const without = node.items.filter((i) => !containsUnknown(i));
  if (withX.length === 0) return { a: ZERO2, b: reduceR(node), c: ZERO2, d: ONE };
  const M = mobius(withX[0]);
  if (without.length === 0) return M;
  if (node.kind === "series") {
    const C2 = without.map((i) => reduceR(i)).reduce((a, b) => add2(a, b), ZERO2);
    return { a: add2(M.a, mul(M.c, C2)), b: add2(M.b, mul(M.d, C2)), c: M.c, d: M.d };
  }
  const invSum = without.map((i) => div(ONE, reduceR(i))).reduce((a, b) => add2(a, b), ZERO2);
  const C = div(ONE, invSum);
  return { a: mul(C, M.a), b: mul(C, M.b), c: add2(M.a, mul(C, M.c)), d: add2(M.b, mul(C, M.d)) };
}
function solveUnknown(source, root, _unknownName, targetCurrent) {
  const emfN = source.emf, rN = source.r ?? 0;
  const emf = scalarFromNumber(emfN), r2 = scalarFromNumber(rN);
  const targetS = scalarFromNumber(targetCurrent);
  const Rneed = sub2(div(emf, targetS), r2);
  const RneedN = emfN / targetCurrent - rN;
  if (RneedN <= EPS_SELF2) {
    return { ok: false, message: `d\xF2ng y\xEAu c\u1EA7u I = ${targetCurrent} A l\u1EDBn h\u01A1n m\u1EE9c ngu\u1ED3n c\u1EA5p n\u1ED5i (R c\u1EA7n = ${RneedN.toFixed(4)} \u2264 0)` };
  }
  const { a, b, c, d } = mobius(root);
  const denom = sub2(a, mul(c, Rneed));
  const denomN = a.approx - c.approx * RneedN;
  if (Math.abs(denomN) < EPS_SELF2) {
    return { ok: false, message: `R_t\u0111 kh\xF4ng \u0111\u1EA1t \u0111\u01B0\u1EE3c gi\xE1 tr\u1ECB ${RneedN.toFixed(4)} \u03A9 (m\u1EABu M\xF6bius suy bi\u1EBFn)` };
  }
  const x = div(sub2(mul(d, Rneed), b), denom);
  const xN = (d.approx * RneedN - b.approx) / denomN;
  if (xN <= EPS_SELF2) {
    return { ok: false, message: `gi\xE1 tr\u1ECB \u0111i\u1EC7n tr\u1EDF kh\xF4ng d\u01B0\u01A1ng (Rx = ${xN.toFixed(4)} \u03A9) \u2014 m\xF4 h\xECnh kh\xF4ng kh\u1EDBp \u0111\u1EC1` };
  }
  return { ok: true, x, xN, Rneed, RneedN };
}

// api/_lib/kernel/physics/circuitCompute.ts
var TIME_TO_S = { s: rat(1n), min: rat(60n), h: rat(3600n) };
var TIME_TO_S_N = { s: 1, min: 60, h: 3600 };
var OUT_DIV = { J: rat(1n), kJ: rat(1000n), Wh: rat(3600n), kWh: rat(3600000n) };
var OUT_DIV_N = { J: 1, kJ: 1e3, Wh: 3600, kWh: 36e5 };
function fmtNum5(x) {
  if (!Number.isFinite(x)) return "(l\u1ED7i)";
  if (x !== 0 && Math.abs(x) < 1e-3) return parseFloat(x.toPrecision(4)).toString();
  const digits = Math.abs(x) >= 1e3 ? 2 : 4;
  return parseFloat(x.toFixed(digits)).toString();
}
function mkAns(kind, s, floatRef, unit, label, verdict) {
  const tol = 1e-6 * Math.max(1, Math.abs(floatRef));
  if (s.exact !== null && Math.abs(exactToApprox(s.exact) - floatRef) <= tol) {
    return { label, kind, text: displayScalar(s), approx: exactToApprox(s.exact), unit, approximate: false, verdict };
  }
  const nice = Number.isFinite(floatRef) ? recognizeConstant(floatRef) : null;
  return { label, kind, text: nice ? nice.text : fmtNum5(floatRef), approx: floatRef, unit, approximate: !nice, verdict };
}
function computeCircuitQuery(solved, query) {
  try {
    switch (query.kind) {
      case "resistance": {
        const row = rowOf(solved, query.of);
        return { ok: true, answer: mkAns("resistance", row.R, row.Rn, "\u03A9", query.label) };
      }
      case "current": {
        const row = rowOf(solved, query.of);
        return { ok: true, answer: mkAns("current", row.I, row.In, "A", query.label) };
      }
      case "voltage": {
        const row = rowOf(solved, query.of);
        return { ok: true, answer: mkAns("voltage", row.U, row.Un, "V", query.label) };
      }
      case "power": {
        const row = rowOf(solved, query.of);
        return { ok: true, answer: mkAns("power", row.P, row.Pn, "W", query.label) };
      }
      case "power_source": {
        let s, n;
        if (query.part === "internal") {
          s = mul(mul(solved.iMain, solved.iMain), solved.r);
          n = solved.iMainN * solved.iMainN * solved.rN;
        } else if (query.part === "external") {
          s = mul(solved.uExternal, solved.iMain);
          n = solved.uExternalN * solved.iMainN;
        } else {
          s = mul(solved.emf, solved.iMain);
          n = solved.emfN * solved.iMainN;
        }
        return { ok: true, answer: mkAns("power_source", s, n, "W", query.label) };
      }
      case "energy":
      case "energy_source": {
        const tSec = mul(scalarFromNumber(query.t), TIME_TO_S[query.tUnit ?? "s"]);
        const tSecN = query.t * TIME_TO_S_N[query.tUnit ?? "s"];
        let joule, jouleN;
        if (query.kind === "energy") {
          const row = rowOf(solved, query.of);
          joule = mul(row.P, tSec);
          jouleN = row.Pn * tSecN;
        } else {
          joule = mul(mul(solved.emf, solved.iMain), tSec);
          jouleN = solved.emfN * solved.iMainN * tSecN;
        }
        const out = div(joule, OUT_DIV[query.unit ?? "J"]);
        const outN = jouleN / OUT_DIV_N[query.unit ?? "J"];
        return { ok: true, answer: mkAns(query.kind, out, outN, query.unit ?? "J", query.label) };
      }
      case "efficiency": {
        const s = mul(div(solved.uExternal, solved.emf), rat(100n));
        const n = solved.uExternalN / solved.emfN * 100;
        return { ok: true, answer: mkAns("efficiency", s, n, "%", query.label) };
      }
      case "lamp_check": {
        const row = rowOf(solved, query.of);
        const li = solved.lampInfo.get(query.of);
        if (!li) return { ok: false, problem: `lamp_check: "${query.of}" kh\xF4ng ph\u1EA3i \u0111\xE8n` };
        const ratio = div(row.I, li.iRated), ratioN = row.In / li.iRatedN;
        const cmp = cmpScalar(ratio, rat(1n));
        const verdict = cmp === 0 ? "sang_binh_thuong" : cmp < 0 ? "sang_yeu" : "sang_manh";
        return { ok: true, answer: mkAns("lamp_check", ratio, ratioN, "", query.label, verdict) };
      }
      case "solve_resistance": {
        const row = rowOf(solved, query.of);
        return { ok: true, answer: mkAns("solve_resistance", row.R, row.Rn, "\u03A9", query.label) };
      }
      default: {
        query;
        return { ok: false, problem: `query kind kh\xF4ng h\u1ED7 tr\u1EE3: ${query.kind}` };
      }
    }
  } catch (e) {
    return { ok: false, problem: e.message };
  }
}

// api/_lib/kernel/physics/circuitKirchhoff.ts
var ZERO3 = rat(0n);
function resCheck(kind, detail, resid, scaleN) {
  const e = resid.exact;
  const residual = e !== null ? exactToApprox(e) : resid.approx;
  const pass = e !== null ? e.num === 0n : Math.abs(resid.approx) <= EPS_SELF2 * Math.max(1, scaleN);
  return { kind, detail, residual, pass };
}
function selfChecks(solved, opts) {
  const { vals, root, emf, r: r2, iMain, uExternal, rTotal } = solved;
  const scaleN = Math.max(1, Math.abs(solved.emfN), Math.abs(solved.uExternalN), Math.abs(solved.iMainN));
  const checks = [];
  const V = (n) => vals.get(n);
  checks.push(resCheck("K1", "U_N = E \u2212 I\xB7r", sub2(uExternal, sub2(emf, mul(iMain, r2))), scaleN));
  const visit = (node) => {
    if (node.kind === "series") {
      const sumU = node.items.reduce((s, it) => add2(s, V(it).U), ZERO3);
      checks.push(resCheck("K1", `\u03A3 U(item) = U(${node.name ?? "series"})`, sub2(sumU, V(node).U), scaleN));
      node.items.forEach(visit);
    } else if (node.kind === "parallel") {
      const sumI = node.items.reduce((s, it) => add2(s, V(it).I), ZERO3);
      checks.push(resCheck("K2", `\u03A3 I(item) = I(${node.name ?? "parallel"})`, sub2(sumI, V(node).I), scaleN));
      for (const it of node.items) {
        checks.push(resCheck("K2", `U nh\xE1nh = U(${node.name ?? "parallel"})`, sub2(V(it).U, V(node).U), scaleN));
        visit(it);
      }
    }
  };
  visit(root);
  const leafP = (node) => node.kind === "series" || node.kind === "parallel" ? node.items.reduce((s, it) => add2(s, leafP(it)), ZERO3) : V(node).P;
  const k3 = sub2(add2(leafP(root), mul(mul(iMain, iMain), r2)), mul(emf, iMain));
  checks.push(resCheck("K3", "\u03A3 P_l\xE1 + I\xB2\xB7r = E\xB7I", k3, scaleN));
  if (opts.efficiency) {
    checks.push(resCheck("K4", "U_N/E = R_t\u0111/(R_t\u0111 + r)", sub2(div(uExternal, emf), div(rTotal, add2(rTotal, r2))), scaleN));
  }
  if (opts.backsub) {
    checks.push(resCheck("solve_backsub", "I_ch\xEDnh(m\u1EA1ch \u0111\xE3 th\u1EBF) = I_target", sub2(iMain, opts.backsub.targetI), scaleN));
  }
  return checks;
}

// api/_lib/kernel/physics/circuitLayout.ts
function size(node) {
  if (node.kind === "series") {
    return node.items.reduce((b, it) => {
      const s = size(it);
      return { w: b.w + s.w, h: Math.max(b.h, s.h) };
    }, { w: 0, h: 0 });
  }
  if (node.kind === "parallel") {
    return node.items.reduce((b, it) => {
      const s = size(it);
      return { w: Math.max(b.w, s.w), h: b.h + s.h };
    }, { w: 0, h: 0 });
  }
  return { w: 1, h: 1 };
}
function valueTextOf(node) {
  if (node.kind === "resistor") return `${node.ohms} ${node.unit === "kohm" ? "k\u03A9" : "\u03A9"}`;
  if (node.kind === "lamp") return `${node.ratedVolts} V \u2013 ${node.ratedWatts} W`;
  return `${node.name} = ?`;
}
function buildLayout(plan) {
  const elements = [];
  const junctions = [];
  const wires = [];
  let jid = 0;
  const place = (node, x, y) => {
    if (node.kind === "series") {
      let cx = x;
      let prevRight = null;
      for (const it of node.items) {
        const s = size(it);
        place(it, cx, y);
        const left = [cx, y];
        if (prevRight) wires.push({ from: prevRight, to: left });
        prevRight = [cx + s.w, y];
        cx += s.w;
      }
      return;
    }
    if (node.kind === "parallel") {
      const box = size(node);
      const jLeft = { id: `j${jid++}`, at: [x, y] };
      const jRight = { id: `j${jid++}`, at: [x + box.w, y] };
      junctions.push(jLeft, jRight);
      let cy = y;
      for (const it of node.items) {
        const s = size(it);
        place(it, x, cy);
        wires.push({ from: jLeft.at, to: [x, cy] });
        wires.push({ from: [x + box.w, cy], to: jRight.at });
        cy += s.h;
      }
      return;
    }
    elements.push({ id: node.name, type: node.kind, name: node.name, valueText: valueTextOf(node), cell: { x, y, w: 1, h: 1 } });
  };
  const rootBox = size(plan.circuit);
  place(plan.circuit, 0, 0);
  const srcY = rootBox.h;
  const rParts = plan.source.r !== void 0 ? `; r = ${plan.source.r} \u03A9` : "";
  elements.push({
    id: "src",
    type: "source",
    name: "nguon",
    valueText: `E = ${plan.source.emf} V${rParts}`,
    cell: { x: 0, y: srcY, w: 1, h: 1 }
  });
  wires.push({ from: [0, 0], to: [0, srcY] });
  wires.push({ from: [rootBox.w, 0], to: [rootBox.w, srcY] });
  wires.push({ from: [0, srcY], to: [rootBox.w, srcY] });
  return {
    grid: { cols: Math.max(1, rootBox.w) + 1, rows: srcY + 1 },
    elements,
    junctions,
    wires
  };
}

// api/_lib/kernel/physics/runCircuit.ts
var TOL_ASSERT2 = 1e-3;
var pair = (s) => ({ text: displayScalar(s), approx: s.approx });
var EMPTY_LAYOUT = { grid: { cols: 1, rows: 1 }, elements: [], junctions: [], wires: [] };
var ZERO_META = { iMain: { text: "0", approx: 0 }, uExternal: { text: "0", approx: 0 }, rTotal: { text: "0", approx: 0 }, unitsNote: "SI" };
function findUnknown(node) {
  if (node.kind === "unknown_resistor") return node.name;
  if (node.kind === "series" || node.kind === "parallel") {
    for (const it of node.items) {
      const f = findUnknown(it);
      if (f) return f;
    }
  }
  return null;
}
function buildTable(solved) {
  const rows = [];
  const rowFrom = (name, v, kind) => ({
    name,
    kind,
    R: mkAns("resistance", v.R, v.Rn, "\u03A9"),
    U: mkAns("voltage", v.U, v.Un, "V"),
    I: mkAns("current", v.I, v.In, "A"),
    P: mkAns("power", v.P, v.Pn, "W")
  });
  for (const [name, node] of solved.byName) rows.push(rowFrom(name, solved.vals.get(node), solved.vals.get(node).kind));
  rows.push(rowFrom("_ngoai", solved.vals.get(solved.root), "external"));
  return rows;
}
function runCircuit(raw) {
  const parsed = CircuitPlanSchema.safeParse(raw);
  if (!parsed.success) {
    const iss = parsed.error.issues[0];
    const detail = iss ? `${iss.path.length ? `${iss.path.join(".")}: ` : ""}${iss.message}` : "schema";
    return {
      ok: false,
      answers: [],
      checks: [],
      violations: [],
      errors: [{ message: `Invalid circuit plan: ${detail}` }],
      geometry: null,
      table: [],
      circuitLayout: EMPTY_LAYOUT,
      meta: ZERO_META
    };
  }
  const plan = parsed.data;
  const errors = [];
  const layout = buildLayout(plan);
  const geometry = { name: plan.problemName, points: [], lines: [], tags: ["physics", "circuit"] };
  const unknownName = findUnknown(plan.circuit);
  let solved;
  let backsub2;
  try {
    if (unknownName) {
      const sq = plan.queries.find((q) => q.kind === "solve_resistance");
      if (!sq || sq.kind !== "solve_resistance") throw new Error("thi\u1EBFu query solve_resistance cho \u1EA9n");
      const targetN = sq.targetCurrent * (sq.targetCurrentUnit === "mA" ? 1e-3 : 1);
      const res = solveUnknown(plan.source, plan.circuit, unknownName, targetN);
      if (res.ok === false) {
        return { ok: false, answers: [], checks: [], violations: [], errors: [{ message: res.message }], geometry, table: [], circuitLayout: layout, meta: ZERO_META };
      }
      solved = solveCircuit(plan.source, plan.circuit, { name: unknownName, R: res.x, Rn: res.xN });
      backsub2 = { targetI: scalarFromNumber(targetN), targetIN: targetN };
    } else {
      solved = solveCircuit(plan.source, plan.circuit);
    }
  } catch (e) {
    return { ok: false, answers: [], checks: [], violations: [], errors: [{ message: e.message }], geometry, table: [], circuitLayout: layout, meta: ZERO_META };
  }
  const answers = [];
  for (const [qi, q] of plan.queries.entries()) {
    const r2 = computeCircuitQuery(solved, q);
    if (r2.ok === false) {
      errors.push({ message: `query ${q.kind}: ${r2.problem}` });
      continue;
    }
    answers.push({ ...r2.answer, queryIndex: qi });
  }
  const hasEfficiency = plan.queries.some((q) => q.kind === "efficiency") || plan.asserts.some((a) => a.query.kind === "efficiency");
  const checks = selfChecks(solved, { efficiency: hasEfficiency, backsub: backsub2 });
  if (solved.lampInfo.size > 0) checks.push({ kind: "assumption", detail: "R \u0111\xE8n coi nh\u01B0 kh\xF4ng \u0111\u1ED5i (R = U_\u0111m\xB2/P_\u0111m)", residual: 0, pass: true });
  for (const c of checks) if (!c.pass) errors.push({ message: `t\u1EF1 ki\u1EC3m FAIL: ${c.detail} (residual ${c.residual.toExponential(2)})` });
  const violations = [];
  for (const a of plan.asserts) {
    const r2 = computeCircuitQuery(solved, a.query);
    if (r2.ok === false) {
      errors.push({ message: `assert ${a.query.kind}: ${r2.problem}` });
      continue;
    }
    const tol = (a.tol ?? TOL_ASSERT2) * Math.max(1, Math.abs(a.equals));
    const delta = Math.abs(r2.answer.approx - a.equals);
    if (delta > tol) violations.push({ assert: a.query.kind, expected: a.equals, got: r2.answer.approx, delta });
  }
  const table = buildTable(solved);
  const meta = { iMain: pair(solved.iMain), uExternal: pair(solved.uExternal), rTotal: pair(solved.rTotal), unitsNote: "SI" };
  const ok = violations.length === 0 && errors.length === 0 && answers.length === plan.queries.length && answers.every((a) => Number.isFinite(a.approx));
  return { ok, answers, checks, violations, errors, geometry, table, circuitLayout: layout, meta };
}

// api/_lib/kernel/physics/dynamicsSchema.ts
var Num3 = external_exports.number().finite();
var Obj2 = external_exports.string().min(1);
var BodyOp = external_exports.object({
  op: external_exports.literal("body"),
  name: Obj2,
  // OPTIONAL: bài nghiêng thuần-gia-tốc đề KHÔNG cho m (a = g(sinθ − μcosθ) không cần m) — cấm LLM bịa.
  // Query/cấu hình cần m mà thiếu ⇒ error rõ "cần khối lượng của <name>" (tầng giải).
  mass: Num3.positive().optional(),
  massUnit: external_exports.enum(["kg", "g", "tan"]).default("kg"),
  on: external_exports.enum(["horizontal", "incline", "hanging"]).default("horizontal"),
  inclineDeg: Num3.optional(),
  // BẮT BUỘC khi on='incline' (superRefine), 0 < θ < 90
  mu: Num3.min(0).optional(),
  // hệ số ma sát trượt; bỏ trống = nhẵn. Lớp 10: cũng là ma sát nghỉ cực đại.
  motion: external_exports.enum(["down", "up"]).optional(),
  // CHỈ incline: chiều chuyển động THEO ĐỀ; mặc định 'down'
  v0: Num3.min(0).default(0),
  // TỐC ĐỘ đầu dọc chiều chuyển động (≥ 0; chiều nằm ở motion/lực kéo)
  v0Unit: external_exports.enum(["m/s", "km/h"]).default("m/s")
});
var ForceOp = external_exports.object({
  op: external_exports.literal("force"),
  on: Obj2,
  // CHỈ lực NGOÀI đề cho. Trọng lực/phản lực/ma sát/căng: engine tự sinh.
  value: Num3.positive(),
  unit: external_exports.enum(["N", "kN"]).default("N"),
  // so với PHƯƠNG MẶT TỰA (phương chuyển động); dương = chếch lên, âm = chếch xuống; |α| < 90.
  // V1: chỉ ≠ 0 khi mặt ngang (superRefine).
  angleDeg: Num3.default(0),
  direction: external_exports.enum(["forward", "backward"]).default("forward")
  // "lực kéo"/"lực cản" — chép lời đề
});
var StringOp = external_exports.object({ op: external_exports.literal("string"), between: external_exports.tuple([Obj2, Obj2]) });
var DynamicsOpSchema = external_exports.discriminatedUnion("op", [BodyOp, ForceOp, StringOp]);
var VUnit = external_exports.enum(["m/s", "km/h"]).default("m/s");
var DynamicsQuerySchema = external_exports.discriminatedUnion("kind", [
  // — Động lực học —
  // ĐẠI SỐ theo chiều dương (= chiều chuyển động): hệ ròng rọc luôn ra dương; vật hãm ra ÂM (B04).
  // 'of' bỏ trống = gia tốc hệ (2 vật chung |a|); có 'of' phải là body tồn tại.
  external_exports.object({ kind: external_exports.literal("acceleration"), of: Obj2.optional(), label: external_exports.string().optional() }),
  // Trả ĐỘ LỚN (≥0): tension = lực căng dây; friction = μN; weight = mg; net = m·|a| (hợp lực).
  external_exports.object({
    kind: external_exports.literal("force_value"),
    force: external_exports.enum(["tension", "friction", "weight", "net"]),
    on: Obj2,
    label: external_exports.string().optional()
  }),
  external_exports.object({ kind: external_exports.literal("normal_force"), on: Obj2, label: external_exports.string().optional() }),
  // N (độ lớn)
  // F_min để vật BẮT ĐẦU trượt trên mặt ngang (μ nghỉ = mu). KHÔNG khai op force (giá trị là ẩn số).
  // DY-1 (§17.3): v1 CHỈ nhận α = 0 — SCHEMA CHẶN bằng z.literal(0); α ≠ 0 fail parse với lỗi tiếng Việt.
  external_exports.object({
    kind: external_exports.literal("min_force_to_move"),
    on: Obj2,
    angleDeg: external_exports.literal(0, { errorMap: () => ({ message: "min_force_to_move v1 ch\u1EC9 nh\u1EADn angleDeg = 0 (\u03B1 \u2260 0 \u0111\u1EC3 v2)" }) }).default(0),
    label: external_exports.string().optional()
  }),
  // — Kế thừa động học v0 (chạy trên gia tốc engine vừa tính; §8) —
  external_exports.object({ kind: external_exports.literal("velocity_at"), of: Obj2, t: Num3.positive(), label: external_exports.string().optional() }),
  // x0 = 0 và chuyển động không đổi chiều trong miền hợp lệ ⇒ position = QUÃNG ĐƯỜNG.
  external_exports.object({ kind: external_exports.literal("position_at"), of: Obj2, t: Num3.positive(), label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("time_when"), of: Obj2, position: Num3.positive(), label: external_exports.string().optional() }),
  // F3: đạt tốc độ cho trước; value: 0 = lúc dừng. DY-3 — chính tả field THEO V0 (`value`/`vUnit`).
  external_exports.object({
    kind: external_exports.literal("time_when_velocity"),
    of: Obj2,
    value: Num3.min(0),
    vUnit: VUnit,
    label: external_exports.string().optional()
  }),
  // v = √(v0² + 2as) — "vận tốc ở chân dốc" (LLM không chain được).
  external_exports.object({ kind: external_exports.literal("velocity_after_distance"), of: Obj2, distance: Num3.positive(), label: external_exports.string().optional() }),
  // s = v0²/(2|a|)
  external_exports.object({ kind: external_exports.literal("distance_to_stop"), of: Obj2, label: external_exports.string().optional() })
]);
var DynamicsPlanSchema = external_exports.object({
  problemName: external_exports.string().min(1),
  // KHÔNG default (chống hard-code, như v0). Optional vì bài "ngang nhẵn thuần lực" (B01, B10) không cần g.
  // Mô hình cần trọng lực (mu / incline / hanging / query N, weight, min_force) mà thiếu g ⇒ error rõ.
  g: Num3.positive().optional(),
  ops: external_exports.array(DynamicsOpSchema).min(1),
  queries: external_exports.array(DynamicsQuerySchema).min(1),
  asserts: external_exports.array(external_exports.object({ query: DynamicsQuerySchema, equals: Num3, tol: Num3.positive().optional() })).default([]),
  // dữ kiện DƯ của đề, như v0 §7.2
  charts: external_exports.array(external_exports.object({ kind: external_exports.enum(["x_t", "v_t"]), of: external_exports.array(Obj2).min(1) })).default([]),
  scene: external_exports.object({ durationSec: Num3.positive().optional(), labels: external_exports.record(external_exports.string(), external_exports.string()).optional() }).default({})
}).superRefine((plan, ctx) => {
  const bodies = plan.ops.filter((o) => o.op === "body");
  const forces = plan.ops.filter((o) => o.op === "force");
  const strings = plan.ops.filter((o) => o.op === "string");
  const byName = new Map(bodies.map((b) => [b.name, b]));
  const issue = (message) => ctx.addIssue({ code: external_exports.ZodIssueCode.custom, message });
  const seen = /* @__PURE__ */ new Set();
  for (const b of bodies) {
    if (seen.has(b.name)) issue(`v\u1EADt "${b.name}" khai b\xE1o 2 l\u1EA7n`);
    seen.add(b.name);
  }
  for (const b of bodies) {
    if (b.on === "incline") {
      if (b.inclineDeg === void 0) issue(`v\u1EADt "${b.name}" tr\xEAn m\u1EB7t nghi\xEAng thi\u1EBFu inclineDeg`);
      else if (!(b.inclineDeg > 0 && b.inclineDeg < 90)) issue(`inclineDeg c\u1EE7a "${b.name}" ph\u1EA3i trong kho\u1EA3ng (0, 90), nh\u1EADn ${b.inclineDeg}`);
    } else if (b.inclineDeg !== void 0) {
      issue(`inclineDeg ch\u1EC9 h\u1EE3p l\u1EC7 v\u1EDBi on='incline' (v\u1EADt "${b.name}")`);
    }
    if (b.motion !== void 0 && b.on !== "incline") issue(`motion ch\u1EC9 h\u1EE3p l\u1EC7 v\u1EDBi on='incline' (v\u1EADt "${b.name}")`);
    if (b.mu !== void 0 && b.on === "hanging") issue(`v\u1EADt treo "${b.name}" kh\xF4ng \u0111\u01B0\u1EE3c khai mu (kh\xF4ng c\xF3 m\u1EB7t t\u1EF1a)`);
  }
  if (bodies.length < 1) issue("c\u1EA7n \xEDt nh\u1EA5t 1 v\u1EADt (op body)");
  if (bodies.length > 2) issue(`v1 ch\u1EC9 h\u1ED7 tr\u1EE3 t\u1ED1i \u0111a 2 v\u1EADt, nh\u1EADn ${bodies.length}`);
  if (bodies.length === 2 && strings.length !== 1) issue(`h\u1EC7 2 v\u1EADt c\u1EA7n \u0111\xFAng 1 d\xE2y (string), nh\u1EADn ${strings.length}`);
  if (bodies.length === 1 && strings.length > 0) issue("h\u1EC7 1 v\u1EADt kh\xF4ng \u0111\u01B0\u1EE3c khai string");
  for (const s of strings) {
    const [a, b] = s.between;
    if (a === b) issue(`d\xE2y n\u1ED1i hai \u0111\u1EA7u tr\xF9ng "${a}"`);
    if (!byName.has(a)) issue(`d\xE2y tr\u1ECF t\u1EDBi v\u1EADt "${a}" kh\xF4ng t\u1ED3n t\u1EA1i`);
    if (!byName.has(b)) issue(`d\xE2y tr\u1ECF t\u1EDBi v\u1EADt "${b}" kh\xF4ng t\u1ED3n t\u1EA1i`);
  }
  if (bodies.length === 2 && strings.length === 1) {
    const ons = bodies.map((b) => b.on).sort().join("+");
    if (ons !== "hanging+hanging" && ons !== "hanging+horizontal") {
      issue(`c\u1EA5u h\xECnh h\u1EC7 2 v\u1EADt "${bodies.map((b) => b.on).join(" + ")}" ch\u01B0a h\u1ED7 tr\u1EE3 v1 (ch\u1EC9 Atwood treo+treo ho\u1EB7c b\xE0n ngang+treo)`);
    }
    for (const b of bodies) if (b.v0 !== 0) issue(`h\u1EC7 2 v\u1EADt v1 ph\u1EA3i xu\u1EA5t ph\xE1t t\u1EEB ngh\u1EC9 (v\u1EADt "${b.name}" khai v0 = ${b.v0})`);
  }
  const inString = /* @__PURE__ */ new Set();
  for (const s of strings) inString.add(s.between[0]), inString.add(s.between[1]);
  for (const b of bodies) {
    if (b.on === "hanging" && !inString.has(b.name)) issue(`v\u1EADt treo "${b.name}" ph\u1EA3i n\u1EB1m trong m\u1ED9t d\xE2y (v1 kh\xF4ng c\xF3 h\u1EC7 treo \u0111\u01A1n / thang m\xE1y)`);
  }
  for (const f of forces) {
    const b = byName.get(f.on);
    if (!b) {
      issue(`l\u1EF1c t\xE1c d\u1EE5ng l\xEAn v\u1EADt "${f.on}" kh\xF4ng t\u1ED3n t\u1EA1i`);
      continue;
    }
    if (Math.abs(f.angleDeg) >= 90) issue(`g\xF3c l\u1EF1c |\u03B1| ph\u1EA3i < 90 (v\u1EADt "${f.on}", nh\u1EADn ${f.angleDeg})`);
    if (b.on === "incline" && f.angleDeg !== 0) issue(`l\u1EF1c tr\xEAn m\u1EB7t nghi\xEAng ch\u1EC9 \u0111\u01B0\u1EE3c d\u1ECDc m\u1EB7t d\u1ED1c (angleDeg = 0), v\u1EADt "${f.on}"`);
    if (b.on === "hanging") issue(`v1 kh\xF4ng nh\u1EADn l\u1EF1c ngo\xE0i tr\xEAn v\u1EADt treo "${f.on}"`);
  }
  const refBody = (name, where) => {
    if (name !== void 0 && !byName.has(name)) issue(`${where} tr\u1ECF t\u1EDBi v\u1EADt "${name}" kh\xF4ng t\u1ED3n t\u1EA1i`);
  };
  for (const q of plan.queries) {
    if (q.kind === "acceleration") refBody(q.of, `query ${q.kind}`);
    else if ("on" in q) refBody(q.on, `query ${q.kind}`);
    else if ("of" in q) refBody(q.of, `query ${q.kind}`);
  }
});

// api/_lib/kernel/physics/dynamics.ts
var EPS_SELF3 = 1e-6;
var SI2 = { length: "m", time: "s" };
var ZERO4 = rat(0n);
var HALF2 = rat(1n, 2n);
var PHYSICAL_VIOLATIONS = /* @__PURE__ */ new Set(["vat-khong-truot", "he-khong-chuyen-dong", "phan-luc-am", "day-chung"]);
function convMass(b) {
  const mv = b.mass;
  if (b.massUnit === "g") return { s: mul(scalarFromNumber(mv), rat(1n, 1000n)), n: mv / 1e3 };
  if (b.massUnit === "tan") return { s: mul(scalarFromNumber(mv), rat(1000n)), n: mv * 1e3 };
  return { s: scalarFromNumber(mv), n: mv };
}
function convForce(f) {
  return f.unit === "kN" ? { s: mul(scalarFromNumber(f.value), rat(1000n)), n: f.value * 1e3 } : { s: scalarFromNumber(f.value), n: f.value };
}
function fmtNum6(x) {
  if (!Number.isFinite(x)) return "(l\u1ED7i)";
  if (x !== 0 && Math.abs(x) < 1e-3) return parseFloat(x.toPrecision(4)).toString();
  const digits = Math.abs(x) >= 1e3 ? 2 : 4;
  return parseFloat(x.toFixed(digits)).toString();
}
function mkAns2(kind, s, floatRef, unit, label) {
  const tol = 1e-6 * Math.max(1, Math.abs(floatRef));
  if (s.exact !== null && Math.abs(exactToApprox(s.exact) - floatRef) <= tol) {
    return { label, kind, text: displayScalar(s), approx: exactToApprox(s.exact), unit, approximate: false };
  }
  const nice = Number.isFinite(floatRef) ? recognizeConstant(floatRef) : null;
  return { label, kind, text: nice ? nice.text : fmtNum6(floatRef), approx: floatRef, unit, approximate: !nice };
}
function resCheck2(kind, detail, resid, scaleN) {
  const e = resid.exact;
  const residual = e !== null ? exactToApprox(e) : resid.approx;
  const pass = e !== null ? e.num === 0n : Math.abs(resid.approx) <= EPS_SELF3 * Math.max(1, scaleN);
  return { kind, detail, residual, pass };
}
function solveSingle(body, forcesOn, gS, gN, needsMotion, checks, violations) {
  const reqG = () => {
    if (gS === void 0 || gN === void 0) throw new Error('c\u1EA7n g (gia t\u1ED1c tr\u1ECDng tr\u01B0\u1EDDng) cho m\xF4 h\xECnh n\xE0y \u2014 b\u1ED5 sung "g" v\xE0o plan');
    return { s: gS, n: gN };
  };
  const mass = body.mass !== void 0 ? convMass(body) : void 0;
  const reqMass = () => {
    if (!mass) throw new Error(`c\u1EA7n kh\u1ED1i l\u01B0\u1EE3ng c\u1EE7a "${body.name}" cho \u0111\u1EA1i l\u01B0\u1EE3ng n\xE0y`);
    return mass;
  };
  const hasMu = body.mu !== void 0 && body.mu > 0;
  const mu = scalarFromNumber(body.mu ?? 0);
  const muN = body.mu ?? 0;
  const v0 = qtyVelocity(body.v0, body.v0Unit, SI2);
  const v0N = body.v0 * (body.v0Unit === "km/h" ? 5 / 18 : 1);
  const st = {
    name: body.name,
    op: body,
    config: body.on === "incline" ? "nghieng" : body.on === "hanging" ? "hanging" : "ngang",
    hasMass: !!mass,
    m: mass?.s,
    mN: mass?.n,
    hasMu,
    mu,
    muN,
    v0,
    v0N,
    moves: false,
    tStop: null,
    motionDesc: ""
  };
  let appAxial = ZERO4, appAxialN = 0, vertUp = ZERO4, vertUpN = 0;
  for (const f of forcesOn) {
    const F = convForce(f);
    const { cos, sin } = trigOf(f.angleDeg);
    const cosN = Math.cos(f.angleDeg * Math.PI / 180), sinN = Math.sin(f.angleDeg * Math.PI / 180);
    const sgn = f.direction === "backward" ? -1 : 1;
    appAxial = add2(appAxial, mul(F.s, f.direction === "backward" ? neg(cos) : cos));
    appAxialN += sgn * F.n * cosN;
    vertUp = add2(vertUp, mul(F.s, sin));
    vertUpN += F.n * sinN;
  }
  const hasApplied = forcesOn.length > 0;
  if (st.config === "ngang") {
    if (mass && gS !== void 0 && gN !== void 0) {
      st.N = sub2(mul(mass.s, gS), vertUp);
      st.NN = mass.n * gN - vertUpN;
      st.weight = mul(mass.s, gS);
      st.weightN = mass.n * gN;
      st.friction = mul(mu, st.N);
      st.frictionN = muN * st.NN;
      if (cmpScalar(st.N, ZERO4) < 0) violations.push({ id: "phan-luc-am", message: `ph\u1EA3n l\u1EF1c \xE2m (N = ${st.NN.toFixed(2)} N < 0): l\u1EF1c nh\u1EA5c v\u1EADt kh\u1ECFi m\u1EB7t t\u1EF1a, m\xF4 h\xECnh v1 kh\xF4ng ph\u1EE7` });
      checks.push(resCheck2("newton_axis", `tr\u1EE5c ph\xE1p "${body.name}": N + F\xB7sin\u03B1 \u2212 mg`, sub2(add2(st.N, vertUp), mul(mass.s, gS)), Math.max(1, st.NN)));
    }
    if (needsMotion) try {
      const m = reqMass();
      let fric = ZERO4, fricN = 0;
      if (hasMu) {
        reqG();
        fric = st.friction;
        fricN = st.frictionN;
      }
      if (body.v0 === 0 && hasMu) {
        if (cmpScalar(appAxial, fric) <= 0) {
          violations.push({ id: "vat-khong-truot", message: `l\u1EF1c ch\u01B0a th\u1EAFng ma s\xE1t ngh\u1EC9 (driving ${appAxialN.toFixed(2)} \u2264 \u03BCN ${fricN.toFixed(2)}), v\u1EADt kh\xF4ng tr\u01B0\u1EE3t. \u0110\u1EE9ng y\xEAn l\xE0 K\u1EBET QU\u1EA2 V\u1EACT L\xDD H\u1EE2P L\u1EC6 c\u1EE7a \u0111\u1EC1 \u2014 nh\u01B0ng v1 kh\xF4ng c\xF3 nh\xE1nh t\u0129nh (\xA73.2), kh\xF4ng serve \u0111\xE1p` });
        } else {
          checks.push({ kind: "static_threshold", detail: `driving ${appAxialN.toFixed(2)} > \u03BCN ${fricN.toFixed(2)} \u2014 v\u1EADt b\u1EAFt \u0111\u1EA7u tr\u01B0\u1EE3t`, residual: 0, pass: true });
        }
      }
      st.a = div(sub2(appAxial, fric), m.s);
      st.aN = (appAxialN - fricN) / m.n;
      st.moves = true;
      st.motionDesc = body.v0 > 0 ? "theo-v0" : "theo-luc-keo";
      checks.push(resCheck2("newton_axis", `tr\u1EE5c chuy\u1EC3n \u0111\u1ED9ng "${body.name}": \u03A3F \u2212 m\xB7a`, sub2(sub2(appAxial, fric), mul(m.s, st.a)), Math.max(1, Math.abs(appAxialN))));
    } catch (e) {
      st.blockReason = e.message;
    }
  } else if (st.config === "nghieng") {
    const theta = body.inclineDeg;
    const { cos, sin } = trigOf(theta);
    st.theta = theta;
    st.sinT = sin;
    st.cosT = cos;
    st.sinTN = Math.sin(theta * Math.PI / 180);
    st.cosTN = Math.cos(theta * Math.PI / 180);
    const down = (body.motion ?? "down") === "down";
    if (mass && gS !== void 0 && gN !== void 0) {
      st.N = mul(mul(mass.s, gS), cos);
      st.NN = mass.n * gN * st.cosTN;
      st.weight = mul(mass.s, gS);
      st.weightN = mass.n * gN;
      st.friction = mul(mu, st.N);
      st.frictionN = muN * st.NN;
      checks.push(resCheck2("newton_axis", `tr\u1EE5c ph\xE1p "${body.name}": N \u2212 mg\xB7cos\u03B8`, sub2(st.N, mul(mul(mass.s, gS), cos)), Math.max(1, st.NN)));
    }
    if (needsMotion) try {
      const g = reqG();
      const gSin = mul(g.s, sin), gSinN = g.n * st.sinTN;
      const gCosMu = mul(mu, mul(g.s, cos)), gCosMuN = muN * g.n * st.cosTN;
      if (body.v0 === 0 && hasMu && down) {
        if (cmpScalar(gSin, gCosMu) <= 0) {
          violations.push({ id: "vat-khong-truot", message: `chi\u1EC1u chuy\u1EC3n \u0111\u1ED9ng khai trong plan kh\xF4ng kh\u1EDBp m\xF4 h\xECnh: \u0111\u1EC1 khai v\u1EADt tr\u01B0\u1EE3t xu\u1ED1ng nh\u01B0ng tan\u03B8 = ${(st.sinTN / st.cosTN).toFixed(3)} \u2264 \u03BC = ${muN} \u2014 v\u1EADt kh\xF4ng tr\u01B0\u1EE3t theo chi\u1EC1u \u0111\xF3` });
        } else {
          checks.push({ kind: "static_threshold", detail: `g\xB7sin\u03B8 ${gSinN.toFixed(3)} > \u03BC\xB7g\xB7cos\u03B8 ${gCosMuN.toFixed(3)} \u2014 v\u1EADt tr\u01B0\u1EE3t xu\u1ED1ng`, residual: 0, pass: true });
        }
      }
      if (body.v0 === 0 && !down && !hasApplied) {
        violations.push({ id: "vat-khong-truot", message: `chi\u1EC1u chuy\u1EC3n \u0111\u1ED9ng khai trong plan kh\xF4ng kh\u1EDBp m\xF4 h\xECnh: khai motion:'up' v\u1EDBi v0 = 0 v\xE0 kh\xF4ng c\xF3 l\u1EF1c k\xE9o d\u1ECDc d\u1ED1c \u2014 v\u1EADt kh\xF4ng th\u1EC3 t\u1EF1 \u0111i l\xEAn` });
      }
      let appPerMass = ZERO4, appPerMassN = 0;
      if (hasApplied) {
        const m = reqMass();
        appPerMass = div(appAxial, m.s);
        appPerMassN = appAxialN / m.n;
      }
      const gAlong = down ? gSin : neg(gSin), gAlongN = down ? gSinN : -gSinN;
      st.a = sub2(add2(gAlong, appPerMass), gCosMu);
      st.aN = gAlongN + appPerMassN - gCosMuN;
      st.moves = true;
      st.motionDesc = down ? "xuong-doc" : "len-doc";
      if (mass) {
        const mgSin = down ? mul(mass.s, gSin) : neg(mul(mass.s, gSin));
        checks.push(resCheck2("newton_axis", `tr\u1EE5c d\u1ED1c "${body.name}": \u03A3F \u2212 m\xB7a`, sub2(sub2(add2(mgSin, appAxial), st.friction), mul(mass.s, st.a)), Math.max(1, Math.abs(mass.n * g.n * st.sinTN))));
      } else {
        checks.push(resCheck2("newton_axis", `tr\u1EE5c d\u1ED1c "${body.name}" (per-mass): (g\xB7sin\u03B8 \u2212 \u03BC\xB7g\xB7cos\u03B8) \u2212 a`, sub2(sub2(gAlong, gCosMu), st.a), Math.max(1, Math.abs(gAlongN))));
      }
    } catch (e) {
      st.blockReason = e.message;
    }
  }
  if (st.a !== void 0) {
    st.quad = { k0: ZERO4, k1: st.v0, k2: mul(HALF2, st.a) };
    st.tStop = st.aN < 0 && st.v0N > 1e-12 ? -st.v0N / st.aN : null;
  }
  return st;
}
function solveTwoBody(bodies, gS, gN, checks, violations, meta) {
  const out = /* @__PURE__ */ new Map();
  if (gS === void 0 || gN === void 0) throw new Error('c\u1EA7n g cho h\u1EC7 2 v\u1EADt (c\xF3 v\u1EADt treo) \u2014 b\u1ED5 sung "g" v\xE0o plan');
  for (const b of bodies) if (b.mass === void 0) throw new Error(`c\u1EA7n kh\u1ED1i l\u01B0\u1EE3ng c\u1EE7a "${b.name}" (h\u1EC7 2 v\u1EADt c\u1EA7n c\u1EA3 hai kh\u1ED1i l\u01B0\u1EE3ng)`);
  const atwood = bodies.every((b) => b.on === "hanging");
  let hangB, horizB, downB, upB;
  const m = (b) => convMass(b);
  const M = add2(m(bodies[0]).s, m(bodies[1]).s), MN = m(bodies[0]).n + m(bodies[1]).n;
  let D, DN, Fmax, FmaxN, a, aN, T, TN, Tverify, TverifyN;
  if (atwood) {
    const c = cmpScalar(m(bodies[0]).s, m(bodies[1]).s);
    if (c === 0) {
      violations.push({ id: "he-khong-chuyen-dong", message: `h\u1EC7 c\xE2n b\u1EB1ng (m\u2081 = m\u2082): a = 0, T = mg \u2014 tr\u1EA1ng th\xE1i h\u1EE3p l\u1EC7 nh\u01B0ng v1 kh\xF4ng serve \u0111\xE1p t\u0129nh` });
    }
    downB = c >= 0 ? bodies[0] : bodies[1];
    upB = c >= 0 ? bodies[1] : bodies[0];
    hangB = downB;
    D = mul(sub2(m(downB).s, m(upB).s), gS);
    DN = (m(downB).n - m(upB).n) * gN;
    Fmax = ZERO4;
    FmaxN = 0;
    a = div(D, M);
    aN = DN / MN;
    T = mul(m(upB).s, add2(gS, a));
    TN = m(upB).n * (gN + aN);
    Tverify = mul(m(downB).s, sub2(gS, a));
    TverifyN = m(downB).n * (gN - aN);
    meta.config = "atwood";
    meta.direction = `${downB.name}-di-xuong`;
  } else {
    hangB = bodies.find((b) => b.on === "hanging");
    horizB = bodies.find((b) => b.on !== "hanging");
    const muH = horizB.mu ?? 0;
    const N1 = mul(m(horizB).s, gS), N1N = m(horizB).n * gN;
    Fmax = mul(scalarFromNumber(muH), N1);
    FmaxN = muH * N1N;
    D = mul(m(hangB).s, gS);
    DN = m(hangB).n * gN;
    downB = hangB;
    upB = horizB;
    if (cmpScalar(D, Fmax) <= 0) {
      violations.push({ id: "he-khong-chuyen-dong", message: `l\u1EF1c ph\xE1t \u0111\u1ED9ng ${DN.toFixed(2)} N \u2264 ng\u01B0\u1EE1ng ma s\xE1t ${FmaxN.toFixed(2)} N \u2014 h\u1EC7 kh\xF4ng chuy\u1EC3n \u0111\u1ED9ng (\u0111\u1EE9ng y\xEAn l\xE0 k\u1EBFt qu\u1EA3 h\u1EE3p l\u1EC7, v1 kh\xF4ng serve nh\xE1nh t\u0129nh)` });
    }
    a = div(sub2(D, Fmax), M);
    aN = (DN - FmaxN) / MN;
    T = mul(m(hangB).s, sub2(gS, a));
    TN = m(hangB).n * (gN - aN);
    Tverify = add2(mul(m(horizB).s, a), Fmax);
    TverifyN = m(horizB).n * aN + FmaxN;
    meta.config = "ban-treo";
    meta.direction = `${hangB.name}-di-xuong`;
  }
  checks.push(resCheck2("tension_match", "l\u1EF1c c\u0103ng hai \u0111\u1EA7u d\xE2y kh\u1EDBp nhau", sub2(T, Tverify), Math.max(1, Math.abs(TN))));
  if (cmpScalar(T, ZERO4) < 0) violations.push({ id: "day-chung", message: `l\u1EF1c c\u0103ng \xE2m (T = ${TN.toFixed(2)} N < 0): d\xE2y ch\xF9ng, m\xF4 h\xECnh kh\xF4ng kh\u1EDBp` });
  for (const b of bodies) {
    const mb = m(b);
    const st = {
      name: b.name,
      op: b,
      config: b.on === "incline" ? "nghieng" : b.on === "hanging" ? "hanging" : "ngang",
      hasMass: true,
      m: mb.s,
      mN: mb.n,
      hasMu: (b.mu ?? 0) > 0,
      mu: scalarFromNumber(b.mu ?? 0),
      muN: b.mu ?? 0,
      v0: ZERO4,
      v0N: 0,
      moves: true,
      a,
      aN,
      tension: T,
      tensionN: TN,
      tStop: null,
      motionDesc: b === downB ? "di-xuong" : b === upB ? atwood ? "di-len" : "bi-keo" : "",
      quad: { k0: ZERO4, k1: ZERO4, k2: mul(HALF2, a) }
    };
    if (b.on === "horizontal") {
      st.N = mul(mb.s, gS);
      st.NN = mb.n * gN;
      st.friction = mul(st.mu, st.N);
      st.frictionN = st.muN * st.NN;
    }
    if (b.on !== "hanging") {
      st.weight = mul(mb.s, gS);
      st.weightN = mb.n * gN;
    } else {
      st.weight = mul(mb.s, gS);
      st.weightN = mb.n * gN;
    }
    let resid, scale4;
    if (b.on === "hanging") {
      if (b === downB) {
        resid = sub2(sub2(mul(mb.s, gS), T), mul(mb.s, a));
      } else {
        resid = sub2(sub2(T, mul(mb.s, gS)), mul(mb.s, a));
      }
      scale4 = mb.n * gN;
    } else {
      const fr = st.friction ?? ZERO4;
      resid = sub2(sub2(T, fr), mul(mb.s, a));
      scale4 = Math.max(1, TN);
    }
    checks.push(resCheck2("newton_axis", `thay-a-ng\u01B0\u1EE3c "${b.name}": \u03A3F \u2212 m\xB7a`, resid, Math.max(1, Math.abs(scale4))));
    out.set(b.name, st);
  }
  meta.horizonNote = "m\xF4 h\xECnh b\u1ECF qua gi\u1EDBi h\u1EA1n h\xE0nh tr\xECnh d\xE2y/\u0111\u1ED9 cao \u2014 \u0111\xE1p h\u1EE3p l\u1EC7 trong ph\u1EA1m vi l\xFD t\u01B0\u1EDFng h\xF3a c\u1EE7a \u0111\u1EC1";
  return out;
}
function bodyNeedsMotion(name, isSingle, plan) {
  return plan.queries.some((q) => {
    if (q.kind === "acceleration") return q.of === name || q.of === void 0 && isSingle;
    if (q.kind === "force_value" && q.force === "net") return q.on === name;
    if (q.kind === "velocity_at" || q.kind === "position_at" || q.kind === "time_when" || q.kind === "time_when_velocity" || q.kind === "velocity_after_distance" || q.kind === "distance_to_stop") return q.of === name;
    return false;
  });
}
function solveDynamics(plan) {
  const checks = [];
  const violations = [];
  const errors = [];
  const meta = { config: "ngang", direction: "" };
  const gS = plan.g !== void 0 ? scalarFromNumber(plan.g) : void 0;
  const gN = plan.g;
  const bodies = plan.ops.filter((o) => o.op === "body");
  const forces = plan.ops.filter((o) => o.op === "force");
  const bodyMap = /* @__PURE__ */ new Map();
  try {
    if (bodies.length === 2) {
      const solved = solveTwoBody(bodies, gS, gN, checks, violations, meta);
      solved.forEach((v, k) => bodyMap.set(k, v));
    } else {
      const b = bodies[0];
      const isSingle = true;
      const needsMotion = b.on === "incline" || b.v0 > 0 || forces.some((f) => f.on === b.name) || bodyNeedsMotion(b.name, isSingle, plan);
      const st = solveSingle(b, forces.filter((f) => f.on === b.name), gS, gN, needsMotion, checks, violations);
      bodyMap.set(b.name, st);
      meta.config = st.config === "nghieng" ? "nghieng" : "ngang";
      meta.direction = st.motionDesc || (st.config === "nghieng" ? "xuong-doc" : "tinh");
    }
  } catch (e) {
    errors.push({ message: e.message });
  }
  return { bodies: bodyMap, g: gS, gN, checks, violations, errors, meta };
}
var posRootsPositive = (roots) => {
  for (const r2 of roots) if (r2.approx > 1e-9) return r2;
  return null;
};
function computeDynQuery(solved, query, isSingle) {
  const bodyByName = (name) => {
    if (name === void 0) {
      if (solved.bodies.size === 1) return [...solved.bodies.values()][0];
      return [...solved.bodies.values()][0];
    }
    const b = solved.bodies.get(name);
    if (!b) throw new Error(`kh\xF4ng c\xF3 v\u1EADt t\xEAn "${name}"`);
    return b;
  };
  const reqG = () => {
    if (solved.g === void 0 || solved.gN === void 0) throw new Error('c\u1EA7n g cho \u0111\u1EA1i l\u01B0\u1EE3ng n\xE0y \u2014 b\u1ED5 sung "g" v\xE0o plan');
    return { s: solved.g, n: solved.gN };
  };
  const reqMass = (b) => {
    if (!b.hasMass || b.m === void 0 || b.mN === void 0) throw new Error(`c\u1EA7n kh\u1ED1i l\u01B0\u1EE3ng c\u1EE7a "${b.name}" cho \u0111\u1EA1i l\u01B0\u1EE3ng n\xE0y`);
    return { s: b.m, n: b.mN };
  };
  const reqA = (b) => {
    if (b.blockReason) throw new Error(b.blockReason);
    if (b.a === void 0 || b.aN === void 0) throw new Error(`ch\u01B0a gi\u1EA3i \u0111\u01B0\u1EE3c gia t\u1ED1c c\u1EE7a "${b.name}"`);
    return { s: b.a, n: b.aN };
  };
  try {
    switch (query.kind) {
      case "acceleration": {
        const b = bodyByName(query.of);
        const a = reqA(b);
        return { ok: true, answer: mkAns2("acceleration", a.s, a.n, "m/s\xB2", query.label), checks: [] };
      }
      case "force_value": {
        const b = bodyByName(query.on);
        if (query.force === "weight") {
          reqG();
          const m = reqMass(b);
          const w = b.weight ?? mul(m.s, solved.g);
          const wN = b.weightN ?? m.n * solved.gN;
          return { ok: true, answer: mkAns2("force_value", w, wN, "N", query.label), checks: [] };
        }
        if (query.force === "friction") {
          if (b.config === "hanging") return { ok: false, problem: `v\u1EADt treo "${b.name}" kh\xF4ng c\xF3 ma s\xE1t` };
          reqG();
          reqMass(b);
          const f = b.friction ?? ZERO4;
          const fN = b.frictionN ?? 0;
          return { ok: true, answer: mkAns2("force_value", f, fN, "N", query.label), checks: [] };
        }
        if (query.force === "net") {
          const m = reqMass(b);
          const a = reqA(b);
          const net = mul(m.s, a.s);
          const netN = m.n * a.n;
          const netMag = netN < 0 ? neg(net) : net;
          const netMagN = Math.abs(netN);
          return { ok: true, answer: mkAns2("force_value", netMag, netMagN, "N", query.label), checks: [] };
        }
        if (b.tension === void 0 || b.tensionN === void 0) return { ok: false, problem: `v\u1EADt "${b.name}" kh\xF4ng n\u1EB1m trong d\xE2y \u2014 kh\xF4ng c\xF3 l\u1EF1c c\u0103ng` };
        return { ok: true, answer: mkAns2("force_value", b.tension, b.tensionN, "N", query.label), checks: [] };
      }
      case "normal_force": {
        const b = bodyByName(query.on);
        if (b.config === "hanging") return { ok: false, problem: `v\u1EADt treo "${b.name}" kh\xF4ng c\xF3 ph\u1EA3n l\u1EF1c ph\xE1p tuy\u1EBFn` };
        reqG();
        reqMass(b);
        if (b.N === void 0 || b.NN === void 0) return { ok: false, problem: `ch\u01B0a l\u1EADp \u0111\u01B0\u1EE3c ph\u1EA3n l\u1EF1c c\u1EE7a "${b.name}"` };
        return { ok: true, answer: mkAns2("normal_force", b.N, b.NN, "N", query.label), checks: [] };
      }
      case "min_force_to_move": {
        const b = bodyByName(query.on);
        if (b.config !== "ngang") return { ok: false, problem: `min_force_to_move v1 ch\u1EC9 cho m\u1EB7t ngang (v\u1EADt "${b.name}")` };
        if (!b.hasMu) return { ok: false, problem: `v\u1EADt "${b.name}" nh\u1EB5n (kh\xF4ng mu) \u2014 kh\xF4ng c\xF3 ng\u01B0\u1EE1ng tr\u01B0\u1EE3t` };
        reqG();
        const m = reqMass(b);
        const fmin = mul(b.mu, mul(m.s, solved.g));
        const fminN = b.muN * m.n * solved.gN;
        const chk = [{ kind: "static_threshold", detail: `F_min = \u03BCmg = ${fminN.toFixed(2)} N (ng\u01B0\u1EE1ng b\u1EAFt \u0111\u1EA7u tr\u01B0\u1EE3t, \u03B1 = 0)`, residual: 0, pass: true }];
        return { ok: true, answer: mkAns2("min_force_to_move", fmin, fminN, "N", query.label), checks: chk };
      }
      case "velocity_at": {
        const b = bodyByName(query.of);
        const a = reqA(b);
        const t = query.t;
        const chk = [];
        let vS, vN;
        if (b.tStop !== null && t > b.tStop + 1e-9) {
          vS = ZERO4;
          vN = 0;
          chk.push({ kind: "stop_domain", detail: `v\u1EADt \u0111\xE3 d\u1EEBng t\u1EA1i t = ${b.tStop.toFixed(4)} s, gi\u1EEF nguy\xEAn (v = 0)`, residual: 0, pass: true });
        } else {
          vS = add2(b.v0, mul(a.s, scalarFromNumber(t)));
          vN = b.v0N + a.n * t;
          chk.push(resCheck2("kinematic_back", `v(${t}) = v0 + a\xB7t`, sub2(vS, add2(b.v0, mul(a.s, scalarFromNumber(t)))), Math.max(1, Math.abs(vN))));
        }
        return { ok: true, answer: mkAns2("velocity_at", vS, vN, "m/s", query.label), checks: chk, tSolved: t };
      }
      case "position_at": {
        const b = bodyByName(query.of);
        const a = reqA(b);
        const q = b.quad;
        const t = query.t;
        const chk = [];
        let xS, xN, tEff = t;
        if (b.tStop !== null && t > b.tStop + 1e-9) {
          tEff = b.tStop;
          xS = evalQuadS(q, scalarFromNumber(b.tStop));
          xN = b.v0N * b.tStop + 0.5 * a.n * b.tStop * b.tStop;
          chk.push({ kind: "stop_domain", detail: `v\u1EADt \u0111\xE3 d\u1EEBng t\u1EA1i t = ${b.tStop.toFixed(4)} s, gi\u1EEF nguy\xEAn v\u1ECB tr\xED s_d\u1EEBng`, residual: 0, pass: true });
        } else {
          xS = evalQuadS(q, scalarFromNumber(t));
          xN = b.v0N * t + 0.5 * a.n * t * t;
        }
        return { ok: true, answer: mkAns2("position_at", xS, xN, "m", query.label), checks: chk, tSolved: tEff };
      }
      case "time_when": {
        const b = bodyByName(query.of);
        const a = reqA(b);
        const q = b.quad;
        if (b.tStop !== null) {
          const sStopN = b.v0N * b.tStop + 0.5 * a.n * b.tStop * b.tStop;
          if (query.position > sStopN + 1e-9) return { ok: false, problem: `v\u1EADt d\u1EEBng t\u1EA1i s_d\u1EEBng = ${sStopN.toFixed(4)} m, kh\xF4ng bao gi\u1EDD \u0111\u1EA1t v\u1ECB tr\xED ${query.position} m \u2014 ki\u1EC3m tra l\u1EA1i \u0111\u1EC1/plan` };
        }
        const roots = rootsFor(q, scalarFromNumber(query.position));
        const t = posRootsPositive(roots);
        if (t === null) return { ok: false, problem: `kh\xF4ng c\xF3 th\u1EDDi \u0111i\u1EC3m d\u01B0\u01A1ng \u0111\u1EC3 v\u1EADt \u1EDF v\u1ECB tr\xED ${query.position} m` };
        const chk = [resCheck2("kinematic_back", `x(t) = ${query.position}`, sub2(evalQuadS(q, t), scalarFromNumber(query.position)), Math.max(1, query.position))];
        return { ok: true, answer: mkAns2("time_when", t, t.approx, "s", query.label), checks: chk, tSolved: t.approx };
      }
      case "time_when_velocity": {
        const b = bodyByName(query.of);
        const a = reqA(b);
        if (Math.abs(a.n) < 1e-12) return { ok: false, problem: `gia t\u1ED1c b\u1EB1ng 0 \u2014 kh\xF4ng x\xE1c \u0111\u1ECBnh th\u1EDDi \u0111i\u1EC3m \u0111\u1EA1t t\u1ED1c \u0111\u1ED9` };
        const vStar = qtyVelocity(query.value, query.vUnit, SI2);
        const vStarN = query.value * (query.vUnit === "km/h" ? 5 / 18 : 1);
        const t = div(sub2(vStar, b.v0), a.s);
        const tN = (vStarN - b.v0N) / a.n;
        if (tN < -1e-9) return { ok: false, problem: `t\u1ED1c \u0111\u1ED9 ${query.value} ${query.vUnit} \u0111\u1EA1t \u1EDF th\u1EDDi \u0111i\u1EC3m \xE2m \u2014 ngo\xE0i mi\u1EC1n` };
        const chk = [resCheck2("kinematic_back", `v(t) = ${query.value} ${query.vUnit}`, sub2(add2(b.v0, mul(a.s, t)), vStar), Math.max(1, Math.abs(vStarN)))];
        return { ok: true, answer: mkAns2("time_when_velocity", t, tN, "s", query.label), checks: chk, tSolved: Math.max(0, tN) };
      }
      case "velocity_after_distance": {
        const b = bodyByName(query.of);
        const a = reqA(b);
        const inner = add2(mul(b.v0, b.v0), mul(mul(rat(2n), a.s), scalarFromNumber(query.distance)));
        const innerN = b.v0N * b.v0N + 2 * a.n * query.distance;
        if (innerN < -1e-9) return { ok: false, problem: `v0\xB2 + 2as = ${innerN.toFixed(4)} < 0 \u2014 v\u1EADt kh\xF4ng \u0111\u1EA1t t\u1EDBi qu\xE3ng \u0111\u01B0\u1EDDng ${query.distance} m` };
        const vS = sqrt(inner);
        const vN = Math.sqrt(Math.max(0, innerN));
        const chk = [resCheck2("kinematic_back", `v\xB2 = v0\xB2 + 2as`, sub2(mul(vS, vS), inner), Math.max(1, Math.abs(innerN)))];
        return { ok: true, answer: mkAns2("velocity_after_distance", vS, vN, "m/s", query.label), checks: chk };
      }
      case "distance_to_stop": {
        const b = bodyByName(query.of);
        const a = reqA(b);
        if (!(a.n < 0 && b.v0N > 0)) return { ok: false, problem: `v\u1EADt kh\xF4ng d\u1EEBng (a = ${a.n.toFixed(4)} m/s\xB2 kh\xF4ng h\xE3m chuy\u1EC3n \u0111\u1ED9ng) \u2014 kh\xF4ng c\xF3 qu\xE3ng \u0111\u01B0\u1EDDng d\u1EEBng` };
        const absA = neg(a.s);
        const absAN = -a.n;
        const s = div(mul(b.v0, b.v0), mul(rat(2n), absA));
        const sN = b.v0N * b.v0N / (2 * absAN);
        const chk = [resCheck2("kinematic_back", `s\xB72|a| = v0\xB2`, sub2(mul(s, mul(rat(2n), absA)), mul(b.v0, b.v0)), Math.max(1, b.v0N * b.v0N))];
        return { ok: true, answer: mkAns2("distance_to_stop", s, sN, "m", query.label), checks: chk, tSolved: -b.v0N / a.n };
      }
      default: {
        query;
        return { ok: false, problem: `query kind kh\xF4ng h\u1ED7 tr\u1EE3: ${query.kind}` };
      }
    }
  } catch (e) {
    return { ok: false, problem: e.message };
  }
}

// api/_lib/kernel/physics/dynamicsScene.ts
var COLORS2 = ["#FFA500", "#38BDF8", "#F472B6", "#4ADE80"];
var fmt2 = (n) => parseFloat(n.toFixed(6)).toString();
var rnd = (n) => parseFloat(n.toFixed(6));
function playbackOf2(plan, tPhys) {
  if (plan.scene.durationSec) return { durationSec: plan.scene.durationSec, timeScale: tPhys / plan.scene.durationSec };
  if (tPhys >= 3 && tPhys <= 15) return { durationSec: tPhys, timeScale: 1 };
  return { durationSec: 10, timeScale: tPhys / 10 };
}
function rhs(c0, c1, c2, k) {
  let s = fmt2(c0);
  if (c1 * k !== 0) s += ` + ${fmt2(c1 * k)}*t`;
  if (c2 * k * k !== 0) s += ` + ${fmt2(c2 * k * k)}*t*t`;
  return s;
}
function buildDynamicsScene(plan, solved, tPhys) {
  const playback = playbackOf2(plan, tPhys);
  const k = playback.timeScale;
  const bodies = [...solved.bodies.values()];
  if (bodies.length === 0) return { geometry: null, playback };
  const points = [];
  const lines = [];
  const agents = [];
  const tracks = [];
  const labelOf = (b) => plan.scene.labels?.[b.name] ?? b.name;
  const twoBody = bodies.length === 2;
  let xMin = 0, xMax = 1, zTop = 1;
  if (!twoBody) {
    const b = bodies[0];
    const tEnd = b.tStop !== null ? Math.min(tPhys, b.tStop) : tPhys;
    const aN = b.aN ?? 0, v0N = b.v0N;
    const sOf = (t) => v0N * t + 0.5 * aN * t * t;
    if (b.config === "nghieng") {
      const sinT = b.sinTN ?? Math.sin((b.theta ?? 30) * Math.PI / 180);
      const cosT = b.cosTN ?? Math.cos((b.theta ?? 30) * Math.PI / 180);
      const down = (b.op.motion ?? "down") === "down";
      const sTotal = Math.max(1e-3, sOf(tEnd));
      const H = rnd(sTotal * sinT), xEnd = rnd(sTotal * cosT);
      const top = down ? [0, 0, H] : [xEnd, 0, H];
      const bot = down ? [xEnd, 0, 0] : [0, 0, 0];
      const start = down ? top : bot, land = down ? bot : top;
      points.push({ id: "dinh", label: "", x: down ? 0 : xEnd, y: 0, z: H });
      points.push({ id: "chan", label: "", x: down ? xEnd : 0, y: 0, z: 0 });
      lines.push({ id: "doc", from: "dinh", to: "chan", style: "solid", color: "#8B8B8B" });
      xMin = 0;
      xMax = xEnd;
      zTop = H;
      const color = COLORS2[0];
      agents.push({ id: b.name, label: labelOf(b), initialPosition: start, color, radius: 0.14 });
      const sgnX = down ? 1 : -1, sgnZ = down ? -1 : 1;
      const x0 = start[0], z0 = start[2];
      tracks.push({
        id: `mv_${b.name}`,
        start: 0,
        end: tEnd / k,
        type: "parametric_path",
        targetId: b.name,
        params: {
          equations: {
            x: rhs(x0, sgnX * v0N * cosT, sgnX * 0.5 * aN * cosT, k),
            y: "0",
            z: rhs(z0, sgnZ * v0N * sinT, sgnZ * 0.5 * aN * sinT, k)
          },
          path: `m\u1EB7t nghi\xEAng ${b.theta}\xB0`,
          landing_point: land,
          timeScale: k
        }
      });
    } else {
      const xEnd = rnd(sOf(tEnd));
      xMin = Math.min(0, xEnd);
      xMax = Math.max(1, xEnd);
      zTop = 1;
      const color = COLORS2[0];
      agents.push({ id: b.name, label: labelOf(b), initialPosition: [0, 0, 0], color, radius: 0.14 });
      if (b.a !== void 0) {
        tracks.push({
          id: `mv_${b.name}`,
          start: 0,
          end: tEnd / k,
          type: "parametric_path",
          targetId: b.name,
          params: {
            equations: { x: rhs(0, v0N, 0.5 * aN, k), y: "0", z: "0" },
            path: "m\u1EB7t ngang",
            landing_point: [xEnd, 0, 0],
            timeScale: k
          }
        });
      }
    }
  } else {
    const atwood = solved.meta.config === "atwood";
    const tEnd = tPhys;
    const H0 = 4;
    points.push({ id: "rr", label: "", x: 0, y: 0, z: H0 });
    xMin = -2;
    xMax = 2;
    zTop = H0;
    let ci = 0;
    for (const b of bodies) {
      const color = COLORS2[ci % COLORS2.length];
      const aN = b.aN ?? 0;
      const down = b.motionDesc === "di-xuong";
      if (atwood) {
        const x = ci === 0 ? -1.5 : 1.5;
        const start = [x, 0, H0 - 1];
        agents.push({ id: b.name, label: labelOf(b), initialPosition: start, color, radius: 0.14 });
        const sgnZ = down ? -1 : 1;
        const land = [x, 0, H0 - 1 + sgnZ * 0.5 * aN * tEnd * tEnd];
        tracks.push({ id: `mv_${b.name}`, start: 0, end: tEnd / k, type: "parametric_path", targetId: b.name, params: { equations: { x: fmt2(x), y: "0", z: rhs(H0 - 1, 0, sgnZ * 0.5 * aN, k) }, path: "Atwood", landing_point: land, timeScale: k } });
      } else {
        if (b.config === "ngang") {
          const start = [-1.5, 0, H0];
          points.push({ id: "ban0", label: "", x: -2, y: 0, z: H0 });
          points.push({ id: "ban1", label: "", x: 0, y: 0, z: H0 });
          lines.push({ id: "ban", from: "ban0", to: "ban1", style: "solid", color: "#8B8B8B" });
          agents.push({ id: b.name, label: labelOf(b), initialPosition: start, color, radius: 0.14 });
          const land = [-1.5 + 0.5 * aN * tEnd * tEnd, 0, H0];
          tracks.push({ id: `mv_${b.name}`, start: 0, end: tEnd / k, type: "parametric_path", targetId: b.name, params: { equations: { x: rhs(-1.5, 0, 0.5 * aN, k), y: "0", z: fmt2(H0) }, path: "m\u1EB7t b\xE0n", landing_point: land, timeScale: k } });
        } else {
          const start = [0, 0, H0 - 1];
          agents.push({ id: b.name, label: labelOf(b), initialPosition: start, color, radius: 0.14 });
          const land = [0, 0, H0 - 1 - 0.5 * aN * tEnd * tEnd];
          tracks.push({ id: `mv_${b.name}`, start: 0, end: tEnd / k, type: "parametric_path", targetId: b.name, params: { equations: { x: "0", y: "0", z: rhs(H0 - 1, 0, -0.5 * aN, k) }, path: "v\u1EADt treo", landing_point: land, timeScale: k } });
        }
      }
      ci++;
    }
  }
  const margin = Math.max(0.5, 0.05 * Math.max(1, xMax - xMin, zTop));
  points.push({ id: "G0", label: "", x: xMin - margin, y: 0, z: 0 });
  points.push({ id: "G1", label: "", x: xMax + margin, y: 0, z: 0 });
  lines.push({ id: "ground", from: "G0", to: "G1", style: "solid", color: "#8B8B8B" });
  const geometry = {
    name: plan.problemName,
    axisUnit: "m",
    tags: ["physics", `timeScale:${fmt2(k)}`],
    points,
    lines,
    curves: [],
    agents,
    timeline: { duration: playback.durationSec, tracks }
  };
  return { geometry, playback };
}
function buildDynamicsCharts(plan, solved, tPhys) {
  const out = [];
  for (const ch of plan.charts) {
    const series = [];
    for (const name of ch.of) {
      const b = solved.bodies.get(name);
      if (!b || b.a === void 0) continue;
      const aN = b.aN ?? 0, v0N = b.v0N;
      const tEnd = b.tStop !== null ? Math.min(tPhys, b.tStop) : tPhys;
      const N = ch.kind === "v_t" ? 1 : 64;
      const samples = [];
      for (let i = 0; i <= N; i++) {
        const t = tEnd * i / N;
        samples.push([t, ch.kind === "x_t" ? v0N * t + 0.5 * aN * t * t : v0N + aN * t]);
      }
      series.push({ name, samples });
    }
    out.push({ kind: ch.kind, tUnit: "s", vUnit: ch.kind === "x_t" ? "m" : "m/s", series });
  }
  return out;
}

// api/_lib/kernel/physics/runDynamics.ts
var TOL_ASSERT3 = 1e-3;
var ZERO_META2 = { model: { config: "ngang", direction: "" }, tPhys: 0, playback: { durationSec: 0, timeScale: 1 }, unitsNote: "SI" };
function runDynamics(raw) {
  const parsed = DynamicsPlanSchema.safeParse(raw);
  if (!parsed.success) {
    const iss = parsed.error.issues[0];
    const detail = iss ? `${iss.path.length ? `${iss.path.join(".")}: ` : ""}${iss.message}` : "schema";
    return { ok: false, answers: [], checks: [], violations: [], errors: [{ message: `Invalid dynamics plan: ${detail}` }], geometry: null, charts: [], meta: ZERO_META2 };
  }
  const plan = parsed.data;
  const isSingle = plan.ops.filter((o) => o.op === "body").length === 1;
  const solved = solveDynamics(plan);
  const errors = [...solved.errors];
  const checks = [...solved.checks];
  const violations = solved.violations.map((v) => ({ id: v.id, message: v.message }));
  const answers = [];
  let tMax = 0;
  for (const [qi, q] of plan.queries.entries()) {
    const r2 = computeDynQuery(solved, q, isSingle);
    if (r2.ok === false) {
      errors.push({ message: `query ${q.kind}: ${r2.problem}` });
      continue;
    }
    answers.push({ ...r2.answer, queryIndex: qi });
    checks.push(...r2.checks);
    for (const c of r2.checks) if (!c.pass) errors.push({ message: `t\u1EF1 ki\u1EC3m FAIL: ${c.detail} (residual ${c.residual.toExponential(2)})` });
    if (r2.tSolved !== void 0 && Number.isFinite(r2.tSolved)) tMax = Math.max(tMax, r2.tSolved);
  }
  for (const q of plan.queries) if ("t" in q && typeof q.t === "number") tMax = Math.max(tMax, q.t);
  solved.bodies.forEach((b) => {
    if (b.tStop !== null) tMax = Math.max(tMax, b.tStop);
  });
  const tPhys = tMax > 1e-9 ? tMax : 2;
  for (const c of solved.checks) if (!c.pass) errors.push({ message: `t\u1EF1 ki\u1EC3m FAIL: ${c.detail} (residual ${c.residual.toExponential(2)})` });
  for (const a of plan.asserts) {
    const r2 = computeDynQuery(solved, a.query, isSingle);
    if (r2.ok === false) {
      errors.push({ message: `assert ${a.query.kind}: ${r2.problem}` });
      continue;
    }
    const tol = (a.tol ?? TOL_ASSERT3) * Math.max(1, Math.abs(a.equals));
    const delta = Math.abs(r2.answer.approx - a.equals);
    if (delta > tol) violations.push({ assert: a.query.kind, expected: a.equals, got: r2.answer.approx, delta, message: `assert ${a.query.kind}: k\u1EF3 v\u1ECDng ${a.equals}, engine t\xEDnh ${r2.answer.approx}` });
  }
  const hasPhysicalViolation = solved.violations.some((v) => PHYSICAL_VIOLATIONS.has(v.id));
  const servedAnswers = hasPhysicalViolation ? [] : answers;
  const okState = violations.length === 0 && errors.length === 0;
  const scene = okState ? buildDynamicsScene(plan, solved, tPhys) : { geometry: null, playback: { durationSec: 0, timeScale: 1 } };
  const charts = okState ? buildDynamicsCharts(plan, solved, tPhys) : [];
  const ok = violations.length === 0 && errors.length === 0 && servedAnswers.length === plan.queries.length && servedAnswers.every((a) => Number.isFinite(a.approx));
  return {
    ok,
    answers: servedAnswers,
    checks,
    violations,
    errors,
    geometry: scene.geometry,
    charts,
    meta: { model: { config: solved.meta.config, direction: solved.meta.direction }, tPhys, playback: scene.playback, unitsNote: "SI", horizonNote: solved.meta.horizonNote }
  };
}

// api/_lib/kernel/physics/piScalar.ts
var K_MAX = 2;
function approxP(p2) {
  return p2.s.approx * Math.PI ** p2.k;
}
function isZeroPi(p2) {
  return p2.s.exact !== null ? p2.s.exact.num === 0n : Math.abs(p2.s.approx) < 1e-12;
}
function collapseP(p2) {
  return { s: num(approxP(p2)), k: 0 };
}
function bandP(p2) {
  return p2.k > K_MAX || p2.k < -K_MAX ? collapseP(p2) : p2;
}
var scalarToPi = (s) => ({ s, k: 0 });
var PI = { s: rat(1n), k: 1 };
var TWO_PI = { s: rat(2n), k: 1 };
var negP = (p2) => ({ s: neg(p2.s), k: p2.k });
function mulP(a, b) {
  return bandP({ s: mul(a.s, b.s), k: a.k + b.k });
}
function divP(a, b) {
  return bandP({ s: div(a.s, b.s), k: a.k - b.k });
}
function addP(a, b) {
  if (isZeroPi(a)) return b;
  if (isZeroPi(b)) return a;
  if (a.k === b.k) return { s: add2(a.s, b.s), k: a.k };
  return { s: num(approxP(a) + approxP(b)), k: 0 };
}
function subP(a, b) {
  return addP(a, negP(b));
}
function sqrtP(a) {
  if (a.k % 2 === 0) return bandP({ s: sqrt(a.s), k: a.k / 2 });
  return { s: num(Math.sqrt(approxP(a))), k: 0 };
}
var E = (n, d, rad = 1) => makeExact(BigInt(n), BigInt(d), rad);
var SIXTH = [
  { cos: E(1, 1), sin: E(0, 1) },
  // 0
  { cos: E(1, 2, 3), sin: E(1, 2) },
  // π/6
  { cos: E(1, 2), sin: E(1, 2, 3) },
  // π/3
  { cos: E(0, 1), sin: E(1, 1) },
  // π/2
  { cos: E(-1, 2), sin: E(1, 2, 3) },
  // 2π/3
  { cos: E(-1, 2, 3), sin: E(1, 2) },
  // 5π/6
  { cos: E(-1, 1), sin: E(0, 1) },
  // π
  { cos: E(-1, 2, 3), sin: E(-1, 2) },
  // 7π/6
  { cos: E(-1, 2), sin: E(-1, 2, 3) },
  // 4π/3
  { cos: E(0, 1), sin: E(-1, 1) },
  // 3π/2
  { cos: E(1, 2), sin: E(-1, 2, 3) },
  // 5π/3
  { cos: E(1, 2, 3), sin: E(-1, 2) }
  // 11π/6
];
var FOURTH = [
  { cos: E(1, 1), sin: E(0, 1) },
  // 0
  { cos: E(1, 2, 2), sin: E(1, 2, 2) },
  // π/4
  { cos: E(0, 1), sin: E(1, 1) },
  // π/2
  { cos: E(-1, 2, 2), sin: E(1, 2, 2) },
  // 3π/4
  { cos: E(-1, 1), sin: E(0, 1) },
  // π
  { cos: E(-1, 2, 2), sin: E(-1, 2, 2) },
  // 5π/4
  { cos: E(0, 1), sin: E(-1, 1) },
  // 3π/2
  { cos: E(1, 2, 2), sin: E(-1, 2, 2) }
  // 7π/4
];
var bmod = (a, m) => (a % m + m) % m;
function EXACT_COS(pha) {
  if (pha.k !== 1) return null;
  const e = pha.s.exact;
  if (e === null || e.radicand !== 1) return null;
  const p2 = e.num, q = e.den;
  if (6n % q === 0n) {
    const g = SIXTH[Number(bmod(p2 * (6n / q), 12n))];
    return { cos: fromExact(g.cos), sin: fromExact(g.sin) };
  }
  if (4n % q === 0n) {
    const g = FOURTH[Number(bmod(p2 * (4n / q), 8n))];
    return { cos: fromExact(g.cos), sin: fromExact(g.sin) };
  }
  return null;
}
function cosP(pha) {
  if (isZeroPi(pha)) return rat(1n);
  const g = EXACT_COS(pha);
  return g ? g.cos : num(Math.cos(approxP(pha)));
}
function sinP(pha) {
  if (isZeroPi(pha)) return rat(0n);
  const g = EXACT_COS(pha);
  return g ? g.sin : num(Math.sin(approxP(pha)));
}
function piPow(ak) {
  return ak === 1 ? "\u03C0" : ak === 2 ? "\u03C0\xB2" : `\u03C0^${ak}`;
}
function displayPiScalar(p2) {
  if (p2.k === 0) return displayScalar(p2.s);
  if (p2.s.exact === null) return approxP(p2).toFixed(4);
  if (isZeroPi(p2)) return "0";
  const e = p2.s.exact;
  const neg2 = e.num < 0n;
  const n = neg2 ? -e.num : e.num;
  const d = e.den;
  const rad = e.radicand;
  const sign = neg2 ? "-" : "";
  const surd = rad > 1 ? `\u221A${rad}` : "";
  const piStr = piPow(Math.abs(p2.k));
  if (p2.k > 0) {
    const numer2 = (n !== 1n ? `${n}` : "") + piStr + surd;
    return sign + numer2 + (d > 1n ? `/${d}` : "");
  }
  const numer = n !== 1n ? `${n}${surd}` : rad > 1 ? surd : "1";
  const denParts = (d > 1n ? `${d}` : "") + piStr;
  const denom = d > 1n ? `(${denParts})` : denParts;
  return sign + numer + "/" + denom;
}
function fmtNum7(x) {
  if (!Number.isFinite(x)) return "(l\u1ED7i)";
  if (x !== 0 && Math.abs(x) < 1e-3) return parseFloat(x.toPrecision(4)).toString();
  const digits = Math.abs(x) >= 1e3 ? 2 : 4;
  return parseFloat(x.toFixed(digits)).toString();
}
function certifyPiScalar(p2, floatRef) {
  const tol = 1e-6 * Math.max(1, Math.abs(floatRef));
  if (p2.s.exact !== null && Math.abs(approxP(p2) - floatRef) <= tol) {
    return { exact: p2.s.exact, approx: approxP(p2), text: displayPiScalar(p2), approximate: false };
  }
  const nice = Number.isFinite(floatRef) ? recognizeConstant(floatRef) : null;
  return { exact: null, approx: floatRef, text: nice ? nice.text : fmtNum7(floatRef), approximate: !nice };
}
var Num4 = external_exports.number().finite();
var PiRat = external_exports.union([
  Num4,
  // 5 ≡ số trần (bậc 0)
  external_exports.object({ n: Num4, d: external_exports.number().int().positive().default(1), pi: external_exports.boolean().default(false) })
]);
function toPiScalar(pr) {
  if (typeof pr === "number") return { s: scalarFromNumber(pr), k: 0 };
  const d = pr.d ?? 1;
  const s = div(scalarFromNumber(pr.n), rat(BigInt(d)));
  return { s, k: pr.pi ? 1 : 0 };
}

// api/_lib/kernel/physics/oscillationSchema.ts
var Num5 = external_exports.number().finite();
var Obj3 = external_exports.string().min(1);
var VUnit2 = external_exports.enum(["cm/s", "m/s"]);
var AUnit = external_exports.enum(["cm/s2", "m/s2"]);
function piRatPositive(pr) {
  return typeof pr === "number" ? pr > 0 : pr.n > 0;
}
var OscillatorOp = external_exports.object({
  op: external_exports.literal("oscillator"),
  name: Obj3,
  // NGUỒN TỐC ĐỘ GÓC (0..n; ≥2 ⇒ nguồn ưu tiên tính, còn lại thành auto-assert §5.2)
  omega: PiRat.optional(),
  // rad/s
  T: PiRat.optional(),
  // s
  f: PiRat.optional(),
  // Hz
  count: external_exports.object({ n: external_exports.number().int().positive(), dt: PiRat }).optional(),
  // "n dao động trong dt giây"
  spring: external_exports.object({ k: Num5.positive() }).optional(),
  // N/m — rate khi có mass; energy khi chỉ có k
  pendulum: external_exports.object({
    l: Num5.positive(),
    lUnit: external_exports.enum(["m", "cm"]).default("m"),
    g: Num5.positive().optional(),
    // 9.8 / 10 THEO ĐỀ
    gAsPiSquared: external_exports.boolean().default(false)
    // "g = π²" hoặc "g = 10, lấy π² = 10" ⇒ true (§5.4)
  }).optional(),
  mass: Num5.positive().optional(),
  // cho ω=√(k/m) và W=½mω²A²
  massUnit: external_exports.enum(["kg", "g"]).default("kg"),
  // NGUỒN BIÊN ĐỘ (0..n; ưu tiên + auto-assert; đơn vị units.length)
  A: Num5.positive().optional(),
  L: Num5.positive().optional(),
  // chiều dài quỹ đạo = 2A
  pathPerPeriod: Num5.positive().optional(),
  // quãng đường 1 chu kỳ = 4A
  vmaxGiven: external_exports.object({ v: Num5.positive(), unit: VUnit2.optional() }).optional(),
  // A = vmax/ω
  fromState: external_exports.object({ x: Num5, v: Num5, unit: VUnit2.optional() }).optional(),
  // A²=x²+v²/ω²
  initial: external_exports.object({ x0: Num5, v0: Num5.default(0), unit: VUnit2.optional() }).optional(),
  // t=0 → A VÀ φ (§5.3)
  // PHA
  phi: PiRat.optional(),
  // rad
  form: external_exports.enum(["cos", "sin"]).default("cos")
  // "x=A·sin(ωt+φₛ)" ⇒ form:'sin'; ENGINE đổi φ:=φₛ−π/2
}).superRefine((op, ctx) => {
  const issue = (message) => ctx.addIssue({ code: external_exports.ZodIssueCode.custom, message });
  if (op.omega !== void 0 && !piRatPositive(op.omega)) issue(`t\u1EA7n s\u1ED1 g\xF3c \u03C9 c\u1EE7a "${op.name}" ph\u1EA3i d\u01B0\u01A1ng`);
  if (op.T !== void 0 && !piRatPositive(op.T)) issue(`chu k\u1EF3 T c\u1EE7a "${op.name}" ph\u1EA3i d\u01B0\u01A1ng`);
  if (op.f !== void 0 && !piRatPositive(op.f)) issue(`t\u1EA7n s\u1ED1 f c\u1EE7a "${op.name}" ph\u1EA3i d\u01B0\u01A1ng`);
  if (op.count !== void 0 && !piRatPositive(op.count.dt)) issue(`kho\u1EA3ng th\u1EDDi gian \u0111\u1EBFm dao \u0111\u1ED9ng c\u1EE7a "${op.name}" ph\u1EA3i d\u01B0\u01A1ng`);
  if (op.pendulum) {
    const hasG = op.pendulum.g !== void 0;
    if (hasG && op.pendulum.gAsPiSquared) issue(`con l\u1EAFc "${op.name}": khai g HO\u1EB6C gAsPiSquared, kh\xF4ng c\u1EA3 hai`);
    if (!hasG && !op.pendulum.gAsPiSquared) issue(`con l\u1EAFc "${op.name}": thi\u1EBFu g (s\u1ED1) ho\u1EB7c gAsPiSquared:true`);
  }
  if (op.initial && op.initial.x0 === 0 && (op.initial.v0 ?? 0) === 0) {
    issue(`v\u1EADt "${op.name}" kh\xF4ng dao \u0111\u1ED9ng (initial x\u2080 = v\u2080 = 0 \u21D2 A = 0)`);
  }
});
var OscQuerySchema = external_exports.discriminatedUnion("kind", [
  external_exports.object({ kind: external_exports.literal("x_at"), of: Obj3, t: PiRat, label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("v_at"), of: Obj3, t: PiRat, unit: VUnit2.optional(), label: external_exports.string().optional() }),
  // ĐẠI SỐ, có dấu
  external_exports.object({ kind: external_exports.literal("a_at"), of: Obj3, t: PiRat, unit: AUnit.optional(), label: external_exports.string().optional() }),
  // ĐẠI SỐ
  external_exports.object({ kind: external_exports.literal("amplitude"), of: Obj3, label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("omega"), of: Obj3, label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("period"), of: Obj3, label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("frequency"), of: Obj3, label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("initial_phase"), of: Obj3, label: external_exports.string().optional() }),
  // chuẩn hóa (−π, π]
  external_exports.object({ kind: external_exports.literal("vmax"), of: Obj3, unit: VUnit2.optional(), label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("amax"), of: Obj3, unit: AUnit.optional(), label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("speed_at_x"), of: Obj3, x: Num5, unit: VUnit2.optional(), label: external_exports.string().optional() }),
  // |v|
  external_exports.object({ kind: external_exports.literal("x_at_speed"), of: Obj3, v: Num5.min(0), vUnit: VUnit2.optional(), label: external_exports.string().optional() }),
  // |x|; v ≥ 0 (OS-6: v=0 hợp lệ ⇒ |x|=A)
  external_exports.object({ kind: external_exports.literal("energy_total"), of: Obj3, label: external_exports.string().optional() }),
  // J
  external_exports.object({ kind: external_exports.literal("energy_kinetic_at"), of: Obj3, at: external_exports.union([external_exports.object({ x: Num5 }), external_exports.object({ t: PiRat })]), label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("energy_potential_at"), of: Obj3, at: external_exports.union([external_exports.object({ x: Num5 }), external_exports.object({ t: PiRat })]), label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("x_where_energy_ratio"), of: Obj3, ratio: Num5.positive(), label: external_exports.string().optional() }),
  // Wđ = ratio·Wt → |x|
  external_exports.object({
    kind: external_exports.literal("first_time_at_x"),
    of: Obj3,
    x: Num5,
    direction: external_exports.enum(["positive", "negative", "any"]).default("any"),
    label: external_exports.string().optional()
  })
]);
var OscillationPlanSchema = external_exports.object({
  problemName: external_exports.string().min(1).default("dao-dong"),
  // units.time = 's' (OS: chu kỳ tính giờ ngoài đề phổ thông); units.length ∈ {'m','cm'} (đề VN hầu hết cm).
  units: external_exports.object({ length: external_exports.enum(["cm", "m"]).default("cm"), time: external_exports.literal("s").default("s") }).default({}),
  ops: external_exports.array(OscillatorOp).min(1),
  queries: external_exports.array(OscQuerySchema).min(1),
  asserts: external_exports.array(external_exports.object({ query: OscQuerySchema, equals: Num5, tol: Num5.positive().optional() })).default([]),
  charts: external_exports.array(external_exports.object({ kind: external_exports.enum(["x_t", "v_t"]), of: external_exports.array(Obj3).min(1) })).default([]),
  scene: external_exports.object({ durationSec: Num5.positive().optional(), labels: external_exports.record(external_exports.string(), external_exports.string()).optional() }).default({})
}).superRefine((plan, ctx) => {
  const issue = (message) => ctx.addIssue({ code: external_exports.ZodIssueCode.custom, message });
  const names = /* @__PURE__ */ new Set();
  for (const op of plan.ops) {
    if (names.has(op.name)) issue(`v\u1EADt "${op.name}" khai b\xE1o 2 l\u1EA7n`);
    names.add(op.name);
  }
  for (const q of plan.queries) {
    if ("of" in q && q.of !== void 0 && !names.has(q.of)) issue(`query ${q.kind} tr\u1ECF v\u1EADt "${q.of}" kh\xF4ng t\u1ED3n t\u1EA1i`);
  }
});

// api/_lib/kernel/physics/oscillation.ts
var EPS_SELF4 = 1e-6;
var EPS_T2 = 1e-9;
var PHYSICAL_VIOLATIONS2 = /* @__PURE__ */ new Set(["bien-do-khong-duong", "nguon-du-lech", "li-do-ngoai-bien"]);
var piToScalar = (p2) => p2.k === 0 ? p2.s : num(approxP(p2));
var sqPi = (p2) => mulP(p2, p2);
var exactEq2 = (a, b) => a.num === b.num && a.den === b.den && a.radicand === b.radicand;
function fmtNum8(x) {
  if (!Number.isFinite(x)) return "(l\u1ED7i)";
  if (x !== 0 && Math.abs(x) < 1e-3) return parseFloat(x.toPrecision(4)).toString();
  const digits = Math.abs(x) >= 1e3 ? 2 : 4;
  return parseFloat(x.toFixed(digits)).toString();
}
function mkAnsS(kind, s, floatRef, unit, label) {
  const tol = 1e-6 * Math.max(1, Math.abs(floatRef));
  if (s.exact !== null && Math.abs(exactToApprox(s.exact) - floatRef) <= tol) {
    return { label, kind, text: displayScalar(s), approx: exactToApprox(s.exact), unit, approximate: false };
  }
  const nice = Number.isFinite(floatRef) ? recognizeConstant(floatRef) : null;
  return { label, kind, text: nice ? nice.text : fmtNum8(floatRef), approx: floatRef, unit, approximate: !nice };
}
function mkAnsP(kind, p2, floatRef, unit, label) {
  const c = certifyPiScalar(p2, floatRef);
  return { label, kind, text: c.text, approx: c.approx, unit, approximate: c.approximate };
}
function lenFactor(from, to) {
  if (from === to) return rat(1n);
  return from === "cm" && to === "m" ? rat(1n, 100n) : rat(100n);
}
var cmToM = (from) => lenFactor(from, "m");
function velToBase(v, unit, base) {
  const from = unit === "m/s" ? "m" : unit === "cm/s" ? "cm" : base;
  return mul(scalarFromNumber(v), lenFactor(from, base));
}
function outVel(base, unit) {
  const nat = `${base}/s`;
  if (!unit || unit === nat) return { factor: rat(1n), unit: nat };
  const to = unit === "m/s" ? "m" : "cm";
  return { factor: lenFactor(base, to), unit };
}
function outAcc(base, unit) {
  const nat = `${base}/s2`;
  if (!unit || unit === nat) return { factor: rat(1n), unit: nat };
  const to = unit === "m/s2" ? "m" : "cm";
  return { factor: lenFactor(base, to), unit };
}
function pendulumOmega(pend) {
  const lM = pend.lUnit === "cm" ? mul(scalarFromNumber(pend.l), rat(1n, 100n)) : scalarFromNumber(pend.l);
  const gP = pend.gAsPiSquared ? { s: rat(1n), k: 2 } : scalarToPi(scalarFromNumber(pend.g));
  return sqrtP(divP(gP, scalarToPi(lM)));
}
function rateSources(op) {
  const out = [];
  if (op.omega !== void 0) out.push({ name: "omega", w: toPiScalar(op.omega) });
  if (op.T !== void 0) out.push({ name: "T", w: divP(TWO_PI, toPiScalar(op.T)) });
  if (op.f !== void 0) out.push({ name: "f", w: mulP(TWO_PI, toPiScalar(op.f)) });
  if (op.count !== void 0) out.push({ name: "count", w: mulP(TWO_PI, divP(scalarToPi(scalarFromNumber(op.count.n)), toPiScalar(op.count.dt))) });
  if (op.spring && op.mass !== void 0) {
    const kS = scalarFromNumber(op.spring.k);
    const mS = op.massUnit === "g" ? mul(scalarFromNumber(op.mass), rat(1n, 1000n)) : scalarFromNumber(op.mass);
    out.push({ name: "spring", w: sqrtP(scalarToPi(div(kS, mS))) });
  }
  if (op.pendulum) out.push({ name: "pendulum", w: pendulumOmega(op.pendulum) });
  return out;
}
function amplFromStateP(x, v, omega) {
  const vOverW = divP(scalarToPi(v), omega);
  return sqrtP(addP(scalarToPi(mul(x, x)), sqPi(vOverW)));
}
function amplSources(op, omega, base) {
  const out = [];
  if (op.A !== void 0) out.push({ name: "A", A: scalarFromNumber(op.A) });
  if (op.L !== void 0) out.push({ name: "L", A: mul(scalarFromNumber(op.L), rat(1n, 2n)) });
  if (op.pathPerPeriod !== void 0) out.push({ name: "path", A: mul(scalarFromNumber(op.pathPerPeriod), rat(1n, 4n)) });
  if (op.fromState && omega) {
    const A = piToScalar(amplFromStateP(scalarFromNumber(op.fromState.x), velToBase(op.fromState.v, op.fromState.unit, base), omega));
    out.push({ name: "fromState", A });
  }
  if (op.vmaxGiven && omega) {
    const A = piToScalar(divP(scalarToPi(velToBase(op.vmaxGiven.v, op.vmaxGiven.unit, base)), omega));
    out.push({ name: "vmax", A });
  }
  if (op.initial && omega) {
    const A = piToScalar(amplFromStateP(scalarFromNumber(op.initial.x0), velToBase(op.initial.v0 ?? 0, op.initial.unit, base), omega));
    out.push({ name: "initial", A });
  }
  return out;
}
var GEXACT = (n, d, rad = 1) => makeExact(BigInt(n), BigInt(d), rad);
var FULL_GRID = [
  { n: 0, d: 1, cos: GEXACT(1, 1), sin: GEXACT(0, 1) },
  { n: 1, d: 6, cos: GEXACT(1, 2, 3), sin: GEXACT(1, 2) },
  { n: 1, d: 4, cos: GEXACT(1, 2, 2), sin: GEXACT(1, 2, 2) },
  { n: 1, d: 3, cos: GEXACT(1, 2), sin: GEXACT(1, 2, 3) },
  { n: 1, d: 2, cos: GEXACT(0, 1), sin: GEXACT(1, 1) },
  { n: 2, d: 3, cos: GEXACT(-1, 2), sin: GEXACT(1, 2, 3) },
  { n: 3, d: 4, cos: GEXACT(-1, 2, 2), sin: GEXACT(1, 2, 2) },
  { n: 5, d: 6, cos: GEXACT(-1, 2, 3), sin: GEXACT(1, 2) },
  { n: 1, d: 1, cos: GEXACT(-1, 1), sin: GEXACT(0, 1) },
  { n: -1, d: 6, cos: GEXACT(1, 2, 3), sin: GEXACT(-1, 2) },
  { n: -1, d: 4, cos: GEXACT(1, 2, 2), sin: GEXACT(-1, 2, 2) },
  { n: -1, d: 3, cos: GEXACT(1, 2), sin: GEXACT(-1, 2, 3) },
  { n: -1, d: 2, cos: GEXACT(0, 1), sin: GEXACT(-1, 1) },
  { n: -2, d: 3, cos: GEXACT(-1, 2), sin: GEXACT(-1, 2, 3) },
  { n: -3, d: 4, cos: GEXACT(-1, 2, 2), sin: GEXACT(-1, 2, 2) },
  { n: -5, d: 6, cos: GEXACT(-1, 2, 3), sin: GEXACT(-1, 2) }
];
var ARCCOS_GRID = FULL_GRID.filter((g) => g.n >= 0 && g.n <= g.d);
function gridPhaseFrom(cosV, sinV) {
  if (cosV.exact === null || sinV.exact === null) return null;
  for (const g of FULL_GRID) if (exactEq2(cosV.exact, g.cos) && exactEq2(sinV.exact, g.sin)) {
    return g.n === 0 ? { s: rat(0n), k: 0 } : { s: rat(BigInt(g.n), BigInt(g.d)), k: 1 };
  }
  return null;
}
function gridArccos(c) {
  if (c.exact === null) return null;
  for (const g of ARCCOS_GRID) if (exactEq2(c.exact, g.cos)) {
    return g.n === 0 ? { s: rat(0n), k: 0 } : { s: rat(BigInt(g.n), BigInt(g.d)), k: 1 };
  }
  return null;
}
function normalizePhase(phi) {
  if (isZeroPi(phi)) return { s: rat(0n), k: 0 };
  if (phi.k !== 1 || phi.s.exact === null || phi.s.exact.radicand !== 1) return phi;
  let p2 = phi.s.exact.num;
  const q = phi.s.exact.den;
  const two = 2n * q;
  p2 = (p2 % two + two) % two;
  if (p2 > q) p2 -= two;
  return p2 === 0n ? { s: rat(0n), k: 0 } : { s: rat(p2, q), k: 1 };
}
function resolveModel(op, base) {
  const checks = [];
  const violations = [];
  const errors = [];
  const rates = rateSources(op);
  const omega = rates.length ? rates[0].w : null;
  for (let i = 1; i < rates.length; i++) {
    const d = Math.abs(approxP(rates[i].w) - approxP(omega));
    const pass = d <= EPS_SELF4 * Math.max(1, Math.abs(approxP(omega)));
    checks.push({ kind: "rate_redundant", detail: `ngu\u1ED3n \u03C9 d\u01B0 "${rates[i].name}" kh\u1EDBp "${rates[0].name}"`, residual: d, pass });
    if (!pass) violations.push({ id: "nguon-du-lech", message: `ngu\u1ED3n \u03C9 "${rates[i].name}" (${approxP(rates[i].w).toFixed(4)}) l\u1EC7ch "${rates[0].name}" (${approxP(omega).toFixed(4)}) \u2014 d\u1ECBch sai \u0111\u1EC1` });
  }
  const ampls = amplSources(op, omega, base);
  let A = ampls.length ? ampls[0].A : null;
  for (let i = 1; i < ampls.length; i++) {
    const d = Math.abs(ampls[i].A.approx - A.approx);
    const pass = d <= EPS_SELF4 * Math.max(1, Math.abs(A.approx));
    checks.push({ kind: "ampl_redundant", detail: `ngu\u1ED3n A d\u01B0 "${ampls[i].name}" kh\u1EDBp "${ampls[0].name}"`, residual: d, pass });
    if (!pass) violations.push({ id: "nguon-du-lech", message: `ngu\u1ED3n A "${ampls[i].name}" (${ampls[i].A.approx.toFixed(4)}) l\u1EC7ch "${ampls[0].name}" (${A.approx.toFixed(4)}) \u2014 d\u1ECBch sai \u0111\u1EC1` });
  }
  if (A !== null && A.approx <= EPS_T2) {
    violations.push({ id: "bien-do-khong-duong", message: `v\u1EADt "${op.name}" kh\xF4ng dao \u0111\u1ED9ng (A = ${A.approx} \u2264 0)` });
    A = null;
  }
  let phi = null;
  if (op.phi !== void 0) {
    let p2 = toPiScalar(op.phi);
    if (op.form === "sin") p2 = subP(p2, { s: rat(1n, 2n), k: 1 });
    phi = normalizePhase(p2);
  } else if (op.initial && omega && A) {
    const cosV = div(scalarFromNumber(op.initial.x0), A);
    const v0 = velToBase(op.initial.v0 ?? 0, op.initial.unit, base);
    const wA = mulP(omega, scalarToPi(A));
    const sinP0 = piToScalar(divP(scalarToPi(neg(v0)), wA));
    const g = gridPhaseFrom(cosV, sinP0);
    phi = g ? normalizePhase(g) : { s: num(Math.atan2(-v0.approx / approxP(omega), op.initial.x0 / A.approx)), k: 0 };
  }
  const kSpring = op.spring ? scalarFromNumber(op.spring.k) : null;
  const massKg = op.mass !== void 0 ? op.massUnit === "g" ? mul(scalarFromNumber(op.mass), rat(1n, 1000n)) : scalarFromNumber(op.mass) : null;
  return { model: { name: op.name, A, omega, phi, massKg, kSpring, op }, checks, violations, errors };
}
function phaseAt(model, t) {
  return addP(mulP(model.omega, t), model.phi);
}
var evalXn = (An, wn, phin, tn) => An * Math.cos(wn * tn + phin);
var evalVn = (An, wn, phin, tn) => -An * wn * Math.sin(wn * tn + phin);
function energyAt(model, xMeters, base) {
  const half = rat(1n, 2n);
  if (model.kSpring) {
    const E2 = scalarToPi(mul(half, mul(model.kSpring, mul(xMeters, xMeters))));
    return { E: E2, En: approxP(E2) };
  }
  if (model.massKg && model.omega) {
    const E2 = mulP(mulP(scalarToPi(mul(half, model.massKg)), sqPi(model.omega)), scalarToPi(mul(xMeters, xMeters)));
    return { E: E2, En: approxP(E2) };
  }
  return null;
}
function firstTimeAtX(model, xTarget, direction, label) {
  const A = model.A, omega = model.omega, phi = model.phi;
  const An = A.approx, wn = approxP(omega), phin = approxP(phi);
  const cN = xTarget / An;
  if (Math.abs(cN) > 1 + 1e-9) return { ok: false, problem: `x\u2080 = ${xTarget} ngo\xE0i \u0111o\u1EA1n [\u2212A, A] (A = ${fmtNum8(An)})` };
  const T = divP(TWO_PI, omega);
  const TN = approxP(T);
  const boundary = Math.abs(cN) >= 1 - 1e-9;
  if (boundary && direction !== "any") return { ok: false, problem: `x = ${xTarget} l\xE0 bi\xEAn (v = 0) \u2014 kh\xF4ng c\xF3 chi\u1EC1u qua, d\xF9ng direction:'any'` };
  const c = div(scalarFromNumber(xTarget), A);
  const theta0 = gridArccos(c);
  const grid = theta0 !== null;
  const solveBranch = (thetaSigned, thetaSignedN) => {
    const base = divP(subP(thetaSigned, phi), omega);
    const baseN = approxP(base);
    let m = Math.round((EPS_T2 - baseN) / TN);
    while (baseN + m * TN <= EPS_T2) m++;
    while (baseN + (m - 1) * TN > EPS_T2) m--;
    return addP(base, mulP(scalarToPi(scalarFromNumber(m)), T));
  };
  const solveBranchN = (thetaSignedN) => {
    const baseN = (thetaSignedN - phin) / wn;
    let m = Math.round((EPS_T2 - baseN) / TN);
    while (baseN + m * TN <= EPS_T2) m++;
    while (baseN + (m - 1) * TN > EPS_T2) m--;
    return baseN + m * TN;
  };
  const theta0N = Math.acos(Math.max(-1, Math.min(1, cN)));
  const wantBranches = [];
  if (grid) {
    const negTheta = theta0;
    const posThetaN = -theta0N, negThetaN = theta0N;
    if (direction === "negative" || direction === "any") wantBranches.push({ theta: negTheta, thetaN: negThetaN });
    if (direction === "positive" || direction === "any") wantBranches.push({ theta: negP(negTheta), thetaN: posThetaN });
  }
  let tPi;
  if (grid && wantBranches.length) {
    const cand = wantBranches.map((b) => solveBranch(b.theta, b.thetaN));
    tPi = cand.reduce((best, cur) => approxP(cur) < approxP(best) ? cur : best);
  } else {
    const cands = [];
    if (direction === "negative" || direction === "any") cands.push(solveBranchN(theta0N));
    if (direction === "positive" || direction === "any") cands.push(solveBranchN(-theta0N));
    tPi = { s: num(Math.min(...cands)), k: 0 };
  }
  const tN = approxP(tPi);
  const answer = mkAnsP("first_time_at_x", tPi, tN, "s", label);
  const checks = [];
  checks.push({ kind: "first_time_mode", detail: grid ? "first_time: \u0111\u01B0\u1EDDng l\u01B0\u1EDBi (exact)" : "first_time: off-grid, \u0111\u01B0\u1EDDng s\u1ED1", residual: 0, pass: true });
  const xBack = evalXn(An, wn, phin, tN);
  checks.push({ kind: "first_time_x", detail: `x(t*) = x\u2080 = ${xTarget}`, residual: Math.abs(xBack - xTarget), pass: Math.abs(xBack - xTarget) <= EPS_SELF4 * Math.max(1, An) });
  if (!boundary && direction !== "any") {
    const vBack = evalVn(An, wn, phin, tN);
    const ok = direction === "positive" ? vBack > 0 : vBack < 0;
    checks.push({ kind: "first_time_dir", detail: `chi\u1EC1u ${direction} t\u1EA1i t*`, residual: ok ? 0 : Math.abs(vBack), pass: ok });
  }
  if (!boundary) {
    const N = 2048;
    let earliest = Infinity;
    let prev = evalXn(An, wn, phin, EPS_T2) - xTarget;
    for (let i = 1; i <= N; i++) {
      const tau = EPS_T2 + (tN - EPS_T2) * i / N;
      const cur = evalXn(An, wn, phin, tau) - xTarget;
      if (prev === 0 || prev < 0 !== cur < 0) {
        const vmid = evalVn(An, wn, phin, tau - (tN - EPS_T2) / (2 * N));
        const dirOk = direction === "any" || (direction === "positive" ? vmid > 0 : vmid < 0);
        if (dirOk && tau < tN - 1e-7) {
          earliest = Math.min(earliest, tau);
          break;
        }
      }
      prev = cur;
    }
    checks.push({ kind: "first_time_minimal", detail: "kh\xF4ng nghi\u1EC7m h\u1EE3p l\u1EC7 s\u1EDBm h\u01A1n t*", residual: Number.isFinite(earliest) ? earliest : 0, pass: !Number.isFinite(earliest) });
  }
  return { ok: true, answer, checks, tSolved: tN };
}
function computeOscQuery(solved, q, base) {
  const m = solved.model;
  const reqA = () => m.A;
  const reqW = () => m.omega;
  const needAW = () => m.A === null ? `c\u1EA7n bi\xEAn \u0111\u1ED9 A c\u1EE7a "${m.name}" \u2014 \u0111\u1EC1 kh\xF4ng \u0111\u1EE7 d\u1EEF ki\u1EC7n ho\u1EB7c d\u1ECBch thi\u1EBFu` : m.omega === null ? `c\u1EA7n t\u1EA7n s\u1ED1 g\xF3c \u03C9 c\u1EE7a "${m.name}" \u2014 \u0111\u1EC1 kh\xF4ng \u0111\u1EE7 d\u1EEF ki\u1EC7n ho\u1EB7c d\u1ECBch thi\u1EBFu` : null;
  const needPhase = () => m.phi === null ? `c\u1EA7n pha ban \u0111\u1EA7u c\u1EE7a "${m.name}" \u2014 \u0111\u1EC1 thi\u1EBFu \u03C6 v\xE0 \u0111i\u1EC1u ki\u1EC7n \u0111\u1EA7u` : null;
  switch (q.kind) {
    case "omega": {
      if (m.omega === null) return { ok: false, problem: `c\u1EA7n \u03C9 c\u1EE7a "${m.name}"` };
      return { ok: true, answer: mkAnsP("omega", m.omega, approxP(m.omega), "rad/s", q.label), checks: [] };
    }
    case "period": {
      if (m.omega === null) return { ok: false, problem: `c\u1EA7n \u03C9 \u0111\u1EC3 t\xEDnh chu k\u1EF3 c\u1EE7a "${m.name}"` };
      const T = divP(TWO_PI, m.omega);
      const checks = [];
      const f = divP(m.omega, TWO_PI);
      const prod = mulP(T, f);
      checks.push({ kind: "period_freq", detail: "T\xB7f = 1", residual: Math.abs(approxP(prod) - 1), pass: Math.abs(approxP(prod) - 1) <= EPS_SELF4 });
      return { ok: true, answer: mkAnsP("period", T, approxP(T), "s", q.label), checks, tSolved: approxP(T) };
    }
    case "frequency": {
      if (m.omega === null) return { ok: false, problem: `c\u1EA7n \u03C9 \u0111\u1EC3 t\xEDnh t\u1EA7n s\u1ED1 c\u1EE7a "${m.name}"` };
      const f = divP(m.omega, TWO_PI);
      return { ok: true, answer: mkAnsP("frequency", f, approxP(f), "Hz", q.label), checks: [] };
    }
    case "amplitude": {
      if (m.A === null) return { ok: false, problem: `c\u1EA7n bi\xEAn \u0111\u1ED9 A c\u1EE7a "${m.name}"` };
      return { ok: true, answer: mkAnsS("amplitude", m.A, m.A.approx, base, q.label), checks: [] };
    }
    case "initial_phase": {
      const e = needPhase();
      if (e) return { ok: false, problem: e };
      return { ok: true, answer: mkAnsP("initial_phase", m.phi, approxP(m.phi), "rad", q.label), checks: [] };
    }
    case "vmax": {
      const e = needAW();
      if (e) return { ok: false, problem: e };
      const v = mulP(scalarToPi(m.A), m.omega);
      const o = outVel(base, q.unit);
      const vc = mulP(v, scalarToPi(o.factor));
      return { ok: true, answer: mkAnsP("vmax", vc, approxP(vc), o.unit, q.label), checks: [] };
    }
    case "amax": {
      const e = needAW();
      if (e) return { ok: false, problem: e };
      const a = mulP(scalarToPi(m.A), sqPi(m.omega));
      const o = outAcc(base, q.unit);
      const ac = mulP(a, scalarToPi(o.factor));
      return { ok: true, answer: mkAnsP("amax", ac, approxP(ac), o.unit, q.label), checks: [] };
    }
    case "x_at": {
      const e = needAW() || needPhase();
      if (e) return { ok: false, problem: e };
      const A = m.A, omega = m.omega, phi = m.phi;
      const pha = phaseAt(m, toPiScalar(q.t));
      const x = mul(A, cosP(pha));
      const An = A.approx, wn = approxP(omega), phin = approxP(phi), tn = approxP(toPiScalar(q.t));
      const xn = evalXn(An, wn, phin, tn);
      const checks = [];
      checks.push({ kind: "x_bound", detail: "|x| \u2264 A", residual: Math.max(0, Math.abs(xn) - An), pass: Math.abs(xn) <= An * (1 + 1e-9) });
      const vn = evalVn(An, wn, phin, tn);
      const rel2 = vn * vn + wn * wn * xn * xn - wn * wn * An * An;
      checks.push({ kind: "indep_relation", detail: "v\xB2 + \u03C9\xB2x\xB2 = \u03C9\xB2A\xB2", residual: Math.abs(rel2), pass: Math.abs(rel2) <= EPS_SELF4 * Math.max(1, (wn * An) ** 2) });
      return { ok: true, answer: mkAnsS("x_at", x, xn, base, q.label), checks, tSolved: tn };
    }
    case "v_at": {
      const e = needAW() || needPhase();
      if (e) return { ok: false, problem: e };
      const A = m.A, omega = m.omega, phi = m.phi;
      const pha = phaseAt(m, toPiScalar(q.t));
      const v = negP(mulP(mulP(scalarToPi(A), omega), scalarToPi(sinP(pha))));
      const o = outVel(base, q.unit);
      const vc = mulP(v, scalarToPi(o.factor));
      const An = A.approx, wn = approxP(omega), phin = approxP(phi), tn = approxP(toPiScalar(q.t));
      const vn = evalVn(An, wn, phin, tn) * o.factor.approx;
      const vmaxN = An * wn * o.factor.approx;
      const checks = [{ kind: "v_bound", detail: "|v| \u2264 vmax", residual: Math.max(0, Math.abs(vn) - Math.abs(vmaxN)), pass: Math.abs(vn) <= Math.abs(vmaxN) * (1 + 1e-9) }];
      return { ok: true, answer: mkAnsP("v_at", vc, vn, o.unit, q.label), checks, tSolved: tn };
    }
    case "a_at": {
      const e = needAW() || needPhase();
      if (e) return { ok: false, problem: e };
      const A = m.A, omega = m.omega, phi = m.phi;
      const pha = phaseAt(m, toPiScalar(q.t));
      const x = mul(A, cosP(pha));
      const a = negP(mulP(sqPi(omega), scalarToPi(x)));
      const o = outAcc(base, q.unit);
      const ac = mulP(a, scalarToPi(o.factor));
      const An = A.approx, wn = approxP(omega), phin = approxP(phi), tn = approxP(toPiScalar(q.t));
      const xn = evalXn(An, wn, phin, tn);
      const an = -wn * wn * xn * o.factor.approx;
      const amaxN = An * wn * wn * o.factor.approx;
      const checks = [{ kind: "a_bound", detail: "|a| \u2264 amax; a = \u2212\u03C9\xB2x", residual: Math.max(0, Math.abs(an) - Math.abs(amaxN)), pass: Math.abs(an) <= Math.abs(amaxN) * (1 + 1e-9) }];
      return { ok: true, answer: mkAnsP("a_at", ac, an, o.unit, q.label), checks, tSolved: tn };
    }
    case "speed_at_x": {
      const e = needAW();
      if (e) return { ok: false, problem: e };
      const A = m.A, omega = m.omega;
      if (Math.abs(q.x) > A.approx * (1 + 1e-9)) return { ok: false, problem: `|x| = ${Math.abs(q.x)} > A = ${fmtNum8(A.approx)} \u2014 li \u0111\u1ED9 ngo\xE0i bi\xEAn` };
      const root = sqrt(sub2(mul(A, A), mul(scalarFromNumber(q.x), scalarFromNumber(q.x))));
      const v = mulP(omega, scalarToPi(root));
      const o = outVel(base, q.unit);
      const vc = mulP(v, scalarToPi(o.factor));
      return { ok: true, answer: mkAnsP("speed_at_x", vc, approxP(vc), o.unit, q.label), checks: [] };
    }
    case "x_at_speed": {
      const e = needAW();
      if (e) return { ok: false, problem: e };
      const A = m.A, omega = m.omega;
      const vBase = velToBase(q.v, q.vUnit, base);
      const vmaxN = A.approx * approxP(omega);
      if (vBase.approx > vmaxN * (1 + 1e-9)) return { ok: false, problem: `v = ${vBase.approx} > vmax = ${fmtNum8(vmaxN)} \u2014 v\u01B0\u1EE3t t\u1ED1c \u0111\u1ED9 c\u1EF1c \u0111\u1EA1i` };
      const vOverW = divP(scalarToPi(vBase), omega);
      const x = piToScalar(sqrtP(subP(scalarToPi(mul(A, A)), sqPi(vOverW))));
      return { ok: true, answer: mkAnsS("x_at_speed", x, x.approx, base, q.label), checks: [] };
    }
    case "x_where_energy_ratio": {
      if (m.A === null) return { ok: false, problem: `c\u1EA7n bi\xEAn \u0111\u1ED9 A c\u1EE7a "${m.name}"` };
      const denom = sqrt(add2(rat(1n), scalarFromNumber(q.ratio)));
      const x = div(m.A, denom);
      return { ok: true, answer: mkAnsS("x_where_energy_ratio", x, x.approx, base, q.label), checks: [] };
    }
    case "energy_total": {
      const A = reqA();
      if (A === null) return { ok: false, problem: `c\u1EA7n bi\xEAn \u0111\u1ED9 A c\u1EE7a "${m.name}"` };
      const Am = mul(A, cmToM(base));
      const E2 = energyAt(m, Am, base);
      if (!E2) return { ok: false, problem: `c\u1EA7n \u0111\u1ED9 c\u1EE9ng k HO\u1EB6C (kh\u1ED1i l\u01B0\u1EE3ng m v\xE0 \u03C9) \u0111\u1EC3 t\xEDnh n\u0103ng l\u01B0\u1EE3ng c\u1EE7a "${m.name}"` };
      return { ok: true, answer: mkAnsP("energy_total", E2.E, E2.En, "J", q.label), checks: [] };
    }
    case "energy_potential_at":
    case "energy_kinetic_at": {
      const A = reqA();
      if (A === null) return { ok: false, problem: `c\u1EA7n bi\xEAn \u0111\u1ED9 A c\u1EE7a "${m.name}"` };
      const at = q.at;
      let xLen;
      let xn;
      if (at.x !== void 0) {
        xLen = scalarFromNumber(at.x);
        xn = at.x;
      } else {
        const e = needAW() || needPhase();
        if (e) return { ok: false, problem: e };
        const tPi = toPiScalar(at.t);
        const pha = phaseAt(m, tPi);
        xLen = mul(A, cosP(pha));
        xn = evalXn(A.approx, approxP(m.omega), approxP(m.phi), approxP(tPi));
      }
      if (Math.abs(xn) > A.approx * (1 + 1e-9)) return { ok: false, problem: `|x| = ${Math.abs(xn)} > A = ${fmtNum8(A.approx)}` };
      const Am = mul(A, cmToM(base));
      const xm = mul(xLen, cmToM(base));
      const W = energyAt(m, Am, base);
      const Wt = energyAt(m, xm, base);
      if (!W || !Wt) return { ok: false, problem: `c\u1EA7n k HO\u1EB6C (m v\xE0 \u03C9) \u0111\u1EC3 t\xEDnh n\u0103ng l\u01B0\u1EE3ng c\u1EE7a "${m.name}"` };
      const checks = [];
      if (q.kind === "energy_potential_at") {
        return { ok: true, answer: mkAnsP("energy_potential_at", Wt.E, Wt.En, "J", q.label), checks };
      }
      const Wd = subP(W.E, Wt.E);
      const recon = addP(Wd, Wt.E);
      checks.push({ kind: "energy_conserve", detail: "W\u0111 + Wt = W", residual: Math.abs(approxP(recon) - W.En), pass: Math.abs(approxP(recon) - W.En) <= EPS_SELF4 * Math.max(1, W.En) });
      return { ok: true, answer: mkAnsP("energy_kinetic_at", Wd, approxP(Wd), "J", q.label), checks };
    }
    case "first_time_at_x": {
      const e = needAW() || needPhase();
      if (e) return { ok: false, problem: e };
      return firstTimeAtX(m, q.x, q.direction ?? "any", q.label);
    }
  }
  return { ok: false, problem: `query ${q.kind} ch\u01B0a h\u1ED7 tr\u1EE3` };
}

// api/_lib/kernel/physics/oscillationScene.ts
var COLORS3 = ["#FFA500", "#38BDF8", "#F472B6", "#4ADE80"];
var rnd2 = (n) => parseFloat(n.toFixed(6));
var num9 = (x) => {
  const s = parseFloat(x.toPrecision(12)).toString();
  return s.includes("e") || s.includes("E") ? x.toFixed(9) : s;
};
function playbackOf3(plan, tPhys) {
  if (plan.scene.durationSec) return { durationSec: plan.scene.durationSec, timeScale: tPhys / plan.scene.durationSec };
  if (tPhys >= 3 && tPhys <= 15) return { durationSec: tPhys, timeScale: 1 };
  return { durationSec: 10, timeScale: tPhys / 10 };
}
function cosExpr(A, wk, phi) {
  const p2 = num9(Math.abs(phi));
  const sign = phi < 0 ? "-" : "+";
  return `${num9(A)}*Math.cos(${num9(wk)}*t ${sign} ${p2})`;
}
function buildOscillationScene(plan, models, tPhys) {
  const playback = playbackOf3(plan, tPhys);
  const k = playback.timeScale;
  if (models.length === 0) return { geometry: null, playback };
  const points = [];
  const lines = [];
  const agents = [];
  const tracks = [];
  const labelOf = (name) => plan.scene.labels?.[name] ?? name;
  let span = 1;
  let ci = 0;
  for (const m of models) {
    const color = COLORS3[ci % COLORS3.length];
    const pend = m.op.pendulum;
    if (pend) {
      const lM = pend.lUnit === "cm" ? pend.l / 100 : pend.l;
      const off = ci * 1.2;
      points.push({ id: `P_${m.name}`, label: "", x: off, y: 0, z: lM });
      points.push({ id: `M_${m.name}`, label: labelOf(m.name), x: off, y: 0, z: 0 });
      lines.push({ id: `day_${m.name}`, from: `P_${m.name}`, to: `M_${m.name}`, style: "solid", color: "#8B8B8B" });
      span = Math.max(span, lM);
    } else if (m.A !== null) {
      const A = m.A.approx;
      span = Math.max(span, 2 * A);
      points.push({ id: `O_${m.name}`, label: "VTCB", x: 0, y: 0, z: 0 });
      points.push({ id: `Bp_${m.name}`, label: "Bi\xEAn +A", x: rnd2(A), y: 0, z: 0 });
      points.push({ id: `Bm_${m.name}`, label: "Bi\xEAn \u2212A", x: rnd2(-A), y: 0, z: 0 });
      lines.push({ id: `quydao_${m.name}`, from: `Bm_${m.name}`, to: `Bp_${m.name}`, style: "solid", color: "#8B8B8B" });
      const radius = Math.max(0.12, 0.02 * span);
      const canAnimate = m.omega !== null && m.phi !== null;
      if (canAnimate) {
        const wn = approxP(m.omega);
        const phin = approxP(m.phi);
        const x0 = rnd2(A * Math.cos(phin));
        agents.push({ id: m.name, label: labelOf(m.name), initialPosition: [x0, 0, 0], color, radius });
        const landX = rnd2(A * Math.cos(wn * tPhys + phin));
        tracks.push({
          id: `mv_${m.name}`,
          start: 0,
          end: playback.durationSec,
          type: "parametric_path",
          targetId: m.name,
          params: {
            equations: { x: cosExpr(A, wn * k, phin), y: "0", z: "0" },
            path: `x(t) = A\xB7cos(\u03C9t + \u03C6) \u2014 ${m.name}`,
            landing_point: [landX, 0, 0],
            // = vị trí tại T_phys (BẮT BUỘC v0 R2)
            timeScale: k
          }
        });
      } else {
        agents.push({ id: m.name, label: labelOf(m.name), initialPosition: [0, 0, 0], color, radius });
      }
    }
    ci++;
  }
  const geometry = {
    name: plan.problemName,
    axisUnit: plan.units.length,
    tags: ["physics", "oscillation", `timeScale:${num9(k)}`],
    points,
    lines,
    curves: [],
    agents,
    timeline: { duration: playback.durationSec, tracks }
  };
  return { geometry, playback };
}
function buildOscillationCharts(plan, models, tPhys) {
  const byName = new Map(models.map((m) => [m.name, m]));
  const out = [];
  for (const ch of plan.charts) {
    const series = [];
    for (const name of ch.of) {
      const m = byName.get(name);
      if (!m || m.A === null || m.omega === null || m.phi === null) continue;
      const A = m.A.approx, wn = approxP(m.omega), phin = approxP(m.phi);
      const N = 128;
      const samples = [];
      for (let i = 0; i <= N; i++) {
        const t = tPhys * i / N;
        samples.push([t, ch.kind === "x_t" ? A * Math.cos(wn * t + phin) : -A * wn * Math.sin(wn * t + phin)]);
      }
      series.push({ name, samples });
    }
    out.push({ kind: ch.kind, tUnit: "s", vUnit: ch.kind === "x_t" ? plan.units.length : `${plan.units.length}/s`, series });
  }
  return out;
}

// api/_lib/kernel/physics/runOscillation.ts
var TOL_ASSERT4 = 1e-3;
var ZERO_PLAYBACK = { durationSec: 0, timeScale: 1 };
function timeOfQuery(q) {
  const anyq = q;
  if (anyq.t !== void 0) return approxP(toPiScalar(anyq.t));
  if (anyq.at && anyq.at.t !== void 0) return approxP(toPiScalar(anyq.at.t));
  return null;
}
function runOscillation(raw) {
  const parsed = OscillationPlanSchema.safeParse(raw);
  if (!parsed.success) {
    const iss = parsed.error.issues[0];
    const detail = iss ? `${iss.path.length ? `${iss.path.join(".")}: ` : ""}${iss.message}` : "schema";
    return {
      ok: false,
      answers: [],
      checks: [],
      violations: [],
      errors: [{ message: `Invalid oscillation plan: ${detail}` }],
      geometry: null,
      charts: [],
      meta: { tPhys: 0, playback: ZERO_PLAYBACK, unitsNote: "per-quantity", length: "cm", models: [] }
    };
  }
  const plan = parsed.data;
  const base = plan.units.length;
  const errors = [];
  const checks = [];
  const violations = [];
  const answers = [];
  let geometry = null;
  let charts = [];
  let playback = { ...ZERO_PLAYBACK };
  let tPhys = 0;
  let models = [];
  try {
    const solvedByName = /* @__PURE__ */ new Map();
    for (const op of plan.ops) {
      const solved = resolveModel(op, base);
      solvedByName.set(op.name, solved);
      checks.push(...solved.checks);
      for (const v of solved.violations) violations.push({ id: v.id, message: v.message });
      for (const e of solved.errors) errors.push({ message: e.message });
    }
    models = plan.ops.map((op) => solvedByName.get(op.name).model);
    for (const [qi, q] of plan.queries.entries()) {
      const solved = solvedByName.get(q.of);
      if (!solved) {
        errors.push({ message: `query ${q.kind}: v\u1EADt "${q.of}" kh\xF4ng t\u1ED3n t\u1EA1i` });
        continue;
      }
      const r2 = computeOscQuery(solved, q, base);
      if (r2.ok === false) {
        errors.push({ message: `query ${q.kind}: ${r2.problem}` });
        continue;
      }
      answers.push({ ...r2.answer, queryIndex: qi });
      checks.push(...r2.checks);
      for (const c of r2.checks) if (!c.pass) errors.push({ message: `t\u1EF1 ki\u1EC3m FAIL: ${c.detail} (residual ${c.residual.toExponential(2)})` });
      if (r2.tSolved !== void 0 && Number.isFinite(r2.tSolved)) tPhys = Math.max(tPhys, r2.tSolved);
    }
    for (const m of models) if (m.omega !== null) {
      const T = approxP(divP(TWO_PI, m.omega));
      if (Number.isFinite(T)) tPhys = Math.max(tPhys, 2 * T);
    }
    for (const q of plan.queries) {
      const t = timeOfQuery(q);
      if (t !== null && Number.isFinite(t)) tPhys = Math.max(tPhys, t);
    }
    tPhys = tPhys > 1e-9 ? tPhys : 1;
    for (const a of plan.asserts) {
      const solved = solvedByName.get(a.query.of);
      if (!solved) {
        errors.push({ message: `assert ${a.query.kind}: v\u1EADt "${a.query.of}" kh\xF4ng t\u1ED3n t\u1EA1i` });
        continue;
      }
      const r2 = computeOscQuery(solved, a.query, base);
      if (r2.ok === false) {
        errors.push({ message: `assert ${a.query.kind}: ${r2.problem}` });
        continue;
      }
      const tol = (a.tol ?? TOL_ASSERT4) * Math.max(1, Math.abs(a.equals));
      const delta = Math.abs(r2.answer.approx - a.equals);
      if (delta > tol) violations.push({ assert: a.query.kind, expected: a.equals, got: r2.answer.approx, delta, message: `assert ${a.query.kind}: k\u1EF3 v\u1ECDng ${a.equals}, engine t\xEDnh ${r2.answer.approx}` });
    }
  } catch (err) {
    errors.push({ message: `l\u1ED7i engine dao \u0111\u1ED9ng: ${err instanceof Error ? err.message : String(err)}` });
  }
  const hasPhysicalViolation = violations.some((v) => v.id !== void 0 && PHYSICAL_VIOLATIONS2.has(v.id));
  const servedAnswers = hasPhysicalViolation ? [] : answers;
  const okState = violations.length === 0 && errors.length === 0;
  if (okState) {
    const built = buildOscillationScene(plan, models, tPhys);
    geometry = built.geometry;
    playback = built.playback;
    charts = buildOscillationCharts(plan, models, tPhys);
  }
  const ok = violations.length === 0 && errors.length === 0 && servedAnswers.length === plan.queries.length && servedAnswers.every((a) => Number.isFinite(a.approx));
  return {
    ok,
    answers: servedAnswers,
    checks,
    violations,
    errors,
    geometry,
    charts,
    meta: {
      tPhys,
      playback,
      unitsNote: "per-quantity",
      length: base,
      models: models.map((m) => ({
        name: m.name,
        hasA: m.A !== null,
        hasOmega: m.omega !== null,
        hasPhase: m.phi !== null,
        animated: m.A !== null && m.omega !== null && m.phi !== null && !m.op.pendulum
      }))
    }
  };
}

// api/_lib/kernel/physics/waveSchema.ts
var Num6 = external_exports.number().finite();
var Obj4 = external_exports.string().min(1);
var LenUnit2 = external_exports.enum(["m", "cm"]);
var SpeedUnit = external_exports.enum(["m/s", "cm/s"]);
var Sci = external_exports.union([
  Num6,
  external_exports.object({ n: Num6, d: external_exports.number().int().positive().default(1), exp: external_exports.number().int().default(0) })
]);
function piRatPositive2(pr) {
  return typeof pr === "number" ? pr > 0 : pr.n > 0;
}
var WaveOp = external_exports.object({
  op: external_exports.literal("wave"),
  name: Obj4,
  A: Num6.positive().optional(),
  // biên độ (units.length)
  // NGUỒN TẦN SỐ (f/T π-tự-do; omega mang π khi đề cho pt "…cos(20πt−…)")
  f: Num6.positive().optional(),
  T: Num6.positive().optional(),
  omega: PiRat.optional(),
  // NGUỒN BƯỚC SÓNG / TỐC ĐỘ
  lambda: Num6.positive().optional(),
  speed: Num6.positive().optional(),
  speedUnit: SpeedUnit.optional(),
  spaceCoeff: PiRat.optional(),
  // HỆ SỐ KHÔNG GIAN của pt = 2π/λ (vd πx/12 → {n:1,d:12,pi:true})
  // PHA & CHIỀU
  phi: PiRat.optional(),
  direction: external_exports.enum(["+x", "-x"]).default("+x")
  // pt u=Acos(ωt − 2πx/λ + φ) ⇒ '+x'; dấu '+' số hạng x ⇒ '-x'
});
var SoundSourceOp = external_exports.object({
  op: external_exports.literal("sound_source"),
  name: Obj4,
  I0: Sci.default({ n: 1, exp: -12 }),
  // cường độ âm chuẩn (W/m²) — mặc định 10⁻¹²
  power: Sci.optional(),
  // công suất P (W) ⇒ nguồn điểm đẳng hướng, I(r) = P/(4πr²)
  intensity: external_exports.object({ I: Sci, atDistance: Num6.positive().optional(), rUnit: LenUnit2.optional() }).optional(),
  level: external_exports.object({ L: Num6, atDistance: Num6.positive().optional(), rUnit: LenUnit2.optional() }).optional()
});
var WaveQuerySchema = external_exports.discriminatedUnion("kind", [
  // — đại lượng sóng —
  external_exports.object({ kind: external_exports.literal("speed"), of: Obj4, unit: SpeedUnit.optional(), label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("wavelength"), of: Obj4, label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("frequency"), of: Obj4, label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("period"), of: Obj4, label: external_exports.string().optional() }),
  // — phương trình sóng —
  external_exports.object({ kind: external_exports.literal("displacement_at"), of: Obj4, x: Num6, t: PiRat, label: external_exports.string().optional() }),
  // — độ lệch pha (d ≥ 0, units.length) —
  external_exports.object({ kind: external_exports.literal("phase_difference"), of: Obj4, d: Num6.nonnegative(), label: external_exports.string().optional() }),
  // — giao thoa 2 nguồn cùng pha —
  external_exports.object({ kind: external_exports.literal("interference_count"), of: Obj4, separation: Num6.positive(), kind2: external_exports.enum(["max", "min"]), label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("interference_point"), of: Obj4, d1: Num6.nonnegative(), d2: Num6.nonnegative(), label: external_exports.string().optional() }),
  // — sóng dừng (boundary: hai đầu cố định | một đầu tự do) —
  external_exports.object({ kind: external_exports.literal("standing_antinodes"), of: Obj4, length: Num6.positive(), boundary: external_exports.enum(["two-fixed", "one-free"]).default("two-fixed"), loops: external_exports.number().int().positive().optional(), label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("standing_nodes"), of: Obj4, length: Num6.positive(), boundary: external_exports.enum(["two-fixed", "one-free"]).default("two-fixed"), loops: external_exports.number().int().positive().optional(), label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("standing_wavelength"), of: Obj4, length: Num6.positive(), boundary: external_exports.enum(["two-fixed", "one-free"]).default("two-fixed"), loops: external_exports.number().int().positive(), label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("standing_frequency"), of: Obj4, length: Num6.positive(), boundary: external_exports.enum(["two-fixed", "one-free"]).default("two-fixed"), loops: external_exports.number().int().positive(), label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("standing_min_frequency"), of: Obj4, length: Num6.positive(), boundary: external_exports.enum(["two-fixed", "one-free"]).default("two-fixed"), label: external_exports.string().optional() }),
  // — sóng âm —
  external_exports.object({ kind: external_exports.literal("sound_intensity"), of: Obj4, atDistance: Num6.positive().optional(), rUnit: LenUnit2.optional(), label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("sound_level"), of: Obj4, atDistance: Num6.positive().optional(), rUnit: LenUnit2.optional(), label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("sound_level_difference"), of: Obj4, fromDistance: Num6.positive(), toDistance: Num6.positive(), rUnit: LenUnit2.optional(), label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("distance_for_level"), of: Obj4, level: Num6, rUnit: LenUnit2.optional(), label: external_exports.string().optional() })
]);
var WaveOpSchema = external_exports.discriminatedUnion("op", [WaveOp, SoundSourceOp]);
var WavePlanSchema = external_exports.object({
  problemName: external_exports.string().min(1).default("song"),
  units: external_exports.object({ length: LenUnit2.default("m"), time: external_exports.literal("s").default("s") }).default({}),
  ops: external_exports.array(WaveOpSchema).min(1),
  queries: external_exports.array(WaveQuerySchema).min(1),
  asserts: external_exports.array(external_exports.object({ query: WaveQuerySchema, equals: Num6, tol: Num6.positive().optional() })).default([]),
  knowledgeTags: external_exports.array(external_exports.string()).default([])
}).superRefine((plan, ctx) => {
  const issue = (message) => ctx.addIssue({ code: external_exports.ZodIssueCode.custom, message });
  const names = /* @__PURE__ */ new Set();
  for (const op of plan.ops) {
    if (names.has(op.name)) issue(`op "${op.name}" khai b\xE1o 2 l\u1EA7n`);
    names.add(op.name);
    if (op.op === "wave") {
      if (op.omega !== void 0 && !piRatPositive2(op.omega)) issue(`t\u1EA7n s\u1ED1 g\xF3c \u03C9 c\u1EE7a "${op.name}" ph\u1EA3i d\u01B0\u01A1ng`);
      if (op.spaceCoeff !== void 0 && !piRatPositive2(op.spaceCoeff)) issue(`h\u1EC7 s\u1ED1 kh\xF4ng gian (2\u03C0/\u03BB) c\u1EE7a "${op.name}" ph\u1EA3i d\u01B0\u01A1ng`);
    } else {
      const n = [op.power, op.intensity, op.level].filter((x) => x !== void 0).length;
      if (n !== 1) issue(`ngu\u1ED3n \xE2m "${op.name}" c\u1EA7n \u0110\xDANG M\u1ED8T ngu\u1ED3n g\u1ED1c {power | intensity | level} (\u0111ang c\xF3 ${n})`);
    }
  }
  for (const q of plan.queries) {
    if ("of" in q && q.of !== void 0 && !names.has(q.of)) issue(`query ${q.kind} tr\u1ECF op "${q.of}" kh\xF4ng t\u1ED3n t\u1EA1i`);
  }
});

// api/_lib/kernel/physics/waves.ts
var EPS_SELF5 = 1e-6;
var EPS0 = 1e-12;
var PHYSICAL_VIOLATIONS3 = /* @__PURE__ */ new Set(["nguon-du-lech", "khong-song-dung", "lambda-vo-ti"]);
var piToScalar2 = (p2) => p2.k === 0 ? p2.s : num(approxP(p2));
var ROOT10 = fromExact(makeExact(1n, 1n, 10));
function fmtNum9(x) {
  if (!Number.isFinite(x)) return "(l\u1ED7i)";
  if (x !== 0 && Math.abs(x) < 1e-3) return parseFloat(x.toPrecision(4)).toString();
  const digits = Math.abs(x) >= 1e3 ? 2 : 4;
  return parseFloat(x.toFixed(digits)).toString();
}
function mkAnsS2(kind, s, floatRef, unit, label) {
  const tol = 1e-6 * Math.max(1, Math.abs(floatRef));
  if (s.exact !== null && Math.abs(exactToApprox(s.exact) - floatRef) <= tol) {
    return { label, kind, text: displayScalar(s), approx: exactToApprox(s.exact), unit, approximate: false };
  }
  const nice = Number.isFinite(floatRef) ? recognizeConstant(floatRef) : null;
  return { label, kind, text: nice ? nice.text : fmtNum9(floatRef), approx: floatRef, unit, approximate: !nice };
}
function mkAnsCert(kind, s, floatRef, unit, label) {
  const c = certifyScalar(kind, s, floatRef);
  return { label, kind, text: c.text, approx: c.approx, unit, approximate: c.approximate };
}
function mkAnsP2(kind, p2, floatRef, unit, label) {
  const c = certifyPiScalar(p2, floatRef);
  return { label, kind, text: c.text, approx: c.approx, unit, approximate: c.approximate };
}
function mkAnsInt(kind, n, label) {
  return { label, kind, text: String(n), approx: n, unit: "", approximate: false };
}
function lenFactor2(from, to) {
  if (from === to) return rat(1n);
  return from === "cm" && to === "m" ? rat(1n, 100n) : rat(100n);
}
function speedToBase(v, unit, base) {
  const from = unit === "m/s" ? "m" : unit === "cm/s" ? "cm" : base;
  return mul(scalarFromNumber(v), lenFactor2(from, base));
}
function metersOf(value, rUnit, base) {
  const from = rUnit ?? base;
  return from === "cm" ? mul(scalarFromNumber(value), rat(1n, 100n)) : scalarFromNumber(value);
}
function sciToScalar(sci2) {
  if (typeof sci2 === "number") return scalarFromNumber(sci2);
  const d = sci2.d ?? 1;
  const exp = sci2.exp ?? 0;
  const base = scalarFromNumber(sci2.n);
  const p10 = pow10Scalar(exp);
  return div(mul(base, p10), rat(BigInt(d)));
}
function pow10Scalar(e) {
  const p2 = 10n ** BigInt(Math.abs(e));
  return e >= 0 ? fromExact(makeExact(p2, 1n)) : fromExact(makeExact(1n, p2));
}
function pow10Exp(x) {
  if (x <= 0n) return null;
  let n = 0n;
  let v = x;
  while (v % 10n === 0n) {
    v /= 10n;
    n++;
  }
  return v === 1n ? n : null;
}
function log10Exact(ratio) {
  const e = ratio.exact;
  if (e === null) return null;
  if (e.radicand === 1) {
    if (e.den === 1n) {
      const n = pow10Exp(e.num);
      return n === null ? null : fromExact(makeExact(n, 1n));
    }
    if (e.num === 1n) {
      const n = pow10Exp(e.den);
      return n === null ? null : fromExact(makeExact(-n, 1n));
    }
    return null;
  }
  if (e.radicand === 10) {
    if (e.den === 1n) {
      const n = pow10Exp(e.num);
      return n === null ? null : fromExact(makeExact(2n * n + 1n, 2n));
    }
    if (e.num === 1n) {
      const n = pow10Exp(e.den);
      return n === null ? null : fromExact(makeExact(-2n * n + 1n, 2n));
    }
    return null;
  }
  return null;
}
function intensityFromLevel(L, I0) {
  const tenth = L / 10;
  if (Number.isInteger(tenth)) return { I: mul(I0, pow10Scalar(tenth)), exact: true };
  if (Number.isInteger(L / 5)) {
    const m = (L - 5) / 10;
    return { I: mul(mul(I0, pow10Scalar(m)), ROOT10), exact: true };
  }
  return { I: num(I0.approx * Math.pow(10, tenth)), exact: false };
}
function scaleByPow10(rScal, exp, floatExp) {
  const e = exp.exact;
  if (e !== null && e.radicand === 1) {
    if (e.den === 1n) return { v: mul(rScal, pow10BigScalar(e.num)), exact: true };
    if (e.den === 2n) {
      const half = (e.num - 1n) / 2n;
      return { v: mul(mul(rScal, pow10BigScalar(half)), ROOT10), exact: true };
    }
  }
  return { v: num(rScal.approx * Math.pow(10, floatExp)), exact: false };
}
function pow10BigScalar(e) {
  const p2 = 10n ** (e < 0n ? -e : e);
  return e >= 0n ? fromExact(makeExact(p2, 1n)) : fromExact(makeExact(1n, p2));
}
function floordivBig(a, b) {
  const q = a / b, r2 = a % b;
  return r2 !== 0n && a < 0n ? q - 1n : q;
}
function ceildivBig(a, b) {
  const q = a / b, r2 = a % b;
  return r2 !== 0n && a > 0n ? q + 1n : q;
}
function countIntOpen(loN, loD, hiN, hiD) {
  const smin = floordivBig(loN, loD) + 1n;
  const smax = ceildivBig(hiN, hiD) - 1n;
  return smax >= smin ? Number(smax - smin + 1n) : 0;
}
function countIntOpenBrute(loN, loD, hiN, hiD) {
  const smin = floordivBig(loN, loD) + 1n - 2n;
  const smax = ceildivBig(hiN, hiD) - 1n + 2n;
  let c = 0;
  for (let k = smin; k <= smax; k++) if (loN < k * loD && k * hiD < hiN) c++;
  return c;
}
function ratioBig(numer, denom) {
  const r2 = div(numer, denom).exact;
  if (r2 === null || r2.radicand !== 1) return null;
  return { P: r2.num, Q: r2.den };
}
function resolveWaveModel(op, base) {
  const checks = [];
  const violations = [];
  const errors = [];
  const fSrc = [];
  if (op.f !== void 0) fSrc.push({ name: "f", f: scalarFromNumber(op.f) });
  if (op.T !== void 0) fSrc.push({ name: "T", f: div(rat(1n), scalarFromNumber(op.T)) });
  if (op.omega !== void 0) fSrc.push({ name: "omega", f: piToScalar2(divP(toPiScalar(op.omega), TWO_PI)) });
  let f = fSrc.length ? fSrc[0].f : null;
  for (let i = 1; i < fSrc.length; i++) redundant(checks, violations, "f", fSrc[i].name, fSrc[0].name, fSrc[i].f.approx, f.approx);
  const lSrc = [];
  if (op.lambda !== void 0) lSrc.push({ name: "lambda", l: scalarFromNumber(op.lambda) });
  if (op.spaceCoeff !== void 0) lSrc.push({ name: "spaceCoeff", l: piToScalar2(divP(TWO_PI, toPiScalar(op.spaceCoeff))) });
  let lambda = lSrc.length ? lSrc[0].l : null;
  for (let i = 1; i < lSrc.length; i++) redundant(checks, violations, "\u03BB", lSrc[i].name, lSrc[0].name, lSrc[i].l.approx, lambda.approx);
  let v = op.speed !== void 0 ? speedToBase(op.speed, op.speedUnit, base) : null;
  if (f && lambda && v) {
    const vlf = mul(lambda, f);
    const d = Math.abs(vlf.approx - v.approx);
    const pass = d <= EPS_SELF5 * Math.max(1, Math.abs(v.approx));
    checks.push({ kind: "v_redundant", detail: "ngu\u1ED3n d\u01B0 v = \u03BBf kh\u1EDBp", residual: d, pass });
    if (!pass) violations.push({ id: "nguon-du-lech", message: `ngu\u1ED3n d\u01B0: v (${v.approx}) \u2260 \u03BBf (${vlf.approx}) \u2014 d\u1ECBch sai \u0111\u1EC1` });
  }
  if (f && lambda && !v) v = mul(lambda, f);
  else if (f && v && !lambda) lambda = div(v, f);
  else if (lambda && v && !f) f = div(v, lambda);
  const T = f ? div(rat(1n), f) : op.T !== void 0 ? scalarFromNumber(op.T) : null;
  const omega = op.omega !== void 0 ? toPiScalar(op.omega) : f ? mulP(TWO_PI, scalarToPi(f)) : null;
  const spaceK = op.spaceCoeff !== void 0 ? toPiScalar(op.spaceCoeff) : lambda ? divP(TWO_PI, scalarToPi(lambda)) : null;
  const phi = op.phi !== void 0 ? toPiScalar(op.phi) : null;
  const dir = op.direction === "-x" ? -1 : 1;
  const A = op.A !== void 0 ? scalarFromNumber(op.A) : null;
  return { model: { name: op.name, A, f, T, lambda, v, omega, spaceK, phi, dir, op }, checks, violations, errors };
}
function redundant(checks, violations, q, nb, na, vb, va) {
  const d = Math.abs(vb - va);
  const pass = d <= EPS_SELF5 * Math.max(1, Math.abs(va));
  checks.push({ kind: "rate_redundant", detail: `ngu\u1ED3n ${q} d\u01B0 "${nb}" kh\u1EDBp "${na}"`, residual: d, pass });
  if (!pass) violations.push({ id: "nguon-du-lech", message: `ngu\u1ED3n ${q} "${nb}" (${vb.toFixed(4)}) l\u1EC7ch "${na}" (${va.toFixed(4)}) \u2014 d\u1ECBch sai \u0111\u1EC1` });
}
function resolveSoundModel(op, base) {
  const I0 = sciToScalar(op.I0 ?? { n: 1, exp: -12 });
  let power = null, Iref = null, rRef = null, levelRef = null;
  const errors = [];
  const checks = [];
  if (op.power !== void 0) {
    power = sciToScalar(op.power);
  } else if (op.intensity !== void 0) {
    Iref = sciToScalar(op.intensity.I);
    rRef = op.intensity.atDistance !== void 0 ? metersOf(op.intensity.atDistance, op.intensity.rUnit, base) : null;
    const cand = log10Exact(div(Iref, I0));
    levelRef = cand ? mul(rat(10n), cand) : num(10 * Math.log10(Iref.approx / I0.approx));
  } else if (op.level !== void 0) {
    const r2 = intensityFromLevel(op.level.L, I0);
    Iref = r2.I;
    rRef = op.level.atDistance !== void 0 ? metersOf(op.level.atDistance, op.level.rUnit, base) : null;
    levelRef = scalarFromNumber(op.level.L);
  }
  return { model: { name: op.name, I0, power, Iref, rRef, levelRef, op }, checks, violations: [], errors };
}
function intensityAt(m, r2) {
  if (m.power) {
    if (r2 === null) return { problem: `c\u1EA7n kho\u1EA3ng c\xE1ch (atDistance) cho ngu\u1ED3n c\xF4ng su\u1EA5t "${m.name}"` };
    if (Math.abs(r2.approx) < EPS0) return { problem: `kho\u1EA3ng c\xE1ch = 0 cho ngu\u1ED3n "${m.name}"` };
    const fourPi = { s: rat(4n), k: 1 };
    const r22 = mul(r2, r2);
    const I = divP(scalarToPi(m.power), mulP(fourPi, scalarToPi(r22)));
    return { approx: approxP(I), exact: null, pi: I };
  }
  if (m.Iref) {
    if (m.rRef !== null) {
      const rr = r2 ?? m.rRef;
      if (Math.abs(rr.approx) < EPS0) return { problem: `kho\u1EA3ng c\xE1ch = 0 cho ngu\u1ED3n "${m.name}"` };
      const ratioR = div(m.rRef, rr);
      const I = mul(m.Iref, mul(ratioR, ratioR));
      return { approx: I.approx, exact: I, pi: null };
    }
    return { approx: m.Iref.approx, exact: m.Iref, pi: null };
  }
  return { problem: `ngu\u1ED3n \xE2m "${m.name}" thi\u1EBFu d\u1EEF ki\u1EC7n c\u01B0\u1EDDng \u0111\u1ED9/c\xF4ng su\u1EA5t/m\u1EE9c` };
}
function levelOf(m, iv, label) {
  const floatRatio = iv.approx / m.I0.approx;
  const floatRef = 10 * Math.log10(floatRatio);
  const checks = [];
  let L;
  if (iv.exact !== null) {
    const ratio = div(iv.exact, m.I0);
    const cand = log10Exact(ratio);
    L = cand ? mul(rat(10n), cand) : num(floatRef);
    checks.push({ kind: "sound_level", detail: cand ? "I/I\u2080 l\u0169y th\u1EEBa \u221A10 \u21D2 L exact" : "I/I\u2080 kh\xF4ng l\u0169y th\u1EEBa 10 \u21D2 L s\u1ED1", residual: 0, pass: true });
  } else {
    L = num(floatRef);
    checks.push({ kind: "sound_level", detail: "ngu\u1ED3n c\xF4ng su\u1EA5t (\u03C0 trong t\u1EC9 s\u1ED1) \u21D2 L s\u1ED1", residual: 0, pass: true });
  }
  const back = Math.pow(10, floatRef / 10);
  checks.push({ kind: "sound_level_inverse", detail: "10^(L/10) = I/I\u2080", residual: Math.abs(back - floatRatio), pass: Math.abs(back - floatRatio) <= EPS_SELF5 * Math.max(1, floatRatio) });
  return { ok: true, answer: mkAnsCert("sound_level", L, floatRef, "dB", label), checks };
}
function computeWaveQuery(solved, q, base) {
  const m = solved.model;
  switch (q.kind) {
    case "speed": {
      if (m.v === null) return { ok: false, problem: `c\u1EA7n t\u1ED1c \u0111\u1ED9 v c\u1EE7a "${m.name}" \u2014 \u0111\u1EC1 thi\u1EBFu d\u1EEF ki\u1EC7n ho\u1EB7c d\u1ECBch thi\u1EBFu` };
      const o = q.unit ? outSpeed(base, q.unit) : { factor: rat(1n), unit: `${base}/s` };
      const v = mul(m.v, o.factor);
      const checks = [];
      if (m.lambda && m.f) {
        const vlf = mul(m.lambda, m.f);
        checks.push({ kind: "v_lambda_f", detail: "v = \u03BBf", residual: Math.abs(vlf.approx - m.v.approx), pass: Math.abs(vlf.approx - m.v.approx) <= EPS_SELF5 * Math.max(1, m.v.approx) });
      }
      return { ok: true, answer: mkAnsS2("speed", v, v.approx, o.unit, q.label), checks };
    }
    case "wavelength": {
      if (m.lambda === null) return { ok: false, problem: `c\u1EA7n b\u01B0\u1EDBc s\xF3ng \u03BB c\u1EE7a "${m.name}" \u2014 \u0111\u1EC1 thi\u1EBFu d\u1EEF ki\u1EC7n ho\u1EB7c d\u1ECBch thi\u1EBFu` };
      const checks = [];
      if (m.v && m.f) {
        const lvf = div(m.v, m.f);
        checks.push({ kind: "lambda_v_f", detail: "\u03BB = v/f", residual: Math.abs(lvf.approx - m.lambda.approx), pass: Math.abs(lvf.approx - m.lambda.approx) <= EPS_SELF5 * Math.max(1, m.lambda.approx) });
      }
      return { ok: true, answer: mkAnsS2("wavelength", m.lambda, m.lambda.approx, base, q.label), checks };
    }
    case "frequency": {
      if (m.f === null) return { ok: false, problem: `c\u1EA7n t\u1EA7n s\u1ED1 f c\u1EE7a "${m.name}" \u2014 \u0111\u1EC1 thi\u1EBFu d\u1EEF ki\u1EC7n ho\u1EB7c d\u1ECBch thi\u1EBFu` };
      return { ok: true, answer: mkAnsS2("frequency", m.f, m.f.approx, "Hz", q.label), checks: [] };
    }
    case "period": {
      if (m.T === null) return { ok: false, problem: `c\u1EA7n chu k\u1EF3 T (ho\u1EB7c f) c\u1EE7a "${m.name}"` };
      const checks = [];
      if (m.f) {
        const p2 = mul(m.T, m.f);
        checks.push({ kind: "period_freq", detail: "T\xB7f = 1", residual: Math.abs(p2.approx - 1), pass: Math.abs(p2.approx - 1) <= EPS_SELF5 });
      }
      return { ok: true, answer: mkAnsS2("period", m.T, m.T.approx, "s", q.label), checks, tSolved: m.T.approx };
    }
    case "displacement_at": {
      if (m.A === null) return { ok: false, problem: `c\u1EA7n bi\xEAn \u0111\u1ED9 A c\u1EE7a "${m.name}"` };
      if (m.omega === null || m.spaceK === null) return { ok: false, problem: `c\u1EA7n \u03C9 v\xE0 h\u1EC7 s\u1ED1 kh\xF4ng gian (\u03BB) c\u1EE7a "${m.name}" \u0111\u1EC3 t\xEDnh li \u0111\u1ED9` };
      const phi = m.phi ?? { s: rat(0n), k: 0 };
      const tPi = toPiScalar(q.t);
      const pha = phaseOf(m, q.x, tPi, phi);
      const u = mul(m.A, cosP(pha));
      const An = m.A.approx, phaN = approxP(pha);
      const un = An * Math.cos(phaN);
      const checks = [{ kind: "u_bound", detail: "|u| \u2264 A", residual: Math.max(0, Math.abs(un) - An), pass: Math.abs(un) <= An * (1 + 1e-9) }];
      return { ok: true, answer: mkAnsS2("displacement_at", u, un, base, q.label), checks, tSolved: approxP(tPi) };
    }
    case "phase_difference": {
      if (m.spaceK === null) return { ok: false, problem: `c\u1EA7n b\u01B0\u1EDBc s\xF3ng \u03BB c\u1EE7a "${m.name}" \u0111\u1EC3 t\xEDnh \u0111\u1ED9 l\u1EC7ch pha` };
      const dphi = mulP(m.spaceK, scalarToPi(scalarFromNumber(q.d)));
      const checks = [];
      if (m.lambda) {
        const ref = 2 * Math.PI * q.d / m.lambda.approx;
        checks.push({ kind: "phase_diff", detail: "\u0394\u03C6 = 2\u03C0d/\u03BB", residual: Math.abs(approxP(dphi) - ref), pass: Math.abs(approxP(dphi) - ref) <= EPS_SELF5 * Math.max(1, ref) });
      }
      return { ok: true, answer: mkAnsP2("phase_difference", dphi, approxP(dphi), "rad", q.label), checks };
    }
    case "interference_count": {
      if (m.lambda === null) return { ok: false, problem: `c\u1EA7n b\u01B0\u1EDBc s\xF3ng \u03BB c\u1EE7a "${m.name}" \u0111\u1EC3 \u0111\u1EBFm giao thoa` };
      const ab = ratioBig(scalarFromNumber(q.separation), m.lambda);
      if (ab === null) {
        solved.violations.push({ id: "lambda-vo-ti", message: `\u03BB v\xF4 t\u1EC9 \u2014 \u0111\u1EBFm giao thoa c\u1EA7n \u03BB h\u1EEFu t\u1EC9 ("${m.name}")` });
        return { ok: false, problem: `\u03BB v\xF4 t\u1EC9 \u2014 kh\xF4ng \u0111\u1EBFm \u0111\u01B0\u1EE3c giao thoa exact` };
      }
      const { P, Q } = ab;
      let n1, n2, kindTxt;
      if (q.kind2 === "max") {
        n1 = countIntOpen(-P, Q, P, Q);
        n2 = countIntOpenBrute(-P, Q, P, Q);
        kindTxt = "c\u1EF1c \u0111\u1EA1i";
      } else {
        n1 = countIntOpen(-(2n * P + Q), 2n * Q, 2n * P - Q, 2n * Q);
        n2 = countIntOpenBrute(-(2n * P + Q), 2n * Q, 2n * P - Q, 2n * Q);
        kindTxt = "c\u1EF1c ti\u1EC3u";
      }
      const pass = n1 === n2;
      const checks = [{ kind: "interference_two_ways", detail: `giao thoa ${kindTxt}: c\xE1ch1=${n1}, c\xE1ch2=${n2}${pass ? ", kh\u1EDBp" : ", L\u1EC6CH"}`, residual: Math.abs(n1 - n2), pass }];
      if (!pass) {
        solved.violations.push({ id: "dem-lech", message: `\u0111\u1EBFm giao thoa hai c\xE1ch l\u1EC7ch (${n1} vs ${n2})` });
        return { ok: false, problem: `\u0111\u1EBFm giao thoa hai c\xE1ch l\u1EC7ch` };
      }
      return { ok: true, answer: mkAnsInt("interference_count", n1, q.label), checks };
    }
    case "interference_point": {
      if (m.lambda === null) return { ok: false, problem: `c\u1EA7n b\u01B0\u1EDBc s\xF3ng \u03BB c\u1EE7a "${m.name}"` };
      const delta = sub2(scalarFromNumber(q.d2), scalarFromNumber(q.d1));
      const rr = div(delta, m.lambda).exact;
      const rn = delta.approx / m.lambda.approx;
      let text;
      if (rr !== null && rr.radicand === 1) {
        const numAbs = rr.num < 0n ? -rr.num : rr.num;
        if (rr.den === 1n) text = `c\u1EF1c \u0111\u1EA1i b\u1EADc ${numAbs}`;
        else if (rr.den === 2n && numAbs % 2n === 1n) text = `c\u1EF1c ti\u1EC3u (gi\u1EEFa b\u1EADc ${(numAbs - 1n) / 2n} v\xE0 ${(numAbs + 1n) / 2n})`;
        else text = `kh\xF4ng ph\u1EA3i v\xE2n (r = ${displayScalar(fromExact(rr))})`;
      } else text = `kh\xF4ng ph\u1EA3i v\xE2n (r \u2248 ${fmtNum9(rn)})`;
      return { ok: true, answer: { label: q.label, kind: "interference_point", text, approx: Math.abs(rn), unit: "", approximate: rr === null }, checks: [] };
    }
    case "standing_antinodes":
    case "standing_nodes": {
      const k = standingK(m, q.length, q.boundary, q.loops, solved);
      if (k === null) return { ok: false, problem: `kh\xF4ng x\xE1c \u0111\u1ECBnh \u0111\u01B0\u1EE3c s\u1ED1 b\xF3 s\xF3ng cho "${m.name}" (thi\u1EBFu \u03BB ho\u1EB7c \u03BB kh\xF4ng t\u1EA1o s\xF3ng d\u1EEBng \u1ED5n \u0111\u1ECBnh)` };
      const antinodes = k, nodes = q.boundary === "one-free" ? k : k + 1;
      const val = q.kind === "standing_antinodes" ? antinodes : nodes;
      return { ok: true, answer: mkAnsInt(q.kind, val, q.label), checks: [{ kind: "standing_k", detail: `k = ${k} (${q.boundary})`, residual: 0, pass: true }] };
    }
    case "standing_wavelength": {
      const l = scalarFromNumber(q.length), k = BigInt(q.loops);
      const lam = q.boundary === "one-free" ? div(mul(rat(4n), l), fromExact(makeExact(2n * k - 1n, 1n))) : div(mul(rat(2n), l), fromExact(makeExact(k, 1n)));
      return { ok: true, answer: mkAnsS2("standing_wavelength", lam, lam.approx, base, q.label), checks: [] };
    }
    case "standing_frequency": {
      if (m.v === null) return { ok: false, problem: `c\u1EA7n t\u1ED1c \u0111\u1ED9 v c\u1EE7a "${m.name}" \u0111\u1EC3 t\xEDnh t\u1EA7n s\u1ED1 s\xF3ng d\u1EEBng` };
      const l = scalarFromNumber(q.length), k = BigInt(q.loops);
      const lam = q.boundary === "one-free" ? div(mul(rat(4n), l), fromExact(makeExact(2n * k - 1n, 1n))) : div(mul(rat(2n), l), fromExact(makeExact(k, 1n)));
      const f = div(m.v, lam);
      return { ok: true, answer: mkAnsS2("standing_frequency", f, f.approx, "Hz", q.label), checks: [{ kind: "standing_fv", detail: "f = v/\u03BB", residual: 0, pass: true }] };
    }
    case "standing_min_frequency": {
      if (m.v === null) return { ok: false, problem: `c\u1EA7n t\u1ED1c \u0111\u1ED9 v c\u1EE7a "${m.name}" \u0111\u1EC3 t\xEDnh t\u1EA7n s\u1ED1 c\u01A1 b\u1EA3n` };
      const l = scalarFromNumber(q.length);
      const f1 = q.boundary === "one-free" ? div(m.v, mul(rat(4n), l)) : div(m.v, mul(rat(2n), l));
      return { ok: true, answer: mkAnsS2("standing_min_frequency", f1, f1.approx, "Hz", q.label), checks: [] };
    }
  }
  return { ok: false, problem: `query ${q.kind} kh\xF4ng \xE1p cho op s\xF3ng c\u01A1` };
}
function phaseOf(m, x, tPi, phi) {
  const wt = mulP(m.omega, tPi);
  const kx = mulP(m.spaceK, scalarToPi(scalarFromNumber(x)));
  const dirKx = m.dir === 1 ? kx : negP(kx);
  return addP(subP(wt, dirKx), phi);
}
function standingK(m, length2, boundary, loops, solved) {
  if (loops !== void 0) return loops;
  if (m.lambda === null) return null;
  const l = scalarFromNumber(length2);
  if (boundary === "two-fixed") {
    const ratioE2 = div(mul(rat(2n), l), m.lambda).exact;
    if (ratioE2 === null || ratioE2.radicand !== 1 || ratioE2.den !== 1n || ratioE2.num <= 0n) {
      solved.violations.push({ id: "khong-song-dung", message: `2l/\u03BB kh\xF4ng nguy\xEAn d\u01B0\u01A1ng \u21D2 kh\xF4ng c\xF3 s\xF3ng d\u1EEBng \u1ED5n \u0111\u1ECBnh ("${m.name}")` });
      return null;
    }
    return Number(ratioE2.num);
  }
  const ratioE = div(mul(rat(4n), l), m.lambda).exact;
  if (ratioE === null || ratioE.radicand !== 1 || ratioE.den !== 1n || ratioE.num <= 0n || ratioE.num % 2n !== 1n) {
    solved.violations.push({ id: "khong-song-dung", message: `4l/\u03BB kh\xF4ng nguy\xEAn l\u1EBB \u21D2 kh\xF4ng c\xF3 s\xF3ng d\u1EEBng m\u1ED9t-\u0111\u1EA7u-t\u1EF1-do \u1ED5n \u0111\u1ECBnh ("${m.name}")` });
    return null;
  }
  return Number((ratioE.num + 1n) / 2n);
}
function outSpeed(base, unit) {
  const nat = `${base}/s`;
  if (unit === nat) return { factor: rat(1n), unit: nat };
  const to = unit === "m/s" ? "m" : "cm";
  return { factor: lenFactor2(base, to), unit };
}
function computeSoundQuery(solved, q, base) {
  const m = solved.model;
  switch (q.kind) {
    case "sound_intensity": {
      const r2 = q.atDistance !== void 0 ? metersOf(q.atDistance, q.rUnit, base) : null;
      const iv = intensityAt(m, r2);
      if ("problem" in iv) return { ok: false, problem: iv.problem };
      const checks = [];
      if (iv.pi) return { ok: true, answer: mkAnsP2("sound_intensity", iv.pi, iv.approx, "W/m\xB2", q.label), checks };
      return { ok: true, answer: mkAnsS2("sound_intensity", iv.exact, iv.approx, "W/m\xB2", q.label), checks };
    }
    case "sound_level": {
      const r2 = q.atDistance !== void 0 ? metersOf(q.atDistance, q.rUnit, base) : null;
      const iv = intensityAt(m, r2);
      if ("problem" in iv) return { ok: false, problem: iv.problem };
      return levelOf(m, iv, q.label);
    }
    case "sound_level_difference": {
      if (m.power === null && m.rRef === null) return { ok: false, problem: `c\u1EA7n ngu\u1ED3n \u0111i\u1EC3m (power ho\u1EB7c m\u1EE9c t\u1EA1i kho\u1EA3ng c\xE1ch) cho "${m.name}"` };
      const rFrom = metersOf(q.fromDistance, q.rUnit, base), rTo = metersOf(q.toDistance, q.rUnit, base);
      const ratioR = div(rFrom, rTo);
      const ratioI = mul(ratioR, ratioR);
      const cand = log10Exact(ratioI);
      const floatRef = 10 * Math.log10(ratioI.approx);
      const dL = cand ? mul(rat(10n), cand) : num(floatRef);
      const checks = [{ kind: "level_diff", detail: "\u0394L = 20\xB7log\u2081\u2080(r_from/r_to)", residual: 0, pass: true }];
      return { ok: true, answer: mkAnsCert("sound_level_difference", dL, floatRef, "dB", q.label), checks };
    }
    case "distance_for_level": {
      if (m.levelRef === null || m.rRef === null) {
        if (m.power !== null) return distanceFromPower(m, q.level, base, q.label);
        return { ok: false, problem: `c\u1EA7n ngu\u1ED3n \u0111i\u1EC3m c\xF3 m\u1EE9c t\u1EA1i kho\u1EA3ng c\xE1ch cho "${m.name}"` };
      }
      const expScal = div(sub2(m.levelRef, scalarFromNumber(q.level)), rat(20n));
      const floatExp = (m.levelRef.approx - q.level) / 20;
      const scaled = scaleByPow10(m.rRef, expScal, floatExp);
      const outFactor = base === "cm" ? rat(100n) : rat(1n);
      const rOut = mul(scaled.v, outFactor);
      const checks = [{ kind: "distance_level", detail: "r = rRef\xB710^((L_ref\u2212L)/20)", residual: 0, pass: true }];
      return { ok: true, answer: mkAnsS2("distance_for_level", rOut, rOut.approx, base, q.label), checks };
    }
  }
  return { ok: false, problem: `query ${q.kind} kh\xF4ng \xE1p cho op s\xF3ng \xE2m` };
}
function distanceFromPower(m, L, base, label) {
  const denom = 4 * Math.PI * m.I0.approx * Math.pow(10, L / 10);
  const rMeters = Math.sqrt(m.power.approx / denom);
  const rOut = base === "cm" ? rMeters * 100 : rMeters;
  return { ok: true, answer: { label, kind: "distance_for_level", text: fmtNum9(rOut), approx: rOut, unit: base, approximate: true }, checks: [{ kind: "distance_power", detail: "r = \u221A(P/(4\u03C0\xB7I\u2080\xB710^(L/10)))", residual: 0, pass: true }] };
}
var SOUND_KINDS = /* @__PURE__ */ new Set(["sound_intensity", "sound_level", "sound_level_difference", "distance_for_level"]);

// api/_lib/kernel/physics/waveScene.ts
var COLORS4 = ["#38BDF8", "#F472B6", "#4ADE80", "#FFA500"];
var rnd3 = (n) => parseFloat(n.toFixed(6));
var num92 = (x) => {
  const s = parseFloat(x.toPrecision(12)).toString();
  return s.includes("e") || s.includes("E") ? x.toFixed(9) : s;
};
function playbackOf4(tPhys, durationSec) {
  if (durationSec) return { durationSec, timeScale: tPhys / durationSec };
  if (tPhys >= 3 && tPhys <= 15) return { durationSec: tPhys, timeScale: 1 };
  return { durationSec: 10, timeScale: tPhys / 10 };
}
function cosExpr2(A, wk, phaStatic) {
  const p2 = num92(Math.abs(phaStatic));
  const sign = phaStatic < 0 ? "-" : "+";
  return `${num92(A)}*Math.cos(${num92(wk)}*t ${sign} ${p2})`;
}
function animatable(m) {
  return m.A !== null && m.omega !== null && m.spaceK !== null && Number.isFinite(m.A.approx) && Number.isFinite(approxP(m.omega)) && Number.isFinite(approxP(m.spaceK)) && m.lambda !== null && Number.isFinite(m.lambda.approx) && m.lambda.approx > 0;
}
function buildWaveScene(problemName, base, waves, sounds, tPhys, durationSec) {
  const playback = playbackOf4(tPhys, durationSec);
  const k = playback.timeScale;
  const points = [];
  const lines = [];
  const curves = [];
  const agents = [];
  const tracks = [];
  let ci = 0;
  for (const m of waves) {
    const color = COLORS4[ci % COLORS4.length];
    if (animatable(m)) {
      const A = m.A.approx, lam = m.lambda.approx, wn = approxP(m.omega), phin = m.phi ? approxP(m.phi) : 0;
      const spK = approxP(m.spaceK);
      const samples = [];
      for (let i = 0; i <= 64; i++) {
        const x = 2 * lam * i / 64;
        samples.push({ x: rnd3(x), y: rnd3(A * Math.cos(-m.dir * spK * x + phin)) });
      }
      curves.push({ id: `waveform_${m.name}`, type: "expr", plane: "xz", style: "solid", color, params: {}, samples });
      const radius = Math.max(0.12, 0.02 * Math.max(1, 2 * A));
      for (let j = 0; j <= 8; j++) {
        const xj = rnd3(j * lam / 8);
        const phaStatic = -m.dir * spK * xj + phin;
        const z0 = rnd3(A * Math.cos(phaStatic));
        const id = `p${j}_${m.name}`;
        agents.push({ id, label: "", initialPosition: [xj, 0, z0], color, radius });
        const zLand = rnd3(A * Math.cos(wn * tPhys + phaStatic));
        tracks.push({
          id: `mv_${id}`,
          start: 0,
          end: playback.durationSec,
          type: "parametric_path",
          targetId: id,
          params: { equations: { x: num92(xj), y: "0", z: cosExpr2(A, wn * k, phaStatic) }, path: `phan tu song ${m.name}`, landing_point: [xj, 0, zLand], timeScale: k }
        });
      }
    } else {
      const span = m.lambda && Number.isFinite(m.lambda.approx) ? Math.max(1, 2 * m.lambda.approx) : 1;
      points.push({ id: `O_${m.name}`, label: "", x: 0, y: 0, z: 0 });
      points.push({ id: `E_${m.name}`, label: "", x: rnd3(span), y: 0, z: 0 });
      lines.push({ id: `truc_${m.name}`, from: `O_${m.name}`, to: `E_${m.name}`, style: "solid", color: "#8B8B8B" });
    }
    ci++;
  }
  for (const s of sounds) {
    points.push({ id: `src_${s.name}`, label: "", x: 0, y: 0, z: 0 });
  }
  if (points.length === 0 && agents.length === 0 && curves.length === 0) return { geometry: null, playback };
  const geometry = {
    name: problemName,
    axisUnit: base,
    tags: ["physics", "song", `timeScale:${num92(k)}`],
    points,
    lines,
    curves,
    agents,
    timeline: { duration: playback.durationSec, tracks }
  };
  return { geometry, playback };
}
function buildWaveCharts(base, waves, tPhys) {
  const ux = [];
  const ut = [];
  for (const m of waves) {
    if (!animatable(m)) continue;
    const A = m.A.approx, lam = m.lambda.approx, wn = approxP(m.omega), spK = approxP(m.spaceK), phin = m.phi ? approxP(m.phi) : 0;
    const T = m.T && Number.isFinite(m.T.approx) ? m.T.approx : wn > 0 ? 2 * Math.PI / wn : 1;
    const sx = [];
    const st = [];
    for (let i = 0; i <= 128; i++) {
      const x = 2 * lam * i / 128;
      sx.push([rnd3(x), rnd3(A * Math.cos(-m.dir * spK * x + phin))]);
      const t = 2 * T * i / 128;
      st.push([rnd3(t), rnd3(A * Math.cos(wn * t + phin))]);
    }
    ux.push({ name: m.name, samples: sx });
    ut.push({ name: m.name, samples: st });
  }
  const out = [];
  if (ux.length) out.push({ kind: "u_x", xUnit: base, yUnit: base, series: ux });
  if (ut.length) out.push({ kind: "u_t", xUnit: "s", yUnit: base, series: ut });
  return out;
}

// api/_lib/kernel/physics/runWaves.ts
var TOL_ASSERT5 = 1e-3;
var ZERO_PLAYBACK2 = { durationSec: 0, timeScale: 1 };
function timeOfQuery2(q) {
  if (q.kind === "displacement_at") return approxP(toPiScalar(q.t));
  return null;
}
function runWaves(raw) {
  const parsed = WavePlanSchema.safeParse(raw);
  if (!parsed.success) {
    const iss = parsed.error.issues[0];
    const detail = iss ? `${iss.path.length ? `${iss.path.join(".")}: ` : ""}${iss.message}` : "schema";
    return {
      ok: false,
      answers: [],
      checks: [],
      violations: [],
      errors: [{ message: `Invalid wave plan: ${detail}` }],
      geometry: null,
      charts: [],
      meta: { tPhys: 0, playback: ZERO_PLAYBACK2, unitsNote: "per-quantity", length: "m", models: [] }
    };
  }
  const plan = parsed.data;
  const base = plan.units.length;
  const errors = [];
  const checks = [];
  const violations = [];
  const answers = [];
  let geometry = null;
  let charts = [];
  let playback = { ...ZERO_PLAYBACK2 };
  let tPhys = 0;
  const waveByName = /* @__PURE__ */ new Map();
  const soundByName = /* @__PURE__ */ new Map();
  try {
    for (const op of plan.ops) {
      if (op.op === "wave") {
        const s = resolveWaveModel(op, base);
        waveByName.set(op.name, s);
        checks.push(...s.checks);
        for (const e of s.errors) errors.push({ message: e.message });
      } else {
        const s = resolveSoundModel(op, base);
        soundByName.set(op.name, s);
        checks.push(...s.checks);
        for (const e of s.errors) errors.push({ message: e.message });
      }
    }
    for (const [qi, q] of plan.queries.entries()) {
      const r2 = dispatchQuery(q, waveByName, soundByName, base);
      if (r2.ok === false) {
        errors.push({ message: `query ${q.kind}: ${r2.problem}` });
        continue;
      }
      answers.push({ ...r2.answer, queryIndex: qi });
      checks.push(...r2.checks);
      for (const c of r2.checks) if (!c.pass) errors.push({ message: `t\u1EF1 ki\u1EC3m FAIL: ${c.detail} (residual ${c.residual.toExponential(2)})` });
      if (r2.tSolved !== void 0 && Number.isFinite(r2.tSolved)) tPhys = Math.max(tPhys, r2.tSolved);
    }
    for (const s of waveByName.values()) if (s.model.T && Number.isFinite(s.model.T.approx)) tPhys = Math.max(tPhys, 2 * s.model.T.approx);
    for (const q of plan.queries) {
      const t = timeOfQuery2(q);
      if (t !== null && Number.isFinite(t)) tPhys = Math.max(tPhys, t);
    }
    tPhys = tPhys > 1e-9 ? tPhys : 1;
    for (const a of plan.asserts) {
      const r2 = dispatchQuery(a.query, waveByName, soundByName, base);
      if (r2.ok === false) {
        errors.push({ message: `assert ${a.query.kind}: ${r2.problem}` });
        continue;
      }
      const tol = (a.tol ?? TOL_ASSERT5) * Math.max(1, Math.abs(a.equals));
      const delta = Math.abs(r2.answer.approx - a.equals);
      if (delta > tol) violations.push({ assert: a.query.kind, expected: a.equals, got: r2.answer.approx, delta, message: `assert ${a.query.kind}: k\u1EF3 v\u1ECDng ${a.equals}, engine t\xEDnh ${r2.answer.approx}` });
    }
    for (const s of waveByName.values()) for (const v of s.violations) violations.push({ id: v.id, message: v.message });
    for (const s of soundByName.values()) for (const v of s.violations) violations.push({ id: v.id, message: v.message });
  } catch (err) {
    errors.push({ message: `l\u1ED7i engine s\xF3ng: ${err instanceof Error ? err.message : String(err)}` });
  }
  const hasPhysicalViolation = violations.some((v) => v.id !== void 0 && PHYSICAL_VIOLATIONS3.has(v.id));
  const servedAnswers = hasPhysicalViolation ? [] : answers;
  const okState = violations.length === 0 && errors.length === 0;
  if (okState) {
    try {
      const waves = [...waveByName.values()].map((s) => s.model);
      const sounds = [...soundByName.values()].map((s) => s.model);
      const built = buildWaveScene(plan.problemName, base, waves, sounds, tPhys);
      geometry = built.geometry;
      playback = built.playback;
      charts = buildWaveCharts(base, waves, tPhys);
    } catch (err) {
      errors.push({ message: `l\u1ED7i d\u1EF1ng c\u1EA3nh s\xF3ng: ${err instanceof Error ? err.message : String(err)}` });
      geometry = null;
    }
  }
  const models = [];
  for (const op of plan.ops) {
    if (op.op === "wave") {
      const m = waveByName.get(op.name).model;
      models.push({ name: op.name, kind: "wave", animated: m.A !== null && m.omega !== null && m.spaceK !== null });
    } else models.push({ name: op.name, kind: "sound", animated: false });
  }
  const ok = violations.length === 0 && errors.length === 0 && servedAnswers.length === plan.queries.length && servedAnswers.every((a) => Number.isFinite(a.approx));
  return {
    ok,
    answers: servedAnswers,
    checks,
    violations,
    errors,
    geometry,
    charts,
    meta: { tPhys, playback, unitsNote: "per-quantity", length: base, models }
  };
}
function dispatchQuery(q, waveByName, soundByName, base) {
  const of = "of" in q ? q.of : void 0;
  if (SOUND_KINDS.has(q.kind)) {
    const s2 = soundByName.get(of);
    if (!s2) return { ok: false, problem: waveByName.has(of) ? `query ${q.kind} tr\u1ECF "${of}" \u2014 sai lo\u1EA1i op (c\u1EA7n sound_source)` : `op "${of}" kh\xF4ng t\u1ED3n t\u1EA1i` };
    return computeSoundQuery(s2, q, base);
  }
  const s = waveByName.get(of);
  if (!s) return { ok: false, problem: soundByName.has(of) ? `query ${q.kind} tr\u1ECF "${of}" \u2014 sai lo\u1EA1i op (c\u1EA7n wave)` : `op "${of}" kh\xF4ng t\u1ED3n t\u1EA1i` };
  return computeWaveQuery(s, q, base);
}

// api/_lib/kernel/physics/efield.ts
var CHARGE_TO_SI = {
  C: rat(1n),
  mC: rat(1n, 1000n),
  uC: rat(1n, 1000000n),
  nC: rat(1n, 1000000000n),
  pC: rat(1n, 1000000000000n)
};
var FIELD_TO_SI = { "V/m": rat(1n), "N/C": rat(1n), "V/cm": rat(100n) };
var VOLT_TO_SI = { V: rat(1n), kV: rat(1000n) };
var MASS_TO_SI = { kg: rat(1n), g: rat(1n, 1000n) };
var LEN_TO_SI2 = { m: rat(1n), cm: rat(1n, 100n), mm: rat(1n, 1000n) };
var CHARGE_N = { C: 1, mC: 1e-3, uC: 1e-6, nC: 1e-9, pC: 1e-12 };
var FIELD_N = { "V/m": 1, "N/C": 1, "V/cm": 100 };
var VOLT_N = { V: 1, kV: 1e3 };
var MASS_N = { kg: 1, g: 1e-3 };
var LEN_N = { m: 1, cm: 0.01, mm: 1e-3 };
var need = (tbl, u, dim) => {
  const f = tbl[u];
  if (f === void 0) throw new Error(`\u0111\u01A1n v\u1ECB ${dim} "${u}" ngo\xE0i b\u1EA3ng \u0111\u1ED5i`);
  return f;
};
var qtyCharge = (v, u) => mul(scalarFromNumber(v), need(CHARGE_TO_SI, u, "\u0111i\u1EC7n t\xEDch"));
var qtyField = (v, u) => mul(scalarFromNumber(v), need(FIELD_TO_SI, u, "c\u01B0\u1EDDng \u0111\u1ED9 tr\u01B0\u1EDDng"));
var qtyVolt = (v, u) => mul(scalarFromNumber(v), need(VOLT_TO_SI, u, "hi\u1EC7u \u0111i\u1EC7n th\u1EBF"));
var qtyMass = (v, u) => mul(scalarFromNumber(v), need(MASS_TO_SI, u, "kh\u1ED1i l\u01B0\u1EE3ng"));
var qtyLength2 = (v, u) => mul(scalarFromNumber(v), need(LEN_TO_SI2, u, "\u0111\u1ED9 d\xE0i"));
var qtyChargeN = (v, u) => v * need(CHARGE_N, u, "\u0111i\u1EC7n t\xEDch");
var qtyFieldN = (v, u) => v * need(FIELD_N, u, "c\u01B0\u1EDDng \u0111\u1ED9 tr\u01B0\u1EDDng");
var qtyVoltN = (v, u) => v * need(VOLT_N, u, "hi\u1EC7u \u0111i\u1EC7n th\u1EBF");
var qtyMassN = (v, u) => v * need(MASS_N, u, "kh\u1ED1i l\u01B0\u1EE3ng");
var qtyLengthN = (v, u) => v * need(LEN_N, u, "\u0111\u1ED9 d\xE0i");
var K = rat(9000000000n);
var absS2 = (s) => (s.exact ? s.exact.num < 0n : s.approx < 0) ? neg(s) : s;
var signS = (s) => s.exact ? s.exact.num < 0n ? -1 : s.exact.num > 0n ? 1 : 0 : s.approx < 0 ? -1 : s.approx > 0 ? 1 : 0;
var r2S = (p2, s) => {
  const dx = sub2(p2.x, s.x), dy = sub2(p2.y, s.y);
  return add2(mul(dx, dx), mul(dy, dy));
};
function isCollinear(P, srcs) {
  const s0 = srcs[0];
  const wx = sub2(P.x, s0.x), wy = sub2(P.y, s0.y);
  for (let i = 1; i < srcs.length; i++) {
    const ax = sub2(srcs[i].x, s0.x), ay = sub2(srcs[i].y, s0.y);
    if (!isZeroS(sub2(mul(wx, ay), mul(wy, ax)))) return false;
  }
  return true;
}
function isSymmetricRational(P, srcs) {
  if (srcs.length !== 2) return false;
  const [A, B] = srcs;
  if (cmpScalar(absS2(A.q), absS2(B.q)) !== 0) return false;
  const rA2 = r2S(P, A), rB2 = r2S(P, B);
  if (cmpScalar(rA2, rB2) !== 0) return false;
  const rA = sqrt(rA2);
  return rA.exact !== null && rA.exact.radicand === 1;
}
function classify(P, srcs) {
  if (srcs.length <= 1) return "single";
  if (isCollinear(P, srcs)) return "collinear";
  if (isSymmetricRational(P, srcs)) return "symmetric_rational";
  return "none";
}
var axisPhrase = (vx, vy) => {
  const ax = Math.abs(vx), ay = Math.abs(vy);
  if (ax < 1e-12 && ay < 1e-12) return "tri\u1EC7t ti\xEAu (E = 0)";
  if (ay < 1e-9 * Math.max(1, ax)) return vx > 0 ? "theo chi\u1EC1u d\u01B0\u01A1ng tr\u1EE5c Ox" : "theo chi\u1EC1u \xE2m tr\u1EE5c Ox";
  if (ax < 1e-9 * Math.max(1, ay)) return vy > 0 ? "theo chi\u1EC1u d\u01B0\u01A1ng tr\u1EE5c Oy" : "theo chi\u1EC1u \xE2m tr\u1EE5c Oy";
  return "xi\xEAn (kh\xF4ng d\u1ECDc tr\u1EE5c to\u1EA1 \u0111\u1ED9)";
};
function fieldAt(kEff, kEffN, P, PN, srcs) {
  for (const s of srcs) if (isZeroS(r2S(P, s))) throw new Error(`\u0111i\u1EC3m kh\u1EA3o s\xE1t tr\xF9ng v\u1ECB tr\xED \u0111i\u1EC7n t\xEDch "${s.name}" (r = 0)`);
  const cls = classify(P, srcs);
  if (cls === "single") {
    const s = srcs[0];
    const r2 = r2S(P, s);
    const r2n = (PN.x - s.xN) ** 2 + (PN.y - s.yN) ** 2;
    const mag = div(mul(kEff, absS2(s.q)), r2);
    const magN = kEffN * Math.abs(s.qN) / r2n;
    const dir = signS(s.q) >= 0 ? `h\u01B0\u1EDBng ra xa \u0111i\u1EC7n t\xEDch ${s.name}` : `h\u01B0\u1EDBng v\u1EC1 ph\xEDa \u0111i\u1EC7n t\xEDch ${s.name}`;
    return { mag, magN, direction: dir, cls };
  }
  if (cls === "collinear") {
    const s0 = srcs[0];
    const wx = sub2(P.x, s0.x), wy = sub2(P.y, s0.y);
    const wxN = PN.x - s0.xN, wyN = PN.y - s0.yN;
    const nx = neg(wy), ny = wx;
    const nxN = -wyN, nyN = wxN;
    let net = rat(0n), netN = 0, perp = rat(0n), perpN = 0;
    for (const s of srcs) {
      const dx = sub2(P.x, s.x), dy = sub2(P.y, s.y);
      const dxN = PN.x - s.xN, dyN = PN.y - s.yN;
      const r2 = add2(mul(dx, dx), mul(dy, dy));
      const r2n = dxN * dxN + dyN * dyN;
      const dotw = add2(mul(dx, wx), mul(dy, wy));
      const sg2 = signS(dotw);
      net = add2(net, mul(div(mul(kEff, s.q), r2), rat(BigInt(sg2))));
      netN += kEffN * s.qN * sg2 / r2n;
      const dotn = add2(mul(dx, nx), mul(dy, ny));
      const dotnN = dxN * nxN + dyN * nyN;
      perp = add2(perp, mul(dotn, dotn));
      perpN += dotnN * dotnN;
    }
    const mag = absS2(net), magN = Math.abs(netN);
    const sg = netN >= 0 ? 1 : -1;
    const dir = isZeroS(mag) ? "tri\u1EC7t ti\xEAu (E = 0)" : `${axisPhrase(sg * wxN, sg * wyN)} (d\u1ECDc tr\u1EE5c n\u1ED1i c\xE1c \u0111i\u1EC7n t\xEDch)`;
    return { mag, magN, direction: dir, cls, perp, perpN };
  }
  if (cls === "symmetric_rational") {
    let Ex = rat(0n), Ey = rat(0n), ExN = 0, EyN = 0;
    for (const s of srcs) {
      const dx = sub2(P.x, s.x), dy = sub2(P.y, s.y);
      const dxN = PN.x - s.xN, dyN = PN.y - s.yN;
      const r2 = add2(mul(dx, dx), mul(dy, dy));
      const r3 = sqrt(r2), r32 = mul(r2, r3);
      const r2n = dxN * dxN + dyN * dyN, r3n = r2n * Math.sqrt(r2n);
      const coef = div(mul(kEff, s.q), r32), coefN = kEffN * s.qN / r3n;
      Ex = add2(Ex, mul(coef, dx));
      Ey = add2(Ey, mul(coef, dy));
      ExN += coefN * dxN;
      EyN += coefN * dyN;
    }
    const mag = sqrt(add2(mul(Ex, Ex), mul(Ey, Ey)));
    const magN = Math.hypot(ExN, EyN);
    const rA2 = r2S(P, srcs[0]), rB2 = r2S(P, srcs[1]);
    const symmResidual = Math.abs(exactToApprox(rA2.exact) - exactToApprox(rB2.exact));
    return { mag, magN, direction: `${axisPhrase(ExN, EyN)} (d\u1ECDc tr\u1EE5c \u0111\u1ED1i x\u1EE9ng)`, cls, symmResidual };
  }
  throw new Error(
    "c\u1EA5u h\xECnh ch\u1ED3ng ch\u1EA5t kh\xF4ng thu\u1ED9c l\u1EDBp exact-\u0111\u01B0\u1EE3c (ch\u1EC9 h\u1ED7 tr\u1EE3 th\u1EB3ng h\xE0ng, c\u1EB7p \u0111\u1ED1i x\u1EE9ng \u0111\u1EB3ng c\u1EF1 to\u1EA1-\u0111\u1ED9-h\u1EEFu-t\u1EC9, ho\u1EB7c field_symmetric g\xF3c \u0111\u1EB9p) \u2014 v1 abstain (\xA714.2)"
  );
}
function fieldSymmetric(kEff, kEffN, absQ, absQN, r2, r2n, angleDeg, qSign) {
  if (isZeroS(r2)) throw new Error("r = 0 cho field_symmetric (ngu\u1ED3n tr\xF9ng \u0111i\u1EC3m kh\u1EA3o s\xE1t)");
  const E2 = div(mul(kEff, absQ), r2), EN = kEffN * absQN / r2n;
  const { cos } = trigOf(angleDeg);
  const cosN = Math.cos(angleDeg * Math.PI / 180);
  const inside = mul(mul(rat(2n), mul(E2, E2)), add2(rat(1n), cos));
  const insideN = 2 * EN * EN * (1 + cosN);
  const mag = sqrt(inside), magN = Math.sqrt(insideN);
  const dir = qSign >= 0 ? "d\u1ECDc tr\u1EE5c \u0111\u1ED1i x\u1EE9ng (trung tr\u1EF1c ngu\u1ED3n\u2013ngu\u1ED3n), h\u01B0\u1EDBng ra xa" : "d\u1ECDc tr\u1EE5c \u0111\u1ED1i x\u1EE9ng (trung tr\u1EF1c ngu\u1ED3n\u2013ngu\u1ED3n), h\u01B0\u1EDBng v\u1EC1 ngu\u1ED3n";
  return { mag, magN, direction: dir, cls: "symmetric_rational" };
}

// api/_lib/kernel/physics/efieldSchema.ts
var Num7 = external_exports.number().finite();
var Name3 = external_exports.string().min(1).regex(/^[A-Za-z0-9_]+$/);
var Pt = external_exports.tuple([Num7, Num7]);
var ChargeUnit = external_exports.enum(["C", "mC", "uC", "nC", "pC"]);
var LenUnit3 = external_exports.enum(["m", "cm", "mm"]);
var FieldUnit = external_exports.enum(["V/m", "N/C", "V/cm"]);
var VoltUnit = external_exports.enum(["V", "kV"]);
var MassUnit = external_exports.enum(["kg", "g"]);
var Charge = external_exports.object({ value: Num7, unit: ChargeUnit.default("C") });
var Dist = external_exports.object({ value: Num7, unit: LenUnit3.default("m") });
var PointChargeOp = external_exports.object({ op: external_exports.literal("point_charge"), name: Name3, q: Charge, at: Pt.default([0, 0]) });
var UniformFieldOp = external_exports.object({
  op: external_exports.literal("uniform_field"),
  name: Name3,
  E: external_exports.object({ value: Num7.positive(), unit: FieldUnit.default("V/m") }).optional(),
  fromVoltage: external_exports.object({ U: external_exports.object({ value: Num7.positive(), unit: VoltUnit.default("V") }), d: Dist }).optional(),
  direction: external_exports.enum(["up", "down", "left", "right", "x", "y"]).default("x")
});
var ChargedBodyOp = external_exports.object({
  op: external_exports.literal("charged_body"),
  name: Name3,
  q: Charge,
  mass: external_exports.object({ value: Num7.positive(), unit: MassUnit.default("kg") }).optional()
});
var EFieldOpSchema = external_exports.discriminatedUnion("op", [PointChargeOp, UniformFieldOp, ChargedBodyOp]);
var EFieldQuerySchema = external_exports.discriminatedUnion("kind", [
  external_exports.object({ kind: external_exports.literal("coulomb_force"), a: Name3, b: Name3, label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("field_at"), at: Pt, by: external_exports.array(Name3).optional(), label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("field_symmetric"), sources: external_exports.array(Name3).length(2), r: Dist, angleBetweenDeg: Num7, label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("force_on_test"), q: Charge, at: Pt, by: external_exports.array(Name3).optional(), label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("potential_at"), at: Pt, by: external_exports.array(Name3).optional(), label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("electric_force"), body: Name3, field: Name3, label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("work"), body: Name3, field: Name3, d: Dist, label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("voltage"), field: Name3, d: Dist, label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("potential_energy"), body: Name3, U: external_exports.object({ value: Num7, unit: VoltUnit.default("V") }), label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("equilibrium_field"), body: Name3, g: Num7.positive().default(10), label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("acceleration"), body: Name3, field: Name3, label: external_exports.string().optional() }),
  external_exports.object({ kind: external_exports.literal("speed_after"), body: Name3, field: Name3, d: Dist, label: external_exports.string().optional() })
]);
var EFieldPlanSchema = external_exports.object({
  problemName: external_exports.string().min(1),
  units: external_exports.object({ length: LenUnit3.default("m") }).default({}),
  epsilon: Num7.positive().default(1),
  ops: external_exports.array(EFieldOpSchema).min(1),
  queries: external_exports.array(EFieldQuerySchema).min(1),
  asserts: external_exports.array(external_exports.object({ query: EFieldQuerySchema, equals: Num7, tol: Num7.positive().optional() })).default([]),
  knowledgeTags: external_exports.array(external_exports.string()).default([])
}).superRefine((plan, ctx) => {
  const add5 = (message) => ctx.addIssue({ code: external_exports.ZodIssueCode.custom, message });
  const lenU = plan.units.length;
  const opKind = /* @__PURE__ */ new Map();
  for (const op of plan.ops) {
    if (opKind.has(op.name)) add5(`t\xEAn "${op.name}" tr\xF9ng \u2014 m\u1ECDi t\xEAn ops ph\u1EA3i duy nh\u1EA5t`);
    opKind.set(op.name, op.op);
  }
  const pointOp = /* @__PURE__ */ new Map();
  for (const op of plan.ops) if (op.op === "point_charge") pointOp.set(op.name, { at: op.at, q: op.q });
  const isKind = (n, k, where) => {
    if (!opKind.has(n)) {
      add5(`${where}: t\xEAn "${n}" kh\xF4ng t\u1ED3n t\u1EA1i trong ops`);
      return false;
    }
    if (opKind.get(n) !== k) {
      add5(`${where}: "${n}" ph\u1EA3i l\xE0 ${k}`);
      return false;
    }
    return true;
  };
  const readFields = /* @__PURE__ */ new Set();
  for (const q of plan.queries) {
    if (q.kind === "electric_force" || q.kind === "work" || q.kind === "voltage" || q.kind === "acceleration" || q.kind === "speed_after") readFields.add(q.field);
  }
  for (const op of plan.ops) {
    if (op.op !== "uniform_field") continue;
    const hasE = op.E !== void 0, hasV = op.fromVoltage !== void 0;
    if (hasE && hasV) add5(`uniform_field "${op.name}": ch\u1EC9 khai M\u1ED8T trong {E, fromVoltage}`);
    if (!hasE && !hasV && readFields.has(op.name)) add5(`uniform_field "${op.name}": thi\u1EBFu c\u1EA3 E l\u1EABn fromVoltage nh\u01B0ng c\xF3 query \u0111\u1ECDc tr\u01B0\u1EDDng n\xE0y`);
  }
  const needMass = (n, where) => {
    if (isKind(n, "charged_body", where)) {
      const op = plan.ops.find((o) => o.name === n);
      if (op && op.op === "charged_body" && op.mass === void 0) add5(`${where}: v\u1EADt "${n}" c\u1EA7n khai mass`);
    }
  };
  const gateSuper = (at, by, where) => {
    const names = by && by.length ? by : [...pointOp.keys()];
    for (const n of names) isKind(n, "point_charge", where);
    const srcs = names.map((n) => pointOp.get(n)).filter((p2) => !!p2);
    if (srcs.length < 2) return;
    const P = { x: qtyLength2(at[0], lenU), y: qtyLength2(at[1], lenU) };
    const xyq = srcs.map((s) => ({ x: qtyLength2(s.at[0], lenU), y: qtyLength2(s.at[1], lenU), q: qtyCharge(s.q.value, s.q.unit) }));
    if (classify(P, xyq) === "none")
      add5(`${where}: c\u1EA5u h\xECnh ch\u1ED3ng ch\u1EA5t kh\xF4ng thu\u1ED9c l\u1EDBp exact-\u0111\u01B0\u1EE3c (ch\u1EC9 h\u1ED7 tr\u1EE3 th\u1EB3ng h\xE0ng, c\u1EB7p \u0111\u1ED1i x\u1EE9ng \u0111\u1EB3ng c\u1EF1 to\u1EA1-\u0111\u1ED9-h\u1EEFu-t\u1EC9, ho\u1EB7c field_symmetric g\xF3c \u0111\u1EB9p) \u2014 v1 abstain (\xA714.2)`);
  };
  for (const q of plan.queries.concat(plan.asserts.map((a) => a.query))) {
    switch (q.kind) {
      case "coulomb_force":
        isKind(q.a, "point_charge", "coulomb_force.a");
        isKind(q.b, "point_charge", "coulomb_force.b");
        break;
      case "field_at":
        gateSuper(q.at, q.by, "field_at");
        break;
      case "force_on_test":
        gateSuper(q.at, q.by, "force_on_test");
        break;
      case "potential_at":
        (q.by && q.by.length ? q.by : [...pointOp.keys()]).forEach((n) => isKind(n, "point_charge", "potential_at.by"));
        break;
      case "field_symmetric": {
        const okA = isKind(q.sources[0], "point_charge", "field_symmetric.sources"), okB = isKind(q.sources[1], "point_charge", "field_symmetric.sources");
        if (okA && okB) {
          const A = pointOp.get(q.sources[0]), B = pointOp.get(q.sources[1]);
          if (A && B) {
            const qa = qtyCharge(A.q.value, A.q.unit).approx, qb = qtyCharge(B.q.value, B.q.unit).approx;
            if (Math.abs(Math.abs(qa) - Math.abs(qb)) > 1e-18) add5("field_symmetric: |q_A| ph\u1EA3i b\u1EB1ng |q_B| (\u0111\u1ED1i x\u1EE9ng \u0111\u1EB3ng ngu\u1ED3n)");
          }
        }
        if (q.r.value <= 0) add5("field_symmetric: r ph\u1EA3i > 0");
        break;
      }
      case "electric_force":
        isKind(q.body, "charged_body", "electric_force.body");
        isKind(q.field, "uniform_field", "electric_force.field");
        break;
      case "work":
        isKind(q.body, "charged_body", "work.body");
        isKind(q.field, "uniform_field", "work.field");
        break;
      case "voltage":
        isKind(q.field, "uniform_field", "voltage.field");
        break;
      case "potential_energy":
        isKind(q.body, "charged_body", "potential_energy.body");
        break;
      case "equilibrium_field":
        needMass(q.body, "equilibrium_field.body");
        break;
      case "acceleration":
        needMass(q.body, "acceleration.body");
        isKind(q.field, "uniform_field", "acceleration.field");
        break;
      case "speed_after":
        needMass(q.body, "speed_after.body");
        isKind(q.field, "uniform_field", "speed_after.field");
        break;
    }
  }
});

// api/_lib/kernel/physics/efieldCompute.ts
var EPS_SELF6 = 1e-6;
var SUP = { "-": "\u207B", "0": "\u2070", "1": "\xB9", "2": "\xB2", "3": "\xB3", "4": "\u2074", "5": "\u2075", "6": "\u2076", "7": "\u2077", "8": "\u2078", "9": "\u2079" };
var sup = (n) => String(n).split("").map((c) => SUP[c]).join("");
function factor2and5(den) {
  let a = 0, b = 0, d = den;
  while (d % 2n === 0n) {
    d /= 2n;
    a++;
  }
  while (d % 5n === 0n) {
    d /= 5n;
    b++;
  }
  return { a, b, rest: d };
}
function sci(numAbs, k) {
  const digits = numAbs.toString();
  const d = digits.length;
  let mant = d === 1 ? digits : `${digits[0]}.${digits.slice(1)}`;
  if (mant.includes(".")) mant = mant.replace(/0+$/, "").replace(/\.$/, "");
  const exp = d - 1 - k;
  const mantVN = mant.replace(".", ",");
  return mantVN === "1" ? `10${sup(exp)}` : `${mantVN}\xB710${sup(exp)}`;
}
function decimalStr(numAbs, k) {
  if (k === 0) return numAbs.toString();
  const s = numAbs.toString().padStart(k + 1, "0");
  const intPart = s.slice(0, s.length - k);
  const frac = s.slice(s.length - k).replace(/0+$/, "");
  return frac ? `${intPart},${frac}` : intPart;
}
function fmtNum10(x) {
  if (!Number.isFinite(x)) return "(l\u1ED7i)";
  if (x !== 0 && Math.abs(x) < 1e-3) return parseFloat(x.toPrecision(4)).toString();
  const digits = Math.abs(x) >= 1e3 ? 2 : 4;
  return parseFloat(x.toFixed(digits)).toString();
}
function displayEField(s) {
  const e = s.exact;
  if (e === null) {
    const n = recognizeConstant(s.approx);
    return n ? n.text : fmtNum10(s.approx);
  }
  if (e.radicand !== 1) return displayExact(e);
  const sign = e.num < 0n ? "-" : "";
  const numAbs = e.num < 0n ? -e.num : e.num;
  const { a, b, rest } = factor2and5(e.den);
  if (rest !== 1n) return displayExact(e);
  const k = Math.max(a, b);
  const M = numAbs * 2n ** BigInt(k - a) * 5n ** BigInt(k - b);
  const v = Math.abs(exactToApprox(e));
  if (v !== 0 && (v >= 1e4 || v < 0.01)) return sign + sci(M, k);
  return sign + decimalStr(M, k);
}
function mkEAns(kind, s, floatRef, unit, label, direction) {
  const tol = 1e-6 * Math.max(1, Math.abs(floatRef));
  if (s.exact !== null && Math.abs(exactToApprox(s.exact) - floatRef) <= tol)
    return { label, kind, text: displayEField(s), approx: exactToApprox(s.exact), unit, approximate: false, direction };
  const nice = Number.isFinite(floatRef) ? recognizeConstant(floatRef) : null;
  return { label, kind, text: nice ? nice.text : fmtNum10(floatRef), approx: floatRef, unit, approximate: !nice, direction };
}
var getPoint = (ent, n) => {
  const p2 = ent.points.get(n);
  if (!p2) throw new Error(`kh\xF4ng t\xECm th\u1EA5y \u0111i\u1EC7n t\xEDch \u0111i\u1EC3m "${n}"`);
  return p2;
};
var getBody = (ent, n) => {
  const b = ent.bodies.get(n);
  if (!b) throw new Error(`kh\xF4ng t\xECm th\u1EA5y v\u1EADt t\xEDch \u0111i\u1EC7n "${n}"`);
  return b;
};
function getFieldE(ent, n) {
  const f = ent.fields.get(n);
  if (!f) throw new Error(`kh\xF4ng t\xECm th\u1EA5y \u0111i\u1EC7n tr\u01B0\u1EDDng \u0111\u1EC1u "${n}"`);
  if (f.E === null) throw new Error(`\u0111i\u1EC7n tr\u01B0\u1EDDng "${n}" ch\u01B0a khai E (c\u1EA7n cho query \u0111\u1ECDc tr\u01B0\u1EDDng)`);
  return { E: f.E, EN: f.EN };
}
var ptOf = (p2) => ({ x: p2.x, y: p2.y });
var scale3 = (x) => 1e-6 * Math.max(1, Math.abs(x));
function sourcesOf(ent, by) {
  if (by && by.length) return by.map((n) => getPoint(ent, n));
  return [...ent.points.values()];
}
function fieldOutFrom(ent, at, by) {
  const P = { x: qtyLength2(at[0], ent.lengthUnit), y: qtyLength2(at[1], ent.lengthUnit) };
  const PN = { x: qtyLengthN(at[0], ent.lengthUnit), y: qtyLengthN(at[1], ent.lengthUnit) };
  const fo = fieldAt(ent.kEff, ent.kEffN, P, PN, sourcesOf(ent, by));
  const checks = [];
  if (fo.cls === "collinear" && fo.perp)
    checks.push({ kind: "symmetry", detail: "th\xE0nh ph\u1EA7n \u22A5 tr\u1EE5c h\u1EE3p l\u1EF1c = 0 (th\u1EB3ng h\xE0ng)", residual: fo.perpN ?? 0, pass: isZeroS(fo.perp) });
  if (fo.cls === "symmetric_rational")
    checks.push({ kind: "symmetry", detail: "c\u1EB7p \u0111\u1ED1i x\u1EE9ng \u0111\u1EB3ng c\u1EF1 (r_A\xB2=r_B\xB2, |q_A|=|q_B|)", residual: fo.symmResidual ?? 0, pass: (fo.symmResidual ?? 0) <= EPS_SELF6 });
  return { fo, checks };
}
function computeEFieldQuery(ent, query) {
  try {
    switch (query.kind) {
      case "coulomb_force": {
        const a = getPoint(ent, query.a), b = getPoint(ent, query.b);
        const r2 = r2S(ptOf(a), ptOf(b));
        if (isZeroS(r2)) return { ok: false, problem: `hai \u0111i\u1EC7n t\xEDch "${a.name}","${b.name}" tr\xF9ng v\u1ECB tr\xED (r = 0)` };
        const r2n = (a.xN - b.xN) ** 2 + (a.yN - b.yN) ** 2;
        const F = div(mul(mul(ent.kEff, absS2(a.q)), absS2(b.q)), r2);
        const FN = ent.kEffN * Math.abs(a.qN) * Math.abs(b.qN) / r2n;
        const attract = signS(a.q) * signS(b.q) < 0;
        const dir = attract ? "hai \u0111i\u1EC7n t\xEDch h\xFAt nhau" : "hai \u0111i\u1EC7n t\xEDch \u0111\u1EA9y nhau";
        return { ok: true, answer: mkEAns("coulomb_force", F, FN, "N", query.label, dir), checks: [] };
      }
      case "field_at": {
        const { fo, checks } = fieldOutFrom(ent, query.at, query.by);
        return { ok: true, answer: mkEAns("field_at", fo.mag, fo.magN, "V/m", query.label, fo.direction), checks };
      }
      case "force_on_test": {
        const { fo, checks } = fieldOutFrom(ent, query.at, query.by);
        const q = qtyCharge(query.q.value, query.q.unit), qN = qtyChargeN(query.q.value, query.q.unit);
        const F = mul(absS2(q), fo.mag), FN = Math.abs(qN) * fo.magN;
        const dir = signS(q) >= 0 ? `c\xF9ng chi\u1EC1u E (${fo.direction})` : `ng\u01B0\u1EE3c chi\u1EC1u E`;
        return { ok: true, answer: mkEAns("force_on_test", F, FN, "N", query.label, dir), checks };
      }
      case "field_symmetric": {
        const a = getPoint(ent, query.sources[0]), b = getPoint(ent, query.sources[1]);
        if (signS(a.q) === 0) return { ok: false, problem: "\u0111i\u1EC7n t\xEDch ngu\u1ED3n b\u1EB1ng 0" };
        const absQ = absS2(a.q), absQN = Math.abs(a.qN);
        const r2 = qtyLength2(query.r.value, query.r.unit), rN = qtyLengthN(query.r.value, query.r.unit);
        const r22 = mul(r2, r2), r2n = rN * rN;
        const fo = fieldSymmetric(ent.kEff, ent.kEffN, absQ, absQN, r22, r2n, query.angleBetweenDeg, signS(a.q));
        const checks = [{ kind: "symmetry", detail: "\u0111\u1ED1i x\u1EE9ng qua g\xF3c khai t\u01B0\u1EDDng minh (field_symmetric)", residual: 0, pass: true }];
        return { ok: true, answer: mkEAns("field_symmetric", fo.mag, fo.magN, "V/m", query.label, fo.direction), checks };
      }
      case "potential_at": {
        const srcs = sourcesOf(ent, query.by);
        const P = { x: qtyLength2(query.at[0], ent.lengthUnit), y: qtyLength2(query.at[1], ent.lengthUnit) };
        const PN = { x: qtyLengthN(query.at[0], ent.lengthUnit), y: qtyLengthN(query.at[1], ent.lengthUnit) };
        let V = rat(0n), VN = 0;
        for (const s of srcs) {
          const r2 = r2S(P, ptOf(s));
          if (isZeroS(r2)) return { ok: false, problem: `\u0111i\u1EC3m kh\u1EA3o s\xE1t tr\xF9ng "${s.name}" (r=0)` };
          const r3 = sqrt(r2), rN = Math.sqrt((PN.x - s.xN) ** 2 + (PN.y - s.yN) ** 2);
          V = add2(V, div(mul(ent.kEff, s.q), r3));
          VN += ent.kEffN * s.qN / rN;
        }
        return { ok: true, answer: mkEAns("potential_at", V, VN, "V", query.label), checks: [] };
      }
      case "electric_force": {
        const body = getBody(ent, query.body), { E: E2, EN } = getFieldE(ent, query.field);
        const F = mul(absS2(body.q), E2), FN = Math.abs(body.qN) * EN;
        const dir = signS(body.q) >= 0 ? "c\xF9ng chi\u1EC1u \u0111\u01B0\u1EDDng s\u1EE9c" : "ng\u01B0\u1EE3c chi\u1EC1u \u0111\u01B0\u1EDDng s\u1EE9c";
        return { ok: true, answer: mkEAns("electric_force", F, FN, "N", query.label, dir), checks: [] };
      }
      case "work": {
        const body = getBody(ent, query.body), { E: E2, EN } = getFieldE(ent, query.field);
        const d = qtyLength2(query.d.value, query.d.unit), dN = qtyLengthN(query.d.value, query.d.unit);
        const A = mul(mul(body.q, E2), d), AN = body.qN * EN * dN;
        const dir = AN >= 0 ? "l\u1EF1c \u0111i\u1EC7n sinh c\xF4ng (A > 0)" : "l\u1EF1c \u0111i\u1EC7n nh\u1EADn c\xF4ng (A < 0)";
        return { ok: true, answer: mkEAns("work", A, AN, "J", query.label, dir), checks: [] };
      }
      case "voltage": {
        const { E: E2, EN } = getFieldE(ent, query.field);
        const d = qtyLength2(query.d.value, query.d.unit), dN = qtyLengthN(query.d.value, query.d.unit);
        const U = mul(E2, d), UN = EN * dN;
        return { ok: true, answer: mkEAns("voltage", U, UN, "V", query.label), checks: [] };
      }
      case "potential_energy": {
        const body = getBody(ent, query.body);
        const U = qtyVolt(query.U.value, query.U.unit), UN = qtyVoltN(query.U.value, query.U.unit);
        const W = mul(body.q, U), WN = body.qN * UN;
        const dir = WN >= 0 ? "th\u1EBF n\u0103ng t\u0103ng" : "th\u1EBF n\u0103ng gi\u1EA3m";
        return { ok: true, answer: mkEAns("potential_energy", W, WN, "J", query.label, dir), checks: [] };
      }
      case "equilibrium_field": {
        const body = getBody(ent, query.body);
        if (body.mass === null) return { ok: false, problem: `v\u1EADt "${body.name}" thi\u1EBFu kh\u1ED1i l\u01B0\u1EE3ng cho c\xE2n b\u1EB1ng` };
        if (signS(body.q) === 0) return { ok: false, problem: `\u0111i\u1EC7n t\xEDch "${body.name}" = 0, kh\xF4ng gi\u1EA3i \u0111\u01B0\u1EE3c E c\xE2n b\u1EB1ng` };
        const g = scalarFromNumber(query.g), gN = query.g;
        const E2 = div(mul(body.mass, g), absS2(body.q));
        const EN = body.massN * gN / Math.abs(body.qN);
        const backResid = Math.abs(Math.abs(body.qN) * EN - body.massN * gN);
        const dir = signS(body.q) >= 0 ? "th\u1EB3ng \u0111\u1EE9ng, h\u01B0\u1EDBng l\xEAn (c\xE2n tr\u1ECDng l\u1EF1c)" : "th\u1EB3ng \u0111\u1EE9ng, h\u01B0\u1EDBng xu\u1ED1ng (c\xE2n tr\u1ECDng l\u1EF1c)";
        const checks = [{ kind: "equilibrium_backsub", detail: "|q|\xB7E \u2212 m\xB7g = 0", residual: backResid, pass: backResid <= scale3(body.massN * gN) }];
        return { ok: true, answer: mkEAns("equilibrium_field", E2, EN, "V/m", query.label, dir), checks };
      }
      case "acceleration": {
        const body = getBody(ent, query.body), { E: E2, EN } = getFieldE(ent, query.field);
        if (body.mass === null) return { ok: false, problem: `v\u1EADt "${body.name}" thi\u1EBFu kh\u1ED1i l\u01B0\u1EE3ng cho gia t\u1ED1c` };
        const a = div(mul(absS2(body.q), E2), body.mass), aN = Math.abs(body.qN) * EN / body.massN;
        return { ok: true, answer: mkEAns("acceleration", a, aN, "m/s\xB2", query.label, "d\u1ECDc \u0111\u01B0\u1EDDng s\u1EE9c"), checks: [] };
      }
      case "speed_after": {
        const body = getBody(ent, query.body), { E: E2, EN } = getFieldE(ent, query.field);
        if (body.mass === null) return { ok: false, problem: `v\u1EADt "${body.name}" thi\u1EBFu kh\u1ED1i l\u01B0\u1EE3ng cho t\u1ED1c \u0111\u1ED9` };
        const d = qtyLength2(query.d.value, query.d.unit), dN = qtyLengthN(query.d.value, query.d.unit);
        const inside = div(mul(mul(rat(2n), absS2(body.q)), mul(E2, d)), body.mass);
        const insideN = 2 * Math.abs(body.qN) * EN * dN / body.massN;
        const v = sqrt(inside), vN = Math.sqrt(insideN);
        const backResid = Math.abs(0.5 * body.massN * vN * vN - Math.abs(body.qN) * EN * dN);
        const checks = [{ kind: "kinetic_backsub", detail: "\xBD\xB7m\xB7v\xB2 \u2212 |q|\xB7E\xB7d = 0", residual: backResid, pass: backResid <= scale3(Math.abs(body.qN) * EN * dN) }];
        return { ok: true, answer: mkEAns("speed_after", v, vN, "m/s", query.label), checks };
      }
      default: {
        query;
        return { ok: false, problem: `query kind kh\xF4ng h\u1ED7 tr\u1EE3: ${query.kind}` };
      }
    }
  } catch (e) {
    return { ok: false, problem: e.message };
  }
}

// api/_lib/kernel/physics/runEfield.ts
var TOL_ASSERT6 = 1e-3;
function buildEntities(plan) {
  const lenU = plan.units.length;
  const points = /* @__PURE__ */ new Map();
  const fields = /* @__PURE__ */ new Map();
  const bodies = /* @__PURE__ */ new Map();
  for (const op of plan.ops) {
    if (op.op === "point_charge") {
      points.set(op.name, {
        name: op.name,
        q: qtyCharge(op.q.value, op.q.unit),
        qN: qtyChargeN(op.q.value, op.q.unit),
        x: qtyLength2(op.at[0], lenU),
        y: qtyLength2(op.at[1], lenU),
        xN: qtyLengthN(op.at[0], lenU),
        yN: qtyLengthN(op.at[1], lenU)
      });
    } else if (op.op === "uniform_field") {
      let E2 = null, EN = NaN;
      if (op.E) {
        E2 = qtyField(op.E.value, op.E.unit);
        EN = qtyFieldN(op.E.value, op.E.unit);
      } else if (op.fromVoltage) {
        const U = qtyVolt(op.fromVoltage.U.value, op.fromVoltage.U.unit), d = qtyLength2(op.fromVoltage.d.value, op.fromVoltage.d.unit);
        E2 = div(U, d);
        EN = qtyVoltN(op.fromVoltage.U.value, op.fromVoltage.U.unit) / qtyLengthN(op.fromVoltage.d.value, op.fromVoltage.d.unit);
      }
      fields.set(op.name, { name: op.name, E: E2, EN, direction: op.direction });
    } else {
      bodies.set(op.name, {
        name: op.name,
        q: qtyCharge(op.q.value, op.q.unit),
        qN: qtyChargeN(op.q.value, op.q.unit),
        mass: op.mass ? qtyMass(op.mass.value, op.mass.unit) : null,
        massN: op.mass ? qtyMassN(op.mass.value, op.mass.unit) : NaN
      });
    }
  }
  const epsilon = scalarFromNumber(plan.epsilon);
  return { points, fields, bodies, kEff: div(K, epsilon), kEffN: 9e9 / plan.epsilon, epsilon: plan.epsilon, lengthUnit: lenU };
}
function runEfield(raw) {
  const parsed = EFieldPlanSchema.safeParse(raw);
  if (!parsed.success) {
    const iss = parsed.error.issues[0];
    const detail = iss ? `${iss.path.length ? `${iss.path.join(".")}: ` : ""}${iss.message}` : "schema";
    return {
      ok: false,
      answers: [],
      checks: [],
      violations: [],
      errors: [{ message: `Invalid efield plan: ${detail}` }],
      geometry: null,
      meta: { epsilon: 1, units: { length: "m" }, knowledgeTags: [] }
    };
  }
  const plan = parsed.data;
  const meta = { epsilon: plan.epsilon, units: { length: plan.units.length }, knowledgeTags: plan.knowledgeTags };
  const ent = buildEntities(plan);
  const answers = [];
  const checks = [];
  const errors = [];
  for (const [qi, q] of plan.queries.entries()) {
    const r2 = computeEFieldQuery(ent, q);
    if (r2.ok === false) {
      errors.push({ message: `query ${q.kind}: ${r2.problem}` });
      continue;
    }
    answers.push({ ...r2.answer, queryIndex: qi });
    for (const c of r2.checks) checks.push(c);
  }
  for (const c of checks) if (!c.pass) errors.push({ message: `t\u1EF1 ki\u1EC3m FAIL: ${c.detail} (residual ${c.residual.toExponential(2)})` });
  const violations = [];
  for (const a of plan.asserts) {
    const r2 = computeEFieldQuery(ent, a.query);
    if (r2.ok === false) {
      errors.push({ message: `assert ${a.query.kind}: ${r2.problem}` });
      continue;
    }
    const tol = (a.tol ?? TOL_ASSERT6) * Math.max(1, Math.abs(a.equals));
    const delta = Math.abs(r2.answer.approx - a.equals);
    if (delta > tol) violations.push({ assert: a.query.kind, expected: a.equals, got: r2.answer.approx, delta });
  }
  const ok = violations.length === 0 && errors.length === 0 && answers.length === plan.queries.length && answers.every((a) => Number.isFinite(a.approx));
  return { ok, answers, checks, violations, errors, geometry: null, meta };
}

// api/_lib/kernel/chem/index.ts
var chem_exports = {};
__export(chem_exports, {
  ACTIVITY_SERIES: () => ACTIVITY_SERIES,
  ATOMIC_MASS: () => ATOMIC_MASS,
  COLORS: () => COLORS5,
  ChemPlanSchema: () => ChemPlanSchema,
  IONS: () => IONS,
  MOLAR_VOLUMES: () => MOLAR_VOLUMES,
  REACTIONS: () => REACTIONS,
  amountToMol: () => amountToMol,
  atomicMassOf: () => atomicMassOf,
  balance: () => balance,
  buildScene: () => buildScene2,
  classifyNoMatch: () => classifyNoMatch,
  colorOf: () => colorOf,
  explainNoReaction: () => explainNoReaction,
  findReactions: () => findReactions,
  isHydrate: () => isHydrate,
  molarMass: () => molarMass,
  parseDecimal: () => parseDecimal,
  parseFormula: () => parseFormula,
  rat: () => rat2,
  ratApprox: () => ratApprox,
  ratToString: () => ratToString,
  react: () => react,
  runChem: () => runChem,
  solubilityOf: () => solubilityOf
});

// api/_lib/kernel/chem/rat.ts
function rat2(num3, den = 1n) {
  return makeExact(num3, den, 1);
}
var R0 = rat2(0n);
var R1 = rat2(1n);
function assertRat(x, opName) {
  if (x === null || x.radicand !== 1) {
    throw new Error(`rat.${opName}: r\u1EDDi kh\u1ECFi tr\u01B0\u1EDDng h\u1EEFu t\u1EC9 (bug n\u1ED9i b\u1ED9)`);
  }
  return x;
}
function addR(a, b) {
  return assertRat(addExact(a, b), "addR");
}
function subR(a, b) {
  return assertRat(subExact(a, b), "subR");
}
function mulR(a, b) {
  return assertRat(mulExact(a, b), "mulR");
}
function divR(a, b) {
  return assertRat(divExact(a, b), "divR");
}
function cmpR(a, b) {
  const lhs = a.num * b.den;
  const rhs2 = b.num * a.den;
  return lhs < rhs2 ? -1 : lhs > rhs2 ? 1 : 0;
}
function isZeroR(a) {
  return a.num === 0n;
}
function absR(a) {
  return a.num < 0n ? rat2(-a.num, a.den) : a;
}
function minR(a, b) {
  return cmpR(a, b) <= 0 ? a : b;
}
function ratToString(a) {
  return a.den === 1n ? `${a.num}` : `${a.num}/${a.den}`;
}
function ratApprox(a) {
  return exactToApprox(a);
}
function parseDecimal(x) {
  let s;
  if (typeof x === "number") {
    if (!Number.isFinite(x)) throw new Error(`parseDecimal: s\u1ED1 kh\xF4ng h\u1EEFu h\u1EA1n (${x})`);
    s = x.toString();
    if (/[eE]/.test(s)) throw new Error(`parseDecimal: d\u1EA1ng m\u0169 kh\xF4ng h\u1ED7 tr\u1EE3 ("${s}")`);
  } else {
    s = x.trim();
  }
  if (s === "") throw new Error("parseDecimal: chu\u1ED7i r\u1ED7ng");
  const m = /^(-?)(\d+)(?:([.,])(\d+))?$/.exec(s);
  if (!m) {
    if ((s.match(/[.,]/g) ?? []).length > 1) {
      throw new Error(`parseDecimal: "${s}" c\xF3 nhi\u1EC1u d\u1EA5u ph\xE2n c\xE1ch \u2014 nghi d\u1EA5u ph\xE2n c\xE1ch ngh\xECn, kh\xF4ng h\u1EE3p l\u1EC7`);
    }
    throw new Error(`parseDecimal: kh\xF4ng \u0111\u1ECDc \u0111\u01B0\u1EE3c s\u1ED1 t\u1EEB "${s}"`);
  }
  const [, sign, intPart, sep, fracPart] = m;
  if (fracPart === "000") {
    throw new Error(`parseDecimal: "${s}" gi\u1ED1ng d\u1EA5u ph\xE2n c\xE1ch ngh\xECn ("1.000") \u2014 h\xE3y vi\u1EBFt s\u1ED1 nguy\xEAn kh\xF4ng ph\xE2n c\xE1ch ho\u1EB7c b\u1ECF c\xE1c s\u1ED1 0 th\u1EEBa`);
  }
  if (sep === "." && fracPart !== void 0 && fracPart.length === 3 && intPart !== "0") {
    throw new Error(`parseDecimal: "${s}" d\xF9ng d\u1EA5u CH\u1EA4M v\u1EDBi \u0111\xFAng 3 ch\u1EEF s\u1ED1 th\u1EADp ph\xE2n \u2014 nh\u1EADp nh\u1EB1ng d\u1EA5u ph\xE2n c\xE1ch ngh\xECn ki\u1EC3u VN ("2.500"=2500); h\xE3y d\xF9ng d\u1EA5u PH\u1EA8Y cho ph\u1EA7n th\u1EADp ph\xE2n ho\u1EB7c vi\u1EBFt s\u1ED1 nguy\xEAn`);
  }
  const frac = fracPart ?? "";
  const num3 = BigInt(intPart + frac) * (sign === "-" ? -1n : 1n);
  const den = 10n ** BigInt(frac.length);
  return rat2(num3, den);
}

// api/_lib/kernel/chem/planSchema.ts
var Qty = external_exports.union([external_exports.number(), external_exports.string()]).superRefine((v, ctx) => {
  try {
    const r2 = parseDecimal(v);
    if (cmpR(r2, R0) <= 0) {
      ctx.addIssue({ code: external_exports.ZodIssueCode.custom, message: `l\u01B0\u1EE3ng ch\u1EA5t ph\u1EA3i > 0 (nh\u1EADn "${v}")` });
    }
  } catch (e) {
    ctx.addIssue({ code: external_exports.ZodIssueCode.custom, message: e instanceof Error ? e.message : String(e) });
  }
});
var AmountSchema = external_exports.union([
  external_exports.object({ grams: Qty }),
  external_exports.object({ mol: Qty }),
  external_exports.object({ liters_gas: Qty }),
  external_exports.object({ solution: external_exports.object({ molarity: Qty, liters: Qty }) }),
  external_exports.object({ solution_percent: external_exports.object({ massGrams: Qty, percent: Qty }) }),
  external_exports.object({ excess: external_exports.literal(true) })
]);
var SpeciesOpSchema = external_exports.object({
  op: external_exports.literal("species"),
  formula: external_exports.string().min(1),
  amount: AmountSchema.optional(),
  // bỏ trống = định tính (bài hỏi hiện tượng)
  // vắng ⇒ suy theo bảng luật F20 (kim loại/oxit → solid; muối tan + amount solution
  // → solution; muối không tan → solid; khí danh sách đóng → gas; mơ hồ → bắt khai).
  state: external_exports.enum(["solid", "solution", "gas", "liquid"]).optional(),
  variant: external_exports.enum(["lo\xE3ng", "\u0111\u1EB7c"]).optional()
  // cho H2SO4/HNO3; vắng ⇒ 'loãng'
});
var MixOpSchema = external_exports.object({
  op: external_exports.literal("mix"),
  of: external_exports.array(external_exports.string()).optional(),
  // v0: PHẢI vắng mặt (trộn tất cả); v1: trộn tuần tự
  heated: external_exports.boolean().default(false)
  // true ⇔ record cần 't°' được phép khớp
});
var ChemQuerySchema = external_exports.union([
  external_exports.object({ kind: external_exports.literal("mass"), of: external_exports.string() }),
  external_exports.object({ kind: external_exports.literal("mol"), of: external_exports.string() }),
  external_exports.object({ kind: external_exports.literal("volume_gas"), of: external_exports.string() }),
  external_exports.object({ kind: external_exports.literal("concentration"), of: external_exports.string(), as: external_exports.enum(["CM", "C%"]) }),
  external_exports.object({ kind: external_exports.literal("remaining"), of: external_exports.string() }),
  // chất dư còn lại (mol + gam)
  external_exports.object({ kind: external_exports.literal("phenomena") }),
  external_exports.object({ kind: external_exports.literal("equation") })
]);
var ChemAssertSchema = external_exports.union([
  external_exports.object({ kind: external_exports.literal("given_mass"), of: external_exports.string(), grams: Qty, tol: Qty.optional() }),
  external_exports.object({ kind: external_exports.literal("given_mol"), of: external_exports.string(), mol: Qty, tol: Qty.optional() })
]);
var ChemPlanSchema = external_exports.object({
  ops: external_exports.array(external_exports.union([SpeciesOpSchema, MixOpSchema])).min(1),
  // LLM đọc từ đề: "đktc" (0°C, 1 atm — chương trình cũ) → 22.4; "đkc" (25°C, 1 bar —
  // GDPT 2018) → 24.79. Default = 24,79 (chương trình hiện hành).
  molarVolume: external_exports.union([external_exports.literal(22.4), external_exports.literal(24.79)]).default(24.79),
  queries: external_exports.array(ChemQuerySchema).min(1),
  asserts: external_exports.array(ChemAssertSchema).default([])
});

// api/_lib/kernel/chem/atomicMass.ts
var ATOMIC_MASS = {
  H: rat2(1n),
  He: rat2(4n),
  Li: rat2(7n),
  Be: rat2(9n),
  B: rat2(11n),
  C: rat2(12n),
  N: rat2(14n),
  O: rat2(16n),
  F: rat2(19n),
  Ne: rat2(20n),
  Na: rat2(23n),
  Mg: rat2(24n),
  Al: rat2(27n),
  Si: rat2(28n),
  P: rat2(31n),
  S: rat2(32n),
  Cl: rat2(71n, 2n),
  // 35,5
  K: rat2(39n),
  Ca: rat2(40n),
  Cr: rat2(52n),
  Mn: rat2(55n),
  Fe: rat2(56n),
  Ni: rat2(59n),
  Cu: rat2(64n),
  Zn: rat2(65n),
  Br: rat2(80n),
  Ag: rat2(108n),
  Sn: rat2(119n),
  I: rat2(127n),
  Ba: rat2(137n),
  Au: rat2(197n),
  Hg: rat2(201n),
  Pb: rat2(207n)
};
function atomicMassOf(symbol) {
  const m = ATOMIC_MASS[symbol];
  if (!m) throw new Error(`Kh\xF4ng c\xF3 nguy\xEAn t\u1EED kh\u1ED1i c\u1EE7a nguy\xEAn t\u1ED1 "${symbol}" trong b\u1EA3ng SGK v0`);
  return m;
}

// api/_lib/kernel/chem/formula.ts
function addInto(target, source, factor) {
  for (const [el, n] of source) {
    target.set(el, (target.get(el) ?? 0) + n * factor);
  }
}
var Parser = class {
  constructor(s) {
    this.s = s;
  }
  i = 0;
  peek() {
    return this.s[this.i] ?? "";
  }
  fail(msg) {
    throw new Error(`C\xF4ng th\u1EE9c "${this.s}" kh\xF4ng h\u1EE3p l\u1EC7: ${msg} (t\u1EA1i v\u1ECB tr\xED ${this.i})`);
  }
  // INT := [1-9][0-9]* — trả 1 nếu vắng mặt; chỉ số bắt đầu bằng 0 là lỗi.
  parseInt() {
    if (this.peek() === "0") this.fail("ch\u1EC9 s\u1ED1 0 kh\xF4ng h\u1EE3p l\u1EC7");
    if (!/[1-9]/.test(this.peek())) return 1;
    let digits = "";
    while (/[0-9]/.test(this.peek())) {
      digits += this.peek();
      this.i++;
    }
    return Number(digits);
  }
  parseElement() {
    let sym = this.peek();
    this.i++;
    if (/[a-z]/.test(this.peek())) {
      sym += this.peek();
      this.i++;
    }
    if (!ATOMIC_MASS[sym]) this.fail(`nguy\xEAn t\u1ED1 l\u1EA1 "${sym}"`);
    return sym;
  }
  // part := group+
  parsePart() {
    const out = /* @__PURE__ */ new Map();
    let groups = 0;
    for (; ; ) {
      const c = this.peek();
      if (/[A-Z]/.test(c)) {
        const el = this.parseElement();
        const n = this.parseInt();
        out.set(el, (out.get(el) ?? 0) + n);
        groups++;
      } else if (c === "(") {
        this.i++;
        const inner = this.parsePart();
        if (this.peek() !== ")") this.fail('thi\u1EBFu d\u1EA5u ")" \u0111\xF3ng ngo\u1EB7c');
        this.i++;
        const n = this.parseInt();
        addInto(out, inner, n);
        groups++;
      } else {
        break;
      }
    }
    if (groups === 0) this.fail("thi\u1EBFu nguy\xEAn t\u1ED1");
    if (this.peek() === "0") this.fail("ch\u1EC9 s\u1ED1 0 kh\xF4ng h\u1EE3p l\u1EC7");
    return out;
  }
  // formula := part ( ('.'|'·') INT? part )*
  parseFormula() {
    if (this.s === "") throw new Error("C\xF4ng th\u1EE9c r\u1ED7ng");
    const out = this.parsePart();
    let hydrate = false;
    while (this.peek() === "." || this.peek() === "\xB7") {
      hydrate = true;
      this.i++;
      const n = this.parseInt();
      const part = this.parsePart();
      addInto(out, part, n);
    }
    if (this.i !== this.s.length) this.fail(`k\xFD t\u1EF1 l\u1EA1 "${this.peek()}"`);
    return { counts: out, hydrate };
  }
};
function parseFormula(formula) {
  return new Parser(formula).parseFormula().counts;
}
function isHydrate(formula) {
  return new Parser(formula).parseFormula().hydrate;
}
function molarMass(formula) {
  let sum = R0;
  for (const [el, n] of parseFormula(formula)) {
    sum = addR(sum, mulR(rat2(BigInt(n)), atomicMassOf(el)));
  }
  return sum;
}

// api/_lib/kernel/chem/reactionDB.ts
var r = (formula, coeff, variant) => variant ? { formula, coeff, variant } : { formula, coeff };
var p = (formula, coeff, state) => ({ formula, coeff, state });
var REACTIONS = [
  // ── Nhóm A — Kim loại + phi kim (O2 / Cl2 / S) ─────────────────────────────
  {
    id: "R01",
    reactants: [r("Fe", 3), r("O2", 2)],
    products: [p("Fe3O4", 1, "solid")],
    conditions: ["t\xB0"],
    medium: "khan",
    type: "h\xF3a h\u1EE3p",
    redox: true,
    phenomena: ["s\u1EAFt ch\xE1y s\xE1ng, b\u1EAFn tia l\u1EEDa; t\u1EA1o h\u1EA1t r\u1EAFn m\xE0u n\xE2u \u0111en (oxit s\u1EAFt t\u1EEB)"],
    tags: ["hoa/9/kim-loai/tac-dung-phi-kim"]
  },
  {
    id: "R02",
    reactants: [r("Al", 4), r("O2", 3)],
    products: [p("Al2O3", 2, "solid")],
    conditions: ["t\xB0"],
    medium: "khan",
    type: "h\xF3a h\u1EE3p",
    redox: true,
    phenomena: ["ch\xE1y s\xE1ng ch\xF3i; t\u1EA1o ch\u1EA5t r\u1EAFn tr\u1EAFng"],
    tags: ["hoa/9/kim-loai/tac-dung-phi-kim"]
  },
  {
    id: "R03",
    reactants: [r("Mg", 2), r("O2", 1)],
    products: [p("MgO", 2, "solid")],
    conditions: ["t\xB0"],
    medium: "khan",
    type: "h\xF3a h\u1EE3p",
    redox: true,
    phenomena: ["ch\xE1y s\xE1ng ch\xF3i l\xF3a; t\u1EA1o kh\xF3i tr\u1EAFng MgO"],
    tags: ["hoa/9/kim-loai/tac-dung-phi-kim"]
  },
  {
    id: "R04",
    reactants: [r("Cu", 2), r("O2", 1)],
    products: [p("CuO", 2, "solid")],
    conditions: ["t\xB0"],
    medium: "khan",
    type: "h\xF3a h\u1EE3p",
    redox: true,
    phenomena: ["\u0111\u1ED3ng \u0111\u1ECF chuy\u1EC3n th\xE0nh l\u1EDBp r\u1EAFn m\xE0u \u0111en"],
    tags: ["hoa/9/kim-loai/tac-dung-phi-kim"]
  },
  {
    id: "R05",
    reactants: [r("Fe", 2), r("Cl2", 3)],
    products: [p("FeCl3", 2, "solid")],
    conditions: ["t\xB0"],
    medium: "khan",
    type: "h\xF3a h\u1EE3p",
    redox: true,
    phenomena: ["s\u1EAFt ch\xE1y trong clo t\u1EA1o kh\xF3i m\xE0u n\xE2u \u0111\u1ECF"],
    // §16.9: đúng nguyên văn SGK
    tags: ["hoa/9/kim-loai/tac-dung-phi-kim"]
  },
  {
    id: "R06",
    reactants: [r("Cu", 1), r("Cl2", 1)],
    products: [p("CuCl2", 1, "solid")],
    conditions: ["t\xB0"],
    medium: "khan",
    type: "h\xF3a h\u1EE3p",
    redox: true,
    phenomena: ["\u0111\u1ED3ng ch\xE1y t\u1EA1o kh\xF3i m\xE0u v\xE0ng n\xE2u"],
    // §16.1: GIỮ "khói màu vàng nâu" (CuCl2 khan)
    tags: ["hoa/9/kim-loai/tac-dung-phi-kim"]
  },
  {
    id: "R07",
    reactants: [r("Fe", 1), r("S", 1)],
    products: [p("FeS", 1, "solid")],
    conditions: ["t\xB0"],
    medium: "khan",
    type: "h\xF3a h\u1EE3p",
    redox: true,
    phenomena: ["h\u1ED7n h\u1EE3p n\xF3ng \u0111\u1ECF lan truy\u1EC1n; t\u1EA1o ch\u1EA5t r\u1EAFn m\xE0u x\xE1m \u0111en"],
    tags: ["hoa/9/kim-loai/tac-dung-phi-kim"]
  },
  // ── Nhóm B — Kim loại kiềm/kiềm thổ + nước ─────────────────────────────────
  {
    id: "R08",
    reactants: [r("Na", 2), r("H2O", 2)],
    products: [p("NaOH", 2, "solution"), p("H2", 1, "gas")],
    conditions: [],
    medium: "dd",
    type: "th\u1EBF",
    redox: true,
    phenomena: ["Na n\xF3ng ch\u1EA3y th\xE0nh gi\u1ECDt tr\xF2n ch\u1EA1y tr\xEAn m\u1EB7t n\u01B0\u1EDBc, s\u1EE7i b\u1ECDt kh\xED, t\u1ECFa nhi\u1EC7t"],
    tags: ["hoa/9/kim-loai/tac-dung-nuoc"]
  },
  {
    id: "R09",
    reactants: [r("Ca", 1), r("H2O", 2)],
    products: [p("Ca(OH)2", 1, "solution"), p("H2", 1, "gas")],
    conditions: [],
    medium: "dd",
    type: "th\u1EBF",
    redox: true,
    phenomena: ["s\u1EE7i b\u1ECDt kh\xED; dung d\u1ECBch v\u1EA9n \u0111\u1EE5c nh\u1EB9 (Ca(OH)2 \xEDt tan)"],
    // §16.5: GIỮ nguyên văn
    tags: ["hoa/9/kim-loai/tac-dung-nuoc"]
  },
  {
    id: "R10",
    reactants: [r("Ba", 1), r("H2O", 2)],
    products: [p("Ba(OH)2", 1, "solution"), p("H2", 1, "gas")],
    conditions: [],
    medium: "dd",
    type: "th\u1EBF",
    redox: true,
    phenomena: ["tan nhanh, s\u1EE7i b\u1ECDt kh\xED m\u1EA1nh, t\u1ECFa nhi\u1EC7t"],
    tags: ["hoa/9/kim-loai/tac-dung-nuoc"]
  },
  // ── Nhóm C — Kim loại + axit loãng (guard G1) ──────────────────────────────
  {
    id: "R11",
    reactants: [r("Mg", 1), r("HCl", 2)],
    products: [p("MgCl2", 1, "solution"), p("H2", 1, "gas")],
    conditions: [],
    medium: "dd",
    type: "th\u1EBF",
    redox: true,
    phenomena: ["kim lo\u1EA1i tan nhanh, s\u1EE7i b\u1ECDt kh\xED kh\xF4ng m\xE0u"],
    tags: ["hoa/9/kim-loai/tac-dung-axit"]
  },
  {
    id: "R12",
    reactants: [r("Al", 2), r("HCl", 6)],
    products: [p("AlCl3", 2, "solution"), p("H2", 3, "gas")],
    conditions: [],
    medium: "dd",
    type: "th\u1EBF",
    redox: true,
    phenomena: ["kim lo\u1EA1i tan, s\u1EE7i b\u1ECDt kh\xED kh\xF4ng m\xE0u"],
    tags: ["hoa/9/kim-loai/tac-dung-axit"]
  },
  {
    id: "R13",
    reactants: [r("Zn", 1), r("HCl", 2)],
    products: [p("ZnCl2", 1, "solution"), p("H2", 1, "gas")],
    conditions: [],
    medium: "dd",
    type: "th\u1EBF",
    redox: true,
    phenomena: ["vi\xEAn k\u1EBDm tan d\u1EA7n, s\u1EE7i b\u1ECDt kh\xED kh\xF4ng m\xE0u"],
    tags: ["hoa/9/kim-loai/tac-dung-axit"]
  },
  {
    id: "R14",
    reactants: [r("Fe", 1), r("HCl", 2)],
    products: [p("FeCl2", 1, "solution"), p("H2", 1, "gas")],
    conditions: [],
    medium: "dd",
    type: "th\u1EBF",
    redox: true,
    phenomena: ["s\u1EAFt tan d\u1EA7n, s\u1EE7i b\u1ECDt kh\xED; dung d\u1ECBch l\u1EE5c r\u1EA5t nh\u1EA1t (g\u1EA7n nh\u01B0 kh\xF4ng m\xE0u)"],
    tags: ["hoa/9/kim-loai/tac-dung-axit"]
  },
  {
    id: "R15",
    reactants: [r("Fe", 1), r("H2SO4", 1, "lo\xE3ng")],
    products: [p("FeSO4", 1, "solution"), p("H2", 1, "gas")],
    conditions: [],
    medium: "dd",
    type: "th\u1EBF",
    redox: true,
    phenomena: ["s\u1EAFt tan d\u1EA7n, s\u1EE7i b\u1ECDt kh\xED; dung d\u1ECBch l\u1EE5c r\u1EA5t nh\u1EA1t (g\u1EA7n nh\u01B0 kh\xF4ng m\xE0u)"],
    tags: ["hoa/9/kim-loai/tac-dung-axit"]
  },
  {
    id: "R16",
    reactants: [r("Al", 2), r("H2SO4", 3, "lo\xE3ng")],
    products: [p("Al2(SO4)3", 1, "solution"), p("H2", 3, "gas")],
    conditions: [],
    medium: "dd",
    type: "th\u1EBF",
    redox: true,
    phenomena: ["nh\xF4m tan, s\u1EE7i b\u1ECDt kh\xED kh\xF4ng m\xE0u"],
    tags: ["hoa/9/kim-loai/tac-dung-axit"]
  },
  // ── Nhóm D — Kim loại + axit có tính oxi hóa mạnh (guard G4 thụ động hóa) ──
  {
    id: "R17",
    reactants: [r("Cu", 1), r("H2SO4", 2, "\u0111\u1EB7c")],
    products: [p("CuSO4", 1, "solution"), p("SO2", 1, "gas"), p("H2O", 2, "liquid")],
    conditions: ["t\xB0"],
    medium: "dd",
    type: "oxi h\xF3a \u2013 kh\u1EED",
    redox: true,
    phenomena: ["Cu tan, kh\xED kh\xF4ng m\xE0u m\xF9i h\u1EAFc; dung d\u1ECBch chuy\u1EC3n xanh lam"],
    tags: ["hoa/12/dai-cuong-kim-loai/axit-oxi-hoa-manh"]
  },
  {
    id: "R18",
    reactants: [r("Cu", 3), r("HNO3", 8, "lo\xE3ng")],
    products: [p("Cu(NO3)2", 3, "solution"), p("NO", 2, "gas"), p("H2O", 4, "liquid")],
    conditions: [],
    medium: "dd",
    type: "oxi h\xF3a \u2013 kh\u1EED",
    redox: true,
    phenomena: ["Cu tan, kh\xED kh\xF4ng m\xE0u h\xF3a n\xE2u trong kh\xF4ng kh\xED; dung d\u1ECBch xanh lam"],
    tags: ["hoa/12/dai-cuong-kim-loai/axit-oxi-hoa-manh"]
  },
  {
    id: "R19",
    reactants: [r("Fe", 1), r("HNO3", 4, "lo\xE3ng")],
    products: [p("Fe(NO3)3", 1, "solution"), p("NO", 1, "gas"), p("H2O", 2, "liquid")],
    conditions: [],
    medium: "dd",
    type: "oxi h\xF3a \u2013 kh\u1EED",
    redox: true,
    phenomena: ["s\u1EAFt tan, kh\xED kh\xF4ng m\xE0u h\xF3a n\xE2u; dung d\u1ECBch v\xE0ng n\xE2u nh\u1EA1t"],
    tags: ["hoa/12/dai-cuong-kim-loai/axit-oxi-hoa-manh"],
    // F5: chỉ đúng khi HNO3 DƯ (Fe dư sẽ kéo Fe³⁺ về Fe²⁺: Fe + 2Fe(NO3)3 → 3Fe(NO3)2)
    domain: {
      requireExcess: ["HNO3"],
      reason: "ph\u01B0\u01A1ng tr\xECnh Fe + 4HNO3 \u2192 Fe(NO3)3 + NO + 2H2O ch\u1EC9 \u0111\xFAng khi HNO3 D\u01AF; n\u1EBFu HNO3 h\u1EEFu h\u1EA1n, Fe d\u01B0 s\u1EBD kh\u1EED Fe\xB3\u207A v\u1EC1 Fe\xB2\u207A (Fe + 2Fe(NO3)3 \u2192 3Fe(NO3)2) \u2014 v0 kh\xF4ng m\xF4 h\xECnh h\xF3a"
    }
  },
  // ── Nhóm E — Kim loại + dung dịch muối (guard G2) ──────────────────────────
  {
    id: "R20",
    reactants: [r("Fe", 1), r("CuSO4", 1)],
    products: [p("FeSO4", 1, "solution"), p("Cu", 1, "solid")],
    conditions: [],
    medium: "dd",
    type: "th\u1EBF",
    redox: true,
    phenomena: ["l\u1EDBp \u0111\u1ED3ng \u0111\u1ECF b\xE1m l\xEAn s\u1EAFt; m\xE0u xanh lam c\u1EE7a dung d\u1ECBch nh\u1EA1t d\u1EA7n"],
    tags: ["hoa/9/kim-loai/tac-dung-muoi"]
  },
  {
    id: "R21",
    reactants: [r("Zn", 1), r("CuSO4", 1)],
    products: [p("ZnSO4", 1, "solution"), p("Cu", 1, "solid")],
    conditions: [],
    medium: "dd",
    type: "th\u1EBF",
    redox: true,
    phenomena: ["l\u1EDBp \u0111\u1ED3ng \u0111\u1ECF b\xE1m l\xEAn k\u1EBDm; m\xE0u xanh lam nh\u1EA1t d\u1EA7n"],
    tags: ["hoa/9/kim-loai/tac-dung-muoi"]
  },
  {
    id: "R22",
    reactants: [r("Cu", 1), r("AgNO3", 2)],
    products: [p("Cu(NO3)2", 1, "solution"), p("Ag", 2, "solid")],
    conditions: [],
    medium: "dd",
    type: "th\u1EBF",
    redox: true,
    phenomena: ["l\u1EDBp b\u1EA1c tr\u1EAFng x\xE1m b\xE1m l\xEAn \u0111\u1ED3ng; dung d\u1ECBch chuy\u1EC3n d\u1EA7n sang xanh lam"],
    tags: ["hoa/9/kim-loai/tac-dung-muoi"]
  },
  {
    id: "R23",
    reactants: [r("Fe", 1), r("AgNO3", 2)],
    products: [p("Fe(NO3)2", 1, "solution"), p("Ag", 2, "solid")],
    conditions: [],
    medium: "dd",
    type: "th\u1EBF",
    redox: true,
    phenomena: ["b\u1EA1c tr\u1EAFng x\xE1m b\xE1m l\xEAn s\u1EAFt"],
    tags: ["hoa/9/kim-loai/tac-dung-muoi"],
    // F3 (§16.3): AgNO3 dư sẽ oxi hóa tiếp Fe²⁺ → Fe³⁺ — bắt buộc AgNO3 là chất HẾT TRƯỚC
    domain: {
      mustBeLimiting: ["AgNO3"],
      reason: "khi AgNO3 d\u01B0 (n(AgNO3) > 2n(Fe)), Ag\u207A d\u01B0 oxi h\xF3a ti\u1EBFp Fe\xB2\u207A th\xE0nh Fe\xB3\u207A (Fe(NO3)2 + AgNO3 \u2192 Fe(NO3)3 + Ag) \u2014 v0 kh\xF4ng m\xF4 h\xECnh h\xF3a ca d\u01B0"
    },
    note: "AgNO3 d\u01B0 s\u1EBD oxi h\xF3a ti\u1EBFp Fe\xB2\u207A \u2192 Fe\xB3\u207A, v0 KH\xD4NG m\xF4 h\xECnh h\xF3a ca d\u01B0"
  },
  // ── Nhóm F — Oxit ──────────────────────────────────────────────────────────
  {
    id: "R24",
    reactants: [r("CaO", 1), r("H2O", 1)],
    products: [p("Ca(OH)2", 1, "solid")],
    conditions: [],
    medium: "khan",
    type: "h\xF3a h\u1EE3p",
    redox: false,
    phenomena: ["t\u1ECFa nhi\u1EC7t m\u1EA1nh (t\xF4i v\xF4i), ch\u1EA5t r\u1EAFn nh\xE3o ra"],
    tags: ["hoa/9/oxit/tac-dung-nuoc"]
  },
  {
    id: "R25",
    reactants: [r("Na2O", 1), r("H2O", 1)],
    products: [p("NaOH", 2, "solution")],
    conditions: [],
    medium: "dd",
    type: "h\xF3a h\u1EE3p",
    redox: false,
    phenomena: ["tan h\u1EBFt, t\u1ECFa nhi\u1EC7t"],
    tags: ["hoa/9/oxit/tac-dung-nuoc"]
  },
  {
    id: "R26",
    reactants: [r("SO3", 1), r("H2O", 1)],
    products: [p("H2SO4", 1, "solution")],
    conditions: [],
    medium: "dd",
    type: "h\xF3a h\u1EE3p",
    redox: false,
    phenomena: ["t\u1ECFa nhi\u1EC7t"],
    tags: ["hoa/9/oxit/tac-dung-nuoc"]
  },
  {
    id: "R27",
    reactants: [r("CuO", 1), r("HCl", 2)],
    products: [p("CuCl2", 1, "solution"), p("H2O", 1, "liquid")],
    conditions: [],
    medium: "dd",
    type: "trao \u0111\u1ED5i",
    redox: false,
    phenomena: ["b\u1ED9t \u0111en tan, t\u1EA1o dung d\u1ECBch m\xE0u xanh lam"],
    // §16.2: dd CuCl2 CHỐT "xanh lam"
    tags: ["hoa/9/oxit/tac-dung-axit"]
  },
  {
    id: "R28",
    reactants: [r("Fe2O3", 1), r("HCl", 6)],
    products: [p("FeCl3", 2, "solution"), p("H2O", 3, "liquid")],
    conditions: [],
    medium: "dd",
    type: "trao \u0111\u1ED5i",
    redox: false,
    phenomena: ["b\u1ED9t \u0111\u1ECF n\xE2u tan, t\u1EA1o dung d\u1ECBch v\xE0ng n\xE2u"],
    tags: ["hoa/9/oxit/tac-dung-axit"]
  },
  {
    id: "R29",
    reactants: [r("CO2", 1), r("Ca(OH)2", 1)],
    products: [p("CaCO3", 1, "solid"), p("H2O", 1, "liquid")],
    conditions: [],
    medium: "dd",
    type: "oxit-axit + baz\u01A1",
    redox: false,
    // F17
    phenomena: ["n\u01B0\u1EDBc v\xF4i trong v\u1EA9n \u0111\u1EE5c (k\u1EBFt t\u1EE7a tr\u1EAFng)"],
    tags: ["hoa/9/oxit/oxit-axit-tac-dung-bazo"],
    // F4: CO2 dư hòa tan kết tủa (CaCO3 + CO2 + H2O → Ca(HCO3)2) — bắt buộc CO2 hết trước
    domain: {
      mustBeLimiting: ["CO2"],
      reason: "khi CO2 d\u01B0 (n(CO2) > n(Ca(OH)2)), k\u1EBFt t\u1EE7a b\u1ECB h\xF2a tan m\u1ED9t ph\u1EA7n t\u1EA1o Ca(HCO3)2 \u2014 v0 kh\xF4ng m\xF4 h\xECnh h\xF3a b\xE0i to\xE1n hai mu\u1ED1i"
    }
  },
  {
    id: "R30",
    reactants: [r("Al2O3", 1), r("NaOH", 2)],
    products: [p("NaAlO2", 2, "solution"), p("H2O", 1, "liquid")],
    conditions: [],
    medium: "dd",
    type: "oxit l\u01B0\u1EE1ng t\xEDnh + ki\u1EC1m",
    redox: false,
    // F17; §16.6: CHỐT NaAlO2
    phenomena: ["ch\u1EA5t r\u1EAFn tr\u1EAFng tan trong ki\u1EC1m (oxit l\u01B0\u1EE1ng t\xEDnh)"],
    tags: ["hoa/9/oxit/oxit-luong-tinh"]
  },
  // ── Nhóm G — Axit + bazơ (trung hòa) ───────────────────────────────────────
  {
    id: "R31",
    reactants: [r("NaOH", 1), r("HCl", 1)],
    products: [p("NaCl", 1, "solution"), p("H2O", 1, "liquid")],
    conditions: [],
    medium: "dd",
    type: "trao \u0111\u1ED5i",
    redox: false,
    phenomena: ["kh\xF4ng hi\u1EC7n t\u01B0\u1EE3ng nh\xECn th\u1EA5y; t\u1ECFa nhi\u1EC7t nh\u1EB9 (qu\u1EF3/phenolphtalein \u0111\u1ED5i m\xE0u n\u1EBFu c\xF3)"],
    tags: ["hoa/9/axit-bazo-muoi/trung-hoa"]
  },
  {
    id: "R32",
    reactants: [r("NaOH", 2), r("H2SO4", 1, "lo\xE3ng")],
    products: [p("Na2SO4", 1, "solution"), p("H2O", 2, "liquid")],
    conditions: [],
    medium: "dd",
    type: "trao \u0111\u1ED5i",
    redox: false,
    phenomena: ["kh\xF4ng hi\u1EC7n t\u01B0\u1EE3ng nh\xECn th\u1EA5y; t\u1ECFa nhi\u1EC7t nh\u1EB9 (qu\u1EF3/phenolphtalein \u0111\u1ED5i m\xE0u n\u1EBFu c\xF3)"],
    tags: ["hoa/9/axit-bazo-muoi/trung-hoa"]
  },
  {
    id: "R33",
    reactants: [r("Cu(OH)2", 1), r("HCl", 2)],
    products: [p("CuCl2", 1, "solution"), p("H2O", 2, "liquid")],
    conditions: [],
    medium: "dd",
    type: "trao \u0111\u1ED5i",
    redox: false,
    phenomena: ["k\u1EBFt t\u1EE7a xanh lam tan, t\u1EA1o dung d\u1ECBch xanh lam"],
    tags: ["hoa/9/axit-bazo-muoi/trung-hoa"]
  },
  {
    id: "R34",
    reactants: [r("Ba(OH)2", 1), r("H2SO4", 1, "lo\xE3ng")],
    products: [p("BaSO4", 1, "solid"), p("H2O", 2, "liquid")],
    conditions: [],
    medium: "dd",
    type: "trao \u0111\u1ED5i",
    redox: false,
    phenomena: ["k\u1EBFt t\u1EE7a tr\u1EAFng (kh\xF4ng tan trong axit d\u01B0)"],
    tags: ["hoa/9/axit-bazo-muoi/trung-hoa"]
  },
  // ── Nhóm H — Muối + bazơ / muối + axit / muối + muối ──────────────────────
  {
    id: "R35",
    reactants: [r("CuSO4", 1), r("NaOH", 2)],
    products: [p("Cu(OH)2", 1, "solid"), p("Na2SO4", 1, "solution")],
    conditions: [],
    medium: "dd",
    type: "trao \u0111\u1ED5i",
    redox: false,
    phenomena: ["k\u1EBFt t\u1EE7a xanh lam"],
    tags: ["hoa/9/axit-bazo-muoi/muoi-tac-dung-bazo"]
  },
  {
    id: "R36",
    reactants: [r("FeCl3", 1), r("NaOH", 3)],
    products: [p("Fe(OH)3", 1, "solid"), p("NaCl", 3, "solution")],
    conditions: [],
    medium: "dd",
    type: "trao \u0111\u1ED5i",
    redox: false,
    phenomena: ["k\u1EBFt t\u1EE7a n\xE2u \u0111\u1ECF"],
    tags: ["hoa/9/axit-bazo-muoi/muoi-tac-dung-bazo"]
  },
  {
    id: "R37",
    reactants: [r("FeCl2", 1), r("NaOH", 2)],
    products: [p("Fe(OH)2", 1, "solid"), p("NaCl", 2, "solution")],
    conditions: [],
    medium: "dd",
    type: "trao \u0111\u1ED5i",
    redox: false,
    phenomena: ["k\u1EBFt t\u1EE7a tr\u1EAFng xanh, h\xF3a n\xE2u \u0111\u1ECF d\u1EA7n trong kh\xF4ng kh\xED"],
    tags: ["hoa/9/axit-bazo-muoi/muoi-tac-dung-bazo"],
    note: "h\xF3a n\xE2u = 4Fe(OH)2 + O2 + 2H2O \u2192 4Fe(OH)3, ch\u1EC9 ghi hi\u1EC7n t\u01B0\u1EE3ng, kh\xF4ng th\xE0nh record"
  },
  {
    id: "R38",
    reactants: [r("NH4Cl", 1), r("NaOH", 1)],
    products: [p("NaCl", 1, "solution"), p("NH3", 1, "gas"), p("H2O", 1, "liquid")],
    conditions: ["t\xB0"],
    medium: "dd",
    type: "trao \u0111\u1ED5i",
    redox: false,
    // §16.7: GIỮ t°
    phenomena: ["kh\xED m\xF9i khai bay l\xEAn, l\xE0m xanh qu\u1EF3 t\xEDm \u1EA9m"],
    tags: ["hoa/9/axit-bazo-muoi/muoi-tac-dung-bazo"]
  },
  {
    id: "R39",
    reactants: [r("Na2CO3", 1), r("HCl", 2)],
    products: [p("NaCl", 2, "solution"), p("H2O", 1, "liquid"), p("CO2", 1, "gas")],
    conditions: [],
    medium: "dd",
    type: "trao \u0111\u1ED5i",
    redox: false,
    phenomena: ["s\u1EE7i b\u1ECDt kh\xED kh\xF4ng m\xE0u, l\xE0m \u0111\u1EE5c n\u01B0\u1EDBc v\xF4i"],
    tags: ["hoa/9/axit-bazo-muoi/muoi-tac-dung-axit"],
    // F7: dạng "nhỏ từ từ axit thiếu" đi qua trung gian NaHCO3 — bắt buộc HCl đủ/dư
    domain: {
      mustBeLimiting: ["Na2CO3"],
      reason: "khi HCl thi\u1EBFu (n(HCl) < 2n(Na2CO3)), ph\u1EA3n \u1EE9ng d\u1EEBng \u1EDF trung gian NaHCO3 (Na2CO3 + HCl \u2192 NaHCO3 + NaCl), l\u01B0\u1EE3ng CO2 tho\xE1t ra \xEDt h\u01A1n \u2014 v0 kh\xF4ng m\xF4 h\xECnh h\xF3a nh\u1ECF t\u1EEB t\u1EEB"
    }
  },
  {
    id: "R40",
    reactants: [r("CaCO3", 1), r("HCl", 2)],
    products: [p("CaCl2", 1, "solution"), p("H2O", 1, "liquid"), p("CO2", 1, "gas")],
    conditions: [],
    medium: "dd",
    type: "trao \u0111\u1ED5i",
    redox: false,
    phenomena: ["\u0111\xE1 v\xF4i tan, s\u1EE7i b\u1ECDt kh\xED kh\xF4ng m\xE0u"],
    tags: ["hoa/9/axit-bazo-muoi/muoi-tac-dung-axit"]
  },
  {
    id: "R41",
    reactants: [r("AgNO3", 1), r("NaCl", 1)],
    products: [p("AgCl", 1, "solid"), p("NaNO3", 1, "solution")],
    conditions: [],
    medium: "dd",
    type: "trao \u0111\u1ED5i",
    redox: false,
    phenomena: ["k\u1EBFt t\u1EE7a tr\u1EAFng, h\xF3a \u0111en d\u1EA7n ngo\xE0i \xE1nh s\xE1ng"],
    tags: ["hoa/9/axit-bazo-muoi/muoi-tac-dung-muoi"]
  },
  {
    id: "R42",
    reactants: [r("BaCl2", 1), r("Na2SO4", 1)],
    products: [p("BaSO4", 1, "solid"), p("NaCl", 2, "solution")],
    conditions: [],
    medium: "dd",
    type: "trao \u0111\u1ED5i",
    redox: false,
    phenomena: ["k\u1EBFt t\u1EE7a tr\u1EAFng, kh\xF4ng tan trong axit"],
    tags: ["hoa/9/axit-bazo-muoi/muoi-tac-dung-muoi"]
  },
  // ── Nhóm I — Nhiệt phân (guard G3: cần t°; F12: chỉ khớp mix đúng 1 chất) ──
  {
    id: "R43",
    reactants: [r("CaCO3", 1)],
    products: [p("CaO", 1, "solid"), p("CO2", 1, "gas")],
    conditions: ["t\xB0"],
    medium: "khan",
    type: "ph\xE2n h\u1EE7y",
    redox: false,
    phenomena: ["ch\u1EA5t r\u1EAFn tr\u1EAFng c\xF2n l\u1EA1i x\u1ED1p h\u01A1n; kh\xED tho\xE1t l\xE0m \u0111\u1EE5c n\u01B0\u1EDBc v\xF4i"],
    tags: ["hoa/9/phan-ung/nhiet-phan"]
  },
  {
    id: "R44",
    reactants: [r("KMnO4", 2)],
    products: [p("K2MnO4", 1, "solid"), p("MnO2", 1, "solid"), p("O2", 1, "gas")],
    conditions: ["t\xB0"],
    medium: "khan",
    type: "ph\xE2n h\u1EE7y",
    redox: true,
    phenomena: ["tinh th\u1EC3 t\xEDm r\xE3 ra, thu kh\xED O2 (l\xE0m b\xF9ng t\xE0n \u0111\xF3m \u0111\u1ECF)"],
    tags: ["hoa/9/phan-ung/nhiet-phan", "hoa/8/oxi-khong-khi/dieu-che-oxi"]
  },
  {
    id: "R45",
    reactants: [r("Cu(OH)2", 1)],
    products: [p("CuO", 1, "solid"), p("H2O", 1, "gas")],
    conditions: ["t\xB0"],
    medium: "khan",
    type: "ph\xE2n h\u1EE7y",
    redox: false,
    phenomena: ["k\u1EBFt t\u1EE7a xanh lam chuy\u1EC3n th\xE0nh ch\u1EA5t r\u1EAFn \u0111en"],
    tags: ["hoa/9/phan-ung/nhiet-phan"]
  },
  {
    id: "R46",
    reactants: [r("Fe(OH)3", 2)],
    products: [p("Fe2O3", 1, "solid"), p("H2O", 3, "gas")],
    conditions: ["t\xB0"],
    medium: "khan",
    type: "ph\xE2n h\u1EE7y",
    redox: false,
    phenomena: ["ch\u1EA5t r\u1EAFn n\xE2u \u0111\u1ECF \u2192 b\u1ED9t \u0111\u1ECF n\xE2u"],
    tags: ["hoa/9/phan-ung/nhiet-phan"]
  },
  {
    id: "R47",
    reactants: [r("NaHCO3", 2)],
    products: [p("Na2CO3", 1, "solid"), p("H2O", 1, "gas"), p("CO2", 1, "gas")],
    conditions: ["t\xB0"],
    medium: "khan",
    type: "ph\xE2n h\u1EE7y",
    redox: false,
    phenomena: ["kh\xED tho\xE1t l\xE0m \u0111\u1EE5c n\u01B0\u1EDBc v\xF4i"],
    tags: ["hoa/9/phan-ung/nhiet-phan"]
  },
  // ── Nhóm K — Khử oxit kim loại / nhiệt nhôm ────────────────────────────────
  {
    id: "R48",
    reactants: [r("CuO", 1), r("H2", 1)],
    products: [p("Cu", 1, "solid"), p("H2O", 1, "gas")],
    conditions: ["t\xB0"],
    medium: "khan",
    type: "oxi h\xF3a \u2013 kh\u1EED",
    redox: true,
    phenomena: ["b\u1ED9t \u0111en chuy\u1EC3n \u0111\u1ECF (Cu); h\u01A1i n\u01B0\u1EDBc ng\u01B0ng tr\xEAn th\xE0nh \u1ED1ng"],
    tags: ["hoa/9/kim-loai/dieu-che-kim-loai"]
  },
  {
    id: "R49",
    reactants: [r("Fe2O3", 1), r("CO", 3)],
    products: [p("Fe", 2, "solid"), p("CO2", 3, "gas")],
    conditions: ["t\xB0"],
    medium: "khan",
    type: "oxi h\xF3a \u2013 kh\u1EED",
    redox: true,
    phenomena: ["b\u1ED9t \u0111\u1ECF n\xE2u chuy\u1EC3n x\xE1m (Fe); kh\xED ra l\xE0m \u0111\u1EE5c n\u01B0\u1EDBc v\xF4i"],
    tags: ["hoa/9/kim-loai/dieu-che-kim-loai"]
  },
  {
    id: "R50",
    reactants: [r("Al", 2), r("Fe2O3", 1)],
    products: [p("Al2O3", 1, "solid"), p("Fe", 2, "solid")],
    conditions: ["t\xB0"],
    medium: "khan",
    type: "oxi h\xF3a \u2013 kh\u1EED",
    redox: true,
    phenomena: ["ph\u1EA3n \u1EE9ng ch\xE1y s\xE1ng ch\xF3i, t\u1ECFa nhi\u1EC7t m\u1EA1nh; thu s\u1EAFt n\xF3ng ch\u1EA3y (nhi\u1EC7t nh\xF4m)"],
    tags: ["hoa/9/kim-loai/dieu-che-kim-loai"]
  },
  // ── R51–R58 — 8 phản ứng canon bổ sung theo review F18 (không mang rủi ro miền) ──
  {
    id: "R51",
    reactants: [r("K", 2), r("H2O", 2)],
    products: [p("KOH", 2, "solution"), p("H2", 1, "gas")],
    conditions: [],
    medium: "dd",
    type: "th\u1EBF",
    redox: true,
    phenomena: ["kali n\xF3ng ch\u1EA3y th\xE0nh gi\u1ECDt tr\xF2n ch\u1EA1y tr\xEAn m\u1EB7t n\u01B0\u1EDBc, s\u1EE7i b\u1ECDt kh\xED m\u1EA1nh, t\u1ECFa nhi\u1EC7t (kh\xED tho\xE1t c\xF3 th\u1EC3 t\u1EF1 b\u1ED1c ch\xE1y)"],
    tags: ["hoa/9/kim-loai/tac-dung-nuoc"]
  },
  {
    id: "R52",
    reactants: [r("Mg", 1), r("CuSO4", 1)],
    products: [p("MgSO4", 1, "solution"), p("Cu", 1, "solid")],
    conditions: [],
    medium: "dd",
    type: "th\u1EBF",
    redox: true,
    phenomena: ["l\u1EDBp \u0111\u1ED3ng \u0111\u1ECF b\xE1m l\xEAn magie; m\xE0u xanh lam c\u1EE7a dung d\u1ECBch nh\u1EA1t d\u1EA7n"],
    tags: ["hoa/9/kim-loai/tac-dung-muoi"]
  },
  {
    id: "R53",
    reactants: [r("BaCl2", 1), r("H2SO4", 1, "lo\xE3ng")],
    products: [p("BaSO4", 1, "solid"), p("HCl", 2, "solution")],
    conditions: [],
    medium: "dd",
    type: "trao \u0111\u1ED5i",
    redox: false,
    phenomena: ["k\u1EBFt t\u1EE7a tr\u1EAFng (BaSO4), kh\xF4ng tan trong axit d\u01B0"],
    tags: ["hoa/9/axit-bazo-muoi/muoi-tac-dung-axit"]
  },
  {
    id: "R54",
    reactants: [r("AgNO3", 1), r("HCl", 1)],
    products: [p("AgCl", 1, "solid"), p("HNO3", 1, "solution")],
    conditions: [],
    medium: "dd",
    type: "trao \u0111\u1ED5i",
    redox: false,
    phenomena: ["k\u1EBFt t\u1EE7a tr\u1EAFng (AgCl), h\xF3a \u0111en d\u1EA7n ngo\xE0i \xE1nh s\xE1ng"],
    tags: ["hoa/9/axit-bazo-muoi/muoi-tac-dung-axit"]
  },
  {
    id: "R55",
    reactants: [r("Ba(OH)2", 1), r("Na2SO4", 1)],
    products: [p("BaSO4", 1, "solid"), p("NaOH", 2, "solution")],
    conditions: [],
    medium: "dd",
    type: "trao \u0111\u1ED5i",
    redox: false,
    phenomena: ["k\u1EBFt t\u1EE7a tr\u1EAFng (BaSO4)"],
    tags: ["hoa/9/axit-bazo-muoi/muoi-tac-dung-bazo"]
  },
  {
    id: "R56",
    reactants: [r("NaHCO3", 1), r("HCl", 1)],
    products: [p("NaCl", 1, "solution"), p("H2O", 1, "liquid"), p("CO2", 1, "gas")],
    conditions: [],
    medium: "dd",
    type: "trao \u0111\u1ED5i",
    redox: false,
    phenomena: ["s\u1EE7i b\u1ECDt kh\xED kh\xF4ng m\xE0u, l\xE0m \u0111\u1EE5c n\u01B0\u1EDBc v\xF4i trong"],
    tags: ["hoa/9/axit-bazo-muoi/muoi-tac-dung-axit"]
  },
  {
    id: "R57",
    reactants: [r("NaHCO3", 1), r("NaOH", 1)],
    products: [p("Na2CO3", 1, "solution"), p("H2O", 1, "liquid")],
    conditions: [],
    medium: "dd",
    type: "trao \u0111\u1ED5i",
    redox: false,
    phenomena: ["kh\xF4ng hi\u1EC7n t\u01B0\u1EE3ng nh\xECn th\u1EA5y (t\u1EA1o Na2CO3 tan trong dung d\u1ECBch)"],
    tags: ["hoa/9/axit-bazo-muoi/muoi-tac-dung-bazo"]
  },
  {
    id: "R58",
    reactants: [r("Ca(OH)2", 1), r("Na2CO3", 1)],
    products: [p("CaCO3", 1, "solid"), p("NaOH", 2, "solution")],
    conditions: [],
    medium: "dd",
    type: "trao \u0111\u1ED5i",
    redox: false,
    phenomena: ["k\u1EBFt t\u1EE7a tr\u1EAFng (CaCO3)"],
    tags: ["hoa/9/axit-bazo-muoi/muoi-tac-dung-bazo"]
  }
];
var ACTIVITY_SERIES = [
  "K",
  "Ba",
  "Ca",
  "Na",
  "Mg",
  "Al",
  "Zn",
  "Fe",
  "Ni",
  "Sn",
  "Pb",
  "H",
  "Cu",
  "Hg",
  "Ag",
  "Pt",
  "Au"
];
var METALS = new Set(ACTIVITY_SERIES.filter((s) => s !== "H"));
var WATER_FIRST_METALS = /* @__PURE__ */ new Set(["K", "Na", "Ca", "Ba"]);
var IONS = {
  // axit (cation H⁺)
  HCl: { cation: "H", anion: "Cl" },
  H2SO4: { cation: "H", anion: "SO4" },
  HNO3: { cation: "H", anion: "NO3" },
  // bazơ
  NaOH: { cation: "Na", anion: "OH" },
  KOH: { cation: "K", anion: "OH" },
  "Ca(OH)2": { cation: "Ca", anion: "OH" },
  "Ba(OH)2": { cation: "Ba", anion: "OH" },
  "Mg(OH)2": { cation: "Mg", anion: "OH" },
  "Al(OH)3": { cation: "Al", anion: "OH" },
  "Zn(OH)2": { cation: "Zn", anion: "OH" },
  "Fe(OH)2": { cation: "Fe2", anion: "OH" },
  "Fe(OH)3": { cation: "Fe3", anion: "OH" },
  "Cu(OH)2": { cation: "Cu", anion: "OH" },
  // muối clorua
  NaCl: { cation: "Na", anion: "Cl" },
  KCl: { cation: "K", anion: "Cl" },
  NH4Cl: { cation: "NH4", anion: "Cl" },
  MgCl2: { cation: "Mg", anion: "Cl" },
  CaCl2: { cation: "Ca", anion: "Cl" },
  BaCl2: { cation: "Ba", anion: "Cl" },
  AlCl3: { cation: "Al", anion: "Cl" },
  ZnCl2: { cation: "Zn", anion: "Cl" },
  FeCl2: { cation: "Fe2", anion: "Cl" },
  FeCl3: { cation: "Fe3", anion: "Cl" },
  CuCl2: { cation: "Cu", anion: "Cl" },
  AgCl: { cation: "Ag", anion: "Cl" },
  PbCl2: { cation: "Pb", anion: "Cl" },
  // muối sunfat
  Na2SO4: { cation: "Na", anion: "SO4" },
  K2SO4: { cation: "K", anion: "SO4" },
  "(NH4)2SO4": { cation: "NH4", anion: "SO4" },
  MgSO4: { cation: "Mg", anion: "SO4" },
  CaSO4: { cation: "Ca", anion: "SO4" },
  BaSO4: { cation: "Ba", anion: "SO4" },
  "Al2(SO4)3": { cation: "Al", anion: "SO4" },
  ZnSO4: { cation: "Zn", anion: "SO4" },
  FeSO4: { cation: "Fe2", anion: "SO4" },
  "Fe2(SO4)3": { cation: "Fe3", anion: "SO4" },
  CuSO4: { cation: "Cu", anion: "SO4" },
  Ag2SO4: { cation: "Ag", anion: "SO4" },
  PbSO4: { cation: "Pb", anion: "SO4" },
  // muối nitrat
  NaNO3: { cation: "Na", anion: "NO3" },
  KNO3: { cation: "K", anion: "NO3" },
  NH4NO3: { cation: "NH4", anion: "NO3" },
  "Mg(NO3)2": { cation: "Mg", anion: "NO3" },
  "Ca(NO3)2": { cation: "Ca", anion: "NO3" },
  "Ba(NO3)2": { cation: "Ba", anion: "NO3" },
  "Al(NO3)3": { cation: "Al", anion: "NO3" },
  "Zn(NO3)2": { cation: "Zn", anion: "NO3" },
  "Fe(NO3)2": { cation: "Fe2", anion: "NO3" },
  "Fe(NO3)3": { cation: "Fe3", anion: "NO3" },
  "Cu(NO3)2": { cation: "Cu", anion: "NO3" },
  AgNO3: { cation: "Ag", anion: "NO3" },
  "Pb(NO3)2": { cation: "Pb", anion: "NO3" },
  // muối cacbonat
  Na2CO3: { cation: "Na", anion: "CO3" },
  K2CO3: { cation: "K", anion: "CO3" },
  "(NH4)2CO3": { cation: "NH4", anion: "CO3" },
  MgCO3: { cation: "Mg", anion: "CO3" },
  CaCO3: { cation: "Ca", anion: "CO3" },
  BaCO3: { cation: "Ba", anion: "CO3" }
};
var CATION_ELEMENT = {
  Na: "Na",
  K: "K",
  Mg: "Mg",
  Ca: "Ca",
  Ba: "Ba",
  Al: "Al",
  Zn: "Zn",
  Fe2: "Fe",
  Fe3: "Fe",
  Cu: "Cu",
  Ag: "Ag",
  Pb: "Pb"
};
function solubilityOf(cation, anion) {
  switch (anion) {
    case "NO3":
      return "tan";
    case "Cl":
      if (cation === "Ag") return "khong_tan";
      if (cation === "Pb") return "it_tan";
      return "tan";
    case "SO4":
      if (cation === "Ba" || cation === "Pb") return "khong_tan";
      if (cation === "Ca" || cation === "Ag") return "it_tan";
      return "tan";
    case "CO3":
      if (cation === "Na" || cation === "K" || cation === "NH4") return "tan";
      return "khong_tan";
    case "OH":
      if (cation === "Na" || cation === "K" || cation === "Ba") return "tan";
      if (cation === "Ca") return "it_tan";
      return "khong_tan";
  }
}
var VARIANT_ACIDS = /* @__PURE__ */ new Set(["H2SO4", "HNO3"]);
function effectiveVariant(s) {
  if (s.variant) return s.variant;
  return VARIANT_ACIDS.has(s.formula) ? "lo\xE3ng" : void 0;
}
function reactantMatches(rr, s) {
  if (rr.formula !== s.formula) return false;
  if (!rr.variant) return true;
  return rr.variant === effectiveVariant(s);
}
function recordMatchesSpecies(record, species) {
  if (record.reactants.length === 1 && species.length !== 1) return false;
  return record.reactants.every((rr) => species.some((s) => reactantMatches(rr, s)));
}
function findMatches(species, opts) {
  const bySpecies = REACTIONS.filter((rec) => recordMatchesSpecies(rec, species));
  let matches = bySpecies.filter((rec) => !rec.conditions.includes("t\xB0") || opts.heated);
  const heatMisses = bySpecies.filter((rec) => rec.conditions.includes("t\xB0") && !opts.heated);
  if (matches.length > 1) {
    const formulas = new Set(species.map((s) => s.formula));
    const full = matches.filter(
      (rec) => rec.reactants.length === formulas.size && rec.reactants.every((rr) => formulas.has(rr.formula))
    );
    if (full.length >= 1) matches = full;
  }
  return { matches, heatMisses };
}
function findReactions(species, opts) {
  return findMatches(species, opts).matches;
}
function classifyNoMatch(species, opts) {
  const metals = species.filter((s) => METALS.has(s.formula));
  const ionic = species.filter((s) => IONS[s.formula]);
  const idx = (m) => ACTIVITY_SERIES.indexOf(m);
  const passiveMetal = metals.find((m) => m.formula === "Al" || m.formula === "Fe");
  const strongAcidDac = species.find(
    (s) => (s.formula === "HNO3" || s.formula === "H2SO4") && effectiveVariant(s) === "\u0111\u1EB7c"
  );
  if (passiveMetal && strongAcidDac) {
    if (!opts.heated) {
      return {
        verdict: "no_reaction",
        reason: `${passiveMetal.formula} b\u1ECB th\u1EE5 \u0111\u1ED9ng h\xF3a trong ${strongAcidDac.formula} \u0111\u1EB7c ngu\u1ED9i (l\u1EDBp oxit b\u1EC1n b\u1EA3o v\u1EC7) \u2014 kh\xF4ng ph\u1EA3n \u1EE9ng`
      };
    }
    return {
      verdict: "out_of_scope",
      reason: `${passiveMetal.formula} + ${strongAcidDac.formula} \u0111\u1EB7c n\xF3ng C\xD3 ph\u1EA3n \u1EE9ng (oxi h\xF3a m\u1EA1nh) nh\u01B0ng ngo\xE0i ph\u1EA1m vi DB v0`
    };
  }
  const salts = ionic.filter((s) => {
    const io = IONS[s.formula];
    return io.cation !== "H" && io.anion !== "OH";
  });
  const waterFirst = metals.find((m) => WATER_FIRST_METALS.has(m.formula));
  if (waterFirst && salts.length > 0) {
    return {
      verdict: "out_of_scope",
      reason: `${waterFirst.formula} l\xE0 kim lo\u1EA1i ki\u1EC1m/ki\u1EC1m th\u1ED5 m\u1EA1nh: cho v\xE0o dung d\u1ECBch mu\u1ED1i s\u1EBD ph\u1EA3n \u1EE9ng v\u1EDBi n\u01B0\u1EDBc tr\u01B0\u1EDBc (t\u1EA1o baz\u01A1 + H2), sau \u0111\xF3 baz\u01A1 m\u1EDBi t\xE1c d\u1EE5ng v\u1EDBi mu\u1ED1i \u2014 ngo\xE0i ph\u1EA1m vi v0`
    };
  }
  const nonOxAcid = species.find(
    (s) => s.formula === "HCl" || s.formula === "H2SO4" && effectiveVariant(s) === "lo\xE3ng"
  );
  if (metals.length > 0 && nonOxAcid) {
    const after = metals.find((m) => idx(m.formula) > idx("H"));
    if (after) {
      return {
        verdict: "no_reaction",
        reason: `${after.formula} \u0111\u1EE9ng sau H trong d\xE3y ho\u1EA1t \u0111\u1ED9ng h\xF3a h\u1ECDc n\xEAn kh\xF4ng ph\u1EA3n \u1EE9ng v\u1EDBi ${nonOxAcid.formula}${nonOxAcid.formula === "H2SO4" ? " lo\xE3ng" : ""}`
      };
    }
  }
  if (metals.length > 0 && salts.length > 0) {
    for (const metal of metals) {
      for (const salt of salts) {
        const io = IONS[salt.formula];
        if (io.cation === "Fe3") {
          return {
            verdict: "out_of_scope",
            reason: `mu\u1ED1i Fe\xB3\u207A (${salt.formula}) c\xF3 th\u1EC3 oxi h\xF3a kim lo\u1EA1i (vd Cu + 2FeCl3 \u2192 CuCl2 + 2FeCl2) \u2014 ph\u1EA3n \u1EE9ng th\u1EADt nh\u01B0ng ngo\xE0i ph\u1EA1m vi DB v0`
          };
        }
        const el = CATION_ELEMENT[io.cation];
        if (!el) continue;
        if (idx(metal.formula) >= idx(el)) {
          return {
            verdict: "no_reaction",
            reason: metal.formula === el ? `${metal.formula} kh\xF4ng \u0111\u1EE9ng tr\u01B0\u1EDBc ${el} trong d\xE3y ho\u1EA1t \u0111\u1ED9ng h\xF3a h\u1ECDc (c\xF9ng m\u1ED9t kim lo\u1EA1i) \u2014 kh\xF4ng t\u1EF1 \u0111\u1EA9y m\xECnh ra kh\u1ECFi dung d\u1ECBch mu\u1ED1i` : `${metal.formula} \u0111\u1EE9ng sau ${el} trong d\xE3y ho\u1EA1t \u0111\u1ED9ng h\xF3a h\u1ECDc \u2014 kim lo\u1EA1i y\u1EBFu h\u01A1n kh\xF4ng \u0111\u1EA9y \u0111\u01B0\u1EE3c kim lo\u1EA1i m\u1EA1nh h\u01A1n ra kh\u1ECFi dung d\u1ECBch mu\u1ED1i`
          };
        }
        return null;
      }
    }
  }
  if (metals.length === 0 && species.length === 2 && ionic.length === 2) {
    if (species.some((s) => effectiveVariant(s) === "\u0111\u1EB7c")) return null;
    const [a, b] = ionic.map((s) => IONS[s.formula]);
    let driver = false;
    let itTan = false;
    for (const [cation, anion] of [
      [a.cation, b.anion],
      [b.cation, a.anion]
    ]) {
      if (cation === "H" && anion === "OH") {
        driver = true;
        continue;
      }
      if (cation === "H" && anion === "CO3") {
        driver = true;
        continue;
      }
      if (cation === "NH4" && anion === "OH") {
        driver = true;
        continue;
      }
      const sol = solubilityOf(cation, anion);
      if (sol === "khong_tan") driver = true;
      else if (sol === "it_tan") itTan = true;
    }
    if (driver) return null;
    if (itTan) return null;
    return {
      verdict: "no_reaction",
      reason: "ph\u1EA3n \u1EE9ng trao \u0111\u1ED5i kh\xF4ng x\u1EA3y ra: kh\xF4ng t\u1EA1o th\xE0nh k\u1EBFt t\u1EE7a, ch\u1EA5t kh\xED hay n\u01B0\u1EDBc"
    };
  }
  return null;
}
function explainNoReaction(species) {
  const c = classifyNoMatch(species, { heated: false });
  return c && c.verdict === "no_reaction" ? c.reason : null;
}

// api/_lib/kernel/chem/stoich.ts
var MOLAR_VOLUMES = {
  22.4: rat2(112n, 5n),
  24.79: rat2(2479n, 100n)
};
function parsePositive(x, label) {
  const v = parseDecimal(x);
  if (cmpR(v, R0) <= 0) throw new Error(`${label} ph\u1EA3i > 0 (nh\u1EADn \u0111\u01B0\u1EE3c ${ratToString(v)})`);
  return v;
}
function amountToMol(formula, amount, vm) {
  if ("excess" in amount) throw new Error(`amountToMol: ${formula} l\xE0 ch\u1EA5t d\u01B0 (excess) \u2014 kh\xF4ng c\xF3 mol h\u1EEFu h\u1EA1n`);
  if ("grams" in amount) return divR(parsePositive(amount.grams, `kh\u1ED1i l\u01B0\u1EE3ng ${formula}`), molarMass(formula));
  if ("mol" in amount) return parsePositive(amount.mol, `s\u1ED1 mol ${formula}`);
  if ("liters_gas" in amount) return divR(parsePositive(amount.liters_gas, `th\u1EC3 t\xEDch kh\xED ${formula}`), vm);
  if ("solution" in amount) {
    return mulR(
      parsePositive(amount.solution.molarity, `n\u1ED3ng \u0111\u1ED9 CM c\u1EE7a ${formula}`),
      parsePositive(amount.solution.liters, `th\u1EC3 t\xEDch dung d\u1ECBch ${formula}`)
    );
  }
  const mass = parsePositive(amount.solution_percent.massGrams, `kh\u1ED1i l\u01B0\u1EE3ng dung d\u1ECBch ${formula}`);
  const pct = parsePositive(amount.solution_percent.percent, `C% c\u1EE7a ${formula}`);
  const soluteMass = divR(mulR(mass, pct), rat2(100n));
  return divR(soluteMass, molarMass(formula));
}
function checkDomain(record, mols, excessSet) {
  const d = record.domain;
  if (!d) return null;
  const outOfScope = (detail) => `ngo\xE0i ph\u1EA1m vi v0: ${detail} \u2014 ${d.reason}`;
  for (const f of d.requireExcess ?? []) {
    if (!excessSet.has(f)) {
      return outOfScope(`record ${record.id} y\xEAu c\u1EA7u ${f} ph\u1EA3i D\u01AF (khai excess:true), nh\u01B0ng \u0111\u1EC1 cho ${f} h\u1EEFu h\u1EA1n ho\u1EB7c kh\xF4ng khai d\u01B0`);
    }
  }
  for (const f of d.mustBeLimiting ?? []) {
    if (excessSet.has(f)) {
      return outOfScope(`record ${record.id} y\xEAu c\u1EA7u ${f} ph\u1EA3i l\xE0 ch\u1EA5t H\u1EBET TR\u01AF\u1EDAC, nh\u01B0ng ${f} \u0111\u01B0\u1EE3c khai d\u01B0 (excess)`);
    }
    const nf = mols.get(f);
    const cf = record.reactants.find((x) => x.formula === f)?.coeff;
    if (!nf || !cf) continue;
    const ratioF = divR(nf, rat2(BigInt(cf)));
    for (const other of record.reactants) {
      if (other.formula === f || excessSet.has(other.formula)) continue;
      const no = mols.get(other.formula);
      if (!no) continue;
      const ratioO = divR(no, rat2(BigInt(other.coeff)));
      if (cmpR(ratioF, ratioO) > 0) {
        return outOfScope(
          `n(${f}) = ${ratToString(nf)} mol v\u01B0\u1EE3t t\u1EC9 l\u1EC7 cho ph\xE9p so v\u1EDBi n(${other.formula}) = ${ratToString(no)} mol (c\u1EA7n n(${f})/${cf} \u2264 n(${other.formula})/${other.coeff})`
        );
      }
    }
  }
  if (d.maxRatio) {
    const { of, per, ratio } = d.maxRatio;
    const nOf = mols.get(of);
    const nPer = mols.get(per);
    if (excessSet.has(of)) return outOfScope(`${of} \u0111\u01B0\u1EE3c khai d\u01B0 (excess) nh\u01B0ng mi\u1EC1n \xE1p d\u1EE5ng gi\u1EDBi h\u1EA1n n(${of}) \u2264 ${ratio}\xB7n(${per})`);
    if (nOf && nPer && cmpR(nOf, mulR(parseDecimal(ratio), nPer)) > 0) {
      return outOfScope(`n(${of}) = ${ratToString(nOf)} > ${ratio}\xB7n(${per})`);
    }
  }
  return null;
}
function react(record, mols, excessSet) {
  const domainError = checkDomain(record, mols, excessSet);
  if (domainError) {
    return { ok: false, ledger: [], violations: [], outOfScope: { message: domainError } };
  }
  let xi = null;
  for (const rr of record.reactants) {
    if (excessSet.has(rr.formula)) continue;
    const n = mols.get(rr.formula);
    if (n === void 0) {
      return {
        ok: false,
        ledger: [],
        violations: [],
        outOfScope: { message: `thi\u1EBFu l\u01B0\u1EE3ng ch\u1EA5t ${rr.formula} (kh\xF4ng khai amount c\u0169ng kh\xF4ng khai excess) \u2014 kh\xF4ng x\xE1c \u0111\u1ECBnh \u0111\u01B0\u1EE3c m\u1EE9c ph\u1EA3n \u1EE9ng` }
      };
    }
    const ratio = divR(n, rat2(BigInt(rr.coeff)));
    xi = xi === null ? ratio : minR(xi, ratio);
  }
  if (xi === null) {
    return {
      ok: false,
      ledger: [],
      violations: [],
      outOfScope: { message: "kh\xF4ng c\xF3 ch\u1EA5t h\u1EEFu h\u1EA1n: m\u1ECDi ch\u1EA5t tham gia \u0111\u1EC1u khai d\u01B0 (excess) \u2014 m\u1EE9c ph\u1EA3n \u1EE9ng \u03BE v\xF4 \u0111\u1ECBnh, kh\xF4ng t\xEDnh \u0111\u01B0\u1EE3c" }
    };
  }
  const ledger = [];
  const seen = /* @__PURE__ */ new Set();
  for (const rr of record.reactants) {
    const isExcess = excessSet.has(rr.formula);
    const consumed = mulR(rat2(BigInt(rr.coeff)), xi);
    const before = isExcess ? null : mols.get(rr.formula);
    ledger.push({
      formula: rr.formula,
      role: "reactant",
      coeff: rr.coeff,
      before,
      consumed,
      produced: R0,
      after: before === null ? null : subR(before, consumed),
      excess: isExcess
    });
    seen.add(rr.formula);
  }
  for (const pp of record.products) {
    const produced = mulR(rat2(BigInt(pp.coeff)), xi);
    const before = mols.get(pp.formula) ?? R0;
    ledger.push({
      formula: pp.formula,
      role: "product",
      coeff: pp.coeff,
      before,
      consumed: R0,
      produced,
      after: addR(before, produced),
      excess: false
    });
    seen.add(pp.formula);
  }
  for (const [f, n] of mols) {
    if (seen.has(f)) continue;
    ledger.push({ formula: f, role: "spectator", coeff: 0, before: n, consumed: R0, produced: R0, after: n, excess: false });
  }
  for (const f of excessSet) {
    if (seen.has(f)) continue;
    ledger.push({ formula: f, role: "spectator", coeff: 0, before: null, consumed: R0, produced: R0, after: null, excess: true });
  }
  const violations = [];
  let massIn = R0;
  let massOut = R0;
  for (const row of ledger) {
    if (!isZeroR(row.consumed)) massIn = addR(massIn, mulR(row.consumed, molarMass(row.formula)));
    if (!isZeroR(row.produced)) massOut = addR(massOut, mulR(row.produced, molarMass(row.formula)));
  }
  if (cmpR(massIn, massOut) !== 0) {
    violations.push({
      law: "b\u1EA3o to\xE0n kh\u1ED1i l\u01B0\u1EE3ng",
      detail: `\u03A3m(ti\xEAu th\u1EE5) = ${ratToString(massIn)} g \u2260 \u03A3m(t\u1EA1o th\xE0nh) = ${ratToString(massOut)} g`
    });
  }
  const elIn = /* @__PURE__ */ new Map();
  const elOut = /* @__PURE__ */ new Map();
  for (const row of ledger) {
    if (!isZeroR(row.consumed)) {
      for (const [el, cnt] of parseFormula(row.formula)) {
        elIn.set(el, addR(elIn.get(el) ?? R0, mulR(row.consumed, rat2(BigInt(cnt)))));
      }
    }
    if (!isZeroR(row.produced)) {
      for (const [el, cnt] of parseFormula(row.formula)) {
        elOut.set(el, addR(elOut.get(el) ?? R0, mulR(row.produced, rat2(BigInt(cnt)))));
      }
    }
  }
  for (const el of /* @__PURE__ */ new Set([...elIn.keys(), ...elOut.keys()])) {
    const a = elIn.get(el) ?? R0;
    const b = elOut.get(el) ?? R0;
    if (cmpR(a, b) !== 0) {
      violations.push({
        law: `b\u1EA3o to\xE0n nguy\xEAn t\u1ED1 ${el}`,
        detail: `mol ${el} ti\xEAu th\u1EE5 = ${ratToString(a)} \u2260 t\u1EA1o th\xE0nh = ${ratToString(b)}`
      });
    }
  }
  for (const row of ledger) {
    if (row.after !== null && cmpR(row.after, R0) < 0) {
      violations.push({
        law: "\xE2m l\u01B0\u1EE3ng ch\u1EA5t",
        detail: `${row.formula} c\xF3 after = ${ratToString(row.after)} < 0 (bug limiting)`
      });
    }
  }
  if (violations.length > 0) return { ok: false, ledger, violations };
  return { ok: true, ledger, violations: [], xi };
}

// api/_lib/kernel/chem/scene.ts
var COLORS5 = {
  // Dung dịch (không có trong bảng ⇒ "không màu")
  solution: {
    // ion Cu²⁺ — xanh lam (dd CuCl2 đặc thực tế ngả xanh lục do phức cloro, đề thi VN ghi "xanh")
    CuSO4: { colorName: "xanh lam", hex: "#2E86DE" },
    CuCl2: { colorName: "xanh lam", hex: "#2E86DE" },
    "Cu(NO3)2": { colorName: "xanh lam", hex: "#2E86DE" },
    // ion Fe³⁺ — vàng nâu
    FeCl3: { colorName: "v\xE0ng n\xE2u", hex: "#B7791F" },
    "Fe2(SO4)3": { colorName: "v\xE0ng n\xE2u", hex: "#B7791F" },
    "Fe(NO3)3": { colorName: "v\xE0ng n\xE2u", hex: "#B7791F" },
    // ion Fe²⁺ — lục rất nhạt (gần như không màu); thêm Fe(NO3)2 (sản phẩm R23) — cùng ion
    FeCl2: { colorName: "l\u1EE5c r\u1EA5t nh\u1EA1t (g\u1EA7n nh\u01B0 kh\xF4ng m\xE0u)", hex: "#C8E6C9" },
    FeSO4: { colorName: "l\u1EE5c r\u1EA5t nh\u1EA1t (g\u1EA7n nh\u01B0 kh\xF4ng m\xE0u)", hex: "#C8E6C9" },
    "Fe(NO3)2": { colorName: "l\u1EE5c r\u1EA5t nh\u1EA1t (g\u1EA7n nh\u01B0 kh\xF4ng m\xE0u)", hex: "#C8E6C9" },
    KMnO4: { colorName: "t\xEDm", hex: "#6F42C1" }
  },
  // Chất rắn / kết tủa
  solid: {
    Cu: { colorName: "\u0111\u1ECF (\xE1nh kim)", hex: "#B87333" },
    CuO: { colorName: "\u0111en", hex: "#1B1B1B" },
    "Cu(OH)2": { colorName: "xanh lam", hex: "#3498DB" },
    Fe: { colorName: "tr\u1EAFng x\xE1m", hex: "#7F8C8D" },
    Ag: { colorName: "tr\u1EAFng x\xE1m (\xE1nh kim)", hex: "#C0C0C0" },
    AgCl: { colorName: "tr\u1EAFng (h\xF3a \u0111en ngo\xE0i s\xE1ng)", hex: "#F5F5F5" },
    BaSO4: { colorName: "tr\u1EAFng", hex: "#FAFAFA" },
    CaCO3: { colorName: "tr\u1EAFng", hex: "#FAFAFA" },
    BaCO3: { colorName: "tr\u1EAFng", hex: "#FAFAFA" },
    "Mg(OH)2": { colorName: "tr\u1EAFng", hex: "#FAFAFA" },
    "Zn(OH)2": { colorName: "tr\u1EAFng", hex: "#FAFAFA" },
    Na: { colorName: "tr\u1EAFng b\u1EA1c", hex: "#DCDCDC" },
    K: { colorName: "tr\u1EAFng b\u1EA1c", hex: "#DCDCDC" },
    Mg: { colorName: "tr\u1EAFng b\u1EA1c", hex: "#DCDCDC" },
    Al: { colorName: "tr\u1EAFng b\u1EA1c", hex: "#D9D9D9" },
    Zn: { colorName: "x\xE1m b\u1EA1c", hex: "#A9A9A9" },
    Ca: { colorName: "tr\u1EAFng b\u1EA1c", hex: "#DCDCDC" },
    Ba: { colorName: "tr\u1EAFng b\u1EA1c", hex: "#DCDCDC" },
    KMnO4: { colorName: "t\xEDm \u0111en", hex: "#3D1E52" },
    "Fe(OH)3": { colorName: "n\xE2u \u0111\u1ECF", hex: "#8B4513" },
    "Fe(OH)2": { colorName: "tr\u1EAFng xanh", hex: "#D5E8D4" },
    Fe2O3: { colorName: "\u0111\u1ECF n\xE2u", hex: "#A0522D" },
    Fe3O4: { colorName: "n\xE2u \u0111en", hex: "#2C2C2C" },
    FeS: { colorName: "x\xE1m \u0111en", hex: "#3B3B3B" },
    S: { colorName: "v\xE0ng", hex: "#F1C40F" },
    MgO: { colorName: "tr\u1EAFng", hex: "#FDFDFD" },
    CaO: { colorName: "tr\u1EAFng", hex: "#FDFDFD" },
    Al2O3: { colorName: "tr\u1EAFng", hex: "#FDFDFD" },
    ZnO: { colorName: "tr\u1EAFng", hex: "#FDFDFD" },
    "Al(OH)3": { colorName: "keo tr\u1EAFng", hex: "#F2F2F2" },
    // F16: chất rắn DB sinh ra còn thiếu trong bảng spec
    CuCl2: { colorName: "v\xE0ng n\xE2u", hex: "#C08A2D" },
    // khói/rắn khan CuCl2 (R06)
    FeCl3: { colorName: "n\xE2u \u0111\u1ECF", hex: "#8B3A1E" },
    // khói/rắn khan FeCl3 (R05)
    "Ca(OH)2": { colorName: "tr\u1EAFng", hex: "#FAFAFA" },
    // tôi vôi (R24)
    Na2CO3: { colorName: "tr\u1EAFng", hex: "#FAFAFA" },
    // nhiệt phân NaHCO3 (R47)
    K2MnO4: { colorName: "l\u1EE5c", hex: "#2E7D32" },
    // nhiệt phân KMnO4 (R44)
    MnO2: { colorName: "\u0111en", hex: "#2B2B2B" },
    // nhiệt phân KMnO4 (R44)
    NaHCO3: { colorName: "tr\u1EAFng", hex: "#FAFAFA" }
  },
  // Chất khí (màu/dấu hiệu)
  gas: {
    H2: { colorName: "kh\xF4ng m\xE0u", hex: "#F8F9FA" },
    O2: { colorName: "kh\xF4ng m\xE0u", hex: "#F8F9FA" },
    N2: { colorName: "kh\xF4ng m\xE0u", hex: "#F8F9FA" },
    CO: { colorName: "kh\xF4ng m\xE0u (\u0111\u1ED9c)", hex: "#F8F9FA" },
    CO2: { colorName: "kh\xF4ng m\xE0u (l\xE0m \u0111\u1EE5c n\u01B0\u1EDBc v\xF4i trong)", hex: "#F8F9FA" },
    Cl2: { colorName: "v\xE0ng l\u1EE5c (m\xF9i h\u1EAFc, \u0111\u1ED9c)", hex: "#BFCE3A" },
    SO2: { colorName: "kh\xF4ng m\xE0u (m\xF9i h\u1EAFc)", hex: "#F8F9FA" },
    SO3: { colorName: "kh\xF4ng m\xE0u", hex: "#F8F9FA" },
    NO: { colorName: "kh\xF4ng m\xE0u (h\xF3a n\xE2u trong kh\xF4ng kh\xED)", hex: "#F8F9FA" },
    NO2: { colorName: "n\xE2u \u0111\u1ECF", hex: "#8B3A1E" },
    NH3: { colorName: "kh\xF4ng m\xE0u (m\xF9i khai, l\xE0m xanh qu\u1EF3 t\xEDm \u1EA9m)", hex: "#F8F9FA" },
    H2O: { colorName: "kh\xF4ng m\xE0u (h\u01A1i n\u01B0\u1EDBc)", hex: "#F8F9FA" }
  },
  defaults: {
    solution: { colorName: "kh\xF4ng m\xE0u", hex: "#EAF4FB" },
    solid: { colorName: "x\xE1m nh\u1EA1t", hex: "#D3D3D3" },
    // F16: default có chủ đích
    gas: { colorName: "kh\xF4ng m\xE0u", hex: "#F8F9FA" },
    liquid: { colorName: "kh\xF4ng m\xE0u", hex: "#EAF4FB" }
  }
};
function colorOf(formula, state) {
  if (state === "solution") return COLORS5.solution[formula] ?? COLORS5.defaults.solution;
  if (state === "solid") return COLORS5.solid[formula] ?? COLORS5.defaults.solid;
  if (state === "gas") return COLORS5.gas[formula] ?? COLORS5.defaults.gas;
  return COLORS5.defaults.liquid;
}
var EMPTY_SCENE = { vessels: [], events: [], captions: [] };
function buildScene2(input) {
  const { species, record, ledger, heated, noReactionReason } = input;
  const vessels = [];
  const events = [];
  const captions = [];
  let t = 0;
  const solutionSpecies = species.filter((s) => s.state === "solution");
  for (const s of solutionSpecies) {
    const c = colorOf(s.formula, "solution");
    vessels.push({
      id: `v${vessels.length + 1}`,
      kind: "beaker",
      contents: [{ formula: s.formula, state: "solution", color: c.hex, colorName: c.colorName, amountText: s.amountText }]
    });
  }
  if (vessels.length === 0) {
    vessels.push({ id: "v1", kind: "test_tube", contents: [] });
  }
  const mixId = vessels[0].id;
  for (let i = 1; i < solutionSpecies.length; i++) {
    events.push({ t: t++, kind: "pour", from: vessels[i].id, into: mixId, formula: solutionSpecies[i].formula });
  }
  for (const s of species) {
    if (s.state === "solid") {
      const c = colorOf(s.formula, "solid");
      vessels[0].contents.push({ formula: s.formula, state: "solid", color: c.hex, colorName: c.colorName, amountText: s.amountText });
      events.push({ t: t++, kind: "add_solid", into: mixId, formula: s.formula });
    } else if (s.state === "gas") {
      const c = colorOf(s.formula, "gas");
      vessels[0].contents.push({ formula: s.formula, state: "gas", color: c.hex, colorName: c.colorName, amountText: s.amountText });
      events.push({ t: t++, kind: "gas_bubbles", vessel: mixId, formula: s.formula, text: `d\u1EABn kh\xED ${s.formula} v\xE0o` });
    }
  }
  if (heated) events.push({ t: t++, kind: "heat", vessel: mixId });
  if (!record || !ledger) {
    if (noReactionReason) captions.push({ t, text: `kh\xF4ng c\xF3 ph\u1EA3n \u1EE9ng x\u1EA3y ra: ${noReactionReason}` });
    return { vessels, events, captions };
  }
  const reactionT = t;
  const stateOfSpecies = new Map(species.map((s) => [s.formula, s.state]));
  if (record.medium === "dd") {
    for (const row of ledger) {
      if (row.role !== "reactant" || isZeroR(row.consumed)) continue;
      if (stateOfSpecies.get(row.formula) !== "solid") continue;
      const gone = row.after !== null && cmpR(row.after, R0) === 0;
      events.push({
        t: t++,
        kind: "dissolve",
        vessel: mixId,
        formula: row.formula,
        text: gone ? `${row.formula} tan h\u1EBFt` : `${row.formula} tan m\u1ED9t ph\u1EA7n (c\xF2n d\u01B0)`
      });
    }
  }
  for (const row of ledger) {
    if (row.role !== "reactant" || isZeroR(row.consumed)) continue;
    if (stateOfSpecies.get(row.formula) !== "solution") continue;
    const c = COLORS5.solution[row.formula];
    if (!c) continue;
    const emptied = row.after !== null && cmpR(row.after, R0) === 0;
    events.push({
      t: t++,
      kind: "color_change",
      vessel: mixId,
      fromColor: c.hex,
      toColor: COLORS5.defaults.solution.hex,
      text: emptied ? `m\xE0u ${c.colorName} c\u1EE7a dung d\u1ECBch ${row.formula} nh\u1EA1t d\u1EA7n r\u1ED3i m\u1EA5t m\xE0u ho\xE0n to\xE0n (${row.formula} h\u1EBFt)` : `m\xE0u ${c.colorName} c\u1EE7a dung d\u1ECBch ${row.formula} nh\u1EA1t d\u1EA7n`
    });
  }
  for (const prod of record.products) {
    if (prod.state === "solid" && record.medium === "dd") {
      const c = colorOf(prod.formula, "solid");
      events.push({
        t: t++,
        kind: "precipitate",
        vessel: mixId,
        formula: prod.formula,
        color: c.hex,
        text: `xu\u1EA5t hi\u1EC7n k\u1EBFt t\u1EE7a ${c.colorName} (${prod.formula})`
      });
    } else if (prod.state === "gas") {
      const c = colorOf(prod.formula, "gas");
      events.push({
        t: t++,
        kind: "gas_bubbles",
        vessel: mixId,
        formula: prod.formula,
        text: `tho\xE1t kh\xED ${prod.formula} ${c.colorName}`
      });
    }
  }
  for (const ph of record.phenomena) captions.push({ t: reactionT, text: ph });
  return { vessels, events, captions };
}

// api/_lib/kernel/chem/runChem.ts
var GAS_SET = /* @__PURE__ */ new Set(["H2", "O2", "N2", "Cl2", "CO", "CO2", "SO2", "SO3", "NO", "NO2", "NH3"]);
var ACID_SOLUTIONS = /* @__PURE__ */ new Set(["HCl", "H2SO4", "HNO3"]);
var SOLID_NONMETALS = /* @__PURE__ */ new Set(["S", "C", "P", "Si"]);
function inferFixedState(op) {
  if (op.state) return op.state;
  const amount = op.amount;
  if (amount && ("solution" in amount || "solution_percent" in amount)) return "solution";
  if (amount && "liters_gas" in amount) return "gas";
  const f = op.formula;
  if (GAS_SET.has(f)) return "gas";
  if (f === "H2O") return "liquid";
  if (ACID_SOLUTIONS.has(f)) return "solution";
  if (METALS.has(f)) return "solid";
  if (SOLID_NONMETALS.has(f)) return "solid";
  try {
    const counts = parseFormula(f);
    if (counts.size === 2 && counts.has("O")) return "solid";
  } catch {
    return null;
  }
  const io = IONS[f];
  if (io && solubilityOf(io.cation, io.anion) === "khong_tan") return "solid";
  return null;
}
function fmtVN(x, maxDp = 4) {
  const factor = 10 ** maxDp;
  const rounded = Math.round(x * factor) / factor;
  let s = rounded.toString();
  if (/e/i.test(s)) s = rounded.toFixed(maxDp);
  return s.replace(".", ",");
}
function equationOf(record) {
  const c = (n) => n > 1 ? String(n) : "";
  const lhs = record.reactants.map((x) => `${c(x.coeff)}${x.formula}`).join(" + ");
  const rhs2 = record.products.map((x) => {
    const mark = x.state === "gas" ? "\u2191" : x.state === "solid" && record.medium === "dd" ? "\u2193" : "";
    return `${c(x.coeff)}${x.formula}${mark}`;
  }).join(" + ");
  return `${lhs} \u2192 ${rhs2}`;
}
function zodMessages(err) {
  const out = [];
  const walk = (issues) => {
    for (const issue of issues) {
      if (issue.code === external_exports.ZodIssueCode.invalid_union) {
        for (const ue of issue.unionErrors) walk(ue.issues);
      } else {
        out.push(`${issue.path.join(".")}${issue.path.length ? ": " : ""}${issue.message}`);
      }
    }
  };
  walk(err.issues);
  const custom2 = out.filter((m) => !/^.*(Invalid|Required|Expected)/.test(m));
  return custom2.length > 0 ? custom2 : out;
}
function runChem(input) {
  const trace = [];
  const errors = [];
  const violations = [];
  const bail = (msg, scene2 = EMPTY_SCENE) => {
    errors.push({ message: msg });
    return { ok: false, reactions: [], ledger: [], answers: [], scene: scene2, violations, errors, trace };
  };
  const parsed = ChemPlanSchema.safeParse(input);
  if (!parsed.success) {
    return bail(`ChemPlan kh\xF4ng h\u1EE3p l\u1EC7: ${zodMessages(parsed.error).join("; ")}`);
  }
  const plan = parsed.data;
  const vm = MOLAR_VOLUMES[plan.molarVolume];
  const vmLabel = plan.molarVolume === 22.4 ? "\u0111ktc, 22,4 L/mol" : "\u0111kc, 24,79 L/mol";
  const speciesOps = plan.ops.filter((o) => o.op === "species");
  const mixOps = plan.ops.filter((o) => o.op === "mix");
  if (mixOps.length > 1) return bail("v0 ch\u1EC9 h\u1ED7 tr\u1EE3 \u0111\xFAng M\u1ED8T op mix \u2014 tr\u1ED9n tu\u1EA7n t\u1EF1 nhi\u1EC1u mix l\xE0 t\xEDnh n\u0103ng v1");
  const mixOp = mixOps[0];
  if (mixOp?.of) return bail("mix.of (tr\u1ED9n theo danh s\xE1ch/tu\u1EA7n t\u1EF1) l\xE0 t\xEDnh n\u0103ng v1 \u2014 v0 lu\xF4n tr\u1ED9n t\u1EA5t c\u1EA3 species");
  const heated = mixOp?.heated ?? false;
  if (speciesOps.length === 0) return bail("plan kh\xF4ng khai ch\u1EA5t n\xE0o (op species)");
  const infos = [];
  const seenFormulas = /* @__PURE__ */ new Set();
  for (const op of speciesOps) {
    try {
      parseFormula(op.formula);
    } catch (e) {
      return bail(e instanceof Error ? e.message : String(e));
    }
    if (seenFormulas.has(op.formula)) return bail(`ch\u1EA5t "${op.formula}" khai tr\xF9ng \u2014 v0 m\u1ED7i ch\u1EA5t m\u1ED9t d\xF2ng species`);
    seenFormulas.add(op.formula);
    if (mixOp && isHydrate(op.formula)) {
      return bail(`hydrat "${op.formula}" ch\u01B0a h\u1ED7 tr\u1EE3 ph\u1EA3n \u1EE9ng \u1EDF v0 (ch\u1EC9 t\xEDnh M/\u0111\u1ED5i \u0111\u01A1n v\u1ECB khi kh\xF4ng mix)`);
    }
    const amount = op.amount;
    const excess = !!amount && "excess" in amount;
    const qualitative = !amount;
    let mol = null;
    let pouredMassG = null;
    let pouredMassUnknownWhy;
    let solutionVolumeL = null;
    let amountText;
    if (amount && !excess) {
      try {
        mol = amountToMol(op.formula, amount, vm);
        if ("grams" in amount) {
          pouredMassG = parsePositive(amount.grams, "kh\u1ED1i l\u01B0\u1EE3ng");
          amountText = `${fmtVN(ratApprox(pouredMassG))} g`;
        } else if ("mol" in amount) {
          pouredMassG = mulR(mol, molarMass(op.formula));
          amountText = `${fmtVN(ratApprox(mol))} mol`;
        } else if ("liters_gas" in amount) {
          if (!GAS_SET.has(op.formula)) {
            return bail(`"${op.formula}" khai liters_gas nh\u01B0ng kh\xF4ng thu\u1ED9c danh s\xE1ch kh\xED \u0111\xF3ng \u2014 ki\u1EC3m tra l\u1EA1i \u0111\u1EC1/plan`);
          }
          pouredMassG = mulR(mol, molarMass(op.formula));
          amountText = `${fmtVN(ratApprox(parsePositive(amount.liters_gas, "V")))} L kh\xED`;
        } else if ("solution" in amount) {
          solutionVolumeL = parsePositive(amount.solution.liters, "th\u1EC3 t\xEDch dung d\u1ECBch");
          pouredMassUnknownWhy = `dung d\u1ECBch ${op.formula} khai theo CM\xD7V \u2014 kh\xF4ng r\xF5 kh\u1ED1i l\u01B0\u1EE3ng dung d\u1ECBch`;
          amountText = `${fmtVN(ratApprox(solutionVolumeL))} L dd`;
        } else if ("solution_percent" in amount) {
          pouredMassG = parsePositive(amount.solution_percent.massGrams, "kh\u1ED1i l\u01B0\u1EE3ng dung d\u1ECBch");
          amountText = `${fmtVN(ratApprox(pouredMassG))} g dd`;
        }
      } catch (e) {
        return bail(e instanceof Error ? e.message : String(e));
      }
    }
    if (excess) amountText = "d\u01B0";
    infos.push({
      formula: op.formula,
      variant: op.variant,
      state: "solid",
      // tạm — gán thật ở bước suy state dưới
      excess,
      qualitative,
      mol,
      pouredMassG,
      pouredMassUnknownWhy,
      solutionVolumeL,
      amountText
    });
  }
  const fixedStates = speciesOps.map((op) => inferFixedState(op));
  const mixHasSolutionOrLiquid = fixedStates.some((s) => s === "solution" || s === "liquid");
  for (let i = 0; i < infos.length; i++) {
    const st = fixedStates[i];
    if (st) {
      infos[i].state = st;
      continue;
    }
    const io = IONS[infos[i].formula];
    if (infos[i].excess && io && solubilityOf(io.cation, io.anion) === "tan") {
      infos[i].state = "solution";
      trace.push(`state(${infos[i].formula}) = solution (mu\u1ED1i tan khai excess, lu\u1EADt F20)`);
      continue;
    }
    if (mixHasSolutionOrLiquid) {
      return bail(
        `tr\u1EA1ng th\xE1i (state) c\u1EE7a "${infos[i].formula}" M\u01A0 H\u1ED2: mu\u1ED1i tan c\xF3 th\u1EC3 l\xE0 ch\u1EA5t r\u1EAFn khan ho\u1EB7c dung d\u1ECBch \u2014 LLM ph\u1EA3i khai state t\u01B0\u1EDDng minh cho species n\xE0y (lu\u1EADt F20)`
      );
    }
    infos[i].state = "solid";
    trace.push(`state(${infos[i].formula}) = solid (mix kh\xF4, suy theo lu\u1EADt F20)`);
  }
  const sceneSpecies = infos.map((s) => ({
    formula: s.formula,
    state: s.state,
    excess: s.excess,
    amountText: s.amountText
  }));
  const staticScene = () => buildScene2({ species: sceneSpecies, record: null, ledger: null, heated, noReactionReason: void 0 });
  const mols = /* @__PURE__ */ new Map();
  for (const s of infos) if (s.mol) mols.set(s.formula, s.mol);
  const excessSet = new Set(infos.filter((s) => s.excess).map((s) => s.formula));
  const qualitativeMode = infos.some((s) => s.qualitative);
  if (!mixOp) {
    const ledgerRows = infos.map((s) => ({
      formula: s.formula,
      role: "reactant",
      coeff: 0,
      before: s.excess ? null : s.mol,
      consumed: R0,
      produced: R0,
      after: s.excess ? null : s.mol,
      excess: s.excess,
      state: s.state
    }));
    const answers2 = answerQueries(plan.queries, {
      rows: ledgerRows,
      infos,
      record: null,
      noReason: null,
      vm,
      vmLabel,
      errors,
      trace,
      qualitativeMode
    });
    return {
      ok: errors.length === 0,
      reactions: [],
      ledger: serializeLedger(ledgerRows),
      answers: answers2,
      scene: staticScene(),
      violations,
      errors,
      trace
    };
  }
  const speciesKeys = infos.map((s) => ({ formula: s.formula, variant: s.variant, state: s.state }));
  const { matches, heatMisses } = findMatches(speciesKeys, { heated });
  trace.push(`findReactions: ${matches.map((m) => m.id).join(", ") || "(kh\xF4ng kh\u1EDBp)"}${heatMisses.length ? `; thi\u1EBFu t\xB0: ${heatMisses.map((m) => m.id).join(", ")}` : ""}`);
  if (matches.length === 0) {
    if (heatMisses.length > 0) {
      const soft = heatMisses.some((m) => m.id === "R38");
      const ids = heatMisses.map((m) => `${m.id} (${equationOf(m)})`).join("; ");
      return bail(
        soft ? `ph\u1EA3n \u1EE9ng c\u1EA7n \u0111un n\xF3ng nh\u1EB9: ${ids} \u2014 mix.heated \u0111ang l\xE0 false; KH\xD4NG k\u1EBFt lu\u1EADn "kh\xF4ng ph\u1EA3n \u1EE9ng" v\xE0 tuy\u1EC7t \u0111\u1ED1i kh\xF4ng c\xF3 "k\u1EBFt t\u1EE7a NH4OH"` : `ph\u1EA3n \u1EE9ng c\u1EA7n \u0111un n\xF3ng (t\xB0): ${ids} \u2014 mix.heated \u0111ang l\xE0 false`,
        staticScene()
      );
    }
    const verdictInfo = classifyNoMatch(speciesKeys, { heated });
    if (verdictInfo?.verdict === "no_reaction") {
      const rows2 = infos.map((s) => ({
        formula: s.formula,
        role: "reactant",
        coeff: 0,
        before: s.excess ? null : s.mol,
        consumed: R0,
        produced: R0,
        after: s.excess ? null : s.mol,
        excess: s.excess,
        state: s.state
      }));
      const answers2 = answerQueries(plan.queries, {
        rows: rows2,
        infos,
        record: null,
        noReason: verdictInfo.reason,
        vm,
        vmLabel,
        errors,
        trace,
        qualitativeMode
      });
      const scene2 = buildScene2({ species: sceneSpecies, record: null, ledger: null, heated, noReactionReason: verdictInfo.reason });
      return {
        ok: errors.length === 0,
        reactions: [],
        noReaction: { reason: verdictInfo.reason },
        ledger: serializeLedger(rows2),
        answers: answers2,
        scene: scene2,
        violations,
        errors,
        trace
      };
    }
    if (verdictInfo?.verdict === "out_of_scope") return bail(verdictInfo.reason, staticScene());
    const names = infos.map((s) => s.formula).join(" + ");
    return bail(`kh\xF4ng c\xF3 record n\xE0o trong DB kh\u1EDBp {${names}} v\xE0 guard kh\xF4ng gi\u1EA3i th\xEDch \u0111\u01B0\u1EE3c \u2014 ngo\xE0i ph\u1EA1m vi DB v0`, staticScene());
  }
  if (matches.length >= 2) {
    return bail(`\u0111a ph\u1EA3n \u1EE9ng: t\u1EADp ch\u1EA5t kh\u1EDBp \u0111\u1ED3ng th\u1EDDi ${matches.map((m) => m.id).join(", ")} \u2014 ngo\xE0i ph\u1EA1m vi v0, engine kh\xF4ng t\u1EF1 ch\u1ECDn`, staticScene());
  }
  const record = matches[0];
  trace.push(`record ${record.id}: ${equationOf(record)}`);
  const spectatorError = checkSpectatorsInert(record, speciesKeys, heated);
  if (spectatorError) return bail(spectatorError, staticScene());
  if (qualitativeMode) {
    const domainError = checkQualitativeDomain(record, excessSet);
    if (domainError) return bail(domainError, staticScene());
    const rows2 = infos.map((s) => ({
      formula: s.formula,
      role: "reactant",
      coeff: 0,
      before: s.excess ? null : s.mol,
      consumed: R0,
      produced: R0,
      after: s.excess ? null : s.mol,
      excess: s.excess,
      state: s.state
    }));
    const answers2 = answerQueries(plan.queries, {
      rows: rows2,
      infos,
      record,
      noReason: null,
      vm,
      vmLabel,
      errors,
      trace,
      qualitativeMode: true
    });
    const scene2 = buildScene2({
      species: sceneSpecies,
      record,
      ledger: qualitativeLedger(record, infos),
      heated
    });
    return {
      ok: errors.length === 0,
      reactions: [{ id: record.id, equation: equationOf(record), coefficients: [...record.reactants.map((x) => x.coeff), ...record.products.map((x) => x.coeff)] }],
      ledger: serializeLedger(rows2),
      answers: answers2,
      scene: scene2,
      violations,
      errors,
      trace
    };
  }
  const outcome = react(record, mols, excessSet);
  if (!outcome.ok) {
    if (outcome.outOfScope) return bail(outcome.outOfScope.message, staticScene());
    violations.push(...outcome.violations);
    errors.push({ message: "t\u1EF1 ki\u1EC3m b\u1EA3o to\xE0n th\u1EA5t b\u1EA1i \u2014 kh\xF4ng tr\u1EA3 \u0111\xE1p s\u1ED1 (xem violations)" });
    return { ok: false, reactions: [], ledger: [], answers: [], scene: staticScene(), violations, errors, trace };
  }
  trace.push(`\u03BE = ${ratToString(outcome.xi)} mol`);
  const stateBySpecies = new Map(infos.map((s) => [s.formula, s.state]));
  const stateByProduct = new Map(record.products.map((pp) => [pp.formula, pp.state]));
  const rows = outcome.ledger.map((row) => ({
    ...row,
    state: row.role === "product" ? stateByProduct.get(row.formula) : stateBySpecies.get(row.formula) ?? "solid"
  }));
  for (const as of plan.asserts) {
    const isMass = as.kind === "given_mass";
    const row = rows.find((rr) => rr.formula === as.of);
    if (!row) {
      errors.push({ message: `assert ${as.kind}: ch\u1EA5t "${as.of}" kh\xF4ng c\xF3 trong s\u1ED5 c\xE1i ph\u1EA3n \u1EE9ng` });
      continue;
    }
    if (row.after === null) {
      errors.push({ message: `assert ${as.kind}: "${as.of}" \u0111\u01B0\u1EE3c khai d\u01B0 (excess) \u2014 l\u01B0\u1EE3ng v\xF4 h\u1EA1n, kh\xF4ng \u0111\u1ED1i chi\u1EBFu \u0111\u01B0\u1EE3c` });
      continue;
    }
    let given;
    try {
      given = parsePositive(isMass ? as.grams : as.mol, `gi\xE1 tr\u1ECB assert ${as.of}`);
    } catch (e) {
      errors.push({ message: e instanceof Error ? e.message : String(e) });
      continue;
    }
    const computed = isMass ? mulR(row.after, molarMass(as.of)) : row.after;
    const tolR = parseDecimal(as.tol ?? 1e-3);
    const diff = absR(subR(computed, given));
    const limit = mulR(tolR, absR(given));
    if (cmpR(diff, limit) > 0) {
      violations.push({
        law: `${as.kind} ${as.of}`,
        detail: `\u0111\u1EC1 cho ${isMass ? "m" : "n"}(${as.of}) = ${ratToString(given)}${isMass ? " g" : " mol"} nh\u01B0ng engine t\xEDnh \u0111\u01B0\u1EE3c ${ratToString(computed)}${isMass ? " g" : " mol"} (l\u1EC7ch qu\xE1 tol t\u01B0\u01A1ng \u0111\u1ED1i ${as.tol ?? 1e-3}) \u2014 m\xF4 h\xECnh h\xF3a sai \u0111\xE2u \u0111\xF3, kh\xF4ng tr\u1EA3 \u0111\xE1p s\u1ED1`
      });
    } else {
      trace.push(`assert ${as.kind}(${as.of}) kh\u1EDBp: ${ratToString(computed)} \u2248 ${ratToString(given)} (tol ${as.tol ?? 1e-3})`);
    }
  }
  if (violations.length > 0) {
    return {
      ok: false,
      reactions: [{ id: record.id, equation: equationOf(record), coefficients: [...record.reactants.map((x) => x.coeff), ...record.products.map((x) => x.coeff)] }],
      ledger: serializeLedger(rows),
      answers: [],
      // không trả đáp số khi mô hình lệch dữ kiện đề (bài 11)
      scene: staticScene(),
      violations,
      errors,
      trace
    };
  }
  const answers = answerQueries(plan.queries, {
    rows,
    infos,
    record,
    noReason: null,
    vm,
    vmLabel,
    errors,
    trace,
    qualitativeMode: false
  });
  const scene = buildScene2({ species: sceneSpecies, record, ledger: outcome.ledger, heated });
  return {
    ok: errors.length === 0,
    reactions: [{ id: record.id, equation: equationOf(record), coefficients: [...record.reactants.map((x) => x.coeff), ...record.products.map((x) => x.coeff)] }],
    ledger: serializeLedger(rows),
    answers,
    scene,
    violations,
    errors,
    trace
  };
}
function checkSpectatorsInert(record, species, heated) {
  const inRecord = new Set(record.reactants.map((rr) => rr.formula));
  const spectators = species.filter((s) => !inRecord.has(s.formula));
  for (const sp of spectators) {
    for (const other of species) {
      if (other.formula === sp.formula) continue;
      if (METALS.has(sp.formula) && METALS.has(other.formula)) continue;
      const pair2 = [sp, other];
      const { matches } = findMatches(pair2, { heated });
      if (matches.length > 0) {
        return `\u0111a ph\u1EA3n \u1EE9ng: ngo\xE0i ph\u1EA3n \u1EE9ng ch\xEDnh (${record.id}), "${sp.formula}" c\xF2n ph\u1EA3n \u1EE9ng v\u1EDBi "${other.formula}" (${matches.map((m) => m.id).join(", ")}) \u2014 ngo\xE0i ph\u1EA1m vi v0, engine kh\xF4ng t\u1EF1 ch\u1ECDn ph\u1EA3n \u1EE9ng`;
      }
      const verdict = classifyNoMatch(pair2, { heated });
      if (verdict?.verdict === "no_reaction") continue;
      return `ngo\xE0i ph\u1EA1m vi v0: "${sp.formula}" c\xF3 th\u1EC3 ph\u1EA3n \u1EE9ng v\u1EDBi "${other.formula}" (ch\u01B0a m\xF4 h\xECnh h\xF3a trong DB v0) \u2014 kh\xF4ng th\u1EC3 coi "${sp.formula}" l\xE0 ch\u1EA5t tr\u01A1 \u0111\u1EC3 b\u1ECF qua`;
    }
  }
  return null;
}
function checkQualitativeDomain(record, excessSet) {
  const d = record.domain;
  if (!d) return null;
  for (const f of d.requireExcess ?? []) {
    if (!excessSet.has(f)) {
      return `ngo\xE0i ph\u1EA1m vi v0: record ${record.id} y\xEAu c\u1EA7u ${f} ph\u1EA3i D\u01AF (khai excess:true) \u2014 ${d.reason}`;
    }
  }
  for (const f of d.mustBeLimiting ?? []) {
    if (excessSet.has(f)) {
      return `ngo\xE0i ph\u1EA1m vi v0: record ${record.id} y\xEAu c\u1EA7u ${f} l\xE0 ch\u1EA5t h\u1EBFt tr\u01B0\u1EDBc, nh\u01B0ng ${f} khai d\u01B0 \u2014 ${d.reason}`;
    }
  }
  return null;
}
function qualitativeLedger(record, infos) {
  const one = rat2(1n);
  const rows = [];
  for (const rr of record.reactants) {
    rows.push({ formula: rr.formula, role: "reactant", coeff: rr.coeff, before: one, consumed: one, produced: R0, after: R0, excess: false });
  }
  for (const pp of record.products) {
    rows.push({ formula: pp.formula, role: "product", coeff: pp.coeff, before: R0, consumed: R0, produced: one, after: one, excess: false });
  }
  return rows;
}
function serializeLedger(rows) {
  return rows.map((row) => ({
    formula: row.formula,
    state: row.state,
    before: row.before === null ? null : ratToString(row.before),
    consumed: ratToString(row.consumed),
    produced: ratToString(row.produced),
    after: row.after === null ? null : ratToString(row.after),
    excess: row.excess
  }));
}
function answerQueries(queries, ctx) {
  const answers = [];
  for (const q of queries) {
    const ans = answerOne(q, ctx);
    if (ans) {
      answers.push(ans);
      if (ans.exact && ans.exact.replace("-", "").split("/").some((part) => part.length > 15)) {
        ctx.trace.push(`c\u1EA3nh b\xE1o: ph\xE2n s\u1ED1 d\xE0i b\u1EA5t th\u01B0\u1EDDng trong \u0111\xE1p (${ans.exact}) \u2014 ki\u1EC3m tra d\u1EEF ki\u1EC7n \u0111\u1EC1`);
      }
    }
  }
  return answers;
}
function answerOne(q, ctx) {
  const { rows, infos, record, noReason, vm, vmLabel, errors } = ctx;
  const err = (m) => {
    errors.push({ message: m });
    return null;
  };
  if (q.kind === "phenomena") {
    if (record) {
      return { query: q, exact: null, approx: null, unit: "", text: record.phenomena.join("; ") };
    }
    if (noReason) {
      return { query: q, exact: null, approx: null, unit: "", text: `kh\xF4ng c\xF3 ph\u1EA3n \u1EE9ng x\u1EA3y ra: ${noReason}` };
    }
    return err("query phenomena c\u1EA7n op mix (v0 kh\xF4ng suy hi\u1EC7n t\u01B0\u1EE3ng khi ch\u01B0a tr\u1ED9n)");
  }
  if (q.kind === "equation") {
    if (record) {
      const eq = `${record.reactants.map((x) => (x.coeff > 1 ? x.coeff : "") + x.formula).join(" + ")} \u2192 ${record.products.map((x) => {
        const mark = x.state === "gas" ? "\u2191" : x.state === "solid" && record.medium === "dd" ? "\u2193" : "";
        return (x.coeff > 1 ? x.coeff : "") + x.formula + mark;
      }).join(" + ")}`;
      return { query: q, exact: null, approx: null, unit: "", text: eq };
    }
    if (noReason) return { query: q, exact: null, approx: null, unit: "", text: `kh\xF4ng c\xF3 ph\u1EA3n \u1EE9ng (${noReason})` };
    return err("query equation c\u1EA7n op mix c\xF3 ph\u1EA3n \u1EE9ng");
  }
  if (ctx.qualitativeMode) {
    return err(`b\xE0i \u0111\u1ECBnh t\xEDnh (c\xF3 ch\u1EA5t kh\xF4ng khai l\u01B0\u1EE3ng) \u2014 kh\xF4ng tr\u1EA3 l\u1EDDi \u0111\u01B0\u1EE3c truy v\u1EA5n \u0111\u1ECBnh l\u01B0\u1EE3ng "${q.kind}"${"of" in q ? ` c\u1EE7a ${q.of}` : ""}`);
  }
  const target = "of" in q ? q.of : "";
  const row = rows.find((rr) => rr.formula === target);
  if (!row) return err(`"${target}" kh\xF4ng c\xF3 trong s\u1ED5 c\xE1i ph\u1EA3n \u1EE9ng \u2014 ki\u1EC3m tra l\u1EA1i tr\u01B0\u1EDDng 'of' c\u1EE7a query ${q.kind}`);
  if (row.after === null) {
    return err(`"${target}" \u0111\u01B0\u1EE3c khai d\u01B0 (excess) \u2014 l\u01B0\u1EE3ng c\xF2n l\u1EA1i v\xF4 h\u1EA1n, kh\xF4ng truy v\u1EA5n \u0111\u01B0\u1EE3c ${q.kind}`);
  }
  if (q.kind === "mol") {
    return {
      query: q,
      exact: ratToString(row.after),
      approx: ratApprox(row.after),
      unit: "mol",
      text: `n(${target}) = ${fmtVN(ratApprox(row.after))} mol`
    };
  }
  if (q.kind === "mass") {
    const m = mulR(row.after, molarMass(target));
    return {
      query: q,
      exact: ratToString(m),
      approx: ratApprox(m),
      unit: "g",
      text: `m(${target}) = ${fmtVN(ratApprox(m))} g`
    };
  }
  if (q.kind === "volume_gas") {
    if (row.state !== "gas") {
      return err(`"${target}" kh\xF4ng ph\u1EA3i ch\u1EA5t kh\xED (tr\u1EA1ng th\xE1i ${row.state}) \u2014 kh\xF4ng c\xF3 th\u1EC3 t\xEDch kh\xED (F26)`);
    }
    if (!GAS_SET.has(target)) {
      return err(`${target} kh\xF4ng ph\u1EA3i ch\u1EA5t kh\xED \u1EDF \u0111i\u1EC1u ki\u1EC7n th\u01B0\u1EDDng (kh\xF4ng thu\u1ED9c danh s\xE1ch kh\xED \u0111\xF3ng) \u2014 kh\xF4ng quy ra th\u1EC3 t\xEDch kh\xED \u0111\u01B0\u1EE3c`);
    }
    const v = mulR(row.after, vm);
    return {
      query: q,
      exact: ratToString(v),
      approx: ratApprox(v),
      unit: "L",
      text: `V(${target}) = ${fmtVN(ratApprox(v))} l\xEDt (${vmLabel})`
    };
  }
  if (q.kind === "remaining") {
    if (isZeroR(row.after)) {
      return { query: q, exact: "0", approx: 0, unit: "mol", text: `${target} \u0111\xE3 ph\u1EA3n \u1EE9ng h\u1EBFt (d\u01B0 0 mol)` };
    }
    const g = mulR(row.after, molarMass(target));
    return {
      query: q,
      exact: ratToString(row.after),
      approx: ratApprox(row.after),
      unit: "mol",
      text: `${target} d\u01B0 ${fmtVN(ratApprox(row.after))} mol (\u2248 ${fmtVN(ratApprox(g))} g)`
    };
  }
  if (q.as === "CM") {
    if (row.state !== "solution") {
      return err(`CM ch\u1EC9 \xE1p d\u1EE5ng cho ch\u1EA5t tan trong dung d\u1ECBch \u2014 "${target}" \u0111ang l\xE0 ch\u1EA5t r\u1EAFn/kh\xED (tr\u1EA1ng th\xE1i ${row.state}) (F26)`);
    }
    let vTotal = R0;
    for (const s of infos) {
      if (s.state !== "solution") continue;
      if (s.excess) {
        return err(`dung d\u1ECBch ${s.formula} khai d\u01B0 (excess) \u2014 kh\xF4ng r\xF5 th\u1EC3 t\xEDch, kh\xF4ng t\xEDnh \u0111\u01B0\u1EE3c CM`);
      }
      if (s.solutionVolumeL === null) {
        return err(`kh\xF4ng r\xF5 th\u1EC3 t\xEDch c\u1EE7a dung d\u1ECBch ${s.formula} (khai theo C%/gam) \u2014 kh\xF4ng t\xEDnh \u0111\u01B0\u1EE3c CM`);
      }
      vTotal = addR(vTotal, s.solutionVolumeL);
    }
    if (isZeroR(vTotal)) {
      return err("t\u1ED5ng th\u1EC3 t\xEDch dung d\u1ECBch b\u1EB1ng 0 \u2014 kh\xF4ng t\xEDnh \u0111\u01B0\u1EE3c CM (ch\u1EB7n chia 0, F21)");
    }
    const cm = divR(row.after, vTotal);
    return {
      query: q,
      exact: ratToString(cm),
      approx: ratApprox(cm),
      unit: "M",
      text: `CM(${target}) = ${fmtVN(ratApprox(cm))}M (coi th\u1EC3 t\xEDch dung d\u1ECBch c\u1ED9ng t\xEDnh, V t\u1ED5ng = ${fmtVN(ratApprox(vTotal))} L)`
    };
  }
  if (row.state !== "solution") {
    return err(`C% ch\u1EC9 \xE1p d\u1EE5ng cho ch\u1EA5t tan trong dung d\u1ECBch \u2014 "${target}" \u0111ang \u1EDF tr\u1EA1ng th\xE1i ${row.state}`);
  }
  let poured = R0;
  for (const s of infos) {
    if (s.excess) return err(`ch\u1EA5t ${s.formula} khai d\u01B0 (excess) \u2014 kh\xF4ng x\xE1c \u0111\u1ECBnh \u0111\u01B0\u1EE3c kh\u1ED1i l\u01B0\u1EE3ng dung d\u1ECBch sau ph\u1EA3n \u1EE9ng, kh\xF4ng t\xEDnh \u0111\u01B0\u1EE3c C%`);
    if (s.pouredMassG === null) {
      return err(s.pouredMassUnknownWhy ?? `kh\xF4ng r\xF5 kh\u1ED1i l\u01B0\u1EE3ng \u0111\u1ED5 v\xE0o c\u1EE7a ${s.formula} \u2014 kh\xF4ng t\xEDnh \u0111\u01B0\u1EE3c C%`);
    }
    poured = addR(poured, s.pouredMassG);
  }
  let removed = R0;
  for (const rr of rows) {
    if (rr.after === null || isZeroR(rr.after)) continue;
    if (rr.state === "solid" || rr.state === "gas") {
      removed = addR(removed, mulR(rr.after, molarMass(rr.formula)));
    }
  }
  const mdd = subR(poured, removed);
  if (cmpR(mdd, R0) <= 0) return err("kh\u1ED1i l\u01B0\u1EE3ng dung d\u1ECBch sau ph\u1EA3n \u1EE9ng \u2264 0 \u2014 d\u1EEF ki\u1EC7n \u0111\u1EC1 m\xE2u thu\u1EABn");
  const mx = mulR(row.after, molarMass(target));
  const cpct = mulR(divR(mx, mdd), rat2(100n));
  return {
    query: q,
    exact: ratToString(cpct),
    approx: ratApprox(cpct),
    unit: "%",
    text: `C%(${target}) = ${fmtVN(ratApprox(cpct), 2)}% (m_dd sau = t\u1ED5ng \u0111\u1ED5 v\xE0o \u2212 k\u1EBFt t\u1EE7a \u2212 kh\xED tho\xE1t ra \u2212 ch\u1EA5t r\u1EAFn d\u01B0 = ${fmtVN(ratApprox(mdd))} g)`
  };
}

// api/_lib/kernel/chem/balance.ts
function bgcd3(a, b) {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a || 1n;
}
function balance(reactants, products) {
  let parsed;
  try {
    parsed = [...reactants, ...products].map((f) => parseFormula(f));
  } catch (e) {
    return { ok: false, problem: e instanceof Error ? e.message : String(e) };
  }
  const nR = reactants.length;
  const nCols = parsed.length;
  if (nCols < 2) return { ok: false, problem: "c\u1EA7n \xEDt nh\u1EA5t 2 ch\u1EA5t" };
  const elements = [];
  for (const counts of parsed) {
    for (const el of counts.keys()) if (!elements.includes(el)) elements.push(el);
  }
  const A = elements.map(
    (el) => parsed.map((counts, j) => {
      const n = BigInt(counts.get(el) ?? 0);
      return rat2(j < nR ? n : -n);
    })
  );
  const pivotColOfRow = [];
  let row = 0;
  for (let col = 0; col < nCols && row < A.length; col++) {
    let pivot = -1;
    for (let r2 = row; r2 < A.length; r2++) {
      if (!isZeroR(A[r2][col])) {
        pivot = r2;
        break;
      }
    }
    if (pivot === -1) continue;
    [A[row], A[pivot]] = [A[pivot], A[row]];
    const pv = A[row][col];
    for (let c = 0; c < nCols; c++) A[row][c] = divR(A[row][c], pv);
    for (let r2 = 0; r2 < A.length; r2++) {
      if (r2 === row || isZeroR(A[r2][col])) continue;
      const factor = A[r2][col];
      for (let c = 0; c < nCols; c++) A[r2][c] = subR(A[r2][c], mulR(factor, A[row][c]));
    }
    pivotColOfRow.push(col);
    row++;
  }
  const rank = pivotColOfRow.length;
  const nullity = nCols - rank;
  if (nullity === 0) {
    return { ok: false, problem: "kh\xF4ng c\xE2n b\u1EB1ng \u0111\u01B0\u1EE3c (\u0111\u1EC1 sai ho\u1EB7c thi\u1EBFu ch\u1EA5t)" };
  }
  if (nullity >= 2) {
    return { ok: false, problem: "h\u1EC7 ph\u1EA3n \u1EE9ng kh\xF4ng x\xE1c \u0111\u1ECBnh duy nh\u1EA5t (tr\u1ED9n \u2265 2 ph\u1EA3n \u1EE9ng \u0111\u1ED9c l\u1EADp)" };
  }
  const freeCol = [...Array(nCols).keys()].find((c) => !pivotColOfRow.includes(c));
  const x = Array.from({ length: nCols }, () => R0);
  x[freeCol] = R1;
  pivotColOfRow.forEach((pc, r2) => {
    x[pc] = subR(R0, A[r2][freeCol]);
  });
  let lcm = 1n;
  for (const v of x) lcm = lcm / bgcd3(lcm, v.den) * v.den;
  let ints = x.map((v) => v.num * lcm / v.den);
  let gcd3 = 0n;
  for (const v of ints) gcd3 = bgcd3(gcd3, v);
  ints = ints.map((v) => v / gcd3);
  if (ints.every((v) => v < 0n)) ints = ints.map((v) => -v);
  if (ints.some((v) => v <= 0n)) {
    return { ok: false, problem: "h\u1EC7 s\u1ED1 kh\xF4ng to\xE0n d\u01B0\u01A1ng \u2014 c\xF3 ch\u1EA5t \u0111\u1EB7t nh\u1EA7m v\u1EBF ho\u1EB7c kh\xF4ng tham gia" };
  }
  return { ok: true, coefficients: ints.map((v) => Number(v)) };
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
  CircuitPlanSchema,
  ConstructionOpSchema,
  DynamicsPlanSchema,
  EFieldPlanSchema,
  EdgeOpSchema,
  FootOpSchema,
  IntersectOpSchema,
  OscillationPlanSchema,
  PerpPointOpSchema,
  PhysicsPlanSchema,
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
  WavePlanSchema,
  attemptDeterministicRepair,
  buildAnalysisFigure,
  buildAreaRegion,
  buildPolyhedron,
  buildRevolutionSolidOx,
  buildRevolutionSolidOy,
  buildRevolutionSolidOyDisk,
  buildSectionCut,
  buildSliceStack,
  buildVesselSolid,
  checkDegeneracy,
  chem_exports as chem,
  compileProfile,
  createEmptySymbolTable,
  entityTableToGeometryData,
  evalExpr,
  evalProfile,
  executeOp,
  executePlan,
  parseExpr,
  planarArea,
  planeFrom3,
  polygonArea3D,
  resolveEntity,
  resolveSectionPoint,
  revolutionVolumeDisk,
  revolutionVolumeShellOy,
  run,
  runAnalysis,
  runAny,
  runCircuit,
  runDynamics,
  runEfield,
  runOscillation,
  runPhysics,
  runPlan,
  runWaves,
  sampleProfile,
  sampleVesselProfile,
  sectionK,
  sliceConvexPolyhedron,
  sliceStackVolume,
  toExactForm,
  toGeometryData,
  validateVesselSegments,
  verifyAssert,
  verifyPlan,
  vesselProfile,
  vesselSegmentVolume,
  vesselSegmentsFromMeasures,
  vesselVolume
};
