/* scriptc runtime — the dynamic tier's hidden classes and inline caches
 * (scr_js.h; two-tier design stage S4).
 *
 * Shapes are attached to the existing checked objects (ScrDyn OBJ nodes)
 * rather than replacing their entry storage: static code and the shared
 * runtime read those entries in place, so a second object representation
 * would have to be understood or converted at every boundary. A shape is a
 * node of the thread's transition tree over key sequences; an object's
 * shape proves which key sits at each entry index and which keys the
 * object lacks. Everything else a cache hit depends on is tested live: the
 * node kind, the accessor and writable bits of the entry it uses, and the
 * prototype pointer.
 *
 * Linked only into programs with dynamic-tier code (the dynTier runtime
 * feature), together with the SCR_JS_TIER build of scr_json.c, which
 * resets an object's shape on every change to its key set. */
#include "scr_js.h"
#include "scr_key.h"

#include <stdlib.h>
#include <string.h>

/* The compiler's inline cache tests read these in place (64-bit targets;
 * backend/llvm/js-ic.ts). */
#if SCR_JS_IMMEDIATES
_Static_assert(offsetof(ScrDyn, kind) == 8, "kind offset");
_Static_assert(offsetof(ScrDyn, v.obj.len) == 16 && offsetof(ScrDyn, v.obj.entries) == 32,
               "object entry offsets");
_Static_assert(offsetof(ScrDyn, v.arr.len) == 16 && offsetof(ScrDyn, v.arr.items) == 32 &&
               offsetof(ScrDyn, v.arr.presence) == 56, "array element offsets");
_Static_assert(offsetof(ScrDyn, prototype) == 96, "prototype offset");
_Static_assert(sizeof(ScrDynEntry) == 48 && offsetof(ScrDynEntry, value) == 16 &&
               offsetof(ScrDynEntry, writable) == 41, "entry layout");
_Static_assert(sizeof(ScrJsIcEntry) == 40 && sizeof(ScrJsIc) == 168, "cache layout");
#endif

/* Objects with more entries stay unshaped (dictionary mode): their reads
 * take the generic path and its hash index. */
#define SCR_JS_SHAPE_MAX 64

/* Shapes live until the thread exits or a library session ends, so a thread
 * creates at most this many, holding at most this many key bytes. Once
 * either budget is spent, objects whose key sequence has no shape yet stay
 * unshaped; shapes that exist keep serving. */
#define SCR_JS_SHAPE_BUDGET ((size_t)1 << 16)
#define SCR_JS_SHAPE_KEY_BYTES_BUDGET ((size_t)4 << 20)

struct ScrJsShape {
  const ScrJsShape *parent;
  char *key; /* one reference to shared key bytes (scr_json.c) */
  size_t key_len;
  uint64_t hash;
  uint32_t count; /* entries: the depth in the tree */
  ScrJsShape *all_next;
};

/* The root is the empty key sequence. Transitions live in one open
 * addressing table per thread keyed by (parent, key). */
static SCR_TL ScrJsShape scr_js_root;
static SCR_TL ScrJsShape *scr_js_all_shapes;
static SCR_TL ScrJsShape **scr_js_transitions;
static SCR_TL size_t scr_js_transition_mask; /* capacity - 1; 0 when absent */
static SCR_TL size_t scr_js_transition_count;
static SCR_TL size_t scr_js_shape_key_bytes;
static SCR_TL bool scr_js_shapes_registered;

/* The cache records that hold entries. Entries name shapes and prototype
 * objects, so the reset that frees the shapes also clears these records: a
 * library's next session runs the same sites with the same records. */
static SCR_TL ScrJsIc **scr_js_filled_ics;
static SCR_TL size_t scr_js_filled_count;
static SCR_TL size_t scr_js_filled_capacity;

/* The shape word of an object whose key sequence has no shape within the
 * budgets. No cache entry names it, so its accesses take the probes,
 * which answer with a miss until the key set changes. */
static ScrJsShape scr_js_unshaped;

/* The second-level cache of load sites whose own record is full: one entry
 * per (receiver shape, key bytes) slot, filled by the probe and checked like
 * a site entry. It names shapes, so the shape reset clears it. */
#define SCR_JS_SHARED_LOADS 2048
typedef struct ScrJsSharedLoad {
  const char *key;
  ScrJsIcEntry entry;
} ScrJsSharedLoad;
static SCR_TL ScrJsSharedLoad *scr_js_shared_loads;

static void scr_js_shapes_reset(void) {
  for (size_t i = 0; i < scr_js_filled_count; i++)
    memset(scr_js_filled_ics[i], 0, sizeof *scr_js_filled_ics[i]);
  free(scr_js_shared_loads);
  scr_js_shared_loads = NULL;
  free(scr_js_filled_ics);
  scr_js_filled_ics = NULL;
  scr_js_filled_count = 0;
  scr_js_filled_capacity = 0;
  while (scr_js_all_shapes) {
    ScrJsShape *shape = scr_js_all_shapes;
    scr_js_all_shapes = shape->all_next;
    scr_dyn_tier_key_release(shape->key, shape->key_len);
    free(shape);
  }
  free(scr_js_transitions);
  scr_js_transitions = NULL;
  scr_js_transition_mask = 0;
  scr_js_transition_count = 0;
  scr_js_shape_key_bytes = 0;
  scr_js_shapes_registered = false;
}

static size_t scr_js_transition_slot(const ScrJsShape *parent, uint64_t hash) {
  return (size_t)scr_key_mix(hash ^ (uint64_t)(uintptr_t)parent);
}

static void scr_js_transition_insert(ScrJsShape *child) {
  size_t i = scr_js_transition_slot(child->parent, child->hash) & scr_js_transition_mask;
  while (scr_js_transitions[i]) i = (i + 1) & scr_js_transition_mask;
  scr_js_transitions[i] = child;
}

static void scr_js_transitions_grow(void) {
  size_t old_cap = scr_js_transition_mask ? scr_js_transition_mask + 1 : 0;
  size_t cap = old_cap ? old_cap * 2 : 256;
  ScrJsShape **old = scr_js_transitions;
  scr_js_transitions = calloc(cap, sizeof *scr_js_transitions);
  if (!scr_js_transitions) scr_trap("scriptc: out of memory\n");
  scr_js_transition_mask = cap - 1;
  for (size_t i = 0; i < old_cap; i++)
    if (old[i]) scr_js_transition_insert(old[i]);
  free(old);
}

/* The child of `parent` for appending `key` (borrowed bytes), created on
 * first use; NULL when creating it would exceed a budget. */
static const ScrJsShape *scr_js_transition(const ScrJsShape *parent, const char *key, size_t key_len) {
  uint64_t hash = scr_key_hash(key, key_len);
  if (scr_js_transition_mask) {
    size_t i = scr_js_transition_slot(parent, hash) & scr_js_transition_mask;
    for (ScrJsShape *child; (child = scr_js_transitions[i]); i = (i + 1) & scr_js_transition_mask) {
      if (child->parent == parent && child->hash == hash && child->key_len == key_len &&
          scr_key_equal(child->key, key, key_len))
        return child;
    }
  }
  if (scr_js_transition_count >= SCR_JS_SHAPE_BUDGET ||
      key_len > SCR_JS_SHAPE_KEY_BYTES_BUDGET - scr_js_shape_key_bytes)
    return NULL;
  if ((scr_js_transition_count + 1) * 2 > (scr_js_transition_mask ? scr_js_transition_mask + 1 : 0))
    scr_js_transitions_grow();
  ScrJsShape *child = malloc(sizeof *child);
  if (!child) scr_trap("scriptc: out of memory\n");
  *child = (ScrJsShape){parent, scr_dyn_tier_key_copy(key, key_len), key_len, hash, parent->count + 1,
                        scr_js_all_shapes};
  scr_js_all_shapes = child;
  if (!scr_js_shapes_registered) {
    scr_js_shapes_registered = true;
    scr_atexit(scr_js_shapes_reset);
  }
  scr_js_transition_insert(child);
  scr_js_transition_count++;
  scr_js_shape_key_bytes += key_len;
  return child;
}

/* An object's shape, computed from its entries when it has none; NULL for
 * objects that stay unshaped (other kinds, immortal objects, the builtin
 * Object.prototype, dictionary-sized objects, key sequences past the
 * budgets). Immortal objects (rc == SIZE_MAX: published graphs, which
 * threads share by pointer) are never shaped: shapes belong to one thread
 * and die with it, and no thread writes an immortal object's header. */
#ifdef SCR_JS_VERIFY
/* Debugging aid (build the runtime with -DSCR_JS_VERIFY and compile with
 * SCRIPTC_JS_IC_WAYS=0 so every access probes): traps when an object's
 * shape no longer names its key sequence, i.e. when some mutation of the
 * key set missed its SCR_JS_SHAPE_RESET. */
static void scr_js_verify(const ScrDyn *object, const ScrJsShape *shape) {
  size_t len = object->v.obj.len;
  if (shape->count != len) scr_trap("scriptc: stale shape (entry count)\n");
  for (const ScrJsShape *s = shape; s->parent; s = s->parent) {
    const ScrDynEntry *entry = &object->v.obj.entries[s->count - 1];
    if (entry->key_len != s->key_len || !scr_key_equal(entry->key, s->key, s->key_len))
      scr_trap("scriptc: stale shape (key)\n");
  }
}
#endif

static const ScrJsShape *scr_js_shape_of(ScrDyn *object) {
  if (object->kind != SCR_DYN_OBJ || object->rc == SIZE_MAX) return NULL;
  const ScrJsShape *shape = object->v.obj.shape;
  if (shape == &scr_js_unshaped) return NULL;
#ifdef SCR_JS_VERIFY
  if (shape) scr_js_verify(object, shape);
#endif
  if (shape) return shape;
  size_t len = object->v.obj.len;
  if (len > SCR_JS_SHAPE_MAX || object == scr_dyn_tier_object_prototype()) return NULL;
  shape = &scr_js_root;
  for (size_t i = 0; i < len; i++) {
    ScrDynEntry *entry = &object->v.obj.entries[i];
    shape = scr_js_transition(shape, entry->key, entry->key_len);
    if (!shape) {
      object->v.obj.shape = &scr_js_unshaped;
      return NULL;
    }
  }
  object->v.obj.shape = (ScrJsShape *)shape;
  return shape;
}

/* The entry index of `key` in an object of shape `shape`, or SIZE_MAX. */
static size_t scr_js_shape_find(const ScrJsShape *shape, const char *key, size_t key_len) {
  for (; shape->parent; shape = shape->parent)
    if (shape->key_len == key_len && scr_key_equal(shape->key, key, key_len)) return shape->count - 1;
  return SIZE_MAX;
}

/* Fills a cache entry: `stale` (a matching entry whose hit failed) when
 * there is one, else a free or replaceable one. */
static void scr_js_ic_add(ScrJsIc *ic, uint32_t stale, ScrJsIcEntry entry) {
  if (ic->count == 0) {
    if (scr_js_filled_count == scr_js_filled_capacity) {
      size_t capacity = scr_js_filled_capacity ? scr_js_filled_capacity * 2 : 64;
      ScrJsIc **grown = realloc(scr_js_filled_ics, capacity * sizeof *grown);
      if (!grown) scr_trap("scriptc: out of memory\n");
      scr_js_filled_ics = grown;
      scr_js_filled_capacity = capacity;
    }
    scr_js_filled_ics[scr_js_filled_count++] = ic;
  }
  uint32_t index;
  if (stale < ic->count) {
    index = stale;
  } else if (ic->count < SCR_JS_IC_WAYS) {
    index = ic->count++;
  } else {
    /* A full cache keeps entry 0, which the site tests inline, and cycles
     * through the others. */
    index = 1 + ic->next++ % (SCR_JS_IC_WAYS - 1);
  }
  ic->entry[index] = entry;
}

/* ── loads ────────────────────────────────────────────────────────────── */

/* The cached answer of an entry whose receiver shape matched, or NULL. */
static ScrDyn *scr_js_load_hit(ScrDyn *receiver, const ScrJsIcEntry *entry) {
  const ScrDyn *holder = receiver;
  if (entry->target) {
    holder = entry->holder;
    if (receiver->prototype != holder || holder->kind != SCR_DYN_OBJ ||
        holder->v.obj.shape != entry->target)
      return NULL;
  }
  const ScrDynEntry *found = &holder->v.obj.entries[entry->slot];
  return found->accessor ? NULL : scr_dyn_retain(found->value);
}

/* An absent entry: its target is this tag and its holder is a placeholder
 * that is never a prototype, so the inline test of entry 0 in compiled code
 * (a prototype hit needs the receiver's prototype to be the holder) always
 * sends such a receiver to the probe. Its holder_shape and slot name the one
 * prototype the read walked past (shape and object), or NULL and 0 when the
 * receiver had no prototype. */
static const ScrJsShape scr_js_absent;
static const ScrDyn scr_js_absent_holder;

/* Keys whose read on a plain object is not just its [[Get]]: the members of
 * Object.prototype, which reads of an absent own property answer through
 * the inherited-member path, and the error constructor read. */
static bool scr_js_absent_cacheable(const ScrStr *key) {
#define SCR_JS_INHERITED(name) {name, sizeof name - 1}
  static const struct {
    const char *name;
    size_t len;
  } inherited[] = {
      SCR_JS_INHERITED("constructor"),      SCR_JS_INHERITED("__proto__"),
      SCR_JS_INHERITED("toString"),         SCR_JS_INHERITED("toLocaleString"),
      SCR_JS_INHERITED("valueOf"),          SCR_JS_INHERITED("hasOwnProperty"),
      SCR_JS_INHERITED("isPrototypeOf"),    SCR_JS_INHERITED("propertyIsEnumerable"),
      SCR_JS_INHERITED("__defineGetter__"), SCR_JS_INHERITED("__defineSetter__"),
      SCR_JS_INHERITED("__lookupGetter__"), SCR_JS_INHERITED("__lookupSetter__"),
  };
#undef SCR_JS_INHERITED
  for (size_t i = 0; i < sizeof inherited / sizeof inherited[0]; i++)
    if (key->len == inherited[i].len && memcmp(key->data, inherited[i].name, key->len) == 0)
      return false;
  return true;
}

static ScrJsSharedLoad *scr_js_shared_load(const ScrJsShape *shape, const ScrStr *key) {
  if (!scr_js_shared_loads) {
    scr_js_shared_loads = calloc(SCR_JS_SHARED_LOADS, sizeof *scr_js_shared_loads);
    if (!scr_js_shared_loads) scr_trap("scriptc: out of memory\n");
  }
  uint64_t mixed = scr_key_mix((uint64_t)(uintptr_t)shape ^ ((uint64_t)(uintptr_t)key->data << 1));
  return &scr_js_shared_loads[mixed & (SCR_JS_SHARED_LOADS - 1)];
}

/* Whether an absent entry still holds for `receiver`, whose shape matched:
 * its own keys lack the key, so the walked prototype (if any) must be the
 * same object with the same shape, and the chain must end there. */
static bool scr_js_absent_hit(const ScrDyn *receiver, const ScrJsIcEntry *entry) {
  const ScrDyn *prototype = receiver->prototype;
  const ScrDyn *walked = (const ScrDyn *)entry->slot;
  if (!walked) return prototype == NULL;
  return prototype == walked && walked->kind == SCR_DYN_OBJ &&
         walked->v.obj.shape == entry->holder_shape && walked->prototype == NULL;
}

/* The answer of a matching entry for `receiver`, or NULL when the entry no
 * longer holds. */
static inline __attribute__((always_inline)) ScrDyn *scr_js_entry_answer(ScrDyn *receiver,
                                                                     const ScrJsIcEntry *entry) {
  if (entry->target == &scr_js_absent)
    return scr_js_absent_hit(receiver, entry) ? scr_dyn_retain(scr_dyn_undefined()) : NULL;
  return scr_js_load_hit(receiver, entry);
}

/* The object an entry's answer depends on besides the receiver: the
 * prototype it read from or walked past, or NULL for an own property. */
static const ScrDyn *scr_js_entry_prototype(const ScrJsIcEntry *entry) {
  if (entry->target == &scr_js_absent) return (const ScrDyn *)entry->slot;
  return entry->target ? entry->holder : NULL;
}

/* Records `entry` in the site and, when the site's record is full, in the
 * shared slot. A matching entry whose answer failed is replaced when it
 * depends on the same prototype (that prototype changed); one that names
 * another prototype stays, so receivers of one shape with different
 * prototypes each keep an entry. */
static void scr_js_load_fill(ScrJsIc *ic, uint32_t stale, ScrJsSharedLoad *shared,
                             const ScrStr *key, ScrJsIcEntry entry) {
  if (stale < ic->count &&
      scr_js_entry_prototype(&ic->entry[stale]) != scr_js_entry_prototype(&entry))
    stale = UINT32_MAX;
  if (shared) *shared = (ScrJsSharedLoad){key->data, entry};
  scr_js_ic_add(ic, stale, entry);
}

/* A load site's probe. With `absent`, a read of a key that the receiver and
 * its chain of plain shaped objects (ending in the default prototype) lack
 * answers undefined and caches that answer. Method reads leave absent
 * methods to the slow path, which names the missing function. */
static __attribute__((noinline)) ScrDyn *scr_js_probe_load(ScrDyn *receiver, const ScrStr *key,
                                                            ScrJsIc *ic, bool absent) {
  const ScrJsShape *shape = scr_js_shape_of(receiver);
  if (!shape) return NULL;
  uint32_t stale = UINT32_MAX;
  for (uint32_t i = 0; i < ic->count; i++) {
    if (ic->entry[i].shape != shape) continue;
    ScrDyn *value = scr_js_entry_answer(receiver, &ic->entry[i]);
    if (value) return value;
    if (stale == UINT32_MAX) stale = i;
  }
  ScrJsSharedLoad *shared = NULL;
  if (ic->count == SCR_JS_IC_WAYS) {
    shared = scr_js_shared_load(shape, key);
    if (shared->key == key->data && shared->entry.shape == shape &&
        (absent || shared->entry.target != &scr_js_absent)) {
      ScrDyn *value = scr_js_entry_answer(receiver, &shared->entry);
      if (value) return value;
    }
  }
  size_t slot = scr_js_shape_find(shape, key->data, key->len);
  if (slot != SIZE_MAX) {
    const ScrDynEntry *found = &receiver->v.obj.entries[slot];
    if (found->accessor) return NULL;
    scr_js_load_fill(ic, stale, shared, key, (ScrJsIcEntry){shape, NULL, NULL, NULL, slot});
    return scr_dyn_retain(found->value);
  }
  absent = absent && scr_js_absent_cacheable(key);
  /* One prototype link: an ordinary object other than the builtin
   * Object.prototype (whose reads the generic path fences). */
  ScrDyn *holder = receiver->prototype;
  if (!holder) {
    if (!absent) return NULL;
    scr_js_load_fill(ic, stale, shared, key,
                     (ScrJsIcEntry){shape, &scr_js_absent, &scr_js_absent_holder, NULL, 0});
    return scr_dyn_retain(scr_dyn_undefined());
  }
  const ScrJsShape *holder_shape = scr_js_shape_of(holder);
  if (!holder_shape) return NULL;
  slot = scr_js_shape_find(holder_shape, key->data, key->len);
  if (slot == SIZE_MAX) {
    if (!absent || holder->prototype != NULL) return NULL;
    scr_js_load_fill(ic, stale, shared, key,
                     (ScrJsIcEntry){shape, &scr_js_absent, &scr_js_absent_holder, holder_shape,
                                    (size_t)holder});
    return scr_dyn_retain(scr_dyn_undefined());
  }
  const ScrDynEntry *found = &holder->v.obj.entries[slot];
  if (found->accessor) return NULL;
  scr_js_load_fill(ic, stale, shared, key, (ScrJsIcEntry){shape, holder_shape, holder, NULL, slot});
  return scr_dyn_retain(found->value);
}

/* Receivers other than ordinary objects have no shape: they miss before
 * the probe sets up its frame. */
ScrDyn *scr_js_load_probe(ScrDyn *receiver, const ScrStr *key, ScrJsIc *ic) {
  if (receiver->kind != SCR_DYN_OBJ) return NULL;
  return scr_js_probe_load(receiver, key, ic, false);
}

ScrDyn *scr_js_get_probe(ScrDyn *receiver, const ScrStr *key, ScrJsIc *ic) {
  if (receiver->kind != SCR_DYN_OBJ) return NULL;
  return scr_js_probe_load(receiver, key, ic, true);
}

/* ── stores ───────────────────────────────────────────────────────────── */

/* The generic store keeps a native Error's fields in sync with these keys
 * of its checked view (scr_json.c's scr_error_sync_slots); caches leave
 * them to it. */
static bool scr_js_error_synced_key(const ScrStr *key) {
  switch (key->len) {
  case 4: return memcmp(key->data, "name", 4) == 0 || memcmp(key->data, "code", 4) == 0;
  case 5: return memcmp(key->data, "cause", 5) == 0 || memcmp(key->data, "stack", 5) == 0;
  case 7: return memcmp(key->data, "message", 7) == 0;
  default: return false;
  }
}

static bool scr_js_replace(ScrDyn *receiver, size_t slot, ScrDyn *value) {
  ScrDynEntry *found = &receiver->v.obj.entries[slot];
  if (found->accessor || !found->writable || found->fenced) return false;
  scr_dyn_region_store(receiver, value);
  ScrDyn *old = found->value;
  found->value = scr_dyn_retain(value);
  scr_dyn_release(old);
  return true;
}

/* Whether an add may skip the generic path's prototype-chain walk: the
 * chain is empty, or one ordinary object that lacks the key and ends it. */
static bool scr_js_add_chain(const ScrDyn *prototype, const ScrJsShape *prototype_shape,
                             const ScrStr *key) {
  if (!prototype) return true;
  return prototype_shape && !prototype->prototype &&
         scr_js_shape_find(prototype_shape, key->data, key->len) == SIZE_MAX;
}

static bool scr_js_append_shaped(ScrDyn *receiver, const ScrJsShape *target, ScrDyn *value) {
  if (receiver->non_extensible) return false;
  scr_dyn_tier_append(receiver, target->key, target->key_len, scr_dyn_retain(value));
  receiver->v.obj.shape = (ScrJsShape *)target;
  return true;
}

bool scr_js_store_probe(ScrDyn *receiver, const ScrStr *key, ScrDyn *value, ScrJsIc *ic) {
  const ScrJsShape *shape = scr_js_shape_of(receiver);
  if (!shape || scr_js_error_synced_key(key)) return false;
  uint32_t stale = UINT32_MAX;
  for (uint32_t i = 0; i < ic->count; i++) {
    const ScrJsIcEntry *entry = &ic->entry[i];
    if (entry->shape != shape) continue;
    if (entry->target == shape) {
      if (scr_js_replace(receiver, entry->slot, value)) return true;
    } else if (receiver->prototype == entry->holder &&
               (!entry->holder || (entry->holder->kind == SCR_DYN_OBJ &&
                                   entry->holder->v.obj.shape == entry->holder_shape &&
                                   !entry->holder->prototype))) {
      if (scr_js_append_shaped(receiver, entry->target, value)) return true;
    }
    stale = i;
    break;
  }
  size_t slot = scr_js_shape_find(shape, key->data, key->len);
  if (slot != SIZE_MAX) {
    const ScrDynEntry *found = &receiver->v.obj.entries[slot];
    if (found->accessor || !found->writable || found->fenced) return false;
    scr_js_ic_add(ic, stale, (ScrJsIcEntry){shape, shape, NULL, NULL, slot});
    return scr_js_replace(receiver, slot, value);
  }
  ScrDyn *prototype = receiver->prototype;
  const ScrJsShape *prototype_shape = prototype ? scr_js_shape_of(prototype) : NULL;
  if (!scr_js_add_chain(prototype, prototype_shape, key) || receiver->non_extensible ||
      shape->count >= SCR_JS_SHAPE_MAX)
    return false;
  const ScrJsShape *target = scr_js_transition(shape, key->data, key->len);
  if (!target) return false;
  scr_js_ic_add(ic, stale, (ScrJsIcEntry){shape, target, prototype, prototype_shape, target->count - 1});
  return scr_js_append_shaped(receiver, target, value);
}

/* ── keyed loads ──────────────────────────────────────────────────────── */

ScrDyn *scr_js_index_probe(ScrDyn *receiver, double index) {
  /* A native array passed in from typed code answers its elements in
   * place, without forming the index's key string. */
  if (receiver->kind == SCR_DYN_TYPED_REF) return scr_dyn_index_get(receiver, index);
  if (receiver->kind != SCR_DYN_ARR || !(index >= 0) || index >= (double)receiver->v.arr.len)
    return NULL;
  size_t i = (size_t)index;
  if ((double)i != index || !scr_dyn_arr_has_index(receiver, i)) return NULL;
  return scr_dyn_retain(receiver->v.arr.items[i]);
}

ScrDyn *scr_js_keyed_probe(ScrDyn *receiver, const ScrDyn *key, ScrJsIc *ic) {
  if (key->kind == SCR_DYN_NUM) return scr_js_index_probe(receiver, key->v.num);
  if (key->kind != SCR_DYN_STR || receiver->kind != SCR_DYN_OBJ) return NULL;
  const ScrStr *name = key->v.str;
  size_t len = receiver->v.obj.len;
  for (uint32_t i = 0; i < ic->count; i++) {
    size_t slot = ic->entry[i].slot;
    if (slot >= len) continue;
    const ScrDynEntry *found = &receiver->v.obj.entries[slot];
    if (found->key_len == name->len && scr_key_equal(found->key, name->data, name->len))
      return found->accessor ? NULL : scr_dyn_retain(found->value);
  }
  const ScrJsShape *shape = scr_js_shape_of(receiver);
  if (!shape) return NULL;
  size_t slot = scr_js_shape_find(shape, name->data, name->len);
  if (slot == SIZE_MAX) return NULL;
  const ScrDynEntry *found = &receiver->v.obj.entries[slot];
  if (found->accessor) return NULL;
  scr_js_ic_add(ic, UINT32_MAX, (ScrJsIcEntry){NULL, NULL, NULL, NULL, slot});
  return scr_dyn_retain(found->value);
}
