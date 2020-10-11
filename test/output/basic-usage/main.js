System.register([], function (e, t) {
  return {
    execute: function () {
      e(
        (() => {
          "use strict";
          var e = {
              225: (e, t, o) => {
                async function n() {
                  console.log("mounting");
                }
                async function r() {
                  console.log("unmounting");
                }
                o.r(t), o.d(t, { mount: () => n, unmount: () => r });
              },
            },
            t = {};
          function o(n) {
            if (t[n]) return t[n].exports;
            var r = (t[n] = { exports: {} });
            return e[n](r, r.exports, o), r.exports;
          }
          return (
            (o.d = (e, t) => {
              for (var n in t)
                o.o(t, n) &&
                  !o.o(e, n) &&
                  Object.defineProperty(e, n, { enumerable: !0, get: t[n] });
            }),
            (o.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
            (o.r = (e) => {
              "undefined" != typeof Symbol &&
                Symbol.toStringTag &&
                Object.defineProperty(e, Symbol.toStringTag, {
                  value: "Module",
                }),
                Object.defineProperty(e, "__esModule", { value: !0 });
            }),
            o(225)
          );
        })()
      );
    },
  };
});
