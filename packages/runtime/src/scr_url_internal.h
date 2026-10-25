/* The parsed-URL layout, shared by the always-linked url unit
 * (scr_url.c) and the link-gated URLSearchParams unit
 * (scr_url_params.c — compiled only when the IR uses the sp surface;
 * the scr_symbol gating precedent). Everything else about the URL
 * stays private to scr_url.c. */
#ifndef SCR_URL_INTERNAL_H
#define SCR_URL_INTERNAL_H

#include "scr_runtime.h"

struct ScrUrl {
  size_t rc;
  ScrStr *scheme;   /* lowercase, no ":" */
  ScrStr *userinfo; /* "" or "user[:pw]" (encoded) */
  ScrStr *host;     /* "" allowed; includes ":port" never (see port) */
  ScrStr *port;     /* "" or digits (defaults stripped) */
  ScrStr *path;     /* "/..." rooted, "" (non-special, no path), or opaque */
  ScrStr *query;    /* "" or "?..." */
  ScrStr *fragment; /* "" or "#..." */
  bool has_authority;
  /* The LIVE searchParams view (NULL until first read). NON-owning: the
   * view retains its URL, so a URL with a live view never dies; the view
   * clears this back-pointer when it releases. Every `u.searchParams`
   * read answers the SAME view — Node's cached-object identity — and
   * view mutations write back into `query` (sp_sync_owner). */
  struct ScrSearchParams *sp_cache;
  /* Installed by the optional params unit; setters can refresh a cached
   * list without making params-free URL programs link that unit. */
  void (*sp_reload)(struct ScrSearchParams *sp, ScrStr *query);
};

#endif /* SCR_URL_INTERNAL_H */
