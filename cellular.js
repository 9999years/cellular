// an rgba color
class Color extends Uint8ClampedArray {
	static get SIZE() {
		return 4
	}

	constructor(r, g, b, a = 0xff) {
		super(Color.SIZE)
		if(r instanceof Uint8ClampedArray) {
			this.set(r, 0)
		} else {
			this.set([r, g, b, a], 0)
		}
	}

	get r() {
		return this[0]
	}

	get g() {
		return this[1]
	}

	get b() {
		return this[2]
	}

	get a() {
		return this[3]
	}

	equals(other) {
		for(var i = 0; i < Color.SIZE; i++) {
			if(this[i] != other[i]) {
				return false
			}
		}
		return true
	}
}

// a cell within a context of a grid
class Cell extends Color {
	constructor(grid, x, y) {
		super(grid.get(x, y))
		this.grid = grid
		this.x = x
		this.y = y
	}

	// returns number of neighbors which pass 'callback'
	// callback: function(Color) -> bool
	neighbors(callback) {
		var count = 0
		for(var i = -1; i <= 1; i++) {
			for(var j = -1; j <= 1; j++) {
				if(i == 0 && j == 0) {
					continue
				}
				if(callback(this.grid.get(this.x + i, this.y + j))) {
					count++
				}
			}
		}
		return count
	}
}

// a grid backed by a u8 array; a wrapper around a Canvas ImageData
class Grid extends ImageData {
	constructor(width, height) {
		super(new Uint8ClampedArray(width * height * Color.SIZE), width, height)
	}

	_valid_x(x) {
		return 0 <= x && x < this.width
	}

	_valid_y(y) {
		return 0 <= y && y < this.height
	}

	_fix_x(x) {
		return ((x % this.width) + this.width) % this.width
	}

	_fix_y(y) {
		return ((y % this.height) + this.height) % this.height
	}

	_ensure_x(x) {
		return this._valid_x(x) ? x : this._fix_x(x)
	}

	_ensure_y(y) {
		return this._valid_y(y) ? y : this._fix_y(y)
	}

	_invert_inx(inx) {
		let inx_per_row = this.width * Color.SIZE
		return [(inx % inx_per_row) / Color.SIZE, inx / inx_per_row >> 0]
	}

	_inx(x, y) {
		return y * this.width * Color.SIZE + x * Color.SIZE
	}

	_ensure_inx(x, y) {
		return this._inx(this._ensure_x(x), this._ensure_y(y))
	}

	copy() {
		let ret = new Grid(this.width, this.height)
		ret._blit(this)
		return ret
	}

	_blit(other) {
		this.data.set(other.data, 0)
	}

	get(x, y) {
		let inx = this._ensure_inx(x, y)
		return new Color(this.data.slice(inx, inx + Color.SIZE))
	}

	_set(inx, color) {
		this.data.set(color, inx)
	}

	set(x, y, color) {
		this.data.set(color, this._ensure_inx(x, y))
	}

	fill(color) {
		for(var i = 0; i < this.data.length; i += Color.SIZE) {
			this._set(i, color)
		}
	}

	// callback: Function(x, y) -> Color
	shade(callback) {
		var inx = 0;
		for(var y = 0; y < this.height; y++) {
			for(var x = 0; x < this.width; x++, inx += Color.SIZE) {
				this._set(inx, callback(x, y))
			}
		}
	}

	shade_cell(callback) {
		var inx = 0;
		let ret = this.copy()
		for(var y = 0; y < this.height; y++) {
			for(var x = 0; x < this.width; x++, inx += Color.SIZE) {
				ret._set(inx, callback(new Cell(this, x, y)))
			}
		}
		this._blit(ret)
	}
}

// a canvas with methods for modifying raster data by plotting on it
class RasterCanvas extends Grid {
	constructor(cvs, width, height) {
		super(WIDTH, HEIGHT)
		this.cvs = cvs
		this.ctx = cvs.getContext('2d')

		// fix canvas size!! all of this is necessary b/c of differing
		// SCALE values
		this.cvs.setAttribute('height', height + 'px')
		this.cvs.setAttribute('width',  width  + 'px')
		this.ctx.width        = width
		this.ctx.height       = height
		this.ctx.x            = width  * SCALE
		this.ctx.y            = height * SCALE
		this.cvs.style.width  = width  / SCALE + 'px'
		this.cvs.style.height = height / SCALE + 'px'
	}

	plot(x, y, color) {
		this.set(x, y, color)
	}

	blit() {
		this.ctx.putImageData(this, 0, 0)
	}
}

let WIDTH  = 200
let HEIGHT = 200
let SCALE  = 1 //window.devicePixelRatio
let BLACK  = new Color(0, 0, 0)
let WHITE  = new Color(0xff, 0xff, 0xff)
let $ = id => document.getElementById(id)
var cvs

let frame = () => {
	cvs.shade_cell(cell => {
		let neighbors = cell.neighbors(c => c.equals(WHITE))
		if(cell.equals(WHITE) && neighbors == 2 || neighbors == 3) {
			return WHITE
		} else if(cell.equals(BLACK) && neighbors == 3) {
			return WHITE
		} else {
			return BLACK
		}
	})
	cvs.blit()
	window.requestAnimationFrame(frame)
}

let init = () => {
	cvs = new RasterCanvas($('cellular'), WIDTH, HEIGHT)
	cvs.shade((x, y) => Math.random() > 0.5 ? BLACK : WHITE)
	cvs.blit()
	window.requestAnimationFrame(frame)
}
