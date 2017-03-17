var positionService = new function PositionService() {

  var positions = [];

  this.Position = function(m, x, y, vx, vy, vvx, vvy) {
    this.m = m;
    this.x = x;
    this.y = y;
    this.vx = vx ? vx : 0;
    this.vy = vy ? vy : 0;
    this.vvx = vvx ? vvx : 0;
    this.vvy = vvy ? vvy : 0;
  }

  this.register = function(position) {
    positions.push(position);
  }

  this.getPositions = function() {
    return positions;
  }

  this.clearvv = function() {
    positions.forEach(function(p) {
      p.vvx = 0;
      p.vvy = 0;
    });
  }

  this.gravity = function(G, fixedPositions) {
    if (!fixedPositions) fixedPositions = [];
    var allPositions = positions.concat(fixedPositions);
    positions.forEach(function(p) {
      allPositions.forEach(function(q) {
        let dx = q.x - p.x;
        let dy = q.y - p.y;
        let mm = G * p.m * q.m;
        let r = dx * dx + dy * dy;
        if (mm < 0 && r <= 1000) {
            r = (r * 3 + 1000) / 4;
        }
        if (mm < 0 && r >= 5000) {
            mm *= (100000 - r) / 100000;
        }
        if (mm < 0 && r >= 100000) {
            mm = 0;
        }
        if (mm > 0 && r <= 10000) {
            r = 10000;
        }
        if (mm > 0 && r >= 20000) {
            r = (r + 20000) / 2;
        }
        p.vvx += dx / r * mm / r;
        p.vvy += dy / r * mm / r;
      });
    });
  }

  this.move = function(dt) {
    positions.forEach(function(p) {
      p.x += p.vx * dt + p.vvx * Math.pow(dt, 2) / 2;
      p.y += p.vy * dt + p.vvy * Math.pow(dt, 2) / 2;
      p.vx += p.vvx * dt;
      p.vy += p.vvy * dt;

      p.vx *= Math.pow(0.9, dt * 5000);
      p.vy *= Math.pow(0.9, dt * 5000);
    });
  }
}

var gameService = new function() {

  var updateHandlers = [];

  this.onUpdate = function(cb) {
    updateHandlers.push(cb);
  }

  var gameClock = new function() {
    setInterval(function() {
      positionService.clearvv();
      positionService.gravity(
          -100000000000000, new positionService.Position(
            -0.1, window.innerWidth / 2, window.innerHeight / 2
            )
          );
      for (i = 0; i < 1000; i++) {
        positionService.move(0.030 / 1000);
      }
      updateHandlers.forEach(function(cb) { cb(0.030); });
    }, 30);
  };
};

var spotService = new function() {

  var spots = [];

  function drawSpot(spot) {
    spot.e
      .attr("cx", spot.p.x)
      .attr("cy", spot.p.y);
  }

  gameService.onUpdate(function() {
    spots.forEach(function(spot) {
      drawSpot(spot);
    });
  });

  this.addSpot = function(svg, x, y) {
    var newSpot = {
      e: svg.append("circle"),
      p: new positionService.Position(0.01, x, y) };
    positionService.register(newSpot.p);
    drawSpot(newSpot);
    newSpot.e.attr("r", 16).attr("fill", "black");
    spots.push(newSpot);
    return newSpot;
  }
};

var linking = {
  enabled: false,
  e: null,
  end: { x: null, y: null }
};

var linkingService = new function() {
  gameService.onUpdate(function() {
    if (linking.enabled && linking.e) {
      linking.e
        .attr("x1", linking.start.x)
        .attr("y1", linking.start.y)
        .attr("x2", linking.end.x)
        .attr("y2", linking.end.y);
    } else if (linking.e) {
      linking.e.remove();
      linking.e = null;
    }
  });

  this.start = function(svg, where) {
    linking.e = svg.append("line").attr("stroke", "black");
    linking.enabled = true;
    linking.start = where;
  }

  window.addEventListener("mousemove", function(e) {
    linking.end.x = e.offsetX;
    linking.end.y = e.offsetY;
  });

  window.addEventListener("mouseup", function(e) {
    setTimeout(function() {
      linking.enabled = false;
    });
  });
}

$(function() {
  var svg = d3.select(document.body).append("svg");
  var qsvg = $("svg");

  qsvg.click(function(e) {
    if (!linking.enabled) {
      var newSpot = spotService.addSpot(svg, e.offsetX, e.offsetY);
      newSpot.e.on("mousedown", function(ev) {
        linkingService.start(svg, newSpot.p);
      });
      newSpot.e.on("mouseup", function(ev) {
        setTimeout(function() {
          linking.enabled = false;
        });
      });
    }
  });
});
