/* Native builtin export objects. The compiler supplies the existing static
 * callable implementations; this unit owns lookup, identity, and mutations. */
#include "scr_runtime.h"
#include "scr_system_errors.h"

#include <stdlib.h>
#include <string.h>
#include <math.h>

typedef struct { int value; const char *name; const char *message; } ScrSystemError;
#define SCR_SYSTEM_ERROR(name, message) { SCR_NODE_UV__##name, #name, message },
static const ScrSystemError scr_system_errors[] = {
  SCR_NODE_UV_ERRNO_MAP(SCR_SYSTEM_ERROR)
};
#undef SCR_SYSTEM_ERROR

static bool scr_system_error_number(const ScrDyn *error, double *number) {
  if (!error || error->kind != SCR_DYN_NUM) {
    scr_dyn_arg_type_fail("err", "of type number", error ? error : scr_dyn_undefined());
    return false;
  }
  double n = error->v.num;
  if (!(isfinite(n) && n < 0 && trunc(n) == n && n >= -9007199254740991.0)) {
    char received[48];
    scr_num_received(n, received);
    if (n == 0 && signbit(n)) strcpy(received, "-0");
    ScrJsonBuf buffer;
    scr_jb_init(&buffer);
    scr_jb_puts(&buffer, "The value of \"err\" is out of range. It must be a negative integer. Received ");
    scr_jb_puts(&buffer, received);
    ScrStr *message = scr_jb_finish(&buffer);
    scr_throw_error_msg_code(SCR_ERR_RANGE, message->data, message->len, "ERR_OUT_OF_RANGE");
    scr_str_release(message);
    return false;
  }
  *number = n;
  return true;
}

static ScrStr *scr_system_error_lookup(double number, bool message) {
  /* Node's name helper looks up the original safe integer. Its message
   * binding uses V8's saturating Int32 extraction instead. */
  double lookup = message && number < -2147483648.0 ? -2147483648.0 : number;
  for (size_t i = 0; i < sizeof scr_system_errors / sizeof scr_system_errors[0]; i++) {
    if (lookup == scr_system_errors[i].value) {
      const char *text = message ? scr_system_errors[i].message : scr_system_errors[i].name;
      return scr_str_new(text, strlen(text));
    }
  }
  ScrJsonBuf buffer;
  scr_jb_init(&buffer);
  scr_jb_puts(&buffer, "Unknown system error ");
  ScrStr *rendered = scr_f64_to_scrstr(lookup);
  scr_jb_put_str(&buffer, rendered);
  scr_str_release(rendered);
  return scr_jb_finish(&buffer);
}

ScrStr *scr_util_system_error_name(const ScrDyn *error) {
  double number;
  return scr_system_error_number(error, &number) ? scr_system_error_lookup(number, false) : NULL;
}

ScrStr *scr_util_system_error_message(const ScrDyn *error) {
  double number;
  return scr_system_error_number(error, &number) ? scr_system_error_lookup(number, true) : NULL;
}

ScrDyn *scr_util_system_error_entries(void) {
  ScrDyn *entries = scr_dyn_new_arr();
  for (size_t i = 0; i < sizeof scr_system_errors / sizeof scr_system_errors[0]; i++) {
    const ScrSystemError *error = &scr_system_errors[i];
    ScrDyn *entry = scr_dyn_new_arr(), *pair = scr_dyn_new_arr();
    ScrStr *name = scr_str_new(error->name, strlen(error->name));
    ScrStr *message = scr_str_new(error->message, strlen(error->message));
    scr_dyn_arr_push(pair, scr_dyn_new_str(name));
    scr_dyn_arr_push(pair, scr_dyn_new_str(message));
    scr_str_release(name);
    scr_str_release(message);
    scr_dyn_arr_push(entry, scr_dyn_new_num(error->value));
    scr_dyn_arr_push(entry, pair);
    scr_dyn_arr_push(entries, entry);
  }
  return entries;
}

static SCR_TL ScrDyn *scr_global_known;
static SCR_TL ScrDyn *scr_global_own;
/* The one box denoting this thread's global object. Symbol-keyed properties
 * live on the box (string-keyed ones in scr_global_own), so every spelling
 * of the global object answers this box. */
static SCR_TL ScrDyn *scr_global_box;
/* The compiler's immortal name table (one per program) whose names
 * scr_global_known holds; cleared with the tables, so a library re-init
 * registers the names again. */
static SCR_TL const ScrArr *scr_global_registered;
static SCR_TL bool scr_global_cleanup_registered;
static SCR_TL ScrDyn *(*scr_global_console_get)(void);
static SCR_TL ScrDyn *(*scr_global_fetch_get)(void);

void scr_global_fetch_install(ScrDyn *(*get)(void)) { scr_global_fetch_get = get; }

static SCR_TL ScrDyn *scr_hrtime_value;
static void scr_hrtime_cleanup(void) {
  ScrDyn *value = scr_hrtime_value;
  scr_hrtime_value = NULL;
  scr_dyn_release(value);
}

static ScrDyn *scr_hrtime_bigint_call(ScrClosure *closure, ScrDyn *const *args, size_t argc) {
  (void)closure; (void)args; (void)argc;
  ScrBigInt *time = scr_bigint_from_u64(scr_hrtime_ns());
  ScrDyn *value = scr_dyn_new_bigint(time);
  scr_bigint_release(time);
  return value;
}

static ScrDyn *scr_hrtime_call(ScrClosure *closure, ScrDyn *const *args, size_t argc) {
  (void)closure;
  if (argc && args[0]->kind == SCR_DYN_TYPED_REF) {
    ScrDyn *view = scr_dyn_typed_ref_materialize(args[0]);
    ScrDyn *result = view && !scr_exc_pending() ? scr_hrtime_call(closure, &view, 1) : NULL;
    scr_dyn_release(view);
    return result;
  }
  uint64_t time = scr_hrtime_ns();
  double seconds = (double)(time / UINT64_C(1000000000));
  double nanos = (double)(time % UINT64_C(1000000000));
  if (argc && args[0]->kind != SCR_DYN_UNDEF) {
    const ScrDyn *previous = args[0];
    if (previous->kind != SCR_DYN_ARR) {
      scr_dyn_arg_type_fail("time", "an instance of Array", previous);
      return NULL;
    }
    if (previous->v.arr.len != 2) {
      ScrJsonBuf message;
      scr_jb_init(&message);
      scr_jb_puts(&message, "The value of \"time\" is out of range. It must be 2. Received ");
      ScrStr *length = scr_f64_to_scrstr((double)previous->v.arr.len);
      scr_jb_put_str(&message, length);
      scr_str_release(length);
      ScrStr *text = scr_jb_finish(&message);
      scr_throw_error_msg_code(SCR_ERR_RANGE, text->data, text->len, "ERR_OUT_OF_RANGE");
      scr_str_release(text);
      return NULL;
    }
    ScrDyn *prior = scr_dyn_arr_at(previous, 0);
    if (prior->kind == SCR_DYN_BIGINT) {
      scr_dyn_release(prior);
      static const char message[] = "Cannot mix BigInt and other types, use explicit conversions";
      scr_throw_error_msg(SCR_ERR_TYPE, message, sizeof message - 1);
      return NULL;
    }
    double priorSeconds = scr_dyn_number_coerce(prior);
    scr_dyn_release(prior);
    if (scr_exc_pending()) return NULL;
    prior = scr_dyn_arr_at(previous, 1);
    if (prior->kind == SCR_DYN_BIGINT) {
      scr_dyn_release(prior);
      static const char message[] = "Cannot mix BigInt and other types, use explicit conversions";
      scr_throw_error_msg(SCR_ERR_TYPE, message, sizeof message - 1);
      return NULL;
    }
    double priorNanos = scr_dyn_number_coerce(prior);
    scr_dyn_release(prior);
    if (scr_exc_pending()) return NULL;
    seconds -= priorSeconds;
    nanos -= priorNanos;
    if (nanos < 0) { seconds--; nanos += 1e9; }
  }
  ScrDyn *result = scr_dyn_new_arr();
  scr_dyn_arr_push(result, scr_dyn_new_num(seconds));
  scr_dyn_arr_push(result, scr_dyn_new_num(nanos));
  return result;
}

ScrDyn *scr_process_hrtime_value(void) {
  if (!scr_hrtime_value) {
    scr_hrtime_value = scr_dyn_new_func(scr_closure_new(NULL, 0), scr_hrtime_call, 1, "native:process.hrtime", "hrtime");
    ScrDyn *bigint = scr_dyn_new_func(scr_closure_new(NULL, 0), scr_hrtime_bigint_call, 0, "native:process.hrtime.bigint", "hrtimeBigInt");
    ScrStr *key = scr_str_new("bigint", 6);
    scr_dyn_key_set(scr_hrtime_value, key, bigint);
    scr_str_release(key);
    scr_dyn_release(bigint);
    scr_atexit(scr_hrtime_cleanup);
  }
  return scr_dyn_retain(scr_hrtime_value);
}

static void scr_global_cleanup(void) {
  scr_dyn_release(scr_global_box);
  scr_global_box = NULL;
  scr_dyn_release(scr_global_known);
  scr_dyn_release(scr_global_own);
  scr_global_known = NULL;
  scr_global_own = NULL;
  scr_global_registered = NULL;
}

static void *scr_global_retain(void *handle) { return handle; }
static void scr_global_release(void *handle) { (void)handle; }

static ScrDyn *scr_global_get(void *handle, const char *key, size_t length) {
  (void)handle;
  ScrDyn *own = scr_global_own ? scr_dyn_obj_get(scr_global_own, key, length) : NULL;
  if (own) return scr_dyn_retain(own);
  if ((length == 10 && memcmp(key, "globalThis", length) == 0) ||
      (length == 6 && memcmp(key, "global", length) == 0))
    return scr_dyn_retain(scr_global_box);
  if (length == 7 && memcmp(key, "console", length) == 0 && scr_global_console_get)
    return scr_global_console_get();
  if (length == 5 && memcmp(key, "fetch", length) == 0 && scr_global_fetch_get) return scr_global_fetch_get();
  if (length == 9 && memcmp(key, "undefined", length) == 0) return scr_dyn_undefined();
  if (length == 3 && memcmp(key, "NaN", length) == 0) return scr_dyn_new_num(NAN);
  if (length == 8 && memcmp(key, "Infinity", length) == 0) return scr_dyn_new_num(INFINITY);
  if (!scr_dyn_obj_get(scr_global_known, key, length)) return scr_dyn_undefined();
  ScrJsonBuf text;
  scr_jb_init(&text);
  scr_jb_puts(&text, "reading globalThis.");
  for (size_t i = 0; i < length; i++) scr_jb_putc(&text, key[i]);
  scr_jb_puts(&text, " through a stored global object is not supported yet [SC2020]");
  ScrStr *message = scr_jb_finish(&text);
  scr_throw_error_msg_code(SCR_ERR_ERROR, message->data, message->len, "SC2020");
  scr_str_release(message);
  return NULL;
}

static bool scr_global_set(void *handle, const char *key, size_t length, const ScrDyn *value) {
  (void)handle;
  // Builtin globals have separate native implementations. Preserve their
  // explicit mutation boundary instead of shadowing only one access path.
  if (scr_dyn_obj_get(scr_global_known, key, length)) return false;
  scr_dyn_obj_set(scr_global_own, key, length, scr_dyn_retain((ScrDyn *)value));
  return true;
}

ScrDyn *scr_global_object(void) {
  static const ScrDynHandleOps ops = {
    .cls = "Object", .retain = scr_global_retain, .release = scr_global_release,
    .get = scr_global_get, .set = scr_global_set,
  };
  scr_dyn_handle_install(SCR_DYNH_GLOBAL, &ops);
  if (!scr_global_known) scr_global_known = scr_dyn_new_obj();
  if (!scr_global_own) scr_global_own = scr_dyn_new_obj();
  if (!scr_global_box) scr_global_box = scr_dyn_new_handle(&scr_global_known, SCR_DYNH_GLOBAL);
  if (!scr_global_cleanup_registered) {
    scr_atexit(scr_global_cleanup);
    scr_global_cleanup_registered = true;
  }
  return scr_global_box;
}

ScrDyn *scr_global_native_init(ScrArr *known, ScrDyn *(*console_get)(void)) {
  /* The compiler passes one immortal name table per program: once it is
   * registered, later reads of the global object only take a reference. */
  if (known == scr_global_registered && scr_global_box) return scr_dyn_retain(scr_global_box);
  ScrDyn *global = scr_global_object();
  scr_global_console_get = console_get;
  if (known->rc == SIZE_MAX) scr_global_registered = known;
  for (size_t i = 0; i < known->len; i++) {
    ScrStr *key = (ScrStr *)scr_arr_get_ref(known, (double)i);
    if (!scr_dyn_obj_get(scr_global_known, key->data, key->len))
      scr_dyn_obj_set(scr_global_known, key->data, key->len, scr_dyn_new_bool(true));
    scr_str_release(key);
  }
  return scr_dyn_retain(global);
}

typedef struct ScrBuiltinModule {
  size_t rc;
  ScrStr *id;
  ScrDyn *getter;
  ScrDyn *exports;
  struct ScrBuiltinModule *next;
} ScrBuiltinModule;

static SCR_TL ScrBuiltinModule *scr_builtin_modules;
static SCR_TL bool scr_builtin_cleanup_registered;

static void *scr_builtin_retain(void *handle) {
  ScrBuiltinModule *module = handle;
  module->rc++;
  return module;
}

static void scr_builtin_release(void *handle) {
  ScrBuiltinModule *module = handle;
  if (--module->rc) return;
  scr_str_release(module->id);
  scr_dyn_release(module->getter);
  scr_dyn_release(module->exports);
  free(module);
}

static void scr_builtin_cleanup(void) {
  while (scr_builtin_modules) {
    ScrBuiltinModule *module = scr_builtin_modules;
    scr_builtin_modules = module->next;
    scr_builtin_release(module);
  }
}

static ScrDyn *scr_builtin_get(void *handle, const char *key, size_t length) {
  ScrBuiltinModule *module = handle;
  ScrDyn *cached = scr_dyn_obj_get(module->exports, key, length);
  if (cached) return scr_dyn_retain(cached);
  ScrStr *name = scr_str_new(key, length);
  ScrDyn *arg = scr_dyn_new_str(name);
  scr_str_release(name);
  ScrDyn *result = scr_dyn_call(module->getter, &arg, 1, "builtin export");
  scr_dyn_release(arg);
  if (!result) return NULL;
  // Nested path aliases are handles rooted in the registry. Caching them
  // would add path.posix/path.win32 cycles to the reference-counted graph.
  if (!(result->kind == SCR_DYN_HANDLE && result->v.handle.tag == SCR_DYNH_BUILTIN_MODULE))
    scr_dyn_obj_set(module->exports, key, length, scr_dyn_retain(result));
  return result;
}

static bool scr_builtin_set(void *handle, const char *key, size_t length, const ScrDyn *value) {
  ScrBuiltinModule *module = handle;
  scr_dyn_obj_set(module->exports, key, length, scr_dyn_retain((ScrDyn *)value));
  return true;
}

static ScrDyn *scr_builtin_invoke(void *handle, ScrDyn *self, const char *key,
                                ScrDyn *const *args, size_t argc, const char *what) {
  ScrDyn *fn = scr_builtin_get(handle, key, strlen(key));
  if (!fn) return NULL;
  scr_dyn_this_push_dyn(self);
  ScrDyn *result = scr_dyn_call(fn, args, argc, what);
  scr_dyn_this_pop();
  scr_dyn_release(fn);
  return result;
}

ScrStr *scr_process_builtin_id(ScrDyn *id, ScrArr *known) {
  if (id->kind != SCR_DYN_STR) {
    scr_dyn_arg_type_fail("id", "of type string", id);
    return NULL;
  }
  ScrStr *value = id->v.str;
  bool prefix = value->len >= 5 && memcmp(value->data, "node:", 5) == 0;
  for (size_t i = 0; i < known->len; i++) {
    ScrStr *entry = (ScrStr *)scr_arr_get_ref(known, (double)i);
    bool exact = entry->len == value->len && memcmp(entry->data, value->data, value->len) == 0;
    bool prefix_only = entry->len >= 5 && memcmp(entry->data, "node:", 5) == 0;
    bool bare = prefix && !prefix_only && entry->len == value->len - 5 && memcmp(entry->data, value->data + 5, entry->len) == 0;
    scr_str_release(entry);
    if (exact || bare) return scr_str_new(value->data + (prefix ? 5 : 0), value->len - (prefix ? 5 : 0));
  }
  return scr_str_new("", 0);
}

ScrDyn *scr_process_builtin_module(ScrStr *id, ScrDyn *getter) {
  static const ScrDynHandleOps ops = {
    .cls = "Object", .retain = scr_builtin_retain, .release = scr_builtin_release,
    .get = scr_builtin_get, .set = scr_builtin_set, .invoke = scr_builtin_invoke,
  };
  scr_dyn_handle_install(SCR_DYNH_BUILTIN_MODULE, &ops);
  for (ScrBuiltinModule *module = scr_builtin_modules; module; module = module->next) {
    if (module->id->len == id->len && memcmp(module->id->data, id->data, id->len) == 0)
      return scr_dyn_new_handle(module, SCR_DYNH_BUILTIN_MODULE);
  }
  if (!scr_builtin_cleanup_registered) {
    scr_atexit(scr_builtin_cleanup);
    scr_builtin_cleanup_registered = true;
  }
  ScrBuiltinModule *module = malloc(sizeof(*module));
  if (!module) scr_trap("scriptc: out of memory\n");
  *module = (ScrBuiltinModule){ 1, scr_str_retain(id), scr_dyn_retain(getter), scr_dyn_new_obj(), scr_builtin_modules };
  scr_builtin_modules = module;
  return scr_dyn_new_handle(module, SCR_DYNH_BUILTIN_MODULE);
}

ScrDyn *scr_process_builtin_unsupported(ScrStr *id, ScrStr *member) {
  ScrJsonBuf text;
  scr_jb_init(&text);
  scr_jb_puts(&text, "native builtin '");
  scr_jb_write(&text, id->data, id->len);
  if (member->len) {
    scr_jb_putc(&text, '.');
    scr_jb_write(&text, member->data, member->len);
  }
  scr_jb_puts(&text, "' is not supported through process.getBuiltinModule yet [SC2020]");
  ScrStr *message = scr_jb_finish(&text);
  scr_throw_error_msg_code(SCR_ERR_ERROR, message->data, message->len, "SC2020");
  scr_str_release(message);
  return NULL;
}
