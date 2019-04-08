const proportion = (min, max, initMin, initMax, val) => {
  return ((val - initMin) * (max - min)) / (initMax - initMin);
};

const prettyNum = num => {
  if (num < 1000) {
    return num;
  } else if (num >= 1000) {
    let exp = 0;
    while (num >= 1000) {
      num = num / 1000;
      exp++;
    }

    switch (exp) {
      case 1:
        return Number(num.toFixed(1)) + "K";
      case 2:
        return Number(num.toFixed(1)) + "M";
      case 3:
        return Number(num.toFixed(1)) + "B";
      default:
        //Number(num.toFixed(1)) + "e" + exp * 3
        return num.toPrecision(2);
    }
  }
};

const theme = { name: "day", color: "white" };

class Line {
  constructor(values = [], color = "blue", label = "Line") {
    this.plot = values;
    this.color = color;
    this.label = label;
  }

  /** Not including last index
   */
  getRange(a, b) {
    if (a < 0) a = 0;
    return this.plot.slice(a, b);
  }
}

class TimeLine {
  constructor(values = []) {
    this.values = values;
    this.stringValues = values.map(mils => {
      let dString = new Date(mils).toDateString().split(" ");
      return dString[1] + " " + Number(dString[2]);
    });
  }
  /** Not including last index
   */
  getRange(a, b) {
    if (a < 0) a = 0;
    return this.values.slice(a, b);
  }
  /** Not including last index
   */
  getStringRange(a, b) {
    if (a < 0) a = 0;
    return this.stringValues.slice(a, b);
  }
}

class Canvas {
  /**
   *
   * @param {?number} width
   * @param {?number} heigth
   * @param {Line[]} lines
   */
  constructor(width = 100, heigth = 100, lines = []) {
    this.maxRight = Math.max(...lines.map(el => el.plot.length)) + 1.2;
    this.maxLeft = 0;

    this.rightVisibleBoundary = this.maxRight;
    this.leftVisibleBoundary = Math.floor(0.9 * this.maxRight);

    this.dpr = window.devicePixelRatio || 1;

    this.container = document.createElement("div");
    this.container.className = "canvasDiv";

    this.canvas = document.createElement("canvas");
    this.canvas.style.width = width.toString() + "px";

    this.canvas.width = width * this.dpr;
    this.canvas.height = heigth * this.dpr;

    this.context = this.canvas.getContext("2d");
    this.canvas.className = "plot";

    this.container.appendChild(this.canvas);

    this.lines = lines;

    this.defaultLineWidth = 4 * this.dpr;
    this.abscissaHeigth = 0;
    this.topPadding = 0;
    this.backgoundColor = theme.color;
    this.textColor = "rgba(100, 120, 140, 0.8)";

    this.pMult = this.getRealMult();
  }

  /**
   * @param {number} val - function value to mirror upside down
   */
  mirror(val) {
    return this.canvas.height - val;
  }

  addLine(line) {
    this.lines.push(line);
  }

  /**
   * Gets maximum value of visiblie lines from specific range
   */
  getMaxVisible() {
    let ranges = this.lines
      .map(line => {
        let range = line.getRange(
          this.leftVisibleBoundary,
          this.rightVisibleBoundary + 0
        );
        if (this.rightVisibleBoundary > line.plot.length + 1)
          range.push(range[range.length - 1]);
        return range;
      })
      .map(range => {
        range[0] -= (range[0] - range[1]) * (this.leftVisibleBoundary % 1);
        range[range.length - 1] -=
          (range[range.length - 1] - range[range.length - 2]) *
          (1 - (this.rightVisibleBoundary % 1));
        return range;
      })
      .reduce((prev, line) => prev.concat(line), []);

    return Math.max(...ranges);
  }

  /**
   * @param {Number} x
   * @param {Number} y
   * @param {Number} r - radius
   * @param {Boolean} mirror - flip upside down?
   */
  circle(x, y, r, mirror = true) {
    this.context.beginPath();
    this.context.arc(
      x,
      mirror ? this.canvas.height - y : y,
      r,
      0,
      2 * Math.PI,
      false
    );
  }
  getLeftOffset() {
    return this.leftVisibleBoundary % 1;
  }

  getRightOffset() {
    return this.rightVisibleBoundary % 1;
  }

  getXstep() {
    return (
      this.canvas.width /
      (Math.floor(this.rightVisibleBoundary) -
        Math.floor(this.leftVisibleBoundary) -
        2 -
        this.getLeftOffset() +
        this.getRightOffset())
    );
  }

  getRealMult() {
    return (
      (this.canvas.height - this.abscissaHeigth - this.topPadding) /
      this.getMaxVisible()
    );
  }

  SmoothMult() {
    let diff = this.getRealMult() - this.pMult;
    if (Math.abs(diff) < this.getRealMult() * 0.01) {
      this.pMult = this.getRealMult();
    } else {
      this.pMult += diff * 0.2;
    }
    return this.pMult;
  }

  clear() {
    this.context.fillStyle = theme.color;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  show() {
    let multiplier = this.SmoothMult();

    this.lines.map(el => {
      let range = el.getRange(
        this.leftVisibleBoundary,
        this.rightVisibleBoundary + 2
      );

      this.context.beginPath();
      this.context.strokeStyle = el.color;
      this.context.lineCap = "round";
      this.context.lineJoin = "round";

      let leftOffset = this.getLeftOffset();
      let xStep = this.getXstep();

      for (let i = 0; i < range.length; i++) {
        this.context.lineTo(
          i * xStep - leftOffset * xStep,
          this.mirror(range[i] * multiplier) - this.abscissaHeigth
        );
      }
      this.context.lineWidth = this.defaultLineWidth;

      this.context.stroke();
    });
  }
}

class MainCanvas extends Canvas {
  /**
   * @param {Line[]} lines
   * @param {TimeLine} timeLine
   */
  constructor(lines = [], timeLine, parentNode) {
    let width = Math.min(500, parentNode.clientWidth);

    super(width, width * 0.993, lines);
    this.abscissaHeigth = 20 * this.dpr;
    this.topPadding = 10 * this.dpr;
    this.timeLine = timeLine;
    this.pMult = this.getRealMult();

    this.canvas.addEventListener("mousemove", this.handleMove.bind(this));
    this.canvas.addEventListener("touchstart", this.handleMove.bind(this), {
      passive: true
    });
    this.canvas.addEventListener("touchmove", this.handleMove.bind(this), {
      passive: true
    });
    this.canvas.addEventListener("mouseleave", this.handleLeave.bind(this));
    this.canvas.addEventListener("touchend", this.handleLeave.bind(this), {
      passive: true
    });
    this.canvas.addEventListener("touchcancel", this.handleLeave.bind(this), {
      passive: true
    });
    this.mouseX = false;

    this.info = document.createElement("div");
    this.info.className = "info";
    this.infoDate = document.createElement("div");
    this.infoDate.className = "infoDate";
    this.stats = document.createElement("div");
    this.stats.className = "stats";

    this.info.appendChild(this.infoDate);
    this.info.appendChild(this.stats);
    this.container.appendChild(this.info);
  }

  refillStats(nearestId) {
    while (this.stats.hasChildNodes()) {
      this.stats.removeChild(this.stats.firstChild);
    }

    this.lines.map(line => {
      let stat = document.createElement("div");
      stat.className = "stat";
      stat.style.color = line.color;
      let lineValue = document.createElement("div");
      lineValue.className = "lineValue";
      lineValue.textContent = line.plot[nearestId];
      let lineName = document.createElement("div");
      lineName.className = "lineName";
      lineName.textContent = line.label;

      stat.appendChild(lineValue);
      stat.appendChild(lineName);
      this.stats.appendChild(stat);
    });
  }

  handleMove(e) {
    if (e.type == "touchmove" || e.type == "touchstart") {
      this.mouseX = (e.touches[0].clientX - e.target.offsetLeft) * this.dpr;
      // e.preventDefault();
    } else {
      this.mouseX = e.offsetX * this.dpr;
    }

    this.show();
  }

  handleLeave(e) {
    // e.preventDefault();
    this.mouseX = false;
    this.show();
  }

  drawStepLines() {
    let max = this.getMaxVisible();
    let step;
    let absStep;
    if (max <= 4) {
      absStep = 0.5;
    } else if (max > 4 && max < 200) {
      absStep = Math.floor(max / 10) * 2;
    } else if (max >= 200) {
      absStep = Math.floor(max / 4);
      let twoDigits = absStep / Math.pow(10, absStep.toString().length - 1);

      if (twoDigits % 1 <= 0.25) {
        twoDigits = Math.floor(twoDigits);
      } else if (twoDigits * 1 < 0.75) {
        twoDigits = Math.floor(twoDigits) + 0.5;
      } else {
        twoDigits = Math.ceil(twoDigits);
      }
      absStep = twoDigits * Math.pow(10, absStep.toString().length - 1);
    }
    step = proportion(
      this.abscissaHeigth,
      this.canvas.height - this.topPadding,
      0,
      max,
      absStep
    );

    this.context.strokeStyle = "rgba(170,170,200, 0.5)";
    this.context.lineWidth = 1 * this.dpr;
    this.context.textAlign = "left";
    this.context.font = `${16 * this.dpr}px Arial`;
    this.context.fillStyle = this.textColor;

    for (let i = 0; i < 7; i++) {
      let offset = this.mirror(i * step);
      this.context.beginPath();
      this.context.moveTo(0, offset - this.abscissaHeigth);
      this.context.lineTo(this.canvas.width, offset - this.abscissaHeigth);
      this.context.stroke();

      this.context.fillText(
        prettyNum(absStep * i),
        10,
        offset - 10 - this.abscissaHeigth
      );
    }
  }

  drawTimeLine() {
    let timeRange = this.timeLine.getStringRange(
      this.leftVisibleBoundary,
      this.rightVisibleBoundary + 2
    );

    let leftOffset = this.getLeftOffset();
    let xStep = this.getXstep();

    let mod =
      timeRange.length > 6
        ? Math.round(
            (this.rightVisibleBoundary - this.leftVisibleBoundary + 2) / 6
          )
        : 1;

    this.context.fillStyle = this.textColor;
    this.context.textAlign = "center";
    this.context.font = `${16 * this.dpr}px Arial`;

    for (let i = 0; i < timeRange.length; i++) {
      if (Math.floor(this.leftVisibleBoundary + i) % mod == 0) {
        this.context.fillText(
          timeRange[i],
          i * xStep - leftOffset * xStep,
          this.mirror(10)
        );
      }
    }
  }

  drawMouseLine() {
    if (!this.mouseX) return;
    this.context.beginPath();
    this.context.lineWidth = 1 * this.dpr;
    this.context.strokeStyle = "rgba(215, 224, 229, 0.5)";
    this.context.moveTo(this.mouseX, 0);
    this.context.lineTo(this.mouseX, this.canvas.height - this.abscissaHeigth);
    this.context.stroke();
  }

  drawNearest() {
    this.info.style.display = "none";
    if (!this.mouseX) return;
    this.info.style.display = "block";

    let leftOffset = this.getLeftOffset();
    let xStep = this.getXstep();
    let absMouseX = proportion(
      this.leftVisibleBoundary,
      this.rightVisibleBoundary - 2,
      0,
      this.canvas.width,
      this.mouseX + leftOffset * xStep
    );

    let multiplier = this.SmoothMult();
    let nearest = Math.round(absMouseX);
    this.lines.map(el => {
      let val = el.plot[Math.floor(this.leftVisibleBoundary) + nearest];
      this.circle(
        (nearest - leftOffset) * xStep,
        this.mirror(val * multiplier) - this.abscissaHeigth,
        5 * this.dpr,
        false
      );
      this.context.strokeStyle = el.color;
      this.context.lineWidth = this.defaultLineWidth * 0.9;
      this.context.fillStyle = theme.color;
      this.context.fill();
      this.context.stroke();
    });

    let nearestId = Math.trunc(this.leftVisibleBoundary) + nearest;
    let mils = this.timeLine.values[nearestId];
    let newDate = new Date(mils)
      .toDateString()
      .split(" ")
      .slice(0, 3);
    newDate[0] += ",";
    newDate[2] = Number(newDate[2]);
    this.infoDate.textContent = newDate.join(" ");
    this.refillStats(nearestId);
    this.info.style.color = theme.name == "day" ? "black" : "white";
    if (this.mouseX * 2 < this.canvas.width) {
      this.info.style.left = this.mouseX / this.dpr + 20 + "px";
    } else {
      this.info.style.left =
        this.mouseX / this.dpr - this.info.clientWidth - 20 + "px";
    }

    this.info.style.backgroundColor = theme.color;
  }

  show() {
    this.clear();
    this.drawStepLines();
    this.drawTimeLine();
    this.drawMouseLine();
    super.show();
    this.drawNearest();
  }
}

class SubCanvas extends Canvas {
  constructor(lines = [], parentNode) {
    let width = Math.min(500, parentNode.clientWidth);
    let height = Math.max(20, width * 0.12);
    super(width, height, lines);

    this.leftVisibleBoundary = 0;
    this.defaultLineWidth = 1 * this.dpr;
    this.grabWidth = 10;
    this.screenGrabWidth = this.grabWidth * this.dpr;
    this.pMult = this.getRealMult();
  }

  show(left, right) {
    this.clear();
    super.show();

    let leftX = proportion(
      0,
      this.canvas.width,
      this.maxLeft,
      this.maxRight,
      left
    );
    let rightX = proportion(
      0,
      this.canvas.width,
      this.maxLeft,
      this.maxRight,
      right
    );

    this.context.fillStyle = theme.color;
    this.context.globalAlpha = 0.6;
    this.context.fillRect(0, 0, leftX, this.canvas.height);
    this.context.fillRect(rightX, 0, this.canvas.width, this.canvas.height);
    this.context.globalAlpha = 1;

    this.context.fillStyle = "rgba(120, 140, 200, 0.2)";

    this.context.fillRect(leftX, 0, this.screenGrabWidth, this.canvas.height);
    this.context.fillRect(
      rightX - this.screenGrabWidth,
      0,
      this.grabWidth * this.dpr,
      this.canvas.height
    );

    this.context.beginPath();
    this.context.strokeStyle = this.context.fillStyle;
    this.context.lineWidth = 2 * this.dpr;
    this.context.lineCap = "butt";
    this.context.moveTo(leftX + this.screenGrabWidth, 0);
    this.context.lineTo(rightX - this.screenGrabWidth, 0);
    this.context.stroke();

    this.context.beginPath();
    this.context.moveTo(leftX + this.screenGrabWidth, this.canvas.height);
    this.context.lineTo(rightX - this.screenGrabWidth, this.canvas.height);
    this.context.stroke();
  }
}

class Block {
  /**
   * @param {String} name
   * @param {Line[]} lines
   */
  constructor(name, lines = [], timeLine, container) {
    this.container = document.createElement("div");
    this.container.className = "block";
    this.guid = Math.floor(Math.random() * Math.pow(10, 10))
      .toString()
      .padStart(10, "0");

    // this.name = name;
    // this.nameHTML = document.createElement("p");
    // this.nameHTML.innerText = this.name;
    // this.nameHTML.className = "graphLable";

    this.mainCanvas = new MainCanvas(lines, timeLine, container);

    this.subCanvas = new SubCanvas(lines, container);
    // false , left or right or between
    this.mouseDownOnSub = false;
    this.pTouchX = 0;

    this.allLines = lines;
    this.visibleLines = new Array(lines.length).fill(true);
    this.minPeriod = 7;

    this.checks = document.createElement("div");
    this.checks.className = "checksContainer";
    this.allLines.map((el, i) => {
      let checkContainer = document.createElement("div");
      checkContainer.style.color = el.color;
      checkContainer.className = "toggleVisibility";

      let check = document.createElement("input");
      check.type = "checkbox";
      check.checked = true;
      check.id = "checkLine" + this.guid + i.toString();

      let checkmark = document.createElement("div");
      checkmark.className = "checkmark";
      checkmark.style.borderColor = el.color;
      // checkmark.textContent = "✓";

      let label = document.createElement("label");
      label.htmlFor = "checkLine" + this.guid + i.toString();
      label.textContent = el.label;

      check.addEventListener("change", this.handleLineVisibility.bind(this, i));

      checkContainer.appendChild(check);
      checkContainer.appendChild(checkmark);
      checkContainer.appendChild(label);

      this.checks.appendChild(checkContainer);
    });

    //use with this
    this.subCanvas.canvas.addEventListener(
      "mousedown",
      this.handleDown.bind(this)
    );
    this.subCanvas.canvas.addEventListener(
      "touchstart",
      this.handleDown.bind(this),
      { passive: true }
    );
    this.subCanvas.canvas.addEventListener(
      "mousemove",
      this.handleDrag.bind(this)
    );
    this.subCanvas.canvas.addEventListener(
      "touchmove",
      this.handleDrag.bind(this),
      { passive: true }
    );
    this.subCanvas.canvas.addEventListener("mouseup", this.handleUp.bind(this));

    // this.container.appendChild(this.nameHTML);
    this.container.appendChild(this.mainCanvas.container);
    this.container.appendChild(this.subCanvas.canvas);
    this.container.appendChild(this.checks);

    this.show();
  }

  handleLineVisibility(id) {
    this.visibleLines[id] = !this.visibleLines[id];
    let visibleLines = this.allLines.filter((el, i) => this.visibleLines[i]);
    this.mainCanvas.lines = visibleLines;
    this.subCanvas.lines = visibleLines;
    this.show();
  }

  handleDrag(e) {
    if (!this.mouseDownOnSub) return;

    let isTouch = e.type == "touchmove";

    let offsetX = isTouch
      ? e.touches[0].clientX - e.target.offsetLeft
      : e.offsetX;

    if (this.mouseDownOnSub == "left") {
      offsetX -= this.subCanvas.grabWidth * 0.5;
    } else if (this.mouseDownOnSub == "right") {
      offsetX += this.subCanvas.grabWidth * 0.5;
    }
    let width = e.target.offsetWidth;
    let valAbs = proportion(
      this.mainCanvas.maxLeft,
      this.mainCanvas.maxRight,
      0,
      width,
      offsetX
    );

    switch (this.mouseDownOnSub) {
      case "left":
        this.mainCanvas.leftVisibleBoundary = valAbs;
        break;
      case "right":
        this.mainCanvas.rightVisibleBoundary = valAbs;
        break;
      case "between":
        let movementX = isTouch
          ? e.touches[0].clientX - e.target.offsetLeft - this.pTouchX
          : e.offsetX - this.pTouchX;

        this.mainCanvas.leftVisibleBoundary += proportion(
          this.mainCanvas.maxLeft,
          this.mainCanvas.maxRight,
          0,
          width,
          movementX
        );
        this.mainCanvas.rightVisibleBoundary += proportion(
          this.mainCanvas.maxLeft,
          this.mainCanvas.maxRight,
          0,
          width,
          movementX
        );

        this.pTouchX = isTouch
          ? e.touches[0].clientX - e.target.offsetLeft
          : e.offsetX;
        break;
      default:
        break;
    }
    if (this.mainCanvas.leftVisibleBoundary < this.mainCanvas.maxLeft)
      this.mainCanvas.leftVisibleBoundary = this.mainCanvas.maxLeft;
    if (this.mainCanvas.rightVisibleBoundary > this.mainCanvas.maxRight)
      this.mainCanvas.rightVisibleBoundary = this.mainCanvas.maxRight;

    if (
      this.mainCanvas.rightVisibleBoundary -
        this.mainCanvas.leftVisibleBoundary <
      this.minPeriod
    ) {
      switch (this.mouseDownOnSub) {
        case "left":
          this.mainCanvas.leftVisibleBoundary =
            this.mainCanvas.rightVisibleBoundary - this.minPeriod;
          break;
        case "right":
          this.mainCanvas.rightVisibleBoundary =
            this.mainCanvas.leftVisibleBoundary + this.minPeriod;
          break;
        case "between":
          if (this.mainCanvas.leftVisibleBoundary == this.mainCanvas.maxLeft) {
            this.mainCanvas.rightVisibleBoundary =
              this.mainCanvas.leftVisibleBoundary + this.minPeriod;
          } else if (
            this.mainCanvas.rightVisibleBoundary == this.mainCanvas.maxRight
          ) {
            this.mainCanvas.leftVisibleBoundary =
              this.mainCanvas.rightVisibleBoundary - this.minPeriod;
          }
          break;
        default:
          break;
      }
    }

    this.show();
  }

  handleDown(e) {
    this.pTouchX =
      e.type == "touchstart"
        ? e.touches[0].clientX - e.target.offsetLeft
        : e.offsetX;

    let offsetX =
      e.type == "touchstart"
        ? e.touches[0].clientX - e.target.offsetLeft
        : e.offsetX;

    let width = e.target.offsetWidth;

    let leftAbsolute = this.mainCanvas.leftVisibleBoundary;
    let rightAbsolute = this.mainCanvas.rightVisibleBoundary;
    let leftRelative = proportion(
      0,
      width,
      this.mainCanvas.maxLeft,
      this.mainCanvas.maxRight,
      leftAbsolute
    );
    let rightRelative = proportion(
      0,
      width,
      this.mainCanvas.maxLeft,
      this.mainCanvas.maxRight,
      rightAbsolute
    );

    if (
      Math.abs(offsetX - (leftRelative + 0.5 * this.subCanvas.grabWidth)) <
      0.5 * this.subCanvas.grabWidth
    ) {
      this.mouseDownOnSub = "left";
    } else if (
      Math.abs(offsetX - (rightRelative - 0.5 * this.subCanvas.grabWidth)) <
      0.5 * this.subCanvas.grabWidth
    ) {
      this.mouseDownOnSub = "right";
    } else if (
      offsetX > leftRelative + this.subCanvas.grabWidth &&
      offsetX < rightRelative - this.subCanvas.grabWidth
    ) {
      this.mouseDownOnSub = "between";
    } else {
      this.mouseDownOnSub = false;
    }
  }

  handleUp(e) {
    this.mouseDownOnSub = false;
  }

  show() {
    this.mainCanvas.show();
    this.subCanvas.show(
      this.mainCanvas.leftVisibleBoundary,
      this.mainCanvas.rightVisibleBoundary
    );
    if (this.mainCanvas.pMult != this.mainCanvas.getRealMult()) {
      window.requestAnimationFrame(this.show.bind(this));
    }
  }
}

/**
 *
 * @param {JSON} data telegram provided JSON array
 */
const createBlocks = data => {
  if (typeof data === "string") data = JSON.parse(data);

  return data.map(block => createBlock(block));
};

const ChartsContainer = document.createElement("div");
ChartsContainer.className = "mainContainer";

document.body.appendChild(ChartsContainer);

const createBlock = block => {
  let timeLine;
  let lines = [];

  block.columns.map(c => {
    if (block.types[c[0]] == "line") {
      lines.push(new Line(c.slice(1), block.colors[c[0]], block.names[c[0]]));
    } else if (block.types[c[0]] == "x") {
      timeLine = new TimeLine(c.slice(1));
    } else {
      throw new Error("Unrecognized type");
    }
  });
  return new Block("", lines, timeLine, ChartsContainer);
};

let blocks = createBlocks(textJson);
blocks.map(block => {
  ChartsContainer.appendChild(block.container);
});

const switchTheme = () => {
  ThemeSwitcher.textContent = `Switch to ${theme.name} mode`;
  if (theme.name == "day") {
    theme.name = "night";
    theme.color = "rgb(25,35,48)";
  } else {
    theme.name = "day";
    theme.color = "white";
  }

  document.body.style.backgroundColor = theme.color;
  blocks.map(block => {
    block.show();
  });
};

let ThemeSwitcher = document.createElement("div");
ThemeSwitcher.textContent = `Switch to ${
  theme.name == "night" ? "day" : "night"
} mode`;
ThemeSwitcher.className = "themeSwitch";
ThemeSwitcher.addEventListener("click", switchTheme);
document.body.appendChild(ThemeSwitcher);
