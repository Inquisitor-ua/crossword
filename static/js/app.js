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
        createEntry('PYTHON', 'Язык программирования'),
        createEntry('DJANGO', 'Python веб-фреймворк'),
        createEntry('VUE', 'JavaScript фреймворк'),
        createEntry('HTML', 'Язык разметки'),
      ],
      crossword: null,
      userGrid: [],
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
        createEntry('КОТ', 'Домашний хищник, мурлыкает'),
        createEntry('ТОК', 'Движение электрических зарядов'),
        createEntry('РОТ', 'Отверстие для еды'),
        createEntry('КОРТ', 'Спортивная площадка для тенниса'),
        createEntry('ТОН', 'Высота звука'),
        createEntry('КОНЬ', 'Животное, на котором ездят'),
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

    findNextCell(rowIndex, colIndex, direction = 1) {
      const grid = this.crossword.grid;
      let c = colIndex + direction;
      while (c >= 0 && c < grid[rowIndex].length) {
        if (!grid[rowIndex][c].blocked) {
          return { row: rowIndex, col: c };
        }
        c += direction;
      }
      return null;
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

    onCellInput(rowIndex, colIndex, event) {
      const raw = event.target.value;
      const letter = normalizeLetter(raw.replace(/[^\p{L}]/gu, '').slice(-1));
      this.userGrid[rowIndex][colIndex] = letter;
      event.target.value = letter;

      if (letter) {
        const next = this.findNextCell(rowIndex, colIndex, 1);
        if (next) {
          this.focusCell(next.row, next.col);
        }
      }

      this.checkCompletion();
    },

    onCellKeydown(event, rowIndex, colIndex) {
      const key = event.key;
      let target = null;

      if (key === 'Backspace' && !this.userGrid[rowIndex][colIndex]) {
        target = this.findNextCell(rowIndex, colIndex, -1);
      } else if (key === 'ArrowRight') {
        event.preventDefault();
        target = this.findCellInDirection(rowIndex, colIndex, 0, 1);
      } else if (key === 'ArrowLeft') {
        event.preventDefault();
        target = this.findCellInDirection(rowIndex, colIndex, 0, -1);
      } else if (key === 'ArrowDown') {
        event.preventDefault();
        target = this.findCellInDirection(rowIndex, colIndex, 1, 0);
      } else if (key === 'ArrowUp') {
        event.preventDefault();
        target = this.findCellInDirection(rowIndex, colIndex, -1, 0);
      }

      if (target) {
        event.preventDefault();
        this.focusCell(target.row, target.col);
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
        this.success = `Кроссворд ${data.width}×${data.height} успешно создан. Заполните поля по подсказкам.`;
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
          this.error = data.error || 'Кроссворд не найден';
          return;
        }

        this.applyWordsFromResponse(data.words);
        this.applyCrosswordResponse(data);
      } catch (err) {
        this.error = 'Не удалось загрузить кроссворд';
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
          this.error = data.error || 'Произошла ошибка при генерации';
          return;
        }

        this.applyCrosswordResponse(data);
      } catch (err) {
        this.crossword = null;
        this.userGrid = [];
        this.error = 'Не удалось связаться с сервером';
      } finally {
        this.loading = false;
      }
    },
  },
}).mount('#app');
