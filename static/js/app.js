const { createApp } = Vue;

let nextId = 1;

const pageConfig = window.__CROSSWORD_PAGE__ || {
  isSharedView: false,
  crosswordId: '',
};

function createEntry(word = '', clue = '') {
  return { id: nextId++, word, clue };
}

function normalizeLetter(value) {
  return value.trim().toUpperCase();
}

createApp({
  data() {
    return {
      isSharedView: pageConfig.isSharedView,
      words: [
        createEntry('PYTHON', 'Programming language'),
        createEntry('DJANGO', 'Python web framework'),
        createEntry('VUE', 'JavaScript framework'),
        createEntry('HTML', 'Markup language'),
      ],
      crossword: null,
      userGrid: [],
      activeRow: null,
      activeCol: null,
      activeDirection: 'across',
      puzzleComplete: false,
      shareUrl: '',
      copied: false,
      loading: false,
      error: '',
      success: '',
    };
  },

  computed: {
    gridStyle() {
      if (!this.crossword) {
        return {};
      }
      const maxDim = Math.max(this.crossword.width, this.crossword.height);
      const cellSize = maxDim > 12 ? 30 : maxDim > 8 ? 36 : 42;
      return { '--cell-size': `${cellSize}px` };
    },

    activeWordCells() {
      const cells = new Set();
      if (!this.crossword || this.activeRow === null || this.activeCol === null) {
        return cells;
      }
      if (!this.isOpenCell(this.activeRow, this.activeCol)) {
        return cells;
      }

      const dRow = this.activeDirection === 'down' ? 1 : 0;
      const dCol = this.activeDirection === 'across' ? 1 : 0;

      cells.add(`${this.activeRow}:${this.activeCol}`);
      for (const step of [-1, 1]) {
        let r = this.activeRow + dRow * step;
        let c = this.activeCol + dCol * step;
        while (this.isOpenCell(r, c)) {
          cells.add(`${r}:${c}`);
          r += dRow * step;
          c += dCol * step;
        }
      }

      return cells;
    },
  },

  mounted() {
    if (this.isSharedView && pageConfig.crosswordId) {
      this.loadSharedCrossword(pageConfig.crosswordId);
    }
  },

  methods: {
    addWord() {
      this.words.push(createEntry());
    },

    removeWord(index) {
      if (this.words.length > 1) {
        this.words.splice(index, 1);
      }
    },

    loadSample() {
      this.words = [
        createEntry('CAT', 'Purring domestic predator'),
        createEntry('ACT', 'Part of a play'),
        createEntry('RAT', 'Rodent with a long tail'),
        createEntry('CART', 'Wheeled container for carrying goods'),
        createEntry('COAT', 'Outer garment for cold weather'),
        createEntry('TACO', 'Folded Mexican dish'),
      ];
      this.error = '';
      this.success = '';
      this.crossword = null;
      this.userGrid = [];
      this.puzzleComplete = false;
      this.shareUrl = '';
      this.copied = false;
    },

    initUserGrid(crossword) {
      this.userGrid = crossword.grid.map((row) =>
        row.map((cell) => (cell.blocked ? null : ''))
      );
      this.activeRow = null;
      this.activeCol = null;
      this.activeDirection = 'across';
      this.puzzleComplete = false;
    },

    cellClass(cell, rowIndex, colIndex) {
      const classes = {
        blocked: cell.blocked,
        filled: !cell.blocked,
      };

      if (!cell.blocked && this.puzzleComplete) {
        classes.complete = true;
      }

      if (!cell.blocked && !this.puzzleComplete) {
        if (this.activeWordCells.has(`${rowIndex}:${colIndex}`)) {
          classes.highlight = true;
        }
        if (rowIndex === this.activeRow && colIndex === this.activeCol) {
          classes.active = true;
        }
      }

      return classes;
    },

    getCellInput(rowIndex, colIndex) {
      return document.querySelector(
        `.cell-input[data-row="${rowIndex}"][data-col="${colIndex}"]`
      );
    },

    focusCell(rowIndex, colIndex) {
      const input = this.getCellInput(rowIndex, colIndex);
      if (input) {
        input.focus();
        input.select();
      }
    },

    isOpenCell(rowIndex, colIndex) {
      if (!this.crossword) {
        return false;
      }
      const grid = this.crossword.grid;
      const row = grid[rowIndex];
      if (!row || colIndex < 0 || colIndex >= row.length) {
        return false;
      }
      return !row[colIndex].blocked;
    },

    // Does the cell belong to a word in the given direction (neighbour on that axis)
    hasWordInDirection(rowIndex, colIndex, direction) {
      const dRow = direction === 'down' ? 1 : 0;
      const dCol = direction === 'across' ? 1 : 0;
      return (
        this.isOpenCell(rowIndex - dRow, colIndex - dCol) ||
        this.isOpenCell(rowIndex + dRow, colIndex + dCol)
      );
    },

    // Keep the current direction if it is possible, otherwise switch
    resolveDirection(rowIndex, colIndex, preferred) {
      const wanted = preferred || this.activeDirection;
      if (this.hasWordInDirection(rowIndex, colIndex, wanted)) {
        return wanted;
      }
      const other = wanted === 'across' ? 'down' : 'across';
      if (this.hasWordInDirection(rowIndex, colIndex, other)) {
        return other;
      }
      return wanted;
    },

    setActiveCell(rowIndex, colIndex, preferredDirection) {
      this.activeDirection = this.resolveDirection(
        rowIndex,
        colIndex,
        preferredDirection
      );
      this.activeRow = rowIndex;
      this.activeCol = colIndex;
    },

    toggleDirection(rowIndex, colIndex) {
      const other = this.activeDirection === 'across' ? 'down' : 'across';
      if (this.hasWordInDirection(rowIndex, colIndex, other)) {
        this.activeDirection = other;
      }
    },

    // Neighbouring cell of the same word (without jumping over blocked cells)
    findNextCell(rowIndex, colIndex, direction, step) {
      const dRow = direction === 'down' ? step : 0;
      const dCol = direction === 'across' ? step : 0;
      const r = rowIndex + dRow;
      const c = colIndex + dCol;
      return this.isOpenCell(r, c) ? { row: r, col: c } : null;
    },

    findCellInDirection(rowIndex, colIndex, dRow, dCol) {
      const grid = this.crossword.grid;
      let r = rowIndex + dRow;
      let c = colIndex + dCol;

      while (r >= 0 && r < grid.length && c >= 0 && c < grid[r].length) {
        if (!grid[r][c].blocked) {
          return { row: r, col: c };
        }
        r += dRow;
        c += dCol;
      }
      return null;
    },

    onCellFocus(rowIndex, colIndex) {
      this.setActiveCell(rowIndex, colIndex);
    },

    // Clicking the active cell again toggles the typing direction
    onCellMouseDown(rowIndex, colIndex, event) {
      const isFocused = document.activeElement === event.currentTarget;
      if (isFocused && rowIndex === this.activeRow && colIndex === this.activeCol) {
        this.toggleDirection(rowIndex, colIndex);
      }
    },

    onCellInput(rowIndex, colIndex, event) {
      const raw = event.target.value;
      const letter = normalizeLetter(raw.replace(/[^\p{L}]/gu, '').slice(-1));
      this.userGrid[rowIndex][colIndex] = letter;
      event.target.value = letter;

      this.setActiveCell(rowIndex, colIndex);

      if (letter) {
        const next = this.findNextCell(rowIndex, colIndex, this.activeDirection, 1);
        if (next) {
          this.focusCell(next.row, next.col);
          this.setActiveCell(next.row, next.col, this.activeDirection);
        }
      }

      this.checkCompletion();
    },

    onCellKeydown(event, rowIndex, colIndex) {
      const key = event.key;
      let target = null;
      let direction = null;

      if (key === ' ' || key === 'Spacebar') {
        event.preventDefault();
        this.toggleDirection(rowIndex, colIndex);
        return;
      }

      if (key === 'Backspace' && !this.userGrid[rowIndex][colIndex]) {
        this.setActiveCell(rowIndex, colIndex);
        target = this.findNextCell(rowIndex, colIndex, this.activeDirection, -1);
      } else if (key === 'ArrowRight') {
        event.preventDefault();
        direction = 'across';
        target = this.findCellInDirection(rowIndex, colIndex, 0, 1);
      } else if (key === 'ArrowLeft') {
        event.preventDefault();
        direction = 'across';
        target = this.findCellInDirection(rowIndex, colIndex, 0, -1);
      } else if (key === 'ArrowDown') {
        event.preventDefault();
        direction = 'down';
        target = this.findCellInDirection(rowIndex, colIndex, 1, 0);
      } else if (key === 'ArrowUp') {
        event.preventDefault();
        direction = 'down';
        target = this.findCellInDirection(rowIndex, colIndex, -1, 0);
      }

      // An arrow along the other axis first changes the typing direction
      if (direction && direction !== this.activeDirection) {
        if (this.hasWordInDirection(rowIndex, colIndex, direction)) {
          this.activeDirection = direction;
        }
      }

      if (target) {
        event.preventDefault();
        this.focusCell(target.row, target.col);
        this.setActiveCell(target.row, target.col, direction || this.activeDirection);
      }
    },

    checkCompletion() {
      if (!this.crossword) {
        this.puzzleComplete = false;
        return;
      }

      const grid = this.crossword.grid;

      for (let rowIndex = 0; rowIndex < grid.length; rowIndex += 1) {
        for (let colIndex = 0; colIndex < grid[rowIndex].length; colIndex += 1) {
          const cell = grid[rowIndex][colIndex];
          if (cell.blocked) {
            continue;
          }

          const userLetter = normalizeLetter(this.userGrid[rowIndex][colIndex] || '');
          const answer = normalizeLetter(cell.letter || '');

          if (!userLetter || userLetter !== answer) {
            this.puzzleComplete = false;
            return;
          }
        }
      }

      this.puzzleComplete = true;
    },

    applyCrosswordResponse(data) {
      this.crossword = data;
      this.initUserGrid(data);
      this.shareUrl = data.share_url || '';
      if (this.isSharedView) {
        this.success = '';
      } else {
        this.success = `Crossword ${data.width}×${data.height} created successfully. Fill in the grid using the clues.`;
      }
      this.copied = false;
    },

    applyWordsFromResponse(words) {
      if (!Array.isArray(words) || !words.length) {
        return;
      }
      this.words = words.map(({ word, clue }) => createEntry(word, clue));
    },

    async loadSharedCrossword(crosswordId) {
      this.loading = true;
      this.error = '';
      this.success = '';

      try {
        const response = await fetch(`/api/crossword/${crosswordId}/`);
        const data = await response.json();

        if (!response.ok) {
          this.error = data.error || 'Crossword not found';
          return;
        }

        this.applyWordsFromResponse(data.words);
        this.applyCrosswordResponse(data);
      } catch (err) {
        this.error = 'Failed to load the crossword';
      } finally {
        this.loading = false;
      }
    },

    async copyShareLink() {
      if (!this.shareUrl) {
        return;
      }

      try {
        await navigator.clipboard.writeText(this.shareUrl);
      } catch (err) {
        const input = document.getElementById('share-url');
        if (input) {
          input.select();
          document.execCommand('copy');
        }
      }

      this.copied = true;
      setTimeout(() => {
        this.copied = false;
      }, 2000);
    },

    async generate() {
      this.error = '';
      this.success = '';
      this.loading = true;
      this.shareUrl = '';
      this.copied = false;
      this.puzzleComplete = false;

      const payload = {
        words: this.words.map(({ word, clue }) => ({
          word: word.trim(),
          clue: clue.trim(),
        })),
      };

      try {
        const response = await fetch('/api/generate/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          this.crossword = null;
          this.userGrid = [];
          this.error = data.error || 'An error occurred during generation';
          return;
        }

        this.applyCrosswordResponse(data);
      } catch (err) {
        this.crossword = null;
        this.userGrid = [];
        this.error = 'Could not reach the server';
      } finally {
        this.loading = false;
      }
    },
  },
}).mount('#app');
