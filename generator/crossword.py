"""Crossword grid generation from a list of words and clues."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class WordEntry:
    word: str
    clue: str


@dataclass
class PlacedWord:
    word: str
    clue: str
    row: int
    col: int
    direction: str  # 'across' or 'down'
    number: int = 0


@dataclass
class CrosswordResult:
    grid: list[list[str | None]]
    placed_words: list[PlacedWord] = field(default_factory=list)
    across_clues: list[dict] = field(default_factory=list)
    down_clues: list[dict] = field(default_factory=list)
    width: int = 0
    height: int = 0


class CrosswordGenerator:
    GRID_SIZE = 30
    EMPTY = None
    BLOCK = '#'

    def __init__(self, entries: list[WordEntry]):
        self.entries = [
            WordEntry(word=e.word.strip().upper(), clue=e.clue.strip())
            for e in entries
            if e.word.strip() and e.clue.strip()
        ]
        self.grid: list[list[str | None]] = [
            [self.EMPTY for _ in range(self.GRID_SIZE)]
            for _ in range(self.GRID_SIZE)
        ]
        self.placed: list[PlacedWord] = []

    def generate(self) -> CrosswordResult | None:
        if not self.entries:
            return None

        unique = {}
        for entry in self.entries:
            if entry.word not in unique:
                unique[entry.word] = entry
        words = sorted(unique.values(), key=lambda e: len(e.word), reverse=True)

        first = words[0]
        start_row = self.GRID_SIZE // 2
        start_col = (self.GRID_SIZE - len(first.word)) // 2
        self._place_word(first.word, first.clue, start_row, start_col, 'across')
        self.placed.append(
            PlacedWord(first.word, first.clue, start_row, start_col, 'across')
        )

        for entry in words[1:]:
            placed = self._try_place(entry.word, entry.clue)
            if not placed:
                continue

        if len(self.placed) < 2 and len(words) > 1:
            return None

        trimmed_grid, offset_row, offset_col = self._trim_grid()
        adjusted = []
        for pw in self.placed:
            adjusted.append(
                PlacedWord(
                    word=pw.word,
                    clue=pw.clue,
                    row=pw.row - offset_row,
                    col=pw.col - offset_col,
                    direction=pw.direction,
                )
            )

        across, down = self._number_clues(trimmed_grid, adjusted)
        height = len(trimmed_grid)
        width = len(trimmed_grid[0]) if trimmed_grid else 0

        return CrosswordResult(
            grid=trimmed_grid,
            placed_words=adjusted,
            across_clues=across,
            down_clues=down,
            width=width,
            height=height,
        )

    def _try_place(self, word: str, clue: str) -> bool:
        candidates: list[tuple[int, str, int, int]] = []

        for placed in self.placed:
            for i, letter in enumerate(word):
                for j, placed_letter in enumerate(placed.word):
                    if letter != placed_letter:
                        continue

                    if placed.direction == 'across':
                        row = placed.row - i
                        col = placed.col + j
                        direction = 'down'
                    else:
                        row = placed.row + j
                        col = placed.col - i
                        direction = 'across'

                    if self._can_place(word, row, col, direction):
                        score = self._intersection_score(word, row, col, direction)
                        candidates.append((score, direction, row, col))

        if not candidates:
            return False

        candidates.sort(key=lambda item: item[0], reverse=True)
        _, direction, row, col = candidates[0]
        self._place_word(word, clue, row, col, direction)
        self.placed.append(PlacedWord(word, clue, row, col, direction))
        return True

    def _intersection_score(self, word: str, row: int, col: int, direction: str) -> int:
        score = 0
        for i, letter in enumerate(word):
            r = row + (i if direction == 'down' else 0)
            c = col + (i if direction == 'across' else 0)
            if self.grid[r][c] == letter:
                score += 1
        return score

    def _can_place(self, word: str, row: int, col: int, direction: str) -> bool:
        if row < 0 or col < 0:
            return False

        length = len(word)
        if direction == 'across':
            if col + length > self.GRID_SIZE:
                return False
            if col > 0 and self.grid[row][col - 1] not in (self.EMPTY, self.BLOCK):
                return False
            if col + length < self.GRID_SIZE and self.grid[row][col + length] not in (
                self.EMPTY,
                self.BLOCK,
            ):
                return False
        else:
            if row + length > self.GRID_SIZE:
                return False
            if row > 0 and self.grid[row - 1][col] not in (self.EMPTY, self.BLOCK):
                return False
            if row + length < self.GRID_SIZE and self.grid[row + length][col] not in (
                self.EMPTY,
                self.BLOCK,
            ):
                return False

        has_intersection = False
        for i, letter in enumerate(word):
            r = row + (i if direction == 'down' else 0)
            c = col + (i if direction == 'across' else 0)

            current = self.grid[r][c]
            if current not in (self.EMPTY, letter):
                return False
            if current == letter:
                has_intersection = True
                continue

            if direction == 'across':
                if r > 0 and self.grid[r - 1][c] not in (self.EMPTY, self.BLOCK):
                    return False
                if r + 1 < self.GRID_SIZE and self.grid[r + 1][c] not in (
                    self.EMPTY,
                    self.BLOCK,
                ):
                    return False
            else:
                if c > 0 and self.grid[r][c - 1] not in (self.EMPTY, self.BLOCK):
                    return False
                if c + 1 < self.GRID_SIZE and self.grid[r][c + 1] not in (
                    self.EMPTY,
                    self.BLOCK,
                ):
                    return False

        return has_intersection

    def _place_word(self, word: str, clue: str, row: int, col: int, direction: str) -> None:
        for i, letter in enumerate(word):
            r = row + (i if direction == 'down' else 0)
            c = col + (i if direction == 'across' else 0)
            self.grid[r][c] = letter

    def _trim_grid(self) -> tuple[list[list[str | None]], int, int]:
        min_row, max_row = self.GRID_SIZE, -1
        min_col, max_col = self.GRID_SIZE, -1

        for r in range(self.GRID_SIZE):
            for c in range(self.GRID_SIZE):
                if self.grid[r][c] not in (self.EMPTY, self.BLOCK):
                    min_row = min(min_row, r)
                    max_row = max(max_row, r)
                    min_col = min(min_col, c)
                    max_col = max(max_col, c)

        if max_row < min_row:
            return [], 0, 0

        trimmed = [
            self.grid[r][min_col : max_col + 1]
            for r in range(min_row, max_row + 1)
        ]
        return trimmed, min_row, min_col

    def _number_clues(
        self, grid: list[list[str | None]], placed_words: list[PlacedWord]
    ) -> tuple[list[dict], list[dict]]:
        height = len(grid)
        width = len(grid[0]) if grid else 0
        numbers: dict[tuple[int, int], int] = {}
        counter = 1

        def is_filled(r: int, c: int) -> bool:
            if r < 0 or c < 0 or r >= height or c >= width:
                return False
            cell = grid[r][c]
            return cell is not None and cell != self.BLOCK

        for r in range(height):
            for c in range(width):
                if not is_filled(r, c):
                    continue

                starts_across = is_filled(r, c + 1) and not is_filled(r, c - 1)
                starts_down = is_filled(r + 1, c) and not is_filled(r - 1, c)

                if starts_across or starts_down:
                    numbers[(r, c)] = counter
                    counter += 1

        across_clues: list[dict] = []
        down_clues: list[dict] = []

        for pw in placed_words:
            number = numbers.get((pw.row, pw.col))
            if number is None:
                continue
            pw.number = number
            clue_data = {'number': number, 'clue': pw.clue, 'word': pw.word}
            if pw.direction == 'across':
                across_clues.append(clue_data)
            else:
                down_clues.append(clue_data)

        across_clues.sort(key=lambda item: item['number'])
        down_clues.sort(key=lambda item: item['number'])
        return across_clues, down_clues


def generate_crossword(entries: list[dict]) -> dict | None:
    word_entries = [WordEntry(word=e['word'], clue=e['clue']) for e in entries]
    result = CrosswordGenerator(word_entries).generate()
    if result is None:
        return None

    cell_numbers: dict[tuple[int, int], int] = {}
    for pw in result.placed_words:
        cell_numbers[(pw.row, pw.col)] = pw.number

    grid_cells = []
    for r, row in enumerate(result.grid):
        row_cells = []
        for c, letter in enumerate(row):
            row_cells.append(
                {
                    'letter': letter,
                    'number': cell_numbers.get((r, c)),
                    'blocked': letter is None,
                }
            )
        grid_cells.append(row_cells)

    return {
        'width': result.width,
        'height': result.height,
        'grid': grid_cells,
        'across_clues': result.across_clues,
        'down_clues': result.down_clues,
        'placed_count': len(result.placed_words),
        'total_words': len(word_entries),
    }
