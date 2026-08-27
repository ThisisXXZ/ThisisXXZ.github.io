// utils
const util = {

  // https://github.com/jerryc127/hexo-theme-butterfly
  diffDate: (d, more = false) => {
    const dateNow = new Date()
    const datePost = new Date(d)
    const dateDiff = dateNow.getTime() - datePost.getTime()
    const minute = 1000 * 60
    const hour = minute * 60
    const day = hour * 24

    let result
    if (more) {
      const dayCount = dateDiff / day
      const hourCount = dateDiff / hour
      const minuteCount = dateDiff / minute

      if (dayCount > 14) {
        result = null
      } else if (dayCount >= 1) {
        result = parseInt(dayCount) + ' ' + ctx.date_suffix.day
      } else if (hourCount >= 1) {
        result = parseInt(hourCount) + ' ' + ctx.date_suffix.hour
      } else if (minuteCount >= 1) {
        result = parseInt(minuteCount) + ' ' + ctx.date_suffix.min
      } else {
        result = ctx.date_suffix.just
      }
    } else {
      result = parseInt(dateDiff / day)
    }
    return result
  },

  copy: (id, msg) => {
    const el = document.getElementById(id);
    if (el) {
      el.select();
      document.execCommand("Copy");
      if (msg && msg.length > 0) {
        hud.toast(msg, 2500);
      }
    }
  },

  toggle: (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.toggle("display");
    }
  },

  scrollTop: () => {
    window.scrollTo({top: 0, behavior: "smooth"});
  },

  scrollComment: () => {
    document.getElementById('comments').scrollIntoView({behavior: "smooth"});
  },

  viewportLazyload: (target, func, enabled = true) => {
    if (!enabled || !("IntersectionObserver" in window)) {
      func();
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].intersectionRatio > 0) {
        func();
        observer.disconnect();
      }
    });
    observer.observe(target);
  }
}

const hud = {
  toast: (msg, duration) => {
    const d = Number(isNaN(duration) ? 2000 : duration);
    var el = document.createElement('div');
    el.classList.add('toast');
    el.classList.add('show');
    el.innerHTML = msg;
    document.body.appendChild(el);

    setTimeout(function(){ document.body.removeChild(el) }, d);
    
  },

}

// defines

const l_body = document.querySelector('.l_body');


const init = {
  toc: () => {
    utils.jq(() => {
      const scrollOffset = 32;
      var segs = [];
      $("article.md-text :header").each(function (idx, node) {
        segs.push(node);
      });
      function activeTOC() {
        var scrollTop = $(this).scrollTop();
        var topSeg = null;
        for (var idx in segs) {
          var seg = $(segs[idx]);
          if (seg.offset().top > scrollTop + scrollOffset) {
            continue;
          }
          if (!topSeg) {
            topSeg = seg;
          } else if (seg.offset().top >= topSeg.offset().top) {
            topSeg = seg;
          }
        }
        if (topSeg) {
          $("#data-toc a.toc-link").removeClass("active");
          var link = "#" + topSeg.attr("id");
          if (link != '#undefined') {
            const highlightItem = $('#data-toc a.toc-link[href="' + encodeURI(link) + '"]');
            if (highlightItem.length > 0) {
              highlightItem.addClass("active");
            }
          } else {
            $('#data-toc a.toc-link:first').addClass("active");
          }
        }
      }
      function scrollTOC() {
        const e0 = document.querySelector('#data-toc .toc');
        const e1 = document.querySelector('#data-toc .toc a.toc-link.active');
        if (e0 == null || e1 == null) {
          return;
        }
        const offsetBottom = e1.getBoundingClientRect().bottom - e0.getBoundingClientRect().bottom + 100;
        const offsetTop = e1.getBoundingClientRect().top - e0.getBoundingClientRect().top - 64;
        if (offsetTop < 0) {
          e0.scrollBy({top: offsetTop, behavior: "smooth"});
        } else if (offsetBottom > 0) {
          e0.scrollBy({top: offsetBottom, behavior: "smooth"});
        }
      }
      
      var timeout = null;
      window.addEventListener('scroll', function() {
        activeTOC();
        if(timeout !== null) clearTimeout(timeout);
        timeout = setTimeout(function() {
          scrollTOC();
        }.bind(this), 50);
      });      
    })
  },
  sidebar: () => {
    utils.jq(() => {
      $("#data-toc a.toc-link").click(function (e) {
        sidebar.dismiss();
      });
    })
  },
  docTree: () => {
    utils.jq(() => {
      const container = document.querySelector('.l_left .widgets');
      const tree = document.querySelector('.l_left .widgets .doc-tree');
      if (container == null || tree == null) {
        return;
      }

      const storageKey = 'Stellar.docTreeScroll';
      let pending = null;
      try {
        pending = JSON.parse(sessionStorage.getItem(storageKey));
        sessionStorage.removeItem(storageKey);
      } catch (error) {
        pending = null;
      }

      tree.querySelectorAll('a.link').forEach(link => {
        link.addEventListener('click', event => {
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
          }
          const target = new URL(link.href, window.location.href);
          if (target.origin !== window.location.origin || target.pathname === window.location.pathname) {
            return;
          }
          try {
            sessionStorage.setItem(storageKey, JSON.stringify({
              targetPath: target.pathname,
              scrollTop: container.scrollTop,
              timestamp: Date.now()
            }));
          } catch (error) {
            // Browsing still works when storage is unavailable.
          }
        });
      });

      requestAnimationFrame(() => requestAnimationFrame(() => {
        const canRestore = pending != null
          && pending.targetPath === window.location.pathname
          && Number.isFinite(pending.scrollTop)
          && Date.now() - pending.timestamp < 30000;
        if (canRestore) {
          container.scrollTop = pending.scrollTop;
          return;
        }

        const active = tree.querySelector('a.link.active');
        if (active == null) {
          return;
        }
        const containerRect = container.getBoundingClientRect();
        const activeRect = active.getBoundingClientRect();
        const isVisible = activeRect.top >= containerRect.top && activeRect.bottom <= containerRect.bottom;
        if (isVisible) {
          return;
        }
        const activeTop = activeRect.top - containerRect.top + container.scrollTop;
        const targetTop = activeTop - (container.clientHeight - activeRect.height) / 2;
        const maxScrollTop = container.scrollHeight - container.clientHeight;
        container.scrollTop = Math.max(0, Math.min(targetTop, maxScrollTop));
      }));
    })
  },
  relativeDate: (selector) => {
    selector.forEach(item => {
      const $this = item
      const timeVal = $this.getAttribute('datetime')
      let relativeValue = util.diffDate(timeVal, true)
      if (relativeValue) {
        $this.innerText = relativeValue
      }
    })
  },
  /**
   * Tabs tag listener (without twitter bootstrap).
   */
  registerTabsTag: function () {
    // Binding `nav-tabs` & `tab-content` by real time permalink changing.
    document.querySelectorAll('.tabs .nav-tabs .tab').forEach(element => {
      element.addEventListener('click', event => {
        event.preventDefault();
        // Prevent selected tab to select again.
        if (element.classList.contains('active')) return;
        // Add & Remove active class on `nav-tabs` & `tab-content`.
        [...element.parentNode.children].forEach(target => {
          target.classList.toggle('active', target === element);
        });
        // https://stackoverflow.com/questions/20306204/using-queryselector-with-ids-that-are-numbers
        const tActive = document.getElementById(element.querySelector('a').getAttribute('href').replace('#', ''));
        [...tActive.parentNode.children].forEach(target => {
          target.classList.toggle('active', target === tActive);
        });
        // Trigger event
        tActive.dispatchEvent(new Event('tabs:click', {
          bubbles: true
        }));
      });
    });

    window.dispatchEvent(new Event('tabs:register'));
  },

}


// init
init.toc()
init.sidebar()
init.docTree()
init.relativeDate(document.querySelectorAll('#post-meta time'))
init.registerTabsTag()
