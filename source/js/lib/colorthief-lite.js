/* Reemplazo local y mínimo de ColorThief (sin CDN): getColor / getPalette.
   Cuantiza a 4 bits por canal, ignora píxeles casi transparentes, casi blancos y
   casi negros, y devuelve el color dominante ([r,g,b]). Compatible con la API usada. */
(function (global) {
  'use strict';
  function sample(el, maxSide) {
    var w = el.naturalWidth || el.videoWidth || el.width || 0;
    var h = el.naturalHeight || el.videoHeight || el.height || 0;
    if (!w || !h) throw new Error('ColorThief: medio sin dimensiones');
    var k = Math.min(1, maxSide / Math.max(w, h));
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * k));
    c.height = Math.max(1, Math.round(h * k));
    var ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(el, 0, 0, c.width, c.height);
    return ctx.getImageData(0, 0, c.width, c.height).data; // lanza SecurityError si hay CORS
  }
  function buckets(data) {
    var map = Object.create(null), total = 0, sum = [0, 0, 0];
    for (var i = 0; i < data.length; i += 4) {
      var r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 125) continue;
      sum[0] += r; sum[1] += g; sum[2] += b; total++;
      if (r > 250 && g > 250 && b > 250) continue;
      if (r < 5 && g < 5 && b < 5) continue;
      var key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      var e = map[key] || (map[key] = { n: 0, r: 0, g: 0, b: 0 });
      e.n++; e.r += r; e.g += g; e.b += b;
    }
    var list = Object.keys(map).map(function (k) {
      var e = map[k];
      return { n: e.n, c: [Math.round(e.r / e.n), Math.round(e.g / e.n), Math.round(e.b / e.n)] };
    }).sort(function (a, b) { return b.n - a.n; });
    var avg = total ? sum.map(function (v) { return Math.round(v / total); }) : [128, 128, 128];
    return { list: list, avg: avg };
  }
  function dist(a, b) { return Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]) + Math.abs(a[2]-b[2]); }
  function ColorThief() {}
  ColorThief.prototype.getColor = function (el) {
    var b = buckets(sample(el, 80));
    return b.list.length ? b.list[0].c : b.avg;
  };
  ColorThief.prototype.getPalette = function (el, count) {
    count = Math.max(2, Math.min(count || 5, 20));
    var b = buckets(sample(el, 80)), out = [];
    for (var i = 0; i < b.list.length && out.length < count; i++) {
      var c = b.list[i].c;
      if (out.every(function (o) { return dist(o, c) > 48; })) out.push(c);
    }
    return out.length ? out : [b.avg];
  };
  global.ColorThief = ColorThief;
})(window);
